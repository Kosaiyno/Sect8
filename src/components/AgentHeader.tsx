"use client";
import Image from 'next/image';
import React from 'react';
import { Brain, ChevronDown, Search, Zap, ShieldCheck, Database, Radar } from 'lucide-react';

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
  zipOptions: ZipOption[];
  selectedZip: string;
  onChangeSelectedZip: (zip: string) => void;
  onRunZipSearch: () => void;
  isWorking?: boolean;
  hasError?: boolean;
};

export default function AgentHeader({
  agent,
  zipOptions,
  selectedZip,
  onChangeSelectedZip,
  onRunZipSearch,
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
              Market Scan
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
