"use client";

import Link from 'next/link';
import { ArrowLeft, BadgeDollarSign, Brain, FileBadge2, Home, Mail, MapPin, Phone, ShieldCheck, Waves, Wind } from 'lucide-react';
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

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-8 text-white md:px-6 xl:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <WatchlistButton
            item={watchlistItem}
            showLabel
            label="Add to watchlist"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
          />
          {listing.url ? (
            <a href={listing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
              Open live listing
            </a>
          ) : null}
        </div>
      </div>

      <section className="dashboard-panel rounded-[34px] p-6 md:p-8">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-200">
            <ShieldCheck size={14} />
            Agent analysis
          </div>

          <div>
            <h1 className="max-w-4xl font-outfit text-3xl font-black tracking-[-0.05em] text-white md:text-[3.2rem] md:leading-[1.01]">{listing.address}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[15px] text-white/68">
              <span className="inline-flex items-center gap-2"><MapPin size={14} /> {listing.zip || 'Unknown ZIP'}</span>
              <span>{listing.bedrooms || 'N/A'} beds</span>
              <span>{listing.bathrooms ?? 'N/A'} baths</span>
              <span>{listing.propertyType || 'Residential'}</span>
              <span>{listing.squareFootage ? `${listing.squareFootage.toLocaleString()} sqft` : 'Sqft unavailable'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Purchase Price', value: formatCurrency(listing.purchasePrice), icon: <BadgeDollarSign size={16} /> },
              { label: 'HUD FMR', value: listing.fmrSource === 'hud' ? formatCurrency(listing.fmr, '/mo') : 'Unavailable', icon: <Home size={16} /> },
              { label: 'Projected Cash Flow', value: listing.fmrSource === 'hud' ? formatCurrency(listing.cashflow, '/mo') : 'Unavailable', icon: <FileBadge2 size={16} /> },
              { label: 'Annual Cash Flow', value: listing.fmrSource === 'hud' ? formatCurrency(listing.annualCashflow) : 'Unavailable', icon: <FileBadge2 size={16} /> },
              { label: 'Cap Rate', value: listing.fmrSource === 'hud' ? formatPercent(listing.capRate) : 'Unavailable', icon: <ShieldCheck size={16} /> },
              { label: 'ROI', value: listing.fmrSource === 'hud' ? formatPercent(listing.roi) : 'Unavailable', icon: <ShieldCheck size={16} /> },
            ].map((metric) => (
              <div key={metric.label} className="dashboard-subpanel flex min-h-[112px] flex-col justify-between rounded-[24px] px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{metric.icon}{metric.label}</div>
                <div className="min-w-0 font-outfit text-[clamp(1.05rem,1.35vw,1.65rem)] leading-none font-black tracking-[-0.05em] text-white tabular-nums">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-panel rounded-[34px] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-200">
              <Brain size={14} />
              Investment overview
            </div>
            <h2 className="mt-3 font-outfit text-2xl font-black tracking-[-0.05em] text-white md:text-[2.4rem]">{cleanPresentationText(analysis.headline)}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/72">{cleanPresentationText(analysis.summary)}</p>
          </div>
          <div className="dashboard-subpanel rounded-[28px] px-6 py-5 text-center text-cyan-50 bg-[linear-gradient(180deg,rgba(73,214,255,0.12),rgba(73,214,255,0.05))]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Section 8 Score</div>
            <div className="mt-2 font-outfit text-5xl font-black leading-none">{analysis.score}</div>
            <div className="mt-2 text-sm font-semibold">{cleanPresentationText(analysis.verdict)}</div>
            <div className="mt-2 text-xs text-cyan-50/75">Confidence {analysis.confidence}/100</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="dashboard-subpanel rounded-[24px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Section 8 fit</div>
            <p className="mt-3 text-sm leading-6 text-white/78">{cleanPresentationText(analysis.section8Fit)}</p>
          </div>
          <div className="dashboard-subpanel rounded-[24px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Financial read</div>
            <p className="mt-3 text-sm leading-6 text-white/78">{cleanPresentationText(analysis.financialView)}</p>
          </div>
          <div className="dashboard-subpanel rounded-[24px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Ownership read</div>
            <p className="mt-3 text-sm leading-6 text-white/78">{cleanPresentationText(analysis.ownershipAndTitleView)}</p>
          </div>
          <div className="dashboard-subpanel rounded-[24px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Hazard read</div>
            <p className="mt-3 text-sm leading-6 text-white/78">{cleanPresentationText(analysis.riskView)} {getHazardSnapshot(bundle)}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-[24px] border border-emerald-300/12 bg-emerald-300/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/70">Positive signals</div>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-white/80">
              {strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-amber-300/12 bg-amber-300/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/70">Watchouts</div>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-white/80">
              {risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-cyan-300/12 bg-cyan-300/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Next actions</div>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-white/80">
              {nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="dashboard-subpanel mt-5 rounded-[24px] p-4 text-sm text-white/70">
          <div>Analysis generated with: <strong>{analysisResult.record.provider === '0g-compute' ? '0G Compute' : 'fallback analysis'}</strong></div>
          <div className="mt-1">Stored at: <strong>{analysisResult.record.storageRoot || 'Storage upload unavailable'}</strong></div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Voucher verification</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">Housing authority contact</h2>
          {housingAuthority ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="dashboard-subpanel rounded-[24px] p-4 md:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Authority</div>
                <div className="mt-2 text-lg font-semibold text-white">{housingAuthority.entry.name}</div>
                <div className="mt-2 text-sm leading-6 text-white/70">
                  {housingAuthority.entry.programType || 'Program type unavailable'}
                  <span className="ml-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                    Matched by {housingAuthority.matchedBy}
                  </span>
                </div>
              </div>
              <div className="dashboard-subpanel rounded-[24px] p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40"><Phone size={14} /> Phone</div>
                <div className="mt-2 text-sm font-semibold text-white">{housingAuthority.entry.phone || 'Unavailable'}</div>
                <div className="mt-2 text-xs text-white/55">Fax: {housingAuthority.entry.fax || 'Unavailable'}</div>
              </div>
              <div className="dashboard-subpanel rounded-[24px] p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40"><Mail size={14} /> Email</div>
                <div className="mt-2 break-all text-sm font-semibold text-white">{housingAuthority.entry.email || 'Unavailable'}</div>
                <div className="mt-2 text-xs text-white/55">HUD office record</div>
              </div>
              <div className="dashboard-subpanel rounded-[24px] p-4 md:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Office Address</div>
                <div className="mt-2 text-sm leading-6 text-white/80">
                  {[
                    housingAuthority.entry.address,
                    [housingAuthority.entry.city, housingAuthority.entry.state, housingAuthority.entry.zip].filter(Boolean).join(' '),
                  ].filter(Boolean).join(', ') || 'Unavailable'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/90">
              No local housing authority match was found in the current HUD directory snapshot for this property yet.
            </div>
          )}
        </section>

        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Ownership verification</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">Current owner record</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Owner Name</div>
              <div className="mt-2 text-lg font-semibold text-white">{attom.ownership.ownerName || 'Unavailable from ATTOM owner record'}</div>
            </div>
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Verification Status</div>
              <div className="mt-2 text-lg font-semibold text-white">{attom.ownership.verified ? 'Verified via ATTOM' : 'ATTOM owner record unavailable'}</div>
            </div>
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Mailing Address</div>
              <div className="mt-2 text-sm leading-6 text-white/80">{attom.ownership.mailingAddress || 'Unavailable'}</div>
            </div>
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Owner Flags</div>
              <div className="mt-2 text-sm leading-6 text-white/80">
                {`Absentee: ${attom.ownership.absenteeOwnerStatus || 'Unknown'}`}
                <br />
                {`Corporate owner: ${attom.ownership.corporateOwner ? 'Yes' : 'No / not flagged'}`}
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Parcel data</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">ATTOM parcel profile</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['ATTOM ID', attom.parcel.attomId || 'Unavailable'],
              ['APN', attom.parcel.apn || 'Unavailable'],
              ['Property Use', attom.parcel.propertyUse || 'Unavailable'],
              ['Year Built', attom.parcel.yearBuilt ? String(attom.parcel.yearBuilt) : 'Unavailable'],
              ['Lot Number', attom.parcel.lotNumber || 'Unavailable'],
              ['Lot Size', attom.parcel.lotSizeSqft ? `${attom.parcel.lotSizeSqft.toLocaleString()} sqft` : 'Unavailable'],
              ['Latitude', attom.parcel.latitude ? String(attom.parcel.latitude) : 'Unavailable'],
              ['Longitude', attom.parcel.longitude ? String(attom.parcel.longitude) : 'Unavailable'],
            ].map(([label, value]) => (
              <div key={label} className="dashboard-subpanel rounded-[24px] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
                <div className="mt-2 text-sm font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Assessed value</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">Assessment snapshot</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Assessed Total', formatCurrency(attom.assessedValue.assessedTotal)],
              ['Market Total', formatCurrency(attom.assessedValue.marketTotal)],
              ['Tax Amount', formatCurrency(attom.assessedValue.taxAmount)],
              ['Assessor Year', attom.assessedValue.assessorYear ? String(attom.assessedValue.assessorYear) : 'Unavailable'],
              ['Tax Year', attom.assessedValue.taxYear ? String(attom.assessedValue.taxYear) : 'Unavailable'],
            ].map(([label, value]) => (
              <div key={label} className="dashboard-subpanel rounded-[24px] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
                <div className="mt-2 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Risk signals</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">Flood, fire, and environmental context</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40"><Waves size={14} /> Flood Risk</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatRisk(attom.risk.flood)}</div>
              <p className="mt-2 text-xs leading-5 text-white/50">ATTOM did not return a flood-specific index for this parcel if this shows unavailable.</p>
            </div>
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40"><Wind size={14} /> Fire Risk</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatRisk(attom.risk.fire)}</div>
              <p className="mt-2 text-xs leading-5 text-white/50">ATTOM community data does not expose a fire index for every geography.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Environmental Risk</div>
              <div className="mt-3 space-y-2 text-sm text-white/80">
                {attom.risk.environmental.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/6 pb-2 last:border-0 last:pb-0">
                    <span>{item.label}</span>
                    <span className="font-semibold text-white">{formatRisk(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dashboard-subpanel rounded-[24px] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Natural Disaster Index</div>
              <div className="mt-3 space-y-2 text-sm text-white/80">
                {attom.risk.naturalDisasters.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/6 pb-2 last:border-0 last:pb-0">
                    <span>{item.label}</span>
                    <span className="font-semibold text-white">{formatRisk(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Tax history</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">Assessment and tax records</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/40">
                  <th className="pb-3 pr-4">Assessor Year</th>
                  <th className="pb-3 pr-4">Tax Year</th>
                  <th className="pb-3 pr-4">Tax Amount</th>
                  <th className="pb-3 pr-4">Assessed Total</th>
                  <th className="pb-3 pr-4">Market Total</th>
                </tr>
              </thead>
              <tbody>
                {attom.taxHistory.map((row, index) => (
                  <tr key={`${row.assessorYear}-${index}`} className="border-b border-white/6 last:border-0">
                    <td className="py-3 pr-4">{row.assessorYear || 'Unavailable'}</td>
                    <td className="py-3 pr-4">{row.taxYear || 'Unavailable'}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.taxAmount)}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.assessedTotal)}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.marketTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-panel rounded-[32px] p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Deed history</div>
          <h2 className="mt-2 font-outfit text-2xl font-black text-white">Recorded transfer events</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/40">
                  <th className="pb-3 pr-4">Transfer Date</th>
                  <th className="pb-3 pr-4">Buyer</th>
                  <th className="pb-3 pr-4">Seller</th>
                  <th className="pb-3 pr-4">Sale Type</th>
                  <th className="pb-3 pr-4">Sale Amount</th>
                </tr>
              </thead>
              <tbody>
                {attom.deedHistory.map((row, index) => (
                  <tr key={`${row.transferDate}-${index}`} className="border-b border-white/6 last:border-0">
                    <td className="py-3 pr-4">{formatDate(row.transferDate)}</td>
                    <td className="py-3 pr-4">{row.buyerName || 'Unavailable'}</td>
                    <td className="py-3 pr-4">{row.sellerName || 'Unavailable'}</td>
                    <td className="py-3 pr-4">{row.saleType || row.deedType || 'Unavailable'}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.saleAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}