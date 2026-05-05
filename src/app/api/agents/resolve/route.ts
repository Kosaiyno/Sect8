import { NextResponse } from 'next/server';
import { getAgentRecord } from '@/lib/agentStore';
import { loadCachedRentcastListings } from '@/lib/rentcastCache';
import { getFairMarketRent, getValidatedPurchasePrice, isExcludedPropertyType } from '@/lib/realDataService';

const DEFAULT_PREFERENCES = {
  zipCode: '48201',
  minBedrooms: 3,
  maxPrice: 150000,
  minRoi: 0.1,
};

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const owner = typeof body.owner === 'string' ? body.owner.trim().toLowerCase() : '';

    if (!owner) {
      return NextResponse.json({ success: false, error: 'owner required' }, { status: 400 });
    }

    const stored = getAgentRecord(owner);
    if (!stored) {
      return NextResponse.json({ success: true, agent: null, memoryRoot: null, record: null });
    }

    const preferences = stored?.preferences || DEFAULT_PREFERENCES;
    const cached = stored.latestListingsZip && stored.latestListingsBedrooms
      ? await loadCachedRentcastListings(stored.latestListingsZip, stored.latestListingsBedrooms)
      : null;
    const activeZip = stored.latestListingsZip || String((preferences as { zipCode?: string })?.zipCode || DEFAULT_PREFERENCES.zipCode);
    const recommendations = Array.isArray(cached?.listings) ? await toRecommendations(cached.listings, activeZip) : [];

    return NextResponse.json({
      success: true,
      agent: {
        id: stored.agentId,
        owner: owner || stored?.owner || null,
        preferences,
        memory: {
          agentId: stored.agentId,
          owner,
          preferences,
          history: [
            `I am active for ${owner}`,
            stored?.memoryRoot ? `I am synced to 0G at ${stored.memoryRoot}` : 'I do not have a 0G memory root synced yet',
            stored?.latestListingsZip ? `I have cached listings ready for ZIP ${stored.latestListingsZip}` : 'I do not have cached listings yet',
          ],
          memoryRoot: stored?.memoryRoot || null,
          createdAt: stored?.createdAt || null,
        },
        status: 'active',
      },
      recommendations,
      record: stored,
      memoryRoot: stored?.memoryRoot || null,
    });
  } catch (error) {
    console.error('agents/resolve error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}