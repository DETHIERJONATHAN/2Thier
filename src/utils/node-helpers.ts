import { TreeBranchLeafNode } from '@prisma/client';

/**
 * Obtient le nodeId à utiliser pour les recherches de capacités.
 * Gère les cas où le nœud est un champ d'affichage (ID "display-...")
 * en extrayant le vrai nodeId.
 *
 * @param node - Le nœud TBL.
 * @returns Le nodeId pour la recherche.
 */
export const getNodeIdForLookup = (node: TreeBranchLeafNode | undefined): string | undefined => {
  if (!node) return undefined;

  // Si l'ID du nœud est un champ d'affichage, extraire le vrai nodeId.
  if (node.id.startsWith('display-')) {
    return node.id.replace('display-', '');
  }

  return node.id;
};

/**
 * Vérifie si un nœud est un conteneur (ex: section, groupe).
 * @param node - Le nœud TBL.
 * @returns Vrai si le nœud est un conteneur.
 */
export const isContainerNode = (node: TreeBranchLeafNode | undefined): boolean => {
  if (!node) return false;
  return ['section', 'group', 'tabs', 'tab', 'repeater'].includes(node.type);
};

/**
 * Vérifie si un nœud est un champ de saisie.
 * @param node - Le nœud TBL.
 * @returns Vrai si le nœud est un champ.
 */
export const isFieldNode = (node: TreeBranchLeafNode | undefined): boolean => {
  if (!node) return false;
  return node.type.startsWith('leaf_');
};
