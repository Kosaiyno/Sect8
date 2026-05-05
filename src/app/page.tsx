import Link from "next/link";
import { ArrowRight, Shield, Cpu, Database, Activity, Building2, Landmark, ScanSearch, Sparkles, Orbit, BadgeDollarSign, PhoneCall, Search, ChevronDown, CheckCircle2 } from "lucide-react";

const workflowSteps = [
  {
    number: "01",
    title: "Search",
    description: "Sect8 starts with real homes that are actively for sale in target ZIP markets instead of abstract market theory.",
    icon: <Search size={18} className="text-cyan-200" />,
    tone: "landing-highlight-cyan",
  },
  {
    number: "02",
    title: "Analyze",
    description: "Each property is analyzed against Section 8 rent support, purchase price, projected cash flow, cap rate, and ROI.",
    icon: <BadgeDollarSign size={18} className="text-amber-200" />,
    tone: "landing-highlight-gold",
  },
  {
    number: "03",
    title: "Verify",
    description: "Parcel records, ownership context, ATTOM detail, HUD benchmarks, and housing-authority contacts are compiled into one decision flow.",
    icon: <PhoneCall size={18} className="text-emerald-200" />,
    tone: "landing-highlight-emerald",
  },
  {
    number: "04",
    title: "Store",
    description: "Analysis state, memory roots, and agent workflow context are persisted through the 0G stack so the desk can resume with state.",
    icon: <Database size={18} className="text-cyan-200" />,
    tone: "landing-highlight-cyan",
  },
];

const featureCards = [
  {
    title: "Purchaseable inventory only",
    description: "Sect8 is centered on homes that are actually for sale, so the workflow starts with inventory you can buy rather than generic market browsing.",
    icon: <Building2 size={18} className="text-cyan-200" />,
  },
  {
    title: "Section 8 analysis",
    description: "Every recommendation combines rent support, projected cash flow, cap rate, ROI, and local housing-authority context into one clear read.",
    icon: <Shield size={18} className="text-cyan-200" />,
  },
  {
    title: "Property dossier view",
    description: "The details page brings together pricing, parcel data, deed history, tax records, PHA contacts, and the final investment memo.",
    icon: <Landmark size={18} className="text-cyan-200" />,
  },
  {
    title: "Market memory",
    description: "Saved listings and agent history are kept available so the platform can recover context without forcing the workflow to restart from zero.",
    icon: <Database size={18} className="text-cyan-200" />,
  },
  {
    title: "0G-backed analysis",
    description: "Property-level agent analysis runs through the 0G compute path, with storage roots attached to the result pipeline.",
    icon: <Cpu size={18} className="text-cyan-200" />,
  },
  {
    title: "0G chain agent minting",
    description: "Sect8 creates each user agent through the wallet on 0G Mainnet so the identity starts on the 0G chain.",
    icon: <Orbit size={18} className="text-cyan-200" />,
  },
];

const faqItems = [
  {
    question: "What does Sect8 actually do?",
    answer: "Sect8 is an acquisition platform for Section 8 investors. It scans for-sale homes, scores Section 8 fit, calculates projected cash flow metrics, and compiles the property into a deeper investment dossier.",
  },
  {
    question: "What data does it use in the workflow?",
    answer: "The current workflow combines live or cached listing data, HUD fair market rent support, ATTOM parcel and ownership detail, and local housing-authority contact information when available.",
  },
  {
    question: "How is 0G used in the product?",
    answer: "Sect8 uses 0G compute for property analysis generation, 0G storage for memory and analysis roots, and 0G Mainnet to create the user agent identity.",
  },
  {
    question: "Is this just a market browser?",
    answer: "No. The market page is intentionally lighter, but the core product is the analysis workflow: ranking homes, analyzing Section 8 fit, and producing a property dossier with the economics and verification context attached.",
  },
];

export default function Home() {
  const liveWorkflowSteps = [
    'Listing pulled with purchase price and sale context.',
    '0G compute runs the agent analysis for the property.',
    'Projected cash flow, cap rate, and ROI calculated.',
    'Property dossier compiled with ATTOM and housing-authority detail.',
  ];

  return (
    <div className="flex flex-col gap-24 py-10 overflow-hidden">
      <section className="landing-soft-panel relative overflow-hidden rounded-[40px] p-8 md:p-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="absolute left-[-80px] top-[-80px] h-72 w-72 rounded-full bg-cyan-300/10 blur-[130px]" />
        <div className="absolute right-[-70px] bottom-[-60px] h-72 w-72 rounded-full bg-emerald-300/8 blur-[150px]" />

        <div className="relative">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
              <Activity size={14} />
              AI acquisition agent for Section 8 investors
            </div>

            <div className="mt-7 max-w-4xl">
              <h1 className="font-outfit text-[clamp(2.9rem,6.4vw,5.5rem)] font-black leading-[0.94] tracking-[-0.06em] text-white">
                Meet the AI agent that finds
                <span className="mt-2 block">
                  <span className="landing-highlight-cyan">Section 8 deals</span>
                  <span className="mx-2 md:mx-3">and</span>
                  <span className="landing-highlight-gold">analyzes them</span>
                </span>
                <span className="mt-2 block text-cyan-100">before you buy.</span>
              </h1>
            </div>

            <p className="section-copy mt-8 max-w-3xl text-lg md:text-[1.18rem] md:leading-8">
              Sect8 is an AI Section 8 acquisition platform built for investors buying rental property. It scans purchasable homes, evaluates Section 8 fit, projects cash flow, cap rate, and ROI, and compiles each address into a decision-ready dossier. The property analysis runs on 0G compute, with memory and analysis roots persisted through the 0G stack.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-2 group sm:min-w-[210px]">
                Open Dashboard
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/market" className="btn-secondary text-center sm:min-w-[170px]">
                Browse Market
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Agent scope', value: 'Real homes for sale' },
                { label: 'Agent output', value: 'Cash flow, cap rate, ROI' },
                { label: 'Agent stack', value: '0G compute, storage, minting' },
              ].map((item) => (
                <div key={item.label} className="signal-card rounded-[24px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">{item.label}</div>
                  <div className="mt-2 text-base font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        <div className="dashboard-panel rounded-[34px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="platform-eyebrow">Live Workflow</div>
              <div className="mt-2 font-outfit text-2xl font-black text-white">From listing to investment memo</div>
            </div>
            <div className="glass-badge rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">0G active</div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {liveWorkflowSteps.map((line, index) => (
              <div key={line} className="dashboard-subpanel flex items-start gap-3 rounded-[22px] p-4">
                <span className="landing-number-pill">{index + 1}</span>
                <div className="text-sm leading-6 text-white/78">{line}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div className="signal-card rounded-[26px] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100">
              <BadgeDollarSign size={18} />
            </div>
            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Analysis</div>
            <div className="mt-2 font-outfit text-2xl font-black text-white">Projected economics</div>
            <p className="mt-3 text-sm leading-7 text-white/68">Sect8 does not stop at the list price. It analyzes the operating view investors actually need to screen a Section 8 acquisition.</p>
          </div>

          <div className="signal-card rounded-[26px] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-100">
              <Database size={18} />
            </div>
            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Persistence</div>
            <div className="mt-2 font-outfit text-2xl font-black text-white">0G-backed state</div>
            <p className="mt-3 text-sm leading-7 text-white/68">The workflow keeps memory, analysis roots, and agent state attached so research does not disappear between sessions.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {workflowSteps.map((step) => (
          <div key={step.number} className="landing-soft-panel rounded-[30px] p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="landing-number-pill">{step.number}</span>
              <div className={`rounded-2xl px-3 py-2 ${step.tone}`}>{step.icon}</div>
            </div>
            <h3 className="mt-6 font-outfit text-[1.7rem] font-black tracking-[-0.04em] text-white">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">{step.description}</p>
          </div>
        ))}
      </section>

      <section className="text-center">
        <div className="platform-eyebrow">Why Sect8</div>
        <h2 className="mt-4 font-outfit text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">
          Everything needed to screen
          <span className="block text-cyan-100">Section 8 acquisitions professionally.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/66 md:text-lg">
          The platform is designed to make the first decision cleaner: whether a property deserves attention, deeper diligence, and capital.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => (
            <div key={feature.title} className="landing-soft-panel rounded-[28px] p-6 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10">{feature.icon}</div>
              <h3 className="mt-5 font-outfit text-2xl font-black tracking-[-0.03em] text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/66">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr] xl:items-start">
        <div className="landing-soft-panel rounded-[34px] p-8 md:p-10">
          <div className="platform-eyebrow">0G Stack</div>
          <h2 className="mt-4 font-outfit text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
            Built on the 0G stack,
            <span className="block text-cyan-100">with real compute, storage, and chain usage.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/66">
            Sect8 uses 0G compute for property analysis generation, 0G storage for memory and analysis persistence, and the Sect8 agent contract path on 0G Mainnet to create each user agent.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { title: '0G Compute', description: 'Generates the property-level agent analysis and decision language used in the core workflow.', icon: <Cpu size={18} className="text-cyan-200" /> },
              { title: '0G Storage', description: 'Persists agent memory, listing snapshots, and analysis roots used across the product.', icon: <Database size={18} className="text-cyan-200" /> },
              { title: '0G Mainnet minting', description: 'Creates the Sect8 agent through the wallet on 0G Mainnet so every user starts with a chain-backed agent identity.', icon: <Orbit size={18} className="text-cyan-200" /> },
            ].map((item) => (
              <div key={item.title} className="dashboard-subpanel rounded-[24px] p-5">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10">{item.icon}</div>
                  <div className="font-outfit text-2xl font-black tracking-[-0.03em]">{item.title}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/66">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-soft-panel rounded-[34px] p-8 md:p-10">
          <div className="platform-eyebrow">Platform Signals</div>
          <h2 className="mt-4 font-outfit text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
            Built for serious
            <span className="block text-cyan-100">Section 8 acquisition work.</span>
          </h2>
          <p className="mt-5 text-base leading-8 text-white/66">
            The product is centered on real inventory, disciplined analysis, verification context, and a stateful workflow that does not lose the deal history.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              'Real for-sale inventory first',
              'Section 8-specific analysis',
              'PHA and ATTOM verification context',
              'Stateful 0G-backed workflow',
            ].map((item) => (
              <div key={item} className="dashboard-subpanel flex items-center gap-3 rounded-[22px] p-4 text-sm text-white/78">
                <CheckCircle2 size={16} className="text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl text-center">
        <div className="platform-eyebrow">FAQ</div>
        <h2 className="mt-4 font-outfit text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">
          Questions about the
          <span className="block text-cyan-100">Sect8 workflow.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/66">
          The product is built around a specific use case: scanning purchasable homes and deciding which Section 8 deals deserve attention.
        </p>

        <div className="mt-10 space-y-4 text-left">
          {faqItems.map((item) => (
            <details key={item.question} className="faq-card landing-soft-panel group rounded-[24px] p-0">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-lg font-semibold text-white">
                <span>{item.question}</span>
                <ChevronDown size={18} className="text-white/50 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-white/8 px-6 py-5 text-sm leading-7 text-white/66">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-soft-panel rounded-[36px] p-8 text-center md:p-12">
        <div className="platform-eyebrow">Start Here</div>
        <h2 className="mt-4 font-outfit text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
          Open the dashboard,
          <span className="block text-cyan-100">scan a market, and review the deals.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/66">
          The main workflow begins inside the dashboard, where Sect8 ranks homes, runs agent analysis on 0G compute, stores memory, and opens the full property dossier.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-2 group sm:min-w-[220px]">
            Open Dashboard
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/market" className="btn-secondary text-center sm:min-w-[180px]">
            Explore Market Feed
          </Link>
        </div>
      </section>
    </div>
  );
}
