import { NextResponse } from 'next/server';
import { fetchRealProperties, getFairMarketRent, getValidatedPurchasePrice, isExcludedListingRecord, normalizePropertyType } from '@/lib/realDataService';
import { uploadToStorage } from '@/app/actions/og';
import { getAgentRecordCookieName, readCookieValue, write0gJson, type AgentLogEntry, type ListingsSnapshot } from '@/lib/0gPersistence';
import { upsertAgentRecord } from '@/lib/agentStore';
import { getOrCreatePropertyAnalysis } from '@/lib/propertyAnalysis';
import { getPropertyDetailBundle } from '@/lib/propertyDetails';
import { getRentcastCacheKey, loadCachedRentcastListings, upsertRentcastCacheEntry } from '@/lib/rentcastCache';
import { calculateUnderwriting } from '@/lib/underwriting';

function getImageUrl(listing: Record<string, unknown>) {
  const photoCandidate = listing.photo;
  const firstPhoto = Array.isArray(listing.photos) ? listing.photos[0] : null;
  const firstMedia = Array.isArray(listing.media) ? listing.media[0] : null;

  const rawValue =
    (typeof listing.image === 'string' && listing.image) ||
    (typeof photoCandidate === 'string' && photoCandidate) ||
    (photoCandidate && typeof photoCandidate === 'object' && typeof (photoCandidate as { url?: unknown }).url === 'string' ? String((photoCandidate as { url?: unknown }).url) : null) ||
    (firstPhoto && typeof firstPhoto === 'object' && typeof (firstPhoto as { url?: unknown }).url === 'string' ? String((firstPhoto as { url?: unknown }).url) : null) ||
    (typeof firstPhoto === 'string' ? firstPhoto : null) ||
    (firstMedia && typeof firstMedia === 'object' && typeof (firstMedia as { url?: unknown }).url === 'string' ? String((firstMedia as { url?: unknown }).url) : null) ||
    null;

  if (!rawValue) {
    return null;
  }

  if (rawValue.includes('via.placeholder') || rawValue.includes('placehold.co')) {
    return null;
  }

  return rawValue;
}

function getPurchasePriceCandidate(listing: Record<string, unknown>) {
  const estimate = listing.estimate && typeof listing.estimate === 'object'
    ? listing.estimate as { purchasePrice?: unknown }
    : null;

  const candidate = Number(
    listing.price ||
    listing.listPrice ||
    listing.salePrice ||
    listing.priceEstimate ||
    listing.estimatedValue ||
    listing.assessedValue ||
    listing.marketValue ||
    estimate?.purchasePrice ||
    0
  );

  return candidate >= 10000 ? candidate : null;
}

function buildReasoning(listing: {
  purchasePrice: number | null;
  estRent: number;
  fmr: number;
  monthlyCashflow: number;
  capRate: number | null;
  roi: number | null;
  bedrooms: number;
  zip: string;
}) {
  return `I surfaced this house because it is actively listed for sale, the area rent benchmark for a ${listing.bedrooms}-bedroom unit is about $${listing.fmr}/mo, projected monthly cash flow is about $${listing.monthlyCashflow}/mo, and my current underwriting points to a cap rate near ${listing.capRate?.toFixed(1)}% with an all-cash ROI near ${listing.roi?.toFixed(1)}%.`;
}

async function precomputePropertyAnalyses(listingIds: string[], listingsRoot: string | null) {
  const results = [];

  for (const listingId of listingIds) {
    try {
      const bundle = await getPropertyDetailBundle(listingId, listingsRoot);
      if (!bundle) {
        results.push({ listingId, status: 'missing-bundle' as const });
        continue;
      }

      const analysis = await getOrCreatePropertyAnalysis(bundle, String(bundle.listing.analysisRoot || ''));
      results.push({
        listingId,
        status: analysis.fromCache ? 'cache-hit' as const : 'generated' as const,
        provider: analysis.record.provider,
        storageRoot: analysis.record.storageRoot,
        attomRoot: bundle.listing.attomRoot || null,
      });
    } catch (error) {
      results.push({
        listingId,
        status: 'error' as const,
        error: String(error),
      });
    }
  }

  return results;
}

function scoreWarmupCandidate(listing: Record<string, unknown>) {
  if (String(listing.fmrSource || '') !== 'hud') {
    return -1;
  }

  const monthlyNoi = Math.round(Number(listing.netOperating || 0) / 12);
  return Number(listing.capRate || 0) * 100 + monthlyNoi;
}

function selectWarmupListingIds(results: Array<Record<string, unknown>>) {
  if (!results.length) {
    return [] as string[];
  }

  const sorted = [...results].sort((left, right) => scoreWarmupCandidate(right) - scoreWarmupCandidate(left));
  const topPickId = sorted[0]?.id ? String(sorted[0].id) : null;
  const newestIds = results.slice(0, 11).map((result) => String(result.id));

  return [...new Set([topPickId, ...newestIds].filter(Boolean) as string[])];
}

function normalizeListings(items: Array<Record<string, unknown>>, zip: string, minBedrooms: number, sourceOverride?: string) {
  return items.map((it: Record<string, unknown>) => {
    const estimate = it.estimate && typeof it.estimate === 'object'
      ? it.estimate as { rent?: unknown }
      : null;

    return ({
    id: it.id || it.listingId || String(Math.random()).slice(2),
    address: it.formattedAddress || it.address || [it.street || it.addressLine || it.addressLine1 || it.title, it.city, it.state, it.zipCode || it.zip].filter(Boolean).join(', ') || `Unknown ${zip}`,
    zip,
    bedrooms: it.bedrooms || minBedrooms,
    bathrooms: it.bathrooms || it.bathroomCount || it.baths || null,
    propertyType: normalizePropertyType(it.propertyType),
    squareFootage: it.squareFootage || null,
    purchasePrice: getPurchasePriceCandidate(it),
    askingRent: null,
    estRent: it.rentEstimate || it.estimatedRent || it.rent || it.monthlyRent || estimate?.rent || it.estRent || null,
    source: sourceOverride || it.source || 'rentcast',
    listingType: getPurchasePriceCandidate(it) ? 'sale-or-valued' : 'unknown',
    image: getImageUrl(it),
    locationScore: it.locationScore || null,
    demandSignal: it.demandSignal || null,
    url: it.url || null,
    contactEmail: it.contactEmail || null,
    contactPhone: it.contactPhone || null,
  });
  }).filter((listing) => !isExcludedListingRecord(listing) && Number(listing.purchasePrice || 0) >= 10000 && Number(listing.bedrooms || 0) >= Number(minBedrooms || 0));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const zip = body.zipCode || (body.preferences && body.preferences.zipCode) || null;
    const minBedrooms = body.minBedrooms || (body.preferences && body.preferences.minBedrooms) || 1;
    const owner = typeof (body.owner || (body.preferences && body.preferences.owner) || '') === 'string'
      ? String(body.owner || (body.preferences && body.preferences.owner) || '').trim().toLowerCase()
      : '';
    const preferences = body.preferences || { zipCode: zip, minBedrooms };
    const cookieName = owner ? getAgentRecordCookieName(owner) : null;
    const currentRecordRoot = owner
      ? (typeof body.recordRoot === 'string' && body.recordRoot.trim()
        ? body.recordRoot.trim()
        : readCookieValue(req.headers.get('cookie'), cookieName || ''))
      : null;

    if (!zip) return NextResponse.json({ success: false, error: 'zipCode required' }, { status: 400 });

    const cacheKey = getRentcastCacheKey(zip, Number(minBedrooms));
    const rc = await fetchRealProperties(zip, minBedrooms);
    let listings: Array<Record<string, unknown>> = [];
    let cacheOrigin: 'live' | 'cache' | 'mock' = 'mock';
    let rawRoot: string | null = null;
    let normalizedRoot: string | null = null;
    let fetchedAt = Date.now();

    if (rc && Array.isArray(rc?.data || rc)) {
      const items = Array.isArray(rc.data) ? rc.data : rc;
      const isMockResponse = items.some((it: Record<string, unknown>) => String(it.source || '').startsWith('mock'));

      if (isMockResponse) {
        listings = [];
        cacheOrigin = 'mock';
      } else {
        listings = normalizeListings(items, zip, Number(minBedrooms), 'rentcast-live');
        cacheOrigin = 'live';

        const rawSnapshot = {
          zipCode: zip,
          bedrooms: Number(minBedrooms),
          fetchedAt,
          source: 'rentcast-live',
          payload: items,
        };
        const rawUpload = await uploadToStorage(JSON.stringify(rawSnapshot));

        rawRoot = rawUpload.success ? rawUpload.hash || null : null;
      }
    } else {
      const cached = await loadCachedRentcastListings(zip, Number(minBedrooms));

      if (cached?.listings?.length) {
        listings = normalizeListings(cached.listings, zip, Number(minBedrooms), 'rentcast-cache');
        cacheOrigin = 'cache';
        fetchedAt = cached.entry.fetchedAt;
        rawRoot = cached.entry.rawRoot || null;
        normalizedRoot = cached.entry.normalizedRoot || null;
      } else {
        listings = [];
      }
    }

    const results: Array<Record<string, unknown>> = [];
    const logs: AgentLogEntry[] = [];

    for (const p of listings) {
      const fairMarketRent = await getFairMarketRent(String(p.zip), Number(p.bedrooms || 1), String(p.address || ''));
      const fmr = fairMarketRent.value;
      const estRent = Number(p.estRent || fmr);
      const rawPurchase = p.purchasePrice ? Number(p.purchasePrice) : null;
      const purchase = rawPurchase === null ? null : getValidatedPurchasePrice(rawPurchase, estRent);

      if (purchase === null) {
        continue;
      }

      const isBanger = purchase ? fmr > (0.015 * purchase) : false;
      const underwriting = calculateUnderwriting({ purchasePrice: purchase, estRent });

      const explanation = buildReasoning({
        purchasePrice: purchase,
        estRent,
        fmr,
        monthlyCashflow: underwriting.monthlyCashflow,
        capRate: underwriting.capRate,
        roi: underwriting.roi,
        bedrooms: Number(p.bedrooms || 1),
        zip: String(p.zip),
      });

      const rec = {
        id: String(p.id),
        address: String(p.address),
        zip: String(p.zip),
        bedrooms: Number(p.bedrooms),
        bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
        propertyType: p.propertyType || null,
        squareFootage: p.squareFootage ? Number(p.squareFootage) : null,
        purchasePrice: purchase,
        askingRent: null,
        estRent,
        image: p.image || null,
        locationScore: p.locationScore || null,
        demandSignal: p.demandSignal || null,
        fmr,
        fmrSource: fairMarketRent.source,
        annualRent: underwriting.annualRent,
        annualCashflow: underwriting.annualCashflow,
        grossYield: underwriting.grossYield,
        estExpenses: underwriting.estExpenses,
        netOperating: underwriting.netOperating,
        cashflow: underwriting.monthlyCashflow,
        capRate: underwriting.capRate,
        roi: underwriting.roi,
        isBanger,
        explanation,
        timestamp: Date.now(),
        source: p.source || 'unknown',
        listingType: 'sale-or-valued',
        url: p.url || null,
        contactEmail: p.contactEmail || null,
        contactPhone: p.contactPhone || null,
      };

      results.push(rec);

      // append log entry
      logs.push({ time: Date.now(), type: isBanger ? 'banger' : 'match', message: explanation, listingId: rec.id });

      // Build agent memory and save to storage (local fallback via uploadToStorage)
      const memory = { agentId: owner || 'scan-session', owner: owner || null, listing: rec, explanation, createdAt: Date.now() };
      try {
        const upload = await uploadToStorage(JSON.stringify(memory));
        if (upload?.success) {
          logs.push({ time: Date.now(), type: 'storage', message: `Saved memory for ${rec.id} -> ${upload.hash}`, hash: upload.hash });
        } else {
          logs.push({ time: Date.now(), type: 'storage_error', message: String(upload?.error || 'unknown') });
        }
      } catch (error) {
        logs.push({ time: Date.now(), type: 'storage_error', message: String(error) });
      }
    }

    const provisionalListingsRoot = await write0gJson({
      type: 'listings-snapshot',
      owner: owner || null,
      zipCode: zip,
      bedrooms: Number(minBedrooms),
      fetchedAt,
      rawRoot,
      listings: results,
    } satisfies ListingsSnapshot);

    const agentMemory = {
      agentId: owner ? `agent-${owner}` : 'scan-session',
      owner: owner || null,
      preferences,
      history: [`I completed a scan for ZIP ${zip} and found ${results.length} recommendations (${cacheOrigin})`],
      lastScanTimestamp: Date.now(),
      recommendations: results.slice(0, 10),
    };

    let memoryRoot: string | null = null;
    let logsRoot: string | null = null;

    try {
      const upload = await uploadToStorage(JSON.stringify(agentMemory));
      if (upload.success && upload.hash) {
        memoryRoot = upload.hash;
      }
    } catch (error) {
      logs.push({ time: Date.now(), type: 'agent_memory_error', message: String(error) });
    }

    const warmupListingIds = selectWarmupListingIds(results);
    const analysisPrecompute = await precomputePropertyAnalyses(warmupListingIds, provisionalListingsRoot);
    const analysisGenerated = analysisPrecompute.filter((entry) => entry.status === 'generated').length;
    const analysisCached = analysisPrecompute.filter((entry) => entry.status === 'cache-hit').length;
    const analysisErrors = analysisPrecompute.filter((entry) => entry.status === 'error').length;

    logs.push({
      time: Date.now(),
      type: 'analysis_precompute',
      message: `Precomputed ${analysisGenerated} analyses, reused ${analysisCached}, errors ${analysisErrors}, warmed ${warmupListingIds.length} likely first-click listings`,
    });

    const analysisRootById = new Map(
      analysisPrecompute
        .filter((entry) => entry.status !== 'error' && entry.storageRoot)
        .map((entry) => [String(entry.listingId), entry.storageRoot as string])
    );
    const attomRootById = new Map(
      analysisPrecompute
        .filter((entry) => entry.status !== 'error' && entry.attomRoot)
        .map((entry) => [String(entry.listingId), entry.attomRoot as string])
    );

    const enrichedResults = results.map((result) => ({
      ...result,
      listingsRoot: null,
      analysisRoot: analysisRootById.get(String(result.id)) || null,
      attomRoot: attomRootById.get(String(result.id)) || null,
    }));

    logsRoot = await write0gJson({
      type: 'scan-logs',
      owner: owner || null,
      zipCode: zip,
      createdAt: Date.now(),
      entries: logs,
    });

    normalizedRoot = await write0gJson({
      type: 'listings-snapshot',
      owner: owner || null,
      zipCode: zip,
      bedrooms: Number(minBedrooms),
      fetchedAt,
      rawRoot,
      logsRoot,
      listings: enrichedResults,
    } satisfies ListingsSnapshot);

    const finalResults = enrichedResults.map((result) => ({
      ...result,
      listingsRoot: normalizedRoot,
    }));

    normalizedRoot = await write0gJson({
      type: 'listings-snapshot',
      owner: owner || null,
      zipCode: zip,
      bedrooms: Number(minBedrooms),
      fetchedAt,
      rawRoot,
      logsRoot,
      listings: finalResults,
    } satisfies ListingsSnapshot);

    upsertRentcastCacheEntry({
      key: cacheKey,
      zipCode: zip,
      bedrooms: Number(minBedrooms),
      fetchedAt,
      rawCount: listings.length,
      normalizedCount: finalResults.length,
      rawRoot,
      normalizedRoot,
      listings: finalResults,
    });

    let recordRoot: string | null = null;
    if (owner) {
      const updated = await upsertAgentRecord(owner, {
        owner,
        agentId: `agent-${owner}`,
        preferences,
        memoryRoot,
        latestListingsRoot: normalizedRoot,
        latestRawRentcastRoot: rawRoot,
        latestListingsZip: zip,
        latestListingsBedrooms: Number(minBedrooms),
        latestListingsFetchedAt: fetchedAt,
        logsRoot,
      }, currentRecordRoot);
      recordRoot = updated.root;
    }

    const response = NextResponse.json({ success: true, recommendations: finalResults, memory: agentMemory, memoryRoot, recordRoot, cacheOrigin, listingsRoot: normalizedRoot, rawRoot, logsRoot, analysisPrecompute });
    if (cookieName && recordRoot) {
      response.cookies.set(cookieName, recordRoot, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('scan route error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

