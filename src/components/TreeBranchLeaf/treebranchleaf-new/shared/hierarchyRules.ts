/**
 * 🌳 SYSTÈME DE VALIDATION HIÉRARCHIQUE AVANCÉ - TreeBranchLeaf
 * 
 * Système de validation généalogique complet pour éviter toute erreur de structure
 * 
 * ARCHITECTURE (mise à jour) :
 * - Niveau 1 : Arbre (racine unique)
 * - Niveau 2+ : Branches (peuvent être imbriquées à l'infini sous l'arbre ou d'autres branches)
 * - Niveau 3+ : Champs/Options/Champs+Options (démarrent au niveau 3, puis imbrication infinie)
 */

// =============================================================================
// 🎯 TYPES DE BASE
// =============================================================================

export type NodeType = 'tree' | 'branch' | 'section' | 'leaf_field' | 'leaf_option' | 'leaf_option_field';
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
      throw new Error(`🔄 Cycle détecté dans la hiérarchie au nœud ${currentNode.id} (${currentNode.label})`);
    }
    visitedNodes.add(currentNode.id);
    
    genealogy.unshift(currentNode.id); // Ajouter au début pour avoir l'ordre racine -> enfant
    
    if (!currentNode.parentId) {
      break; // Racine atteinte
    }
    
    currentNode = nodesMap.get(currentNode.parentId);
    
    // Protection supplémentaire contre la profondeur excessive
    if (genealogy.length > 100) {
      throw new Error('🚫 Profondeur hiérarchique excessive détectée (>100 niveaux)');
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
    console.error('❌ Erreur lors du calcul du niveau:', error);
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
      .map(id => nodesMap.get(id)?.label || `[${id}]`)
      .join(' > ');
    return labels || 'Nœud isolé';
  } catch (error) {
    return `❌ Erreur: ${error instanceof Error ? error.message : 'Chemin invalide'}`;
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
      leaf_option_field: 0
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
    
    // Détecter les orphelins
    if (node.parentId && !nodesMap.has(node.parentId)) {
      stats.orphanNodes++;
    }
  }

  return stats;
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
      // Les branches sont autorisées à n'importe quel niveau (racine ou imbriquée)
      return level >= 1;
    
    case 'section':
      // Les sections sont autorisées à partir du niveau 1 (sous une branche)
      return level >= 1;
    
    case 'leaf_field':
    case 'leaf_option':
    case 'leaf_option_field':
      // Les champs sont autorisés à partir du niveau 1 (sous une branche/section)
      return level >= 1;
    
    default:
      return false;
  }
}

/**
 * Obtient la règle détaillée pour un type de nœud
 */
function getDetailedLevelRule(nodeType: NodeType): string {
  switch (nodeType) {
    case 'tree':
      return 'Les arbres sont des racines (niveau 1 uniquement)';
    case 'branch':
  return 'Les branches peuvent être créées à partir du niveau 2, sous l\'arbre ou sous une autre branche';
    case 'leaf_field':
      return 'Les champs doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_option':
      return 'Les options doivent être créées au niveau 2 ou plus (sous des branches)';
    case 'leaf_option_field':
      return 'Les champs+options doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_select':
      return 'Les sélecteurs doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_text':
      return 'Les champs texte doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_email':
      return 'Les champs email doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_phone':
      return 'Les champs téléphone doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_date':
      return 'Les champs date doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_number':
      return 'Les champs numériques doivent être créés au niveau 2 ou plus (sous des branches)';
    case 'leaf_checkbox':
      return 'Les cases à cocher doivent être créées au niveau 2 ou plus (sous des branches)';
    case 'leaf_radio':
      return 'Les boutons radio doivent être créés au niveau 2 ou plus (sous des branches)';
    default:
      return 'Type de nœud inconnu';
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
      reason: `Les ${elementName} ne peuvent pas être créés directement sous l'arbre`,
      level: childLevel,
      errorCode: 'LEAF_NEEDS_BRANCH_PARENT',
      suggestion: 'Créez d\'abord une branche au niveau 2, puis ajoutez vos éléments dedans'
    };
  }
  
  // ✅ NIVEAU 2+ : Sous des branches, sections ou autres leaf_* 
  if (parentType === 'branch' || parentType === 'section' || parentType.startsWith('leaf_')) {
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
    errorCode: 'INVALID_LEAF_PARENT',
    suggestion: 'Glissez cet élément vers une branche ou un autre champ'
  };
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
        errorCode: 'CORRUPTED_HIERARCHY',
        suggestion: 'Rechargez la page ou contactez le support'
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
        reason: error instanceof Error ? error.message : 'Erreur de généalogie',
        level: childLevel,
        errorCode: 'GENEALOGY_ERROR'
      };
    }
  }
  
  // Validation des relations spécifiques avec codes d'erreur
  switch (childType) {
    case 'tree':
      return {
        isValid: false,
        reason: 'Un arbre ne peut pas avoir de parent (c\'est la racine)',
        level: childLevel,
        errorCode: 'TREE_CANNOT_HAVE_PARENT',
        suggestion: 'Les arbres sont des éléments racines et ne peuvent être imbriqués'
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
        reason: `Les branches/sections doivent être sous l'arbre ou une autre branche/section (parent actuel: ${parentType})`,
        level: childLevel,
        errorCode: 'BRANCH_INVALID_PARENT',
        suggestion: 'Placez cet élément sous l\'arbre ou une branche/section existante'
      };
    
    case 'leaf_field':
    case 'leaf_option_field':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 
        childType === 'leaf_field' ? 'champs' : 'champs+options');
    
    case 'leaf_option':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'options');
    
    case 'leaf_select':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'sélecteurs');
    
    case 'leaf_text':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs texte');
    
    case 'leaf_email':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs email');
    
    case 'leaf_phone':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs téléphone');
    
    case 'leaf_date':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs date');
    
    case 'leaf_number':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'champs numériques');
    
    case 'leaf_checkbox':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'cases à cocher');
    
    case 'leaf_radio':
      return validateLeafElement(parentType, actualParentLevel, childType, childLevel, 'boutons radio');
    
    default:
      return {
        isValid: false,
        reason: `Type de nœud non reconnu: ${childType}`,
        level: childLevel,
        errorCode: 'UNKNOWN_NODE_TYPE',
        suggestion: 'Contactez le support technique'
      };
  }
}

// =============================================================================
// 🚀 FONCTIONS UTILITAIRES AVANCÉES
// =============================================================================

/**
 * Valide une opération de déplacement de nœud avec vérification complète
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
      reason: 'Nœud source introuvable',
      errorCode: 'SOURCE_NOT_FOUND',
      suggestion: 'Actualisez la page et réessayez'
    };
  }
  
  if (!targetNode) {
    return {
      isValid: false,
      reason: 'Nœud cible introuvable', 
      errorCode: 'TARGET_NOT_FOUND',
      suggestion: 'Actualisez la page et réessayez'
    };
  }
  
  // Vérification des cycles AVANT validation hiérarchique
  if (wouldCreateCycle(sourceNodeId, targetNodeId, nodesMap)) {
    return {
      isValid: false,
      reason: `Impossible de déplacer "${sourceNode.label}" vers "${targetNode.label}" : cela créerait un cycle dans l'arbre`,
      errorCode: 'WOULD_CREATE_CYCLE',
      suggestion: 'Choisissez une cible qui n\'est pas un descendant du nœud à déplacer'
    };
  }
  
  // Validation hiérarchique avec informations complètes
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
 * Obtient la liste des types de nœuds autorisés pour un parent donné
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
 * Génère un message d'erreur détaillé et localisé
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
    return '✅ Opération valide';
  }

  // Messages personnalisés selon le code d'erreur
  switch (validation.errorCode) {
    case 'BRANCH_ONLY_UNDER_TREE':
      return '🚫 Règle mise à jour: les branches sont permises à partir du niveau 2 sous l\'arbre ou une autre branche';
    case 'BRANCH_INVALID_PARENT':
      return '🚫 Les branches doivent être sous l\'arbre ou une autre branche';
    
    case 'LEAF_NEEDS_BRANCH_PARENT': {
      const elementName = childType === 'leaf_field' ? 'champs' : 
                         childType === 'leaf_option' ? 'options' : 'champs+options';
      return `🚫 Les ${elementName} doivent être créés au niveau 3 ou plus. Créez d'abord une branche`;
    }
    
    case 'TREE_CANNOT_HAVE_PARENT':
      return '🚫 Un arbre est une racine et ne peut pas avoir de parent';
    
    case 'WOULD_CREATE_CYCLE':
      return '🔄 Cette opération créerait un cycle dans l\'arbre (nœud qui deviendrait son propre parent)';
    
    case 'CORRUPTED_HIERARCHY':
      return '💥 Structure d\'arbre corrompue détectée. Rechargez la page';
    
    case 'INVALID_LEVEL':
      return `📏 Niveau incorrect pour ce type de nœud. ${validation.reason}`;
    
    default: {
      const message = validation.reason || '❌ Relation parent-enfant non autorisée';
      return validation.suggestion ? `${message} (💡 ${validation.suggestion})` : message;
    }
  }
}

/**
 * Vérifie l'intégrité complète d'un arbre
 */
export function validateTreeIntegrity(nodesMap: Map<string, TreeNode>): TreeIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let maxDepth = 0;
  
  // Statistiques de base
  const stats = getTreeStatistics(nodesMap);
  
  // Vérifications globales
  if (stats.rootNodes === 0) {
    errors.push('❌ Aucun nœud racine trouvé');
  } else if (stats.rootNodes > 1) {
    warnings.push(`⚠️ Plusieurs nœuds racines détectés (${stats.rootNodes})`);
  }
  
  if (stats.orphanNodes > 0) {
    errors.push(`❌ ${stats.orphanNodes} nœud(s) orphelin(s) détecté(s)`);
  }
  
  // Vérifier chaque nœud individuellement
  for (const [nodeId, node] of nodesMap) {
    try {
      // Vérifier que le niveau correspond au type
      const level = calculateNodeLevel(nodeId, nodesMap);
      maxDepth = Math.max(maxDepth, level);
      
      if (level === -1) {
        errors.push(`❌ Impossible de calculer le niveau du nœud "${node.label}"`);
        continue;
      }
      
      if (!validateNodeTypeAtLevel(node.type, level)) {
        errors.push(`❌ Nœud "${node.label}" (${node.type}) au niveau ${level} incorrect. ${getDetailedLevelRule(node.type)}`);
      }
      
      // Vérifier la relation avec le parent
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
            errors.push(`❌ Relation invalide: "${parent.label}" -> "${node.label}": ${validation.reason}`);
          }
        } else {
          errors.push(`❌ Nœud "${node.label}" référence un parent inexistant: ${node.parentId}`);
        }
      }
      
      // Vérifications spécifiques par type
      switch (node.type) {
        case 'tree':
          if (node.parentId) {
            errors.push(`❌ L'arbre "${node.label}" ne peut pas avoir de parent`);
          }
          break;
        
        case 'branch':
          if (level < 2) {
            errors.push(`❌ La branche "${node.label}" doit être au niveau 2 ou plus (actuellement: ${level})`);
          }
          break;
        
        case 'leaf_field':
        case 'leaf_option':
        case 'leaf_option_field':
          if (level < 3) {
            errors.push(`❌ L'élément "${node.label}" (${node.type}) doit être au niveau 3 ou plus (actuellement: ${level})`);
          }
          break;
      }
      
    } catch (error) {
      errors.push(`❌ Erreur lors de la validation du nœud "${node.label}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
  
  // Vérifications de performance
  if (maxDepth > 20) {
    warnings.push(`⚠️ Profondeur importante détectée (${maxDepth} niveaux). Cela pourrait affecter les performances.`);
  }
  
  if (nodesMap.size > 1000) {
    warnings.push(`⚠️ Nombre important de nœuds (${nodesMap.size}). Considérez diviser en plusieurs arbres.`);
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
// 📋 RÈGLES D'INTERFACE ET CONFIGURATION
// =============================================================================

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
   * Messages d'erreur standardisés pour l'UI
   */
  ERROR_MESSAGES: {
    INVALID_LEVEL: 'Ce type de nœud ne peut pas être placé à ce niveau',
  BRANCH_ONLY_LEVEL_2: 'Les branches sont autorisées à partir du niveau 2 (sous l\'arbre ou une autre branche)',
    FIELDS_LEVEL_3_PLUS: 'Les champs/options ne peuvent être créés qu\'à partir du niveau 3',
    WOULD_CREATE_CYCLE: 'Cette action créerait un cycle dans l\'arbre',
    CORRUPTED_STRUCTURE: 'Structure d\'arbre corrompue détectée'
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
 * Configuration des types de champs disponibles avec métadonnées
 */
export const FIELD_TYPES_CONFIG = {
  TEXT: { 
    label: 'Texte', 
    icon: '📝', 
    category: 'input',
    description: 'Champ de saisie de texte simple',
    validation: ['required', 'minLength', 'maxLength', 'pattern']
  },
  NUMBER: { 
    label: 'Nombre', 
    icon: '🔢', 
    category: 'input',
    description: 'Champ numérique avec validation',
    validation: ['required', 'min', 'max', 'step']
  },
  EMAIL: { 
    label: 'Email', 
    icon: '📧', 
    category: 'input',
    description: 'Champ email avec validation automatique',
    validation: ['required', 'email']
  },
  TEL: { 
    label: 'Téléphone', 
    icon: '📞', 
    category: 'input',
    description: 'Champ téléphone avec formatage',
    validation: ['required', 'phone']
  },
  DATE: { 
    label: 'Date', 
    icon: '📅', 
    category: 'input',
    description: 'Sélecteur de date',
    validation: ['required', 'dateFormat', 'minDate', 'maxDate']
  },
  TEXTAREA: { 
    label: 'Texte long', 
    icon: '📄', 
    category: 'input',
    description: 'Zone de texte multi-lignes',
    validation: ['required', 'minLength', 'maxLength']
  },
  SELECT: { 
    label: 'Liste déroulante', 
    icon: '📋', 
    category: 'select',
    description: 'Liste de choix avec options',
    validation: ['required'],
    requiresOptions: true
  },
  CHECKBOX: { 
    label: 'Case à cocher', 
    icon: '☑️', 
    category: 'choice',
    description: 'Case à cocher booléenne',
    validation: ['required']
  },
  RADIO: { 
    label: 'Bouton radio', 
    icon: '🔘', 
    category: 'choice',
    description: 'Sélection unique parmi plusieurs choix',
    validation: ['required'],
    requiresOptions: true
  }
} as const;

/**
 * Thèmes de couleur pour les différents types de nœuds
 */
export const NODE_THEMES = {
  tree: {
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    borderColor: '#374151',
    icon: '🌳'
  },
  branch: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff', 
    borderColor: '#2563eb',
    icon: '🌿'
  },
  leaf_field: {
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    borderColor: '#059669',
    icon: '📝'
  },
  leaf_option: {
    backgroundColor: '#f59e0b',
    textColor: '#ffffff',
    borderColor: '#d97706',
    icon: '⚪'
  },
  leaf_option_field: {
    backgroundColor: '#8b5cf6',
    textColor: '#ffffff',
    borderColor: '#7c3aed',
    icon: '🎯'
  },
  section: {
    backgroundColor: '#6b7280',
    textColor: '#ffffff',
    borderColor: '#4b5563',
    icon: '📋'
  }
} as const;
