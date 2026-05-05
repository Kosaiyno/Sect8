"use client";

import { useEffect, useState } from "react";
import { Property } from "@/types";
import { Bed, Bath, MapPin, Activity, ChevronDown, Building2, DollarSign } from "lucide-react";

async function fetchMarketListings(zipCode: string) {
  const response = await fetch(`/api/market/listings?zipCode=${encodeURIComponent(zipCode)}&bedrooms=3`);
  return response.json();
}

async function fetchZipOptions() {
  const response = await fetch('/api/agents/search');
  return response.json();
}

function formatCurrency(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }

  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

function getLocation(address: string) {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.slice(1).join(', ') || address;
}

export default function MarketPage() {
  const [zipOptions, setZipOptions] = useState<Array<{ zipCode: string; city: string; state: string; label: string }>>([]);
  const [selectedZip, setSelectedZip] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'rentcast-live' | 'rentcast-cache' | 'mock-enriched' | 'none'>('none');

  const loadProperties = async () => {
    if (!selectedZip) {
      setProperties([]);
      setDataSource('none');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const json = await fetchMarketListings(selectedZip);

      if (json.success && Array.isArray(json.listings)) {
        setProperties(json.listings);
        setDataSource(json.source || 'none');
      } else {
        setProperties([]);
        setDataSource('none');
      }
    } catch {
      setProperties([]);
      setDataSource('none');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void (async () => {
      try {
        const json = await fetchZipOptions();
        if (json.success && Array.isArray(json.zipOptions)) {
          setZipOptions(json.zipOptions);
          const nextZip = json.zipOptions[0]?.zipCode || '';
          setSelectedZip(nextZip);

          if (nextZip) {
            const listingsJson = await fetchMarketListings(nextZip);
            if (listingsJson.success && Array.isArray(listingsJson.listings)) {
              setProperties(listingsJson.listings);
              setDataSource(listingsJson.source || 'none');
            } else {
              setProperties([]);
              setDataSource('none');
            }
          }
        }
      } catch {
        setZipOptions([]);
        setProperties([]);
        setDataSource('none');
      }

      setIsLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <section className="surface-panel rounded-[32px] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
              Agent market feed
            </div>
            <h1 className="section-title text-4xl md:text-5xl">I keep this market feed fast so I can decide which houses deserve a full dossier.</h1>
            <p className="section-copy max-w-2xl text-base md:text-lg">
              This is my lighter review surface. I show active purchasable homes by ZIP, surface price and rent context, and let you decide which addresses I should escalate into deeper Section 8 analysis on the dashboard.
            </p>
          {dataSource === 'rentcast-cache' && (
              <p className="text-sm text-cyan-200">I restored this ZIP from my stored RentCast inventory snapshot.</p>
          )}
          </div>

          <div className="dashboard-panel w-full max-w-md rounded-[30px] p-4 backdrop-blur lg:min-w-[340px]">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">ZIP markets I can scan</label>
            <div className="relative">
              <select value={selectedZip} onChange={(event) => setSelectedZip(event.target.value)} className="dashboard-field w-full appearance-none rounded-2xl px-4 py-3 pr-12 text-sm text-white outline-hidden color-scheme-dark">
                <option value="">Select ZIP market</option>
                {zipOptions.map((option) => (
                  <option key={option.zipCode} value={option.zipCode} className="bg-[#111820] text-white">{option.label}</option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/55" />
            </div>
            <button onClick={loadProperties} disabled={isLoading || !selectedZip} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? <Activity className="animate-spin" size={18} /> : 'Load My Market Feed'}
            </button>
          </div>
        </div>
      </section>

      <div className="dashboard-panel rounded-[32px] p-5 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Market queue</div>
            <div className="mt-1 font-outfit text-2xl font-black text-white">I found {properties.length} homes in {selectedZip || 'the selected ZIP'}</div>
          </div>
          <div className="text-sm text-white/55">Use this feed to shortlist addresses. When a home looks promising, move to the dashboard for my full underwriting and property dossier.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((property) => (
          <div key={property.id} className="dashboard-panel market-card relative rounded-[30px] p-5">
            <div className="market-card-accent absolute inset-x-6 top-0 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/70 to-cyan-300/0" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="line-clamp-1 text-xl font-black text-white">{property.address}</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-white/60">
                  <MapPin size={14} className="text-cyan-200" />
                  {getLocation(property.address)}
                </div>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                Candidate
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  <DollarSign size={13} />
                  Purchase Price
                </div>
                <div className="mt-2 font-outfit text-2xl font-black text-white">{formatCurrency(property.price)}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  <Building2 size={13} />
                  Rent
                </div>
                <div className="mt-2 font-outfit text-2xl font-black text-cyan-100">{formatCurrency(property.estimatedRent, '/mo')}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-white">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Beds</div>
                <div className="mt-2 flex items-center gap-2 font-semibold"><Bed size={14} className="text-cyan-200" /> {property.bedrooms || 'N/A'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-white">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Baths</div>
                <div className="mt-2 flex items-center gap-2 font-semibold"><Bath size={14} className="text-cyan-200" /> {property.bathrooms ?? 'N/A'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-white">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Voucher Cap</div>
                <div className="mt-2 font-semibold text-emerald-300">{formatCurrency(property.section8Cap, '/mo')}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-300/10 bg-cyan-300/[0.06] p-4 text-sm leading-6 text-white/78">
              I have not opened the full dossier here yet. Move this address into the dashboard if you want me to rank it, explain the Section 8 fit, and attach the deeper underwriting context.
            </div>
          </div>
        ))}
      </div>

      {!isLoading && properties.length === 0 && (
        <div className="dashboard-panel rounded-[32px] p-10 text-center">
          <div className="font-outfit text-3xl font-black text-white">I do not have a market snapshot for this ZIP yet</div>
          <p className="mt-3 text-white/60">Choose another market or open the dashboard so I can seed the acquisition workflow and store a new listing snapshot.</p>
        </div>
      )}
    </div>
  );
}
