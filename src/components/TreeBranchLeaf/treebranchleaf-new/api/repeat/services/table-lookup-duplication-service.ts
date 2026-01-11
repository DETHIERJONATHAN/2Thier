import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

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

    console.log(`[TBL-DUP] START duplicateTableLookupSystem: orig=${originalNodeId}, copy=${copiedNodeId}`);
    
    try {
      // 🔧 CRITICAL FIX: Vérifier que le node copié existe AVANT de créer les SelectConfigs
      // Si le node copié n'existe pas, on skip silencieusement (c'est une référence partagée)
      const copiedNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: copiedNodeId }
      });
      
      if (!copiedNode) {
        console.log(`[TBL-DUP] ⚠️ Copied node does not exist (shared reference): ${copiedNodeId}, skipping`);
        return;
      }
      
      console.log(`[TBL-DUP] ✅ Copied node exists: ${copiedNode.label}, proceeding...`);
      
      // 1. RÃƒÂ©cupÃƒÂ©rer les configurations SELECT du nÃ…â€œud original
      const originalSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { nodeId: originalNodeId }
      });
      
      console.log(`[TBL-DUP] Found ${originalSelectConfigs.length} SelectConfigs for node=${originalNodeId}`);
      
      if (originalSelectConfigs.length === 0) {
        console.log(`[TBL-DUP] No SelectConfigs, returning`);
        return;
      }
      
      // 2. Pour chaque configuration SELECT, dupliquer la table TBL et crÃƒÂ©er la configuration
      for (const selectConfig of originalSelectConfigs) {
        console.log(`[TBL-DUP] Processing SelectConfig id=${selectConfig.id} tableRef=${selectConfig.tableReference}`);
        await this.duplicateTableAndSelectConfig(prisma, selectConfig, copiedNodeId, suffixToken);
        console.log(`[TBL-DUP] ✅ Completed SelectConfig ${selectConfig.id}`);
      }
      
      console.log(`[TBL-DUP] ✅ SUCCESS duplicateTableLookupSystem`);
    } catch (error) {
      console.error(`[TBL-DUP] ERROR: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error) console.error(`[TBL-DUP] Stack: ${error.stack}`);
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
      
      // 🔧 FIX 06/01/2026: Déterminer le VRAI propriétaire de la table
      // Si la table appartient au nœud original, la copie appartient au nœud copié
      // Si la table appartient à un AUTRE nœud, la copie doit appartenir à la copie de cet autre nœud
      const originalNodeIdBase = normalizeNodeBase(originalSelectConfig.nodeId);
      const tableOwnerNodeIdBase = normalizeNodeBase(originalTable.nodeId);
      const isTableOwnedByThisNode = originalNodeIdBase === tableOwnerNodeIdBase;
      
      // Le nodeId de la table copiée doit être le propriétaire ORIGINAL suffixé
      const copiedTableOwnerNodeId = isTableOwnedByThisNode
        ? copiedNodeId  // La table appartient à ce nœud
        : `${tableOwnerNodeIdBase}${suffix}`;  // La table appartient à un autre nœud
            // 🔧 FIX 07/01/2026: Vérifier que le nodeId propriétaire existe, créer un stub si nécessaire
      let nodeOwnerExists = await prisma.treeBranchLeafNode.findUnique({
        where: { id: copiedTableOwnerNodeId },
        select: { id: true }
      });

      if (!nodeOwnerExists && !isTableOwnedByThisNode) {
        // C'est un node en linkedTableIds qui n'a pas été copié
        console.log(
          `[TBL-DUP] Creating stub node "${copiedTableOwnerNodeId}" for table owner`
        );
        const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: originalTable.nodeId },
          select: { 
            type: true,
            label: true,
            treeId: true,
            parentId: true
          }
        });

        if (originalOwnerNode) {
          try {
            const createdNode = await prisma.treeBranchLeafNode.create({
              data: {
                id: copiedTableOwnerNodeId,
                type: originalOwnerNode.type,
                label: originalOwnerNode.label ? `${originalOwnerNode.label}${suffix}` : 'Stub',
                treeId: originalOwnerNode.treeId,
                parentId: null,
                order: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            nodeOwnerExists = createdNode;
            console.log(`[TBL-DUP] ✅ Stub node created: ${copiedTableOwnerNodeId}`);
          } catch (err) {
            console.error(`[TBL-DUP] ❌ Failed to create stub node: ${err.message}`);
            throw err; // Propager l'erreur pour arrêter le processus
          }
        }
      }

      if (!nodeOwnerExists) {
        console.warn(
          `[TBL-DUP] Cannot duplicate table: owner node "${copiedTableOwnerNodeId}" doesn't exist`
        );
        return;
      }
            // 2. Dupliquer la table TBL (si elle n'existe pas déjà)
      const existingCopiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: copiedTableId }
      });
      
      if (!existingCopiedTable) {
        
        await prisma.treeBranchLeafNodeTable.create({
          data: {
            id: copiedTableId,
            nodeId: copiedTableOwnerNodeId,  // 🔧 FIX: Utiliser le vrai propriétaire,
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
            lookupSelectColumn: originalTable.lookupSelectColumn,            createdAt: new Date(),
            updatedAt: new Date(),            
            // Duplication des colonnes
            // Ã°Å¸â€Â¢ COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
            // ð ˆâ€  FIX 07/01/2026: RÃ©assigner les columnIndex en sÃ©quence (0, 1, 2, ...) pour prÃ©server l'ordre
            tableColumns: {
              create: originalTable.tableColumns.map((col, idx) => {
                const newName = idx === 0 ? `${col.name}${suffix}` : col.name;
                console.log(`[TBL-DUP] Column ${idx}: "${col.name}" -> "${newName}" (columnIndex: ${col.columnIndex} -> ${idx})`);
                return {
                  id: col.id ? `${col.id}${suffix}` : randomUUID(),
                  // ✅ FIX 11/01/2026: NE PAS inclure tableId dans nested create - Prisma le remplit automatiquement
                  columnIndex: idx,  // ✅ FIX: Réassigner en séquence au lieu de copier
                  name: newName,
                  type: col.type,
                  width: col.width,
                  format: col.format,
                  metadata: col.metadata
                };
              })
            },
            
            // Duplication des lignes
            // ✅ FIX 07/01/2026: Réassigner aussi les rowIndex en séquence pour préserver l'ordre
            tableRows: {
              create: originalTable.tableRows.map((row, idx) => ({
                id: row.id ? `${row.id}${suffix}` : randomUUID(),
                // ✅ FIX 11/01/2026: NE PAS inclure tableId dans nested create - Prisma le remplit automatiquement
                rowIndex: idx,  // ✅ FIX: Réassigner en séquence
                cells: row.cells
              }))
            }
          }
        });
        
      } else {
        // ⚠️ CRITICAL FIX: Si la table existe déjà, SUPPRIMER et RECRÉER les colonnes
        // pour s'assurer que le suffixe est correctement appliqué
        console.log(`[TBL-DUP] Table "${copiedTableId}" existe déjà, mise à jour des colonnes...`);
        
        // Supprimer les anciennes colonnes
        await prisma.treeBranchLeafNodeTableColumn.deleteMany({
          where: { tableId: copiedTableId }
        });
        
        // Créer les nouvelles colonnes avec le suffixe correct
        const newColumns = await Promise.all(
          originalTable.tableColumns.map((col, idx) => {
            const newName = idx === 0 ? `${col.name}${suffix}` : col.name;
            console.log(`[TBL-DUP] Update Column ${idx}: "${col.name}" -> "${newName}"`);
            return prisma.treeBranchLeafNodeTableColumn.create({
              data: {
                id: col.id ? `${col.id}${suffix}` : randomUUID(),
                tableId: copiedTableId,
                columnIndex: col.columnIndex,
                name: newName,
                type: col.type,
                width: col.width,
                format: col.format,
                metadata: col.metadata
              }
            });
          })
        );
        
        console.log(`[TBL-DUP] ✅ ${newColumns.length} colonnes créées avec suffixe`);
      }
      
      // 3. CrÃƒÂ©er la configuration SELECT pour le nÃ…â€œud copiÃƒÂ©
      // 🔧 CRITICAL: La clé unique de SelectConfig est JUSTE 'nodeId'
      // Ne pas faire de findFirst avec tableReference - chercher UNIQUEMENT par nodeId
      const existingSelectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
        where: { nodeId: copiedNodeId }
      });
      
      if (!existingSelectConfig) {
        // 🔧 CRITICAL FIX: Générer l'id car il n'y a pas @default(uuid())
        // 🔥 IMPORTANT: Suffixer aussi les keyColumn/keyRow/valueColumn pour pointer vers les colonnes/lignes suffixées!
        // 🔥 FIX 07/01/2026: shouldSuffixColumns DOIT ÊTRE TOUJOURS TRUE pour les SelectConfigs
        // Parce que la PREMIÈRE COLONNE de la table copiée s'appelle maintenant "Orientation-1" pas "Orientation"
        const shouldSuffixColumns = true; // TOUJOURS suffixer les références pour la table copiée
        const suffix = computedLabelSuffix;
        
        await prisma.treeBranchLeafSelectConfig.create({
          data: {
            id: randomUUID(),  // 🔧 FIX: Générer l'id manuellement
            nodeId: copiedNodeId,
            tableReference: copiedTableId,
            // 🔥 SUFFIXER les références de colonnes/lignes si elles pointent vers la première colonne/ligne
            keyColumn: originalSelectConfig.keyColumn 
              ? `${originalSelectConfig.keyColumn}${suffix}` 
              : null,
            keyRow: originalSelectConfig.keyRow 
              ? `${originalSelectConfig.keyRow}${suffix}` 
              : null,
            valueColumn: originalSelectConfig.valueColumn
              ? `${originalSelectConfig.valueColumn}${suffix}` 
              : null,
            valueRow: originalSelectConfig.valueRow
              ? `${originalSelectConfig.valueRow}${suffix}` 
              : null,
            displayColumn: originalSelectConfig.displayColumn
              ? `${originalSelectConfig.displayColumn}${suffix}` 
              : null,
            displayRow: originalSelectConfig.displayRow
              ? `${originalSelectConfig.displayRow}${suffix}` 
              : null,
            // 🔧 FIX 07/01/2026: Copier TOUS les autres champs du SelectConfig original
            options: originalSelectConfig.options,
            multiple: originalSelectConfig.multiple,
            searchable: originalSelectConfig.searchable,
            allowCustom: originalSelectConfig.allowCustom,
            maxSelections: originalSelectConfig.maxSelections,
            optionsSource: originalSelectConfig.optionsSource,
            apiEndpoint: originalSelectConfig.apiEndpoint,
            // 🔥 CRITICAL: Suffixer dependsOnNodeId s'il existe (référence à un autre nœud)
            dependsOnNodeId: originalSelectConfig.dependsOnNodeId
              ? `${originalSelectConfig.dependsOnNodeId}${suffix}`
              : null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        
        // 🔧 FIX: Mise à jour du nœud - SEULEMENT si c'est le VRAI propriétaire
        // 🔥 CRITICAL FIX 08/01/2026: Ne PAS ajouter linkedTableIds pour les INPUT fields (fieldType = null)
        try {
          const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: copiedNodeId }, select: { capabilities: true, linkedTableIds: true, fieldType: true } });
          const currentCapabilities = (node?.capabilities && typeof node.capabilities === 'object') ? (node.capabilities as Record<string, any>) : {};
          
          // 🔥 CRITICAL: Vérifier le fieldType - ne PAS lier les tables aux INPUT fields
          const isInputField = node?.fieldType === null || node?.fieldType === '' || node?.fieldType === undefined;
          
          const currentLinked = node?.linkedTableIds || [];
          // 🔥 ONLY add linkedTableIds if this is NOT an INPUT field
          const newLinked = isInputField ? [] : Array.from(new Set([...currentLinked, copiedTableId]));

          if (isTableOwnedByThisNode) {
            // ✅ Ce nœud est le VRAI propriétaire de la table
            currentCapabilities.table = currentCapabilities.table || {};
            currentCapabilities.table.enabled = true;
            currentCapabilities.table.activeId = copiedTableId;
            currentCapabilities.table.instances = currentCapabilities.table.instances || {};
            currentCapabilities.table.instances[copiedTableId] = currentCapabilities.table.instances[copiedTableId] || {};

            await prisma.treeBranchLeafNode.update({
              where: { id: copiedNodeId },
              data: {
                hasTable: true,  // ✅ Seulement le propriétaire a hasTable: true
                table_activeId: copiedTableId,
                table_instances: { set: currentCapabilities.table.instances },
                table_name: originalTable.name + suffix,
                table_type: originalTable.type,
                capabilities: currentCapabilities,
                linkedTableIds: { set: newLinked }
              }
            });
          } else {
            // 🔧 FIX: Ce nœud utilise JUSTE la table, il ne la possède pas
            // Il doit RESTER hasTable: false car il n'a pas de SelectConfig propre
            // 🔥 CRITICAL: N'ajouter linkedTableIds QUE si ce n'est pas un INPUT field
            await prisma.treeBranchLeafNode.update({
              where: { id: copiedNodeId },
              data: {
                hasTable: false,  // ✅ IMPORTANT: Les non-propriétaires NE doivent PAS avoir hasTable: true!
                linkedTableIds: { set: newLinked }
              }
            });
          }
        } catch (nodeUpdateErr) {
          console.warn(`   ⚠️ Warning updating node ${copiedNodeId} capabilities:`, (nodeUpdateErr as Error).message);
        }
      } else {
      }
      
    } catch (error) {
      console.error(`❌ Erreur duplication table/config ${originalTableId}:`, error);
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
