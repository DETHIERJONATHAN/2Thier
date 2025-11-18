/**
 * Script de test automatisé pour l'injection dans la console
 * Copier-coller ce code directement dans la console du navigateur
 */

(function() {
  console.log('🧪 Lancement du test automatique des champs d\'affichage...');
  
  // Test rapide des APIs
  async function quickAPITest() {
    const testFields = [
      { id: '939bb51d-c0af-444f-a794-2aa3062ef34c', label: 'M façade (original)' },
      { id: '939bb51d-c0af-444f-a794-2aa3062ef34c-1', label: 'M façade-1 (copie)' },
      { id: '213c68ec-f359-4257-bc78-4f5e4a0c80d8', label: 'Orientation-Inclinaison (original)' },
      { id: '213c68ec-f359-4257-bc78-4f5e4a0c80d8-1', label: 'Orientation-Inclinaison-1 (copie)' }
    ];
    
    console.log('📡 Test des APIs...');
    for (const field of testFields) {
      try {
        const response = await fetch(`/api/tree-nodes/${field.id}/calculated-value`);
        const data = await response.json();
        
        if (response.ok && data) {
          console.log(`✅ ${field.label}: ${data.value} (calculé le ${new Date(data.calculatedAt).toLocaleString()})`);
        } else {
          console.log(`❌ ${field.label}: API failed (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${field.label}: Error -`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Test des éléments DOM
  function quickDOMTest() {
    console.log('🔍 Test du DOM...');
    
    // Recherche des éléments avec les patterns connus
    const patterns = [
      'M façade-1',
      'Orientation-Inclinaison-1',
      'M façade',
      'Orientation-Inclinaison'
    ];
    
    patterns.forEach(pattern => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes(pattern)
      );
      
      if (elements.length > 0) {
        elements.forEach((el, index) => {
          const value = el.textContent.trim();
          const hasValidValue = value && value !== '---' && value !== pattern;
          console.log(`${hasValidValue ? '✅' : '❌'} ${pattern} [${index}]: "${value}"`);
        });
      } else {
        console.log(`❓ ${pattern}: Élément non trouvé`);
      }
    });
  }
  
  // Test des logs de console
  function setupLogWatcher() {
    console.log('👂 Surveillance des logs...');
    
    let copyFixCount = 0;
    let calculatedValueCount = 0;
    
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      
      if (message.includes('[COPY FIX]')) {
        copyFixCount++;
        console.log(`🎯 COPY FIX détecté (#${copyFixCount}):`, ...args);
        return;
      }
      
      if (message.includes('[useNodeCalculatedValue] Valeur récupérée')) {
        calculatedValueCount++;
        console.log(`📊 Valeur calculée récupérée (#${calculatedValueCount}):`, ...args);
        return;
      }
      
      originalLog.apply(console, args);
    };
    
    // Restore après 10 secondes
    setTimeout(() => {
      console.log = originalLog;
      console.log(`📈 Résumé surveillance: ${copyFixCount} COPY FIX, ${calculatedValueCount} valeurs calculées`);
    }, 10000);
  }
  
  // Lancement des tests
  async function runQuickTests() {
    console.log('🚀 === DÉBUT TESTS RAPIDES ===');
    
    // 1. Configuration surveillance
    setupLogWatcher();
    
    // 2. Test API
    await quickAPITest();
    
    // 3. Test DOM
    quickDOMTest();
    
    // 4. Instructions pour l'utilisateur
    console.log(`
🎯 INSTRUCTIONS:
1. Naviguez vers les champs de copies (M façade-1, Orientation-Inclinaison-1)
2. Vérifiez qu'ils affichent des valeurs au lieu de "---"
3. Les logs de surveillance sont actifs pendant 10 secondes
4. Vérifiez les logs [COPY FIX] et [useNodeCalculatedValue]

📋 ATTENDU:
• Les APIs doivent retourner des valeurs
• Les champs de copies doivent afficher ces valeurs
• Des logs [COPY FIX] doivent apparaître pour les copies
• Des logs [useNodeCalculatedValue] doivent confirmer la récupération des valeurs
    `);
    
    console.log('✅ Tests rapides terminés - surveillez les logs pendant 10 secondes');
  }
  
  // Lancement automatique
  runQuickTests();
})();