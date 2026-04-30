import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
export const metadata = {
    title: "Sect8 | AI Agent for Real Estate",
    description: "Autonomous AI agent scanning Section 8 opportunities on 0G.",
};
export default function RootLayout({ children, }) {
    return (_jsx("html", { lang: "en", className: "dark", children: _jsx("body", { className: `${inter.variable} ${outfit.variable} antialiased min-h-screen flex flex-col`, children: _jsxs(Providers, { children: [_jsxs("header", { className: "fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 h-16 flex items-center px-6 justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-lg premium-gradient flex items-center justify-center", children: _jsx("span", { className: "text-white font-bold text-xl", children: "S8" }) }), _jsx("span", { className: "font-outfit font-bold text-xl tracking-tight", children: "Sect8" })] }), _jsxs("nav", { className: "hidden md:flex items-center gap-8 text-sm font-medium", children: [_jsx(Link, { href: "/", className: "hover:text-primary transition-colors", children: "Home" }), _jsx(Link, { href: "/dashboard", className: "hover:text-primary transition-colors", children: "Dashboard" }), _jsx(Link, { href: "/market", className: "hover:text-primary transition-colors", children: "Market" })] }), _jsx("div", { className: "flex items-center gap-4", children: _jsx(ConnectButton, {}) })] }), _jsx("main", { className: "flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full", children: children }), _jsx("footer", { className: "py-6 border-t border-border/50 text-center text-muted text-xs min-h-0 h-auto", children: "\u00A9 2026 Sect8 AI. Powered by 0G Stack." })] }) }) }));
}
