"use client";
import React from 'react';

export default function HeroSection({ recommendations }: { recommendations: any[] }) {
  const total = recommendations?.length || 0;
  const top3 = recommendations.slice(0, 3);
  const confidence = Math.round((top3.reduce((s, r) => s + (r.confidence || (r.capRate || 0)), 0) / (top3.length || 1)) * 1) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-2 glass-card p-6">
        <h3 className="text-xl font-bold">Your Agent Found {total} High-Quality Opportunities</h3>
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <div className="text-4xl font-outfit font-black">{total}</div>
            <div className="text-muted text-sm">Properties scanned</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-outfit font-black">{confidence}%</div>
            <div className="text-muted text-sm">Confidence Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {top3.map((r,i) => (
            <div key={r.id || i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
              <div className="w-full h-28 rounded-md overflow-hidden bg-zinc-800">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt={r.address} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted">No image</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-bold text-sm md:text-base">{r.address}</div>
                  <div className="text-sm text-muted">Price: ${r.purchasePrice}</div>
                  <div className="mt-1 text-sm">Est Rent: ${r.estRent}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">ROI {Number((r.capRate||0)).toFixed(1)}%</div>
                  <div className={`mt-2 font-bold ${r.isBanger ? 'text-green-400' : 'text-yellow-300'}`}>{r.isBanger ? 'Top Pick 🔥' : 'Recommended'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h4 className="font-bold">Quick Actions</h4>
        <div className="mt-4 flex flex-col gap-3">
          <button className="btn-primary">View All Recommendations</button>
          <button className="btn-secondary">Adjust Strategy</button>
          <button className="btn-secondary">Authorize Server</button>
        </div>
      </div>
    </div>
  );
}
