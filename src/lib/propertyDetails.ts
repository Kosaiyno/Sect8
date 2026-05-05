import 'server-only';

import { read0gJson, type ListingsSnapshot } from '@/lib/0gPersistence';
import { getFairMarketRent } from '@/lib/realDataService';
import { resolveHousingAuthorityContact, type HousingAuthorityMatch } from '@/lib/phaDirectory';
import { readRentcastCache } from '@/lib/rentcastCache';
import { calculateUnderwriting } from '@/lib/underwriting';
import type { Recommendation } from '@/types';

type ListingRecord = Recommendation & Record<string, unknown>;

type AttomOwnerRecord = {
  owner1?: string | null;
  owner2?: string | null;
  mailingaddressoneline?: string | null;
  absenteeownerstatus?: string | null;
  corporateindicator?: string | null;
};

type AttomAssessmentHistoryRecord = {
  assessed?: {
    assdImprValue?: number | null;
    assdLandValue?: number | null;
    assdTtlValue?: number | null;
  };
  market?: {
    mktImprValue?: number | null;
    mktLandValue?: number | null;
    mktTtlValue?: number | null;
  };
  tax?: {
    assessorYear?: number | null;
    taxAmt?: number | null;
    taxYear?: number | null;
    taxYearAssessed?: number | null;
  };
  lastModified?: string | null;
};

type AttomSaleHistoryRecord = {
  sequence?: number | null;
  saleSearchDate?: string | null;
  saleTransDate?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  amount?: {
    saleAmt?: number | null;
    saleTransType?: string | null;
    deedType?: string | null;
    saleDocNum?: string | null;
  };
};

export type PropertyDetailBundle = {
  listing: ListingRecord;
  housingAuthority: HousingAuthorityMatch | null;
  attom: {
    ownership: {
      ownerName: string | null;
      mailingAddress: string | null;
      absenteeOwnerStatus: string | null;
      corporateOwner: boolean;
      verified: boolean;
    };
    parcel: {
      attomId: string | null;
      apn: string | null;
      propertyUse: string | null;
      yearBuilt: number | null;
      lotNumber: string | null;
      lotSizeSqft: number | null;
      latitude: number | null;
      longitude: number | null;
      geoIdV4: string | null;
    };
    assessedValue: {
      assessedTotal: number | null;
      marketTotal: number | null;
      taxAmount: number | null;
      assessorYear: number | null;
      taxYear: number | null;
    };
    taxHistory: Array<{
      assessorYear: number | null;
      taxYear: number | null;
      taxAmount: number | null;
      assessedTotal: number | null;
      marketTotal: number | null;
      lastModified: string | null;
    }>;
    deedHistory: Array<{
      sequence: number | null;
      recordedDate: string | null;
      transferDate: string | null;
      buyerName: string | null;
      sellerName: string | null;
      saleAmount: number | null;
      saleType: string | null;
      deedType: string | null;
      documentNumber: string | null;
    }>;
    risk: {
      flood: number | null;
      fire: number | null;
      environmental: Array<{ label: string; value: number | null }>;
      naturalDisasters: Array<{ label: string; value: number | null }>;
    };
  };
};

async function readSavedListings(listingsRoot?: string | null) {
  const snapshot = await read0gJson<ListingsSnapshot>(listingsRoot);
  return Array.isArray(snapshot?.listings) ? snapshot.listings as ListingRecord[] : [];
}

function normalizeCachedListing(listing: Record<string, unknown>, zipCode: string) {
  const purchasePrice = Number(listing.purchasePrice || listing.price || listing.listPrice || 0) || null;

  return {
    id: String(listing.id || listing.listingId || `${zipCode}-${listing.address || 'listing'}`),
    address: String(listing.address || listing.formattedAddress || `Unknown ${zipCode}`),
    zip: String(listing.zip || zipCode),
    bedrooms: Number(listing.bedrooms || 0),
    bathrooms: listing.bathrooms === null || listing.bathrooms === undefined ? null : Number(listing.bathrooms),
    purchasePrice,
    estRent: listing.estRent === null || listing.estRent === undefined ? undefined : Number(listing.estRent),
    fmr: listing.fmr === null || listing.fmr === undefined ? undefined : Number(listing.fmr),
    fmrSource: listing.fmrSource ? String(listing.fmrSource) : undefined,
    annualRent: listing.annualRent === null || listing.annualRent === undefined ? undefined : Number(listing.annualRent),
    annualCashflow: listing.annualCashflow === null || listing.annualCashflow === undefined ? undefined : Number(listing.annualCashflow),
    estExpenses: listing.estExpenses === null || listing.estExpenses === undefined ? undefined : Number(listing.estExpenses),
    netOperating: listing.netOperating === null || listing.netOperating === undefined ? undefined : Number(listing.netOperating),
    cashflow: listing.cashflow === null || listing.cashflow === undefined ? undefined : Number(listing.cashflow),
    capRate: listing.capRate === null || listing.capRate === undefined ? undefined : Number(listing.capRate),
    roi: listing.roi === null || listing.roi === undefined ? undefined : Number(listing.roi),
    source: String(listing.source || 'rentcast-cache'),
    propertyType: listing.propertyType ? String(listing.propertyType) : null,
    squareFootage: listing.squareFootage === null || listing.squareFootage === undefined ? null : Number(listing.squareFootage),
    url: listing.url ? String(listing.url) : null,
    contactEmail: listing.contactEmail ? String(listing.contactEmail) : null,
    contactPhone: listing.contactPhone ? String(listing.contactPhone) : null,
    explanation: listing.explanation ? String(listing.explanation) : undefined,
    timestamp: Number(listing.timestamp || Date.now()),
  } as ListingRecord;
}

export async function getPropertyListingPreview(id: string, listingsRoot?: string | null) {
  const normalizedId = decodeURIComponent(id);
  const savedMatch = (await readSavedListings(listingsRoot)).find((listing) => String(listing.id) === normalizedId);
  if (savedMatch) {
    return savedMatch as ListingRecord;
  }

  const cache = readRentcastCache();
  for (const entry of Object.values(cache)) {
    for (const listing of entry.listings || []) {
      const candidateId = String(listing.id || listing.listingId || '');
      if (candidateId === normalizedId) {
        return normalizeCachedListing(listing, entry.zipCode);
      }
    }
  }

  return null;
}

function splitAddress(address: string) {
  const [address1 = '', city = '', stateZip = ''] = address.split(',').map((part) => part.trim());
  const address2 = [city, stateZip].filter(Boolean).join(', ');
  return { address1, address2 };
}

async function fetchAttomJson<T>(url: string) {
  const apiKey = process.env.ATTOM_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        APIKey: apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as T;
  } catch {
    return null;
  }
}

function toCurrencyNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toRiskSeries(source: Record<string, unknown> | null | undefined, keys: Array<[string, string]>) {
  return keys.map(([field, label]) => ({
    label,
    value: source ? toCurrencyNumber(source[field]) : null,
  }));
}

export async function getPropertyDetailBundle(id: string, listingsRoot?: string | null): Promise<PropertyDetailBundle | null> {
  const baseListing = await getPropertyListingPreview(id, listingsRoot);
  if (!baseListing) {
    return null;
  }

  const listing = { ...baseListing };
  const housingAuthority = await resolveHousingAuthorityContact({
    address: String(listing.address || ''),
    zipCode: String(listing.zip || ''),
  });

  if (listing.address && listing.purchasePrice && listing.bedrooms) {
    const fairMarketRent = await getFairMarketRent(String(listing.zip || ''), Number(listing.bedrooms), String(listing.address));
    if (fairMarketRent.source === 'hud') {
      const estRent = Number(listing.estRent || fairMarketRent.value);
      const underwriting = calculateUnderwriting({ purchasePrice: Number(listing.purchasePrice), estRent });

      listing.fmr = fairMarketRent.value;
      listing.fmrSource = 'hud';
      listing.estRent = estRent;
      listing.annualRent = underwriting.annualRent;
      listing.annualCashflow = underwriting.annualCashflow;
      listing.estExpenses = underwriting.estExpenses;
      listing.netOperating = underwriting.netOperating;
      listing.cashflow = underwriting.monthlyCashflow;
      listing.capRate = underwriting.capRate;
      listing.roi = underwriting.roi ?? undefined;
    }
  }

  const { address1, address2 } = splitAddress(String(listing.address || ''));
  if (!address1 || !address2) {
    return {
      listing,
      housingAuthority,
      attom: {
        ownership: { ownerName: null, mailingAddress: null, absenteeOwnerStatus: null, corporateOwner: false, verified: false },
        parcel: { attomId: null, apn: null, propertyUse: null, yearBuilt: null, lotNumber: null, lotSizeSqft: null, latitude: null, longitude: null, geoIdV4: null },
        assessedValue: { assessedTotal: null, marketTotal: null, taxAmount: null, assessorYear: null, taxYear: null },
        taxHistory: [],
        deedHistory: [],
        risk: { flood: null, fire: null, environmental: [], naturalDisasters: [] },
      },
    };
  }

  const base = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
  const addressQuery = `address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;

  const [detailJson, ownerJson, assessmentJson, salesJson] = await Promise.all([
    fetchAttomJson<{ property?: Array<Record<string, unknown>> }>(`${base}/property/detail?${addressQuery}&debug=True`),
    fetchAttomJson<{ property?: Array<{ owner?: AttomOwnerRecord[] }> }>(`${base}/property/detailowner?${addressQuery}&debug=True`),
    fetchAttomJson<{ property?: Array<{ assessmenthistory?: AttomAssessmentHistoryRecord[] }> }>(`${base}/assessmenthistory/detail?${addressQuery}&debug=True`),
    fetchAttomJson<{ property?: Array<{ saleHistory?: AttomSaleHistoryRecord[] }> }>(`${base}/saleshistory/expandedhistory?${addressQuery}&debug=True`),
  ]);

  const detail = detailJson?.property?.[0] || null;
  const owner = ownerJson?.property?.[0]?.owner?.[0] || null;
  const assessmentHistory = Array.isArray(assessmentJson?.property?.[0]?.assessmenthistory) ? assessmentJson?.property?.[0]?.assessmenthistory || [] : [];
  const currentAssessment = assessmentHistory[0] || null;
  const saleHistory = Array.isArray(salesJson?.property?.[0]?.saleHistory) ? salesJson?.property?.[0]?.saleHistory || [] : [];
  const geoIdV4 = detail && typeof detail === 'object' && detail.location && typeof detail.location === 'object' && 'geoIdV4' in detail.location
    ? String((detail.location as { geoIdV4?: { ZI?: string } }).geoIdV4?.ZI || '')
    : '';

  const communityJson = geoIdV4
    ? await fetchAttomJson<{ community?: Record<string, Record<string, unknown>> }>(`https://api.gateway.attomdata.com/v4/neighborhood/community?geoIdV4=${encodeURIComponent(geoIdV4)}`)
    : null;

  const naturalDisasters = communityJson?.community?.naturalDisasters;
  const airQuality = communityJson?.community?.airQuality;

  return {
    listing,
    housingAuthority,
    attom: {
      ownership: {
        ownerName: owner?.owner1 || owner?.owner2 || null,
        mailingAddress: owner?.mailingaddressoneline || null,
        absenteeOwnerStatus: owner?.absenteeownerstatus || null,
        corporateOwner: String(owner?.corporateindicator || '').toUpperCase() === 'Y',
        verified: Boolean(owner),
      },
      parcel: {
        attomId: detail && typeof detail === 'object' && detail.identifier && typeof detail.identifier === 'object' ? String((detail.identifier as { attomId?: string | number }).attomId || '') || null : null,
        apn: detail && typeof detail === 'object' && detail.identifier && typeof detail.identifier === 'object' ? String((detail.identifier as { apn?: string }).apn || '') || null : null,
        propertyUse: detail && typeof detail === 'object' && detail.summary && typeof detail.summary === 'object' ? String((detail.summary as { propclass?: string }).propclass || '') || null : null,
        yearBuilt: detail && typeof detail === 'object' && detail.summary && typeof detail.summary === 'object' ? toCurrencyNumber((detail.summary as { yearbuilt?: number }).yearbuilt) : null,
        lotNumber: detail && typeof detail === 'object' && detail.lot && typeof detail.lot === 'object' ? String((detail.lot as { lotNum?: string }).lotNum || '') || null : null,
        lotSizeSqft: detail && typeof detail === 'object' && detail.lot && typeof detail.lot === 'object' ? toCurrencyNumber((detail.lot as { lotSize2?: number }).lotSize2) : null,
        latitude: detail && typeof detail === 'object' && detail.location && typeof detail.location === 'object' ? toCurrencyNumber((detail.location as { latitude?: number }).latitude) : null,
        longitude: detail && typeof detail === 'object' && detail.location && typeof detail.location === 'object' ? toCurrencyNumber((detail.location as { longitude?: number }).longitude) : null,
        geoIdV4: geoIdV4 || null,
      },
      assessedValue: {
        assessedTotal: currentAssessment?.assessed?.assdTtlValue ?? null,
        marketTotal: currentAssessment?.market?.mktTtlValue ?? null,
        taxAmount: currentAssessment?.tax?.taxAmt ?? null,
        assessorYear: currentAssessment?.tax?.assessorYear ?? null,
        taxYear: currentAssessment?.tax?.taxYear ?? null,
      },
      taxHistory: assessmentHistory.slice(0, 12).map((item) => ({
        assessorYear: item.tax?.assessorYear ?? null,
        taxYear: item.tax?.taxYear ?? null,
        taxAmount: item.tax?.taxAmt ?? null,
        assessedTotal: item.assessed?.assdTtlValue ?? null,
        marketTotal: item.market?.mktTtlValue ?? null,
        lastModified: item.lastModified ?? null,
      })),
      deedHistory: saleHistory.slice(0, 12).map((item) => ({
        sequence: item.sequence ?? null,
        recordedDate: item.saleSearchDate ?? null,
        transferDate: item.saleTransDate ?? null,
        buyerName: item.buyerName ?? null,
        sellerName: item.sellerName ?? null,
        saleAmount: item.amount?.saleAmt ?? null,
        saleType: item.amount?.saleTransType ?? null,
        deedType: item.amount?.deedType ?? null,
        documentNumber: item.amount?.saleDocNum ?? null,
      })),
      risk: {
        flood: naturalDisasters ? toCurrencyNumber(naturalDisasters.flood_Index) : null,
        fire: naturalDisasters ? toCurrencyNumber(naturalDisasters.fire_Index || naturalDisasters.wildfire_Index) : null,
        environmental: [
          ...toRiskSeries(airQuality, [
            ['air_Pollution_Index', 'Air Pollution'],
            ['carbon_Monoxide_Index', 'Carbon Monoxide'],
            ['lead_Index', 'Lead'],
            ['nitrogen_Dioxide_Index', 'Nitrogen Dioxide'],
            ['ozone_Index', 'Ozone'],
            ['particulate_Matter_Index', 'Particulate Matter'],
          ]),
        ],
        naturalDisasters: [
          ...toRiskSeries(naturalDisasters, [
            ['weather_Index', 'Weather'],
            ['wind_Index', 'Wind'],
            ['hail_Index', 'Hail'],
            ['tornado_Index', 'Tornado'],
            ['hurricane_Index', 'Hurricane'],
            ['earthquake_Index', 'Earthquake'],
          ]),
        ],
      },
    },
  };
}