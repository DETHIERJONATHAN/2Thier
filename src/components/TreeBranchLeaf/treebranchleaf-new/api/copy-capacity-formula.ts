/**
 * 🧮 Système de copie des FORMULES
 * 
 * Ce module gère la copie complète d'une formule (TreeBranchLeafNodeFormula)
 * avec réécriture des tokens pour pointer vers les nouveaux IDs.
 * 
 * PRINCIPES :
 * -----------
 * 1. Copier la formule avec suffixe
 * 2. Réécrire les tokens (@value.ID → @value.ID-suffix)
 * 3. 🔗 LIAISON AUTOMATIQUE OBLIGATOIRE: linkedFormulaIds sur TOUS les nœuds référencés
 * 4. Mettre à jour linkedFormulaIds du nœud propriétaire
 * 5. Synchroniser les paramètres de capacité (hasFormula, formula_activeId, etc.)
 * 
 * @author System TBL
 * @version 2.0.0 - LIAISON AUTOMATIQUE OBLIGATOIRE
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { linkFormulaToAllNodes } from './universal-linking-system';
import { rewriteJsonReferences, forceSharedRefSuffixes, forceSharedRefSuffixesInJson, type RewriteMaps } from './repeat/utils/universal-reference-rewriter.js';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options pour la copie de formule
 */
export interface CopyFormulaOptions {
  /** Map des nœuds copiés (ancien ID → nouveau ID) pour réécrire les tokens */
  nodeIdMap?: Map<string, string>;
  /** Map des formules déjà copiées (cache pour éviter doublons) */
  formulaCopyCache?: Map<string, string>;
}

/**
 * Résultat de la copie d'une formule
 */
export interface CopyFormulaResult {
  /** ID de la formule copiée */
  newFormulaId: string;
  /** ID du nœud propriétaire */
  nodeId: string;
  /** Tokens réécrits */
  tokens: Prisma.InputJsonValue;
  /** Succès de l'opération */
  success: boolean;
  /** Message d'erreur éventuel */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES DE RÉÉCRITURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Réécrire les tokens d'une formule pour remplacer les anciens IDs par les nouveaux
 * 
 * Format des tokens :
 * - Array de strings/objets : ["@value.abc-123", "+", "@value.def-456"]
 * - Peut contenir des UUIDs ou des node_xxx
 * 
 * @param tokens - Tokens originaux
 * @param idMap - Map ancien ID → nouveau ID
 * @param suffix - Suffixe à ajouter si ID pas trouvé dans la map
 * @returns Tokens réécrits
 * 
 * @example
 * rewriteFormulaTokens(
 *   ["@value.abc", "+", "@value.def"],
 *   new Map([["abc", "abc-1"]]),
 *   1
 * )
 * → ["@value.abc-1", "+", "@value.def-1"]
 */
function rewriteFormulaTokens(
  tokens: unknown,
  idMap: Map<string, string>,
  suffix?: string | number
): Prisma.InputJsonValue {
  if (!tokens) return tokens as Prisma.InputJsonValue;

  const rewriteString = (str: string): string => {
    // ✅ FIX REPEATER REFERENCES (02/12/2025):
    // PROBLÈME: Les shared-ref du repeater n'étaient pas suffixées
    // SOLUTION: Traiter TOUTES les références (@value.<ID>) de la même manière
    // - Si trouvée dans la map → utiliser le mapping
    // - Sinon si suffixe fourni → ajouter le suffixe
    // - Y compris pour les shared-ref!
    return str.replace(/@value\.([A-Za-z0-9_:-]+(?:-[A-Za-z0-9]+)*)/g, (_match, nodeId: string) => {
      
      // 1. Chercher dans la map des nœuds mappés (y compris les shared-ref mappées)
      const mappedId = idMap.get(nodeId);
      if (mappedId) {
        console.log(`🔄 [FORMULA-TOKENS] Mapping trouvé: ${nodeId} → ${mappedId}`);
        return `@value.${mappedId}`;
      }
      
      // 2. Si pas dans la map et qu'on a un suffixe, l'ajouter automatiquement
      if (suffix !== undefined) {
        const suffixStr = `${suffix}`;
        const suffixedId = `${nodeId}-${suffixStr}`;
        console.log(`➕ [FORMULA-TOKENS] Suffixe ajouté: ${nodeId} → ${suffixedId}`);
        return `@value.${suffixedId}`;
      }
      
      // 3. Sinon garder tel quel
      console.log(`⚪ [FORMULA-TOKENS] Inchangé: ${nodeId}`);
      return `@value.${nodeId}`;
    });
  };

  // Si tokens est un array
  if (Array.isArray(tokens)) {
    return tokens.map(token => {
      if (typeof token === 'string') {
        return rewriteString(token);
      }
      // Si c'est un objet, stringify puis rewrite puis parse
      if (token && typeof token === 'object') {
        try {
          const str = JSON.stringify(token);
          const rewritten = rewriteString(str);
          return JSON.parse(rewritten);
        } catch {
          return token;
        }
      }
      return token;
    }) as Prisma.InputJsonValue;
  }

  // Si tokens est une string
  if (typeof tokens === 'string') {
    return rewriteString(tokens) as Prisma.InputJsonValue;
  }

  // Si tokens est un objet
  if (tokens && typeof tokens === 'object') {
    try {
      const str = JSON.stringify(tokens);
      const rewritten = rewriteString(str);
      return JSON.parse(rewritten) as Prisma.InputJsonValue;
    } catch {
      return tokens as Prisma.InputJsonValue;
    }
  }

  return tokens as Prisma.InputJsonValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Copie une formule avec réécriture des tokens
 * 
 * PROCESSUS :
 * -----------
 * 1. Vérifier le cache (éviter doublons)
 * 2. Récupérer la formule originale
 * 3. Générer le nouvel ID avec suffixe
 * 4. Réécrire les tokens (@value.ID → @value.ID-suffix)
 * 5. Créer la nouvelle formule
 * 6. Mettre à jour linkedFormulaIds du nœud
 * 7. Synchroniser les paramètres de capacité
 * 8. Mettre en cache
 * 
 * @param originalFormulaId - ID de la formule à copier
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec nodeIdMap
 * @returns Résultat de la copie
 * 
 * @example
 * const result = await copyFormulaCapacity(
 *   'formula-abc',
 *   'node-xyz-1',
 *   1,
 *   prisma,
 *   { nodeIdMap: new Map([['node-a', 'node-a-1']]) }
 * );
 * // result.newFormulaId = 'formula-abc-1'
 * // result.tokens = ["@value.node-a-1", "+", "5"]
 */
export async function copyFormulaCapacity(
  originalFormulaId: string,
  newNodeId: string,
  suffix: number,
  prisma: PrismaClient,
  options: CopyFormulaOptions = {}
): Promise<CopyFormulaResult> {
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🧮 COPIE FORMULE: ${originalFormulaId}`);
  console.log(`   Suffixe: ${suffix}`);
  console.log(`   Nouveau nœud: ${newNodeId}`);
  console.log(`${'═'.repeat(80)}\n`);

  const {
    nodeIdMap = new Map(),
    formulaCopyCache = new Map()
  } = options;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 ÉTAPE 1 : Vérifier le cache
    // ═══════════════════════════════════════════════════════════════════════
    if (formulaCopyCache.has(originalFormulaId)) {
      const cachedId = formulaCopyCache.get(originalFormulaId)!;
      console.log(`♻️ Formule déjà copiée (cache): ${originalFormulaId} → ${cachedId}`);
      
      const cached = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: cachedId }
      });
      
      if (cached) {
        return {
          newFormulaId: cached.id,
          nodeId: cached.nodeId,
          tokens: cached.tokens,
          success: true
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📥 ÉTAPE 2 : Récupérer la formule originale PAR ID (enlever suffixe si présent)
    // ═══════════════════════════════════════════════════════════════════════
    // originalFormulaId peut contenir un suffixe si c'est déjà une copie
    // On enlève le suffixe pour trouver l'original
    const cleanFormulaId = originalFormulaId.replace(/-\d+$/, '');
    console.log(`🔍 Recherche formule avec id: ${cleanFormulaId} (original: ${originalFormulaId})`);
    
    const originalFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: cleanFormulaId }
    });

    if (!originalFormula) {
      console.error(`❌ Formule introuvable avec id: ${cleanFormulaId}`);
      return {
        newFormulaId: '',
        nodeId: '',
        tokens: null,
        success: false,
        error: `Formule introuvable avec id: ${cleanFormulaId}`
      };
    }

    console.log(`✅ Formule trouvée: ${originalFormula.name || originalFormula.id}`);
    console.log(`   NodeId original: ${originalFormula.nodeId}`);
    console.log(`   Tokens originaux:`, originalFormula.tokens);

    // ═══════════════════════════════════════════════════════════════════════
    // 🆔 ÉTAPE 3 : Générer le nouvel ID (pour la formule elle-même)
    // ═══════════════════════════════════════════════════════════════════════
    // On utilise l'id original de la formule avec suffixe
    const newFormulaId = `${originalFormula.id}-${suffix}`;
    console.log(`📝 Nouvel ID formule: ${newFormulaId}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 ÉTAPE 4 : Réécrire les tokens
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n🔄 Réécriture des tokens...`);
    console.log(`   Nombre d'IDs dans la map: ${nodeIdMap.size}`);
    
    // 🔥 UTILISER LE SYSTÈME UNIVERSEL pour traiter TOUS les types de références
    const rewriteMaps: RewriteMaps = {
      nodeIdMap: nodeIdMap,
      formulaIdMap: formulaCopyCache || new Map(),
      conditionIdMap: new Map(), // Pas besoin ici mais requis par l'interface
      tableIdMap: new Map() // Pas besoin ici mais requis par l'interface
    };
    let rewrittenTokens = rewriteJsonReferences(originalFormula.tokens, rewriteMaps, suffix);
    
    console.log(`✅ Tokens réécrits (1ère passe):`, rewrittenTokens);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔥 RÉÉCRITURE FORCÉE DES SHARED-REFS
    // ═══════════════════════════════════════════════════════════════════════
    // Utiliser la fonction helper pour forcer les suffixes sur TOUS les shared-refs
    console.log(`\n🔥 AVANT forceSharedRefSuffixes: ${Array.isArray(rewrittenTokens) ? rewrittenTokens.length : '?'} tokens`);
    const sharedRefsCountBefore = rewrittenTokens && Array.isArray(rewrittenTokens) 
      ? rewrittenTokens.filter((t: any) => typeof t === 'string' && t.includes('shared-ref')).length
      : 0;
    console.log(`   Shared-refs avant: ${sharedRefsCountBefore}`);
    
    rewrittenTokens = forceSharedRefSuffixes(rewrittenTokens, suffix);
    
    console.log(`✅ APRÈS forceSharedRefSuffixes:`);
    const sharedRefsCountAfter1 = rewrittenTokens && Array.isArray(rewrittenTokens) 
      ? rewrittenTokens.filter((t: any) => typeof t === 'string' && t.includes('shared-ref')).length
      : 0;
    console.log(`   Shared-refs après: ${sharedRefsCountAfter1}`);
    
    // 🔥 RÉÉCRITURE RÉCURSIVE - Appel AUSSI la version JSON pour traiter les structures imbriquées
    console.log(`\n🔥 AVANT forceSharedRefSuffixesInJson:`);
    rewrittenTokens = forceSharedRefSuffixesInJson(rewrittenTokens, suffix);
    
    console.log(`✅ APRÈS forceSharedRefSuffixesInJson:`);
    const sharedRefsCountAfter2 = rewrittenTokens && Array.isArray(rewrittenTokens) 
      ? rewrittenTokens.filter((t: any) => typeof t === 'string' && t.includes('shared-ref')).length
      : 0;
    console.log(`   Shared-refs final: ${sharedRefsCountAfter2}`);
    
    console.log(`✅ Tokens réécrits (2ème passe - shared-refs forcés):`, rewrittenTokens);
    console.log(`🔍 DEBUG: Cherchons shared-refs NON-suffixés dans les tokens...`);
    if (Array.isArray(rewrittenTokens)) {
      const unsuffixed = rewrittenTokens.filter((t: any) => 
        typeof t === 'string' && t.includes('shared-ref') && !/-\d+$/.test(t)
      );
      if (unsuffixed.length > 0) {
        console.error(`❌ ALERTE: ${unsuffixed.length} shared-refs TOUJOURS non-suffixés:`, unsuffixed);
      } else {
        console.log(`✅ Tous les shared-refs sont suffixés !`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 💾 ÉTAPE 5 : Créer la nouvelle formule
    // ═══════════════════════════════════════════════════════════════════════
    const newFormula = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: newFormulaId,
        nodeId: newNodeId,
        organizationId: originalFormula.organizationId,
        name: originalFormula.name ? `${originalFormula.name}-${suffix}` : null,
        description: originalFormula.description,
        tokens: rewrittenTokens,
        metadata: originalFormula.metadata as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Formule créée: ${newFormula.id}`);
    
    // 🔍 VÉRIFICATION POST-CRÉATION: Lire immédiatement ce qui a été sauvegardé
    console.log(`\n🔍 VÉRIFICATION POST-CRÉATION:`);
    const savedFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: newFormula.id }
    });
    
    if (savedFormula && Array.isArray(savedFormula.tokens)) {
      const savedSharedRefs = savedFormula.tokens.filter((t: any) => 
        typeof t === 'string' && t.includes('shared-ref')
      );
      const suffixed = savedSharedRefs.filter((s: any) => /-\d+$/.test(s));
      const nonSuffixed = savedSharedRefs.filter((s: any) => !/-\d+$/.test(s));
      
      console.log(`   Saved tokens: ${savedFormula.tokens.length}`);
      console.log(`   Shared-refs en BD: ${savedSharedRefs.length}`);
      console.log(`   ✅ Suffixés: ${suffixed.length}`);
      console.log(`   ❌ Non-suffixés: ${nonSuffixed.length}`);
      
      if (nonSuffixed.length > 0) {
        console.error(`🚨 ERREUR! Tokens non-suffixés en BD:`, nonSuffixed.slice(0, 2));
      } else {
        console.log(`✅ SUCCÈS! Tous les shared-refs sont suffixés en BD!`);
      }
    }
    console.log();

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 5 : LIAISON AUTOMATIQUE OBLIGATOIRE
    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ UTILISATION DU SYSTÈME UNIVERSEL DE LIAISON
    // Cette fonction lie automatiquement la formule à TOUS les nœuds référencés
    try {
      await linkFormulaToAllNodes(prisma, newFormulaId, rewrittenTokens);
    } catch (e) {
      console.error(`❌ Erreur LIAISON AUTOMATIQUE:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 5B : Mettre à jour linkedFormulaIds du nœud propriétaire
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await addToNodeLinkedField(prisma, newNodeId, 'linkedFormulaIds', [newFormulaId]);
      console.log(`✅ linkedFormulaIds mis à jour pour nœud propriétaire ${newNodeId}`);
    } catch (e) {
      console.warn(`⚠️ Erreur MAJ linkedFormulaIds du propriétaire:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 ÉTAPE 7 : Synchroniser les paramètres de capacité
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await prisma.treeBranchLeafNode.update({
        where: { id: newNodeId },
        data: {
          hasFormula: true,
          formula_activeId: newFormulaId,
          formula_name: newFormula.name,
          formula_description: newFormula.description
        }
      });
      console.log(`✅ Paramètres capacité (formula) mis à jour pour nœud ${newNodeId}`);
      console.log(`   - formula_activeId: ${newFormulaId}`);
      console.log(`   - formula_name: ${newFormula.name || 'null'}`);
    } catch (e) {
      console.warn(`⚠️ Erreur lors de la mise à jour des paramètres capacité:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 8 : Mettre en cache
    // ═══════════════════════════════════════════════════════════════════════
    formulaCopyCache.set(originalFormulaId, newFormulaId);

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ COPIE FORMULE TERMINÉE`);
    console.log(`${'═'.repeat(80)}\n`);

    return {
      newFormulaId,
      nodeId: newNodeId,
      tokens: rewrittenTokens,
      success: true
    };

  } catch (error) {
    console.error(`❌ Erreur lors de la copie de la formule:`, error);
    return {
      newFormulaId: '',
      nodeId: '',
      tokens: null,
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
