/**
 * 🔍 DIAGNOSTIC COMPLET: Pourquoi les calculs ne fonctionnent plus ?
 * 
 * Teste directement l'Operation Interpreter côté backend
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GRD_NODE_ID = '9f27d411-6511-487c-a983-9f9fc357c560';
const PRIX_KWH_NODE_ID = '99476bab-4835-4108-ad02-7f37e096647d';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';
const LEAD_ID = 'cmfvc2vkh0001goqkr9yek13c'; // À ajuster selon ton lead actif

async function testBackendCalculation() {
  console.log('🧪 ========== TEST CALCUL BACKEND ==========\n');

  try {
    // 1. Simuler l'appel à l'Operation Interpreter
    console.log('📋 1. SIMULATION APPEL OPERATION INTERPRETER\n');
    
    // Récupérer les capacités pour ces nœuds
    const grdNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: GRD_NODE_ID },
      select: {
        id: true,
        label: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        metadata: true
      }
    });

    const prixKwhNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: PRIX_KWH_NODE_ID },
      select: {
        id: true,
        label: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        metadata: true
      }
    });

    console.log('🔹 GRD Node capabilities:', {
      hasData: grdNode.hasData,
      hasFormula: grdNode.hasFormula,
      hasCondition: grdNode.hasCondition,
      hasTable: grdNode.hasTable,
      sourceRef: grdNode.metadata?.capabilities?.datas?.[0]?.config?.sourceRef
    });

    console.log('\n🔹 Prix Kwh Node capabilities:', {
      hasData: prixKwhNode.hasData,
      hasFormula: prixKwhNode.hasFormula,
      hasCondition: prixKwhNode.hasCondition,
      hasTable: prixKwhNode.hasTable,
      sourceRef: prixKwhNode.metadata?.capabilities?.datas?.[0]?.config?.sourceRef
    });

    // 2. Vérifier que les sources existent
    console.log('\n\n🔍 2. VÉRIFICATION DES SOURCES\n');

    // Table GRD
    const grdTableRef = grdNode.metadata?.capabilities?.datas?.[0]?.config?.sourceRef;
    if (grdTableRef) {
      const tableId = grdTableRef.replace('@table.', '');
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        select: {
          id: true,
          name: true,
          tableRows: {
            take: 5,
            select: {
              id: true,
              cells: true
            }
          }
        }
      });

      if (table) {
        console.log('✅ Table GRD trouvée:', {
          id: table.id,
          name: table.name,
          premièresLignes: table.tableRows.length,
          exemple: table.tableRows[0]
        });
      } else {
        console.log('❌ Table GRD INTROUVABLE avec ID:', tableId);
      }
    }

    // Condition Prix Kwh
    const prixKwhCondRef = prixKwhNode.metadata?.capabilities?.datas?.[0]?.config?.sourceRef;
    if (prixKwhCondRef && prixKwhCondRef.includes('condition:')) {
      const conditionId = prixKwhCondRef.replace('condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId },
        select: {
          id: true,
          name: true,
          conditionSet: true
        }
      });

      if (condition) {
        console.log('\n✅ Condition Prix Kwh trouvée:', {
          id: condition.id,
          name: condition.name,
          hasConditionSet: !!condition.conditionSet
        });
      } else {
        console.log('\n❌ Condition Prix Kwh INTROUVABLE avec ID:', conditionId);
      }
    }

    // 3. Tester avec formData vide
    console.log('\n\n📊 3. TEST AVEC FORMDATA VIDE\n');
    
    const emptyFormData = {
      __leadId: LEAD_ID,
      __treeId: TREE_ID
    };

    console.log('FormData envoyé:', emptyFormData);
    console.log('\n⚠️ NOTE: Pour tester réellement le calcul, il faut:');
    console.log('1. Que le serveur API soit démarré');
    console.log('2. Faire un appel HTTP POST vers /api/tbl/submissions/preview-evaluate');
    console.log('3. Avec le payload:', JSON.stringify({
      treeId: TREE_ID,
      formData: emptyFormData,
      leadId: LEAD_ID
    }, null, 2));

    // 4. Vérifier les flags de capacités
    console.log('\n\n🚨 4. DIAGNOSTIC DES FLAGS\n');

    const issues = [];

    // GRD
    if (!grdNode.hasData && !grdNode.hasTable) {
      issues.push({
        node: 'GRD',
        problème: 'hasData et hasTable sont tous deux FALSE',
        solution: 'Activer hasTable=true car le champ utilise une table'
      });
    }

    if (grdNode.hasData && !grdTableRef) {
      issues.push({
        node: 'GRD',
        problème: 'hasData=true mais aucune sourceRef configurée',
        solution: 'Vérifier metadata.capabilities.datas[0].config.sourceRef'
      });
    }

    // Prix Kwh
    if (!prixKwhNode.hasData && !prixKwhNode.hasCondition) {
      issues.push({
        node: 'Prix Kwh',
        problème: 'hasData et hasCondition sont tous deux FALSE',
        solution: 'Activer hasCondition=true car le champ utilise une condition'
      });
    }

    if (prixKwhNode.hasData && !prixKwhCondRef) {
      issues.push({
        node: 'Prix Kwh',
        problème: 'hasData=true mais aucune sourceRef configurée',
        solution: 'Vérifier metadata.capabilities.datas[0].config.sourceRef'
      });
    }

    // 5. Vérifier le code Operation Interpreter
    console.log('\n\n🔧 5. VÉRIFICATION ROUTE BACKEND\n');
    
    console.log('Chemin du fichier Operation Interpreter:');
    console.log('src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts');
    console.log('\nPoints à vérifier dans le code:');
    console.log('✓ La route POST /api/tbl/submissions/preview-evaluate existe');
    console.log('✓ Elle appelle bien evaluateUniversalCapability()');
    console.log('✓ evaluateUniversalCapability() gère bien les @table.xxx');
    console.log('✓ evaluateUniversalCapability() gère bien les condition:xxx');

    // 6. Résumé
    console.log('\n\n📝 6. RÉSUMÉ ET SOLUTIONS\n');

    if (issues.length > 0) {
      console.log('🚨 PROBLÈMES DÉTECTÉS:\n');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.node}:`);
        console.log(`   ❌ Problème: ${issue.problème}`);
        console.log(`   💡 Solution: ${issue.solution}\n`);
      });

      console.log('\n💾 COMMANDES SQL POUR CORRIGER:\n');
      
      if (issues.some(i => i.node === 'GRD' && i.problème.includes('hasTable'))) {
        console.log(`-- Activer hasTable pour GRD`);
        console.log(`UPDATE "TreeBranchLeafNode" SET "hasTable" = true WHERE id = '${GRD_NODE_ID}';\n`);
      }

      if (issues.some(i => i.node === 'Prix Kwh' && i.problème.includes('hasCondition'))) {
        console.log(`-- Activer hasCondition pour Prix Kwh`);
        console.log(`UPDATE "TreeBranchLeafNode" SET "hasCondition" = true WHERE id = '${PRIX_KWH_NODE_ID}';\n`);
      }
    } else {
      console.log('✅ Configuration des nœuds semble correcte');
      console.log('\n🔍 Si le calcul ne fonctionne toujours pas, vérifier:');
      console.log('1. Le serveur API est bien redémarré');
      console.log('2. Les logs du serveur lors de l\'appel à /api/tbl/submissions/preview-evaluate');
      console.log('3. Le composant SmartCalculatedField reçoit bien la réponse');
      console.log('4. useBackendValue décode correctement operationResult');
    }

    // 7. Test de lookup sur la table
    console.log('\n\n🔎 7. TEST LOOKUP SUR TABLE GRD\n');
    
    if (grdTableRef) {
      const tableId = grdTableRef.replace('@table.', '');
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        select: {
          lookupSelectColumn: true,
          lookupDisplayColumns: true,
          tableRows: {
            take: 3,
            select: {
              cells: true
            }
          }
        }
      });

      console.log('Configuration lookup:', {
        lookupSelectColumn: table?.lookupSelectColumn,
        lookupDisplayColumns: table?.lookupDisplayColumns,
        premièresLignes: table?.tableRows.map(r => r.cells)
      });

      if (!table?.lookupSelectColumn) {
        console.log('\n⚠️ ATTENTION: lookupSelectColumn est NULL');
        console.log('Le backend ne saura pas quelle colonne utiliser pour le lookup!');
        console.log('Solution: Configurer la table avec une colonne de sélection');
      }
    }

  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBackendCalculation();
