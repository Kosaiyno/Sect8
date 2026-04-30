import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { fetchRealProperties, getFMR } from '@/lib/realDataService';
import { uploadToStorage } from '@/app/actions/og';

type ScanRequest = {
  zipCode: string;
  minBedrooms?: number;
  maxPrice?: number;
  owner?: string;
};

function persistFile(relPath: string, data: any) {
  const file = path.resolve(process.cwd(), relPath);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readPersist(relPath: string) {
  const file = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return null; }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    // Support two shapes: { zipCode, minBedrooms, owner } or { tokenId, owner, preferences }
    const zip = body.zipCode || (body.preferences && body.preferences.zipCode) || null;
    const minBedrooms = body.minBedrooms || (body.preferences && body.preferences.minBedrooms) || 1;
    const owner = body.owner || (body.preferences && body.preferences.owner) || null;

    if (!zip) return NextResponse.json({ success: false, error: 'zipCode required' }, { status: 400 });

    // Try RentCast
    const rc = await fetchRealProperties(zip, minBedrooms);
    let listings: any[] = [];

    if (rc && Array.isArray(rc?.data || rc)) {
      // adapt RentCast / mock response shape, preserve original address/source when available
      const items = Array.isArray(rc.data) ? rc.data : rc;
      listings = items.map((it: any) => ({
        id: it.id || it.listingId || String(Math.random()).slice(2),
        address: it.address || [it.street || it.addressLine || it.addressLine1 || it.title, it.city, it.state, it.zip].filter(Boolean).join(', ') || `Unknown ${zip}`,
        zip: zip,
        bedrooms: it.bedrooms || minBedrooms,
        purchasePrice: it.price || it.listPrice || (it.estimate && it.estimate.purchasePrice) || 100000,
        estRent: it.rent || it.monthlyRent || it.estimate?.rent || 1200,
        source: it.source || 'rentcast',
        image: it.image || it.photo || it.photos?.[0] || `https://via.placeholder.com/560x420?text=${encodeURIComponent((it.address||it.title||'Listing').slice(0,24))}`
      }));
    } else {
      // generate a mock listing for demo
      listings = [{
        id: 'mock-' + Date.now(),
        address: `675 W Willis St, Detroit, MI ${zip}`,
        zip,
        bedrooms: minBedrooms,
        purchasePrice: 90000,
        estRent: 900,
        source: 'mock-enriched',
        image: `https://via.placeholder.com/560x420?text=${encodeURIComponent('675 W Willis St')}`
      }];
    }

    const results: any[] = [];
    const logs = readPersist('data/logs.json') || [];
    const savedListings = readPersist('data/listings.json') || [];

    for (const p of listings) {
      const fmr = getFMR(zip, p.bedrooms || 1);
      // compute metrics
      const annualRent = (p.estRent || fmr) * 12;
      const purchase = p.purchasePrice || 100000;
      const rentPct = (fmr) / purchase; // monthly FMR compared to purchase
      // Flag banger: monthly FMR > 1.5% of purchase price
      const isBanger = fmr > (0.015 * purchase);

      const grossYield = (annualRent / purchase) * 100; // percent
      const estExpenses = Math.round(annualRent * 0.35);
      const netOperating = Math.round(annualRent - estExpenses);
      const capRate = (netOperating / purchase) * 100;

      const explanation = isBanger
        ? `Banger Deal: HUD FMR $${fmr}/mo is > 1.5% of purchase price ($${purchase}). Estimated annual rent $${annualRent}, net operating income $${netOperating}.` 
        : `Match: HUD FMR $${fmr}/mo. Estimated annual rent $${annualRent}.`;

      const rec = {
        id: p.id,
        address: p.address,
        zip: p.zip,
        bedrooms: p.bedrooms,
        purchasePrice: purchase,
        estRent: p.estRent || fmr,
        image: p.image || null,
        locationScore: p.locationScore || null,
        demandSignal: p.demandSignal || null,
        fmr,
        annualRent,
        grossYield: Number(grossYield.toFixed(2)),
        estExpenses,
        netOperating,
        capRate: Number(capRate.toFixed(2)),
        isBanger,
        explanation,
        timestamp: Date.now(),
        source: p.source || 'unknown'
      };

      // persist to listings
      savedListings.push(rec);
      results.push(rec);

      // append log entry
      logs.push({ time: Date.now(), type: isBanger ? 'banger' : 'match', message: explanation, listingId: rec.id });

      // Build agent memory and save to storage (local fallback via uploadToStorage)
      const memory = { agentId: owner || 'autonomous', listing: rec, explanation, createdAt: Date.now() };
      try {
        const upload = await uploadToStorage(JSON.stringify(memory));
        if (upload?.success) {
          logs.push({ time: Date.now(), type: 'storage', message: `Saved memory for ${rec.id} -> ${upload.hash}`, hash: upload.hash });
        } else {
          logs.push({ time: Date.now(), type: 'storage_error', message: String(upload?.error || 'unknown') });
        }
      } catch (e: any) {
        logs.push({ time: Date.now(), type: 'storage_error', message: String(e?.message || e) });
      }
    }

    // persist files
    persistFile('data/listings.json', savedListings);
    persistFile('data/logs.json', logs);

    return NextResponse.json({ success: true, recommendations: results });
  } catch (error: any) {
    console.error('scan route error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

