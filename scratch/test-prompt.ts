import fs from 'fs';
import sharp from 'sharp';

const apiKey = fs.readFileSync('.env.local', 'utf8').match(/GEMINI_API_KEY=\s*([^\r\n]+)/)?.[1]?.trim() || '';

async function testPromptOptimization() {
  const img = fs.readFileSync('public/uploads/parakh_1788581920556_6dc90441.jpg');
  const processedBuffer = await sharp(img)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const base64Image = processedBuffer.toString('base64');

  // Test 1: Current Prompt
  const currentPrompt = `You are a Legal Metrology (Packaged Commodities) Rules, 2011 statutory compliance inspection AI.
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
    "raw": string or null,
    "hasInclusiveOfAllTaxes": boolean
  },
  "netQuantity": {
    "value": number or null,
    "unit": string or null,
    "raw": string or null,
    "isStandardUnit": boolean
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
  "rawOcrText": string,
  "fieldConfidences": {
    "manufacturer_name": number,
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
}`;

  console.log('Testing Current Prompt...');
  const t0 = performance.now();
  const res1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: currentPrompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });
  const t1 = performance.now();
  const d1 = await res1.json();
  const tokens1 = d1.usageMetadata;
  console.log(`Current Prompt: ${Math.round(t1 - t0)} ms, Output Tokens: ${tokens1?.candidatesTokenCount}, Total Tokens: ${tokens1?.totalTokenCount}`);

  // Test 2: Streamlined Prompt without verbose instruction and without asking for rawOcrText full transcription
  const optimizedPrompt = `Extract Legal Metrology declarations from this product package label into JSON:
{
  "productName": string|null,
  "brand": string|null,
  "commodityName": string|null,
  "manufacturer": string|null,
  "packer": string|null,
  "importer": string|null,
  "address": string|null,
  "pincode": string|null,
  "mrp": { "value": number|null, "currency": "INR"|null, "raw": string|null, "hasInclusiveOfAllTaxes": boolean },
  "netQuantity": { "value": number|null, "unit": string|null, "raw": string|null, "isStandardUnit": boolean },
  "manufacturingDate": { "month": number|null, "year": number|null, "raw": string|null, "formatted": string|null, "isCompliantFormat": boolean },
  "expiryDate": { "raw": string|null, "bestBeforeMonths": number|null, "expiryFormatted": string|null },
  "consumerCare": { "phone": string|null, "email": string|null, "address": string|null, "raw": string|null },
  "countryOfOrigin": string|null,
  "isImported": boolean,
  "boundingBoxes": {
    "manufacturer_name": { "top": number, "left": number, "width": number, "height": number },
    "commodity_description": { "top": number, "left": number, "width": number, "height": number },
    "net_quantity": { "top": number, "left": number, "width": number, "height": number },
    "mrp": { "top": number, "left": number, "width": number, "height": number },
    "month_year": { "top": number, "left": number, "width": number, "height": number },
    "consumer_care": { "top": number, "left": number, "width": number, "height": number }
  }
}
Coordinates are 0-100 percentages. Return null if absent. Only extract visible facts.`;

  console.log('Testing Optimized Prompt...');
  const t2 = performance.now();
  const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: optimizedPrompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });
  const t3 = performance.now();
  const d2 = await res2.json();
  const tokens2 = d2.usageMetadata;
  console.log(`Optimized Prompt: ${Math.round(t3 - t2)} ms, Output Tokens: ${tokens2?.candidatesTokenCount}, Total Tokens: ${tokens2?.totalTokenCount}`);
}

testPromptOptimization().catch(console.error);
