import fs from 'fs';
import sharp from 'sharp';
import { createWorker, type Worker } from 'tesseract.js';

let sharedWorker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!sharedWorker) {
    sharedWorker = await createWorker('eng');
  }
  return sharedWorker;
}

async function testTesseractSpeed() {
  const img = fs.readFileSync('public/uploads/parakh_1788581920556_6dc90441.jpg');
  const buffer = await sharp(img).resize(1600, 1600, { fit: 'inside' }).grayscale().normalize().toBuffer();

  console.log('--- Test 1: Worker Init + Recognize ---');
  const t0 = performance.now();
  const worker1 = await getWorker();
  const tInit = performance.now() - t0;
  const tRec0 = performance.now();
  const res1 = await worker1.recognize(buffer);
  const tRec1 = performance.now() - tRec0;
  console.log(`Init: ${Math.round(tInit)} ms, Recognition: ${Math.round(tRec1)} ms, Total: ${Math.round(tInit + tRec1)} ms`);

  console.log('--- Test 2: Shared Worker Reused ---');
  const t2 = performance.now();
  const worker2 = await getWorker();
  const tInit2 = performance.now() - t2;
  const tRec2Start = performance.now();
  const res2 = await worker2.recognize(buffer);
  const tRec2 = performance.now() - tRec2Start;
  console.log(`Init: ${Math.round(tInit2)} ms, Recognition: ${Math.round(tRec2)} ms, Total: ${Math.round(tInit2 + tRec2)} ms`);

  if (sharedWorker) {
    await sharedWorker.terminate();
  }
}

testTesseractSpeed().catch(console.error);
