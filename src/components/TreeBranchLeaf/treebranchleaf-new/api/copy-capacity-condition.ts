/**
 * 🔀 Système de copie des CONDITIONS
 * 
 * Ce module gère la copie complète d'une condition (TreeBranchLeafNodeCondition)
 * avec réécriture du conditionSet pour pointer vers les nouveaux IDs.
 * 
 * PRINCIPES :
 * -----------
 * 1. Copier la condition avec suffixe
 * 2. Réécrire le conditionSet (@value.ID → @value.ID-suffix)
 * 3. Réécrire les références de formules (node-formula:ID → node-formula:ID-suffix)
 * 4. Mettre à jour linkedConditionIds du nœud propriétaire
 * 5. 🔗 LIAISON AUTOMATIQUE OBLIGATOIRE: linkedConditionIds sur TOUS les nœuds référencés
 * 6. Synchroniser les paramètres de capacité (hasCondition, condition_activeId, etc.)
 * 
 * @author System TBL
 * @version 2.0.0 - LIAISON AUTOMATIQUE OBLIGATOIRE
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { linkConditionToAllNodes } from './universal-linking-system';
import { rewriteJsonReferences, forceSharedRefSuffixesInJson, type RewriteMaps } from './repeat/utils/universal-reference-rewriter.js';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options pour la copie de condition
 */
export interface CopyConditionOptions {
  /** Map des nœuds copiés (ancien ID → nouveau ID) pour réécrire les @value.ID */
  nodeIdMap?: Map<string, string>;
  /** Map des formules copiées (ancien ID → nouveau ID) pour réécrire node-formula:ID */
  formulaIdMap?: Map<string, string>;
  /** Map des tables copiées (ancien ID → nouveau ID) pour réécrire node-table:ID */
  tableIdMap?: Map<string, string>;
  /** Map des conditions déjà copiées (cache pour éviter doublons) */
  conditionCopyCache?: Map<string, string>;
}

/**
 * Résultat de la copie d'une condition
 */
export interface CopyConditionResult {
  /** ID de la condition copiée */
  newConditionId: string;
  /** ID du nœud propriétaire */
  nodeId: string;
  /** conditionSet réécrit */
  conditionSet: Prisma.InputJsonValue;
  /** Succès de l'opération */
  success: boolean;
  /** Message d'erreur éventuel */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 RÉGÉNÉRATION DES IDs INTERNES (CRITICAL !)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔴 CRITIQUE : Régénère TOUS les IDs internes du conditionSet
 * 
 * Les IDs internes (branches, actions, conditions binaires, fallbacks) doivent être
 * uniques et suffixés lors de la copie.
 * 
 * Format des IDs internes :
 * - Branches: b_xxxxxxxx → b_xxxxxxxx-{suffix}
 * - Actions: a_xxxxxxxx → a_xxxxxxxx-{suffix}
 * - Conditions binaires: bin_xxxxxxxx → bin_xxxxxxxx-{suffix}
 * - Fallbacks: fb_xxxxxxxx → fb_xxxxxxxx-{suffix}
 * - ID principal condition: cond_xxxxxxxx → cond_xxxxxxxx-{suffix}
 * 
 * @param conditionSet - Le conditionSet contenant les IDs internes
 * @param suffix - Suffixe à ajouter
 * @returns Nouveau conditionSet avec IDs internes régénérés
 */
function regenerateInternalIds(conditionSet: unknown, suffix: number | string): Prisma.InputJsonValue {
  if (!conditionSet || typeof conditionSet !== 'object') {
    return conditionSet as Prisma.InputJsonValue;
  }

  try {
    const suffixStr = String(suffix);
    
    // Créer une copie profonde
    let result = JSON.parse(JSON.stringify(conditionSet));
    
    // Parcourir récursivement et renommer les IDs internes
    const processObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(processObject);
      }
      
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'id' && typeof value === 'string') {
          // C'est un ID interne (b_xxx, a_xxx, bin_xxx, fb_xxx) OU l'ID principal (cond_xxx)
          // IMPORTANT: Inclure les tirets dans la classe de caractères !
          if (value.match(/^(b|a|bin|fb|cond)_[A-Za-z0-9_-]+$/)) {
            const newId = `${value}-${suffixStr}`;
            console.log(`   🔀 Renommage ID: ${value} → ${newId}`);
            newObj[key] = newId;
          } else {
            newObj[key] = value;
          }
        } else if (typeof value === 'object') {
          newObj[key] = processObject(value);
        } else {
          newObj[key] = value;
        }
      }
      return newObj;
    };
    
    result = processObject(result);
    return result as Prisma.InputJsonValue;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la régénération des IDs internes:`, error);
    return conditionSet as Prisma.InputJsonValue;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS D'EXTRACTION D'IDs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrait TOUS les IDs de nœuds référencés dans un conditionSet
 * (utilisé pour les mises à jour bidirectionnelles)
 * 
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de nœuds trouvés
 */
function extractNodeIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  
  const obj = conditionSet as Record<string, unknown>;
  const str = JSON.stringify(obj);
  
  // Extraire tous les @value.<id>
  const uuidRegex = /@value\.([a-f0-9-]{36})/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  // Extraire les node_xxx
  const nodeRegex = /@value\.(node_[a-z0-9_-]+)/gi;
  while ((match = nodeRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

/**
 * 🔗 EXTRACTION AUTOMATIQUE : Extrait TOUTES les conditions référencées dans le conditionSet
 * Cela permet de copier AUTOMATIQUEMENT les conditions liées MÊME SI elles ne sont
 * pas explicitement dans linkedConditionIds
 * 
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de conditions trouvés (sans doublons)
 */
function extractLinkedConditionIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  
  const str = JSON.stringify(conditionSet);
  
  // 🔥 PATTERN AMÉLIORÉ: accepte les UUIDs avec suffixes (UUID-N)
  // Extraire TOUTES les références de condition:XXX ou node-condition:XXX
  const conditionRegex = /(?:condition|node-condition):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
  let match;
  while ((match = conditionRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

/**
 * Extrait TOUTES les tables référencées dans un conditionSet
 * Formats supportés:
 * - @table.ID
 * - node-table:ID
 * - @value.node-table:ID
 * 
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de tables trouvés (sans doublons)
 */
function extractLinkedTableIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  
  const str = JSON.stringify(conditionSet);
  
  // 🔥 PATTERN AMÉLIORÉ: accepte les UUIDs avec suffixes (UUID-N)
  // Extraire @table:XXX
  const tableRegex1 = /@table\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
  let match;
  while ((match = tableRegex1.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  // Extraire node-table:XXX
  const tableRegex2 = /node-table:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
  while ((match = tableRegex2.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

/**
 * Remplace les occurrences dans le JSON selon une Map de replacements
 * 
 * @param json - JSON à modifier
 * @param replacements - Map de "recherche" → "remplacement"
 * @returns Nouveau JSON avec remplacements appliqués
 */
function replaceInJson(json: unknown, replacements: Map<string, string>): Prisma.InputJsonValue {
  if (!json || typeof json !== 'object') {
    return json as Prisma.InputJsonValue;
  }
  
  try {
    let str = JSON.stringify(json);
    
    // Remplacer toutes les occurrences
    for (const [search, replacement] of replacements) {
      str = str.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }
    
    return JSON.parse(str) as Prisma.InputJsonValue;
  } catch (error) {
    console.error(`❌ Erreur lors du remplacement dans JSON:`, error);
    return json as Prisma.InputJsonValue;
  }
}

/**
 * Extrait TOUTES les formules référencées dans un conditionSet
 * Formats supportés:
 * - node-formula:ID
 * 
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de formules trouvés (sans doublons)
 */
function extractLinkedFormulaIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  
  const str = JSON.stringify(conditionSet);
  
  // Extraire TOUTES les références de node-formula:XXX
  // 🔥 PATTERN AMÉLIORÉ: accepte les UUIDs avec suffixes (UUID-N)
  const formulaRegex = /node-formula:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
  let match;
  while ((match = formulaRegex.exec(str)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

// ═══════════════════════════════════════════════════════════════════════════
// �🔧 FONCTIONS UTILITAIRES DE RÉÉCRITURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Réécrire le conditionSet d'une condition pour remplacer les anciens IDs par les nouveaux
 * 
 * Format du conditionSet :
 * - branches[].when.left/right.ref : "@value.<nodeId>"
 * - branches[].actions[].nodeIds : ["node-xxx", "uuid-yyy"]
 * - fallback.actions[].nodeIds
 * - Références de formules : "node-formula:<formulaId>"
 * 
 * @param conditionSet - conditionSet original
 * @param nodeIdMap - Map ancien ID nœud → nouveau ID nœud
 * @param formulaIdMap - Map ancien ID formule → nouveau ID formule
 * @returns conditionSet réécrit
 * 
 * @example
 * rewriteConditionSet(
 *   { branches: [{ when: { left: { ref: "@value.abc" } } }] },
 *   new Map([["abc", "abc-1"]]),
 *   new Map()
 * )
 * → { branches: [{ when: { left: { ref: "@value.abc-1" } } }] }
 */
function rewriteConditionSet(
  conditionSet: unknown,
  nodeIdMap: Map<string, string>,
  formulaIdMap: Map<string, string>,
  suffix?: number
): Prisma.InputJsonValue {
  if (!conditionSet || typeof conditionSet !== 'object') {
    return conditionSet as Prisma.InputJsonValue;
  }

  try {
    // 0️⃣ Travaux de réécriture en deux passes: regex globaux puis parcours ciblé
    let str = JSON.stringify(conditionSet);

    // 1️⃣ Réécrire les @value.<nodeId> (avec fallback suffix si non mappé, mais jamais pour shared-ref sans mapping)
    str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_match, nodeId: string) => {
      const mapped = nodeIdMap.get(nodeId);
      if (mapped) return `@value.${mapped}`;
      const isSharedRef = nodeId.startsWith('shared-ref-');
      if (isSharedRef) return `@value.${nodeId}`; // ne pas suffixer une shared-ref sans mapping
      if (suffix !== undefined) {
        const suffixStr = `${suffix}`;
        return `@value.${nodeId}-${suffixStr}`;
      }
      return `@value.${nodeId}`;
    });

    // 2️⃣ Réécrire les node-formula:<id> (IDs CUID/UUID supportés) avec fallback suffix
    str = str.replace(/node-formula:([A-Za-z0-9_-]+)/g, (_match, formulaId: string) => {
      const mapped = formulaIdMap.get(formulaId);
      if (mapped) return `node-formula:${mapped}`;
      if (suffix !== undefined) {
        const suffixStr = `${suffix}`;
        return `node-formula:${formulaId}-${suffixStr}`;
      }
      return `node-formula:${formulaId}`;
    });

    // 3️⃣ Réécrire aussi d'éventuels node-condition:/condition: en suffix fallback (pas de map dédiée ici)
    str = str.replace(/(node-condition:|condition:)([A-Za-z0-9_-]+)/g, (_m, pref: string, condId: string) => {
      if (suffix !== undefined) {
        const suffixStr = `${suffix}`;
        return `${pref}${condId}-${suffixStr}`;
      }
      return `${pref}${condId}`;
    });

    // 4️⃣ Parser pour traiter précisément actions[].nodeIds (références nues)
    const parsed = JSON.parse(str);

    const mapNodeIdString = (raw: string): string => {
      if (typeof raw !== 'string') return raw as unknown as string;
      
      // Cas 0: shared-ref (ne pas suffixer si pas de mapping)
      if (raw.startsWith('shared-ref-')) {
        const mapped = nodeIdMap.get(raw);
        if (mapped) return mapped;
        return raw;
      }
      
      // Cas 1: node-formula déjà couvert mais double sécurité
      if (raw.startsWith('node-formula:')) {
        const id = raw.replace('node-formula:', '');
        const mapped = formulaIdMap.get(id);
        if (mapped) return `node-formula:${mapped}`;
        return suffix !== undefined && !/-\d+$/.test(id) ? `node-formula:${id}-${suffix}` : raw;
      }
      // Cas 2: field id (UUID ou node_...)
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      const isNodeGen = /^node_[A-Za-z0-9_-]+$/i.test(raw);
      if (uuidRegex.test(raw) || isNodeGen) {
        const mapped = nodeIdMap.get(raw);
        if (mapped) return mapped;
        if (suffix !== undefined) {
          const suffixStr = `${suffix}`;
          return `${raw}-${suffixStr}`;
        }
        return raw;
      }
      // Cas 3: condition ref en clair
      if (raw.startsWith('node-condition:') || raw.startsWith('condition:')) {
        const pref = raw.startsWith('node-condition:') ? 'node-condition:' : 'condition:';
        const id = raw.replace('node-condition:', '').replace('condition:', '');
        return suffix !== undefined && !/-\d+$/.test(id) ? `${pref}${id}-${suffix}` : raw;
      }
      return raw;
    };

    const walk = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(walk);
      const out: any = Array.isArray(obj) ? [] : { ...obj };
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (key === 'nodeIds' && Array.isArray(val)) {
          out[key] = val.map((s: any) => (typeof s === 'string' ? mapNodeIdString(s) : s));
        } else if (key === 'when' && val && typeof val === 'object') {
          // when.left.ref / when.right.ref déjà traités via regex, mais on parcourt par sécurité
          out[key] = walk(val);
        } else {
          out[key] = walk(val);
        }
      }
      return out;
    };

    const rewritten = walk(parsed);
    const applySuffixIfNeeded = (value: unknown): unknown => {
      if (suffix === undefined) return value;
      if (typeof value !== 'string') return value;
      const suffixStr = `${suffix}`;
      return `${value}-${suffixStr}`;
    };

    const suffixConditionIds = (cs: any): any => {
      if (!cs || typeof cs !== 'object') return cs;
      const out: any = { ...cs };

      if (out.id) out.id = applySuffixIfNeeded(out.id);

      if (Array.isArray(out.branches)) {
        out.branches = out.branches.map((branch: any) => {
          const b: any = { ...branch };
          if (b.id) b.id = applySuffixIfNeeded(b.id);
          if (Array.isArray(b.actions)) {
            b.actions = b.actions.map((action: any) => {
              const a: any = { ...action };
              if (a.id) a.id = applySuffixIfNeeded(a.id);
              return a;
            });
          }
          return b;
        });
      }

      if (out.fallback && typeof out.fallback === 'object') {
        const fb: any = { ...out.fallback };
        if (fb.id) fb.id = applySuffixIfNeeded(fb.id);
        if (Array.isArray(fb.actions)) {
          fb.actions = fb.actions.map((action: any) => {
            const a: any = { ...action };
            if (a.id) a.id = applySuffixIfNeeded(a.id);
            return a;
          });
        }
        out.fallback = fb;
      }

      return out;
    };

    return suffixConditionIds(rewritten) as Prisma.InputJsonValue;
  } catch (error) {
    console.error(`❌ Erreur lors de la réécriture du conditionSet:`, error);
    return conditionSet as Prisma.InputJsonValue;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Copie une condition avec réécriture du conditionSet
 * 
 * PROCESSUS :
 * -----------
 * 1. Vérifier le cache (éviter doublons)
 * 2. Récupérer la condition originale
 * 3. Générer le nouvel ID avec suffixe
 * 4. Réécrire le conditionSet (@value.ID + node-formula:ID)
 * 5. Créer la nouvelle condition
 * 6. Mettre à jour linkedConditionIds du nœud
 * 7. Synchroniser les paramètres de capacité
 * 8. Mettre en cache
 * 
 * @param originalConditionId - ID de la condition à copier
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec nodeIdMap et formulaIdMap
 * @returns Résultat de la copie
 * 
 * @example
 * const result = await copyConditionCapacity(
 *   'condition-abc',
 *   'node-xyz-1',
 *   1,
 *   prisma,
 *   { 
 *     nodeIdMap: new Map([['node-a', 'node-a-1']]),
 *     formulaIdMap: new Map([['formula-x', 'formula-x-1']])
 *   }
 * );
 * // result.newConditionId = 'condition-abc-1'
 * // result.conditionSet = { ... avec IDs réécrits ... }
 */
export async function copyConditionCapacity(
  originalConditionId: string,
  newNodeId: string,
  suffix: number,
  prisma: PrismaClient,
  options: CopyConditionOptions = {}
): Promise<CopyConditionResult> {
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔀 COPIE CONDITION: ${originalConditionId}`);
  console.log(`   Suffixe: ${suffix}`);
  console.log(`   Nouveau nœud: ${newNodeId}`);
  console.log(`${'═'.repeat(80)}\n`);

  const {
    nodeIdMap = new Map(),
    formulaIdMap = new Map(),
    conditionCopyCache = new Map()
  } = options;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 ÉTAPE 1 : Vérifier le cache
    // ═══════════════════════════════════════════════════════════════════════
    if (conditionCopyCache.has(originalConditionId)) {
      const cachedId = conditionCopyCache.get(originalConditionId)!;
      console.log(`♻️ Condition déjà copiée (cache): ${originalConditionId} → ${cachedId}`);
      
      const cached = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: cachedId }
      });
      
      if (cached) {
        return {
          newConditionId: cached.id,
          nodeId: cached.nodeId,
          conditionSet: cached.conditionSet,
          success: true
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📥 ÉTAPE 2 : Récupérer la condition originale PAR ID (enlever suffixe si présent)
    // ═══════════════════════════════════════════════════════════════════════
    // originalConditionId peut contenir un suffixe si c'est déjà une copie
    // On enlève le suffixe pour trouver l'original
    const cleanConditionId = originalConditionId.replace(/-\d+$/, '');
    console.log(`🔍 Recherche condition avec id: ${cleanConditionId} (original: ${originalConditionId})`);
    
    const originalCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: cleanConditionId }
    });

    if (!originalCondition) {
      console.error(`❌ Condition introuvable avec id: ${cleanConditionId}`);
      return {
        newConditionId: '',
        nodeId: '',
        conditionSet: null,
        success: false,
        error: `Condition introuvable avec id: ${cleanConditionId}`
      };
    }

    console.log(`✅ Condition trouvée: ${originalCondition.name || originalCondition.id}`);
    console.log(`   NodeId original: ${originalCondition.nodeId}`);
    console.log(`   conditionSet original:`, originalCondition.conditionSet);

    // ═══════════════════════════════════════════════════════════════════════
    // 🆔 ÉTAPE 3 : Générer le nouvel ID (pour la condition elle-même)
    // ═══════════════════════════════════════════════════════════════════════
    // On utilise l'id original de la condition avec suffixe
    const newConditionId = `${originalCondition.id}-${suffix}`;
    console.log(`📝 Nouvel ID condition: ${newConditionId}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 ÉTAPE 4 : Réécrire le conditionSet
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n🔄 Réécriture du conditionSet...`);
    console.log(`   Nombre d'IDs nœuds dans la map: ${nodeIdMap.size}`);
    console.log(`   Nombre d'IDs formules dans la map: ${formulaIdMap.size}`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 4A : EXTRACTION ET COPIE AUTOMATIQUE des FORMULES liées
    // ═══════════════════════════════════════════════════════════════════════
    // ⭐ CRITIQUE: Les formules DOIVENT être copiées AVANT la réécriture!
    // Sinon formulaIdMap est vide et les tokens ne reçoivent pas les suffixes
    console.log(`\n🔗 Extraction automatique des formules liées du conditionSet...`);
    const linkedFormulaIdsFromSet = extractLinkedFormulaIdsFromConditionSet(originalCondition.conditionSet);
    console.log(`🔍 DEBUG: conditionSet original:`, JSON.stringify(originalCondition.conditionSet).substring(0, 300));
    console.log(`🔍 DEBUG: ${linkedFormulaIdsFromSet.size} formules trouvées:`, Array.from(linkedFormulaIdsFromSet));
    
    if (linkedFormulaIdsFromSet.size > 0) {
      console.log(`   Formules trouvées: ${Array.from(linkedFormulaIdsFromSet).join(', ')}`);
      
      // 🔍 VÉRIFICATION: Chercher les formules dans la BD pour voir leur état réel
      console.log(`\n🔍 VÉRIFICATION DES FORMULES DANS LA BD:`);
      for (const formId of linkedFormulaIdsFromSet) {
        const existingForm = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: formId }
        });
        if (existingForm) {
          console.log(`   ✅ Formule EXISTE: ${formId}`);
          console.log(`      Tokens actuels:`, existingForm.tokens);
          // Vérifier si les shared-refs sont suffixés
          if (Array.isArray(existingForm.tokens)) {
            const unsuffixedSharedRefs = existingForm.tokens.filter((t: any) =>
              typeof t === 'string' && t.includes('shared-ref') && !/-\d+$/.test(t)
            );
            if (unsuffixedSharedRefs.length > 0) {
              console.warn(`   ⚠️ ${unsuffixedSharedRefs.length} shared-refs NON-suffixés:`, unsuffixedSharedRefs);
            }
          }
        } else {
          console.warn(`   ❌ Formule INTROUVABLE: ${formId}`);
        }
      }
      
      // ⭐ CRÉER UN NOUVEL nodeIdMap enrichi pour les formules de cette condition
      // Car les shared-ref du conditionSet référencent le nœud ORIGINAL de la condition
      const enrichedNodeIdMap = new Map(nodeIdMap);
      if (originalCondition.nodeId && newNodeId) {
        enrichedNodeIdMap.set(originalCondition.nodeId, newNodeId);
        console.log(`   📍 NodeIdMap enrichie: ${originalCondition.nodeId} → ${newNodeId}`);
      }
      
      for (const linkedFormId of linkedFormulaIdsFromSet) {
        // Vérifier si cette formule est déjà mappée
        if (formulaIdMap.has(linkedFormId)) {
          console.log(`   ♻️ Formule liée déjà copiée: ${linkedFormId} → ${formulaIdMap.get(linkedFormId)}`);
        } else {
          // 🔀 COPIER RÉCURSIVEMENT CETTE FORMULE LIÉE
          try {
            console.log(`   🔀 Copie formule liée: ${linkedFormId}...`);
            const linkedFormResult = await copyFormulaCapacity(
              linkedFormId,
              newNodeId, // Même nœud propriétaire
              suffix,
              prisma,
              { nodeIdMap: enrichedNodeIdMap, formulaIdMap }
            );
            
            if (linkedFormResult.success) {
              console.log(`   ✅ Formule liée copiée: ${linkedFormId} → ${linkedFormResult.newFormulaId}`);
              // 🔍 VÉRIFICATION: Lire la formule copiée dans la BD pour vérifier les tokens
              const copiedForm = await prisma.treeBranchLeafNodeFormula.findUnique({
                where: { id: linkedFormResult.newFormulaId }
              });
              if (copiedForm) {
                console.log(`   🔍 Vérification formule copiée ${linkedFormResult.newFormulaId}:`);
                console.log(`      Tokens en BD:`, copiedForm.tokens);
                if (Array.isArray(copiedForm.tokens)) {
                  const unsuffixed = copiedForm.tokens.filter((t: any) =>
                    typeof t === 'string' && t.includes('shared-ref') && !/-\d+$/.test(t)
                  );
                  if (unsuffixed.length > 0) {
                    console.error(`   ❌ PROBLÈME: ${unsuffixed.length} shared-refs TOUJOURS non-suffixés en BD:`, unsuffixed);
                  } else {
                    console.log(`   ✅ Tous les shared-refs sont suffixés en BD`);
                  }
                }
              }
              // Enregistrer dans la map pour la réécriture suivante
              formulaIdMap.set(linkedFormId, linkedFormResult.newFormulaId);
            } else {
              console.warn(`   ⚠️ Échec copie formule liée: ${linkedFormId}`);
            }
          } catch (e) {
            console.error(`   ❌ Exception copie formule liée:`, (e as Error).message);
          }
        }
      }
    } else {
      console.log(`   (Aucune formule liée trouvée dans le conditionSet)`);
    }
    
    // 🔥 UTILISER LE SYSTÈME UNIVERSEL pour traiter TOUS les types de références
    // formulaIdMap est MAINTENANT remplie avec les formules copiées
    const rewriteMaps: RewriteMaps = {
      nodeIdMap: nodeIdMap,
      formulaIdMap: formulaIdMap,
      conditionIdMap: conditionCopyCache || new Map(),
      tableIdMap: new Map() // Pas de table dans les conditions normalement
    };
    
    console.log(`\n🔍 DEBUG: formulaIdMap avant réécriture:`, Object.fromEntries(formulaIdMap));
    
    let rewrittenConditionSet = rewriteJsonReferences(
      originalCondition.conditionSet,
      rewriteMaps,
      suffix
    );
    
    console.log(`\n🔍 DEBUG: conditionSet après 1ère réécriture:`, JSON.stringify(rewrittenConditionSet).substring(0, 500));
    
    // ⭐ RÉÉCRITURE ENRICHIE : Réécrire une deuxième fois avec le nodeIdMap enrichi
    // Car les formules du conditionSet peuvent référencer le nœud de la condition
    // et elles auraient déjà été copiées via la variable sans le nodeIdMap enrichi
    const enrichedRewriteMaps: RewriteMaps = {
      nodeIdMap: new Map([...nodeIdMap, [originalCondition.nodeId, newNodeId]]),  // Enrichi
      formulaIdMap: formulaIdMap,
      conditionIdMap: conditionCopyCache || new Map(),
      tableIdMap: new Map()
    };
    rewrittenConditionSet = rewriteJsonReferences(
      rewrittenConditionSet,  // Réécrire le résultat précédent
      enrichedRewriteMaps,
      suffix
    );
    console.log(`✅ conditionSet réécrit avec nodeIdMap enrichie (2ème pass):`, rewrittenConditionSet);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔥 RÉÉCRITURE FORCÉE DES SHARED-REFS DANS LE CONDITIONSET
    // ═══════════════════════════════════════════════════════════════════════
    // Forcer TOUS les @value.shared-ref-* même imbriqués partout dans le JSON
    console.log(`\n🔥 RÉÉCRITURE FORCÉE des shared-refs dans conditionSet...`);
    rewrittenConditionSet = forceSharedRefSuffixesInJson(rewrittenConditionSet, suffix);
    
    // 🔴 CRITIQUE : Régénérer les IDs INTERNES du conditionSet
    // (branches, actions, conditions binaires, fallbacks)
    console.log(`\n🔄 Régénération des IDs internes...`);
    rewrittenConditionSet = regenerateInternalIds(rewrittenConditionSet, suffix);
    
    console.log(`✅ conditionSet finalisé avec IDs internes:`, rewrittenConditionSet);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 4B : EXTRACTION AUTOMATIQUE ET COPIE des conditions liées
    // ═══════════════════════════════════════════════════════════════════════
    // Chercher TOUTES les conditions référencées DANS le conditionSet
    console.log(`\n🔗 Extraction automatique des conditions liées du conditionSet...`);
    const linkedConditionIdsFromSet = extractLinkedConditionIdsFromConditionSet(rewrittenConditionSet);
    
    if (linkedConditionIdsFromSet.size > 0) {
      console.log(`   Conditions trouvées: ${Array.from(linkedConditionIdsFromSet).join(', ')}`);
      
      for (const linkedCondId of linkedConditionIdsFromSet) {
        // Vérifier si cette condition est déjà mappée
        if (conditionCopyCache.has(linkedCondId)) {
          const mappedId = conditionCopyCache.get(linkedCondId)!;
          console.log(`   ♻️ Condition liée déjà copiée: ${linkedCondId} → ${mappedId}`);
          // Remplacer DANS LE JSON les références
          rewrittenConditionSet = replaceInJson(
            rewrittenConditionSet,
            new Map([
              [`condition:${linkedCondId}`, `condition:${mappedId}`],
              [`node-condition:${linkedCondId}`, `node-condition:${mappedId}`]
            ])
          );
        } else {
          // 🔀 COPIER RÉCURSIVEMENT CETTE CONDITION LIÉE
          try {
            console.log(`   🔀 Copie condition liée: ${linkedCondId}...`);
            const linkedCondResult = await copyConditionCapacity(
              linkedCondId,
              newNodeId, // Même nœud propriétaire
              suffix,
              prisma,
              { nodeIdMap, formulaIdMap, conditionCopyCache }
            );
            
            if (linkedCondResult.success) {
              console.log(`   ✅ Condition liée copiée: ${linkedCondId} → ${linkedCondResult.newConditionId}`);
              // Remplacer DANS LE JSON les références
              rewrittenConditionSet = replaceInJson(
                rewrittenConditionSet,
                new Map([
                  [`condition:${linkedCondId}`, `condition:${linkedCondResult.newConditionId}`],
                  [`node-condition:${linkedCondId}`, `node-condition:${linkedCondResult.newConditionId}`]
                ])
              );
            } else {
              console.warn(`   ⚠️ Échec copie condition liée: ${linkedCondId}`);
            }
          } catch (e) {
            console.error(`   ❌ Exception copie condition liée:`, (e as Error).message);
          }
        }
      }
    } else {
      console.log(`   (Aucune condition liée trouvée dans le conditionSet)`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // � ÉTAPE 4D : EXTRACTION AUTOMATIQUE ET COPIE des tables liées
    // ═══════════════════════════════════════════════════════════════════════
    // Chercher TOUTES les tables référencées DANS le conditionSet
    console.log(`\n🔗 Extraction automatique des tables liées du conditionSet...`);
    const linkedTableIdsFromSet = extractLinkedTableIdsFromConditionSet(rewrittenConditionSet);
    
    if (linkedTableIdsFromSet.size > 0) {
      console.log(`   Tables trouvées: ${Array.from(linkedTableIdsFromSet).join(', ')}`);
      
      for (const linkedTableId of linkedTableIdsFromSet) {
        // Vérifier si cette table est déjà mappée
        if (tableIdMap && tableIdMap.has(linkedTableId)) {
          const mappedId = tableIdMap.get(linkedTableId)!;
          console.log(`   ♻️ Table liée déjà copiée: ${linkedTableId} → ${mappedId}`);
          // Remplacer DANS LE JSON les références
          rewrittenConditionSet = replaceInJson(
            rewrittenConditionSet,
            new Map([
              [`@table.${linkedTableId}`, `@table.${mappedId}`],
              [`node-table:${linkedTableId}`, `node-table:${mappedId}`]
            ])
          );
        } else {
          // 🔀 COPIER RÉCURSIVEMENT CETTE TABLE LIÉE
          try {
            console.log(`   🔀 Copie table liée: ${linkedTableId}...`);
            const linkedTableResult = await copyTableCapacity(
              linkedTableId,
              newNodeId, // Même nœud propriétaire
              suffix,
              prisma,
              { nodeIdMap, tableIdMap }
            );
            
            if (linkedTableResult.success) {
              console.log(`   ✅ Table liée copiée: ${linkedTableId} → ${linkedTableResult.newTableId}`);
              // Enregistrer dans la map
              if (tableIdMap) tableIdMap.set(linkedTableId, linkedTableResult.newTableId);
              // Remplacer DANS LE JSON les références
              rewrittenConditionSet = replaceInJson(
                rewrittenConditionSet,
                new Map([
                  [`@table.${linkedTableId}`, `@table.${linkedTableResult.newTableId}`],
                  [`node-table:${linkedTableId}`, `node-table:${linkedTableResult.newTableId}`]
                ])
              );
            } else {
              console.warn(`   ⚠️ Échec copie table liée: ${linkedTableId}`);
            }
          } catch (e) {
            console.error(`   ❌ Exception copie table liée:`, (e as Error).message);
          }
        }
      }
    } else {
      console.log(`   (Aucune table liée trouvée dans le conditionSet)`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // �💾 ÉTAPE 5 : Créer (ou mettre à jour) la nouvelle condition — idempotent
    // ═══════════════════════════════════════════════════════════════════════
    let newCondition = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } });
    if (newCondition) {
      // Mise à jour minimale pour garder l'id stable entre ré-exécutions
      newCondition = await prisma.treeBranchLeafNodeCondition.update({
        where: { id: newConditionId },
        data: {
          nodeId: newNodeId,
          name: originalCondition.name ? `${originalCondition.name}-${suffix}` : null,
          description: originalCondition.description,
          conditionSet: rewrittenConditionSet,
          metadata: originalCondition.metadata as Prisma.InputJsonValue,
          updatedAt: new Date()
        }
      });
    } else {
      newCondition = await prisma.treeBranchLeafNodeCondition.create({
        data: {
          id: newConditionId,
          nodeId: newNodeId,
          organizationId: originalCondition.organizationId,
          name: originalCondition.name ? `${originalCondition.name}-${suffix}` : null,
          description: originalCondition.description,
          conditionSet: rewrittenConditionSet,
          metadata: originalCondition.metadata as Prisma.InputJsonValue,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ Condition créée: ${newCondition.id}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 6 : LIAISON AUTOMATIQUE OBLIGATOIRE
    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ UTILISATION DU SYSTÈME UNIVERSEL DE LIAISON
    // Cette fonction lie automatiquement la condition à TOUS les nœuds référencés
    try {
      await linkConditionToAllNodes(prisma, newConditionId, rewrittenConditionSet);
    } catch (e) {
      console.error(`❌ Erreur LIAISON AUTOMATIQUE:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 6B : Mettre à jour linkedConditionIds du nœud propriétaire
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await addToNodeLinkedField(prisma, newNodeId, 'linkedConditionIds', [newConditionId]);
      console.log(`✅ linkedConditionIds mis à jour pour nœud propriétaire ${newNodeId}`);
    } catch (e) {
      console.warn(`⚠️ Erreur MAJ linkedConditionIds du propriétaire:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 ÉTAPE 7 : Synchroniser les paramètres de capacité
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await prisma.treeBranchLeafNode.update({
        where: { id: newNodeId },
        data: {
          hasCondition: true,
          condition_activeId: newConditionId,
          condition_name: newCondition.name,
          condition_description: newCondition.description
        }
      });
      console.log(`✅ Paramètres capacité (condition) mis à jour pour nœud ${newNodeId}`);
      console.log(`   - condition_activeId: ${newConditionId}`);
      console.log(`   - condition_name: ${newCondition.name || 'null'}`);
    } catch (e) {
      console.warn(`⚠️ Erreur lors de la mise à jour des paramètres capacité:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 8 : Mettre en cache
    // ═══════════════════════════════════════════════════════════════════════
    conditionCopyCache.set(originalConditionId, newConditionId);

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ COPIE CONDITION TERMINÉE`);
    console.log(`${'═'.repeat(80)}\n`);

    return {
      newConditionId,
      nodeId: newNodeId,
      conditionSet: rewrittenConditionSet,
      success: true
    };

  } catch (error) {
    console.error(`❌ Erreur lors de la copie de la condition:`, error);
    return {
      newConditionId: '',
      nodeId: '',
      conditionSet: null,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES POUR LINKED FIELDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ajoute des IDs à un champ linked... d'un nœud (sans doublons)
 */
async function addToNodeLinkedField(
  prisma: PrismaClient,
  nodeId: string,
  field: 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds',
  idsToAdd: string[]
): Promise<void> {
  if (!idsToAdd || idsToAdd.length === 0) return;

  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { [field]: true }
  });

  if (!node) {
    console.warn(`⚠️ Nœud ${nodeId} introuvable pour MAJ ${field}`);
    return;
  }

  const current = (node[field] || []) as string[];
  const newIds = [...new Set([...current, ...idsToAdd])]; // Dédupliquer

  await prisma.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: { [field]: { set: newIds } }
  });
}
