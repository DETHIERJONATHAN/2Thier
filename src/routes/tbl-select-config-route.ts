
import { Router } from 'express';
import { db } from '../lib/database';
import { getAuthCtx } from './utils/getAuthCtx';
import { shouldAutoCreateSelectConfig } from '../components/TreeBranchLeaf/treebranchleaf-new/api/shared/select-config-policy';

const router = Router();

/**
 * GET /api/treebranchleaf/nodes/:nodeId/select-config
 * 
 * Récupère la configuration SELECT d'un nœud spécifique.
 * Cette route est cruciale pour le rendu des champs de type <select> et des lookups.
 * Elle contient une logique "duplication-aware" pour gérer correctement les champs copiés.
 */
router.get('/nodes/:nodeId/select-config', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req);

    // 1. Extraire l'ID de base et le suffixe de duplication
    const match = nodeId.match(/^(.*?)(-\d+)?$/);
    const baseNodeId = match ? match[1] : nodeId;
    const isDuplicated = !!(match && match[2]);

    // 2. Récupérer le nœud et sa configuration Select
    // Pour un champ dupliqué, on doit se baser sur le noeud original pour la config.
    const baseNodePromise = db.treeBranchLeafNode.findUnique({
      where: { id: baseNodeId }, // On utilise l'ID de base
      include: {
        TreeBranchLeafSelectConfig: true,
        TreeBranchLeafTree: {
          select: { organizationId: true }
        }
      }
    });

    // On récupère aussi le noeud dupliqué s'il existe, pour ses propriétés spécifiques
    const duplicatedNodePromise = isDuplicated ? db.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    }) : Promise.resolve(null);

    const [baseNode, duplicatedNode] = await Promise.all([baseNodePromise, duplicatedNodePromise]);

    // Le noeud de référence pour la logique est le noeud dupliqué s'il existe, sinon le noeud de base.
    const effectiveNode = duplicatedNode || baseNode;


    if (!effectiveNode) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // 3. Vérifier les permissions
    if (!isSuperAdmin && organizationId && baseNode?.TreeBranchLeafTree?.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Accès non autorisé à ce nœud' });
    }

    // 4. Logique de gestion des champs (dupliqués et non dupliqués)
    if (nodeId.includes('76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9')) {
      console.log(`[INCLINAISON DEBUG] Node ID: ${nodeId}`);
      console.log(`[INCLINAISON DEBUG] Is Duplicated: ${isDuplicated}`);
      console.log(`[INCLINAISON DEBUG] Base Node ID: ${baseNodeId}`);
      console.log(`[INCLINAISON DEBUG] Effective Node:`, effectiveNode ? { id: effectiveNode.id, subType: effectiveNode.subType, table_activeId: effectiveNode.table_activeId } : null);
      console.log(`[INCLINAISON DEBUG] Base Node:`, baseNode ? { id: baseNode.id, subType: baseNode.subType, table_activeId: baseNode.table_activeId, selectConfig: !!baseNode.TreeBranchLeafSelectConfig } : null);
    }

    // 4.1 Logique spécifique pour les champs dupliqués
    if (isDuplicated) {
      const tableId = baseNode.TreeBranchLeafSelectConfig?.tableReference || effectiveNode.table_activeId;
      const tableMeta = tableId ? await db.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        select: { meta: true }
      }) : null;

      const policyCheck = shouldAutoCreateSelectConfig({ node: effectiveNode, tableMeta: tableMeta?.meta as any });

      if (nodeId.includes('76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9')) {
        console.log(`[INCLINAISON DEBUG] Table ID for policy check: ${tableId}`);
        console.log(`[INCLINAISON DEBUG] Table Meta found:`, tableMeta);
        console.log(`[INCLINAISON DEBUG] Policy Result (shouldAutoCreateSelectConfig): ${policyCheck}`);
      }

      // Si la politique indique que ce champ dupliqué ne doit PAS avoir de SelectConfig,
      // on force le rendu en champ normal en ne renvoyant rien.
      if (!policyCheck) {
        if (nodeId.includes('76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9')) {
          console.log(`[INCLINAISON DEBUG] POLITIQUE REFUSÉE. Renvoi d'une erreur 404 pour forcer un champ normal.`);
        }
        return res.status(404).json({
          error: 'Ce champ dupliqué est configuré comme un champ calculé et non un select.',
          isCalculated: true
        });
      }
    }

    // 4.2. Si une config existe (et qu'on n'est pas sorti avant), la renvoyer
    if (baseNode?.TreeBranchLeafSelectConfig) {
      return res.json(baseNode.TreeBranchLeafSelectConfig);
    }

    // 5. Si aucune config n'est trouvée
    return res.status(404).json({ error: 'Aucune configuration de type select trouvée pour ce nœud' });

  } catch (error) {
    const err = error as Error;
    console.error(`[API] Erreur sur GET /nodes/:nodeId/select-config:`, err.message);
    res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
  }
});

export const tblSelectConfigRouter = router;
