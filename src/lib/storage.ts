/**
 * Module de stockage unifié — local en dev, Google Cloud Storage en production.
 *
 * Usage :
 *   import { uploadFile, getPublicUrl } from '@/lib/storage';
 *   const url = await uploadFile(buffer, 'wall/1234_photo.jpg', 'image/jpeg');
 */

import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';

const isProduction = process.env.NODE_ENV === 'production';
const GCS_BUCKET = process.env.GCS_BUCKET || 'crm-2thier-uploads';

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage(); // Uses ADC in Cloud Run (automatic)
  }
  return storage;
}

/**
 * Upload a file buffer to storage.
 * @param buffer  - The file content as a Buffer
 * @param key     - The storage path, e.g. "wall/1710000000_photo.jpg"
 * @param mimeType - The MIME type, e.g. "image/jpeg"
 * @returns The public URL that can be used to access the file
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string,
): Promise<string> {
  if (isProduction) {
    return uploadToGCS(buffer, key, mimeType);
  }
  return uploadToLocal(buffer, key);
}

/**
 * Upload a file using express-fileupload's .mv() — local only, wraps GCS in prod.
 * @param file     - express-fileupload file object (.mv, .name, .mimetype, .data)
 * @param key      - The storage path, e.g. "wall/1710000000_photo.jpg"
 * @returns The public URL
 */
export async function uploadExpressFile(
  file: { data: Buffer; mimetype: string; mv: (path: string) => Promise<void> },
  key: string,
): Promise<string> {
  if (isProduction) {
    return uploadToGCS(file.data, key, file.mimetype);
  }
  // In dev, save locally under public/uploads/
  const localPath = path.join(process.cwd(), 'public', 'uploads', key);
  const dir = path.dirname(localPath);
  await fs.mkdir(dir, { recursive: true });
  await file.mv(localPath);
  return `/uploads/${key}`;
}

/**
 * Delete a file from storage by its key or URL.
 */
export async function deleteFile(keyOrUrl: string): Promise<void> {
  const key = extractKey(keyOrUrl);
  if (!key) return;

  if (isProduction) {
    try {
      await getStorage().bucket(GCS_BUCKET).file(key).delete();
    } catch {
      // File may not exist — ignore
    }
  } else {
    const localPath = path.join(process.cwd(), 'public', 'uploads', key);
    try {
      await fs.unlink(localPath);
    } catch {
      // File may not exist — ignore
    }
  }
}

// ── Internal ──────────────────────────────────────────────────

async function uploadToGCS(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  const bucket = getStorage().bucket(GCS_BUCKET);
  const blob = bucket.file(key);
  await blob.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=3600',
    },
  });
  return `https://storage.googleapis.com/${GCS_BUCKET}/${key}`;
}

async function uploadToLocal(buffer: Buffer, key: string): Promise<string> {
  const localPath = path.join(process.cwd(), 'public', 'uploads', key);
  const dir = path.dirname(localPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(localPath, buffer);
  return `/uploads/${key}`;
}

function extractKey(keyOrUrl: string): string | null {
  if (!keyOrUrl) return null;
  // GCS URL  →  extract path after bucket
  const gcsPrefix = `https://storage.googleapis.com/${GCS_BUCKET}/`;
  if (keyOrUrl.startsWith(gcsPrefix)) {
    return keyOrUrl.slice(gcsPrefix.length);
  }
  // Local URL  →  strip /uploads/ prefix
  if (keyOrUrl.startsWith('/uploads/')) {
    return keyOrUrl.slice('/uploads/'.length);
  }
  // Assume it's already a key
  return keyOrUrl;
}
