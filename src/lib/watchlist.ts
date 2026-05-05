export type WatchlistItem = {
  id: string;
  address: string;
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

const WATCHLIST_STORAGE_KEY = 'sect8.watchlist';
const WATCHLIST_UPDATED_EVENT = 'sect8:watchlist-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function sortWatchlist(items: WatchlistItem[]) {
  return [...items].sort((left, right) => right.savedAt - left.savedAt);
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

export function readWatchlist(): WatchlistItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortWatchlist(parsed as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchlistItem[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(sortWatchlist(items)));
  emitWatchlistUpdated();
}

export function isInWatchlist(id: string) {
  return readWatchlist().some((item) => item.id === id);
}

export function addToWatchlist(item: Omit<WatchlistItem, 'savedAt'>) {
  const current = readWatchlist().filter((entry) => entry.id !== item.id);
  const nextItem: WatchlistItem = {
    ...item,
    savedAt: Date.now(),
  };

  writeWatchlist([nextItem, ...current]);
  return nextItem;
}

export function removeFromWatchlist(id: string) {
  writeWatchlist(readWatchlist().filter((item) => item.id !== id));
}

export function toggleWatchlist(item: Omit<WatchlistItem, 'savedAt'>) {
  if (isInWatchlist(item.id)) {
    removeFromWatchlist(item.id);
    return false;
  }

  addToWatchlist(item);
  return true;
}