'use client';
import { useEffect } from 'react';

/** Dev-only: connect Reticle + install the React adapter, after hydration. */
export function ReticleDev() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    void import('@reticlehq/react').then(
      ({ reticle, install, registerCapabilities }) => {
        install();
        // Both provided by withReticle() in next.config. The bridge rejects a connect with no token;
        // the root makes source paths repo-relative instead of absolute.
        const token = process.env.NEXT_PUBLIC_RETICLE_TOKEN || '60a14c14fd56453250512107d961ca6b621624f773496af0';
        const root = process.env.NEXT_PUBLIC_RETICLE_ROOT;
        const url = process.env.NEXT_PUBLIC_RETICLE_URL || 'ws://localhost:4400/reticle';
        reticle.connect({
          projectId: 'parakh-00e4ed24',
          url,
          ...(token ? { token } : {}),
          ...(root ? { root } : {}),
        });

        registerCapabilities({
          testids: ['login-email', 'login-password', 'login-submit', 'officer-dashboard'],
          signals: ['auth:granted'],
          stores: [],
        });
      },
    );
  }, []);
  return null;
}
