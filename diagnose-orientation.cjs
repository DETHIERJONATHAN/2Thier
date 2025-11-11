// Diagnostic complet pour "Orientation - inclinaison"

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 DIAGNOSTIC COMPLET: Orientation - inclinaison\n');
  
  try {
    // 1. Trouver le nœud
    const orientationNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { contains: 'Orientation - inclinaison', mode: 'insensitive' }
      }
    });
    
    if (!orientationNode) {
      console.log('❌ ERREUR: Nœud "Orientation - inclinaison" non trouvé');
      return;
    }
    
    console.log(`✅ NŒUD TROUVÉ: ${orientationNode.label}`);
    console.log(`   ID: ${orientationNode.id}`);
    console.log(`   Type: ${orientationNode.type}`);
    console.log(`   hasTable: ${orientationNode.hasTable}`);
    console.log();
    
    // 2. Vérifier table_activeId
    console.log(`📊 CONFIGURATION TABLE:`);
    console.log(`   table_activeId: ${orientationNode.table_activeId || '❌ NULL'}`);
    console.log(`   table_name: ${orientationNode.table_name || '⚠️ NULL'}`);
    console.log(`   table_instances: ${orientationNode.table_instances ? '✅ Présent' : '❌ NULL'}`);
    console.log(`   linkedTableIds: ${JSON.stringify(orientationNode.linkedTableIds)}`);
    console.log();
    
    // 3. Si table_activeId existe, vérifier la table
    if (orientationNode.table_activeId) {
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: orientationNode.table_activeId },
        include: {
          tableColumns: { take: 5 },
          tableRows: { take: 3 }
        }
      });
      
      if (table) {
        console.log(`✅ TABLE TROUVÉE:`);
        console.log(`   ID: ${table.id}`);
        console.log(`   Name: ${table.name}`);
        console.log(`   Type: ${table.type}`);
        console.log(`   Colonnes: ${table.columns?.length || 0}`);
        console.log(`   Lignes: ${table.rows?.length || 0}`);
        console.log();
        
        // Afficher les colonnes
        if (table.columns && table.columns.length > 0) {
          console.log(`📋 COLONNES:`);
          table.columns.forEach(col => {
            console.log(`   - ${col.label} (${col.type})`);
          });
          console.log();
        }
        
        // Afficher quelques lignes
        if (table.rows && table.rows.length > 0) {
          console.log(`📝 EXEMPLE DE LIGNES:`);
          table.rows.forEach((row, i) => {
            console.log(`   Ligne ${i + 1}:`, row.data || '❌ Pas de data');
          });
          console.log();
        }
      } else {
        console.log(`❌ TABLE INEXISTANTE: ${orientationNode.table_activeId}`);
        console.log();
      }
    }
    
    // 4. Vérifier les linkedVariableIds
    console.log(`🔗 VARIABLES LIÉES:`);
    console.log(`   linkedVariableIds: ${JSON.stringify(orientationNode.linkedVariableIds)}`);
    
    if (orientationNode.linkedVariableIds && orientationNode.linkedVariableIds.length > 0) {
      for (const varId of orientationNode.linkedVariableIds) {
        const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId }
        });
        if (variable) {
          console.log(`   ✅ ${variable.displayName} (${variable.exposedKey})`);
        } else {
          console.log(`   ❌ Variable supprimée: ${varId}`);
        }
      }
    }
    console.log();
    
    // 5. Diagnostic
    console.log(`🎯 DIAGNOSTIC:`);
    if (!orientationNode.table_activeId) {
      console.log(`   ❌ PROBLÈME: Pas de table associée (table_activeId vide)`);
    } else if (!table) {
      console.log(`   ❌ PROBLÈME: La table liée a été supprimée`);
    } else {
      console.log(`   ✅ Configuration table semble OK`);
    }
    
    if (!orientationNode.linkedVariableIds || orientationNode.linkedVariableIds.length === 0) {
      console.log(`   ⚠️ ATTENTION: Pas de variables liées - le champ ne peut pas afficher les données`);
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
