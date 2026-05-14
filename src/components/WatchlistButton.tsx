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
  activeClassName = 'border-[#b8942f] bg-[#fffbea] text-[#b8942f]',
  inactiveClassName = 'border-[#f3e7c4] bg-white text-[#b8942f] hover:bg-[#fffbea]',
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
      <Heart size={18} strokeWidth={2.2} fill={saved ? 'currentColor' : 'none'} className="transition-colors duration-200" />
      {showLabel ? <span>{saved ? 'Saved' : label}</span> : null}
    </button>
  );
}