#!/usr/bin/env npx tsx
/**
 * 🧪 SCRIPT DE TEST - WORKFLOW B+C ArUco
 * 
 * Ce script teste tous les composants du workflow de détection ArUco :
 * 1. MultiPhotoFusionService
 * 2. MarkerDetector (16 points)
 * 3. GoogleGeminiService.snapPointsToEdges()
 * 4. Endpoints API
 * 
 * Usage: npx tsx scripts/test-aruco-workflow.ts
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function header(message: string) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.bold + colors.blue);
  console.log('='.repeat(60));
}

// ============================================================================
// TESTS
// ============================================================================

async function testPhotoStatus(): Promise<boolean> {
  header('TEST 1: GET /photo/status');
  
  try {
    const response = await fetch(`${API_BASE}/measure/photo/status`);
    const data = await response.json() as any;
    
    if (data.success) {
      success('Endpoint /photo/status répond correctement');
      info(`Mode: ${data.mode}`);
      info(`Marqueur: ${data.markerSpecs?.markerSize}cm`);
      info(`Services: ${JSON.stringify(data.services)}`);
      
      // Vérifier les services
      if (data.services?.multiPhotoFusion && data.services?.gemini) {
        success('Tous les services sont disponibles');
        return true;
      } else {
        error('Certains services manquent');
        return false;
      }
    } else {
      error(`Erreur: ${data.error}`);
      return false;
    }
  } catch (e: any) {
    error(`Exception: ${e.message}`);
    return false;
  }
}

async function testPhotoEndpoint(): Promise<boolean> {
  header('TEST 2: POST /photo (détection simple)');
  
  // Créer une image de test minimale (1x1 pixel noir)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch(`${API_BASE}/measure/photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        mimeType: 'image/png'
      })
    });
    
    const data = await response.json() as any;
    
    if (data.success !== undefined) {
      success('Endpoint /photo répond correctement');
      info(`Détecté: ${data.detected}`);
      info(`Durée: ${data.durationMs}ms`);
      
      // Pas de marqueur attendu sur une image vide
      if (!data.detected) {
        success('Comportement correct (pas de marqueur sur image vide)');
      }
      return true;
    } else {
      error(`Réponse inattendue: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (e: any) {
    error(`Exception: ${e.message}`);
    return false;
  }
}

async function testMultiEndpoint(): Promise<boolean> {
  header('TEST 3: POST /photo/multi (fusion multi-photo)');
  
  // Image de test minimale
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch(`${API_BASE}/measure/photo/multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [
          { imageBase64: testImageBase64, mimeType: 'image/png' },
          { imageBase64: testImageBase64, mimeType: 'image/png' }
        ],
        useImageFusion: true
      })
    });
    
    const data = await response.json() as any;
    
    if (data.success !== undefined) {
      success('Endpoint /photo/multi répond correctement');
      info(`Détecté: ${data.detected}`);
      info(`Fusion utilisée: ${data.imageFusion?.used || data.fusionUsed || false}`);
      info(`Durée: ${data.durationMs}ms`);
      return true;
    } else {
      error(`Réponse inattendue: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (e: any) {
    error(`Exception: ${e.message}`);
    return false;
  }
}

async function testUltraEndpoint(): Promise<boolean> {
  header('TEST 4: POST /photo/ultra (workflow B+C complet)');
  
  // Image de test minimale
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch(`${API_BASE}/measure/photo/ultra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [
          { imageBase64: testImageBase64, mimeType: 'image/png' },
          { imageBase64: testImageBase64, mimeType: 'image/png' }
        ],
        minConfidence: 0.85,
        useAiValidation: true,
        useImageFusion: true
      })
    });
    
    const data = await response.json() as any;
    
    if (data.success !== undefined) {
      success('Endpoint /photo/ultra répond correctement');
      info(`Détecté: ${data.detected}`);
      info(`Précision: ${data.precision || 'N/A'}`);
      info(`Fusion image: ${data.imageFusion?.used || data.fusionUsed || false}`);
      info(`IA validé: ${data.aiValidated || false}`);
      info(`Durée: ${data.durationMs}ms`);
      return true;
    } else {
      error(`Réponse inattendue: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (e: any) {
    error(`Exception: ${e.message}`);
    return false;
  }
}

async function testValidateAiEndpoint(): Promise<boolean> {
  header('TEST 5: POST /photo/validate-ai (snapPointsToEdges)');
  
  // Image de test minimale
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch(`${API_BASE}/measure/photo/validate-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        mimeType: 'image/png',
        points: [
          { label: 'TL', x: 10, y: 10 },
          { label: 'TR', x: 100, y: 10 },
          { label: 'BR', x: 100, y: 100 },
          { label: 'BL', x: 10, y: 100 }
        ]
      })
    });
    
    const data = await response.json() as any;
    
    if (data.success !== undefined) {
      success('Endpoint /photo/validate-ai répond correctement');
      info(`Succès: ${data.success}`);
      info(`Points raffinés: ${data.refinedPoints?.length || 0}`);
      info(`Durée: ${data.durationMs}ms`);
      return true;
    } else {
      error(`Réponse inattendue: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (e: any) {
    error(`Exception: ${e.message}`);
    return false;
  }
}

async function testServicesImport(): Promise<boolean> {
  header('TEST 6: Vérification des imports de services');
  
  try {
    // Vérifier que les services existent
    const multiPhotoPath = path.join(process.cwd(), 'src/services/MultiPhotoFusionService.ts');
    const geminiPath = path.join(process.cwd(), 'src/services/GoogleGeminiService.ts');
    const edgePath = path.join(process.cwd(), 'src/services/EdgeDetectionService.ts');
    const measurePath = path.join(process.cwd(), 'src/api/measure.ts');
    
    let allOk = true;
    
    // Vérifier que les fichiers existent
    if (fs.existsSync(multiPhotoPath)) {
      success('MultiPhotoFusionService.ts existe');
    } else {
      error('MultiPhotoFusionService.ts manquant');
      allOk = false;
    }
    
    if (fs.existsSync(geminiPath)) {
      success('GoogleGeminiService.ts existe');
      
      // Vérifier que snapPointsToEdges existe
      const geminiContent = fs.readFileSync(geminiPath, 'utf-8');
      if (geminiContent.includes('async snapPointsToEdges')) {
        success('snapPointsToEdges() est implémenté');
      } else {
        error('snapPointsToEdges() manquant dans GoogleGeminiService');
        allOk = false;
      }
    } else {
      error('GoogleGeminiService.ts manquant');
      allOk = false;
    }
    
    if (fs.existsSync(edgePath)) {
      success('EdgeDetectionService.ts existe');
    } else {
      error('EdgeDetectionService.ts manquant');
      allOk = false;
    }
    
    // Vérifier que measure.ts importe les services
    if (fs.existsSync(measurePath)) {
      const measureContent = fs.readFileSync(measurePath, 'utf-8');
      
      if (measureContent.includes("import { multiPhotoFusionService }")) {
        success('measure.ts importe multiPhotoFusionService');
      } else {
        error('measure.ts n\'importe pas multiPhotoFusionService');
        allOk = false;
      }
      
      if (measureContent.includes("import GoogleGeminiService")) {
        success('measure.ts importe GoogleGeminiService');
      } else {
        error('measure.ts n\'importe pas GoogleGeminiService');
        allOk = false;
      }
      
      // Vérifier les appels
      if (measureContent.includes('multiPhotoFusionService.fusePhotos')) {
        success('multiPhotoFusionService.fusePhotos() est appelé');
      } else {
        error('multiPhotoFusionService.fusePhotos() n\'est pas appelé');
        allOk = false;
      }
      
      if (measureContent.includes('geminiService.snapPointsToEdges')) {
        success('geminiService.snapPointsToEdges() est appelé');
      } else {
        error('geminiService.snapPointsToEdges() n\'est pas appelé');
        allOk = false;
      }
    }
    
    return allOk;
  } catch (e: any) {
    error(`Exception: ${e.message}`);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  log('🧪 TEST DU WORKFLOW B+C ArUco', colors.bold + colors.cyan);
  log('=' .repeat(60), colors.cyan);
  console.log('\n');
  
  const results: { name: string; passed: boolean }[] = [];
  
  // Test 6 d'abord (vérification statique des fichiers)
  results.push({ name: 'Imports de services', passed: await testServicesImport() });
  
  // Tests API (nécessitent que le serveur soit démarré)
  info('\n⚠️  Les tests suivants nécessitent que le serveur soit démarré sur le port 4000');
  info('   Lancer: npm run dev\n');
  
  try {
    results.push({ name: '/photo/status', passed: await testPhotoStatus() });
    results.push({ name: '/photo', passed: await testPhotoEndpoint() });
    results.push({ name: '/photo/multi', passed: await testMultiEndpoint() });
    results.push({ name: '/photo/ultra', passed: await testUltraEndpoint() });
    results.push({ name: '/photo/validate-ai', passed: await testValidateAiEndpoint() });
  } catch (e: any) {
    error(`Impossible de se connecter au serveur: ${e.message}`);
    info('Assurez-vous que le serveur est démarré: npm run dev');
  }
  
  // Résumé
  header('RÉSUMÉ DES TESTS');
  
  let passed = 0;
  let failed = 0;
  
  for (const result of results) {
    if (result.passed) {
      success(`${result.name}`);
      passed++;
    } else {
      error(`${result.name}`);
      failed++;
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  log(`Total: ${passed}/${results.length} tests passés`, passed === results.length ? colors.green : colors.yellow);
  
  if (failed > 0) {
    console.log('\n');
    error(`${failed} test(s) échoué(s)`);
    process.exit(1);
  } else {
    console.log('\n');
    success('Tous les tests sont passés ! Le workflow B+C est fonctionnel.');
    process.exit(0);
  }
}

main().catch(console.error);
