/**
 * 🔧 Utilitaire pour extraire les références partagées d'une cascade d'options
 * 
 * La structure est:
 * Cascader Option (ex: Rectangle)
 *   └─ Enfants (ex: Mesure simple, Calculateur)
 *       └─ sharedReferenceIds: [id1, id2, ...]
 * 
 * Cette fonction remonte dans l'arborescence pour trouver TOUTES les références partagées
 */

import type { RawTreeNode } from '../types';

/**
 * Extrait TOUTES les références partagées d'une option et de ses enfants
 * @param optionNode L'option du cascader (ex: Rectangle)
 * @param allNodes Tous les nœuds disponibles
 * @returns Array d'IDs de références partagées uniques
 */
export function extractSharedReferencesFromCascaderOption(
  optionNode: RawTreeNode,
  allNodes: RawTreeNode[] | undefined
): string[] {
  if (!allNodes) return [];

  const collectedRefs = new Set<string>();

  // 1. Vérifier si l'option elle-même a des sharedReferenceIds
  if (optionNode.sharedReferenceIds && Array.isArray(optionNode.sharedReferenceIds)) {
    optionNode.sharedReferenceIds.forEach(ref => collectedRefs.add(ref));
  }

  // 2. Chercher les enfants de l'option
  const children = allNodes.filter(n => n.parentId === optionNode.id);

  // 3. Pour chaque enfant, chercher les sharedReferenceIds
  for (const child of children) {
    if (child.sharedReferenceIds && Array.isArray(child.sharedReferenceIds)) {
      child.sharedReferenceIds.forEach(ref => collectedRefs.add(ref));
    }

    // 4. Chercher aussi dans les petits-enfants (et plus profond)
    const deepRefs = extractSharedReferencesRecursively(child, allNodes);
    deepRefs.forEach(ref => collectedRefs.add(ref));
  }

  return Array.from(collectedRefs);
}

/**
 * Extraction récursive des références partagées dans une sous-arborescence
 */
function extractSharedReferencesRecursively(
  node: RawTreeNode,
  allNodes: RawTreeNode[]
): string[] {
  const refs: string[] = [];

  // Ajouter les références du nœud courant
  if (node.sharedReferenceIds && Array.isArray(node.sharedReferenceIds)) {
    refs.push(...node.sharedReferenceIds);
  }

  // Chercher les enfants et recurser
  const children = allNodes.filter(n => n.parentId === node.id);
  for (const child of children) {
    refs.push(...extractSharedReferencesRecursively(child, allNodes));
  }

  // Retourner unique
  return [...new Set(refs)];
}
