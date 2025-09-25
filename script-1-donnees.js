// Script 1: Analyse complète des données TBL
console.log('🔍 SCRIPT 1: ANALYSE COMPLÈTE DES DONNÉES TBL');
console.log('='.repeat(50));

// 1. Vérifier l'état des données globales
const formData = window.TBL_FORM_DATA || {};
const allKeys = Object.keys(formData);
const mirrorKeys = allKeys.filter(k => k.startsWith('__mirror_data_'));
const dataKeys = allKeys.filter(k => !k.startsWith('__mirror_data_'));

console.log('📊 ÉTAT DES DONNÉES:');
console.log(`- Total clés formData: ${allKeys.length}`);
console.log(`- Clés données normales: ${dataKeys.length}`);
console.log(`- Clés mirror: ${mirrorKeys.length}`);

if (dataKeys.length > 0) {
  console.log('\n📝 ÉCHANTILLON DONNÉES NORMALES:');
  dataKeys.slice(0, 10).forEach(key => {
    console.log(`  ${key}: ${formData[key]}`);
  });
}

if (mirrorKeys.length > 0) {
  console.log('\n🪞 TOUTES LES CLÉS MIRROR:');
  mirrorKeys.forEach(key => {
    console.log(`  ${key}: ${formData[key]}`);
  });
}

// 2. Analyser la page TBL
const tblContainer = document.querySelector('[class*="TBL"], .tbl-container, .ant-layout');
console.log(`\n🏗️ STRUCTURE PAGE:`);
console.log(`- Container TBL trouvé: ${!!tblContainer}`);

if (tblContainer) {
  console.log(`- Taille container: ${tblContainer.children.length} enfants`);
  
  // Compter les différents types d'éléments
  const tabs = tblContainer.querySelectorAll('.ant-tabs-tab');
  const cards = tblContainer.querySelectorAll('.ant-card');
  const inputs = tblContainer.querySelectorAll('input');
  const smartFields = tblContainer.querySelectorAll('[data-testid*="smart-calculated-field"]');
  
  console.log(`- Onglets: ${tabs.length}`);
  console.log(`- Cartes: ${cards.length}`);
  console.log(`- Inputs: ${inputs.length}`);
  console.log(`- SmartFields: ${smartFields.length}`);
}

console.log('\n✅ SCRIPT 1 TERMINÉ - Exécutez script-2.js pour analyser les cartes');