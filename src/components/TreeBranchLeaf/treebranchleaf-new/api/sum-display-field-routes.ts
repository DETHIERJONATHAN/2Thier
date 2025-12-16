/**
 * 📊 SUM DISPLAY FIELD ROUTES
 * 
 * Routes pour gérer les champs Total (somme des copies de variables)
 * 
 * Fonctionnalités:
 * - Créer un champ d'affichage qui affiche la somme de toutes les copies d'une variable
 * - Mettre à jour automatiquement quand les copies changent
 * - Supprimer le champ Total quand désactivé
 */

import { Router, Request } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Helper pour obtenir l'organizationId de manière robuste
type MinimalReqUser = { organizationId?: string | null; isSuperAdmin?: boolean; role?: string; userRole?: string };
function getOrgId(req: Request): string | null {
  const user = (req as Request & { user?: MinimalReqUser }).user || {};
  const headerOrg: string | undefined = (req.headers?.['x-organization-id'] as string)
    || (req.headers?.['x-organization'] as string)
    || (req.headers?.['organization-id'] as string);
  return (user.organizationId as string) || headerOrg || null;
}

export function registerSumDisplayFieldRoutes(router: Router): void {

  // POST /api/treebranchleaf/trees/:treeId/nodes/:nodeId/sum-display-field
  // Crée ou met à jour le champ Total qui somme toutes les copies d'une variable
  router.post('/trees/:treeId/nodes/:nodeId/sum-display-field', async (req, res) => {
    try {
      const { treeId, nodeId } = req.params;
      const organizationId = getOrgId(req);

      console.log(`📊 [SUM DISPLAY] Création champ Total pour nodeId=${nodeId}, treeId=${treeId}, orgId=${organizationId}`);

      // Vérifier l'appartenance de l'arbre à l'organisation
      const tree = await prisma.treeBranchLeafTree.findFirst({
        where: organizationId ? { id: treeId, organizationId } : { id: treeId }
      });

      if (!tree) {
        return res.status(404).json({ error: 'Arbre non trouvé' });
      }

      // Récupérer le nœud et sa variable
      const node = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeId, treeId },
        select: { 
          id: true, 
          parentId: true, 
          label: true, 
          order: true,
          subtab: true,
          linkedVariableIds: true,
          metadata: true
        }
      });

      if (!node) {
        return res.status(404).json({ error: 'Nœud non trouvé' });
      }

      // Récupérer la variable principale du nœud
      const mainVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { nodeId },
        select: { 
          id: true, 
          displayName: true, 
          exposedKey: true,
          displayFormat: true,
          unit: true,
          precision: true
        }
      });

      if (!mainVariable) {
        return res.status(404).json({ error: 'Variable non trouvée pour ce nœud' });
      }

      // Trouver toutes les copies de cette variable (basé sur exposedKey avec suffixes)
      const baseExposedKey = mainVariable.exposedKey.replace(/-\d+$/, ''); // Enlever le suffixe si présent
      const allCopies = await prisma.treeBranchLeafNodeVariable.findMany({
        where: {
          OR: [
            { exposedKey: baseExposedKey },
            { exposedKey: { startsWith: `${baseExposedKey}-` } }
          ]
        },
        select: { id: true, exposedKey: true, nodeId: true }
      });

      console.log(`📊 [SUM DISPLAY] ${allCopies.length} copie(s) trouvée(s) pour ${baseExposedKey}`);

      // 🔥 Récupérer les ordres de tous les nœuds des copies pour positionner le Total après le dernier
      const copyNodeIds = allCopies.map(c => c.nodeId);
      const copyNodes = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: copyNodeIds } },
        select: { id: true, order: true }
      });
      const maxCopyOrder = copyNodes.reduce((max, n) => Math.max(max, n.order ?? 0), 0);
      console.log(`📊 [SUM DISPLAY] Max order des copies: ${maxCopyOrder}, Total sera à order: ${maxCopyOrder + 1}`);

      // Générer l'ID du champ Total
      const sumFieldNodeId = `${nodeId}-sum-total`;
      const sumFieldVariableId = `${mainVariable.id}-sum-total`;
      const sumDisplayName = `${mainVariable.displayName} - Total`;
      const sumExposedKey = `${baseExposedKey}_TOTAL`;

      // Vérifier si le nœud Total existe déjà
      const existingSumNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: sumFieldNodeId },
        select: { id: true, metadata: true }
      });

      // Construire la formule de somme : @value.var1 + @value.var1-1 + @value.var1-2 ...
      const sumTokens: string[] = [];
      allCopies.forEach((copy, index) => {
        if (index > 0) {
          sumTokens.push('+');
        }
        sumTokens.push(`@value.${copy.nodeId}`);
      });

      // Si aucune copie, mettre une valeur par défaut
      if (sumTokens.length === 0) {
        sumTokens.push('0');
      }

      const now = new Date();

      // Générer l'ID de la formule avant la création du nœud
      const sumFormulaId = `${mainVariable.id}-sum-formula`;
      
      // Construire formula_instances pour le frontend
      const formulaInstance = {
        id: sumFormulaId,
        name: `Somme ${mainVariable.displayName}`,
        tokens: sumTokens,
        description: `Somme automatique de toutes les copies de ${mainVariable.displayName}`
      };

      // 🎯 UNIFIÉ: Structure identique à M² toiture - Total qui fonctionne
      // - fieldType: null (pas NUMBER)
      // - data_visibleToUser: false
      // - Pas de capabilities.datas dans metadata
      const sumNodeData = {
        label: sumDisplayName,
        field_label: sumDisplayName,
        fieldType: null,  // 🔧 UNIFIÉ: null comme M² toiture - Total
        subType: null,
        fieldSubType: null,
        hasData: true,
        hasFormula: true,
        data_visibleToUser: false,  // 🔧 UNIFIÉ: false comme M² toiture - Total
        formula_activeId: sumFormulaId,
        formula_instances: { [sumFormulaId]: formulaInstance },
        formula_tokens: sumTokens,
        linkedFormulaIds: [sumFormulaId],
        data_activeId: sumFieldVariableId,
        data_displayFormat: mainVariable.displayFormat,
        data_unit: mainVariable.unit,
        data_precision: mainVariable.precision,
        metadata: {
          ...(existingSumNode?.metadata as Record<string, unknown> || {}),
          isSumDisplayField: true,
          sourceVariableId: mainVariable.id,
          sourceNodeId: nodeId,
          sumTokens,
          copiesCount: allCopies.length,
          // 🚫 PAS de capabilities.datas ici - le frontend utilise formula_instances directement
          // C'est le chemin qui fonctionne pour M² toiture - Total
          updatedAt: now.toISOString()
        },
        updatedAt: now
      } as const;

      if (existingSumNode) {
        await prisma.treeBranchLeafNode.update({
          where: { id: sumFieldNodeId },
          data: sumNodeData
        });
        console.log(`📊 [SUM DISPLAY] Nœud Total mis à jour: ${sumFieldNodeId}`);
      } else {
        try {
          await prisma.treeBranchLeafNode.create({
            data: {
              id: sumFieldNodeId,
              treeId,
              parentId: node.parentId, // Même section que le nœud original
              type: 'leaf_field',
              label: sumDisplayName,
              field_label: sumDisplayName,
              order: maxCopyOrder + 1, // 🔥 APRÈS le dernier nœud copié (Mur-1, Mur-2, etc.)
              isVisible: true,
              isActive: true,
              subtab: node.subtab as Record<string, unknown> | null,
              hasData: true,
              hasFormula: true,
              data_activeId: sumFieldVariableId,
              createdAt: now,
              updatedAt: now,
              ...sumNodeData
            }
          });
          console.log(`📊 [SUM DISPLAY] Nœud Total créé: ${sumFieldNodeId}`);
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // Conflit d'unicité: le nœud existe déjà, on le met simplement à jour
            await prisma.treeBranchLeafNode.update({ where: { id: sumFieldNodeId }, data: sumNodeData });
            console.warn(`⚠️ [SUM DISPLAY] Nœud Total déjà existant, mise à jour forcée: ${sumFieldNodeId}`);
          } else {
            throw err;
          }
        }
      }

      // Créer/mettre à jour la variable Total
      const existingSumVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { nodeId: sumFieldNodeId }
      });

      const sumVariableData = {
        displayName: sumDisplayName,
        displayFormat: mainVariable.displayFormat,
        unit: mainVariable.unit,
        precision: mainVariable.precision,
        visibleToUser: true,
        sourceType: 'formula',
        sourceRef: `node-formula:${sumFormulaId}`,
        metadata: {
          isSumVariable: true,
          sumTokens,
          copiesCount: allCopies.length,
          sourceVariableId: mainVariable.id
        },
        updatedAt: now
      } as const;

      if (existingSumVariable) {
        await prisma.treeBranchLeafNodeVariable.update({
          where: { nodeId: sumFieldNodeId },
          data: sumVariableData
        });
      } else {
        const existingKey = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: sumExposedKey } });
        const finalExposedKey = existingKey ? `${sumExposedKey}_${Date.now()}` : sumExposedKey;

        try {
          await prisma.treeBranchLeafNodeVariable.create({
            data: {
              id: sumFieldVariableId,
              nodeId: sumFieldNodeId,
              exposedKey: finalExposedKey,
              createdAt: now,
              ...sumVariableData
            }
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            await prisma.treeBranchLeafNodeVariable.update({ where: { nodeId: sumFieldNodeId }, data: sumVariableData });
            console.warn(`⚠️ [SUM DISPLAY] Variable Total déjà existante, mise à jour forcée: ${sumFieldNodeId}`);
          } else {
            throw err;
          }
        }
      }

      // Créer/mettre à jour la formule de somme dans la table dédiée
      const existingSumFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: sumFormulaId }
      });

      // 🔥 OrganizationId pour la formule (depuis tree ou request)
      const formulaOrgId = tree.organizationId || organizationId;

      const sumFormulaData = {
        tokens: sumTokens,
        organizationId: formulaOrgId,
        updatedAt: now
      } as const;

      if (existingSumFormula) {
        await prisma.treeBranchLeafNodeFormula.update({ where: { id: sumFormulaId }, data: sumFormulaData });
      } else {
        try {
          await prisma.treeBranchLeafNodeFormula.create({
            data: {
              id: sumFormulaId,
              nodeId: sumFieldNodeId,
              organizationId: formulaOrgId,
              name: `Somme ${mainVariable.displayName}`,
              description: `Somme automatique de toutes les copies de ${mainVariable.displayName}`,
              createdAt: now,
              ...sumFormulaData
            }
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            await prisma.treeBranchLeafNodeFormula.update({ where: { id: sumFormulaId }, data: sumFormulaData });
            console.warn(`⚠️ [SUM DISPLAY] Formule Total déjà existante, mise à jour forcée: ${sumFormulaId}`);
          } else {
            throw err;
          }
        }
      }

      // Sauvegarder l'option dans la metadata du nœud original
      const existingMeta = (node.metadata as Record<string, unknown>) || {};
      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: {
          metadata: {
            ...existingMeta,
            createSumDisplayField: true,
            sumDisplayFieldNodeId: sumFieldNodeId
          }
        }
      });

      console.log(`✅ [SUM DISPLAY] Champ Total créé avec succès`);
      return res.json({ 
        success: true, 
        sumFieldNodeId,
        sumFieldVariableId,
        sumFormulaId,
        copiesCount: allCopies.length,
        sumTokens
      });

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : '';
      console.error('❌ [SUM DISPLAY] Erreur:', errMsg);
      console.error('❌ [SUM DISPLAY] Stack:', errStack);
      res.status(500).json({ error: 'Erreur lors de la création du champ Total', details: errMsg });
    }
  });

  // DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId/sum-display-field
  // Supprime le champ Total d'une variable
  router.delete('/trees/:treeId/nodes/:nodeId/sum-display-field', async (req, res) => {
    try {
      const { treeId, nodeId } = req.params;
      const organizationId = getOrgId(req);

      console.log(`🗑️ [SUM DISPLAY] Suppression champ Total pour nodeId=${nodeId}`);

      // Vérifier l'appartenance de l'arbre à l'organisation
      const tree = await prisma.treeBranchLeafTree.findFirst({
        where: organizationId ? { id: treeId, organizationId } : { id: treeId }
      });

      if (!tree) {
        return res.status(404).json({ error: 'Arbre non trouvé' });
      }

      // Récupérer le nœud
      const node = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeId, treeId },
        select: { id: true, metadata: true }
      });

      if (!node) {
        return res.status(404).json({ error: 'Nœud non trouvé' });
      }

      const sumFieldNodeId = `${nodeId}-sum-total`;

      // Récupérer la variable principale pour construire les IDs
      const mainVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { nodeId },
        select: { id: true }
      });

      const sumFormulaId = mainVariable ? `${mainVariable.id}-sum-formula` : null;

      // Supprimer la formule
      if (sumFormulaId) {
        try {
          await prisma.treeBranchLeafNodeFormula.delete({
            where: { id: sumFormulaId }
          });
          console.log(`🗑️ [SUM DISPLAY] Formule supprimée: ${sumFormulaId}`);
        } catch { /* noop si n'existe pas */ }
      }

      // Supprimer la variable Total
      try {
        await prisma.treeBranchLeafNodeVariable.delete({
          where: { nodeId: sumFieldNodeId }
        });
        console.log(`🗑️ [SUM DISPLAY] Variable supprimée`);
      } catch { /* noop si n'existe pas */ }

      // Supprimer le nœud Total
      try {
        await prisma.treeBranchLeafNode.delete({
          where: { id: sumFieldNodeId }
        });
        console.log(`🗑️ [SUM DISPLAY] Nœud supprimé: ${sumFieldNodeId}`);
      } catch { /* noop si n'existe pas */ }

      // Mettre à jour la metadata du nœud original
      const existingMeta = (node.metadata as Record<string, unknown>) || {};
      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: {
          metadata: {
            ...existingMeta,
            createSumDisplayField: false,
            sumDisplayFieldNodeId: null
          }
        }
      });

      console.log(`✅ [SUM DISPLAY] Champ Total supprimé avec succès`);
      return res.json({ success: true });

    } catch (error) {
      console.error('❌ [SUM DISPLAY] Erreur suppression:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du champ Total' });
    }
  });
}

/**
 * 📊 Met à jour le champ Total quand les copies changent
 * 
 * Appelée après chaque copie/suppression de variable pour recalculer la formule de somme
 * 
 * @param sourceNodeId - ID du nœud source de la variable
 * @param prismaClient - Instance Prisma (optionnel, utilise le client global si non fourni)
 */
export async function updateSumDisplayFieldAfterCopyChange(
  sourceNodeId: string,
  prismaClient?: PrismaClient
): Promise<void> {
  const db = prismaClient || prisma;
  
  try {
    // Récupérer le nœud source et vérifier s'il a un champ Total activé
    const sourceNode = await db.treeBranchLeafNode.findUnique({
      where: { id: sourceNodeId },
      select: { 
        id: true, 
        treeId: true,
        metadata: true 
      }
    });

    if (!sourceNode) return;

    const metadata = sourceNode.metadata as Record<string, unknown> | null;
    const hasSum = metadata?.createSumDisplayField === true;
    const sumFieldNodeId = metadata?.sumDisplayFieldNodeId as string | undefined;

    if (!hasSum || !sumFieldNodeId) {
      console.log(`📊 [SUM UPDATE] Nœud ${sourceNodeId} n'a pas de champ Total activé`);
      return;
    }

    // Récupérer la variable principale
    const mainVariable = await db.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId: sourceNodeId },
      select: { id: true, exposedKey: true, displayName: true }
    });

    if (!mainVariable) return;

    // Trouver toutes les copies
    const baseExposedKey = mainVariable.exposedKey.replace(/-\d+$/, '');
    const allCopies = await db.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          { exposedKey: baseExposedKey },
          { exposedKey: { startsWith: `${baseExposedKey}-` } }
        ]
      },
      select: { nodeId: true }
    });

    // Reconstruire les tokens de somme
    const sumTokens: string[] = [];
    allCopies.forEach((copy, index) => {
      if (index > 0) sumTokens.push('+');
      sumTokens.push(`@value.${copy.nodeId}`);
    });

    if (sumTokens.length === 0) sumTokens.push('0');

    const now = new Date();
    const sumFormulaId = `${mainVariable.id}-sum-formula`;

    // Construire formula_instances pour le frontend
    const formulaInstance = {
      id: sumFormulaId,
      name: `Somme ${mainVariable.displayName}`,
      tokens: sumTokens,
      description: `Somme automatique de toutes les copies de ${mainVariable.displayName}`
    };

    // Mettre à jour la formule dans la table dédiée
    await db.treeBranchLeafNodeFormula.update({
      where: { id: sumFormulaId },
      data: { tokens: sumTokens, updatedAt: now }
    });

    // Mettre à jour le nœud Total avec formula_instances et formula_tokens
    const sumNode = await db.treeBranchLeafNode.findUnique({
      where: { id: sumFieldNodeId },
      select: { metadata: true }
    });

    if (sumNode) {
      await db.treeBranchLeafNode.update({
        where: { id: sumFieldNodeId },
        data: {
          updatedAt: now,
          formula_instances: { [sumFormulaId]: formulaInstance },
          formula_tokens: sumTokens,
          metadata: {
            ...(sumNode.metadata as Record<string, unknown> || {}),
            sumTokens,
            copiesCount: allCopies.length,
            updatedAt: now.toISOString()
          }
        }
      });
    }

    console.log(`✅ [SUM UPDATE] Champ Total mis à jour: ${allCopies.length} copies, formule: ${sumTokens.join(' ')}`);

  } catch (error) {
    console.error('❌ [SUM UPDATE] Erreur mise à jour champ Total:', error);
  }
}
