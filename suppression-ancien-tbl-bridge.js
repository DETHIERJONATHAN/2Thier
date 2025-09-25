/**
 * 🗑️ SUPPRESSION ANCIEN SYSTÈME TBL BRIDGE
 * 
 * Suppression sécurisée de l'ancien code basé sur de fausses suppositions
 */

import fs from 'fs';
import path from 'path';

console.log('🗑️ SUPPRESSION ANCIEN SYSTÈME TBL BRIDGE');
console.log('=========================================\n');

const TBL_BRIDGE_PATH = path.join('src', 'components', 'TreeBranchLeaf', 'tbl-bridge');

console.log('🎯 PLAN DE SUPPRESSION SÉCURISÉ');
console.log('================================');

const FILES_TO_DELETE = [
  // Fichiers principaux obsolètes
  'TBLBridge.ts',
  'TBLBridgeValidator.ts', 
  'index.ts',
  
  // Types basés sur fausses suppositions
  'types/TBLBridgeTypes.ts',
  
  // Handlers obsolètes
  'handlers/DataFieldHandler.ts',
  
  // Composants obsolètes  
  'components/TBLDataField.tsx',
  
  // Branches obsolètes
  'branches/BranchHandler.ts',
  'branches/SubBranchHandler.ts'
];

const DIRECTORIES_TO_DELETE = [
  // Dossiers basés sur ancienne architecture
  'api',
  'capabilities', 
  'capacites',
  'feuilles',
  'sections',
  'types',
  'handlers',
  'components',
  'branches'
];

console.log('📋 FICHIERS À SUPPRIMER :');
FILES_TO_DELETE.forEach(file => {
  const fullPath = path.join(TBL_BRIDGE_PATH, file);
  console.log(`   📄 ${file}`);
  
  if (fs.existsSync(fullPath)) {
    console.log(`      ✅ Existe - sera supprimé`);
  } else {
    console.log(`      ⚠️  N'existe pas déjà`);
  }
});

console.log('\n📁 DOSSIERS À SUPPRIMER :');
DIRECTORIES_TO_DELETE.forEach(dir => {
  const fullPath = path.join(TBL_BRIDGE_PATH, dir);
  console.log(`   📁 ${dir}`);
  
  if (fs.existsSync(fullPath)) {
    console.log(`      ✅ Existe - sera supprimé`);
  } else {
    console.log(`      ⚠️  N'existe pas déjà`);
  }
});

console.log('\n🛡️ FICHIERS PRÉSERVÉS :');
console.log('   📄 README.md (nouvelle architecture)');

console.log('\n⚠️ VALIDATION AVANT SUPPRESSION');
console.log('================================');

// Vérifier que README.md contient la nouvelle architecture
const readmePath = path.join(TBL_BRIDGE_PATH, 'README.md');
if (fs.existsSync(readmePath)) {
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  const hasNewArchitecture = readmeContent.includes('Architecture RÉELLE') && 
                           readmeContent.includes('70 éléments') &&
                           readmeContent.includes('AVERTISSEMENT CRITIQUE');
  
  if (hasNewArchitecture) {
    console.log('✅ README.md contient la nouvelle architecture');
    console.log('✅ Sécurisé de procéder à la suppression');
  } else {
    console.log('❌ README.md ne contient pas la nouvelle architecture !');
    console.log('🛑 ARRÊT - Ne pas supprimer sans nouveau README');
    process.exit(1);
  }
} else {
  console.log('❌ README.md manquant !');
  console.log('🛑 ARRÊT - Nouveau README requis');
  process.exit(1);
}

console.log('\n🗑️ PROCÉDURE DE SUPPRESSION');
console.log('============================');

function deleteFilesSafely() {
  let deletedFiles = 0;
  let errors = 0;
  
  // Supprimer les fichiers
  FILES_TO_DELETE.forEach(file => {
    const fullPath = path.join(TBL_BRIDGE_PATH, file);
    
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`   ✅ Supprimé : ${file}`);
        deletedFiles++;
      }
    } catch (error) {
      console.log(`   ❌ Erreur suppression ${file}: ${error.message}`);
      errors++;
    }
  });
  
  // Supprimer les dossiers (récursivement)
  DIRECTORIES_TO_DELETE.forEach(dir => {
    const fullPath = path.join(TBL_BRIDGE_PATH, dir);
    
    try {
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   ✅ Supprimé dossier : ${dir}`);
        deletedFiles++;
      }
    } catch (error) {
      console.log(`   ❌ Erreur suppression dossier ${dir}: ${error.message}`);
      errors++;
    }
  });
  
  return { deletedFiles, errors };
}

// Exécuter la suppression
console.log('\n🚀 DÉBUT SUPPRESSION...');
const result = deleteFilesSafely();

console.log('\n📊 RÉSULTAT SUPPRESSION');
console.log('=======================');
console.log(`✅ Éléments supprimés : ${result.deletedFiles}`);
console.log(`❌ Erreurs : ${result.errors}`);

if (result.errors === 0) {
  console.log('\n🎉 SUPPRESSION RÉUSSIE !');
  console.log('✅ Ancien système TBL Bridge supprimé');
  console.log('✅ README.md avec nouvelle architecture préservé');
  console.log('🚀 Prêt pour création nouveau système !');
} else {
  console.log('\n⚠️ SUPPRESSION PARTIELLE');
  console.log(`${result.errors} erreurs détectées`);
  console.log('🔍 Vérifier manuellement les éléments non supprimés');
}

console.log('\n📋 STRUCTURE FINALE :');
console.log('======================');
try {
  const remainingItems = fs.readdirSync(TBL_BRIDGE_PATH);
  remainingItems.forEach(item => {
    console.log(`   📄 ${item}`);
  });
} catch (error) {
  console.log(`❌ Erreur lecture dossier : ${error.message}`);
}

console.log('\n✨ Ancien système supprimé, nouvelle architecture documentée !');
console.log('🚀 Prochaine étape : Création du NOUVEAU système TBL Bridge !');