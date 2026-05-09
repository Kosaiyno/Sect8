import "server-only";

import { createZGComputeNetworkReadOnlyBroker } from "@0gfoundation/0g-compute-ts-sdk";
import type { ComputeProof } from "@/types";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getModel(defaultModel?: string) {
  return process.env.OG_COMPUTE_MODEL || defaultModel || "deepseek/deepseek-chat-v3-0324";
}

type ServiceMetadata = {
  endpoint?: string;
  model?: string;
  providerAddress?: string;
};

function sanitizePreview(value: unknown) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 220);
}

function getResponsePreview(body: any, rawBody: string) {
  const candidate = body?.choices?.[0]?.message?.content
    || body?.output_text
    || body?.message
    || body?.detail
    || body?.raw
    || rawBody;

  return sanitizePreview(candidate);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} for 0G compute`);
  }
  return value;
}

export class ZgComputeService {
  private brokerPromise: Promise<any> | null = null;
  private metadataPromise: Promise<ServiceMetadata> | null = null;

  private async getBroker() {
    if (!this.brokerPromise) {
      const rpcUrl = process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL || "https://evmrpc.0g.ai";
      this.brokerPromise = createZGComputeNetworkReadOnlyBroker(rpcUrl);
    }

    return this.brokerPromise;
  }

  private async getServiceMetadata(): Promise<ServiceMetadata> {
    if (!this.metadataPromise) {
      this.metadataPromise = (async () => {
        const broker = await this.getBroker();
        const providerAddress = getRequiredEnv("OG_COMPUTE_PROVIDER");
        const services = await broker.inference.listServiceWithDetail(0, 50, true);
        const service = services.find(
          (entry: { provider?: string }) =>
            entry.provider?.toLowerCase() === providerAddress.toLowerCase()
        );

        const metadata = {
          endpoint: service?.url ? `${String(service.url).replace(/\/$/, "")}/v1/proxy` : undefined,
          model: service?.model,
          providerAddress,
        };

        if (!metadata?.endpoint) {
          throw new Error("0G compute provider metadata is missing an endpoint");
        }
        return metadata;
      })();
    }

    return this.metadataPromise;
  }

  async callCompute(model: string, input: { messages?: ChatMessage[] } | ChatMessage[]): Promise<any> {
    const messages = Array.isArray(input) ? input : input.messages;

    if (!messages?.length) {
      throw new Error("Compute input is missing chat messages");
    }

    const payload = {
      model: getModel(model),
      messages,
    };
    const metadata = await this.getServiceMetadata();
    const response = await fetch(`${metadata.endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getRequiredEnv("OG_COMPUTE_API_KEY")}`,
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    let body: any = null;

    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      body = { raw: rawBody };
    }

    if (!response.ok) {
      const errorMessage = body?.error?.message || body?.detail || rawBody || `0G compute request failed with ${response.status}`;
      throw new Error(errorMessage);
    }

    const proof: ComputeProof = {
      providerAddress: metadata.providerAddress || null,
      endpoint: metadata.endpoint || null,
      model: payload.model || metadata.model || null,
      responseId: typeof body?.id === "string" ? body.id : null,
      status: response.status,
      statusText: response.statusText || null,
      responsePreview: getResponsePreview(body, rawBody),
    };

    return { result: body, meta: { ...metadata, proof } };
  }

  async runAnalysis(payload: { messages?: ChatMessage[]; model?: string }): Promise<any> {
    return this.callCompute(payload.model || getModel(), payload);
  }
}

export const zgCompute = new ZgComputeService();
