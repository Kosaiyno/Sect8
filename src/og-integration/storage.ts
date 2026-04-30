import fs from "fs";
import path from "path";
import { ethers } from "ethers";

/**
 * 0G Storage Service
 * Uses the Indexer flow from the 0G TypeScript SDK when available:
 * - Indexer.upload(MemData, rpcUrl, signer) -> returns [rootHash, err]
 * Falls back to older client if SDK is not present.
 */
export class ZgStorageService {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  private async loadSdk(): Promise<any> {
    // try known package names dynamically without static module resolution
    const candidates = ["@0gfoundation/0g-ts-sdk"];
    for (const name of candidates) {
      try {
        // dynamic import via variable avoids TypeScript module resolution checks
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const mod = await import(name as any);
        return mod;
      } catch (e) {
        // continue to next candidate
      }
    }
    return null;
  }

  /**
   * Uploads data to 0G Storage and returns a canonical dataRoot/hash
   */
  async uploadData(data: string | Buffer): Promise<string> {
    const content = typeof data === "string" ? Buffer.from(data) : data;
    const sdk = await this.loadSdk();
    const useLocal = (process.env.USE_LOCAL_STORAGE === 'true');
    // Developer local fallback: write to disk and return a pseudo-root hash
    if (useLocal) {
      try {
        const uploadsDir = path.resolve('data', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ts = Date.now();
        const filename = `upload-${ts}.bin`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, content);
        // create a deterministic pseudo-root hash using sha256 of content+timestamp
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(content).update(String(ts)).digest('hex');
        // persist simple index for lookup
        const indexPath = path.join(uploadsDir, 'index.json');
        let index: Record<string, string> = {};
        if (fs.existsSync(indexPath)) {
          try { index = JSON.parse(fs.readFileSync(indexPath, 'utf-8')); } catch(e) { index = {}; }
        }
        index[hash] = filename;
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        return hash;
      } catch (e) {
        throw new Error('Local storage fallback failed: ' + String(e));
      }
    }
    if (sdk && (sdk.Indexer || sdk.IndexerClient || sdk.IndexerService)) {
      // Use Indexer pattern
      const Indexer = sdk.Indexer || sdk.IndexerClient || sdk.IndexerService;
      const MemData = sdk.MemData || sdk.Mem || sdk.MemDataBuffer;

      if (!MemData) {
        // fallback: if SDK doesn't export MemData, wrap content in simple object
        const indexer = new Indexer(this.rpcUrl.replace("evmrpc", "indexer-storage"));
        const arr = Uint8Array.from(content);
        const [rootHash, err] = await indexer.upload(arr, this.rpcUrl, undefined as any);
        if (err) throw err;
        return String(rootHash);
      }

      // Determine the proper RPC and indexer endpoints.
      const rpcArg = process.env.NEXT_PUBLIC_0G_RPC_URL || process.env.OG_RPC_URL || this.rpcUrl;
      // Require an explicit indexer/storage node URL for production 0G uploads.
      const indexerUrl = process.env.NEXT_PUBLIC_0G_STORAGE_NODE_URL || process.env.OG_STORAGE_URL;
      if (!indexerUrl) {
        throw new Error('Missing indexer/storage node URL. Set NEXT_PUBLIC_0G_STORAGE_NODE_URL or OG_STORAGE_URL to the 0G indexer endpoint.');
      }

      const indexer = new Indexer(indexerUrl);
      const mem = new MemData(content instanceof Buffer ? content : Buffer.from(content));
      // Prepare signer/provider per 0G SDK quickstart: indexer.upload(mem, rpcUrl, signer)
      const provider = new (ethers.providers?.JsonRpcProvider || (ethers as any).JsonRpcProvider)(rpcArg);
      const deployerKey = process.env.AGENT_DEPLOYER_PRIVATE_KEY || process.env.SERVER_OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
      if (!deployerKey) {
        throw new Error('Missing private key for indexer upload. Set AGENT_DEPLOYER_PRIVATE_KEY (server-side) to a funded testnet key.');
      }
      const signer = new ethers.Wallet(deployerKey, provider);
      console.log('ZgStorageService: calling indexer.upload', { rpcArg, indexerUrl, hasSigner: !!signer?.privateKey });
      try {
        const [rootHash, err] = await indexer.upload(mem, rpcArg, signer as any);
        if (err) {
          const wrapped = new Error('Indexer.upload returned error: ' + String(err));
          // @ts-ignore
          wrapped.details = { rpcArg, indexerUrl, original: err };
          throw wrapped;
        }
        return String(rootHash);
      } catch (e: any) {
        const msg = `ZgStorageService.uploadData failed calling indexer.upload. indexerUrl=${indexerUrl} rpcArg=${rpcArg} error=${e?.message || e}`;
        const wrapped = new Error(msg);
        // @ts-ignore
        wrapped.original = e;
        throw wrapped;
      }
    }

    // If SDK is not available, fail loudly — we require 0G Storage
    // allow local fallback when explicitly enabled
    if (useLocal) {
      // already handled above, but keep safe guard
      throw new Error('Local storage attempted but failed earlier');
    }
    throw new Error('0G Storage SDK not available or not properly configured');
  }

  async downloadData(dataRoot: string): Promise<Buffer | string> {
    const sdk = await this.loadSdk();
    if (sdk && (sdk.Indexer || sdk.IndexerClient || sdk.IndexerService)) {
      const Indexer = sdk.Indexer || sdk.IndexerClient || sdk.IndexerService;
      const indexer = new Indexer(this.rpcUrl.replace("evmrpc", "indexer-storage"));
      try {
        const res = await indexer.download(dataRoot, true);
        return res;
      } catch (e) {
        console.error("ZgStorageService.downloadData error (indexer)", e);
        throw e;
      }
    }

    // fallback: attempt to read from data/uploads by matching hash -> not guaranteed
    const uploadsDir = path.resolve("data", "uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      if (files.length) return fs.readFileSync(path.join(uploadsDir, files[files.length - 1]));
    }
    throw new Error("Storage SDK not available and no local data found");
  }
}

export const zgStorage = new ZgStorageService(process.env.OG_STORAGE_URL || process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai');

// --- 0G Storage: JSON upload/download helpers ---
export async function uploadAgentMemory(memory: any, filename = 'memory.json') {
  const sdk = await (new ZgStorageService(process.env.OG_STORAGE_URL || '') as any).loadSdk();
  if (!sdk) throw new Error('0G storage SDK not found');
  const client = sdk.createStorageClient ? sdk.createStorageClient({ apiKey: process.env.OG_COMPUTE_API_KEY }) : null;
  if (!client) throw new Error('0G storage client not available');
  const buf = Buffer.from(JSON.stringify(memory, null, 2));
  const { cid } = await client.uploadFile(buf, filename);
  return cid;
}

export async function downloadAgentMemory(cid: string) {
  const sdk = await (new ZgStorageService(process.env.OG_STORAGE_URL || '') as any).loadSdk();
  if (!sdk) throw new Error('0G storage SDK not found');
  const client = sdk.createStorageClient ? sdk.createStorageClient({ apiKey: process.env.OG_COMPUTE_API_KEY }) : null;
  if (!client) throw new Error('0G storage client not available');
  const buf = await client.downloadFile(cid);
  return JSON.parse(buf.toString());
}
