/**
 * Ã°Å¸â€œÅ  SUM DISPLAY FIELD ROUTES
 * 
 * Routes pour gÃƒÂ©rer les champs Total (somme des copies de variables)
 * 
 * FonctionnalitÃƒÂ©s:
 * - CrÃƒÂ©er un champ d'affichage qui affiche la somme de toutes les copies d'une variable
 * - Mettre ÃƒÂ  jour automatiquement quand les copies changent
 * - Supprimer le champ Total quand dÃƒÂ©sactivÃƒÂ©
 */

import { Router, Request } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../../../../lib/database';
import { randomUUID } from 'crypto';

const prisma = db;

// Helper pour obtenir l'organizationId de maniÃƒÂ¨re robuste
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
  // CrÃƒÂ©e ou met ÃƒÂ  jour le champ Total qui somme toutes les copies d'une variable
  router.post('/trees/:treeId/nodes/:nodeId/sum-display-field', async (req, res) => {
    try {
      const { treeId, nodeId } = req.params;
      const organizationId = getOrgId(req);


      // VÃƒÂ©rifier l'appartenance de l'arbre ÃƒÂ  l'organisation
      const tree = await prisma.treeBranchLeafTree.findFirst({
        where: organizationId ? { id: treeId, organizationId } : { id: treeId }
      });

      if (!tree) {
        return res.status(404).json({ error: 'Arbre non trouvÃƒÂ©' });
      }

      // RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud et sa variable
      const node = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeId, treeId },
        select: { 
          id: true, 
          parentId: true, 
          label: true, 
          order: true,
          subtab: true,
          linkedVariableIds: true,
          metadata: true,
          subType: true, // 🎯 FIX: Récupérer le subType de l'original
          fieldType: true,
          appearance_displayIcon: true, // 🎨 FIX: Récupérer l'icône pour l'hériter sur les totaux
          appearance_size: true,
          appearance_variant: true,
          appearance_width: true
        }
      });

      if (!node) {
        return res.status(404).json({ error: 'Nœud non trouvé' });
      }

      // 🎯 FIX: Extraire les triggerNodeIds du nœud original (comme variable-copy-engine.ts ligne 758)
      const originalMetadata = (node.metadata as Record<string, unknown>) || {};
      const originalTriggerNodeIds = originalMetadata.triggerNodeIds as string[] | undefined;
      const originalSubType = node.subType; // 'display' si c'est un champ display

      console.log('🎯 [SUM-DISPLAY] Nœud original:', {
        nodeId,
        subType: originalSubType,
        triggerNodeIds: originalTriggerNodeIds,
        metadata: JSON.stringify(originalMetadata)
      });

      // RÃƒÂ©cupÃƒÂ©rer la variable principale du nÃ…â€œud
      let mainVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
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
        // 🛡️ AUTO-CREATE: Créer la variable automatiquement si elle n'existe pas
        // Cela arrive quand l'utilisateur a désactivé/réactivé la capacité Données
        console.log('🛡️ [SUM-DISPLAY] Variable manquante pour nodeId:', nodeId, '- création automatique');
        const newId = randomUUID();
        const exposedKey = `var_${nodeId.slice(0, 4)}`;
        // Vérifier que l'exposedKey n'est pas déjà prise
        const existing = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey } });
        const finalExposedKey = existing ? `var_${nodeId.slice(0, 8)}` : exposedKey;
        
        mainVariable = await prisma.treeBranchLeafNodeVariable.create({
          data: {
            id: newId,
            nodeId,
            exposedKey: finalExposedKey,
            displayName: node.label || 'Variable',
            displayFormat: 'number',
            unit: null,
            precision: 2,
            visibleToUser: true,
            isReadonly: false,
            sourceType: 'fixed',
            metadata: {},
            updatedAt: new Date(),
          },
          select: {
            id: true,
            displayName: true,
            exposedKey: true,
            displayFormat: true,
            unit: true,
            precision: true
          }
        });
        
        // Mettre à jour le nœud pour refléter la variable
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            hasData: true,
            data_activeId: newId,
            linkedVariableIds: [newId],
            updatedAt: new Date(),
          }
        });
        
        console.log('✅ [SUM-DISPLAY] Variable auto-créée:', { id: newId, exposedKey: finalExposedKey });
      }

      // Trouver toutes les copies de cette variable (basÃƒÂ© sur exposedKey avec suffixes)
      const baseExposedKey = mainVariable.exposedKey.replace(/-\d+$/, ''); // Enlever le suffixe si prÃƒÂ©sent
      const allCopies = await prisma.treeBranchLeafNodeVariable.findMany({
        where: {
          OR: [
            { exposedKey: baseExposedKey },
            { exposedKey: { startsWith: `${baseExposedKey}-` } }
          ]
        },
        select: { id: true, exposedKey: true, nodeId: true }
      });


      // Ã°Å¸â€Â¥ RÃƒÂ©cupÃƒÂ©rer les ordres de tous les nÃ…â€œuds des copies pour positionner le Total aprÃƒÂ¨s le dernier
      const copyNodeIds = allCopies.map(c => c.nodeId);
      const copyNodes = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: copyNodeIds } },
        select: { id: true, order: true }
      });
      const maxCopyOrder = copyNodes.reduce((max, n) => Math.max(max, n.order ?? 0), 0);

      // GÃƒÂ©nÃƒÂ©rer l'ID du champ Total
      const sumFieldNodeId = `${nodeId}-sum-total`;
      const sumFieldVariableId = `${mainVariable.id}-sum-total`;
      const sumDisplayName = `${mainVariable.displayName} - Total`;
      const sumExposedKey = `${baseExposedKey}_TOTAL`;

      // VÃƒÂ©rifier si le nÃ…â€œud Total existe dÃƒÂ©jÃƒÂ 
      const existingSumNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: sumFieldNodeId },
        select: { id: true, metadata: true }
      });
      // 🎨 HÉRITAGE AUTOMATIQUE DE L'ICÔNE du champ source
      const sourceNodeIcon = node.metadata?.icon || null;
      console.log(`[SUM-DISPLAY] 🎨 Icône héritée du champ source "${node.label}": ${sourceNodeIcon || '(aucune)'}`);
      // Construire la formule de somme : @value.var1 + @value.var1-1 + @value.var1-2 ...
      const sumTokens: string[] = [];
      allCopies.forEach((copy, index) => {
        if (index > 0) {
          sumTokens.push('+');
        }
        sumTokens.push(`@value.${copy.nodeId}`);
      });

      // Si aucune copie, mettre une valeur par dÃƒÂ©faut
      if (sumTokens.length === 0) {
        sumTokens.push('0');
      }

      const now = new Date();

      // GÃƒÂ©nÃƒÂ©rer l'ID de la formule avant la crÃƒÂ©ation du nÃ…â€œud
      const sumFormulaId = `${mainVariable.id}-sum-formula`;
      
      // Construire formula_instances pour le frontend
      const formulaInstance = {
        id: sumFormulaId,
        name: `Somme ${mainVariable.displayName}`,
        tokens: sumTokens,
        description: `Somme automatique de toutes les copies de ${mainVariable.displayName}`
      };

      // 🎯 FIX: Hériter le subType de l'original (ex: 'display') - comme variable-copy-engine.ts ligne 867
      const inheritedSubType = originalSubType || null;
      const inheritedFieldType = node.fieldType || null;

      // 🎯 UNIFIÉE: Structure identique à M² toiture - Total qui fonctionne
      // - fieldType: hérité de l'original
      // - data_visibleToUser: false
      // - Pas de capabilities.datas dans metadata
      const sumNodeData = {
        label: sumDisplayName,
        field_label: sumDisplayName,
        fieldType: inheritedFieldType,  // 🎯 FIX: Hériter le fieldType de l'original
        subType: inheritedSubType,  // 🎯 FIX: Hériter le subType ('display' si c'est un champ display)
        fieldSubType: null,
        hasData: true,
        hasFormula: true,
        data_visibleToUser: false,  // Ã°Å¸â€Â§ UNIFIÃƒâ€°: false comme MÃ‚Â² toiture - Total
        formula_activeId: sumFormulaId,
        formula_instances: { [sumFormulaId]: formulaInstance },
        formula_tokens: sumTokens,
        linkedFormulaIds: [sumFormulaId],
        data_activeId: sumFieldVariableId,
        data_displayFormat: mainVariable.displayFormat,
        data_unit: mainVariable.unit,
        data_precision: mainVariable.precision,
        // 🎨 HÉRITAGE APPARENCE: Copier les propriétés d'apparence du champ source
        appearance_displayIcon: node.appearance_displayIcon,
        appearance_size: node.appearance_size,
        appearance_variant: node.appearance_variant,
        appearance_width: node.appearance_width,
        metadata: {
          ...(existingSumNode?.metadata as Record<string, unknown> || {}),
          icon: sourceNodeIcon, // 🎨 HÉRITAGE: même icône que le champ source
          isSumDisplayField: true,
          sourceVariableId: mainVariable.id,
          sourceNodeId: nodeId,
          sumTokens,
          copiesCount: allCopies.length,
          // 🔥 FIX: Fusionner les triggerNodeIds existants avec ceux de l'original
          // au lieu d'écraser (préserve les triggers configurés manuellement)
          ...(() => {
            const existingTriggers = Array.isArray((existingSumNode?.metadata as Record<string, unknown>)?.triggerNodeIds)
              ? ((existingSumNode?.metadata as Record<string, unknown>).triggerNodeIds as string[])
              : [];
            const newTriggers = originalTriggerNodeIds && originalTriggerNodeIds.length > 0 ? originalTriggerNodeIds : [];
            const merged = Array.from(new Set([...existingTriggers, ...newTriggers]));
            return merged.length > 0 ? { triggerNodeIds: merged } : {};
          })(),
          // �🎨 HÉRITAGE ICÔNE: Ajouter l'icône dans capabilities.datas pour le frontend
          capabilities: {
            ...(existingSumNode?.metadata?.capabilities || {}),
            datas: [{
              id: `data_${sumFieldNodeId}`,
              config: {
                icon: sourceNodeIcon, // 🎨 L'icône doit aussi être ici pour l'affichage frontend
                sourceRef: `node-variable:${sumFieldVariableId}`
              }
            }]
          },
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
      } else {
        try {
          await prisma.treeBranchLeafNode.create({
            data: {
              id: sumFieldNodeId,
              treeId,
              parentId: node.parentId, // MÃƒÂªme section que le nÃ…â€œud original
              type: 'leaf_field',
              label: sumDisplayName,
              field_label: sumDisplayName,
              order: maxCopyOrder + 1, // Ã°Å¸â€Â¥ APRÃƒË†S le dernier nÃ…â€œud copiÃƒÂ© (Mur-1, Mur-2, etc.)
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
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // Conflit d'unicitÃƒÂ©: le nÃ…â€œud existe dÃƒÂ©jÃƒÂ , on le met simplement ÃƒÂ  jour
            await prisma.treeBranchLeafNode.update({ where: { id: sumFieldNodeId }, data: sumNodeData });
            console.warn(`Ã¢Å¡Â Ã¯Â¸Â [SUM DISPLAY] NÃ…â€œud Total dÃƒÂ©jÃƒÂ  existant, mise ÃƒÂ  jour forcÃƒÂ©e: ${sumFieldNodeId}`);
          } else {
            throw err;
          }
        }
      }

      // CrÃƒÂ©er/mettre ÃƒÂ  jour la variable Total
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
            console.warn(`Ã¢Å¡Â Ã¯Â¸Â [SUM DISPLAY] Variable Total dÃƒÂ©jÃƒÂ  existante, mise ÃƒÂ  jour forcÃƒÂ©e: ${sumFieldNodeId}`);
          } else {
            throw err;
          }
        }
      }

      // Créer/mettre à jour la formule de somme dans la table dédiée
      // 🔥 FIX: D'abord supprimer toute formule orpheline pour ce nodeId qui a un ID différent
      // Cela évite les conflits de contrainte unique (nodeId, name) avec des formules périmées
      try {
        await prisma.treeBranchLeafNodeFormula.deleteMany({
          where: {
            nodeId: sumFieldNodeId,
            id: { not: sumFormulaId }
          }
        });
      } catch { /* noop */ }

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
            // La contrainte unique (nodeId, name) a échoué malgré le nettoyage préalable
            // Supprimer toute formule conflictuante et recréer avec le bon ID
            await prisma.treeBranchLeafNodeFormula.deleteMany({ where: { nodeId: sumFieldNodeId } });
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
            console.warn(`⚠️ [SUM DISPLAY] Formule orpheline nettoyée et recréée: ${sumFormulaId}`);
          } else {
            throw err;
          }
        }
      }

      // Sauvegarder l'option dans la metadata du nÃ…â€œud original
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
      console.error('Ã¢ÂÅ’ [SUM DISPLAY] Erreur:', errMsg);
      console.error('Ã¢ÂÅ’ [SUM DISPLAY] Stack:', errStack);
      res.status(500).json({ error: 'Erreur lors de la crÃƒÂ©ation du champ Total', details: errMsg });
    }
  });

  // DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId/sum-display-field
  // Supprime le champ Total d'une variable
  router.delete('/trees/:treeId/nodes/:nodeId/sum-display-field', async (req, res) => {
    try {
      const { treeId, nodeId } = req.params;
      const organizationId = getOrgId(req);


      // VÃƒÂ©rifier l'appartenance de l'arbre ÃƒÂ  l'organisation
      const tree = await prisma.treeBranchLeafTree.findFirst({
        where: organizationId ? { id: treeId, organizationId } : { id: treeId }
      });

      if (!tree) {
        return res.status(404).json({ error: 'Arbre non trouvÃƒÂ©' });
      }

      // RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud
      const node = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeId, treeId },
        select: { id: true, metadata: true }
      });

      if (!node) {
        return res.status(404).json({ error: 'NÃ…â€œud non trouvÃƒÂ©' });
      }

      const sumFieldNodeId = `${nodeId}-sum-total`;

      // RÃƒÂ©cupÃƒÂ©rer la variable principale pour construire les IDs
      const mainVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { nodeId },
        select: { id: true }
      });

      const sumFormulaId = mainVariable ? `${mainVariable.id}-sum-formula` : null;

      // 🔥 FIX: Supprimer TOUTES les formules liées au nœud sum-total (pas seulement celle du variable ID actuel)
      // Cela évite les formules orphelines quand le variable ID a changé entre les activations
      try {
        await prisma.treeBranchLeafNodeFormula.deleteMany({
          where: { nodeId: sumFieldNodeId }
        });
      } catch { /* noop si n'existe pas */ }
      // Aussi supprimer par ID spécifique (au cas où le nodeId serait différent)
      if (sumFormulaId) {
        try {
          await prisma.treeBranchLeafNodeFormula.delete({
            where: { id: sumFormulaId }
          });
        } catch { /* noop si n'existe pas */ }
      }

      // Supprimer la variable Total
      try {
        await prisma.treeBranchLeafNodeVariable.delete({
          where: { nodeId: sumFieldNodeId }
        });
      } catch { /* noop si n'existe pas */ }

      // Supprimer le nÃ…â€œud Total
      try {
        await prisma.treeBranchLeafNode.delete({
          where: { id: sumFieldNodeId }
        });
      } catch { /* noop si n'existe pas */ }

      // Mettre ÃƒÂ  jour la metadata du nÃ…â€œud original
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

      return res.json({ success: true });

    } catch (error) {
      console.error('Ã¢ÂÅ’ [SUM DISPLAY] Erreur suppression:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du champ Total' });
    }
  });
}

/**
 * Ã°Å¸â€œÅ  Met ÃƒÂ  jour le champ Total quand les copies changent
 * 
 * AppelÃƒÂ©e aprÃƒÂ¨s chaque copie/suppression de variable pour recalculer la formule de somme
 * 
 * @param sourceNodeId - ID du nÃ…â€œud source de la variable
 * @param prismaClient - Instance Prisma (optionnel, utilise le client global si non fourni)
 */
export async function updateSumDisplayFieldAfterCopyChange(
  sourceNodeId: string,
  prismaClient?: PrismaClient
): Promise<void> {
  const db = prismaClient || prisma;
  
  try {
    // RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud source et vÃƒÂ©rifier s'il a un champ Total activÃƒÂ©
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
      return;
    }

    // RÃƒÂ©cupÃƒÂ©rer la variable principale
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

    // 🎯 FIX: Récupérer les triggerNodeIds de TOUTES les copies (original + duplications)
    const copyNodeIds = allCopies.map(c => c.nodeId);
    const allCopyNodes = await db.treeBranchLeafNode.findMany({
      where: { id: { in: copyNodeIds } },
      select: { id: true, metadata: true, calculatedValue: true }
    });

    // 🎯 FIX: Agréger les triggerNodeIds de toutes les copies
    const aggregatedTriggers = new Set<string>();
    allCopyNodes.forEach(copyNode => {
      const copyMetadata = (copyNode.metadata as Record<string, unknown>) || {};
      const copyTriggers = copyMetadata.triggerNodeIds as string[] | undefined;
      if (Array.isArray(copyTriggers)) {
        copyTriggers.forEach(t => aggregatedTriggers.add(t));
      }
    });

    const allTriggerNodeIds = Array.from(aggregatedTriggers);

    console.log('🎯 [SUM UPDATE] Triggers agrégés:', {
      copiesCount: allCopies.length,
      copyNodeIds,
      aggregatedTriggers: allTriggerNodeIds
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

    // 🔍 Vérifier que le nœud cible existe avant de créer la formule
    const sumNodeExists = await db.treeBranchLeafNode.findUnique({
      where: { id: sumFieldNodeId },
      select: { id: true }
    });

    if (!sumNodeExists) {
      // Le nœud sum-total n'existe pas encore, skip silencieusement
      return;
    }

    // ✅ FIX: Supprimer toute formule orpheline avec un ID différent pour ce nodeId
    // Puis upsert avec le bon ID basé sur le mainVariable.id actuel
    const formulaName = `Somme ${mainVariable.displayName}`;
    try {
      await db.treeBranchLeafNodeFormula.deleteMany({
        where: {
          nodeId: sumFieldNodeId,
          id: { not: sumFormulaId }
        }
      });
    } catch { /* noop */ }
    
    await db.treeBranchLeafNodeFormula.upsert({
      where: { 
        nodeId_name: { 
          nodeId: sumFieldNodeId, 
          name: formulaName 
        } 
      },
      update: { tokens: sumTokens, updatedAt: now },
      create: {
        id: sumFormulaId,
        name: formulaName,
        tokens: sumTokens,
        nodeId: sumFieldNodeId,
        createdAt: now,
        updatedAt: now
      }
    });

    // Ã°Å¸â€Â¥ NOUVEAU: Recalculer la valeur avec allCopyNodes (déjà récupéré ligne 519)
    let newCalculatedValue = 0;
    for (const node of allCopyNodes) {
      newCalculatedValue += parseFloat(String(node.calculatedValue)) || 0;
    }

    // Mettre ÃƒÂ  jour le nÃ…â€œud Total avec formula_instances et formula_tokens
    const sumNode = await db.treeBranchLeafNode.findUnique({
      where: { id: sumFieldNodeId },
      select: { metadata: true }
    });

    if (sumNode) {
      // 🔥 FIX: Fusionner les triggerNodeIds existants (configurés manuellement par l'utilisateur)
      // avec les triggerNodeIds agrégés des copies, au lieu d'écraser
      const existingMetadata = (sumNode.metadata as Record<string, unknown>) || {};
      const existingTriggers = Array.isArray(existingMetadata.triggerNodeIds)
        ? (existingMetadata.triggerNodeIds as string[])
        : [];
      const mergedTriggers = Array.from(new Set([...existingTriggers, ...allTriggerNodeIds]));

      await db.treeBranchLeafNode.update({
        where: { id: sumFieldNodeId },
        data: {
          updatedAt: now,
          formula_instances: { [sumFormulaId]: formulaInstance },
          formula_tokens: sumTokens,
          calculatedValue: String(newCalculatedValue), // Ã°Å¸â€Â¥ NOUVEAU: Mettre ÃƒÂ  jour la valeur
          metadata: {
            ...existingMetadata,
            sumTokens,
            copiesCount: allCopies.length,
            // 🔥 FIX: Fusionner au lieu d'écraser pour préserver les triggers manuels
            ...(mergedTriggers.length > 0 ? { triggerNodeIds: mergedTriggers } : {}),
            updatedAt: now.toISOString()
          }
        }
      });
    }


  } catch (error) {
    console.error('Ã¢ÂÅ’ [SUM UPDATE] Erreur mise ÃƒÂ  jour champ Total:', error);
  }
}
