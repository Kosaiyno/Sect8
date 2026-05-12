import { Brain, CheckCircle2, Clock3, Database, ScanSearch, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import type { ComputeProof } from '@/types';

export type PropertyLoadingStep = {
  key: string;
  title: string;
  detail: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
};

type PropertyDetailsLoadingStateProps = {
  address?: string | null;
  title?: string;
  description?: string;
  statusLabel?: string;
  progress?: number;
  steps: PropertyLoadingStep[];
  terminalLines: string[];
  analysisProvider?: '0g-compute' | 'fallback' | null;
  computeProof?: ComputeProof | null;
  analysisStorageRoot?: string | null;
  error?: string | null;
};

function truncateMiddle(value: string | null | undefined, edge = 10) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'Pending';
  }
  if (normalized.length <= edge * 2 + 3) {
    return normalized;
  }
  return `${normalized.slice(0, edge)}...${normalized.slice(-edge)}`;
}

function getStepAccent(status: PropertyLoadingStep['status']) {
  switch (status) {
    case 'completed':
      return 'text-emerald-700';
    case 'failed':
      return 'text-rose-700';
    case 'active':
      return 'text-[#b8942f]';
    case 'pending':
    default:
      return 'text-[#64748b]/60';
  }
}

function renderStepIcon(status: PropertyLoadingStep['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={16} />;
    case 'failed':
      return <ShieldAlert size={16} />;
    case 'active':
      return <Brain size={16} />;
    case 'pending':
    default:
      return <Clock3 size={16} />;
  }
}

export default function PropertyDetailsLoadingState({
  address,
  title = 'Agent is analyzing this property.',
  description = 'Sect8 is assembling the property context and building the investment memo in real time.',
  statusLabel = 'Analyzing',
  progress = 12,
  steps,
  terminalLines,
  analysisProvider,
  computeProof,
  analysisStorageRoot,
  error,
}: PropertyDetailsLoadingStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-8 text-[#0f1629] md:px-6 xl:px-8">
      <section className="fintech-card p-6 md:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="platform-chip">
              <ScanSearch size={14} />
              Agent Analysis
            </div>

            <div>
              <h1 className="font-outfit text-3xl font-black tracking-[-0.04em] text-[#0f1629] md:text-[2.8rem] md:leading-[1.05]">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#64748b] md:text-base">{description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#64748b]/80">
                {address ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
                    <Database size={14} />
                    {address}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
                  <ShieldCheck size={14} />
                  {Math.max(0, Math.min(100, Math.round(progress)))}% complete
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.key} className="rounded-[22px] border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${getStepAccent(step.status)}`}>
                      {renderStepIcon(step.status)}
                      Step {index + 1}
                    </div>
                    <div className={step.status === 'active' ? 'agent-step-dot' : 'h-2.5 w-2.5 rounded-full bg-gray-200'} aria-hidden="true" />
                  </div>
                  <div className="mt-4 font-outfit text-xl font-black text-[#0f1629]">{step.title}</div>
                  <p className="mt-3 text-sm leading-6 text-[#64748b]">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 xl:w-[380px]">
            <div className="rounded-[28px] border border-gray-200 bg-gray-50/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.26em] text-[#b8942f]">Live Status</div>
                  <div className="mt-2 font-outfit text-2xl font-black text-[#0f1629]">Agent Analysis</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#b8942f]/30 bg-[#b8942f]/10 text-[#b8942f]'}`}>
                  {error ? 'Failed' : statusLabel}
                </div>
              </div>

              <div className="agent-terminal mt-5 space-y-3 rounded-2xl border border-white/[0.06] bg-[#040712] p-4 font-mono text-[12px] leading-6 text-[#b8942f]/80">
                <div className="flex items-center gap-2 text-[11px] text-white/40">
                  <Sparkles size={12} />
                  /agent/analysis/live
                </div>
                {terminalLines.map((line) => (
                  <div key={line} className="agent-terminal-line">{line}</div>
                ))}
                {!error ? <div className="agent-terminal-line">Streaming live analysis state<span className="agent-typing" /></div> : null}
              </div>

              <div className="mt-5 rounded-[24px] border border-gray-100 bg-white/50 p-4 text-sm text-[#64748b]">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#64748b]/60">0G execution proof</div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">Compute status</span>
                    <span className="text-right font-semibold text-[#0f1629]">{analysisProvider === '0g-compute' ? 'Verified 0G Compute' : analysisProvider === 'fallback' ? 'Fallback analysis' : 'Waiting for response'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">Provider</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-[#b8942f]">{truncateMiddle(computeProof?.providerAddress)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">Endpoint</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-[#64748b]">{computeProof?.endpoint || 'Pending'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">Model</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-[#64748b]">{computeProof?.model || 'Pending'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">Response ID</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-[#0d9668]">{truncateMiddle(computeProof?.responseId)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">HTTP</span>
                    <span className="text-right font-mono text-[12px] text-[#64748b]">{computeProof?.status ? `${computeProof.status}${computeProof.statusText ? ` ${computeProof.statusText}` : ''}` : 'Pending'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#64748b]/60">Storage root</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-[#0d9668]">{truncateMiddle(analysisStorageRoot)}</span>
                  </div>
                  {computeProof?.responsePreview ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-[12px] leading-6 text-[#64748b]">
                      {computeProof.responsePreview}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="agent-progress mt-5 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                <div className="agent-progress-bar h-full rounded-full" style={{ width: `${Math.max(12, Math.min(100, Math.round(progress)))}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}