'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { getApiUrl } from '@/lib/api-config';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Store in localStorage as well for client-side state hydration
      if (typeof window !== 'undefined') {
        localStorage.setItem('parakh_user', JSON.stringify(data.user));
        if (process.env.NODE_ENV === 'development') {
          void import('@reticlehq/react').then(({ reticle }) => {
            reticle.signal('auth:granted');
          }).catch(() => {});
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-[#CBD5E1] shadow-xs p-6 sm:p-8 space-y-6">
          {/* Institutional Header */}
          <div className="border-b border-[#E2E8F0] pb-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#EA580C]"></span>
              <span className="text-[11px] font-mono uppercase text-[#64748B] tracking-wider font-bold">
                ENFORCEMENT OFFICER PORTAL
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#0A2540] font-sans">
              Sign In to Parakh
            </h1>
            <p className="text-xs text-[#475569]">
              Access packaged commodity compliance audits and inspection certificates.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-mono">
              <strong>Error: </strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-[#334155] font-sans font-semibold mb-1">
                Official Email Address *
              </label>
              <input
                type="email"
                required
                data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@parakh.gov.in"
                className="w-full px-3 py-2 bg-white text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#0A2540]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#334155] font-sans font-semibold">
                  Password *
                </label>
              </div>
              <input
                type="password"
                required
                data-testid="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-white text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#0A2540]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="w-full py-3 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin"></span>
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
            <span className="text-[#64748B]">No account yet?</span>
            <Link
              href="/signup"
              className="font-bold text-[#0A2540] hover:underline"
            >
              Register Officer Account &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
