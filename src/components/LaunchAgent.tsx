import { useState } from 'react';

export default function LaunchAgent({ userAddress }: { userAddress: string }) {
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<{ tokenId: string; metadata: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLaunch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/launch-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress, agentMetadataURI: '' }), // Add metadata if needed
      });
      const data = await res.json();
      if (data.tokenId) {
        setAgent({ tokenId: data.tokenId, metadata: data.agentMetadataURI });
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleLaunch} disabled={loading}>
        {loading ? 'Launching Agent...' : 'Launch Agent'}
      </button>
      {agent && (
        <div style={{ marginTop: 16 }}>
          <div><b>Your iNFT Agent Token ID:</b> {agent.tokenId}</div>
          <div><b>Metadata URI:</b> {agent.metadata}</div>
        </div>
      )}
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
    </div>
  );
}
