/**
 * ðŸ”§ SystÃ¨me de copie des variables avec leurs capacitÃ©s
 * 
 * Ce module gÃ¨re la copie complÃ¨te des variables (TreeBranchLeafNodeVariable)
 * et de leurs capacitÃ©s associÃ©es (formules, conditions, tables).
 * 
 * PRINCIPES :
 * -----------
 * 1. Une variable peut avoir une "capacitÃ©" dÃ©finie par sourceType + sourceRef
 * 2. Les formats de sourceRef sont :
 *    - "node-formula:ID" â†’ Formule
 *    - "condition:ID" ou "node-condition:ID" â†’ Condition
 *    - "@table.ID" ou "node-table:ID" â†’ Table
 *    - UUID simple â†’ Champ (field)
 * 3. Lors de la copie, on applique un suffixe sur TOUS les IDs
 * 4. Les rÃ©fÃ©rences sont mises Ã  jour pour pointer vers les capacitÃ©s copiÃ©es
 * 5. Les colonnes linked... sont synchronisÃ©es dans les deux sens
 * 
 * âš ï¸ PIÃˆGE CRITIQUE (DÃ©jÃ  cassÃ© par le passÃ©):
 * ------------------------------------------------
 * La variable newSourceRef DOIT Ãªtre MUTABLE (let) car elle est rÃ©assignÃ©e
 * dans plusieurs branches (condition/table/field) lors de la copie.
 * Si on la repasse en const, la crÃ©ation plantera au runtime (reassignation d'un const)
 * et la variable ne sera PAS crÃ©Ã©e. Ne pas modifier "let newSourceRef" en const.
 * 
 * @author System TBL
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”— IMPORTS DES MODULES DE COPIE DE CAPACITÃ‰S
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
import { copyFormulaCapacity } from './copy-capacity-formula.js';
import { copyConditionCapacity } from './copy-capacity-condition.js';
import { copyTableCapacity } from './copy-capacity-table.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“‹ TYPES ET INTERFACES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * RÃ©sultat d'un parsing de sourceRef
 */
export interface ParsedSourceRef {
  /** Type de rÃ©fÃ©rence : 'formula', 'condition', 'table', 'field' */
  type: 'formula' | 'condition' | 'table' | 'field';
  /** ID extrait (sans prÃ©fixe) */
  id: string;
  /** PrÃ©fixe original pour reconstruction */
  prefix: string;
}

/**
 * RÃ©sultat de la copie d'une variable
 */
export interface CopyVariableResult {
  /** ID de la variable copiÃ©e */
  variableId: string;
  /** Nouvelle exposedKey */
  exposedKey: string;
  /** Type de capacitÃ© copiÃ©e (null si fixe) */
  capacityType: 'formula' | 'condition' | 'table' | 'field' | null;
  /** Nouveau sourceRef */
  sourceRef: string | null;
  /** SuccÃ¨s de l'opÃ©ration */
  success: boolean;
  /** Message d'erreur Ã©ventuel */
  error?: string;
  /** ID du nÅ“ud d'affichage crÃ©Ã© (si applicable) */
  displayNodeId?: string;
}

/**
 * Options pour la copie de variable
 */
export interface CopyVariableOptions {
  /** Maps des IDs de formules copiÃ©es (ancien ID â†’ nouveau ID) */
  formulaIdMap?: Map<string, string>;
  /** Maps des IDs de conditions copiÃ©es (ancien ID â†’ nouveau ID) */
  conditionIdMap?: Map<string, string>;
  /** Maps des IDs de tables copiÃ©es (ancien ID â†’ nouveau ID) */
  tableIdMap?: Map<string, string>;
  /** Map globale des nÅ“uds copiÃ©s (ancien ID â†’ nouveau ID) */
  nodeIdMap?: Map<string, string>;
  /** Cache des variables dÃ©jÃ  copiÃ©es pour Ã©viter doublons */
  variableCopyCache?: Map<string, string>;
  /** CrÃ©er automatiquement un nÅ“ud d'affichage dans "Nouveau Section" */
  autoCreateDisplayNode?: boolean;
  /** LibellÃ© de la section cible pour l'affichage (par dÃ©faut: "Nouveau Section") */
  displaySectionLabel?: string;
  /** Lier la variable copiÃ©e Ã  la section d'affichage (sans crÃ©er de nÅ“ud/variable) */
  linkToDisplaySection?: boolean;
  /** Est-ce que le nÅ“ud d'affichage est dÃ©jÃ  crÃ©Ã© par deepCopyNodeInternal ? */
  displayNodeAlreadyCreated?: boolean;
  /** Parent ID du nÅ“ud d'affichage (utilisÃ© par deep-copy-service) */
  displayParentId?: string | null;
  /** Flag indiquant que la copie provient d'une duplication par repeater */
  isFromRepeaterDuplication?: boolean;
  /** Contexte rÃ©pÃ©teur si applicable (pour journalisation) */
  repeatContext?: any;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”§ FONCTIONS UTILITAIRES DE PARSING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Parse un sourceRef pour extraire le type et l'ID
 * 
 * @param sourceRef - RÃ©fÃ©rence Ã  parser
 * @returns Objet avec type, id et prefix
 * 
 * @example
 * parseSourceRef("node-formula:abc123") 
 * â†’ { type: 'formula', id: 'abc123', prefix: 'node-formula:' }
 * 
 * parseSourceRef("condition:def456")
 * â†’ { type: 'condition', id: 'def456', prefix: 'condition:' }
 * 
 * parseSourceRef("@table.ghi789")
 * â†’ { type: 'table', id: 'ghi789', prefix: '@table.' }
 * 
 * parseSourceRef("702d1b09-abc9-4096-9aaa-77155ac5294f")
 * â†’ { type: 'field', id: '702d1b09...', prefix: '' }
 */
export function parseSourceRef(sourceRef: string | null | undefined): ParsedSourceRef | null {
  if (!sourceRef || typeof sourceRef !== 'string') return null;

  const cleaned = sourceRef.trim();
  if (!cleaned) return null;

  // ðŸ§® Formule
  if (cleaned.startsWith('node-formula:')) {
    return {
      type: 'formula',
      id: cleaned.replace('node-formula:', ''),
      prefix: 'node-formula:'
    };
  }

  // ðŸ”€ Condition
  if (cleaned.startsWith('condition:')) {
    return {
      type: 'condition',
      id: cleaned.replace('condition:', ''),
      prefix: 'condition:'
    };
  }

  if (cleaned.startsWith('node-condition:')) {
    return {
      type: 'condition',
      id: cleaned.replace('node-condition:', ''),
      prefix: 'node-condition:'
    };
  }

  // ðŸ“Š Table
  if (cleaned.startsWith('@table.')) {
    return {
      type: 'table',
      id: cleaned.replace('@table.', ''),
      prefix: '@table.'
    };
  }

  if (cleaned.startsWith('node-table:')) {
    return {
      type: 'table',
      id: cleaned.replace('node-table:', ''),
      prefix: 'node-table:'
    };
  }

  // ï¿½ Valeur calculÃ©e (calculatedValue d'un autre champ)
  if (cleaned.startsWith('@calculated.')) {
    return {
      type: 'calculated',
      id: cleaned.replace('@calculated.', ''),
      prefix: '@calculated.'
    };
  }

  // ï¿½ðŸ“ Champ (UUID ou node_xxx)
  return {
    type: 'field',
    id: cleaned,
    prefix: ''
  };
}

/**
 * Applique un suffixe Ã  un sourceRef
 * 
 * @param sourceRef - RÃ©fÃ©rence originale
 * @param suffix - Suffixe numÃ©rique Ã  appliquer
 * @returns sourceRef avec suffixe appliquÃ©
 * 
 * @example
 * applySuffixToSourceRef("node-formula:abc123", 1)
 * â†’ "node-formula:abc123-1"
 * 
 * applySuffixToSourceRef("@table.def456", 2)
 * â†’ "@table.def456-2"
 */
export function applySuffixToSourceRef(
  sourceRef: string | null | undefined,
  suffix: number
): string | null {
  if (!sourceRef) return null;

  const parsed = parseSourceRef(sourceRef);
  if (!parsed) return sourceRef;

  // Appliquer le suffixe Ã  l'ID
  const newId = `${parsed.id}-${suffix}`;
  return `${parsed.prefix}${newId}`;
}

/**
 * Extrait le nodeId depuis un sourceRef
 * Utile pour mettre Ã  jour les colonnes linked... bidirectionnellement
 * 
 * @param sourceRef - RÃ©fÃ©rence
 * @returns nodeId extrait ou null
 */
export function extractNodeIdFromSourceRef(
  sourceRef: string | null | undefined
): string | null {
  const parsed = parseSourceRef(sourceRef);
  return parsed ? parsed.id : null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”„ FONCTION PRINCIPALE DE COPIE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Copie une variable avec sa capacitÃ© associÃ©e
 * 
 * PROCESSUS :
 * -----------
 * 1. RÃ©cupÃ¨re la variable originale
 * 2. VÃ©rifie si dÃ©jÃ  copiÃ©e (cache)
 * 3. GÃ©nÃ¨re les nouveaux IDs avec suffixe
 * 4. Parse le sourceRef pour identifier la capacitÃ©
 * 5. Mappe vers la capacitÃ© copiÃ©e (si disponible dans les maps)
 * 6. CrÃ©e la nouvelle variable
 * 7. Met Ã  jour linkedVariableIds du nÅ“ud propriÃ©taire
 * 8. Met Ã  jour linkedXxxIds de la capacitÃ© (bidirectionnel)
 * 
 * @param originalVarId - ID de la variable Ã  copier
 * @param suffix - Suffixe numÃ©rique Ã  appliquer
 * @param newNodeId - ID du nouveau nÅ“ud propriÃ©taire
 * @param prisma - Instance Prisma Client
 * @param options - Options avec les maps de rÃ©fÃ©rences
 * @returns RÃ©sultat de la copie
 */
export async function copyVariableWithCapacities(
  originalVarId: string,
  suffix: string | number,
  newNodeId: string,
  prisma: PrismaClient,
  options: CopyVariableOptions = {}
): Promise<CopyVariableResult> {
  

  const {
    formulaIdMap = new Map(),
    conditionIdMap = new Map(),
    tableIdMap = new Map(),
    nodeIdMap = new Map(),
    variableCopyCache = new Map(),
    autoCreateDisplayNode = false,
    displaySectionLabel = 'Nouveau Section',
    linkToDisplaySection = false,
  // displayNodeAlreadyCreated is not used anymore in this function; keep options API stable without reassigning
  } = options;

  try {
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ” Ã‰TAPE 1 : VÃ©rifier le cache
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const cacheKey = `${originalVarId}|${newNodeId}`; // Scope le cache par nÅ“ud cible pour ne pas rÃ©utiliser une copie d'un autre nÅ“ud
    
    // Si trouvÃ© en cache et autoCreateDisplayNode, on va rÃ©utiliser la variable du cache
    let cachedVariable: any = null;
    
    if (variableCopyCache.has(cacheKey)) {
      const cachedId = variableCopyCache.get(cacheKey)!;
      
      // RÃ©cupÃ©rer la variable en cache
      const cached = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: cachedId }
      });
      
      if (cached) {
        const parsed = parseSourceRef(cached.sourceRef);
        // âœ… IMPORTANT: Si autoCreateDisplayNode=true, on doit crÃ©er un display node mÃªme si la variable est en cache!
        // Cela permet Ã  plusieurs templates de partager la mÃªme variable mais avoir chacun leur display node
        if (autoCreateDisplayNode) {
          // STOCKER la variable du cache pour la rÃ©utiliser
          cachedVariable = cached;
          // Continuer le flow pour crÃ©er le display node!
          // Ne pas retourner ici
        } else {
          // Pas besoin de display node, retourner les infos de la variable
          return {
            variableId: cached.id,
            exposedKey: cached.exposedKey,
            capacityType: parsed?.type || null,
            sourceRef: cached.sourceRef,
            success: true
          };
        }
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ“¥ Ã‰TAPE 2 : RÃ©cupÃ©rer la variable originale
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: originalVarId }
    });

    if (!originalVar) {
      console.error(`âŒ Variable introuvable: ${originalVarId}`);
      return {
        variableId: '',
        exposedKey: '',
        capacityType: null,
        sourceRef: null,
        success: false,
        error: `Variable introuvable: ${originalVarId}`
      };
    }


  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ðŸ†” Ã‰TAPE 3 : PrÃ©parer les IDs cibles (peuvent Ãªtre adaptÃ©s plus loin si collision)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const stripTrailingNumeric = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const trimmed = (raw as string).trim();
    // Remove all trailing -<number> sequences (eg: foo-1-1 -> foo)
    return trimmed.replace(/(?:-\d+)+\s*$/, '');
  };
  const appendSuffixOnce = (value: string | null | undefined) => {
    if (!value) return value ?? '';
    const base = stripTrailingNumeric(value);
    return `${base}-${suffix}`;
  };

  let newVarId = appendSuffixOnce(originalVarId);
  let newExposedKey = appendSuffixOnce(originalVar.exposedKey);


    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ” Ã‰TAPE 4 : Analyser et COPIER la capacitÃ© si nÃ©cessaire
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // âš ï¸ IMPORTANT: On NE MODIFIE PAS le sourceRef ! Il reste identique Ã  l'original
  // IMPORTANT: NE PAS convertir en const. Cette variable est rÃ©assignÃ©e plus bas.
  // Laisser "let" et ignorer les suggestions automatiques de "prefer-const".
  let newSourceRef = originalVar.sourceRef;
    let capacityType: 'formula' | 'condition' | 'table' | 'field' | null = null;

  // IMPORTANT: on traite TOUT sourceRef non vide (pas uniquement sourceType === 'tree').
  // Les conditions et tables peuvent avoir d'autres sourceType; on s'appuie sur parseSourceRef.
  if (originalVar.sourceRef) {
      const parsed = parseSourceRef(originalVar.sourceRef);
      
      if (parsed) {
        capacityType = parsed.type;

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // ðŸ§® COPIE FORMULE
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        if (capacityType === 'formula') {
          // VÃ©rifier si la formule a dÃ©jÃ  Ã©tÃ© copiÃ©e
          if (formulaIdMap.has(parsed.id)) {
            const mappedFormulaId = formulaIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedFormulaId}`;
          } else {
            // â­ COPIER LA FORMULE MAINTENANT
            try {
              const formulaResult = await copyFormulaCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaCopyCache: formulaIdMap }
              );

              if (formulaResult.success) {
                // Ajouter au map pour les prochaines copies
                formulaIdMap.set(parsed.id, formulaResult.newFormulaId);
                newSourceRef = `${parsed.prefix}${formulaResult.newFormulaId}`;
              } else {
                newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, Number(suffix));
              }
            } catch (e) {
              console.error(`âŒ [COPY-VAR] Exception copie formule:`, (e as Error).message, (e as Error).stack);
              newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, Number(suffix));
            }
          }
        } 
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // ðŸ”€ COPIE CONDITION
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        else if (capacityType === 'condition') {
          if (conditionIdMap.has(parsed.id)) {
            const mappedConditionId = conditionIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedConditionId}`;
          } else {
            // â­ COPIER LA CONDITION MAINTENANT
            try {
              const conditionResult = await copyConditionCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaIdMap, conditionCopyCache: conditionIdMap }
              );

              if (conditionResult.success) {
                // Ajouter au map
                conditionIdMap.set(parsed.id, conditionResult.newConditionId);
                newSourceRef = `${parsed.prefix}${conditionResult.newConditionId}`;
              } else {
                newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
              }
            } catch (e) {
              console.error(`âŒ Exception copie condition:`, (e as Error).message);
              newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
            }
          }
        }
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // ðŸ“Š COPIE TABLE
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        else if (capacityType === 'table') {
          if (tableIdMap.has(parsed.id)) {
            const mappedTableId = tableIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedTableId}`;
          } else {
            // â­ COPIER LA TABLE MAINTENANT
            try {
              const tableResult = await copyTableCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, tableCopyCache: tableIdMap, tableIdMap }
              );

              if (tableResult.success) {
                // Ajouter au map
                tableIdMap.set(parsed.id, tableResult.newTableId);
                newSourceRef = `${parsed.prefix}${tableResult.newTableId}`;
              } else {
                newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
              }
            } catch (e) {
              console.error(`âŒ Exception copie table:`, (e as Error).message);
              newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
            }
          }
        }
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ðŸ“ CHAMP (pas de copie, juste mapping)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        else if (capacityType === 'field') {
          // Mapper le nodeId du champ si disponible
          if (nodeIdMap.has(parsed.id)) {
            newSourceRef = nodeIdMap.get(parsed.id)!;
          } else {
            newSourceRef = `${parsed.id}-${suffix}`;
          }
        }
      }
    }


    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ’¾ Ã‰TAPE 5 : CrÃ©er la nouvelle variable
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    
    // ðŸ” DÃ©terminer le nodeId du nÅ“ud PROPRIÃ‰TAIRE de la variable (nÅ“ud d'affichage)
    // 1) Si l'ancien nodeId de la variable a Ã©tÃ© copiÃ© (prÃ©sent dans nodeIdMap), on utilise ce nouveau nodeId
    // 2) Sinon, si l'auto-crÃ©ation est activÃ©e, on crÃ©e un nÅ“ud d'affichage dÃ©diÃ© et on l'utilise
    // 3) Sinon, fallback sur newNodeId (peut causer des collisions si plusieurs variables par nÅ“ud)
  let finalNodeId = newNodeId;
    if (originalVar.nodeId && nodeIdMap.has(originalVar.nodeId)) {
      finalNodeId = nodeIdMap.get(originalVar.nodeId)!;
    } else if (autoCreateDisplayNode) {
      // CrÃ©er un nÅ“ud d'affichage DÃ‰DIÃ‰ avec un ID unique dÃ©rivÃ© de l'ancien nodeId + suffixe
      try {
        const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: originalVar.nodeId! },
          select: { 
            id: true, 
            parentId: true, 
            treeId: true, 
            order: true, 
            linkedTableIds: true, 
            hasTable: true, 
            table_name: true, 
            table_activeId: true, 
            table_instances: true,
            // ðŸ”‘ IMPORTANT: RÃ©cupÃ©rer subtab pour que la copie soit dans le bon sous-onglet
            subtab: true,
            subtabs: true,
            metadata: true,
          }
        });
        if (originalOwnerNode) {
          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          // ðŸ”‘ RÃˆGLE: DÃ©terminer le parent du display node
          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          // 
          // CONTEXTE DE REPEATER (isFromRepeaterDuplication): 
          //   - Si c'est une variable LIÃ‰E (originalVar.nodeId != newNodeId), le parent DOIT Ãªtre newNodeId
          //   - Cela crÃ©e le display node comme enfant du nÅ“ud instance
          //
          // CONTEXTE NORMAL:
          //   - Le parent = le parent de l'original (mÃªme section)
          // 
          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          
          // ðŸ” DÃ©terminer si c'est une variable LIÃ‰E (dans repeatContext, la variable appartient Ã  un autre nÅ“ud)
          const isLinkedVariable = options.isFromRepeaterDuplication && 
                                   originalVar.nodeId !== newNodeId;
          
          let displayParentId: string | null;
          if (isLinkedVariable) {
            // ðŸ”— Variable LIÃ‰E: crÃ©er le display node COMME ENFANT du nÅ“ud instance (newNodeId)
            displayParentId = newNodeId;
          } else {
            // ðŸ“ Variable DIRECTE: crÃ©er le display node dans la mÃªme section que l'original
            displayParentId = originalOwnerNode.parentId || null;
          }

          // GÃ©nÃ©rer un ID unique pour le nÅ“ud d'affichage (ex: <oldVarNodeId>-<suffix>)
          // âš ï¸ Important: si le nodeId original porte dÃ©jÃ  un suffixe numÃ©rique, on le retire d'abord
          // afin d'Ã©viter des IDs en double-suffixe (ex: foo-1-1 â†’ foo-1).
          const baseDisplayNodeId = stripTrailingNumeric(originalVar.nodeId) || originalVar.nodeId;
          const displayNodeId = `${baseDisplayNodeId}-${suffix}`;
          finalNodeId = displayNodeId;

          const now = new Date();
          const displayNodeData = {
            id: displayNodeId,
            treeId: originalOwnerNode.treeId,
            parentId: displayParentId,
            type: 'leaf_field' as const,
            subType: null as any,
            label: originalVar.displayName || 'DonnÃ©e',
            description: null as string | null,
            value: null as string | null,
            order: (originalOwnerNode.order ?? 0) + 1,
            isRequired: false,
            isVisible: true,
            isActive: true,
            isMultiple: false as any,
            fieldConfig: null as any,
            conditionConfig: null as any,
            formulaConfig: null as any,
            tableConfig: null as any,
            apiConfig: null as any,
            linkConfig: null as any,
            defaultValue: null as any,
            calculatedValue: null as any,
            metadata: { fromVariableId: appendSuffixOnce(originalVar.id) } as any,
            // ðŸ”‘ IMPORTANT: Copier le subtab pour que la copie soit dans le bon sous-onglet
            subtab: originalOwnerNode.subtab,
            subtabs: originalOwnerNode.subtabs,
            createdAt: now,
            updatedAt: now,
            hasAPI: false,
            hasCondition: false,
            hasData: false,
            hasFormula: false,
            hasLink: false,
            hasMarkers: false,
            // ðŸ“Š TABLE: Copier les colonnes table du nÅ“ud original
            // âœ… IMPORTANT: Ajouter le suffixe aux IDs de table pour pointer aux tables copiÃ©es
            hasTable: originalOwnerNode.hasTable ?? false,
            table_name: originalOwnerNode.table_name,
            table_activeId: originalOwnerNode.table_activeId ? `${originalOwnerNode.table_activeId}-${suffix}` : null,
            table_instances: (() => {
              if (!originalOwnerNode.table_instances) {
                return originalOwnerNode.table_instances;
              }
              // ðŸ”‘ CRITIQUE: GÃ©rer les deux cas - objet ou STRING JSON (Prisma retourne parfois string)
              let rawInstances: Record<string, unknown>;
              if (typeof originalOwnerNode.table_instances === 'object') {
                rawInstances = JSON.parse(JSON.stringify(originalOwnerNode.table_instances));
              } else if (typeof originalOwnerNode.table_instances === 'string') {
                // Si c'est une string JSON, parser d'abord
                try {
                  rawInstances = JSON.parse(originalOwnerNode.table_instances);
                } catch {
                  // Si parse Ã©choue, retourner tel quel
                  return originalOwnerNode.table_instances;
                }
              } else {
                return originalOwnerNode.table_instances;
              }
              
              const updatedInstances: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(rawInstances)) {
                // âœ… FIX: VÃ©rifier si la clÃ© a DÃ‰JÃ€ un suffixe numÃ©rique (-1, -2, etc.)
                // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
                const hasSuffixRegex = /-\d+$/;  // Suffixe numÃ©rique Ã  la fin
                const newKey = hasSuffixRegex.test(key) ? key : `${key}-${suffix}`;
                
                // AUSSI ajouter le suffixe au tableId INTÃ‰RIEUR si prÃ©sent
                if (value && typeof value === 'object') {
                  const tableInstanceObj = value as Record<string, unknown>;
                  const updatedObj = { ...tableInstanceObj };
                  if (tableInstanceObj.tableId && typeof tableInstanceObj.tableId === 'string') {
                    // âœ… FIX: MÃªme chose pour le tableId
                    updatedObj.tableId = hasSuffixRegex.test(tableInstanceObj.tableId)
                      ? tableInstanceObj.tableId 
                      : `${tableInstanceObj.tableId}-${suffix}`;
                  }
                  updatedInstances[newKey] = updatedObj;
                } else {
                  updatedInstances[newKey] = value;
                }
              }
              return updatedInstances;
            })() as any,
            linkedTableIds: Array.isArray(originalOwnerNode.linkedTableIds) 
              // âœ… AJOUTER LES SUFFIXES aux IDs de table ici aussi!
              ? originalOwnerNode.linkedTableIds.map(id => `${id}-${suffix}`)
              : [] as any,
            linkedConditionIds: [] as any,
            linkedFormulaIds: [] as any,
            linkedVariableIds: [] as any,
            appearance_size: 'md' as any,
            appearance_variant: null as any,
            appearance_width: '100%' as any,
            fieldType: 'TEXT' as any,
            fieldSubType: null as any,
            field_label: originalVar.displayName as any,
          };

          const maybeExisting = await prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } });
          if (maybeExisting) {
            await prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: { ...displayNodeData, createdAt: maybeExisting.createdAt, updatedAt: now } });
          } else {
            await prisma.treeBranchLeafNode.create({ data: displayNodeData as any });
          }

          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          // ðŸ“Š Ã‰TAPE CRITIQUE: COPIER LES TABLES LIÃ‰ES AU NÅ’UD ORIGINAL
          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          // Si le nÅ“ud original a des tables (hasTable=true et linkedTableIds non vide),
          // on doit copier ces tables pour que la copie fonctionne correctement
          if (originalOwnerNode.hasTable && Array.isArray(originalOwnerNode.linkedTableIds) && originalOwnerNode.linkedTableIds.length > 0) {
            
            for (const originalTableId of originalOwnerNode.linkedTableIds) {
              const newTableId = `${originalTableId}-${suffix}`;
              
              // VÃ©rifier si la table existe dÃ©jÃ 
              const existingTable = await prisma.treeBranchLeafNodeTable.findUnique({
                where: { id: newTableId }
              });
              
              if (existingTable) {
                tableIdMap.set(originalTableId, newTableId);
                continue;
              }
              
              // Copier la table via copyTableCapacity
              try {
                const tableResult = await copyTableCapacity(
                  originalTableId,
                  displayNodeId,  // La nouvelle table appartient au display node copiÃ©
                  Number(suffix),
                  prisma,
                  { nodeIdMap, tableCopyCache: tableIdMap, tableIdMap }
                );
                
                if (tableResult.success) {
                  tableIdMap.set(originalTableId, tableResult.newTableId);
                } else {
                  console.warn(`âš ï¸ [COPY-TABLES] Ã‰chec copie table ${originalTableId}: ${tableResult.error}`);
                }
              } catch (e) {
                console.error(`âŒ [COPY-TABLES] Exception copie table ${originalTableId}:`, (e as Error).message);
              }
            }
            
            // Mettre Ã  jour hasTable sur le display node crÃ©Ã©
            await prisma.treeBranchLeafNode.update({
              where: { id: displayNodeId },
              data: { hasTable: originalOwnerNode.hasTable ?? false }
            });
          }
        } else {
          console.warn(`âš ï¸ Impossible de rÃ©cupÃ©rer le nÅ“ud propriÃ©taire original ${originalVar.nodeId}. Fallback newNodeId.`);
        }
      } catch (e) {
        console.warn(`âš ï¸ Erreur lors de la crÃ©ation du nÅ“ud d'affichage dÃ©diÃ©:`, (e as Error).message);
      }
    } else {
    }
    
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ›¡ï¸ Ã‰TAPE 5A : Ã‰viter les collisions d'ID (conflits inter-templates)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Cas rencontrÃ©: plusieurs templates peuvent rÃ©fÃ©rencer la mÃªme variable d'origine
    // et utiliser le mÃªme suffixe numÃ©rique (ex: 1), provoquant un conflit unique
    // sur id et/ou exposedKey. On sÃ©curise en ajoutant un discriminant basÃ© sur
    // le nÅ“ud d'affichage final si collision dÃ©tectÃ©e.
    try {
      const existingById = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: newVarId } });
      if (existingById) {
        const tail = (finalNodeId || newNodeId || '').slice(-6) || `${Date.now()}`;
        const adjusted = `${originalVarId}-${suffix}-${tail}`;
                newVarId = adjusted;
      }
    } catch (e) {
      console.warn(`âš ï¸ VÃ©rification collision id variable Ã©chouÃ©e:`, (e as Error).message);
    }

    try {
      const existingByKey = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: newExposedKey } });
      if (existingByKey) {
        const tail = (finalNodeId || newNodeId || '').slice(-6) || `${Date.now()}`;
        const adjustedKey = `${originalVar.exposedKey}-${suffix}-${tail}`;
                newExposedKey = adjustedKey;
      }
    } catch (e) {
      console.warn(`âš ï¸ VÃ©rification collision exposedKey Ã©chouÃ©e:`, (e as Error).message);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ” Ã‰TAPE 5A-bis : RÃ©utiliser une variable existante pour ce nÅ“ud si prÃ©sente
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Ã‰vite la violation d'unicitÃ© sur nodeId (1 variable par nÅ“ud) quand
    // plusieurs duplications pointent vers le mÃªme nÅ“ud d'affichage dÃ©diÃ©.
    let _reusingExistingVariable = false;
    let _existingVariableForReuse: any = null;
    
    try {
      const existingForNode = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: finalNodeId } });
      if (existingForNode) {
        _reusingExistingVariable = true;
        _existingVariableForReuse = existingForNode;
        
        // Harmoniser le nÅ“ud d'affichage avec les donnÃ©es de la variable existante
        try {
          await prisma.treeBranchLeafNode.update({
            where: { id: finalNodeId },
            data: {
              hasData: true,
              data_activeId: existingForNode.id,
              data_exposedKey: existingForNode.exposedKey,
              data_displayFormat: existingForNode.displayFormat,
              data_precision: existingForNode.precision,
              data_unit: existingForNode.unit,
              data_visibleToUser: existingForNode.visibleToUser,
              label: existingForNode.displayName || undefined,
              field_label: (existingForNode.displayName as any) || undefined
            }
          });
          await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [existingForNode.id]);
        } catch (e) {
          console.warn(`âš ï¸ Erreur MAJ display node (rÃ©utilisation):`, (e as Error).message);
        }

        // Mettre en cache l'ID rÃ©utilisÃ© pour Ã©viter d'autres crÃ©ations
        variableCopyCache.set(originalVarId, existingForNode.id);
        
        // âš ï¸ NE PAS RETOURNER ICI - Continuer pour copier les capacitÃ©s de cette variable
        // pour ce nouveau nÅ“ud/contexte !
      }
    } catch (e) {
      console.warn(`âš ï¸ VÃ©rification variable existante par nodeId Ã©chouÃ©e:`, (e as Error).message);
    }

    // Utiliser la variable rÃ©utilisÃ©e, la variable en cache, ou en crÃ©er une nouvelle
    let newVariable: any;
    
    if (cachedVariable) {
      newVariable = cachedVariable;
    } else if (_reusingExistingVariable && _existingVariableForReuse) {
      newVariable = _existingVariableForReuse;
    } else {
      
      newVariable = await prisma.treeBranchLeafNodeVariable.create({
        data: {
          id: newVarId,
          nodeId: finalNodeId,
          exposedKey: newExposedKey,
          displayName: originalVar.displayName ? `${originalVar.displayName}-${suffix}` : originalVar.displayName,
          displayFormat: originalVar.displayFormat,
          unit: originalVar.unit,
          precision: originalVar.precision,
          visibleToUser: originalVar.visibleToUser,
          isReadonly: originalVar.isReadonly,
          defaultValue: originalVar.defaultValue,
          fixedValue: originalVar.fixedValue,
          selectedNodeId: originalVar.selectedNodeId 
            ? (nodeIdMap.get(originalVar.selectedNodeId) || appendSuffixOnce(originalVar.selectedNodeId))
            : null,
          sourceRef: newSourceRef,
          sourceType: originalVar.sourceType,
          metadata: originalVar.metadata as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    
    // ðŸ” VÃ‰RIFICATION: Re-chercher la variable pour confirmer qu'elle existe bien
    const verification = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: newVariable.id }
    });
    if (verification) {
    } else {
      console.error(`âŒâŒâŒ PROBLÃˆME GRAVE: Variable ${newVariable.id} N'EXISTE PAS aprÃ¨s crÃ©ation !`);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ“ Ã‰TAPE 5B : Mettre Ã  jour le NÅ’UD D'AFFICHAGE (finalNodeId) avec les paramÃ¨tres data
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    try {
      await prisma.treeBranchLeafNode.update({
        where: { id: finalNodeId },
        data: {
          hasData: true,
          data_activeId: newVariable.id,
          data_exposedKey: newVariable.exposedKey,
          data_displayFormat: newVariable.displayFormat,
          data_precision: newVariable.precision,
          data_unit: newVariable.unit,
          data_visibleToUser: newVariable.visibleToUser,
          // Harmoniser le label du nÅ“ud d'affichage sur le displayName de la variable
          label: newVariable.displayName || undefined,
          field_label: (newVariable.displayName as any) || undefined
        }
      });
    } catch (e) {
      console.warn(`âš ï¸ Erreur lors de la mise Ã  jour des paramÃ¨tres capacitÃ© (display node):`, (e as Error).message);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ§© Ã‰TAPE 5C : Lier Ã  la section d'affichage (sans crÃ©ation) OU crÃ©er un nÅ“ud d'affichage
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (linkToDisplaySection) {
      try {
        // Trouver la section d'affichage "Nouveau Section" dans le contexte du parent d'origine
        const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: originalVar.nodeId },
          select: { parentId: true, treeId: true }
        });
        if (originalOwnerNode?.parentId) {
          const displaySection = await prisma.treeBranchLeafNode.findFirst({
            where: {
              treeId: originalOwnerNode.treeId,
              parentId: originalOwnerNode.parentId,
              type: 'section',
              label: { equals: displaySectionLabel }
            },
            select: { id: true }
          });
          if (displaySection) {
            await addToNodeLinkedField(prisma, displaySection.id, 'linkedVariableIds', [newVariable.id]);
          } else {
          }
        }
      } catch (e) {
        console.warn(`âš ï¸ Erreur lors du linkage vers la section d'affichage:`, (e as Error).message);
      }
    } else if (autoCreateDisplayNode) {
      // DÃ©jÃ  gÃ©rÃ© ci-dessus: finalNodeId pointe vers le nÅ“ud d'affichage (copiÃ© ou crÃ©Ã©)
      // On s'assure simplement que le lien variable â†’ nÅ“ud est en place
      try {
        await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [newVariable.id]);
      } catch (e) {
        console.warn(`âš ï¸ Erreur linkage variableâ†’display node:`, (e as Error).message);
      }
      // Hydratation capacitÃ©s condition/table si applicable
      try {
        if (capacityType && newSourceRef) {
          const parsedCap = parseSourceRef(newSourceRef);
          const capId = parsedCap?.id;
          if (parsedCap && capId) {
            if (parsedCap.type === 'condition') {
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasCondition: true,
                  condition_activeId: capId
                }
              });
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedConditionIds', [capId]);
            } else if (parsedCap.type === 'formula') {
              const frm = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: capId }, select: { name: true } });
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasFormula: true,
                  formula_activeId: capId,
                  formula_name: frm?.name || null
                }
              });
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedFormulaIds', [capId]);
            } else if (parsedCap.type === 'table') {
              const tbl = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: capId }, select: { name: true, type: true } });
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasTable: true,
                  table_activeId: capId,
                  table_name: tbl?.name || null,
                  table_type: (tbl?.type as any) || null
                }
              });
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedTableIds', [capId]);
            }
          }
        }
      } catch (e) {
        console.warn(`âš ï¸ Synchronisation capacitÃ©s condition/table sur le nÅ“ud d'affichage:`, (e as Error).message);
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ”— Ã‰TAPE 6 : Mettre en cache
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    variableCopyCache.set(cacheKey, newVariable.id);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ”„ Ã‰TAPE 7 : Mise Ã  jour bidirectionnelle des linked...
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    
    // NOTE: linkedVariableIds du nÅ“ud propriÃ©taire est gÃ©rÃ© par le code appelant
    // (treebranchleaf-routes.ts) qui fait un UPDATE global aprÃ¨s toutes les copies
    
    // 7B. Mise Ã  jour inverse : ajouter dans la capacitÃ© rÃ©fÃ©rencÃ©e
    if (capacityType && newSourceRef) {
      const parsed = parseSourceRef(newSourceRef);
      if (parsed && parsed.id) {
        try {
          if (capacityType === 'formula') {
            const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (formula) {
              await addToNodeLinkedField(prisma, formula.nodeId, 'linkedFormulaIds', [parsed.id]);
            }
          }
          else if (capacityType === 'condition') {
            const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (condition) {
              await addToNodeLinkedField(prisma, condition.nodeId, 'linkedConditionIds', [parsed.id]);
            }
          }
          else if (capacityType === 'table') {
            const table = await prisma.treeBranchLeafNodeTable.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (table) {
              await addToNodeLinkedField(prisma, table.nodeId, 'linkedTableIds', [parsed.id]);
            }
          }
        } catch (e) {
          console.warn(`âš ï¸ Erreur MAJ bidirectionnelle:`, (e as Error).message);
        }
      }
    }


    return {
      variableId: newVariable.id,
      exposedKey: newExposedKey,
      capacityType,
      sourceRef: newSourceRef,
      success: true,
      displayNodeId: finalNodeId  // ðŸ”‘ IMPORTANT: Retourner l'ID du display node crÃ©Ã©!
    };

  } catch (error) {
    console.error(`âŒ Erreur lors de la copie de la variable:`, error);
    return {
      variableId: '',
      exposedKey: '',
      capacityType: null,
      sourceRef: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      displayNodeId: undefined  // Pas de display node en cas d'erreur
    };
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ§© CRÃ‰ER UN NÅ’UD D'AFFICHAGE POUR UNE VARIABLE EXISTANTE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * CrÃ©e (ou met Ã  jour) un nÅ“ud d'affichage pour une variable existante.
 * N'implique pas de duplication de variable.
 */
export async function createDisplayNodeForExistingVariable(
  variableId: string,
  prisma: PrismaClient,
  displaySectionLabel = 'Nouveau Section',
  suffix: string | number = 'nouveau'
): Promise<{ displayNodeId: string; created: boolean }>
{
  const v = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } });
  if (!v) throw new Error(`Variable introuvable: ${variableId}`);

  const owner = await prisma.treeBranchLeafNode.findUnique({
    where: { id: v.nodeId },
    select: { 
      id: true, 
      parentId: true, 
      treeId: true, 
      order: true, 
      linkedTableIds: true, 
      hasTable: true, 
      table_name: true, 
      table_activeId: true, 
      table_instances: true,
      // ðŸ”‘ IMPORTANT: RÃ©cupÃ©rer subtab pour que la copie soit dans le bon sous-onglet
      subtab: true,
      subtabs: true,
    }
  });
  if (!owner) throw new Error(`NÅ“ud propriÃ©taire introuvable: ${v.nodeId}`);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ðŸ”‘ RÃˆGLE FONDAMENTALE: Les copies doivent rester DANS LA MÃŠME SECTION que l'original
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // 
  // PRINCIPE: Chaque copie doit Ãªtre placÃ©e dans la mÃªme section que le champ original.
  // PAS de crÃ©ation de Section-1, Section-2, etc.
  // Le parent de la copie = le parent de l'original (TOUJOURS)
  // 
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const displayParentId: string | null = owner.parentId;

  const now = new Date();
  
  // FIX 06/01/2026: Verifier si la variable a capacite table
  const variableHasTableCapacity = v.sourceType === 'table' || v.sourceRef?.includes('table:');
  
  const baseData = {
    id: displayNodeId,
    treeId: owner.treeId,
    parentId: displayParentId,
    type: 'leaf_field' as const,
    subType: null as any,
    label: v.displayName || 'DonnÃ©e',
    description: null as string | null,
    value: null as string | null,
    order: (owner.order ?? 0) + 1,
    isRequired: false,
    isVisible: true,
    isActive: true,
    isMultiple: false as any,
    fieldConfig: null as any,
    conditionConfig: null as any,
    formulaConfig: null as any,
    tableConfig: null as any,
    apiConfig: null as any,
    linkConfig: null as any,
    defaultValue: null as any,
    calculatedValue: null as any,
    metadata: { fromVariableId: variableId } as any,
    // ðŸ”‘ IMPORTANT: Copier le subtab pour que la copie soit dans le bon sous-onglet
    subtab: owner.subtab,
    subtabs: owner.subtabs,
    createdAt: now,
    updatedAt: now,
    hasAPI: false,
    hasCondition: false,
    hasData: false,
    hasFormula: false,
    hasLink: false,
    hasMarkers: false,
    // ðŸ“Š TABLE: Copier les colonnes table du nÅ“ud original
    hasTable: owner.hasTable ?? false,
    table_name: owner.table_name,
    table_activeId: owner.table_activeId,
    table_instances: owner.table_instances as any,
    linkedTableIds: Array.isArray(owner.linkedTableIds) ? owner.linkedTableIds : [] as any,
    linkedConditionIds: [] as any,
    linkedFormulaIds: [] as any,
    linkedVariableIds: [variableId] as any,
    appearance_size: 'md' as any,
    appearance_variant: null as any,
    appearance_width: '100%' as any,
    fieldType: 'TEXT' as any,
    fieldSubType: null as any,
    field_label: v.displayName as any,
  };

  const existing = await prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } });
  if (existing) {
    await prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: { ...baseData, createdAt: existing.createdAt, updatedAt: now } });
  } else {
    await prisma.treeBranchLeafNode.create({ data: baseData as any });
  }

  await prisma.treeBranchLeafNode.update({
    where: { id: displayNodeId },
    data: {
      hasData: true,
      data_activeId: variableId,
      data_exposedKey: v.exposedKey,
      data_displayFormat: v.displayFormat,
      data_precision: v.precision,
      data_unit: v.unit,
      data_visibleToUser: v.visibleToUser
    }
  });

  return { displayNodeId, created: !existing };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”§ FONCTIONS UTILITAIRES POUR LINKED FIELDS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Ajoute des IDs Ã  un champ linked... d'un nÅ“ud (sans doublons)
 * 
 * @param prisma - Instance Prisma
 * @param nodeId - ID du nÅ“ud
 * @param field - Nom du champ ('linkedFormulaIds', 'linkedConditionIds', etc.)
 * @param idsToAdd - IDs Ã  ajouter
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
    console.warn(`âš ï¸ NÅ“ud ${nodeId} introuvable pour MAJ ${field}`);
    return;
  }

  const current = (node[field] || []) as string[];
  const newIds = [...new Set([...current, ...idsToAdd])]; // DÃ©dupliquer

  await prisma.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: { [field]: { set: newIds } }
  });
}

/**
 * Version simplifiÃ©e pour compatibilitÃ© avec l'ancien code
 * qui passe parseSourceRef et addToNodeLinkedField en paramÃ¨tres
 */
export async function copyVariableWithCapacitiesLegacy(
  originalVarId: string,
  suffix: number,
  newNodeId: string,
  prisma: PrismaClient,
  _parseSourceRefFn: typeof parseSourceRef,
  _addToNodeLinkedFieldFn: typeof addToNodeLinkedField
): Promise<CopyVariableResult> {
  // Appeler la version moderne
  return copyVariableWithCapacities(originalVarId, suffix, newNodeId, prisma);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”— COPIE DES VARIABLES LIÃ‰ES DEPUIS linkedVariableIds
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * RÃ©sultat de la copie de variables liÃ©es
 */
export interface CopyLinkedVariablesResult {
  /** Nombre de variables copiÃ©es */
  count: number;
  /** Map des anciennes IDs vers les nouvelles IDs */
  variableIdMap: Map<string, string>;
  /** RÃ©sultats individuels de copie */
  results: CopyVariableResult[];
  /** SuccÃ¨s global */
  success: boolean;
  /** Message d'erreur Ã©ventuel */
  error?: string;
}

/**
 * ðŸ”— COPIE MASSIVE DE VARIABLES LIÃ‰ES
 * 
 * Cette fonction :
 * 1. Lit l'ID du nÅ“ud source avec ses linkedVariableIds
 * 2. Pour chaque ID de variable liÃ©, rÃ©cupÃ¨re la variable
 * 3. Copie la variable avec son suffixe
 * 4. Copie les donnÃ©es associÃ©es (capacitÃ©s, formules, conditions, tables)
 * 5. Met Ã  jour les rÃ©fÃ©rences bidirectionnelles
 * 
 * CONTEXTE D'UTILISATION :
 * Si un nÅ“ud a des linkedVariableIds = ['varA', 'varB', 'varC'],
 * cette fonction va copier ces 3 variables + toutes leurs capacitÃ©s.
 * Les champs existent dÃ©jÃ  dans le nouveau nÅ“ud avec le suffixe.
 * 
 * @param sourceNodeId - ID du nÅ“ud source (contient linkedVariableIds)
 * @param newNodeId - ID du nouveau nÅ“ud destination
 * @param suffix - Suffixe numÃ©rique Ã  appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec maps de rÃ©fÃ©rences (formules, conditions, tables)
 * @returns RÃ©sultat de la copie massif
 * 
 * @example
 * // Copier toutes les variables liÃ©es du nÅ“ud 'node-abc' vers 'node-abc-1'
 * const result = await copyLinkedVariablesFromNode(
 *   'node-abc',
 *   'node-abc-1',
 *   1,
 *   prisma,
 *   { formulaIdMap, conditionIdMap, tableIdMap }
 * );
 * console.log(`${result.count} variables copiÃ©es`);
 * // AccÃ©der Ã  la map : result.variableIdMap.get('oldVarId') â†’ 'oldVarId-1'
 */
export async function copyLinkedVariablesFromNode(
  sourceNodeId: string,
  newNodeId: string,
  suffix: number,
  prisma: PrismaClient,
  options: CopyVariableOptions = {}
): Promise<CopyLinkedVariablesResult> {


  try {
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 1ï¸âƒ£ RÃ‰CUPÃ‰RER LE NÅ’UD SOURCE ET SES linkedVariableIds
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const sourceNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: sourceNodeId },
      select: { linkedVariableIds: true }
    });

    if (!sourceNode) {
      console.error(`âŒ NÅ“ud source introuvable: ${sourceNodeId}`);
      return {
        count: 0,
        variableIdMap: new Map(),
        results: [],
        success: false,
        error: `NÅ“ud source introuvable: ${sourceNodeId}`
      };
    }

    const linkedVarIds = sourceNode.linkedVariableIds || [];
    
    if (linkedVarIds.length === 0) {
      return {
        count: 0,
        variableIdMap: new Map(),
        results: [],
        success: true
      };
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 2ï¸âƒ£ COPIER CHAQUE VARIABLE LIÃ‰E
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const variableIdMap = new Map<string, string>();
    const results: CopyVariableResult[] = [];


    for (let i = 0; i < linkedVarIds.length; i++) {
      const varId = linkedVarIds[i];

      try {
        // Copier la variable avec toutes ses capacitÃ©s
        const result = await copyVariableWithCapacities(
          varId,
          suffix,
          newNodeId,
          prisma,
          options
        );

        if (result.success) {
          variableIdMap.set(varId, result.variableId);
        } else {
          console.error(`âŒ Ã‰chec copie: ${result.error}`);
        }

        results.push(result);
      } catch (e) {
        console.error(`âŒ Exception lors de la copie: ${(e as Error).message}`);
        results.push({
          variableId: '',
          exposedKey: '',
          capacityType: null,
          sourceRef: null,
          success: false,
          error: (e as Error).message
        });
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 3ï¸âƒ£ MISE Ã€ JOUR DU NÅ’UD DESTINATION : linkedVariableIds
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const newVarIds = Array.from(variableIdMap.values());
    

    await addToNodeLinkedField(prisma, newNodeId, 'linkedVariableIds', newVarIds);
    

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ðŸ“Š RÃ‰SUMÃ‰
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;


    return {
      count: successCount,
      variableIdMap,
      results,
      success: failureCount === 0
    };

  } catch (error) {
    console.error(`âŒ Erreur globale lors de la copie de variables liÃ©es:`, error);
    return {
      count: 0,
      variableIdMap: new Map(),
      results: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
 
