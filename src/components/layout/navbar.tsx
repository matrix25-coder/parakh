'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check local storage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('parakh_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {}
      }
    }

    // Verify session with server
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('parakh_user', JSON.stringify(data.user));
          }
        } else {
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('parakh_user');
          }
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parakh_user');
    }
    setUser(null);
    router.push('/login');
    router.refresh();
  };

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

        <div className="flex items-center gap-2 font-mono text-[10px] text-[#64748B]">
          <span>Department of Consumer Affairs</span>
          <span className="text-[#CBD5E1]">&bull;</span>
          <span>Government of India</span>
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
        <div className="hidden md:flex items-center gap-5">
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

          {/* User Status / Login */}
          {user ? (
            <div className="flex items-center gap-2 font-mono text-xs bg-[#F8FAFC] border border-[#CBD5E1] px-2.5 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#15803D]"></div>
              <span className="font-bold text-[#0A2540] truncate max-w-[130px]" title={user.name}>
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-[11px] text-[#64748B] hover:text-[#B91C1C] ml-1 pl-1 border-l border-[#CBD5E1] cursor-pointer"
                title="Sign Out"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-mono font-bold text-[#0A2540] hover:text-[#1E3A8A] px-3 py-1.5 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] transition-colors"
            >
              Sign In
            </Link>
          )}

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

            {user ? (
              <div className="p-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#0A2540]">{user.name}</span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="text-[#B91C1C] font-bold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="py-2 px-3 text-xs font-mono font-bold text-[#0A2540] border border-[#CBD5E1] text-center"
              >
                Sign In
              </Link>
            )}

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
