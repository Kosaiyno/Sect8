"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import PropertyDetailsLoadingState, { type PropertyLoadingStep } from '@/components/PropertyDetailsLoadingState';
import PropertyDetailsView from '@/components/PropertyDetailsView';
import type { PropertyAnalysisBundle } from '@/lib/propertyAnalysis';
import type { PropertyDetailBundle } from '@/lib/propertyDetails';
import type { ComputeProof } from '@/types';

type SessionPayload = {
  id: string;
  address: string | null;
  status: 'running' | 'completed' | 'failed';
  phase: 'load-bundle' | 'run-analysis' | 'finalize' | 'completed';
  progress: number;
  steps: PropertyLoadingStep[];
  terminalLines: string[];
  error: string | null;
  analysisProvider: '0g-compute' | 'fallback' | null;
  computeProof: ComputeProof | null;
  analysisStorageRoot: string | null;
  sessionRoot?: string | null;
  result: null | {
    bundle: PropertyDetailBundle;
    analysisResult: PropertyAnalysisBundle;
  };
};

export default function PropertyDetailsSessionView({
  listingId,
  listingsRoot,
}: {
  listingId: string;
  listingsRoot?: string | null;
}) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const resolvedError = error || session?.error || null;
  const isExcludedParcel = String(resolvedError || '').toLowerCase().includes('vacant land or a non-house parcel');

  useEffect(() => {
    let cancelled = false;

    async function startSession() {
      try {
        const response = await fetch(`/api/properties/${encodeURIComponent(listingId)}/analysis-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingsRoot: listingsRoot || null }),
          cache: 'no-store',
        });
        const json = await response.json();
        if (!response.ok || !json.success || !json.session) {
          throw new Error(json.error || 'Failed to initialize the property analysis session.');
        }

        if (!cancelled) {
          setSession(json.session);
        }
      } catch (sessionError) {
        if (!cancelled) {
          setError(String(sessionError));
        }
      }
    }

    void startSession();

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current);
      }
    };
  }, [listingId, listingsRoot]);

  useEffect(() => {
    if (!session || session.status !== 'running' || !session.sessionRoot) {
      return;
    }

    let cancelled = false;
    const currentSessionId = session.id;
    const currentSessionRoot = session.sessionRoot;

    async function pollSession() {
      try {
        const response = await fetch(
          `/api/properties/${encodeURIComponent(listingId)}/analysis-session?sessionId=${encodeURIComponent(currentSessionId)}&sessionRoot=${encodeURIComponent(currentSessionRoot || '')}`,
          { cache: 'no-store' },
        );
        const json = await response.json();
        if (!response.ok || !json.success || !json.session) {
          throw new Error(json.error || 'Failed to advance the property analysis session.');
        }

        if (!cancelled) {
          setSession(json.session);
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(String(pollError));
        }
      }
    }

    pollingRef.current = window.setTimeout(() => {
      void pollSession();
    }, 150);

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current);
      }
    };
  }, [listingId, session]);

  if (session?.status === 'completed' && session.result) {
    return <PropertyDetailsView bundle={session.result.bundle} analysisResult={session.result.analysisResult} />;
  }

  if (isExcludedParcel) {
    return (
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-10 md:px-6">
        <div className="dashboard-panel rounded-[32px] p-8 md:p-10">
          <div className="inline-flex items-center rounded-full border border-[rgba(184,148,47,0.2)] bg-[rgba(184,148,47,0.08)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#8c6e1a]">
            Property excluded
          </div>
          <h1 className="mt-4 font-outfit text-3xl font-black tracking-[-0.04em] text-[#0f1629] md:text-4xl">
            This address is not eligible for Agent Analysis.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#475569] md:text-base">
            ATTOM classified this parcel as vacant land or a non-house parcel, so Sect8 stopped the house-analysis flow instead of generating a misleading memo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary text-sm">
              Back to dashboard
            </Link>
            <Link href="/market" className="btn-secondary text-sm">
              Browse market
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PropertyDetailsLoadingState
      address={session?.address || null}
      title="Agent is analyzing this property."
      description="The agent is pulling the listing context, checking property records, and building the underwriting memo in real time."
      statusLabel={error ? 'Failed' : session?.status === 'running' ? 'Analyzing' : 'Starting'}
      progress={session?.progress ?? 12}
      steps={session?.steps || [
        {
          key: 'load-bundle',
          title: 'Collecting property context',
          detail: 'Reading the saved listing, ownership records, and local market context for this address.',
          status: 'active',
        },
        {
          key: 'run-analysis',
          title: 'Scoring the investment',
          detail: 'Running the Sect8 analysis pipeline and scoring the property against voucher-driven returns.',
          status: 'pending',
        },
        {
          key: 'finalize',
          title: 'Publishing the memo',
          detail: 'Saving the analysis and opening the final investment memo.',
          status: 'pending',
        },
      ]}
      terminalLines={session?.terminalLines || [
        'Agent session opened.',
        'Collecting the first property signals...',
      ]}
      analysisProvider={session?.analysisProvider || null}
      computeProof={session?.computeProof || null}
      analysisStorageRoot={session?.analysisStorageRoot || null}
      error={resolvedError}
    />
  );
}