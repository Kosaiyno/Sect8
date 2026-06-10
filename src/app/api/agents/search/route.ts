import { NextResponse } from 'next/server';
import { getAgentRecordCookieName, read0gJson, readCookieValue, type ListingsSnapshot } from '@/lib/0gPersistence';
import { getAgentRecord } from '@/lib/agentStore';
import { getFairMarketRent, getValidatedPurchasePrice, isExcludedPropertyType, normalizePropertyType } from '@/lib/realDataService';
import { readRentcastCache } from '@/lib/rentcastCache';

type ListingRecord = Record<string, unknown>;
type CachedRecommendation = Exclude<Awaited<ReturnType<typeof toRecommendation>>, null>;
type SearchCriteria = {
  city?: string;
  state?: string;
  minBedrooms?: number | string;
  minBathrooms?: number | string;
  maxPrice?: number | string;
  minRoi?: number | string;
  minCashflow?: number | string;
  minCapRate?: number | string;
  propertyTypes?: string[];
};

function getLocationParts(address: string) {
  const [street = '', city = '', stateZip = ''] = address.split(',').map((part) => part.trim());
  const [state = '', zip = ''] = stateZip.split(' ').filter(Boolean);
  return { street, city, state, zip };
}

async function toRecommendation(listing: ListingRecord, defaultZip: string) {
  const zip = String(listing.zip || defaultZip);
  const bedrooms = Number(listing.bedrooms || 1);
  const address = String(listing.address || listing.formattedAddress || '');
  const propertyType = normalizePropertyType(listing.propertyType);
  const id = String(listing.id || listing.listingId || `${address || defaultZip}-${bedrooms}`);

  if (isExcludedPropertyType(propertyType)) {
    return null;
  }

  const rawPurchasePrice = Number(listing.purchasePrice || listing.price || listing.listPrice || 0);
  const fairMarketRent = await getFairMarketRent(zip, bedrooms, address);
  const fmr = fairMarketRent.value;
  const estRent = Number(listing.estRent || listing.rent || 0) || fmr;
  const purchasePrice = getValidatedPurchasePrice(rawPurchasePrice, estRent);

  if (purchasePrice === null) {
    return null;
  }

  const hasVerifiedHud = fairMarketRent.source === 'hud';
  const annualRent = hasVerifiedHud ? estRent * 12 : null;
  const estExpenses = annualRent === null ? null : Math.round(annualRent * 0.35);
  const netOperating = annualRent === null || estExpenses === null ? null : Math.round(annualRent - estExpenses);
  const capRate = netOperating === null ? null : Number(((netOperating / purchasePrice) * 100).toFixed(2));

  return {
    ...listing,
    id,
    zip,
    bedrooms,
    address,
    bathrooms: listing.bathrooms ? Number(listing.bathrooms) : null,
    propertyType,
    squareFootage: listing.squareFootage ? Number(listing.squareFootage) : null,
    purchasePrice,
    estRent: hasVerifiedHud ? estRent : null,
    fmr: hasVerifiedHud ? fmr : null,
    fmrSource: fairMarketRent.source,
    annualRent,
    estExpenses,
    netOperating,
    capRate,
    roi: capRate,
    cashflow: netOperating !== null ? Math.round(netOperating / 12) : null,
    isBanger: hasVerifiedHud ? fmr > (0.015 * purchasePrice) : false,
    explanation: hasVerifiedHud
      ? `I surfaced this house because it is actively listed for sale, the HUD county rent benchmark for a ${bedrooms}-bedroom unit is about $${fmr}/mo, projected monthly NOI is about $${Math.round((netOperating || 0) / 12)}/mo, and my current underwriting points to a cap rate near ${capRate?.toFixed(1)}%.`
      : 'I found a real asking price for this listing, but I could not verify HUD rent support from the configured HUD API, so I intentionally hid the underwriting metrics.',
    listingType: 'sale-or-valued',
    source: listing.source || 'rentcast-cache',
  };
}

function toFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getMinRoiPercent(value: unknown) {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric <= 0) {
    return null;
  }

  return numeric <= 1 ? numeric * 100 : numeric;
}

function buildSearchCriteria(filters: SearchCriteria = {}, preferences: SearchCriteria = {}): SearchCriteria {
  const filterMaxPrice = toFiniteNumber(filters.maxPrice);
  const preferenceMaxPrice = toFiniteNumber(preferences.maxPrice);
  const maxPrice = filterMaxPrice !== null && preferenceMaxPrice !== null
    ? Math.min(filterMaxPrice, preferenceMaxPrice)
    : filterMaxPrice ?? preferenceMaxPrice ?? undefined;

  return {
    ...preferences,
    ...filters,
    minBedrooms: filters.minBedrooms || preferences.minBedrooms,
    maxPrice,
    minRoi: filters.minRoi || preferences.minRoi,
    minCashflow: filters.minCashflow || preferences.minCashflow,
    minCapRate: filters.minCapRate || preferences.minCapRate,
    propertyTypes: Array.isArray(filters.propertyTypes) && filters.propertyTypes.length
      ? filters.propertyTypes
      : Array.isArray(preferences.propertyTypes)
        ? preferences.propertyTypes
        : [],
  };
}

function matchesCriteria(recommendation: ListingRecord, filters: SearchCriteria, requestedZip = '') {
  const matchesZip = !requestedZip || String(recommendation?.zip || '') === requestedZip;
  return matchesZip;
}

async function getCachedRecommendations(requestedZip?: string, filters: SearchCriteria = {}) {
  const cache = readRentcastCache();
  const deduped = new Map<string, CachedRecommendation>();

  const targetEntries = requestedZip 
    ? Object.values(cache).filter(entry => entry.zipCode === requestedZip)
    : Object.values(cache);

  for (const entry of targetEntries) {
    const recommendations = await Promise.all((entry.listings || []).map((listing) => toRecommendation(listing, entry.zipCode)));

    for (const recommendation of recommendations) {
      if (!recommendation) {
        continue;
      }

      deduped.set(String(recommendation.id), recommendation);
    }
  }

  return Array.from(deduped.values()).filter(Boolean);
}

async function getLatestSnapshotRecommendations(request: Request, owner: string, recordRoot?: string | null) {
  if (!owner) {
    return { listingsRoot: null, recommendations: [] as ListingRecord[] };
  }

  const cookieName = getAgentRecordCookieName(owner);
  const currentRoot = recordRoot || readCookieValue(request.headers.get('cookie'), cookieName);
  const stored = await getAgentRecord(owner, currentRoot);
  if (!stored?.latestListingsRoot) {
    return { listingsRoot: null, recommendations: [] as ListingRecord[] };
  }

  const snapshot = await read0gJson<ListingsSnapshot>(stored.latestListingsRoot);
  const recommendations: ListingRecord[] = Array.isArray(snapshot?.listings)
    ? snapshot.listings.map((listing) => {
        const capRate = listing.capRate !== null && listing.capRate !== undefined ? Number(listing.capRate) : null;
        const roi = listing.roi !== null && listing.roi !== undefined ? Number(listing.roi) : capRate;
        const netOperating = listing.netOperating !== null && listing.netOperating !== undefined ? Number(listing.netOperating) : null;
        const cashflow = listing.cashflow !== null && listing.cashflow !== undefined
          ? Number(listing.cashflow)
          : (netOperating !== null ? Math.round(netOperating / 12) : null);
        return {
          ...listing,
          roi: roi ?? undefined,
          cashflow: cashflow ?? undefined,
          listingsRoot: stored.latestListingsRoot || null,
        };
      })
    : [];

  return { listingsRoot: stored.latestListingsRoot || null, recommendations };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = typeof searchParams.get('owner') === 'string' ? String(searchParams.get('owner') || '').trim().toLowerCase() : '';
  const recordRoot = typeof searchParams.get('recordRoot') === 'string' ? String(searchParams.get('recordRoot') || '').trim() : '';
  const rooted = await getLatestSnapshotRecommendations(request, owner, recordRoot || null);
  const rootedListings = rooted.recommendations;

  const options = (rootedListings.length
    ? rootedListings.map((listing) => {
        const address = String(listing.address || listing.formattedAddress || '');
        const location = getLocationParts(address);

        return {
          zipCode: String(listing.zip || ''),
          city: location.city || 'Unknown City',
          state: location.state || 'Unknown State',
          label: `${String(listing.zip || '')} - ${location.city || 'Unknown City'}, ${location.state || 'Unknown State'}`,
        };
      })
    : Object.values(readRentcastCache())
    .map((entry) => {
      const firstListing = entry.listings?.find((listing) => typeof listing.address === 'string' || typeof listing.formattedAddress === 'string');
      const address = String(firstListing?.address || firstListing?.formattedAddress || '');
      const location = getLocationParts(address);

      return {
        zipCode: entry.zipCode,
        city: location.city || 'Unknown City',
        state: location.state || 'Unknown State',
        label: `${entry.zipCode} - ${location.city || 'Unknown City'}, ${location.state || 'Unknown State'}`,
      };
    }))
    .filter((option, index, array) => array.findIndex((candidate) => candidate.zipCode === option.zipCode) === index)
    .sort((left, right) => left.zipCode.localeCompare(right.zipCode));

  return NextResponse.json({ success: true, zipOptions: options });
}

export async function POST(req: Request) {
  const body = await req.json();
  const requestedZip = typeof body.zipCode === 'string' ? body.zipCode.trim() : '';
  const owner = typeof body.owner === 'string' ? body.owner.trim().toLowerCase() : '';
  const recordRoot = typeof body.recordRoot === 'string' ? body.recordRoot.trim() : '';
  const filters = buildSearchCriteria(body.filters || {}, body.preferences || {});
  const rooted = await getLatestSnapshotRecommendations(req, owner, recordRoot || null);
  const baseRecommendations = rooted.recommendations.length ? rooted.recommendations : await getCachedRecommendations(requestedZip, filters);
  const recommendations = baseRecommendations.filter((recommendation) => matchesCriteria(recommendation, filters, requestedZip));

  return NextResponse.json({ success: true, recommendations });
}
