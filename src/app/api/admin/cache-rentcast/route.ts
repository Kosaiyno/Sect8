import { NextResponse } from 'next/server';
import { fetchRealProperties, isExcludedListingRecord, normalizePropertyType } from '@/lib/realDataService';
import { uploadToStorage } from '@/app/actions/og';
import { getRentcastCacheKey, upsertRentcastCacheEntry } from '@/lib/rentcastCache';

function normalizeListingForCache(item: Record<string, unknown>, zip: string, minBedrooms: number) {
  const bedroomCount = Number(item.bedrooms || item.bedroomCount || item.beds || minBedrooms || 3);
  const bathroomCount = Number(item.bathrooms || item.bathroomCount || item.baths || 1);
  const address = String(
    item.formattedAddress
    || item.address
    || [item.addressLine, item.city, item.state, item.zipCode || item.zip].filter(Boolean).join(', ')
    || item.title
    || `Unknown Address`
  );
  // image extraction: look for common fields used by RentCast
  function extractImages(src: Record<string, unknown>) {
    const photos: string[] = [];

    const pushIfUrl = (val: unknown) => {
      try {
        if (!val) return;
        if (typeof val === 'string' && val.startsWith('http')) {
          photos.push(val);
        } else if (typeof val === 'object' && val) {
          const maybeUrl = (val as any).url || (val as any).image || (val as any).src;
          if (typeof maybeUrl === 'string' && maybeUrl.startsWith('http')) photos.push(maybeUrl);
        }
      } catch {}
    };

    pushIfUrl(src.image);
    pushIfUrl(src.photo);
    // photos array
    if (Array.isArray(src.photos)) {
      for (const p of src.photos.slice(0, 4)) pushIfUrl(p);
    }
    // media array
    if (Array.isArray(src.media)) {
      for (const m of src.media.slice(0, 4)) pushIfUrl((m as any).url || (m as any).src || m);
    }

    // coerce unique and limit to 2
    const unique = Array.from(new Set(photos)).slice(0, 2);
    return { image: unique[0] || null, photos: unique };
  }

  const imgs = extractImages(item);

  return {
    id: item.id || item.listingId || `${Date.now()}-${Math.random()}`,
    address,
    price: Number(item.price || item.listPrice || item.salePrice || item.priceEstimate || 0) || 0,
    bedrooms: bedroomCount,
    bathrooms: bathroomCount,
    estimatedRent: Number(item.rentEstimate || item.estimatedRent || item.rent || 0) || 0,
    source: item.source || 'rentcast-live',
    image: imgs.image,
    photos: imgs.photos,
    raw: item,
  } as Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const zips: string[] = Array.isArray(body.zips) ? body.zips.map(String) : [];
    const bedrooms = Number(body.bedrooms || 3);

    if (!zips.length) {
      return NextResponse.json({ success: false, error: 'zips array required' }, { status: 400 });
    }

    const results: Array<{ zip: string; key: string; rawRoot: string | null; normalizedRoot: string | null; count: number }> = [];

    for (const zipRaw of zips) {
      const zip = String(zipRaw).trim();
      if (!zip) continue;
      try {
        const rc = await fetchRealProperties(zip, bedrooms);
        if (!rc || (!Array.isArray(rc) && !Array.isArray(rc.data))) {
          // nothing we can cache
          results.push({ zip, key: getRentcastCacheKey(zip, bedrooms), rawRoot: null, normalizedRoot: null, count: 0 });
          continue;
        }

        let items = Array.isArray(rc.data) ? rc.data : (Array.isArray(rc) ? rc : []);

        // Apply filters: exclude land/lot, bedrooms between 2 and 4, and allowed property types
        const allowedTypes = new Set(['Single Family', 'Duplex', 'Townhouse', 'Multifamily', 'Single Family Residence']);
        items = items.filter((it: Record<string, unknown>) => {
          try {
            if (isExcludedListingRecord(it)) return false;
            const bedroomsVal = Number(it.bedrooms || it.bedroomCount || it.beds || 0);
            if (!Number.isFinite(bedroomsVal)) return false;
            if (bedroomsVal < 2 || bedroomsVal > 4) return false;
            const ptype = normalizePropertyType(it.propertyType || it.type || '');
            if (!allowedTypes.has(ptype)) return false;
            return true;
          } catch {
            return false;
          }
        });

        const rawSnapshot = { zipCode: zip, bedrooms, fetchedAt: Date.now(), source: 'rentcast-live', payload: items };
        const rawUpload = await uploadToStorage(JSON.stringify(rawSnapshot));
        const rawRoot = rawUpload.success ? rawUpload.hash || null : null;

        const normalized = items.map((it: Record<string, unknown>) => normalizeListingForCache(it, zip, bedrooms));
        const normalizedSnapshot = { zipCode: zip, bedrooms, fetchedAt: Date.now(), source: 'rentcast-live', listings: normalized };
        const normUpload = await uploadToStorage(JSON.stringify(normalizedSnapshot));
        const normalizedRoot = normUpload.success ? normUpload.hash || null : null;

        upsertRentcastCacheEntry({
          key: getRentcastCacheKey(zip, bedrooms),
          zipCode: zip,
          bedrooms,
          fetchedAt: Date.now(),
          rawCount: Array.isArray(items) ? items.length : 0,
          normalizedCount: normalized.length,
          rawRoot,
          normalizedRoot,
          listings: normalized,
        });

        results.push({ zip, key: getRentcastCacheKey(zip, bedrooms), rawRoot, normalizedRoot, count: normalized.length });
      } catch (err) {
        console.error('cache-rentcast error for', zip, err);
        results.push({ zip: zip, key: getRentcastCacheKey(zip, bedrooms), rawRoot: null, normalizedRoot: null, count: 0 });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('cache-rentcast handler error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
