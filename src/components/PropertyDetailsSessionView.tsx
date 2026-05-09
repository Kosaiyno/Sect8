"use client";

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
      error={error || session?.error || null}
    />
  );
}