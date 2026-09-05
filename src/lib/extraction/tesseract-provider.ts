import { createWorker } from 'tesseract.js';
import type { BoundingBox } from './types';

export interface LocalOcrResult {
  text: string;
  confidence: number;
  wordBoxes: Record<string, BoundingBox>;
}

/**
 * Perform optical character recognition locally using Tesseract.js
 */
export async function runLocalOcr(imageBuffer: Buffer): Promise<LocalOcrResult> {
  const worker = await createWorker('eng');

  try {
    const result = await worker.recognize(imageBuffer);
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

    await worker.terminate();

    return {
      text: text || '',
      confidence: (confidence || 0) / 100,
      wordBoxes,
    };
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}
