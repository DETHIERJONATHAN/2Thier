/**
 * 🔍 Script de diagnostic pour l'erreur HTTP 500 sur duplicate-templates
 * Exécution: node diagnose-duplicate-error.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REPEATER_PARENT_ID = '59c7eb0e-229e-40fa-bf12-333a2cff5053';
const TEMPLATE_NODE_IDS = [
  'ad6fc72b-1757-4cc9-9d79-215cabf610e6',
  '962677c1-224e-4f1a-9837-88cbc2be2aad',
  'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3',
  '028f9ec3-1275-4e12-84a8-674bf4fc6b2c',
  '682ef657-4af8-45ac-8cd5-153a56a8bb74',
  '0b3ea6b0-99d5-4794-869f-0c017ce209ef',
  'f117b34a-d74c-413a-b7c1-4b9290619012',
  'fb35d781-5b1b-4a2b-869b-ea0b902a444e'
];

async function diagnose() {
  try {
    console.log('🔍 === DIAGNOSTIC DUPLICATE-TEMPLATES ===\n');

    // 1. Vérifier le nœud parent (repeater)
    console.log('1️⃣ Vérification du nœud parent repeater...');
    const parentNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: REPEATER_PARENT_ID },
      select: { id: true, label: true, type: true, treeId: true }
    });
    
    if (!parentNode) {
      console.log('❌ Nœud parent NON TROUVÉ!');
      return;
    }
    console.log('✅ Parent trouvé:', parentNode);
    console.log('   TreeId:', parentNode.treeId);

    // 2. Vérifier chaque template
    console.log('\n2️⃣ Vérification des templates...');
    for (const templateId of TEMPLATE_NODE_IDS) {
      const template = await prisma.treeBranchLeafNode.findUnique({
        where: { id: templateId },
        select: { 
          id: true, 
          label: true, 
          type: true, 
          treeId: true,
          table_activeId: true,
          linkedVariableIds: true,
          linkedTableIds: true
        }
      });
      
      if (!template) {
        console.log(`❌ Template ${templateId} NON TROUVÉ!`);
        continue;
      }
      
      console.log(`\n   📍 ${template.label} (${template.id.substring(0, 8)}...)`);
      console.log(`      Type: ${template.type}`);
      console.log(`      table_activeId: ${template.table_activeId || 'null'}`);
      console.log(`      linkedVariableIds: ${JSON.stringify(template.linkedVariableIds)}`);
      console.log(`      linkedTableIds: ${JSON.stringify(template.linkedTableIds)}`);
      
      // Vérifier selectConfig
      const selectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
        where: { nodeId: templateId }
      });
      
      if (selectConfig) {
        console.log(`      🎯 Has selectConfig (lookup):`);
        console.log(`         tableReference: ${selectConfig.tableReference}`);
        console.log(`         keyRow: ${selectConfig.keyRow}`);
        console.log(`         keyColumn: ${selectConfig.keyColumn}`);
      }
      
      // Si table_activeId, vérifier si la table existe
      if (template.table_activeId) {
        const table = await prisma.treeBranchLeafNodeTable.findUnique({
          where: { id: template.table_activeId },
          select: { id: true, name: true, nodeId: true }
        });
        
        if (table) {
          console.log(`      ✅ Table trouvée: ${table.name} (owner: ${table.nodeId})`);
        } else {
          console.log(`      ⚠️ table_activeId pointe vers une table INEXISTANTE!`);
        }
      }
    }

    // 3. Vérifier les copies existantes
    console.log('\n3️⃣ Vérification des copies existantes...');
    const existingCopies = await prisma.treeBranchLeafNode.findMany({
      where: { 
        parentId: REPEATER_PARENT_ID,
        metadata: { path: ['sourceTemplateId'], not: null }
      },
      select: { id: true, label: true, metadata: true }
    });
    
    console.log(`   ${existingCopies.length} copies existantes trouvées`);
    for (const copy of existingCopies) {
      const meta = copy.metadata;
      console.log(`   - ${copy.label} (source: ${meta?.sourceTemplateId})`);
    }

    // 4. Vérifier les variables liées
    console.log('\n4️⃣ Vérification des variables liées aux templates...');
    for (const templateId of TEMPLATE_NODE_IDS) {
      const template = await prisma.treeBranchLeafNode.findUnique({
        where: { id: templateId },
        select: { label: true, linkedVariableIds: true }
      });
      
      if (template?.linkedVariableIds?.length > 0) {
        console.log(`\n   📦 ${template.label} - ${template.linkedVariableIds.length} variable(s):`);
        
        for (const varId of template.linkedVariableIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: { id: true, name: true, ownerNodeId: true, displayNodeIds: true }
          });
          
          if (variable) {
            console.log(`      ✅ ${varId}: "${variable.name}" (owner: ${variable.ownerNodeId?.substring(0, 8)}...)`);
            console.log(`         displayNodeIds: ${JSON.stringify(variable.displayNodeIds)}`);
          } else {
            console.log(`      ⚠️ ${varId}: VARIABLE INEXISTANTE!`);
          }
        }
      }
    }

    // 5. Tester la copie d'un seul template (simulation)
    console.log('\n5️⃣ Test copie (simulation)...');
    const testTemplateId = TEMPLATE_NODE_IDS[0]; // Nom du versant
    const testTemplate = await prisma.treeBranchLeafNode.findUnique({
      where: { id: testTemplateId }
    });
    
    if (testTemplate) {
      const newId = `${testTemplateId}-TEST`;
      console.log(`   Tenterait de créer: ${newId}`);
      
      // Vérifier si ce ID existe déjà
      const exists = await prisma.treeBranchLeafNode.findUnique({
        where: { id: newId },
        select: { id: true }
      });
      
      if (exists) {
        console.log(`   ⚠️ Un nœud avec cet ID existe déjà!`);
      } else {
        console.log(`   ✅ ID disponible pour création`);
      }
    }

    console.log('\n✅ === DIAGNOSTIC TERMINÉ ===');

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
