"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { ArrowRight, Cpu, Database, Activity, Building2, Landmark, CheckCircle2, ShieldCheck, TrendingUp, Globe, Zap, Search, PhoneCall, BadgeDollarSign, ChevronDown } from "lucide-react";

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-20 pb-20 md:gap-32 md:pb-24">

      {/* ─── HERO SECTION ─── */}
      <section className="animate-fade-in">
        <div className="hero-full-width group">
          <div className="hero-overlay" />
          <Image
            src="/hero-luxury-home.png"
            alt="Institutional Real Estate"
            fill
            className="hero-bg-img transition-transform duration-[20s] group-hover:scale-110"
            priority
          />


          <div className="relative z-20 mx-auto w-full max-w-[1440px] px-3 py-10 sm:px-6 md:py-24 lg:px-8 lg:py-32">
            <div className="max-w-4xl space-y-6 sm:space-y-8 animate-fade-in">
              <div className="platform-chip bg-white/15 text-white border-white/25 backdrop-blur-md shadow-lg mx-auto sm:mx-0">
                <Activity size={14} className="text-[#b8942f]" />
                AI acquisition agent for Section 8 investors
              </div>

              <h1 className="font-outfit text-[2.1rem] xs:text-[2.5rem] sm:text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-white drop-shadow-2xl text-center sm:text-left">
                Meet the AI agent that finds <br />
                <span className="text-[#b8942f]">Section 8 deals</span> and <span className="text-[#0d9668]">analyzes them</span> <br />
                before you buy.
              </h1>

              <p className="max-w-3xl text-base font-medium leading-8 text-gray-300 sm:text-lg md:text-xl hidden sm:block">
                Sect8 is an AI Section 8 acquisition platform built for investors buying rental property. It scans purchasable homes, evaluates Section 8 fit, projects cash flow, cap rate, and ROI, and compiles each address into a decision-ready dossier. The property analysis runs on 0G compute, with memory and analysis roots persisted through the 0G stack.
              </p>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-4 group px-8 py-4 text-base shadow-[0_0_60px_rgba(184,148,47,0.3)] sm:px-12 sm:py-5 sm:text-lg">
                  Open Dashboard
                  <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/market" className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 px-8 py-4 text-base backdrop-blur-md sm:px-12 sm:py-5 sm:text-lg">
                  Browse Market
                </Link>
              </div>
            </div>

            {/* Bottom Hero Metrics */}
            <div className="mt-8 sm:mt-14 grid grid-cols-3 gap-2 sm:gap-8 border-t border-white/10 pt-8 sm:pt-12 md:mt-20 md:gap-12 md:pt-16">
              {[
                { label: 'Agent scope', value: 'Real homes for sale', desc: 'Live inventory', icon: <Building2 size={11} /> },
                { label: 'Agent output', value: 'Cash flow, cap rate, ROI', desc: 'Full underwriting', icon: <TrendingUp size={11} /> },
                { label: 'Agent stack', value: '0G compute, storage, minting', desc: 'Decentralized stack', icon: <Cpu size={11} /> },
              ].map((item) => (
                <div key={item.label} className="group/metric cursor-default space-y-0.5 px-0.5">
                  <div className="flex items-center gap-0.5 text-[6.5px] font-black uppercase tracking-[0.10em] text-[#b8942f]">
                    {item.icon}
                    {item.label}
                  </div>
                  <div className="font-outfit text-[0.60rem] font-black text-white group-hover/metric:text-[#b8942f] transition-colors leading-tight text-center">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── POWERED BY SECTION ─── */}
      <section className="mt-8 space-y-8 overflow-hidden md:mt-16 md:space-y-12">
        <div className="mx-auto max-w-[1440px] px-2 text-center sm:px-4 lg:px-6">
          <div className="font-outfit text-lg md:text-2xl font-black uppercase tracking-[0.25em] text-[#0f1629]/90">
            Powered by
          </div>
        </div>

        <div className="bg-[#0f1629] py-7 sm:py-10 md:py-14 border-y border-white/5">
          <div className="marquee-container w-full">
            <div className="animate-marquee flex items-center gap-20 pr-20 sm:gap-24 sm:pr-24 md:gap-32 md:pr-32">
              {[
                { name: 'RentCast', src: '/rentcast%20logo.png', scale: 'w-56' },
                { name: '0G Stack', src: '/0G-Logo-White.png', scale: 'w-44' },
                { name: 'HUD', src: '/hud-seal-white4.png', scale: 'w-40' },
                { name: 'ATTOM', src: '/ATTOM-Logo-White.png', scale: 'w-52' },
                { name: 'Zillow', src: '/Zillow%20Logo_Secondary_RGB.png', scale: 'w-56' },
              ].concat([
                { name: 'RentCast', src: '/rentcast%20logo.png', scale: 'w-56' },
                { name: '0G Stack', src: '/0G-Logo-White.png', scale: 'w-44' },
                { name: 'HUD', src: '/hud-seal-white4.png', scale: 'w-40' },
                { name: 'ATTOM', src: '/ATTOM-Logo-White.png', scale: 'w-52' },
                { name: 'Zillow', src: '/Zillow%20Logo_Secondary_RGB.png', scale: 'w-56' },
              ]).concat([
                { name: 'RentCast', src: '/rentcast%20logo.png', scale: 'w-56' },
                { name: '0G Stack', src: '/0G-Logo-White.png', scale: 'w-44' },
                { name: 'HUD', src: '/hud-seal-white4.png', scale: 'w-40' },
                { name: 'ATTOM', src: '/ATTOM-Logo-White.png', scale: 'w-52' },
                { name: 'Zillow', src: '/Zillow%20Logo_Secondary_RGB.png', scale: 'w-56' },
              ]).map((logo, i) => (
                <div key={i} className={`relative h-14 ${logo.scale} grayscale brightness-200 contrast-125 opacity-30 hover:opacity-100 hover:grayscale-0 transition-all duration-700`}>
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px] px-2 space-y-8 sm:px-4 md:space-y-16 lg:px-6 lg:space-y-24">

        {/* ─── LIVE WORKFLOW (STACKED) ─── */}
        <section className="reveal-on-scroll">
          <div className="fintech-card p-4 sm:p-6 md:p-10 overflow-hidden space-y-5 md:space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="platform-eyebrow">Live Workflow</div>
                <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-[#0f1629]">
                  From listing to <span className="text-[#b8942f]">investment memo</span>
                </h2>
              </div>
              <div className="hidden md:flex glass-badge rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest border-[#0d9668]/30 text-[#0d9668] bg-[#0d9668]/05">
                <Activity size={14} className="mr-2" /> 0G active
              </div>
            </div>

            <div className="grid gap-2 sm:gap-4 md:grid-cols-2">
              {[
                { num: "1", text: "Listing pulled with purchase price and sale context." },
                { num: "2", text: "0G compute runs the agent analysis for the property." },
                { num: "3", text: "Projected cash flow, cap rate, and ROI calculated." },
                { num: "4", text: "Property dossier compiled with ATTOM and housing-authority detail." }
              ].map((step) => (
                <div key={step.num} className="dashboard-subpanel group flex items-start gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl p-3 sm:p-5 hover-lift border-gray-100/50 bg-gray-50/30">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-outfit text-base font-black text-[#b8942f] shadow-sm border border-gray-100 group-hover:bg-[#b8942f] group-hover:text-white transition-all duration-500">
                    {step.num}
                  </span>
                  <div className="text-sm sm:text-base font-bold leading-snug text-[#64748b] group-hover:text-[#0f1629] transition-colors">
                    {step.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* ─── WORKFLOW STEPS (01-04) ─── */}
        <section className="reveal-on-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { num: "01", title: "Search", desc: "Sect8 starts with real homes that are actively for sale in target ZIP markets instead of abstract market theory.", icon: <Search size={22} />, color: "#b8942f" },
            { num: "02", title: "Analyze", desc: "Each property is analyzed against Section 8 rent support, purchase price, projected cash flow, cap rate, and ROI.", icon: <BadgeDollarSign size={22} />, color: "#b8942f" },
            { num: "03", title: "Verify", desc: "Parcel records, ownership context, ATTOM detail, HUD benchmarks, and housing-authority contacts are compiled into one decision flow.", icon: <PhoneCall size={22} />, color: "#b8942f" },
            { num: "04", title: "Store", desc: "Analysis state, memory roots, and agent workflow context are persisted through the 0G stack so the desk can resume with state.", icon: <Database size={22} />, color: "#b8942f" }
          ].map((step) => (
            <div key={step.num} className="fintech-card p-4 sm:p-6 md:p-8 hover-lift flex flex-col items-start gap-4 md:gap-6">
              <div className="flex w-full items-center justify-between">
                <span className="font-outfit text-2xl font-black text-[#b8942f]/20 tracking-tighter">{step.num}</span>
                <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[#b8942f] shadow-sm">
                  {step.icon}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#0f1629]">{step.title}</h3>
                <p className="text-xs font-medium text-[#64748b] leading-snug">{step.desc}</p>
              </div>
            </div>
          ))}
        </section>
        {/* ═══════════════════════════════════════
          HOW IT WORKS
        ═══════════════════════════════════════ */}
        <section className="reveal-on-scroll mt-14">
          <div className="text-center mb-12">
            <div className="platform-eyebrow">How It Works</div>
            <h2 className="mt-4 font-outfit text-3xl font-black tracking-[-0.04em] text-[#0f1629] md:text-5xl">
              Get started in four steps.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                title: "Create or connect a wallet",
                desc: "MetaMask and other EVM wallets are supported.",
              },
              {
                title: "Onboard with funded gas",
                desc: "Sect8 will fund a small gas allowance to your wallet when needed so you can create and activate agents without paying upfront.",
              },
              {
                title: "Create your Sect8 investment agent",
                desc: "Agent creation uses the funded gas allowance so users are not required to pay at creation time.",
              },
              {
                title: "Analyze deals with institutional-grade insights",
                desc: "Cash flow, ROI, HUD FMR alignment, ownership records, risk flags, underwriting signals, and more.",
              },
            ].map((step, i) => (
              <div key={step.title} className="fintech-card p-5 hover-lift group border-b-4 border-b-transparent hover:border-b-[#b8942f]">
                <div className="font-outfit text-lg font-black tracking-tight text-[#0f1629] mb-3">{step.title}</div>
                <p className="text-sm leading-6 text-[#64748b] font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        

        {/* Analysis & Persistence section removed per request */}

        {/* ─── WHY SECT8 (FEATURE GRID) ─── */}
        <section className="reveal-on-scroll text-center space-y-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="platform-eyebrow">Why Sect8</div>
            <h2 className="font-outfit text-2xl sm:text-3xl md:text-5xl font-black tracking-tighter text-[#0f1629] leading-none">
              Everything needed to screen <br />
              <span className="text-[#b8942f]">Section 8 acquisitions professionally.</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-[#64748b] font-medium max-w-3xl mx-auto">
              The platform is designed to make the first decision cleaner: whether a property deserves attention, deeper diligence, and capital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {[
              { title: "Purchaseable inventory only", desc: "Sect8 is centered on homes that are actually for sale, so the workflow starts with inventory you can buy rather than generic market browsing." },
              { title: "Section 8 analysis", desc: "Every recommendation combines rent support, projected cash flow, cap rate, ROI, and local housing-authority context into one clear read." },
              { title: "Property dossier view", desc: "The details page brings together pricing, parcel data, deed history, tax records, PHA contacts, and the final investment memo." },
              { title: "Market memory", desc: "Saved listings and agent history are kept available so the platform can recover context without forcing the workflow to restart from zero." },
              { title: "0G-backed analysis", desc: "Property-level agent analysis runs through the 0G compute path, with storage roots attached to the result pipeline." },
              { title: "0G chain agent minting", desc: "Sect8 creates each user agent through the wallet on 0G Mainnet so the identity starts on the 0G chain." }
            ].map((feature) => (
              <div key={feature.title} className="fintech-card p-4 sm:p-6 md:p-8 hover-lift">
                <h3 className="font-outfit text-lg font-black text-[#0f1629] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#64748b] font-medium leading-snug">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 0G STACK ─── */}
        <section className="reveal-on-scroll">
          <div className="fintech-card p-4 sm:p-6 md:p-10 lg:p-14 relative overflow-hidden border-2 border-gray-100 shadow-2xl">
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_30%_30%,#b8942f_0%,transparent_50%)]" />
            <div className="relative z-10 space-y-6 md:space-y-10">
              <div className="max-w-3xl space-y-6">
                <div className="platform-chip bg-[#b8942f]/10 border-[#b8942f]/20 text-[#b8942f] text-xs">
                  <Globe size={12} /> 0G Stack
                </div>
                <h2 className="font-outfit text-2xl sm:text-3xl md:text-5xl font-black text-[#0f1629] leading-[1.0] tracking-tighter">
                  Built on the 0G stack, <br />
                  <span className="text-[#b8942f]">with real compute, storage, and chain usage.</span>
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-[#64748b] font-medium leading-snug max-w-2xl">
                  Sect8 uses 0G compute for property analysis generation, 0G storage for memory and analysis persistence, and the Sect8 agent contract path on 0G Mainnet to create each user agent.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: '0G Compute', desc: 'Generates the property-level agent analysis and decision language used in the core workflow.', icon: <Cpu size={24} /> },
                  { title: '0G Storage', desc: 'Persists agent memory, listing snapshots, and analysis roots used across the product.', icon: <Database size={24} /> },
                  { title: '0G Mainnet minting', desc: 'Creates the Sect8 agent through the wallet on 0G Mainnet so every user starts with a chain-backed agent identity.', icon: <Zap size={24} /> },
                ].map((item) => (
                  <div key={item.title} className="bg-[#f8f9fb] border border-gray-100 rounded-2xl p-4 sm:p-6 md:p-8 hover:bg-white hover:border-[#b8942f]/30 hover:shadow-xl transition-all group">
                    <div className="h-10 w-10 rounded-xl bg-[#b8942f]/10 flex items-center justify-center text-[#b8942f] mb-4 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#0f1629] mb-2">{item.title}</div>
                    <div className="text-xs sm:text-sm text-[#64748b] font-medium leading-snug">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Signals section removed per request */}

        {/* ─── FAQ ─── */}
        <section className="reveal-on-scroll max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-6">
            <div className="platform-eyebrow">FAQ</div>
            <h2 className="font-outfit text-2xl sm:text-3xl font-black text-[#0f1629] tracking-tighter">
              Questions about the <span className="text-[#b8942f]">Sect8 workflow.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#64748b] font-medium">
              The product is built around a specific use case: scanning purchasable homes and deciding which Section 8 deals deserve attention.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { q: "What does Sect8 actually do?", a: "Sect8 is an acquisition platform for Section 8 investors. It scans for-sale homes, scores Section 8 fit, calculates projected cash flow metrics, and compiles the property into a deeper investment dossier." },
              { q: "What data does it use in the workflow?", a: "The current workflow combines live or cached listing data, HUD fair market rent support, ATTOM parcel and ownership detail, and local housing-authority contact information when available." },
              { q: "How is 0G used in the product?", a: "Sect8 uses 0G compute for property analysis generation, 0G storage for memory and analysis roots, and 0G Mainnet to create the user agent identity." },
              { q: "Is this just a market browser?", a: "No. The market page is intentionally lighter, but the core product is the analysis workflow: ranking homes, analyzing Section 8 fit, and producing a property dossier with the economics and verification context attached." }
            ].map((faq) => (
              <details key={faq.q} className="group fintech-card border-gray-100/50">
                <summary className="flex cursor-pointer items-center justify-between p-3 sm:p-5 list-none">
                  <span className="text-sm sm:text-base font-bold text-[#0f1629] pr-2">{faq.q}</span>
                  <ChevronDown className="text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-3 sm:px-5 pb-3 sm:pb-5 text-xs sm:text-sm text-[#64748b] font-medium leading-snug border-t border-gray-50 pt-2 sm:pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="reveal-on-scroll">
          <div className="fintech-card rounded-[32px] sm:rounded-[48px] md:rounded-[64px] p-8 sm:p-12 md:p-20 lg:p-32 text-center relative overflow-hidden bg-white shadow-2xl border-2 border-gray-100">
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,#b8942f_0%,transparent_70%)]" />
            <div className="relative z-10 space-y-8 sm:space-y-10 md:space-y-12">
              <div className="platform-eyebrow text-[#b8942f]">Start Here</div>
              <h2 className="font-outfit text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.05em] text-[#0f1629] md:leading-[1.0]">
                Open the dashboard, <br />
                <span className="text-[#b8942f]">scan a market, and review the deals.</span>
              </h2>
              <p className="mx-auto max-w-3xl text-base sm:text-lg md:text-xl leading-8 md:leading-9 text-[#0f1629] font-bold">
                The main workflow begins inside the dashboard, where Sect8 ranks homes, runs agent analysis on 0G compute, stores memory, and opens the full property dossier.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:gap-6 sm:flex-row pt-4 sm:pt-8">
                <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-4 group px-8 sm:px-12 lg:px-14 py-4 sm:py-5 lg:py-6 text-base sm:text-lg lg:text-xl shadow-[0_20px_40px_rgba(184,148,47,0.2)]">
                  Open Dashboard
                  <ArrowRight size={26} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/market" className="btn-secondary bg-[#f8f9fb] border-gray-200 text-[#0f1629] hover:bg-white px-8 sm:px-12 lg:px-14 py-4 sm:py-5 lg:py-6 text-base sm:text-lg lg:text-xl">
                  Explore Market Feed
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
