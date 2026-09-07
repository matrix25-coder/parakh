'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get('id');

  useEffect(() => {
    if (scanId) {
      router.replace(`/scan/${scanId}/review`);
    } else {
      router.replace('/scan');
    }
  }, [router, scanId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-4">
      <div className="w-8 h-8 border-4 border-[#0A2540] border-t-transparent animate-spin"></div>
      <p className="font-mono text-xs text-[#64748B]">Redirecting to inspection review...</p>
    </div>
  );
}

export default function ScanningProgressPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#64748B]">Loading...</div>}>
      <ProgressContent />
    </Suspense>
  );
}
