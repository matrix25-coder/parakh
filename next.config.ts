import { withReticle } from '@reticlehq/next';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling native / server-only packages.
  // These are loaded by Node.js at runtime on the server and must NOT be
  // bundled (they contain native binaries or rely on Node built-ins that
  // webpack cannot resolve in a browser bundle).
  serverExternalPackages: [
    // Native image processing (prebuilt .node binaries for each arch/OS)
    'sharp',
    // Tesseract OCR worker (spawns a separate worker thread; cannot be bundled)
    'tesseract.js',
    // Node.js built-in sqlite (node:sqlite) – resolved at runtime, not bundle time
    'node:sqlite',
    // File system and crypto – already excluded by Next.js but listed for clarity
    'fs',
    'path',
    'crypto',
    'os',
  ],
};

export default withReticle(nextConfig);
