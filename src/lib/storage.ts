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
import { logger } from './logger';

const isProduction = process.env.NODE_ENV === 'production';
const GCS_BUCKET = process.env.GCS_BUCKET || 'crm-2thier-uploads';

logger.debug(`📦 [Storage] Mode: GCS 100% (${isProduction ? 'production' : 'dev'}) | Bucket: ${GCS_BUCKET}`);

// ── Auth ──────────────────────────────────────────────────────

/**
 * Custom auth client for dev: wraps `gcloud auth print-access-token`.
 * Needed because the service account key is expired but gcloud CLI works.
 */
class GcloudAuth {
  private token: string;
  private tokenExpiry: number;
  constructor(token: string) {
    this.token = token;
    this.tokenExpiry = Date.now() + 50 * 60 * 1000; // refresh after 50min
  }
  private refreshIfNeeded() {
    if (Date.now() > this.tokenExpiry) {
      try {
        this.token = execSync('gcloud auth print-access-token', {
          encoding: 'utf-8',
          env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: undefined },
        }).trim();
        this.tokenExpiry = Date.now() + 50 * 60 * 1000;
        logger.debug('📦 [Storage] 🔄 Token refreshed');
      } catch (e) {
        logger.error('📦 [Storage] ⚠️ Token refresh failed:', e);
      }
    }
  }
  async getAccessToken() {
    this.refreshIfNeeded();
    return { token: this.token };
  }
  async getRequestHeaders() {
    this.refreshIfNeeded();
    return { Authorization: `Bearer ${this.token}` };
  }
  async request(opts: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }) {
    this.refreshIfNeeded();
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
          authClient: new GcloudAuth(token) as unknown,
        });
        logger.debug('📦 [Storage] ✅ Auth via gcloud access token');
      } catch {
        logger.warn('📦 [Storage] ⚠️ gcloud token failed, trying default credentials');
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
  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
  const blob = bucket.file(key);
  await blob.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: { cacheControl: 'no-cache' },
  });
  const url = `https://storage.googleapis.com/${GCS_BUCKET}/${key}`;
  logger.debug(`📦 [Storage] ✅ Upload OK: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return url;
  } catch (err: unknown) {
    // If auth error, reset storage to force re-auth on next call
    if (!isProduction && (err?.code === 401 || err?.message?.includes('token') || err?.message?.includes('auth'))) {
      logger.warn('📦 [Storage] ⚠️ Auth error detected, resetting storage for re-auth');
      storage = null;
    }
    throw err;
  }
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
    logger.debug(`📦 [Storage] 🗑️ Deleted: ${key}`);
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

/**
 * List all file keys in GCS bucket (for orphan detection).
 */
export async function listAllGCSFiles(prefix?: string): Promise<string[]> {
  const bucket = getStorage().bucket(GCS_BUCKET);
  const [files] = await bucket.getFiles({ prefix: prefix || undefined, maxResults: 10000 });
  return files.map(f => f.name);
}
