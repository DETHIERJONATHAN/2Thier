#!/usr/bin/env tsx
import 'dotenv/config';
import { describeGoogleOAuthConfig, GOOGLE_OAUTH_SCOPES, googleOAuthConfig, isGoogleOAuthConfigured } from '../src/auth/googleConfig.ts';

function obfuscate(value: string | undefined, prefix = 4, suffix = 4): string {
  if (!value) return '[missing]';
  if (value.length <= prefix + suffix) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

function main(): void {
  const summary = describeGoogleOAuthConfig();
  const { clientId, clientSecret, redirectUri, projectId } = googleOAuthConfig;

  console.log('🔎  Google OAuth configuration summary');
  console.log('-----------------------------------');
  console.table({
    clientId: obfuscate(clientId),
    clientSecret: obfuscate(clientSecret),
    redirectUri,
    projectId: projectId ?? '[missing]',
    scopes: GOOGLE_OAUTH_SCOPES.length,
    isConfigured: summary.isConfigured,
  });

  if (!isGoogleOAuthConfigured()) {
    console.warn('\n⚠️  Warning: Google OAuth client ID or secret is missing.');
    console.warn('   Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are defined.');
  }

  const missing: string[] = [];
  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!redirectUri) missing.push('GOOGLE_REDIRECT_URI');
  if (!projectId) missing.push('GOOGLE_PROJECT_ID');

  if (missing.length) {
    console.warn(`\n⚠️  Missing environment variables: ${missing.join(', ')}`);
  } else {
    console.log('\n✅  All required Google OAuth environment variables are present.');
  }

  console.log('\n🔐  Scopes requested (preview of first 5):');
  GOOGLE_OAUTH_SCOPES.slice(0, 5).forEach(scope => console.log(` - ${scope}`));
  if (GOOGLE_OAUTH_SCOPES.length > 5) {
    console.log(` ... (${GOOGLE_OAUTH_SCOPES.length - 5} additional scopes)`);
  }

  console.log('\nPro tip: run this script locally and on Cloud Run (using the service account) to ensure parity.');
}

main();
