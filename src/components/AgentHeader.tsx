"use client";
import Image from 'next/image';
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
  hasError?: boolean;
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
  hasError = false,
}: AgentHeaderProps) {
  const displayId = agent.owner ? `${agent.owner.slice(0, 6)}...${agent.owner.slice(-4)}` : 'Wallet';
  const statusTone = agent.status === 'scanning'
    ? 'bg-amber-400/10 text-amber-700 border-amber-400/20'
    : agent.status === 'active'
      ? 'bg-[rgba(184,148,47,0.08)] text-[#b8942f] border-[rgba(184,148,47,0.25)]'
      : (isWorking ? 'bg-amber-400/10 text-amber-700 border-amber-400/20' : 'bg-gray-100 text-[#64748b] border-gray-200');

  return (
    <div className="fintech-card p-4 sm:p-6 md:p-8 xl:p-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        {/* AGENT IDENTITY */}
        <div className="min-w-0 space-y-6 xl:max-w-[580px]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32">
              <Image src="/sect8%20logo.png?v=3" alt="Sect8" fill className="object-contain" sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, 128px" unoptimized priority />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-outfit text-2xl font-black tracking-[-0.04em] text-[#0f1629] sm:text-3xl md:text-4xl">{`Agent ${displayId}`}</h2>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${statusTone}`}>
                  {isWorking ? 'Scanning' : hasError ? 'Failed' : (agent.status || 'active')}
                </span>
              </div>
              <div className="mt-3 max-w-xl text-sm leading-7 text-[#64748b] sm:text-base">
                Your institutional AI agent that analyses homes, stores memory on 0G, and produces investment dossiers for each of them.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Workflow', value: isWorking ? 'Scanning' : hasError ? 'Failed' : 'Purchasable homes scanning', icon: <Radar size={13} /> },
              { label: 'Intelligence', value: isWorking ? 'Scanning' : hasError ? 'Failed' : '0G Compute analysis', icon: <Brain size={13} /> },
              { label: 'Memory', value: isWorking ? 'Scanning' : hasError ? 'Failed' : (agent.memory?.memoryRoot ? '0G Storage synced' : 'Ready for 0G sync'), icon: <Database size={13} /> },
              { label: 'Verification', value: isWorking ? 'Scanning' : hasError ? 'Failed' : 'HUD Rent Support', icon: <ShieldCheck size={13} /> },
            ].map((item) => (
              <div key={item.label} className="dashboard-subpanel rounded-2xl px-4 py-3.5 hover-lift">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-[#b8942f]">
                  {item.icon}
                  {item.label}
                </div>
                <div className="mt-2 text-[11px] font-bold text-[#0f1629]/70">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SEARCH CONSOLE */}
        <div className="fintech-card w-full max-w-2xl overflow-hidden p-4 sm:p-6 xl:min-w-[460px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.26em] text-[#b8942f]">
              <Search size={14} />
              Search Console
            </div>
            <div className="flex w-full rounded-xl bg-[#f8f9fb] p-1 shadow-inner sm:w-auto">
              <button onClick={() => onChangeSearchMode('zip')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition sm:flex-none ${searchMode === 'zip' ? 'bg-white text-[#b8942f] shadow-sm' : 'text-[#64748b] hover:text-[#0f1629]'}`}>
                ZIP
              </button>
              <button onClick={() => onChangeSearchMode('filter')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition sm:flex-none ${searchMode === 'filter' ? 'bg-white text-[#b8942f] shadow-sm' : 'text-[#64748b] hover:text-[#0f1629]'}`}>
                Filter
              </button>
            </div>
          </div>

          {searchMode === 'zip' ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">ZIP Markets</label>
                <div className="relative">
                  <select value={selectedZip} onChange={(event) => onChangeSelectedZip(event.target.value)} className="dashboard-field w-full appearance-none rounded-2xl px-5 py-3.5 pr-12 text-sm font-bold outline-hidden color-scheme-light text-[#0f1629]">
                    <option value="">Select ZIP market</option>
                    {zipOptions.map((option) => (
                      <option key={option.zipCode} value={option.zipCode} className="bg-white text-[#0f1629]">{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#b8942f]" />
                </div>
              </div>

              <button onClick={onRunZipSearch} disabled={!selectedZip || isWorking} className="btn-primary flex w-full items-center justify-center gap-2.5 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50">
                <Zap size={16} className={isWorking ? 'animate-pulse' : ''} />
                {isWorking ? 'Scanning' : hasError ? 'Failed' : selectedZip ? 'Run Market Scan' : 'Select A ZIP'}
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">City</label>
                  <input value={filterSearch.city} onChange={(event) => onChangeFilterSearch('city', event.target.value)} placeholder="Detroit" className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden" />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">State</label>
                  <input value={filterSearch.state} onChange={(event) => onChangeFilterSearch('state', event.target.value.toUpperCase())} placeholder="MI" className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Bedrooms</label>
                  <select value={filterSearch.minBedrooms} onChange={(event) => onChangeFilterSearch('minBedrooms', event.target.value)} className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden">
                    <option value="any">Any</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Price Cap</label>
                  <input value={filterSearch.maxPrice} onChange={(event) => onChangeFilterSearch('maxPrice', event.target.value.replace(/\D/g, ''))} placeholder="250,000" className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden" />
                </div>
              </div>

              <div className="pt-2">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">
                  <SlidersHorizontal size={14} />
                  Asset Categories
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {PROPERTY_TYPES.map((propertyType) => {
                    const active = filterSearch.propertyTypes.includes(propertyType);
                    return (
                      <button key={propertyType} onClick={() => onTogglePropertyType(propertyType)} className={`rounded-full border px-4 py-2 text-xs font-bold transition-all duration-300 ${active ? 'border-[#b8942f]/30 bg-[#b8942f]/10 text-[#b8942f] shadow-sm' : 'border-[#eef0f3] bg-[#f8f9fb] text-[#64748b] hover:text-[#0f1629] hover:border-[#b8942f]/20'}`}>
                        {propertyType}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={onRunFilterSearch} disabled={isWorking} className="btn-primary flex w-full items-center justify-center gap-2.5 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50">
                <Zap size={16} className={isWorking ? 'animate-pulse' : ''} />
                {isWorking ? 'Analysis' : hasError ? 'Failed' : 'Run Filter Scan'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
