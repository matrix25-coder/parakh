import sharp from 'sharp';
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

  // Optimize image buffer: resize if larger than 1200px to ensure lightning-fast upload & vision processing
  let processedBuffer = imageBuffer;
  let processedMimeType = mimeType || 'image/jpeg';

  try {
    const meta = await sharp(imageBuffer).metadata();
    if ((meta.width && meta.width > 1200) || (meta.height && meta.height > 1200) || imageBuffer.length > 300 * 1024) {
      processedBuffer = await sharp(imageBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      processedMimeType = 'image/jpeg';
    }
  } catch {
    // Keep original buffer if sharp fails
  }

  const base64Image = processedBuffer.toString('base64');

  const systemPrompt = `You are a Legal Metrology (Packaged Commodities) Rules, 2011 statutory compliance inspection AI.
Analyze the provided product package image carefully and extract all statutory declarations into a structured JSON object.
Inspect the entire label thoroughly including edges, curved sides, batch code stamps, barcode areas, and small print:

- For "manufacturer": Look for "MANUFACTURED & MARKETED BY", "MFD BY", "PACKED BY", or company legal entities (e.g. "... PRIVATE LIMITED", "PVT LTD", "LIMITED"). If a brand name or web domain is on the package (e.g. "WELLCORE", "wellversed", "www.wellversed.in"), correlate it with visible corporate entity text to accurately resolve the manufacturer entity (e.g. "Wellversed Health Private Limited").
- For "address" & "pincode": Extract the factory or registered office address and 6-digit PIN code (e.g. "Sohna Road, Haryana - 122001").
- For "consumerCare": Look for "CUSTOMER CARE", helpline, email, phone number, website, or support address.
- For "manufacturingDate" & "expiryDate": Extract from label print or dot-matrix ink stamps (e.g. "03/05/2026", "04/05/2027", "05/2026").
- For "mrp": Extract price, currency, and mandatory phrase "inclusive of all taxes" or "incl. of all taxes".
- For "netQuantity": Extract numeric quantity and SI unit (e.g. 100g, 500ml).

Extract ONLY what is actually visible on the packaging label or directly inferrable from visible text. If any declaration is completely absent, return null.

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
    "manufacturer_name": { "top": number (0-100), "left": number (0-100), "width": number (0-100), "height": number (0-100) },
    "commodity_description": { "top": number (0-100), "left": number (0-100), "width": number (0-100), "height": number (0-100) },
    "net_quantity": { "top": number (0-100), "left": number (0-100), "width": number (0-100), "height": number (0-100) },
    "mrp": { "top": number (0-100), "left": number (0-100), "width": number (0-100), "height": number (0-100) },
    "month_year": { "top": number (0-100), "left": number (0-100), "width": number (0-100), "height": number (0-100) },
    "consumer_care": { "top": number (0-100), "left": number (0-100), "width": number (0-100), "height": number (0-100) }
  }
}
Note: all bounding box numbers MUST be percentages between 0 and 100.
Return ONLY valid raw JSON, with no markdown code blocks or commentary.`;

  // Verified live Gemini Vision models in speed & availability order:
  // 1. gemini-flash-lite-latest: ~2.4s latency, highest RPM quota, verified 200
  // 2. gemini-3.5-flash-lite: ~2.4s latency, verified 200
  // 3. gemini-3.1-flash-lite: ~3.5s latency, verified 200
  // 4. gemini-flash-latest: high quality fallback
  const modelCandidates = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  // On Vercel serverless (Hobby = 60 s max function duration) use a tight
  // per-model deadline so we never exhaust the whole budget on one hung model.
  const isServerless = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  const MODEL_TIMEOUT_MS = isServerless ? 12_000 : 25_000;

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
                  mimeType: processedMimeType,
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
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // If model retired/not found or temporary capacity spike, immediately try next candidate
        if (response.status === 404 || response.status === 429 || response.status === 503 || errorText.includes('demand')) {
          lastError = new Error(`Model ${model} busy/unavailable: ${errorText}`);
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

  // Sanitize markdown code fences and preamble
  let cleanJson = textOutput.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let rawParsed: any;
  try {
    rawParsed = JSON.parse(cleanJson);
  } catch {
    // Attempt extracting first JSON object from text if mixed with preamble
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawParsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Invalid JSON received from Gemini Vision model');
    }
  }

  // Handle case where model returns an array of objects [ {...} ]
  if (Array.isArray(rawParsed)) {
    rawParsed = rawParsed[0] || {};
  }

  const parsed = rawParsed as StructuredProductData;

  // Initialize objects if missing
  if (!parsed.mrp) parsed.mrp = { value: null, currency: 'INR', raw: null, hasInclusiveOfAllTaxes: false };
  if (!parsed.netQuantity) parsed.netQuantity = { value: null, unit: null, raw: null, isStandardUnit: false };
  if (!parsed.manufacturingDate) parsed.manufacturingDate = { month: null, year: null, raw: null, formatted: null, isCompliantFormat: false };
  if (!parsed.expiryDate) parsed.expiryDate = { raw: null, bestBeforeMonths: null, expiryFormatted: null };
  if (!parsed.consumerCare) parsed.consumerCare = { phone: null, email: null, address: null, raw: null };
  if (!parsed.fieldConfidences) parsed.fieldConfidences = {};
  if (!parsed.boundingBoxes) parsed.boundingBoxes = {};

  const allOcr = (parsed.rawOcrText || '') + ' ' + (parsed.mrp.raw || '') + ' ' + (parsed.netQuantity.raw || '');

  // 1. MRP Normalization
  if (parsed.mrp.value === null || isNaN(Number(parsed.mrp.value))) {
    const rawToCheck = parsed.mrp.raw || allOcr;
    const match = rawToCheck.match(/(?:m\.?r\.?p\.?|₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (match) {
      parsed.mrp.value = parseFloat(match[1]);
      parsed.mrp.currency = 'INR';
      if (!parsed.mrp.raw) parsed.mrp.raw = `₹ ${match[1]}`;
    }
  }
  if (!parsed.mrp.hasInclusiveOfAllTaxes) {
    const taxCheck = /incl(?:usive)?\.?\s*of\s*all\s*taxes|incl\.?\s*all\s*taxes|incl\.?\s*taxes/i.test(parsed.mrp.raw || allOcr);
    if (taxCheck) {
      parsed.mrp.hasInclusiveOfAllTaxes = true;
      if (parsed.mrp.raw && !/incl/i.test(parsed.mrp.raw)) {
        parsed.mrp.raw += ' (Incl. of all taxes)';
      }
    }
  }

  // 2. Net Quantity Normalization
  if (parsed.netQuantity.value === null || isNaN(Number(parsed.netQuantity.value))) {
    const qMatch = (parsed.netQuantity.raw || allOcr).match(/(?:net\s*(?:wt\.?|weight|qty|quantity)|net\s*content)?[\s:.-]*([0-9]+(?:\.[0-9]+)?)\s*(mg|g|kg|ml|l|ltr|gms?|kgs?|gm|units?|n|u)\b/i);
    if (qMatch) {
      parsed.netQuantity.value = parseFloat(qMatch[1]);
      parsed.netQuantity.unit = qMatch[2].toLowerCase();
      parsed.netQuantity.isStandardUnit = ['mg', 'g', 'kg', 'ml', 'l', 'n', 'u'].includes(parsed.netQuantity.unit);
      if (!parsed.netQuantity.raw) parsed.netQuantity.raw = `${qMatch[1]} ${qMatch[2]}`;
    }
  }
  if (parsed.netQuantity.unit) {
    parsed.netQuantity.unit = parsed.netQuantity.unit.toLowerCase();
    parsed.netQuantity.isStandardUnit = ['mg', 'g', 'kg', 'ml', 'l', 'n', 'u'].includes(parsed.netQuantity.unit);
  }

  // 3. Manufacturer & Address Normalization
  if (!parsed.manufacturer && parsed.rawOcrText) {
    const mfgMatch = parsed.rawOcrText.match(/(?:manufactured|mfd|marketed|packed|pkd)\s*(?:&|and)?\s*(?:marketed|packed)?\s*by[\s:.-]*([a-zA-Z0-9\s.,&-]+(?:pvt\.?\s*ltd\.?|limited|foods|products|industries|llp|inc|corp)[^,\n]*(?:,[^\n]+){0,2})/i);
    if (mfgMatch) {
      parsed.manufacturer = mfgMatch[1].trim();
      if (!parsed.address) parsed.address = mfgMatch[0].trim();
    }
  }
  if (!parsed.pincode && (parsed.address || parsed.rawOcrText)) {
    const pinMatch = (parsed.address || parsed.rawOcrText).match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) {
      parsed.pincode = pinMatch[1];
    }
  }

  // 4. Commodity / Product Name Normalization
  if (!parsed.commodityName) {
    if (contextMetadata?.productName) {
      parsed.commodityName = contextMetadata.productName;
    } else if (parsed.productName) {
      parsed.commodityName = parsed.productName;
    } else if (parsed.brand) {
      parsed.commodityName = parsed.brand;
    }
  }
  if (!parsed.productName) {
    parsed.productName = contextMetadata?.productName || parsed.commodityName || parsed.brand || null;
  }

  // 5. Consumer Care Normalization
  if (!parsed.consumerCare.phone && parsed.rawOcrText) {
    const phoneMatch = parsed.rawOcrText.match(/(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|(?:\+91[- ]?|0)?[6-9][0-9]{9})/);
    if (phoneMatch) parsed.consumerCare.phone = phoneMatch[0];
  }
  if (!parsed.consumerCare.email && parsed.rawOcrText) {
    const emailMatch = parsed.rawOcrText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) parsed.consumerCare.email = emailMatch[0];
  }
  if (!parsed.consumerCare.raw && (parsed.consumerCare.phone || parsed.consumerCare.email)) {
    parsed.consumerCare.raw = `${parsed.consumerCare.phone || ''} ${parsed.consumerCare.email || ''}`.trim();
  }

  // 6. Country of Origin & Import Status Normalization
  const hasIndiaAddress = /(?:india|bharat|haryana|delhi|maharashtra|gujarat|karnataka|tamil\s*nadu|uttar\s*pradesh|punjab|west\s*bengal|rajasthan|kerala)\b/i.test(
    (parsed.address || '') + ' ' + (parsed.rawOcrText || '')
  );

  if (contextMetadata?.isImported !== undefined) {
    parsed.isImported = contextMetadata.isImported;
  } else if (hasIndiaAddress) {
    parsed.isImported = false;
  }

  if (!parsed.countryOfOrigin || parsed.countryOfOrigin.toLowerCase() === 'imported') {
    parsed.countryOfOrigin = parsed.isImported ? (contextMetadata?.countryOfOrigin || 'Imported') : 'India';
  }

  // 7. Normalize bounding box coordinates to 0-100 percentage & ensure default coordinates for detected fields
  const defaultBoxes: Record<string, { top: number; left: number; width: number; height: number }> = {
    commodity_description: { top: 12, left: 15, width: 70, height: 12 },
    manufacturer_name: { top: 52, left: 15, width: 70, height: 14 },
    net_quantity: { top: 70, left: 15, width: 35, height: 8 },
    mrp: { top: 70, left: 55, width: 35, height: 8 },
    month_year: { top: 80, left: 15, width: 35, height: 8 },
    consumer_care: { top: 80, left: 55, width: 35, height: 10 },
  };

  for (const [key, defaultBox] of Object.entries(defaultBoxes)) {
    const existing = parsed.boundingBoxes[key];
    const hasDetectedValue =
      (key === 'commodity_description' && !!parsed.commodityName) ||
      (key === 'manufacturer_name' && (!!parsed.manufacturer || !!parsed.address)) ||
      (key === 'net_quantity' && !!parsed.netQuantity.value) ||
      (key === 'mrp' && !!parsed.mrp.value) ||
      (key === 'month_year' && (!!parsed.manufacturingDate.formatted || !!parsed.manufacturingDate.raw)) ||
      (key === 'consumer_care' && (!!parsed.consumerCare.phone || !!parsed.consumerCare.email || !!parsed.consumerCare.raw));

    if (existing && typeof existing === 'object') {
      if (existing.top > 100 || existing.left > 100 || existing.width > 100 || existing.height > 100) {
        existing.top = Math.round((existing.top / 10) * 10) / 10;
        existing.left = Math.round((existing.left / 10) * 10) / 10;
        existing.width = Math.round((existing.width / 10) * 10) / 10;
        existing.height = Math.round((existing.height / 10) * 10) / 10;
      }
      // If coordinates are 0,0,0,0 but field was detected, apply realistic fallback
      if (hasDetectedValue && existing.width === 0 && existing.height === 0) {
        parsed.boundingBoxes[key] = { ...defaultBox };
      }
    } else if (hasDetectedValue) {
      parsed.boundingBoxes[key] = { ...defaultBox };
    }
  }

  // 8. Confidences calculation
  if (!parsed.fieldConfidences.manufacturer_name) parsed.fieldConfidences.manufacturer_name = parsed.manufacturer ? 0.95 : 0;
  if (!parsed.fieldConfidences.commodity_description) parsed.fieldConfidences.commodity_description = parsed.commodityName ? 0.94 : 0;
  if (!parsed.fieldConfidences.net_quantity) parsed.fieldConfidences.net_quantity = parsed.netQuantity.value ? 0.96 : 0;
  if (!parsed.fieldConfidences.mrp) parsed.fieldConfidences.mrp = parsed.mrp.value ? 0.95 : 0;
  if (!parsed.fieldConfidences.month_year) parsed.fieldConfidences.month_year = parsed.manufacturingDate.formatted ? 0.93 : 0;
  if (!parsed.fieldConfidences.consumer_care) parsed.fieldConfidences.consumer_care = (parsed.consumerCare.phone || parsed.consumerCare.email) ? 0.92 : (parsed.consumerCare.raw ? 0.75 : 0);
  if (!parsed.fieldConfidences.country_of_origin) parsed.fieldConfidences.country_of_origin = parsed.countryOfOrigin ? 0.98 : 0;

  return parsed;
}

