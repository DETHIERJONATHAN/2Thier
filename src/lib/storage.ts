/**
 * Module de stockage unifié — 100% Google Cloud Storage.
 *
 * Zéro stockage local. Zéro cache. Zéro fallback.
 * Tous les fichiers sont sur GCS, toutes les URLs retournées sont absolues.
 *
 * - Production (Cloud Run) : ADC automatique via le service account du container.
 * - Dev (Codespaces)       : gcloud access token via custom auth client.
 *
 * Le bucket utilise "uniform bucket-level access" → pas de ACL par objet,
 * donc on ne passe JAMAIS `public: true` à blob.save().
 */

import { Storage } from '@google-cloud/storage';
import { execSync } from 'child_process';
import fs from 'fs/promises';

const isProduction = process.env.NODE_ENV === 'production';
const GCS_BUCKET = process.env.GCS_BUCKET || 'crm-2thier-uploads';

console.log(`📦 [Storage] Mode: GCS 100% (${isProduction ? 'production' : 'dev'}) | Bucket: ${GCS_BUCKET}`);

// ── Auth ──────────────────────────────────────────────────────

/**
 * Custom auth client for dev: wraps `gcloud auth print-access-token`.
 * Needed because the service account key is expired but gcloud CLI works.
 */
class GcloudAuth {
  private token: string;
  constructor(token: string) {
    this.token = token;
  }
  async getAccessToken() {
    return { token: this.token };
  }
  async getRequestHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }
  async request(opts: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }) {
    const resp = await fetch(opts.url, {
      method: opts.method || 'GET',
      headers: { ...opts.headers, Authorization: `Bearer ${this.token}` },
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    return { data: await resp.json(), status: resp.status };
  }
}

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    if (isProduction) {
      storage = new Storage();
    } else {
      try {
        const token = execSync('gcloud auth print-access-token', {
          encoding: 'utf-8',
          env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: undefined },
        }).trim();
        storage = new Storage({
          projectId: process.env.GCLOUD_PROJECT || 'thiernew',
          authClient: new GcloudAuth(token) as any,
        });
        console.log('📦 [Storage] ✅ Auth via gcloud access token');
      } catch {
        console.warn('📦 [Storage] ⚠️ gcloud token failed, trying default credentials');
        storage = new Storage();
      }
    }
  }
  return storage;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Upload a Buffer to GCS and return the absolute public URL.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string,
): Promise<string> {
  const bucket = getStorage().bucket(GCS_BUCKET);
  const blob = bucket.file(key);
  await blob.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: { cacheControl: 'no-cache' },
  });
  const url = `https://storage.googleapis.com/${GCS_BUCKET}/${key}`;
  console.log(`📦 [Storage] ✅ Upload OK: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return url;
}

/**
 * Upload an express-fileupload file to GCS.
 * Handles the case where file.data is empty (useTempFiles mode).
 */
export async function uploadExpressFile(
  file: { data: Buffer; mimetype: string; tempFilePath?: string; mv: (path: string) => Promise<void> },
  key: string,
): Promise<string> {
  let buffer = file.data;
  if ((!buffer || buffer.length === 0) && file.tempFilePath) {
    buffer = await fs.readFile(file.tempFilePath);
  }
  return uploadFile(buffer, key, file.mimetype);
}

/**
 * Delete a file from GCS.
 */
export async function deleteFile(keyOrUrl: string): Promise<void> {
  const key = extractKey(keyOrUrl);
  if (!key) return;
  try {
    await getStorage().bucket(GCS_BUCKET).file(key).delete();
    console.log(`📦 [Storage] 🗑️ Deleted: ${key}`);
  } catch {
    // File may not exist — ignore
  }
}

// ── Helpers ───────────────────────────────────────────────────

function extractKey(keyOrUrl: string): string | null {
  if (!keyOrUrl) return null;
  const gcsPrefix = `https://storage.googleapis.com/${GCS_BUCKET}/`;
  if (keyOrUrl.startsWith(gcsPrefix)) {
    return keyOrUrl.slice(gcsPrefix.length);
  }
  if (keyOrUrl.startsWith('/uploads/')) {
    return keyOrUrl.slice('/uploads/'.length);
  }
  return keyOrUrl;
}
