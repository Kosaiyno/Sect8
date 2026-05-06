import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';

const AgentDashboard = dynamic(() => import('@/components/AgentDashboard'), { ssr: false });

type ActivatedAgent = {
  id: string;
  owner: string;
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

export default function AgentDashboardWrapper({ onActivated }: { onActivated?: (agent: ActivatedAgent) => void }) {
  const { address, isConnected } = useAccount();
  if (!isConnected || !address) return null;
  return <AgentDashboard userAddress={address} onActivated={onActivated} />;
}
