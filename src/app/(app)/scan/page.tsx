'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import type { PackageFace, ProductCategory } from '@/lib/types';

interface CapturedImage {
  id: string;
  dataUrl: string;
  face: PackageFace;
  name: string;
}

// Generate an authentic synthetic package image as a valid base64 data URI for instant testing
function createPackageCanvasDataUrl(
  title: string,
  weight: string,
  price: string,
  statusText: string,
  color: string,
  mfgText: string = 'Mfd By: Amrit Dairy Products Pvt Ltd, Anand, Gujarat - 388001'
) {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 800, 500);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 760, 460);

      // Header band
      ctx.fillStyle = '#0A2540';
      ctx.fillRect(30, 30, 740, 60);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(title.toUpperCase(), 50, 70);

      // Declarations
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(mfgText, 50, 135);

      ctx.fillStyle = '#0A2540';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`NET QUANTITY: ${weight}`, 50, 195);

      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`MAX. RETAIL PRICE: ${price}`, 50, 255);

      ctx.fillStyle = '#475569';
      ctx.font = '18px monospace';
      ctx.fillText('PKD: 07/2026 • CONSUMER CARE: 1800-425-4449 | care@parakh.gov.in', 50, 315);

      ctx.fillStyle = '#0F172A';
      ctx.font = '16px monospace';
      ctx.fillText('Country of Origin: India • FSSAI Lic. No. 10014022002890', 50, 365);

      // Audit box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(30, 400, 740, 65);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 400, 740, 65);
      ctx.fillStyle = color;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`STATUTORY COMPLIANCE: ${statusText}`, 50, 440);

      return canvas.toDataURL('image/jpeg', 0.9);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#FFFFFF"/>
    <rect x="20" y="20" width="560" height="360" fill="#F8FAFC" stroke="${color}" stroke-width="3"/>
    <rect x="40" y="40" width="520" height="50" fill="#0A2540"/>
    <text x="50" y="72" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold">${title.toUpperCase()}</text>
    <text x="50" y="130" fill="#334155" font-family="sans-serif" font-size="16">${mfgText}</text>
    <text x="50" y="170" fill="#0A2540" font-family="monospace" font-size="22" font-weight="bold">NET QUANTITY: ${weight}</text>
    <text x="50" y="215" fill="#D97706" font-family="monospace" font-size="22" font-weight="bold">MAX. RETAIL PRICE: ${price}</text>
    <text x="50" y="260" fill="#475569" font-family="monospace" font-size="16">PKD: 07/2026 • CONSUMER CARE: 1800-425-4449</text>
    <rect x="40" y="300" width="520" height="60" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <text x="60" y="338" fill="${color}" font-family="monospace" font-size="14" font-weight="bold">STATUTORY AUDIT: ${statusText}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export default function ScanProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualText, setManualText] = useState('');

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [selectedFace, setSelectedFace] = useState<PackageFace>('FRONT');

  // Package Metadata & Images
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('FOOD');
  const [isImported, setIsImported] = useState(false);
  const [countryOfOrigin, setCountryOfOrigin] = useState('India');
  const [isExtracting, setIsExtracting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgressStage, setScanProgressStage] = useState<string>('');

  // Initialize camera when camera tab is active
  useEffect(() => {
    if (activeTab === 'camera' && !capturedSnapshot) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, facingMode, capturedSnapshot]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not accessible in this environment or permission denied.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access note:', err);
      setCameraError(
        err.message || 'Camera permission denied or camera device unavailable. You can use preset samples or upload images.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const optimizeImageForInspection = (dataUrl: string, maxDimension = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 150 * 1024) {
          resolve(dataUrl);
          return;
        }
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleCaptureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      if (w > 1400 || h > 1400) {
        if (w > h) {
          h = Math.round((h * 1400) / w);
          w = 1400;
        } else {
          w = Math.round((w * 1400) / h);
          h = 1400;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedSnapshot(dataUrl);
      }
    }
  };

  const handleConfirmSnapshot = () => {
    if (capturedSnapshot) {
      const newImg: CapturedImage = {
        id: `cam-${Date.now()}`,
        dataUrl: capturedSnapshot,
        face: selectedFace,
        name: `LiveCapture_${selectedFace}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
      };
      setImages((prev) => [...prev, newImg]);
      setCapturedSnapshot(null);
    }
  };

  const handleRetakeSnapshot = () => {
    setCapturedSnapshot(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const raw = reader.result as string;
        const optimized = await optimizeImageForInspection(raw);
        setImages((prev) => [
          ...prev,
          {
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            dataUrl: optimized,
            face: selectedFace,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleFaceChange = (id: string, face: PackageFace) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, face } : img)));
  };

  const handleAttachManualText = () => {
    if (!manualText.trim()) return;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 800, 500);
        ctx.strokeStyle = '#0A2540';
        ctx.lineWidth = 4;
        ctx.strokeRect(15, 15, 770, 470);

        ctx.fillStyle = '#0A2540';
        ctx.fillRect(25, 25, 750, 45);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`PACKAGED COMMODITY LABEL • ${selectedFace} PANEL`, 40, 54);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px monospace';
        const lines = manualText.split('\n');
        let y = 105;
        lines.forEach((l) => {
          if (y < 460) {
            ctx.fillText(l.trim(), 40, y);
            y += 24;
          }
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const newImg: CapturedImage = {
          id: `text-${Date.now()}`,
          dataUrl,
          face: selectedFace,
          name: `LabelDeclaration_${selectedFace}.jpg`,
        };
        setImages((prev) => [...prev, newImg]);
        setManualText('');
      }
    }
  };

  const handleLoadPreset = (type: 'compliant' | 'violation' | 'imported') => {
    setScanError(null);
    if (type === 'compliant') {
      setProductName('Amrit Pure Cow Ghee 500ml');
      setCategory('FOOD');
      setCountryOfOrigin('India');
      setIsImported(false);
      setImages([
        {
          id: 'preset-front-1',
          dataUrl: createPackageCanvasDataUrl('Amrit Pure Cow Ghee 500ml', '500 ml (452 g)', '₹385.00 (Incl. of all taxes)', 'PASS • FULL STATUTORY COMPLIANCE', '#15803D', 'Mfd By: Amrit Dairy Products Pvt Ltd, Anand, Gujarat - 388001'),
          face: 'FRONT',
          name: 'Amrit_Ghee_Front_PDP.jpg',
        },
        {
          id: 'preset-back-1',
          dataUrl: createPackageCanvasDataUrl('Amrit Pure Cow Ghee - Information Panel', '500 ml', '₹385.00 (Incl. of all taxes)', 'BACK PANEL • MFD BY AMRIT DAIRY GUJARAT • FSSAI 10014022002890', '#15803D', 'Mfd By: Amrit Dairy Products Pvt Ltd, Anand, Gujarat - 388001'),
          face: 'BACK',
          name: 'Amrit_Ghee_Back_Panel.jpg',
        },
      ]);
    } else if (type === 'violation') {
      setProductName('NutriBite Butter Crisp Biscuits 120g');
      setCategory('FOOD');
      setCountryOfOrigin('India');
      setIsImported(false);
      setImages([
        {
          id: 'preset-front-2',
          dataUrl: createPackageCanvasDataUrl('NutriBite Butter Crisp 120g', '120 gms', 'Rs. 35.00 only', 'FAIL • RULE 6(1)(e) & TABLE I DEFECTS', '#B91C1C', 'Mfd By: NutriBite Biscuits & Confectioneries Pvt Ltd, Industrial Area, Mumbai - 400001'),
          face: 'FRONT',
          name: 'NutriBite_Front_PDP.jpg',
        },
        {
          id: 'preset-back-2',
          dataUrl: createPackageCanvasDataUrl('NutriBite Crisp - Back Panel', '120 gms', 'Rs. 35.00', 'BACK PANEL • MISSING PROPER UNIT & TAX INCLUSIVITY', '#B91C1C', 'Mfd By: NutriBite Biscuits & Confectioneries Pvt Ltd, Industrial Area, Mumbai - 400001'),
          face: 'BACK',
          name: 'NutriBite_Back_Panel.jpg',
        },
      ]);
    } else {
      setProductName('Himalayan Alpine Glacial Water 750ml');
      setCategory('FOOD');
      setCountryOfOrigin('Bhutan');
      setIsImported(true);
      setImages([
        {
          id: 'preset-front-3',
          dataUrl: createPackageCanvasDataUrl('Alpine Glacial Water 750ml', '750 ml', '₹120.00 (Incl. taxes)', 'NEEDS_REVIEW • IMPORTER & ORIGIN CHECK', '#B45309', 'Imported by: Himalayan Springs Importers Ltd, Barakhamba Road, New Delhi - 110001'),
          face: 'FRONT',
          name: 'Alpine_Water_Front_PDP.jpg',
        },
        {
          id: 'preset-back-3',
          dataUrl: createPackageCanvasDataUrl('Alpine Glacial Water - Importer Panel', '750 ml', '₹120.00 (Incl. taxes)', 'BACK PANEL • IMPORTER & ORIGIN BHUTAN', '#B45309', 'Imported by: Himalayan Springs Importers Ltd, Barakhamba Road, New Delhi - 110001'),
          face: 'BACK',
          name: 'Alpine_Water_Back_Panel.jpg',
        },
      ]);
    }
  };

  const handleStartExtraction = async () => {
    if (images.length === 0) return;
    setIsExtracting(true);
    setScanError(null);
    setScanProgressStage('Uploading packaged commodity images...');

    try {
      setScanProgressStage(`Extracting declarations from ${images.length} package face(s)...`);
      const payloadImages = images.map((img) => ({
        dataUrl: img.dataUrl,
        face: img.face,
        name: img.name,
      }));

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: payloadImages,
          productName,
          category,
          isImported,
          countryOfOrigin,
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        if (res.status === 413) {
          throw new Error('Image size exceeded server limit (413). Please take a photo from slightly further away.');
        } else if (res.status === 504) {
          throw new Error('Analysis timed out on Vercel (504). Please try again.');
        } else {
          throw new Error(`Server returned error (${res.status}): ${resText.slice(0, 140) || 'Unknown server response'}`);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to process packaged commodity scan (${res.status}).`);
      }

      setScanProgressStage('Evaluating Legal Metrology rules...');

      router.push(`/scan/progress?id=${data.scanId}`);
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'An error occurred during packaging inspection.');
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full px-2 sm:px-4">
      <PageHeader
        title="Scan Packaged Commodity"
        description="Capture package images via real-time camera or select photographs to initiate statutory Legal Metrology inspection."
      />

      {scanError && (
        <div className="p-4 bg-[#FEF2F2] border-l-4 border-l-[#B91C1C] border border-[#FECACA] font-mono text-xs text-[#B91C1C] flex items-start justify-between gap-3">
          <div>
            <strong className="block uppercase tracking-wider mb-0.5">Extraction Notice:</strong>
            <span>{scanError}</span>
          </div>
          <button
            onClick={() => setScanError(null)}
            className="text-[#B91C1C] font-bold px-2 py-0.5 hover:bg-[#FECACA] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {isExtracting && (
        <div className="p-3 bg-[#EFF6FF] border border-[#93C5FD] text-[#1E40AF] font-mono text-xs flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-[#1E40AF] border-t-transparent animate-spin"></span>
          <span>{scanProgressStage || 'Processing package inspection...'}</span>
        </div>
      )}

      {/* QUICK PRESET TEST SAMPLES BAR */}
      <div className="p-4 bg-white border border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#EA580C]"></span>
            <span className="text-[10px] uppercase text-[#64748B] tracking-wider font-bold">
              INSTANT TEST PRESETS (1-CLICK EVALUATION)
            </span>
          </div>
          <span className="font-semibold text-[#0F172A] mt-0.5 block">
            No physical package at hand? Test pre-calibrated sample commodities:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleLoadPreset('compliant')}
            className="px-3 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] font-bold hover:bg-[#DCFCE7] transition-colors cursor-pointer text-[11px]"
          >
            ✓ Compliant Sample
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('violation')}
            className="px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] font-bold hover:bg-[#FEE2E2] transition-colors cursor-pointer text-[11px]"
          >
            ✕ Non-Compliant Sample
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('imported')}
            className="px-3 py-1.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-bold hover:bg-[#FEF3C7] transition-colors cursor-pointer text-[11px]"
          >
            ⚠ Imported Review Sample
          </button>
        </div>
      </div>

      {/* Main Multi-Mode Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 65%: Image Capture Terminal */}
        <div className="lg:col-span-8 bg-white border border-[#CBD5E1] flex flex-col">
          {/* Capture Mode Tabs */}
          <div className="flex border-b border-[#CBD5E1] bg-[#F8FAFC] font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                setCapturedSnapshot(null);
              }}
              className={`px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'camera'
                  ? 'border-[#0A2540] text-[#0A2540] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>LIVE CAMERA VIEWFINDER</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-[#0A2540] text-[#0A2540] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>UPLOAD IMAGE FILES</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'manual'
                  ? 'border-[#0A2540] text-[#0A2540] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>DIRECT TEXT / LABEL INPUT</span>
            </button>
          </div>

          {/* TAB 1: Live Camera Viewfinder */}
          {activeTab === 'camera' && (
            <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center bg-[#0F172A] text-white relative min-h-[360px]">
              {cameraError ? (
                <div className="text-center p-6 space-y-4 max-w-md bg-white border border-[#CBD5E1] text-[#0F172A]">
                  <div className="w-12 h-12 border border-[#B91C1C] bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto text-lg font-mono font-bold">
                    !
                  </div>
                  <div className="text-xs font-mono text-[#B91C1C] font-bold uppercase tracking-wider">
                    Camera Hardware Unavailable
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed font-sans">
                    {cameraError}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <button
                      onClick={() => handleLoadPreset('compliant')}
                      className="px-4 py-2 bg-[#0A2540] text-white font-mono text-xs font-bold hover:bg-[#1E3A8A] transition-colors"
                    >
                      Load Sample Package &rarr;
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-[#F1F5F9] border border-[#CBD5E1] text-[#0A2540] font-mono text-xs font-bold hover:bg-[#E2E8F0] transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              ) : capturedSnapshot ? (
                /* Freeze Frame Snapshot Review */
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="relative border-2 border-[#0A2540] max-w-md w-full aspect-video bg-black overflow-hidden">
                    <img
                      src={capturedSnapshot}
                      alt="Captured snapshot"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 bg-[#0A2540] text-white text-[10px] font-mono px-2 py-0.5 font-bold uppercase">
                      Preview Frame • {selectedFace} Face
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRetakeSnapshot}
                      className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      Retake Frame
                    </button>
                    <button
                      onClick={handleConfirmSnapshot}
                      className="px-5 py-2 bg-[#15803D] hover:bg-[#166534] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Attach to Scan</span>
                      <span>✓</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Camera Feed */
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="relative border border-[#334155] max-w-lg w-full aspect-video bg-black overflow-hidden shadow-xs">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Tactile Inspection Alignment HUD */}
                    <div className="absolute inset-6 border border-white/30 pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-white">
                        <span className="bg-[#0F172A]/80 px-1.5 py-0.5 border border-white/20">
                          STATUTORY PDP RETICLE
                        </span>
                        <span className="bg-[#0A2540] px-1.5 py-0.5 font-bold text-white border-b border-[#EA580C]">
                          FACE: {selectedFace}
                        </span>
                      </div>

                      {/* Center Leveling Crosshair */}
                      <div className="self-center flex items-center gap-2 text-white/70 text-[10px] font-mono">
                        <span>—</span>
                        <div className="w-2 h-2 rounded-full border border-white"></div>
                        <span>—</span>
                      </div>

                      <div className="flex justify-between text-[9px] font-mono text-white/80 bg-[#0F172A]/80 px-2 py-0.5 border border-white/20">
                        <span>KEEP LABEL FLAT</span>
                        <span>0.90 CONFIDENCE TARGET</span>
                      </div>
                    </div>

                    {/* Corner Crosshairs */}
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#EA580C] pointer-events-none"></div>
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#EA580C] pointer-events-none"></div>
                    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#EA580C] pointer-events-none"></div>
                    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#EA580C] pointer-events-none"></div>
                  </div>

                  {/* Hidden Canvas for Frame Capture */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between w-full max-w-lg gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-mono text-[#94A3B8]">Tag Face:</label>
                      <select
                        value={selectedFace}
                        onChange={(e) => setSelectedFace(e.target.value as PackageFace)}
                        className="bg-[#1E293B] border border-[#475569] text-white text-xs font-mono px-2 py-1 focus:outline-none"
                      >
                        <option value="FRONT">FRONT (PDP)</option>
                        <option value="BACK">BACK (DECLARATIONS)</option>
                        <option value="SIDE">SIDE (BARCODE)</option>
                        <option value="TOP">TOP</option>
                        <option value="BOTTOM">BOTTOM</option>
                      </select>
                    </div>

                    <button
                      onClick={handleCaptureFrame}
                      className="px-6 py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer border-t border-[#EA580C]"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C] animate-pulse"></div>
                      <span>Capture Frame</span>
                    </button>

                    <button
                      onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                      className="px-3 py-1 bg-[#1E293B] hover:bg-[#334155] text-xs font-mono text-white transition-colors"
                      title="Switch front/rear camera"
                    >
                      Flip Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Drag & Drop File Upload */}
          {activeTab === 'upload' && (
            <div className="p-6 sm:p-10 flex-1 flex flex-col justify-center bg-white">
              <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0A2540] p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#F8FAFC] hover:bg-[#F1F5F9] text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0A2540] mb-3">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="font-bold text-sm text-[#0F172A] block font-sans">
                  Click to select or drag package photographs here
                </span>
                <span className="text-xs font-mono text-[#64748B] mt-1 block">
                  PNG, JPG, WEBP up to 15MB • Multi-image selection supported
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* TAB 3: Direct Text / Label Input */}
          {activeTab === 'manual' && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between bg-white space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold font-mono text-[#0A2540] uppercase">
                    Packaging Label Declaration Text
                  </label>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    Tag Panel: <strong>{selectedFace}</strong>
                  </span>
                </div>
                <p className="text-xs text-[#475569]">
                  Paste or type raw declaration text directly from the packaging label. The system will convert it into high-resolution statutory package data and run optical rule extraction.
                </p>
                <textarea
                  rows={8}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={`e.g.\nMfd By: Wellversed Health Private Limited, Gurugram, Haryana - 122008\nCommodity: Micronised Creatine Monohydrate\nNet Quantity: 100g\nMRP: ₹ 699.00 (Incl. of all taxes)\nPKD: 05/2026 • EXP: 04/2027\nCustomer Care: 1800-425-4449 | support@wellversed.in\nCountry of Origin: India`}
                  className="w-full p-3 font-mono text-xs border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0A2540] leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-mono text-[#64748B]">Target Face:</label>
                  <select
                    value={selectedFace}
                    onChange={(e) => setSelectedFace(e.target.value as PackageFace)}
                    className="text-xs font-mono border border-[#CBD5E1] px-2 py-1 bg-white text-[#0F172A]"
                  >
                    <option value="FRONT">FRONT (PDP)</option>
                    <option value="BACK">BACK (DECLARATIONS)</option>
                    <option value="SIDE">SIDE (BARCODE)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualText(`Mfd & Marketed By: Wellversed Health Private Limited, 771, Udyog Vihar, Phase - V, Gurugram, Haryana - 122008 India\nCommodity: Micronised Creatine Monohydrate\nNet Quantity: 100g\nMRP: ₹ 699.00 (Incl. of all taxes)\nPKD: 05/2026 • EXP: 04/2027\nCustomer Care: 1800-425-4449 | support@wellversed.in\nCountry of Origin: India\nFSSAI Lic. No. 10820005000528`);
                    }}
                    className="px-3 py-1.5 text-xs font-mono text-[#0A2540] bg-[#F1F5F9] border border-[#CBD5E1] hover:bg-[#E2E8F0] cursor-pointer"
                  >
                    Load Sample Text
                  </button>
                  <button
                    type="button"
                    onClick={handleAttachManualText}
                    disabled={!manualText.trim()}
                    className="px-5 py-1.5 bg-[#0A2540] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#1E3A8A] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Attach as Package Panel ✓
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Captured Images Strip */}
          <div className="p-4 border-t border-[#CBD5E1] bg-[#F8FAFC]">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="font-bold text-[#0A2540] uppercase">
                Captured Package Panels ({images.length})
              </span>
              <span className="text-[#64748B] text-[11px]">
                {images.length === 0 ? 'Minimum 1 image required' : 'Ready for extraction'}
              </span>
            </div>

            {images.length === 0 ? (
              <div className="p-4 border border-dashed border-[#CBD5E1] text-center text-xs font-mono text-[#64748B] italic bg-white">
                No images captured yet. Take a snapshot using the camera, select files, or load a preset test sample above.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="border border-[#CBD5E1] bg-white p-2 space-y-1.5 relative group">
                    <div className="aspect-square bg-[#F1F5F9] overflow-hidden relative border border-[#E2E8F0]">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute top-1 right-1 bg-[#B91C1C] hover:bg-red-700 text-white w-5 h-5 flex items-center justify-center text-xs transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                      <span className="truncate text-[#475569] text-[10px]">{img.name}</span>
                    </div>
                    <select
                      value={img.face}
                      onChange={(e) => handleFaceChange(img.id, e.target.value as PackageFace)}
                      className="w-full text-[10px] font-mono font-bold bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] px-1 py-0.5"
                    >
                      <option value="FRONT">FRONT (PDP)</option>
                      <option value="BACK">BACK (DECLARATIONS)</option>
                      <option value="SIDE">SIDE (BARCODE)</option>
                      <option value="TOP">TOP</option>
                      <option value="BOTTOM">BOTTOM</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 35%: Commodity Metadata Form */}
        <div className="lg:col-span-4 bg-white border border-[#CBD5E1] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="border-b border-[#CBD5E1] pb-3">
              <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
                STATUTORY REGISTRATION
              </span>
              <h3 className="text-sm font-bold text-[#0A2540] mt-0.5 font-sans">
                Commodity Context
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-sans text-[#334155] mb-1 font-semibold">
                  Product / Commodity Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Britannia Bourbon Biscuit 150g"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#0A2540]"
                />
              </div>

              <div>
                <label className="block font-sans text-[#334155] mb-1 font-semibold">
                  Regulatory Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 font-mono bg-white text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#0A2540]"
                >
                  <option value="FOOD">FOOD (Triggers FSSAI PCR-010)</option>
                  <option value="GENERAL">GENERAL (Baseline Rules PCR-001 to 009)</option>
                  <option value="COSMETICS">COSMETICS (Mfg Lic & Batch)</option>
                  <option value="ELECTRONICS">ELECTRONICS (Importer & Rating)</option>
                </select>
              </div>

              <div>
                <label className="block font-sans text-[#334155] mb-1 font-semibold">
                  Country of Origin *
                </label>
                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white text-[#0F172A] border border-[#CBD5E1] focus:outline-none focus:border-[#0A2540]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 font-sans cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImported}
                    onChange={(e) => setIsImported(e.target.checked)}
                    className="w-4 h-4 rounded-none accent-[#0A2540]"
                  />
                  <span className="font-bold text-[#0F172A]">Imported Commodity</span>
                </label>
                <span className="text-[11px] text-[#64748B] block pl-6">
                  Triggers mandatory Rule 6(1)(da) Country of Origin & Rule 6(1)(a) Importer Name.
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 border-t border-[#CBD5E1] space-y-2">
            <button
              onClick={handleStartExtraction}
              disabled={isExtracting || images.length === 0}
              className="w-full py-3.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isExtracting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin"></span>
                  <span>INITIALIZING STATUTORY AUDIT...</span>
                </>
              ) : (
                <>
                  <span>RUN STATUTORY COMPLIANCE CHECK</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
            <p className="text-[10px] font-mono text-[#64748B] text-center">
              {images.length === 0 ? 'Capture or select at least 1 image to begin' : 'Vision AI extracts coordinates • Rule Engine decides compliance'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
