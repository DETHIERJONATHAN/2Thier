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

export interface RewriteMaps {
  /** Map des nœuds : ancien ID → nouveau ID */
  nodeIdMap: Map<string, string>;
  /** Map des formules : ancien ID → nouveau ID */
  formulaIdMap: Map<string, string>;
  /** Map des conditions : ancien ID → nouveau ID */
  conditionIdMap: Map<string, string>;
  /** Map des tables : ancien ID → nouveau ID */
  tableIdMap: Map<string, string>;
}

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
export function rewriteReferences(
  text: string,
  maps: RewriteMaps,
  suffix?: string | number
): string {
  if (!text) return text;
  
  const suffixStr = suffix !== undefined ? String(suffix) : undefined;
  
  // Fonction helper pour nettoyer les suffixes existants
  const stripAllSuffixes = (id: string): string => {
    // Enlever TOUS les suffixes numériques finaux (ex: "uuid-1-2" → "uuid")
    return id.replace(/(-\d+)+$/, '');
  };
  
  // Fonction helper pour ajouter le suffixe de manière SÛRE (sans doublons)
  const applySuffix = (id: string): string => {
    if (!suffixStr) return id;
    const cleanId = stripAllSuffixes(id);
    return `${cleanId}-${suffixStr}`;
  };
  
  // Fonction helper pour mapper ou suffixer
  const mapOrSuffix = (id: string, map: Map<string, string>, isSharedRef = false): string => {
    // 1. Chercher dans la map (priorité absolue)
    if (map.has(id)) {
      const mapped = map.get(id)!;
      console.log(`🔄 [REWRITE] Mapping trouvé: ${id} → ${mapped}`);
      return mapped;
    }
    
    // 2. Cas spécial : shared-ref DOIT toujours recevoir le suffixe dans un contexte repeat !
    // Les shared-ref-xxx PARTAGÉES doivent rester pareilles SAUF si on a un suffixe (repeat context)
    // Dans un repeat, elles DOIVENT être suffixées pour cohérence
    if (isSharedRef) {
      if (!suffixStr) {
        console.log(`⚪ [REWRITE] Shared-ref conservée (pas de suffixe): ${id}`);
        return id;
      }
      // ⭐ TOUJOURS suffixer les shared-ref dans un repeat context
      const suffixed = applySuffix(id);
      console.log(`➕ [REWRITE] ⭐ SHARED-REF SUFFIXÉE: ${id} → ${suffixed}`);
      return suffixed;
    }
    
    // 3. Appliquer suffixe (nettoie les anciens d'abord)
    const suffixed = applySuffix(id);
    if (suffixed !== id) {
      console.log(`➕ [REWRITE] Suffixe ajouté: ${id} → ${suffixed}`);
    }
    return suffixed;
  };
  
  let result = text;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PASSE 1 : @value.XXX (TOUS les types)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 1.1 : @value.node-formula:xxx
  result = result.replace(
    /@value\.node-formula:([A-Za-z0-9_-]+)/g,
    (_match, formulaIdWithSuffix: string) => {
      const formulaId = stripAllSuffixes(formulaIdWithSuffix);
      const newId = mapOrSuffix(formulaId, maps.formulaIdMap);
      return `@value.node-formula:${newId}`;
    }
  );
  
  // 1.2 : @value.node-condition:xxx
  result = result.replace(
    /@value\.node-condition:([A-Za-z0-9_-]+)/g,
    (_match, conditionIdWithSuffix: string) => {
      const conditionId = stripAllSuffixes(conditionIdWithSuffix);
      const newId = mapOrSuffix(conditionId, maps.conditionIdMap);
      return `@value.node-condition:${newId}`;
    }
  );
  
  // 1.3 : @value.condition:xxx
  result = result.replace(
    /@value\.condition:([A-Za-z0-9_-]+)/g,
    (_match, conditionIdWithSuffix: string) => {
      const conditionId = stripAllSuffixes(conditionIdWithSuffix);
      const newId = mapOrSuffix(conditionId, maps.conditionIdMap);
      return `@value.condition:${newId}`;
    }
  );
  
  // 1.4 : @value.node-table:xxx
  result = result.replace(
    /@value\.node-table:([A-Za-z0-9_-]+)/g,
    (_match, tableIdWithSuffix: string) => {
      const tableId = stripAllSuffixes(tableIdWithSuffix);
      const newId = mapOrSuffix(tableId, maps.tableIdMap);
      return `@value.node-table:${newId}`;
    }
  );
  
  // 1.5 : @value.XXX (UUIDs, node_xxx, shared-ref-xxx)
  // IMPORTANT : Faire ceci APRÈS les autres @value.XXX pour éviter les conflits
  result = result.replace(
    /@value\.([A-Za-z0-9_:-]+)/g,
    (_match, nodeIdWithSuffix: string) => {
      // Ne pas re-traiter les patterns déjà traités ci-dessus
      if (nodeIdWithSuffix.startsWith('node-formula:') || 
          nodeIdWithSuffix.startsWith('node-condition:') || 
          nodeIdWithSuffix.startsWith('condition:') ||
          nodeIdWithSuffix.startsWith('node-table:')) {
        return _match; // Déjà traité
      }
      
      const nodeId = stripAllSuffixes(nodeIdWithSuffix);
      const isSharedRef = nodeId.startsWith('shared-ref-');
      const newId = mapOrSuffix(nodeId, maps.nodeIdMap, isSharedRef);
      return `@value.${newId}`;
    }
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PASSE 2 : @table.XXX
  // ═══════════════════════════════════════════════════════════════════════════
  
  result = result.replace(
    /@table\.([A-Za-z0-9_-]+)/g,
    (_match, tableIdWithSuffix: string) => {
      const tableId = stripAllSuffixes(tableIdWithSuffix);
      const newId = mapOrSuffix(tableId, maps.tableIdMap);
      return `@table.${newId}`;
    }
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PASSE 3 : Références directes (sans @value. ni @table.)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 3.1 : node-formula:xxx
  result = result.replace(
    /node-formula:([A-Za-z0-9_-]+)/g,
    (_match, formulaIdWithSuffix: string) => {
      const formulaId = stripAllSuffixes(formulaIdWithSuffix);
      const newId = mapOrSuffix(formulaId, maps.formulaIdMap);
      return `node-formula:${newId}`;
    }
  );
  
  // 3.2 : node-condition:xxx
  result = result.replace(
    /node-condition:([A-Za-z0-9_-]+)/g,
    (_match, conditionIdWithSuffix: string) => {
      const conditionId = stripAllSuffixes(conditionIdWithSuffix);
      const newId = mapOrSuffix(conditionId, maps.conditionIdMap);
      return `node-condition:${newId}`;
    }
  );
  
  // 3.3 : condition:xxx (standalone)
  // IMPORTANT : Capturer MÊME les IDs avec suffixes existants, puis les nettoyer
  result = result.replace(
    /condition:([A-Za-z0-9_-]+)/g,
    (_match, conditionIdWithSuffix: string) => {
      // Nettoyer d'abord les suffixes existants
      const conditionId = stripAllSuffixes(conditionIdWithSuffix);
      const newId = mapOrSuffix(conditionId, maps.conditionIdMap);
      return `condition:${newId}`;
    }
  );
  
  // 3.4 : node-table:xxx
  result = result.replace(
    /node-table:([A-Za-z0-9_-]+)/g,
    (_match, tableIdWithSuffix: string) => {
      const tableId = stripAllSuffixes(tableIdWithSuffix);
      const newId = mapOrSuffix(tableId, maps.tableIdMap);
      return `node-table:${newId}`;
    }
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PASSE 4 : UUIDs NUS et node_xxx NUS (dans les arrays nodeIds, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITIQUE : Traiter les IDs qui ne sont pas dans un préfixe @value., @table., etc.
  // Cela s'applique aux arrays nodeIds, cellules, configurations JSON, etc.
  
  // 4.1 : UUIDs nus (xxxxx-xxxx-xxxx-xxxx-xxxxxxx)
  // 🔴 CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
  result = result.replace(
    /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(-\d+)?\b/gi,
    (fullMatch: string, uuid: string, existingSuffix?: string) => {
      // Si suffixe existe déjà, le laisser tel quel (éviter -1-1)
      if (existingSuffix) {
        return fullMatch;
      }
      // Sinon traiter l'UUID
      const newId = mapOrSuffix(uuid, maps.nodeIdMap, false);
      return newId;
    }
  );
  
  // 4.2 : node_xxx nus (références générées)
  // 🔴 CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
  // Regex : capture `node_` + tout jusqu'au suffixe numérique final optionnel
  result = result.replace(
    /\b(node_[A-Za-z0-9_-]*[A-Za-z0-9])(-\d+)?\b/g,
    (fullMatch: string, baseNodeId: string, existingSuffix?: string) => {
      // Si suffixe existe déjà, le laisser tel quel
      if (existingSuffix) {
        return fullMatch;
      }
      // Sinon traiter
      const newId = mapOrSuffix(baseNodeId, maps.nodeIdMap, false);
      return newId;
    }
  );
  
  // 4.3 : shared-ref-xxx nus (références partagées)
  // 🔴 CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
  // Regex : capture `shared-ref-` + tout jusqu'au suffixe numérique final optionnel
  result = result.replace(
    /\b(shared-ref-[A-Za-z0-9_-]*[A-Za-z0-9])(-\d+)?\b/g,
    (fullMatch: string, baseRefId: string, existingSuffix?: string) => {
      // Si suffixe existe déjà, le laisser tel quel
      if (existingSuffix) {
        return fullMatch;
      }
      // Sinon traiter
      const newId = mapOrSuffix(baseRefId, maps.nodeIdMap, true);
      return newId;
    }
  );
  
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
export function rewriteJsonReferences<T>(
  obj: T,
  maps: RewriteMaps,
  suffix?: string | number
): T {
  if (obj === null || obj === undefined) return obj;
  
  // String : appliquer rewriteReferences
  if (typeof obj === 'string') {
    return rewriteReferences(obj, maps, suffix) as unknown as T;
  }
  
  // Array : traiter récursivement chaque élément
  if (Array.isArray(obj)) {
    return obj.map(item => rewriteJsonReferences(item, maps, suffix)) as unknown as T;
  }
  
  // Object : traiter récursivement chaque propriété
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = rewriteJsonReferences(value, maps, suffix);
    }
    return result as T;
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
export function forceSharedRefSuffixes(tokens: any, suffix: number): any {
  if (!Array.isArray(tokens)) {
    console.log(`🔥 [forceSharedRefSuffixes] INPUT NOT ARRAY - Type: ${typeof tokens}, Value:`, tokens);
    return tokens;
  }
  
  console.log(`🔥 [forceSharedRefSuffixes] START - ${tokens.length} tokens, suffix=${suffix}`);
  let modified = 0;
  let matchCount = 0;
  
  const result = tokens.map((token: any, idx: number) => {
    if (typeof token === 'string') {
      // Pattern: @value.shared-ref-XXXXXXXX-XXXX (avec ou sans suffix)
      const sharedRefPattern = /^(@value\.shared-ref-[A-Za-z0-9_-]+)(?:-\d+)?$/;
      const match = token.match(sharedRefPattern);
      
      if (match) {
        matchCount++;
        const baseRef = match[1]; // @value.shared-ref-XXXXX sans suffix
        const alreadySuffixed = /-\d+$/.test(token);
        
        if (!alreadySuffixed) {
          const suffixed = `${baseRef}-${suffix}`;
          console.log(`🔥 [idx ${idx}] MATCHED ET MODIFIÉ: "${token}" → "${suffixed}"`);
          modified++;
          return suffixed;
        } else {
          console.log(`🔥 [idx ${idx}] MATCHED MAIS DÉJÀ SUFFIXÉ: "${token}"`);
        }
      } else if (token.includes('shared-ref')) {
        console.warn(`🔥 [idx ${idx}] ⚠️ CONTAINS 'shared-ref' MAIS NE MATCHE PAS regex: "${token}"`);
      }
    } else {
      if (String(token).includes('shared-ref')) {
        console.warn(`🔥 [idx ${idx}] ⚠️ Token NOT STRING mais contient 'shared-ref': Type=${typeof token}, Value=`, token);
      }
    }
    return token;
  });
  
  console.log(`🔥 [forceSharedRefSuffixes] END - ${matchCount} matched, ${modified} modified sur ${tokens.length}`);
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
export function forceSharedRefSuffixesInJson<T extends any>(obj: T, suffix: number): T {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    console.log(`   🔥 [forceSharedRefSuffixesInJson] Processing array of ${obj.length} items`);
    return obj.map((item: any) => forceSharedRefSuffixesInJson(item, suffix)) as T;
  }
  
  if (typeof obj === 'string') {
    // Pattern: @value.shared-ref-XXXXXXXX ou @value.shared-ref-XXXXXXXX-XXXX
    const sharedRefPattern = /^(@value\.shared-ref-[A-Za-z0-9_-]+)(?:-\d+)?$/;
    const match = obj.match(sharedRefPattern);
    
    if (match) {
      const baseRef = match[1];
      const alreadySuffixed = /-\d+$/.test(obj);
      
      if (!alreadySuffixed) {
        const suffixed = `${baseRef}-${suffix}`;
        console.log(`   🔥 JSON string FORCÉ: ${obj} → ${suffixed}`);
        return suffixed as T;
      }
    }
    return obj;
  }
  
  if (typeof obj === 'object') {
    let modified = 0;
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newVal = forceSharedRefSuffixesInJson((obj as any)[key], suffix);
        result[key] = newVal;
        if (newVal !== (obj as any)[key]) modified++;
      }
    }
    if (modified > 0) {
      console.log(`   🔥 JSON object: ${modified} propriétés modifiées`);
    }
    return result as T;
  }
  
  return obj;
}

