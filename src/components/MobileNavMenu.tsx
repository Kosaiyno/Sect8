"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Market", href: "/market" },
  { label: "Watchlist", href: "/watchlist" },
];

export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  // Slightly reduced header height for mobile
  const headerOffset = 56; // px

  return (
    <>
      <button
        aria-label="Open navigation menu"
        className="flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#b8942f] lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-7 w-7 text-[#b8942f]" />
      </button>

      {open && (
        <div className="fixed left-0 right-0 top-0 bottom-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
          {/* Backdrop overlay with blur and dark tint */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-200"
            onClick={() => setOpen(false)}
            style={{ WebkitBackdropFilter: 'blur(4px)' }}
          />

          {/* Dropdown panel perfectly aligned with navbar, full width on mobile */}
          <div
            className="fixed left-0 right-0 top-0 z-[10000] flex justify-center"
            style={{ marginTop: `${headerOffset}px` }}
          >
            <nav className="bg-white w-full max-w-[600px] rounded-b-2xl shadow-2xl border-x border-b border-gray-100 px-4 pt-3 pb-2 flex flex-col animate-mobile-menu-open"
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="font-sora text-base font-bold tracking-tight text-[#0f1629] opacity-80">Sect8</span>
                <button
                  aria-label="Close navigation menu"
                  className="p-2 -mr-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b8942f]"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-6 w-6 text-[#b8942f]" />
                </button>
              </div>

              <div className="flex flex-col divide-y divide-gray-100">
                {navLinks.map((link, idx) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`block py-3 px-2 text-[16px] font-semibold text-[#0f1629] hover:bg-[#f8f9fb] rounded-lg transition ${idx === 0 ? "mt-1 font-bold text-[#b8942f]" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes mobile-menu-open {
          0% {
            opacity: 0;
            transform: translateY(-16px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-mobile-menu-open {
          animation: mobile-menu-open 0.22s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </>
  );
}
