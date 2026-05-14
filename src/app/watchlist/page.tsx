'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bath, BedDouble, Heart, MapPin, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAccount } from 'wagmi';
import WatchlistButton from '@/components/WatchlistButton';
import { getWatchlistUpdatedEventName, readWatchlist, type WatchlistItem } from '@/lib/watchlist';

function getLocationParts(address: string) {
  const [street = '', city = '', stateZip = ''] = address.split(',').map((part) => part.trim());
  const [state = '', zip = ''] = stateZip.split(' ').filter(Boolean);
  return { street, city, state, zip };
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

function getPropertyType(item: WatchlistItem) {
  const rawType = String(item.propertyType || 'Single Family').trim();
  return rawType === 'Single Family Residence' ? 'Single Family' : rawType;
}

export default function WatchlistPage() {
  const { address, isConnected } = useAccount();
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const syncItems = () => {
      setItems(readWatchlist(address));
    };

    syncItems();
    const eventName = getWatchlistUpdatedEventName();
    window.addEventListener('storage', syncItems);
    window.addEventListener(eventName, syncItems);

    return () => {
      window.removeEventListener('storage', syncItems);
      window.removeEventListener(eventName, syncItems);
    };
  }, [address]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-2 py-4 animate-fade-in sm:px-4 sm:py-6 lg:gap-8 lg:px-6 lg:py-8">
      {/* Watchlist Header */}
      <section className="fintech-card p-4 sm:p-6 md:p-10 lg:p-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-3">
            <div className="platform-chip text-xs">
              <Heart size={12} fill="currentColor" />
              Watchlist
            </div>
            <h1 className="font-outfit text-xl font-black tracking-[-0.03em] text-[#0f1629] sm:text-2xl md:text-4xl md:leading-[1.1]">
              Saved homes you want to revisit fast.
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-snug text-[#64748b] sm:text-base md:text-lg">
              Keep your shortlist here so you can jump straight back into a property dossier without rescanning the board.
            </p>
          </div>
          <div className="fintech-card w-full p-4 text-center shadow-xl border-b-4 border-b-[#b8942f] sm:max-w-[180px] sm:p-6">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b8942f]">Saved addresses</div>
            <div className="mt-2 font-outfit text-3xl font-black text-[#0f1629] sm:text-4xl">{items.length}</div>
          </div>
        </div>
      </section>

      {items.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            const location = getLocationParts(item.address);
            const hasVerifiedHud = item.fmrSource === 'hud';

            return (
              <div key={item.id} className="fintech-card p-4 group transition-all duration-500 hover-lift relative overflow-hidden sm:p-6">
                <div className="absolute top-0 right-0 p-2">
                  <WatchlistButton
                    item={item}
                    className="rounded-full border border-[#eef0f3] bg-white p-2.5 transition shadow-sm hover:border-[#b8942f]/30"
                  />
                </div>

                <div className="space-y-3">
                  <div className="pr-8">
                    <h3 className="line-clamp-2 text-base font-black tracking-tight text-[#0f1629] group-hover:text-[#b8942f] transition-colors sm:line-clamp-1 sm:text-lg">
                      {location.street || item.address}
                    </h3>
                    <div className="mt-1 flex items-start gap-1 text-xs font-medium text-[#64748b]">
                      <MapPin size={12} className="text-[#b8942f]" />
                      <span>{[location.city, location.state, location.zip || item.zip].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="platform-chip text-[8px] font-black uppercase tracking-widest py-0.5 bg-[#f8f9fb] text-[#64748b] border-gray-100">
                      {getPropertyType(item)}
                    </span>
                    <span className="platform-chip text-[8px] font-black uppercase tracking-widest py-0.5 bg-[#b8942f]/05 text-[#b8942f] border-[#b8942f]/10">
                      Pinned
                    </span>
                  </div>

                  <div className="stat-block rounded-xl p-4">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-[#b8942f] mb-1">Acquisition Price</div>
                    <div className="font-outfit text-lg font-black leading-none text-[#0f1629] tracking-tight sm:text-xl">{formatNumber(item.purchasePrice)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    <div className="stat-block col-span-2 flex flex-col items-center justify-center rounded-lg py-2 sm:col-span-1">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/50 mb-0.5">Beds</div>
                      <div className="flex items-center gap-1 font-bold text-[#0f1629]"><BedDouble size={12} className="text-[#b8942f]" /> {item.bedrooms || '—'}</div>
                    </div>
                    <div className="stat-block flex flex-col items-center justify-center rounded-lg py-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/50 mb-0.5">Baths</div>
                      <div className="flex items-center gap-1 font-bold text-[#0f1629]"><Bath size={12} className="text-[#b8942f]" /> {item.bathrooms ?? '—'}</div>
                    </div>
                    <div className="stat-block flex flex-col items-center justify-center rounded-lg py-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/50 mb-0.5">ROI</div>
                      <div className="font-bold text-[#0d9668]">{hasVerifiedHud && item.capRate !== null ? `${Number(item.capRate).toFixed(1)}%` : '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-2 sm:gap-3">
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/50 mb-1">Monthly NOI</div>
                      <div className="text-xs font-bold text-[#0d9668]">{hasVerifiedHud ? formatNumber(item.netOperating ? Number(item.netOperating)/12 : 0, '/mo') : 'Analyzing...'}</div>
                    </div>
                    <div className="sm:text-right">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/50 mb-1">FMR Benchmark</div>
                      <div className="text-xs font-bold text-[#b8942f]">{hasVerifiedHud ? formatNumber(item.fmr, '/mo') : 'Calculating...'}</div>
                    </div>
                  </div>

                  <Link
                    href={{
                      pathname: `/dashboard/properties/${encodeURIComponent(item.id)}`,
                      query: {
                        ...(item.listingsRoot ? { listingsRoot: item.listingsRoot } : {}),
                        ...(item.analysisRoot ? { analysisRoot: item.analysisRoot } : {}),
                      },
                    }}
                    className="btn-primary w-full text-center py-3 text-xs font-bold flex items-center justify-center gap-1 group/btn transition-all"
                  >
                    <ShieldCheck size={14} className="group-hover/btn:scale-110 transition-transform" />
                    Open Underwriting Dossier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fintech-card p-6 text-center flex flex-col items-center justify-center space-y-4 sm:p-10 lg:p-14">
          <div className="h-14 w-14 rounded-full bg-[#f8f9fb] flex items-center justify-center mb-2">
            <Sparkles size={22} className="text-[#b8942f]" />
          </div>
          <div className="space-y-2">
            <div className="font-outfit text-xl font-black text-[#0f1629] sm:text-2xl">{isConnected ? 'Your shortlist is clear' : 'Connect Wallet'}</div>
            <p className="max-w-md text-xs text-[#64748b] font-medium leading-snug sm:text-sm">
              {isConnected 
                ? 'Institutional procurement requires a focused pipeline. Save properties from the market feed to start your private underwriting.'
                : 'Asset tracking is scoped to your secure wallet identity. Connect to restore your sourcing pipeline.'}
            </p>
          </div>
          {isConnected && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-xs">Dashboard</Link>
              <Link href="/market" className="btn-secondary px-6 py-3 text-xs">Market Feed</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}