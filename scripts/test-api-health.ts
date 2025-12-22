/**
 * Script de test pour vérifier la santé de l'API
 * Usage: npx tsx scripts/test-api-health.ts
 */

const API_BASE = 'http://localhost:4000';

interface TestResult {
  endpoint: string;
  status: 'success' | 'error';
  statusCode?: number;
  responseTime: number;
  message: string;
}

async function testEndpoint(
  endpoint: string,
  options: RequestInit = {}
): Promise<TestResult> {
  const start = Date.now();
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseTime = Date.now() - start;
    const data = await response.text();

    return {
      endpoint,
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      responseTime,
      message: response.ok
        ? `✅ OK (${response.status})`
        : `❌ Erreur ${response.status}: ${data.substring(0, 100)}`,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      endpoint,
      status: 'error',
      responseTime,
      message: `❌ Connexion échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
}

async function runTests() {
  console.log('🔍 Test de santé de l\'API CRM');
  console.log('='.repeat(50));
  console.log(`📍 URL de base: ${API_BASE}`);
  console.log(`📅 Date: ${new Date().toLocaleString('fr-BE')}`);
  console.log('='.repeat(50));
  console.log('');

  const tests = [
    // Test de base - serveur accessible
    { endpoint: '/api/health', name: 'Santé du serveur' },
    
    // Test authentification
    { endpoint: '/api/auth/me', name: 'Endpoint Auth /me' },
    
    // Test AI status
    { endpoint: '/api/ai/status', name: 'Statut IA' },
    
    // Test modules
    { endpoint: '/api/modules', name: 'Liste des modules' },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`🧪 Test: ${test.name}`);
    const result = await testEndpoint(test.endpoint);
    results.push(result);
    console.log(`   ${result.message} (${result.responseTime}ms)`);
    console.log('');
  }

  // Résumé
  console.log('='.repeat(50));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(50));

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  console.log(`✅ Réussis: ${successCount}`);
  console.log(`❌ Échoués: ${errorCount}`);
  console.log(`📈 Total: ${results.length}`);

  if (errorCount > 0) {
    console.log('');
    console.log('⚠️  Endpoints en erreur:');
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        console.log(`   - ${r.endpoint}: ${r.message}`);
      });
  }

  // Code de sortie
  process.exit(errorCount > 0 ? 1 : 0);
}

// Exécution
runTests().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
