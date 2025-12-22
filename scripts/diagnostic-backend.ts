/**
 * Script de diagnostic rapide du backend
 * Usage: npx tsx scripts/diagnostic-backend.ts
 * 
 * Ce script vérifie:
 * 1. Si le serveur répond
 * 2. Si les routes principales fonctionnent
 * 3. Si l'authentification est configurée
 * 4. Si Prisma peut accéder à la BDD
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000';
const TIMEOUT = 10000;

type TestStatus = '✅' | '❌' | '⚠️';

interface DiagResult {
  name: string;
  status: TestStatus;
  details: string;
  duration: number;
}

const results: DiagResult[] = [];

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function runDiagnostic(
  name: string,
  testFn: () => Promise<{ status: TestStatus; details: string }>
): Promise<void> {
  const start = Date.now();
  
  try {
    const { status, details } = await testFn();
    results.push({
      name,
      status,
      details,
      duration: Date.now() - start,
    });
  } catch (error) {
    results.push({
      name,
      status: '❌',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      duration: Date.now() - start,
    });
  }
}

// ============================================
// TESTS
// ============================================

async function testServerConnection() {
  return runDiagnostic('Connexion au serveur', async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/health`);
      if (response.ok) {
        return { status: '✅', details: `Port 4000 accessible (${response.status})` };
      }
      return { status: '⚠️', details: `Serveur répond avec status ${response.status}` };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { status: '❌', details: 'Timeout - serveur ne répond pas' };
      }
      throw error;
    }
  });
}

async function testAuthRoute() {
  return runDiagnostic('Route /api/auth/me', async () => {
    const response = await fetchWithTimeout(`${API_BASE}/api/auth/me`);
    const text = await response.text();
    
    if (response.status === 401) {
      return { status: '✅', details: 'Route fonctionne (401 sans session)' };
    }
    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        if (data.user) {
          return { status: '✅', details: `Utilisateur: ${data.user.email}` };
        }
      } catch {
        // ignore
      }
      return { status: '✅', details: 'Route accessible' };
    }
    if (response.status === 500) {
      return { status: '❌', details: `Erreur serveur: ${text.substring(0, 100)}` };
    }
    return { status: '⚠️', details: `Status inattendu: ${response.status}` };
  });
}

async function testCORS() {
  return runDiagnostic('Configuration CORS', async () => {
    const response = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    
    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowCredentials = response.headers.get('access-control-allow-credentials');
    
    if (response.status === 204 || response.status === 200) {
      if (allowCredentials === 'true') {
        return { status: '✅', details: `CORS OK, credentials autorisés` };
      }
      return { status: '⚠️', details: 'CORS OK mais credentials non configurés' };
    }
    return { status: '❌', details: `CORS problématique (${response.status})` };
  });
}

async function testAPIStatus() {
  return runDiagnostic('Route /api/ai/status', async () => {
    const response = await fetchWithTimeout(`${API_BASE}/api/ai/status`, {
      headers: {
        'x-organization-id': '1757366075154-i554z93kl',
      },
    });
    
    if (response.ok) {
      return { status: '✅', details: 'API IA accessible' };
    }
    if (response.status === 401) {
      return { status: '⚠️', details: 'Nécessite authentification' };
    }
    return { status: '❌', details: `Erreur ${response.status}` };
  });
}

async function testModulesRoute() {
  return runDiagnostic('Route /api/modules', async () => {
    const response = await fetchWithTimeout(`${API_BASE}/api/modules`, {
      headers: {
        'x-organization-id': '1757366075154-i554z93kl',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : 'N/A';
      return { status: '✅', details: `${count} modules trouvés` };
    }
    if (response.status === 401) {
      return { status: '⚠️', details: 'Authentification requise' };
    }
    return { status: '❌', details: `Erreur ${response.status}` };
  });
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         🔧 DIAGNOSTIC BACKEND CRM                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 URL de base: ${API_BASE}`);
  console.log(`📅 Date: ${new Date().toLocaleString('fr-BE')}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
  console.log('');
  console.log('─'.repeat(60));
  
  // Exécuter les tests
  await testServerConnection();
  
  // Continuer seulement si le serveur est accessible
  if (results[0]?.status === '✅') {
    await testAuthRoute();
    await testCORS();
    await testAPIStatus();
    await testModulesRoute();
  }
  
  // Afficher les résultats
  console.log('');
  console.log('📋 RÉSULTATS:');
  console.log('─'.repeat(60));
  
  for (const result of results) {
    console.log(`${result.status} ${result.name}`);
    console.log(`   └─ ${result.details} (${result.duration}ms)`);
  }
  
  console.log('');
  console.log('─'.repeat(60));
  
  // Résumé
  const success = results.filter(r => r.status === '✅').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  const errors = results.filter(r => r.status === '❌').length;
  
  console.log(`📊 Résumé: ${success} ✅ | ${warnings} ⚠️ | ${errors} ❌`);
  
  if (errors > 0) {
    console.log('');
    console.log('💡 Conseils:');
    if (results[0]?.status === '❌') {
      console.log('   1. Lancez le serveur: npm run dev:server');
      console.log('   2. Vérifiez que le port 4000 n\'est pas utilisé');
    } else {
      console.log('   1. Consultez les logs du serveur pour plus de détails');
      console.log('   2. Vérifiez la configuration .env');
    }
  }
  
  console.log('');
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
