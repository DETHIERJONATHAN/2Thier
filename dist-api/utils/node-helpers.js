"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFieldNode = exports.isContainerNode = exports.getNodeIdForLookup = void 0;
/**
 * Obtient le nodeId à utiliser pour les recherches de capacités.
 * Gère les cas où le nœud est un champ d'affichage (ID "display-...")
 * en extrayant le vrai nodeId.
 *
 * @param node - Le nœud TBL.
 * @returns Le nodeId pour la recherche.
 */
var getNodeIdForLookup = function (node) {
    if (!node)
        return undefined;
    // Si l'ID du nœud est un champ d'affichage, extraire le vrai nodeId.
    if (node.id.startsWith('display-')) {
        return node.id.replace('display-', '');
    }
    return node.id;
};
exports.getNodeIdForLookup = getNodeIdForLookup;
/**
 * Vérifie si un nœud est un conteneur (ex: section, groupe).
 * @param node - Le nœud TBL.
 * @returns Vrai si le nœud est un conteneur.
 */
var isContainerNode = function (node) {
    if (!node)
        return false;
    return ['section', 'group', 'tabs', 'tab', 'repeater'].includes(node.type);
};
exports.isContainerNode = isContainerNode;
/**
 * Vérifie si un nœud est un champ de saisie.
 * @param node - Le nœud TBL.
 * @returns Vrai si le nœud est un champ.
 */
var isFieldNode = function (node) {
    if (!node)
        return false;
    return node.type.startsWith('leaf_');
};
exports.isFieldNode = isFieldNode;
