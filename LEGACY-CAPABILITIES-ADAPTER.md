# Adaptateur legacy capabilities (sans changement de modèle)

Ce projet a migré d’un modèle `capabilities` JSON vers des colonnes dédiées Prisma sur `TreeBranchLeafNode` et des tables normalisées (`TreeBranchLeafNodeTable`, `...TableColumn`, `...TableRow`). Certains consommateurs (dont l’ancien « operation-interpreter ») attendent encore la forme « legacy ».

Ce document résume l’adaptation mise en place côté API pour préserver la compatibilité sans modifier le schéma Prisma.

## Ce qui a été ajouté

1. Réinjection « legacy » dans la réponse Node
   - Fichier: `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`
   - Fonction: construction de la réponse dans `buildResponseFromColumns(...)` complète `result.metadata.capabilities` à partir des colonnes dédiées:
     - `data`: { enabled, activeId, instances, unit, precision, ... }
     - `formula`: { enabled, activeId, instances, tokens, ... }
     - `table`: { enabled, activeId, instances, name, meta, type, isImported, columns, rows }
     - `select`, `number`, `bool`, `date`, `image`, `link`, `markers`, etc.
   - Objectif: fournir de nouveau `metadata.capabilities` attendu par les clients legacy (sans toucher le modèle Prisma ni persister de JSON redondant).

2. Fallback « A1 matrix » pour le lookup table
   - Endpoint: `GET /api/treebranchleaf/nodes/:nodeId/table/lookup`
   - Si aucune config `keyRow` / `keyColumn` n’est définie pour un tableau `matrix`, on applique une heuristique Excel « A1 »:
     - Si `columns[0] === rows[0]` (ex. "Orientation"), on renvoie automatiquement les labels de lignes `rows.slice(1)` sous forme d’`options`.
     - Réponse: `{ options: [{value,label},...], autoDefault: { source: 'columnA', keyColumnCandidate: 'Orientation' } }`
   - Impact: des sélecteurs (ex. « Orientation – inclinaison ») refonctionnent sans configuration manuelle immédiate.

## Ce qui n’a PAS changé

- Aucun changement du schéma Prisma (`prisma/schema.prisma`).
- La lecture « moderne » (basée sur colonnes dédiées + tables normalisées) reste la source de vérité.

## Conséquences côté Frontend

- `TablePanel` continue d’utiliser des tableaux normalisés (colonnes: `string[]`, lignes: tableaux complets, données: `matrix`).
- Le hook `useTBLTableLookup` accepte désormais deux formes: soit `{ options: [...] }`, soit une instance normalisée; il génère des `options` dans les deux cas.

## Notes et étapes suivantes

- Pour pérenniser l’auto-default, on peut upsert automatiquement une `TreeBranchLeafSelectConfig` quand le fallback s’applique (optionnel).
- Un nettoyage des imports/fonctions non utilisés dans `treebranchleaf-routes.ts` est possible pour réduire le bruit des warnings.
