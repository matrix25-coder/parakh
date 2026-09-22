import sharp from 'sharp';
import type { StructuredProductData } from './types';
import { parseUsp, parseFssai, parseBarcode } from './field-parser';

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
  const rawKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  // Optimize image buffer: resize to max 1024px at quality 78 for instantaneous upload and fast inference
  let processedBuffer = imageBuffer;
  let processedMimeType = mimeType || 'image/jpeg';

  try {
    const meta = await sharp(imageBuffer).metadata();
    if ((meta.width && meta.width > 1024) || (meta.height && meta.height > 1024) || imageBuffer.length > 120 * 1024) {
      processedBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78 })
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

  // Verified fast Gemini models
  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ];

  const fetchSingleModel = async (model: string, signal: AbortSignal): Promise<string> => {
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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model ${model} error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const output = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!output) {
      throw new Error(`Model ${model} returned empty content`);
    }
    return output;
  };

  let textOutput: string | null = null;
  const ctrl1 = new AbortController();
  const ctrl2 = new AbortController();
  let candidate2Started = false;
  let candidate2Promise: Promise<string> | null = null;

  const startCandidate2 = () => {
    if (!candidate2Started) {
      candidate2Started = true;
      candidate2Promise = fetchSingleModel(models[1], ctrl2.signal);
    }
    return candidate2Promise!;
  };

  let hedgeTimerId: NodeJS.Timeout | null = null;
  const hedgeTimer = new Promise<string>((_, reject) => {
    hedgeTimerId = setTimeout(() => {
      startCandidate2().then(() => {}, () => {});
      reject(new Error('HedgeTimerTriggered'));
    }, 2600);
  });

  const p1 = fetchSingleModel(models[0], ctrl1.signal);

  try {
    textOutput = await Promise.race([p1, hedgeTimer]);
    if (hedgeTimerId) clearTimeout(hedgeTimerId);
    ctrl2.abort();
  } catch (err: any) {
    if (hedgeTimerId) clearTimeout(hedgeTimerId);
    if (err.message === 'HedgeTimerTriggered') {
      try {
        textOutput = await Promise.any([p1, candidate2Promise!]);
        ctrl1.abort();
        ctrl2.abort();
      } catch {
        // Both 1 and 2 failed, will try model 3
      }
    } else {
      // Candidate 1 errored out early; immediately wait for candidate 2
      try {
        textOutput = await startCandidate2();
        ctrl2.abort();
      } catch {
        // Candidate 2 also failed
      }
    }
  }

  // Fallback to model 3 if candidates 1 and 2 did not succeed
  if (!textOutput) {
    const ctrl3 = new AbortController();
    const timeout3 = setTimeout(() => ctrl3.abort(), 3500);
    try {
      textOutput = await fetchSingleModel(models[2], ctrl3.signal);
      clearTimeout(timeout3);
    } catch (err3: any) {
      clearTimeout(timeout3);
      throw new Error(`All Gemini Vision models failed: ${err3.message || String(err3)}`);
    }
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

  // 9. USP, FSSAI & Barcode normalization from allOcr / rawOcrText
  if (!parsed.usp || !parsed.usp.value) {
    const extractedUsp = parseUsp(allOcr);
    if (extractedUsp.raw) parsed.usp = extractedUsp;
  }
  if (!parsed.fssaiLicense || !parsed.fssaiLicense.licenseNumber) {
    const extractedFssai = parseFssai(allOcr);
    if (extractedFssai.licenseNumber) parsed.fssaiLicense = extractedFssai;
  }
  if (!parsed.barcode || !parsed.barcode.gtin) {
    const extractedBarcode = parseBarcode(allOcr);
    if (extractedBarcode.gtin) parsed.barcode = extractedBarcode;
  }

  return parsed;
}

