"use strict";
/**
 * 🔄 SYSTÈME UNIVERSEL DE RÉÉCRITURE DES RÉFÉRENCES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce module gère la réécriture de TOUTES les références TBL avec suffixes.
 * Il traite TOUS les formats possibles identifiés dans operation-interpreter.ts
 *
 * FORMATS SUPPORTÉS :
 * -------------------
 * 1. @value.UUID                     → @value.UUID-1
 * 2. @value.node_xxx                 → @value.node_xxx-1
 * 3. @value.shared-ref-xxx           → @value.shared-ref-xxx-1 (si mappé)
 * 4. @value.node-formula:xxx         → @value.node-formula:xxx-1
 * 5. @value.node-condition:xxx       → @value.node-condition:xxx-1
 * 6. @value.condition:xxx            → @value.condition:xxx-1
 * 7. @value.node-table:xxx           → @value.node-table:xxx-1
 * 8. @table.xxx                      → @table.xxx-1
 * 9. node-formula:xxx                → node-formula:xxx-1
 * 10. node-condition:xxx / condition:xxx → node-condition:xxx-1 / condition:xxx-1
 * 11. node-table:xxx                 → node-table:xxx-1
 * 12. UUID nu                        → UUID-1
 * 13. node_xxx nu                    → node_xxx-1
 * 14. shared-ref-xxx nu              → shared-ref-xxx-1 (si mappé)
 *
 * @author System TBL
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteReferences = rewriteReferences;
exports.rewriteJsonReferences = rewriteJsonReferences;
exports.forceSharedRefSuffixes = forceSharedRefSuffixes;
exports.forceSharedRefSuffixesInJson = forceSharedRefSuffixesInJson;
/**
 * 🔄 Réécrit une chaîne contenant N'IMPORTE QUELLE référence TBL avec suffixe
 *
 * Cette fonction est UNIVERSELLE : elle détecte et transforme TOUS les types
 * de références TBL en appliquant le suffixe approprié.
 *
 * ALGORITHME :
 * ------------
 * 1. Chercher chaque référence dans les maps (priorité absolue)
 * 2. Si pas trouvée et suffixe fourni → ajouter suffixe
 * 3. Cas spécial : shared-ref sans mapping → laisser tel quel
 *
 * @param text - Texte contenant les références à réécrire
 * @param maps - Maps de correspondances ancien→nouveau
 * @param suffix - Suffixe à appliquer si pas de mapping trouvé
 * @returns Texte avec références réécrites
 *
 * @example
 * rewriteReferences(
 *   '["@value.abc", "+", "@value.node-formula:def"]',
 *   { nodeIdMap: new Map([['abc', 'abc-1']]), ... },
 *   1
 * )
 * → '["@value.abc-1", "+", "@value.node-formula:def-1"]'
 */
function rewriteReferences(text, maps, suffix) {
    if (!text)
        return text;
    var suffixStr = suffix !== undefined ? String(suffix) : undefined;
    // Fonction helper pour nettoyer les suffixes existants
    var stripAllSuffixes = function (id) {
        // Enlever TOUS les suffixes numériques finaux (ex: "uuid-1-2" → "uuid")
        return id.replace(/(-\d+)+$/, '');
    };
    // Fonction helper pour ajouter le suffixe de manière SÛRE (sans doublons)
    var applySuffix = function (id) {
        if (!suffixStr)
            return id;
        var cleanId = stripAllSuffixes(id);
        return "".concat(cleanId, "-").concat(suffixStr);
    };
    // Fonction helper pour mapper ou suffixer
    var mapOrSuffix = function (id, map, isSharedRef) {
        if (isSharedRef === void 0) { isSharedRef = false; }
        // 1. Chercher dans la map (priorité absolue)
        if (map.has(id)) {
            var mapped = map.get(id);
            console.log("\uD83D\uDD04 [REWRITE] Mapping trouv\u00E9: ".concat(id, " \u2192 ").concat(mapped));
            return mapped;
        }
        // 2. Cas spécial : shared-ref DOIT toujours recevoir le suffixe dans un contexte repeat !
        // Les shared-ref-xxx PARTAGÉES doivent rester pareilles SAUF si on a un suffixe (repeat context)
        // Dans un repeat, elles DOIVENT être suffixées pour cohérence
        if (isSharedRef) {
            if (!suffixStr) {
                console.log("\u26AA [REWRITE] Shared-ref conserv\u00E9e (pas de suffixe): ".concat(id));
                return id;
            }
            // ⭐ TOUJOURS suffixer les shared-ref dans un repeat context
            var suffixed_1 = applySuffix(id);
            console.log("\u2795 [REWRITE] \u2B50 SHARED-REF SUFFIX\u00C9E: ".concat(id, " \u2192 ").concat(suffixed_1));
            return suffixed_1;
        }
        // 3. Appliquer suffixe (nettoie les anciens d'abord)
        var suffixed = applySuffix(id);
        if (suffixed !== id) {
            console.log("\u2795 [REWRITE] Suffixe ajout\u00E9: ".concat(id, " \u2192 ").concat(suffixed));
        }
        return suffixed;
    };
    var result = text;
    // ═══════════════════════════════════════════════════════════════════════════
    // PASSE 1 : @value.XXX (TOUS les types)
    // ═══════════════════════════════════════════════════════════════════════════
    // 1.1 : @value.node-formula:xxx
    result = result.replace(/@value\.node-formula:([A-Za-z0-9_-]+)/g, function (_match, formulaIdWithSuffix) {
        var formulaId = stripAllSuffixes(formulaIdWithSuffix);
        var newId = mapOrSuffix(formulaId, maps.formulaIdMap);
        return "@value.node-formula:".concat(newId);
    });
    // 1.2 : @value.node-condition:xxx
    result = result.replace(/@value\.node-condition:([A-Za-z0-9_-]+)/g, function (_match, conditionIdWithSuffix) {
        var conditionId = stripAllSuffixes(conditionIdWithSuffix);
        var newId = mapOrSuffix(conditionId, maps.conditionIdMap);
        return "@value.node-condition:".concat(newId);
    });
    // 1.3 : @value.condition:xxx
    result = result.replace(/@value\.condition:([A-Za-z0-9_-]+)/g, function (_match, conditionIdWithSuffix) {
        var conditionId = stripAllSuffixes(conditionIdWithSuffix);
        var newId = mapOrSuffix(conditionId, maps.conditionIdMap);
        return "@value.condition:".concat(newId);
    });
    // 1.4 : @value.node-table:xxx
    result = result.replace(/@value\.node-table:([A-Za-z0-9_-]+)/g, function (_match, tableIdWithSuffix) {
        var tableId = stripAllSuffixes(tableIdWithSuffix);
        var newId = mapOrSuffix(tableId, maps.tableIdMap);
        return "@value.node-table:".concat(newId);
    });
    // 1.5 : @value.XXX (UUIDs, node_xxx, shared-ref-xxx)
    // IMPORTANT : Faire ceci APRÈS les autres @value.XXX pour éviter les conflits
    result = result.replace(/@value\.([A-Za-z0-9_:-]+)/g, function (_match, nodeIdWithSuffix) {
        // Ne pas re-traiter les patterns déjà traités ci-dessus
        if (nodeIdWithSuffix.startsWith('node-formula:') ||
            nodeIdWithSuffix.startsWith('node-condition:') ||
            nodeIdWithSuffix.startsWith('condition:') ||
            nodeIdWithSuffix.startsWith('node-table:')) {
            return _match; // Déjà traité
        }
        var nodeId = stripAllSuffixes(nodeIdWithSuffix);
        var isSharedRef = nodeId.startsWith('shared-ref-');
        var newId = mapOrSuffix(nodeId, maps.nodeIdMap, isSharedRef);
        return "@value.".concat(newId);
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // PASSE 2 : @table.XXX
    // ═══════════════════════════════════════════════════════════════════════════
    result = result.replace(/@table\.([A-Za-z0-9_-]+)/g, function (_match, tableIdWithSuffix) {
        var tableId = stripAllSuffixes(tableIdWithSuffix);
        var newId = mapOrSuffix(tableId, maps.tableIdMap);
        return "@table.".concat(newId);
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // PASSE 3 : Références directes (sans @value. ni @table.)
    // ═══════════════════════════════════════════════════════════════════════════
    // 3.1 : node-formula:xxx
    result = result.replace(/node-formula:([A-Za-z0-9_-]+)/g, function (_match, formulaIdWithSuffix) {
        var formulaId = stripAllSuffixes(formulaIdWithSuffix);
        var newId = mapOrSuffix(formulaId, maps.formulaIdMap);
        return "node-formula:".concat(newId);
    });
    // 3.2 : node-condition:xxx
    result = result.replace(/node-condition:([A-Za-z0-9_-]+)/g, function (_match, conditionIdWithSuffix) {
        var conditionId = stripAllSuffixes(conditionIdWithSuffix);
        var newId = mapOrSuffix(conditionId, maps.conditionIdMap);
        return "node-condition:".concat(newId);
    });
    // 3.3 : condition:xxx (standalone)
    // IMPORTANT : Capturer MÊME les IDs avec suffixes existants, puis les nettoyer
    result = result.replace(/condition:([A-Za-z0-9_-]+)/g, function (_match, conditionIdWithSuffix) {
        // Nettoyer d'abord les suffixes existants
        var conditionId = stripAllSuffixes(conditionIdWithSuffix);
        var newId = mapOrSuffix(conditionId, maps.conditionIdMap);
        return "condition:".concat(newId);
    });
    // 3.4 : node-table:xxx
    result = result.replace(/node-table:([A-Za-z0-9_-]+)/g, function (_match, tableIdWithSuffix) {
        var tableId = stripAllSuffixes(tableIdWithSuffix);
        var newId = mapOrSuffix(tableId, maps.tableIdMap);
        return "node-table:".concat(newId);
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // PASSE 4 : UUIDs NUS et node_xxx NUS (dans les arrays nodeIds, etc.)
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITIQUE : Traiter les IDs qui ne sont pas dans un préfixe @value., @table., etc.
    // Cela s'applique aux arrays nodeIds, cellules, configurations JSON, etc.
    // 4.1 : UUIDs nus (xxxxx-xxxx-xxxx-xxxx-xxxxxxx)
    // 🔴 CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
    result = result.replace(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(-\d+)?\b/gi, function (fullMatch, uuid, existingSuffix) {
        // Si suffixe existe déjà, le laisser tel quel (éviter -1-1)
        if (existingSuffix) {
            return fullMatch;
        }
        // Sinon traiter l'UUID
        var newId = mapOrSuffix(uuid, maps.nodeIdMap, false);
        return newId;
    });
    // 4.2 : node_xxx nus (références générées)
    // 🔴 CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
    // Regex : capture `node_` + tout jusqu'au suffixe numérique final optionnel
    result = result.replace(/\b(node_[A-Za-z0-9_-]*[A-Za-z0-9])(-\d+)?\b/g, function (fullMatch, baseNodeId, existingSuffix) {
        // Si suffixe existe déjà, le laisser tel quel
        if (existingSuffix) {
            return fullMatch;
        }
        // Sinon traiter
        var newId = mapOrSuffix(baseNodeId, maps.nodeIdMap, false);
        return newId;
    });
    // 4.3 : shared-ref-xxx nus (références partagées)
    // 🔴 CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
    // Regex : capture `shared-ref-` + tout jusqu'au suffixe numérique final optionnel
    result = result.replace(/\b(shared-ref-[A-Za-z0-9_-]*[A-Za-z0-9])(-\d+)?\b/g, function (fullMatch, baseRefId, existingSuffix) {
        // Si suffixe existe déjà, le laisser tel quel
        if (existingSuffix) {
            return fullMatch;
        }
        // Sinon traiter
        var newId = mapOrSuffix(baseRefId, maps.nodeIdMap, true);
        return newId;
    });
    return result;
}
/**
 * 🔄 Réécrit un objet JSON récursivement en appliquant rewriteReferences sur toutes les strings
 *
 * Utilisé pour réécrire des structures complexes comme conditionSet, tokens, etc.
 *
 * @param obj - Objet à réécrire
 * @param maps - Maps de correspondances
 * @param suffix - Suffixe à appliquer
 * @returns Objet réécrit
 */
function rewriteJsonReferences(obj, maps, suffix) {
    if (obj === null || obj === undefined)
        return obj;
    // String : appliquer rewriteReferences
    if (typeof obj === 'string') {
        return rewriteReferences(obj, maps, suffix);
    }
    // Array : traiter récursivement chaque élément
    if (Array.isArray(obj)) {
        return obj.map(function (item) { return rewriteJsonReferences(item, maps, suffix); });
    }
    // Object : traiter récursivement chaque propriété
    if (typeof obj === 'object') {
        var result = {};
        for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            result[key] = rewriteJsonReferences(value, maps, suffix);
        }
        return result;
    }
    // Autres types (number, boolean, etc.) : retourner tel quel
    return obj;
}
/**
 * 🔥 FORCE TOUS LES SHARED-REFS À ÊTRE SUFFIXÉS
 *
 * Cette fonction traite les tokens d'une formule et force TOUS les
 * @value.shared-ref-* à recevoir un suffix, même s'ils ne sont pas
 * explicitement mappés. Cela garantit que les formules dans les conditions
 * auront TOUS leurs shared-refs suffixés correctement.
 *
 * @param tokens - Tableau de tokens à traiter
 * @param suffix - Suffixe à appliquer
 * @returns Tokens réécrits avec shared-refs forcément suffixés
 */
function forceSharedRefSuffixes(tokens, suffix) {
    if (!Array.isArray(tokens)) {
        console.log("\uD83D\uDD25 [forceSharedRefSuffixes] INPUT NOT ARRAY - Type: ".concat(typeof tokens, ", Value:"), tokens);
        return tokens;
    }
    console.log("\uD83D\uDD25 [forceSharedRefSuffixes] START - ".concat(tokens.length, " tokens, suffix=").concat(suffix));
    var modified = 0;
    var matchCount = 0;
    var result = tokens.map(function (token, idx) {
        if (typeof token === 'string') {
            // Pattern: @value.shared-ref-XXXXXXXX-XXXX (avec ou sans suffix)
            var sharedRefPattern = /^(@value\.shared-ref-[A-Za-z0-9_-]+)(?:-\d+)?$/;
            var match = token.match(sharedRefPattern);
            if (match) {
                matchCount++;
                var baseRef = match[1]; // @value.shared-ref-XXXXX sans suffix
                var alreadySuffixed = /-\d+$/.test(token);
                if (!alreadySuffixed) {
                    var suffixed = "".concat(baseRef, "-").concat(suffix);
                    console.log("\uD83D\uDD25 [idx ".concat(idx, "] MATCHED ET MODIFI\u00C9: \"").concat(token, "\" \u2192 \"").concat(suffixed, "\""));
                    modified++;
                    return suffixed;
                }
                else {
                    console.log("\uD83D\uDD25 [idx ".concat(idx, "] MATCHED MAIS D\u00C9J\u00C0 SUFFIX\u00C9: \"").concat(token, "\""));
                }
            }
            else if (token.includes('shared-ref')) {
                console.warn("\uD83D\uDD25 [idx ".concat(idx, "] \u26A0\uFE0F CONTAINS 'shared-ref' MAIS NE MATCHE PAS regex: \"").concat(token, "\""));
            }
        }
        else {
            if (String(token).includes('shared-ref')) {
                console.warn("\uD83D\uDD25 [idx ".concat(idx, "] \u26A0\uFE0F Token NOT STRING mais contient 'shared-ref': Type=").concat(typeof token, ", Value="), token);
            }
        }
        return token;
    });
    console.log("\uD83D\uDD25 [forceSharedRefSuffixes] END - ".concat(matchCount, " matched, ").concat(modified, " modified sur ").concat(tokens.length));
    return result;
}
/**
 * 🔥 FORCE TOUS LES SHARED-REFS DANS UN OBJET JSON RÉCURSIVEMENT
 *
 * Parcourt TOUS les objets JSON (structures imbriquées) et force TOUS les
 * @value.shared-ref-* à recevoir un suffix, même s'ils ne sont pas mappés.
 * Utile pour les configurations des tables, colonnes, cellules, etc.
 *
 * @param obj - Objet JSON à traiter (peut être profondément imbriqué)
 * @param suffix - Suffixe à appliquer
 * @returns Objet JSON réécrits avec shared-refs forcément suffixés
 */
function forceSharedRefSuffixesInJson(obj, suffix) {
    if (obj === null || obj === undefined)
        return obj;
    if (Array.isArray(obj)) {
        console.log("   \uD83D\uDD25 [forceSharedRefSuffixesInJson] Processing array of ".concat(obj.length, " items"));
        return obj.map(function (item) { return forceSharedRefSuffixesInJson(item, suffix); });
    }
    if (typeof obj === 'string') {
        // Pattern: @value.shared-ref-XXXXXXXX ou @value.shared-ref-XXXXXXXX-XXXX
        var sharedRefPattern = /^(@value\.shared-ref-[A-Za-z0-9_-]+)(?:-\d+)?$/;
        var match = obj.match(sharedRefPattern);
        if (match) {
            var baseRef = match[1];
            var alreadySuffixed = /-\d+$/.test(obj);
            if (!alreadySuffixed) {
                var suffixed = "".concat(baseRef, "-").concat(suffix);
                console.log("   \uD83D\uDD25 JSON string FORC\u00C9: ".concat(obj, " \u2192 ").concat(suffixed));
                return suffixed;
            }
        }
        return obj;
    }
    if (typeof obj === 'object') {
        var modified = 0;
        var result = {};
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                var newVal = forceSharedRefSuffixesInJson(obj[key], suffix);
                result[key] = newVal;
                if (newVal !== obj[key])
                    modified++;
            }
        }
        if (modified > 0) {
            console.log("   \uD83D\uDD25 JSON object: ".concat(modified, " propri\u00E9t\u00E9s modifi\u00E9es"));
        }
        return result;
    }
    return obj;
}
