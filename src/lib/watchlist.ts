export type WatchlistItem = {
  id: string;
  owner?: string;
  address: string;
  listingsRoot?: string | null;
  analysisRoot?: string | null;
  zip?: string | number;
  bedrooms?: number;
  bathrooms?: number | null;
  purchasePrice?: number | null;
  estRent?: number;
  netOperating?: number;
  capRate?: number | null;
  fmr?: number;
  fmrSource?: string;
  propertyType?: string | null;
  squareFootage?: number | null;
  url?: string | null;
  savedAt: number;
};

const WATCHLIST_UPDATED_EVENT = 'sect8:watchlist-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function sortWatchlist(items: WatchlistItem[]) {
  return [...items].sort((left, right) => right.savedAt - left.savedAt);
}

function normalizeOwner(owner?: string | null) {
  return String(owner || '').trim().toLowerCase();
}

function getWatchlistStorageKey(owner?: string | null) {
  const normalizedOwner = normalizeOwner(owner);
  return normalizedOwner ? `sect8.watchlist.${normalizedOwner}` : null;
}

function emitWatchlistUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(WATCHLIST_UPDATED_EVENT));
}

export function getWatchlistUpdatedEventName() {
  return WATCHLIST_UPDATED_EVENT;
}

export function readWatchlist(owner?: string | null): WatchlistItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const storageKey = getWatchlistStorageKey(owner);
  if (!storageKey) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sortWatchlist((parsed as WatchlistItem[]).filter((item) => normalizeOwner(item.owner || owner) === normalizeOwner(owner)))
      : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchlistItem[], owner?: string | null) {
  if (!canUseStorage()) {
    return;
  }

  const storageKey = getWatchlistStorageKey(owner);
  if (!storageKey) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(sortWatchlist(items)));
  emitWatchlistUpdated();
}

export function isInWatchlist(id: string, owner?: string | null) {
  return readWatchlist(owner).some((item) => item.id === id);
}

export function addToWatchlist(item: Omit<WatchlistItem, 'savedAt'>, owner?: string | null) {
  const normalizedOwner = normalizeOwner(owner || item.owner);
  if (!normalizedOwner) {
    return null;
  }

  const current = readWatchlist(normalizedOwner).filter((entry) => entry.id !== item.id);
  const nextItem: WatchlistItem = {
    ...item,
    owner: normalizedOwner,
    savedAt: Date.now(),
  };

  writeWatchlist([nextItem, ...current], normalizedOwner);
  return nextItem;
}

export function removeFromWatchlist(id: string, owner?: string | null) {
  const normalizedOwner = normalizeOwner(owner);
  if (!normalizedOwner) {
    return;
  }

  writeWatchlist(readWatchlist(normalizedOwner).filter((item) => item.id !== id), normalizedOwner);
}

export function toggleWatchlist(item: Omit<WatchlistItem, 'savedAt'>, owner?: string | null) {
  const normalizedOwner = normalizeOwner(owner || item.owner);
  if (!normalizedOwner) {
    return false;
  }

  if (isInWatchlist(item.id, normalizedOwner)) {
    removeFromWatchlist(item.id, normalizedOwner);
    return false;
  }

  addToWatchlist(item, normalizedOwner);
  return true;
}