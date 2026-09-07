import type { CapacitorConfig } from '@capacitor/cli';

/**
 * PARAKH Capacitor Configuration
 * 
 * Configured for the Legal Metrology Compliance Inspection Platform.
 * 
 * Environment Variables:
 * - CAPACITOR_SERVER_URL: Optional remote/hosted server URL.
 *     Development: "http://<YOUR_LAN_IP>:3000" or "http://10.0.2.2:3000" (Android Emulator)
 *     Production: "https://YOUR-PARAKH-BACKEND"
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL || undefined;

const config: CapacitorConfig = {
  appId: 'com.parakh.app',
  appName: 'PARAKH',
  webDir: 'public',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
      }
    : {
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
