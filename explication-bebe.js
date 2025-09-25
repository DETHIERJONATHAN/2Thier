/**
 * 🍼 EXPLICATION POUR BÉBÉ - MULTIPLES CAPACITÉS
 * 
 * Imagine un champ qui fait PLUSIEURS choses à la fois !
 */

console.log('🍼 EXPLICATION SIMPLE - MULTIPLES CAPACITÉS');
console.log('==========================================\n');

// EXEMPLE CONCRET : Un champ avec plusieurs capacités
const exempleChamp = {
  nom: "Prix kWh magique avec condition",
  description: "Ce champ calcule le prix ET vérifie des conditions"
};

console.log('🎯 EXEMPLE CONCRET :');
console.log('===================');
console.log(`Nom du champ: "${exempleChamp.nom}"`);
console.log(`Description: ${exempleChamp.description}`);

console.log('\n🔍 CE CHAMP FAIT QUOI ?');
console.log('======================');
console.log('1. 🧮 CALCULE (capacité 3 = Formule)');
console.log('   → Prix = Puissance × 0.25 × 24 × 365');
console.log('');
console.log('2. 🤔 VÉRIFIE (capacité 4 = Condition)');
console.log('   → Si client = "Professionnel" alors réduction 10%');
console.log('   → Sinon prix normal');

console.log('\n❓ PROBLÈME : QUEL CODE DONNER ?');
console.log('===============================');
console.log('Option A: 63 (champ avec formule)');
console.log('Option B: 64 (champ avec condition)');
console.log('Option C: ??? (les deux ???)');

console.log('\n💡 SOLUTION : ORDRE DE PRIORITÉ');
console.log('==============================');
console.log('On regarde ce qui est LE PLUS IMPORTANT :');
console.log('');
console.log('📊 Ordre du plus important au moins important :');
console.log('5 = Tableau (très complexe)');
console.log('4 = Condition (logique if/then) ← LE PLUS IMPORTANT ICI');
console.log('3 = Formule (calcul simple) ← moins important');
console.log('2 = Données (juste afficher)');
console.log('1 = Neutre (rien de spécial)');

console.log('\n🎯 RÉSULTAT FINAL :');
console.log('==================');
console.log(`Champ: "${exempleChamp.nom}"`);
console.log('Code: 64-prix-kwh-magique');
console.log('Pourquoi 64 ?');
console.log('  → 6 = Type "Champ données"');
console.log('  → 4 = Capacité "Condition" (la plus importante)');

console.log('\n🧠 COMMENT LE SYSTÈME COMPREND :');
console.log('===============================');
console.log('TBL reçoit: "64-prix-kwh-magique"');
console.log('TBL pense: "Ah ! C\'est un champ données avec condition"');
console.log('TBL fait: "Je vais afficher un champ qui peut changer selon les conditions"');

console.log('\n📝 AUTRES EXEMPLES :');
console.log('===================');

const autresExemples = [
  {
    nom: "Tableau des tarifs avec calculs",
    capacites: ["Tableau (5)", "Formule (3)"],
    resultat: "65",
    raison: "Tableau est plus prioritaire que Formule"
  },
  {
    nom: "Total simple",
    capacites: ["Formule (3)"],
    resultat: "63", 
    raison: "Une seule capacité = Formule"
  },
  {
    nom: "Nom du client",
    capacites: ["Aucune"],
    resultat: "31",
    raison: "Champ normal sans capacité spéciale"
  }
];

autresExemples.forEach((exemple, index) => {
  console.log(`\n${index + 1}. "${exemple.nom}"`);
  console.log(`   Capacités détectées: ${exemple.capacites.join(', ')}`);
  console.log(`   Code final: ${exemple.resultat}-xxx`);
  console.log(`   Pourquoi ? ${exemple.raison}`);
});

console.log('\n🍼 TU COMPRENDS MAINTENANT ?');
console.log('===========================');
console.log('✅ Un champ peut faire plusieurs choses');
console.log('✅ On choisit la chose LA PLUS IMPORTANTE');
console.log('✅ Cette chose devient le 2ème chiffre du code');
console.log('✅ TBL comprend quelle est la fonction principale');

console.log('\n🎉 C\'EST SIMPLE COMME ÇA !');
console.log('Le système choisit automatiquement la capacité principale !');