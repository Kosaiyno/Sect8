"use client";

import { useState } from "react";

import { initializeAgentOnChain } from "@/lib/agentActivation";
import { UserPreferences } from "@/lib/ogAgent";
import { X, Target, DollarSign, Home, Percent, Sparkles } from "lucide-react";

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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#0f1629]/40 backdrop-blur-md p-4">
      <div className="modal-card w-full max-w-lg p-8 flex flex-col gap-8 animate-fade-in relative bg-white">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#64748b]/40 hover:text-[#0f1629] transition">
          <X size={22} />
        </button>

        <div className="space-y-2">
          <div className="platform-chip inline-flex">
            <Sparkles size={14} />
            Agent Setup
          </div>
          <h2 className="mt-3 text-2xl font-outfit font-black tracking-[-0.03em] text-[#0f1629]">Configure Acquisition Agent</h2>
          <p className="text-[#64748b] text-sm leading-6">Set the initial scan parameters for 0G compute, storage, and agent state.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.24em] text-[#b8942f] flex items-center gap-1.5">
              <Target size={13} /> Target ZIP Code
            </label>
            <input 
              type="text" 
              className="dashboard-field w-full rounded-xl px-4 py-3 text-sm outline-hidden"
              value={prefs.zipCode}
              onChange={(e) => setPrefs({...prefs, zipCode: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.24em] text-[#b8942f] flex items-center gap-1.5">
              <Home size={13} /> Min Bedrooms
            </label>
            <input 
              type="number" 
              className="dashboard-field w-full rounded-xl px-4 py-3 text-sm outline-hidden"
              value={prefs.minBedrooms}
              onChange={(e) => setPrefs({...prefs, minBedrooms: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.24em] text-[#b8942f] flex items-center gap-1.5">
              <DollarSign size={13} /> Max Budget
            </label>
            <input 
              type="number" 
              className="dashboard-field w-full rounded-xl px-4 py-3 text-sm outline-hidden"
              value={prefs.maxPrice}
              onChange={(e) => setPrefs({...prefs, maxPrice: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.24em] text-[#b8942f] flex items-center gap-1.5">
              <Percent size={13} /> Target ROI (%)
            </label>
            <input 
              type="number" 
              step="0.01"
              className="dashboard-field w-full rounded-xl px-4 py-3 text-sm outline-hidden"
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
          className="btn-primary w-full py-4 text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Creating Agent...' : 'Activate Agent on 0G'}
        </button>

        {activationPhase && <div className="text-sm text-[#b8942f] font-semibold">{activationPhase}</div>}
      </div>
    </div>
  );
}
