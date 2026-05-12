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
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 py-10 animate-fade-in">
      {/* Watchlist Header */}
      <section className="fintech-card p-10 md:p-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-6">
            <div className="platform-chip">
              <Heart size={14} fill="currentColor" />
              Watchlist
            </div>
            <h1 className="font-outfit text-4xl font-black tracking-[-0.05em] text-[#0f1629] md:text-6xl md:leading-[1.1]">
              Saved homes you want to revisit fast.
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-[#64748b]">
              Keep your shortlist here so you can jump straight back into a property dossier without rescanning the board.
            </p>
          </div>
          <div className="fintech-card min-w-[240px] p-8 text-center shadow-xl border-b-8 border-b-[#b8942f]">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Saved addresses</div>
            <div className="mt-2 font-outfit text-6xl font-black text-[#0f1629]">{items.length}</div>
          </div>
        </div>
      </section>

      {items.length ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            const location = getLocationParts(item.address);
            const hasVerifiedHud = item.fmrSource === 'hud';

            return (
              <div key={item.id} className="fintech-card p-8 group transition-all duration-500 hover-lift relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <WatchlistButton
                    item={item}
                    className="rounded-full border border-[#eef0f3] bg-white p-2.5 transition shadow-sm hover:border-[#b8942f]/30"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="line-clamp-1 text-2xl font-black tracking-tight text-[#0f1629] group-hover:text-[#b8942f] transition-colors">
                      {location.street || item.address}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#64748b]">
                      <MapPin size={16} className="text-[#b8942f]" />
                      <span>{[location.city, location.state, location.zip || item.zip].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="platform-chip text-[9px] font-black uppercase tracking-widest py-1 bg-[#f8f9fb] text-[#64748b] border-gray-100">
                      {getPropertyType(item)}
                    </span>
                    <span className="platform-chip text-[9px] font-black uppercase tracking-widest py-1 bg-[#b8942f]/05 text-[#b8942f] border-[#b8942f]/10">
                      Pinned
                    </span>
                  </div>

                  <div className="stat-block rounded-[24px] p-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f] mb-2">Acquisition Price</div>
                    <div className="font-outfit text-3xl font-black leading-none text-[#0f1629] tracking-tight">{formatNumber(item.purchasePrice)}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="stat-block flex flex-col items-center justify-center rounded-2xl py-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/50 mb-1">Beds</div>
                      <div className="flex items-center gap-1.5 font-bold text-[#0f1629]"><BedDouble size={14} className="text-[#b8942f]" /> {item.bedrooms || '—'}</div>
                    </div>
                    <div className="stat-block flex flex-col items-center justify-center rounded-2xl py-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/50 mb-1">Baths</div>
                      <div className="flex items-center gap-1.5 font-bold text-[#0f1629]"><Bath size={14} className="text-[#b8942f]" /> {item.bathrooms ?? '—'}</div>
                    </div>
                    <div className="stat-block flex flex-col items-center justify-center rounded-2xl py-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/50 mb-1">ROI</div>
                      <div className="font-bold text-[#0d9668]">{hasVerifiedHud && item.capRate !== null ? `${Number(item.capRate).toFixed(1)}%` : '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/50 mb-2">Monthly NOI</div>
                      <div className="text-sm font-bold text-[#0d9668]">{hasVerifiedHud ? formatNumber(item.netOperating ? Number(item.netOperating)/12 : 0, '/mo') : 'Analyzing...'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/50 mb-2">FMR Benchmark</div>
                      <div className="text-sm font-bold text-[#b8942f]">{hasVerifiedHud ? formatNumber(item.fmr, '/mo') : 'Calculating...'}</div>
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
                    className="btn-primary w-full text-center py-4 text-base font-bold flex items-center justify-center gap-2 group/btn transition-all"
                  >
                    <ShieldCheck size={18} className="group-hover/btn:scale-110 transition-transform" />
                    Open Underwriting Dossier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fintech-card p-24 text-center flex flex-col items-center justify-center space-y-8">
          <div className="h-24 w-24 rounded-full bg-[#f8f9fb] flex items-center justify-center mb-2">
            <Sparkles size={40} className="text-[#b8942f]" />
          </div>
          <div className="space-y-4">
            <div className="font-outfit text-4xl font-black text-[#0f1629]">{isConnected ? 'Your shortlist is clear' : 'Connect Wallet'}</div>
            <p className="max-w-md text-lg text-[#64748b] font-medium leading-8">
              {isConnected 
                ? 'Institutional procurement requires a focused pipeline. Save properties from the market feed to start your private underwriting.'
                : 'Asset tracking is scoped to your secure wallet identity. Connect to restore your sourcing pipeline.'}
            </p>
          </div>
          {isConnected && (
            <div className="flex gap-4">
              <Link href="/dashboard" className="btn-primary px-8 py-4">Dashboard</Link>
              <Link href="/market" className="btn-secondary px-8 py-4">Market Feed</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}