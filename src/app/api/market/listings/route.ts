import { NextResponse } from 'next/server';
import { filterExcludedListings, getFMR } from '@/lib/realDataService';
import { loadCachedRentcastListings } from '@/lib/rentcastCache';

function normalizeMarketListings(items: Array<Record<string, unknown>>, zipCode: string, bedrooms: number, sourceOverride?: string) {
  return filterExcludedListings(items).map((item, index) => {
    const bedroomCount = Number(item.bedrooms || item.bedroomCount || item.beds || bedrooms || 3);
    const bathroomCount = Number(item.bathrooms || item.bathroomCount || item.baths || 1);
    const address = String(
      item.formattedAddress
      || item.address
      || [item.addressLine, item.city, item.state, item.zipCode || item.zip].filter(Boolean).join(', ')
      || item.title
      || `Unknown Address ${index + 1}`
    );
    const estimatedRent = Number(item.rentEstimate || item.estimatedRent || item.rent || 0) || getFMR(zipCode, bedroomCount);
    const price = Number(item.price || item.listPrice || item.salePrice || item.priceEstimate || item.purchasePrice || 0);

    return {
      id: item.id || item.listingId || `${Date.now()}-${index}`,
      address,
      price,
      bedrooms: bedroomCount,
      bathrooms: bathroomCount,
      estimatedRent,
      section8Cap: getFMR(zipCode, bedroomCount),
      locationScore: Number(item.locationScore || 75),
      source: sourceOverride || item.source || 'rentcast-live',
    };
  }).filter((listing) => listing.price >= 10000);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const zipCode = searchParams.get('zipCode')?.trim() || '48201';
  const bedrooms = Number(searchParams.get('bedrooms') || 3);

  try {
    const cached = await loadCachedRentcastListings(zipCode, bedrooms);
    if (cached?.listings?.length) {
      return NextResponse.json({
        success: true,
        listings: normalizeMarketListings(cached.listings, zipCode, bedrooms, 'rentcast-cache'),
        source: 'rentcast-cache',
      });
    }

    return NextResponse.json({ success: true, listings: [], source: 'none' });
  } catch (error) {
    const cached = await loadCachedRentcastListings(zipCode, bedrooms);
    if (cached?.listings?.length) {
      return NextResponse.json({
        success: true,
        listings: normalizeMarketListings(cached.listings, zipCode, bedrooms, 'rentcast-cache'),
        source: 'rentcast-cache',
      });
    }

    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}