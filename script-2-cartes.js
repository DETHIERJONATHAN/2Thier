// Script 2: Analyse détaillée des cartes SmartCalculatedField
console.log('🎴 SCRIPT 2: ANALYSE DÉTAILLÉE DES CARTES');
console.log('='.repeat(50));

const smartFields = document.querySelectorAll('[data-testid*="smart-calculated-field"]');
console.log(`🔍 ${smartFields.length} SmartCalculatedField trouvés`);

if (smartFields.length === 0) {
  console.log('⚠️ Aucun SmartCalculatedField trouvé!');
  console.log('🔍 Recherche alternative...');
  
  // Recherche alternative
  const alternativeSelectors = [
    '.calculated-value',
    '[class*="smart"]',
    '[class*="calculated"]',
    '.ant-card-body span',
    '[style*="color: #999"]'
  ];
  
  alternativeSelectors.forEach((selector, i) => {
    const elements = document.querySelectorAll(selector);
    console.log(`  Sélecteur ${i+1} "${selector}": ${elements.length} éléments`);
  });
} else {

// Analyser chaque SmartCalculatedField
console.log('\n📋 ANALYSE DÉTAILLÉE DE CHAQUE CARTE:');
smartFields.forEach((field, index) => {
  const testId = field.getAttribute('data-testid');
  const fieldId = testId ? testId.replace('smart-calculated-field-', '') : 'unknown';
  const text = field.textContent || '';
  const style = field.getAttribute('style') || '';
  
  console.log(`\n🎴 CARTE ${index + 1}:`);
  console.log(`  - TestID: ${testId}`);
  console.log(`  - FieldID: ${fieldId}`);
  console.log(`  - Texte: "${text}"`);
  console.log(`  - Style: ${style}`);
  
  // Analyser l'état de la carte
  let status = 'unknown';
  if (text.includes('Calcul...')) {
    status = '🔄 EN_CALCUL';
  } else if (text.includes('(mirror)')) {
    status = '🪞 AVEC_MIRROR';
  } else if (text.trim() && text !== '---') {
    status = '✅ RESOLUE';
  } else {
    status = '⚪ VIDE';
  }
  
  console.log(`  - Statut: ${status}`);
  
  // Chercher les mirrors correspondants
  const formData = window.TBL_FORM_DATA || {};
  const possibleMirrors = Object.keys(formData).filter(key => {
    if (!key.startsWith('__mirror_data_')) return false;
    const mirrorId = key.replace('__mirror_data_', '').split('_')[0];
    return mirrorId === fieldId || fieldId.includes(mirrorId) || mirrorId.includes(fieldId);
  });
  
  console.log(`  - Mirrors possibles: ${possibleMirrors.length}`);
  possibleMirrors.forEach(mirror => {
    console.log(`    ${mirror}: ${formData[mirror]}`);
  });
});
}

console.log('\n✅ SCRIPT 2 TERMINÉ - Exécutez script-3.js pour tester le système mirror');