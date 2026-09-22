/**
 * PARAKH REGULATORY INSPECTION PLATFORM — API CONFIGURATION
 * 
 * Configures how client components & mobile Capacitor WebViews reach the PARAKH backend.
 * 
 * IMPORTANT:
 * - On web browsers, relative URLs ('/api/...') automatically use the origin.
 * - On Android phones/emulators:
 *     - 'localhost' / '127.0.0.1' points to the phone itself, NOT your computer.
 *     - Set NEXT_PUBLIC_API_BASE_URL to your computer's LAN IP for dev (e.g. http://192.168.1.10:3000)
 *       or for Android emulator (http://10.0.2.2:3000).
 *     - In production, set NEXT_PUBLIC_API_BASE_URL to your deployed PARAKH backend URL.
 */

// Production & Development URL Configuration
// When deploying to production, set this environment variable in your deployment environment or .env.local:
// NEXT_PUBLIC_API_BASE_URL=https://YOUR-PARAKH-BACKEND
export const API_CONFIG = {
  // Configured with deployed PARAKH Vercel production server URL
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://parakh-five.vercel.app').trim().replace(/\/$/, ''),
  
  // Timeout for network inspection calls (60 seconds for multimodal OCR analysis)
  requestTimeoutMs: 60000,
};

/**
 * Returns a fully-qualified API URL if a custom base URL is configured,
 * or the relative path when running in standard web mode.
 * 
 * @param path API path, e.g. '/api/scan' or 'api/history'
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    const isCapacitor = typeof (window as any).Capacitor?.isNativePlatform === 'function' 
      ? (window as any).Capacitor.isNativePlatform() 
      : window.location.protocol === 'capacitor:';
    if (!isCapacitor) {
      return normalizedPath;
    }
  }
  if (API_CONFIG.baseUrl) {
    return `${API_CONFIG.baseUrl}${normalizedPath}`;
  }
  return normalizedPath;
}
