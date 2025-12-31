/**
 * 🔍 Script de diagnostic pour les champs NUMBER
 * 
 * Ouvrez la console du navigateur et exécutez ce script
 * pour diagnostiquer pourquoi les champs nombre ne sont pas éditables.
 * 
 * USAGE:
 * 1. Ouvrez la page avec le formulaire TBL
 * 2. Ouvrez la console (F12)
 * 3. Copiez-collez ce script et exécutez-le
 */

(function debugNumberFields() {
  console.log('🔍 === DIAGNOSTIC CHAMPS NUMBER ===');
  
  // 1. Trouver tous les InputNumber dans le DOM
  const numberInputs = document.querySelectorAll('input[type="text"][inputmode="decimal"], .ant-input-number input');
  console.log(`📊 Trouvé ${numberInputs.length} champs InputNumber`);
  
  if (numberInputs.length === 0) {
    console.warn('⚠️ Aucun champ InputNumber trouvé dans le DOM');
    return;
  }
  
  // 2. Analyser chaque champ
  numberInputs.forEach((input, index) => {
    const container = input.closest('.ant-input-number');
    const formItem = input.closest('.ant-form-item');
    const label = formItem?.querySelector('.ant-form-item-label')?.textContent?.trim() || `Champ #${index + 1}`;
    
    console.log(`\n📝 [${index + 1}] "${label}"`);
    console.log('   ├─ Valeur:', input.value);
    console.log('   ├─ Disabled:', input.disabled);
    console.log('   ├─ ReadOnly:', input.readOnly);
    console.log('   ├─ Aria-disabled:', input.getAttribute('aria-disabled'));
    console.log('   ├─ Classes container:', container?.className);
    console.log('   ├─ Input ID:', input.id);
    console.log('   ├─ Input Name:', input.name);
    console.log('   ├─ Placeholder:', input.placeholder);
    
    // 3. Vérifier les React props (si accessible)
    const reactKey = Object.keys(input).find(key => key.startsWith('__react'));
    if (reactKey) {
      const reactProps = input[reactKey];
      console.log('   ├─ React Props disponibles:', !!reactProps);
      if (reactProps?.memoizedProps) {
        console.log('   └─ React memoizedProps:', {
          disabled: reactProps.memoizedProps.disabled,
          readOnly: reactProps.memoizedProps.readOnly,
          value: reactProps.memoizedProps.value
        });
      }
    } else {
      console.log('   └─ React Props: Non accessible');
    }
    
    // 4. Test de focus/édition
    try {
      input.focus();
      const canEdit = document.activeElement === input && !input.disabled && !input.readOnly;
      console.log(`   🎯 Test focus: ${canEdit ? '✅ Éditable' : '❌ Non éditable'}`);
      input.blur();
    } catch (e) {
      console.log('   🎯 Test focus: ❌ Erreur', e.message);
    }
  });
  
  // 5. Vérifier le consoleFilter
  console.log('\n📋 === ÉTAT GLOBAL ===');
  console.log('   ├─ FormData TBL:', window.TBL_FORM_DATA ? `${Object.keys(window.TBL_FORM_DATA).length} clés` : 'Non disponible');
  console.log('   ├─ DEBUG_VERBOSE:', localStorage.getItem('DEBUG_VERBOSE'));
  console.log('   └─ Console filtrée:', window.__consoleFilter ? 'Oui' : 'Non');
  
  // 6. Instructions
  console.log('\n💡 === ACTIONS RECOMMANDÉES ===');
  console.log('1. Si disabled=true: Vérifier pourquoi isDisabled est true dans TBLFieldRendererAdvanced');
  console.log('2. Si readOnly=true: Vérifier la logique useCalculatedValue/isReadOnly');
  console.log('3. Si aria-disabled=true: Vérifier les props passées au composant Ant Design');
  console.log('4. Pour voir tous les logs: localStorage.setItem("DEBUG_VERBOSE", "1"); puis recharger');
  console.log('\n✅ Diagnostic terminé');
})();
