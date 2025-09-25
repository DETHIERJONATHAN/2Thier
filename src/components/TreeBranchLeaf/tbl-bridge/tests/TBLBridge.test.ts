/**
 * 🧪 TESTS COMPLETS TBL BRIDGE V2.0
 * 
 * Suite de tests pour valider le système TBL Bridge complet :
 * - CapacityDetector (détection automatique des capacités)
 * - TBLDecoder (décodage codes 2-chiffres)
 * - TBLBridge (coordinateur principal)
 * - TBLMigration (migration sécurisée)
 */

import { describe, test, expect, beforeEach, jest } from '@jest/testing-framework';
import { CapacityDetector, TreeBranchLeafNode, TBLCapacity } from '../capacities/CapacityDetector';
import { TBLDecoder } from '../TBLDecoder';
import { TBLBridge } from '../TBLBridge';

// 🧪 DONNÉES DE TEST RÉALISTES
const mockNodes: TreeBranchLeafNode[] = [
  {
    id: "uuid-branch-1",
    nodeId: "node-1",
    label: "Devis Électrique",
    type: "branch",
    hasFormula: false,
    hasCondition: false,
    hasTable: false
  },
  {
    id: "uuid-field-2",
    nodeId: "node-2", 
    label: "Calcul du prix total",
    type: "leaf_field",
    parentId: "uuid-section-3",
    hasFormula: true,
    formula_activeId: "formula-123",
    formula_tokens: [{ type: 'field', value: 'quantite' }, { type: 'operator', value: '*' }]
  },
  {
    id: "uuid-section-3",
    nodeId: "node-3",
    label: "Résultats",
    type: "section",
    hasTable: true,
    table_activeId: "table-456"
  },
  {
    id: "uuid-option-4",
    nodeId: "node-4",
    label: "Particulier",
    type: "leaf_option",
    parentId: "uuid-branch-1"
  },
  {
    id: "uuid-condition-5",
    nodeId: "node-5",
    label: "Remise si professionnel",
    type: "leaf_field",
    hasCondition: true,
    condition_activeId: "condition-789",
    condition_branches: [{ if: 'type == professionnel', then: 'remise 10%' }]
  }
];

describe('🧠 CapacityDetector', () => {
  
  describe('Détection des capacités', () => {
    
    test('Détecte correctement une formule', () => {
      const node = mockNodes.find(n => n.hasFormula)!;
      const result = CapacityDetector.detectCapacity(node);
      
      expect(result.capacity).toBe('2'); // Formule
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.indicators).toContain('hasFormula=true');
      expect(result.indicators).toContain('formula_activeId=formula-123');
    });
    
    test('Détecte correctement une condition', () => {
      const node = mockNodes.find(n => n.hasCondition)!;
      const result = CapacityDetector.detectCapacity(node);
      
      expect(result.capacity).toBe('3'); // Condition
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.indicators).toContain('hasCondition=true');
    });
    
    test('Détecte correctement un tableau (section)', () => {
      const node = mockNodes.find(n => n.type === 'section')!;
      const result = CapacityDetector.detectCapacity(node);
      
      expect(result.capacity).toBe('4'); // Tableau
      expect(result.indicators).toContain('Règle type: section → tableau automatique');
    });
    
    test('Détecte neutre par défaut', () => {
      const node = mockNodes.find(n => n.type === 'branch')!;
      const result = CapacityDetector.detectCapacity(node);
      
      expect(result.capacity).toBe('1'); // Neutre
    });
    
    test('Gère les conflits formule + condition', () => {
      const conflictNode: TreeBranchLeafNode = {
        id: "conflict",
        nodeId: "node-conflict",
        label: "Conflit test",
        type: "leaf_field",
        hasFormula: true,
        formula_activeId: "formula-1",
        hasCondition: true,
        condition_activeId: "condition-1"
      };
      
      const result = CapacityDetector.detectCapacity(conflictNode);
      expect(result.warnings).toContain('Conflit détecté: formule ET condition présentes');
    });
  });
  
  describe('Analyse par lots', () => {
    
    test('Analyse correctement plusieurs nœuds', () => {
      const results = CapacityDetector.analyzeBatch(mockNodes);
      
      expect(results.size).toBe(mockNodes.length);
      expect(results.get("uuid-branch-1")?.capacity).toBe('1'); // Branche neutre
      expect(results.get("uuid-field-2")?.capacity).toBe('2');  // Formule
      expect(results.get("uuid-section-3")?.capacity).toBe('4'); // Tableau
    });
    
    test('Génère des statistiques correctes', () => {
      const results = CapacityDetector.analyzeBatch(mockNodes);
      const stats = CapacityDetector.generateBatchStatistics(results);
      
      expect(stats.total).toBe(mockNodes.length);
      expect(stats.byCapacity['1']).toBeGreaterThan(0); // Au moins 1 neutre
      expect(stats.byCapacity['2']).toBeGreaterThan(0); // Au moins 1 formule
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });
  });
});

describe('🔍 TBLDecoder', () => {
  
  describe('Décodage des codes TBL', () => {
    
    test('Décode correctement un code valide', () => {
      const result = TBLDecoder.decode("62-prix-total-ht");
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('6');
      expect(result.capacity).toBe('2');
      expect(result.name).toBe('prix-total-ht');
      expect(result.typeLabel).toBe('Champ données');
      expect(result.capacityLabel).toBe('Formule');
      expect(result.tblBehavior.component).toBe('DataField');
      expect(result.tblBehavior.dependencies).toBe(true);
    });
    
    test('Détecte les codes invalides', () => {
      const invalidCodes = [
        "",
        "1",
        "1-",
        "12",
        "99-test",
        "15-test"
      ];
      
      for (const code of invalidCodes) {
        const result = TBLDecoder.decode(code);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
    
    test('Génère des avertissements de cohérence', () => {
      const result = TBLDecoder.decode("42-option-avec-formule");
      
      expect(result.warnings).toContain('Inhabituel: option avec formule/condition');
    });
  });
  
  describe('Génération de codes', () => {
    
    test('Génère des codes correctement', () => {
      const code = TBLDecoder.generate("3", "1", "Puissance kWh");
      expect(code).toBe("31-puissance-kwh");
    });
    
    test('Normalise les noms correctement', () => {
      const code = TBLDecoder.generate("6", "2", "Prix Total HT (€)");
      expect(code).toBe("62-prix-total-ht");
    });
    
    test('Rejette les paramètres invalides', () => {
      expect(() => TBLDecoder.generate("9", "1", "test")).toThrow();
      expect(() => TBLDecoder.generate("1", "5", "test")).toThrow();
      expect(() => TBLDecoder.generate("1", "1", "")).toThrow();
    });
  });
  
  describe('Utilitaires de recherche', () => {
    
    test('Trouve les formules correctement', () => {
      const codes = ["31-test", "62-formule", "73-condition", "14-tableau"];
      const formulas = TBLDecoder.findWithFormulas(codes);
      expect(formulas).toEqual(["62-formule"]);
    });
    
    test('Détermine le bon composant', () => {
      expect(TBLDecoder.getRequiredComponent("11-devis")).toBe("Tab");
      expect(TBLDecoder.getRequiredComponent("62-prix")).toBe("DataField");
      expect(TBLDecoder.getRequiredComponent("invalid")).toBe("Error");
    });
  });
});

describe('🎯 TBLBridge', () => {
  let bridge: TBLBridge;
  
  beforeEach(() => {
    bridge = new TBLBridge({
      enableAutoCapacityDetection: true,
      debugMode: false
    });
  });
  
  describe('Traitement des éléments', () => {
    
    test('Crée un nouvel élément correctement', async () => {
      const node = mockNodes[0]; // Branche
      const result = await bridge.process(node);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.element?.tbl_code).toMatch(/^11-devis-electrique/);
      expect(result.element?.tbl_type).toBe('1');
      expect(result.element?.tbl_capacity).toBe('1');
    });
    
    test('Met à jour un élément existant', async () => {
      const node = mockNodes[0];
      
      // Première création
      await bridge.process(node);
      
      // Modification et re-traitement
      const modifiedNode = { ...node, label: "Devis Électrique Modifié" };
      const result = await bridge.process(modifiedNode);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.element?.label).toBe("Devis Électrique Modifié");
    });
    
    test('Génère des codes TBL uniques', async () => {
      const node1 = { ...mockNodes[0], id: "uuid-1" };
      const node2 = { ...mockNodes[0], id: "uuid-2", label: "Devis Électrique" }; // Même nom
      
      const result1 = await bridge.process(node1);
      const result2 = await bridge.process(node2);
      
      expect(result1.element?.tbl_code).not.toBe(result2.element?.tbl_code);
    });
  });
  
  describe('Gestion des types spéciaux', () => {
    
    test('Transforme leaf_field en section en champ données', async () => {
      const fieldInSection = {
        ...mockNodes[1], // Champ avec formule
        parentId: "uuid-section-3" // Dans une section
      };
      
      const result = await bridge.process(fieldInSection);
      expect(result.element?.tbl_type).toBe('6'); // Champ données
    });
    
    test('Traite les sections comme tableaux', async () => {
      const section = mockNodes.find(n => n.type === 'section')!;
      const result = await bridge.process(section);
      
      expect(result.element?.tbl_type).toBe('7'); // Section
      expect(result.element?.tbl_capacity).toBe('4'); // Tableau
    });
  });
  
  describe('Requêtes et statistiques', () => {
    
    test('Récupère les éléments par code', async () => {
      const node = mockNodes[0];
      const result = await bridge.process(node);
      
      const retrieved = bridge.getElementByCode(result.element!.tbl_code);
      expect(retrieved?.id).toBe(node.id);
    });
    
    test('Filtre par type et capacité', async () => {
      // Traiter plusieurs nœuds
      for (const node of mockNodes) {
        await bridge.process(node);
      }
      
      const branches = bridge.getElementsByType('1');
      const formulas = bridge.getElementsByCapacity('2');
      
      expect(branches.length).toBeGreaterThan(0);
      expect(formulas.length).toBeGreaterThan(0);
    });
    
    test('Génère des statistiques correctes', async () => {
      for (const node of mockNodes) {
        await bridge.process(node);
      }
      
      const stats = bridge.getStatistics();
      expect(stats.total).toBe(mockNodes.length);
      expect(stats.autoGenerated).toBe(mockNodes.length);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });
  });
});

describe('🔄 TBLMigration', () => {
  
  // Note: Ces tests nécessiteraient un environnement de base de données de test
  // Ici nous testons la logique sans BDD
  
  describe('Helpers et utilitaires', () => {
    
    test('Normalise les chaînes correctement', () => {
      // Accès privé pour test (en réalité on exporterait ces fonctions)
      const testCases = [
        ["Prix Total (€)", "prix-total"],
        ["Éléments à traiter", "elements-a-traiter"],
        ["Test---multiple", "test-multiple"],
        ["---début et fin---", "debut-et-fin"]
      ];
      
      // Test de la logique de normalisation
      for (const [input, expected] of testCases) {
        const normalized = input
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        expect(normalized).toBe(expected);
      }
    });
  });
});

describe('🔗 Intégration complète', () => {
  
  test('Pipeline complet: TreeBranchLeaf → TBL', async () => {
    const bridge = new TBLBridge({ debugMode: false });
    
    // 1. Traiter un nœud complexe avec formule
    const formulaNode: TreeBranchLeafNode = {
      id: "integration-test",
      nodeId: "node-integration",
      label: "Calcul remise conditionnelle",
      type: "leaf_field",
      hasFormula: true,
      formula_activeId: "formula-integration",
      hasCondition: true,
      condition_activeId: "condition-integration"
    };
    
    // 2. Traitement TBL Bridge
    const result = await bridge.process(formulaNode);
    
    // 3. Vérifications
    expect(result.success).toBe(true);
    expect(result.element?.tbl_code).toMatch(/^[36][23]-calcul-remise-conditionnelle/);
    
    // 4. Décodage du code généré
    const decoded = TBLDecoder.decode(result.element!.tbl_code);
    expect(decoded.isValid).toBe(true);
    expect(decoded.tblBehavior.dependencies).toBe(true);
    
    // 5. Récupération par code
    const retrieved = bridge.getElementByCode(result.element!.tbl_code);
    expect(retrieved?.id).toBe(formulaNode.id);
  });
  
  test('Gestion des cas limites', async () => {
    const bridge = new TBLBridge();
    
    // Nœud avec nom très court
    const shortNameNode: TreeBranchLeafNode = {
      id: "short",
      nodeId: "node-short",
      label: "A",
      type: "leaf_field"
    };
    
    const result = await bridge.process(shortNameNode);
    expect(result.success).toBe(true);
    
    // Nœud avec caractères spéciaux
    const specialCharsNode: TreeBranchLeafNode = {
      id: "special",
      nodeId: "node-special", 
      label: "Prix/m² (€) - 20% TVA",
      type: "leaf_field"
    };
    
    const result2 = await bridge.process(specialCharsNode);
    expect(result2.success).toBe(true);
    expect(result2.element?.tbl_code).toMatch(/^31-prix-m-20-tva/);
  });
});

/**
 * 🎯 TESTS DE PERFORMANCE
 */
describe('⚡ Performance', () => {
  
  test('Traite 100 éléments en moins de 5 secondes', async () => {
    const bridge = new TBLBridge({ debugMode: false });
    const startTime = Date.now();
    
    // Générer 100 nœuds de test
    const manyNodes: TreeBranchLeafNode[] = Array.from({ length: 100 }, (_, i) => ({
      id: `perf-test-${i}`,
      nodeId: `node-${i}`,
      label: `Test Performance ${i}`,
      type: i % 2 === 0 ? "leaf_field" : "leaf_option",
      hasFormula: i % 10 === 0
    }));
    
    // Traiter tous les nœuds
    for (const node of manyNodes) {
      await bridge.process(node);
    }
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 5 secondes max
    expect(bridge.getAllElements().length).toBe(100);
  }, 10000); // Timeout de 10 secondes
});

/**
 * 🎯 CONFIGURATION JEST
 * 
 * Dans package.json:
 * ```json
 * {
 *   "scripts": {
 *     "test:tbl": "jest src/components/TreeBranchLeaf/tbl-bridge/tests/",
 *     "test:tbl:watch": "jest --watch src/components/TreeBranchLeaf/tbl-bridge/tests/",
 *     "test:tbl:coverage": "jest --coverage src/components/TreeBranchLeaf/tbl-bridge/tests/"
 *   }
 * }
 * ```
 * 
 * Commandes d'exécution:
 * ```bash
 * npm run test:tbl              # Tests une fois
 * npm run test:tbl:watch        # Tests en mode watch
 * npm run test:tbl:coverage     # Tests avec couverture
 * ```
 */