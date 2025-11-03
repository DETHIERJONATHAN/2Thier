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
 * 5. Synchroniser les paramètres de capacité (hasCondition, condition_activeId, etc.)
 * 
 * @author System TBL
 * @version 1.0.0
 */

import { PrismaClient, Prisma } from '@prisma/client';

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
// � FONCTIONS D'EXTRACTION D'IDs
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

    // 1️⃣ Réécrire les @value.<nodeId> (avec fallback suffix si non mappé)
    str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_match, nodeId: string) => {
      const mapped = nodeIdMap.get(nodeId);
      if (mapped) return `@value.${mapped}`;
      if (suffix !== undefined && !/-\d+$/.test(nodeId)) return `@value.${nodeId}-${suffix}`;
      return `@value.${nodeId}`;
    });

    // 2️⃣ Réécrire les node-formula:<id> (IDs CUID/UUID supportés) avec fallback suffix
    str = str.replace(/node-formula:([A-Za-z0-9_-]+)/g, (_match, formulaId: string) => {
      const mapped = formulaIdMap.get(formulaId);
      if (mapped) return `node-formula:${mapped}`;
      if (suffix !== undefined && !/-\d+$/.test(formulaId)) return `node-formula:${formulaId}-${suffix}`;
      return `node-formula:${formulaId}`;
    });

    // 3️⃣ Réécrire aussi d'éventuels node-condition:/condition: en suffix fallback (pas de map dédiée ici)
    str = str.replace(/(node-condition:|condition:)([A-Za-z0-9_-]+)/g, (_m, pref: string, condId: string) => {
      if (suffix !== undefined && !/-\d+$/.test(condId)) return `${pref}${condId}-${suffix}`;
      return `${pref}${condId}`;
    });

    // 4️⃣ Parser pour traiter précisément actions[].nodeIds (références nues)
    const parsed = JSON.parse(str);

    const mapNodeIdString = (raw: string): string => {
      if (typeof raw !== 'string') return raw as unknown as string;
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
        return suffix !== undefined && !/-\d+$/.test(raw) ? `${raw}-${suffix}` : raw;
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
    return rewritten as Prisma.InputJsonValue;
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
    
    const rewrittenConditionSet = rewriteConditionSet(
      originalCondition.conditionSet,
      nodeIdMap,
      formulaIdMap,
      suffix
    );
    
    console.log(`✅ conditionSet réécrit:`, rewrittenConditionSet);

    // ═══════════════════════════════════════════════════════════════════════
    // 💾 ÉTAPE 5 : Créer (ou mettre à jour) la nouvelle condition — idempotent
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
    // 🔗 ÉTAPE 6 : Mettre à jour linkedConditionIds du nœud
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await addToNodeLinkedField(prisma, newNodeId, 'linkedConditionIds', [newConditionId]);
      console.log(`✅ linkedConditionIds mis à jour pour nœud ${newNodeId}`);
    } catch (e) {
      console.warn(`⚠️ Erreur MAJ linkedConditionIds:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // � ÉTAPE 6B : MISES À JOUR BIDIRECTIONNELLES (références dans la condition)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n🔀 Mises à jour bidirectionnelles pour condition ${newConditionId}...`);
    
    try {
      // Extraire les nœuds référencés dans la condition
      const referencedNodeIds = extractNodeIdsFromConditionSet(rewrittenConditionSet);
      console.log(`   Nœuds référencés: ${referencedNodeIds.size} trouvés`);
      
      for (const refNodeId of referencedNodeIds) {
        if (refNodeId && refNodeId !== newNodeId) {
          try {
            await addToNodeLinkedField(prisma, refNodeId, 'linkedConditionIds', [newConditionId]);
            console.log(`   ✅ linkedConditionIds mis à jour pour nœud référencé ${refNodeId}`);
          } catch (e) {
            console.warn(`   ⚠️ Impossible de MAJ nœud ${refNodeId}: ${(e as Error).message}`);
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Erreur lors des mises à jour bidirectionnelles:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // �📝 ÉTAPE 7 : Synchroniser les paramètres de capacité
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
