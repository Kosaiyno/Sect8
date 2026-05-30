import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402/next';

import { read0gJson, write0gJson, type ListingsSnapshot } from '@/lib/0gPersistence';
import { getOrCreatePropertyAnalysis } from '@/lib/propertyAnalysis';
import { getPropertyDetailBundle, type PropertyDetailBundle } from '@/lib/propertyDetails';
import { getFairMarketRent, normalizePropertyType } from '@/lib/realDataService';
import { resolveHousingAuthorityContact } from '@/lib/phaDirectory';
import { calculateUnderwriting } from '@/lib/underwriting';
import { section8AnalysisRouteConfig, x402Server } from '@/lib/x402Server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Section8AnalysisRequest = {
  listingId?: string;
  listingsRoot?: string;
  address?: string;
  zipCode?: string;
  purchasePrice?: number;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  squareFootage?: number;
  estimatedRent?: number;
};

function toPositiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function toOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getZipCode(body: Section8AnalysisRequest, address: string) {
  const explicit = String(body.zipCode || '').trim();
  if (/^\d{5}$/.test(explicit)) {
    return explicit;
  }

  const fromAddress = address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5);
  if (fromAddress) {
    return fromAddress;
  }

  return '48201';
}

function buildEmptyAttomBundle(): PropertyDetailBundle['attom'] {
  return {
    ownership: { ownerName: null, mailingAddress: null, absenteeOwnerStatus: null, corporateOwner: false, verified: false },
    parcel: { attomId: null, apn: null, propertyUse: null, yearBuilt: null, lotNumber: null, lotSizeSqft: null, latitude: null, longitude: null, geoIdV4: null },
    assessedValue: { assessedTotal: null, marketTotal: null, taxAmount: null, assessorYear: null, taxYear: null },
    taxHistory: [],
    deedHistory: [],
    risk: { flood: null, fire: null, environmental: [], naturalDisasters: [] },
  };
}

async function getBundleFromExistingListing(body: Section8AnalysisRequest) {
  const listingId = String(body.listingId || '').trim();
  if (!listingId) {
    return null;
  }

  return getPropertyDetailBundle(listingId, String(body.listingsRoot || '').trim() || null);
}

async function buildBundleFromRequest(body: Section8AnalysisRequest) {
  const address = String(body.address || '').trim();
  const purchasePrice = toPositiveNumber(body.purchasePrice ?? body.price, 0);
  const bedrooms = Math.round(toPositiveNumber(body.bedrooms, 3));

  if (!address || !purchasePrice) {
    throw new Error('Provide either listingId, or address plus purchasePrice.');
  }

  const zipCode = getZipCode(body, address);
  const fairMarketRent = await getFairMarketRent(zipCode, bedrooms, address);
  const estRent = toPositiveNumber(body.estimatedRent, fairMarketRent.value);
  const underwriting = calculateUnderwriting({ purchasePrice, estRent });
  const listingId = `x402-${zipCode}-${Buffer.from(address).toString('base64url').slice(0, 32)}`;
  const listing = {
    id: listingId,
    address,
    zip: zipCode,
    bedrooms,
    bathrooms: toOptionalNumber(body.bathrooms),
    purchasePrice,
    price: purchasePrice,
    estRent,
    estimatedRent: estRent,
    fmr: fairMarketRent.value,
    fmrSource: fairMarketRent.source,
    annualRent: underwriting.annualRent,
    annualCashflow: underwriting.annualCashflow,
    estExpenses: underwriting.estExpenses,
    netOperating: underwriting.netOperating,
    cashflow: underwriting.monthlyCashflow,
    capRate: underwriting.capRate,
    roi: underwriting.roi ?? undefined,
    propertyType: normalizePropertyType(body.propertyType),
    squareFootage: toOptionalNumber(body.squareFootage),
    source: 'x402-request',
    timestamp: Date.now(),
  };

  let listingsRoot: string | null = null;
  try {
    listingsRoot = await write0gJson({
      type: 'listings-snapshot',
      owner: null,
      zipCode,
      bedrooms,
      fetchedAt: Date.now(),
      listings: [listing],
    } satisfies ListingsSnapshot);
  } catch {
    listingsRoot = null;
  }

  const enriched = listingsRoot ? await getPropertyDetailBundle(listingId, listingsRoot) : null;
  if (enriched) {
    return enriched;
  }

  return {
    listing,
    housingAuthority: await resolveHousingAuthorityContact({ address, zipCode }),
    attom: buildEmptyAttomBundle(),
  } satisfies PropertyDetailBundle;
}

async function analysisHandler(req: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const body = await req.json().catch(() => ({})) as Section8AnalysisRequest;
    const bundle = await getBundleFromExistingListing(body) || await buildBundleFromRequest(body);

    if (!bundle) {
      return NextResponse.json({ success: false, error: 'Listing not found or excluded from Section 8 analysis.' }, { status: 404 });
    }

    const listingRecord = bundle.listing as Record<string, unknown>;
    const analysisResult = await getOrCreatePropertyAnalysis(
      bundle,
      String(listingRecord.analysisRoot || ''),
    );
    const storedAnalysis = analysisResult.record.storageRoot
      ? await read0gJson<Record<string, unknown>>(analysisResult.record.storageRoot)
      : null;

    return NextResponse.json({
      success: true,
      service: 'Sect8 Section 8 underwriting analysis',
      listing: {
        id: listingRecord.id,
        address: listingRecord.address,
        zipCode: listingRecord.zip,
        purchasePrice: listingRecord.purchasePrice || listingRecord.price || null,
        bedrooms: listingRecord.bedrooms,
        bathrooms: listingRecord.bathrooms ?? null,
        propertyType: listingRecord.propertyType || null,
        squareFootage: listingRecord.squareFootage || null,
      },
      underwriting: {
        fmr: listingRecord.fmr || null,
        fmrSource: listingRecord.fmrSource || null,
        estimatedRent: listingRecord.estRent || listingRecord.estimatedRent || null,
        annualRent: listingRecord.annualRent || null,
        estimatedExpenses: listingRecord.estExpenses || null,
        netOperatingIncome: listingRecord.netOperating || null,
        monthlyCashflow: listingRecord.cashflow || null,
        annualCashflow: listingRecord.annualCashflow || null,
        capRate: listingRecord.capRate || null,
        roi: listingRecord.roi || null,
      },
      housingAuthority: bundle.housingAuthority ? {
        name: bundle.housingAuthority.entry.name,
        phone: bundle.housingAuthority.entry.phone,
        email: bundle.housingAuthority.entry.email,
        matchedBy: bundle.housingAuthority.matchedBy,
      } : null,
      ownership: bundle.attom.ownership,
      risk: bundle.attom.risk,
      analysis: analysisResult.record.analysis,
      proof: {
        provider: analysisResult.record.provider,
        compute: analysisResult.record.computeProof,
        storageRoot: analysisResult.record.storageRoot,
        storageType: storedAnalysis?.type || null,
        fromCache: analysisResult.fromCache,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

async function discoveryHandler(): Promise<NextResponse<unknown>> {
  return NextResponse.json({
    success: true,
    service: 'Sect8 Section 8 underwriting analysis',
    message: 'Send a POST request with listingId or property details to generate a paid Section 8 underwriting analysis.',
    exampleInput: {
      address: '8773 Petoskey Ave, Detroit, MI 48204',
      zipCode: '48204',
      purchasePrice: 85000,
      bedrooms: 3,
      bathrooms: 1,
    },
  });
}

export const GET = withX402(
  discoveryHandler,
  section8AnalysisRouteConfig,
  x402Server,
);

export const POST = withX402(
  analysisHandler,
  section8AnalysisRouteConfig,
  x402Server,
);
