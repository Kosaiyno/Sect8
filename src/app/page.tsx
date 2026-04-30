import Link from "next/link";
import { ArrowRight, Shield, Cpu, Database, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-24 py-12 overflow-hidden">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full -z-10"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase animate-fade-in">
          <Activity size={14} />
          Powered by 0G High-Performance Stack
        </div>
        
        <h1 className="text-5xl md:text-7xl font-outfit font-black tracking-tight leading-[1.1] animate-fade-in">
          Autonomous AI for <br />
          <span className="text-gradient">Section 8 Investing</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted max-w-2xl animate-fade-in [animation-delay:200ms]">
          Deploy a persistent agent that continuously scans, analyzes, and executes on-chain real estate deals with verifiable reasoning.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4 animate-fade-in [animation-delay:400ms]">
          <Link href="/dashboard" className="btn-primary flex items-center gap-2 group">
            Launch Your Agent
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/market" className="btn-secondary">
            Browse Market
          </Link>
        </div>
      </section>

      {/* Stats/Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {[
          {
            icon: <Shield className="text-blue-500" size={32} />,
            title: "Verifiable Identity",
            desc: "Persistent Agent IDs linked to your wallet, ensuring accountability and trust."
          },
          {
            icon: <Cpu className="text-purple-500" size={32} />,
            title: "0G Compute Analysis",
            desc: "Advanced ROI and cashflow calculations executed via 0G's decentralized compute."
          },
          {
            icon: <Database className="text-green-500" size={32} />,
            title: "Memory Persistence",
            desc: "All scans and decisions are stored in 0G Storage, creating a long-term data layer."
          }
        ].map((feature, i) => (
          <div key={i} className="glass-card p-8 flex flex-col gap-4 hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold font-outfit">{feature.title}</h3>
            <p className="text-muted leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Agent Workflow Visual */}
      <section className="glass-card p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-primary/5 to-transparent -z-10"></div>
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 flex flex-col gap-6">
            <h2 className="text-3xl font-outfit font-bold">The Autonomous Loop</h2>
            <p className="text-muted">
              Sect8 agents don't just wait for you. They work 24/7 scanning HUD data, calculating Section 8 caps, and identifying the highest-yield properties before they hit the mainstream market.
            </p>
            <ul className="space-y-4">
              {[
                "Data Ingestion from Zillow & HUD",
                "Deep Financial Modeling on 0G Compute",
                "On-chain Logging of Recommendations",
                "Automated Portfolio Rebalancing"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full bg-black/40 rounded-2xl border border-white/5 p-6 font-mono text-xs text-blue-400 shadow-2xl">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <div className="space-y-2">
              <p><span className="text-zinc-500">[13:42:01]</span> Fetching latest data from HUD API...</p>
              <p><span className="text-zinc-500">[13:42:05]</span> Processing 1,240 properties in Detroit area.</p>
              <p><span className="text-zinc-500">[13:42:12]</span> <span className="text-white">Analysis complete.</span> Found 3 high-yield deals.</p>
              <p><span className="text-zinc-500">[13:42:15]</span> Calculating Section 8 ROI via 0G Compute...</p>
              <p><span className="text-zinc-500">[13:42:20]</span> <span className="text-green-400">Deal Identified:</span> 123 Maple St. (ROI: 16.4%)</p>
              <p><span className="text-zinc-500">[13:42:22]</span> Storing recommendation hash to 0G Storage...</p>
              <p><span className="text-zinc-500">[13:42:25]</span> <span className="text-purple-400">On-chain Log:</span> tx_0x8f32...a12c</p>
              <p className="animate-pulse">_</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
