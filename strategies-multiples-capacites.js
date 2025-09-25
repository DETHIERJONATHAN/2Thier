/**
 * 🤔 PROBLÈME : MULTIPLES CAPACITÉS
 * 
 * Le README TBL Bridge ne spécifie pas comment gérer plusieurs capacités simultanées !
 * 
 * EXEMPLES PROBLÉMATIQUES :
 * - "Prix kWh avec condition" = Formule (3) + Condition (4)
 * - "Tableau avec calculs" = Formule (3) + Tableau (5) 
 * - "Données conditionnelles" = Données (2) + Condition (4)
 */

console.log('🤔 STRATÉGIES POSSIBLES POUR MULTIPLES CAPACITÉS');
console.log('================================================\n');

// STRATÉGIE 1 : PRIORITÉ/HIÉRARCHIE
console.log('📊 STRATÉGIE 1 : SYSTÈME DE PRIORITÉ');
console.log('------------------------------------');
console.log('Ordre de priorité décroissant :');
console.log('5 = Tableau (plus complexe)');
console.log('4 = Condition (logique)');  
console.log('3 = Formule (calcul)');
console.log('2 = Données (affichage)');
console.log('1 = Neutre (défaut)');
console.log('');
console.log('Exemple: "Prix kWh avec condition" → 64 (Condition prioritaire sur Formule)');

// STRATÉGIE 2 : CAPACITÉ DOMINANTE
console.log('\n🎯 STRATÉGIE 2 : CAPACITÉ DOMINANTE');
console.log('----------------------------------');
console.log('Règles métier :');
console.log('- Si contient "Tableau" → toujours 5');
console.log('- Si contient "Condition" ET pas tableau → 4');
console.log('- Si contient "Formule" ET pas condition/tableau → 3'); 
console.log('- Si contient "Données" ET pas autre → 2');
console.log('- Sinon → 1');

// STRATÉGIE 3 : CODES COMBINÉS  
console.log('\n🔗 STRATÉGIE 3 : CODES COMBINÉS');
console.log('------------------------------');
console.log('Utiliser plusieurs chiffres ou caractères spéciaux :');
console.log('- "Prix kWh avec condition" → 634 (Formule+Condition)');
console.log('- "Tableau avec calculs" → 635 (Formule+Tableau)');
console.log('- "Données conditionnelles" → 624 (Données+Condition)');
console.log('⚠️ PROBLÈME : Dépasse 2 chiffres du format [Type][Capacité]');

// STRATÉGIE 4 : CHAMPS SÉPARÉS
console.log('\n📦 STRATÉGIE 4 : CHAMPS SÉPARÉS DANS LA BDD');
console.log('------------------------------------------');
console.log('Garder une seule capacité principale dans l\'ID, mais ajouter :');
console.log('- Colonne "secondary_capabilities" : ["formule", "condition"]');
console.log('- Colonne "capability_config" : JSON avec détails');
console.log('Exemple: ID="64-prix-kwh" + secondary=["formule"] + config={...}');

// STRATÉGIE 5 : NOUVEAU TYPE HYBRIDE
console.log('\n🚀 STRATÉGIE 5 : NOUVEAUX TYPES HYBRIDES');
console.log('---------------------------------------'); 
console.log('Créer de nouveaux types spécialisés :');
console.log('8 = Champ Formule+Condition');
console.log('9 = Champ Tableau+Formule');
console.log('10 = etc...');
console.log('⚠️ PROBLÈME : Explosion du nombre de types');

console.log('\n❓ QUELLE STRATÉGIE CHOISIR ?');
console.log('=============================');
console.log('🎯 RECOMMANDATION : STRATÉGIE 1 (PRIORITÉ)');
console.log('✅ Simple à implémenter');
console.log('✅ Respecte le format [Type][Capacité]');
console.log('✅ Capacité principale claire');
console.log('✅ Extensible avec champs BDD si besoin');

console.log('\n🔧 IMPLÉMENTATION PRIORITÉ :');
console.log('function getCapacityPriority(name) {');
console.log('  if (/tableau|grille/i.test(name)) return 5; // Plus prioritaire');
console.log('  if (/condition|si|alors/i.test(name)) return 4;');
console.log('  if (/formule|calcul|prix/i.test(name)) return 3;');
console.log('  if (/données|résultat/i.test(name)) return 2;');
console.log('  return 1; // Neutre par défaut');
console.log('}');

console.log('\n❗ DÉCISION REQUISE : Laquelle vous préférez ?');