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
    <div className="space-y-6">
      <div className="fintech-card relative z-20 overflow-visible p-4 sm:p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="platform-eyebrow-muted">Recommendation Board</div>
            <div className="mt-2 font-outfit text-2xl font-black tracking-[-0.04em] text-[#0f1629] sm:text-3xl">Showing {filteredRecommendations.length} of {saleRecommendations.length} active homes</div>
          </div>

          <div ref={sortMenuRef} className="relative z-30 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((current) => !current)}
              className="dashboard-field flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#0f1629] lg:min-w-[220px] lg:w-auto"
              aria-haspopup="listbox"
              aria-expanded={isSortMenuOpen}
            >
              <span className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b8942f]">Sort board</span>
                <span className="mt-1 text-base text-[#0f1629]">{activeSort.label}</span>
              </span>
              <ChevronDown size={18} className={`text-[#64748b] transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortMenuOpen ? (
              <div className="absolute right-0 z-40 mt-3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_24px_80px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:w-[240px]">
                <div className="mb-1 px-3 pt-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#b8942f]/60">Order results</div>
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
                        className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${isActive ? 'bg-[rgba(184,148,47,0.08)] text-[#b8942f] shadow-[inset_0_0_0_1px_rgba(184,148,47,0.2)]' : 'text-[#64748b] hover:bg-gray-50 hover:text-[#0f1629]'}`}
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
              <div key={recommendation.id} className="fintech-card hover-lift group relative p-5 sm:p-6">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#b8942f]/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-4 text-[#0f1629]">
                  <div className="min-w-0 pr-2">
                    <div className="line-clamp-2 font-outfit text-xl font-black tracking-[-0.04em] sm:line-clamp-1 sm:text-[1.35rem]">{location.street || recommendation.address}</div>
                    <div className="mt-1 flex items-start gap-2 text-xs text-[#64748b] sm:text-sm">
                      <MapPin size={13} className="text-[#b8942f]/80" />
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
                    className="rounded-full border-2 p-3 shadow-md focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[#0f1629]">
                  <span className="rounded-full border border-gray-100 bg-gray-50/50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b]">
                    {propertyType}
                  </span>
                  <span className="glass-badge rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em]">
                    For Sale
                  </span>
                </div>

                <div className="stat-block mt-6 rounded-[24px] p-5 text-[#0f1629]">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Listed Price</div>
                  <div className="mt-2.5 font-outfit text-2xl font-black leading-none tracking-[-0.04em] sm:text-3xl">{formatNumber(recommendation.purchasePrice)}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div className="col-span-2 rounded-[20px] border border-[#eef0f3] bg-[#f8f9fb]/50 p-4 sm:col-span-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b]/60">Beds</div>
                    <div className="mt-2 flex items-center gap-2 font-bold text-[#0f1629]"><BedDouble size={14} className="text-[#b8942f]/60" /> {recommendation.bedrooms || 'N/A'}</div>
                  </div>
                  <div className="rounded-[20px] border border-[#eef0f3] bg-[#f8f9fb]/50 p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b]/60">Baths</div>
                    <div className="mt-2 flex items-center gap-2 font-bold text-[#0f1629]"><Bath size={14} className="text-[#b8942f]/60" /> {recommendation.bathrooms ?? 'N/A'}</div>
                  </div>
                  <div className="rounded-[20px] border border-[#eef0f3] bg-[#f8f9fb]/50 p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b]/60">Cap Rate</div>
                    <div className="mt-2 font-bold text-[#b8942f]">{hasVerifiedHud && recommendation.capRate !== null && recommendation.capRate !== undefined ? `${Number(recommendation.capRate).toFixed(1)}%` : 'Hidden'}</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-[#0f1629] sm:grid-cols-2">
                  <div className="dashboard-subpanel rounded-2xl p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#64748b]/50">Monthly NOI</div>
                    <div className="mt-1.5 font-black text-[#0d9668] text-base">{hasVerifiedHud ? formatNumber(monthlyNoi, '/mo') : 'Hidden'}</div>
                  </div>
                  <div className="dashboard-subpanel rounded-2xl p-4 sm:text-right">
                    <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#64748b]/50 sm:text-right">Voucher Support</div>
                    <div className="mt-1.5 font-black text-[#b8942f] text-base sm:text-right">{hasVerifiedHud ? formatNumber(recommendation.fmr, '/mo') : 'Hidden'}</div>
                  </div>
                </div>

                {!hasVerifiedHud && (
                  <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] p-3 text-xs leading-5 text-amber-800">
                    HUD verification failed for this ZIP, so rent benchmark, monthly NOI, and cap rate are hidden.
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <Link href={detailHref} prefetch className="btn-primary flex-1 text-center text-sm py-4 shadow-lg group-hover:shadow-[#b8942f]/20 transition-all duration-500">
                    Agent Analysis
                  </Link>
                  <div className="bento-reveal text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]/60">Full Underwriting Dossier Available</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fintech-card rounded-[28px] p-8 text-center sm:p-12">
          <div className="font-outfit text-2xl font-black text-[#0f1629]">No matching homes found</div>
          <p className="mt-3 text-sm text-[#64748b]">Change the search inputs above to repopulate the board.</p>
        </div>
      )}
    </div>
  );
}
