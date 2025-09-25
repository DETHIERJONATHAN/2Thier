/**
 * 🌐 TreeBranchLeaf API Service - Backend centralisé
 * 
 * Service backend complet pour TreeBranchLeaf
 * Tout est centralisé dans treebranchleaf-new/
 */

import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../../../../middleware/auth';
import { 
  validateParentChildRelation, 
  getValidationErrorMessage,
  NodeType,
  NodeSubType
} from '../shared/hierarchyRules';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Helper pour unifier le contexte d'auth (org/superadmin) même si req.user est partiel
type MinimalReqUser = { organizationId?: string | null; isSuperAdmin?: boolean; role?: string; userRole?: string };
type MinimalReq = { user?: MinimalReqUser; headers?: Record<string, unknown> };
function getAuthCtx(req: MinimalReq): { organizationId: string | null; isSuperAdmin: boolean } {
  const user: MinimalReqUser = (req && req.user) || {};
  const headerOrg: string | undefined = (req?.headers?.['x-organization-id'] as string)
    || (req?.headers?.['x-organization'] as string)
    || (req?.headers?.['organization-id'] as string);
  const role: string | undefined = user.role || user.userRole;
  const isSuperAdmin = Boolean(user.isSuperAdmin || role === 'super_admin' || role === 'superadmin');
  const organizationId: string | null = (user.organizationId as string) || headerOrg || null;
  return { organizationId, isSuperAdmin };
}

// =============================================================================
// 🛡️ MIDDLEWARE - Sécurité et authentification
// =============================================================================

// Authentification requise pour toutes les routes
router.use(authenticateToken);

// =============================================================================
// 🌳 TREES - Gestion des arbres
// =============================================================================

// GET /api/treebranchleaf/trees - Liste des arbres
router.get('/trees', async (req, res) => {
  try {
    // console.log('🔍 [TBL-ROUTES] GET /trees - DÉBUT de la route'); // ✨ Log réduit
    
    // Déterminer l'organisation depuis l'utilisateur/headers
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    // console.log('🔍 [TBL-ROUTES] Organization ID:', organizationId); // ✨ Log réduit
    // console.log('🔍 [TBL-ROUTES] Is Super Admin:', isSuperAdmin); // ✨ Log réduit
    
    const whereFilter = isSuperAdmin || !organizationId ? {} : { organizationId };
    // console.log(...) // ✨ Log réduit - objet de debug

    // console.log('🔍 [TBL-ROUTES] Arbres trouvés:', trees.length); // ✨ Log réduit
    // console.log('🔍 [TBL-ROUTES] Premier arbre:', trees[0] ? `${trees[0].id} - ${trees[0].name}` : 'Aucun'); // ✨ Log réduit
    if (trees.length > 0) {
      // console.log(...) // ✨ Log réduit - objet de debug
    }

    res.json(trees);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching trees:', error);
    res.status(500).json({ error: 'Impossible de récupérer les arbres' });
  }
});

// GET /api/treebranchleaf/trees/:id - Détails d'un arbre
router.get('/trees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: isSuperAdmin || !organizationId ? { id } : { id, organizationId },
      include: {
        _count: {
          select: {
            TreeBranchLeafNode: true,
            TreeBranchLeafSubmission: true,
          }
        }
      }
    });
    
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    res.json(tree);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching tree:', error);
    res.status(500).json({ error: 'Impossible de récupérer l\'arbre' });
  }
// POST /api/treebranchleaf/trees - Créer un arbre
router.post('/trees', async (req, res) => {
  try {
    const {
      name,
      description,
      category = 'formulaire',
      icon,
      color = '#10b981',
      version = '1.0.0',
      status = 'draft',
      settings = {},
      metadata = {},
  isPublic = false,
  organizationId: bodyOrgId

      } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Le nom de l'arbre est requis" });
    }

  // Déterminer l'organisation cible (header/user d'abord, sinon body)
  const targetOrgId: string | null = (getAuthCtx(req as unknown as MinimalReq).organizationId as string | null) || (typeof bodyOrgId === 'string' ? bodyOrgId : null);
  if (!targetOrgId) {
      return res.status(400).json({ error: "organizationId requis (en-tête x-organization-id ou dans le corps)" });
    }

});
    const id = randomUUID();

    const tree = await prisma.treeBranchLeafTree.create({
      data: {
        id,
    organizationId: targetOrgId,
        name: name.trim(),
        description: description ?? null,
        category,
        icon: icon ?? null,
        color,
        version,
        status,
        settings: settings as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
        isPublic: Boolean(isPublic),
        updatedAt: new Date()
      }
    });
    
    res.status(201).json(tree);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating tree:', error);
    res.status(500).json({ error: 'Impossible de créer l\'arbre' });
  }
// PUT /api/treebranchleaf/trees/:id - Mettre à jour un arbre
router.put('/trees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user!;
    const updateData = req.body;

    // Supprimer les champs non modifiables
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;

    const tree = await prisma.treeBranchLeafTree.updateMany({
      where: { 
        id, 
        organizationId 
    },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    if (tree.count === 0) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Récupérer l'arbre mis à jour
    const updatedTree = await prisma.treeBranchLeafTree.findFirst({
      where: { id, organizationId }
    });
    
    res.json(updatedTree);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating tree:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour l\'arbre' });
  }
// DELETE /api/treebranchleaf/trees/:id - Supprimer un arbre
router.delete('/trees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user!;

    // Supprimer d'abord tous les nœuds associés
    await prisma.treeBranchLeafNode.deleteMany({
      where: { treeId: id }
    });

    // Puis supprimer l'arbre
    const result = await prisma.treeBranchLeafTree.deleteMany({
      where: { 
        id, 
        organizationId 
    }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

});
    res.json({ success: true, message: 'Arbre supprimé avec succès' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting tree:', error);
    res.status(500).json({ error: 'Impossible de supprimer l\'arbre' });
  }
// =============================================================================
// 🍃 NODES - Gestion des nœuds
// =============================================================================

// GET /api/treebranchleaf/trees/:treeId/nodes - Liste des nœuds d'un arbre
router.get('/trees/:treeId/nodes', async (req, res) => {
  try {
    // console.log('🔍 [TBL-ROUTES] GET /trees/:treeId/nodes - DÉBUT'); // ✨ Log réduit
    const { treeId } = req.params;
    // console.log('🔍 [TBL-ROUTES] TreeId:', treeId); // ✨ Log réduit
    
    // Utiliser getAuthCtx au lieu de req.user pour plus de robustesse
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    // console.log('🔍 [TBL-ROUTES] Organization ID:', organizationId); // ✨ Log réduit
    // console.log('🔍 [TBL-ROUTES] Is Super Admin:', isSuperAdmin); // ✨ Log réduit

    // Vérifier que l'arbre appartient à l'organisation (sauf SuperAdmin)
    const treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId };
    // console.log(...) // ✨ Log réduit - objet de debug
    // console.log('🔍 [TBL-ROUTES] Nœuds trouvés:', nodes.length); // ✨ Log réduit

    // 🔄 MIGRATION : Reconstruire les données JSON depuis les colonnes dédiées
    // console.log('🔄 [GET /trees/:treeId/nodes] Reconstruction depuis colonnes pour', nodes.length, 'nœuds'); // ✨ Log réduit
    const reconstructedNodes = nodes.map(node => buildResponseFromColumns(node));

    res.json(reconstructedNodes);
    } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching nodes:', error);
    res.status(500).json({ error: 'Impossible de récupérer les nœuds' });
  }
// POST /api/treebranchleaf/trees/:treeId/nodes - Créer un nœud
router.post('/trees/:treeId/nodes', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { organizationId } = req.user!;
    const nodeData = req.body;

    // console.log('[TreeBranchLeaf API] Creating node:', { treeId, nodeData }); // ✨ Log réduit

    // Vérifier que l'arbre appartient à l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId }
});
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Vérifier les champs obligatoires
    if (!nodeData.type || !nodeData.label) {
      return res.status(400).json({ error: 'Les champs type et label sont obligatoires' });
    }

    // 🚨 VALIDATION DES TYPES AUTORISÉS
    const allowedTypes = [
      'branch',                 // Branche = conteneur hiérarchique
      'section',               // Section calculatrice avec champs d'affichage
      'leaf_field',            // Champ standard (text, email, etc.)
      'leaf_option',           // Option pour un champ SELECT
      'leaf_option_field',     // Option + Champ (combiné) ← ajouté pour débloquer O+C
      'leaf_text',             // Champ texte simple
      'leaf_email',            // Champ email
      'leaf_phone',            // Champ téléphone
      'leaf_date',             // Champ date
      'leaf_number',           // Champ numérique
      'leaf_checkbox',         // Case à cocher
      'leaf_select',           // Liste déroulante
      'leaf_radio'             // Boutons radio
    ];

    if (!allowedTypes.includes(nodeData.type)) {
      return res.status(400).json({ 
        error: `Type de nœud non autorisé: ${nodeData.type}. Types autorisés: ${allowedTypes.join(', ')}` 
    }

    // 🚨 VALIDATION HIÉRARCHIQUE STRICTE - Utilisation des règles centralisées
    if (nodeData.parentId) {
      const parentNode = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeData.parentId, treeId }
});
      if (!parentNode) {
        return res.status(400).json({ error: 'Nœud parent non trouvé' });
      }

      // Convertir les types de nœuds pour utiliser les règles centralisées
      const parentType = parentNode.type as NodeType;
      const parentSubType = parentNode.subType as NodeSubType;
      const childType = nodeData.type as NodeType;
      const childSubType = (nodeData.subType || nodeData.fieldType || 'data') as NodeSubType;

      // Utiliser la validation centralisée
      const validationResult = validateParentChildRelation(
        parentType,
        parentSubType,
        childType,
        childSubType
      );

      if (!validationResult.isValid) {
        const errorMessage = getValidationErrorMessage(
          parentType,
          parentSubType,
          childType,
          childSubType
        );
        // console.log(`[TreeBranchLeaf API] Validation failed: ${errorMessage}`); // ✨ Log réduit
        return res.status(400).json({ 
          error: errorMessage 

      }

      // console.log(`[TreeBranchLeaf API] Validation passed: ${parentType}(${parentSubType}) -> ${childType}(${childSubType})`); // ✨ Log réduit
    } else {
      // Pas de parent = création directement sous l'arbre racine
      // Utiliser la validation centralisée pour vérifier si c'est autorisé
      const childType = nodeData.type as NodeType;
      const childSubType = (nodeData.subType || nodeData.fieldType || 'data') as NodeSubType;

      const validationResult = validateParentChildRelation(
        'tree',
        'data',
        childType,
        childSubType
      );

      if (!validationResult.isValid) {
        const errorMessage = getValidationErrorMessage(
          'tree',
          'data',
          childType,
          childSubType
        );
        // console.log(`[TreeBranchLeaf API] Root validation failed: ${errorMessage}`); // ✨ Log réduit
        return res.status(400).json({ 
          error: errorMessage 

      }

      // console.log(`[TreeBranchLeaf API] Root validation passed: tree -> ${childType}(${childSubType})`); // ✨ Log réduit
    }

    // Générer un ID unique pour le nœud
    const { randomUUID } = await import('crypto');
    const nodeId = randomUUID();

    const node = await prisma.treeBranchLeafNode.create({
      data: {
        id: nodeId,
        treeId,
        type: nodeData.type,
        subType: nodeData.subType || nodeData.fieldType || 'data',
        label: nodeData.label,
        description: nodeData.description || null,
        parentId: nodeData.parentId || null,
        order: nodeData.order ?? 0,
  isVisible: nodeData.isVisible ?? true,
  isActive: nodeData.isActive ?? true,
  // Par défaut, AUCUNE capacité n'est activée automatiquement
  hasData: nodeData.hasData ?? false,
  hasFormula: nodeData.hasFormula ?? false,
  hasCondition: nodeData.hasCondition ?? false,
  hasTable: nodeData.hasTable ?? false,
  hasAPI: nodeData.hasAPI ?? false,
  hasLink: nodeData.hasLink ?? false,
  hasMarkers: nodeData.hasMarkers ?? false,
        metadata: nodeData.metadata ?? {},
        updatedAt: new Date()

      }
    // console.log('[TreeBranchLeaf API] Node created successfully:', node.id); // ✨ Log réduit
    res.status(201).json(node);
    } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node:', error);
    res.status(500).json({ error: 'Impossible de créer le nœud' });
  }
// ============================================================================= 
// 🔄 HELPER : Conversion JSON metadata vers colonnes dédiées
// =============================================================================

/**
 * Convertit les données JSON des metadata vers les nouvelles colonnes dédiées
 */
// =============================================================================
// 🔄 MIGRATION JSON → COLONNES DÉDIÉES
// =============================================================================

/**
 * 🔄 STRATÉGIE MIGRATION : JSON → Colonnes dédiées
 * Extraite TOUTES les données depuis metadata et fieldConfig pour les mapper vers les nouvelles colonnes
 * OBJECTIF : Plus jamais de JSON, une seule source de vérité
 */
function mapJSONToColumns(updateData: Record<string, unknown>): Record<string, unknown> {
  const columnData: Record<string, unknown> = {};
  
  // Extraire les metadata et fieldConfig si présentes
  const metadata = (updateData.metadata as any) || {};
  const fieldConfig = (updateData.fieldConfig as any) || {};
  
  // ✅ ÉTAPE 1 : Migration depuis metadata.appearance
  if (metadata.appearance) {
    if (metadata.appearance.size) columnData.appearance_size = metadata.appearance.size;
    if (metadata.appearance.width) columnData.appearance_width = metadata.appearance.width;
    if (metadata.appearance.variant) columnData.appearance_variant = metadata.appearance.variant;
    }
  
  // ✅ ÉTAPE 2 : Migration configuration champs texte
  const textConfig = metadata.textConfig || fieldConfig.text || fieldConfig.textConfig || {};
  if (Object.keys(textConfig).length > 0) {
    if (textConfig.placeholder) columnData.text_placeholder = textConfig.placeholder;
    if (textConfig.maxLength) columnData.text_maxLength = textConfig.maxLength;
    if (textConfig.minLength) columnData.text_minLength = textConfig.minLength;
    if (textConfig.mask) columnData.text_mask = textConfig.mask;
    if (textConfig.regex) columnData.text_regex = textConfig.regex;
    if (textConfig.rows) columnData.text_rows = textConfig.rows;
  }
  
  // ✅ ÉTAPE 3 : Migration configuration champs nombre
  const numberConfig = metadata.numberConfig || fieldConfig.number || fieldConfig.numberConfig || {};
  if (Object.keys(numberConfig).length > 0) {
    if (numberConfig.min !== undefined) columnData.number_min = numberConfig.min;
    if (numberConfig.max !== undefined) columnData.number_max = numberConfig.max;
    if (numberConfig.step !== undefined) columnData.number_step = numberConfig.step;
    if (numberConfig.decimals !== undefined) columnData.number_decimals = numberConfig.decimals;
    if (numberConfig.prefix) columnData.number_prefix = numberConfig.prefix;
    if (numberConfig.suffix) columnData.number_suffix = numberConfig.suffix;
    if (numberConfig.unit) columnData.number_unit = numberConfig.unit;
    if (numberConfig.defaultValue !== undefined) columnData.number_defaultValue = numberConfig.defaultValue;
  }
  
  // ✅ ÉTAPE 4 : Migration configuration champs sélection
  const selectConfig = metadata.selectConfig || fieldConfig.select || fieldConfig.selectConfig || {};
  if (Object.keys(selectConfig).length > 0) {
    if (selectConfig.multiple !== undefined) columnData.select_multiple = selectConfig.multiple;
    if (selectConfig.searchable !== undefined) columnData.select_searchable = selectConfig.searchable;
    if (selectConfig.allowClear !== undefined) columnData.select_allowClear = selectConfig.allowClear;
    if (selectConfig.defaultValue) columnData.select_defaultValue = selectConfig.defaultValue;
    if (selectConfig.options) columnData.select_options = selectConfig.options;
  }
  
  // ✅ ÉTAPE 5 : Migration configuration champs booléen
  const boolConfig = metadata.boolConfig || fieldConfig.bool || fieldConfig.boolConfig || {};
  if (Object.keys(boolConfig).length > 0) {
    if (boolConfig.trueLabel) columnData.bool_trueLabel = boolConfig.trueLabel;
    if (boolConfig.falseLabel) columnData.bool_falseLabel = boolConfig.falseLabel;
    if (boolConfig.defaultValue !== undefined) columnData.bool_defaultValue = boolConfig.defaultValue;
  }
  
  // ✅ ÉTAPE 6 : Migration configuration champs date
  const dateConfig = metadata.dateConfig || fieldConfig.date || fieldConfig.dateConfig || {};
  if (Object.keys(dateConfig).length > 0) {
    if (dateConfig.format) columnData.date_format = dateConfig.format;
    if (dateConfig.showTime !== undefined) columnData.date_showTime = dateConfig.showTime;
    if (dateConfig.minDate) columnData.date_minDate = new Date(dateConfig.minDate);
    if (dateConfig.maxDate) columnData.date_maxDate = new Date(dateConfig.maxDate);
  }
  
  // ✅ ÉTAPE 7 : Migration configuration champs image
  const imageConfig = metadata.imageConfig || fieldConfig.image || fieldConfig.imageConfig || {};
  if (Object.keys(imageConfig).length > 0) {
    if (imageConfig.maxSize) columnData.image_maxSize = imageConfig.maxSize;
    if (imageConfig.ratio) columnData.image_ratio = imageConfig.ratio;
    if (imageConfig.crop !== undefined) columnData.image_crop = imageConfig.crop;
    if (imageConfig.thumbnails) columnData.image_thumbnails = imageConfig.thumbnails;
  }
  
  // ✅ ÉTAPE 8 : Types de champs spécifiques
  if (updateData.fieldType) columnData.fieldType = updateData.fieldType;
  if (updateData.fieldSubType) columnData.fieldSubType = updateData.fieldSubType;
  if (updateData.subType) columnData.fieldSubType = updateData.subType;
  if (updateData.type) columnData.fieldType = updateData.type;
  
  // console.log(...) // ✨ Log réduit - objet de debug
  
  // Mettre à jour les métadonnées avec les nouvelles données
  const cleanedMetadata = {
    ...(node.metadata || {}),
    appearance
  };
  
  return {
    ...node,
    metadata: cleanedMetadata,
    fieldConfig,
    // Ajouter les champs d'interface pour compatibilité
    appearance,
    // ⚠️ IMPORTANT : fieldType depuis les colonnes dédiées
    fieldType: node.fieldType || node.type,
    fieldSubType: node.fieldSubType || node.subType

      };
}

// =============================================================================
// 🔄 FONCTIONS UTILITAIRES POUR COLONNES
// =============================================================================

/**
 * ⚡ PRÉSERVER LES CAPABILITIES : Écriture hybride colonnes + metadata
 * Préserve metadata.capabilities (formules multiples, etc.) tout en migrant le reste vers les colonnes
 */
function removeJSONFromUpdate(updateData: Record<string, unknown>): Record<string, unknown> {
  const { metadata, fieldConfig, ...cleanData } = updateData;
  
  // 🔥 CORRECTION : Préserver metadata.capabilities pour les formules multiples
  if (metadata && typeof metadata === 'object' && (metadata as any).capabilities) {
    return {
      ...cleanData,
      metadata: {
        capabilities: (metadata as any).capabilities

      }
    };
  }
  
});
  return cleanData;
}

// Handler commun pour UPDATE/PATCH d'un nœud (incluant le déplacement avec réindexation)
const updateOrMoveNode = async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;
  const updateData = req.body || {};
  
  // console.log(...) // ✨ Log réduit - objet de debug

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

  // Supprimer les champs non modifiables
  delete updateObj.id;
  delete updateObj.treeId;
  delete updateObj.createdAt;

    // Charger le nœud existant (sera nécessaire pour la validation et la logique de déplacement)
    const existingNode = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId, treeId }
});
    if (!existingNode) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // Extraire paramètres potentiels de déplacement
  const targetId: string | undefined = updateData.targetId;
  const position: 'before' | 'after' | 'child' | undefined = updateData.position;

    // Si targetId/position sont fournis, on calcule parentId/insertIndex à partir de ceux-ci
    let newParentId: string | null | undefined = updateData.parentId; // undefined = pas de changement
    let desiredIndex: number | undefined = undefined; // index parmi les siblings (entier)

    if (targetId) {
      const targetNode = await prisma.treeBranchLeafNode.findFirst({ where: { id: targetId, treeId } });
      if (!targetNode) {
        return res.status(400).json({ error: 'Cible de déplacement non trouvée' });
      }
});
      if (position === 'child') {
        newParentId = targetNode.id; // enfant direct
        // on met à la fin par défaut (sera calculé plus bas)
        desiredIndex = undefined;
      } else {
        // before/after -> même parent que la cible
        newParentId = targetNode.parentId || null;
        // index désiré relatif à la cible (sera calculé plus bas)
        // on signalera via un flag spécial pour ajuster après
        desiredIndex = -1; // marqueur: calculer en fonction de la cible

      }
    }

  // 🚨 VALIDATION HIÉRARCHIQUE si on change le parentId (déplacement)
    if (newParentId !== undefined) {
      // Récupérer le nœud existant pour connaître son type
      // existingNode déjà chargé ci-dessus

      // Si on change le parent, appliquer les mêmes règles hiérarchiques que pour la création
      if (newParentId) {
        // Récupérer le nouveau parent
        const newParentNode = await prisma.treeBranchLeafNode.findFirst({
          where: { id: newParentId, treeId }
});
        if (!newParentNode) {
          return res.status(400).json({ error: 'Parent non trouvé' });
        }

        // Appliquer les règles hiérarchiques actualisées
        if (existingNode.type === 'leaf_option') {
          // Les options ne peuvent être que sous des champs SELECT
          if (!newParentNode.type.startsWith('leaf_') || newParentNode.subType !== 'SELECT') {
            return res.status(400).json({ 
              error: 'Les options ne peuvent être déplacées que sous des champs de type SELECT' 

      }
        } else if (existingNode.type.startsWith('leaf_')) {
          // Les champs peuvent être sous des branches ou d'autres champs
          if (newParentNode.type !== 'branch' && !newParentNode.type.startsWith('leaf_')) {
            return res.status(400).json({ 
              error: 'Les champs ne peuvent être déplacés que sous des branches ou d\'autres champs' 

      }
        } else if (existingNode.type === 'branch') {
          // Les branches peuvent être sous l'arbre ou sous une autre branche
          if (!(newParentNode.type === 'tree' || newParentNode.type === 'branch')) {
            return res.status(400).json({ 
              error: 'Les branches doivent être sous l\'arbre ou sous une autre branche' 

      }
        }
      } else {
        // parentId null = déplacement vers la racine
        // Seules les branches peuvent être directement sous l'arbre racine
        if (existingNode.type !== 'branch') {
          return res.status(400).json({ 
            error: 'Seules les branches peuvent être déplacées directement sous l\'arbre racine (niveau 2)' 

      }
      }
    }

    // Déterminer si on doit effectuer une opération de déplacement avec réindexation
  const isMoveOperation = (targetId && position) || (newParentId !== undefined) || (typeof updateObj.order === 'number');

    if (isMoveOperation) {
      // Calculer le parent cible final et la position d'insertion (index entier)
      const destinationParentId = newParentId !== undefined ? newParentId : existingNode.parentId;

      // Récupérer tous les siblings de la destination (exclure le nœud en mouvement)
      const siblings = await prisma.treeBranchLeafNode.findMany({
        where: { treeId, parentId: destinationParentId || null, NOT: { id: nodeId } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      let insertIndex: number;
      if (targetId && (position === 'before' || position === 'after')) {
        const idx = siblings.findIndex(s => s.id === targetId);
        // si la cible n'est pas un sibling (ex: child), idx sera -1; fallback fin
        if (idx >= 0) {
          insertIndex = position === 'before' ? idx : idx + 1;
    } else {
          insertIndex = siblings.length;
        }
      } else if (position === 'child') {
        insertIndex = siblings.length; // à la fin sous ce parent
      } else if (typeof updateObj.order === 'number') {
        // Si on reçoit un order numérique, on tente d'insérer au plus proche (borné entre 0 et len)
        insertIndex = Math.min(Math.max(Math.round(updateObj.order as number), 0), siblings.length);
      } else if (desiredIndex !== undefined && desiredIndex >= 0) {
        insertIndex = Math.min(Math.max(desiredIndex, 0), siblings.length);
      } else {
        insertIndex = siblings.length; // défaut = fin
      }

      // Construire l'ordre final des IDs (siblings + nodeId inséré)
      const finalOrder = [...siblings.map(s => s.id)];
      finalOrder.splice(insertIndex, 0, nodeId);

      // Effectuer la transaction: mettre à jour parentId du nœud + réindexer les orders entiers
      await prisma.$transaction(async (tx) => {
        // Mettre à jour parentId si nécessaire
        if (destinationParentId !== existingNode.parentId) {
          await tx.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: { parentId: destinationParentId || null, updatedAt: new Date() }
        }

        // Réindexer: donner des valeurs entières 0..N
        for (let i = 0; i < finalOrder.length; i++) {
          const id = finalOrder[i];
          await tx.treeBranchLeafNode.update({
            where: { id },
            data: { order: i, updatedAt: new Date() }
        }
});
      const updatedNode = await prisma.treeBranchLeafNode.findFirst({ where: { id: nodeId, treeId } });
      
      // console.log('🔄 [updateOrMoveNode] APRÈS déplacement - reconstruction depuis colonnes'); // ✨ Log réduit
      const responseData = updatedNode ? buildResponseFromColumns(updatedNode) : updatedNode;
      
      return res.json(responseData);
    }

    // Cas simple: pas de déplacement → mise à jour directe
    const result = await prisma.treeBranchLeafNode.updateMany({
      where: { id: nodeId, treeId },
      data: { ...(updateObj as Prisma.TreeBranchLeafNodeUpdateManyMutationInput), updatedAt: new Date() }
});
    if (result.count === 0) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    const updatedNode = await prisma.treeBranchLeafNode.findFirst({ where: { id: nodeId, treeId } });
    
    // console.log('🔄 [updateOrMoveNode] APRÈS mise à jour - reconstruction depuis colonnes'); // ✨ Log réduit
    const responseData = updatedNode ? buildResponseFromColumns(updatedNode) : updatedNode;
    
    return res.json(responseData);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour le nœud' });
  }
};

// PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId - Mettre à jour un nœud
router.put('/trees/:treeId/nodes/:nodeId', updateOrMoveNode);
// PATCH (alias) pour compatibilité côté client
router.patch('/trees/:treeId/nodes/:nodeId', updateOrMoveNode);

// DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId - Supprimer un nœud
router.delete('/trees/:treeId/nodes/:nodeId', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;

    // Vérifier que l'arbre appartient à l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId }
});
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

});
    const result = await prisma.treeBranchLeafNode.deleteMany({
      where: { 
        id: nodeId, 
        treeId 
    }
});
    if (result.count === 0) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    res.json({ success: true, message: 'Nœud supprimé avec succès' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node:', error);
    res.status(500).json({ error: 'Impossible de supprimer le nœud' });
  }
// =============================================================================
// � NODE INFO - Infos d'un nœud par ID
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId
// Retourne des infos minimales du nœud (pour récupérer le treeId depuis nodeId)
router.get('/nodes/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        id: true,
        treeId: true,
        parentId: true,
        type: true,
        subType: true,
        label: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
});
    if (!node) return res.status(404).json({ error: 'Nœud non trouvé' });
    // Autoriser si super admin ou si aucune organisation n'est fournie (mode dev),
    // sinon vérifier la correspondance des organisations
    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    return res.json({ id: node.id, treeId: node.treeId, parentId: node.parentId, type: node.type, subType: node.subType, label: node.label });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node info:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du nœud' });
  }
// =============================================================================
// �🔢 NODE DATA (VARIABLE EXPOSÉE) - Donnée d'un nœud
// =============================================================================

// GET /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// Récupère la configuration "donnée" (variable exposée) d'un nœud
router.get('/trees/:treeId/nodes/:nodeId/data', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;

    // Vérifier l'appartenance de l'arbre à l'organisation (ou accès super admin)
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
});
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Vérifier que le nœud existe dans cet arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        treeId
      },
      select: { id: true },
    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId },
      select: {
        exposedKey: true,
        displayFormat: true,
        unit: true,
        precision: true,
        visibleToUser: true,
        isReadonly: true,
        defaultValue: true,
        metadata: true
      },
    // Retourner un objet vide si aucune variable n'existe encore (évite les 404 côté client)
    return res.json(variable || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node data:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la donnée du nœud' });
  }
// =============================================================================
// ⚖️ NODE CONDITIONS - Conditions IF/ELSE d'un nœud
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/conditions
// Récupère la configuration des conditions d'un nœud (JSON libre pour l'instant)
// (Moved export to bottom so routes below are mounted)

// PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// Crée/met à jour la configuration "donnée" (variable exposée) d'un nœud
router.put('/trees/:treeId/nodes/:nodeId/data', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;
    const { exposedKey, displayFormat, unit, precision, visibleToUser, isReadonly, defaultValue, metadata } = req.body || {};

    // Vérifier l'appartenance de l'arbre à l'organisation (ou accès super admin)
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
});
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Vérifier que le nœud existe dans cet arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        treeId
      },
      select: { id: true, label: true },
    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // Normalisation des valeurs
    const safeExposedKey: string | null = typeof exposedKey === 'string' && exposedKey.trim() ? exposedKey.trim() : null;
    const displayName = safeExposedKey || node.label || `var_${String(nodeId).slice(0, 4)}`;

    const updated = await prisma.treeBranchLeafNodeVariable.upsert({
      where: { nodeId },
      update: {
        exposedKey: safeExposedKey || undefined,
        displayName,
        displayFormat: typeof displayFormat === 'string' ? displayFormat : undefined,
        unit: typeof unit === 'string' ? unit : undefined,
        precision: typeof precision === 'number' ? precision : undefined,
        visibleToUser: typeof visibleToUser === 'boolean' ? visibleToUser : undefined,
        isReadonly: typeof isReadonly === 'boolean' ? isReadonly : undefined,
        defaultValue: typeof defaultValue === 'string' ? defaultValue : undefined,
        metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
        updatedAt: new Date()
      },
      create: {
        id: randomUUID(),
        nodeId,
        exposedKey: safeExposedKey || `var_${String(nodeId).slice(0, 4)}`,
        displayName,
        displayFormat: typeof displayFormat === 'string' ? displayFormat : 'number',
        unit: typeof unit === 'string' ? unit : null,
        precision: typeof precision === 'number' ? precision : 2,
        visibleToUser: typeof visibleToUser === 'boolean' ? visibleToUser : true,
        isReadonly: typeof isReadonly === 'boolean' ? isReadonly : false,
        defaultValue: typeof defaultValue === 'string' ? defaultValue : null,
        metadata: metadata && typeof metadata === 'object' ? metadata : {}
      },
      select: {
        exposedKey: true,
        displayFormat: true,
        unit: true,
        precision: true,
        visibleToUser: true,
        isReadonly: true,
        defaultValue: true,
        metadata: true
      },
    // Marquer le nœud comme ayant des données configurées (capacité "Donnée" active)
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { hasData: true, updatedAt: new Date() }
});
    return res.json(updated);
  } catch (error) {
    const err = error as unknown as { code?: string };
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'La variable exposée (exposedKey) existe déjà' });
    }
    console.error('[TreeBranchLeaf API] Error updating node data:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la donnée du nœud' });
  }
// =============================================================================
// ⚖️ NODE CONDITIONS - Conditions d'un nœud
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/conditions
// ANCIENNE ROUTE COMMENTÉE - Utilisait conditionConfig du nœud directement
// Maintenant nous utilisons la table TreeBranchLeafNodeCondition (voir ligne ~1554)
/*
router.get('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    // Charger le nœud et vérifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        conditionConfig: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
});
    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    return res.json(node.conditionConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des conditions du nœud' });
  }
*/

// PUT /api/treebranchleaf/nodes/:nodeId/conditions
// Met à jour (ou crée) la configuration de conditions d'un nœud
router.put('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };
    const payload = req.body ?? {};

    // Valider grossièrement le payload (doit être un objet JSON)
    const isObject = payload && typeof payload === 'object' && !Array.isArray(payload);
    if (!isObject) {
      return res.status(400).json({ error: 'Payload de conditions invalide' });
    }

    // Charger le nœud et vérifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: { id: true, TreeBranchLeafTree: { select: { organizationId: true } } }
});
    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        conditionConfig: payload as Prisma.InputJsonValue,
        hasCondition: true,
        updatedAt: new Date()

      },
      select: { conditionConfig: true, hasCondition: true }
});
    return res.json(updated.conditionConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des conditions du nœud' });
  }
// =============================================================================
// 🧮 NODE FORMULA - Formule d'un nœud
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/formula
// Récupère la configuration de formule d'un nœud (formulaConfig)
router.get('/nodes/:nodeId/formula', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    // Charger le nœud et vérifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        formulaConfig: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
});
    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    return res.json(node.formulaConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la formule du nœud' });
  }
// PUT /api/treebranchleaf/nodes/:nodeId/formula
// Met à jour (ou crée) la configuration de formule d'un nœud
router.put('/nodes/:nodeId/formula', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };
    const payload = req.body ?? {};

    // Valider grossièrement le payload (doit être un objet JSON)
    const isObject = payload && typeof payload === 'object' && !Array.isArray(payload);
    if (!isObject) {
      return res.status(400).json({ error: 'Payload de formule invalide' });
    }

    // Charger le nœud et vérifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: { id: true, TreeBranchLeafTree: { select: { organizationId: true } } }
});
    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

});
    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        formulaConfig: payload as Prisma.InputJsonValue,
        hasFormula: true,
        updatedAt: new Date()

      },
      select: { formulaConfig: true, hasFormula: true }
});
    return res.json(updated.formulaConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule du nœud' });
  }
// =============================================================================
// 🧮 NODE FORMULAS - Formules spécifiques à un nœud (nouvelle table dédiée)
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/formulas
// Liste les formules spécifiques à un nœud
router.get('/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Récupérer les formules de ce nœud
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'asc' }
    // console.log(`[TreeBranchLeaf API] Formulas for node ${nodeId}:`, formulas.length); // ✨ Log réduit
    return res.json({ formulas });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node formulas:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des formules du nœud' });
  }
// POST /api/treebranchleaf/nodes/:nodeId/formulas
// Crée une nouvelle formule pour un nœud
router.post('/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, tokens, description } = req.body || {};
    // console.log(...) // ✨ Log réduit - objet de debug
        
        if (!existingFormula) {
          break; // Le nom est disponible
        }
        
        // Si le nom existe, ajouter un suffixe numérique
        uniqueName = `${name} (${counter})`;
        counter++;
        
      } catch (error) {
        console.error('Erreur lors de la vérification du nom de formule:', error);
        break;
    }
    }

});
    const formula = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: randomUUID(),
        nodeId,
        organizationId: organizationId || null,
        name: uniqueName,
        tokens: tokens as unknown as Prisma.InputJsonValue,
        description: description ? String(description) : null,
        updatedAt: new Date()

      }
    // console.log(`[TreeBranchLeaf API] Created formula for node ${nodeId}:`, formula.name); // ✨ Log réduit
    return res.status(201).json(formula);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la formule' });
  }
// PUT /api/treebranchleaf/nodes/:nodeId/formulas/:formulaId
// Met à jour une formule spécifique
router.put('/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, tokens, description } = req.body || {};

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que la formule appartient bien à ce nœud
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
      where: { id: formulaId, nodeId }
});
    if (!existingFormula) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

});
    const updated = await prisma.treeBranchLeafNodeFormula.update({
      where: { id: formulaId },
      data: {
        name: name ? String(name) : undefined,
        tokens: Array.isArray(tokens) ? (tokens as unknown as Prisma.InputJsonValue) : undefined,
        description: description !== undefined ? (description ? String(description) : null) : undefined,
        updatedAt: new Date()

      }
    // console.log(`[TreeBranchLeaf API] Updated formula ${formulaId} for node ${nodeId}`); // ✨ Log réduit
    return res.json(updated);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule' });
  }
// DELETE /api/treebranchleaf/nodes/:nodeId/formulas/:formulaId
// Supprime une formule spécifique
router.delete('/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que la formule appartient bien à ce nœud
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
      where: { id: formulaId, nodeId }
});
    if (!existingFormula) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    await prisma.treeBranchLeafNodeFormula.delete({
      where: { id: formulaId }
    // console.log(`[TreeBranchLeaf API] Deleted formula ${formulaId} for node ${nodeId}`); // ✨ Log réduit
    return res.json({ success: true, message: 'Formule supprimée avec succès' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la formule' });
  }
// =============================================================================
// 📚 REUSABLE FORMULAS - Formules réutilisables (persistance Prisma)
// =============================================================================

// GET /api/treebranchleaf/reusables/formulas
// Liste TOUTES les formules de TreeBranchLeafNodeFormula (toutes sont réutilisables !)
router.get('/reusables/formulas', async (req, res) => {
  try {
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const hasOrg = typeof organizationId === 'string' && organizationId.length > 0;

    // Formules de nœuds (toutes sont réutilisables)
    const whereFilter = isSuperAdmin
      ? {}
      : {
          OR: [
            { organizationId: null },
            ...(hasOrg ? [{ organizationId }] : [])
          ]
        };

    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: whereFilter,
      include: {
        node: {
          select: {
            label: true,
            treeId: true

      }
        }
      },
      orderBy: { createdAt: 'desc' }
    // Ajouter les métadonnées pour le frontend
    const items = allFormulas.map(f => ({
      ...f,
      type: 'node',
      nodeLabel: f.node?.label || 'Nœud inconnu',
      treeId: f.node?.treeId || null

      }));

  // console.log(...) // ✨ Log réduit - objet de debug

// GET /api/treebranchleaf/reusables/formulas/:id
// Récupère une formule spécifique par son ID depuis TreeBranchLeafNodeFormula
router.get('/reusables/formulas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    const item = await prisma.treeBranchLeafNodeFormula.findUnique({ 
      where: { id },
      include: {
        node: {
          select: {
            label: true,
            treeId: true

      }
        }
      }
});
    if (!item) return res.status(404).json({ error: 'Formule non trouvée' });

    if (!isSuperAdmin) {
      // Autorisé si globale ou même organisation
      if (item.organizationId && item.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }

});
    return res.json({
      ...item,
      type: 'node',
      nodeLabel: item.node?.label || 'Nœud inconnu',
      treeId: item.node?.treeId || null

      } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting formula:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la formule' });
  }
// =============================================================================
// ⚖️ NODE CONDITIONS - Conditions spécifiques à un nœud (nouvelle table dédiée)
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/conditions
// Liste les conditions spécifiques à un nœud
router.get('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // console.log(`[TreeBranchLeaf API] 🔍 GET conditions for node ${nodeId}:`); // ✨ Log réduit
    // console.log(`[TreeBranchLeaf API] - organizationId: ${organizationId}`); // ✨ Log réduit
    // console.log(`[TreeBranchLeaf API] - isSuperAdmin: ${isSuperAdmin}`); // ✨ Log réduit

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Récupérer les conditions de ce nœud avec filtre d'organisation
    const whereClause: { nodeId: string; organizationId?: string } = { nodeId };
    
    // Ajouter le filtre d'organisation si ce n'est pas un super admin
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // console.log(...) // ✨ Log réduit - objet de debug

    // console.log(`[TreeBranchLeaf API] Conditions for node ${nodeId} (org: ${organizationId}):`, conditions.length); // ✨ Log réduit
    // console.log(`[TreeBranchLeaf API] Details:`, conditions.map(c => ({ id: c.id, name: c.name, organizationId: c.organizationId }))); // ✨ Log réduit
    
    return res.json({ conditions });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des conditions du nœud' });
  }
// POST /api/treebranchleaf/nodes/:nodeId/conditions
// Crée une nouvelle condition pour un nœud
router.post('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, conditionSet, description } = req.body || {};
    // console.log(...) // ✨ Log réduit - objet de debug
      
      if (!existingCondition) {
        break; // Le nom est unique
      }
      
      // Le nom existe, ajouter un numéro
      uniqueName = `${name} (${counter})`;
      counter++;
      
      // Sécurité: éviter une boucle infinie
      if (counter > 100) {
        uniqueName = `${name} (${Date.now()})`;
        break;
      }
    }

    // console.log(`[TreeBranchLeaf API] Nom unique généré: "${uniqueName}" (original: "${name}")`); // ✨ Log réduit

    const condition = await prisma.treeBranchLeafNodeCondition.create({
      data: {
        id: randomUUID(),
        nodeId,
        organizationId: organizationId || null,
        name: uniqueName,
        conditionSet: conditionSet as unknown as Prisma.InputJsonValue,
        description: description ? String(description) : null,
        updatedAt: new Date()

      }
    // console.log(`[TreeBranchLeaf API] Created condition for node ${nodeId}:`, condition.name); // ✨ Log réduit
    return res.status(201).json(condition);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node condition:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la condition' });
  }
// PUT /api/treebranchleaf/nodes/:nodeId/conditions/:conditionId
// Met à jour une condition spécifique
router.put('/nodes/:nodeId/conditions/:conditionId', async (req, res) => {
  try {
    const { nodeId, conditionId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, conditionSet, description } = req.body || {};

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que la condition appartient bien à ce nœud
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findFirst({
      where: { id: conditionId, nodeId }
});
    if (!existingCondition) {
      return res.status(404).json({ error: 'Condition non trouvée' });
    }

});
    const updated = await prisma.treeBranchLeafNodeCondition.update({
      where: { id: conditionId },
      data: {
        name: name ? String(name) : undefined,
        conditionSet: conditionSet ? (conditionSet as unknown as Prisma.InputJsonValue) : undefined,
        description: description !== undefined ? (description ? String(description) : null) : undefined,
        updatedAt: new Date()

      }
    // console.log(`[TreeBranchLeaf API] Updated condition ${conditionId} for node ${nodeId}`); // ✨ Log réduit
    return res.json(updated);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node condition:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la condition' });
  }
// DELETE /api/treebranchleaf/nodes/:nodeId/conditions/:conditionId
// Supprime une condition spécifique
router.delete('/nodes/:nodeId/conditions/:conditionId', async (req, res) => {
  try {
    const { nodeId, conditionId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que la condition appartient bien à ce nœud
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findFirst({
      where: { id: conditionId, nodeId }
});
    if (!existingCondition) {
      return res.status(404).json({ error: 'Condition non trouvée' });
    }

    await prisma.treeBranchLeafNodeCondition.delete({
      where: { id: conditionId }
    // console.log(`[TreeBranchLeaf API] Deleted condition ${conditionId} for node ${nodeId}`); // ✨ Log réduit
    return res.json({ success: true, message: 'Condition supprimée avec succès' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node condition:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la condition' });
  }
// =============================================================================
// 🗂️ NODE TABLES - Gestion des instances de tableaux dédiées
// =============================================================================

// Récupérer toutes les instances de tableaux d'un nœud
router.get('/nodes/:nodeId/tables', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    // console.log(`[TreeBranchLeaf API] Retrieved ${tables.length} tables for node ${nodeId}`); // ✨ Log réduit
    return res.json(tables);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node tables:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tableaux' });
  }
// Créer une nouvelle instance de tableau
router.post('/nodes/:nodeId/tables', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, description, type = 'basic', columns = [], rows = [], data = {}, meta = {} } = req.body;

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que le nom n'existe pas déjà
    const existing = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId, name }
});
    if (existing) {
      return res.status(400).json({ error: 'Un tableau avec ce nom existe déjà' });
    }

    // Déterminer l'ordre
    const lastTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId },
      orderBy: { order: 'desc' }
});
    const order = (lastTable?.order || 0) + 1;

    const newTable = await prisma.treeBranchLeafNodeTable.create({
      data: {
        nodeId,
        organizationId,
        name,
        description,
        type,
        columns,
        rows,
        data,
        meta,
        order
    }
    // console.log(`[TreeBranchLeaf API] Created table ${newTable.id} for node ${nodeId}`); // ✨ Log réduit
    return res.status(201).json(newTable);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la création du tableau' });
  }
// Mettre à jour une instance de tableau
router.put('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  try {
    const { nodeId, tableId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, description, type, columns, rows, data, meta } = req.body;

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que le tableau appartient bien à ce nœud
    const existingTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { id: tableId, nodeId }
});
    if (!existingTable) {
      return res.status(404).json({ error: 'Tableau non trouvé' });
    }

    // Vérifier l'unicité du nom si changé
    if (name && name !== existingTable.name) {
      const nameConflict = await prisma.treeBranchLeafNodeTable.findFirst({
        where: { nodeId, name, id: { not: tableId } }
});
      if (nameConflict) {
        return res.status(400).json({ error: 'Un tableau avec ce nom existe déjà' });
      }
    }

});
    const updatedTable = await prisma.treeBranchLeafNodeTable.update({
      where: { id: tableId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(columns !== undefined && { columns }),
        ...(rows !== undefined && { rows }),
        ...(data !== undefined && { data }),
        ...(meta !== undefined && { meta }),
        updatedAt: new Date()

      }
    // console.log(`[TreeBranchLeaf API] Updated table ${tableId} for node ${nodeId}`); // ✨ Log réduit
    return res.json(updatedTable);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du tableau' });
  }
// Supprimer une instance de tableau
router.delete('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  try {
    const { nodeId, tableId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que le tableau appartient bien à ce nœud
    const existingTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { id: tableId, nodeId }
});
    if (!existingTable) {
      return res.status(404).json({ error: 'Tableau non trouvé' });
    }

    await prisma.treeBranchLeafNodeTable.delete({
      where: { id: tableId }
    // console.log(`[TreeBranchLeaf API] Deleted table ${tableId} for node ${nodeId}`); // ✨ Log réduit
    return res.json({ success: true, message: 'Tableau supprimé avec succès' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node table:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du tableau' });
  }
export default router;

// =============================================================================
// 🧩 NODE TABLE - Configuration de tableau (colonnes / matrice) sur un nœud
// =============================================================================

// Type utilitaire local pour la configuration de tableau
type TableConfig = {
  type: 'columns' | 'matrix';
  columns: string[];
  rows?: string[];
  data?: (number | string | null)[][]; // data[r][c]
  meta?: { unit?: string; decimal?: 'comma' | 'dot'; name?: string } & Record<string, unknown>;
  isImported?: boolean;
  importSource?: string;
};

function normalizeTableConfig(input: unknown): TableConfig {
  const cfg = (input && typeof input === 'object' ? input as Record<string, unknown> : {}) as TableConfig;
  const type = cfg?.type === 'matrix' ? 'matrix' : 'columns';
  const columns = Array.isArray(cfg?.columns) ? (cfg.columns as unknown[]).map(String) : [];
  const rows = Array.isArray(cfg?.rows) ? (cfg.rows as unknown[]).map(String) : undefined;
  let data: (number | string | null)[][] | undefined = undefined;
  if (Array.isArray(cfg?.data)) {
    data = (cfg.data as unknown[]).map((r) => Array.isArray(r) ? (r as unknown[]).map((v) => (v === '' ? null : v as (number|string|null))) : []);
    }
});
  const meta = (cfg?.meta && typeof cfg.meta === 'object') ? cfg.meta : {};
  return { type, columns, rows, data, meta: meta as TableConfig['meta'], isImported: Boolean(cfg?.isImported), importSource: cfg?.importSource as string | undefined };
}

async function ensureNodeOrgAccess(prismaInst: PrismaClient, nodeId: string, reqUser: { organizationId?: string; isSuperAdmin?: boolean } | undefined) {
  const node = await prismaInst.treeBranchLeafNode.findFirst({
    where: { id: nodeId },
    select: { id: true, treeId: true, TreeBranchLeafTree: { select: { organizationId: true } }, parentId: true, label: true }
});
  if (!node) return { ok: false as const, status: 404, error: 'Nœud non trouvé' };
  const { organizationId, isSuperAdmin } = reqUser || {};
  const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
  const nodeOrg = node.TreeBranchLeafTree?.organizationId;
  if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
    return { ok: false as const, status: 403, error: 'Accès refusé' };
  }
});
  return { ok: true as const, node };
}

// GET /api/treebranchleaf/nodes/:nodeId/table → lire la config
router.get('/nodes/:nodeId/table', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const dbNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { tableConfig: true } });
    const tableCfg = normalizeTableConfig(dbNode?.tableConfig ?? {});
    return res.json(tableCfg);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node table:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du tableau' });
  }
// PUT /api/treebranchleaf/nodes/:nodeId/table → écrire la config
router.put('/nodes/:nodeId/table', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const payload = normalizeTableConfig(req.body);
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { tableConfig: payload as unknown as Prisma.InputJsonValue, hasTable: true, updatedAt: new Date() },
      select: { id: true }
});
    return res.json({ success: true, id: updated.id });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du tableau' });
  }
// POST /api/treebranchleaf/nodes/:nodeId/table/import → importer CSV / texte collé
router.post('/nodes/:nodeId/table/import', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

  // Charger l'état actuel pour préserver certaines métadonnées (ex: libellé)
  const existing = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { tableConfig: true } });
  const prev = normalizeTableConfig(existing?.tableConfig ?? {});

    const { content, type }: { content?: string; type?: 'columns' | 'matrix' } = req.body || {};
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Aucun contenu fourni' });
    }

    // Détecter séparateur: ; ou , ou tab
    const lines = content.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
    const sep = lines[0]?.includes('\t') ? '\t' : (lines[0]?.includes(';') ? ';' : ',');

    const parseRow = (row: string) => row.split(new RegExp(sep, 'g')).map(c => c.trim());

    const rowsParsed = lines.map(parseRow);
    let cfg: TableConfig;
    if (type === 'columns') {
      const first = rowsParsed[0] || [];
      const columns = first.filter((v) => v !== '');
      const body = rowsParsed.slice(1);
      let data: (number | string | null)[][] | undefined = undefined;
      if (body.length > 0) {
        data = body.map((r) => r.slice(0, columns.length).map((cell) => {
          if (cell === '') return null;
          const isNumLike = /^[-+]?\d{1,3}(?:[.,]\d+)?$/.test(cell);
          if (isNumLike) {
            const n = Number(cell.replace(',', '.'));
            return Number.isFinite(n) ? n : cell;
    }
});
          return cell;
        }));
      }
      cfg = { type: 'columns', columns, data, meta: { ...(prev.meta || {}), decimal: 'comma' }, isImported: true, importSource: 'csv' };
    } else {
      const header = rowsParsed[0] || [];
      const columns = header.slice(1);
      const body = rowsParsed.slice(1);
      const rowLabels = body.map(r => r[0] ?? '');
      const data = body.map(r => r.slice(1).map((cell) => {
        // normaliser virgule en point pour nombres, sinon garder string
        const isNumLike = /^[-+]?\d{1,3}(?:[.,]\d+)?$/.test(cell);
        if (cell === '') return null;
        if (isNumLike) {
          const n = Number(cell.replace(',', '.'));
          return Number.isFinite(n) ? n : cell;
    }
});
        return cell;
      }));
      cfg = { type: 'matrix', columns, rows: rowLabels, data, meta: { ...(prev.meta || {}), decimal: 'comma' }, isImported: true, importSource: 'csv' };
    }

    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { tableConfig: cfg as unknown as Prisma.InputJsonValue, hasTable: true, updatedAt: new Date() }
});
    return res.json(cfg);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error importing node table:', error);
    res.status(500).json({ error: 'Erreur lors de l\'import du tableau' });
  }
// GET /api/treebranchleaf/nodes/:nodeId/table/options?dimension=columns|rows
router.get('/nodes/:nodeId/table/options', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { dimension } = req.query as { dimension?: string };
    if (!dimension || !['columns', 'rows'].includes(dimension)) {
      return res.status(400).json({ error: 'Paramètre dimension invalide' });
    }
});
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const dbNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { tableConfig: true } });
    const cfg = normalizeTableConfig(dbNode?.tableConfig ?? {});
    const list = dimension === 'columns' ? cfg.columns : (cfg.rows || []);
    return res.json({ items: list });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting table options:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des options du tableau' });
  }
// GET /api/treebranchleaf/nodes/:nodeId/table/lookup?column=..&row=..
router.get('/nodes/:nodeId/table/lookup', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { column, row } = req.query as { column?: string; row?: string };
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const dbNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { tableConfig: true } });
    const cfg = normalizeTableConfig(dbNode?.tableConfig ?? {});
    if (cfg.type !== 'matrix') {
      return res.status(400).json({ error: 'Lookup possible uniquement pour un tableau croisé (matrix)' });
    }
});
    if (!column || !row) {
      return res.status(400).json({ error: 'Paramètres column et row requis' });
    }
});
    const cIdx = cfg.columns.indexOf(String(column));
    const rIdx = (cfg.rows || []).indexOf(String(row));
    if (cIdx < 0 || rIdx < 0) return res.status(404).json({ error: 'Clé de ligne/colonne introuvable' });
    const value = cfg.data && cfg.data[rIdx] ? cfg.data[rIdx][cIdx] ?? null : null;
    return res.json({ value });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error table lookup:', error);
    res.status(500).json({ error: 'Erreur lors du lookup dans le tableau' });
  }
// POST /api/treebranchleaf/nodes/:nodeId/table/generate-selects
// Crée 1 (columns) ou 2 (matrix) champs Select dépendants basés sur le tableau
router.post('/nodes/:nodeId/table/generate-selects', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { labelColumns = 'Choix colonne', labelRows = 'Choix ligne' } = req.body || {};
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const baseNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { id: true, treeId: true, parentId: true, order: true, tableConfig: true } });
    if (!baseNode) return res.status(404).json({ error: 'Nœud non trouvé' });
    const cfg = normalizeTableConfig(baseNode.tableConfig ?? {});

    const parentId = baseNode.parentId || null;
    const siblingsCount = await prisma.treeBranchLeafNode.count({ where: { treeId: baseNode.treeId, parentId } });

    const toCreate: Array<{ label: string; dimension: 'columns' | 'rows' } > = [{ label: labelColumns, dimension: 'columns' }];
    if (Array.isArray(cfg.rows) && cfg.rows.length > 0) {
      toCreate.push({ label: labelRows, dimension: 'rows' });
    }

});
  const created: { id: string; label: string }[] = [];
    let insertOrder = siblingsCount; // ajoute en fin
    for (const item of toCreate) {
      const selId = randomUUID();
      const node = await prisma.treeBranchLeafNode.create({
        data: {
          id: selId,
          treeId: baseNode.treeId,
          parentId,
          type: 'leaf_select',
          subType: 'SELECT',
          label: item.label,
          order: insertOrder++,
          isVisible: true,
          isActive: true,
          hasData: false,
          hasTable: false,
          metadata: {},
          updatedAt: new Date()
      }
      // lier la config SELECT à la source table
      await prisma.treeBranchLeafSelectConfig.create({
        data: {
          id: randomUUID(),
          nodeId: node.id,
          options: [],
          multiple: false,
          searchable: false,
          allowCustom: false,
          optionsSource: `table_${item.dimension}`,
          tableReference: baseNode.id,
          createdAt: new Date(),
          updatedAt: new Date()
      }
      created.push({ id: node.id, label: node.label });
    }

});
    return res.json({ created });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error generating selects from table:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des champs dépendants' });
  }
// =============================================================================
// 📝 SUBMISSIONS - Sauvegarde des réponses utilisateur (brouillon / final)
// =============================================================================
async function ensureTreeOrgAccess(prismaInst: PrismaClient, treeId: string, reqUser: { organizationId?: string; isSuperAdmin?: boolean } | undefined) {
  const tree = await prismaInst.treeBranchLeafTree.findFirst({
    where: { id: treeId },
    select: { id: true, organizationId: true }
});
  if (!tree) return { ok: false as const, status: 404, error: 'Arbre non trouvé' };
  const { organizationId, isSuperAdmin } = reqUser || {};
  const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
  if (!isSuperAdmin && hasOrgCtx && tree.organizationId && tree.organizationId !== organizationId) {
    return { ok: false as const, status: 403, error: 'Accès refusé' };
  }
});
  return { ok: true as const, tree };
}

type SubmissionDataItem = { nodeId: string; value?: string | null; calculatedValue?: string | null; metadata?: Record<string, unknown> };

// GET /api/treebranchleaf/submissions/:submissionId → lire une soumission (avec Data)
router.get('/submissions/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { organizationId, isSuperAdmin, id: userId } = (req.user || {}) as { organizationId?: string; isSuperAdmin?: boolean; id?: string };

    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: {
        id: submissionId,
        OR: [
          { userId: userId || '' },
          { TreeBranchLeafTree: { organizationId: organizationId || '' } }
        ]
      },
      include: {
        TreeBranchLeafTree: { select: { organizationId: true } },
        TreeBranchLeafSubmissionData: true

      }
});
    if (!submission) return res.status(404).json({ error: 'Soumission non trouvée' });
    // Check org unless super admin
    if (!isSuperAdmin && organizationId && submission.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    return res.json({
      id: submission.id,
      treeId: submission.treeId,
      leadId: submission.leadId,
      status: submission.status,
      data: submission.TreeBranchLeafSubmissionData.map(d => ({
        nodeId: d.nodeId,
        value: d.value,
        calculatedValue: d.calculatedValue,
        metadata: d.metadata

      }))
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching submission:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la soumission' });
  }
// POST /api/treebranchleaf/trees/:treeId/submissions → créer un brouillon
router.post('/trees/:treeId/submissions', async (req, res) => {
  try {
    const { treeId } = req.params;
    const access = await ensureTreeOrgAccess(prisma, treeId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { id: userId } = (req.user || {}) as { id?: string };
    const { leadId, sessionId, status, data } = (req.body || {}) as { leadId?: string; sessionId?: string; status?: string; data?: SubmissionDataItem[] };

    const submission = await prisma.treeBranchLeafSubmission.create({
      data: {
        treeId,
        userId: userId || null,
        leadId: leadId || null,
        sessionId: sessionId || null,
        status: (status === 'completed' || status === 'draft') ? status : 'draft'

      }
});
    if (Array.isArray(data) && data.length > 0) {
      await prisma.treeBranchLeafSubmissionData.createMany({
        data: data.map((it) => ({
          submissionId: submission.id,
          nodeId: it.nodeId,
          value: (it.value ?? '') as string,
          calculatedValue: (it.calculatedValue ?? null) as string | null,
          metadata: (it.metadata ?? {}) as Prisma.InputJsonValue
        }))
    }

});
    return res.status(201).json({ id: submission.id });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la soumission' });
  }
// PUT /api/treebranchleaf/submissions/:submissionId → remplacer données et/ou statut
router.put('/submissions/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { organizationId, isSuperAdmin, id: userId } = (req.user || {}) as { organizationId?: string; isSuperAdmin?: boolean; id?: string };
    const { status, data, summary, exportData } = (req.body || {}) as { status?: string; data?: SubmissionDataItem[]; summary?: Record<string, unknown>; exportData?: Record<string, unknown> };

    const sub = await prisma.treeBranchLeafSubmission.findFirst({
      where: {
        id: submissionId,
        OR: [
          { userId: userId || '' },
          { TreeBranchLeafTree: { organizationId: organizationId || '' } }
        ]
      },
      include: { TreeBranchLeafTree: { select: { organizationId: true } } }
});
    if (!sub) return res.status(404).json({ error: 'Soumission non trouvée' });
    if (!isSuperAdmin && organizationId && sub.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

});
    const updated = await prisma.treeBranchLeafSubmission.update({
      where: { id: submissionId },
      data: {
        status: status && (status === 'completed' || status === 'draft') ? status : sub.status,
        summary: summary ? (summary as Prisma.InputJsonValue) : sub.summary,
        exportData: exportData ? (exportData as Prisma.InputJsonValue) : sub.exportData,
        completedAt: status === 'completed' ? new Date() : sub.completedAt,
        updatedAt: new Date()

      }
});
    if (Array.isArray(data)) {
      await prisma.treeBranchLeafSubmissionData.deleteMany({ where: { submissionId } });
      if (data.length > 0) {
        await prisma.treeBranchLeafSubmissionData.createMany({
          data: data.map((it) => ({
            submissionId,
            nodeId: it.nodeId,
            value: (it.value ?? '') as string,
            calculatedValue: (it.calculatedValue ?? null) as string | null,
            metadata: (it.metadata ?? {}) as Prisma.InputJsonValue
          }))
      }
    }

});
    return res.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la soumission' });
  }
