// Script de diagnostic TBL - À exécuter dans la console du navigateur
// Usage: coller tout ce script dans la console puis appeler runTBLDiagnostic()

window.runTBLDiagnostic = function() {
  console.log('🔍 [TBL DIAGNOSTIC] Démarrage analyse complète...');
  
  // 1. Vérifier les données globales disponibles
  console.log('\n📊 === DONNÉES GLOBALES ===');
  console.log('window.TBL_FORM_DATA:', window.TBL_FORM_DATA ? 'Disponible' : 'Absent');
  console.log('window.TBL_DEP_GRAPH:', window.TBL_DEP_GRAPH ? 'Disponible' : 'Absent');
  
  if (window.TBL_FORM_DATA) {
    const formData = window.TBL_FORM_DATA;
    const allKeys = Object.keys(formData);
    const mirrorKeys = allKeys.filter(k => k.startsWith('__mirror_data_'));
    const regularKeys = allKeys.filter(k => !k.startsWith('__mirror_data_'));
    
    console.log(`Total clés formData: ${allKeys.length}`);
    console.log(`Clés miroir: ${mirrorKeys.length}`, mirrorKeys);
    console.log(`Clés normales: ${regularKeys.length}`, regularKeys);
    
    // Analyser les clés miroir liées au prix
    const prixMirrorKeys = mirrorKeys.filter(k => 
      k.toLowerCase().includes('prix') || 
      k.toLowerCase().includes('kw') ||
      k.toLowerCase().includes('calcul')
    );
    console.log('\n💰 Clés miroir liées au prix:', prixMirrorKeys);
    prixMirrorKeys.forEach(key => {
      console.log(`  ${key}: ${JSON.stringify(formData[key])}`);
    });
  }
  
  // 2. Analyser les cartes dans la section "Données"
  console.log('\n🎯 === ANALYSE CARTES DONNÉES ===');
  const dataCards = document.querySelectorAll('[class*="tbl-section"] .ant-card');
  console.log(`Cartes trouvées: ${dataCards.length}`);
  
  dataCards.forEach((card, index) => {
    const titleElement = card.querySelector('.ant-typography');
    const valueElement = card.querySelector('.ant-typography:last-child');
    const title = titleElement?.textContent || 'Sans titre';
    const value = valueElement?.textContent || 'Sans valeur';
    
    console.log(`\nCarte ${index + 1}:`);
    console.log(`  Titre: "${title}"`);
    console.log(`  Valeur: "${value}"`);
    console.log(`  Est "Calcul...": ${value.includes('Calcul')}`);
    
    // Vérifier si une clé miroir correspond
    if (window.TBL_FORM_DATA) {
      const exactMirror = window.TBL_FORM_DATA[`__mirror_data_${title}`];
      console.log(`  Miroir exact (__mirror_data_${title}): ${JSON.stringify(exactMirror)}`);
      
      // Chercher des variantes
      const allMirrorKeys = Object.keys(window.TBL_FORM_DATA).filter(k => k.startsWith('__mirror_data_'));
      const possibleMatches = allMirrorKeys.filter(k => {
        const label = k.replace('__mirror_data_', '').toLowerCase();
        const titleLower = title.toLowerCase();
        return label.includes(titleLower.split(' ')[0]) || titleLower.includes(label.split(' ')[0]);
      });
      console.log(`  Variantes possibles:`, possibleMatches.map(k => `${k}: ${window.TBL_FORM_DATA[k]}`));
    }
  });
  
  // 3. Vérifier les champs conditionnels actifs
  console.log('\n⚙️ === CHAMPS CONDITIONNELS ===');
  const conditionalFields = document.querySelectorAll('input, select');
  let conditionalCount = 0;
  
  conditionalFields.forEach(field => {
    const label = field.closest('.ant-form-item')?.querySelector('.ant-form-item-label')?.textContent;
    if (label && (label.includes('Champ') || label.includes('Calcul'))) {
      conditionalCount++;
      console.log(`Champ conditionnel: "${label}" = "${field.value}"`);
      
      // Vérifier si ce champ devrait créer un miroir
      const expectedMirrorKey = `__mirror_data_${label.replace(/ - Champ.*$/, '')}`;
      if (window.TBL_FORM_DATA && window.TBL_FORM_DATA[expectedMirrorKey]) {
        console.log(`  ✅ Miroir créé: ${expectedMirrorKey} = ${window.TBL_FORM_DATA[expectedMirrorKey]}`);
      } else {
        console.log(`  ❌ Miroir manquant: ${expectedMirrorKey}`);
      }
    }
  });
  console.log(`Total champs conditionnels trouvés: ${conditionalCount}`);
  
  // 4. Vérifier les capacités via React DevTools (si disponible)
  console.log('\n🧬 === CAPACITÉS REACT ===');
  try {
    // Tenter de trouver les props React des cartes
    const reactCards = Array.from(dataCards).map(card => {
      const reactFiber = card._reactInternalFiber || card.__reactInternalInstance;
      if (reactFiber) {
        // Remonter pour trouver les props
        let current = reactFiber;
        while (current && !current.memoizedProps?.field) {
          current = current.return || current.parent;
        }
        return current?.memoizedProps?.field;
      }
      return null;
    }).filter(Boolean);
    
    console.log(`Capacités React trouvées: ${reactCards.length}`);
    reactCards.forEach((field, index) => {
      if (field.capabilities) {
        console.log(`Carte ${index + 1} (${field.label}):`);
        console.log(`  Data: ${JSON.stringify(field.capabilities.data)}`);
        console.log(`  Formula: ${JSON.stringify(field.capabilities.formula)}`);
      }
    });
  } catch (e) {
    console.log('Impossible d\'analyser les capacités React:', e.message);
  }
  
  // 5. Tester la création manuelle d'un miroir
  console.log('\n🧪 === TEST CRÉATION MIROIR ===');
  if (window.TBL_FORM_DATA) {
    const testKey = '__mirror_data_Prix Kw/h';
    const testValue = '2.50';
    console.log(`Test: création manuelle ${testKey} = ${testValue}`);
    
    // Simuler un onChange
    const event = new CustomEvent('tbl-field-change', {
      detail: { fieldId: testKey, value: testValue }
    });
    document.dispatchEvent(event);
    
    setTimeout(() => {
      console.log(`Vérification après 100ms: ${testKey} = ${window.TBL_FORM_DATA[testKey]}`);
    }, 100);
  }
  
  // 6. Recommandations
  console.log('\n💡 === RECOMMANDATIONS ===');
  
  if (!window.TBL_FORM_DATA) {
    console.log('❌ window.TBL_FORM_DATA non disponible - vérifier TBL.tsx');
  }
  
  const calcCards = Array.from(dataCards).filter(card => 
    card.textContent.includes('Calcul')
  );
  
  if (calcCards.length > 0) {
    console.log(`⚠️ ${calcCards.length} carte(s) bloquée(s) sur "Calcul..."`);
    console.log('Solutions possibles:');
    console.log('1. Vérifier les capacités (data/formula présentes?)');
    console.log('2. Activer fallback miroir après timeout');
    console.log('3. Vérifier correspondance exacte des labels');
  }
  
  console.log('\n✅ [TBL DIAGNOSTIC] Analyse terminée');
  
  return {
    formDataAvailable: !!window.TBL_FORM_DATA,
    mirrorKeys: window.TBL_FORM_DATA ? Object.keys(window.TBL_FORM_DATA).filter(k => k.startsWith('__mirror_data_')) : [],
    calcCards: calcCards.length,
    conditionalFields: conditionalCount
  };
};

// Auto-exécution si localStorage.AUTO_DIAG est activé
if (localStorage.getItem('AUTO_DIAG') === '1') {
  setTimeout(() => {
    console.log('🚀 Auto-diagnostic TBL activé');
    window.runTBLDiagnostic();
  }, 2000);
}

console.log('📋 Script de diagnostic TBL chargé. Exécutez: runTBLDiagnostic()');