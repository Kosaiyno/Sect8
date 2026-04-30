// Server-side decision module (heuristic + LLM hook)
import type { Recommendation } from '@/types';
import { zgCompute } from '@/og-integration/compute';

export interface ActionSuggestion {
  type: string; // 'email' | 'call' | 'offer' | 'inspect' | 'noop'
  title: string;
  details?: any;
  requireApproval?: boolean;
}

export interface DecisionResult {
  listingId: string;
  explanation: string;
  confidence: number; // 0-100
  actions: ActionSuggestion[];
}

/**
 * Basic decision routine. Replace LLM call with a prompt-invocation when available.
 */
export async function decideForListing(listing: any, agentPrefs: any): Promise<DecisionResult> {
  // Simple heuristic: prefer higher capRate and positive cashflow
  const cap = Number(listing.capRate || (listing.capRate === 0 ? listing.capRate : 0));
  const cashflow = ((listing.netOperating || 0) / 12) || (Math.round((listing.annualRent || 0) * 0.65 / 12));

  let confidence = Math.min(90, Math.round((cap || 5) * 3));
  if (listing.source && String(listing.source).startsWith('mock')) confidence = Math.round(confidence * 0.6);

  const explanation = `Banger Deal: estimated cap ${Number(cap).toFixed(1)}%, est rent ${listing.estRent || listing.rent}/mo, expected cashflow $${Math.round(cashflow)}/mo.`;

  const actions: ActionSuggestion[] = [];
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
        const json = resp?.result || resp;

        // Parse common OpenAI/Groq shapes returned via 0G proxied provider
        if (json) {
          if (json?.choices && json.choices[0]?.message?.content) {
            return { listingId: listing.id, explanation: String(json.choices[0].message.content).trim(), confidence, actions };
          }
          const candidate = json?.output || json?.result || json?.choices || json?.data || json;
          let llmText = '';
          if (typeof candidate === 'string') llmText = candidate;
          else if (Array.isArray(candidate)) {
            if (candidate[0]?.content && candidate[0].content[0]?.text) llmText = candidate[0].content[0].text;
            else llmText = JSON.stringify(candidate);
          } else if (typeof candidate === 'object') {
            if (candidate?.text) llmText = candidate.text;
            else if (candidate?.result) llmText = JSON.stringify(candidate.result);
            else llmText = JSON.stringify(candidate);
          }
          if (llmText && llmText.trim()) return { listingId: listing.id, explanation: llmText.trim(), confidence, actions };
        }
      } catch (err) {
        console.warn('0G LLM call failed', (err && typeof err === 'object' && 'message' in err) ? (err as any).message : err);
      }
    }
  } catch (e) {
    console.warn('LLM call failed', (e && typeof e === 'object' && 'message' in e) ? (e as any).message : e);
  }

  return {
    listingId: listing.id,
    explanation,
    confidence,
    actions
  };
}

export default { decideForListing };
