"use client";
import React, { useState } from 'react';

export default function RecommendationsTable({ recommendations, onAction }: any) {
  const [selected, setSelected] = useState<any | null>(null);

  const sorted = [...(recommendations||[])].sort((a,b) => (b.netOperating||0) - (a.netOperating||0));

  return (
    <div className="glass-card p-6">
      <h4 className="font-bold mb-4">Agent Recommendations</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((r:any) => (
          <div key={r.id} className="market-card flex flex-col overflow-hidden rounded-xl bg-white/5 border border-white/5">
            <div className="w-full h-44 md:h-40 lg:h-44 bg-zinc-800 overflow-hidden">
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt={r.address} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted">No image</div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between gap-3">
              <div>
                <div className="font-bold text-sm md:text-base">{r.address}</div>
                <div className="text-xs text-muted mt-1">${r.purchasePrice} • {r.bedrooms} bd • {r.zip}</div>
                <div className="mt-2 text-sm">Est Rent: <strong>${r.estRent}</strong> • Cashflow: <strong>${Math.round((r.netOperating||0)/12)}/mo</strong></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted">{r.isBanger ? <span className="text-green-400 font-bold">Top Pick 🔥</span> : <span className="text-yellow-300">Recommended</span>}</div>
                <div className="text-right">
                  <div className="font-bold">${Math.round((r.netOperating||0)/12)}/mo</div>
                  <div className="text-xs text-muted">Cap {Number(r.capRate||0).toFixed(1)}%</div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => onAction && onAction('view', r)} className="text-xs px-3 py-2 bg-white/5 rounded-xl">Open</button>
                <button onClick={() => onAction && onAction('contact', r)} className="text-xs px-3 py-2 bg-white/5 rounded-xl">Contact</button>
                <button onClick={() => setSelected(r)} className="text-xs px-3 py-2 bg-white/5 rounded-xl">Why this pick?</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-3xl modal-card p-6 rounded-xl">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-bold text-lg">{selected.address}</div>
                <div className="text-sm text-muted">Source: {selected.source || 'unknown'}</div>
              </div>
              <button onClick={() => setSelected(null)} className="px-3 py-2 bg-white/5 rounded">Close</button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-sm"><strong>Agent reasoning</strong>: {selected.explanation}</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/3 rounded">
                  <div className="text-xs text-muted">Purchase Price</div>
                  <div className="font-bold">${selected.purchasePrice}</div>
                </div>
                <div className="p-3 bg-white/3 rounded">
                  <div className="text-xs text-muted">Est Rent</div>
                  <div className="font-bold">${selected.estRent}</div>
                </div>
                <div className="p-3 bg-white/3 rounded">
                  <div className="text-xs text-muted">HUD FMR</div>
                  <div className="font-bold">${selected.fmr || 'N/A'}</div>
                </div>
                <div className="p-3 bg-white/3 rounded">
                  <div className="text-xs text-muted">Cap Rate</div>
                  <div className="font-bold">{Number(selected.capRate||0).toFixed(1)}%</div>
                </div>
              </div>

              <div className="text-sm">Price source: <strong>{selected.source || 'unknown'}</strong>. {String(selected.source||'').startsWith('mock') ? <span className="text-yellow-300">This price is a demo placeholder — update to market value.</span> : null}</div>

              <div className="flex gap-2">
                <button onClick={() => { setSelected(null); onAction && onAction('view', selected); }} className="btn-primary">Open Listing</button>
                {selected.contactEmail ? (
                  <a href={`mailto:${selected.contactEmail}`} className="btn-secondary">Email Seller</a>
                ) : selected.contactPhone ? (
                  <a href={`tel:${selected.contactPhone}`} className="btn-secondary">Call Seller</a>
                ) : (
                  <button onClick={() => alert('No direct contact available. Consider using a local broker or opening the listing.') } className="btn-secondary">How to Purchase</button>
                )}
              </div>

              <div className="mt-4">
                <label className="text-xs text-muted">Adjust Purchase Price (simulate)</label>
                <div className="flex gap-2 mt-2">
                  <input type="number" defaultValue={selected.purchasePrice} id="price-input" className="px-3 py-2 rounded bg-white/5" />
                  <button onClick={() => {
                    const el:any = document.getElementById('price-input');
                    const newPrice = Number(el?.value || selected.purchasePrice);
                    onAction && onAction('updatePrice', { id: selected.id, purchasePrice: newPrice });
                    setSelected({ ...selected, purchasePrice: newPrice });
                  }} className="px-3 py-2 bg-green-600 text-white rounded">Update Price</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
