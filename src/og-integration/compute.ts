import { ethers } from "ethers";

// 0G Compute Service using @0gfoundation/0g-ts-sdk
export class ZgComputeService {
  private sdk: any | null = null;
  private wallet: ethers.Wallet | null = null;

  constructor() {}

  private async loadSdk(): Promise<any> {
    if (this.sdk) return this.sdk;
    try {
      const mod = await import("@0gfoundation/0g-ts-sdk");
      this.sdk = mod;
      return mod;
    } catch (e) {
      throw new Error("Failed to load @0gfoundation/0g-ts-sdk: " + e);
    }
  }

  private async getWallet(): Promise<ethers.Wallet> {
    if (this.wallet) return this.wallet;
    const rpc = process.env.NEXT_PUBLIC_0G_RPC_URL || process.env.OG_RPC_URL || "https://evmrpc.0g.ai";
    const pk = process.env.SERVER_OPERATOR_PRIVATE_KEY || process.env.AGENT_DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!pk) throw new Error("No private key found for 0G compute");
    const provider = new ethers.JsonRpcProvider(rpc);
    this.wallet = new ethers.Wallet(pk, provider);
    return this.wallet;
  }

  // Example: call a compute endpoint
  async callCompute(model: string, input: any): Promise<any> {
    const sdk = await this.loadSdk();
    const wallet = await this.getWallet();
    // The actual API may differ; adjust as needed for @0gfoundation/0g-ts-sdk v1.x
    if (!sdk.ComputeClient) throw new Error("ComputeClient not found in 0G SDK");
    const client = new sdk.ComputeClient({ wallet });
    return client.call({ model, input });
  }
}
// (Legacy broker and runModel code removed; see new 0G SDK logic above)

    // get service metadata and proxied endpoint
    const meta = await broker.inference.getServiceMetadata(providerAddress);
    const endpoint = meta?.endpoint || meta?.serviceUrl || process.env.OG_COMPUTE_URL;
    const model = modelName || meta?.model || payload?.model;

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
          const proof = (json as any)?.proof || (json as any)?.zg_proof || (json as any)?.meta || null;
          return { result: json, proof, meta };
        }
      } catch (e) {
        // SDK not available or failed — fall back to fetch
        console.debug('ZgComputeService: SDK adapter unavailable or failed, falling back to fetch', (e && typeof e === 'object' && 'message' in e) ? (e as any).message : e);
      }

      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(headers || {}) }, body, signal: controller.signal });
      const text = await res.text().catch(() => null);
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (e) {
        // non-JSON response
        json = { raw: text };
      }
      if (!res.ok) {
        console.warn('ZgComputeService: provider returned non-ok status', { status: res.status, statusText: res.statusText, body: json });
      }
      const proof = json?.proof || json?.zg_proof || json?.meta || null;
      return { result: json, proof, meta };
    } catch (e: any) {
      console.error('ZgComputeService: provider call failed', e?.message || e);
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  // Convenience wrapper used by older codepaths
  async runAnalysis(payload: any, opts?: { timeoutMs?: number }) {
    const providerAddress = process.env.OG_COMPUTE_PROVIDER || payload?.providerAddress || payload?.provider;
    const modelName = process.env.OG_COMPUTE_MODEL || payload?.model;
    return this.runModel(providerAddress, modelName, payload);
  }
}

export const zgCompute = new ZgComputeService();
