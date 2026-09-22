import type { CapacitorConfig } from '@capacitor/cli';

/**
 * PARAKH Capacitor Configuration
 * 
 * Configured for the Legal Metrology Compliance Inspection Platform.
 * 
 * Environment Variables:
 * - CAPACITOR_SERVER_URL: Optional remote/hosted server URL.
 *     Development: "http://<YOUR_LAN_IP>:3000" or "http://10.0.2.2:3000" (Android Emulator)
 */
// Production deployed URL on Vercel
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://parakh-matrix-9f70.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.parakh.app',
  appName: 'PARAKH',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0A2540',
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
    },
  },
};

export default config;
