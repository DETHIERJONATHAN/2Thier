import { logger } from '../../../../lib/logger';
/**
 * 🌳 RÈGLES HIÉRARCHIQUES CENTRALISÉES - TreeBranchLeaf
 * 
 * Système de validation généalogique complet pour éviter toute erreur de structure
 * 
 * ARCHITECTURE STRICTE :
 * - Niveau 1 : Arbre (racine unique)
 * - Niveau 2 : Branches (autant qu'on veut, SEULEMENT au niveau 2)
 * - Niveau 3+ : Champs/Options/Champs+Options (démarrent au niveau 3, puis imbrication infinie)
 */

// =============================================================================
// 🎯 TYPES DE BASE
// =============================================================================

export type NodeType = 'tree' | 'branch' | 'leaf_field' | 'leaf_option' | 'leaf_option_field';
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
}

// =============================================================================
// 🧮 CALCUL DE GÉNÉALOGIE ET NIVEAUX AVANCÉ
// =============================================================================

/**
 * Calcule la généalogie complète d'un nœud (chemin depuis la racine)
 * Retourne un tableau des IDs depuis la racine jusqu'au nœud
 */
export function calculateGenealogy(nodeId: string, nodesMap: Map<string, TreeNode>): string[] {
  const genealogy: string[] = [];
  let currentNode = nodesMap.get(nodeId);
  const visitedNodes = new Set<string>(); // Protection contre les cycles
  
  // Remonter la hiérarchie jusqu'à la racine
  while (currentNode) {
    // Protection contre les cycles infinis
    if (visitedNodes.has(currentNode.id)) {
      throw new Error(`Cycle détecté dans la hiérarchie au nœud ${currentNode.id}`);
    }
    visitedNodes.add(currentNode.id);
    
    genealogy.unshift(currentNode.id); // Ajouter au début pour avoir l'ordre racine -> enfant
    
    if (!currentNode.parentId) {
      break; // Racine atteinte
    }
    
    currentNode = nodesMap.get(currentNode.parentId);
    
    // Protection supplémentaire contre la profondeur excessive
    if (genealogy.length > 100) {
      throw new Error('Profondeur hiérarchique excessive détectée (>100 niveaux)');
    }
  }
  
  return genealogy;
}

/**
 * Calcule le niveau hiérarchique d'un nœud dans l'arbre
 * Le niveau 1 = racine, niveau 2 = branches, niveau 3+ = champs/options
 */
export function calculateNodeLevel(nodeId: string, nodesMap: Map<string, TreeNode>): number {
  try {
    const genealogy = calculateGenealogy(nodeId, nodesMap);
    return genealogy.length;
  } catch (error) {
    logger.error('Erreur lors du calcul du niveau:', error);
    return -1; // Erreur
  }
}

/**
 * Vérifie qu'un nœud ne deviendrait pas son propre ancêtre (prévention des cycles)
 */
export function wouldCreateCycle(childId: string, newParentId: string, nodesMap: Map<string, TreeNode>): boolean {
  if (childId === newParentId) return true;
  
  try {
    const parentGenealogy = calculateGenealogy(newParentId, nodesMap);
    return parentGenealogy.includes(childId);
  } catch {
    return true; // En cas d'erreur, considérer comme un cycle potentiel
  }
}

/**
 * Obtient le chemin textuel depuis la racine (pour debug et messages d'erreur)
 */
export function getGenealogyPath(nodeId: string, nodesMap: Map<string, TreeNode>): string {
  try {
    const genealogy = calculateGenealogy(nodeId, nodesMap);
    const labels = genealogy
      .map(id => nodesMap.get(id)?.label || id)
      .join(' > ');
    return labels || 'Nœud isolé';
  } catch (error) {
    return `Erreur: ${error instanceof Error ? error.message : 'Chemin invalide'}`;
  }
}

// =============================================================================
// 🎯 VALIDATION HIÉRARCHIQUE ROBUSTE
// =============================================================================

/**
 * Valide qu'un type de nœud peut exister à un niveau donné
 */
export function validateNodeTypeAtLevel(nodeType: NodeType, level: number): boolean {
  switch (nodeType) {
    case 'tree':
      return level === 1; // Racine uniquement
    
    case 'branch':
      return level === 2; // Niveau 2 uniquement - AUTANT QU'ON VEUT mais SEULEMENT au niveau 2
    
    case 'leaf_field':
    case 'leaf_option':
    case 'leaf_option_field':
      return level >= 3; // Niveau 3 ou plus - Démarrent au niveau 3, puis imbrication infinie
    
    default:
      return false;
  }
}

/**
 * Validation principale des relations parent-enfant avec généalogie complète
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
        errorCode: 'CORRUPTED_HIERARCHY'
      };
    }
  } else {
    // Niveau par défaut basé sur le type
    actualParentLevel = parentType === 'tree' ? 1 : parentType === 'branch' ? 2 : 3;
  }
  
  const childLevel = actualParentLevel + 1;
  
  // Validation du niveau enfant
  if (!validateNodeTypeAtLevel(childType, childLevel)) {
    return {
      isValid: false,
      reason: `Le type ${childType} ne peut pas être placé au niveau ${childLevel}. ${getDetailedLevelRule(childType)}`,
      level: childLevel,
      errorCode: 'INVALID_LEVEL'
    };
  }
  
  // Vérification des cycles si les données sont disponibles
  if (nodesMap && parentId) {
    // Cette vérification serait utilisée lors du déplacement de nœuds existants
    const genealogy = calculateGenealogy(parentId, nodesMap);
    
    return {
      isValid: true,
      level: childLevel,
      genealogy,
      errorCode: undefined
    };
  }
  
  // Validation des relations spécifiques avec codes d'erreur
  switch (childType) {
    case 'tree':
      return {
        isValid: false,
        reason: 'Un arbre ne peut pas avoir de parent (c\'est la racine)',
        level: childLevel,
        errorCode: 'TREE_CANNOT_HAVE_PARENT'
      };
    
    case 'branch':
      if (parentType !== 'tree') {
        return {
          isValid: false,
          reason: `Les branches ne peuvent être créées que sous un arbre (niveau 2). Parent actuel: ${parentType} au niveau ${actualParentLevel}`,
          level: childLevel,
          errorCode: 'BRANCH_ONLY_UNDER_TREE'
        };
      }
      return {
        isValid: true,
        level: childLevel,
        errorCode: undefined
      };
    
    case 'leaf_field':
    case 'leaf_option_field':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs');
    
    case 'leaf_option':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'options');
    
    default:
      return {
        isValid: false,
        reason: `Type de nœud non reconnu: ${childType}`,
        level: childLevel,
        errorCode: 'UNKNOWN_NODE_TYPE'
      };
  }
}

/**
 * Validation spécialisée pour les éléments leaf (champs, options, champs+options)
 */
function validateLeafElement(
  parentType: NodeType,
  parentLevel: number,
  childType: NodeType,
  childLevel: number,
  elementName: string
): ValidationResult {
  
  // ❌ NIVEAU 3+ OBLIGATOIRE : Pas directement sous l'arbre !
  if (parentType === 'tree') {
    return {
      isValid: false,
      reason: `Les ${elementName} ne peuvent pas être créés directement sous l'arbre. Créez d'abord une branche (niveau 3+ obligatoire)`,
      level: childLevel,
      errorCode: 'LEAF_NEEDS_BRANCH_PARENT'
    };
  }
  
  // ✅ NIVEAU 3+ : Sous des branches ou autres leaf_* 
  if (parentType === 'branch' || parentType.startsWith('leaf_')) {
    return {
      isValid: true,
      level: childLevel,
      errorCode: undefined
    };
  }
  
  return {
    isValid: false,
    reason: `Les ${elementName} ne peuvent être créés que sous des branches ou d'autres éléments leaf (niveau 3+)`,
    level: childLevel,
    errorCode: 'INVALID_LEAF_PARENT'
  };
}

/**
 * Obtient la règle détaillée pour un type de nœud
 */
function getDetailedLevelRule(nodeType: NodeType): string {
  switch (nodeType) {
    case 'tree':
      return 'Les arbres sont des racines (niveau 1 uniquement)';
    case 'branch':
      return 'Les branches ne peuvent être créées qu\'au niveau 2 sous l\'arbre';
    case 'leaf_field':
      return 'Les champs doivent être créés au niveau 3 ou plus (sous des branches)';
    case 'leaf_option':
      return 'Les options doivent être créées au niveau 3 ou plus (sous des branches)';
    case 'leaf_option_field':
      return 'Les champs+options doivent être créés au niveau 3 ou plus (sous des branches)';
    default:
      return 'Type de nœud inconnu';
  }
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  subType?: NodeSubType;
  label: string;
  treeId: string;
  order: number;
}

/**
 * Calcule le niveau hiérarchique d'un nœud dans l'arbre
 */
export function calculateNodeLevel(nodeId: string, nodesMap: Map<string, TreeNode>): number {
  let level = 0;
  let currentNode = nodesMap.get(nodeId);
  
  while (currentNode && currentNode.parentId) {
    level++;
    currentNode = nodesMap.get(currentNode.parentId);
  }
  
  return level;
}

/**
 * Valide si un type de nœud peut être placé à un niveau donné
 */
export function validateNodeTypeAtLevel(nodeType: NodeType, level: number): boolean {
  switch (level) {
    case 1: // Niveau 1 - Root uniquement
      return nodeType === 'tree';
    
    case 2: // Niveau 2 - Branches uniquement (sous l'arbre)
      return nodeType === 'branch';
    
    default: // Niveau 3+ - Champs et options seulement (sous les branches, imbrication infinie)
      return nodeType === 'leaf_field' || nodeType === 'leaf_option' || nodeType === 'leaf_option_field';
  }
}

/**
 * Valide si un nœud enfant peut être créé sous un nœud parent
 */
export function validateParentChildRelation(
  parentType: NodeType,
  parentSubType: NodeSubType,
  childType: NodeType,
  _childSubType: NodeSubType
): { isValid: boolean; reason?: string } {
  
  // Calculer le niveau du parent (simplifié)
  const parentLevel = parentType === 'tree' ? 1 : parentType === 'branch' ? 2 : 3;
  const targetLevel = parentLevel + 1;
  
  if (!validateNodeTypeAtLevel(childType, targetLevel)) {
    return {
      isValid: false,
      reason: `Le type ${childType} ne peut pas être placé au niveau ${targetLevel}`
    };
  }

  // Validation des relations parent-enfant spécifiques
  switch (childType) {
    case 'tree':
      return { isValid: false, reason: 'Un arbre ne peut pas avoir de parent' };
    
    case 'branch':
      // Les branches peuvent être créées UNIQUEMENT au niveau 2 (sous l'arbre)
      // AUTANT DE BRANCHES QU'ON VEUT au niveau 2, mais SEULEMENT au niveau 2
      if (parentType !== 'tree') {
        return { isValid: false, reason: 'Les branches ne peuvent être créées que sous un arbre (niveau 2 uniquement)' };
      }
      return { isValid: true };
    
    case 'leaf_field':
    case 'leaf_option':
    case 'leaf_option_field':
      // RÈGLES IDENTIQUES : Champs, champs+options et options ont EXACTEMENT les mêmes règles !!!
      // 1. ❌ INTERDIT : Directement sous l'arbre (niveau 2) - NIVEAU 3+ OBLIGATOIRE !
      // 2. ✅ AUTORISÉ : Sous des branches (niveau 3) 
      // 3. ✅ AUTORISÉ : S'imbriquer entre eux à l'infini (niveau 4, 5, 6, 7... à l'infini)
      
      // ❌ NIVEAU 3+ OBLIGATOIRE : Pas directement sous l'arbre !
      if (parentType === 'tree') {
        return { isValid: false, reason: `Les ${childType} ne peuvent pas être créés directement sous l'arbre. Créez d'abord une branche (niveau 3+ obligatoire).` };
      }
      
      if (parentType === 'branch') {
        return { isValid: true }; // ✅ NIVEAU 3 : TOUS les types peuvent être créés sous les branches
      }
      
      if (parentType === 'leaf_field' || parentType === 'leaf_option' || parentType === 'leaf_option_field') {
        return { isValid: true }; // ✅ NIVEAU 4+ : Imbrication infinie entre TOUS les types leaf_*
      }
      
      return { isValid: false, reason: 'Les éléments leaf ne peuvent être créés que sous des branches (niveau 3+) ou d\'autres éléments leaf' };
    
    default:
      return { isValid: false, reason: `Type de nœud non reconnu: ${childType}` };
  }
}

/**
 * Valide une opération de déplacement de nœud
 */
export function validateNodeMove(
  sourceNodeId: string,
  targetNodeId: string,
  nodesMap: Map<string, TreeNode>
): { isValid: boolean; reason?: string } {
  
  const sourceNode = nodesMap.get(sourceNodeId);
  const targetNode = nodesMap.get(targetNodeId);
  
  if (!sourceNode) {
    return { isValid: false, reason: 'Nœud source introuvable' };
  }
  
  if (!targetNode) {
    return { isValid: false, reason: 'Nœud cible introuvable' };
  }
  
  // Empêcher de déplacer un nœud vers lui-même ou ses descendants
  if (isDescendant(targetNodeId, sourceNodeId, nodesMap)) {
    return { isValid: false, reason: 'Impossible de déplacer un nœud vers un de ses descendants' };
  }
  
  return validateParentChildRelation(
    targetNode.type,
    targetNode.subType,
    sourceNode.type,
    sourceNode.subType
  );
}

/**
 * Vérifie si un nœud est un descendant d'un autre
 */
function isDescendant(nodeId: string, ancestorId: string, nodesMap: Map<string, TreeNode>): boolean {
  let current = nodesMap.get(nodeId);
  
  while (current && current.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = nodesMap.get(current.parentId);
  }
  
  return false;
}

/**
 * Obtient la liste des types de nœuds autorisés pour un parent donné
 */
export function getAllowedChildTypes(
  parentType: NodeType,
  parentSubType: NodeSubType
): NodeType[] {
  
  const allowedTypes: NodeType[] = [];
  const allTypes: NodeType[] = ['tree', 'branch', 'leaf_field', 'leaf_option', 'leaf_option_field'];
  
  for (const childType of allTypes) {
    const validation = validateParentChildRelation(parentType, parentSubType, childType, 'data');
    if (validation.isValid) {
      allowedTypes.push(childType);
    }
  }
  
  return allowedTypes;
}

/**
 * Génère un message d'erreur détaillé pour une relation parent-enfant invalide
 */
export function getValidationErrorMessage(
  parentType: NodeType,
  parentSubType: NodeSubType,
  childType: NodeType,
  childSubType: NodeSubType
): string {
  const validation = validateParentChildRelation(parentType, parentSubType, childType, childSubType);
  
  if (validation.isValid) {
    return 'Opération valide';
  }

  // Messages d'erreur spécifiques selon le type d'enfant
  switch (childType) {
    case 'branch':
      if (parentType !== 'tree') {
        return 'Les branches ne peuvent être créées qu\'au niveau 2, sous la racine de l\'arbre';
      }
      break;
    
    case 'leaf_option':
      if (parentType === 'tree') {
        return 'Les options ne peuvent pas être créées directement sous l\'arbre. Utilisez d\'abord une branche.';
      }
      // Plus de restriction sur SELECT - les options peuvent être créées sous TOUTES les branches et tous les champs
      break;
    
    case 'leaf_field':
    case 'leaf_option_field':
      if (parentType === 'tree') {
        return `Les ${childType === 'leaf_field' ? 'champs' : 'champs+options'} ne peuvent pas être créés directement sous l'arbre. Utilisez d'abord une branche.`;
      }
      break;
    
    case 'tree':
      return 'Un arbre ne peut pas avoir de parent';
    
    default:
      return `Type de nœud non reconnu: ${childType}`;
  }

  return validation.reason || 'Relation parent-enfant non autorisée';
}

/**
 * Règles spécifiques pour l'affichage et l'UI
 */
export const UI_RULES = {
  /**
   * Types de nœuds qui peuvent être glissés depuis la palette
   */
  DRAGGABLE_PALETTE_TYPES: ['branch', 'leaf_field', 'leaf_option', 'leaf_option_field'] as NodeType[],
  
  /**
   * Types de nœuds qui acceptent des drops
   */
  DROPPABLE_TYPES: ['tree', 'branch', 'leaf_field', 'leaf_option_field'] as NodeType[],
  
  /**
   * Niveaux maximum autorisés (0 = illimité)
   */
  MAX_LEVELS: 0, // Infini pour les niveaux 3+
  
  /**
   * Messages d'erreur standardisés
   */
  ERROR_MESSAGES: {
    INVALID_LEVEL: 'Ce type de nœud ne peut pas être placé à ce niveau',
    BRANCH_ONLY_LEVEL_2: 'Les branches ne peuvent être créées qu\'au niveau 2',
    OPTION_NEEDS_SELECT: 'Les options ne peuvent être créées que sous des champs SELECT',
    FIELDS_LEVEL_3_PLUS: 'Les champs ne peuvent être créés qu\'à partir du niveau 3'
  }
};
