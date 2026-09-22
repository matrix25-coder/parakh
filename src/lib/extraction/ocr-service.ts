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
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();

  // 1. Try Gemini Multimodal Vision if key is available
  if (apiKey) {
    try {
      const data = await runGeminiVisionExtraction(
        imageBuffer,
        options?.mimeType || 'image/jpeg',
        options?.contextMetadata
      );
      if (data) {
        return data;
      }
    } catch (err: any) {
      console.error('Gemini vision extraction failed:', err);
      const isServerlessEnv = !!(process.env.VERCEL || process.env.VERCEL_ENV);
      if (isServerlessEnv) {
        throw new Error(`Gemini Vision Extraction failed: ${err.message || String(err)}`);
      }
    }
  } else {
    const isServerlessEnv = !!(process.env.VERCEL || process.env.VERCEL_ENV);
    if (isServerlessEnv) {
      throw new Error(
        'GEMINI_API_KEY environment variable is missing in Vercel project settings. ' +
        'Please add GEMINI_API_KEY under Settings > Environment Variables.'
      );
    }
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
