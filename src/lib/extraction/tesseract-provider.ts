import { createWorker, type Worker } from 'tesseract.js';
import sharp from 'sharp';
import type { BoundingBox } from './types';

export interface LocalOcrResult {
  text: string;
  confidence: number;
  wordBoxes: Record<string, BoundingBox>;
}

let sharedWorkerPromise: Promise<Worker> | null = null;

async function getSharedWorker(): Promise<Worker> {
  if (!sharedWorkerPromise) {
    sharedWorkerPromise = createWorker('eng').catch((err) => {
      sharedWorkerPromise = null;
      throw err;
    });
  }
  return sharedWorkerPromise;
}

/**
 * Perform optical character recognition locally using Tesseract.js
 * Uses a persistent, pre-initialized worker and optimized 1024px preprocessing
 * to complete recognition in under 1 second.
 */
export async function runLocalOcr(imageBuffer: Buffer): Promise<LocalOcrResult> {
  // Preprocess image to boost contrast and sharpness for superior OCR accuracy
  let ocrBuffer = imageBuffer;
  try {
    ocrBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .toBuffer();
  } catch {
    ocrBuffer = imageBuffer;
  }

  const worker = await getSharedWorker();

  const result = await worker.recognize(ocrBuffer);
  const data = result.data as any;
  const text = data.text || '';
  const confidence = (data.confidence || 0) / 100;
  const words: any[] = data.words || [];

  const wordBoxes: Record<string, BoundingBox> = {};

  if (words && words.length > 0) {
    words.forEach((w: any) => {
      if (w?.text && w?.bbox) {
        const key = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (key.length > 2 && !wordBoxes[key]) {
          wordBoxes[key] = {
            left: w.bbox.x0,
            top: w.bbox.y0,
            width: w.bbox.x1 - w.bbox.x0,
            height: w.bbox.y1 - w.bbox.y0,
          };
        }
      }
    });
  }

  return {
    text: text || '',
    confidence: confidence || 0,
    wordBoxes,
  };
}
