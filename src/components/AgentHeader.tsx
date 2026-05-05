"use client";
import React from 'react';
import { Brain, ChevronDown, Search, SlidersHorizontal, Zap, ShieldCheck, Database, Radar } from 'lucide-react';

const PROPERTY_TYPES = ['Single Family', 'Multi-Family', 'Condo', 'Townhouse'];

type SearchFilters = {
  city: string;
  state: string;
  minBedrooms: string;
  minBathrooms: string;
  maxPrice: string;
  propertyTypes: string[];
};

type ZipOption = {
  zipCode: string;
  city: string;
  state: string;
  label: string;
};

type AgentHeaderProps = {
  agent: {
    owner?: string;
    status?: string;
    preferences?: {
      zipCode?: string;
      minBedrooms?: number;
    };
    memory?: {
      memoryRoot?: string | null;
    };
  };
  searchMode: 'zip' | 'filter';
  onChangeSearchMode: (mode: 'zip' | 'filter') => void;
  zipOptions: ZipOption[];
  selectedZip: string;
  onChangeSelectedZip: (zip: string) => void;
  onRunZipSearch: () => void;
  filterSearch: SearchFilters;
  onChangeFilterSearch: (field: keyof SearchFilters, value: string | string[]) => void;
  onTogglePropertyType: (propertyType: string) => void;
  onRunFilterSearch: () => void;
  isWorking?: boolean;
};

export default function AgentHeader({
  agent,
  searchMode,
  onChangeSearchMode,
  zipOptions,
  selectedZip,
  onChangeSelectedZip,
  onRunZipSearch,
  filterSearch,
  onChangeFilterSearch,
  onTogglePropertyType,
  onRunFilterSearch,
  isWorking = false,
}: AgentHeaderProps) {
  const displayId = agent.owner ? `${agent.owner.slice(0, 6)}...${agent.owner.slice(-4)}` : 'Wallet';
  const statusTone = agent.status === 'scanning'
    ? 'bg-amber-400/20 text-amber-100 border-amber-300/20'
    : agent.status === 'active'
      ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/20'
      : 'bg-white/8 text-white/70 border-white/10';

  return (
    <div className="dashboard-panel rounded-[34px] p-5 md:p-7">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-5 xl:max-w-[540px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="agent-avatar">S8</div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-outfit text-[2rem] font-black tracking-[-0.05em] text-white md:text-[2.35rem]">{`Sect8 Agent ${displayId}`}</h2>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ${statusTone}`}>{agent.status || 'active'}</span>
              </div>
              <div className="mt-2 max-w-xl text-[15px] leading-7 text-white/62">
                I am your acquisition desk for Section 8 opportunities. Tell me where to search, and I will rank houses, store my memory, and open the full underwriting dossier when a deal earns it.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Workflow', value: 'Scans purchasable homes first', icon: <Radar size={14} /> },
              { label: 'Analysis', value: '0G Compute for property analysis', icon: <Brain size={14} /> },
              { label: 'Memory', value: agent.memory?.memoryRoot ? '0G Storage for agent memory' : 'Ready to sync memory to 0G Storage', icon: <Database size={14} /> },
              { label: 'Trust', value: 'Scores against HUD-backed rent support', icon: <ShieldCheck size={14} /> },
            ].map((item) => (
              <div key={item.label} className="dashboard-subpanel rounded-[22px] px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
                  {item.icon}
                  {item.label}
                </div>
                <div className="mt-3 text-sm font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-subpanel w-full max-w-3xl rounded-[30px] p-4 text-white xl:min-w-[460px] xl:max-w-[760px] xl:p-5">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
            <Search size={14} />
            My search console
          </div>

          <div className="space-y-4">
            <div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-1.5">
              <button onClick={() => onChangeSearchMode('zip')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${searchMode === 'zip' ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]' : 'text-white/65 hover:text-white'}`}>
                Search By ZIP
              </button>
              <button onClick={() => onChangeSearchMode('filter')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${searchMode === 'filter' ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]' : 'text-white/65 hover:text-white'}`}>
                Search By Filter
              </button>
            </div>

            {searchMode === 'zip' ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-white/45">ZIP markets I can scan</label>
                  <div className="relative">
                    <select value={selectedZip} onChange={(event) => onChangeSelectedZip(event.target.value)} className="dashboard-field w-full appearance-none rounded-2xl px-4 py-3 pr-12 text-sm outline-hidden color-scheme-dark">
                      <option value="">Select ZIP market</option>
                      {zipOptions.map((option) => (
                        <option key={option.zipCode} value={option.zipCode} className="bg-[#111214] text-white">{option.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/55" />
                  </div>
                </div>

                <button onClick={onRunZipSearch} disabled={!selectedZip || isWorking} className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  <Zap size={16} />
                  {isWorking ? 'Scanning ZIP...' : selectedZip ? 'Run My ZIP Scan' : 'Select A ZIP To Scan'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-white/45">City</label>
                    <input value={filterSearch.city} onChange={(event) => onChangeFilterSearch('city', event.target.value)} placeholder="Detroit" className="dashboard-field w-full rounded-2xl px-4 py-3 text-sm outline-hidden" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-white/45">State</label>
                    <input value={filterSearch.state} onChange={(event) => onChangeFilterSearch('state', event.target.value.toUpperCase())} placeholder="MI" className="dashboard-field w-full rounded-2xl px-4 py-3 text-sm outline-hidden" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Min Bedrooms</label>
                    <select value={filterSearch.minBedrooms} onChange={(event) => onChangeFilterSearch('minBedrooms', event.target.value)} className="dashboard-field w-full rounded-2xl px-4 py-3 text-sm outline-hidden">
                      <option value="any">Any</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Min Bathrooms</label>
                    <select value={filterSearch.minBathrooms} onChange={(event) => onChangeFilterSearch('minBathrooms', event.target.value)} className="dashboard-field w-full rounded-2xl px-4 py-3 text-sm outline-hidden">
                      <option value="any">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Max Price</label>
                    <input value={filterSearch.maxPrice} onChange={(event) => onChangeFilterSearch('maxPrice', event.target.value.replace(/\D/g, ''))} placeholder="250000" className="dashboard-field w-full rounded-2xl px-4 py-3 text-sm outline-hidden" />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                    <SlidersHorizontal size={14} />
                    Property Types
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((propertyType) => {
                      const active = filterSearch.propertyTypes.includes(propertyType);
                      return (
                        <button key={propertyType} onClick={() => onTogglePropertyType(propertyType)} className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${active ? 'border-cyan-300/30 bg-cyan-300/15 text-cyan-100' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'}`}>
                          {propertyType}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button onClick={onRunFilterSearch} disabled={isWorking} className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  <Zap size={16} />
                  {isWorking ? 'Searching...' : 'Run My Filter Search'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
