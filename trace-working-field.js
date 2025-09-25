/**
 * 🔍 SCRIPT DE TRAÇAGE COMPLET - CHAMP QUI FONCTIONNE
 * 
 * Trace le chemin EXACT du champ '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' 
 * pour comprendre pourquoi lui fonctionne et pas les autres.
 * 
 * Étapes de traçage :
 * 1. Récupération des données brutes du champ
 * 2. Vérification de l'exposedKey et sourceRef
 * 3. Test de résolution via l'API
 * 4. Trace du chemin de rendu
 * 5. Comparaison avec d'autres champs similaires
 */

const { PrismaClient } = require('@prisma/client');

const TARGET_FIELD_ID = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 TRAÇAGE COMPLET - CHAMP QUI FONCTIONNE');
    console.log('=====================================');
    console.log(`🎯 Champ cible: ${TARGET_FIELD_ID}`);
    console.log('');

    // ====== ÉTAPE 1: RÉCUPÉRATION DES DONNÉES BRUTES ======
    console.log('📖 ÉTAPE 1: DONNÉES BRUTES DU CHAMP');
    console.log('-----------------------------------');
    
    const field = await prisma.treeBranchLeafNode.findUnique({
      where: { id: TARGET_FIELD_ID },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeTable: true,
        parent_TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            tbl_code: true,
            type: true
          }
        },
        other_TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            tbl_code: true,
            type: true,
            value: true
          }
        }
      }
    });

    if (!field) {
      console.log('❌ CHAMP NON TROUVÉ !');
      return;
    }

    console.log('✅ Champ trouvé :');
    console.log(`   ID: ${field.id}`);
    console.log(`   Label: ${field.label}`);
    console.log(`   Type: ${field.type}`);
    console.log(`   TBL Code: ${field.tbl_code}`);
    console.log(`   TBL Type: ${field.tbl_type}`);
    console.log(`   TBL Capacity: ${field.tbl_capacity}`);
    console.log(`   Value: ${field.value}`);
    console.log(`   Valeur par défaut: ${field.default_value}`);
    console.log(`   Parent: ${field.parent_TreeBranchLeafNode?.label || 'Aucun'}`);
    console.log('');

    // ====== ÉTAPE 2: VARIABLES ASSOCIÉES ======
    console.log('🏷️ ÉTAPE 2: VARIABLES ASSOCIÉES');
    console.log('-------------------------------');
    
    if (field.TreeBranchLeafNodeVariable.length > 0) {
      for (const variable of field.TreeBranchLeafNodeVariable) {
        console.log(`✅ Variable trouvée :`);
        console.log(`   ID Variable: ${variable.id}`);
        console.log(`   Exposed Key: ${variable.exposedKey}`);
        console.log(`   Source Ref: ${variable.sourceRef}`);
        console.log(`   Display Name: ${variable.displayName}`);
        console.log(`   Mirror Value: ${variable.mirrorValue}`);
        console.log('');
      }
    } else {
      console.log('⚠️ Aucune variable trouvée pour ce champ');
    }

    // ====== ÉTAPE 3: ÉLÉMENTS LIÉS (FORMULES, CONDITIONS, TABLEAUX) ======
    console.log('🔗 ÉTAPE 3: ÉLÉMENTS LIÉS');
    console.log('------------------------');
    
    if (field.TreeBranchLeafNodeFormula.length > 0) {
      console.log(`🧮 ${field.TreeBranchLeafNodeFormula.length} Formule(s) trouvée(s) :`);
      for (const formula of field.TreeBranchLeafNodeFormula) {
        console.log(`   - Formule ID: ${formula.id}`);
        console.log(`   - Nom: ${formula.name}`);
        console.log(`   - Description: ${formula.description}`);
        console.log(`   - Tokens: ${formula.tokens}`);
        console.log('');
      }
    }

    if (field.TreeBranchLeafNodeCondition.length > 0) {
      console.log(`⚖️ ${field.TreeBranchLeafNodeCondition.length} Condition(s) trouvée(s)`);
    }

    if (field.TreeBranchLeafNodeTable.length > 0) {
      console.log(`📊 ${field.TreeBranchLeafNodeTable.length} Tableau(x) trouvé(s)`);
    }

    // ====== ÉTAPE 4: RECHERCHE DE SOURCEREF AVEC PREFIXES ======
    console.log('🔍 ÉTAPE 4: RECHERCHE DE SOURCEREF');
    console.log('---------------------------------');
    
    const sourceRefPatterns = [
      `formula:${TARGET_FIELD_ID}`,
      `node-formula:${TARGET_FIELD_ID}`,
      `condition:${TARGET_FIELD_ID}`,
      TARGET_FIELD_ID
    ];

    for (const pattern of sourceRefPatterns) {
      const variablesWithSourceRef = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { sourceRef: pattern },
        include: {
          TreeBranchLeafNode: {
            select: {
              id: true,
              label: true,
              tbl_code: true,
              type: true
            }
          }
        }
      });

      if (variablesWithSourceRef.length > 0) {
        console.log(`✅ Variables avec sourceRef="${pattern}" :`);
        for (const variable of variablesWithSourceRef) {
          console.log(`   - Variable: ${variable.exposedKey}`);
          console.log(`   - Champ associé: ${variable.TreeBranchLeafNode.label}`);
          console.log(`   - Type champ: ${variable.TreeBranchLeafNode.type}`);
          console.log(`   - TBL Code: ${variable.TreeBranchLeafNode.tbl_code}`);
          console.log('');
        }
      } else {
        console.log(`❌ Aucune variable avec sourceRef="${pattern}"`);
      }
    }

    // ====== ÉTAPE 5: TEST DE DÉTECTION DE CAPACITÉS ======
    console.log('🔍 ÉTAPE 5: TEST DE DÉTECTION DE CAPACITÉS');
    console.log('------------------------------------------');
    
    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: TARGET_FIELD_ID }
    });

    for (const variable of allVariables) {
      const sourceRef = variable.sourceRef || '';
      let capacity = '1'; // Neutre par défaut
      let hasFormula = false;
      let hasCondition = false;
      let hasTable = false;

      // Test de détection selon les différents préfixes
      if (sourceRef.startsWith('formula:')) {
        capacity = '2';
        hasFormula = true;
      } else if (sourceRef.startsWith('node-formula:')) {
        capacity = '2';
        hasFormula = true;
      } else if (sourceRef.startsWith('condition:')) {
        capacity = '3';
        hasCondition = true;
      } else if (sourceRef.startsWith('table:')) {
        capacity = '4';
        hasTable = true;
      }

      console.log(`🔍 Variable: ${variable.exposedKey}`);
      console.log(`   Source Ref: "${sourceRef}"`);
      console.log(`   Capacité détectée: ${capacity}`);
      console.log(`   Est une formule: ${hasFormula}`);
      console.log(`   Est une condition: ${hasCondition}`);
      console.log(`   Est un tableau: ${hasTable}`);
      console.log('');
    }

    // ====== ÉTAPE 6: COMPARAISON AVEC D'AUTRES CHAMPS ======
    console.log('🔄 ÉTAPE 6: COMPARAISON AVEC D\'AUTRES CHAMPS');
    console.log('--------------------------------------------');
    
    // Chercher d'autres champs avec des formules
    const otherFieldsWithFormulas = await prisma.treeBranchLeafNode.findMany({
      where: {
        AND: [
          { id: { not: TARGET_FIELD_ID } }, // Exclure le champ actuel
          {
            TreeBranchLeafNodeFormula: {
              some: {}
            }
          }
        ]
      },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      take: 5 // Limiter à 5 pour comparaison
    });

    console.log(`📊 Trouvé ${otherFieldsWithFormulas.length} autres champs avec formules :`);
    for (const otherField of otherFieldsWithFormulas) {
      console.log(`   🔍 Champ: ${otherField.label} (${otherField.id})`);
      console.log(`      Type: ${otherField.type}`);
      console.log(`      TBL Capacity: ${otherField.tbl_capacity}`);
      
      for (const variable of otherField.TreeBranchLeafNodeVariable) {
        console.log(`      Variable: ${variable.exposedKey} → sourceRef: "${variable.sourceRef}"`);
      }
      
      for (const formula of otherField.TreeBranchLeafNodeFormula) {
        console.log(`      Formule: ${formula.name || formula.id}`);
      }
      console.log('');
    }

    // ====== ÉTAPE 7: SIMULATION DE RENDU ======
    console.log('🎭 ÉTAPE 7: SIMULATION DE RENDU');
    console.log('-------------------------------');
    
    // Simuler le processus de décision de rendu dans TBLSectionRenderer
    const fieldData = {
      id: field.id,
      label: field.label,
      type: field.type,
      tbl_capacity: field.tbl_capacity,
      variables: field.TreeBranchLeafNodeVariable
    };

    console.log('🎭 Simulation du rendu TBLSectionRenderer :');
    
    // Vérifier si le champ a des capacités de formule
    const hasFormulaCapability = fieldData.variables.some(v => {
      const sourceRef = v.sourceRef || '';
      return sourceRef.startsWith('formula:') || sourceRef.startsWith('node-formula:');
    });

    console.log(`   Capacité formule détectée: ${hasFormulaCapability}`);
    console.log(`   TBL Capacity: ${fieldData.tbl_capacity}`);
    console.log(`   Type de champ: ${fieldData.type}`);

    // Déterminer le type de rendu
    let renderType = 'normal';
    if (hasFormulaCapability || fieldData.tbl_capacity === 2) {
      renderType = 'SmartCalculatedField';
    }

    console.log(`   Type de rendu prévu: ${renderType}`);
    console.log('');

    // ====== ÉTAPE 8: RÉSUMÉ ET RECOMMANDATIONS ======
    console.log('📋 ÉTAPE 8: RÉSUMÉ ET RECOMMANDATIONS');
    console.log('=====================================');
    
    console.log('🎯 CARACTÉRISTIQUES DU CHAMP QUI FONCTIONNE :');
    console.log(`   - ID: ${field.id}`);
    console.log(`   - Label: ${field.label}`);
    console.log(`   - Type: ${field.type}`);
    console.log(`   - TBL Capacity: ${field.tbl_capacity}`);
    console.log(`   - Nombre de variables: ${field.TreeBranchLeafNodeVariable.length}`);
    console.log(`   - Nombre de formules: ${field.TreeBranchLeafNodeFormula.length}`);
    
    if (field.TreeBranchLeafNodeVariable.length > 0) {
      const mainVariable = field.TreeBranchLeafNodeVariable[0];
      console.log(`   - Variable principale: ${mainVariable.exposedKey}`);
      console.log(`   - Source Ref: "${mainVariable.sourceRef}"`);
    }
    
    console.log('');
    console.log('💡 RECOMMANDATIONS POUR RÉPLIQUER LE COMPORTEMENT :');
    console.log('   1. Vérifier que les autres champs ont des variables avec sourceRef approprié');
    console.log('   2. S\'assurer que la détection "node-formula:" est bien activée');
    console.log('   3. Vérifier que tbl_capacity = 2 pour les champs formule');
    console.log('   4. Contrôler que les formules ont des tokens valides');
    console.log('');

  } catch (error) {
    console.error('❌ ERREUR PENDANT LE TRAÇAGE:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();