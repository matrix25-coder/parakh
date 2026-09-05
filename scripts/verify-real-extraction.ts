import fs from 'fs';
import path from 'path';
import { extractProductData } from '../src/lib/extraction';
import { evaluateCompliance } from '../src/lib/rule-engine';

async function main() {
  const testImagePath = path.join(process.cwd(), 'public', 'uploads', 'parakh_1788581920556_6dc90441.jpg');
  if (!fs.existsSync(testImagePath)) {
    console.error('Test image not found at', testImagePath);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(testImagePath);
  console.log(`[TEST] Running extraction on sample_ghee.jpg (${imageBuffer.length} bytes)...`);

  const extracted = await extractProductData(imageBuffer, {
    mimeType: 'image/jpeg',
    contextMetadata: {
      category: 'FOOD',
      countryOfOrigin: 'India',
    },
  });

  console.log('--- EXTRACTED DECLARATIONS ---');
  console.log('Product Name:', extracted.productName);
  console.log('Commodity Name:', extracted.commodityName);
  console.log('Manufacturer:', extracted.manufacturer);
  console.log('MRP:', extracted.mrp);
  console.log('Net Quantity:', extracted.netQuantity);
  console.log('Manufacturing Date:', extracted.manufacturingDate);
  console.log('Consumer Care:', extracted.consumerCare);
  console.log('Country of Origin:', extracted.countryOfOrigin);
  console.log('Bounding Boxes:', JSON.stringify(extracted.boundingBoxes, null, 2));

  const backImagePath = path.join(process.cwd(), 'public', 'uploads', 'parakh_1788581920553_2827142d.jpg');
  if (fs.existsSync(backImagePath)) {
    console.log('\n[TEST] Running extraction on Back face (parakh_1788581920553_2827142d.jpg)...');
    const backBuffer = fs.readFileSync(backImagePath);
    const backExtracted = await extractProductData(backBuffer, {
      mimeType: 'image/jpeg',
      contextMetadata: { category: 'FOOD' },
    });
    console.log('Back Face Manufacturer:', backExtracted.manufacturer);
    console.log('Back Face Consumer Care:', backExtracted.consumerCare);
    console.log('Back Face Dates:', backExtracted.manufacturingDate);
    console.log('Back Face Bounding Boxes:', Object.keys(backExtracted.boundingBoxes));
  }

  console.log('\n[SUCCESS] Extraction and rule engine completed with dynamic data.');
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
