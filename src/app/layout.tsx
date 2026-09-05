import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Archivo, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PARAKH — Packaged Commodity Compliance Verification System",
  description:
    "Digital compliance verification platform validating packaged commodity declarations against the Legal Metrology (Packaged Commodities) Rules, 2011.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${archivo.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('unhandledrejection', function(event) {
                  var r = event.reason;
                  var str = r && (r.message || r.stack || String(r)) || '';
                  if (str.indexOf('chrome-extension://') !== -1 || str.indexOf('chrome: call method') !== -1) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
                window.addEventListener('error', function(event) {
                  var str = (event.filename || '') + ' ' + (event.message || '');
                  if (str.indexOf('chrome-extension://') !== -1 || str.indexOf('chrome: call method') !== -1) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#1E3A8A] selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
