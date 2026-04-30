"use client";
import React from 'react';

export default function ActivityFeed({ agent }: any) {
  const history = agent.memory?.history || [];
  const items = history.slice(-20).reverse();

  return (
    <div className="glass-card p-6">
      <h4 className="font-bold">Agent Activity Feed</h4>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((it:any,i:number) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <div>
              <div className="text-sm">{String(it)}</div>
              <div className="text-xs text-muted">{new Date().toLocaleString()}</div>
            </div>
          </div>
        )) : <div className="text-muted">No activity yet</div>}
      </div>
    </div>
  );
}
