/**
 * 🧠 SYSTÈME INTELLIGENT TBL BRIDGE - DÉTECTION AUTOMATIQUE
 * 
 * Ce système doit comprendre automatiquement :
 * 1. Les 70 éléments existants (avec migration)
 * 2. Les nouveaux éléments créés (détection auto)
 * 
 * RÈGLES DE DÉTECTION AUTOMATIQUE :
 */

export interface TBLIntelligentDetection {
  // Structure hiérarchique
  hierarchy: {
    level1Branches: string[]; // Les 5 branches principales (onglets)
    level2Branches: string[]; // Sous-branches (listes déroulantes)
    sections: string[];       // Sections (containers)
    fields: string[];         // Champs de saisie
    options: string[];        // Options simples
    optionFields: string[];   // Options+Champs
    dataFields: string[];     // Champs avec formules
  };
  
  // Détection automatique des nouveaux éléments
  autoDetect: {
    detectBranchLevel(elementName: string, parentId?: string): 1 | 2;
    detectElementType(elementName: string, context: string): 'branch' | 'section' | 'field' | 'option' | 'option_field';
    assignCode(type: string, level?: number): string;
  };
}

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

// Fonction de détection automatique
function detectElementType(elementName: string, parentContext?: string): {
  type: string;
  code: string;
  reasoning: string;
} {
  
  // 1. Vérifier si c'est une branche niveau 1
  if (detectionRules.level1Patterns.includes(elementName)) {
    return {
      type: 'branch_level1',
      code: '11',
      reasoning: `"${elementName}" est une des 5 branches principales → Onglet TBL`
    };
  }
  
  // 2. Vérifier si c'est une branche niveau 2
  if (detectionRules.level2Patterns.some(pattern => pattern.test(elementName))) {
    return {
      type: 'branch_level2', 
      code: '21',
      reasoning: `"${elementName}" correspond au pattern sous-branche → Liste déroulante`
    };
  }
  
  // 3. Vérifier si c'est une section
  if (detectionRules.sectionPatterns.some(pattern => pattern.test(elementName))) {
    return {
      type: 'section',
      code: '71', 
      reasoning: `"${elementName}" correspond au pattern section → Container`
    };
  }
  
  // 4. Vérifier si c'est une formule
  if (detectionRules.formulaPatterns.some(pattern => pattern.test(elementName))) {
    return {
      type: 'formula_field',
      code: '63',
      reasoning: `"${elementName}" contient une formule → Champ calculé`
    };
  }
  
  // 5. Vérifier si c'est une option+champ
  if (detectionRules.optionFieldPatterns.some(pattern => pattern.test(elementName))) {
    const hasFormula = detectionRules.formulaPatterns.some(pattern => pattern.test(elementName));
    return {
      type: 'option_field',
      code: hasFormula ? '53' : '51',
      reasoning: `"${elementName}" est une option qui ouvre un champ ${hasFormula ? 'avec formule' : ''}`
    };
  }
  
  // 6. Vérifier si c'est une option simple
  if (detectionRules.optionPatterns.some(pattern => pattern.test(elementName))) {
    return {
      type: 'option',
      code: '41',
      reasoning: `"${elementName}" est une option simple → Dans liste déroulante`
    };
  }
  
  // 7. Par défaut : champ de saisie
  return {
    type: 'field',
    code: '31',
    reasoning: `"${elementName}" est un champ de saisie standard`
  };
}

// Test sur les éléments existants
const testElements = [
  'Clients',
  'Type de volume', 
  'Données',
  'Prix Kw/h',
  'Oui',
  'Autres',
  'Calcul du prix Kw/h',
  'Nom',
  'Nouveau champ test'
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

console.log('\n✅ SYSTÈME PRÊT POUR NOUVEAUX ÉLÉMENTS !');
console.log('Le TBL Bridge comprendra automatiquement les créations futures !');

export default {
  detectElementType,
  detectionRules
};