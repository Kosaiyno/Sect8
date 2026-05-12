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
  if (value.includes('scan')) return { label: 'Scan', icon: <Workflow size={14} />, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' };
  if (value.includes('0g') || value.includes('memory')) return { label: 'Memory', icon: <Database size={14} />, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (value.includes('agent:')) return { label: 'AI', icon: <BrainCircuit size={14} />, tone: 'bg-violet-50 text-violet-700 border-violet-100' };
  return { label: 'System', icon: <Activity size={14} />, tone: 'bg-gray-50 text-[#64748b] border-gray-100' };
}

export default function ActivityFeed({ agent }: { agent: ActivityAgent }) {
  const history = agent.memory?.history || [];
  const items = history.slice(-20).reverse();

  return (
    <div className="dashboard-panel rounded-[24px] p-5 sm:rounded-[30px] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="platform-eyebrow">Activity Feed</div>
          <h4 className="mt-2 font-outfit text-xl font-black text-[#0f1629] sm:text-2xl">Platform actions and agent events</h4>
        </div>
        <div className="platform-chip w-fit border-gray-100 bg-gray-50/50 text-[#64748b]">
          <Activity size={14} />
          {items.length} events
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length ? items.map((item, index) => {
          const meta = inferType(String(item));
          return (
            <div key={`${item}-${index}`} className="dashboard-subpanel flex flex-col gap-3 rounded-[20px] p-4 sm:flex-row sm:gap-4 sm:rounded-[24px]">
              <div className={`platform-chip h-fit w-fit ${meta.tone}`}>
                {meta.icon}
                {meta.label}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-6 text-[#64748b]">{String(item)}</div>
                <div className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#94a3b8]">Recorded in session memory</div>
              </div>
            </div>
          );
        }) : <div className="dashboard-subpanel rounded-[24px] p-4 text-sm text-[#94a3b8]">No activity yet</div>}
      </div>
    </div>
  );
}
