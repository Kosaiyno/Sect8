import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { decideForListing } from '@/lib/agentDecision';
import { executeAction } from '@/lib/agentActions';
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
        const body = await req.json().catch(() => ({}));
        const agents = readPersist('data/agents.json') || {};
        const listings = readPersist('data/listings.json') || [];
        const logs = readPersist('data/logs.json') || [];
        const processed = [];
        for (const [agentId, agent] of Object.entries(agents || {})) {
            for (const l of listings) {
                const decision = await decideForListing(l, agent.preferences || {});
                // persist decision as a log
                logs.push({ time: Date.now(), agentId, listingId: l.id, decision: decision.explanation, confidence: decision.confidence });
                for (const action of decision.actions) {
                    if (action.requireApproval) {
                        logs.push({ time: Date.now(), agentId, listingId: l.id, action, status: 'pending_approval' });
                    }
                    else {
                        const res = await executeAction(action, agent);
                        logs.push({ time: Date.now(), agentId, listingId: l.id, action, status: res.success ? 'executed' : 'failed', result: res.detail });
                    }
                }
                processed.push({ agentId, listingId: l.id, explanation: decision.explanation, actions: decision.actions });
            }
        }
        // write logs
        fs.writeFileSync(path.resolve(process.cwd(), 'data/logs.json'), JSON.stringify(logs, null, 2));
        return NextResponse.json({ success: true, processed });
    }
    catch (e) {
        console.error('engine error', (e === null || e === void 0 ? void 0 : e.message) || e);
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
