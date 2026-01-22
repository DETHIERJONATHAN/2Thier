import type { Request } from 'express';

export type BaseUrlOptions = {
  req?: Request;
  // Permet de forcer un fallback en dev si aucune env n'est fournie
  devPortEnvVar?: string; // ex: 'PORT'
};

function firstHeader(req: Request, headerName: string): string | undefined {
  const raw = req.headers[headerName.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === 'string') return raw;
  return undefined;
}

export function getBaseUrlFromRequest(req: Request): string {
  const xfProto = firstHeader(req, 'x-forwarded-proto')?.split(',')[0]?.trim();
  const xfHost = firstHeader(req, 'x-forwarded-host')?.split(',')[0]?.trim();

  const proto = xfProto || req.protocol;
  let host = xfHost || req.get('host');

  // GitHub Codespaces: le frontend tourne souvent sur -5173/-5174 et proxy l'API.
  // Pour les webhooks (Telnyx), il faut une URL publique qui pointe vers le backend.
  // Dans ce repo, le backend écoute généralement sur PORT (défaut 4000).
  if (typeof host === 'string') {
    const backendPort = (process.env.PORT || '4000').trim();
    host = host.replace(/-(5173|5174)(?=\.app\.github\.dev$)/, `-${backendPort}`);
  }

  return `${proto}://${host}`;
}

function isLocalhostBaseUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(trimmed);
  }
}

export function getBackendBaseUrl(options: BaseUrlOptions = {}): string {
  const envBase = (process.env.BACKEND_URL || process.env.APP_URL || process.env.API_URL || '').trim();
  if (envBase && (!options.req || !isLocalhostBaseUrl(envBase))) return envBase;

  if (options.req) return getBaseUrlFromRequest(options.req);

  if (process.env.NODE_ENV !== 'production') {
    const portEnv = options.devPortEnvVar || 'PORT';
    const port = (process.env[portEnv] || '4000').trim();
    return `http://localhost:${port}`;
  }

  throw new Error('BACKEND_URL/APP_URL/API_URL non configurée (impossible de construire une URL en production)');
}

export function joinUrl(base: string, path: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
