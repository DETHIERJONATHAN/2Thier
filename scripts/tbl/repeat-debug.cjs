#!/usr/bin/env node
/**
 * Quick repeat plan+execute debugger.
 * - Uses x-test-bypass-auth by default (no JWT needed).
 * - Calls /api/repeat/:id/instances (plan) then /instances/execute.
 * - Saves both responses to scripts/diagnostics/repeat-<id>-<ts>.json.
 *
 * Usage:
 *   node scripts/tbl/repeat-debug.js <repeaterNodeId> [--suffix 2] [--scope scope-123] [--base http://localhost:4000]
 *
 * Env:
 *   BACKEND_URL: override base URL (default http://localhost:4000)
 *   REPEAT_SUFFIX: default suffix
 *   REPEAT_SCOPE: default scopeId
 *   NO_BYPASS=1 to disable x-test-bypass-auth
 *   TOKEN=... to send Authorization: Bearer <token>
 */

const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node scripts/tbl/repeat-debug.js <repeaterNodeId> [--suffix N] [--scope S] [--base URL]');
  process.exit(1);
}

const repeaterNodeId = args[0];
const getFlag = (flag) => {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
};

const baseUrl = getFlag('--base') || process.env.BACKEND_URL || 'http://localhost:4000';
const suffix = getFlag('--suffix') || process.env.REPEAT_SUFFIX;
const scopeId = getFlag('--scope') || process.env.REPEAT_SCOPE;
const useBypass = process.env.NO_BYPASS !== '1';
const token = process.env.TOKEN;

const outDir = join(process.cwd(), 'scripts', 'diagnostics');
mkdirSync(outDir, { recursive: true });

const headers = {
  'content-type': 'application/json'
};
if (useBypass) headers['x-test-bypass-auth'] = '1';
if (token) headers['authorization'] = `Bearer ${token}`;

const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

const main = async () => {
  const body = {};
  if (suffix !== undefined) body.suffix = isNaN(Number(suffix)) ? suffix : Number(suffix);
  if (scopeId) body.scopeId = scopeId;

  console.log('[repeat-debug] Base URL:', baseUrl);
  console.log('[repeat-debug] Repeater:', repeaterNodeId);
  console.log('[repeat-debug] Body:', body);
  console.log('[repeat-debug] Bypass auth:', useBypass, token ? '(token provided overrides bypass)' : '');

  const planUrl = `${baseUrl}/api/repeat/${repeaterNodeId}/instances`;
  const execUrl = `${baseUrl}/api/repeat/${repeaterNodeId}/instances/execute`;

  const plan = await postJson(planUrl, body);
  console.log('[repeat-debug] Plan status:', plan.status);

  const exec = await postJson(execUrl, body);
  console.log('[repeat-debug] Execute status:', exec.status);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(outDir, `repeat-${repeaterNodeId}-${ts}.json`);
  writeFileSync(outPath, JSON.stringify({
    meta: { repeaterNodeId, baseUrl, suffix, scopeId, useBypass, tokenPresent: !!token },
    plan,
    exec
  }, null, 2));

  console.log('[repeat-debug] Saved diagnostics to', outPath);
  if (exec.status >= 400) {
    console.error('[repeat-debug] Execute failed, see diagnostics file.');
    process.exitCode = 1;
  }
};

main().catch(err => {
  console.error('[repeat-debug] Unexpected error', err);
  process.exit(1);
});
