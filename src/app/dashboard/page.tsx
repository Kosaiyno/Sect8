
"use client";

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

function toFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getMinRoiPercent(value: unknown) {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric <= 0) {
    return null;
  }

  return numeric <= 1 ? numeric * 100 : numeric;
}

function matchesBuyBox(recommendation: Recommendation, buyBox: InvestorBuyBox) {
  const maxPrice = toFiniteNumber(buyBox.maxPrice);
  const minCashflow = toFiniteNumber(buyBox.minCashflow);
  const minCapRate = toFiniteNumber(buyBox.minCapRate);
  const minRoi = getMinRoiPercent(buyBox.minRoi);
  const monthlyCashflow = recommendation.cashflow !== null && recommendation.cashflow !== undefined
    ? Number(recommendation.cashflow || 0)
    : Math.round(Number(recommendation.netOperating || 0) / 12);

  return Number(recommendation.bedrooms || 0) >= Number(buyBox.minBedrooms || 0)
    && (maxPrice === null || maxPrice <= 0 || Number(recommendation.purchasePrice || 0) <= maxPrice)
    && (minCashflow === null || minCashflow <= 0 || monthlyCashflow >= minCashflow)
    && (minCapRate === null || minCapRate <= 0 || Number(recommendation.capRate || 0) >= minCapRate)
    && (minRoi === null || Number(recommendation.roi || 0) >= minRoi);
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [zipOptions, setZipOptions] = useState<Array<{ zipCode: string; city: string; state: string; label: string }>>([]);
  const [agent, setAgent] = useState<DashboardAgent | null>(null);
  const [checked, setChecked] = useState(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedZip, setSelectedZip] = useState('');
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanError, setHasScanError] = useState(false);
  const [buyBoxDraft, setBuyBoxDraft] = useState<InvestorBuyBox>(DEFAULT_BUY_BOX);
  const [buyBoxStatus, setBuyBoxStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const hydratedRef = useRef(false);
  const initialBoardLoadTriggeredRef = useRef(false);
  const visibleRecommendations = recommendations
    .filter((recommendation) => !isExcludedListingLike(recommendation));

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
      void runScan({ zipOverride: String(nextPreferences.zipCode || selectedZip) });
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
      scanNotice,
      usingFallback,
    };

    sessionStorage.setItem(getDashboardStateKey(address), JSON.stringify(nextState));
  }, [address, recommendations, scanNotice, selectedZip, usingFallback]);

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
        ...buyBoxDraft,
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
        setScanNotice(`No homes matched your current buy box in ZIP ${normalizedZip}. Try raising max price, lowering cash-flow/cap-rate targets, or changing strategy.`);
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

  return (
    <div className="space-y-5 animate-fade-in">
      <AgentHeader
        agent={agent}
        zipOptions={zipOptions}
        selectedZip={selectedZip}
        onChangeSelectedZip={(zip) => {
          setSelectedZip(zip);
          if (zip) {
            void runScan({ zipOverride: zip });
          }
        }}
        onRunZipSearch={runScan}
        isWorking={isScanning}
        hasError={hasScanError}
      />


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
