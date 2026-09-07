'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import type { PackageFace, ProductCategory } from '@/lib/types';
import { saveScanToClient } from '@/lib/client-scan-cache';
import { getApiUrl } from '@/lib/api-config';

interface CapturedImage {
  id: string;
  dataUrl: string;
  face: PackageFace;
  name: string;
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
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@capacitor/core')
        .then(({ Capacitor }) => {
          setIsNative(Capacitor.isNativePlatform());
        })
        .catch(() => {});
    }
  }, []);

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
        err.message || 'Camera permission denied or camera device unavailable. Please upload package images directly.'
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

  const handleNativeCapture = async (source: 'camera' | 'photos') => {
    setCameraError(null);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        saveToGallery: false,
        promptLabelHeader: 'Statutory Inspection Photo',
        promptLabelCancel: 'Cancel',
        promptLabelPhoto: 'From Photo Gallery',
        promptLabelPicture: 'Take Live Photo',
      });

      if (photo?.dataUrl) {
        const optimized = await optimizeImageForInspection(photo.dataUrl);
        const newImg: CapturedImage = {
          id: `native-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          dataUrl: optimized,
          face: selectedFace,
          name: source === 'camera'
            ? `Camera_${selectedFace}_${Date.now().toString().slice(-4)}.${photo.format || 'jpg'}`
            : `Gallery_${selectedFace}_${Date.now().toString().slice(-4)}.${photo.format || 'jpg'}`,
        };
        setImages((prev) => [...prev, newImg]);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('User cancelled') || err.message.includes('cancelled'))) {
        return;
      }
      console.warn('Native camera capture note:', err);
      setCameraError(
        err.message?.includes('denied')
          ? 'Camera or Photo Gallery permission was denied. You can grant access in Android App Settings.'
          : (err.message || 'Unable to access device camera.')
      );
    }
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

      const res = await fetch(getApiUrl('/api/scan'), {
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

      // Cache scan locally so client pages have instant, infallible access (immune to Vercel cold restarts)
      if (typeof window !== 'undefined' && data.scanId) {
        try {
          const clientScanRecord = {
            id: data.scanId,
            product_name: data.productName || productName,
            category: data.category || category,
            is_imported: isImported,
            country_of_origin: countryOfOrigin,
            image_path: data.imagePath,
            package_faces: (data.package_faces || data.images || []).map((f: any, idx: number) => ({
              face: f.face,
              imagePath: f.imagePath,
              dataUrl: images[idx]?.dataUrl,
              name: f.name,
            })),
            images: (data.images || data.package_faces || []).map((f: any, idx: number) => ({
              face: f.face,
              imagePath: f.imagePath,
              dataUrl: images[idx]?.dataUrl,
              name: f.name,
            })),
            extractedData: data.extractedData,
            complianceResult: data.complianceResult,
            overall_status: data.overallStatus,
            violations_count: data.violationsCount,
            inspector_name: 'Field Inspection Officer',
            created_at: new Date().toISOString(),
          };
          await saveScanToClient(clientScanRecord);
        } catch (e) {
          console.warn('Could not store scan in client storage:', e);
        }
      }

      setScanProgressStage('Evaluating Legal Metrology rules...');

      router.push(`/scan/${data.scanId}/review`);
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

      {/* Main Multi-Mode Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 65%: Image Capture Terminal */}
        <div className="lg:col-span-8 bg-white border border-[#CBD5E1] flex flex-col">
          {/* Capture Mode Tabs */}
          <div className="flex border-b border-[#CBD5E1] bg-[#F8FAFC] font-mono text-xs overflow-x-auto scrollbar-none whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                setCapturedSnapshot(null);
              }}
              className={`shrink-0 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
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
              className={`shrink-0 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
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
              className={`shrink-0 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
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
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleNativeCapture('camera')}
                      className="px-4 py-2 bg-[#0A2540] text-white font-mono text-xs font-bold hover:bg-[#1E3A8A] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📸 Take Photo (Native Camera)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNativeCapture('photos')}
                      className="px-4 py-2 bg-[#F1F5F9] text-[#0A2540] border border-[#CBD5E1] font-mono text-xs font-bold hover:bg-[#E2E8F0] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🖼️ Select from Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-white text-[#475569] border border-[#CBD5E1] font-mono text-xs hover:text-[#0F172A] transition-colors"
                    >
                      Upload Files &rarr;
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

                  {/* Native Mobile Camera & Gallery Options */}
                  <div className="flex items-center justify-center gap-2 w-full max-w-lg pt-3 border-t border-[#334155]/60">
                    <button
                      type="button"
                      onClick={() => handleNativeCapture('camera')}
                      className="flex-1 py-2 px-2.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono text-xs font-bold border border-[#475569] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      title="Take photograph with device native camera"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>Native Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNativeCapture('photos')}
                      className="flex-1 py-2 px-2.5 bg-[#1E293B] hover:bg-[#334155] text-white font-mono text-xs font-bold border border-[#475569] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      title="Select product image from device gallery"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>Photo Gallery</span>
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
                No images captured yet. Take a snapshot using the camera, select files to upload, or paste label declarations.
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
