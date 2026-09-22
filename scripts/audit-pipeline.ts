import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { runGeminiVisionExtraction } from '../src/lib/extraction/gemini-provider';
import { parseRawOcrText } from '../src/lib/extraction/field-parser';
import { evaluateCompliance } from '../src/lib/rule-engine';
import { createScan, getScanById, getUserScans } from '../src/lib/db';
import { generateEvidenceManifest } from '../src/lib/forensics/chain-of-custody';
import { autoPerformOpticalGauge } from '../src/lib/vision/optical-gauge';

interface AuditTimings {
  imageLoadMs: number;
  imagePreprocessMs: number;
  geminiRequestMs: number;
  geminiParseMs: number;
  tesseractInitMs: number;
  tesseractRecognizeMs: number;
  tesseractTerminateMs: number;
  tesseractTotalMs: number;
  fieldParserMs: number;
  opticalGaugeMs: number;
  forensicManifestMs: number;
  ruleEngineMs: number;
  databaseWriteMs: number;
  databaseReadMs: number;
  totalEndToEndMs: number;
}

async function auditSingleImage(imagePath: string, testTesseract = true): Promise<{ timings: AuditTimings; imageSize: number }> {
  const t0 = performance.now();
  
  // 1. Image Load & Buffer Creation
  const tImageLoadStart = performance.now();
  const rawBuffer = fs.readFileSync(imagePath);
  const imageSize = rawBuffer.length;
  const imageLoadMs = performance.now() - tImageLoadStart;

  // 2. Image Preprocessing (Sharp)
  const tPreprocessStart = performance.now();
  let processedBuffer = rawBuffer;
  const meta = await sharp(rawBuffer).metadata();
  if ((meta.width && meta.width > 1200) || (meta.height && meta.height > 1200) || rawBuffer.length > 300 * 1024) {
    processedBuffer = await sharp(rawBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
  const imagePreprocessMs = performance.now() - tPreprocessStart;

  // 3. Gemini Extraction
  const tGeminiStart = performance.now();
  const extractedData = await runGeminiVisionExtraction(rawBuffer, 'image/jpeg', { category: 'FOOD' });
  const geminiRequestMs = performance.now() - tGeminiStart;

  // 4. Gemini Response Parsing & Normalization (inside runGeminiVisionExtraction or JSON parse)
  const tParseStart = performance.now();
  const rawJson = JSON.stringify(extractedData);
  JSON.parse(rawJson);
  const geminiParseMs = performance.now() - tParseStart;

  // 5. Tesseract Execution (if tested)
  let tesseractInitMs = 0;
  let tesseractRecognizeMs = 0;
  let tesseractTerminateMs = 0;
  let tesseractTotalMs = 0;
  let fieldParserMs = 0;

  if (testTesseract) {
    const tTessTotalStart = performance.now();
    
    const tTessPreStart = performance.now();
    const tessBuffer = await sharp(rawBuffer)
      .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();
    
    const tTessInitStart = performance.now();
    const worker = await createWorker('eng');
    tesseractInitMs = performance.now() - tTessInitStart;

    const tTessRecStart = performance.now();
    const result = await worker.recognize(tessBuffer);
    tesseractRecognizeMs = performance.now() - tTessRecStart;

    const tTessTermStart = performance.now();
    await worker.terminate();
    tesseractTerminateMs = performance.now() - tTessTermStart;

    tesseractTotalMs = performance.now() - tTessTotalStart;

    // Field parser execution time on Tesseract raw text
    const tFieldParserStart = performance.now();
    parseRawOcrText(result.data.text, {}, {}, { category: 'FOOD' });
    fieldParserMs = performance.now() - tFieldParserStart;
  }

  // 6. Optical Gauge
  const tGaugeStart = performance.now();
  const autoGauge = autoPerformOpticalGauge({
    boundingBoxes: extractedData.boundingBoxes,
    netQuantityValue: extractedData.netQuantity?.value,
    netQuantityUnit: extractedData.netQuantity?.unit,
  });
  const opticalGaugeMs = performance.now() - tGaugeStart;

  // 7. Forensic Manifest (SHA256, HMAC, Evidence package)
  const tForensicStart = performance.now();
  const telemetry = {
    coordinates: { latitude: 28.4595, longitude: 77.0266, altitude: 210, accuracyMeters: 5 },
    deviceFingerprint: 'AUDIT-TEST-DEVICE',
    inspectorId: 'usr_audit',
    inspectorName: 'Audit Inspector',
    captureTimestamp: new Date().toISOString(),
    istTimestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    platform: 'Node.js Benchmark',
  };
  const forensicManifest = generateEvidenceManifest(rawBuffer, telemetry);
  const forensicManifestMs = performance.now() - tForensicStart;

  // 8. Rule Engine Execution Time
  const tRuleStart = performance.now();
  const complianceResult = evaluateCompliance(extractedData, {
    productName: extractedData.productName || 'Test Commodity',
    category: 'FOOD',
    isImported: extractedData.isImported,
    countryOfOrigin: extractedData.countryOfOrigin || 'India',
  });
  const ruleEngineMs = performance.now() - tRuleStart;

  // 9. Database Read/Write
  const scanId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const tDbWriteStart = performance.now();
  createScan({
    id: scanId,
    userId: 'usr_default_officer',
    productName: extractedData.productName || 'Test Commodity',
    category: 'FOOD',
    isImported: false,
    countryOfOrigin: 'India',
    imagePath: imagePath,
    packageFaces: ['FRONT'],
    rawOcrText: extractedData.rawOcrText,
    extractedData,
    complianceResult,
    overallStatus: complianceResult.overall_status,
    violationsCount: complianceResult.violations.length,
    inspectorName: 'Audit Officer',
  });
  const databaseWriteMs = performance.now() - tDbWriteStart;

  const tDbReadStart = performance.now();
  getScanById(scanId);
  getUserScans('usr_default_officer');
  const databaseReadMs = performance.now() - tDbReadStart;

  const totalEndToEndMs = performance.now() - t0;

  return {
    timings: {
      imageLoadMs: Math.round(imageLoadMs * 10) / 10,
      imagePreprocessMs: Math.round(imagePreprocessMs * 10) / 10,
      geminiRequestMs: Math.round(geminiRequestMs * 10) / 10,
      geminiParseMs: Math.round(geminiParseMs * 10) / 10,
      tesseractInitMs: Math.round(tesseractInitMs * 10) / 10,
      tesseractRecognizeMs: Math.round(tesseractRecognizeMs * 10) / 10,
      tesseractTerminateMs: Math.round(tesseractTerminateMs * 10) / 10,
      tesseractTotalMs: Math.round(tesseractTotalMs * 10) / 10,
      fieldParserMs: Math.round(fieldParserMs * 10) / 10,
      opticalGaugeMs: Math.round(opticalGaugeMs * 10) / 10,
      forensicManifestMs: Math.round(forensicManifestMs * 10) / 10,
      ruleEngineMs: Math.round(ruleEngineMs * 10) / 10,
      databaseWriteMs: Math.round(databaseWriteMs * 10) / 10,
      databaseReadMs: Math.round(databaseReadMs * 10) / 10,
      totalEndToEndMs: Math.round(totalEndToEndMs * 10) / 10,
    },
    imageSize,
  };
}

async function main() {
  console.log('====================================================');
  console.log('     PARAKH EXTRACTION PIPELINE PERFORMANCE AUDIT   ');
  console.log('====================================================\n');

  const testImages = [
    {
      name: 'Creatine Front (167 KB)',
      path: path.join(process.cwd(), 'public', 'uploads', 'parakh_1788581920556_6dc90441.jpg'),
    },
    {
      name: 'Creatine Back (165 KB)',
      path: path.join(process.cwd(), 'public', 'uploads', 'parakh_1788581920553_2827142d.jpg'),
    },
    {
      name: 'High-Res Package (5.48 MB)',
      path: path.join(process.cwd(), 'public', 'uploads', 'parakh_1788576807939_ea069af8.jpg'),
    },
  ];

  for (const img of testImages) {
    if (!fs.existsSync(img.path)) {
      console.log(`[SKIP] Image not found: ${img.path}`);
      continue;
    }
    console.log(`\n--- AUDITING: ${img.name} ---`);
    const result = await auditSingleImage(img.path, true);
    const t = result.timings;
    console.log(`Raw Image Size: ${(result.imageSize / 1024).toFixed(1)} KB`);
    console.log(`1. Image load / buffer creation:   ${t.imageLoadMs} ms`);
    console.log(`2. Image preprocessing (Sharp):    ${t.imagePreprocessMs} ms`);
    console.log(`3. Gemini API request:             ${t.geminiRequestMs} ms`);
    console.log(`4. Gemini response parse:          ${t.geminiParseMs} ms`);
    console.log(`5. Tesseract Total (if executed):  ${t.tesseractTotalMs} ms`);
    console.log(`   - Worker create / init:         ${t.tesseractInitMs} ms`);
    console.log(`   - OCR recognition:              ${t.tesseractRecognizeMs} ms`);
    console.log(`   - Worker terminate:             ${t.tesseractTerminateMs} ms`);
    console.log(`6. Field parser:                   ${t.fieldParserMs} ms`);
    console.log(`7. Optical gauge calibration:      ${t.opticalGaugeMs} ms`);
    console.log(`8. Forensic evidence manifest:     ${t.forensicManifestMs} ms`);
    console.log(`9. Rule engine (deterministic):    ${t.ruleEngineMs} ms`);
    console.log(`10. Database write (SQLite):       ${t.databaseWriteMs} ms`);
    console.log(`11. Database read:                 ${t.databaseReadMs} ms`);
    console.log(`TOTAL PIPELINE TIME (with Gemini): ${t.imageLoadMs + t.imagePreprocessMs + t.geminiRequestMs + t.ruleEngineMs + t.databaseWriteMs} ms`);
    console.log(`TOTAL PIPELINE TIME (with Tess):   ${t.imageLoadMs + t.imagePreprocessMs + t.tesseractTotalMs + t.fieldParserMs + t.ruleEngineMs + t.databaseWriteMs} ms`);
  }
}

main().catch(console.error);
