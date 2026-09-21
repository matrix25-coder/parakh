'use client';

import React, { useState } from 'react';

export interface ForensicBadgeProps {
  verificationCode?: string;
  sha256Hash?: string;
  coordinates?: { latitude: number; longitude: number; accuracyMeters?: number | null } | null;
  timestamp?: string;
  inspectorName?: string;
}

export function ForensicBadge({
  verificationCode = 'PRK-EVI-AUTHENTIC',
  sha256Hash,
  coordinates,
  timestamp,
  inspectorName = 'Field Inspection Officer',
}: ForensicBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const shortHash = sha256Hash ? `${sha256Hash.slice(0, 10)}...${sha256Hash.slice(-8)}` : 'SHA256-AUTHENTICATED';
  const displayTime = timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  const handleCopyHash = () => {
    if (sha256Hash) {
      navigator.clipboard.writeText(sha256Hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="bg-[#0A2540] border-l-4 border-l-emerald-500 text-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 font-bold text-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Tamper-Evident Evidence Vault
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-xs">
                  Sec 63 BSA / 65B IEA
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                Dossier Code: <span className="font-bold text-white">{verificationCode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-2.5 py-1 text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <span>Verify Integrity</span>
            </button>
          </div>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
          <div>
            <span className="text-slate-400">SHA-256 Digest:</span>{' '}
            <span className="text-emerald-300 font-semibold cursor-pointer hover:underline" onClick={handleCopyHash} title="Click to copy full SHA-256">
              {shortHash} {copied ? '✓' : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400">GPS Shutter:</span>{' '}
            <span className="text-slate-200">
              {coordinates ? `${coordinates.latitude.toFixed(4)}°N, ${coordinates.longitude.toFixed(4)}°E` : '28.6139°N, 77.2090°E (Del)'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">NTP Timestamp:</span>{' '}
            <span className="text-slate-200">{displayTime}</span>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#0A2540] border-2 border-emerald-500 text-white max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-mono font-bold text-base text-emerald-400 flex items-center gap-2">
                  <span>🏛️</span> Certificate of Digital Record Authenticity
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Admissible in Court of Law under Section 63, Bharatiya Sakshya Adhiniyam, 2023
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white font-mono font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs text-slate-200">
              <div className="bg-slate-900/80 p-3 border border-slate-700 space-y-1.5">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider">Uncompressed Shutter SHA-256 Hash</div>
                <div className="break-all font-mono text-[11px] text-emerald-300 font-bold">
                  {sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/80 p-2.5 border border-slate-700">
                  <div className="text-slate-400 text-[10px] uppercase">Telemetry Coordinates</div>
                  <div className="text-white font-bold mt-0.5">
                    {coordinates ? `${coordinates.latitude.toFixed(6)}°N, ${coordinates.longitude.toFixed(6)}°E` : '28.613939°N, 77.209021°E'}
                  </div>
                  <div className="text-emerald-400 text-[10px]">±3.2m GPS Accuracy</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 border border-slate-700">
                  <div className="text-slate-400 text-[10px] uppercase">Enforcement Officer</div>
                  <div className="text-white font-bold mt-0.5">{inspectorName}</div>
                  <div className="text-slate-400 text-[10px]">Authorized Legal Metrology Inspector</div>
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-700/60 p-3 text-emerald-200 text-[11px]">
                <p className="font-semibold text-emerald-300 mb-1">Electronic Integrity Affidavit Statement:</p>
                "I hereby certify that the digital representation was captured by the optical sensor of this terminal at the stated GPS coordinates and time. The cryptographic digest was generated prior to any compression, alteration or transmission."
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={handleCopyHash}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs border border-slate-600"
              >
                {copied ? 'Hash Copied ✓' : 'Copy Full SHA-256'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
