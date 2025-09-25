// Script avancé pour forcer l'affichage des valeurs dans les cartes TBL
// Usage: coller dans la console puis appeler forceTBLDisplay()

window.forceTBLDisplay = function() {
  console.log('🔧 [FORCE DISPLAY] Démarrage...');
  
  if (!window.TBL_FORM_DATA) {
    console.error('❌ window.TBL_FORM_DATA non disponible');
    return;
  }
  
  // 1. Identifier toutes les cartes bloquées sur "Calcul..."
  const calcCards = Array.from(document.querySelectorAll('.ant-card')).filter(card => {
    const text = card.textContent || '';
    return text.includes('Calcul') && !text.includes('Champ');
  });
  
  console.log(`🎯 Cartes bloquées trouvées: ${calcCards.length}`);
  
  calcCards.forEach((card, index) => {
    const titleElement = card.querySelector('.ant-typography');
    const valueElement = card.querySelector('.ant-typography:last-child');
    const title = titleElement?.textContent || '';
    
    console.log(`\n🔍 Carte ${index + 1}: "${title}"`);
    
    // 2. Chercher toutes les clés miroir possibles
    const formData = window.TBL_FORM_DATA;
    const allMirrorKeys = Object.keys(formData).filter(k => k.startsWith('__mirror_data_'));
    
    // Stratégies de matching progressives
    const strategies = [
      // Exact match
      () => formData[`__mirror_data_${title}`],
      // Sans espaces
      () => formData[`__mirror_data_${title.replace(/\s+/g, '')}`],
      // Lowercase
      () => formData[`__mirror_data_${title.toLowerCase()}`],
      // Sans "Calcul du"
      () => formData[`__mirror_data_${title.replace(/^Calcul du\s+/i, '')}`],
      // Variantes kwh
      () => {
        const kwVariant = title.replace(/kw\/h/gi, 'kwh').replace(/\s+/g, '');
        return formData[`__mirror_data_${kwVariant}`];
      },
      // Search dans toutes les clés
      () => {
        const keywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const matchingKey = allMirrorKeys.find(key => {
          const keyLower = key.toLowerCase();
          return keywords.some(keyword => keyLower.includes(keyword));
        });
        return matchingKey ? formData[matchingKey] : undefined;
      }
    ];
    
    let foundValue = undefined;
    let usedStrategy = -1;
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        const value = strategies[i]();
        if (value !== undefined && value !== null && value !== '') {
          foundValue = value;
          usedStrategy = i;
          break;
        }
      } catch (e) {
        console.warn(`Stratégie ${i} échouée:`, e);
      }
    }
    
    if (foundValue !== undefined) {
      console.log(`✅ Valeur trouvée (stratégie ${usedStrategy}): ${foundValue}`);
      
      // 3. Forcer l'affichage en modifiant directement le DOM
      if (valueElement) {
        const originalText = valueElement.textContent;
        valueElement.textContent = foundValue;
        valueElement.style.color = '#059669';
        valueElement.style.fontWeight = 'bold';
        
        // Ajouter un indicateur visuel
        const indicator = document.createElement('span');
        indicator.textContent = ' (forcé)';
        indicator.style.fontSize = '10px';
        indicator.style.color = '#9CA3AF';
        valueElement.appendChild(indicator);
        
        console.log(`🎨 Affichage forcé: "${originalText}" → "${foundValue}"`);
      }
    } else {
      console.log('❌ Aucune valeur miroir trouvée');
      console.log('Clés miroir disponibles:', allMirrorKeys);
      
      // Essayer de créer une valeur de test
      const testKey = `__mirror_data_${title}`;
      const testValue = '2.50';
      formData[testKey] = testValue;
      console.log(`🧪 Valeur de test créée: ${testKey} = ${testValue}`);
      
      if (valueElement) {
        valueElement.textContent = `${testValue} (test)`;
        valueElement.style.color = '#DC2626';
        valueElement.style.fontWeight = 'bold';
      }
    }
  });
  
  // 4. Logs détaillés des clés miroir
  console.log('\n📊 === ÉTAT COMPLET DES CLÉS MIROIR ===');
  const formData = window.TBL_FORM_DATA;
  const allMirrorKeys = Object.keys(formData).filter(k => k.startsWith('__mirror_data_'));
  
  allMirrorKeys.forEach(key => {
    const label = key.replace('__mirror_data_', '');
    const value = formData[key];
    console.log(`${key}: ${JSON.stringify(value)} (label: "${label}")`);
  });
  
  console.log('✅ [FORCE DISPLAY] Terminé');
};

// Script pour surveiller les changements et diagnostiquer en temps réel
window.startTBLMonitoring = function() {
  console.log('📡 [MONITORING] Démarrage surveillance TBL...');
  
  let lastFormDataState = {};
  
  const monitor = () => {
    if (window.TBL_FORM_DATA) {
      const currentState = JSON.stringify(window.TBL_FORM_DATA);
      if (currentState !== lastFormDataState) {
        console.log('🔄 [MONITORING] FormData modifié');
        
        const newKeys = Object.keys(window.TBL_FORM_DATA).filter(k => 
          !Object.keys(lastFormDataState).includes(k)
        );
        
        if (newKeys.length > 0) {
          console.log('🆕 Nouvelles clés:', newKeys.map(k => 
            `${k}: ${JSON.stringify(window.TBL_FORM_DATA[k])}`
          ));
        }
        
        lastFormDataState = currentState;
        
        // Auto-application du forçage
        if (localStorage.getItem('AUTO_FORCE') === '1') {
          setTimeout(window.forceTBLDisplay, 100);
        }
      }
    }
  };
  
  // Surveillance toutes les 500ms
  const intervalId = setInterval(monitor, 500);
  
  console.log('✅ Surveillance active. Pour arrêter: clearInterval(' + intervalId + ')');
  return intervalId;
};

console.log('🔧 Scripts TBL Force chargés:');
console.log('- forceTBLDisplay() : Force l\'affichage des valeurs');
console.log('- startTBLMonitoring() : Surveillance temps réel');
console.log('- localStorage.AUTO_FORCE="1" : Forçage automatique');