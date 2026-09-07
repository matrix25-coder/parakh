'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Native Bridge Component for Capacitor on Android
 * Handles hardware back-button navigation and safe-area adjustments.
 */
export function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    async function initCapacitor() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App: CapApp } = await import('@capacitor/app');

        // Handle Android hardware back-button
        const backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // If on home/dashboard, let Android handle minimize or prompt exit
          const pathname = window.location.pathname;
          if (pathname === '/' || pathname === '/dashboard' || pathname === '/login') {
            CapApp.exitApp();
          } else if (canGoBack) {
            window.history.back();
          } else {
            router.push('/dashboard');
          }
        });

        cleanup = () => {
          backListener.remove();
        };
      } catch (err) {
        console.warn('NativeBridge initialization note:', err);
      }
    }

    initCapacitor();

    return () => {
      if (cleanup) cleanup();
    };
  }, [router]);

  return null;
}
