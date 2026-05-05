'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { getWatchlistUpdatedEventName, isInWatchlist, toggleWatchlist, type WatchlistItem } from '@/lib/watchlist';

type WatchlistButtonProps = {
  item: Omit<WatchlistItem, 'savedAt'>;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  label?: string;
  showLabel?: boolean;
};

export default function WatchlistButton({
  item,
  className = '',
  activeClassName = 'border-rose-300/30 bg-rose-300/15 text-rose-100',
  inactiveClassName = 'border-white/10 bg-white/5 text-white/80 hover:text-white',
  label = 'Watchlist',
  showLabel = false,
}: WatchlistButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const syncState = () => {
      setSaved(isInWatchlist(item.id));
    };

    syncState();
    const eventName = getWatchlistUpdatedEventName();
    window.addEventListener('storage', syncState);
    window.addEventListener(eventName, syncState);

    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener(eventName, syncState);
    };
  }, [item.id]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={() => setSaved(toggleWatchlist(item))}
      className={`${className} ${saved ? activeClassName : inactiveClassName}`.trim()}
    >
      <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
      {showLabel ? <span>{saved ? 'Saved' : label}</span> : null}
    </button>
  );
}