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
      return 'text-emerald-200';
    case 'failed':
      return 'text-rose-200';
    case 'active':
      return 'text-cyan-100/75';
    case 'pending':
    default:
      return 'text-white/42';
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
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-8 text-white md:px-6 xl:px-8">
      <section className="glass-card border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(52,120,246,0.18),transparent_24%),rgba(5,5,5,0.95)] p-6 md:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-200">
              <ScanSearch size={14} />
              Agent analysis
            </div>

            <div>
              <h1 className="font-outfit text-3xl font-black tracking-tight text-white md:text-[3.1rem] md:leading-[1.02]">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">{description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/62">
                {address ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    <Database size={14} />
                    {address}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <ShieldCheck size={14} />
                  {Math.max(0, Math.min(100, Math.round(progress)))}% complete
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.key} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${getStepAccent(step.status)}`}>
                      {renderStepIcon(step.status)}
                      Step {index + 1}
                    </div>
                    <div className={step.status === 'active' ? 'agent-step-dot' : 'h-2.5 w-2.5 rounded-full bg-white/15'} aria-hidden="true" />
                  </div>
                  <div className="mt-4 font-outfit text-xl font-black text-white">{step.title}</div>
                  <p className="mt-3 text-sm leading-6 text-white/68">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 xl:w-[380px]">
            <div className="rounded-[30px] border border-cyan-300/18 bg-[#0a1017] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3 text-cyan-100">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">Live status</div>
                  <div className="mt-2 font-outfit text-2xl font-black text-white">Agent analysis</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${error ? 'border-rose-300/20 bg-rose-300/10 text-rose-100' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'}`}>
                  {error ? 'Failed' : statusLabel}
                </div>
              </div>

              <div className="agent-terminal mt-5 space-y-3 rounded-[24px] border border-white/8 bg-[#05080d] p-4 font-mono text-[12px] leading-6 text-cyan-100/90">
                <div className="flex items-center gap-2 text-[11px] text-white/45">
                  <Sparkles size={12} />
                  /agent/analysis/live
                </div>
                {terminalLines.map((line) => (
                  <div key={line} className="agent-terminal-line">{line}</div>
                ))}
                {!error ? <div className="agent-terminal-line">Streaming live analysis state<span className="agent-typing" /></div> : null}
              </div>

              <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/72">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">0G execution proof</div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">Compute status</span>
                    <span className="text-right font-semibold text-white">{analysisProvider === '0g-compute' ? 'Verified 0G Compute' : analysisProvider === 'fallback' ? 'Fallback analysis' : 'Waiting for provider response'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">Provider</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-cyan-100">{truncateMiddle(computeProof?.providerAddress)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">Endpoint</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-white/85">{computeProof?.endpoint || 'Pending'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">Model</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-white/85">{computeProof?.model || 'Pending'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">Response ID</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-emerald-100">{truncateMiddle(computeProof?.responseId)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">HTTP</span>
                    <span className="text-right font-mono text-[12px] text-white/85">{computeProof?.status ? `${computeProof.status}${computeProof.statusText ? ` ${computeProof.statusText}` : ''}` : 'Pending'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/45">Storage root</span>
                    <span className="max-w-[190px] break-all text-right font-mono text-[12px] text-emerald-100">{truncateMiddle(analysisStorageRoot)}</span>
                  </div>
                  {computeProof?.responsePreview ? (
                    <div className="rounded-[18px] border border-cyan-300/10 bg-cyan-300/[0.05] p-3 text-[12px] leading-6 text-cyan-50/88">
                      {computeProof.responsePreview}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="agent-progress mt-5 h-2 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                <div className="agent-progress-bar h-full rounded-full" style={{ width: `${Math.max(12, Math.min(100, Math.round(progress)))}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}