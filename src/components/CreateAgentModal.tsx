"use client";

import { useState } from "react";
import { UserPreferences } from "@/lib/ogAgent";
import { X, Target, DollarSign, Home, Percent } from "lucide-react";
import { ethers } from 'ethers';
import { ensure0GChain } from '@/lib/wallet';

// Minimal ABI for client mint
const AGENT_NFT_ABI = [
  'function mintAgent(string initialMemoryRoot, string encryptedURI) public returns (uint256)',
  'event AgentInitialized(uint256 indexed tokenId, address indexed owner, string memoryRoot)'
];

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
          <h2 className="text-2xl font-outfit font-black">Configure Your Autonomous Agent</h2>
          <p className="text-muted text-sm">Define the parameters for your agent's scan on 0G.</p>
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
            // Upload initial memory to server-side storage first
            try {
              const initialMemory = {
                agentId: 'pending',
                preferences: prefs,
                history: [`Agent requested via client`],
                createdAt: Date.now()
              };

              const uploadRes = await fetch('/api/agents/uploadMemory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memory: initialMemory }) });
              const uploadJson = await uploadRes.json();
              if (!uploadJson.success) throw new Error(uploadJson.error || 'upload failed');

              const storageHash = uploadJson.hash;

              // If wallet present, mint via wallet
              if ((window as any).ethereum) {
                // ensure wallet is on 0G
                const switchRes = await ensure0GChain();
                if (!switchRes.success) throw new Error('Wallet chain switch failed: ' + (switchRes.error || ''));

                const provider = new ethers.BrowserProvider((window as any).ethereum as any);
                await provider.send('eth_requestAccounts', []);
                const signer = await provider.getSigner();
                try {
                  const signerAddr = await signer.getAddress();
                  const network = await provider.getNetwork();
                  const bal = await provider.getBalance(signerAddr);
                  console.log('Client mint: provider network, signer, balance', { chainId: network?.chainId, signer: signerAddr, balance: ethers.formatEther(bal) });
                } catch (logErr) {
                  console.warn('Client mint: failed to read signer/network/balance', logErr);
                }
                const nftAddress = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS;
                if (!nftAddress) throw new Error('Agent NFT contract address not configured');
                const contract = new ethers.Contract(nftAddress, AGENT_NFT_ABI as any, signer as any);
                const tx = await contract.mintAgent(storageHash, "");
                const receipt = await tx.wait();

                // parse event to get tokenId
                let tokenId: any = null;
                for (const log of receipt.logs || []) {
                  try {
                    const parsed = contract.interface.parseLog(log);
                    if (parsed && parsed.name === 'AgentInitialized') {
                      tokenId = parsed.args[0]?.toString();
                      break;
                    }
                  } catch (e) {}
                }

                // persist mapping server-side
                await fetch('/api/agents/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ owner: await signer.getAddress(), preferences: prefs, tokenId, txHash: receipt.transactionHash })
                });

                onCreate(prefs);
                return;
              }

              // fallback: call server create which will mint via server wallet
              await fetch('/api/agents/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: null, preferences: prefs })
              });

              onCreate(prefs);
            } catch (e:any) {
              alert('Failed to initialize agent: ' + (e?.message || e));
            }
          }}
          className="btn-primary w-full py-4 text-lg"
        >
          Initialize Agent on 0G (Mint with Wallet)
        </button>
      </div>
    </div>
  );
}
