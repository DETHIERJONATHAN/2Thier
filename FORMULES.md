# Système de Formules (TreeBranchLeaf)

## Objectif
Fournir une évaluation 100% dynamique des formules et conditions définies dans TreeBranchLeaf (TBL), sans logique codée en dur côté serveur ou frontend.

## Syntaxe Supportée
- Opérateurs: `+`, `-`, `*`, `/`, `^` (exponent, associativité droite)
- Parenthèses: `(` et `)` pour priorités explicites
- Séparateur d'arguments: `,`
- Placeholders de variables: `{{role}}` où `role` est mappé vers un `nodeId`

### Fonctions Disponibles
| Fonction | Signature | Description |
|----------|-----------|-------------|
| `min` | `min(a,b,...)` | Minimum des arguments |
| `max` | `max(a,b,...)` | Maximum des arguments |
| `round` | `round(value, decimals?)` | Arrondi à N décimales (0–12) |
| `abs` | `abs(x)` | Valeur absolue |
| `ceil` | `ceil(x)` | Arrondi supérieur |
| `floor` | `floor(x)` | Arrondi inférieur |
| `if` | `if(cond, a, b)` | Retourne `a` si `cond != 0` sinon `b` (b optionnel: défaut 0) |
| `eq` | `eq(a,b)` | 1 si a == b sinon 0 |
| `neq` | `neq(a,b)` | 1 si a != b sinon 0 |
| `gt` | `gt(a,b)` | 1 si a > b sinon 0 |
| `gte` | `gte(a,b)` | 1 si a >= b sinon 0 |
| `lt` | `lt(a,b)` | 1 si a < b sinon 0 |
| `lte` | `lte(a,b)` | 1 si a <= b sinon 0 |

### Exemples
```
{{largeur}} * {{hauteur}} ^ 2
max( {{a}}, 10, min({{b}}, 3) )
round( ({{prixHT}} * {{tva}}) / 100 , 2 )
if( {{conso}} , {{facture}} / {{conso}} , 0 )
ceil( {{x}} / 3 ) + floor( abs({{y}}) )
if( gt({{a}}, {{b}}), {{a}}, {{b}} )
eq( round({{tva}},2), 21 )
```

## Options Moteur (`EvaluateOptions`)
| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `resolveVariable` | `(nodeId)=>number|null|Promise` | (requis) | Récupération de la valeur d'un nodeId |
| `divisionByZeroValue` | `number` | `0` | Valeur de repli division par zéro |
| `strictVariables` | `boolean` | `false` | Ajoute erreur `unknown_variable` si variable non résolue |
| `enableCache` | `boolean` | `true` | Active le cache RPN (parse) |
| `maxExpressionLength` | `number` | `500` | Protection longueur d'expression |
| `allowedCharsRegex` | `RegExp` | whitelist | Filtre caractères autorisés |
| `precisionScale` | `number` | `undefined` | Scaling entier (ex: 10000) pour limiter flottants |

## Erreurs Possibles
| Code | Contexte |
|------|----------|
| `division_by_zero` | Division par zéro détectée |
| `unknown_variable` | Variable non résolue (strict mode) |
| `unknown_function` | Fonction non reconnue |
| `unknown_operator` | Opérateur inattendu |
| `invalid_result` | Résultat non numérique / overflow |
| `stack_underflow` | Expression mal formée (pile insuffisante) |

## Sécurité
- Longueur max configurable (défaut 500 caractères)
- Regex whitelist: `^[0-9A-Za-z_\s+*\-/^(),.{}:]+$`
- Pas d'évaluation JS directe (parser propriétaire + Shunting Yard)
- Cache parse (empreinte des tokens) -> évite reparse répétitif

## Précision Décimale
`precisionScale` applique un scaling entier interne pour + - * / :
- Entrées converties: `scaled = Math.round(val * scale)`
- Multiplication & division re-normalisées
- Améliore `0.1 + 0.2` => `0.3`

## Cache RPN
- Clé = fingerprint des tokens
- Stats via `getRpnCacheStats()`
- Invalidation prévue sur changement de version (exposer `clearRpnCache()` + écouter event `formulas-version-changed`).

## Endpoint d'Évaluation Ad-Hoc
`POST /api/treebranchleaf/evaluate/formula`
Body:
```json
{
  "expr": "{{a}} + {{b}} * 2",
  "rolesMap": { "a": "nodeA", "b": "nodeB" },
  "values": { "nodeA": 3, "nodeB": 4 },
  "options": { "strict": true, "precisionScale": 10000 }
}
```
Réponse:
```json
{ "value": 11, "errors": [] }
```

## Stratégie de Version
- Endpoint: `GET /api/treebranchleaf/formulas-version` -> `{ version, generatedAt }`
- Front: poll périodique + event `formulas-version-changed`
- Action recommandée: vider caches locaux, rafraîchir valeurs dépendantes.

## Bonnes Pratiques
1. Toujours passer `strictVariables=true` en production pour détecter config cassée.
2. Utiliser `precisionScale` (ex: 1000 ou 10000) pour montants financiers.
3. Documenter toute nouvelle fonction ajoutée ici.
4. Ne jamais insérer d'expression utilisateur brute sans passer par `parseExpression`.

## Roadmap Potentielle
- Fonctions supplémentaires: `ceil`, `floor`, `abs`, `if(cond,a,b)`
- Support booléen natif (==, >, < dans expressions formulaires)
- Métriques cache: hit ratio / taux d'erreurs.

## Tests
- Unitaire: opérateurs, precedence, fonctions, strict mode, sécurité, precisionScale.
- Intégration: endpoints version + évaluation.

---
_Mis à jour automatiquement lors de la phase de finalisation moteur formules._
