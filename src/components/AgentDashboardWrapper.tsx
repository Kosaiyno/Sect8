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
