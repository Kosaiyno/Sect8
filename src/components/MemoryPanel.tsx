"use client";
import React from 'react';
import { BrainCircuit, Compass, ShieldCheck, Sparkles, FileSearch } from 'lucide-react';

type RecentAnalysis = {
  id: string;
  address: string;
  generatedAt: number;
  score: number;
  provider: '0g-compute';
  purchasePrice: number | null;
  cashflow: number | null;
  capRate: number | null;
  headline: string;
  summary: string;
  verdict: string;
  analysisRoot: string;
};

type MemoryAgent = {
  preferences?: {
    zipCode?: string;
    strategy?: string;
    minRoi?: number;
  };
  memory?: {
    learned?: string[];
    history?: string[];
    recentAnalyses?: RecentAnalysis[];
    memoryRoot?: string | null;
  };
};

type MemoryPanelProps = {
  agent: MemoryAgent;
};

function formatCurrency(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }

  return `$${Math.round(value).toLocaleString()}${suffix}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatDateTime(value: number) {
  if (!value) {
    return 'Unknown time';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time';
  }

  return parsed.toLocaleString();
}

export default function MemoryPanel({ agent }: MemoryPanelProps) {
  const prefs = agent.preferences || {};
  const learned = agent.memory?.learned || ['High cashflow (> $300/mo)', 'Section 8 stable zones'];
  const updates = agent.memory?.history?.slice(-5).reverse() || [];
  const memoryRoot = agent.memory?.memoryRoot || 'No memory root yet';
  const riskProfile = Number(prefs.minRoi || 0) > 0 ? 'Conservative' : 'Balanced';
  const recentActions = agent.memory?.recentAnalyses || [];

  return (
    <div className="dashboard-panel rounded-[30px] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="platform-eyebrow">Agent Memory</div>
          <h4 className="mt-2 font-outfit text-2xl font-black text-white">What I just did</h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
            This is my verified analysis log. I only show properties where this wallet's agent actually ran 0G Compute and stored the result.
          </p>
        </div>
        <div className="platform-chip border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
          <ShieldCheck size={14} />
          0G Memory Active
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="dashboard-subpanel rounded-[26px] p-5">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
            <Compass size={14} />
            My operating focus
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="text-white/45">I am targeting ZIP</div>
              <div className="mt-1 text-lg font-black text-white">{prefs.zipCode || 'Not set'}</div>
            </div>
            <div>
              <div className="text-white/45">I am running strategy</div>
              <div className="mt-1 font-semibold text-white">{prefs.strategy || 'Cashflow-first Section 8 acquisitions'}</div>
            </div>
            <div>
              <div className="text-white/45">I am holding risk profile</div>
              <div className="mt-1 font-semibold text-white">{riskProfile}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-subpanel rounded-[26px] p-5 lg:col-span-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
            <Sparkles size={14} />
            My recent property analyses
          </div>
          <div className="mt-4 space-y-3">
            {recentActions.length ? recentActions.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-white/8 bg-[#0e1217] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="text-sm font-bold text-white">{`I ran 0G Compute on ${item.address}`}</div>
                <div className="mt-2 text-sm leading-6 text-white/78">
                  {`Generated ${formatDateTime(item.generatedAt)}. I scored it ${Math.round(Number(item.score || 0))}/100, read the purchase price at ${formatCurrency(item.purchasePrice)}, projected cash flow at ${formatCurrency(item.cashflow, '/mo')}, and cap rate at ${formatPercent(item.capRate)}.`}
                </div>
                <div className="mt-2 text-sm leading-6 text-cyan-100/78">{item.headline || item.verdict || item.summary}</div>
              </div>
            )) : (
              <div className="rounded-[22px] border border-white/8 bg-[#0e1217] px-4 py-4 text-sm text-white/60">
                I have not stored any verified 0G Compute analyses for this wallet yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="dashboard-subpanel rounded-[26px] p-5">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
            <FileSearch size={14} />
            My recent updates
          </div>
          <div className="mt-4 space-y-3">
            {updates.length ? updates.map((update, index) => (
              <div key={`${update}-${index}`} className="rounded-[20px] border border-white/8 bg-[#0d1015] px-4 py-3 text-sm leading-6 text-white/74">
                {update}
              </div>
            )) : (
              <div className="rounded-[20px] border border-white/8 bg-[#0d1015] px-4 py-3 text-sm text-white/50">I have no recent updates yet</div>
            )}
          </div>
        </div>

        <div className="dashboard-subpanel rounded-[26px] p-5">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
            <BrainCircuit size={14} />
            Patterns I have learned
          </div>
          <div className="mt-4 space-y-3">
            {learned.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-[20px] border border-white/8 bg-[#0d1015] px-4 py-3 text-sm leading-6 text-white/74">
                {item}
              </div>
            ))}
            <div className="rounded-[20px] border border-white/8 bg-[#0d1015] px-4 py-4 font-mono text-xs leading-6 text-cyan-100/88 break-all">
              {memoryRoot}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
