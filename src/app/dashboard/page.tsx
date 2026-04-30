"use client";

import { useState, useEffect } from "react";
import { UserPreferences } from "@/lib/ogAgent";
import { Recommendation, AgentMemory } from "@/types";
import { Wallet, Settings, Brain, Plus, Database, TrendingUp, ShieldCheck, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { CreateAgentModal } from "@/components/CreateAgentModal";
import { ethers } from 'ethers';
import AgentHeader from '@/components/AgentHeader';
import HeroSection from '@/components/HeroSection';
import RecommendationsTable from '@/components/RecommendationsTable';
import MemoryPanel from '@/components/MemoryPanel';
import ActivityFeed from '@/components/ActivityFeed';
import AgentDashboardWrapper from '@/components/AgentDashboardWrapper';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [agent, setAgent] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommendations" | "memory" | "logs" | "management">("recommendations");
  const [isBusy, setIsBusy] = useState(false);
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [scanFrequency, setScanFrequency] = useState<string>('daily');
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  // Initialize from local storage or wait for creation
  useEffect(() => {
    if (isConnected && address) {
      const saved = localStorage.getItem(`agent-${address}`);
      if (saved) {
        const data = JSON.parse(saved);
        setAgent(data);
      }
    }
  }, [isConnected, address]);

  // autoscan loop when autonomous mode enabled
  useEffect(() => {
    let id: any;
    if (autoMode && agent) {
      const interval = scanFrequency === 'hourly' ? 1000 * 60 * 60 : scanFrequency === 'daily' ? 1000 * 60 * 60 * 24 : 0;
      if (interval > 0) {
        id = setInterval(() => {
          fetch('/api/agents/autoscan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agent.id }) });
          setLastScan(Date.now());
        }, interval);
      }
    }
    return () => { if (id) clearInterval(id); };
  }, [autoMode, scanFrequency, agent]);

  // Auto-run a scan when agent is present but no recommendations yet
  useEffect(() => {
    if (agent && (!recommendations || recommendations.length === 0)) {
      runScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  // Helper: check operator approval status for the connected user
  const checkApproval = async (): Promise<boolean> => {
    try {
      if (!(window as any).ethereum) return false;
      const provider = new ethers.BrowserProvider((window as any).ethereum as any);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();
      const manager = process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS;
      const operator = process.env.NEXT_PUBLIC_SERVER_OPERATOR_ADDRESS || process.env.SERVER_OPERATOR_ADDRESS;
      if (!manager || !operator) return false;
      const abi = ['function isApprovedForAll(address owner, address operator) view returns (bool)'];
      const contract = new ethers.Contract(manager, abi, provider);
      const approved = await contract.isApprovedForAll(userAddr, operator);
      return Boolean(approved);
    } catch (e) {
      console.error('checkApproval error', e);
      return false;
    }
  };

  const approveServerOperator = async () => {
    try {
      if (!(window as any).ethereum) throw new Error('No wallet');
      const provider = new ethers.BrowserProvider((window as any).ethereum as any);
      const signer = await provider.getSigner();
      const manager = process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS;
      const operator = process.env.NEXT_PUBLIC_SERVER_OPERATOR_ADDRESS || process.env.SERVER_OPERATOR_ADDRESS;
      // Debug: surface values so we can see what the client actually has
      // eslint-disable-next-line no-console
      console.debug('approveServerOperator env:', { manager, operator });
      if (!manager || !operator) {
        const missing = [] as string[];
        if (!manager) missing.push('NEXT_PUBLIC_AGENT_MANAGER_ADDRESS');
        if (!operator) missing.push('NEXT_PUBLIC_SERVER_OPERATOR_ADDRESS / SERVER_OPERATOR_ADDRESS');
        alert('Authorize failed: Missing config for ' + missing.join(', ') + "\n\nClient values:\nmanager=" + String(manager) + "\noperator=" + String(operator));
        return;
      }
      const abi = ['function setApprovalForAll(address operator, bool approved)'];
      const contract = new ethers.Contract(manager, abi, signer);
      const tx = await contract.setApprovalForAll(operator, true);
      await tx.wait();
      alert('Server authorized to operate on your agent.');
    } catch (e:any) {
      console.error('approve error', e);
      alert('Approve failed: ' + String(e?.message || e));
    }
  };

  const handleCreateAgent = async (prefs: UserPreferences) => {
    if (!address) return;
    setIsBusy(true);
    try {
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: address, preferences: prefs })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Create failed');

      const tokenId = json.tokenId;
      const memoryRoot = json.memoryRoot;

      const restoredAgent = { id: String(tokenId), preferences: prefs, memory: { agentId: tokenId, preferences: prefs, history: [`Initialized on-chain: ${json.txHash}`] }, status: 'idle' } as any;
      setAgent(restoredAgent as any);
      localStorage.setItem(`agent-${address}`, JSON.stringify(restoredAgent));
      setShowCreateModal(false);
    } catch (e) {
      console.error('Create agent failed', e);
      alert('Failed to create agent: ' + String(e));
    }
    setIsBusy(false);
  };

  const runScan = async () => {
    if (!agent || !address) return;
    setIsBusy(true);
    try {
      const res = await fetch('/api/agents/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: agent.id, owner: address, preferences: agent.preferences })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Scan failed');
      setLastScan(Date.now());
      // detect fallback/mock data
      const anyMock = Array.isArray(json.recommendations) && json.recommendations.some((r:any)=> r.source && String(r.source).startsWith('mock'));
      setUsingFallback(Boolean(anyMock));
      setRecommendations(json.recommendations || []);
      // update memoryRoot if returned
      if (json.memoryRoot) {
        const updated = { ...agent, memory: { ...agent.memory, lastSync: Date.now(), memoryRoot: json.memoryRoot } } as any;
        setAgent(updated);
        localStorage.setItem(`agent-${address}`, JSON.stringify(updated));
      }
      setActiveTab('recommendations');
    } catch (e) {
      console.error('Scan failed', e);
      alert('Scan failed: ' + String(e));
    }
    setIsBusy(false);
  };

  const handleAction = (type: string, rec: any) => {
    if (type === 'view') window.open(rec.url || '#', '_blank');
    if (type === 'contact') alert('Contact info not available in demo');
    if (type === 'updatePrice') {
      // Update local recommendations state with the new purchase price
      const updated = (recommendations||[]).map(r => r.id === rec.id ? { ...r, purchasePrice: rec.purchasePrice } : r);
      setRecommendations(updated as any);
    }
  };

  const runManagement = async () => {
    if (!agent) return;
    setIsBusy(true);
    try {
      const res = await fetch('/api/agents/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: agent.id, owner: address, memory: agent.memory })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Manage failed');

      localStorage.setItem(`agent-${address}`, JSON.stringify({ id: agent.id, preferences: agent.preferences, memory: json.memory || agent.memory }));
    } catch (e) {
      console.error('Manage failed', e);
      alert('Manage failed: ' + String(e));
    }
    setIsBusy(false);
    setActiveTab("memory");
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
          <Wallet size={48} className="text-muted" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-outfit font-black tracking-tight">Connect Your Wallet</h1>
          <p className="text-muted max-w-md mx-auto">Access your autonomous Section 8 agents and monitor your on-chain portfolio.</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full premium-gradient flex items-center justify-center shadow-2xl">
          <Brain size={48} className="text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-outfit font-black tracking-tight">No Agent Detected</h1>
          <p className="text-muted max-w-md mx-auto">You haven't initialized an autonomous agent yet. Let's build your personalized AI manager on 0G Labs.</p>
        </div>
        {/* iNFT Agent Onboarding UI */}
        <AgentDashboardWrapper />
      </div>
    );
  }

  const shortAddress = address ? `${address.slice(0,6)}...${address.slice(-4)}` : '0x...';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <AgentHeader agent={agent} lastScan={lastScan} onChangeZip={(z:any)=>{ const updated = {...agent, preferences:{...agent.preferences, zipCode:z}}; setAgent(updated); localStorage.setItem(`agent-${address}`, JSON.stringify(updated)); }} onRunScan={runScan} scanFrequency={scanFrequency} setScanFrequency={setScanFrequency} autoMode={autoMode} setAutoMode={setAutoMode} />

      {usingFallback && (
        <div className="w-full rounded-md border border-yellow-400 bg-yellow-800/20 p-3 text-sm text-yellow-200 flex items-center gap-3">
          <strong className="uppercase text-xs tracking-wide">Fallback Data</strong>
          <span>Live RentCast listings are unavailable — showing enriched mock estimates for demo purposes.</span>
        </div>
      )}

      {/* Approval CTA */}
      <div className="flex items-center gap-4">
        {process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS && process.env.NEXT_PUBLIC_SERVER_OPERATOR_ADDRESS ? (
          <button onClick={async () => {
            const approved = await checkApproval();
            if (approved) return alert('Server already authorized');
            await approveServerOperator();
          }} className="text-xs font-bold uppercase px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            Authorize Server (One-click)
          </button>
        ) : (
          <button onClick={() => alert('Authorize not configured. Set NEXT_PUBLIC_AGENT_MANAGER_ADDRESS and NEXT_PUBLIC_SERVER_OPERATOR_ADDRESS in your .env and restart the dev server.')}
            className="text-xs font-bold uppercase px-4 py-2 rounded-lg bg-white/5 border border-white/10 opacity-60 cursor-not-allowed"
            disabled
          >
            Authorize Server (missing config)
          </button>
        )}
        <div className="text-muted text-sm">One-time wallet approval so your agent runs autonomously. You keep ownership.</div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Target ZIP", value: agent.preferences.zipCode, icon: <Database size={16} /> },
          { label: "Matches Found", value: recommendations.length.toString(), icon: <TrendingUp size={16} /> },
          { label: "On-Chain Logs", value: agent.memory.history.length.toString(), icon: <ShieldCheck size={16} /> },
          { label: "Reliability", value: "99.9%", icon: <CheckCircle2 size={16} /> }
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 flex flex-col gap-1 hover:border-primary/50 transition-colors cursor-default">
            <div className="flex items-center gap-2 text-muted text-[10px] font-black uppercase tracking-[0.2em]">
              {stat.icon}
              {stat.label}
            </div>
            <div className="text-2xl font-outfit font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-6">
        <HeroSection recommendations={recommendations} />
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-secondary rounded-2xl w-fit border border-white/5">
          {(["recommendations", "memory", "logs", "management"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                activeTab === tab 
                  ? "bg-white dark:bg-zinc-800 text-foreground shadow-xl border border-white/10" 
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "recommendations" && (
            <RecommendationsTable recommendations={recommendations} onAction={handleAction} />
          )}

          {activeTab === "memory" && (
            <MemoryPanel agent={agent} />
          )}

          {activeTab === "management" && (
            <div className="glass-card p-6">
              <h4 className="font-bold">Agent Controls</h4>
              <div className="mt-4 flex gap-3">
                <button onClick={() => setAutoMode(!autoMode)} className={`px-4 py-2 rounded-xl ${autoMode ? 'bg-green-600 text-white' : 'bg-white/5'}`}>{autoMode ? 'Disable Autonomous' : 'Enable Autonomous'}</button>
                <button onClick={runScan} className="btn-primary">Run Manual Scan</button>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <ActivityFeed agent={agent} />
          )}
        </div>
      </div>
    </div>
  );
}
