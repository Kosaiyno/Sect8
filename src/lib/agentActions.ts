import { uploadToStorage } from '@/app/actions/og';
import { ethers } from 'ethers';
import { normalizeServerPrivateKey } from '@/lib/serverKey';

export interface ExecutedActionResult {
  success: boolean;
  type: string;
  detail?: any;
}

/** Simple policy guard - can be extended. */
function policyAllows(action: any, agent: any): { allowed: boolean; reason?: string } {
  const AUTO_LIMIT = Number(process.env.AGENT_AUTO_APPROVE_LIMIT_USD || '5000');
  if (action.type === 'offer') {
    const price = Number(action.details?.price || 0);
    if (price > AUTO_LIMIT) return { allowed: false, reason: 'Price exceeds auto-approve limit' };
  }
  return { allowed: true };
}

export async function executeAction(action: any, agent: any): Promise<ExecutedActionResult> {
  // Check policy
  const check = policyAllows(action, agent);
  if (!check.allowed) return { success: false, type: action.type, detail: { reason: check.reason } };

  // For demo, persist action to 0G storage (audit log)
  try {
    const payload = { agentId: agent?.id, action, timestamp: Date.now() };
    const res = await uploadToStorage(JSON.stringify(payload));
    return { success: true, type: action.type, detail: { storage: res } };
  } catch (e:any) {
    return { success: false, type: action.type, detail: String(e?.message || e) };
  }
}

/**
 * Submit a simple on-chain tx (stub). If SERVER_OPERATOR_PRIVATE_KEY is present, attempt to send a tx using ethers.
 */
export async function submitOnChainTx(encodedTx: any): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const pk = process.env.SERVER_OPERATOR_PRIVATE_KEY;
  const rpc = process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL;
  if (!pk || !rpc) return { success: false, error: 'Missing server operator key or RPC' };

  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(normalizeServerPrivateKey(pk, 'SERVER_OPERATOR_PRIVATE_KEY'), provider);
    // encodedTx should contain to/value/data
    const tx = await wallet.sendTransaction(encodedTx);
    return { success: true, txHash: tx.hash };
  } catch (e:any) {
    return { success: false, error: String(e?.message || e) };
  }
}

export default { executeAction, submitOnChainTx };
