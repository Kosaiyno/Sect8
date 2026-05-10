import { NextResponse } from 'next/server';
import { getAgentRecordCookieName, read0gJson, readCookieValue, type ListingsSnapshot } from '@/lib/0gPersistence';
import { getAgentRecord } from '@/lib/agentStore';
import { loadCachedRentcastListings } from '@/lib/rentcastCache';
import { filterExcludedListings, getFairMarketRent, getValidatedPurchasePrice, isExcludedPropertyType } from '@/lib/realDataService';

type VerifiedRecentAnalysis = {
  id: string;
  address: string;
  generatedAt: number;
  score: number;
  provider: '0g-compute';
  purchasePrice: number | null;
  cashflow: number | null;
  capRate: number | null;
  headline: string;
  summary: string;
  verdict: string;
  analysisRoot: string;
};

type StoredAnalysisSnapshot = {
  type?: string;
  generatedAt?: number;
  provider?: '0g-compute' | 'fallback';
  payload?: {
    listing?: {
      address?: string;
      purchasePrice?: number | null;
      cashflow?: number | null;
      capRate?: number | null;
    };
    analysis?: {
      score?: number;
      headline?: string;
      summary?: string;
      verdict?: string;
    };
  };
};

const DEFAULT_PREFERENCES = {
  zipCode: '48201',
  minBedrooms: 3,
  maxPrice: 150000,
  minRoi: 0.1,
};

function hasOnChainActivation(record: Awaited<ReturnType<typeof getAgentRecord>>) {
  return Boolean(record?.onChainTokenId && record?.contractAddress && record?.activationTxHash);
}

function buildReasoning(listing: {
  purchasePrice: number | null;
  estRent: number;
  fmr: number;
  netOperating: number;
  capRate: number | null;
  bedrooms: number;
  zip: string;
}) {
  return `I surfaced this house because it is actively listed for sale, the area rent benchmark for a ${listing.bedrooms}-bedroom unit is about $${listing.fmr}/mo, projected monthly NOI is about $${Math.round(listing.netOperating / 12)}/mo, and my current underwriting points to a cap rate near ${listing.capRate?.toFixed(1)}%.`;
}

async function toRecommendations(listings: Array<Record<string, unknown>>, zipCode: string) {
  const mapped = await Promise.all(listings.map(async (listing) => {
    const bedrooms = Number(listing.bedrooms || 1);
    const propertyType = String(listing.propertyType || '');

    if (isExcludedPropertyType(propertyType)) {
      return null;
    }

    const fairMarketRent = await getFairMarketRent(String(listing.zip || zipCode), bedrooms, String(listing.address || ''));
    const fmr = fairMarketRent.value;
    const estRent = Number(listing.estRent || listing.rent || listing.askingRent || 0) || fmr;
    const purchasePrice = getValidatedPurchasePrice(Number(listing.purchasePrice || listing.price || listing.listPrice || 0), estRent);
    const hasVerifiedHud = fairMarketRent.source === 'hud';
    const annualRent = hasVerifiedHud ? estRent * 12 : null;
    const estExpenses = annualRent === null ? null : Math.round(annualRent * 0.35);
    const netOperating = annualRent === null || estExpenses === null ? null : Math.round(annualRent - estExpenses);
    const capRate = purchasePrice && netOperating !== null ? Number(((netOperating / purchasePrice) * 100).toFixed(2)) : null;
    const isBanger = purchasePrice && hasVerifiedHud ? fmr > (0.015 * purchasePrice) : false;
    const explanation = buildReasoning({
      purchasePrice,
      estRent: hasVerifiedHud ? estRent : 0,
      fmr: hasVerifiedHud ? fmr : 0,
      netOperating: netOperating || 0,
      capRate,
      bedrooms,
      zip: String(listing.zip || zipCode),
    });

    return {
      ...listing,
      zip: String(listing.zip || zipCode),
      bedrooms,
      bathrooms: listing.bathrooms ? Number(listing.bathrooms) : null,
      purchasePrice,
      askingRent: null,
      estRent: hasVerifiedHud ? estRent : null,
      fmr: hasVerifiedHud ? fmr : null,
      fmrSource: fairMarketRent.source,
      annualRent,
      estExpenses,
      netOperating,
      capRate,
      isBanger,
      explanation: hasVerifiedHud
        ? explanation
        : 'I found a real asking price for this listing, but I could not verify HUD rent support from the configured HUD API, so I intentionally hid the underwriting metrics.',
      listingType: 'sale-or-valued',
    };
  }));

  return mapped.filter((listing) => listing && listing.purchasePrice !== null);
}

async function loadVerifiedRecentAnalyses(listings: Array<Record<string, unknown>>) {
  const analyses = await Promise.all(
    listings.map(async (listing) => {
      const analysisRoot = typeof listing.analysisRoot === 'string' ? listing.analysisRoot.trim() : '';
      if (!analysisRoot) {
        return null;
      }

      const snapshot = await read0gJson<StoredAnalysisSnapshot>(analysisRoot);
      if (
        !snapshot
        || snapshot.type !== 'property-analysis'
        || snapshot.provider !== '0g-compute'
        || !snapshot.payload?.analysis
      ) {
        return null;
      }

      return {
        id: String(listing.id || ''),
        address: String(snapshot.payload.listing?.address || listing.address || 'Unknown property'),
        generatedAt: Number(snapshot.generatedAt || 0),
        score: Number(snapshot.payload.analysis.score || 0),
        provider: '0g-compute' as const,
        purchasePrice: snapshot.payload.listing?.purchasePrice ?? (listing.purchasePrice ? Number(listing.purchasePrice) : null),
        cashflow: snapshot.payload.listing?.cashflow ?? (listing.cashflow ? Number(listing.cashflow) : null),
        capRate: snapshot.payload.listing?.capRate ?? (listing.capRate ? Number(listing.capRate) : null),
        headline: String(snapshot.payload.analysis.headline || ''),
        summary: String(snapshot.payload.analysis.summary || ''),
        verdict: String(snapshot.payload.analysis.verdict || ''),
        analysisRoot,
      } satisfies VerifiedRecentAnalysis;
    })
  );

  return analyses
    .filter((analysis): analysis is VerifiedRecentAnalysis => Boolean(analysis))
    .sort((left, right) => right.generatedAt - left.generatedAt)
    .slice(0, 4);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const owner = typeof body.owner === 'string' ? body.owner.trim().toLowerCase() : '';

    if (!owner) {
      return NextResponse.json({ success: false, error: 'owner required' }, { status: 400 });
    }

    const cookieName = getAgentRecordCookieName(owner);
    const currentRoot = typeof body.recordRoot === 'string' && body.recordRoot.trim()
      ? body.recordRoot.trim()
      : readCookieValue(req.headers.get('cookie'), cookieName);
    const stored = await getAgentRecord(owner, currentRoot);
    if (!stored || !hasOnChainActivation(stored)) {
      return NextResponse.json({ success: true, agent: null, memoryRoot: null, record: null });
    }

    const preferences = stored?.preferences || DEFAULT_PREFERENCES;
    const activeZip = stored.latestListingsZip || String((preferences as { zipCode?: string })?.zipCode || DEFAULT_PREFERENCES.zipCode);
    const snapshot = await read0gJson<ListingsSnapshot>(stored.latestListingsRoot);
    const snapshotListings = Array.isArray(snapshot?.listings) ? filterExcludedListings(snapshot.listings) : null;
    const cached = !snapshotListings && stored.latestListingsZip && stored.latestListingsBedrooms
      ? await loadCachedRentcastListings(stored.latestListingsZip, stored.latestListingsBedrooms)
      : null;
    const recommendations = snapshotListings
      ? snapshotListings.map((listing) => ({ ...listing, listingsRoot: stored.latestListingsRoot || null }))
      : Array.isArray(cached?.listings)
        ? await toRecommendations(cached.listings, activeZip)
        : [];
    const recentAnalyses = snapshotListings ? await loadVerifiedRecentAnalyses(snapshotListings) : [];

    const response = NextResponse.json({
      success: true,
      agent: {
        id: stored.agentId,
        owner: owner || stored?.owner || null,
        recordRoot: stored.recordRoot || currentRoot || null,
        onChainTokenId: stored.onChainTokenId || null,
        contractAddress: stored.contractAddress || null,
        activationTxHash: stored.activationTxHash || null,
        preferences,
        memory: {
          agentId: stored.agentId,
          owner,
          preferences,
          history: [
            `I am active for ${owner}`,
            stored?.onChainTokenId && stored?.contractAddress
              ? `My on-chain agent token is #${stored.onChainTokenId} at ${stored.contractAddress}`
              : 'My on-chain activation record has not been restored yet',
            stored?.activationTxHash
              ? `My activation transaction is ${stored.activationTxHash}`
              : 'My activation transaction hash is not saved yet',
            stored?.memoryRoot ? `I am synced to 0G at ${stored.memoryRoot}` : 'I do not have a 0G memory root synced yet',
            stored?.latestListingsZip ? `I have cached listings ready for ZIP ${stored.latestListingsZip}` : 'I do not have cached listings yet',
          ],
          recentAnalyses,
          memoryRoot: stored?.memoryRoot || null,
          createdAt: stored?.createdAt || null,
        },
        status: 'active',
      },
      recommendations,
      record: stored,
      recordRoot: stored.recordRoot || currentRoot || null,
      memoryRoot: stored?.memoryRoot || null,
    });
    if (stored.recordRoot) {
      response.cookies.set(cookieName, stored.recordRoot, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }
    return response;
  } catch (error) {
    console.error('agents/resolve error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}