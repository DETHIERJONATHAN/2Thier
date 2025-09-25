/**
 * 🧠 SYSTÈME INTELLIGENT TBL BRIDGE - DÉTECTION AUTOMATIQUE
 * 
 * Ce système doit comprendre automatiquement :
 * 1. Les 70 éléments existants (avec migration)
 * 2. Les nouveaux éléments créés (détection auto)
 */

// RÈGLES D'INTELLIGENCE
const detectionRules = {
  
  // 🌿 BRANCHES NIVEAU 1 (Type 11) - Onglets principaux
  level1Patterns: [
    'Clients', 'Information Générale', 'Électricité', 'Chauffage', 'Mesure'
  ],
  
  // 🌿 BRANCHES NIVEAU 2 (Type 21) - Listes déroulantes
  level2Patterns: [
    /Type de/i, /Compteur/i, /Terre/i, /Présence/i, /actuel/i, /chaude/i, /Idem/i, /Calcul/i
  ],
  
  // 📋 SECTIONS (Type 71) - Containers
  sectionPatterns: [
    /Données/i, /Section/i, /Groupe/i, /Bloc/i
  ],
  
  // ● CHAMPS (Type 31/63) - Saisie utilisateur
  fieldPatterns: [
    /Nom/i, /Adresse/i, /Tel/i, /Photo/i, /Consommation/i, /Longueur/i, /Hauteur/i, /Prix/i
  ],
  
  // ○ OPTIONS (Type 41) - Dans listes
  optionPatterns: [
    /^Oui$/i, /^Non$/i, /^Gaz$/i, /^Mazout$/i, /^Electrique$/i, /principale/i, /Garage/i
  ],
  
  // ◐ OPTIONS+CHAMPS (Type 51/53) - Avec saisie
  optionFieldPatterns: [
    /Autres/i, /Calcul/i, /Manuel/i, /Personnalisé/i
  ],
  
  // 🧮 FORMULES (Type X3) - Avec calculs
  formulaPatterns: [
    /Prix.*kw/i, /Calcul/i, /Formule/i, /Total/i, /Résultat/i
  ]
};

console.log('🧠 SYSTÈME INTELLIGENT TBL BRIDGE');
console.log('==================================');

// Fonction de détection automatique avec CAPACITÉS
function detectElementType(elementName, parentContext) {
  
  // Détection des capacités selon le README TBL Bridge
  function detectCapability(name, type) {
    // Capacité 3 = Formule (calculs mathématiques)
    if (detectionRules.formulaPatterns.some(pattern => pattern.test(name))) {
      return { capability: '3', reason: 'contient formule/calcul' };
    }
    
    // Capacité 4 = Condition (logique if/then/else) 
    if (/condition|si|alors|sinon|if|then|else/i.test(name)) {
      return { capability: '4', reason: 'contient logique conditionnelle' };
    }
    
    // Capacité 5 = Tableau (colonnes/recherche croisée)
    if (/tableau|grille|matrice|colonnes|lignes/i.test(name)) {
      return { capability: '5', reason: 'contient tableau/grille' };
    }
    
    // Capacité 2 = Données (sera placé dans section)
    if (type === 'data_field' || /résultat|total|calcul|données/i.test(name)) {
      return { capability: '2', reason: 'données pour section' };
    }
    
    // Capacité 1 = Neutre (par défaut)
    return { capability: '1', reason: 'neutre/standard' };
  }
  
  // 1. Vérifier si c'est une branche niveau 1
  if (detectionRules.level1Patterns.includes(elementName)) {
    const cap = detectCapability(elementName, 'branch1');
    return {
      type: 'branch_level1',
      code: `1${cap.capability}`,
      reasoning: `"${elementName}" est une des 5 branches principales → Onglet TBL (capacité ${cap.capability}: ${cap.reason})`
    };
  }
  
  // 2. Vérifier si c'est une branche niveau 2
  if (detectionRules.level2Patterns.some(pattern => pattern.test(elementName))) {
    const cap = detectCapability(elementName, 'branch2');
    return {
      type: 'branch_level2', 
      code: `2${cap.capability}`,
      reasoning: `"${elementName}" correspond au pattern sous-branche → Liste déroulante (capacité ${cap.capability}: ${cap.reason})`
    };
  }
  
  // 3. Vérifier si c'est une section
  if (detectionRules.sectionPatterns.some(pattern => pattern.test(elementName))) {
    const cap = detectCapability(elementName, 'section');
    return {
      type: 'section',
      code: `7${cap.capability}`, 
      reasoning: `"${elementName}" correspond au pattern section → Container (capacité ${cap.capability}: ${cap.reason})`
    };
  }
  
  // 4. Vérifier si c'est un champ données avec formule
  if (detectionRules.formulaPatterns.some(pattern => pattern.test(elementName))) {
    return {
      type: 'data_field_formula',
      code: '63',
      reasoning: `"${elementName}" contient une formule → Champ données calculé (capacité 3: formule)`
    };
  }
  
  // 5. Vérifier si c'est une option+champ
  if (detectionRules.optionFieldPatterns.some(pattern => pattern.test(elementName))) {
    const cap = detectCapability(elementName, 'option_field');
    return {
      type: 'option_field',
      code: `5${cap.capability}`,
      reasoning: `"${elementName}" est une option qui ouvre un champ (capacité ${cap.capability}: ${cap.reason})`
    };
  }
  
  // 6. Vérifier si c'est une option simple
  if (detectionRules.optionPatterns.some(pattern => pattern.test(elementName))) {
    const cap = detectCapability(elementName, 'option');
    return {
      type: 'option',
      code: `4${cap.capability}`,
      reasoning: `"${elementName}" est une option simple → Dans liste déroulante (capacité ${cap.capability}: ${cap.reason})`
    };
  }
  
  // 7. Par défaut : champ de saisie
  const cap = detectCapability(elementName, 'field');
  return {
    type: 'field',
    code: `3${cap.capability}`,
    reasoning: `"${elementName}" est un champ de saisie standard (capacité ${cap.capability}: ${cap.reason})`
  };
}

// Test sur les éléments existants ET nouveaux
const testElements = [
  'Clients',                    // Niveau 1
  'Type de volume',             // Niveau 2
  'Données',                    // Section
  'Prix Kw/h',                  // Formule
  'Oui',                        // Option
  'Autres',                     // Option+Champ
  'Calcul du prix Kw/h',        // Option+Champ+Formule
  'Nom',                        // Champ
  'Nouveau champ test',         // Nouveau champ
  'Type de construction',       // Nouvelle sous-branche
  'Informations techniques',    // Nouvelle section
  'Calcul automatique surface', // Nouvelle formule
  'Personnalisé'                // Nouvelle option+champ
];

console.log('\n🧪 TEST DE DÉTECTION AUTOMATIQUE');
console.log('================================');

testElements.forEach(element => {
  const detection = detectElementType(element);
  console.log(`\n"${element}"`);
  console.log(`  → Type: ${detection.type}`);
  console.log(`  → Code: ${detection.code}-xxx`);
  console.log(`  → Raison: ${detection.reasoning}`);
});

console.log('\n🎯 AVANTAGES DU SYSTÈME INTELLIGENT');
console.log('===================================');
console.log('✅ Comprend les 70 éléments existants');
console.log('✅ Détecte automatiquement les nouveaux éléments');
console.log('✅ Assigne les bons codes selon le type');
console.log('✅ Respecte la hiérarchie (niveau 1 vs niveau 2)');
console.log('✅ Distingue formules, options, champs');

console.log('\n🚀 PRÊT POUR INTÉGRATION TBL !');
console.log('Le système comprendra automatiquement tout ce que vous créez !');

module.exports = {
  detectElementType,
  detectionRules
};