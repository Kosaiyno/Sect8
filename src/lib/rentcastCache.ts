import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { downloadAgentMemory } from '@/og-integration/storage';

export type CachedListing = Record<string, unknown>;

export type RentcastCacheEntry = {
  key: string;
  zipCode: string;
  bedrooms: number;
  fetchedAt: number;
  rawCount: number;
  normalizedCount: number;
  rawRoot?: string | null;
  normalizedRoot?: string | null;
  listings?: CachedListing[];
};

const dataDir = path.resolve(process.cwd(), 'data');
const cacheFile = path.join(dataDir, 'rentcast-cache.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function getRentcastCacheKey(zipCode: string, bedrooms: number) {
  return `${String(zipCode).trim()}::${Number(bedrooms || 0)}`;
}

export function readRentcastCache(): Record<string, RentcastCacheEntry> {
  if (!fs.existsSync(cacheFile)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8')) || {};
  } catch {
    return {};
  }
}

export function writeRentcastCache(cache: Record<string, RentcastCacheEntry>) {
  ensureDataDir();
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

export function getRentcastCacheEntry(zipCode: string, bedrooms: number) {
  const cache = readRentcastCache();
  return cache[getRentcastCacheKey(zipCode, bedrooms)] ?? null;
}

export function upsertRentcastCacheEntry(entry: RentcastCacheEntry) {
  const cache = readRentcastCache();
  cache[entry.key] = entry;
  writeRentcastCache(cache);
  return cache[entry.key];
}

export async function loadCachedRentcastListings(zipCode: string, bedrooms: number) {
  const entry = getRentcastCacheEntry(zipCode, bedrooms);
  if (!entry) {
    return null;
  }

  if (Array.isArray(entry.listings) && entry.listings.length > 0) {
    return { entry, listings: entry.listings };
  }

  if (!entry.normalizedRoot) {
    return { entry, listings: [] };
  }

  try {
    const snapshot = await downloadAgentMemory(entry.normalizedRoot);
    const listings = Array.isArray(snapshot?.listings) ? snapshot.listings : [];

    upsertRentcastCacheEntry({
      ...entry,
      listings,
    });

    return { entry, listings };
  } catch {
    return { entry, listings: [] };
  }
}