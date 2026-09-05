import type { StructuredProductData } from './types';

/**
 * Extract structured Legal Metrology declarations using Google Gemini Multimodal Vision API
 */
export async function runGeminiVisionExtraction(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  contextMetadata?: {
    productName?: string;
    category?: string;
    isImported?: boolean;
    countryOfOrigin?: string;
  }
): Promise<StructuredProductData> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured.');
  }

  const base64Image = imageBuffer.toString('base64');

  const systemPrompt = `You are a Legal Metrology (Packaged Commodities) Rules, 2011 statutory compliance inspection AI.
Analyze the provided product package image carefully and extract all statutory declarations into a structured JSON object.

Extract ONLY what is actually visible on the packaging label. If any declaration is absent or illegible, return null. DO NOT invent or assume values.

Expected JSON output format:
{
  "productName": string or null,
  "brand": string or null,
  "commodityName": string or null,
  "manufacturer": string or null,
  "packer": string or null,
  "importer": string or null,
  "address": string or null,
  "pincode": string or null (6 digits if found),
  "mrp": {
    "value": number or null,
    "currency": "INR" or null,
    "raw": string or null (e.g. "MRP Rs. 150.00 incl. of all taxes"),
    "hasInclusiveOfAllTaxes": boolean (true ONLY if the exact phrase "inclusive of all taxes" or "incl. of all taxes" is present)
  },
  "netQuantity": {
    "value": number or null,
    "unit": string or null (e.g. "g", "kg", "ml", "l", "gms"),
    "raw": string or null,
    "isStandardUnit": boolean (true for g, kg, ml, l, mg, m, cm, mm, n, u; false for gms, kgs, etc.)
  },
  "manufacturingDate": {
    "month": number or null,
    "year": number or null,
    "raw": string or null,
    "formatted": string or null,
    "isCompliantFormat": boolean
  },
  "expiryDate": {
    "raw": string or null,
    "bestBeforeMonths": number or null,
    "expiryFormatted": string or null
  },
  "consumerCare": {
    "phone": string or null,
    "email": string or null,
    "address": string or null,
    "raw": string or null
  },
  "countryOfOrigin": string or null,
  "isImported": boolean,
  "rawOcrText": string (all text detected on the package),
  "fieldConfidences": {
    "manufacturer_name": number (0.0 to 1.0),
    "commodity_description": number,
    "net_quantity": number,
    "month_year": number,
    "mrp": number,
    "consumer_care": number,
    "country_of_origin": number
  },
  "boundingBoxes": {
    "manufacturer_name": { "top": number, "left": number, "width": number, "height": number },
    "commodity_description": { "top": number, "left": number, "width": number, "height": number },
    "net_quantity": { "top": number, "left": number, "width": number, "height": number },
    "mrp": { "top": number, "left": number, "width": number, "height": number },
    "month_year": { "top": number, "left": number, "width": number, "height": number },
    "consumer_care": { "top": number, "left": number, "width": number, "height": number }
  }
}
Return ONLY valid raw JSON, with no markdown code blocks or commentary.`;

  // Supported Gemini Multimodal Vision Models in priority order (fastest first)
  const modelCandidates = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.6-flash'];
  let lastError: Error | null = null;
  let textOutput: string | null = null;

  for (const model of modelCandidates) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const requestBody = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // If model retired/not found, try next candidate
        if (response.status === 404) {
          lastError = new Error(`Model ${model} not found: ${errorText}`);
          continue;
        }
        throw new Error(`Gemini Vision API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) break;
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!textOutput) {
    throw lastError || new Error('No extraction response received from Gemini Vision model.');
  }

  // Sanitize any accidental markdown code fences
  let cleanJson = textOutput.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanJson) as StructuredProductData;

  // Apply context overrides if provided
  if (contextMetadata?.productName && !parsed.productName) {
    parsed.productName = contextMetadata.productName;
  }
  if (contextMetadata?.isImported !== undefined) {
    parsed.isImported = contextMetadata.isImported;
  }

  return parsed;
}
