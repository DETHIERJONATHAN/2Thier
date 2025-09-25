const fs = require('fs');

function updateApiWithDetailResult() {
  const filePath = 'c:\\Users\\dethi\\OneDrive\\Desktop\\crm\\src\\components\\TreeBranchLeaf\\treebranchleaf-new\\api\\treebranchleaf-routes.ts';
  
  console.log('🔧 MODIFICATION DE L\'API POUR SÉPARER DETAIL ET RESULT');
  console.log('=====================================================\n');
  
  console.log('📝 Ce script va modifier le code pour:');
  console.log('- Detail: Informations techniques complètes (tokens, IDs, etc.)');
  console.log('- Result: Expression simple avec calcul final');
  console.log('- Format result: "Calcul du prix Kw/h(1250) / Consommation(4000) = 0.3125"');
  
  console.log('\n📊 EXEMPLES ATTENDUS:');
  console.log('===================');
  console.log('🔧 FORMULES:');
  console.log('  Detail: Formule: Prix Kw/h test | Tokens: [...] | ID: 7097ff9b...');
  console.log('  Result: Calcul du prix Kw/h(1250) / Consommation annuelle(4000) = 0.3125');
  
  console.log('\n🔀 CONDITIONS:');
  console.log('  Detail: Condition: Champ calculé | Type: condition | Expression: Si...');
  console.log('  Result: Si Prix Kw/h = vide ; alors Prix Kw/h ; Sinon Calcul(1250) / Consommation(4000) = 0.3125');
  
  console.log('\n📋 TABLEAUX:');
  console.log('  Detail: Tableau: Total estimation | Type: table | Colonnes: [...] | Unit: EUR');
  console.log('  Result: Surface habitable(150) * Prix au m²(2000) = 300000 EUR');
  
  console.log('\n✅ Le code sera modifié pour implémenter cette séparation');
  
  // Lecture du fichier existant pour vérification
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log(`\n📄 Fichier existant: ${lines.length} lignes`);
    
    // Rechercher les lignes importantes
    const calculateResultLine = lines.findIndex(line => line.includes('function calculateResult'));
    const operationsLine = lines.findIndex(line => line.includes('/submissions/:id/operations'));
    
    console.log(`🔍 Fonction calculateResult trouvée ligne: ${calculateResultLine + 1}`);
    console.log(`🔍 Endpoint operations trouvé ligne: ${operationsLine + 1}`);
    
    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Modifier la fonction calculateResult pour séparer detail/result');
    console.log('2. Adapter la logique des formules, conditions et tableaux');
    console.log('3. Tester avec la soumission 35a0425f-fce3-4446-bafa-83f9aab47c55');
  } else {
    console.log('❌ Fichier non trouvé!');
  }
}

updateApiWithDetailResult();