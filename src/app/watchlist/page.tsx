'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bath, BedDouble, Heart, MapPin } from 'lucide-react';
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
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const syncItems = () => {
      setItems(readWatchlist());
    };

    syncItems();
    const eventName = getWatchlistUpdatedEventName();
    window.addEventListener('storage', syncItems);
    window.addEventListener(eventName, syncItems);

    return () => {
      window.removeEventListener('storage', syncItems);
      window.removeEventListener(eventName, syncItems);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <section className="dashboard-panel rounded-[32px] p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-100">
              <Heart size={13} fill="currentColor" />
              Watchlist
            </div>
            <h1 className="mt-4 font-outfit text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">Saved homes you want to revisit fast.</h1>
            <p className="mt-3 max-w-2xl text-base text-white/65 md:text-lg">
              Keep your shortlist here so you can jump straight back into a property dossier without rescanning the board.
            </p>
          </div>
          <div className="dashboard-subpanel rounded-[24px] px-5 py-4 text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Saved addresses</div>
            <div className="mt-2 font-outfit text-4xl font-black text-white">{items.length}</div>
          </div>
        </div>
      </section>

      {items.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            const location = getLocationParts(item.address);
            const monthlyNoi = Math.round(Number(item.netOperating || 0) / 12);
            const hasVerifiedHud = item.fmrSource === 'hud';

            return (
              <div key={item.id} className="dashboard-panel market-card relative rounded-[28px] p-5">
                <div className="market-card-accent absolute inset-x-6 top-0 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/70 to-cyan-300/0" />
                <div className="flex items-start justify-between gap-4 text-white">
                  <div>
                    <div className="line-clamp-1 font-outfit text-[1.35rem] font-black tracking-[-0.04em]">{location.street || item.address}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-white/55">
                      <MapPin size={14} />
                      <span>{[location.city, location.state, location.zip || item.zip].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>
                  <WatchlistButton
                    item={item}
                    className="rounded-full border p-2 transition"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-white">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
                    {getPropertyType(item)}
                  </span>
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
                    Saved
                  </span>
                </div>

                <div className="dashboard-subpanel mt-4 rounded-[24px] p-4 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Listed Price</div>
                  <div className="mt-2 font-outfit text-[2rem] font-black leading-none tracking-[-0.05em]">{formatNumber(item.purchasePrice)}</div>
                </div>

                <div className="dashboard-subpanel mt-4 grid grid-cols-3 gap-3 rounded-[24px] p-3 text-sm">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Beds</div>
                    <div className="mt-2 flex items-center gap-2 font-semibold text-white"><BedDouble size={14} /> {item.bedrooms || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Baths</div>
                    <div className="mt-2 flex items-center gap-2 font-semibold text-white"><Bath size={14} /> {item.bathrooms ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Cap Rate</div>
                    <div className="mt-2 font-semibold text-white">{hasVerifiedHud && item.capRate !== null && item.capRate !== undefined ? `${Number(item.capRate).toFixed(1)}%` : 'Hidden'}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Monthly NOI</div>
                    <div className="mt-1 font-bold text-emerald-300">{hasVerifiedHud ? formatNumber(monthlyNoi, '/mo') : 'Hidden'}</div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Rent Benchmark</div>
                    <div className="mt-1 font-bold text-cyan-200">{hasVerifiedHud ? formatNumber(item.fmr, '/mo') : 'Hidden'}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/dashboard/properties/${encodeURIComponent(item.id)}`} prefetch className="btn-primary flex-1 text-center text-sm">
                    Open Analysis
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-panel rounded-[32px] p-12 text-center">
          <div className="font-outfit text-3xl font-black text-white">Your watchlist is empty</div>
          <p className="mt-3 text-white/60">Tap the heart on a home card or on the details page to keep it here.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" prefetch className="btn-primary text-sm">Open dashboard</Link>
            <Link href="/market" prefetch className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse market
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}