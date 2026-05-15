"use client";

import { useState } from "react";
import { ethers } from "ethers";

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

  // Helper to check balance
  async function getUserBalance(address: string): Promise<bigint> {
    try {
      // Use window.ethereum provider
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return await provider.getBalance(address);
    } catch {
      return 0n;
    }
  }

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
            setActivationPhase('Preparing wallet...');
            console.log('CreateAgent: starting onboarding flow');
            try {
              let owner = ((window as unknown as { ethereum?: EthereumWithSelectedAddress }).ethereum?.selectedAddress || '').trim();
              // If no selectedAddress, request accounts (wallet may be connected via connector UI)
              if (!owner && (window as any).ethereum?.request) {
                try {
                  const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                  owner = (accounts && accounts[0]) || owner;
                } catch (reqErr) {
                  console.warn('eth_requestAccounts failed', reqErr);
                }
              }

              if (!owner) throw new Error('Connect your wallet first');

              // 1. Always check balance and fund if needed
              const balance = await getUserBalance(owner);
              const minGas = ethers.parseEther('0.008'); // Require at least 0.008 native token
              console.log('Current balance for', owner, 'is', balance.toString());

              if (balance < minGas) {
                setActivationPhase('Funding your wallet with gas for agent creation...');
                console.log('Calling /api/fund-gas for', owner);
                let fundJson: any = { success: false };
                try {
                  const fundRes = await fetch('/api/fund-gas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: owner })
                  });
                  try {
                    fundJson = await fundRes.json();
                  } catch (jErr) {
                    console.error('Failed to parse /api/fund-gas response as json', jErr);
                    throw new Error('Invalid response from fund-gas');
                  }
                } catch (netErr) {
                  console.error('Network error calling /api/fund-gas', netErr);
                  alert('Network error while requesting gas funding: ' + String(netErr));
                  throw netErr;
                }

                console.log('/api/fund-gas returned', fundJson);
                if (!fundJson.success) {
                  alert('Gas funding error: ' + (fundJson.error || 'Failed to fund wallet'));
                  throw new Error(fundJson.error || 'Failed to fund wallet');
                }

                // If backend returned a txHash, wait for confirmation via the user's provider
                if (fundJson.txHash) {
                  try {
                    setActivationPhase('Waiting for funding transaction confirmation...');
                    console.log('Waiting for funding tx', fundJson.txHash);
                    const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
                    let receipt: any = null;
                    let waitTries = 0;
                    while (waitTries < 40) {
                      try {
                        receipt = await browserProvider.getTransactionReceipt(fundJson.txHash);
                      } catch (rErr) {
                        console.warn('getTransactionReceipt error', rErr);
                      }
                      if (receipt && receipt.blockNumber) {
                        console.log('Funding tx receipt', receipt);
                        break;
                      }
                      await new Promise(res => setTimeout(res, 3000));
                      waitTries++;
                    }
                    if (!receipt || !receipt.blockNumber) {
                      throw new Error('Funding transaction not confirmed in time');
                    }
                  } catch (waitErr) {
                    console.error('Error waiting for funding tx confirmation', waitErr);
                    throw waitErr;
                  }
                }

                // Wait for funding to arrive (poll balance)
                let tries = 0;
                let funded = false;
                while (tries < 20) {
                  await new Promise(res => setTimeout(res, 3000));
                  const newBalance = await getUserBalance(owner);
                  console.log('Polled balance attempt', tries + 1, '->', newBalance.toString());
                  if (newBalance >= minGas) {
                    funded = true;
                    break;
                  }
                  tries++;
                }
                if (!funded) throw new Error('Wallet funding timed out. Try again in a few moments.');
              } else {
                console.log('Balance sufficient, skipping fund-gas call');
              }

              setActivationPhase('Preparing the first 0G memory root...');
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
              console.error('CreateAgentModal error', error);
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
