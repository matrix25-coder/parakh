'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  REFERENCE_SPECS,
  ReferenceTargetType,
  calibrateFromCoin,
  calibrateFromCard,
  CalibrationResult,
  autoPerformOpticalGauge,
} from '@/lib/vision/optical-gauge';

export interface CaliperDetails {
  caliperX: number;
  caliperY: number;
  caliperHeightPx: number;
  measuredMm: number;
  pixelsPerMm: number;
  gaugeMode?: 'AUTO' | 'MANUAL';
  targetType?: ReferenceTargetType;
}

export interface OpticalGaugeModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fieldToMeasure?: string;
  requiredHeightMm?: number;
  initialCaliperX?: number;
  initialCaliperY?: number;
  initialCaliperHeightPx?: number;
  initialGaugeMode?: 'AUTO' | 'MANUAL';
  boundingBoxes?: Record<string, any>;
  onSaveMeasurement: (
    field: string,
    measuredMm: number,
    pixelsPerMm: number,
    caliperDetails?: CaliperDetails
  ) => void;
}

export function OpticalGaugeModal({
  isOpen,
  onClose,
  imageUrl,
  fieldToMeasure = 'net_quantity',
  requiredHeightMm = 2.0,
  initialCaliperX,
  initialCaliperY,
  initialCaliperHeightPx,
  initialGaugeMode = 'AUTO',
  boundingBoxes = {},
  onSaveMeasurement,
}: OpticalGaugeModalProps) {
  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>(initialGaugeMode);
  const [targetType, setTargetType] = useState<ReferenceTargetType>('RS5_COIN');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute auto coordinates initially
  const defaultAuto = autoPerformOpticalGauge({
    boundingBoxes,
    canvasWidth: 800,
    canvasHeight: 500,
  });

  // Calibration tool position in canvas coords
  const [refX, setRefX] = useState<number>(defaultAuto.refX || 80);
  const [refY, setRefY] = useState<number>(defaultAuto.refY || 80);
  const [refSize, setRefSize] = useState<number>(defaultAuto.refSize || 92); // diameter for coin, width for card

  // Measurement caliper position
  const [caliperX, setCaliperX] = useState<number>(initialCaliperX || defaultAuto.caliperX || 348);
  const [caliperY, setCaliperY] = useState<number>(initialCaliperY || defaultAuto.caliperY || 240);
  const [caliperHeightPx, setCaliperHeightPx] = useState<number>(initialCaliperHeightPx || defaultAuto.caliperHeightPx || 26);

  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [activeDrag, setActiveDrag] = useState<'NONE' | 'REF_MOVE' | 'REF_RESIZE' | 'CALIPER_MOVE' | 'CALIPER_RESIZE'>('NONE');
  const [dragStartY, setDragStartY] = useState<number>(0);

  // Sync state when modal opens with new or updated props
  useEffect(() => {
    if (isOpen) {
      if (initialGaugeMode) setMode(initialGaugeMode);
      if (initialCaliperX !== undefined) setCaliperX(initialCaliperX);
      if (initialCaliperY !== undefined) setCaliperY(initialCaliperY);
      if (initialCaliperHeightPx !== undefined) setCaliperHeightPx(initialCaliperHeightPx);
      if (!initialCaliperX) {
        const auto = autoPerformOpticalGauge({
          boundingBoxes,
          canvasWidth: 800,
          canvasHeight: 500,
        });
        setCaliperX(auto.caliperX);
        setCaliperY(auto.caliperY);
        setCaliperHeightPx(auto.caliperHeightPx);
        setRefSize(auto.refSize);
        setRefX(auto.refX);
        setRefY(auto.refY);
        setTargetType(auto.referenceTarget);
      }
    }
  }, [isOpen, initialCaliperX, initialCaliperY, initialCaliperHeightPx, initialGaugeMode]);

  // Auto-align caliper and reference reticle based on AI bounding boxes
  const handleAutoDetect = () => {
    const auto = autoPerformOpticalGauge({
      boundingBoxes,
      canvasWidth: canvasRef.current?.width || 800,
      canvasHeight: canvasRef.current?.height || 500,
    });
    setMode('AUTO');
    setCaliperX(auto.caliperX);
    setCaliperY(auto.caliperY);
    setCaliperHeightPx(auto.caliperHeightPx);
    setRefSize(auto.refSize);
    setRefX(auto.refX);
    setRefY(auto.refY);
    setTargetType(auto.referenceTarget);
  };

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
      const calX = caliperX;
      const calW = 160;
      const isAuto = mode === 'AUTO';
      ctx.strokeStyle = isAuto ? '#10B981' : '#F59E0B'; // Emerald for Auto, Amber for Manual
      ctx.lineWidth = 2.5;

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
      ctx.fillStyle = isAuto ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(calX - calW / 2, caliperY, calW, caliperHeightPx);

      // Reading badge
      const measuredMm = calibration?.pixelsPerMm ? Math.round((caliperHeightPx / calibration.pixelsPerMm) * 100) / 100 : 0;
      ctx.fillStyle = isAuto ? '#10B981' : '#F59E0B';
      ctx.font = 'bold 12px monospace';
      const modeTag = isAuto ? '🟢 AUTO' : '✏️ MANUAL';
      ctx.fillText(`${modeTag} CALIPER: ${measuredMm.toFixed(2)} mm (X:${calX}px, Y:${caliperY}px)`, Math.max(10, calX - 85), caliperY - 8);
      ctx.restore();
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, targetType, refX, refY, refSize, caliperX, caliperY, caliperHeightPx, calibration, mode]);

  if (!isOpen) return null;

  const pixelsPerMm = calibration?.pixelsPerMm || 1;
  const measuredMm = Math.round((caliperHeightPx / pixelsPerMm) * 100) / 100;
  const isCompliant = measuredMm >= requiredHeightMm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#0A2540] border-2 border-[#EA580C] text-white max-w-4xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#EA580C] text-lg">📐</span>
              <h3 className="font-bold text-base text-white uppercase">
                AR Optical Calibration Gauge (Rule 9 Table I)
              </h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                mode === 'AUTO'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                  : 'bg-amber-950 text-amber-300 border-amber-500'
              }`}>
                {mode === 'AUTO' ? '🟢 Auto AI Mode' : '✏️ Officer Manual Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans mt-1">
              Sub-millimeter numeral height measurement. Gauge operates automatically by AI vision, and can be manually adjusted or fine-tuned at any time.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
        </div>

        {/* Mode Selector & Quick Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border border-slate-700 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Measurement Mode:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAutoDetect}
                className={`px-3 py-1 font-bold text-xs border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mode === 'AUTO'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span>🟢</span>
                <span>Auto-Calibrated (Done by Itself)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('MANUAL')}
                className={`px-3 py-1 font-bold text-xs border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mode === 'MANUAL'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span>✏️</span>
                <span>Manual Mode (Officer Control)</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoDetect}
            className="px-3 py-1.5 bg-[#EA580C] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Auto-detect numeral coordinates and align caliper automatically"
          >
            <span>⚡</span>
            <span>Auto-Align Caliper</span>
          </button>
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
              onChange={(e) => {
                setMode('MANUAL');
                setRefSize(parseInt(e.target.value));
              }}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Position X:</span>
              <input
                type="range"
                min={20}
                max={500}
                value={refX}
                onChange={(e) => {
                  setMode('MANUAL');
                  setRefX(parseInt(e.target.value));
                }}
                className="w-24 accent-slate-400"
              />
              <span>Position Y:</span>
              <input
                type="range"
                min={20}
                max={400}
                value={refY}
                onChange={(e) => {
                  setMode('MANUAL');
                  setRefY(parseInt(e.target.value));
                }}
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
              onChange={(e) => {
                setMode('MANUAL');
                setCaliperHeightPx(parseInt(e.target.value));
              }}
              className="w-full accent-emerald-500"
            />
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div className="flex items-center justify-between gap-1">
                <span>Caliper X:</span>
                <input
                  type="range"
                  min={20}
                  max={600}
                  value={caliperX}
                  onChange={(e) => {
                    setMode('MANUAL');
                    setCaliperX(parseInt(e.target.value));
                  }}
                  className="w-20 sm:w-24 accent-emerald-400"
                />
                <span className="text-white font-mono text-[9px] w-8 text-right">{caliperX}px</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span>Caliper Y:</span>
                <input
                  type="range"
                  min={20}
                  max={450}
                  value={caliperY}
                  onChange={(e) => {
                    setMode('MANUAL');
                    setCaliperY(parseInt(e.target.value));
                  }}
                  className="w-20 sm:w-24 accent-slate-400"
                />
                <span className="text-white font-mono text-[9px] w-8 text-right">{caliperY}px</span>
              </div>
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
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                mode === 'AUTO'
                  ? 'bg-emerald-900/80 text-emerald-300 border-emerald-500'
                  : 'bg-amber-900/80 text-amber-300 border-amber-500'
              }`}>
                {mode === 'AUTO' ? '🟢 Automated AI Measurement' : '👤 Officer Manual Adjustment'}
              </span>
            </div>
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
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSaveMeasurement(fieldToMeasure, measuredMm, pixelsPerMm, {
                  caliperX,
                  caliperY,
                  caliperHeightPx,
                  measuredMm,
                  pixelsPerMm,
                  gaugeMode: mode,
                  targetType,
                });
                onClose();
              }}
              className="px-4 py-1.5 bg-[#EA580C] hover:bg-orange-600 text-white font-mono font-bold text-xs cursor-pointer shadow-xs"
            >
              Apply Measurement to Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
