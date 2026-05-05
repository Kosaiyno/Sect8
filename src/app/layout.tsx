import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import RouteWarmup from "@/components/RouteWarmup";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const inter = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Sora({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Sect8 | Section 8 Acquisition Platform",
  description: "Professional Section 8 acquisition workflows, underwriting, and 0G-backed market memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} antialiased min-h-screen flex flex-col`}>
        <Providers>
          <RouteWarmup />
          <div className="platform-bg" aria-hidden />
          <header className="fixed left-0 right-0 top-0 z-50 mx-4 mt-4 flex h-16 items-center justify-between rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(11,16,24,0.92),rgba(10,16,22,0.86))] px-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#59c7ff_0%,#2d7cff_55%,#0f3dad_100%)] shadow-[0_12px_30px_rgba(36,107,255,0.32)]">
                <span className="text-white font-bold text-xl">S8</span>
              </div>
              <div>
                <div className="font-outfit text-xl font-black tracking-tight text-white">Sect8</div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Section 8 Acquisition Platform</div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-white/58">
              <Link href="/" prefetch className="rounded-full px-4 py-2 transition-colors hover:bg-white/5 hover:text-white">Home</Link>
              <Link href="/dashboard" prefetch className="rounded-full px-4 py-2 transition-colors hover:bg-white/5 hover:text-white">Dashboard</Link>
              <Link href="/market" prefetch className="rounded-full px-4 py-2 transition-colors hover:bg-white/5 hover:text-white">Market</Link>
              <Link href="/watchlist" prefetch className="rounded-full px-4 py-2 transition-colors hover:bg-white/5 hover:text-white">Watchlist</Link>
            </nav>
            <div className="flex items-center gap-4">
              <ConnectButton />
            </div>
          </header>
          <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-4 pb-12 pt-24 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="relative z-10 min-h-0 h-auto border-t border-white/8 py-6 text-center text-xs text-white/38">
            © 2026 Sect8. Underwriting, market memory, and 0G-backed workflow infrastructure.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
