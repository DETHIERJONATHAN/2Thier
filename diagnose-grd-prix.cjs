/**
 * 🔍 DIAGNOSTIC: Champs GRD et Prix Kwh
 * 
 * Vérifie pourquoi ces deux champs ne fonctionnent plus après réinitialisation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GRD_NODE_ID = '9f27d411-6511-487c-a983-9f9fc357c560';
const PRIX_KWH_NODE_ID = '99476bab-4835-4108-ad02-7f37e096647d';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';

async function diagnose() {
  console.log('🔍 ========== DIAGNOSTIC GRD & PRIX KWH ==========\n');

  try {
    // 1. Vérifier les nœuds principaux
    console.log('📋 1. VÉRIFICATION DES NŒUDS\n');
    
    const grdNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: GRD_NODE_ID },
      select: {
        id: true,
        label: true,
        type: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        metadata: true,
        value: true
      }
    });

    const prixKwhNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: PRIX_KWH_NODE_ID },
      select: {
        id: true,
        label: true,
        type: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        metadata: true,
        value: true
      }
    });

    console.log('🔹 GRD Node:', JSON.stringify(grdNode, null, 2));
    console.log('\n🔹 Prix Kwh Node:', JSON.stringify(prixKwhNode, null, 2));

    // 2. Extraire les capacités depuis metadata (ancien format)
    console.log('\n\n📊 2. VÉRIFICATION DES CAPACITÉS\n');
    
    const grdCapabilities = grdNode?.metadata?.capabilities || {};
    const prixKwhCapabilities = prixKwhNode?.metadata?.capabilities || {};

    console.log('🔹 GRD Capacités (metadata):', JSON.stringify(grdCapabilities, null, 2));
    console.log('\n🔹 Prix Kwh Capacités (metadata):', JSON.stringify(prixKwhCapabilities, null, 2));

    // 3. Vérifier si les sources référencées existent
    console.log('\n\n🔗 3. VÉRIFICATION DES SOURCES RÉFÉRENCÉES\n');

    // Pour GRD: vérifier la table
    const grdDataConfig = grdCapabilities?.datas?.[0]?.config;
    if (grdDataConfig?.sourceRef) {
      const tableId = grdDataConfig.sourceRef.replace('@table.', '');
      console.log(`🔍 Recherche table GRD: ${tableId}`);
      
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        select: {
          id: true,
          name: true,
          tableRows: true,
          lookupDisplayColumns: true,
          lookupSelectColumn: true
        }
      });

      if (table) {
        console.log('✅ Table GRD trouvée:', JSON.stringify(table, null, 2));
      } else {
        console.log('❌ Table GRD INTROUVABLE!');
        
        // Chercher des tables similaires
        const allTables = await prisma.treeBranchLeafNodeTable.findMany({
          where: { treeId: TREE_ID },
          select: { id: true, name: true }
        });
        console.log('\n📋 Tables disponibles dans cet arbre:', JSON.stringify(allTables, null, 2));
      }
    } else {
      console.log('⚠️ Aucune référence de table trouvée pour GRD');
    }

    // Pour Prix Kwh: vérifier la condition
    const prixKwhDataConfig = prixKwhCapabilities?.datas?.[0]?.config;
    if (prixKwhDataConfig?.sourceRef) {
      const conditionId = prixKwhDataConfig.sourceRef.replace('condition:', '');
      console.log(`\n🔍 Recherche condition Prix Kwh: ${conditionId}`);
      
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId },
        select: {
          id: true,
          name: true,
          branches: true
        }
      });

      if (condition) {
        console.log('✅ Condition Prix Kwh trouvée:', JSON.stringify(condition, null, 2));
      } else {
        console.log('❌ Condition Prix Kwh INTROUVABLE!');
        
        // Chercher des conditions similaires
        const allConditions = await prisma.treeBranchLeafNodeCondition.findMany({
          where: { treeId: TREE_ID },
          select: { id: true, name: true }
        });
        console.log('\n📋 Conditions disponibles dans cet arbre:', JSON.stringify(allConditions, null, 2));
      }
    } else {
      console.log('⚠️ Aucune référence de condition trouvée pour Prix Kwh');
    }

    // 4. Vérifier les formules référencées
    console.log('\n\n🧮 4. VÉRIFICATION DES FORMULES\n');
    
    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { treeId: TREE_ID },
      select: {
        id: true,
        name: true,
        tokens: true
      }
    });

    console.log('📋 Formules disponibles:', JSON.stringify(allFormulas, null, 2));

    // 5. Résumé et recommandations
    console.log('\n\n📝 5. RÉSUMÉ ET RECOMMANDATIONS\n');
    
    const issues = [];
    
    if (!grdNode) {
      issues.push('❌ Le nœud GRD est introuvable!');
    } else if (!grdNode.hasData && !grdNode.hasFormula && !grdNode.hasCondition) {
      issues.push('⚠️ Le nœud GRD n\'a aucune capacité active (hasData, hasFormula, hasCondition sont tous false)');
    }
    
    if (!prixKwhNode) {
      issues.push('❌ Le nœud Prix Kwh est introuvable!');
    } else if (!prixKwhNode.hasData && !prixKwhNode.hasFormula && !prixKwhNode.hasCondition) {
      issues.push('⚠️ Le nœud Prix Kwh n\'a aucune capacité active');
    }
    
    if (grdCapabilities?.datas?.length === 0 || !grdCapabilities?.datas) {
      issues.push('⚠️ Aucune capacité configurée pour GRD dans metadata.capabilities.datas');
    }
    
    if (prixKwhCapabilities?.datas?.length === 0 || !prixKwhCapabilities?.datas) {
      issues.push('⚠️ Aucune capacité configurée pour Prix Kwh dans metadata.capabilities.datas');
    }

    if (issues.length > 0) {
      console.log('🚨 PROBLÈMES DÉTECTÉS:\n');
      issues.forEach(issue => console.log(issue));
      console.log('\n💡 SOLUTIONS POSSIBLES:\n');
      console.log('1. Vérifier que les capacités ont bien été créées dans TreeBranchLeafNodeCapability');
      console.log('2. Vérifier que les flags hasData/hasFormula/hasCondition sont à true sur les nœuds');
      console.log('3. Vérifier que les sources référencées (tables, conditions, formules) existent');
      console.log('4. Re-sauvegarder les capacités depuis l\'interface TBL');
    } else {
      console.log('✅ Aucun problème majeur détecté dans la configuration');
      console.log('Le problème pourrait venir du backend Operation Interpreter');
    }

  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
