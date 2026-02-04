/**
 * 🛡️ HOOK DE SYNCHRONISATION AUTOMATIQUE - AVEC PROTECTION
 * 
 * Synchronise TreeBranchLeafNodeVariable.sourceRef avec data_instances.metadata.sourceRef
 * 
 * Se lance automatiquement au demarrage du serveur
 * Corrige les desynchronisations sans casser ce qui fonctionne deja
 * 
 * ⚠️ PROTECTION CRITIQUE: Valide que les references existent AVANT d'ecraser
 * Evite les corruptions quand data_instances contient une reference vers une copie supprimee
 */

import { db } from '../../../../lib/database';

const prisma = db;

interface DataInstanceMetadata {
  sourceRef?: string;
  sourceType?: string;
  [key: string]: unknown;
}

interface DataInstance {
  id: string;
  metadata?: DataInstanceMetadata;
  [key: string]: unknown;
}

/**
 * 🛡️ Valide qu'une reference source existe reellement en base de donnees
 * Evite d'ecraser une variable fonctionnelle avec une reference vers une entite supprimee
 */
async function validateSourceRefExists(sourceRef: string): Promise<boolean> {
  if (!sourceRef) return false;
  
  try {
    // @table.UUID - Verifier que la table existe
    if (sourceRef.startsWith('@table.')) {
      const tableId = sourceRef.replace('@table.', '');
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        select: { id: true }
      });
      return !!table;
    }
    
    // node-formula:UUID - Verifier que la formule existe
    if (sourceRef.startsWith('node-formula:')) {
      const formulaId = sourceRef.replace('node-formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId },
        select: { id: true }
      });
      return !!formula;
    }
    
    // node-condition:UUID - Verifier que la condition existe
    if (sourceRef.startsWith('node-condition:')) {
      const conditionId = sourceRef.replace('node-condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId },
        select: { id: true }
      });
      return !!condition;
    }
    
    // @value. references - toujours valides (valeurs statiques)
    if (sourceRef.startsWith('@value.')) {
      return true;
    }
    
    // Autres formats - consideres valides par defaut
    return true;
  } catch (error) {
    console.warn(`[SYNC HOOK] ⚠️ Erreur validation sourceRef "${sourceRef}":`, error);
    return false;
  }
}

export async function syncVariableSourceRefs() {
  try {

    // Recuperer tous les nodes avec data_instances
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        data_instances: { not: null }
      },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });

    let syncCount = 0;
    let skipCount = 0;
    let blockedCount = 0;

    for (const node of nodes) {
      if (!node.data_instances) continue;

      const dataInstances = node.data_instances as Record<string, DataInstance>;
      const firstInstanceKey = Object.keys(dataInstances)[0];
      if (!firstInstanceKey) continue;

      const firstInstance = dataInstances[firstInstanceKey];
      if (!firstInstance?.metadata?.sourceRef) continue;

      const jsonSourceRef = firstInstance.metadata.sourceRef;

      // Si pas de variable en DB, skip (sera creee plus tard)
      if (!node.TreeBranchLeafNodeVariable) {
        continue;
      }

      const dbSourceRef = node.TreeBranchLeafNodeVariable.sourceRef;

      // ⚠️ PROTECTION: Ne pas ecraser les references @table. et @value.
      if (dbSourceRef && (dbSourceRef.startsWith('@table.') || dbSourceRef.startsWith('@value.'))) {
        // Verifier que le JSON ne dit pas autre chose
        if (jsonSourceRef.startsWith('node-formula:')) {
          // Le JSON dit formula mais la DB dit table/value
          // C'est probablement une erreur de sync precedente
          // On GARDE la DB (table/value) car c'est ce qui fonctionne
          skipCount++;
          continue;
        }
      }

      // Si deja synchronise, skip
      if (jsonSourceRef === dbSourceRef) {
        continue;
      }

      // 🛡️ PROTECTION CRITIQUE: Valider que la nouvelle reference existe AVANT d'ecraser
      // Evite les corruptions quand data_instances contient une reference vers une copie supprimee
      const newRefExists = await validateSourceRefExists(jsonSourceRef);
      if (!newRefExists) {
        // La reference dans data_instances pointe vers une entite inexistante (probablement supprimee)
        // NE PAS ecraser la variable actuelle !
        console.warn(`[SYNC HOOK] 🛡️ BLOQUE: Variable ${node.TreeBranchLeafNodeVariable.id} - ` +
          `sourceRef "${jsonSourceRef}" pointe vers une entite inexistante. ` +
          `Conservation de "${dbSourceRef || 'null'}"`);
        blockedCount++;
        continue;
      }

      // ✅ SYNCHRONISER (la nouvelle reference a ete validee)
      await prisma.treeBranchLeafNodeVariable.update({
        where: { id: node.TreeBranchLeafNodeVariable.id },
        data: { sourceRef: jsonSourceRef }
      });

      syncCount++;
    }

    if (syncCount > 0) {
      console.log(`[SYNC HOOK] ✅ ${syncCount} variable(s) synchronisee(s)`);
    }
    if (skipCount > 0) {
      console.log(`[SYNC HOOK] ⏭️ ${skipCount} variable(s) ignoree(s) (protection @table/@value)`);
    }
    if (blockedCount > 0) {
      console.log(`[SYNC HOOK] 🛡️ ${blockedCount} synchronisation(s) BLOQUEE(s) - references inexistantes`);
    }
    if (syncCount === 0 && skipCount === 0 && blockedCount === 0) {
      console.log(`[SYNC HOOK] ✅ Aucune synchronisation necessaire`);
    }

  } catch (error) {
    console.error('❌ [SYNC HOOK] Erreur:', error);
    // Ne pas crasher le serveur si le hook echoue
  }
}

/**
 * 🏃 Hook a appeler au demarrage du serveur
 */
export async function initializeTreeBranchLeafSync() {
  try {
    await syncVariableSourceRefs();
  } catch (error) {
    console.error('❌ [INIT SYNC] Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 🔄 CASCADE SYNC: Met a jour toutes les variables d'instance quand la source change
 * 
 * PROBLEME RESOLU:
 * Quand on change table_activeId sur un noeud parent, les variables d'instance
 * (creees par le systeme de repeat avec suffixe -1, -2, etc.) gardent l'ancien sourceRef.
 * Cette fonction propage le changement a toutes les instances.
 * 
 * @param baseNodeId - ID du noeud parent (sans suffixe)
 * @param oldTableId - Ancien ID de table (a remplacer)
 * @param newTableId - Nouveau ID de table
 * @returns Nombre de variables mises a jour
 */
export async function cascadeSyncVariableTableRef(
  baseNodeId: string,
  oldTableId: string,
  newTableId: string
): Promise<number> {
  if (!oldTableId || !newTableId || oldTableId === newTableId) {
    return 0;
  }

  try {
    const oldSourceRef = `@table.${oldTableId}`;
    const newSourceRef = `@table.${newTableId}`;

    // 1️⃣ Trouver toutes les variables qui referencent l'ancienne table
    // Inclut le noeud parent ET toutes ses instances (nodeId-1, nodeId-2, etc.)
    const variablesToUpdate = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          // Variables du noeud parent
          { nodeId: baseNodeId, sourceRef: oldSourceRef },
          // Variables des instances (pattern: baseNodeId-N)
          { nodeId: { startsWith: `${baseNodeId}-` }, sourceRef: oldSourceRef },
          // Variables avec ID base sur le noeud parent (pattern: variableId-N)
          { id: { startsWith: baseNodeId }, sourceRef: oldSourceRef },
        ]
      },
      select: { id: true, nodeId: true, sourceRef: true }
    });

    if (variablesToUpdate.length === 0) {
      console.log(`📋 [CASCADE SYNC] Aucune variable a mettre a jour pour ${baseNodeId}`);
      return 0;
    }

    console.log(`🔄 [CASCADE SYNC] Mise a jour de ${variablesToUpdate.length} variable(s):`);
    console.log(`   Ancien: ${oldSourceRef}`);
    console.log(`   Nouveau: ${newSourceRef}`);

    // 2️⃣ Mettre a jour toutes les variables
    const updateResult = await prisma.treeBranchLeafNodeVariable.updateMany({
      where: {
        id: { in: variablesToUpdate.map(v => v.id) }
      },
      data: {
        sourceRef: newSourceRef,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [CASCADE SYNC] ${updateResult.count} variable(s) mise(s) a jour`);
    
    // 3️⃣ Log detaille des variables mises a jour
    for (const v of variablesToUpdate) {
      console.log(`   - ${v.id} (node: ${v.nodeId})`);
    }

    return updateResult.count;

  } catch (error) {
    console.error('❌ [CASCADE SYNC] Erreur:', error);
    return 0;
  }
}

/**
 * 🔄 CASCADE SYNC FORMULE: Met a jour toutes les variables d'instance quand la formule change
 * 
 * @param baseNodeId - ID du noeud parent (sans suffixe)
 * @param oldFormulaId - Ancien ID de formule (a remplacer)
 * @param newFormulaId - Nouveau ID de formule
 * @returns Nombre de variables mises a jour
 */
export async function cascadeSyncVariableFormulaRef(
  baseNodeId: string,
  oldFormulaId: string,
  newFormulaId: string
): Promise<number> {
  if (!oldFormulaId || !newFormulaId || oldFormulaId === newFormulaId) {
    return 0;
  }

  try {
    const oldSourceRef = `node-formula:${oldFormulaId}`;
    const newSourceRef = `node-formula:${newFormulaId}`;

    const variablesToUpdate = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          { nodeId: baseNodeId, sourceRef: oldSourceRef },
          { nodeId: { startsWith: `${baseNodeId}-` }, sourceRef: oldSourceRef },
          { id: { startsWith: baseNodeId }, sourceRef: oldSourceRef },
        ]
      },
      select: { id: true, nodeId: true, sourceRef: true }
    });

    if (variablesToUpdate.length === 0) {
      return 0;
    }

    console.log(`🔄 [CASCADE SYNC FORMULA] Mise a jour de ${variablesToUpdate.length} variable(s)`);

    const updateResult = await prisma.treeBranchLeafNodeVariable.updateMany({
      where: { id: { in: variablesToUpdate.map(v => v.id) } },
      data: { sourceRef: newSourceRef, updatedAt: new Date() }
    });

    return updateResult.count;

  } catch (error) {
    console.error('❌ [CASCADE SYNC FORMULA] Erreur:', error);
    return 0;
  }
}
