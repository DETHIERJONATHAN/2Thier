import type { PrismaClient } from '@prisma/client';

type DuplicateLookupOptions = {
  copiedNodeId: string;
  suffixToken?: string;
};

export class TableLookupDuplicationService {
  
  /**
   * Duplique complÃƒÂ¨tement les tables TBL et leurs configurations SELECT associÃƒÂ©es
   * Assure l'indÃƒÂ©pendance totale des lookups pour les nÃ…â€œuds copiÃƒÂ©s
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

    
    try {
      // 1. RÃƒÂ©cupÃƒÂ©rer les configurations SELECT du nÃ…â€œud original
      const originalSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { nodeId: originalNodeId }
      });
      
      if (originalSelectConfigs.length === 0) {
        return;
      }
      
      // 2. Pour chaque configuration SELECT, dupliquer la table TBL et crÃƒÂ©er la configuration
      for (const selectConfig of originalSelectConfigs) {
        await this.duplicateTableAndSelectConfig(prisma, selectConfig, copiedNodeId, suffixToken);
      }
      
      
    } catch (error) {
      console.error(`Ã¢ÂÅ’ [TableLookupDuplication] Erreur pour ${originalNodeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Duplique une table TBL et sa configuration SELECT associÃƒÂ©e
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
      // 1. VÃƒÂ©rifier si la table originale existe
      const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: originalTableId },
        include: {
          tableColumns: true,
          tableRows: true
        }
      });
      
      if (!originalTable) {
        return;
      }
      
      // 2. Dupliquer la table TBL (si elle n'existe pas dÃƒÂ©jÃƒÂ )
      const existingCopiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: copiedTableId }
      });
      
      if (!existingCopiedTable) {
        
        await prisma.treeBranchLeafNodeTable.create({
          data: {
            id: copiedTableId,
            nodeId: copiedNodeId,
            name: originalTable.name + suffix,
            type: originalTable.type,
            description: originalTable.description,
            // Ã°Å¸â€Â¢ COPIE TABLE META: suffixer UUIDs et comparisonColumn
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
                // Ã°Å¸â€Â¥ FIX: Suffixer displayColumn (peut ÃƒÂªtre string ou array)
                if (metaObj?.lookup?.displayColumn) {
                  if (Array.isArray(metaObj.lookup.displayColumn)) {
                    metaObj.lookup.displayColumn = metaObj.lookup.displayColumn.map((col: string) => {
                      if (col && !/^-?\d+(\.\d+)?$/.test(col.trim()) && !col.endsWith(suffix)) {
                        return `${col}${suffix}`;
                      }
                      return col;
                    });
                  } else if (typeof metaObj.lookup.displayColumn === 'string') {
                    const val = metaObj.lookup.displayColumn;
                    if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                      metaObj.lookup.displayColumn = `${val}${suffix}`;
                    }
                  }
                }
                // Ã°Å¸â€Â¥ FIX: Suffixer displayRow (peut ÃƒÂªtre string ou array)
                if (metaObj?.lookup?.displayRow) {
                  if (Array.isArray(metaObj.lookup.displayRow)) {
                    metaObj.lookup.displayRow = metaObj.lookup.displayRow.map((row: string) => {
                      if (row && !/^-?\d+(\.\d+)?$/.test(row.trim()) && !row.endsWith(suffix)) {
                        return `${row}${suffix}`;
                      }
                      return row;
                    });
                  } else if (typeof metaObj.lookup.displayRow === 'string') {
                    const val = metaObj.lookup.displayRow;
                    if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                      metaObj.lookup.displayRow = `${val}${suffix}`;
                    }
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
            // Ã°Å¸â€Â¢ COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
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
        
      } else {
      }
      
      // 3. CrÃƒÂ©er la configuration SELECT pour le nÃ…â€œud copiÃƒÂ©
      const existingSelectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
        where: { 
          nodeId: copiedNodeId,
          tableReference: copiedTableId 
        }
      });
      
      if (!existingSelectConfig) {
        
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
        
        
        // Ã°Å¸â€Â§ Mise ÃƒÂ  jour du nÃ…â€œud copiÃƒÂ© pour activer les capacitÃƒÂ©s table
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
        } catch (nodeUpdateErr) {
          console.warn(`   Ã¢Å¡Â Ã¯Â¸Â Warning updating node ${copiedNodeId} capabilities:`, (nodeUpdateErr as Error).message);
        }
      } else {
      }
      
    } catch (error) {
      console.error(`Ã¢ÂÅ’ Erreur duplication table/config ${originalTableId}:`, error);
      throw error;
    }
  }
  
  /**
   * RÃƒÂ©pare les configurations SELECT manquantes pour les nÃ…â€œuds copiÃƒÂ©s existants
   */
  async repairMissingSelectConfigs(prisma: PrismaClient): Promise<void> {
    
    try {
      // Trouver tous les nÃ…â€œuds copiÃƒÂ©s (avec suffix -1)
      const copiedNodes = await prisma.treeBranchLeafNode.findMany({
        where: {
          id: {
            endsWith: '-1'
          }
        }
      });
      
      
      for (const copiedNode of copiedNodes) {
        const originalNodeId = copiedNode.id.replace('-1', '');
        
        // VÃƒÂ©rifier si le nÃ…â€œud copiÃƒÂ© a des configurations SELECT
        const copiedSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
          where: { nodeId: copiedNode.id }
        });
        
        if (copiedSelectConfigs.length === 0) {
          await this.duplicateTableLookupSystem(prisma, originalNodeId, {
            copiedNodeId: copiedNode.id,
            suffixToken: '-1'
          });
        }
      }
      
      
    } catch (error) {
      console.error(`Ã¢ÂÅ’ [TableLookupDuplication] Erreur rÃƒÂ©paration:`, error);
      throw error;
    }
  }
}

export const tableLookupDuplicationService = new TableLookupDuplicationService();

function normalizeNodeBase(value: string): string {
  return value.replace(/-\d+(?:-\d+)*$/, '');
}
