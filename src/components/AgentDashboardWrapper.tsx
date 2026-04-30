import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';

const AgentDashboard = dynamic(() => import('@/components/AgentDashboard'), { ssr: false });

export default function AgentDashboardWrapper() {
  const { address, isConnected } = useAccount();
  if (!isConnected || !address) return null;
  return <AgentDashboard userAddress={address} />;
}
