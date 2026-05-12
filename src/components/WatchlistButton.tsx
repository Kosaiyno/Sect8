'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAccount } from 'wagmi';
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
  activeClassName = 'border-rose-200 bg-rose-50 text-rose-600',
  inactiveClassName = 'border-gray-200 bg-gray-50 text-slate-500 hover:text-slate-900',
  label = 'Watchlist',
  showLabel = false,
}: WatchlistButtonProps) {
  const { address } = useAccount();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const syncState = () => {
      setSaved(isInWatchlist(item.id, address));
    };

    syncState();
    const eventName = getWatchlistUpdatedEventName();
    window.addEventListener('storage', syncState);
    window.addEventListener(eventName, syncState);

    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener(eventName, syncState);
    };
  }, [address, item.id]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={() => setSaved(toggleWatchlist(item, address))}
      className={`${className} ${saved ? activeClassName : inactiveClassName}`.trim()}
    >
      <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
      {showLabel ? <span>{saved ? 'Saved' : label}</span> : null}
    </button>
  );
}