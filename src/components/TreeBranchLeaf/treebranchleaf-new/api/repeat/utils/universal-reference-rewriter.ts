/**
 * Ã°Å¸â€â€ž SYSTÃƒË†ME UNIVERSEL DE RÃƒâ€°Ãƒâ€°CRITURE DES RÃƒâ€°FÃƒâ€°RENCES
 * Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
 * 
 * Ce module gÃƒÂ¨re la rÃƒÂ©ÃƒÂ©criture de TOUTES les rÃƒÂ©fÃƒÂ©rences TBL avec suffixes.
 * Il traite TOUS les formats possibles identifiÃƒÂ©s dans operation-interpreter.ts
 * 
 * FORMATS SUPPORTÃƒâ€°S :
 * -------------------
 * 1. @value.UUID                     Ã¢â€ â€™ @value.UUID-1
 * 2. @value.node_xxx                 Ã¢â€ â€™ @value.node_xxx-1
 * 3. @value.shared-ref-xxx           Ã¢â€ â€™ @value.shared-ref-xxx-1 (si mappÃƒÂ©)
 * 4. @value.node-formula:xxx         Ã¢â€ â€™ @value.node-formula:xxx-1
 * 5. @value.node-condition:xxx       Ã¢â€ â€™ @value.node-condition:xxx-1
 * 6. @value.condition:xxx            Ã¢â€ â€™ @value.condition:xxx-1
 * 7. @value.node-table:xxx           Ã¢â€ â€™ @value.node-table:xxx-1
 * 8. @table.xxx                      Ã¢â€ â€™ @table.xxx-1
 * 9. node-formula:xxx                Ã¢â€ â€™ node-formula:xxx-1
 * 10. node-condition:xxx / condition:xxx Ã¢â€ â€™ node-condition:xxx-1 / condition:xxx-1
 * 11. node-table:xxx                 Ã¢â€ â€™ node-table:xxx-1
 * 12. UUID nu                        Ã¢â€ â€™ UUID-1
 * 13. node_xxx nu                    Ã¢â€ â€™ node_xxx-1
 * 14. shared-ref-xxx nu              Ã¢â€ â€™ shared-ref-xxx-1 (si mappÃƒÂ©)
 * 
 * @author System TBL
 * @version 1.0.0
 */

export interface RewriteMaps {
  /** Map des nÃ…â€œuds : ancien ID Ã¢â€ â€™ nouveau ID */
  nodeIdMap: Map<string, string>;
  /** Map des formules : ancien ID Ã¢â€ â€™ nouveau ID */
  formulaIdMap: Map<string, string>;
  /** Map des conditions : ancien ID Ã¢â€ â€™ nouveau ID */
  conditionIdMap: Map<string, string>;
  /** Map des tables : ancien ID Ã¢â€ â€™ nouveau ID */
  tableIdMap: Map<string, string>;
}

/**
 * Ã°Å¸â€â€ž RÃƒÂ©ÃƒÂ©crit une chaÃƒÂ®ne contenant N'IMPORTE QUELLE rÃƒÂ©fÃƒÂ©rence TBL avec suffixe
 * 
 * Cette fonction est UNIVERSELLE : elle dÃƒÂ©tecte et transforme TOUS les types
 * de rÃƒÂ©fÃƒÂ©rences TBL en appliquant le suffixe appropriÃƒÂ©.
 * 
 * ALGORITHME :
 * ------------
 * 1. Chercher chaque rÃƒÂ©fÃƒÂ©rence dans les maps (prioritÃƒÂ© absolue)
 * 2. Si pas trouvÃƒÂ©e et suffixe fourni Ã¢â€ â€™ ajouter suffixe
 * 3. Cas spÃƒÂ©cial : shared-ref sans mapping Ã¢â€ â€™ laisser tel quel
 * 
 * @param text - Texte contenant les rÃƒÂ©fÃƒÂ©rences ÃƒÂ  rÃƒÂ©ÃƒÂ©crire
 * @param maps - Maps de correspondances ancienÃ¢â€ â€™nouveau
 * @param suffix - Suffixe ÃƒÂ  appliquer si pas de mapping trouvÃƒÂ©
 * @returns Texte avec rÃƒÂ©fÃƒÂ©rences rÃƒÂ©ÃƒÂ©crites
 * 
 * @example
 * rewriteReferences(
 *   '["@value.abc", "+", "@value.node-formula:def"]',
 *   { nodeIdMap: new Map([['abc', 'abc-1']]), ... },
 *   1
 * )
 * Ã¢â€ â€™ '["@value.abc-1", "+", "@value.node-formula:def-1"]'
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
    // Enlever TOUS les suffixes numÃƒÂ©riques finaux (ex: "uuid-1-2" Ã¢â€ â€™ "uuid")
    return id.replace(/(-\d+)+$/, '');
  };
  
  // Fonction helper pour ajouter le suffixe de maniÃƒÂ¨re SÃƒâ€ºRE (sans doublons)
  const applySuffix = (id: string): string => {
    if (!suffixStr) return id;
    const cleanId = stripAllSuffixes(id);
    return `${cleanId}-${suffixStr}`;
  };
  
  // Fonction helper pour mapper ou suffixer
  const mapOrSuffix = (id: string, map: Map<string, string>, isSharedRef = false): string => {
    // 1. Chercher dans la map (prioritÃƒÂ© absolue)
    if (map.has(id)) {
      const mapped = map.get(id)!;
      return mapped;
    }
    
    // 2. Cas spÃƒÂ©cial : shared-ref DOIT toujours recevoir le suffixe dans un contexte repeat !
    // Les shared-ref-xxx PARTAGÃƒâ€°ES doivent rester pareilles SAUF si on a un suffixe (repeat context)
    // Dans un repeat, elles DOIVENT ÃƒÂªtre suffixÃƒÂ©es pour cohÃƒÂ©rence
    if (isSharedRef) {
      if (!suffixStr) {
        return id;
      }
      // Ã¢Â­Â TOUJOURS suffixer les shared-ref dans un repeat context
      const suffixed = applySuffix(id);
      return suffixed;
    }
    
    // 3. Appliquer suffixe (nettoie les anciens d'abord)
    const suffixed = applySuffix(id);
    if (suffixed !== id) {
    }
    return suffixed;
  };
  
  let result = text;
  
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // PASSE 1 : @value.XXX (TOUS les types)
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  
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
  // IMPORTANT : Faire ceci APRÃƒË†S les autres @value.XXX pour ÃƒÂ©viter les conflits
  result = result.replace(
    /@value\.([A-Za-z0-9_:-]+)/g,
    (_match, nodeIdWithSuffix: string) => {
      // Ne pas re-traiter les patterns dÃƒÂ©jÃƒÂ  traitÃƒÂ©s ci-dessus
      if (nodeIdWithSuffix.startsWith('node-formula:') || 
          nodeIdWithSuffix.startsWith('node-condition:') || 
          nodeIdWithSuffix.startsWith('condition:') ||
          nodeIdWithSuffix.startsWith('node-table:')) {
        return _match; // DÃƒÂ©jÃƒÂ  traitÃƒÂ©
      }
      
      const nodeId = stripAllSuffixes(nodeIdWithSuffix);
      const isSharedRef = nodeId.startsWith('shared-ref-');
      const newId = mapOrSuffix(nodeId, maps.nodeIdMap, isSharedRef);
      return `@value.${newId}`;
    }
  );
  
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // PASSE 2 : @table.XXX
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  
  result = result.replace(
    /@table\.([A-Za-z0-9_-]+)/g,
    (_match, tableIdWithSuffix: string) => {
      const tableId = stripAllSuffixes(tableIdWithSuffix);
      const newId = mapOrSuffix(tableId, maps.tableIdMap);
      return `@table.${newId}`;
    }
  );
  
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // PASSE 3 : RÃƒÂ©fÃƒÂ©rences directes (sans @value. ni @table.)
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  
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
  // IMPORTANT : Capturer MÃƒÅ ME les IDs avec suffixes existants, puis les nettoyer
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
  
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // PASSE 4 : UUIDs NUS et node_xxx NUS (dans les arrays nodeIds, etc.)
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // CRITIQUE : Traiter les IDs qui ne sont pas dans un prÃƒÂ©fixe @value., @table., etc.
  // Cela s'applique aux arrays nodeIds, cellules, configurations JSON, etc.
  
  // 4.1 : UUIDs nus (xxxxx-xxxx-xxxx-xxxx-xxxxxxx)
  // Ã°Å¸â€Â´ CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
  result = result.replace(
    /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(-\d+)?\b/gi,
    (fullMatch: string, uuid: string, existingSuffix?: string) => {
      // Si suffixe existe dÃƒÂ©jÃƒÂ , le laisser tel quel (ÃƒÂ©viter -1-1)
      if (existingSuffix) {
        return fullMatch;
      }
      // Sinon traiter l'UUID
      const newId = mapOrSuffix(uuid, maps.nodeIdMap, false);
      return newId;
    }
  );
  
  // 4.2 : node_xxx nus (rÃƒÂ©fÃƒÂ©rences gÃƒÂ©nÃƒÂ©rÃƒÂ©es)
  // Ã°Å¸â€Â´ CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
  // Regex : capture `node_` + tout jusqu'au suffixe numÃƒÂ©rique final optionnel
  result = result.replace(
    /\b(node_[A-Za-z0-9_-]*[A-Za-z0-9])(-\d+)?\b/g,
    (fullMatch: string, baseNodeId: string, existingSuffix?: string) => {
      // Si suffixe existe dÃƒÂ©jÃƒÂ , le laisser tel quel
      if (existingSuffix) {
        return fullMatch;
      }
      // Sinon traiter
      const newId = mapOrSuffix(baseNodeId, maps.nodeIdMap, false);
      return newId;
    }
  );
  
  // 4.3 : shared-ref-xxx nus (rÃƒÂ©fÃƒÂ©rences partagÃƒÂ©es)
  // Ã°Å¸â€Â´ CRITIQUE : Capturer AUSSI les suffixes existants pour ne pas les re-traiter !
  // Regex : capture `shared-ref-` + tout jusqu'au suffixe numÃƒÂ©rique final optionnel
  result = result.replace(
    /\b(shared-ref-[A-Za-z0-9_-]*[A-Za-z0-9])(-\d+)?\b/g,
    (fullMatch: string, baseRefId: string, existingSuffix?: string) => {
      // Si suffixe existe dÃƒÂ©jÃƒÂ , le laisser tel quel
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
 * Ã°Å¸â€â€ž RÃƒÂ©ÃƒÂ©crit un objet JSON rÃƒÂ©cursivement en appliquant rewriteReferences sur toutes les strings
 * 
 * UtilisÃƒÂ© pour rÃƒÂ©ÃƒÂ©crire des structures complexes comme conditionSet, tokens, etc.
 * 
 * @param obj - Objet ÃƒÂ  rÃƒÂ©ÃƒÂ©crire
 * @param maps - Maps de correspondances
 * @param suffix - Suffixe ÃƒÂ  appliquer
 * @returns Objet rÃƒÂ©ÃƒÂ©crit
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
  
  // Array : traiter rÃƒÂ©cursivement chaque ÃƒÂ©lÃƒÂ©ment
  if (Array.isArray(obj)) {
    return obj.map(item => rewriteJsonReferences(item, maps, suffix)) as unknown as T;
  }
  
  // Object : traiter rÃƒÂ©cursivement chaque propriÃƒÂ©tÃƒÂ©
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
 * Ã°Å¸â€Â¥ FORCE TOUS LES SHARED-REFS Ãƒâ‚¬ ÃƒÅ TRE SUFFIXÃƒâ€°S
 * 
 * Cette fonction traite les tokens d'une formule et force TOUS les
 * @value.shared-ref-* ÃƒÂ  recevoir un suffix, mÃƒÂªme s'ils ne sont pas
 * explicitement mappÃƒÂ©s. Cela garantit que les formules dans les conditions
 * auront TOUS leurs shared-refs suffixÃƒÂ©s correctement.
 * 
 * @param tokens - Tableau de tokens ÃƒÂ  traiter
 * @param suffix - Suffixe ÃƒÂ  appliquer
 * @returns Tokens rÃƒÂ©ÃƒÂ©crits avec shared-refs forcÃƒÂ©ment suffixÃƒÂ©s
 */
export function forceSharedRefSuffixes(tokens: any, suffix: number): any {
  if (!Array.isArray(tokens)) {
    return tokens;
  }
  
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
          modified++;
          return suffixed;
        } else {
        }
      } else if (token.includes('shared-ref')) {
        console.warn(`Ã°Å¸â€Â¥ [idx ${idx}] Ã¢Å¡Â Ã¯Â¸Â CONTAINS 'shared-ref' MAIS NE MATCHE PAS regex: "${token}"`);
      }
    } else {
      if (String(token).includes('shared-ref')) {
        console.warn(`Ã°Å¸â€Â¥ [idx ${idx}] Ã¢Å¡Â Ã¯Â¸Â Token NOT STRING mais contient 'shared-ref': Type=${typeof token}, Value=`, token);
      }
    }
    return token;
  });
  
  return result;
}

/**
 * Ã°Å¸â€Â¥ FORCE TOUS LES SHARED-REFS DANS UN OBJET JSON RÃƒâ€°CURSIVEMENT
 * 
 * Parcourt TOUS les objets JSON (structures imbriquÃƒÂ©es) et force TOUS les
 * @value.shared-ref-* ÃƒÂ  recevoir un suffix, mÃƒÂªme s'ils ne sont pas mappÃƒÂ©s.
 * Utile pour les configurations des tables, colonnes, cellules, etc.
 * 
 * @param obj - Objet JSON ÃƒÂ  traiter (peut ÃƒÂªtre profondÃƒÂ©ment imbriquÃƒÂ©)
 * @param suffix - Suffixe ÃƒÂ  appliquer
 * @returns Objet JSON rÃƒÂ©ÃƒÂ©crits avec shared-refs forcÃƒÂ©ment suffixÃƒÂ©s
 */
export function forceSharedRefSuffixesInJson<T extends any>(obj: T, suffix: number): T {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
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
    }
    return result as T;
  }
  
  return obj;
}

