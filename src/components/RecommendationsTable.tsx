"use client";
import Link from 'next/link';
import React, { useState } from 'react';
import { Bath, BedDouble, Heart, MapPin } from 'lucide-react';

type RecommendationCard = {
  id: string;
  address: string;
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
  const [sortBy, setSortBy] = useState('newest');

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
      <div className="dashboard-panel rounded-[30px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">My recommendation board</div>
            <div className="mt-1 font-outfit text-2xl font-black tracking-[-0.04em] text-white">I am showing {filteredRecommendations.length} of {saleRecommendations.length} homes for sale</div>
          </div>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="dashboard-field rounded-2xl px-4 py-3 text-sm outline-hidden">
            <option value="newest">Newest</option>
            <option value="yield-high">Highest Cap Rate</option>
            <option value="cashflow-high">Highest Cashflow</option>
            <option value="price-low">Lowest Price</option>
            <option value="price-high">Highest Price</option>
          </select>
        </div>
      </div>

      {filteredRecommendations.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {filteredRecommendations.map((recommendation) => {
            const location = getLocationParts(recommendation.address);
            const monthlyNoi = Math.round(Number(recommendation.netOperating || 0) / 12);
            const propertyType = getPropertyType(recommendation);
            const hasVerifiedHud = recommendation.fmrSource === 'hud';

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
                  <button className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:text-white">
                    <Heart size={16} />
                  </button>
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
                  <Link href={`/dashboard/properties/${encodeURIComponent(recommendation.id)}`} prefetch className="btn-primary flex-1 text-center text-sm">
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
