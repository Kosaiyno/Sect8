import { NextRequest, NextResponse } from 'next/server';
import { getFairMarketRent, normalizePropertyType } from '@/lib/realDataService';
import { calculateUnderwriting } from '@/lib/underwriting';
import { write0gJson, type ListingsSnapshot } from '@/lib/0gPersistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toPositiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function toOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getZipCode(address: string) {
  const fromAddress = address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5);
  return fromAddress || '48201'; // Default backup ZIP
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = String(body.address || '').trim();
    const purchasePrice = toPositiveNumber(body.purchasePrice, 0);
    const bedrooms = Math.round(toPositiveNumber(body.bedrooms, 3));
    const bathrooms = toOptionalNumber(body.bathrooms) || 1;
    const propertyType = String(body.propertyType || 'Single Family');

    if (!address || !purchasePrice) {
      return NextResponse.json(
        { success: false, error: 'Address and purchase price are required.' },
        { status: 400 }
      );
    }

    const zipCode = getZipCode(address);
    const fairMarketRent = await getFairMarketRent(zipCode, bedrooms, address);
    
    // Default rent assumption to HUD FMR (standard strategy)
    const estRent = fairMarketRent.value;
    const underwriting = calculateUnderwriting({ purchasePrice, estRent });
    
    // Create a unique listing ID prefixed with "custom-" to avoid collisions
    const listingId = `custom-${zipCode}-${Buffer.from(address).toString('base64url').slice(0, 32)}`;
    
    const listing = {
      id: listingId,
      address,
      zip: zipCode,
      bedrooms,
      bathrooms,
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
      propertyType: normalizePropertyType(propertyType),
      squareFootage: null,
      source: 'custom-input',
      timestamp: Date.now(),
    };

    const listingsRoot = await write0gJson({
      type: 'listings-snapshot',
      owner: null,
      zipCode,
      bedrooms,
      fetchedAt: Date.now(),
      listings: [listing],
    } satisfies ListingsSnapshot);

    return NextResponse.json({
      success: true,
      listingId,
      listingsRoot,
    });
  } catch (error) {
    console.error('Custom property initialization error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
