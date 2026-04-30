import { uploadToStorage } from '@/app/actions/og';
import { ethers } from 'ethers';
/** Simple policy guard - can be extended. */
function policyAllows(action, agent) {
    var _a;
    const AUTO_LIMIT = Number(process.env.AGENT_AUTO_APPROVE_LIMIT_USD || '5000');
    if (action.type === 'offer') {
        const price = Number(((_a = action.details) === null || _a === void 0 ? void 0 : _a.price) || 0);
        if (price > AUTO_LIMIT)
            return { allowed: false, reason: 'Price exceeds auto-approve limit' };
    }
    return { allowed: true };
}
export async function executeAction(action, agent) {
    // Check policy
    const check = policyAllows(action, agent);
    if (!check.allowed)
        return { success: false, type: action.type, detail: { reason: check.reason } };
    // For demo, persist action to 0G storage (audit log)
    try {
        const payload = { agentId: agent === null || agent === void 0 ? void 0 : agent.id, action, timestamp: Date.now() };
        const res = await uploadToStorage(JSON.stringify(payload));
        return { success: true, type: action.type, detail: { storage: res } };
    }
    catch (e) {
        return { success: false, type: action.type, detail: String((e === null || e === void 0 ? void 0 : e.message) || e) };
    }
}
/**
 * Submit a simple on-chain tx (stub). If SERVER_OPERATOR_PRIVATE_KEY is present, attempt to send a tx using ethers.
 */
export async function submitOnChainTx(encodedTx) {
    const pk = process.env.SERVER_OPERATOR_PRIVATE_KEY;
    const rpc = process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL;
    if (!pk || !rpc)
        return { success: false, error: 'Missing server operator key or RPC' };
    try {
        const provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(pk, provider);
        // encodedTx should contain to/value/data
        const tx = await wallet.sendTransaction(encodedTx);
        return { success: true, txHash: tx.hash };
    }
    catch (e) {
        return { success: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) };
    }
}
export default { executeAction, submitOnChainTx };
