import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Sect8 | AI Agent for Real Estate",
  description: "Autonomous AI agent scanning Section 8 opportunities on 0G.",
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
          <header className="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 h-16 flex items-center px-6 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center">
                <span className="text-white font-bold text-xl">S8</span>
              </div>
              <span className="font-outfit font-bold text-xl tracking-tight">Sect8</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/market" className="hover:text-primary transition-colors">Market</Link>
            </nav>
            <div className="flex items-center gap-4">
              <ConnectButton />
            </div>
          </header>
          <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
          <footer className="py-6 border-t border-border/50 text-center text-muted text-xs min-h-0 h-auto">
            © 2026 Sect8 AI. Powered by 0G Stack.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
