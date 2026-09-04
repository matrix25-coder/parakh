'use client';

import React from 'react';
import { Sidebar } from './sidebar';

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-[calc(100vh-61px)] bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-full overflow-x-hidden bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </main>
    </div>
  );
}
