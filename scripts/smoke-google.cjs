#!/usr/bin/env node
// Smoke test Google Workspace endpoints
// Usage: node scripts/smoke-google.cjs --token=<JWT> --org=<organizationId> [--user=<userId>]

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k,v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

const token = args.token || process.env.TOKEN;
const org = args.org || process.env.ORG_ID;
const user = args.user || process.env.USER_ID;

if (!token || !org) {
  console.error('Usage: node scripts/smoke-google.cjs --token=<JWT> --org=<organizationId> [--user=<userId>]');
  process.exit(1);
}

async function main() {
  const base = 'http://localhost:4000/api';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const statusUrl = `${base}/google-auth/status?organizationId=${encodeURIComponent(org)}`;
    process.stdout.write(`GET ${statusUrl}\n`);
    const statusRes = await fetch(statusUrl, { headers });
    const statusJson = await statusRes.json().catch(() => ({}));
    console.log('Status code:', statusRes.status);
    console.log('Body:', JSON.stringify(statusJson, null, 2));
  } catch (e) {
    console.error('Status call failed:', e.message || e);
  }

  if (user) {
    try {
      const logoutUrl = `${base}/auto-google-auth/trigger-logout`;
      process.stdout.write(`POST ${logoutUrl}\n`);
      const logoutRes = await fetch(logoutUrl, { method: 'POST', headers, body: JSON.stringify({ userId: user }) });
      const logoutJson = await logoutRes.json().catch(() => ({}));
      console.log('Logout code:', logoutRes.status);
      console.log('Body:', JSON.stringify(logoutJson, null, 2));
    } catch (e) {
      console.error('Trigger-logout call failed:', e.message || e);
    }
  }
}

main();
