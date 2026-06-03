
"use client";

import { filterExcludedListings } from '@/lib/listingExclusionClient';

import { useEffect, useRef, useState } from "react";
import { Recommendation } from "@/types";
import { Wallet, Brain, Database, TrendingUp, ShieldCheck, CheckCircle2, SlidersHorizontal, Save } from "lucide-react";
import { useAccount } from "wagmi";
import AgentHeader from '@/components/AgentHeader';
import HeroSection from '@/components/HeroSection';
import RecommendationsTable from '@/components/RecommendationsTable';
import AgentDashboardWrapper from '@/components/AgentDashboardWrapper';

type DashboardAgent = {
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
    lastSync?: number;
  };
  status: string;
};

type DashboardViewState = {
  recommendations: Recommendation[];
  selectedZip: string;
  searchMode: 'zip' | 'filter';
  filterSearch: {
    city: string;
    state: string;
    minBedrooms: string;
    minBathrooms: string;
    maxPrice: string;
    propertyTypes: string[];
  };
  scanNotice: string | null;
  usingFallback: boolean;
};

type InvestorBuyBox = {
  primaryStrategy: string;
  zipCode: string;
  minBedrooms: number;
  maxPrice: number;
  minRoi: number;
  minCashflow: number;
  minCapRate: number;
  riskTolerance: string;
  rehabTolerance: string;
};

const DEFAULT_BUY_BOX: InvestorBuyBox = {
  primaryStrategy: 'section8',
  zipCode: '48201',
  minBedrooms: 3,
  maxPrice: 150000,
  minRoi: 0.1,
  minCashflow: 500,
  minCapRate: 8,
  riskTolerance: 'medium',
  rehabTolerance: 'light',
};

const STRATEGY_OPTIONS = [
  { value: 'section8', label: 'Section 8' },
  { value: 'longTermRental', label: 'Long-term rental' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'fixAndFlip', label: 'Fix and flip' },
  { value: 'smallMultifamily', label: 'Small multifamily' },
  { value: 'cashflowBuyHold', label: 'Cash-flow buy and hold' },
];

function getAgentStorageKey(address: string) {
  return `agent-${address.toLowerCase()}`;
}

function getDashboardStateKey(address: string) {
  return `dashboard-state-${address.toLowerCase()}`;
}

function hasOnChainActivation(agent: DashboardAgent | null | undefined) {
  return Boolean(agent?.onChainTokenId && agent?.contractAddress && agent?.activationTxHash);
}

function isExcludedListingLike(item: { address?: string | null; id?: string | null; propertyType?: string | null }) {
  const values = [item.propertyType, item.address, item.id]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  return values.some((value) => value.includes(' land')
    || value.startsWith('land ')
    || value.includes(' lot ')
    || /\blot\s+#?\d+/i.test(value)
    || /\blots\s+#?\d+/i.test(value)
    || value.includes('vacant lot')
    || value.includes('vacant land'));
}

function normalizeBuyBox(preferences: Record<string, unknown> | null | undefined): InvestorBuyBox {
  const prefs = preferences || {};
  return {
    primaryStrategy: String(prefs.primaryStrategy || DEFAULT_BUY_BOX.primaryStrategy),
    zipCode: String(prefs.zipCode || DEFAULT_BUY_BOX.zipCode),
    minBedrooms: Number(prefs.minBedrooms || DEFAULT_BUY_BOX.minBedrooms),
    maxPrice: Number(prefs.maxPrice || DEFAULT_BUY_BOX.maxPrice),
    minRoi: Number(prefs.minRoi || DEFAULT_BUY_BOX.minRoi),
    minCashflow: Number(prefs.minCashflow || DEFAULT_BUY_BOX.minCashflow),
    minCapRate: Number(prefs.minCapRate || DEFAULT_BUY_BOX.minCapRate),
    riskTolerance: String(prefs.riskTolerance || DEFAULT_BUY_BOX.riskTolerance),
    rehabTolerance: String(prefs.rehabTolerance || DEFAULT_BUY_BOX.rehabTolerance),
  };
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [zipOptions, setZipOptions] = useState<Array<{ zipCode: string; city: string; state: string; label: string }>>([]);
  const [agent, setAgent] = useState<DashboardAgent | null>(null);
  const [checked, setChecked] = useState(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchMode, setSearchMode] = useState<'zip' | 'filter'>('zip');
  const [selectedZip, setSelectedZip] = useState('');
  const [filterSearch, setFilterSearch] = useState({
    city: '',
    state: '',
    minBedrooms: 'any',
    minBathrooms: 'any',
    maxPrice: '',
    propertyTypes: [] as string[],
  });
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanError, setHasScanError] = useState(false);
  const [buyBoxDraft, setBuyBoxDraft] = useState<InvestorBuyBox>(DEFAULT_BUY_BOX);
  const [buyBoxStatus, setBuyBoxStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const hydratedRef = useRef(false);
  const initialBoardLoadTriggeredRef = useRef(false);
  const visibleRecommendations = recommendations.filter((recommendation) => !isExcludedListingLike(recommendation));

  useEffect(() => {
    if (agent?.preferences) {
      setBuyBoxDraft(normalizeBuyBox(agent.preferences));
    }
  }, [agent?.preferences]);

  const handleActivated = (nextAgent: DashboardAgent) => {
    const activeAgent = { ...nextAgent, status: 'active' };
    setAgent(activeAgent);
    setChecked(true);
    if (address) {
      localStorage.setItem(getAgentStorageKey(address), JSON.stringify(activeAgent));
    }
  };

  const saveBuyBox = async () => {
    if (!agent || !address) {
      return;
    }

    const nextPreferences = {
      ...agent.preferences,
      ...buyBoxDraft,
    };
    const nextAgent = {
      ...agent,
      preferences: nextPreferences,
      memory: {
        ...agent.memory,
        preferences: nextPreferences,
        history: [
          ...(agent.memory?.history || []),
          `Investor buy box updated at ${new Date().toISOString()}`,
        ],
      },
    } as DashboardAgent;

    setBuyBoxStatus('saving');
    setAgent(nextAgent);
    setSelectedZip(String(nextPreferences.zipCode || selectedZip));
    localStorage.setItem(getAgentStorageKey(address), JSON.stringify(nextAgent));

    try {
      const response = await fetch('/api/agents/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: address,
          recordRoot: nextAgent.recordRoot || null,
          memory: {
            ...nextAgent.memory,
            owner: address,
            preferences: nextPreferences,
          },
        }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to save buy box');
      }

      const syncedAgent = {
        ...nextAgent,
        recordRoot: json.recordRoot || nextAgent.recordRoot || null,
        memory: {
          ...nextAgent.memory,
          memoryRoot: json.memoryRoot || nextAgent.memory.memoryRoot || null,
        },
      } as DashboardAgent;
      setAgent(syncedAgent);
      localStorage.setItem(getAgentStorageKey(address), JSON.stringify(syncedAgent));
      setBuyBoxStatus('saved');
      window.setTimeout(() => setBuyBoxStatus('idle'), 2200);
    } catch (error) {
      console.error('Failed to save buy box', error);
      setBuyBoxStatus('error');
    }
  };

  useEffect(() => {
    if (!address) {
      hydratedRef.current = false;
      initialBoardLoadTriggeredRef.current = false;
      return;
    }

    if (hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;

    const persistedAgent = localStorage.getItem(getAgentStorageKey(address));
    if (persistedAgent) {
      try {
        const parsed = JSON.parse(persistedAgent) as DashboardAgent;
        if (hasOnChainActivation(parsed)) {
          setAgent({ ...parsed, status: parsed.status === 'scanning' ? 'active' : (parsed.status || 'active') });
          setChecked(true);
        } else {
          localStorage.removeItem(getAgentStorageKey(address));
        }
      } catch {
        localStorage.removeItem(getAgentStorageKey(address));
      }
    }

    const persistedState = sessionStorage.getItem(getDashboardStateKey(address));
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState) as DashboardViewState;
        setRecommendations(Array.isArray(parsed.recommendations) ? parsed.recommendations : []);
        setSelectedZip(parsed.selectedZip || '');
        setSearchMode(parsed.searchMode || 'zip');
        setFilterSearch(parsed.filterSearch || {
          city: '',
          state: '',
          minBedrooms: 'any',
          minBathrooms: 'any',
          maxPrice: '',
          propertyTypes: [],
        });
        setScanNotice(parsed.scanNotice || null);
        setUsingFallback(Boolean(parsed.usingFallback));
      } catch {
        sessionStorage.removeItem(getDashboardStateKey(address));
      }
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      return;
    }

    const nextState: DashboardViewState = {
      recommendations,
      selectedZip,
      searchMode,
      filterSearch,
      scanNotice,
      usingFallback,
    };

    sessionStorage.setItem(getDashboardStateKey(address), JSON.stringify(nextState));
  }, [address, filterSearch, recommendations, scanNotice, searchMode, selectedZip, usingFallback]);

  useEffect(() => {
    async function loadZipOptions() {
      try {
        const ownerQuery = address ? `?owner=${encodeURIComponent(address)}` : '';
        const response = await fetch(`/api/agents/search${ownerQuery}`);
        const json = await response.json();
        if (json.success && Array.isArray(json.zipOptions)) {
          const allowed = new Set(['48201','48202','48204','48206','44105','44110','44120','38109','38127','38128']);
          const filtered = json.zipOptions.filter((option: { zipCode: string }) => allowed.has(option.zipCode));
          setZipOptions(filtered);
          setSelectedZip((current) => {
            if (current && filtered.some((option: { zipCode: string }) => option.zipCode === current)) {
              return current;
            }

            return filtered[0]?.zipCode || current || '';
          });
        }
      } catch {
        setZipOptions([]);
      }
    }

    async function restoreAgent() {
      if (!address) {
        setAgent(null);
        setChecked(true);
        return;
      }
      try {
        const restoreRes = await fetch('/api/agents/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner: address,
            recordRoot: (() => {
              try {
                const persisted = localStorage.getItem(getAgentStorageKey(address));
                return persisted ? JSON.parse(persisted).recordRoot || null : null;
              } catch {
                return null;
              }
            })(),
          }),
        });
        const restoreJson = await restoreRes.json();
        if (restoreJson.success && restoreJson.agent) {
          const nextAgent = {
            ...restoreJson.agent,
            status: restoreJson.agent.status === 'scanning' ? 'scanning' : 'active',
          } as DashboardAgent;
          const restoredRecommendations = Array.isArray(restoreJson.recommendations) ? restoreJson.recommendations : [];

          setAgent(nextAgent);
          setRecommendations((current) => restoredRecommendations.length ? restoredRecommendations : current);
          setUsingFallback((current) => restoredRecommendations.length
            ? restoredRecommendations.some((recommendation: { source?: string }) => String(recommendation.source || '').startsWith('mock'))
            : current);
          setScanNotice((current) => restoredRecommendations.length ? null : current);
          setSelectedZip((current) => current || restoreJson.record?.latestListingsZip || String(nextAgent.preferences?.zipCode || ''));
          localStorage.setItem(getAgentStorageKey(address), JSON.stringify(nextAgent));
        } else {
          setAgent(null);
          setRecommendations((current) => current);
        }
      } catch {
        setAgent((current) => current);
      }
      setChecked(true);
    }

    loadZipOptions();
    restoreAgent();
  }, [address]);

  const runScan = async (options?: { zipOverride?: string; silent?: boolean }) => {
    if (!agent || !address) return;
    const normalizedZip = (options?.zipOverride || selectedZip).trim();
    if (!normalizedZip) {
      if (!options?.silent) {
        setScanNotice('Select a ZIP market before running a search.');
      }
      return;
    }

    const nextAgent = {
      ...agent,
      status: 'scanning',
      preferences: {
        ...agent.preferences,
        zipCode: normalizedZip,
      },
    } as DashboardAgent;

    setAgent(nextAgent);
    setSelectedZip(normalizedZip);
    localStorage.setItem(getAgentStorageKey(address), JSON.stringify(nextAgent));

    try {
      setIsScanning(true);
      setUsingFallback(false);
      if (!options?.silent) {
        setScanNotice(null);
      }
      const res = await fetch('/api/agents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipCode: normalizedZip,
          owner: address,
          recordRoot: agent ? agent.recordRoot || null : null,
          preferences: nextAgent.preferences,
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Scan failed');
      setRecommendations(json.recommendations || []);
      const activeAgent = {
        ...nextAgent,
        status: 'active',
      } as DashboardAgent;
      setAgent(activeAgent);
      localStorage.setItem(getAgentStorageKey(address), JSON.stringify(activeAgent));
      if (!json.recommendations?.length) {
        setScanNotice(`No saved for-sale homes are cached for ZIP ${normalizedZip}. Seed that market once, then future ZIP searches will stay local.`);
      } else {
        setScanNotice(null);
      }
    } catch (error) {
      console.error('Scan failed', error);
      setAgent((current) => current ? { ...current, status: 'active' } : current);
      setScanNotice(`Failed`);
      setHasScanError(true);
    } finally {
      setIsScanning(false);
    }
  };

  const runFilterSearch = async () => {
    try {
      setIsScanning(true);
      setHasScanError(false);
      setAgent((current) => current ? { ...current, status: 'scanning' } : current);
      setUsingFallback(false);
      setScanNotice(null);
      const res = await fetch('/api/agents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: filterSearch,
          owner: address,
          recordRoot: agent ? agent.recordRoot || null : null,
          preferences: agent?.preferences || buyBoxDraft,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Filter search failed');
      }

      // Filter out land/lot/vacant listings from recommendations
      setRecommendations(Array.isArray(json.recommendations) ? filterExcludedListings(json.recommendations) : []);
      if (!json.recommendations?.length) {
        setScanNotice('No cached sale listings match the selected filters. Change a filter or run a ZIP search to expand the available markets.');
      } else {
        setScanNotice(null);
      }
    } catch (error) {
      console.error('Filter search failed', error);
      setScanNotice(`Failed`);
      setHasScanError(true);
    } finally {
      setIsScanning(false);
      setAgent((current) => current ? { ...current, status: 'active' } : current);
    }
  };

  const updateFilterSearch = (field: keyof typeof filterSearch, value: string | string[]) => {
    setFilterSearch((current) => ({ ...current, [field]: value }));
  };


  useEffect(() => {
    if (!checked || !agent || isScanning || recommendations.length > 0 || !selectedZip || initialBoardLoadTriggeredRef.current) {
      return;
    }

    initialBoardLoadTriggeredRef.current = true;
    void runScan({ zipOverride: selectedZip, silent: true });
  }, [agent, checked, isScanning, recommendations.length, selectedZip]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
          <Wallet size={48} className="text-muted" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-outfit font-black tracking-tight">Connect Your Wallet</h1>
          <p className="text-muted max-w-md mx-auto">Connect your wallet so I can load your on-chain Sect8 agent and restore its 0G-backed memory.</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !checked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
          <Wallet size={48} className="text-muted" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-outfit font-black tracking-tight">Connect Your Wallet</h1>
          <p className="text-muted max-w-md mx-auto">Connect your wallet so I can load your on-chain Sect8 agent and restore its 0G-backed memory.</p>
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
          <p className="text-muted max-w-md mx-auto">You have not activated me yet. Connect your wallet and create a Sect8 agent backed by 0G compute, 0G storage, and on-chain agent state.</p>
        </div>
        <AgentDashboardWrapper onActivated={handleActivated} />
      </div>
    );
  }

  const togglePropertyType = (propertyType: string) => {
    setFilterSearch((current) => ({
      ...current,
      propertyTypes: current.propertyTypes.includes(propertyType)
        ? current.propertyTypes.filter((value) => value !== propertyType)
        : [...current.propertyTypes, propertyType],
    }));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <AgentHeader
        agent={agent}
        searchMode={searchMode}
        onChangeSearchMode={setSearchMode}
        zipOptions={zipOptions}
        selectedZip={selectedZip}
        onChangeSelectedZip={setSelectedZip}
        onRunZipSearch={runScan}
        filterSearch={filterSearch}
        onChangeFilterSearch={updateFilterSearch}
        onTogglePropertyType={togglePropertyType}
        onRunFilterSearch={runFilterSearch}
        isWorking={isScanning}
        hasError={hasScanError}
      />

      <section className="fintech-card p-4 sm:p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">
              <SlidersHorizontal size={14} />
              Investor Buy Box
            </div>
            <h2 className="mt-3 font-outfit text-2xl font-black tracking-[-0.04em] text-[#0f1629]">Edit how your agent evaluates deals</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#64748b]">
              These criteria live with your agent memory and can be changed anytime. Property pages still evaluate every home across multiple strategies, but scans and agent memory use this buy box as your operating focus.
            </p>
          </div>
          <button
            onClick={saveBuyBox}
            disabled={buyBoxStatus === 'saving'}
            className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />
            {buyBoxStatus === 'saving' ? 'Saving' : buyBoxStatus === 'saved' ? 'Saved' : 'Save Buy Box'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Primary Strategy</label>
            <select
              value={buyBoxDraft.primaryStrategy}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, primaryStrategy: event.target.value }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden color-scheme-light text-[#0f1629]"
            >
              {STRATEGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Target ZIP</label>
            <input
              value={buyBoxDraft.zipCode}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, zipCode: event.target.value.replace(/\D/g, '').slice(0, 5) }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Min Bedrooms</label>
            <input
              type="number"
              min="0"
              value={buyBoxDraft.minBedrooms}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, minBedrooms: Number(event.target.value || 0) }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Max Price</label>
            <input
              type="number"
              min="0"
              value={buyBoxDraft.maxPrice}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, maxPrice: Number(event.target.value || 0) }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Minimum ROI (%)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={Number(buyBoxDraft.minRoi * 100).toFixed(1)}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, minRoi: Number(event.target.value || 0) / 100 }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Min Cashflow</label>
            <input
              type="number"
              value={buyBoxDraft.minCashflow}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, minCashflow: Number(event.target.value || 0) }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Min Cap Rate (%)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={buyBoxDraft.minCapRate}
              onChange={(event) => setBuyBoxDraft((current) => ({ ...current, minCapRate: Number(event.target.value || 0) }))}
              className="dashboard-field w-full rounded-2xl px-5 py-3.5 text-sm font-bold outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Risk</label>
              <select
                value={buyBoxDraft.riskTolerance}
                onChange={(event) => setBuyBoxDraft((current) => ({ ...current, riskTolerance: event.target.value }))}
                className="dashboard-field w-full rounded-2xl px-4 py-3.5 text-sm font-bold outline-hidden color-scheme-light text-[#0f1629]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#64748b]/60">Rehab</label>
              <select
                value={buyBoxDraft.rehabTolerance}
                onChange={(event) => setBuyBoxDraft((current) => ({ ...current, rehabTolerance: event.target.value }))}
                className="dashboard-field w-full rounded-2xl px-4 py-3.5 text-sm font-bold outline-hidden color-scheme-light text-[#0f1629]"
              >
                <option value="none">None</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
          </div>
        </div>

        {buyBoxStatus === 'error' ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Buy box saved locally, but syncing to 0G memory failed. Try saving again.
          </div>
        ) : null}
      </section>

      {usingFallback && (
        <div className="rounded-[28px] border border-amber-300/20 bg-amber-400/05 p-4 text-sm text-amber-900 shadow-sm backdrop-blur-md sm:rounded-[32px] sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Fallback Data</div>
          <div className="mt-2.5 leading-7 font-medium">I could not reach live RentCast listings, so I temporarily switched to enriched mock estimates to keep the board usable.</div>
        </div>
      )}

      {scanNotice && !usingFallback && (
        <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/05 p-4 text-sm text-cyan-900 shadow-sm backdrop-blur-md sm:rounded-[32px] sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600">Scan Notice</div>
          <div className="mt-2.5 leading-7 font-medium">{scanNotice}</div>
        </div>
      )}

      {visibleRecommendations.length > 0 && visibleRecommendations.some((recommendation) => recommendation.fmrSource !== 'hud') && (
        <div className="rounded-[28px] border border-amber-300/20 bg-amber-400/05 p-4 text-sm text-amber-900 shadow-sm backdrop-blur-md sm:rounded-[32px] sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">HUD Verification</div>
          <div className="mt-2.5 leading-7 font-medium">Some listings have real sale prices but no verified HUD benchmark. For those rows, I hide rent benchmark, monthly NOI, and cap rate instead of inventing estimates.</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: "Target ZIP", value: String(selectedZip || agent.preferences?.zipCode || "N/A"), icon: <Database size={16} /> },
          { label: "Matches Found", value: visibleRecommendations.length.toString(), icon: <TrendingUp size={16} /> },
          { label: "Analyses", value: String(agent.memory?.recentAnalyses?.length || 0), icon: <ShieldCheck size={16} /> },
          { label: "Status", value: "Verified", icon: <CheckCircle2 size={16} /> }
        ].map((stat, i) => (
          <div key={i} className="fintech-card p-3 transition-all hover-lift sm:p-4">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#b8942f]">
              {stat.icon}
              {stat.label}
            </div>
            <div className="mt-2 font-outfit text-base font-black tracking-[-0.03em] text-[#0f1629] sm:text-lg md:text-xl">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <HeroSection recommendations={visibleRecommendations} isScanning={isScanning} targetZip={selectedZip || String(agent.preferences?.zipCode || '')} />

        <div className="min-h-[400px]">
          <RecommendationsTable recommendations={visibleRecommendations} />
        </div>
      </div>
    </div>
  );
}
