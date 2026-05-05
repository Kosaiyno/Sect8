"use client";
import React from 'react';
import { Activity, BrainCircuit, Database, Workflow } from 'lucide-react';

type ActivityAgent = {
  memory?: {
    history?: string[];
  };
};

function inferType(entry: string) {
  const value = entry.toLowerCase();
  if (value.includes('scan')) return { label: 'Scan', icon: <Workflow size={14} />, tone: 'bg-cyan-300/10 text-cyan-100 border-cyan-300/15' };
  if (value.includes('0g') || value.includes('memory')) return { label: 'Memory', icon: <Database size={14} />, tone: 'bg-emerald-300/10 text-emerald-100 border-emerald-300/15' };
  if (value.includes('agent:')) return { label: 'AI', icon: <BrainCircuit size={14} />, tone: 'bg-violet-300/10 text-violet-100 border-violet-300/15' };
  return { label: 'System', icon: <Activity size={14} />, tone: 'bg-white/8 text-white/75 border-white/10' };
}

export default function ActivityFeed({ agent }: { agent: ActivityAgent }) {
  const history = agent.memory?.history || [];
  const items = history.slice(-20).reverse();

  return (
    <div className="dashboard-panel rounded-[30px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="platform-eyebrow">Activity Feed</div>
          <h4 className="mt-2 font-outfit text-2xl font-black text-white">Platform actions and agent events</h4>
        </div>
        <div className="platform-chip border-white/10 bg-white/5 text-white/70">
          <Activity size={14} />
          {items.length} events
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length ? items.map((item, index) => {
          const meta = inferType(String(item));
          return (
            <div key={`${item}-${index}`} className="dashboard-subpanel flex gap-4 rounded-[24px] p-4">
              <div className={`platform-chip h-fit ${meta.tone}`}>
                {meta.icon}
                {meta.label}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-6 text-white/80">{String(item)}</div>
                <div className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/35">Recorded in session memory</div>
              </div>
            </div>
          );
        }) : <div className="dashboard-subpanel rounded-[24px] p-4 text-sm text-white/55">No activity yet</div>}
      </div>
    </div>
  );
}
