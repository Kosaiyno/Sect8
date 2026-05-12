import React, { useState } from 'react';
import { BrainCircuit, Database, Send, Sparkles, Wand2 } from 'lucide-react';

type AgentLike = {
  id?: string;
  owner?: string | null;
  memory?: {
    memoryRoot?: string | null;
    history?: string[];
  } | null;
};

async function requestAgentBrief(prompt: string, agent: AgentLike) {
  const res = await fetch('/api/agentCompute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      memory: agent?.memory ?? null,
      owner: agent?.owner ?? null,
    })
  });

  return res.json();
}

export default function AgentChatBubble({
  agent,
  onMemoryUpdate,
}: {
  agent: AgentLike;
  onMemoryUpdate?: (update: { memoryRoot?: string | null; historyEntry?: string }) => void;
}) {
  const [message, setMessage] = useState<string>('');
  const [draft, setDraft] = useState('What is your advice for today?');
  const [loading, setLoading] = useState(false);

  const askAgent = async (prompt: string) => {
    setLoading(true);
    try {
      const json = await requestAgentBrief(prompt, agent);
      if (!json.success) throw new Error(json.error || 'Compute failed');
      const reply = json.reply;
      setMessage(reply);
      onMemoryUpdate?.({
        memoryRoot: json.memoryRoot,
        historyEntry: `Agent: ${reply}`,
      });
    } catch {
      setMessage('Sorry, I had a compute error.');
    }
    setLoading(false);
  };

  const quickPrompts = [
    'What is your advice for today?',
    'Which Section 8 signals matter most right now?',
    'Summarize my best acquisition angle in one paragraph.',
  ];

  return (
    <div className="platform-panel platform-panel-highlight overflow-hidden rounded-[30px] p-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border-b border-gray-100 p-6 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="platform-eyebrow">AI Analyst Console</div>
              <h3 className="mt-2 font-outfit text-2xl font-black text-[#0f1629]">0G-powered Section 8 investment guidance</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
                This is the agent voice of the platform. It should feel like an acquisitions analyst that understands Section 8 cashflow, remembers prior scans, and speaks from your 0G-backed memory.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="platform-chip border-cyan-100 bg-cyan-50 text-cyan-700">
                <Sparkles size={14} />
                0G Compute Live
              </span>
              <span className="platform-chip border-gray-200 bg-gray-50 text-[#64748b]">
                <Database size={14} />
                Memory Synced
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-[26px] border border-gray-100 bg-gray-50/50 p-5">
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#64748b]/60">
              <BrainCircuit size={14} />
              Current Briefing
            </div>
            <div className="mt-4 min-h-[144px] text-[15px] leading-7 text-[#0f1629]">
              {loading ? 'Running portfolio reasoning against your current memory and market context...' : (message || 'No briefing yet. Use a quick prompt or ask the agent manually.')}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setDraft(prompt);
                  void askAgent(prompt);
                }}
                className="rounded-full border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm text-[#64748b] transition hover:border-[#b8942f]/40 hover:text-[#0f1629]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="platform-eyebrow">Prompt Agent</div>
          <div className="mt-4 rounded-[26px] border border-gray-100 bg-gray-50/30 p-4">
            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#64748b]/60">Ask for a new brief</label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              className="mt-3 w-full resize-none rounded-[22px] border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-[#0f1629] outline-hidden transition focus:border-[#b8942f]/30"
              placeholder="Ask about yields, Section 8 pricing, acquisition priorities, or neighborhood strategy."
            />
            <button
              onClick={() => void askAgent(draft)}
              disabled={loading || !draft.trim()}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={15} />
              {loading ? 'Running Analysis' : 'Generate Agent Brief'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-gray-100 bg-gray-50/30 p-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#64748b]/60">
                <Wand2 size={14} />
                What this agent does
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64748b]">
                Converts live scans and remembered context into operator-ready Section 8 acquisition guidance.
              </p>
            </div>
            <div className="rounded-[24px] border border-gray-100 bg-gray-50/30 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#64748b]/60">Memory root</div>
              <div className="mt-3 break-all font-mono text-xs text-cyan-700">
                {agent?.memory?.memoryRoot || 'Awaiting first memory write'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
