'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  REFERENCE_SPECS,
  ReferenceTargetType,
  calibrateFromCoin,
  calibrateFromCard,
  CalibrationResult,
} from '@/lib/vision/optical-gauge';

export interface OpticalGaugeModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fieldToMeasure?: string;
  requiredHeightMm?: number;
  onSaveMeasurement: (field: string, measuredMm: number, pixelsPerMm: number) => void;
}

export function OpticalGaugeModal({
  isOpen,
  onClose,
  imageUrl,
  fieldToMeasure = 'net_quantity',
  requiredHeightMm = 2.0,
  onSaveMeasurement,
}: OpticalGaugeModalProps) {
  const [targetType, setTargetType] = useState<ReferenceTargetType>('RS5_COIN');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calibration tool position in canvas coords
  const [refX, setRefX] = useState<number>(80);
  const [refY, setRefY] = useState<number>(80);
  const [refSize, setRefSize] = useState<number>(100); // diameter for coin, width for card

  // Measurement caliper position
  const [caliperY, setCaliperY] = useState<number>(200);
  const [caliperHeightPx, setCaliperHeightPx] = useState<number>(24);

  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [activeDrag, setActiveDrag] = useState<'NONE' | 'REF_MOVE' | 'REF_RESIZE' | 'CALIPER_MOVE' | 'CALIPER_RESIZE'>('NONE');
  const [dragStartY, setDragStartY] = useState<number>(0);

  // Compute calibration on size change
  useEffect(() => {
    try {
      if (targetType === 'RS5_COIN') {
        const result = calibrateFromCoin(refSize);
        setCalibration(result);
      } else {
        const cardHeight = refSize / (REFERENCE_SPECS.ID1_CARD.aspectRatio || 1.5858);
        const result = calibrateFromCard(refSize, cardHeight);
        setCalibration(result);
      }
    } catch {
      // Ignore invalid intermediate values
    }
  }, [targetType, refSize]);

  // Draw overlay on canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = Math.min(800, img.naturalWidth || 600);
      canvas.height = Math.round((canvas.width * (img.naturalHeight || 400)) / (img.naturalWidth || 600));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 1. Draw Reference Calibration Target
      ctx.save();
      ctx.lineWidth = 2.5;
      if (targetType === 'RS5_COIN') {
        ctx.strokeStyle = '#F59E0B'; // Amber
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        const radius = refSize / 2;
        ctx.beginPath();
        ctx.arc(refX, refY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crosshairs
        ctx.strokeStyle = '#F59E0B';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(refX - radius - 10, refY);
        ctx.lineTo(refX + radius + 10, refY);
        ctx.moveTo(refX, refY - radius - 10);
        ctx.lineTo(refX, refY + radius + 10);
        ctx.stroke();

        // Label
        ctx.setLineDash([]);
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`₹5 COIN (23.0mm): ${refSize}px`, refX - 45, refY - radius - 8);
      } else {
        ctx.strokeStyle = '#3B82F6'; // Blue
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        const cardH = refSize / 1.5858;
        ctx.strokeRect(refX - refSize / 2, refY - cardH / 2, refSize, cardH);
        ctx.fillRect(refX - refSize / 2, refY - cardH / 2, refSize, cardH);

        ctx.fillStyle = '#3B82F6';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`ID-1 CARD (85.6mm): ${refSize}px`, refX - 50, refY - cardH / 2 - 8);
      }
      ctx.restore();

      // 2. Draw Measurement Caliper Bar
      ctx.save();
      const calX = canvas.width / 2;
      const calW = 160;
      ctx.strokeStyle = '#10B981'; // Emerald
      ctx.lineWidth = 2;

      // Top bar
      ctx.beginPath();
      ctx.moveTo(calX - calW / 2, caliperY);
      ctx.lineTo(calX + calW / 2, caliperY);
      // Bottom bar
      ctx.moveTo(calX - calW / 2, caliperY + caliperHeightPx);
      ctx.lineTo(calX + calW / 2, caliperY + caliperHeightPx);
      // Center connecting line
      ctx.moveTo(calX, caliperY);
      ctx.lineTo(calX, caliperY + caliperHeightPx);
      ctx.stroke();

      // Caliper background
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(calX - calW / 2, caliperY, calW, caliperHeightPx);

      // Reading badge
      const measuredMm = calibration?.pixelsPerMm ? Math.round((caliperHeightPx / calibration.pixelsPerMm) * 100) / 100 : 0;
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`CALIPER: ${measuredMm.toFixed(2)} mm (${caliperHeightPx}px)`, calX - 70, caliperY - 8);
      ctx.restore();
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, targetType, refX, refY, refSize, caliperY, caliperHeightPx, calibration]);

  if (!isOpen) return null;

  const pixelsPerMm = calibration?.pixelsPerMm || 1;
  const measuredMm = Math.round((caliperHeightPx / pixelsPerMm) * 100) / 100;
  const isCompliant = measuredMm >= requiredHeightMm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#0A2540] border-2 border-[#EA580C] text-white max-w-4xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700 pb-3">
          <div>
            <h3 className="font-mono font-bold text-base text-white flex items-center gap-2">
              <span className="text-[#EA580C]">📐</span> AR Optical Calibration Gauge (Rule 9 Table I)
            </h3>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Calibrate sub-millimeter scale using a standard reference coin or ID card in the package focal plane.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-mono font-bold text-lg">✕</button>
        </div>

        {/* Reference Target Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => { setTargetType('RS5_COIN'); setRefSize(90); }}
            className={`p-2.5 text-left font-mono text-xs border transition-colors ${
              targetType === 'RS5_COIN'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>🪙</span> Indian ₹5 Coin
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fixed Diameter: 23.0 mm</div>
          </button>

          <button
            type="button"
            onClick={() => { setTargetType('ID1_CARD'); setRefSize(160); }}
            className={`p-2.5 text-left font-mono text-xs border transition-colors ${
              targetType === 'ID1_CARD'
                ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>💳</span> ISO ID-1 Card
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Aadhaar/Debit: 85.60 × 53.98 mm</div>
          </button>

          <div className="bg-slate-900 p-2.5 border border-slate-700 font-mono text-xs flex flex-col justify-center">
            <div className="text-slate-400 text-[10px] uppercase">Scale Calibration Ratio</div>
            <div className="text-white font-bold text-sm">
              {pixelsPerMm.toFixed(2)} <span className="text-xs text-slate-400">px / mm</span>
            </div>
            <div className="text-emerald-400 text-[10px]">
              Confidence: {Math.round((calibration?.confidenceScore || 0.9) * 100)}%
            </div>
          </div>
        </div>

        {/* Interactive Canvas */}
        <div className="bg-slate-950 border border-slate-700 p-2 flex items-center justify-center overflow-auto max-h-[50vh]">
          <canvas ref={canvasRef} className="max-w-full rounded-xs shadow-md cursor-crosshair" />
        </div>

        {/* Fine Tuning Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/90 p-3 border border-slate-700 font-mono text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 font-bold">Adjust Reference Reticle Size:</span>
              <span className="text-white">{refSize} px</span>
            </div>
            <input
              type="range"
              min={30}
              max={300}
              value={refSize}
              onChange={(e) => setRefSize(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Position X:</span>
              <input
                type="range"
                min={20}
                max={500}
                value={refX}
                onChange={(e) => setRefX(parseInt(e.target.value))}
                className="w-24 accent-slate-400"
              />
              <span>Position Y:</span>
              <input
                type="range"
                min={20}
                max={400}
                value={refY}
                onChange={(e) => setRefY(parseInt(e.target.value))}
                className="w-24 accent-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-400 font-bold">Adjust Measurement Caliper Height:</span>
              <span className="text-white font-bold">{measuredMm.toFixed(2)} mm ({caliperHeightPx} px)</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={caliperHeightPx}
              onChange={(e) => setCaliperHeightPx(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Caliper Y Position:</span>
              <input
                type="range"
                min={20}
                max={400}
                value={caliperY}
                onChange={(e) => setCaliperY(parseInt(e.target.value))}
                className="w-32 accent-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Verification Result Banner */}
        <div className={`p-3 border font-mono text-xs flex flex-wrap items-center justify-between gap-3 ${
          isCompliant
            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
            : 'bg-rose-950/60 border-rose-500 text-rose-200'
        }`}>
          <div>
            <div className="font-bold text-sm flex items-center gap-1.5">
              <span>{isCompliant ? '✅ STATUTORY PASS' : '❌ STATUTORY VIOLATION'}</span>
              <span className="text-xs font-normal">
                (Measured: {measuredMm.toFixed(2)} mm | Required: {requiredHeightMm.toFixed(1)} mm)
              </span>
            </div>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isCompliant
                ? `Numeral complies with Rule 9 Table I (+${(measuredMm - requiredHeightMm).toFixed(2)} mm margin).`
                : `Infringement: Numeral is ${(requiredHeightMm - measuredMm).toFixed(2)} mm below the statutory minimum height.`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSaveMeasurement(fieldToMeasure, measuredMm, pixelsPerMm);
                onClose();
              }}
              className="px-4 py-1.5 bg-[#EA580C] hover:bg-orange-600 text-white font-mono font-bold text-xs"
            >
              Apply Measurement to Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
