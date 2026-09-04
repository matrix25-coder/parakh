'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Inspections', href: '/inspections' },
    { name: 'Reports', href: '/reports' },
    { name: 'Compare', href: '/compare' },
  ];

  return (
    <header className="sticky top-0 z-50 select-none bg-white shadow-xs">
      {/* Top Accessibility & Regulatory Reference Bar */}
      <div className="bg-[#F1F5F9] border-b border-[#E2E8F0] px-4 md:px-8 py-1.5 text-[11px] text-[#475569] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 bg-[#EA580C]"></span>
          <span className="font-semibold text-[#0F172A]">
            PARAKH &bull; Legal Metrology Packaged Commodity Inspection Platform
          </span>
          <span className="text-[#CBD5E1] hidden sm:inline">|</span>
          <span className="hidden sm:inline text-[10px] text-[#64748B]">
            Rules GSR 202(E)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-[#64748B] text-[9px] mr-1">FONT:</span>
            <button className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer">A-</button>
            <button className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold hover:bg-[#E2E8F0] cursor-pointer">A</button>
            <button className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer">A+</button>
          </div>
          <span className="text-[#CBD5E1]">|</span>
          <span className="text-[#0A2540] font-bold cursor-pointer">English</span>
          <span className="text-[#64748B] hover:text-[#0F172A] cursor-pointer">हिन्दी</span>
        </div>
      </div>

      {/* Main Brand & Navigation Strip */}
      <nav className="h-[64px] bg-white text-[#0F172A] border-b border-[#E2E8F0] flex items-center px-4 md:px-8 justify-between">
        {/* Brand Area */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-[#0A2540] flex items-center justify-center text-white shrink-0 shadow-xs border-b-2 border-b-[#EA580C]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M12 3v18" />
              <path d="M5 7l7-4 7 4" />
              <path d="M5 7v4c0 3 3 6 7 7 4-1 7-4 7-7V7" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider font-sans text-[#0A2540]">
                PARAKH
              </span>
              <span className="hidden lg:inline text-[9px] font-mono font-bold bg-[#F8FAFC] text-[#0A2540] border border-[#CBD5E1] px-1.5 py-0.2">
                REGULATORY SYSTEM
              </span>
            </div>
            <span className="text-[10px] text-[#64748B] tracking-wide font-sans">
              Packaged Commodity Compliance Verification System
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-xs font-semibold tracking-wide transition-colors py-1 ${
                  isActive
                    ? 'text-[#0A2540] border-b-2 border-[#EA580C]'
                    : 'text-[#475569] hover:text-[#0A2540]'
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {/* Primary Action Button: Start Inspection */}
          <Link
            href="/scan"
            className="px-4 py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-semibold text-xs tracking-wide transition-all shadow-xs flex items-center gap-2 border-t-2 border-t-[#EA580C]"
          >
            <span>Start Inspection</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-[#0A2540]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="absolute top-[96px] left-0 w-full bg-white border-b border-[#E2E8F0] md:hidden flex flex-col p-4 shadow-xl z-50 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="py-2 px-3 text-xs font-semibold text-[#475569] hover:text-[#0A2540] hover:bg-[#F1F5F9]"
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/scan"
              onClick={() => setIsOpen(false)}
              className="py-2.5 px-4 bg-[#0A2540] text-white font-semibold text-xs text-center border-t-2 border-t-[#EA580C]"
            >
              Start Inspection &rarr;
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
