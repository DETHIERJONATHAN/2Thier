/**
 * 🔍 SCRIPT FRONTEND: Analyser le rendu des champs
 * 
 * À copier-coller dans la CONSOLE du navigateur (F12) pour voir en live:
 * - Quels champs sont rendus sous "Bloc" (section formulaire)
 * - Quels champs sont rendus sous "Nouveau Section" (données)
 * - Pourquoi "Inclinaison-1" agit comme un nœud d'affichage
 */

(function analyzeFieldRendering() {
  console.clear();
  console.log('\n🔍 ANALYSE FRONTEND: Rendu des champs\n');
  console.log('================== DÉBUT ==================\n');

  // 1. Analyser la structure du DOM
  console.log('📍 1️⃣ STRUCTURE DU DOM:');
  
  const sections = document.querySelectorAll('[class*="tbl-section"]');
  console.log(`   ✅ Sections TBL trouvées: ${sections.length}`);

  // Chercher les sections "Bloc" et "Nouveau Section"
  const allText = document.body.innerText;
  const hasBloc = allText.includes('Bloc');
  const hasNouveauSection = allText.includes('Nouveau Section');
  const hasVersant = allText.includes('Versant');
  const hasInclinaison = allText.includes('Inclinaison');

  console.log(`   - Contient "Bloc"? ${hasBloc ? '✅' : '❌'}`);
  console.log(`   - Contient "Nouveau Section"? ${hasNouveauSection ? '✅' : '❌'}`);
  console.log(`   - Contient "Versant"? ${hasVersant ? '✅' : '❌'}`);
  console.log(`   - Contient "Inclinaison"? ${hasInclinaison ? '✅' : '❌'}`);

  // 2. Chercher les cartes bleues (data sections)
  console.log('\n📍 2️⃣ CARTES BLEUES (nœuds d\'affichage):');
  const blueCards = document.querySelectorAll('[style*="border"]');
  const inclinaisonCards = Array.from(blueCards).filter(card => 
    card.innerText?.includes('Inclinaison')
  );

  console.log(`   ✅ Cartes bleues trouvées: ${blueCards.length}`);
  console.log(`   ✅ Cartes avec "Inclinaison": ${inclinaisonCards.length}`);

  for (const card of inclinaisonCards) {
    console.log(`\n     📌 Carte: "${card.innerText.split('\n')[0] || 'N/A'}"`);
    console.log(`        Parent class: ${card.parentElement?.className || 'N/A'}`);
    console.log(`        Contenu: "${card.innerText.substring(0, 100)}..."`);
    
    // Chercher le label
    const labelEl = card.querySelector('[style*="color"]');
    if (labelEl) {
      console.log(`        Label extrait: "${labelEl.innerText}"`);
    }
  }

  // 3. Chercher les champs éditables (inputs, selects)
  console.log('\n📍 3️⃣ CHAMPS ÉDITABLES:');
  const inputs = document.querySelectorAll('input[type="text"], select, textarea');
  const inclinaisonInputs = Array.from(inputs).filter(inp => {
    const label = inp.parentElement?.innerText || inp.title || inp.placeholder || '';
    return label.toLowerCase().includes('inclinaison');
  });

  console.log(`   ✅ Inputs/selects trouvés: ${inputs.length}`);
  console.log(`   ✅ Inputs "Inclinaison": ${inclinaisonInputs.length}`);

  for (const inp of inclinaisonInputs) {
    const label = inp.parentElement?.innerText?.split('\n')[0] || inp.placeholder || 'N/A';
    console.log(`\n     📝 Champ: "${label}"`);
    console.log(`        Type: ${inp.type || 'select'}`);
    console.log(`        Valeur: "${inp.value || 'vide'}"`);
    console.log(`        ID: ${inp.id || 'N/A'}`);
  }

  // 4. Analyser formData (si accessible via window)
  console.log('\n📍 4️⃣ FORM DATA (window.TBL_FORM_DATA):');
  if (window.TBL_FORM_DATA) {
    const inclinaisonKeys = Object.keys(window.TBL_FORM_DATA).filter(k => 
      k.toLowerCase().includes('inclinaison')
    );
    
    console.log(`   ✅ Clés totales: ${Object.keys(window.TBL_FORM_DATA).length}`);
    console.log(`   ✅ Clés "Inclinaison": ${inclinaisonKeys.length}`);
    
    for (const key of inclinaisonKeys) {
      console.log(`\n     🔑 "${key}"`);
      console.log(`        Valeur: ${JSON.stringify(window.TBL_FORM_DATA[key])}`);
    }
  } else {
    console.log('   ⚠️  window.TBL_FORM_DATA non accessible');
  }

  // 5. Analyser les logs récents (si consoleFilter actif)
  console.log('\n📍 5️⃣ LOGS RÉCENTS (ultradebug):');
  console.log('   💡 Cherche dans la console les logs contenant:');
  console.log('      - 🚀🚀🚀 [CRÉATION VERSANT]');
  console.log('      - 🔁 [COPY-API]');
  console.log('      - 🎯🎯🎯 [VERSANT INJECTION]');
  console.log('      - 🔍 [FORM DATA DEBUG]');
  console.log('      Scroll vers le haut pour voir ces logs détaillés!');

  // 6. Diagnostic visuel
  console.log('\n📍 6️⃣ DIAGNOSTIC:');
  
  if (inclinaisonCards.length > 0 && inclinaisonInputs.length === 0) {
    console.log('   ❌ PROBLÈME DÉTECTÉ:');
    console.log('      Tu vois "Inclinaison-1" comme une CARTE BLEUE, pas comme un champ éditable!');
    console.log('      → Cela signifie que seul le nœud d\'affichage (data/BackendValueDisplay) a été créé');
    console.log('      → Le champ éditable du repeater n\'a probablement pas été dupliqué');
  } else if (inclinaisonInputs.length > 0) {
    console.log('   ✅ CHAMPS ÉDITABLES DÉTECTÉS:');
    console.log('      Le champ select "Inclinaison" a bien été dupliqué');
    console.log('      La carte bleue "Inclinaison-1" est juste l\'affichage des données calculées');
  } else {
    console.log('   ⚠️  Aucun "Inclinaison" trouvé');
  }

  console.log('\n================== FIN ==================\n');
})();
