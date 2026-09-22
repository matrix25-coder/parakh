import { runGeminiVisionExtraction } from './gemini-provider';
import { runLocalOcr } from './tesseract-provider';
import { parseRawOcrText } from './field-parser';
import type { StructuredProductData } from './types';

export interface ExtractionOptions {
  mimeType?: string;
  contextMetadata?: {
    productName?: string;
    category?: string;
    isImported?: boolean;
    countryOfOrigin?: string;
  };
}

/**
 * Master OCR and Structured Data Extraction service
 * Tries AI Vision (Gemini) if configured, else uses local Tesseract OCR + Heuristic Parser
 */
export async function extractProductData(
  imageBuffer: Buffer,
  options?: ExtractionOptions
): Promise<StructuredProductData> {
  const hasGeminiKey = !!(
    process.env.GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );

  // 1. Try Gemini Multimodal Vision if key is available
  if (hasGeminiKey) {
    try {
      const data = await runGeminiVisionExtraction(
        imageBuffer,
        options?.mimeType || 'image/jpeg',
        options?.contextMetadata
      );
      if (data && (data.rawOcrText || data.productName || data.mrp.raw || data.netQuantity.raw)) {
        return data;
      }
    } catch (err) {
      console.warn('Gemini vision extraction failed, falling back to local OCR engine:', err);
    }
  }

  // 2. Local OCR Engine — Tesseract.js + Statutory Regex Parsing
  // On Vercel (and other serverless runtimes) Tesseract must download the
  // ~5 MB eng.traineddata model at runtime on every cold start — this
  // reliably causes 504 timeouts on the Hobby plan.  Skip it and surface a
  // clear error so the user knows to set GEMINI_API_KEY.
  const isServerlessEnv = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  if (isServerlessEnv) {
    throw new Error(
      'OCR extraction requires a GEMINI_API_KEY on Vercel deployments. ' +
      'Local Tesseract OCR is not available in serverless environments. ' +
      'Please set the GEMINI_API_KEY environment variable in your Vercel project settings.'
    );
  }

  try {
    const localResult = await runLocalOcr(imageBuffer);

    if (!localResult.text || localResult.text.trim().length === 0) {
      throw new Error('We could not extract readable text from this image. Please try a clearer image.');
    }

    const structured = parseRawOcrText(
      localResult.text,
      {
        general: localResult.confidence,
      },
      localResult.wordBoxes,
      options?.contextMetadata
    );

    return structured;
  } catch (err: any) {
    if (err.message && err.message.includes('could not extract readable text')) {
      throw err;
    }
    throw new Error(`Optical data extraction failed: ${err.message || 'Image processing error'}. Please try a clearer image.`);
  }
}
