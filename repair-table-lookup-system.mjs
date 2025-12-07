import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class TableLookupDuplicationService {
  
  /**
   * Duplique complètement les tables TBL et leurs configurations SELECT associées
   */
  async duplicateTableLookupSystem(originalNodeId, suffix = '-1') {
    console.log(`🗂️ [TableLookupDuplication] Duplication système table/lookup pour ${originalNodeId}${suffix}`);
    
    try {
      // 1. Récupérer les configurations SELECT du nœud original
      const originalSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { nodeId: originalNodeId }
      });
      
      if (originalSelectConfigs.length === 0) {
        console.log(`   ⏭️ Aucune configuration SELECT pour ${originalNodeId}`);
        return;
      }
      
      const copiedNodeId = originalNodeId + suffix;
      
      // 2. Pour chaque configuration SELECT, dupliquer la table TBL et créer la configuration
      for (const selectConfig of originalSelectConfigs) {
        await this.duplicateTableAndSelectConfig(selectConfig, copiedNodeId, suffix);
      }
      
      console.log(`✅ [TableLookupDuplication] Système complet dupliqué pour ${copiedNodeId}`);
      
    } catch (error) {
      console.error(`❌ [TableLookupDuplication] Erreur pour ${originalNodeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Duplique une table TBL et sa configuration SELECT associée
   */
  async duplicateTableAndSelectConfig(originalSelectConfig, copiedNodeId, suffix) {
    
    const originalTableId = originalSelectConfig.tableReference;
    const copiedTableId = originalTableId + suffix;
    
    try {
      // 1. Vérifier si la table originale existe
      const originalTable = await prisma.tBLMatrix.findUnique({
        where: { id: originalTableId }
      }).catch(() => null);
      
      if (!originalTable) {
        console.log(`   ⚠️ Table originale introuvable: ${originalTableId}`);
        return;
      }
      
      // 2. Dupliquer la table TBL (si elle n'existe pas déjà)
      const existingCopiedTable = await prisma.tBLMatrix.findUnique({
        where: { id: copiedTableId }
      }).catch(() => null);
      
      if (!existingCopiedTable) {
        console.log(`   📋 Duplication table: ${originalTable.name} -> ${originalTable.name}${suffix}`);
        
        await prisma.tBLMatrix.create({
          data: {
            id: copiedTableId,
            name: originalTable.name + suffix,
            type: originalTable.type,
            data: originalTable.data, // Copie des données JSON
            metadata: originalTable.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
            organizationId: originalTable.organizationId,
            sourceFile: originalTable.sourceFile,
            description: originalTable.description
          }
        });
        
        console.log(`   ✅ Table copiée créée: ${copiedTableId}`);
      } else {
        console.log(`   ♻️ Table copiée existe déjà: ${copiedTableId}`);
      }
      
      // 3. Créer la configuration SELECT pour le nœud copié
      const existingSelectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
        where: { 
          nodeId: copiedNodeId,
          tableReference: copiedTableId 
        }
      });
      
      if (!existingSelectConfig) {
        console.log(`   🔗 Création config SELECT pour ${copiedNodeId} -> ${copiedTableId}`);
        
        await prisma.treeBranchLeafSelectConfig.create({
          data: {
            nodeId: copiedNodeId,
            tableReference: copiedTableId,
            keyColumn: originalSelectConfig.keyColumn,
            keyRow: originalSelectConfig.keyRow,
            valueColumn: originalSelectConfig.valueColumn,
            valueRow: originalSelectConfig.valueRow,
            displayColumn: originalSelectConfig.displayColumn,
            displayRow: originalSelectConfig.displayRow,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`   ✅ Config SELECT créée pour ${copiedNodeId}`);
      } else {
        console.log(`   ♻️ Config SELECT existe déjà pour ${copiedNodeId}`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur duplication table/config ${originalTableId}:`, error);
      throw error;
    }
  }
  
  /**
   * Répare les configurations SELECT manquantes pour les nœuds copiés existants
   */
  async repairMissingSelectConfigs() {
    console.log(`🔧 [TableLookupDuplication] Réparation configurations SELECT manquantes`);
    
    try {
      // Trouver tous les nœuds copiés (avec suffix -1)
      const copiedNodes = await prisma.treeBranchLeafNode.findMany({
        where: {
          id: {
            endsWith: '-1'
          }
        }
      });
      
      console.log(`   📊 Trouvé ${copiedNodes.length} nœuds copiés à vérifier`);
      
      for (const copiedNode of copiedNodes) {
        const originalNodeId = copiedNode.id.replace('-1', '');
        
        // Vérifier si le nœud copié a des configurations SELECT
        const copiedSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
          where: { nodeId: copiedNode.id }
        });
        
        if (copiedSelectConfigs.length === 0) {
          console.log(`   🔧 Réparation nécessaire pour ${copiedNode.id}`);
          await this.duplicateTableLookupSystem(originalNodeId, '-1');
        }
      }
      
      console.log(`✅ [TableLookupDuplication] Réparation terminée`);
      
    } catch (error) {
      console.error(`❌ [TableLookupDuplication] Erreur réparation:`, error);
      throw error;
    }
  }
}

async function repairTableLookupSystem() {
  console.log('🔧 RÉPARATION SYSTÈME TABLE/LOOKUP POUR NŒUDS COPIÉS');
  console.log('===============================================================');
  
  const service = new TableLookupDuplicationService();
  
  try {
    // 1. Réparation automatique des configurations SELECT manquantes
    console.log('📋 Étape 1: Réparation configurations SELECT manquantes...');
    await service.repairMissingSelectConfigs();
    
    // 2. Vérification spécifique pour le nœud problématique
    console.log('\n📊 Étape 2: Vérification spécifique nœud Orientation-Inclinaison-1...');
    const problematicNodeId = '1203df47-e87e-42fd-b178-31afd89b9c83';
    const copiedNodeId = problematicNodeId + '-1';
    
    // Forcer la duplication pour ce nœud spécifique
    await service.duplicateTableLookupSystem(problematicNodeId, '-1');
    
    // 3. Vérification finale
    console.log('\n🔍 Étape 3: Vérification finale...');
    const finalSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: copiedNodeId }
    });
    
    if (finalSelectConfigs.length > 0) {
      console.log(`✅ SUCCESS: ${finalSelectConfigs.length} configurations SELECT créées pour ${copiedNodeId}`);
      finalSelectConfigs.forEach((config, i) => {
        console.log(`  Config ${i + 1}:`, {
          tableReference: config.tableReference,
          keyColumn: config.keyColumn
        });
      });
      
      // Vérifier que la table existe
      const copiedTableId = finalSelectConfigs[0].tableReference;
      const copiedTable = await prisma.tBLMatrix.findUnique({
        where: { id: copiedTableId }
      });
      
      if (copiedTable) {
        console.log(`✅ Table copiée confirmée: ${copiedTable.name}`);
      } else {
        console.log(`❌ ERREUR: Table copiée introuvable: ${copiedTableId}`);
      }
    } else {
      console.log(`❌ ÉCHEC: Aucune configuration SELECT créée pour ${copiedNodeId}`);
    }
    
    console.log('\n🎯 RÉSULTAT: Système de lookup réparé ! Les champs copiés devraient maintenant avoir leurs propres lookups.');
    console.log('   ➡️ RECHARGEZ LA PAGE et testez le lookup du champ "Orientation-Inclinaison-1"');
    
  } catch (error) {
    console.error('❌ ERREUR RÉPARATION:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairTableLookupSystem().catch(console.error);