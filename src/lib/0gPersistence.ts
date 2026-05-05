import 'server-only';

import { downloadAgentMemory, uploadAgentMemory } from '@/og-integration/storage';

export type AgentLogEntry = {
  time: number;
  type: string;
  message: string;
  listingId?: string;
  hash?: string | null;
};

export type ListingsSnapshot = {
  type: 'listings-snapshot';
  owner?: string | null;
  zipCode: string;
  bedrooms: number;
  fetchedAt: number;
  rawRoot?: string | null;
  logsRoot?: string | null;
  listings: Array<Record<string, unknown>>;
};

export type LogsSnapshot = {
  type: 'scan-logs';
  owner?: string | null;
  zipCode: string;
  createdAt: number;
  entries: AgentLogEntry[];
};

export function normalizeOwner(owner: string) {
  return String(owner || '').trim().toLowerCase();
}

function toCookieSafeFragment(value: string) {
  return value.replace(/[^a-z0-9]/g, '');
}

export function getAgentRecordCookieName(owner: string) {
  return `sect8-agent-root-${toCookieSafeFragment(normalizeOwner(owner))}`;
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

export async function read0gJson<T>(root: string | null | undefined): Promise<T | null> {
  if (!root) {
    return null;
  }

  try {
    return await downloadAgentMemory(root) as T;
  } catch {
    return null;
  }
}

export async function write0gJson(payload: unknown) {
  return uploadAgentMemory(payload);
}
