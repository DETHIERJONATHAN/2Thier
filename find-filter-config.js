import { PrismaClient } from '@prisma/client';

async function findFilterConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Recherche des configurations de filtrage...');
    
    // Chercher dans les méta-données des tables les filtres qui utilisent l'ancien ID
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup'],
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        nodeId: true,
        meta: true
      }
    });
    
    console.log(`📊 Trouvé ${tables.length} tables avec méta lookup`);
    
    for (const table of tables) {
      const lookup = table.meta?.lookup;
      if (!lookup) continue;
      
      // Vérifier columnSourceOption.filters
      if (lookup.columnSourceOption?.filters) {
        for (const filter of lookup.columnSourceOption.filters) {
          if (filter.valueRef && filter.valueRef.includes('ef7e5ced-077c-441c0-9b5c-1757a36e3804')) {
            console.log('🎯 TROUVÉ dans columnSourceOption.filters:', {
              tableId: table.id,
              tableName: table.name,
              nodeId: table.nodeId,
              filter: filter
            });
          }
        }
      }
      
      // Vérifier rowSourceOption.filters  
      if (lookup.rowSourceOption?.filters) {
        for (const filter of lookup.rowSourceOption.filters) {
          if (filter.valueRef && filter.valueRef.includes('ef7e5ced-077c-441c0-9b5c-1757a36e3804')) {
            console.log('🎯 TROUVÉ dans rowSourceOption.filters:', {
              tableId: table.id,
              tableName: table.name,
              nodeId: table.nodeId,
              filter: filter
            });
          }
        }
      }
      
      // Vérifier les filtres simples (ancien format)
      if (lookup.columnSourceOption?.filterValueRef?.includes('ef7e5ced-077c-441c0-9b5c-1757a36e3804')) {
        console.log('🎯 TROUVÉ dans columnSourceOption (ancien format):', {
          tableId: table.id,
          tableName: table.name,
          nodeId: table.nodeId,
          filterConfig: lookup.columnSourceOption
        });
      }
      
      if (lookup.rowSourceOption?.filterValueRef?.includes('ef7e5ced-077c-441c0-9b5c-1757a36e3804')) {
        console.log('🎯 TROUVÉ dans rowSourceOption (ancien format):', {
          tableId: table.id,
          tableName: table.name,
          nodeId: table.nodeId,
          filterConfig: lookup.rowSourceOption
        });
      }
    }
    
    // Chercher dans TOUTES les tables pour voir leur contenu
    console.log('\n🔍 Affichage de TOUTES les configurations de lookup...');
    for (const table of tables) {
      const lookup = table.meta?.lookup;
      if (lookup) {
        console.log(`\n📋 Table: ${table.name} (${table.id})`);
        console.log('  columnSourceOption:', JSON.stringify(lookup.columnSourceOption, null, 2));
        console.log('  rowSourceOption:', JSON.stringify(lookup.rowSourceOption, null, 2));
      }
    }
    
    // Recherche plus globale dans la base
    console.log('\n🔍 Recherche globale de l\'ID problématique...');
    
    // Rechercher dans les select configs
    const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      select: {
        id: true,
        nodeId: true,
        dependsOnNodeId: true,
        tableReference: true,
        TreeBranchLeafNode: {
          select: { label: true }
        }
      }
    });
    
    console.log(`\n📊 Configurations SELECT trouvées: ${selectConfigs.length}`);
    for (const config of selectConfigs) {
      if (config.dependsOnNodeId === 'ef7e5ced-077c-441c0-9b5c-1757a36e3804') {
        console.log('🎯 TROUVÉ dans SelectConfig.dependsOnNodeId:', config);
      }
    }
    
    // Rechercher dans les conditions
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: {
        conditionSet: {
          path: [],
          string_contains: 'ef7e5ced-077c-441c0-9b5c-1757a36e3804'
        }
      },
      select: {
        id: true,
        nodeId: true,
        conditionSet: true,
        TreeBranchLeafNode: {
          select: { label: true }
        }
      }
    });
    
    if (conditions.length > 0) {
      console.log('🎯 TROUVÉ dans conditions:', conditions);
    }
    
    // Lister aussi les formValues actuels pour référence
    console.log('\n📋 IDs disponibles dans les logs formValues:');
    const availableIds = [
      'b3e7bee7-036b-42f3-87c2-85fdcbc27228', // onduleur - SMA Sunny Boy 1.5
      '49e03a8e-73a5-415f-a6d6-6835829f4dfc', // valeur: "15"
      'c879d072-6f89-4f3c-87f9-1d7bb2bc5100', // panneau - JINKO 440 FB
      'adbf2827-d5d7-4ef1-9b38-67f76e9129a6', // valeur: "0"
      '54adf56b-ee04-44bf-be20-9636be4383d6', // valeur: "86"
      '9c9f42b2-e0df-4726-8a81-997c0dee71bc', // valeur: "0"
      '23095c52-eb1e-47bc-acd9-8cddf4b4f7f7', // valeur: "6600"
      '73410ad6-6a1e-4d7e-8dd0-ff97bbf7d2c8', // valeur: "0"
      '890fd813-170c-4674-99db-fb8d560af40e', // valeur: "R1 - X6"
      '8f179353-dfc4-4809-83b4-ce3225ea4e0e'  // valeur: "ORES (Namur)"
    ];
    
    for (const id of availableIds) {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id },
        select: { id: true, label: true, type: true }
      });
      if (node) {
        console.log(`  ✅ ${id} -> ${node.label} (${node.type})`);
      } else {
        console.log(`  ❌ ${id} -> NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findFilterConfig();