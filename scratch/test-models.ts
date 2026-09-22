import fs from 'fs';

const apiKey = fs.readFileSync('.env.local', 'utf8').match(/GEMINI_API_KEY=\s*([^\r\n]+)/)?.[1]?.trim() || '';

async function testFastModels() {
  const candidates = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];
  for (const m of candidates) {
    const t0 = performance.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with json: {"status": "ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      const t = performance.now() - t0;
      console.log(m, 'Status:', res.status, 'Time:', Math.round(t), 'ms');
    } catch (e: any) {
      console.log(m, 'Error:', e.message);
    }
  }
}

testFastModels();
