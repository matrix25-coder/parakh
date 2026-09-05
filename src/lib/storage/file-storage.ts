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

/**
 * Save an uploaded Buffer or Base64 Data URL to public/uploads
 */
export async function saveImageFile(
  input: Buffer | string,
  originalFilename?: string
): Promise<SavedImageResult> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let buffer: Buffer;
  let mimeType = 'image/jpeg';

  if (typeof input === 'string') {
    // Handle data URL: data:image/png;base64,...
    const matches = input.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
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
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFileSync(filePath, buffer);

  const publicUrl = `/uploads/${fileName}`;

  return {
    filePath,
    publicUrl,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
  };
}
