import "server-only";

import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import { normalizeServerPrivateKey } from "@/lib/serverKey";

/**
 * 0G Storage Service
 * Uses the Indexer flow from the 0G TypeScript SDK when available:
 * - Indexer.upload(MemData, rpcUrl, signer) -> returns [rootHash, err]
 * Falls back to older client if SDK is not present.
 */
export class ZgStorageService {
  private rpcUrl: string;
  private storageUrl: string;
  private signerPromise: Promise<ethers.NonceManager> | null = null;
  private uploadQueue: Promise<unknown> = Promise.resolve();

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.storageUrl = process.env.OG_STORAGE_URL || process.env.NEXT_PUBLIC_0G_STORAGE_NODE_URL || rpcUrl;
  }

  private async getSigner(rpcArg: string) {
    if (!this.signerPromise) {
      this.signerPromise = (async () => {
        const provider = new ethers.JsonRpcProvider(rpcArg);
        const deployerKey = process.env.AGENT_DEPLOYER_PRIVATE_KEY || process.env.SERVER_OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
        const sourceEnv = process.env.AGENT_DEPLOYER_PRIVATE_KEY
          ? 'AGENT_DEPLOYER_PRIVATE_KEY'
          : process.env.SERVER_OPERATOR_PRIVATE_KEY
            ? 'SERVER_OPERATOR_PRIVATE_KEY'
            : 'PRIVATE_KEY';
        if (!deployerKey) {
          throw new Error('Missing private key for indexer upload. Set AGENT_DEPLOYER_PRIVATE_KEY (server-side) to a funded testnet key.');
        }

        const baseSigner = new ethers.Wallet(normalizeServerPrivateKey(deployerKey, sourceEnv), provider);
        return new ethers.NonceManager(baseSigner);
      })();
    }

    return this.signerPromise;
  }

  private async enqueueUpload<T>(task: () => Promise<T>) {
    const previous = this.uploadQueue;
    let release!: () => void;
    this.uploadQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await task();
    } finally {
      release();
    }
  }

  private isNonceDriftError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || '');
    return message.includes('NONCE_EXPIRED')
      || message.includes('nonce too low')
      || message.includes('nonce has already been used');
  }

  private resetSigner() {
    this.signerPromise = null;
  }

  private async runIndexerUpload(indexer: Indexer, mem: MemData, rpcArg: string) {
    const signer = await this.getSigner(rpcArg);
    console.log('ZgStorageService: calling indexer.upload', { rpcArg, indexerUrl: this.storageUrl, hasSigner: true });

    const [uploadResult, err] = await indexer.upload(mem, rpcArg, signer as any);
    if (err) {
      const wrapped = new Error('Indexer.upload returned error: ' + String(err));
      // @ts-ignore
      wrapped.details = { rpcArg, indexerUrl: this.storageUrl, original: err };
      throw wrapped;
    }

    const rootHash = typeof uploadResult === 'string'
      ? uploadResult
      : ('rootHash' in uploadResult ? uploadResult.rootHash : uploadResult.rootHashes?.[0]);
    if (!rootHash) {
      throw new Error('Indexer.upload succeeded but did not return a root hash');
    }

    return String(rootHash);
  }

  /**
   * Uploads data to 0G Storage and returns a canonical dataRoot/hash
   */
  async uploadData(data: string | Buffer): Promise<string> {
    const content = typeof data === "string" ? Buffer.from(data) : data;
    const useLocal = process.env.USE_LOCAL_STORAGE === "true";

    if (useLocal) {
      throw new Error('USE_LOCAL_STORAGE is enabled, but local fallback is disabled for this deployment. Turn it off to use 0G storage.');
    }

    const rpcArg = process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL || this.rpcUrl;
    if (!this.storageUrl) {
      throw new Error('Missing indexer/storage node URL. Set NEXT_PUBLIC_0G_STORAGE_NODE_URL or OG_STORAGE_URL to the 0G indexer endpoint.');
    }

    const indexer = new Indexer(this.storageUrl);
    const mem = new MemData(content instanceof Buffer ? content : Buffer.from(content));
    return this.enqueueUpload(async () => {
      try {
        return await this.runIndexerUpload(indexer, mem, rpcArg);
      } catch (e: any) {
        if (this.isNonceDriftError(e)) {
          console.warn('ZgStorageService: detected nonce drift, resetting signer and retrying upload once');
          this.resetSigner();
          try {
            return await this.runIndexerUpload(indexer, mem, rpcArg);
          } catch (retryError: any) {
            const msg = `ZgStorageService.uploadData failed after nonce-refresh retry. indexerUrl=${this.storageUrl} rpcArg=${rpcArg} error=${retryError?.message || retryError}`;
            const wrapped = new Error(msg);
            // @ts-ignore
            wrapped.original = retryError;
            throw wrapped;
          }
        }

        const msg = `ZgStorageService.uploadData failed calling indexer.upload. indexerUrl=${this.storageUrl} rpcArg=${rpcArg} error=${e?.message || e}`;
        const wrapped = new Error(msg);
        // @ts-ignore
        wrapped.original = e;
        throw wrapped;
      }
    });
  }

  async downloadData(dataRoot: string): Promise<Buffer | string> {
    const indexer = new Indexer(this.storageUrl);
    const [blob, err] = await indexer.downloadToBlob(dataRoot, { proof: true });
    if (err) {
      throw err;
    }

    return Buffer.from(await blob.arrayBuffer());
  }
}

export const zgStorage = new ZgStorageService(process.env.OG_STORAGE_URL || process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai');

// --- 0G Storage: JSON upload/download helpers ---
export async function uploadAgentMemory(memory: any) {
  return zgStorage.uploadData(JSON.stringify(memory, null, 2));
}

export async function downloadAgentMemory(cid: string) {
  const buf = await zgStorage.downloadData(cid);
  return JSON.parse(Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf));
}
