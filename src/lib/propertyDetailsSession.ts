import 'server-only';

import crypto from 'node:crypto';
import { read0gJson, write0gJson } from '@/lib/0gPersistence';
import { getOrCreatePropertyAnalysis, type PropertyAnalysisBundle } from '@/lib/propertyAnalysis';
import { getPropertyDetailBundle, getPropertyListingPreview, type PropertyDetailBundle } from '@/lib/propertyDetails';
import type { PropertyLoadingStep } from '@/components/PropertyDetailsLoadingState';

type SessionStatus = 'running' | 'completed' | 'failed';
type SessionPhase = 'load-bundle' | 'run-analysis' | 'finalize' | 'completed';

type PropertyDetailsSession = {
  id: string;
  listingId: string;
  listingsRoot?: string | null;
  address: string | null;
  status: SessionStatus;
  phase: SessionPhase;
  progress: number;
  createdAt: number;
  updatedAt: number;
  steps: PropertyLoadingStep[];
  terminalLines: string[];
  error: string | null;
  bundle: PropertyDetailBundle | null;
  analysisResult: PropertyAnalysisBundle | null;
};

export type PropertyDetailsSessionPublic = Omit<PropertyDetailsSession, 'bundle' | 'analysisResult'> & {
  sessionRoot?: string | null;
  result: null | {
    bundle: PropertyDetailBundle;
    analysisResult: PropertyAnalysisBundle;
  };
};

function normalizeListingId(listingId: string) {
  let normalized = listingId;

  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  return normalized;
}

function appendTerminalLine(lines: string[], message: string) {
  return [...lines, message].slice(-8);
}

function buildInitialSteps(): PropertyLoadingStep[] {
  return [
    {
      key: 'load-bundle',
      title: 'Loading property data',
      detail: 'Pulling the saved listing and supporting property records for this address.',
      status: 'active',
    },
    {
      key: 'run-analysis',
      title: 'Running agent analysis',
      detail: 'Generating the property analysis on the 0G-backed pipeline.',
      status: 'pending',
    },
    {
      key: 'finalize',
      title: 'Rendering the analysis',
      detail: 'Finishing the property page so the full analysis can open.',
      status: 'pending',
    },
  ];
}

function updateStepStatuses(steps: PropertyLoadingStep[], activeKey: SessionPhase, failed = false) {
  return steps.map((step) => {
    if (failed && step.key === activeKey) {
      return { ...step, status: 'failed' as const };
    }
    if (step.key === activeKey) {
      return { ...step, status: 'active' as const };
    }
    if (step.key === 'load-bundle' && (activeKey === 'run-analysis' || activeKey === 'finalize' || activeKey === 'completed')) {
      return { ...step, status: 'completed' as const };
    }
    if (step.key === 'run-analysis' && (activeKey === 'finalize' || activeKey === 'completed')) {
      return { ...step, status: 'completed' as const };
    }
    if (step.key === 'finalize' && activeKey === 'completed') {
      return { ...step, status: 'completed' as const };
    }
    return { ...step, status: 'pending' as const };
  });
}

function toPublicSession(session: PropertyDetailsSession, sessionRoot?: string | null): PropertyDetailsSessionPublic {
  return {
    ...session,
    sessionRoot: sessionRoot || null,
    result: session.status === 'completed' && session.bundle && session.analysisResult
      ? { bundle: session.bundle, analysisResult: session.analysisResult }
      : null,
  };
}

async function persistSession(session: PropertyDetailsSession) {
  const sessionRoot = await write0gJson({
    type: 'property-detail-session',
    version: 1,
    ...session,
  });

  return toPublicSession(session, sessionRoot);
}

async function readSession(sessionRoot?: string | null) {
  const snapshot = await read0gJson<PropertyDetailsSession & { type?: string }>(sessionRoot);
  if (!snapshot || snapshot.type !== 'property-detail-session') {
    return null;
  }

  return snapshot;
}

export async function createPropertyDetailsSession(listingId: string, listingsRoot?: string | null) {
  const normalizedListingId = normalizeListingId(listingId);
  const preview = await getPropertyListingPreview(normalizedListingId, listingsRoot);
  if (!preview) {
    return null;
  }

  const session: PropertyDetailsSession = {
    id: crypto.randomUUID(),
    listingId: normalizedListingId,
    listingsRoot: listingsRoot || null,
    address: String(preview.address || ''),
    status: 'running',
    phase: 'load-bundle',
    progress: 12,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: buildInitialSteps(),
    terminalLines: [
      'Opening property analysis.',
      'Loading the latest property data...',
    ],
    error: null,
    bundle: null,
    analysisResult: null,
  };

  return persistSession(session);
}

export async function getPropertyDetailsSession(sessionId: string, sessionRoot?: string | null) {
  const session = await readSession(sessionRoot);
  if (!session || session.id !== sessionId) {
    return null;
  }

  return toPublicSession(session, sessionRoot);
}

export async function runPropertyDetailsSessionToCompletion(sessionId: string, sessionRoot?: string | null) {
  let current = await advancePropertyDetailsSession(sessionId, sessionRoot);

  while (current && current.status === 'running') {
    current = await advancePropertyDetailsSession(sessionId, current.sessionRoot);
  }

  return current;
}

export async function advancePropertyDetailsSession(sessionId: string, sessionRoot?: string | null) {
  const session = await readSession(sessionRoot);

  if (!session || session.id !== sessionId) {
    return null;
  }

  try {
    if (session.status !== 'running') {
      return toPublicSession(session, sessionRoot);
    }

    if (session.phase === 'load-bundle') {
      session.terminalLines = appendTerminalLine(session.terminalLines, 'Loading listing snapshot and supporting property records...');
      session.updatedAt = Date.now();
      const pending = await persistSession(session);

      const bundle = await getPropertyDetailBundle(normalizeListingId(session.listingId), session.listingsRoot);
      if (!bundle) {
        throw new Error('Property details bundle could not be built.');
      }

      session.bundle = bundle;
      session.address = bundle.listing.address || session.address;
      session.phase = 'run-analysis';
      session.progress = 46;
      session.steps = updateStepStatuses(session.steps, 'run-analysis');
      session.terminalLines = appendTerminalLine(session.terminalLines, `Loaded property bundle for ${bundle.listing.address}.`);
      session.updatedAt = Date.now();
      void pending;
      return persistSession(session);
    }

    if (session.phase === 'run-analysis') {
      if (!session.bundle) {
        throw new Error('Property bundle missing before analysis phase.');
      }

      session.terminalLines = appendTerminalLine(session.terminalLines, 'Running the agent analysis on the 0G-backed pipeline...');
      session.updatedAt = Date.now();
      await persistSession(session);

      const analysisResult = await getOrCreatePropertyAnalysis(
        session.bundle,
        String(session.bundle.listing.analysisRoot || ''),
      );
      session.analysisResult = analysisResult;
      session.phase = 'finalize';
      session.progress = 84;
      session.steps = updateStepStatuses(session.steps, 'finalize');
      session.terminalLines = appendTerminalLine(
        session.terminalLines,
        analysisResult.fromCache
          ? 'Reused cached 0G investment memo for this property.'
          : `Generated new ${analysisResult.record.provider === '0g-compute' ? '0G' : 'fallback'} property analysis.`
      );
      session.updatedAt = Date.now();
      return persistSession(session);
    }

    if (session.phase === 'finalize') {
      session.phase = 'completed';
      session.status = 'completed';
      session.progress = 100;
      session.steps = updateStepStatuses(session.steps, 'completed');
      session.terminalLines = appendTerminalLine(session.terminalLines, 'Property analysis is ready to render.');
      session.updatedAt = Date.now();
      return persistSession(session);
    }

    return toPublicSession(session, sessionRoot);
  } catch (error) {
    session.status = 'failed';
    session.error = String(error);
    session.steps = updateStepStatuses(session.steps, session.phase, true);
    session.terminalLines = appendTerminalLine(session.terminalLines, `Session failed: ${String(error)}`);
    session.updatedAt = Date.now();
    return persistSession(session);
  }
}