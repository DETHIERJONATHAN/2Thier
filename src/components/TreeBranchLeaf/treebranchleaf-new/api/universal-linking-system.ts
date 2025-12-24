/**
 * Ã°Å¸â€â€” SYSTÃƒË†ME UNIVERSEL DE LIAISON AUTOMATIQUE
 * 
 * CE FICHIER EST LA SOURCE DE VÃƒâ€°RITÃƒâ€° POUR TOUTES LES LIAISONS BIDIRECTIONNELLES
 * 
 * PRINCIPE :
 * ---------
 * Quand une capacitÃƒÂ© (condition/formule/table) est crÃƒÂ©ÃƒÂ©e/copiÃƒÂ©e :
 * 1. On extrait TOUS les nodeIds utilisÃƒÂ©s dans la capacitÃƒÂ©
 * 2. On met automatiquement l'ID de la capacitÃƒÂ© dans linkedXXXIds de CHAQUE nÃ…â€œud
 * 
 * Quand une variable charge une capacitÃƒÂ© :
 * 1. On extrait TOUS les nodeIds de la capacitÃƒÂ©
 * 2. On met l'ID de la variable dans linkedVariableIds de CHAQUE nÃ…â€œud
 * 
 * C'EST OBLIGATOIRE ET AUTOMATIQUE - AUCUNE EXCEPTION !
 * 
 * @author DETHIER Jonathan
 * @version 2.0.0 - SYSTÃƒË†ME COMPLET ET OBLIGATOIRE
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸â€œâ€¹ TYPES
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

type LinkedField = 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds';

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸Â§Â­ AIDES DE PARCOURS
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

type CapacityType = 'condition' | 'formula' | 'table' | 'unknown';

function normalizeCapacityRef(raw: string): { type: CapacityType; id: string; canonical: string } {
  const trim = raw.trim();
  const lower = trim.toLowerCase();

  const takeId = (s: string, prefix: string) => s.slice(prefix.length);

  if (lower.startsWith('condition:')) {
    const id = takeId(trim, 'condition:');
    return { type: 'condition', id, canonical: `condition:${id}` };
  }
  if (lower.startsWith('node-condition:')) {
    const id = takeId(trim, 'node-condition:');
    return { type: 'condition', id, canonical: `condition:${id}` };
  }
  if (lower.startsWith('formula:')) {
    const id = takeId(trim, 'formula:');
    return { type: 'formula', id, canonical: `formula:${id}` };
  }
  if (lower.startsWith('node-formula:')) {
    const id = takeId(trim, 'node-formula:');
    return { type: 'formula', id, canonical: `formula:${id}` };
  }
  if (lower.startsWith('table:')) {
    const id = takeId(trim, 'table:');
    return { type: 'table', id, canonical: `table:${id}` };
  }
  if (lower.startsWith('table.')) {
    const id = takeId(trim, 'table.');
    return { type: 'table', id, canonical: `table:${id}` };
  }
  if (lower.startsWith('@table.')) {
    const id = takeId(trim, '@table.');
    return { type: 'table', id, canonical: `table:${id}` };
  }
  if (lower.startsWith('@table:')) {
    const id = takeId(trim, '@table:');
    return { type: 'table', id, canonical: `table:${id}` };
  }
  if (lower.startsWith('node-table:')) {
    const id = takeId(trim, 'node-table:');
    return { type: 'table', id, canonical: `table:${id}` };
  }

  return { type: 'unknown', id: trim, canonical: trim };
}

function extractCapacityRefsFromString(str: string): Set<string> {
  const refs = new Set<string>();
  const regex = /(condition:[a-f0-9-]+|node-condition:[a-f0-9-]+|formula:[a-f0-9-]+|node-formula:[a-f0-9-]+|table:[a-z0-9-]+|table\.[a-z0-9-]+|@table\.[a-z0-9-]+|@table:[a-z0-9-]+|node-table:[a-z0-9-]+)/gi;
  let m;
  while ((m = regex.exec(str)) !== null) {
    refs.add(m[1]);
  }
  return refs;
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸â€Â EXTRACTION DES NODE IDS
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

/**
 * Extrait TOUS les nodeIds d'un conditionSet
 */
export function extractNodeIdsFromCondition(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  
  const str = JSON.stringify(conditionSet);
  
  // Pattern 1: @value.<uuid> ou @calculated.<uuid> ou @select.<uuid> AVEC suffixe optionnel
  const uuidRegex = /@(?:value|calculated|select)\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  // Pattern 2: @value.node_xxx
  const nodeRegex = /@value\.(node_[a-z0-9_-]+)/gi;
  while ((match = nodeRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  // Pattern 3: @value.shared-ref-xxx avec suffixe optionnel
  const sharedRefRegex = /@(?:value|calculated|select)\.(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((match = sharedRefRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  // Pattern 4: nodeIds dans les actions
  const obj = conditionSet as any;
  const extractFromActions = (actions: any[]) => {
    if (!Array.isArray(actions)) return;
    for (const action of actions) {
      if (Array.isArray(action.nodeIds)) {
        for (const nodeId of action.nodeIds) {
          if (typeof nodeId === 'string') {
            // Nettoyer les prÃƒÂ©fixes si prÃƒÂ©sents
            const cleanId = nodeId
              .replace(/^condition:/, '')
              .replace(/^node-formula:/, '')
              .replace(/^node-condition:/, '')
              .replace(/^table:/, '');
            if (cleanId && cleanId !== nodeId) {
              // Si c'ÃƒÂ©tait une rÃƒÂ©fÃƒÂ©rence ÃƒÂ  une autre capacitÃƒÂ©, on ne l'ajoute pas
              // car ce n'est pas un vrai nodeId de champ
              continue;
            }
            ids.add(nodeId);
          }
        }
      }
    }
  };
  
  if (Array.isArray(obj.branches)) {
    for (const branch of obj.branches) {
      if (Array.isArray(branch.actions)) {
        extractFromActions(branch.actions);
      }
    }
  }
  
  if (obj.fallback && Array.isArray(obj.fallback.actions)) {
    extractFromActions(obj.fallback.actions);
  }

  // Fallback: scanner tout le JSON pour des UUID/node_/shared-ref nus (au cas oÃƒÂ¹ le @value. est absent)
  // Ã°Å¸â€Â§ FIX: Capturer les suffixes numÃƒÂ©riques (-1, -2, etc.)
  const genericUuid = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  while ((match = genericUuid.exec(str)) !== null) {
    ids.add(match[1]);
  }
  const genericNode = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
  while ((match = genericNode.exec(str)) !== null) {
    ids.add(match[1]);
  }
  const genericShared = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((match = genericShared.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

function extractNodeAndCapacityRefsFromCondition(conditionSet: unknown): { nodeIds: Set<string>; capacityRefs: Set<string> } {
  const nodeIds = new Set<string>();
  const capacityRefs = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return { nodeIds, capacityRefs };

  const str = JSON.stringify(conditionSet);

  // Patterns @value.* @calculated.* @select.* AVEC suffixes
  const uuidRegex = /@(?:value|calculated|select)\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) nodeIds.add(match[1]);

  const nodeRegex = /@(?:value|calculated|select)\.(node_[a-z0-9_-]+(?:-\d+)?)/gi;
  while ((match = nodeRegex.exec(str)) !== null) nodeIds.add(match[1]);

  const sharedRefRegex = /@(?:value|calculated|select)\.(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((match = sharedRefRegex.exec(str)) !== null) nodeIds.add(match[1]);

  const obj = conditionSet as any;
  const extractFromActions = (actions: any[]) => {
    if (!Array.isArray(actions)) return;
    for (const action of actions) {
      if (Array.isArray(action.nodeIds)) {
        for (const nodeId of action.nodeIds) {
          if (typeof nodeId !== 'string') continue;
          const normalized = normalizeCapacityRef(nodeId);
          if (normalized.type === 'unknown') {
            nodeIds.add(nodeId);
          } else {
            capacityRefs.add(normalized.canonical);
          }
        }
      }
    }
  };

  if (Array.isArray(obj.branches)) {
    for (const branch of obj.branches) {
      if (Array.isArray(branch.actions)) extractFromActions(branch.actions);
    }
  }

  if (obj.fallback && Array.isArray(obj.fallback.actions)) {
    extractFromActions(obj.fallback.actions);
  }

  // Generic scans (UUID/node/shared) for stray refs - AVEC suffixes
  const genericUuid = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  while ((match = genericUuid.exec(str)) !== null) nodeIds.add(match[1]);
  const genericNode = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
  while ((match = genericNode.exec(str)) !== null) nodeIds.add(match[1]);
  const genericShared = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((match = genericShared.exec(str)) !== null) nodeIds.add(match[1]);

  // Capacity refs anywhere in JSON
  for (const ref of extractCapacityRefsFromString(str)) capacityRefs.add(ref);

  return { nodeIds, capacityRefs };
}

/**
 * Extrait TOUS les nodeIds d'un tableau de tokens (formule)
 */
export function extractNodeIdsFromFormula(tokens: unknown): Set<string> {
  const ids = new Set<string>();
  if (!tokens) return ids;
  
  let tokensArray: any[];
  if (typeof tokens === 'string') {
    try {
      tokensArray = JSON.parse(tokens);
    } catch {
      return ids;
    }
  } else if (Array.isArray(tokens)) {
    tokensArray = tokens;
  } else {
    return ids;
  }
  
  for (const token of tokensArray) {
    if (token && typeof token === 'object') {
      // Token de type field
      if (token.type === 'field' && token.fieldId) {
        ids.add(token.fieldId);
      }
      // Token de type nodeValue
      if (token.type === 'nodeValue' && token.nodeId) {
        ids.add(token.nodeId);
      }
      // Autres patterns possibles
      if (token.ref && typeof token.ref === 'string') {
        const match = token.ref.match(/@value\.([a-f0-9-]+)/);
        if (match) ids.add(match[1]);
      }
    }
  }

  // Fallback: scan global JSON for UUID/node_/shared-ref nus
  const str = JSON.stringify(tokensArray);
  let m;
  
  // Ã°Å¸â€Â§ FIX: Capturer les UUIDs AVEC leurs suffixes numÃƒÂ©riques (-1, -2, etc.)
  // Pattern: @value.UUID-suffix ou @calculated.UUID-suffix ou @select.UUID-suffix
  const refWithSuffixRegex = /@(?:value|calculated|select)\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  while ((m = refWithSuffixRegex.exec(str)) !== null) ids.add(m[1]);
  
  // Pattern pour UUID simple (fallback, mais essayer d'abord avec suffixe)
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  while ((m = uuidRegex.exec(str)) !== null) ids.add(m[1]);
  
  const nodeRegex = /(node_[a-z0-9_-]+)/gi;
  while ((m = nodeRegex.exec(str)) !== null) ids.add(m[1]);
  const sharedRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((m = sharedRegex.exec(str)) !== null) ids.add(m[1]);
  
  return ids;
}

function extractNodeAndCapacityRefsFromFormula(tokens: unknown): { nodeIds: Set<string>; capacityRefs: Set<string> } {
  const nodeIds = new Set<string>();
  const capacityRefs = new Set<string>();
  if (!tokens) return { nodeIds, capacityRefs };

  let tokensArray: any[];
  if (typeof tokens === 'string') {
    try {
      tokensArray = JSON.parse(tokens);
    } catch {
      return { nodeIds, capacityRefs };
    }
  } else if (Array.isArray(tokens)) {
    tokensArray = tokens;
  } else {
    return { nodeIds, capacityRefs };
  }

  for (const token of tokensArray) {
    if (!token || typeof token !== 'object') continue;
    if (token.type === 'field' && token.fieldId) nodeIds.add(token.fieldId);
    if (token.type === 'nodeValue' && token.nodeId) nodeIds.add(token.nodeId);
    if (token.ref && typeof token.ref === 'string') {
      const m = token.ref.match(/@value\.([a-f0-9-]+)/);
      if (m) nodeIds.add(m[1]);
    }
  }

  const str = JSON.stringify(tokensArray);
  let m;
  // Ã°Å¸â€Â§ FIX: Capturer les UUIDs AVEC suffixes numÃƒÂ©riques
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  while ((m = uuidRegex.exec(str)) !== null) nodeIds.add(m[1]);
  const nodeRegex = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
  while ((m = nodeRegex.exec(str)) !== null) nodeIds.add(m[1]);
  const sharedRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((m = sharedRegex.exec(str)) !== null) nodeIds.add(m[1]);

  for (const ref of extractCapacityRefsFromString(str)) capacityRefs.add(ref);

  return { nodeIds, capacityRefs };
}

/**
 * Extrait TOUS les nodeIds d'une configuration de table
 */
export function extractNodeIdsFromTable(tableData: unknown): Set<string> {
  const ids = new Set<string>();
  if (!tableData || typeof tableData !== 'object') return ids;
  
  const str = JSON.stringify(tableData);
  
  // Extraire tous les patterns possibles AVEC suffixes
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  const nodeRegex = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
  while ((match = nodeRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  const sharedRefRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((match = sharedRefRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

function extractNodeAndCapacityRefsFromTable(tableData: unknown): { nodeIds: Set<string>; capacityRefs: Set<string> } {
  const nodeIds = new Set<string>();
  const capacityRefs = new Set<string>();
  if (!tableData || typeof tableData !== 'object') return { nodeIds, capacityRefs };

  const str = JSON.stringify(tableData);

  let match;
  // AVEC suffixes
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
  while ((match = uuidRegex.exec(str)) !== null) nodeIds.add(match[1]);

  const nodeRegex = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
  while ((match = nodeRegex.exec(str)) !== null) nodeIds.add(match[1]);

  const sharedRefRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
  while ((match = sharedRefRegex.exec(str)) !== null) nodeIds.add(match[1]);

  for (const ref of extractCapacityRefsFromString(str)) capacityRefs.add(ref);

  return { nodeIds, capacityRefs };
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸â€â€” LIAISON AUTOMATIQUE - FONCTIONS DE BASE
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

/**
 * RÃƒÂ©cupÃƒÂ¨re la valeur actuelle d'un champ linked
 */
async function getNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField
): Promise<string[]> {
  try {
    const node = await client.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { [field]: true }
    });
    
    if (!node) return [];
    
    const value = node[field];
    if (Array.isArray(value)) return value.filter(Boolean);
    return [];
  } catch (e) {
    console.warn(`Ã¢Å¡Â Ã¯Â¸Â Impossible de lire ${field} pour nÃ…â€œud ${nodeId}:`, (e as Error).message);
    return [];
  }
}

/**
 * Définit la valeur d'un champ linked (écrase)
 */
async function setNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField,
  values: string[]
): Promise<void> {
  try {
    // Dédupliquer et filtrer les valeurs nulles
    const uniqueValues = Array.from(new Set(values.filter(Boolean)));
    
    // ⚡ Vérifier d'abord si le nœud existe pour éviter l'erreur Prisma
    const exists = await client.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { id: true }
    });
    
    if (!exists) {
      // Nœud n'existe pas encore (normal lors de la copie), ignorer silencieusement
      return;
    }
    
    await client.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { [field]: uniqueValues } as any
    });
  } catch (e) {
    // Silencieux - le noeud peut ne pas exister
  }
}

async function gatherNodeIdsRecursively(
  client: PrismaLikeClient,
  sourceRef: string,
  visited: Set<string> = new Set()
): Promise<Set<string>> {
  const aggregated = new Set<string>();
  const norm = normalizeCapacityRef(sourceRef);

  const isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sourceRef);
  const isNodeId = /^node_[a-z0-9_-]+$/i.test(sourceRef);
  const isSharedRef = /^shared-ref-[a-z0-9-]+$/i.test(sourceRef);

  // Champs directs
  if (norm.type === 'unknown') {
    if (isUuid || isNodeId || isSharedRef) aggregated.add(sourceRef);
    return aggregated;
  }

  // Ãƒâ€°vite les boucles sur les capacitÃƒÂ©s
  if (visited.has(norm.canonical)) return aggregated;
  visited.add(norm.canonical);

  if (norm.type === 'condition') {
    const condition = await client.treeBranchLeafNodeCondition.findUnique({
      where: { id: norm.id },
      select: { conditionSet: true }
    });
    if (condition) {
      const { nodeIds, capacityRefs } = extractNodeAndCapacityRefsFromCondition(condition.conditionSet);
      for (const id of nodeIds) aggregated.add(id);
      for (const capRef of capacityRefs) {
        const rec = await gatherNodeIdsRecursively(client, capRef, visited);
        for (const id of rec) aggregated.add(id);
      }
    }
    return aggregated;
  }

  if (norm.type === 'formula') {
    const formula = await client.treeBranchLeafNodeFormula.findUnique({
      where: { id: norm.id },
      select: { tokens: true }
    });
    if (formula) {
      const { nodeIds, capacityRefs } = extractNodeAndCapacityRefsFromFormula(formula.tokens);
      for (const id of nodeIds) aggregated.add(id);
      for (const capRef of capacityRefs) {
        const rec = await gatherNodeIdsRecursively(client, capRef, visited);
        for (const id of rec) aggregated.add(id);
      }
    }
    return aggregated;
  }

  if (norm.type === 'table') {
    const table = await client.treeBranchLeafNodeTable.findUnique({
      where: { id: norm.id },
      select: { meta: true, tableRows: true, tableColumns: true }
    });
    if (table) {
      const { nodeIds, capacityRefs } = extractNodeAndCapacityRefsFromTable({
        meta: table.meta,
        rows: table.tableRows,
        columns: table.tableColumns,
      });
      for (const id of nodeIds) aggregated.add(id);
      for (const capRef of capacityRefs) {
        const rec = await gatherNodeIdsRecursively(client, capRef, visited);
        for (const id of rec) aggregated.add(id);
      }
    }
    return aggregated;
  }

  return aggregated;
}

/**
 * Ajoute des IDs ÃƒÂ  un champ linked (sans doublons)
 */
export async function addToNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField,
  idsToAdd: string[]
): Promise<void> {
  if (!idsToAdd || idsToAdd.length === 0) return;
  
  const current = await getNodeLinkedField(client, nodeId, field);
  const updated = Array.from(new Set([...current, ...idsToAdd.filter(Boolean)]));
  
  if (updated.length === current.length) return; // Rien ÃƒÂ  ajouter
  
  await setNodeLinkedField(client, nodeId, field, updated);
}

/**
 * Retire des IDs d'un champ linked
 */
export async function removeFromNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField,
  idsToRemove: string[]
): Promise<void> {
  if (!idsToRemove || idsToRemove.length === 0) return;
  
  const current = await getNodeLinkedField(client, nodeId, field);
  const toRemoveSet = new Set(idsToRemove);
  const updated = current.filter(id => !toRemoveSet.has(id));
  
  if (updated.length === current.length) return; // Rien ÃƒÂ  retirer
  
  await setNodeLinkedField(client, nodeId, field, updated);
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸Å½Â¯ SYSTÃƒË†ME AUTOMATIQUE DE LIAISON - CAPACITÃƒâ€°S
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

/**
 * Lie automatiquement une CONDITION ÃƒÂ  tous ses nÃ…â€œuds rÃƒÂ©fÃƒÂ©rencÃƒÂ©s
 * 
 * OBLIGATOIRE : Cette fonction DOIT ÃƒÂªtre appelÃƒÂ©e ÃƒÂ  chaque crÃƒÂ©ation/copie de condition
 */
export async function linkConditionToAllNodes(
  client: PrismaLikeClient,
  conditionId: string,
  conditionSet: unknown
): Promise<void> {
  
  // 1. Extraire TOUS les nodeIds
  const nodeIds = extractNodeIdsFromCondition(conditionSet);
  
  // 2. Pour CHAQUE nÃ…â€œud, ajouter l'ID de la condition dans linkedConditionIds
  let successCount = 0;
  let errorCount = 0;
  
  for (const nodeId of nodeIds) {
    try {
      await addToNodeLinkedField(client, nodeId, 'linkedConditionIds', [conditionId]);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error(`   Ã¢ÂÅ’ ${nodeId} Ã¢â€ â€™ Ãƒâ€°CHEC:`, (e as Error).message);
    }
  }
  
}

/**
 * Lie automatiquement une FORMULE ÃƒÂ  tous ses nÃ…â€œuds rÃƒÂ©fÃƒÂ©rencÃƒÂ©s
 * 
 * OBLIGATOIRE : Cette fonction DOIT ÃƒÂªtre appelÃƒÂ©e ÃƒÂ  chaque crÃƒÂ©ation/copie de formule
 */
export async function linkFormulaToAllNodes(
  client: PrismaLikeClient,
  formulaId: string,
  tokens: unknown
): Promise<void> {
  
  // 1. Extraire TOUS les nodeIds
  const nodeIds = extractNodeIdsFromFormula(tokens);
  
  // 2. Pour CHAQUE nÃ…â€œud, ajouter l'ID de la formule dans linkedFormulaIds
  let successCount = 0;
  let errorCount = 0;
  
  for (const nodeId of nodeIds) {
    try {
      await addToNodeLinkedField(client, nodeId, 'linkedFormulaIds', [formulaId]);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error(`   Ã¢ÂÅ’ ${nodeId} Ã¢â€ â€™ Ãƒâ€°CHEC:`, (e as Error).message);
    }
  }
  
}

/**
 * Lie automatiquement une TABLE ÃƒÂ  tous ses nÃ…â€œuds rÃƒÂ©fÃƒÂ©rencÃƒÂ©s
 * 
 * OBLIGATOIRE : Cette fonction DOIT ÃƒÂªtre appelÃƒÂ©e ÃƒÂ  chaque crÃƒÂ©ation/copie de table
 */
export async function linkTableToAllNodes(
  client: PrismaLikeClient,
  tableId: string,
  tableData: unknown
): Promise<void> {
  
  // 1. Extraire TOUS les nodeIds
  const nodeIds = extractNodeIdsFromTable(tableData);
  
  // 2. Pour CHAQUE nÃ…â€œud, ajouter l'ID de la table dans linkedTableIds
  let successCount = 0;
  let errorCount = 0;
  
  for (const nodeId of nodeIds) {
    try {
      await addToNodeLinkedField(client, nodeId, 'linkedTableIds', [tableId]);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error(`   Ã¢ÂÅ’ ${nodeId} Ã¢â€ â€™ Ãƒâ€°CHEC:`, (e as Error).message);
    }
  }
  
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸Å½Â¯ SYSTÃƒË†ME AUTOMATIQUE DE LIAISON - VARIABLES
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

/**
 * Lie automatiquement une VARIABLE ÃƒÂ  tous les nÃ…â€œuds de SA CAPACITÃƒâ€°
 * 
 * OBLIGATOIRE : Cette fonction DOIT ÃƒÂªtre appelÃƒÂ©e quand une variable charge une capacitÃƒÂ©
 */
export async function linkVariableToAllCapacityNodes(
  client: PrismaLikeClient,
  variableId: string,
  sourceRef: string
): Promise<void> {
  
  try {
    const nodeIds = await gatherNodeIdsRecursively(client, sourceRef);
    
    // 2. Pour CHAQUE nÃ…â€œud, ajouter l'ID de la variable dans linkedVariableIds
    let successCount = 0;
    let errorCount = 0;
    
    for (const nodeId of nodeIds) {
      try {
        await addToNodeLinkedField(client, nodeId, 'linkedVariableIds', [variableId]);
        successCount++;
      } catch (e) {
        errorCount++;
        console.error(`   Ã¢ÂÅ’ ${nodeId} Ã¢â€ â€™ Ãƒâ€°CHEC:`, (e as Error).message);
      }
    }
    
    
  } catch (e) {
    console.error(`   Ã¢ÂÅ’ Erreur lors de la liaison variable:`, (e as Error).message);
  }
  
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã°Å¸Â§Â¹ NETTOYAGE DES LIAISONS
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

/**
 * Retire une capacitÃƒÂ© de tous les nÃ…â€œuds liÃƒÂ©s
 */
export async function unlinkCapacityFromAllNodes(
  client: PrismaLikeClient,
  capacityType: 'condition' | 'formula' | 'table',
  capacityId: string,
  capacityData: unknown
): Promise<void> {
  
  let nodeIds: Set<string> = new Set();
  let field: LinkedField;
  
  switch (capacityType) {
    case 'condition':
      nodeIds = extractNodeIdsFromCondition(capacityData);
      field = 'linkedConditionIds';
      break;
    case 'formula':
      nodeIds = extractNodeIdsFromFormula(capacityData);
      field = 'linkedFormulaIds';
      break;
    case 'table':
      nodeIds = extractNodeIdsFromTable(capacityData);
      field = 'linkedTableIds';
      break;
  }
  
  
  for (const nodeId of nodeIds) {
    try {
      await removeFromNodeLinkedField(client, nodeId, field, [capacityId]);
    } catch (e) {
      console.error(`   Ã¢ÂÅ’ ${nodeId} Ã¢â€ â€™ Ãƒâ€°CHEC:`, (e as Error).message);
    }
  }
  
}

/**
 * Retire une variable de tous les nÃ…â€œuds liÃƒÂ©s
 */
export async function unlinkVariableFromAllNodes(
  client: PrismaLikeClient,
  variableId: string,
  sourceRef: string
): Promise<void> {
  
  // On rÃƒÂ©utilise la mÃƒÂªme logique d'extraction que pour la crÃƒÂ©ation
  // mais on retire au lieu d'ajouter
  
  // TODO: ImplÃƒÂ©menter si nÃƒÂ©cessaire
  
}
