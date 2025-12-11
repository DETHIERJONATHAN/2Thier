/**
 * 🧪 Test des patterns de suffixes pour distinguer UUID vs vrais suffixes
 */

// Exemples d'IDs
const testCases = [
  // UUIDs purs (pas de suffixes)
  { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58', expected: false, desc: 'UUID pur' },
  { id: 'c40d8353-923f-49ac-a3db-91284de99654', expected: false, desc: 'UUID pur 2' },
  
  // Vrais suffixes de copie
  { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1', expected: true, desc: 'UUID + suffixe -1' },
  { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-2', expected: true, desc: 'UUID + suffixe -2' },
  { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-10', expected: true, desc: 'UUID + suffixe -10' },
  
  // Double suffixes (erreur)
  { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-1', expected: true, desc: 'UUID + double suffixe' },
  { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-2', expected: true, desc: 'UUID + double suffixe 2' },
];

console.log('🧪 TEST DES PATTERNS DE DÉTECTION DE SUFFIXES\n');
console.log('='.repeat(80) + '\n');

// Pattern actuel (trop large)
const oldPattern = /-\d+$/;
console.log('❌ ANCIEN PATTERN (trop large): /-\\d+$/\n');

testCases.forEach(test => {
  const match = oldPattern.test(test.id);
  const result = match === test.expected ? '✅' : '❌';
  console.log(`${result} ${test.desc}`);
  console.log(`   ID: ${test.id}`);
  console.log(`   Détecté: ${match}, Attendu: ${test.expected}`);
  console.log('');
});

console.log('='.repeat(80) + '\n');

// Nouveau pattern (plus précis)
// UUID format: 8-4-4-4-12 caractères hexadécimaux
// Suffixe: après les 12 derniers caractères hex, un tiret + chiffres
const newPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;

console.log('✅ NOUVEAU PATTERN (précis): /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\\d+)+$/i\n');
console.log('   Format: UUID complet (36 chars) + un ou plusieurs suffixes -N\n');

testCases.forEach(test => {
  const match = newPattern.test(test.id);
  const result = match === test.expected ? '✅' : '❌';
  console.log(`${result} ${test.desc}`);
  console.log(`   ID: ${test.id}`);
  console.log(`   Détecté: ${match}, Attendu: ${test.expected}`);
  console.log('');
});

console.log('='.repeat(80) + '\n');
console.log('💡 CONCLUSION:\n');
console.log('   Le nouveau pattern détecte UNIQUEMENT les IDs avec suffixes de copie');
console.log('   Il ne confond PAS les parties de UUID avec des suffixes\n');

// Test de nettoyage
console.log('🧹 TEST DE NETTOYAGE (retirer les suffixes):\n');

const removePattern = /-\d+(?=-\d+|$)/g;  // Retire tous les suffixes -N

testCases.forEach(test => {
  const cleaned = test.id.replace(/(-\d+)+$/, '');
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned);
  
  console.log(`${test.desc}:`);
  console.log(`   Original: ${test.id}`);
  console.log(`   Nettoyé:  ${cleaned}`);
  console.log(`   Est UUID: ${isUUID ? '✅' : '❌'}`);
  console.log('');
});
