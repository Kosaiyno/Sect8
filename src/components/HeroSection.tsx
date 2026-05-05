"use client";
import Link from 'next/link';
import React from 'react';
import { BadgeDollarSign, BedDouble, Building2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import WatchlistButton from '@/components/WatchlistButton';

type RecommendationSummary = {
  id: string;
  address: string;
  listingsRoot?: string | null;
  analysisRoot?: string | null;
  purchasePrice?: number | null;
  estRent?: number;
  netOperating?: number;
  capRate?: number | null;
  source?: string;
  bedrooms?: number;
  bathrooms?: number | null;
  explanation?: string;
  fmr?: number;
  fmrSource?: string;
  listingType?: string;
  propertyType?: string | null;
  squareFootage?: number | null;
};

function formatCurrency(value: number, suffix = '') {
  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `${Number(value).toFixed(1)}%`;
}

function scoreRecommendation(recommendation: RecommendationSummary) {
  if (recommendation.fmrSource !== 'hud') {
    return -1;
  }

  const monthlyNoi = Math.round(Number(recommendation.netOperating || 0) / 12);
  return Number(recommendation.capRate || 0) * 100 + monthlyNoi;
}

export default function HeroSection({ recommendations, isScanning = false, targetZip = '' }: { recommendations: RecommendationSummary[]; isScanning?: boolean; targetZip?: string }) {
  const saleRecommendations = recommendations.filter((recommendation) => Number(recommendation.purchasePrice || 0) >= 10000);
  const total = saleRecommendations.length;
  const verifiedRecommendations = saleRecommendations.filter((recommendation) => recommendation.fmrSource === 'hud');
  const topPick = [...verifiedRecommendations].sort((left, right) => scoreRecommendation(right) - scoreRecommendation(left))[0] || null;
  const monthlyNoi = topPick ? Math.round(Number(topPick.netOperating || 0) / 12) : 0;
  const detailHref = topPick ? {
    pathname: `/dashboard/properties/${encodeURIComponent(topPick.id)}`,
    query: {
      ...(topPick.listingsRoot ? { listingsRoot: topPick.listingsRoot } : {}),
      ...(topPick.analysisRoot ? { analysisRoot: topPick.analysisRoot } : {}),
    },
  } : null;

  if (!topPick) {
    return (
      <div className="dashboard-panel rounded-[32px] p-6 md:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-200">
            <Sparkles size={14} />
            {isScanning ? 'Scan running' : 'Market board loading'}
          </div>
          <h3 className="font-outfit text-3xl font-black tracking-tight text-white md:text-4xl">
            {isScanning
              ? `Scanning ${targetZip || 'your selected ZIP'} and loading the strongest cached matches.`
              : `Loading the saved board for ${targetZip || 'your selected ZIP'} so the dashboard opens with live candidates instead of an empty state.`}
          </h3>
          <p className="max-w-xl text-sm leading-6 text-white/70 md:text-base">
            Sect8 keeps the latest board in session so returning from agent analysis preserves your ZIP selection and scanned homes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
      <div className="dashboard-panel rounded-[32px] p-6 md:p-8">
        <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-200">
              <Sparkles size={14} />
              My current best pick
            </div>

            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="max-w-3xl font-outfit text-2xl font-black tracking-[-0.05em] text-white md:text-[2.7rem] md:leading-[1.02]">
                  {topPick.address}
                </h3>
                <WatchlistButton
                  item={{
                    id: topPick.id,
                    address: topPick.address,
                    bedrooms: topPick.bedrooms,
                    bathrooms: topPick.bathrooms,
                    purchasePrice: topPick.purchasePrice,
                    estRent: topPick.estRent,
                    netOperating: topPick.netOperating,
                    capRate: topPick.capRate,
                    fmr: topPick.fmr,
                    fmrSource: topPick.fmrSource,
                    propertyType: topPick.propertyType,
                    squareFootage: topPick.squareFootage,
                  }}
                  className="rounded-full border p-2.5 transition"
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[14px] text-white/66">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={14} />
                  I rank this highest in the selected market
                </span>
                <span className="inline-flex items-center gap-2">
                  <BedDouble size={14} />
                  {topPick.bedrooms || 'N/A'} beds
                </span>
                <span>{topPick.bathrooms ?? 'N/A'} baths</span>
                <span>{topPick.propertyType || 'Residential'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Purchase Price', value: formatCurrency(Number(topPick.purchasePrice || 0)), icon: <BadgeDollarSign size={16} /> },
                { label: 'Rent Benchmark', value: formatCurrency(Number(topPick.fmr || 0), '/mo'), icon: <Building2 size={16} /> },
                { label: 'Monthly NOI', value: formatCurrency(monthlyNoi, '/mo'), icon: <Sparkles size={16} /> },
                { label: 'Cap Rate', value: formatPercent(topPick.capRate), icon: <ShieldCheck size={16} /> },
              ].map((metric) => (
                <div key={metric.label} className="dashboard-subpanel flex min-h-[116px] flex-col justify-between rounded-[24px] px-4 py-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                    {metric.icon}
                    {metric.label}
                  </div>
                  <div className="font-outfit text-[clamp(1.45rem,1.8vw,2rem)] leading-[1.02] font-black tracking-[-0.04em] text-white tabular-nums">{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={detailHref || `/dashboard/properties/${encodeURIComponent(topPick.id)}`}
                prefetch
                className="btn-primary min-w-[180px] text-center text-sm"
              >
                Agent Analysis
              </Link>
            </div>
        </div>
      </div>

      <div className="dashboard-panel rounded-[32px] p-6">
        <h4 className="font-outfit text-xl font-black tracking-[-0.04em] text-white">Why I surfaced this address</h4>
        <div className="mt-4 space-y-4 text-[15px] text-white/70">
          <div className="dashboard-subpanel rounded-[24px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">My selection summary</div>
            <div className="mt-2 font-semibold text-white">
              {topPick ? `I scored ${topPick.address} as the strongest current opportunity across ${total} homes for sale.` : 'Run a scan and I will populate this summary with the first top-ranked house.'}
            </div>
          </div>

          <div className="dashboard-subpanel rounded-[24px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">My property snapshot</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-white">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Source</div>
                <div className="mt-1 font-semibold">{topPick?.source || 'RentCast'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Rent Benchmark Source</div>
                <div className="mt-1 font-semibold">{topPick?.fmrSource === 'hud' ? 'HUD county FMR' : 'Modeled fallback'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Square Footage</div>
                <div className="mt-1 font-semibold">{topPick?.squareFootage ? `${topPick.squareFootage.toLocaleString()} sqft` : 'N/A'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">HUD-verified listings</div>
                <div className="mt-1 font-semibold">{verifiedRecommendations.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
