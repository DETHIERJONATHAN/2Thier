/**
 * ­ƒî│ SYST├êME DE VALIDATION HI├ëRARCHIQUE AVANC├ë - TreeBranchLeaf
 * 
 * Syst├¿me de validation g├®n├®alogique complet pour ├®viter toute erreur de structure
 * 
 * ARCHITECTURE (mise ├á jour) :
 * - Niveau 1 : Arbre (racine unique)
 * - Niveau 2+ : Branches (peuvent ├¬tre imbriqu├®es ├á l'infini sous l'arbre ou d'autres branches)
 * - Niveau 3+ : Champs/Options/Champs+Options (d├®marrent au niveau 3, puis imbrication infinie)
 */

// =============================================================================
// ­ƒÄ» TYPES DE BASE
// =============================================================================

export type NodeType =
  | 'tree'
  | 'branch'
  | 'section'
  | 'leaf_field'
  | 'leaf_option'
  | 'leaf_option_field'
  | 'leaf_repeater';
export type NodeSubType = 'data' | 'SELECT' | 'TEXT' | 'NUMBER' | 'EMAIL' | 'TEL' | 'DATE' | 'TEXTAREA' | 'CHECKBOX' | 'RADIO';

export interface TreeNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  subType?: NodeSubType;
  label: string;
  treeId: string;
  order: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  level?: number;
  genealogy?: string[];
  errorCode?: string;
  suggestion?: string;
}

export interface TreeIntegrityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
  maxDepth: number;
}

// =============================================================================
// ­ƒº« CALCUL DE G├ëN├ëALOGIE ET NIVEAUX AVANC├ë
// =============================================================================

/**
 * Calcule la g├®n├®alogie compl├¿te d'un n┼ôud (chemin depuis la racine)
 * Retourne un tableau des IDs depuis la racine jusqu'au n┼ôud
 */
export function calculateGenealogy(nodeId: string, nodesMap: Map<string, TreeNode>): string[] {
  const genealogy: string[] = [];
  let currentNode = nodesMap.get(nodeId);
  const visitedNodes = new Set<string>(); // Protection contre les cycles
  
  // Remonter la hi├®rarchie jusqu'├á la racine
  while (currentNode) {
    // Protection contre les cycles infinis
    if (visitedNodes.has(currentNode.id)) {
      throw new Error(`­ƒöä Cycle d├®tect├® dans la hi├®rarchie au n┼ôud ${currentNode.id} (${currentNode.label})`);
    }
    visitedNodes.add(currentNode.id);
    
    genealogy.unshift(currentNode.id); // Ajouter au d├®but pour avoir l'ordre racine -> enfant
    
    if (!currentNode.parentId) {
      break; // Racine atteinte
    }
    
    currentNode = nodesMap.get(currentNode.parentId);
    
    // Protection suppl├®mentaire contre la profondeur excessive
    if (genealogy.length > 100) {
      throw new Error('­ƒÜ½ Profondeur hi├®rarchique excessive d├®tect├®e (>100 niveaux)');
    }
  }
  
  return genealogy;
}

/**
 * Calcule le niveau hi├®rarchique d'un n┼ôud dans l'arbre
 * Le niveau 1 = racine, niveau 2 = branches, niveau 3+ = champs/options
 */
export function calculateNodeLevel(nodeId: string, nodesMap: Map<string, TreeNode>): number {
  try {
    const genealogy = calculateGenealogy(nodeId, nodesMap);
    return genealogy.length;
  } catch (error) {
    console.error('ÔØî Erreur lors du calcul du niveau:', error);
    return -1; // Erreur
  }
}

/**
 * V├®rifie qu'un n┼ôud ne deviendrait pas son propre anc├¬tre (pr├®vention des cycles)
 */
export function wouldCreateCycle(childId: string, newParentId: string, nodesMap: Map<string, TreeNode>): boolean {
  if (childId === newParentId) return true;
  
  try {
    const parentGenealogy = calculateGenealogy(newParentId, nodesMap);
    return parentGenealogy.includes(childId);
  } catch {
    return true; // En cas d'erreur, consid├®rer comme un cycle potentiel
  }
}

/**
 * Obtient le chemin textuel depuis la racine (pour debug et messages d'erreur)
 */
export function getGenealogyPath(nodeId: string, nodesMap: Map<string, TreeNode>): string {
  try {
    const genealogy = calculateGenealogy(nodeId, nodesMap);
    const labels = genealogy
      .map(id => nodesMap.get(id)?.label || `[${id}]`)
      .join(' > ');
    return labels || 'N┼ôud isol├®';
  } catch (error) {
    return `ÔØî Erreur: ${error instanceof Error ? error.message : 'Chemin invalide'}`;
  }
}

/**
 * Calcule les statistiques d'un arbre
 */
export function getTreeStatistics(nodesMap: Map<string, TreeNode>): {
  totalNodes: number;
  nodesByType: Record<NodeType, number>;
  maxDepth: number;
  rootNodes: number;
  orphanNodes: number;
} {
  const stats = {
    totalNodes: nodesMap.size,
    nodesByType: {
      tree: 0,
      branch: 0,
      leaf_field: 0,
      leaf_option: 0,
      leaf_option_field: 0,
      leaf_repeater: 0,
      section: 0
    } as Record<NodeType, number>,
    maxDepth: 0,
    rootNodes: 0,
    orphanNodes: 0
  };

  for (const [nodeId, node] of nodesMap) {
    // Compter par type
    stats.nodesByType[node.type]++;
    
    // Compter les racines
    if (!node.parentId) {
      stats.rootNodes++;
    }
    
    // Calculer la profondeur maximale
    const level = calculateNodeLevel(nodeId, nodesMap);
    if (level > stats.maxDepth) {
      stats.maxDepth = level;
    }
    
    // D├®tecter les orphelins
    if (node.parentId && !nodesMap.has(node.parentId)) {
      stats.orphanNodes++;
    }
  }

  return stats;
}

// =============================================================================
// ­ƒÄ» VALIDATION HI├ëRARCHIQUE ROBUSTE
// =============================================================================

/**
 * Valide qu'un type de n┼ôud peut exister ├á un niveau donn├®
 */
export function validateNodeTypeAtLevel(nodeType: NodeType, level: number): boolean {
  switch (nodeType) {
    case 'tree':
      return level === 1; // Racine uniquement
    
    case 'branch':
      // Les branches sont autoris├®es ├á n'importe quel niveau (racine ou imbriqu├®e)
      return level >= 1;
    
    case 'section':
      // Les sections sont autoris├®es ├á partir du niveau 1 (sous une branche)
      return level >= 1;
    
    case 'leaf_field':
    case 'leaf_option':
    case 'leaf_option_field':
    case 'leaf_repeater':
      // Les champs sont autoris├®s ├á partir du niveau 1 (sous une branche/section)
      return level >= 1;
    
    default:
      return false;
  }
}

/**
 * Obtient la r├¿gle d├®taill├®e pour un type de n┼ôud
 */
function getDetailedLevelRule(nodeType: NodeType): string {
  switch (nodeType) {
    case 'tree':
      return 'Les arbres sont des racines (niveau 1 uniquement)';
    case 'branch':
  return 'Les branches peuvent ├¬tre cr├®├®es ├á partir du niveau 2, sous l\'arbre ou sous une autre branche';
    case 'leaf_field':
      return 'Les champs doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_option':
      return 'Les options doivent ├¬tre cr├®├®es au niveau 2 ou plus (sous des branches)';
    case 'leaf_option_field':
      return 'Les champs+options doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_select':
      return 'Les s├®lecteurs doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_text':
      return 'Les champs texte doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_email':
      return 'Les champs email doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_phone':
      return 'Les champs t├®l├®phone doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_date':
      return 'Les champs date doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_number':
      return 'Les champs num├®riques doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_checkbox':
      return 'Les cases ├á cocher doivent ├¬tre cr├®├®es au niveau 2 ou plus (sous des branches)';
    case 'leaf_radio':
      return 'Les boutons radio doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    case 'leaf_repeater':
      return 'Les blocs r├®p├®tables doivent ├¬tre cr├®├®s au niveau 2 ou plus (sous des branches)';
    default:
      return 'Type de n┼ôud inconnu';
  }
}

/**
 * Validation sp├®cialis├®e pour les ├®l├®ments leaf (champs, options, champs+options)
 */
function validateLeafElement(
  parentType: NodeType,
  parentLevel: number,
  childType: NodeType,
  childLevel: number,
  elementName: string
): ValidationResult {
  
  // ÔØî NIVEAU 3+ OBLIGATOIRE : Pas directement sous l'arbre !
  if (false && parentType === 'tree') { // 🎯 FIX: Autoriser les leaf_ au niveau ROOT
    return {
      isValid: false,
      reason: `Les ${elementName} ne peuvent pas ├¬tre cr├®├®s directement sous l'arbre`,
      level: childLevel,
      errorCode: 'LEAF_NEEDS_BRANCH_PARENT',
      suggestion: 'Cr├®ez d\'abord une branche au niveau 2, puis ajoutez vos ├®l├®ments dedans'
    };
  }
  
  // Ô£à NIVEAU 2+ : Sous des branches, sections, tree (ROOT) ou autres leaf_* 
  // 🎯 FIX: Autoriser aussi sous tree (ROOT) pour les champs DISPLAY
  if (parentType === 'tree' || parentType === 'branch' || parentType === 'section' || parentType.startsWith('leaf_')) {
    return {
      isValid: true,
      level: childLevel,
      errorCode: undefined
    };
  }
  
  return {
    isValid: false,
    reason: `Les ${elementName} ne peuvent ├¬tre cr├®├®s que sous des branches ou d'autres ├®l├®ments leaf (niveau 3+)`,
    level: childLevel,
    errorCode: 'INVALID_LEAF_PARENT',
    suggestion: 'Glissez cet ├®l├®ment vers une branche ou un autre champ'
  };
}

/**
 * Validation principale des relations parent-enfant avec g├®n├®alogie compl├¿te
 */
export function validateParentChildRelation(
  parentType: NodeType,
  parentSubType: NodeSubType,
  childType: NodeType,
  childSubType: NodeSubType,
  parentLevel?: number,
  nodesMap?: Map<string, TreeNode>,
  parentId?: string
): ValidationResult {
  
  // Calculer le niveau du parent avec validation
  let actualParentLevel: number;
  if (parentLevel !== undefined) {
    actualParentLevel = parentLevel;
  } else if (nodesMap && parentId) {
    actualParentLevel = calculateNodeLevel(parentId, nodesMap);
    if (actualParentLevel === -1) {
      return {
        isValid: false,
        reason: 'Impossible de calculer le niveau du parent (structure corrompue)',
        errorCode: 'CORRUPTED_HIERARCHY',
        suggestion: 'Rechargez la page ou contactez le support'
      };
    }
  } else {
    // Niveau par d├®faut bas├® sur le type
    actualParentLevel = parentType === 'tree' ? 1 : parentType === 'branch' ? 2 : 3;
  }
  
  const childLevel = actualParentLevel + 1;
  
  // Validation du niveau enfant
  if (!validateNodeTypeAtLevel(childType, childLevel)) {
    return {
      isValid: false,
      reason: `Le type ${childType} ne peut pas ├¬tre plac├® au niveau ${childLevel}. ${getDetailedLevelRule(childType)}`,
      level: childLevel,
      errorCode: 'INVALID_LEVEL'
    };
  }
  
  // V├®rification des cycles si les donn├®es sont disponibles
  if (nodesMap && parentId) {
    try {
      const genealogy = calculateGenealogy(parentId, nodesMap);
      return {
        isValid: true,
        level: childLevel,
        genealogy,
        errorCode: undefined
      };
    } catch (error) {
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Erreur de g├®n├®alogie',
        level: childLevel,
        errorCode: 'GENEALOGY_ERROR'
      };
    }
  }
  
  // Validation des relations sp├®cifiques avec codes d'erreur
  switch (childType) {
    case 'tree':
      return {
        isValid: false,
        reason: 'Un arbre ne peut pas avoir de parent (c\'est la racine)',
        level: childLevel,
        errorCode: 'TREE_CANNOT_HAVE_PARENT',
        suggestion: 'Les arbres sont des ├®l├®ments racines et ne peuvent ├¬tre imbriqu├®s'
      };
    
    case 'branch':
    case 'section':
      // Autoriser les branches et sections sous l'arbre, une autre branche ou une autre section
      if (parentType === 'tree' || parentType === 'branch' || parentType === 'section') {
        return {
          isValid: true,
          level: childLevel,
          errorCode: undefined
        };
      }
      return {
        isValid: false,
        reason: `Les branches/sections doivent ├¬tre sous l'arbre ou une autre branche/section (parent actuel: ${parentType})`,
        level: childLevel,
        errorCode: 'BRANCH_INVALID_PARENT',
        suggestion: 'Placez cet ├®l├®ment sous l\'arbre ou une branche/section existante'
      };
    
    case 'leaf_field':
    case 'leaf_option_field':
    case 'leaf_repeater':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 
        childType === 'leaf_field'
          ? 'champs'
          : childType === 'leaf_repeater'
            ? 'blocs r├®p├®tables'
            : 'champs+options');
    
    case 'leaf_option':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'options');
    
    case 'leaf_select':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 's├®lecteurs');
    
    case 'leaf_text':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs texte');
    
    case 'leaf_email':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs email');
    
    case 'leaf_phone':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs t├®l├®phone');
    
    case 'leaf_date':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs date');
    
    case 'leaf_number':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs num├®riques');
    
    case 'leaf_checkbox':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'cases ├á cocher');
    
    case 'leaf_radio':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'boutons radio');
    
    default:
      return {
        isValid: false,
        reason: `Type de n┼ôud non reconnu: ${childType}`,
        level: childLevel,
        errorCode: 'UNKNOWN_NODE_TYPE',
        suggestion: 'Contactez le support technique'
      };
  }
}

// =============================================================================
// ­ƒÜÇ FONCTIONS UTILITAIRES AVANC├ëES
// =============================================================================

/**
 * Valide une op├®ration de d├®placement de n┼ôud avec v├®rification compl├¿te
 */
export function validateNodeMove(
  sourceNodeId: string,
  targetNodeId: string,
  nodesMap: Map<string, TreeNode>
): ValidationResult {
  
  const sourceNode = nodesMap.get(sourceNodeId);
  const targetNode = nodesMap.get(targetNodeId);
  
  if (!sourceNode) {
    return {
      isValid: false,
      reason: 'N┼ôud source introuvable',
      errorCode: 'SOURCE_NOT_FOUND',
      suggestion: 'Actualisez la page et r├®essayez'
    };
  }
  
  if (!targetNode) {
    return {
      isValid: false,
      reason: 'N┼ôud cible introuvable', 
      errorCode: 'TARGET_NOT_FOUND',
      suggestion: 'Actualisez la page et r├®essayez'
    };
  }
  
  // V├®rification des cycles AVANT validation hi├®rarchique
  if (wouldCreateCycle(sourceNodeId, targetNodeId, nodesMap)) {
    return {
      isValid: false,
      reason: `Impossible de d├®placer "${sourceNode.label}" vers "${targetNode.label}" : cela cr├®erait un cycle dans l'arbre`,
      errorCode: 'WOULD_CREATE_CYCLE',
      suggestion: 'Choisissez une cible qui n\'est pas un descendant du n┼ôud ├á d├®placer'
    };
  }
  
  // Validation hi├®rarchique avec informations compl├¿tes
  const validation = validateParentChildRelation(
    targetNode.type,
    targetNode.subType || 'data',
    sourceNode.type,
    sourceNode.subType || 'data',
    undefined,
    nodesMap,
    targetNodeId
  );
  
  // Ajouter des informations de contexte
  if (!validation.isValid && targetNode && sourceNode) {
    validation.reason += ` (Source: "${sourceNode.label}", Cible: "${targetNode.label}")`;
  }
  
  return validation;
}

/**
 * Obtient la liste des types de n┼ôuds autoris├®s pour un parent donn├®
 */
export function getAllowedChildTypes(
  parentType: NodeType,
  parentSubType: NodeSubType = 'data',
  parentLevel?: number
): NodeType[] {
  
  const allowedTypes: NodeType[] = [];
  const allTypes: NodeType[] = ['tree', 'branch', 'leaf_field', 'leaf_option', 'leaf_option_field'];
  
  for (const childType of allTypes) {
    const validation = validateParentChildRelation(
      parentType, 
      parentSubType, 
      childType, 
      'data', 
      parentLevel
    );
    if (validation.isValid) {
      allowedTypes.push(childType);
    }
  }
  
  return allowedTypes;
}

/**
 * G├®n├¿re un message d'erreur d├®taill├® et localis├®
 */
export function getValidationErrorMessage(
  parentType: NodeType,
  parentSubType: NodeSubType,
  childType: NodeType,
  childSubType: NodeSubType,
  parentLevel?: number
): string {
  const validation = validateParentChildRelation(
    parentType, 
    parentSubType, 
    childType, 
    childSubType, 
    parentLevel
  );
  
  if (validation.isValid) {
    return 'Ô£à Op├®ration valide';
  }

  // Messages personnalis├®s selon le code d'erreur
  switch (validation.errorCode) {
    case 'BRANCH_ONLY_UNDER_TREE':
      return '­ƒÜ½ R├¿gle mise ├á jour: les branches sont permises ├á partir du niveau 2 sous l\'arbre ou une autre branche';
    case 'BRANCH_INVALID_PARENT':
      return '­ƒÜ½ Les branches doivent ├¬tre sous l\'arbre ou une autre branche';
    
    case 'LEAF_NEEDS_BRANCH_PARENT': {
      const elementName = childType === 'leaf_field' ? 'champs' : 
                         childType === 'leaf_option' ? 'options' : 'champs+options';
      return `­ƒÜ½ Les ${elementName} doivent ├¬tre cr├®├®s au niveau 3 ou plus. Cr├®ez d'abord une branche`;
    }
    
    case 'TREE_CANNOT_HAVE_PARENT':
      return '­ƒÜ½ Un arbre est une racine et ne peut pas avoir de parent';
    
    case 'WOULD_CREATE_CYCLE':
      return '­ƒöä Cette op├®ration cr├®erait un cycle dans l\'arbre (n┼ôud qui deviendrait son propre parent)';
    
    case 'CORRUPTED_HIERARCHY':
      return '­ƒÆÑ Structure d\'arbre corrompue d├®tect├®e. Rechargez la page';
    
    case 'INVALID_LEVEL':
      return `­ƒôÅ Niveau incorrect pour ce type de n┼ôud. ${validation.reason}`;
    
    default: {
      const message = validation.reason || 'ÔØî Relation parent-enfant non autoris├®e';
      return validation.suggestion ? `${message} (­ƒÆí ${validation.suggestion})` : message;
    }
  }
}

/**
 * V├®rifie l'int├®grit├® compl├¿te d'un arbre
 */
export function validateTreeIntegrity(nodesMap: Map<string, TreeNode>): TreeIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let maxDepth = 0;
  
  // Statistiques de base
  const stats = getTreeStatistics(nodesMap);
  
  // V├®rifications globales
  if (stats.rootNodes === 0) {
    errors.push('ÔØî Aucun n┼ôud racine trouv├®');
  } else if (stats.rootNodes > 1) {
    warnings.push(`ÔÜá´©Å Plusieurs n┼ôuds racines d├®tect├®s (${stats.rootNodes})`);
  }
  
  if (stats.orphanNodes > 0) {
    errors.push(`ÔØî ${stats.orphanNodes} n┼ôud(s) orphelin(s) d├®tect├®(s)`);
  }
  
  // V├®rifier chaque n┼ôud individuellement
  for (const [nodeId, node] of nodesMap) {
    try {
      // V├®rifier que le niveau correspond au type
      const level = calculateNodeLevel(nodeId, nodesMap);
      maxDepth = Math.max(maxDepth, level);
      
      if (level === -1) {
        errors.push(`ÔØî Impossible de calculer le niveau du n┼ôud "${node.label}"`);
        continue;
      }
      
      if (!validateNodeTypeAtLevel(node.type, level)) {
        errors.push(`ÔØî N┼ôud "${node.label}" (${node.type}) au niveau ${level} incorrect. ${getDetailedLevelRule(node.type)}`);
      }
      
      // V├®rifier la relation avec le parent
      if (node.parentId) {
        const parent = nodesMap.get(node.parentId);
        if (parent) {
          const validation = validateParentChildRelation(
            parent.type,
            parent.subType || 'data',
            node.type,
            node.subType || 'data'
          );
          if (!validation.isValid) {
            errors.push(`ÔØî Relation invalide: "${parent.label}" -> "${node.label}": ${validation.reason}`);
          }
        } else {
          errors.push(`ÔØî N┼ôud "${node.label}" r├®f├®rence un parent inexistant: ${node.parentId}`);
        }
      }
      
      // V├®rifications sp├®cifiques par type
      switch (node.type) {
        case 'tree':
          if (node.parentId) {
            errors.push(`ÔØî L'arbre "${node.label}" ne peut pas avoir de parent`);
          }
          break;
        
        case 'branch':
          if (level < 2) {
            errors.push(`ÔØî La branche "${node.label}" doit ├¬tre au niveau 2 ou plus (actuellement: ${level})`);
          }
          break;
        
        case 'leaf_field':
        case 'leaf_option':
        case 'leaf_option_field':
          if (level < 3) {
            errors.push(`ÔØî L'├®l├®ment "${node.label}" (${node.type}) doit ├¬tre au niveau 3 ou plus (actuellement: ${level})`);
          }
          break;
      }
      
    } catch (error) {
      errors.push(`ÔØî Erreur lors de la validation du n┼ôud "${node.label}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
  
  // V├®rifications de performance
  if (maxDepth > 20) {
    warnings.push(`ÔÜá´©Å Profondeur importante d├®tect├®e (${maxDepth} niveaux). Cela pourrait affecter les performances.`);
  }
  
  if (nodesMap.size > 1000) {
    warnings.push(`ÔÜá´©Å Nombre important de n┼ôuds (${nodesMap.size}). Consid├®rez diviser en plusieurs arbres.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    nodeCount: nodesMap.size,
    maxDepth
  };
}

// =============================================================================
// ­ƒôï R├êGLES D'INTERFACE ET CONFIGURATION
// =============================================================================

/**
 * R├¿gles sp├®cifiques pour l'affichage et l'UI
 */
export const UI_RULES = {
  /**
   * Types de n┼ôuds qui peuvent ├¬tre gliss├®s depuis la palette
   */
  DRAGGABLE_PALETTE_TYPES: ['branch', 'leaf_field', 'leaf_option', 'leaf_option_field'] as NodeType[],
  
  /**
   * Types de n┼ôuds qui acceptent des drops
   */
  DROPPABLE_TYPES: ['tree', 'branch', 'leaf_field', 'leaf_option_field'] as NodeType[],
  
  /**
   * Niveaux maximum autoris├®s (0 = illimit├®)
   */
  MAX_LEVELS: 0, // Infini pour les niveaux 3+
  
  /**
   * Messages d'erreur standardis├®s pour l'UI
   */
  ERROR_MESSAGES: {
    INVALID_LEVEL: 'Ce type de n┼ôud ne peut pas ├¬tre plac├® ├á ce niveau',
  BRANCH_ONLY_LEVEL_2: 'Les branches sont autoris├®es ├á partir du niveau 2 (sous l\'arbre ou une autre branche)',
    FIELDS_LEVEL_3_PLUS: 'Les champs/options ne peuvent ├¬tre cr├®├®s qu\'├á partir du niveau 3',
    WOULD_CREATE_CYCLE: 'Cette action cr├®erait un cycle dans l\'arbre',
    CORRUPTED_STRUCTURE: 'Structure d\'arbre corrompue d├®tect├®e'
  },

  /**
   * Styles de validation pour l'UI
   */
  VALIDATION_STYLES: {
    VALID_DROP: 'border-green-500 bg-green-50',
    INVALID_DROP: 'border-red-500 bg-red-50',
    NEUTRAL: 'border-gray-300 bg-white'
  }
} as const;

/**
 * Configuration des types de champs disponibles avec m├®tadonn├®es
 */
export const FIELD_TYPES_CONFIG = {
  TEXT: { 
    label: 'Texte', 
    icon: '­ƒôØ', 
    category: 'input',
    description: 'Champ de saisie de texte simple',
    validation: ['required', 'minLength', 'maxLength', 'pattern']
  },
  NUMBER: { 
    label: 'Nombre', 
    icon: '­ƒöó', 
    category: 'input',
    description: 'Champ num├®rique avec validation',
    validation: ['required', 'min', 'max', 'step']
  },
  EMAIL: { 
    label: 'Email', 
    icon: '­ƒôº', 
    category: 'input',
    description: 'Champ email avec validation automatique',
    validation: ['required', 'email']
  },
  TEL: { 
    label: 'T├®l├®phone', 
    icon: '­ƒô×', 
    category: 'input',
    description: 'Champ t├®l├®phone avec formatage',
    validation: ['required', 'phone']
  },
  DATE: { 
    label: 'Date', 
    icon: '­ƒôà', 
    category: 'input',
    description: 'S├®lecteur de date',
    validation: ['required', 'dateFormat', 'minDate', 'maxDate']
  },
  TEXTAREA: { 
    label: 'Texte long', 
    icon: '­ƒôä', 
    category: 'input',
    description: 'Zone de texte multi-lignes',
    validation: ['required', 'minLength', 'maxLength']
  },
  SELECT: { 
    label: 'Liste d├®roulante', 
    icon: '­ƒôï', 
    category: 'select',
    description: 'Liste de choix avec options',
    validation: ['required'],
    requiresOptions: true
  },
  CHECKBOX: { 
    label: 'Case ├á cocher', 
    icon: 'Ôÿæ´©Å', 
    category: 'choice',
    description: 'Case ├á cocher bool├®enne',
    validation: ['required']
  },
  RADIO: { 
    label: 'Bouton radio', 
    icon: '­ƒöÿ', 
    category: 'choice',
    description: 'S├®lection unique parmi plusieurs choix',
    validation: ['required'],
    requiresOptions: true
  }
} as const;

/**
 * Th├¿mes de couleur pour les diff├®rents types de n┼ôuds
 */
export const NODE_THEMES = {
  tree: {
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    borderColor: '#374151',
    icon: '­ƒî│'
  },
  branch: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff', 
    borderColor: '#2563eb',
    icon: '­ƒî┐'
  },
  leaf_field: {
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    borderColor: '#059669',
    icon: '­ƒôØ'
  },
  leaf_option: {
    backgroundColor: '#f59e0b',
    textColor: '#ffffff',
    borderColor: '#d97706',
    icon: 'ÔÜ¬'
  },
  leaf_option_field: {
    backgroundColor: '#8b5cf6',
    textColor: '#ffffff',
    borderColor: '#7c3aed',
    icon: '­ƒÄ»'
  },
  section: {
    backgroundColor: '#6b7280',
    textColor: '#ffffff',
    borderColor: '#4b5563',
    icon: '­ƒôï'
  }
} as const;
