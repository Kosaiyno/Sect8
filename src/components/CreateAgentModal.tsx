"use client";

import { useState } from "react";

import { initializeAgentOnChain } from "@/lib/agentActivation";
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
  const [loading, setLoading] = useState(false);
  const [activationPhase, setActivationPhase] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="glass-card w-full max-w-lg p-4 flex flex-col gap-4 animate-fade-in relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted hover:text-white">
          <X size={20} />
        </button>

        <div className="space-y-1">
          <h2 className="text-lg font-outfit font-black">Configure My Acquisition Agent</h2>
          <p className="text-muted text-xs">Set the first scan parameters I should use across 0G compute, storage, and agent state.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-muted flex items-center gap-1">
              <Target size={12} /> Target ZIP Code
            </label>
            <input 
              type="text" 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary outline-hidden text-sm"
              value={prefs.zipCode}
              onChange={(e) => setPrefs({...prefs, zipCode: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-muted flex items-center gap-1">
              <Home size={12} /> Min Bedrooms
            </label>
            <input 
              type="number" 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary outline-hidden text-sm"
              value={prefs.minBedrooms}
              onChange={(e) => setPrefs({...prefs, minBedrooms: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-muted flex items-center gap-1">
              <DollarSign size={12} /> Max Budget
            </label>
            <input 
              type="number" 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary outline-hidden text-sm"
              value={prefs.maxPrice}
              onChange={(e) => setPrefs({...prefs, maxPrice: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-muted flex items-center gap-1">
              <Percent size={12} /> Target ROI (%)
            </label>
            <input 
              type="number" 
              step="0.01"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary outline-hidden text-sm"
              value={prefs.minRoi * 100}
              onChange={(e) => setPrefs({...prefs, minRoi: parseFloat(e.target.value) / 100})}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setActivationPhase('Preparing the first 0G memory root...');
            try {
              const owner = ((window as unknown as { ethereum?: EthereumWithSelectedAddress }).ethereum?.selectedAddress || '').trim();
              if (!owner) throw new Error('Connect your wallet first');

              const prepareResponse = await fetch('/api/agents/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, preferences: prefs, prepareOnly: true })
              });

              const prepared = await prepareResponse.json();
              if (!prepared.success || !prepared.memoryRoot) throw new Error(prepared.error || 'failed to prepare activation');

              setActivationPhase('Waiting for wallet confirmation on 0G Mainnet...');
              const onChain = await initializeAgentOnChain(owner, prepared.memoryRoot);

              setActivationPhase('Finalizing the agent record and syncing memory...');
              const response = await fetch('/api/agents/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  owner,
                  preferences: prefs,
                  memoryRoot: prepared.memoryRoot,
                  recordRoot: prepared.recordRoot || null,
                  onChainTokenId: onChain.tokenId,
                  activationTxHash: onChain.txHash,
                  contractAddress: onChain.contractAddress,
                })
              });

              const json = await response.json();
              if (!json.success) throw new Error(json.error || 'activation failed');

              onCreate(prefs);
            } catch (error) {
              alert('Failed to initialize agent: ' + String(error));
            } finally {
              setLoading(false);
              setActivationPhase(null);
            }
          }}
          className="btn-primary w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creating My Agent...' : 'Activate Agent on 0G'}
        </button>

        {activationPhase && <div className="text-sm text-cyan-100">{activationPhase}</div>}
      </div>
    </div>
  );
}
