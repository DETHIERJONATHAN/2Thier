import { Router, Request, Response } from 'express';
import { db } from '../lib/database';

const router = Router();

// ──────────────────────────────────────────────────────
// GET /api/gestionnaire/trees/:treeId/exposed
// Retourne les éléments exposés au gestionnaire pour un arbre
// ──────────────────────────────────────────────────────
router.get('/trees/:treeId/exposed', async (req: Request, res: Response) => {
  try {
    const { treeId } = req.params;
    const user = req.user;
    const organizationId = user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // 1. Trouver les variables exposées dans cet arbre
    const exposedVariables = await db.treeBranchLeafNodeVariable.findMany({
      where: {
        gestionnaireExposed: true,
        TreeBranchLeafNode: {
          treeId
        }
      },
      select: {
        id: true,
        nodeId: true,
        displayName: true,
        gestionnaireLabel: true,
        fixedValue: true,
        unit: true,
        displayFormat: true,
        precision: true,
        sourceType: true,
      }
    });

    // 2. Trouver les tables exposées dans cet arbre
    const exposedTables = await db.treeBranchLeafNodeTable.findMany({
      where: {
        gestionnaireExposed: true,
        TreeBranchLeafNode: {
          treeId
        }
      },
      select: {
        id: true,
        nodeId: true,
        name: true,
        gestionnaireLabel: true,
        type: true,
        columnCount: true,
        rowCount: true,
      }
    });

    // 3. Charger les overrides existants pour cette org
    const overrides = await db.gestionnaireOverride.findMany({
      where: {
        organizationId,
        treeId
      }
    });

    const overrideMap = new Map(overrides.map(o => [o.capabilityId, o]));

    // 4. Enrichir les variables avec les overrides
    const variables = exposedVariables.map(v => {
      const override = overrideMap.get(v.id);
      const currentValue = override?.overrideValue ?? v.fixedValue;
      // hasOverride = true SEULEMENT si la valeur actuelle diffère de la valeur de base
      const valueChanged = override?.overrideValue != null && override.overrideValue !== v.fixedValue;
      return {
        ...v,
        currentValue,
        hasOverride: valueChanged,
        overrideId: override?.id,
        lastUpdatedBy: override?.updatedBy,
        lastUpdatedAt: override?.updatedAt,
      };
    });

    // 5. Enrichir les tables avec les overrides
    const tables = exposedTables.map(t => {
      const override = overrideMap.get(t.id);
      return {
        ...t,
        hasOverride: !!override,
        overrideId: override?.id,
        overrideData: override?.overrideData,
        lastUpdatedBy: override?.updatedBy,
        lastUpdatedAt: override?.updatedAt,
      };
    });

    // 6. Scanner les formules pour trouver les constantes exposées (@const.xxx.value)
    const treeNodeIds = await db.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { id: true }
    });
    const nodeIdSet = treeNodeIds.map(n => n.id);

    const allFormulas = await db.treeBranchLeafNodeFormula.findMany({
      where: {
        nodeId: { in: nodeIdSet }
      },
      select: {
        id: true,
        nodeId: true,
        name: true,
        tokens: true,
      }
    });

    const constants: Array<{
      constId: string;
      formulaId: string;
      formulaName: string;
      nodeId: string;
      originalValue: string;
      label: string;
      currentValue: string;
      hasOverride: boolean;
      overrideId: string | null;
    }> = [];

    for (const formula of allFormulas) {
      const tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
      for (const token of tokens) {
        if (typeof token === 'string' && token.startsWith('@const.')) {
          const rest = token.slice('@const.'.length);
          const firstDot = rest.indexOf('.');
          if (firstDot > 0) {
            const constId = rest.slice(0, firstDot);
            const originalValue = rest.slice(firstDot + 1);
            const override = overrideMap.get(constId);
            // Lire le label personnalisé depuis overrideData si disponible
            const overrideData = (override?.overrideData && typeof override.overrideData === 'object') ? override.overrideData as Record<string, unknown> : {};
            const customLabel = typeof overrideData.label === 'string' ? overrideData.label : '';
            const currentValue = override?.overrideValue ?? originalValue;
            // hasOverride = true SEULEMENT si la valeur actuelle diffère de la valeur de base
            const valueChanged = override?.overrideValue != null && override.overrideValue !== originalValue;
            constants.push({
              constId,
              formulaId: formula.id,
              formulaName: formula.name,
              nodeId: formula.nodeId,
              originalValue,
              label: customLabel || `${formula.name} — ${originalValue}`,
              customLabel: customLabel || '',
              currentValue,
              hasOverride: valueChanged,
              overrideId: override?.id ?? null,
            });
          }
        }
      }
    }

    return res.json({ variables, tables, constants });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error fetching exposed items:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────
// PATCH /api/gestionnaire/override/variable
// Créer/mettre à jour un override de variable
// ──────────────────────────────────────────────────────
router.patch('/override/variable', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const organizationId = user?.organizationId;
    const { variableId, nodeId, treeId, value } = req.body;

    if (!organizationId || !variableId || !treeId) {
      return res.status(400).json({ error: 'Missing required fields: variableId, treeId' });
    }

    // Vérifier que la variable est bien exposée
    const variable = await db.treeBranchLeafNodeVariable.findUnique({
      where: { id: variableId }
    });

    if (!variable || !variable.gestionnaireExposed) {
      return res.status(403).json({ error: 'Variable not exposed to gestionnaire' });
    }

    const override = await db.gestionnaireOverride.upsert({
      where: {
        organizationId_capabilityId: {
          organizationId,
          capabilityId: variableId
        }
      },
      create: {
        organizationId,
        treeId,
        nodeId: nodeId || variable.nodeId,
        capabilityType: 'variable',
        capabilityId: variableId,
        overrideValue: String(value),
        updatedBy: user?.id,
      },
      update: {
        overrideValue: String(value),
        updatedBy: user?.id,
      }
    });

    return res.json({ success: true, override });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error saving variable override:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────
// PATCH + POST /api/gestionnaire/override/constant
// Créer/mettre à jour un override de constante de formule
// (POST alias: FormulaPanel utilise useOptimizedApi qui n'a pas toujours patch)
// ──────────────────────────────────────────────────────
const handleOverrideConstant = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const organizationId = user?.organizationId;
    const { constId, nodeId, treeId, value, label } = req.body;

    if (!organizationId || !constId || !treeId) {
      return res.status(400).json({ error: 'Missing required fields: constId, treeId' });
    }

    // Lire l'override existant pour merger overrideData
    const existing = await db.gestionnaireOverride.findUnique({
      where: { organizationId_capabilityId: { organizationId, capabilityId: constId } }
    });
    const prevData = (existing?.overrideData && typeof existing.overrideData === 'object') ? existing.overrideData as Record<string, unknown> : {};
    const nextData = { ...prevData, ...(label !== undefined ? { label } : {}) };

    const override = await db.gestionnaireOverride.upsert({
      where: {
        organizationId_capabilityId: {
          organizationId,
          capabilityId: constId
        }
      },
      create: {
        organizationId,
        treeId,
        nodeId: nodeId || '',
        capabilityType: 'formula-constant',
        capabilityId: constId,
        overrideValue: value !== undefined ? String(value) : null,
        overrideData: nextData,
        updatedBy: user?.id,
      },
      update: {
        ...(value !== undefined ? { overrideValue: String(value) } : {}),
        overrideData: nextData,
        updatedBy: user?.id,
      }
    });

    return res.json({ success: true, override });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error saving constant override:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
router.patch('/override/constant', handleOverrideConstant);
router.post('/override/constant', handleOverrideConstant);

// ──────────────────────────────────────────────────────
// PATCH /api/gestionnaire/override/table
// Créer/mettre à jour un override de table
// ──────────────────────────────────────────────────────
router.patch('/override/table', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const organizationId = user?.organizationId;
    const { tableId, nodeId, treeId, data } = req.body;

    if (!organizationId || !tableId || !treeId) {
      return res.status(400).json({ error: 'Missing required fields: tableId, treeId' });
    }

    // Vérifier que la table est bien exposée
    const table = await db.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId }
    });

    if (!table || !table.gestionnaireExposed) {
      return res.status(403).json({ error: 'Table not exposed to gestionnaire' });
    }

    const override = await db.gestionnaireOverride.upsert({
      where: {
        organizationId_capabilityId: {
          organizationId,
          capabilityId: tableId
        }
      },
      create: {
        organizationId,
        treeId,
        nodeId: nodeId || table.nodeId,
        capabilityType: 'table',
        capabilityId: tableId,
        overrideData: data,
        updatedBy: user?.id,
      },
      update: {
        overrideData: data,
        updatedBy: user?.id,
      }
    });

    return res.json({ success: true, override });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error saving table override:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────
// DELETE /api/gestionnaire/constant/:constId
// Retirer entièrement une constante du Gestionnaire
// (remet le nombre brut dans les tokens de la formule + supprime l'override)
// ──────────────────────────────────────────────────────
router.delete('/constant/:constId', async (req: Request, res: Response) => {
  try {
    const { constId } = req.params;
    const user = req.user;
    const organizationId = user?.organizationId;
    if (!organizationId || !constId) {
      return res.status(400).json({ error: 'Missing constId' });
    }

    // 1. Trouver la formule qui contient ce @const.{constId}.xxx
    // On cherche dans toutes les formules (on filtre sur le token côté JS)
    const allFormulas = await db.treeBranchLeafNodeFormula.findMany({
      select: { id: true, tokens: true }
    });

    let updated = false;
    for (const formula of allFormulas) {
      const tokens = Array.isArray(formula.tokens) ? formula.tokens as string[] : [];
      const prefix = `@const.${constId}.`;
      const idx = tokens.findIndex(t => typeof t === 'string' && t.startsWith(prefix));
      if (idx >= 0) {
        // Extraire la valeur originale
        const rest = tokens[idx].slice(prefix.length);
        tokens[idx] = rest; // remettre le nombre brut
        await db.treeBranchLeafNodeFormula.update({
          where: { id: formula.id },
          data: { tokens }
        });
        updated = true;
        break;
      }
    }

    // 2. Supprimer l'override s'il existe (deleteMany évite l'erreur si absent)
    await db.gestionnaireOverride.deleteMany({
      where: { organizationId, capabilityId: constId }
    });

    return res.json({ success: true, updated });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error deleting constant:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────
// DELETE /api/gestionnaire/override/:overrideId
// Supprimer un override (revenir à la valeur TBL de base)
// ──────────────────────────────────────────────────────
router.delete('/override/:overrideId', async (req: Request, res: Response) => {
  try {
    const { overrideId } = req.params;
    const user = req.user;
    const organizationId = user?.organizationId;

    const override = await db.gestionnaireOverride.findUnique({
      where: { id: overrideId }
    });

    if (!override || override.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Override not found' });
    }

    await db.gestionnaireOverride.delete({
      where: { id: overrideId }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error deleting override:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────
// PATCH + POST /api/gestionnaire/expose
// Marquer/démarquer un élément comme exposé au gestionnaire (DEV only)
// (POST alias: FormulaPanel utilise useOptimizedApi qui n'a pas toujours patch)
// ──────────────────────────────────────────────────────
const handleExpose = async (req: Request, res: Response) => {
  try {
    const { capabilityType, capabilityId, exposed, label } = req.body;

    if (!capabilityType || !capabilityId) {
      return res.status(400).json({ error: 'Missing capabilityType and capabilityId' });
    }

    if (capabilityType === 'variable') {
      const updated = await db.treeBranchLeafNodeVariable.update({
        where: { id: capabilityId },
        data: {
          gestionnaireExposed: exposed !== false,
          gestionnaireLabel: label || null,
        }
      });
      return res.json({ success: true, updated });
    }

    if (capabilityType === 'table') {
      const updated = await db.treeBranchLeafNodeTable.update({
        where: { id: capabilityId },
        data: {
          gestionnaireExposed: exposed !== false,
          gestionnaireLabel: label || null,
        }
      });
      return res.json({ success: true, updated });
    }

    return res.status(400).json({ error: 'Invalid capabilityType. Must be "variable" or "table"' });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error toggling expose:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
router.patch('/expose', handleExpose);
router.post('/expose', handleExpose);

// ──────────────────────────────────────────────────────
// GET /api/gestionnaire/exposed-tokens/:treeId
// Retourne la liste des tokens (variableIds) exposés au gestionnaire
// Utilisé par le frontend pour savoir quels tokens colorer en noir
// ──────────────────────────────────────────────────────
router.get('/exposed-tokens/:treeId', async (req: Request, res: Response) => {
  try {
    const { treeId } = req.params;

    const exposedVariables = await db.treeBranchLeafNodeVariable.findMany({
      where: {
        gestionnaireExposed: true,
        TreeBranchLeafNode: { treeId }
      },
      select: { id: true, nodeId: true, gestionnaireLabel: true }
    });

    const exposedTables = await db.treeBranchLeafNodeTable.findMany({
      where: {
        gestionnaireExposed: true,
        TreeBranchLeafNode: { treeId }
      },
      select: { id: true, nodeId: true, gestionnaireLabel: true }
    });

    // Construire un Set de nodeIds exposés (pour que FormulaPanel sache)
    const exposedNodeIds = new Set<string>();
    const exposedMap: Record<string, { type: string; id: string; label: string | null }> = {};

    exposedVariables.forEach(v => {
      exposedNodeIds.add(v.nodeId);
      exposedMap[v.nodeId] = { type: 'variable', id: v.id, label: v.gestionnaireLabel };
    });

    exposedTables.forEach(t => {
      exposedNodeIds.add(t.nodeId);
      exposedMap[t.nodeId] = { type: 'table', id: t.id, label: t.gestionnaireLabel };
    });

    return res.json({
      exposedNodeIds: Array.from(exposedNodeIds),
      exposedMap,
      variables: exposedVariables,
      tables: exposedTables,
    });
  } catch (error) {
    console.error('[GESTIONNAIRE] Error fetching exposed tokens:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
