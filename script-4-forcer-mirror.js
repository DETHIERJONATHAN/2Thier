// Script 4: Forçage d'affichage des valeurs mirror
console.log('🛠️ SCRIPT 4: FORÇAGE D\'AFFICHAGE DES VALEURS MIRROR');
console.log('='.repeat(50));

// 1. Analyser les cartes bloquées
const smartFields = document.querySelectorAll('[data-testid*="smart-calculated-field"]');
const blockedCards = Array.from(smartFields).filter(field => 
  field.textContent && field.textContent.includes('Calcul...')
);

console.log(`🔍 ${blockedCards.length} cartes bloquées sur "Calcul..." trouvées`);

if (blockedCards.length === 0) {
  console.log('✅ Aucune carte bloquée! Le système fonctionne correctement.');
} else {

// 2. Fonction de forçage d'affichage
function forcerAffichageMirror(field, index) {
  const testId = field.getAttribute('data-testid');
  const fieldId = testId ? testId.replace('smart-calculated-field-', '') : null;
  
  if (!fieldId) {
    console.log(`⚠️ Carte ${index + 1}: Impossible d'extraire l'ID`);
    return false;
  }
  
  // Chercher une valeur mirror correspondante
  const formData = window.TBL_FORM_DATA || {};
  const mirrorKeys = Object.keys(formData).filter(key => {
    if (!key.startsWith('__mirror_data_')) return false;
    const mirrorId = key.replace('__mirror_data_', '').split('_')[0];
    return mirrorId === fieldId || fieldId.includes(mirrorId) || mirrorId.includes(fieldId);
  });
  
  if (mirrorKeys.length === 0) {
    console.log(`⚠️ Carte ${index + 1} (${fieldId}): Aucun mirror trouvé`);
    return false;
  }
  
  // Utiliser la première valeur mirror disponible
  const mirrorKey = mirrorKeys[0];
  const mirrorValue = formData[mirrorKey];
  
  if (mirrorValue === null || mirrorValue === undefined || mirrorValue === '') {
    console.log(`⚠️ Carte ${index + 1} (${fieldId}): Mirror vide`);
    return false;
  }
  
  // Forcer l'affichage
  const newContent = `${mirrorValue} (mirror)`;
  field.textContent = newContent;
  field.style.color = '#059669';
  field.style.fontWeight = 'bold';
  
  console.log(`✅ Carte ${index + 1} (${fieldId}): "${mirrorValue}" affiché depuis ${mirrorKey}`);
  return true;
}

// 3. Appliquer le forçage à toutes les cartes bloquées
console.log('\n🛠️ FORÇAGE EN COURS...');
let forcedCount = 0;

blockedCards.forEach((field, index) => {
  if (forcerAffichageMirror(field, index)) {
    forcedCount++;
  }
});

console.log(`\n📊 RÉSULTAT DU FORÇAGE:`);
console.log(`- Cartes forcées: ${forcedCount}/${blockedCards.length}`);
console.log(`- Taux de succès: ${Math.round((forcedCount / blockedCards.length) * 100)}%`);

if (forcedCount > 0) {
  console.log('\n🎉 SUCCESS! Des valeurs ont été forcées avec les données mirror!');
  console.log('   → Cela prouve que le système mirror fonctionne');
  console.log('   → Le problème est dans la logique d\'affichage du SmartCalculatedField');
} else {
  console.log('\n❌ Aucune valeur n\'a pu être forcée');
  console.log('   → Problème possible avec la génération des clés mirror');
}

// 4. Exposer la fonction pour usage manuel
window.forcerMirror = function(cardIndex) {
  const field = smartFields[cardIndex];
  if (field && field.textContent && field.textContent.includes('Calcul...')) {
    return forcerAffichageMirror(field, cardIndex);
  }
  return false;
};

console.log('\n🔧 Fonction exposée: forcerMirror(index) pour forcer une carte spécifique');
}