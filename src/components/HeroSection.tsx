"use client";
import Link from 'next/link';
import React from 'react';
import { BadgeDollarSign, BedDouble, Building2, MapPin, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
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
      <div className="fintech-card p-6 sm:p-8 md:p-10">
        <div className="max-w-2xl space-y-5">
          <div className="platform-chip">
            <Sparkles size={14} />
            {isScanning ? 'Scanning' : 'Loading board'}
          </div>
          <h3 className="font-outfit text-2xl font-black tracking-tight text-[#0f1629] md:text-4xl">
            {isScanning
              ? `Scanning`
              : `Loading the saved board for ${targetZip || 'your selected ZIP'}.`}
          </h3>
          <p className="max-w-xl text-base leading-7 text-[#64748b]">
            Sect8 keeps the latest board in session so returning from agent analysis preserves your ZIP selection and scanned homes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-grid">
      <div className="fintech-card bento-item-8 p-6 sm:p-8 md:p-10">
        <div className="space-y-8">
            <div className="platform-chip">
              <TrendingUp size={14} />
              Top Investment Pick
            </div>

            <div>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <h3 className="max-w-3xl font-outfit text-2xl font-black tracking-[-0.04em] text-[#0f1629] sm:text-3xl md:text-[3rem] md:leading-[1.0]">
                  {topPick.address}
                </h3>
                <WatchlistButton
                  item={{
                    id: topPick.id,
                    address: topPick.address,
                    listingsRoot: topPick.listingsRoot,
                    analysisRoot: topPick.analysisRoot,
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
                  className="rounded-full border border-[#eef0f3] p-3 transition hover:border-[#b8942f]/30 hover:bg-[#b8942f]/05"
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#64748b] sm:gap-5">
                <span className="inline-flex items-center gap-2 font-bold text-[#b8942f]">
                  <MapPin size={14} />
                  Highest ranked in this market
                </span>
                <span className="inline-flex items-center gap-2 text-[#64748b]/80">
                  <BedDouble size={14} />
                  {topPick.bedrooms || 'N/A'} beds
                </span>
                <span className="text-[#64748b]/80 font-medium">{topPick.bathrooms ?? 'N/A'} baths</span>
                <span className="text-[#64748b]/80 font-medium">{topPick.propertyType || 'Residential'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Purchase Price', value: formatCurrency(Number(topPick.purchasePrice || 0)), icon: <BadgeDollarSign size={14} /> },
                { label: 'Rent Benchmark', value: formatCurrency(Number(topPick.fmr || 0), '/mo'), icon: <Building2 size={14} /> },
                { label: 'Monthly NOI', value: formatCurrency(monthlyNoi, '/mo'), icon: <TrendingUp size={14} /> },
                { label: 'Cap Rate', value: formatPercent(topPick.capRate), icon: <ShieldCheck size={14} /> },
              ].map((metric) => (
                <div key={metric.label} className="stat-block flex min-h-[110px] flex-col justify-between rounded-2xl px-4 py-4 hover-lift cursor-default transition-all duration-500 sm:px-5 sm:py-4.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">
                    {metric.icon}
                    {metric.label}
                  </div>
                  <div className="min-w-0 font-outfit text-xl leading-none font-black tracking-[-0.04em] text-[#0f1629] tabular-nums group-hover:scale-105 transition-transform origin-left sm:text-2xl">{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={detailHref || `/dashboard/properties/${encodeURIComponent(topPick.id)}`}
                prefetch
                className="btn-primary w-full text-center text-sm sm:min-w-[180px] sm:w-auto"
              >
                Agent Analysis
              </Link>
            </div>
        </div>
      </div>

      <div className="fintech-card bento-item-4 p-6 sm:p-8">
        <h4 className="font-outfit text-xl font-black tracking-tight text-[#0f1629]">Diligence Summary</h4>
        <div className="mt-6 space-y-5 text-sm text-[#64748b]">
          <div className="dashboard-subpanel rounded-2xl p-5 hover-lift transition-all duration-300">
            <div className="platform-eyebrow-muted text-[10px] tracking-widest">Selection logic</div>
            <div className="mt-3 text-sm font-bold text-[#0f1629]">
              {topPick ? `Strongest yield opportunity identified across ${total} homes.` : 'Run a scan to populate this summary.'}
            </div>
          </div>
 
          <div className="dashboard-subpanel rounded-2xl p-5 hover-lift transition-all duration-300">
            <div className="platform-eyebrow-muted text-[10px] tracking-widest">Property Snapshot</div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-[#0f1629] sm:grid-cols-2 sm:gap-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748b]/40">Source</div>
                <div className="mt-1 text-sm font-black">{topPick?.source || 'RentCast'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748b]/40">Benchmark</div>
                <div className="mt-1 text-sm font-black">{topPick?.fmrSource === 'hud' ? 'HUD FMR' : 'Fallback'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748b]/40">Size</div>
                <div className="mt-1 text-sm font-black">{topPick?.squareFootage ? `${topPick.squareFootage.toLocaleString()} sqft` : 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748b]/40">Confidence</div>
                <div className="mt-1 text-sm font-black text-[#0d9668]">High</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
