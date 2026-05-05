import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getOrCreatePropertyAnalysis, type PropertyAnalysisBundle } from '@/lib/propertyAnalysis';
import { getPropertyDetailBundle, getPropertyListingPreview, type PropertyDetailBundle } from '@/lib/propertyDetails';
import type { PropertyLoadingStep } from '@/components/PropertyDetailsLoadingState';

type SessionStatus = 'running' | 'completed' | 'failed';
type SessionPhase = 'load-bundle' | 'run-analysis' | 'finalize' | 'completed';

type PropertyDetailsSession = {
  id: string;
  listingId: string;
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
  result: null | {
    bundle: PropertyDetailBundle;
    analysisResult: PropertyAnalysisBundle;
  };
};

const sessionDir = path.resolve(process.cwd(), 'data');
const sessionFile = path.join(sessionDir, 'property-detail-sessions.json');
const sessionTtlMs = 1000 * 60 * 30;

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

function ensureSessionDir() {
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
}

function readSessions(): Record<string, PropertyDetailsSession> {
  if (!fs.existsSync(sessionFile)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(sessionFile, 'utf8')) || {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, PropertyDetailsSession>) {
  ensureSessionDir();
  const cutoff = Date.now() - sessionTtlMs;
  const filtered = Object.fromEntries(
    Object.entries(sessions).filter(([, session]) => session.updatedAt >= cutoff)
  );
  fs.writeFileSync(sessionFile, JSON.stringify(filtered, null, 2));
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

function toPublicSession(session: PropertyDetailsSession): PropertyDetailsSessionPublic {
  return {
    ...session,
    result: session.status === 'completed' && session.bundle && session.analysisResult
      ? { bundle: session.bundle, analysisResult: session.analysisResult }
      : null,
  };
}

export function createPropertyDetailsSession(listingId: string) {
  const normalizedListingId = normalizeListingId(listingId);
  const preview = getPropertyListingPreview(normalizedListingId);
  if (!preview) {
    return null;
  }

  const session: PropertyDetailsSession = {
    id: crypto.randomUUID(),
    listingId: normalizedListingId,
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

  const sessions = readSessions();
  sessions[session.id] = session;
  writeSessions(sessions);
  return toPublicSession(session);
}

export function getPropertyDetailsSession(sessionId: string) {
  const session = readSessions()[sessionId];
  return session ? toPublicSession(session) : null;
}

export async function runPropertyDetailsSessionToCompletion(sessionId: string) {
  let current = await advancePropertyDetailsSession(sessionId);

  while (current && current.status === 'running') {
    current = await advancePropertyDetailsSession(sessionId);
  }

  return current;
}

export async function advancePropertyDetailsSession(sessionId: string) {
  const sessions = readSessions();
  const session = sessions[sessionId];

  if (!session) {
    return null;
  }

  try {
    if (session.status !== 'running') {
      return toPublicSession(session);
    }

    if (session.phase === 'load-bundle') {
      session.terminalLines = appendTerminalLine(session.terminalLines, 'Loading listing snapshot and supporting property records...');
      session.updatedAt = Date.now();
      sessions[session.id] = session;
      writeSessions(sessions);

      const bundle = await getPropertyDetailBundle(normalizeListingId(session.listingId));
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
      sessions[session.id] = session;
      writeSessions(sessions);
      return toPublicSession(session);
    }

    if (session.phase === 'run-analysis') {
      if (!session.bundle) {
        throw new Error('Property bundle missing before analysis phase.');
      }

      session.terminalLines = appendTerminalLine(session.terminalLines, 'Running the agent analysis on the 0G-backed pipeline...');
      session.updatedAt = Date.now();
      sessions[session.id] = session;
      writeSessions(sessions);

      const analysisResult = await getOrCreatePropertyAnalysis(session.bundle);
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
      sessions[session.id] = session;
      writeSessions(sessions);
      return toPublicSession(session);
    }

    if (session.phase === 'finalize') {
      session.phase = 'completed';
      session.status = 'completed';
      session.progress = 100;
      session.steps = updateStepStatuses(session.steps, 'completed');
      session.terminalLines = appendTerminalLine(session.terminalLines, 'Property analysis is ready to render.');
      session.updatedAt = Date.now();
      sessions[session.id] = session;
      writeSessions(sessions);
      return toPublicSession(session);
    }

    return toPublicSession(session);
  } catch (error) {
    session.status = 'failed';
    session.error = String(error);
    session.steps = updateStepStatuses(session.steps, session.phase, true);
    session.terminalLines = appendTerminalLine(session.terminalLines, `Session failed: ${String(error)}`);
    session.updatedAt = Date.now();
    sessions[session.id] = session;
    writeSessions(sessions);
    return toPublicSession(session);
  }
}