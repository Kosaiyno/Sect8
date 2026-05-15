import { useState } from 'react';
import { useAccount } from 'wagmi';

import { initializeAgentOnChain } from '@/lib/agentActivation';

type UserPreferences = {
  zipCode: string;
  minBedrooms: number;
  maxPrice: number;
  minRoi: number;
};

type ActivatedAgent = {
  id: string;
  owner: string;
  recordRoot?: string | null;
  onChainTokenId?: string | null;
  contractAddress?: string | null;
  activationTxHash?: string | null;
  preferences: Record<string, unknown>;
  memory: {
    agentId: string;
    owner: string;
    preferences: Record<string, unknown>;
    history: string[];
    recentAnalyses?: Array<{
      id: string;
      address: string;
      generatedAt: number;
      score: number;
      provider: '0g-compute';
      purchasePrice: number | null;
      cashflow: number | null;
      capRate: number | null;
      headline: string;
      summary: string;
      verdict: string;
      analysisRoot: string;
    }>;
    memoryRoot?: string | null;
    createdAt?: number | null;
  };
  status: string;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  zipCode: '48201',
  minBedrooms: 3,
  maxPrice: 150000,
  minRoi: 0.1,
};

export default function AgentDashboard({
  userAddress,
  onActivated,
}: {
  userAddress?: string;
  onActivated?: (agent: ActivatedAgent) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [activationPhase, setActivationPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const owner = (userAddress || address || '').toLowerCase();

  async function launchAgent() {
    setLoading(true);
    setActivationPhase('Preparing wallet...');
    setError(null);
    try {
      if (!owner) throw new Error('Connect your wallet first');

      // Check balance and fund if needed
      console.log('AgentDashboard: checking balance for', owner);
      const provider = new (await import('ethers')).BrowserProvider((window as any).ethereum);
      const balance = await provider.getBalance(owner);
      const minGas = (await import('ethers')).parseEther('0.008');
      console.log('AgentDashboard: current balance', balance.toString(), 'min required', minGas.toString());

      if (balance < minGas) {
        setActivationPhase('Funding your wallet with gas for agent creation...');
        console.log('AgentDashboard: calling /api/fund-gas for', owner);
        const fundRes = await fetch('/api/fund-gas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: owner }),
        });
        const fundJson = await fundRes.json();
        console.log('AgentDashboard: /api/fund-gas response', fundJson);
        if (!fundJson.success) throw new Error(fundJson.error || 'Failed to fund wallet');

        // If txHash returned, wait for confirmation via browser provider
        if (fundJson.txHash) {
          setActivationPhase('Waiting for funding transaction confirmation...');
          console.log('AgentDashboard: waiting for funding tx', fundJson.txHash);
          let receipt = null;
          let wtries = 0;
          while (wtries < 40) {
            try {
              receipt = await provider.getTransactionReceipt(fundJson.txHash);
            } catch (e) {
              console.warn('getTransactionReceipt error', e);
            }
            if (receipt && receipt.blockNumber) break;
            await new Promise((r) => setTimeout(r, 3000));
            wtries++;
          }
          if (!receipt || !receipt.blockNumber) throw new Error('Funding transaction not confirmed in time');
        }

        // Poll balance until funded
        setActivationPhase('Confirming funded balance...');
        let tries = 0;
        let funded = false;
        while (tries < 20) {
          const nb = await provider.getBalance(owner);
          console.log('AgentDashboard: polled balance', nb.toString());
          if (nb >= minGas) {
            funded = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
          tries++;
        }
        if (!funded) throw new Error('Wallet funding timed out. Try again in a few moments.');
      } else {
        console.log('AgentDashboard: balance sufficient, skipping fund-gas');
      }

      // Proceed to prepare/upload
      setActivationPhase('Preparing the first 0G memory root...');
      const prepareRes = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, preferences: DEFAULT_PREFERENCES, prepareOnly: true }),
      });
      const prepareJson = await prepareRes.json();
      if (!prepareJson.success || !prepareJson.memoryRoot) {
        throw new Error(prepareJson.error || 'Failed to prepare the initial 0G memory root');
      }

      setActivationPhase('Waiting for wallet confirmation on 0G Mainnet...');
      const onChain = await initializeAgentOnChain(owner, prepareJson.memoryRoot);

      setActivationPhase('Finalizing the agent record and syncing memory...');
      const persistRes = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          preferences: DEFAULT_PREFERENCES,
          memoryRoot: prepareJson.memoryRoot,
          recordRoot: prepareJson.recordRoot || null,
          onChainTokenId: onChain.tokenId,
          activationTxHash: onChain.txHash,
          contractAddress: onChain.contractAddress,
        }),
      });
      const persistJson = await persistRes.json();
      if (!persistJson.success) {
        throw new Error(persistJson.error || 'Activation finalization failed');
      }

      const activatedAgent = {
        id: persistJson.agentId || `agent-${owner}`,
        owner,
        recordRoot: persistJson.recordRoot || null,
        onChainTokenId: onChain.tokenId,
        contractAddress: onChain.contractAddress,
        activationTxHash: onChain.txHash,
        preferences: DEFAULT_PREFERENCES,
        memory: {
          agentId: persistJson.agentId || `agent-${owner}`,
          owner,
          preferences: DEFAULT_PREFERENCES,
          history: [
            `I am active for ${owner}`,
            `My on-chain agent token is #${onChain.tokenId} at ${onChain.contractAddress}`,
            `My activation transaction is ${onChain.txHash}`,
            persistJson.memoryRoot ? `I am synced to 0G at ${persistJson.memoryRoot}` : 'I do not have a 0G memory root synced yet',
          ],
          recentAnalyses: [],
          memoryRoot: persistJson.memoryRoot || null,
          createdAt: persistJson.agent?.createdAt || Date.now(),
        },
        status: 'active',
      } satisfies ActivatedAgent;

      onActivated?.(activatedAgent);
    } catch (error) {
      setError(String(error));
    } finally {
      setActivationPhase(null);
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-panel rounded-[32px] p-6 text-left md:p-8">
      <div className="platform-eyebrow">Agent activation</div>
      <h2 className="mt-3 font-outfit text-3xl font-black tracking-[-0.05em] text-[#0f1629]">Create my on-chain Sect8 agent</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64748b]">
        When you activate me, I create the Sect8 agent against the contract path, attach a first memory root, and prepare the 0G-backed workflow I use for scans, analysis, and storage.
      </p>

      <div className="agent-marquee mt-6 rounded-[26px] border border-gray-100 bg-[#f8f9fb] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="dashboard-subpanel rounded-[22px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6e1a]">Defaults I start with</div>
            <div className="mt-3 space-y-2 text-sm text-[#475569]">
              <div>ZIP: {DEFAULT_PREFERENCES.zipCode}</div>
              <div>Bedrooms: {DEFAULT_PREFERENCES.minBedrooms}+</div>
              <div>Max price: ${DEFAULT_PREFERENCES.maxPrice.toLocaleString()}</div>
              <div>Minimum ROI: {(DEFAULT_PREFERENCES.minRoi * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div className="dashboard-subpanel rounded-[22px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6e1a]">What I will do next</div>
            <div className="mt-3 space-y-2 text-sm text-[#475569]">
              <div>I bind your wallet to agent state.</div>
              <div>I prepare memory syncing through 0G storage.</div>
              <div>I open the acquisition dashboard so you can direct the first scan.</div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={launchAgent} disabled={loading} className="btn-primary mt-6 inline-flex items-center justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Creating My Agent...' : 'Create My Agent'}
      </button>

      {activationPhase && <div className="mt-4 text-sm text-[#0d9668]">{activationPhase}</div>}

      {error && <div className="mt-4 text-sm text-red-300">{error}</div>}
    </div>
  );
}
