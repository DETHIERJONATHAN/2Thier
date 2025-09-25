import { PrismaClient } from '@prisma/client';
import { 
  extractNodeIdsFromTokens,
  buildTextFromTokens,
  calculateResult,
  fmtLV,
  normalizeRefId
} from '../shared/legacy-functions';

export interface TBLContext {
  submissionId: string;
  labelMap: Map<string, string | null>;
  valueMap: Map<string, unknown>;
  organizationId: string;
  userId: string;
  treeId?: string;
}

export interface CapacityResult {
  sourceRef: string;
  operationSource: 'condition' | 'formula' | 'table' | 'neutral';
  operationDetail: string;
  operationResult: string;
}

// Type minimal pour le traducteur intelligent afin d'éviter any
interface IntelligentTranslatorLike {
  translateCapacity: (
    kind: 'condition' | 'formula' | 'table' | 'neutral',
    detail: unknown,
    sourceRef: string,
    submissionId: string
  ) => Promise<string> | string;
}

/**
 * 🚀 CALCULATEUR UNIVERSEL DE CAPACITÉS TBL
 * Gère TOUTES les capacités : Condition, Formula, Table, Neutral
 * Avec traduction récursive et données dynamiques + TRADUCTIONS INTELLIGENTES
 */
export class CapacityCalculator {
  private translator: IntelligentTranslatorLike | null = null;
  private static readonly MAX_DEPTH = 3;

  constructor(private prisma: PrismaClient) {
    // Charger le traducteur intelligent
    this.loadIntelligentTranslator();
  }

  /**
   * Charge le TBLIntelligentTranslator dynamiquement
   */
  private async loadIntelligentTranslator(): Promise<void> {
    try {
      // Import dynamique pour ESM
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const path = require('path');
      const translatorPath = path.join(process.cwd(), 'tbl-intelligent-translator.cjs');
      const TBLIntelligentTranslator = require(translatorPath);
      this.translator = new TBLIntelligentTranslator(this.prisma) as IntelligentTranslatorLike;
      console.log('✅ [TBL-PRISMA] TBLIntelligentTranslator chargé avec succès');
    } catch (error) {
      console.warn('⚠️ [TBL-PRISMA] TBLIntelligentTranslator non disponible:', error.message);
    }
  }

  /**
   * 🎯 POINT D'ENTRÉE PRINCIPAL - Calcule n'importe quelle capacité
   */
  async calculateCapacity(
    sourceRef: string,
    context: TBLContext
  ): Promise<CapacityResult> {
    console.log(`[CAPACITY-CALCULATOR] 🚀 Calcul capacité: ${sourceRef}`);
    console.log(`[CAPACITY-CALCULATOR] 📊 Context submissionId: ${context.submissionId}`);

    // 0. S'assurer que le traducteur est chargé
    if (!this.translator) {
      await this.loadIntelligentTranslator();
    }

    // 1. Enrichir les données depuis submissionData
    await this.enrichDataFromSubmission(context);
    console.log(`[CAPACITY-CALCULATOR] 🎯 Après enrichissement - Labels: ${context.labelMap?.size || 0}, Valeurs: ${context.valueMap?.size || 0}`);

    // 2. Déterminer le type de capacité
  const capacityType = this.detectCapacityType(sourceRef);
    console.log(`[CAPACITY-CALCULATOR] 🎯 Type détecté: ${capacityType}`);

    // 3. Calculer selon le type avec TRADUCTIONS INTELLIGENTES
    let operationDetail: unknown;
    let operationResult: string;

    switch (capacityType) {
      case 'Condition': {
        const conditionId = this.extractCapacityId(sourceRef);
        console.log(`[CAPACITY-CALCULATOR] 🔄 Traitement condition: ${conditionId}`);
        operationDetail = await this.getConditionDetail(conditionId, context.organizationId);
        // ⚖️ Format strict pour Condition: construire toujours "Si/Alors/Sinon" sans traducteur pour éviter les doublons de (=) Result
        operationResult = await this.calculateCondition(conditionId, context);
        break;
      }

      case 'Formula': {
        const lower = sourceRef.toLowerCase();
        let formulaId = this.extractCapacityId(sourceRef);
        // Si le sourceRef est de type node-formula:<X>, <X> peut être un formulaId OU un nodeId. Gérer les deux cas.
        if (lower.startsWith('node-formula:')) {
          try {
            const byFormulaId = await this.prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: formulaId }, select: { id: true } });
            if (byFormulaId?.id) {
              // C'était déjà un ID de formule
              console.log(`[CAPACITY-CALCULATOR] 🔁 node-formula fourni comme formulaId → conservé: ${formulaId}`);
            } else {
              // Interpréter comme nodeId
              const byNode = await this.prisma.treeBranchLeafNodeFormula.findFirst({
                where: { nodeId: formulaId },
                select: { id: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
              });
              if (byNode?.id) {
                formulaId = byNode.id;
                console.log(`[CAPACITY-CALCULATOR] 🔁 node-formula résolu via nodeId → formula:${formulaId}`);
              }
            }
          } catch (e) {
            console.warn('[CAPACITY-CALCULATOR] ⚠️ Résolution node-formula échouée:', e instanceof Error ? e.message : e);
          }
        } else if (lower.startsWith('formula:')) {
          // Même si le préfixe est formula:, si l'ID n'existe pas en tant que formule, tenter une résolution par nodeId
          const byFormulaId = await this.prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: formulaId }, select: { id: true } });
          if (!byFormulaId) {
            try {
              const byNode = await this.prisma.treeBranchLeafNodeFormula.findFirst({
                where: { nodeId: formulaId },
                select: { id: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
              });
              if (byNode?.id) {
                formulaId = byNode.id;
                console.log(`[CAPACITY-CALCULATOR] 🔁 formula:<nodeId> résolu → formula:${formulaId}`);
              }
            } catch {/* noop */}
          }
        }
        // Dernière chance: parcourir NodeVariable.sourceRef pour retrouver le nodeId et prendre la formule par défaut
        try {
          const exists = await this.prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: formulaId }, select: { id: true } });
          if (!exists) {
            const varHit = await this.prisma.treeBranchLeafNodeVariable.findFirst({
              where: {
                OR: [
                  { sourceRef: { equals: `formula:${formulaId}` } },
                  { sourceRef: { equals: `node-formula:${formulaId}` } },
                  { sourceRef: { contains: formulaId } }
                ]
              },
              select: { nodeId: true }
            });
            if (varHit?.nodeId) {
              const byNode = await this.prisma.treeBranchLeafNodeFormula.findFirst({
                where: { nodeId: varHit.nodeId },
                select: { id: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
              });
              if (byNode?.id) {
                formulaId = byNode.id;
                console.log(`[CAPACITY-CALCULATOR] 🔁 Résolu via NodeVariable → formula:${formulaId}`);
              }
            }
          }
        } catch (e) {
          console.warn('[CAPACITY-CALCULATOR] ⚠️ Résolution via NodeVariable échouée:', e instanceof Error ? e.message : e);
        }
        console.log(`[CAPACITY-CALCULATOR] � Traitement formule: ${formulaId}`);
        // DÉTAIL = CAPACITÉ BRUTE UNIQUEMENT (tokens). Pas de texte/"expression" dans operationDetail.
        operationDetail = await this.getFormulaDetail(formulaId);
        
        // 🧠 TRADUCTION INTELLIGENTE EN PRIORITÉ
        if (this.translator) {
          try {
            const translated = await this.translator.translateCapacity(
              'formula',
              operationDetail,
              sourceRef,
              context.submissionId
            );
            console.log(`[CAPACITY-CALCULATOR] 🧠 Traduction intelligente formule: ${translated}`);
            const t = (translated || '').toString().trim();
            const isWeak = !t
              || t.length < 10
              || /^\(=\)\s*Result\s*\([^)]*\)\s*$/i.test(t)
              || /non\s*d[eé]finie|undefined|aucune|inconnue|non\s*reconnu(e)?|unknown|not\s*recognized/i.test(t);
            if (isWeak) {
              console.warn('[CAPACITY-CALCULATOR] ⚠️ Traduction formule trop faible, fallback vers construction lisible');
              operationResult = await this.calculateFormula(formulaId, context);
            } else {
              operationResult = translated;
            }
          } catch (error) {
            console.warn(`[CAPACITY-CALCULATOR] ⚠️ Échec traduction intelligente formule, fallback:`, error);
            operationResult = await this.calculateFormula(formulaId, context);
          }
        } else {
          operationResult = await this.calculateFormula(formulaId, context);
        }
        break;
      }

      case 'Table': {
        const lower = sourceRef.toLowerCase();
        let tableId = this.extractCapacityId(sourceRef);
        if (lower.startsWith('node-table:')) {
          try {
            const byTableId = await this.prisma.treeBranchLeafNodeTable.findUnique({ where: { id: tableId }, select: { id: true } });
            if (byTableId?.id) {
              console.log(`[CAPACITY-CALCULATOR] 🔁 node-table fourni comme tableId → conservé: ${tableId}`);
            } else {
              const byNode = await this.prisma.treeBranchLeafNodeTable.findFirst({
                where: { nodeId: tableId },
                select: { id: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
              });
              if (byNode?.id) {
                tableId = byNode.id;
                console.log(`[CAPACITY-CALCULATOR] 🔁 node-table résolu via nodeId → table:${tableId}`);
              }
            }
          } catch (e) {
            console.warn('[CAPACITY-CALCULATOR] ⚠️ Résolution node-table échouée:', e instanceof Error ? e.message : e);
          }
        } else if (lower.startsWith('table:')) {
          const byTableId = await this.prisma.treeBranchLeafNodeTable.findUnique({ where: { id: tableId }, select: { id: true } });
          if (!byTableId) {
            try {
              const byNode = await this.prisma.treeBranchLeafNodeTable.findFirst({
                where: { nodeId: tableId },
                select: { id: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
              });
              if (byNode?.id) {
                tableId = byNode.id;
                console.log(`[CAPACITY-CALCULATOR] 🔁 table:<nodeId> résolu → table:${tableId}`);
              }
            } catch {/* noop */}
          }
        }
        // Dernière chance: parcourir NodeVariable.sourceRef pour retrouver le nodeId et prendre la table par défaut
        try {
          const exists = await this.prisma.treeBranchLeafNodeTable.findUnique({ where: { id: tableId }, select: { id: true } });
          if (!exists) {
            const varHit = await this.prisma.treeBranchLeafNodeVariable.findFirst({
              where: {
                OR: [
                  { sourceRef: { equals: `table:${tableId}` } },
                  { sourceRef: { equals: `node-table:${tableId}` } },
                  { sourceRef: { contains: tableId } }
                ]
              },
              select: { nodeId: true }
            });
            if (varHit?.nodeId) {
              const byNode = await this.prisma.treeBranchLeafNodeTable.findFirst({
                where: { nodeId: varHit.nodeId },
                select: { id: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
              });
              if (byNode?.id) {
                tableId = byNode.id;
                console.log(`[CAPACITY-CALCULATOR] 🔁 Résolu via NodeVariable → table:${tableId}`);
              }
            }
          }
        } catch (e) {
          console.warn('[CAPACITY-CALCULATOR] ⚠️ Résolution table via NodeVariable échouée:', e instanceof Error ? e.message : e);
        }
        console.log(`[CAPACITY-CALCULATOR] 📋 Traitement table: ${tableId}`);
        operationDetail = await this.getTableDetail(tableId);
        
        // 🧠 TRADUCTION INTELLIGENTE EN PRIORITÉ
        if (this.translator) {
          try {
            const translated = await this.translator.translateCapacity(
              'table',
              operationDetail,
              sourceRef,
              context.submissionId
            );
            console.log(`[CAPACITY-CALCULATOR] 🧠 Traduction intelligente table: ${translated}`);
            const t = (translated || '').toString().trim();
            const isWeak = !t
              || t.length < 10
              || /^\(=\)\s*Result\s*\([^)]*\)\s*$/i.test(t)
              || /non\s*d[eé]finie|undefined|aucune|inconnue|non\s*reconnu(e)?|unknown|not\s*recognized/i.test(t);
            if (isWeak) {
              console.warn('[CAPACITY-CALCULATOR] ⚠️ Traduction table trop faible, fallback vers construction lisible');
              operationResult = await this.calculateTable(tableId, context);
            } else {
              operationResult = translated as string;
            }
          } catch (error) {
            console.warn(`[CAPACITY-CALCULATOR] ⚠️ Échec traduction intelligente table, fallback:`, error);
            operationResult = await this.calculateTable(tableId, context);
          }
        } else {
          operationResult = await this.calculateTable(tableId, context);
        }
        break;
      }

      case 'Neutral': {
        // C'est un champ simple
        console.log(`[CAPACITY-CALCULATOR] 🎯 Traitement champ: ${sourceRef}`);
        operationDetail = await this.getNodeDetail(sourceRef);
        operationResult = await this.calculateField(sourceRef, context);
        break;
      }

      default:
        throw new Error(`Type de capacité non reconnu: ${sourceRef}`);
    }

    console.log(`[CAPACITY-CALCULATOR] ✅ Résultat final: ${operationResult}`);

    return {
      sourceRef,
      operationSource: capacityType.toLowerCase() as 'condition' | 'formula' | 'table' | 'neutral',
      operationDetail: JSON.stringify(operationDetail),
      operationResult
    };
  }

  /**
   * 🔍 Détecte le type de capacité depuis le sourceRef
   */
  private detectCapacityType(sourceRef: string): 'Condition' | 'Formula' | 'Table' | 'Neutral' {
    const lower = sourceRef.toLowerCase();
    if (lower.startsWith('condition:') || lower.startsWith('node-condition:')) return 'Condition';
    if (lower.startsWith('formula:') || lower.startsWith('node-formula:')) return 'Formula';
    if (lower.startsWith('table:') || lower.startsWith('node-table:')) return 'Table';
    return 'Neutral'; // Champ simple
  }

  /**
   * Extrait l'ID d'une capacité à partir d'un sourceRef supportant les préfixes node-*
   */
  private extractCapacityId(sourceRef: string): string {
    if (!sourceRef) return sourceRef;
    const parts = sourceRef.split(':');
    // format attendu: type:id
    return parts.length > 1 ? parts[1] : sourceRef;
  }

  /**
   * 📊 RÉCUPÉRATION MASSIVE - VALEURS depuis SubmissionData + LABELS depuis Nodes
   */
  private async enrichDataFromSubmission(context: TBLContext): Promise<void> {
    console.log(`[CAPACITY-CALCULATOR] 📊 Enrichissement données: ${context.submissionId}`);
    
    // S'assurer que les Maps sont initialisées
    if (!context.labelMap) {
      context.labelMap = new Map<string, string | null>();
    }
    if (!context.valueMap) {
      context.valueMap = new Map<string, unknown>();
    }
    
    try {
      // 1. Récupérer les VALEURS depuis TreeBranchLeafSubmissionData
      const submissionData = await this.prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: context.submissionId },
        select: { 
          nodeId: true, 
          value: true
        }
      });
      
      console.log(`[CAPACITY-CALCULATOR] 📊 ${submissionData.length} valeurs récupérées depuis SubmissionData`);
      
      // 2. Récupérer TOUS les LABELS de l'arbre (pas seulement ceux avec valeurs!)
      // D'abord trouver l'arbre de cette soumission
      const firstSubmissionNode = await this.prisma.treeBranchLeafSubmissionData.findFirst({
        where: { submissionId: context.submissionId },
        include: { TreeBranchLeafNode: { select: { treeId: true } } }
      });
      
      const fallbackTreeId = context.treeId;
      const treeId = firstSubmissionNode?.TreeBranchLeafNode?.treeId || fallbackTreeId;
      if (treeId) {
        // Récupérer TOUS les nœuds de cet arbre
        const allNodes = await this.prisma.treeBranchLeafNode.findMany({
          where: { treeId },
          select: { 
            id: true, 
            label: true 
          }
        });
        
        console.log(`[CAPACITY-CALCULATOR] 🏷️ ${allNodes.length} labels récupérés depuis TOUT l'arbre`);
        
        // 3. ENRICHIR LABELMAP avec TOUS les labels de l'arbre
        for (const node of allNodes) {
          context.labelMap.set(node.id, node.label);
        }
      } else {
        console.warn(`[CAPACITY-CALCULATOR] ⚠️ Impossible de trouver l'arbre pour la soumission ${context.submissionId}`);
      }
      
      // 4. ENRICHIR VALUEMAP depuis TreeBranchLeafSubmissionData
      for (const data of submissionData) {
        if (data.nodeId && data.value !== null) {
          let parsedValue: unknown;
          try {
            parsedValue = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          } catch {
            parsedValue = data.value;
          }
          context.valueMap.set(data.nodeId, parsedValue);
        }
      }
      
      console.log(`[CAPACITY-CALCULATOR] 🎉 Enrichissement terminé - labels: ${context.labelMap?.size || 0}, valeurs: ${context.valueMap?.size || 0}`);
      
    } catch (error) {
      console.error(`[CAPACITY-CALCULATOR] ❌ Erreur enrichissement:`, error);
    }
  }

  /**
   * 🔄 CONDITION - Traduction récursive complète
   */
  private async calculateCondition(conditionId: string, context: TBLContext): Promise<string> {
    console.log(`[CAPACITY-CALCULATOR] 🔄 Calcul condition: ${conditionId}`);

    const condition = await this.prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId }
    });

    if (!condition) {
      return `Condition ${conditionId} non trouvée`;
    }

    const conditionSet = condition.conditionSet as unknown;
    return await this.buildConditionTranslation(conditionSet, context);
  }

  /**
   * 📊 FORMULE - Calcul avec traduction récursive
   */
  private async calculateFormula(formulaId: string, context: TBLContext): Promise<string> {
    console.log(`[CAPACITY-CALCULATOR] 📊 Calcul formule: ${formulaId}`);

    let formula = await this.prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      select: { id: true, nodeId: true, tokens: true }
    });

    // Fallback: si pas trouvé par id, interpréter formulaId comme nodeId et prendre la formule par défaut
    if (!formula) {
      try {
        const byNode = await this.prisma.treeBranchLeafNodeFormula.findFirst({
          where: { nodeId: formulaId },
          select: { id: true, nodeId: true, tokens: true },
          orderBy: { isDefault: 'desc' }
        });
        if (byNode) {
          formula = byNode;
        }
      } catch {/* noop */}
    }

    if (!formula) {
      return `Formule ${formulaId} non trouvée`;
    }

    // DEBUG : Vérifier le contexte avant calcul
    console.log(`[FORMULA-DEBUG] Tokens: ${JSON.stringify(formula.tokens)}`);
    console.log(`[FORMULA-DEBUG] Context ValueMap size: ${context.valueMap?.size || 0}`);
    console.log(`[FORMULA-DEBUG] Context LabelMap size: ${context.labelMap?.size || 0}`);
    
    // Vérifier les valeurs spécifiques pour les tokens
    if (Array.isArray(formula.tokens)) {
      formula.tokens.forEach((token, idx) => {
        if (typeof token === 'string' && token.startsWith('@value.')) {
          const nodeId = token.replace('@value.', '');
          const label = context.labelMap.get(nodeId);
          const value = context.valueMap.get(nodeId);
          console.log(`[FORMULA-DEBUG] Token ${idx + 1}: ${token} -> Label: "${label}", Value: ${value}`);
        }
      });
    }

    // Enrichir les labels des tokens
    await this.enrichTokenLabels(formula.tokens, context);

    // 1) Préparer une valueMap locale qui intègre les capacités imbriquées (formule/condition/table)
    const tokenIds = Array.from(extractNodeIdsFromTokens(formula.tokens) || []);
    const localValueMap = new Map<string, unknown>(context.valueMap);
    for (const id of tokenIds) {
      const current = localValueMap.get(id);
      const hasNumeric = current !== undefined && current !== null && !isNaN(Number(current));
      if (!hasNumeric) {
        const resolved = await this.resolveNumericForNode(id, context, 0);
        if (resolved !== null && !isNaN(resolved)) {
          localValueMap.set(id, resolved);
        }
      }
    }

  // Construire l'expression lisible (pour le RESULT uniquement) et calculer le résultat avec la carte locale
  const expression = buildTextFromTokens(formula.tokens, context.labelMap, localValueMap);
  const result = calculateResult(expression);
  const formulaLabel = context.labelMap.get(formula.nodeId) ?? 'Formule';

    // 2) Lister proprement les entrées utilisées (libellé + valeur) comme pour les conditions
    const inputs: string[] = [];
    for (const id of tokenIds) {
      const label = context.labelMap.get(id) ?? 'Champ';
      const value = localValueMap.get(id);
      inputs.push(fmtLV(label, value));
    }
    // Normaliser les entrées au format "Label (Valeur)"
    const inputsText = inputs
      .map(seg => {
        const m = seg.match(/^([^:]+):\s*(.+)$/);
        return m ? `${m[1].trim()} (${m[2].trim()})` : seg;
      })
      .join(' (/) ');

    // 3) Construire un texte lisible minimal: prioriser les entrées "Label (Valeur)", sinon l'expression, sinon un fallback
    const exprText = (expression ? String(expression).trim() : '');
    const normalizePairsToParen = (text: string): string => {
      if (!text) return '';
      const parts = text.split(/\s*\(\/\)\s*/);
      const out = parts.map(seg => {
        const m = seg.match(/^([^:]+):\s*(.+)$/);
        return m ? `${m[1].trim()} (${m[2].trim()})` : seg.trim();
      });
      return out.filter(Boolean).join(' (/) ');
    };
    const baseRaw = inputsText || exprText || `${formulaLabel} (aucune donnée)`;
    const base = normalizePairsToParen(baseRaw);
    if (result !== null && result !== undefined && !isNaN(result)) {
      return base ? `${base} (=) Result (${result})` : `(=) Result (${result})`;
    } else {
      return base || formulaLabel;
    }
  }

  /**
   * 🔢 Résout une valeur numérique pour un nodeId: valeur saisie sinon capacité par défaut (formule > condition > table)
   */
  private async resolveNumericForNode(nodeId: string, context: TBLContext, depth: number): Promise<number | null> {
    if (depth > CapacityCalculator.MAX_DEPTH) return null;

    // 1) Valeur brute si présente
    const raw = context.valueMap.get(nodeId);
    if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
      return Number(raw);
    }

    // 2) Chercher capacités par défaut liées à ce nodeId
    try {
      const [formula, condition, table] = await Promise.all([
        this.prisma.treeBranchLeafNodeFormula.findFirst({ where: { nodeId }, select: { id: true }, orderBy: { isDefault: 'desc' } }),
        this.prisma.treeBranchLeafNodeCondition.findFirst({ where: { nodeId }, select: { id: true }, orderBy: { isDefault: 'desc' } }),
        this.prisma.treeBranchLeafNodeTable.findFirst({ where: { nodeId }, select: { id: true }, orderBy: { isDefault: 'desc' } })
      ]);

      const tryType = async (type: 'formula' | 'condition' | 'table', id?: string | null) => {
        if (!id) return null;
        const sr = `${type}:${id}`;
        const cap = await this.calculateCapacity(sr, context);
        const num = this.extractNumericFromOperationResult(cap.operationResult);
        return num;
      };

      // Priorité: formule > condition > table
      const f = await tryType('formula', formula?.id);
      if (f !== null && !isNaN(f)) return f;
      const c = await tryType('condition', condition?.id);
      if (c !== null && !isNaN(c)) return c;
      const t = await tryType('table', table?.id);
      if (t !== null && !isNaN(t)) return t;
    } catch (e) {
      console.warn('[RESOLVE-NUMERIC] ⚠️ Recherche capacités par défaut échouée:', e instanceof Error ? e.message : e);
    }

    return null;
  }

  /**
   * 🔍 Extrait le nombre du marqueur "(=) Result (x)" dans un texte de résultat
   */
  private extractNumericFromOperationResult(text: string): number | null {
    if (!text || typeof text !== 'string') return null;
    const m = text.match(/\(=\)\s*Result\s*\(([-+]?\d*\.?\d+)\)/i);
    return m ? Number(m[1]) : null;
  }

  /**
   * 📋 TABLE - Traduction des tableaux
   */
  private async calculateTable(tableId: string, context: TBLContext): Promise<string> {
    console.log(`[CAPACITY-CALCULATOR] 📋 Calcul table: ${tableId}`);

    const table = await this.prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId }
    });

    if (!table) {
      return `Table ${tableId} non trouvée`;
    }

    const tableLabel = context.labelMap.get(table.nodeId) ?? 'Table';

    // Fallback lisible: tenter d'extraire les références de valeurs pour afficher libellés + données
    const refs = new Set<string>();
    const scan = (node: unknown) => {
      if (!node) return;
      if (typeof node === 'string') {
        // Référence de type '@value.<id>'
        const m = node.match(/^@value\.(.+)$/);
        if (m && m[1]) refs.add(m[1]);
        // Tentative: id brut (UUID-like)
        if (/^[0-9a-f-]{10,}$/i.test(node)) refs.add(node);
        return;
      }
      if (Array.isArray(node)) {
        for (const it of node) scan(it);
        return;
      }
      if (typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        if (typeof obj.ref === 'string') {
          const r = (obj.ref as string).replace('@value.', '');
          refs.add(r);
        }
        for (const k of Object.keys(obj)) scan(obj[k]);
      }
    };
    try {
      const raw = table.tableData as unknown;
      scan(raw);
    } catch {/* noop */}

    const inputs: string[] = [];
    for (const id of Array.from(refs)) {
      const label = context.labelMap.get(id) ?? 'Champ';
      const value = context.valueMap.get(id);
      inputs.push(fmtLV(label, value));
    }
    const inputsText = inputs.join(' (/) ');
    return inputsText ? `${tableLabel} ${inputsText}` : `${tableLabel} (données table)`;
  }

  /**
   * 🎯 CHAMP SIMPLE - Traduction directe
   */
  private async calculateField(nodeId: string, context: TBLContext): Promise<string> {
    console.log(`[CAPACITY-CALCULATOR] 🎯 Calcul champ: ${nodeId}`);

    const cleanId = normalizeRefId(nodeId);
    const label = context.labelMap.get(cleanId);
    const value = context.valueMap.get(cleanId);

    return fmtLV(label, value);
  }

  /**
   * 🏗️ Construction de la traduction des conditions avec ÉVALUATION DYNAMIQUE
   */
  private async buildConditionTranslation(conditionSet: unknown, context: TBLContext): Promise<string> {
    if (!conditionSet || typeof conditionSet !== 'object') {
      return 'Condition invalide';
    }
    
    const setObj = conditionSet as Record<string, unknown>;
    if (!setObj.branches) {
      return 'Condition invalide';
    }

    const branches = setObj.branches as Array<Record<string, unknown>>;

    // Prendre la première clause WHEN comme expression à rendre
    const firstBranch = Array.isArray(branches) && branches.length > 0 ? (branches[0] as Record<string, unknown>) : undefined;
    const whenNode = firstBranch?.when as unknown;
    const whenText = this.translateWhenClause(whenNode, context);

    // Évaluer la condition sur la première branche (mode first-match)
    const isTrue = firstBranch?.when ? await this.evaluateCondition(firstBranch.when, context) : false;

    // Construire les textes ALORS et SINON
  let thenText = '';
  let elseText = '';
  let thenNumeric: number | null = null;
  let elseNumeric: number | null = null;

    if (firstBranch?.actions) {
      const thenOut = await this.translateActions(firstBranch.actions as unknown[], context);
      thenText = thenOut.text;
      thenNumeric = thenOut.numeric;
    }
    if (setObj.fallback && typeof setObj.fallback === 'object') {
      const fallback = setObj.fallback as Record<string, unknown>;
      if (fallback.actions) {
        const elseOut = await this.translateActions(fallback.actions as unknown[], context);
        elseText = elseOut.text;
        elseNumeric = elseOut.numeric;
      }
    }

    // Nettoyer les " (=) Result (...)" internes pour éviter les doublons
    const stripInnerResult = (s: string) => s.replace(/\(=\)\s*Result\s*\([^)]*\)/gi, '').trim();
    const cleanThen = stripInnerResult(thenText);
    const cleanElse = stripInnerResult(elseText);

    const chosen = isTrue ? thenNumeric : elseNumeric;
    // Toujours afficher dans l'ordre: Si …; Alors …; Sinon …
    const base = `Si ${whenText}; Alors ${cleanThen || '—'}; Sinon ${cleanElse || '—'}`;
    return chosen !== null && chosen !== undefined && !isNaN(chosen as number)
      ? `${base} (=) Result (${chosen})`
      : base;
  }

  /**
   * 🎯 Traduction des actions avec récursion COMPLÈTE
   */
  private async translateActions(actions: unknown[], context: TBLContext): Promise<{ text: string; numeric: number | null }> {
    const texts: string[] = [];
    // On collecte deux types de numériques:
    // - preferredNumeric: issu d'un marqueur explicite "(=) Result (x)" (formule/condition/table)
    // - fallbackNumeric: dérivé de motifs faibles dans le texte (": 90" ou "(90)") pour champs simples
    let preferredNumeric: number | null = null;
    let fallbackNumeric: number | null = null;

    const extractMarkerNumeric = (s: string): number | null => {
      const m = s.match(/\(=\)\s*Result\s*\(([-+]?\d*\.?\d+)\)/i);
      return m ? Number(m[1]) : null;
    };
    const extractColonNumeric = (s: string): number | null => {
      // Ex: "Prix Kw/h: 90" → 90
      const m = s.match(/:\s*([-+]?\d*\.?\d+)\s*$/);
      return m ? Number(m[1]) : null;
    };
    const extractParenNumeric = (s: string): number | null => {
      // Ex: "Label (90)" → 90 (dernier recours)
      const m = s.match(/\(([-+]?\d*\.?\d+)\)\s*$/);
      return m ? Number(m[1]) : null;
    };

    for (const action of actions) {
      if (action && typeof action === 'object') {
        const actionObj = action as Record<string, unknown>;
        if (actionObj.nodeIds && Array.isArray(actionObj.nodeIds)) {
          for (const nodeId of actionObj.nodeIds) {
            console.log(`[TRANSLATE-ACTIONS] 🎯 Traitement RAW: ${nodeId}`);
            
            // 🔧 Création du sourceRef correct avec préfixe pour la détection de type
            let sourceRef: string;
            if (typeof nodeId === 'string') {
              if (nodeId.startsWith('node-formula:')) {
                const realId = nodeId.replace('node-formula:', '');
                sourceRef = `formula:${realId}`; // Format pour detectCapacityType
                console.log(`[TRANSLATE-ACTIONS] 🧮 Formule détectée: ${sourceRef}`);
              } else if (nodeId.startsWith('node-table:')) {
                const realId = nodeId.replace('node-table:', '');
                sourceRef = `table:${realId}`;
                console.log(`[TRANSLATE-ACTIONS] 📊 Table détectée: ${sourceRef}`);
              } else if (nodeId.startsWith('node-condition:')) {
                const realId = nodeId.replace('node-condition:', '');
                sourceRef = `condition:${realId}`;
                console.log(`[TRANSLATE-ACTIONS] ❓ Condition détectée: ${sourceRef}`);
              } else {
                sourceRef = nodeId; // Champ simple sans préfixe
              }
            } else {
              sourceRef = nodeId as string;
              // Détection implicite: si c'est un nodeId simple, chercher formule/condition/table par défaut
              if (typeof sourceRef === 'string' && /^[0-9a-f-]{10,}$/i.test(sourceRef)) {
                try {
                  const [formula, condition, table] = await Promise.all([
                    this.prisma.treeBranchLeafNodeFormula.findFirst({ where: { nodeId: sourceRef }, select: { id: true }, orderBy: { isDefault: 'desc' } }),
                    this.prisma.treeBranchLeafNodeCondition.findFirst({ where: { nodeId: sourceRef }, select: { id: true }, orderBy: { isDefault: 'desc' } }),
                    this.prisma.treeBranchLeafNodeTable.findFirst({ where: { nodeId: sourceRef }, select: { id: true }, orderBy: { isDefault: 'desc' } })
                  ]);
                  if (formula?.id) {
                    sourceRef = `formula:${formula.id}`;
                    console.log(`[TRANSLATE-ACTIONS] 🔍 Implicite: Formule trouvée pour ${nodeId} → ${sourceRef}`);
                  } else if (condition?.id) {
                    sourceRef = `condition:${condition.id}`;
                    console.log(`[TRANSLATE-ACTIONS] 🔍 Implicite: Condition trouvée pour ${nodeId} → ${sourceRef}`);
                  } else if (table?.id) {
                    sourceRef = `table:${table.id}`;
                    console.log(`[TRANSLATE-ACTIONS] 🔍 Implicite: Table trouvée pour ${nodeId} → ${sourceRef}`);
                  }
                } catch (e) {
                  console.warn('[TRANSLATE-ACTIONS] ⚠️ Recherche implicite échouée:', e instanceof Error ? e.message : e);
                }
              }
            }
            
            // 🚀 RÉCURSION COMPLÈTE - Calculer avec le bon sourceRef
            const result = await this.calculateCapacity(sourceRef, context);
            // Nettoyage: supprimer tout marqueur interne "(=) Result (...)"
            const cleaned = (result.operationResult || '').replace(/\(=\)\s*Result\s*\([^)]*\)/gi, '').trim();

            // Normalisation: produire des paires "Label (Valeur)" séparées par " (/) " sans préfixes de type
            const normalizeToParen = (text: string): string => {
              if (!text) return '';
              // Retirer préfixes de type éventuels
              const s = text.replace(/^\s*(Formule|Condition|Tableau|Champ)\s+/i, '').trim();
              // Découper en segments si liste
              const parts = s.split(/\s*\(\/\)\s*/);
              const norm = parts.map(seg => {
                const t = seg.trim();
                // Transformer "Label: Valeur" => "Label (Valeur)"
                const m = t.match(/^([^:]+):\s*(.+)$/);
                if (m) {
                  const label = m[1].trim();
                  const val = m[2].trim();
                  return `${label} (${val})`;
                }
                return t;
              });
              return norm.filter(Boolean).join(' (/) ');
            };

            texts.push(normalizeToParen(cleaned));

            // 1) Privilégier un nombre issu du marqueur "(=) Result (x)"
            const markerNum = extractMarkerNumeric(result.operationResult);
            if (markerNum !== null && !isNaN(markerNum)) {
              // On prend le dernier marqueur rencontré (cas rare de multiples)
              preferredNumeric = markerNum;
            } else {
              // 2) Fallbacks sûrs uniquement si aucun preferredNumeric n'a été trouvé
              if (preferredNumeric === null) {
                const colonNum = extractColonNumeric(result.operationResult);
                if (colonNum !== null && !isNaN(colonNum)) {
                  fallbackNumeric = colonNum;
                } else {
                  const parenNum = extractParenNumeric(result.operationResult);
                  if (parenNum !== null && !isNaN(parenNum)) {
                    fallbackNumeric = parenNum;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Restituer la meilleure valeur trouvée: préférer le marqueur explicite
    const numeric = (preferredNumeric !== null ? preferredNumeric : fallbackNumeric);
    // Concaténer les segments d'actions avec le séparateur normalisé " (/) "
    const joinedText = texts.filter(Boolean).join(' (/) ').trim();
    return { text: joinedText, numeric };
  }

  /**
   * ⚡ ÉVALUATION DYNAMIQUE DES CONDITIONS
   */
  private async evaluateCondition(whenNode: unknown, context: TBLContext): Promise<boolean> {
    if (!whenNode || typeof whenNode !== 'object') {
      return false;
    }
    
    const when = whenNode as Record<string, unknown>;
    const { op, left } = when;
    
    if (left && typeof left === 'object') {
      const leftObj = left as Record<string, unknown>;
      if (leftObj.ref && typeof leftObj.ref === 'string') {
        const nodeId = leftObj.ref.replace('@value.', '');
        const value = context.valueMap.get(nodeId);
        
        console.log(`[EVALUATE-CONDITION] 🎯 NodeId: ${nodeId}, Valeur: ${value}, Opération: ${op}`);
        
        switch (op) {
          case 'isNotEmpty': {
            const isNotEmpty = value !== null && value !== undefined && value !== '' && value !== 0;
            console.log(`[EVALUATE-CONDITION] isNotEmpty = ${isNotEmpty}`);
            return isNotEmpty;
          }
            
          case 'isEmpty': {
            const isEmpty = value === null || value === undefined || value === '' || value === 0;
            console.log(`[EVALUATE-CONDITION] isEmpty = ${isEmpty}`);
            return isEmpty;
          }
            
          case 'equals': {
            let rightVal: unknown = undefined;
            const right = (when as Record<string, unknown>).right as Record<string, unknown> | undefined;
            if (right) {
              if (typeof right.ref === 'string') {
                const rightNode = (right.ref as string).replace('@value.', '');
                rightVal = context.valueMap.get(rightNode);
              } else if ('value' in right) {
                rightVal = (right as Record<string, unknown>)['value'] as unknown;
              }
            }
            // Comparaison souple: numérique si possible, sinon string trim/case-insensitive
            const bothNumeric = (a: unknown, b: unknown) => !isNaN(Number(a)) && !isNaN(Number(b));
            let equals = false;
            if (bothNumeric(value, rightVal)) {
              equals = Number(value) === Number(rightVal);
            } else {
              const l = (value ?? '').toString().trim().toLowerCase();
              const r = (rightVal ?? '').toString().trim().toLowerCase();
              equals = l === r;
            }
            console.log(`[EVALUATE-CONDITION] equals = ${equals} (left=${value}, right=${rightVal})`);
            return equals;
          }
            
          default: {
            console.log(`[EVALUATE-CONDITION] Opération non reconnue: ${op}`);
            return false;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * 🔍 Traduction des clauses WHEN (pour affichage uniquement)
   */
  private translateWhenClause(whenNode: unknown, context: TBLContext): string {
    if (!whenNode || typeof whenNode !== 'object') {
      return 'condition';
    }
    
    const when = whenNode as Record<string, unknown>;
  const { op, left } = when;
    
    if (left && typeof left === 'object') {
      const leftObj = left as Record<string, unknown>;
      if (leftObj.ref && typeof leftObj.ref === 'string') {
        const nodeId = leftObj.ref.replace('@value.', '');
        const label = context.labelMap.get(nodeId) ?? 'Champ';
        
        switch (op) {
          case 'isNotEmpty':
            return `${label} = n'est pas vide`;
          case 'isEmpty':
            return `${label} = est vide`;
          case 'equals': {
            // Afficher la valeur/label de droite si disponible
            const right = (when as Record<string, unknown>).right as Record<string, unknown> | undefined;
            if (right) {
              if (typeof right.ref === 'string') {
                const rightNodeId = right.ref.replace('@value.', '');
                const rightLabel = context.labelMap.get(rightNodeId) ?? 'Valeur';
                return `${label} = ${rightLabel}`;
              }
              if ('value' in right) {
                const val = (right as Record<string, unknown>)['value'] as unknown;
                return `${label} = ${val}`;
              }
            }
            return `${label} = valeur`;
          }
          default:
            return `${label} ${op}`;
        }
      }
    }
    
    return 'condition';
  }

  /**
   * 🏷️ Enrichissement des labels pour les tokens
   */
  private async enrichTokenLabels(tokens: unknown, context: TBLContext): Promise<void> {
    const tokenIdSet = extractNodeIdsFromTokens(tokens);
    const tokenIds = Array.from(tokenIdSet);
    
    if (tokenIds.length > 0) {
      const missing = tokenIds.filter(id => !context.labelMap.has(id));
      
      if (missing.length > 0) {
        const nodes = await this.prisma.treeBranchLeafNode.findMany({
          where: { id: { in: missing } },
          select: { id: true, label: true }
        });
        
        for (const node of nodes) {
          context.labelMap.set(node.id, node.label || null);
        }
      }
    }
  }

  /**
   * 📄 Récupération des détails par type
   */
  private async getConditionDetail(conditionId: string, organizationId: string): Promise<unknown> {
    console.log(`[CAPACITY-CALCULATOR] 🔍 Recherche condition ${conditionId} pour org: ${organizationId}`);
    
    const condition = await this.prisma.treeBranchLeafNodeCondition.findFirst({
      where: { 
        id: conditionId,
        organizationId: organizationId
      },
      select: { conditionSet: true }
    });
    
    if (!condition) {
      console.error(`[CAPACITY-CALCULATOR] ❌ Condition ${conditionId} non trouvée pour l'organisation ${organizationId}`);
      return null;
    }
    
    console.log(`[CAPACITY-CALCULATOR] ✅ Condition ${conditionId} trouvée`);
    return condition.conditionSet || {};
  }

  private async getFormulaDetail(formulaId: string): Promise<unknown> {
    const formula = await this.prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      select: { tokens: true }
    });
    return formula?.tokens || [];
  }

  private async getTableDetail(tableId: string): Promise<unknown> {
    const table = await this.prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      select: { tableData: true }
    });
    return table?.tableData || {};
  }

  private async getNodeDetail(nodeId: string): Promise<unknown> {
    const node = await this.prisma.treeBranchLeafNode.findUnique({
      where: { id: normalizeRefId(nodeId) },
      select: { id: true, label: true, type: true }
    });
    return node || {};
  }
}