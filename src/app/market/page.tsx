
"use client";

import { filterExcludedListings } from '@/lib/listingExclusionClient';

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Activity, ChevronDown, Building2, DollarSign, Search } from "lucide-react";
import { Property } from "@/types";

async function fetchMarketListings(zipCode: string) {
  const response = await fetch(`/api/market/listings?zipCode=${encodeURIComponent(zipCode)}&bedrooms=3`);
  return response.json();
}

async function fetchZipOptions() {
  const response = await fetch('/api/agents/search');
  return response.json();
}

function formatCurrency(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return 'Unavailable';
  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

export default function MarketPage() {
  const [zipOptions, setZipOptions] = useState<Array<{ zipCode: string; city: string; state: string; label: string }>>([]);
  const [selectedZip, setSelectedZip] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'rentcast-live' | 'rentcast-cache' | 'mock-enriched' | 'none'>('none');

  const loadProperties = async (zip: string) => {
    if (!zip) return;
    setIsLoading(true);
    try {
      const json = await fetchMarketListings(zip);
      if (json.success && Array.isArray(json.listings)) {
        // Filter out land/lot/vacant listings from market
        setProperties(filterExcludedListings(json.listings));
        setDataSource(json.source || 'none');
      }
    } catch (e) {
      console.error("Failed to load properties", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void (async () => {
      try {
        const json = await fetchZipOptions();
        if (json.success && Array.isArray(json.zipOptions)) {
          setZipOptions(json.zipOptions);
          const initialZip = json.zipOptions[0]?.zipCode || "";
          setSelectedZip(initialZip);
          if (initialZip) await loadProperties(initialZip);
        }
      } catch (e) {
        console.error("Failed to load ZIP options", e);
      }
      setIsLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-2 py-4 animate-fade-in sm:px-4 sm:py-6 lg:gap-8 lg:px-6 lg:py-8">
      {/* ─── HEADER SECTION ─── */}
      <section className="fintech-card p-4 sm:p-6 md:p-10 lg:p-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-4">
            <div className="platform-chip text-xs">
              <Activity size={12} />
              Agent market feed
            </div>
            <h1 className="font-outfit text-xl font-black tracking-[-0.03em] text-[#0f1629] sm:text-2xl md:text-4xl md:leading-[1.1]">
              I keep this market feed fast so I can decide which houses deserve a full dossier.
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-snug text-[#64748b] sm:text-base md:text-lg">
              This is my lighter review surface. I show active purchasable homes by ZIP, surface price and rent context, and let you decide which addresses I should escalate into deeper Section 8 analysis on the dashboard.
            </p>
            
            {dataSource === 'rentcast-cache' && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#b8942f]/20 bg-[#b8942f]/05 px-3 py-2 text-xs font-bold text-[#b8942f] sm:px-4 sm:py-3 sm:text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#b8942f] animate-pulse" />
                I restored this ZIP from my stored RentCast inventory snapshot.
              </div>
            )}
          </div>

          <div className="fintech-card w-full max-w-none border-2 border-gray-100 p-4 shadow-2xl sm:p-6 lg:max-w-md xl:min-w-[320px] xl:p-8">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#b8942f] sm:mb-6">
              <Search size={14} />
              ZIP markets I can scan
            </div>
            <div className="space-y-6 sm:space-y-8">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#64748b]/60">Target Market</label>
                <div className="relative">
                  <select 
                    value={selectedZip} 
                    onChange={(e) => {
                      setSelectedZip(e.target.value);
                      loadProperties(e.target.value);
                    }}
                    className="dashboard-field w-full appearance-none rounded-xl px-4 py-3 text-sm font-bold text-[#0f1629] outline-hidden cursor-pointer bg-white"
                  >
                    <option value="">Select market...</option>
                    {zipOptions.map((opt) => (
                      <option key={opt.zipCode} value={opt.zipCode}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#b8942f]" />
                </div>
              </div>
              <button 
                onClick={() => loadProperties(selectedZip)} 
                disabled={isLoading || !selectedZip}
                className="btn-primary flex w-full items-center justify-center gap-3 py-3 text-sm shadow-[0_8px_16px_rgba(184,148,47,0.15)] disabled:opacity-50 sm:py-4 sm:text-base"
              >
                {isLoading ? <Activity className="animate-spin" size={18} /> : 'Load My Market Feed'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MARKET QUEUE ─── */}
      <div className="fintech-card flex flex-col justify-between gap-4 border-b-[6px] border-b-[#b8942f]/20 p-4 sm:p-6 md:flex-row md:items-center md:gap-8 md:p-10 lg:p-12">
        <div className="space-y-2">
          <div className="platform-eyebrow text-xs">Market queue</div>
          <div className="font-outfit text-xl font-black text-[#0f1629] sm:text-2xl md:text-3xl">
            I found {properties.length} homes in <span className="text-[#b8942f]">{selectedZip || "ZIP Market"}</span>
          </div>
        </div>
        <div className="max-w-md text-sm font-bold leading-snug text-[#64748b] sm:text-base">
          Use this feed to shortlist addresses. When a home looks promising, move to the dashboard for my full underwriting and property dossier.
        </div>
      </div>

      {/* ─── PROPERTY FEED ─── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
        {properties.map((property, idx) => (
          <div key={property.id} className="fintech-card group border-2 border-gray-100 p-4 transition-all duration-500 hover-lift hover:border-[#b8942f]/40 sm:p-6 md:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
              <div className="rounded-full bg-[#0d9668]/05 border border-[#0d9668]/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#0d9668] flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#0d9668]" />
                Candidate
              </div>
              <div className="platform-eyebrow-muted text-[10px]">#{idx + 1}</div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-1">
                <h3 className="line-clamp-1 font-outfit text-lg font-black tracking-tight text-[#0f1629] group-hover:text-[#b8942f] transition-colors">{property.address}</h3>
                <div className="flex items-center gap-1 text-xs font-bold text-[#64748b]">
                  <MapPin size={13} className="text-[#b8942f]" />
                  {property.address.split(',').slice(1).join(',').trim()}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="stat-block rounded-xl p-4 hover:bg-white transition-colors border-gray-100/50">
                  <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#b8942f] mb-2">
                    <DollarSign size={10} /> Purchase Price
                  </div>
                  <div className="font-outfit text-lg font-black text-[#0f1629]">{formatCurrency(property.price)}</div>
                </div>
                <div className="stat-block rounded-xl p-4 hover:bg-white transition-colors border-gray-100/50">
                  <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#b8942f] mb-2">
                    <Building2 size={10} /> Rent
                  </div>
                  <div className="font-outfit text-lg font-black text-[#0f1629]">{formatCurrency(property.estimatedRent, '/mo')}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-y border-gray-100 py-4 sm:grid-cols-3">
                <div className="text-center space-y-0.5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/40">Beds</div>
                    <div className="flex items-center justify-center gap-1 font-bold text-[#0f1629]"><MarketBed size={12} className="text-[#b8942f]" /> {property.bedrooms || '—'}</div>
                </div>
                <div className="text-center space-y-0.5 border-y border-gray-100 py-2 sm:border-x sm:border-y-0 sm:py-0">
                  <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/40">Baths</div>
                    <div className="flex items-center justify-center gap-1 font-bold text-[#0f1629]"><MarketBath size={12} className="text-[#b8942f]" /> {property.bathrooms ?? '—'}</div>
                </div>
                <div className="text-center space-y-0.5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/40">Voucher Cap</div>
                  <div className="font-bold text-[#0d9668]">{formatCurrency(property.section8Cap, '/mo')}</div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs leading-snug font-bold text-[#64748b]">
                  I have not opened the full dossier here yet. Move this address into the dashboard if you want me to rank it, explain the Section 8 fit, and attach the deeper underwriting context.
                </p>
                <Link 
                  href={{
                    pathname: '/dashboard',
                    query: { zip: selectedZip, address: property.address }
                  }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-xs font-black tracking-widest uppercase"
                >
                  Analyze in Dashboard
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {!isLoading && properties.length === 0 && (
        <div className="fintech-card p-6 text-center flex flex-col items-center justify-center space-y-4 sm:p-10 lg:p-14">
          <div className="h-14 w-14 rounded-full bg-[#f8f9fb] flex items-center justify-center mb-2">
            <Search size={22} className="text-[#b8942f]" />
          </div>
          <div className="font-outfit text-xl font-black text-[#0f1629] sm:text-2xl">Market snapshot unavailable</div>
          <p className="max-w-md text-xs text-[#64748b] font-medium leading-snug sm:text-sm">
            Choose a different ZIP or return to the dashboard to seed the acquisition workflow for a new market.
          </p>
        </div>
      )}
    </div>
  );
}

function MarketBed({ size, className }: { size?: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
  );
}

function MarketBath({ size, className }: { size?: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-1.5h-1"/><path d="M14 6h1.5a1.5 1.5 0 0 1 1.5 1.5V11a4 4 0 0 1-4 4H9"/><path d="M3 11h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>
  );
}

function ArrowRight({ size, className }: { size?: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}
