import { NextResponse } from 'next/server';
import { getAgentRecordCookieName, read0gJson, readCookieValue, type ListingsSnapshot } from '@/lib/0gPersistence';
import { getAgentRecord } from '@/lib/agentStore';
import { getFairMarketRent, getValidatedPurchasePrice, isExcludedPropertyType, normalizePropertyType } from '@/lib/realDataService';
import { readRentcastCache } from '@/lib/rentcastCache';

type ListingRecord = Record<string, unknown>;
type CachedRecommendation = Exclude<Awaited<ReturnType<typeof toRecommendation>>, null>;

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
    isBanger: hasVerifiedHud ? fmr > (0.015 * purchasePrice) : false,
    explanation: hasVerifiedHud
      ? `I surfaced this house because it is actively listed for sale, the HUD county rent benchmark for a ${bedrooms}-bedroom unit is about $${fmr}/mo, projected monthly NOI is about $${Math.round((netOperating || 0) / 12)}/mo, and my current underwriting points to a cap rate near ${capRate?.toFixed(1)}%.`
      : 'I found a real asking price for this listing, but I could not verify HUD rent support from the configured HUD API, so I intentionally hid the underwriting metrics.',
    listingType: 'sale-or-valued',
    source: listing.source || 'rentcast-cache',
  };
}

async function getCachedRecommendations() {
  const cache = readRentcastCache();
  const deduped = new Map<string, CachedRecommendation>();

  for (const entry of Object.values(cache)) {
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
    ? snapshot.listings.map((listing) => ({ ...listing, listingsRoot: stored.latestListingsRoot || null }))
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
  const filters = body.filters || {};
  const rooted = await getLatestSnapshotRecommendations(req, owner, recordRoot || null);
  const baseRecommendations = rooted.recommendations.length ? rooted.recommendations : await getCachedRecommendations();
  const recommendations = baseRecommendations.filter((recommendation) => {
    const matchesZip = !requestedZip || String(recommendation?.zip || '') === requestedZip;
    const address = String(recommendation?.address || '');
    const location = getLocationParts(address);
    const matchesCity = !filters.city || filters.city === 'all' || location.city === filters.city;
    const matchesState = !filters.state || filters.state === 'all' || location.state === filters.state;
    const matchesBedrooms = !filters.minBedrooms || filters.minBedrooms === 'any' || Number(recommendation?.bedrooms || 0) >= Number(filters.minBedrooms);
    const matchesBathrooms = !filters.minBathrooms || filters.minBathrooms === 'any' || Number(recommendation?.bathrooms || 0) >= Number(filters.minBathrooms);
    const matchesPrice = !filters.maxPrice || Number(recommendation?.purchasePrice || 0) <= Number(filters.maxPrice);
    const types = Array.isArray(filters.propertyTypes) ? filters.propertyTypes : [];
    const matchesTypes = types.length === 0 || types.includes(String(recommendation?.propertyType || 'Single Family'));

    return matchesZip && matchesCity && matchesState && matchesBedrooms && matchesBathrooms && matchesPrice && matchesTypes;
  });

  return NextResponse.json({ success: true, recommendations });
}