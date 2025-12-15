import type { PrismaClient } from '@prisma/client';

type DuplicateLookupOptions = {
  copiedNodeId: string;
  suffixToken?: string;
};

export class TableLookupDuplicationService {
  
  /**
   * Duplique complètement les tables TBL et leurs configurations SELECT associées
   * Assure l'indépendance totale des lookups pour les nœuds copiés
   */
  async duplicateTableLookupSystem(
    prisma: PrismaClient,
    originalNodeId: string,
    arg?: string | DuplicateLookupOptions
  ): Promise<void> {
    let suffixToken = typeof arg === 'string' ? arg : arg?.suffixToken ?? '-1';
    if (!suffixToken) suffixToken = '-1';
    if (!suffixToken.startsWith('-')) {
      suffixToken = `-${suffixToken}`;
    }

    const normalizedOriginalId = normalizeNodeBase(originalNodeId);
    const copiedNodeId = typeof arg === 'object' && arg?.copiedNodeId
      ? arg.copiedNodeId
      : `${normalizedOriginalId}${suffixToken}`;

    console.log(`🗂️ [TableLookupDuplication] Duplication système table/lookup pour ${originalNodeId} -> ${copiedNodeId}`);
    
    try {
      // 1. Récupérer les configurations SELECT du nœud original
      const originalSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { nodeId: originalNodeId }
      });
      
      if (originalSelectConfigs.length === 0) {
        console.log(`   ⏭️ Aucune configuration SELECT pour ${originalNodeId}`);
        return;
      }
      
      // 2. Pour chaque configuration SELECT, dupliquer la table TBL et créer la configuration
      for (const selectConfig of originalSelectConfigs) {
        await this.duplicateTableAndSelectConfig(prisma, selectConfig, copiedNodeId, suffixToken);
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
  private async duplicateTableAndSelectConfig(
    prisma: PrismaClient,
    originalSelectConfig: any, 
    copiedNodeId: string, 
    suffix: string
  ): Promise<void> {
    
    const originalTableId = originalSelectConfig.tableReference;
    const copiedTableId = `${originalTableId}${suffix}`;
    
    try {
      // 1. Vérifier si la table originale existe
      const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: originalTableId },
        include: {
          tableColumns: true,
          tableRows: true
        }
      });
      
      if (!originalTable) {
        console.log(`   ⚠️ Table originale introuvable: ${originalTableId}`);
        return;
      }
      
      // 2. Dupliquer la table TBL (si elle n'existe pas déjà)
      const existingCopiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: copiedTableId }
      });
      
      if (!existingCopiedTable) {
        console.log(`   📋 Duplication table: ${originalTable.name} -> ${originalTable.name}${suffix}`);
        
        await prisma.treeBranchLeafNodeTable.create({
          data: {
            id: copiedTableId,
            nodeId: copiedNodeId,
            name: originalTable.name + suffix,
            type: originalTable.type,
            description: originalTable.description,
            // 🔢 COPIE TABLE META: suffixer UUIDs et comparisonColumn
            meta: (() => {
              if (!originalTable.meta) return originalTable.meta;
              try {
                const metaObj = typeof originalTable.meta === 'string' ? JSON.parse(originalTable.meta) : JSON.parse(JSON.stringify(originalTable.meta));
                const suffixNum = parseInt(suffix.replace('-', '')) || 1;
                // Suffixer les UUIDs dans selectors
                if (metaObj?.lookup?.selectors?.columnFieldId && !metaObj.lookup.selectors.columnFieldId.endsWith(`-${suffixNum}`)) {
                  metaObj.lookup.selectors.columnFieldId = `${metaObj.lookup.selectors.columnFieldId}-${suffixNum}`;
                }
                if (metaObj?.lookup?.selectors?.rowFieldId && !metaObj.lookup.selectors.rowFieldId.endsWith(`-${suffixNum}`)) {
                  metaObj.lookup.selectors.rowFieldId = `${metaObj.lookup.selectors.rowFieldId}-${suffixNum}`;
                }
                // Suffixer sourceField
                if (metaObj?.lookup?.rowSourceOption?.sourceField && !metaObj.lookup.rowSourceOption.sourceField.endsWith(`-${suffixNum}`)) {
                  metaObj.lookup.rowSourceOption.sourceField = `${metaObj.lookup.rowSourceOption.sourceField}-${suffixNum}`;
                }
                if (metaObj?.lookup?.columnSourceOption?.sourceField && !metaObj.lookup.columnSourceOption.sourceField.endsWith(`-${suffixNum}`)) {
                  metaObj.lookup.columnSourceOption.sourceField = `${metaObj.lookup.columnSourceOption.sourceField}-${suffixNum}`;
                }
                // Suffixer comparisonColumn si c'est du texte
                if (metaObj?.lookup?.rowSourceOption?.comparisonColumn) {
                  const val = metaObj.lookup.rowSourceOption.comparisonColumn;
                  if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                    metaObj.lookup.rowSourceOption.comparisonColumn = `${val}${suffix}`;
                  }
                }
                if (metaObj?.lookup?.columnSourceOption?.comparisonColumn) {
                  const val = metaObj.lookup.columnSourceOption.comparisonColumn;
                  if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                    metaObj.lookup.columnSourceOption.comparisonColumn = `${val}${suffix}`;
                  }
                }
                return metaObj;
              } catch {
                return originalTable.meta;
              }
            })(),
            organizationId: originalTable.organizationId,
            rowCount: originalTable.rowCount,
            columnCount: originalTable.columnCount,
            lookupDisplayColumns: originalTable.lookupDisplayColumns,
            lookupSelectColumn: originalTable.lookupSelectColumn,
            
            // Duplication des colonnes
            // 🔢 COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
            tableColumns: {
              create: originalTable.tableColumns.map(col => ({
                columnIndex: col.columnIndex,
                name: col.name 
                  ? (/^-?\d+(\.\d+)?$/.test(col.name.trim()) ? col.name : `${col.name}${suffix}`)
                  : col.name,
                type: col.type,
                width: col.width,
                format: col.format,
                metadata: col.metadata
              }))
            },
            
            // Duplication des lignes
            tableRows: {
              create: originalTable.tableRows.map(row => ({
                rowIndex: row.rowIndex,
                cells: row.cells
              }))
            }
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
        
        // 🔧 Mise à jour du nœud copié pour activer les capacités table
        try {
          const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: copiedNodeId }, select: { capabilities: true, linkedTableIds: true } });
          const currentCapabilities = (node?.capabilities && typeof node.capabilities === 'object') ? (node.capabilities as Record<string, any>) : {};
          currentCapabilities.table = currentCapabilities.table || {};
          currentCapabilities.table.enabled = true;
          currentCapabilities.table.activeId = copiedTableId;
          currentCapabilities.table.instances = currentCapabilities.table.instances || {};
          currentCapabilities.table.instances[copiedTableId] = currentCapabilities.table.instances[copiedTableId] || {};

          const currentLinked = node?.linkedTableIds || [];
          const newLinked = Array.from(new Set([...currentLinked, copiedTableId]));

          await prisma.treeBranchLeafNode.update({
            where: { id: copiedNodeId },
            data: {
              hasTable: true,
              table_activeId: copiedTableId,
              table_instances: { set: currentCapabilities.table.instances },
              table_name: originalTable.name + suffix,
              table_type: originalTable.type,
              capabilities: currentCapabilities,
              linkedTableIds: { set: newLinked }
            }
          });
          console.log(`   ✅ Node ${copiedNodeId} updated: hasTable=true and capabilities.table.enabled=true`);
        } catch (nodeUpdateErr) {
          console.warn(`   ⚠️ Warning updating node ${copiedNodeId} capabilities:`, (nodeUpdateErr as Error).message);
        }
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
  async repairMissingSelectConfigs(prisma: PrismaClient): Promise<void> {
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
          await this.duplicateTableLookupSystem(prisma, originalNodeId, {
            copiedNodeId: copiedNode.id,
            suffixToken: '-1'
          });
        }
      }
      
      console.log(`✅ [TableLookupDuplication] Réparation terminée`);
      
    } catch (error) {
      console.error(`❌ [TableLookupDuplication] Erreur réparation:`, error);
      throw error;
    }
  }
}

export const tableLookupDuplicationService = new TableLookupDuplicationService();

function normalizeNodeBase(value: string): string {
  return value.replace(/-\d+(?:-\d+)*$/, '');
}