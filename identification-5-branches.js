/**
 * 🔍 RECOMPTAGE EXACT - SEULEMENT 5 BRANCHES PRINCIPALES
 * 
 * Je dois identifier les VRAIES branches niveau 1 seulement !
 */

console.log('🔍 IDENTIFICATION DES 5 VRAIES BRANCHES');
console.log('======================================\n');

// Analysons ligne par ligne votre structure
const lignes = `
🌿 Clients
🌿 Information Générale  
🌿 Type de volume
🌿 Électricité
🌿 Calcul du prix Kw/h ou Prix Kw/h
🌿 Compteur intelligent
🌿 Terre aux normes
🌿 Présence de couteau de terre
🌿 Chauffage
🌿 Chauffage actuel
🌿 Eau chaude
🌿 Mesure
🌿 Idem autre façade
🌿 Idem autre pignon
`.trim().split('\n');

console.log('📋 TOUTES LES LIGNES AVEC 🌿:');
lignes.forEach((ligne, index) => {
  if (ligne.includes('🌿')) {
    console.log(`${index + 1}. ${ligne.trim()}`);
  }
});

console.log('\n🤔 MAIS LESQUELLES SONT LES 5 VRAIES BRANCHES NIVEAU 1 ?');
console.log('=========================================================');
console.log('❓ Clients - BRANCHE NIVEAU 1 ?');
console.log('❓ Information Générale - BRANCHE NIVEAU 1 ?');
console.log('❓ Type de volume - Sous-branche dans "Information Générale" ?');
console.log('❓ Électricité - BRANCHE NIVEAU 1 ?');
console.log('❓ Calcul du prix Kw/h - Sous-branche dans "Électricité" ?');
console.log('❓ Compteur intelligent - Sous-branche dans "Électricité" ?');
console.log('❓ Terre aux normes - Sous-branche dans "Électricité" ?');
console.log('❓ Présence de couteau de terre - Sous-branche dans "Électricité" ?');
console.log('❓ Chauffage - BRANCHE NIVEAU 1 ?');
console.log('❓ Chauffage actuel - Sous-branche dans "Chauffage" ?');
console.log('❓ Eau chaude - Sous-branche dans "Chauffage" ?');
console.log('❓ Mesure - BRANCHE NIVEAU 1 ?');
console.log('❓ Idem autre façade - Sous-branche dans "Mesure" ?');
console.log('❓ Idem autre pignon - Sous-branche dans "Mesure" ?');

console.log('\n🎯 MES 5 BRANCHES PRINCIPALES SUPPOSÉES:');
console.log('=======================================');
console.log('1. 🌿 Clients');
console.log('2. 🌿 Information Générale');  
console.log('3. 🌿 Électricité');
console.log('4. 🌿 Chauffage');
console.log('5. 🌿 Mesure');

console.log('\n❗ DITES-MOI LESQUELLES SONT LES VRAIES 5 BRANCHES ❗');
console.log('=================================================');
console.log('Je me trompe encore sur l\'identification des niveaux !');