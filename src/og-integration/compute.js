import { ethers } from "ethers";
/**
 * 0G Compute Service
 * Implements the broker quickstart flow:
 * - create broker (wallet-based)
 * - get service metadata
 * - get request headers
 * - call provider endpoint via the proxied API and return result + proof metadata
 */
export class ZgComputeService {
    constructor() {
        this.broker = null;
        this.wallet = null;
    }
    async loadBroker() {
        if (this.broker)
            return this.broker;
        // Dynamic import to adapt to installed package name
        try {
            const mod = await import("@0glabs/0g-serving-broker");
            const anyMod = mod;
            // prefer helper factory if exported
            const factory = anyMod.createZGComputeNetworkBroker || anyMod.createBroker || anyMod.createZGNetworkBroker || anyMod.createInferenceBroker || anyMod.createInferenceNetworkBroker;
            // construct wallet from env if available
            const rpc = process.env.NEXT_PUBLIC_0G_RPC_URL || process.env.OG_RPC_URL || "https://evmrpc.0g.ai";
            const pk = process.env.SERVER_OPERATOR_PRIVATE_KEY || process.env.AGENT_DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
            if (pk) {
                const provider = new ethers.JsonRpcProvider(rpc);
                this.wallet = new ethers.Wallet(pk, provider);
                if (factory) {
                    this.broker = await factory(this.wallet);
                }
                else if (anyMod.ServingBroker) {
                    this.broker = new anyMod.ServingBroker({ wallet: this.wallet, url: process.env.OG_COMPUTE_URL, apiKey: process.env.OG_COMPUTE_API_KEY });
                }
                else {
                    this.broker = anyMod;
                }
            }
            else {
                // No server wallet configured — attempt unauthenticated broker (some SDKs allow it)
                if (factory) {
                    this.broker = await factory(undefined);
                }
                else if (anyMod.ServingBroker) {
                    this.broker = new anyMod.ServingBroker({ url: process.env.OG_COMPUTE_URL, apiKey: process.env.OG_COMPUTE_API_KEY });
                }
                else {
                    this.broker = anyMod;
                }
            }
            return this.broker;
        }
        catch (e) {
            console.error("ZgComputeService: unable to load broker SDK", e);
            throw e;
        }
    }
    /**
     * Run inference via a provider address. Returns { result, proofMetadata }
     */
    async runModel(providerAddress, modelName, payload) {
        const broker = await this.loadBroker();
        if (!broker)
            throw new Error("Compute broker not available");
        // get service metadata and proxied endpoint
        const meta = await broker.inference.getServiceMetadata(providerAddress);
        const endpoint = (meta === null || meta === void 0 ? void 0 : meta.endpoint) || (meta === null || meta === void 0 ? void 0 : meta.serviceUrl) || process.env.OG_COMPUTE_URL;
        const model = modelName || (meta === null || meta === void 0 ? void 0 : meta.model) || (payload === null || payload === void 0 ? void 0 : payload.model);
        // get request headers (auth secret for proxied call)
        const headers = await broker.inference.getRequestHeaders(providerAddress);
        // call the provider proxied endpoint (OpenAI-compatible)
        const url = `${endpoint}/v1/proxy/chat/completions`;
        const body = JSON.stringify({ model, messages: payload.messages || payload });
        const timeoutMs = Number(process.env.OG_COMPUTE_TIMEOUT_MS || 10000);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
            console.debug('ZgComputeService: calling provider', { url, providerAddress, model, timeoutMs });
            // Try optional OpenAI SDK proxy call first (user provided JS example)
            try {
                const { tryOpenAISdkCall } = await import('./openaiSdkClient');
                const sdkBase = endpoint.replace(/\/$/, '') + '/v1/proxy';
                const sdkResult = await tryOpenAISdkCall(sdkBase, headers || {}, { model, messages: payload.messages || payload });
                if (sdkResult) {
                    // normalize SDK response shape into result/proof
                    const json = sdkResult;
                    const proof = (json === null || json === void 0 ? void 0 : json.proof) || (json === null || json === void 0 ? void 0 : json.zg_proof) || (json === null || json === void 0 ? void 0 : json.meta) || null;
                    return { result: json, proof, meta };
                }
            }
            catch (e) {
                // SDK not available or failed — fall back to fetch
                console.debug('ZgComputeService: SDK adapter unavailable or failed, falling back to fetch', (e && typeof e === 'object' && 'message' in e) ? e.message : e);
            }
            const res = await fetch(url, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, (headers || {})), body, signal: controller.signal });
            const text = await res.text().catch(() => null);
            let json = null;
            try {
                json = text ? JSON.parse(text) : null;
            }
            catch (e) {
                // non-JSON response
                json = { raw: text };
            }
            if (!res.ok) {
                console.warn('ZgComputeService: provider returned non-ok status', { status: res.status, statusText: res.statusText, body: json });
            }
            const proof = (json === null || json === void 0 ? void 0 : json.proof) || (json === null || json === void 0 ? void 0 : json.zg_proof) || (json === null || json === void 0 ? void 0 : json.meta) || null;
            return { result: json, proof, meta };
        }
        catch (e) {
            console.error('ZgComputeService: provider call failed', (e === null || e === void 0 ? void 0 : e.message) || e);
            throw e;
        }
        finally {
            clearTimeout(t);
        }
    }
    // Convenience wrapper used by older codepaths
    async runAnalysis(payload, opts) {
        const providerAddress = process.env.OG_COMPUTE_PROVIDER || (payload === null || payload === void 0 ? void 0 : payload.providerAddress) || (payload === null || payload === void 0 ? void 0 : payload.provider);
        const modelName = process.env.OG_COMPUTE_MODEL || (payload === null || payload === void 0 ? void 0 : payload.model);
        return this.runModel(providerAddress, modelName, payload);
    }
}
export const zgCompute = new ZgComputeService();
