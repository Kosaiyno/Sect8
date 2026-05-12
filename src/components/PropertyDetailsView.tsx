"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BadgeDollarSign, Brain, Check, Copy, FileBadge2, Home, Mail, MapPin, Phone, ShieldCheck, Waves, Wind } from 'lucide-react';
import type { PropertyAnalysisBundle } from '@/lib/propertyAnalysis';
import type { PropertyDetailBundle } from '@/lib/propertyDetails';
import WatchlistButton from '@/components/WatchlistButton';

function cleanPresentationText(value: string | null | undefined) {
  const text = String(value || '').trim();
  if (!text) {
    return text;
  }

  const patterns: Array<[RegExp, string]> = [
    [/^My\s+/i, ''],
    [/^I view this as\s*/i, ''],
    [/^I scored\s*/i, ''],
    [/^I found that\s*/i, ''],
    [/^I found\s*/i, ''],
    [/^I see the Section 8 fit this way:\s*/i, ''],
    [/^I read the financial picture this way:\s*/i, ''],
    [/^I see\s*/i, ''],
    [/^I treat\s*/i, ''],
    [/^I like that\s*/i, ''],
    [/^I am watching that\s*/i, ''],
    [/^I would\s*/i, ''],
    [/^I generated this analysis with:\s*/i, ''],
    [/^I stored this analysis at:\s*/i, ''],
  ];

  let output = text;
  for (const [pattern, replacement] of patterns) {
    output = output.replace(pattern, replacement).trim();
  }

  return `${output.charAt(0).toUpperCase()}${output.slice(1)}`;
}

function cleanPresentationList(items: string[]) {
  return items.map((item) => cleanPresentationText(item));
}

function getHazardSnapshot(bundle: PropertyDetailBundle) {
  const riskSeries = [...bundle.attom.risk.environmental, ...bundle.attom.risk.naturalDisasters]
    .filter((item) => item.value !== null && item.value !== undefined)
    .sort((left, right) => Number(right.value || 0) - Number(left.value || 0))
    .slice(0, 2)
    .map((item) => `${item.label} ${Number(item.value).toFixed(0)}`);

  if (!riskSeries.length) {
    return 'Limited area-level hazard data returned from ATTOM.';
  }

  return `Highest surrounding-market readings: ${riskSeries.join(', ')}.`;
}

function formatCurrency(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }

  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatRisk(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }

  return `${Number(value).toFixed(1)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }

  return `${Number(value).toFixed(1)}%`;
}

function getRentMetricLabel(source: string | null | undefined) {
  return source === 'hud' ? 'HUD FMR' : 'Modeled FMR';
}

function truncateMiddle(value: string | null | undefined, edge = 12) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'Unavailable';
  }
  if (normalized.length <= edge * 2 + 3) {
    return normalized;
  }
  return `${normalized.slice(0, edge)}...${normalized.slice(-edge)}`;
}

function buildAddressSearchUrl(baseUrl: string, address: string) {
  return `${baseUrl}${encodeURIComponent(address)}`;
}

type PropertyDetailsViewProps = {
  bundle: PropertyDetailBundle;
  analysisResult: PropertyAnalysisBundle;
};

export default function PropertyDetailsView({ bundle, analysisResult }: PropertyDetailsViewProps) {
  const { listing, housingAuthority, attom } = bundle;
  const analysis = analysisResult.record.analysis;
  const strengths = cleanPresentationList(analysis.strengths);
  const risks = cleanPresentationList(analysis.risks);
  const nextSteps = cleanPresentationList(analysis.nextSteps);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const address = String(listing.address || '').trim();
  const searchLinks = address ? [
    { label: 'Zillow', href: buildAddressSearchUrl('https://www.zillow.com/homes/', address) },
    { label: 'Realtor.com', href: buildAddressSearchUrl('https://www.realtor.com/realestateandhomes-search/', address) },
    { label: 'Redfin', href: buildAddressSearchUrl('https://www.redfin.com/stingray/do/location-autocomplete?location=', address) },
  ] : [];
  const watchlistItem = {
    id: String(listing.id),
    address: String(listing.address || ''),
    listingsRoot: typeof listing.listingsRoot === 'string' ? listing.listingsRoot : null,
    analysisRoot: typeof listing.analysisRoot === 'string' ? listing.analysisRoot : null,
    zip: listing.zip,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    purchasePrice: listing.purchasePrice,
    estRent: listing.estRent,
    netOperating: listing.netOperating,
    capRate: listing.capRate,
    fmr: listing.fmr,
    fmrSource: listing.fmrSource,
    propertyType: listing.propertyType,
    squareFootage: listing.squareFootage,
    url: listing.url,
  };
  const rentMetricLabel = getRentMetricLabel(listing.fmrSource);
  const hasModeledRent = listing.fmrSource && listing.fmrSource !== 'hud';

  async function handleCopyAddress() {
    if (!address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2500);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-10 text-[#0f1629]">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2.5 rounded-full border border-[#eef0f3] bg-white px-5 py-2.5 text-sm font-bold text-[#0f1629] transition-all hover:bg-gray-50 hover:border-[#b8942f]/20 shadow-sm">
          <ArrowLeft size={18} />
          Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <WatchlistButton
            item={watchlistItem}
            showLabel
            label="Watchlist"
            className="inline-flex items-center gap-2.5 rounded-full border border-[#eef0f3] px-5 py-2.5 text-sm font-bold transition-all shadow-sm"
          />
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="fintech-card p-8 md:p-12">
        <div className="space-y-10">
          <div className="platform-chip">
            <ShieldCheck size={14} />
            Institutional Underwriting
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="font-outfit text-4xl font-black tracking-[-0.05em] text-[#0f1629] md:text-6xl md:leading-[1.0]">{listing.address}</h1>
              <div className="mt-6 flex flex-wrap items-center gap-6 text-[15px] text-[#64748b] font-medium">
                <span className="inline-flex items-center gap-2 text-[#b8942f] font-bold"><MapPin size={16} /> {listing.zip || 'Unknown ZIP'}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{listing.bedrooms || 'N/A'} beds</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{listing.bathrooms ?? 'N/A'} baths</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{listing.propertyType || 'Residential'}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{listing.squareFootage ? `${listing.squareFootage.toLocaleString()} sqft` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Purchase Price', value: formatCurrency(listing.purchasePrice), icon: <BadgeDollarSign size={16} /> },
              { label: rentMetricLabel, value: formatCurrency(listing.fmr, '/mo'), icon: <Home size={16} /> },
              { label: 'Monthly NOI', value: formatCurrency(listing.cashflow, '/mo'), icon: <FileBadge2 size={16} /> },
              { label: 'Annual NOI', value: formatCurrency(listing.annualCashflow), icon: <FileBadge2 size={16} /> },
              { label: 'Cap Rate', value: formatPercent(listing.capRate), icon: <ShieldCheck size={16} /> },
              { label: 'ROI', value: formatPercent(listing.roi), icon: <ShieldCheck size={16} /> },
            ].map((metric) => (
              <div key={metric.label} className="stat-block flex min-h-[120px] flex-col justify-between rounded-[28px] px-6 py-5 hover-lift">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">{metric.icon}{metric.label}</div>
                <div className="min-w-0 font-outfit text-2xl leading-none font-black tracking-[-0.05em] text-[#0f1629] tabular-nums">{metric.value}</div>
              </div>
            ))}
          </div>

          {hasModeledRent ? (
            <div className="rounded-[24px] border border-amber-300/20 bg-amber-300/05 p-6 text-sm leading-7 text-amber-900 backdrop-blur-md">
              <span className="font-black uppercase tracking-widest text-amber-600 text-[10px] block mb-1">Modeling Alert</span>
              HUD rent support was not verified for this address. Sect8 is showing modeled rent and underwriting instead of verified HUD figures.
            </div>
          ) : null}
        </div>
      </section>

      {/* ANALYSIS BENTO */}
      <div className="bento-grid">
        <section className="fintech-card bento-item-8 p-8 md:p-10 hover-lift">
          <div className="space-y-8">
            <div>
              <div className="platform-chip mb-6">
                <Brain size={14} />
                Agent Insights
              </div>
              <h2 className="font-outfit text-3xl font-black tracking-[-0.05em] text-[#0f1629] md:text-5xl">{cleanPresentationText(analysis.headline)}</h2>
              <p className="mt-6 text-base leading-8 text-[#64748b]">{cleanPresentationText(analysis.summary)}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="dashboard-subpanel rounded-[28px] p-6 hover-lift bg-white">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Section 8 Fit</div>
                <p className="mt-4 text-sm leading-7 text-[#475569] font-medium">{cleanPresentationText(analysis.section8Fit)}</p>
              </div>
              <div className="dashboard-subpanel rounded-[28px] p-6 hover-lift bg-white">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Financial Thesis</div>
                <p className="mt-4 text-sm leading-7 text-[#475569] font-medium">{cleanPresentationText(analysis.financialView)}</p>
              </div>
              <div className="dashboard-subpanel rounded-[28px] p-6 hover-lift bg-white">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Ownership Profile</div>
                <p className="mt-4 text-sm leading-7 text-[#475569] font-medium">{cleanPresentationText(analysis.ownershipAndTitleView)}</p>
              </div>
              <div className="dashboard-subpanel rounded-[28px] p-6 hover-lift bg-white">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Hazard Assessment</div>
                <p className="mt-4 text-sm leading-7 text-[#475569] font-medium">{cleanPresentationText(analysis.riskView)} {getHazardSnapshot(bundle)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="fintech-card bento-item-4 p-8 flex flex-col items-center justify-center text-center hover-lift">
          <div className="w-full space-y-8">
            <div className="platform-eyebrow-muted text-xs tracking-widest uppercase">Proprietary Score</div>
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#b8942f]/10 animate-ping" />
              <div className="relative h-44 w-44 rounded-full border-[10px] border-[#f8f9fb] bg-white flex flex-col items-center justify-center shadow-2xl">
                <div className="font-outfit text-6xl font-black text-[#b8942f]">{analysis.score}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#64748b]/60 mt-1">S8 Rating</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-2xl font-black text-[#0f1629]">{cleanPresentationText(analysis.verdict)}</div>
              <div className="platform-chip mx-auto">Confidence {analysis.confidence}%</div>
            </div>
          </div>
        </section>
      </div>

      {/* POSITIVE / WATCHOUTS / ACTIONS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="fintech-card p-8 border-l-4 border-l-[#0d9668] hover-lift">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0d9668] mb-6">Positive signals</div>
          <ul className="space-y-4">
            {strengths.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#64748b] font-medium">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d9668]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="fintech-card p-8 border-l-4 border-l-amber-500 hover-lift">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-600 mb-6">Watchouts</div>
          <ul className="space-y-4">
            {risks.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#64748b] font-medium">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="fintech-card p-8 border-l-4 border-l-[#b8942f] hover-lift">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b8942f] mb-6">Strategic actions</div>
          <ul className="space-y-4 mb-8">
            {nextSteps.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#64748b] font-medium">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b8942f]" />
                {item}
              </li>
            ))}
          </ul>
          {address && (
            <div className="mt-auto dashboard-subpanel rounded-2xl p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b]/60 mb-3">Address Reference</div>
              <div className="text-sm font-bold text-[#0f1629] mb-4">{address}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleCopyAddress} className="inline-flex items-center gap-2 rounded-full border border-[#eef0f3] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#0f1629] transition hover:bg-gray-50">
                  {copyState === 'copied' ? <Check size={12} /> : <Copy size={12} />}
                  {copyState === 'copied' ? 'Copied' : 'Copy'}
                </button>
                {searchLinks.slice(0, 2).map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#b8942f]/20 bg-[#b8942f]/05 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#b8942f] transition hover:bg-[#b8942f]/10">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DATA DETAILS (ATTOM / HUD) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="fintech-card p-8">
          <div className="platform-eyebrow-muted mb-4">Voucher Verification</div>
          <h2 className="font-outfit text-2xl font-black text-[#0f1629] mb-6">Housing Authority</h2>
          {housingAuthority ? (
            <div className="space-y-4">
              <div className="dashboard-subpanel rounded-2xl p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f] mb-2">Agency</div>
                <div className="text-lg font-black text-[#0f1629]">{housingAuthority.entry.name}</div>
                <div className="mt-2 text-sm font-medium text-[#64748b]">{housingAuthority.entry.programType}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="dashboard-subpanel rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2"><Phone size={12} /> Contact</div>
                  <div className="text-sm font-bold text-[#0f1629]">{housingAuthority.entry.phone || 'N/A'}</div>
                </div>
                <div className="dashboard-subpanel rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2"><Mail size={12} /> Email</div>
                  <div className="text-sm font-bold text-[#0f1629] truncate">{housingAuthority.entry.email || 'N/A'}</div>
                </div>
              </div>
              <div className="dashboard-subpanel rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2">Office Headquarters</div>
                <div className="text-sm font-medium text-[#64748b] leading-6">
                  {[housingAuthority.entry.address, [housingAuthority.entry.city, housingAuthority.entry.state, housingAuthority.entry.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-[#64748b] text-center italic">No authority records found for this market.</div>
          )}
        </section>

        <section className="fintech-card p-8">
          <div className="platform-eyebrow-muted mb-4">Ownership Records</div>
          <h2 className="font-outfit text-2xl font-black text-[#0f1629] mb-6">ATTOM Parcel Profile</h2>
          <div className="space-y-4">
            <div className="dashboard-subpanel rounded-2xl p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f] mb-2">Current Owner</div>
              <div className="text-lg font-black text-[#0f1629]">{attom.ownership.ownerName || 'Unavailable'}</div>
              <div className="mt-2 text-sm font-medium text-[#64748b]">{attom.ownership.mailingAddress || 'No mailing address on file'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="dashboard-subpanel rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2">Year Built</div>
                <div className="text-sm font-bold text-[#0f1629]">{attom.parcel.yearBuilt || 'N/A'}</div>
              </div>
              <div className="dashboard-subpanel rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2">Property Use</div>
                <div className="text-sm font-bold text-[#0f1629]">{attom.parcel.propertyUse || 'N/A'}</div>
              </div>
              <div className="dashboard-subpanel rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2">Assessed Value</div>
                <div className="text-sm font-bold text-[#0f1629]">{formatCurrency(attom.assessedValue.assessedTotal)}</div>
              </div>
              <div className="dashboard-subpanel rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60 mb-2">Market Value</div>
                <div className="text-sm font-bold text-[#0f1629]">{formatCurrency(attom.assessedValue.marketTotal)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* TABLES SECTION */}
      <div className="grid grid-cols-1 gap-8">
        <section className="fintech-card p-8 md:p-10">
          <div className="platform-eyebrow-muted mb-4">History</div>
          <h2 className="font-outfit text-3xl font-black text-[#0f1629] mb-8">Recorded Deed Transfers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#eef0f3] text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">
                  <th className="pb-4 pr-6">Date</th>
                  <th className="pb-4 pr-6">Buyer</th>
                  <th className="pb-4 pr-6">Seller</th>
                  <th className="pb-4 pr-6">Deed Type</th>
                  <th className="pb-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f9fb]">
                {attom.deedHistory.map((row, i) => (
                  <tr key={i} className="group hover:bg-[#f8f9fb]/50 transition-colors">
                    <td className="py-5 pr-6 text-sm font-bold text-[#0f1629]">{formatDate(row.transferDate)}</td>
                    <td className="py-5 pr-6 text-sm font-medium text-[#64748b]">{row.buyerName || '—'}</td>
                    <td className="py-5 pr-6 text-sm font-medium text-[#64748b]">{row.sellerName || '—'}</td>
                    <td className="py-5 pr-6 text-[11px] font-black uppercase tracking-wider text-[#b8942f]">{row.saleType || row.deedType || '—'}</td>
                    <td className="py-5 text-sm font-black text-[#0f1629]">{formatCurrency(row.saleAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="fintech-card p-8 md:p-10">
          <div className="platform-eyebrow-muted mb-4">Tax Records</div>
          <h2 className="font-outfit text-3xl font-black text-[#0f1629] mb-8">Annual Assessment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#eef0f3] text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">
                  <th className="pb-4 pr-6">Year</th>
                  <th className="pb-4 pr-6">Tax Amount</th>
                  <th className="pb-4 pr-6">Assessed Total</th>
                  <th className="pb-4 pr-6">Market Total</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f9fb]">
                {attom.taxHistory.map((row, i) => (
                  <tr key={i} className="group hover:bg-[#f8f9fb]/50 transition-colors">
                    <td className="py-5 pr-6 text-sm font-bold text-[#0f1629]">{row.taxYear || row.assessorYear}</td>
                    <td className="py-5 pr-6 text-sm font-black text-amber-700">{formatCurrency(row.taxAmount)}</td>
                    <td className="py-5 pr-6 text-sm font-medium text-[#64748b]">{formatCurrency(row.assessedTotal)}</td>
                    <td className="py-5 pr-6 text-sm font-medium text-[#64748b]">{formatCurrency(row.marketTotal)}</td>
                    <td className="py-5">
                      <span className="rounded-full bg-[#0d9668]/05 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#0d9668]">Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* PROOF & STORAGE */}
      <section className="fintech-card p-8 bg-[#f8f9fb]/50 border-none shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Analysis Provenance</div>
            <div className="text-sm font-bold text-[#0f1629]">Generated with {analysisResult.record.provider}</div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b]/50">Storage Root</div>
              <div className="text-[11px] font-mono text-[#b8942f] mt-1">{truncateMiddle(analysisResult.record.storageRoot, 15)}</div>
            </div>
            {analysisResult.record.computeProof && (
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b]/50">Compute ID</div>
                <div className="text-[11px] font-mono text-[#0d9668] mt-1">{truncateMiddle(analysisResult.record.computeProof.responseId, 15)}</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}