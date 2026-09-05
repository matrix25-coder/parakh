import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface SavedImageResult {
  filePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

import os from 'os';

/**
 * Save an uploaded Buffer or Base64 Data URL to public/uploads
 * In serverless environments (e.g. Vercel) where /var/task is read-only,
 * falls back to returning the self-contained base64 data URL.
 */
export async function saveImageFile(
  input: Buffer | string,
  originalFilename?: string
): Promise<SavedImageResult> {
  let buffer: Buffer;
  let mimeType = 'image/jpeg';
  let inputDataUrl: string | null = null;

  if (typeof input === 'string') {
    // Handle data URL: data:image/png;base64,...
    const matches = input.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
      inputDataUrl = input;
    } else {
      // Plain base64 without prefix
      buffer = Buffer.from(input, 'base64');
    }
  } else {
    buffer = input;
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds statutory 15MB limit.`);
  }

  // Determine extension from originalFilename or mimeType
  let ext = 'jpg';
  if (originalFilename) {
    const origExt = path.extname(originalFilename).toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'webp'].includes(origExt)) {
      ext = origExt === 'jpeg' ? 'jpg' : origExt;
    }
  } else if (ALLOWED_MIME_TYPES.has(mimeType)) {
    ext = ALLOWED_MIME_TYPES.get(mimeType)!;
  }

  const uniqueId = crypto.randomUUID();
  const fileName = `parakh_${Date.now()}_${uniqueId.slice(0, 8)}.${ext}`;
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV ||
    process.env.LAMBDA_TASK_ROOT
  );

  let publicUrl = `/uploads/${fileName}`;
  let filePath = path.join(uploadsDir, fileName);

  if (!isServerless) {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
    } catch {
      // If local filesystem is read-only, fallback to data URL
      publicUrl = inputDataUrl || `data:${mimeType};base64,${buffer.toString('base64')}`;
      filePath = path.join(os.tmpdir(), fileName);
      try { fs.writeFileSync(filePath, buffer); } catch {}
    }
  } else {
    // In serverless (e.g. Vercel), /var/task is read-only.
    // Return self-contained base64 data URL so it displays anywhere without file hosting
    publicUrl = inputDataUrl || `data:${mimeType};base64,${buffer.toString('base64')}`;
    filePath = path.join(os.tmpdir(), fileName);
    try { fs.writeFileSync(filePath, buffer); } catch {}
  }

  return {
    filePath,
    publicUrl,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
  };
}
