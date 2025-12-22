/**
 * Script de test pour l'authentification
 * Usage: npx tsx scripts/test-auth-endpoint.ts
 */

const API_BASE = 'http://localhost:4000';

interface AuthResponse {
  user?: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
  };
  error?: string;
  message?: string;
}

async function testAuthEndpoint() {
  console.log('🔐 Test de l\'endpoint d\'authentification');
  console.log('='.repeat(50));
  console.log(`📍 URL: ${API_BASE}/api/auth/me`);
  console.log(`📅 ${new Date().toLocaleString('fr-BE')}`);
  console.log('='.repeat(50));
  console.log('');

  // Test 1: Sans authentification
  console.log('🧪 Test 1: Requête sans token');
  try {
    const start = Date.now();
    const response = await fetch(`${API_BASE}/api/auth/me`);
    const elapsed = Date.now() - start;
    const data = await response.json() as AuthResponse;

    console.log(`   Status: ${response.status}`);
    console.log(`   Temps: ${elapsed}ms`);
    console.log(`   Réponse: ${JSON.stringify(data, null, 2).substring(0, 200)}`);

    if (response.status === 401) {
      console.log('   ✅ Comportement attendu: Non authentifié');
    } else if (response.status === 200 && data.user) {
      console.log(`   ✅ Utilisateur connecté: ${data.user.email}`);
    } else {
      console.log(`   ⚠️ Réponse inattendue`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error instanceof Error ? error.message : error}`);
  }

  console.log('');

  // Test 2: Avec header d'organisation (simule un appel frontend)
  console.log('🧪 Test 2: Requête avec headers CRM');
  try {
    const start = Date.now();
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': '1757366075154-i554z93kl', // ID 2Thier CRM
      },
    });
    const elapsed = Date.now() - start;
    const text = await response.text();

    console.log(`   Status: ${response.status}`);
    console.log(`   Temps: ${elapsed}ms`);
    console.log(`   Headers reçus:`);
    response.headers.forEach((value, key) => {
      if (['content-type', 'set-cookie', 'x-'].some(prefix => key.toLowerCase().includes(prefix))) {
        console.log(`     ${key}: ${value.substring(0, 80)}`);
      }
    });

    try {
      const data = JSON.parse(text);
      console.log(`   Réponse JSON: ${JSON.stringify(data, null, 2).substring(0, 300)}`);
    } catch {
      console.log(`   Réponse brute: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error instanceof Error ? error.message : error}`);
  }

  console.log('');

  // Test 3: Test CORS preflight
  console.log('🧪 Test 3: CORS Preflight (OPTIONS)');
  try {
    const start = Date.now();
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,x-organization-id',
      },
    });
    const elapsed = Date.now() - start;

    console.log(`   Status: ${response.status}`);
    console.log(`   Temps: ${elapsed}ms`);
    console.log(`   CORS Headers:`);
    ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-credentials'].forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        console.log(`     ${header}: ${value}`);
      }
    });

    if (response.status === 204 || response.status === 200) {
      console.log('   ✅ CORS configuré correctement');
    } else {
      console.log('   ⚠️ CORS peut avoir des problèmes');
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error instanceof Error ? error.message : error}`);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Tests d\'authentification terminés');
}

// Vérifier d'abord si le serveur est accessible
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/api/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔄 Vérification du serveur...');
  
  const serverUp = await checkServer();
  
  if (!serverUp) {
    console.log('');
    console.log('❌ Le serveur n\'est pas accessible sur ' + API_BASE);
    console.log('');
    console.log('💡 Assurez-vous de démarrer le serveur avec:');
    console.log('   npm run dev:server');
    console.log('');
    process.exit(1);
  }

  console.log('✅ Serveur accessible');
  console.log('');
  
  await testAuthEndpoint();
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
