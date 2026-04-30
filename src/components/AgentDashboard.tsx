import { useState } from 'react';

export default function AgentDashboard({ userAddress }: { userAddress: string }) {
  const [agent, setAgent] = useState<{ tokenId: string; metadata: string } | null>(null);
  const [avatar, setAvatar] = useState<string>('');
  const [metadata, setMetadata] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launchAgent() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/launch-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress, agentMetadataURI: metadata }),
      });
      const data = await res.json();
      if (data.tokenId) {
        setAgent({ tokenId: data.tokenId, metadata: data.agentMetadataURI });
        // Optionally fetch avatar from metadata URI (if it's an IPFS/HTTP link to JSON with image)
        if (data.agentMetadataURI) {
          try {
            const metaRes = await fetch(data.agentMetadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/'));
            const meta = await metaRes.json();
            setAvatar(meta.image || '');
          } catch {}
        }
        // Fetch agent history (mocked for now)
        setHistory([`Agent launched at ${new Date().toLocaleString()}`]);
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
      <h2>Your iNFT Agent</h2>
      <div style={{ marginBottom: 16 }}>
        <label>Agent Metadata URI (optional): </label>
        <input
          type="text"
          value={metadata}
          onChange={e => setMetadata(e.target.value)}
          placeholder="ipfs://... or https://..."
          style={{ width: 300 }}
        />
      </div>
      <button onClick={launchAgent} disabled={loading}>
        {loading ? 'Launching Agent...' : agent ? 'Agent Launched' : 'Launch Agent'}
      </button>
      {agent && (
        <div style={{ marginTop: 24 }}>
          <div><b>Token ID:</b> {agent.tokenId}</div>
          <div><b>Metadata URI:</b> {agent.metadata}</div>
          {avatar && <div><img src={avatar} alt="Agent Avatar" style={{ width: 120, borderRadius: 8, marginTop: 8 }} /></div>}
          <div style={{ marginTop: 16 }}>
            <b>Agent History:</b>
            <ul>
              {history.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </div>
        </div>
      )}
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
    </div>
  );
}
