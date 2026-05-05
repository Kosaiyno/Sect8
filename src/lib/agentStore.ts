import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

export type StoredAgentRecord = {
  owner: string;
  agentId: string;
  preferences: Record<string, unknown>;
  memoryRoot?: string | null;
  latestListingsRoot?: string | null;
  latestRawRentcastRoot?: string | null;
  latestListingsZip?: string | null;
  latestListingsBedrooms?: number | null;
  latestListingsFetchedAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

const dataDir = path.resolve(process.cwd(), 'data');
const storeFile = path.join(dataDir, 'agents.json');

export function readAgentStore(): Record<string, StoredAgentRecord> {
  if (!fs.existsSync(storeFile)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(storeFile, 'utf8')) || {};
  } catch {
    return {};
  }
}

function normalizeOwner(owner: string) {
  return owner.trim().toLowerCase();
}

export function getAgentRecord(owner: string) {
  const store = readAgentStore();
  return store[normalizeOwner(owner)] ?? null;
}

export function upsertAgentRecord(owner: string, record: Partial<StoredAgentRecord>) {
  const store = readAgentStore();
  const normalizedOwner = normalizeOwner(owner);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  store[normalizedOwner] = {
    ...(store[normalizedOwner] ?? {}),
    ...record,
    owner: normalizedOwner,
    agentId: record.agentId || store[normalizedOwner]?.agentId || `agent-${normalizedOwner}`,
    updatedAt: Date.now(),
  } as StoredAgentRecord;

  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
  return store[normalizedOwner];
}