"use client";
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { Bath, BedDouble, ChevronDown, MapPin } from 'lucide-react';
import WatchlistButton from '@/components/WatchlistButton';

type RecommendationCard = {
  id: string;
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
  isBanger?: boolean;
  source?: string;
  explanation?: string;
  fmr?: number;
  fmrSource?: string;
  propertyType?: string | null;
  squareFootage?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  url?: string | null;
};

type RecommendationTableProps = {
  recommendations: RecommendationCard[];
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'yield-high', label: 'Highest Cap Rate' },
  { value: 'cashflow-high', label: 'Highest Cashflow' },
  { value: 'price-low', label: 'Lowest Price' },
  { value: 'price-high', label: 'Highest Price' },
] as const;

type SortOptionValue = (typeof SORT_OPTIONS)[number]['value'];

function getLocationParts(address: string) {
  const [street = '', city = '', stateZip = ''] = address.split(',').map((part) => part.trim());
  const [state = '', zip = ''] = stateZip.split(' ').filter(Boolean);
  return { street, city, state, zip };
}

function getPropertyType(recommendation: RecommendationCard) {
  const rawType = String(recommendation.propertyType || 'Single Family').trim();
  return rawType === 'Single Family Residence' ? 'Single Family' : rawType;
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

export default function RecommendationsTable({ recommendations }: RecommendationTableProps) {
  const saleRecommendations = recommendations.filter((recommendation) => Number(recommendation.purchasePrice || 0) >= 10000);
  const [sortBy, setSortBy] = useState<SortOptionValue>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const activeSort = SORT_OPTIONS.find((option) => option.value === sortBy) || SORT_OPTIONS[0];

  const filteredRecommendations = [...saleRecommendations].sort((left, right) => {
    switch (sortBy) {
      case 'price-low':
        return Number(left.purchasePrice || 0) - Number(right.purchasePrice || 0);
      case 'price-high':
        return Number(right.purchasePrice || 0) - Number(left.purchasePrice || 0);
      case 'yield-high':
        return Number(right.capRate || 0) - Number(left.capRate || 0);
      case 'cashflow-high':
        return Number(right.netOperating || 0) - Number(left.netOperating || 0);
      case 'newest':
      default:
        return Number(String(right.id).replace(/\D/g, '').slice(-10) || 0) - Number(String(left.id).replace(/\D/g, '').slice(-10) || 0);
    }
  });

  return (
    <div className="space-y-5">
      <div className="dashboard-panel relative z-20 overflow-visible rounded-[30px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">My recommendation board</div>
            <div className="mt-1 font-outfit text-2xl font-black tracking-[-0.04em] text-white">I am showing {filteredRecommendations.length} of {saleRecommendations.length} homes for sale</div>
          </div>

          <div ref={sortMenuRef} className="relative z-30 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((current) => !current)}
              className="dashboard-field flex w-full min-w-[220px] items-center justify-between rounded-[22px] px-4 py-3 text-left text-sm font-semibold text-white lg:w-auto"
              aria-haspopup="listbox"
              aria-expanded={isSortMenuOpen}
            >
              <span className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Sort board</span>
                <span className="mt-1 text-base text-white">{activeSort.label}</span>
              </span>
              <ChevronDown size={18} className={`text-white/55 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortMenuOpen ? (
              <div className="absolute right-0 z-40 mt-3 w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#0d141d] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:w-[240px]">
                <div className="mb-1 px-3 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Order results</div>
                <div className="space-y-1" role="listbox" aria-label="Sort recommendations">
                  {SORT_OPTIONS.map((option) => {
                    const isActive = option.value === sortBy;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortMenuOpen(false);
                        }}
                        className={`flex w-full items-center rounded-[18px] px-3 py-3 text-left text-sm transition ${isActive ? 'bg-cyan-300/12 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16)]' : 'text-white/72 hover:bg-white/[0.05] hover:text-white'}`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <span className="font-semibold">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filteredRecommendations.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {filteredRecommendations.map((recommendation) => {
            const location = getLocationParts(recommendation.address);
            const monthlyNoi = Math.round(Number(recommendation.netOperating || 0) / 12);
            const propertyType = getPropertyType(recommendation);
            const hasVerifiedHud = recommendation.fmrSource === 'hud';
            const detailHref = {
              pathname: `/dashboard/properties/${encodeURIComponent(recommendation.id)}`,
              query: {
                ...(recommendation.listingsRoot ? { listingsRoot: recommendation.listingsRoot } : {}),
                ...(recommendation.analysisRoot ? { analysisRoot: recommendation.analysisRoot } : {}),
              },
            };

            return (
              <div key={recommendation.id} className="dashboard-panel market-card relative rounded-[28px] p-5">
                <div className="market-card-accent absolute inset-x-6 top-0 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/70 to-cyan-300/0" />
                <div className="flex items-start justify-between gap-4 text-white">
                  <div>
                    <div className="line-clamp-1 font-outfit text-[1.35rem] font-black tracking-[-0.04em]">{location.street || recommendation.address}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-white/55">
                      <MapPin size={14} />
                      <span>{[location.city, location.state, location.zip || recommendation.zip].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>
                  <WatchlistButton
                    item={{
                      id: recommendation.id,
                      address: recommendation.address,
                      listingsRoot: recommendation.listingsRoot,
                      analysisRoot: recommendation.analysisRoot,
                      zip: recommendation.zip,
                      bedrooms: recommendation.bedrooms,
                      bathrooms: recommendation.bathrooms,
                      purchasePrice: recommendation.purchasePrice,
                      estRent: recommendation.estRent,
                      netOperating: recommendation.netOperating,
                      capRate: recommendation.capRate,
                      fmr: recommendation.fmr,
                      fmrSource: recommendation.fmrSource,
                      propertyType: recommendation.propertyType,
                      squareFootage: recommendation.squareFootage,
                      url: recommendation.url,
                    }}
                    className="rounded-full border p-2 transition"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-white">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
                    {propertyType}
                  </span>
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
                    For Sale
                  </span>
                </div>

                <div className="dashboard-subpanel mt-4 rounded-[24px] p-4 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Listed Price</div>
                  <div className="mt-2 font-outfit text-[2rem] font-black leading-none tracking-[-0.05em]">{formatNumber(recommendation.purchasePrice)}</div>
                </div>

                <div className="dashboard-subpanel mt-4 grid grid-cols-3 gap-3 rounded-[24px] p-3 text-sm">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Beds</div>
                    <div className="mt-2 flex items-center gap-2 font-semibold text-white"><BedDouble size={14} /> {recommendation.bedrooms || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Baths</div>
                    <div className="mt-2 flex items-center gap-2 font-semibold text-white"><Bath size={14} /> {recommendation.bathrooms ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Cap Rate</div>
                    <div className="mt-2 font-semibold text-white">{hasVerifiedHud && recommendation.capRate !== null && recommendation.capRate !== undefined ? `${Number(recommendation.capRate).toFixed(1)}%` : 'Hidden'}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Monthly NOI</div>
                    <div className="mt-1 font-bold text-emerald-300">{hasVerifiedHud ? formatNumber(monthlyNoi, '/mo') : 'Hidden'}</div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Rent Benchmark</div>
                    <div className="mt-1 font-bold text-cyan-200">{hasVerifiedHud ? formatNumber(recommendation.fmr, '/mo') : 'Hidden'}</div>
                  </div>
                </div>

                {!hasVerifiedHud && (
                  <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50/90">
                    HUD verification failed for this ZIP, so rent benchmark, monthly NOI, and cap rate are hidden.
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Link href={detailHref} prefetch className="btn-primary flex-1 text-center text-sm">
                    Agent Analysis
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-panel rounded-[30px] p-12 text-center">
          <div className="font-outfit text-3xl font-black text-white">I did not find for-sale houses that match this search</div>
          <p className="mt-3 text-white/60">Change the search inputs above and I will repopulate the board.</p>
        </div>
      )}
    </div>
  );
}
