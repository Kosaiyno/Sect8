import { zgCompute } from '@/og-integration/compute';
/**
 * Basic decision routine. Replace LLM call with a prompt-invocation when available.
 */
export async function decideForListing(listing, agentPrefs) {
    var _a, _b, _c, _d;
    // Simple heuristic: prefer higher capRate and positive cashflow
    const cap = Number(listing.capRate || (listing.capRate === 0 ? listing.capRate : 0));
    const cashflow = ((listing.netOperating || 0) / 12) || (Math.round((listing.annualRent || 0) * 0.65 / 12));
    let confidence = Math.min(90, Math.round((cap || 5) * 3));
    if (listing.source && String(listing.source).startsWith('mock'))
        confidence = Math.round(confidence * 0.6);
    const explanation = `Banger Deal: estimated cap ${Number(cap).toFixed(1)}%, est rent ${listing.estRent || listing.rent}/mo, expected cashflow $${Math.round(cashflow)}/mo.`;
    const actions = [];
    // Suggest contacting seller
    if (listing.contactEmail || listing.contactPhone || listing.url) {
        actions.push({ type: 'contact', title: 'Contact seller', details: { email: listing.contactEmail, phone: listing.contactPhone, url: listing.url }, requireApproval: false });
    }
    // Suggest inspection and title if cap high
    if (cap > 10) {
        actions.push({ type: 'inspect', title: 'Order inspection & title', requireApproval: false });
    }
    // Suggest an offer for strong deals over threshold
    if (cap >= 12) {
        const suggestedOffer = Math.round((listing.purchasePrice || listing.listPrice || 0) * 0.95);
        actions.push({ type: 'offer', title: 'Propose offer', details: { price: suggestedOffer }, requireApproval: true });
    }
    // If an LLM provider is configured, route calls through 0G compute when requested.
    try {
        const provider = (process.env.LLM_PROVIDER || '').toLowerCase();
        const use0g = provider === '0g' || provider === 'og' || Boolean(process.env.OG_COMPUTE_URL || process.env.OG_COMPUTE_PROVIDER);
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        if (use0g) {
            const prompt = `You are an investing assistant. Given this property data, provide a concise reasoning (1-3 sentences) why this is a good investment and one suggested next action.\n\nProperty: ${JSON.stringify(listing)}\nAgentPrefs: ${JSON.stringify(agentPrefs)}`;
            const messages = [
                { role: 'system', content: 'You are an investing assistant.' },
                { role: 'user', content: prompt }
            ];
            try {
                const payload = { messages, model };
                const resp = await zgCompute.runAnalysis(payload);
                const json = (resp === null || resp === void 0 ? void 0 : resp.result) || resp;
                // Parse common OpenAI/Groq shapes returned via 0G proxied provider
                if (json) {
                    if ((json === null || json === void 0 ? void 0 : json.choices) && ((_b = (_a = json.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content)) {
                        return { listingId: listing.id, explanation: String(json.choices[0].message.content).trim(), confidence, actions };
                    }
                    const candidate = (json === null || json === void 0 ? void 0 : json.output) || (json === null || json === void 0 ? void 0 : json.result) || (json === null || json === void 0 ? void 0 : json.choices) || (json === null || json === void 0 ? void 0 : json.data) || json;
                    let llmText = '';
                    if (typeof candidate === 'string')
                        llmText = candidate;
                    else if (Array.isArray(candidate)) {
                        if (((_c = candidate[0]) === null || _c === void 0 ? void 0 : _c.content) && ((_d = candidate[0].content[0]) === null || _d === void 0 ? void 0 : _d.text))
                            llmText = candidate[0].content[0].text;
                        else
                            llmText = JSON.stringify(candidate);
                    }
                    else if (typeof candidate === 'object') {
                        if (candidate === null || candidate === void 0 ? void 0 : candidate.text)
                            llmText = candidate.text;
                        else if (candidate === null || candidate === void 0 ? void 0 : candidate.result)
                            llmText = JSON.stringify(candidate.result);
                        else
                            llmText = JSON.stringify(candidate);
                    }
                    if (llmText && llmText.trim())
                        return { listingId: listing.id, explanation: llmText.trim(), confidence, actions };
                }
            }
            catch (err) {
                console.warn('0G LLM call failed', (err && typeof err === 'object' && 'message' in err) ? err.message : err);
            }
        }
    }
    catch (e) {
        console.warn('LLM call failed', (e && typeof e === 'object' && 'message' in e) ? e.message : e);
    }
    return {
        listingId: listing.id,
        explanation,
        confidence,
        actions
    };
}
export default { decideForListing };
