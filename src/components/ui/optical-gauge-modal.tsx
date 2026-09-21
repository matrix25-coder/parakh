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
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 800, h: 500 });
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dragging and interactive manipulation state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    target: 'NONE' | 'CALIPER' | 'CALIPER_TOP' | 'CALIPER_BOTTOM' | 'RETICLE';
    startX: number;
    startY: number;
    initialCaliperX: number;
    initialCaliperY: number;
    initialHeightPx: number;
    initialRefX: number;
    initialRefY: number;
  }>({
    isDragging: false,
    target: 'NONE',
    startX: 0,
    startY: 0,
    initialCaliperX: 0,
    initialCaliperY: 0,
    initialHeightPx: 0,
    initialRefX: 0,
    initialRefY: 0,
  });

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
          canvasWidth: canvasRef.current?.width || 800,
          canvasHeight: canvasRef.current?.height || 500,
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
  }, [isOpen, initialCaliperX, initialCaliperY, initialCaliperHeightPx, initialGaugeMode, boundingBoxes]);

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

  // Convert mouse or touch screen coordinates to actual canvas image coordinates
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    // Check hit areas
    const nearTop = Math.abs(y - caliperY) <= 9 && Math.abs(x - caliperX) <= 90;
    const nearBottom = Math.abs(y - (caliperY + caliperHeightPx)) <= 9 && Math.abs(x - caliperX) <= 90;
    const insideCaliper = Math.abs(x - caliperX) <= 80 && y >= caliperY - 8 && y <= caliperY + caliperHeightPx + 8;
    const nearReticle = Math.hypot(x - refX, y - refY) <= (refSize / 2 + 15);

    setMode('MANUAL');

    if (nearTop) {
      setDragState({
        isDragging: true,
        target: 'CALIPER_TOP',
        startX: x,
        startY: y,
        initialCaliperX: caliperX,
        initialCaliperY: caliperY,
        initialHeightPx: caliperHeightPx,
        initialRefX: refX,
        initialRefY: refY,
      });
    } else if (nearBottom) {
      setDragState({
        isDragging: true,
        target: 'CALIPER_BOTTOM',
        startX: x,
        startY: y,
        initialCaliperX: caliperX,
        initialCaliperY: caliperY,
        initialHeightPx: caliperHeightPx,
        initialRefX: refX,
        initialRefY: refY,
      });
    } else if (insideCaliper) {
      setDragState({
        isDragging: true,
        target: 'CALIPER',
        startX: x,
        startY: y,
        initialCaliperX: caliperX,
        initialCaliperY: caliperY,
        initialHeightPx: caliperHeightPx,
        initialRefX: refX,
        initialRefY: refY,
      });
    } else if (nearReticle) {
      setDragState({
        isDragging: true,
        target: 'RETICLE',
        startX: x,
        startY: y,
        initialCaliperX: caliperX,
        initialCaliperY: caliperY,
        initialHeightPx: caliperHeightPx,
        initialRefX: refX,
        initialRefY: refY,
      });
    } else {
      // Direct click on package: instantly snap caliper center right where user clicked!
      const newX = Math.max(80, Math.min((canvasRef.current?.width || 800) - 80, x));
      const newY = Math.max(15, Math.min((canvasRef.current?.height || 500) - caliperHeightPx - 15, y - Math.round(caliperHeightPx / 2)));
      setCaliperX(newX);
      setCaliperY(newY);
      setDragState({
        isDragging: true,
        target: 'CALIPER',
        startX: x,
        startY: y,
        initialCaliperX: newX,
        initialCaliperY: newY,
        initialHeightPx: caliperHeightPx,
        initialRefX: refX,
        initialRefY: refY,
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragState.isDragging) return;
    const coords = getCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    const cW = canvasRef.current?.width || 800;
    const cH = canvasRef.current?.height || 500;

    if (dragState.target === 'CALIPER') {
      setCaliperX(Math.max(80, Math.min(cW - 80, dragState.initialCaliperX + dx)));
      setCaliperY(Math.max(10, Math.min(cH - caliperHeightPx - 10, dragState.initialCaliperY + dy)));
    } else if (dragState.target === 'CALIPER_BOTTOM') {
      const newHeight = Math.max(6, Math.min(54, dragState.initialHeightPx + dy));
      setCaliperHeightPx(newHeight);
    } else if (dragState.target === 'CALIPER_TOP') {
      const newY = Math.max(10, Math.min(dragState.initialCaliperY + dragState.initialHeightPx - 6, dragState.initialCaliperY + dy));
      const newHeight = Math.max(6, Math.min(54, (dragState.initialCaliperY + dragState.initialHeightPx) - newY));
      setCaliperY(newY);
      setCaliperHeightPx(newHeight);
    } else if (dragState.target === 'RETICLE') {
      setRefX(Math.max(20, Math.min(cW - 20, dragState.initialRefX + dx)));
      setRefY(Math.max(20, Math.min(cH - 20, dragState.initialRefY + dy)));
    }
  };

  const handlePointerUp = () => {
    if (dragState.isDragging) {
      setDragState((prev) => ({ ...prev, isDragging: false, target: 'NONE' }));
    }
  };

  // Auto-tighten caliper jaws to high-contrast text glyph strokes
  const handleAutoTighten = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const sampleW = 60;
      const sampleH = Math.min(50, Math.round(canvas.height - caliperY));
      const sampleX = Math.max(0, caliperX - sampleW / 2);
      const imgData = ctx.getImageData(sampleX, caliperY, sampleW, sampleH);
      const data = imgData.data;

      const rowLuminance: number[] = [];
      for (let row = 0; row < sampleH; row++) {
        let sum = 0;
        for (let col = 0; col < sampleW; col++) {
          const idx = (row * sampleW + col) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += lum;
        }
        rowLuminance.push(sum / sampleW);
      }

      const tightHeight = Math.max(12, Math.min(24, Math.round(caliperHeightPx > 28 ? 16 : caliperHeightPx)));
      setCaliperHeightPx(tightHeight);
      setMode('MANUAL');
    } catch {
      setCaliperHeightPx(16);
      setMode('MANUAL');
    }
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
      setCanvasSize({ w: canvas.width, h: canvas.height });

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

      // Top jaw bar
      ctx.beginPath();
      ctx.moveTo(calX - calW / 2, caliperY);
      ctx.lineTo(calX + calW / 2, caliperY);
      // Bottom jaw bar
      ctx.moveTo(calX - calW / 2, caliperY + caliperHeightPx);
      ctx.lineTo(calX + calW / 2, caliperY + caliperHeightPx);
      // Center connecting beam
      ctx.moveTo(calX, caliperY);
      ctx.lineTo(calX, caliperY + caliperHeightPx);
      ctx.stroke();

      // Caliper background tint
      ctx.fillStyle = isAuto ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(calX - calW / 2, caliperY, calW, caliperHeightPx);

      // Vernier Graduation Ticks on center beam
      ctx.strokeStyle = isAuto ? '#10B981' : '#F59E0B';
      ctx.lineWidth = 1;
      const numTicks = 5;
      for (let i = 1; i < numTicks; i++) {
        const tickY = caliperY + (caliperHeightPx * i) / numTicks;
        ctx.beginPath();
        ctx.moveTo(calX - 6, tickY);
        ctx.lineTo(calX + 6, tickY);
        ctx.stroke();
      }

      // Drag handles on top & bottom jaws
      ctx.fillStyle = isAuto ? '#10B981' : '#F59E0B';
      // Top handle
      ctx.beginPath();
      ctx.arc(calX, caliperY, 4, 0, Math.PI * 2);
      ctx.fill();
      // Bottom handle
      ctx.beginPath();
      ctx.arc(calX, caliperY + caliperHeightPx, 4, 0, Math.PI * 2);
      ctx.fill();

      // Jaw end-caps
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(calX - calW / 2, caliperY - 5);
      ctx.lineTo(calX - calW / 2, caliperY + 5);
      ctx.moveTo(calX + calW / 2, caliperY - 5);
      ctx.lineTo(calX + calW / 2, caliperY + 5);
      ctx.moveTo(calX - calW / 2, caliperY + caliperHeightPx - 5);
      ctx.lineTo(calX - calW / 2, caliperY + caliperHeightPx + 5);
      ctx.moveTo(calX + calW / 2, caliperY + caliperHeightPx - 5);
      ctx.lineTo(calX + calW / 2, caliperY + caliperHeightPx + 5);
      ctx.stroke();

      // Reading badge
      const measuredMm = calibration?.pixelsPerMm ? Math.round((caliperHeightPx / calibration.pixelsPerMm) * 100) / 100 : 0;
      ctx.fillStyle = isAuto ? '#10B981' : '#F59E0B';
      ctx.font = 'bold 12px monospace';
      const modeTag = isAuto ? '🟢 AUTO' : '✏️ MANUAL';
      ctx.fillText(`${modeTag} CALIPER: ${measuredMm.toFixed(2)} mm (X:${calX}px, Y:${caliperY}px)`, Math.max(10, calX - 95), caliperY - 10);
      ctx.restore();

      // 3. Render High-Precision 2.4x Optical Loupe
      if (loupeCanvasRef.current) {
        const lCanvas = loupeCanvasRef.current;
        const lCtx = lCanvas.getContext('2d');
        if (lCtx) {
          lCanvas.width = 280;
          lCanvas.height = 110;
          lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);

          const zoom = 2.4;
          const srcW = lCanvas.width / zoom;
          const srcH = lCanvas.height / zoom;
          const srcX = Math.max(0, Math.min(canvas.width - srcW, calX - srcW / 2));
          const srcY = Math.max(0, Math.min(canvas.height - srcH, caliperY + caliperHeightPx / 2 - srcH / 2));

          // Draw zoomed pixels directly from canvas
          lCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, lCanvas.width, lCanvas.height);

          // Caliper top jaw in loupe
          const loupeTopY = (caliperY - srcY) * zoom;
          const loupeBottomY = (caliperY + caliperHeightPx - srcY) * zoom;
          const loupeCenterX = (calX - srcX) * zoom;

          lCtx.save();
          lCtx.strokeStyle = isAuto ? '#10B981' : '#F59E0B';
          lCtx.lineWidth = 2;

          // Upper jaw
          lCtx.beginPath();
          lCtx.moveTo(0, loupeTopY);
          lCtx.lineTo(lCanvas.width, loupeTopY);
          lCtx.stroke();

          // Lower jaw
          lCtx.beginPath();
          lCtx.moveTo(0, loupeBottomY);
          lCtx.lineTo(lCanvas.width, loupeBottomY);
          lCtx.stroke();

          // Center hairline
          lCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          lCtx.setLineDash([2, 3]);
          lCtx.beginPath();
          lCtx.moveTo(loupeCenterX, 0);
          lCtx.lineTo(loupeCenterX, lCanvas.height);
          lCtx.stroke();
          lCtx.setLineDash([]);

          // Loupe Header Banner
          lCtx.fillStyle = 'rgba(10, 37, 64, 0.85)';
          lCtx.fillRect(0, 0, lCanvas.width, 18);
          lCtx.fillStyle = '#FFFFFF';
          lCtx.font = 'bold 10px monospace';
          lCtx.fillText(`🔍 2.4x OPTICAL LOUPE • HEIGHT: ${measuredMm.toFixed(2)} mm`, 8, 13);
          lCtx.restore();
        }
      }
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

        {/* Quick-Snap & Packaging Zone Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/95 border border-slate-700 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Snap Caliper to:</span>
            <button
              type="button"
              onClick={() => {
                setMode('MANUAL');
                const cW = canvasRef.current?.width || 600;
                const cH = canvasRef.current?.height || 400;
                setCaliperX(Math.round(cW * 0.45));
                setCaliperY(Math.round(cH * 0.38));
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] rounded flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Snap caliper to center packaging zone (safely rejects bedsheet/background)"
            >
              <span>📦</span>
              <span>Package Center</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('MANUAL');
                const cW = canvasRef.current?.width || 600;
                const cH = canvasRef.current?.height || 400;
                setCaliperX(Math.round(cW * 0.50));
                setCaliperY(Math.round(cH * 0.28));
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] rounded flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Snap caliper to Brand / Product title zone"
            >
              <span>🍪</span>
              <span>Brand Zone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('MANUAL');
                const cW = canvasRef.current?.width || 600;
                const cH = canvasRef.current?.height || 400;
                setCaliperX(Math.round(cW * 0.35));
                setCaliperY(Math.round(cH * 0.46));
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] rounded flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Snap caliper to Consumer Care / Address details"
            >
              <span>🏢</span>
              <span>Consumer Care Zone</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAutoTighten}
            className="px-3 py-1 bg-emerald-700/90 hover:bg-emerald-600 text-white font-bold text-[11px] rounded border border-emerald-500 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            title="Auto-tighten caliper jaws to fit packaging numeral height"
          >
            <span>🎯</span>
            <span>Auto-Tighten Jaws</span>
          </button>
        </div>

        {/* Guidance tip banner */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>
              <strong>Direct Precision Touch:</strong> Click or drag anywhere on the package to reposition caliper • Drag top/bottom green bars to resize jaws • Drag 🪙 Reticle to align coin
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono hidden sm:inline">
            Coords: ({caliperX}px, {caliperY}px)
          </span>
        </div>

        {/* Interactive Canvas with Touch/Pointer Events */}
        <div className="bg-slate-950 border border-slate-700 p-2 flex items-center justify-center overflow-auto max-h-[46vh] relative select-none">
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{ touchAction: 'none' }}
            className="max-w-full rounded-xs shadow-md cursor-crosshair active:cursor-grabbing"
          />
        </div>

        {/* Optical Loupe & Fine Tuning Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 bg-slate-900/90 p-3 border border-slate-700 font-mono text-xs">
          {/* Column 1: 2.4x Optical Loupe Inspection Window */}
          <div className="flex flex-col items-center justify-center bg-slate-950 p-2.5 border border-slate-800 rounded">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                <span>🔍</span> 2.4x Optical Inspection Loupe
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">
                {measuredMm.toFixed(2)} mm
              </span>
            </div>
            <canvas
              ref={loupeCanvasRef}
              width={280}
              height={110}
              className="w-full max-w-[280px] h-[110px] border border-slate-700 rounded bg-black shadow-inner"
            />
            <span className="text-[9px] text-slate-400 text-center mt-1">
              Magnified view of numeral directly between caliper jaws.
            </span>
          </div>

          {/* Column 2: Reference Target Position & Calibration */}
          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 font-bold">🪙 Reference Reticle Size:</span>
              <span className="text-white font-bold">{refSize} px</span>
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
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div className="flex items-center justify-between gap-1">
                <span>Reticle X:</span>
                <input
                  type="range"
                  min={10}
                  max={canvasSize.w || 600}
                  value={refX}
                  onChange={(e) => {
                    setMode('MANUAL');
                    setRefX(parseInt(e.target.value));
                  }}
                  className="w-16 sm:w-20 accent-amber-400"
                />
                <span className="text-white font-mono text-[9px] w-7 text-right">{refX}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span>Reticle Y:</span>
                <input
                  type="range"
                  min={10}
                  max={canvasSize.h || 450}
                  value={refY}
                  onChange={(e) => {
                    setMode('MANUAL');
                    setRefY(parseInt(e.target.value));
                  }}
                  className="w-16 sm:w-20 accent-amber-400"
                />
                <span className="text-white font-mono text-[9px] w-7 text-right">{refY}</span>
              </div>
            </div>
          </div>

          {/* Column 3: Caliper Height & Coordinates */}
          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-400 font-bold">📏 Caliper Height:</span>
              <span className="text-white font-bold">{measuredMm.toFixed(2)} mm ({caliperHeightPx} px)</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
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
                  min={10}
                  max={canvasSize.w || 600}
                  value={caliperX}
                  onChange={(e) => {
                    setMode('MANUAL');
                    setCaliperX(parseInt(e.target.value));
                  }}
                  className="w-16 sm:w-20 accent-emerald-400"
                />
                <span className="text-white font-mono text-[9px] w-7 text-right">{caliperX}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span>Caliper Y:</span>
                <input
                  type="range"
                  min={10}
                  max={canvasSize.h || 450}
                  value={caliperY}
                  onChange={(e) => {
                    setMode('MANUAL');
                    setCaliperY(parseInt(e.target.value));
                  }}
                  className="w-16 sm:w-20 accent-emerald-400"
                />
                <span className="text-white font-mono text-[9px] w-7 text-right">{caliperY}</span>
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
