import { useState } from 'react';
import { useAccount } from 'wagmi';

type UserPreferences = {
  zipCode: string;
  minBedrooms: number;
  maxPrice: number;
  minRoi: number;
};

type ActivatedAgent = {
  id: string;
  owner: string;
  preferences: Record<string, unknown>;
  memory: {
    agentId: string;
    owner: string;
    preferences: Record<string, unknown>;
    history: string[];
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
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const owner = (userAddress || address || '').toLowerCase();

  async function launchAgent() {
    setLoading(true);
    setError(null);
    try {
      if (!owner) throw new Error('Connect your wallet first');
      const persistRes = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, preferences: DEFAULT_PREFERENCES }),
      });
      const persistJson = await persistRes.json();
      if (!persistJson.success) {
        throw new Error(persistJson.error || 'Activation failed');
      }

      const activatedAgent = {
        id: persistJson.agentId || `agent-${owner}`,
        owner,
        preferences: DEFAULT_PREFERENCES,
        memory: {
          agentId: persistJson.agentId || `agent-${owner}`,
          owner,
          preferences: DEFAULT_PREFERENCES,
          history: [
            `I am active for ${owner}`,
            persistJson.memoryRoot ? `I am synced to 0G at ${persistJson.memoryRoot}` : 'I do not have a 0G memory root synced yet',
          ],
          memoryRoot: persistJson.memoryRoot || null,
          createdAt: persistJson.agent?.createdAt || Date.now(),
        },
        status: 'active',
      } satisfies ActivatedAgent;

      onActivated?.(activatedAgent);
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-panel rounded-[32px] p-6 text-left md:p-8">
      <div className="platform-eyebrow">Agent activation</div>
      <h2 className="mt-3 font-outfit text-3xl font-black tracking-[-0.05em] text-white">Create my on-chain Sect8 agent</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
        When you activate me, I create the Sect8 agent against the contract path, attach a first memory root, and prepare the 0G-backed workflow I use for scans, analysis, and storage.
      </p>

      <div className="agent-marquee mt-6 rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="dashboard-subpanel rounded-[22px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Defaults I start with</div>
            <div className="mt-3 space-y-2 text-sm text-white/78">
              <div>ZIP: {DEFAULT_PREFERENCES.zipCode}</div>
              <div>Bedrooms: {DEFAULT_PREFERENCES.minBedrooms}+</div>
              <div>Max price: ${DEFAULT_PREFERENCES.maxPrice.toLocaleString()}</div>
              <div>Minimum ROI: {(DEFAULT_PREFERENCES.minRoi * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div className="dashboard-subpanel rounded-[22px] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">What I will do next</div>
            <div className="mt-3 space-y-2 text-sm text-white/78">
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

      {error && <div className="mt-4 text-sm text-red-300">{error}</div>}
    </div>
  );
}
