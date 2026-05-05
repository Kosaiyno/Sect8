"use client";

import { useState } from "react";
import { UserPreferences } from "@/lib/ogAgent";
import { X, Target, DollarSign, Home, Percent } from "lucide-react";

type EthereumWithSelectedAddress = {
  selectedAddress?: string;
};

export function CreateAgentModal({ 
  onClose, 
  onCreate 
}: { 
  onClose: () => void; 
  onCreate: (prefs: UserPreferences) => void; 
}) {
  const [prefs, setPrefs] = useState<UserPreferences>({
    zipCode: "48201", // Default Detroit
    minBedrooms: 3,
    maxPrice: 150000,
    minRoi: 0.1,
  });

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg p-8 flex flex-col gap-8 animate-fade-in relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-muted hover:text-white">
          <X size={24} />
        </button>

        <div className="space-y-2">
          <h2 className="text-2xl font-outfit font-black">Configure My Acquisition Agent</h2>
          <p className="text-muted text-sm">Set the first scan parameters I should use across 0G compute, storage, and agent state.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted flex items-center gap-1">
              <Target size={14} /> Target ZIP Code
            </label>
            <input 
              type="text" 
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden"
              value={prefs.zipCode}
              onChange={(e) => setPrefs({...prefs, zipCode: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted flex items-center gap-1">
              <Home size={14} /> Min Bedrooms
            </label>
            <input 
              type="number" 
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden"
              value={prefs.minBedrooms}
              onChange={(e) => setPrefs({...prefs, minBedrooms: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted flex items-center gap-1">
              <DollarSign size={14} /> Max Budget
            </label>
            <input 
              type="number" 
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden"
              value={prefs.maxPrice}
              onChange={(e) => setPrefs({...prefs, maxPrice: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted flex items-center gap-1">
              <Percent size={14} /> Target ROI (%)
            </label>
            <input 
              type="number" 
              step="0.01"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden"
              value={prefs.minRoi * 100}
              onChange={(e) => setPrefs({...prefs, minRoi: parseFloat(e.target.value) / 100})}
            />
          </div>
        </div>

        <button 
          onClick={async () => {
            try {
              const owner = ((window as unknown as { ethereum?: EthereumWithSelectedAddress }).ethereum?.selectedAddress || '').trim();
              if (!owner) throw new Error('Connect your wallet first');

              const response = await fetch('/api/agents/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, preferences: prefs })
              });

              const json = await response.json();
              if (!json.success) throw new Error(json.error || 'activation failed');

              onCreate(prefs);
            } catch (error) {
              alert('Failed to initialize agent: ' + String(error));
            }
          }}
          className="btn-primary w-full py-4 text-lg"
        >
          Activate Agent on 0G
        </button>
      </div>
    </div>
  );
}
