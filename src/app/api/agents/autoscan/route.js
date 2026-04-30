import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { fetchRealProperties, getFMR } from '@/lib/realDataService';
import { uploadToStorage } from '@/app/actions/og';
function persistFile(relPath, data) {
    const file = path.resolve(process.cwd(), relPath);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function readPersist(relPath) {
    const file = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch (e) {
        return null;
    }
}
export async function POST(req) {
    try {
        // optional body: { agentId } to run single agent; otherwise run all agents
        const body = await req.json().catch(() => ({}));
        const agents = readPersist('data/agents.json') || {};
        const logs = readPersist('data/logs.json') || [];
        const savedListings = readPersist('data/listings.json') || [];
        const targetAgents = body.agentId ? { [body.agentId]: agents[body.agentId] } : agents;
        const summary = [];
        for (const [id, agent] of Object.entries(targetAgents || {})) {
            if (!agent || !agent.preferences)
                continue;
            const zip = agent.preferences.zipCode;
            const minBedrooms = agent.preferences.minBedrooms || 1;
            const rc = await fetchRealProperties(zip, minBedrooms);
            let listings = [];
            if (rc && Array.isArray((rc === null || rc === void 0 ? void 0 : rc.data) || rc)) {
                const items = Array.isArray(rc.data) ? rc.data : rc;
                listings = items.map((it) => {
                    var _a;
                    return ({
                        id: it.id || it.listingId || String(Math.random()).slice(2),
                        address: it.address || `${it.street || 'Unknown'} ${it.city || ''}`,
                        zip,
                        bedrooms: it.bedrooms || minBedrooms,
                        purchasePrice: it.price || it.listPrice || (it.estimate && it.estimate.purchasePrice) || 100000,
                        estRent: it.rent || it.monthlyRent || ((_a = it.estimate) === null || _a === void 0 ? void 0 : _a.rent) || 1200,
                        source: 'rentcast'
                    });
                });
            }
            // fallback: if no listings, skip
            if (!listings.length)
                continue;
            // evaluate each listing and keep best 'bangers'
            const agentFinds = [];
            for (const p of listings) {
                const fmr = getFMR(zip, p.bedrooms || 1);
                const annualRent = (p.estRent || fmr) * 12;
                const purchase = p.purchasePrice || 100000;
                const isBanger = fmr > (0.015 * purchase);
                const estExpenses = Math.round(annualRent * 0.35);
                const netOperating = Math.round(annualRent - estExpenses);
                const capRate = (netOperating / purchase) * 100;
                const rec = {
                    id: p.id,
                    address: p.address,
                    zip: p.zip,
                    bedrooms: p.bedrooms,
                    purchasePrice: purchase,
                    estRent: p.estRent || fmr,
                    fmr,
                    annualRent,
                    netOperating,
                    capRate: Number(capRate.toFixed(2)),
                    isBanger,
                    source: p.source || 'rentcast',
                    timestamp: Date.now()
                };
                if (isBanger) {
                    savedListings.push(rec);
                    logs.push({ time: Date.now(), type: 'banger', message: `Agent ${id} found banger ${rec.id}`, listingId: rec.id });
                    agentFinds.push(rec);
                    // save memory to storage
                    const memory = { agentId: id, listing: rec, createdAt: Date.now() };
                    try {
                        const upload = await uploadToStorage(JSON.stringify(memory));
                        if (upload === null || upload === void 0 ? void 0 : upload.success)
                            logs.push({ time: Date.now(), type: 'storage', message: `Saved memory for ${rec.id} -> ${upload.hash}`, hash: upload.hash });
                        else
                            logs.push({ time: Date.now(), type: 'storage_error', message: String((upload === null || upload === void 0 ? void 0 : upload.error) || 'unknown') });
                    }
                    catch (e) {
                        logs.push({ time: Date.now(), type: 'storage_error', message: String((e === null || e === void 0 ? void 0 : e.message) || e) });
                    }
                }
            }
            // Update agent memoryRoot timestamp
            if (agentFinds.length) {
                summary.push({ agentId: id, found: agentFinds.length, examples: agentFinds.slice(0, 3) });
            }
        }
        persistFile('data/listings.json', savedListings);
        persistFile('data/logs.json', logs);
        return NextResponse.json({ success: true, summary });
    }
    catch (error) {
        console.error('autoscan error', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
