/**
 * PARAKH Barcode & QR Code Optical Detection Engine
 * 
 * Ingests image elements, canvases, or OCR tokens to extract:
 * - EAN-13, UPC-A, GTIN-14 barcodes
 * - FSSAI QR Codes / URLs / DataMatrix
 */

export interface DetectedBarcode {
  rawValue: string;
  format: 'EAN_13' | 'UPC_A' | 'QR_CODE' | 'DATA_MATRIX' | 'CODE_128' | 'UNKNOWN';
  boundingBox?: { x: number; y: number; width: number; height: number };
  source: 'NATIVE_DETECTOR' | 'REGEX_OCR' | 'AI_VISION';
}

/**
 * Detect barcodes in a browser image or canvas element using the native BarcodeDetector API
 */
export async function detectBarcodesFromImageElement(
  imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<DetectedBarcode[]> {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = ['ean_13', 'upc_a', 'qr_code', 'data_matrix', 'code_128'];
      const detector = new (window as any).BarcodeDetector({ formats });
      const barcodes = await detector.detect(imageElement);

      return barcodes.map((b: any) => ({
        rawValue: b.rawValue,
        format: (b.format || 'UNKNOWN').toUpperCase().replace('-', '_'),
        boundingBox: b.boundingBox ? {
          x: b.boundingBox.x,
          y: b.boundingBox.y,
          width: b.boundingBox.width,
          height: b.boundingBox.height,
        } : undefined,
        source: 'NATIVE_DETECTOR',
      }));
    } catch (err) {
      console.warn('Native BarcodeDetector API execution error:', err);
    }
  }

  return [];
}

/**
 * Fallback: Extract GTIN-13, EAN, and FSSAI QR/license numbers from raw OCR text
 */
export function extractBarcodesFromOcrText(rawText: string): DetectedBarcode[] {
  const detected: DetectedBarcode[] = [];

  // Match 13-digit EAN-13 (especially starting with 890 for India)
  const eanMatches = rawText.match(/\b(890\d{10})\b/g) || rawText.match(/\b(\d{13})\b/g);
  if (eanMatches) {
    eanMatches.forEach((code) => {
      if (!detected.some((d) => d.rawValue === code)) {
        detected.push({
          rawValue: code,
          format: 'EAN_13',
          source: 'REGEX_OCR',
        });
      }
    });
  }

  // Match 12-digit UPC
  const upcMatches = rawText.match(/\b(\d{12})\b/g);
  if (upcMatches) {
    upcMatches.forEach((code) => {
      if (!detected.some((d) => d.rawValue === code)) {
        detected.push({
          rawValue: code,
          format: 'UPC_A',
          source: 'REGEX_OCR',
        });
      }
    });
  }

  // Match 14-digit FSSAI numbers
  const fssaiMatches = rawText.match(/(?:fssai|lic(?:\.|\s*no)?)\s*[:.-]?\s*([1-2]\d{13})\b/i);
  if (fssaiMatches && fssaiMatches[1]) {
    detected.push({
      rawValue: fssaiMatches[1],
      format: 'QR_CODE',
      source: 'REGEX_OCR',
    });
  }

  return detected;
}
