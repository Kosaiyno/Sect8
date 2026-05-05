import 'server-only';

import { normalizeOwner, read0gJson, write0gJson } from '@/lib/0gPersistence';

export type StoredAgentRecord = {
  owner: string;
  agentId: string;
  preferences: Record<string, unknown>;
  recordRoot?: string | null;
  memoryRoot?: string | null;
  latestListingsRoot?: string | null;
  latestRawRentcastRoot?: string | null;
  latestListingsZip?: string | null;
  latestListingsBedrooms?: number | null;
  latestListingsFetchedAt?: number | null;
  logsRoot?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

type StoredAgentSnapshot = StoredAgentRecord & {
  type: 'agent-record';
  version: 1;
};

export async function getAgentRecord(owner: string, recordRoot?: string | null) {
  const normalized = normalizeOwner(owner);
  const snapshot = await read0gJson<StoredAgentSnapshot>(recordRoot);

  if (!snapshot || normalizeOwner(snapshot.owner) !== normalized) {
    return null;
  }

  return {
    ...snapshot,
    owner: normalized,
    recordRoot: recordRoot || snapshot.recordRoot || null,
  } as StoredAgentRecord;
}

export async function upsertAgentRecord(owner: string, record: Partial<StoredAgentRecord>, currentRoot?: string | null) {
  const normalized = normalizeOwner(owner);
  const existing = await getAgentRecord(normalized, currentRoot);
  const nextRecord: StoredAgentRecord = {
    ...(existing ?? {}),
    ...record,
    owner: normalized,
    agentId: record.agentId || existing?.agentId || `agent-${normalized}`,
    createdAt: record.createdAt || existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  } as StoredAgentRecord;

  const snapshot: StoredAgentSnapshot = {
    ...nextRecord,
    type: 'agent-record',
    version: 1,
    recordRoot: undefined,
  };

  const root = await write0gJson(snapshot);
  return {
    record: {
      ...nextRecord,
      recordRoot: root,
    } as StoredAgentRecord,
    root,
  };
}