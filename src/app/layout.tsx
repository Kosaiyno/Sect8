import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import RouteWarmup from "@/components/RouteWarmup";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const inter = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Sora({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Sect8 | Institutional Section 8 Real Estate Intelligence",
  description: "AI-powered Section 8 acquisition platform with institutional-grade underwriting, property dossiers, and 0G-backed market memory.",
  icons: {
    icon: "/sect8%20logo.png?v=3",
    shortcut: "/sect8%20logo.png?v=3",
    apple: "/sect8%20logo.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${outfit.variable} antialiased min-h-screen flex flex-col bg-[#f8f9fb] text-[#0f1629]`}>
        <Providers>
          <RouteWarmup />
          <div className="platform-bg" aria-hidden />

          {/* ─── HEADER ─── */}
          <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-8 sm:pt-6">
            <div className="mx-auto max-w-[1440px]">
              <div className="flex h-[72px] items-center justify-between rounded-[24px] border border-white/40 bg-white/70 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                  <div className="flex items-center justify-center transition-all group-hover:scale-105">
                    <Image
                      src="/sect8%20logo.png?v=3"
                      alt="Sect8"
                      width={76}
                      height={76}
                      className="object-contain"
                      unoptimized
                      priority
                    />
                  </div>
                  <div className="font-sora text-[2.3rem] font-extrabold tracking-tight text-[#0f1629] leading-none" style={{letterSpacing: '-0.04em'}}>Sect8</div>
                </Link>

                {/* Nav */}
                <nav className="hidden lg:flex items-center gap-2 p-1 rounded-full bg-[#f8f9fb]/50 border border-gray-100">
                  {[
                    { label: 'Home', href: '/' },
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Market', href: '/market' },
                    { label: 'Watchlist', href: '/watchlist' }
                  ].map((link) => (
                    <Link 
                      key={link.label} 
                      href={link.href} 
                      prefetch 
                      className="rounded-full px-5 py-2 text-[13px] font-black uppercase tracking-wider text-[#64748b] transition-all hover:text-[#0f1629] hover:bg-white hover:shadow-sm"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Wallet */}
                <div className="flex items-center gap-4">
                  <div className="h-8 w-px bg-gray-200 hidden sm:block" />
                  <ConnectButton />
                </div>
              </div>
            </div>
          </header>

          {/* ─── MAIN ─── */}
          <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-4 pb-20 pt-28 sm:px-8">
            {children}
          </main>

          {/* ─── FOOTER ─── */}
          <footer className="relative z-10 bg-white border-t border-gray-100">
            <div className="mx-auto max-w-[1440px] px-8 py-16 lg:py-20">
              <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
                {/* Brand */}
                <div className="lg:col-span-4 space-y-6">
                  <Link href="/" className="flex items-center gap-3 group">
                    <div className="flex items-center justify-center transition-all group-hover:scale-105">
                      <Image src="/sect8%20logo.png?v=3" alt="Sect8" width={56} height={56} className="object-contain" unoptimized />
                    </div>
                    <span className="font-outfit text-3xl font-black tracking-[-0.06em] text-[#0f1629]">Sect8</span>
                  </Link>
                  <p className="text-base leading-8 text-[#64748b] font-medium max-w-sm">
                    AI-powered Section 8 acquisition platform. Institutional-grade underwriting with 0G-backed compute and on-chain agent memory.
                  </p>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full border border-gray-100 flex items-center justify-center text-[#64748b] hover:border-[#b8942f] hover:text-[#b8942f] transition-all cursor-pointer">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="lg:col-span-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                    <div>
                      <div className="mb-6 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Platform</div>
                      <div className="flex flex-col gap-4 text-[15px] font-bold text-[#64748b]">
                        <Link href="/dashboard" className="transition-colors hover:text-[#0f1629]">Dashboard</Link>
                        <Link href="/market" className="transition-colors hover:text-[#0f1629]">Market Feed</Link>
                        <Link href="/watchlist" className="transition-colors hover:text-[#0f1629]">Sourcing List</Link>
                      </div>
                    </div>
                    <div>
                      <div className="mb-6 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8942f]">Infrastructure</div>
                      <div className="flex flex-col gap-4 text-[15px] font-bold text-[#64748b]">
                        <span className="cursor-default">0G Compute</span>
                        <span className="cursor-default">0G Storage</span>
                        <span className="cursor-default">0G Settlement</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              <div className="mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between gap-6">
                <div className="text-sm font-medium text-[#94a3b8]">
                  © 2026 Sect8. Institutional real estate intelligence.
                </div>
                <div className="flex gap-8 text-sm font-bold text-[#94a3b8]">
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#0d9668]" />
                    0G Network Operational
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
