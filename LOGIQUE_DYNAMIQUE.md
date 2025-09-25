# LOGIQUE DYNAMIQUE – Architecture & Référence

## Objectifs
Unifier l'évaluation des formules, conditions et cellules de tableaux pour:
- Éliminer le code en dur et la duplication.
- Permettre l'ajout rapide de nouvelles fonctions et opérateurs.
- Fournir observabilité (metrics, versioning, validation, debug panel).

## Composants Principaux
1. Moteur (`formulaEngine.ts`):
   - Tokenizer + réécriture opérateurs comparatifs (>, >=, <, <=, ==, !=) en fonctions (gt, gte, ...).
   - Conversion en RPN (Shunting Yard).
   - Évaluation avec gestion: précision optionnelle (scaling), cache RPN, fonctions étendues, erreurs codifiées.
2. Conditions: Adaptation `when` (op,left,right) -> expression engine + actions inline (then/fallback) évaluées (formule ID, expression ou littéral).
3. Tableaux: Cellules `=expression` avec références `[[ColName]]` → Build d'un DAG intra-ligne + évaluation topologique.
4. Versioning `/logic/version`: Hash global (FNV-1a) couvrant formules, conditions, formules de tables.
5. Validation `/formulas/validate`: Parse + tokens + RPN + complexité + exécution à blanc.
6. Metrics `/logic/metrics`: Compteurs runtime (évaluations, erreurs, fonctions, temps moyen).

## Grammaire Expressions
```
EXPR := TERM ((+|-) TERM)*
TERM := FACTOR ((*|/) FACTOR)*
FACTOR := NUMBER | VARIABLE | FUNCTION_CALL | PAREN | UNARY
VARIABLE := {{ role }}  (remplacé par nodeId avant parsing)
FUNCTION_CALL := ident '(' args? ')'
ARGS := EXPR (',' EXPR)*
COMPARAISONS réécrites: a > b  => gt(a,b)
```

## Fonctions Disponibles
Math: min, max, round(value,decimals), abs, ceil, floor, pow(^)
Logique: if(cond,v1,v2), and(...), or(...), not(a), present(a), empty(a)
Comparaison: eq, neq, gt, gte, lt, lte (issues de réécriture symbolique)
Avancées: sum(...), avg(...), ifnull(a,b), coalesce(a,b,...), safediv(a,b,fallback=0), percentage(part,total), ratio(a,b)

## Booléens & Numériques
- Vrai = 1, Faux = 0.
- Toute fonction logique retourne 1/0.
- `if(condition,a,b)` teste condition != 0.

## Gestion des Variables
- Placeholders `{{role}}` remplacés via `roleToNodeId`.
- Résolution via callback `resolveVariable(nodeId)`.
- Mode strict: erreur `unknown_variable` (compteur metrics).

## Cache & Performance
- Cache RPN par empreinte des tokens (fingerprint stable).
- Metrics: parseCount, evaluations, avgEvalMs.
- Clear: POST `/formulas/cache/clear`.

## Tableaux – Formules Cellules
- Syntaxe: `= ...`
- Références colonnes même ligne: `[[NomColonne]]`.
- Construction d'un DAG intra-ligne basé sur dépendances directes.
- Détection cycle: marquage `circular` + valeur null.
- Support override `externalVariables` dans POST `/nodes/:nodeId/table/evaluate`.
- Statistiques: formulaCells, evaluatedCells, errors.

## Conditions
- Structure `when` (op, left, right) convertie en expression avec fonctions comparatives.
- Actions then/fallback: peuvent être expression inline (`expr:`), identifiant de formule, ou littéral.
- Booléens: combinaisons via and/or/not.

## Versioning
`GET /logic/version` renvoie:
```
{ version, formulas:[...], conditions:[...], tableFormulas:[...], count:{} }
```
Hash FNV-1a (32 bits hex) -> changer si n'importe quel élément logique évolue.

## Validation
`POST /formulas/validate`:
- Entrée: expression, roleToNodeId?, strictVariables?
- Sortie: tokens, rpn, variables, complexity, evaluation (value, errors)

## Metrics
`GET /logic/metrics`:
```
{
  evaluations, totalEvalMs, avgEvalMs,
  functions: { funcName: count },
  divisionByZero, unknownVariables, parseErrors, invalidResults,
  entries (cache size RPN), parseCount
}
```
`POST /logic/metrics/reset` (super admin)

## Erreurs Normalisées
- division_by_zero
- unknown_variable
- invalid_result
- unknown_operator / unknown_function
- stack_underflow
- parse errors (400 côté API validation)

## Sécurité & Limites
- Longueur max expression (défaut 500 chars).
- Regex whitelist caractères.
- Profondeur max DAG table (implicite via cycle detection + pas de récursion multi-ligne pour l'instant).

## Extensions Futures (pistes)
- Agrégations colonnes inter-lignes: colsum("Col"), colavg("Col").
- Références inter-lignes: [[ColName@rowIndex]].
- Fonctions temporelles (datediff, now) avec sandbox.
- Opérateur ternaire syntaxique ?: rewriting -> if().
- Compression / obfuscation formules export.

## Invariants
1. Aucune exécution de code dynamique arbitraire (pas d'eval JS).
2. Toute comparaison symbolique est transformée avant RPN (traçable).
3. Les résultats non numériques => invalid_result => 0.
4. Toute erreur recensée alimente les metrics.

## Panel Debug (prévu)
- Entrée expression live → tokens + RPN + valeur + temps.
- Vue table: injection d'un JSON de tableConfig pour voir DAG.
- Diff watcher version logic (comparaison versions locales / distantes).
- Graphique top fonctions (metrics.functions).

## Bonnes Pratiques Implémentation
- Toujours passer par `useAuthenticatedApi` côté front.
- Stabiliser hooks dépendants (useMemo/useCallback) pour éviter recalcul continu.
- Documenter toute nouvelle fonction dans cette page.

## Tests
- Tests d'intégration: `tests/api.formulas.integration.test.ts`, `tests/api.logic.integration.test.ts`.
- Ajouter pour chaque nouvelle fonction un cas simple et un cas edge (division par 0, etc.).

---
_MàJ initiale : v1.0 – 2025-09-12_
