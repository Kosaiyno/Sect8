"use client";
import React from 'react';

export default function MemoryPanel({ agent }: any) {
  const prefs = agent.preferences || {};
  const learned = agent.memory?.learned || ['High cashflow (> $300/mo)', 'Section 8 stable zones'];
  const updates = agent.memory?.history?.slice(-5).reverse() || [];

  return (
    <div className="glass-card p-6">
      <h4 className="font-bold">Agent Intelligence</h4>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted">Target ZIP</div>
          <div className="font-bold">{prefs.zipCode}</div>

          <div className="mt-4 text-sm text-muted">Strategy</div>
          <div className="font-bold">{prefs.strategy || 'Cashflow'}</div>

          <div className="mt-4 text-sm text-muted">Risk Tolerance</div>
          <div className="font-bold">{(prefs.minRoi || 0) > 0 ? 'Conservative' : 'Balanced'}</div>
        </div>

        <div>
          <div className="text-sm text-muted">Learned Preferences</div>
          <ul className="mt-2 list-disc ml-5 text-sm">
            {learned.map((l:any,i:number) => <li key={i}>{l}</li>)}
          </ul>

          <div className="mt-4 text-sm text-muted">Recent Learning Updates</div>
          <div className="mt-2 text-sm">
            {updates.length ? updates.map((u:any,i:number)=>(<div key={i} className="py-1">{u}</div>)) : <div className="text-muted">No recent updates</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
