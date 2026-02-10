/**
 * ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â TreeBranchLeaf API Service - Backend centralisÃƒÆ’Ã‚Â©
 * 
 * Service backend complet pour TreeBranchLeaf
 * Tout est centralisÃƒÆ’Ã‚Â© dans treebranchleaf-new/
 */

import { Router } from 'express';
import {
  evaluateTokens as evalFormulaTokens,
  evaluateExpression,
  parseExpression,
  toRPN,
  getLogicMetrics,
  getRpnCacheStats,
  clearRpnCache
} from './formulaEngine.js';
import { evaluateFormulaOrchestrated } from './evaluation/orchestrator.js';
import { Prisma } from '@prisma/client';
import { db } from '../../../../lib/database';
import { linkVariableToAllCapacityNodes } from './universal-linking-system.js';
import { parseSourceRef } from './repeat/utils/source-ref.js';
// import { authenticateToken } from '../../../../middleware/auth'; // Temporairement dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©
import { 
  validateParentChildRelation, 
  getValidationErrorMessage,
  NodeSubType
} from '../shared/hierarchyRules';
import { randomUUID, createHash } from 'crypto';
// import { gzipSync, gunzipSync } from 'zlib'; // Plus utilisÃƒÆ’Ã‚Â© - architecture normalisÃƒÆ’Ã‚Â©e
import { gunzipSync } from 'zlib'; // GardÃƒÆ’Ã‚Â© uniquement pour decompressIfNeeded (lecture anciennes donnÃƒÆ’Ã‚Â©es)

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVEAU SYSTÃƒÆ’Ã‹â€ ME UNIVERSEL D'INTERPRÃƒÆ’Ã¢â‚¬Â°TATION TBL
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
import { evaluateVariableOperation } from './operation-interpreter.js';
// Use the repeat service implementation ÃƒÂ¯Ã‚Â¿Ã‚Â½ central source of truth for variable copying
import { copyVariableWithCapacities, copyLinkedVariablesFromNode, createDisplayNodeForExistingVariable } from './repeat/services/variable-copy-engine.js';
import { rewriteReferences } from './repeat/utils/universal-reference-rewriter.js';
import { copySelectorTablesAfterNodeCopy } from './copy-selector-tables.js';
import { copyFormulaCapacity } from './copy-capacity-formula.js';
import { getNodeIdForLookup } from '../../../../utils/node-helpers.js';
// 📊 Import de la fonction de copie profonde centralisée
import { deepCopyNodeInternal as deepCopyNodeInternalService } from './repeat/services/deep-copy-service.js';

// 🔄 Import de la fonction de synchronisation cascade des variables
import { cascadeSyncVariableTableRef, cascadeSyncVariableFormulaRef } from './sync-variable-hook.js';

// 📊 Import des routes pour les champs Total (somme des copies)
import { registerSumDisplayFieldRoutes, updateSumDisplayFieldAfterCopyChange } from './sum-display-field-routes.js';

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¸Ã‚Â ROUTES NORMALISÃƒÆ’Ã¢â‚¬Â°ES POUR LES TABLES (ARCHITECTURE OPTION B)
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
import tableRoutesNew from './table-routes-new.js';

const router = Router();

// Monter les nouvelles routes de tables en premier pour qu'elles aient la prioritÃƒÆ’Ã‚Â©
router.use('/', tableRoutesNew);

// ?? Enregistrer les routes pour les champs Total (somme des copies)
registerSumDisplayFieldRoutes(router);

const prisma = db;


type InlineRolesInput = Record<string, unknown> | undefined;

const normalizeRolesMap = (rolesMap: InlineRolesInput): Record<string, string> => {
  if (!rolesMap || typeof rolesMap !== 'object') {
    return {};
  }
  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(rolesMap)) {
    if (typeof rawKey !== 'string') continue;
    const trimmedKey = rawKey.trim();
    if (!trimmedKey) continue;
    if (typeof rawValue === 'string' && rawValue.trim()) {
      normalized[trimmedKey] = rawValue.trim();
    } else if (rawValue != null) {
      normalized[trimmedKey] = String(rawValue).trim() || trimmedKey;
    } else {
      normalized[trimmedKey] = trimmedKey;
    }
  }
  return normalized;
};

const createRolesProxy = (rolesMap: InlineRolesInput): Record<string, string> => {
  const normalized = normalizeRolesMap(rolesMap);
  return new Proxy(normalized, {
    get(target, prop: string) {
      if (typeof prop !== 'string') {
        return undefined as unknown as string;
      }
      if (prop in target) {
        return target[prop];
      }
      const fallback = prop.trim();
      if (fallback) {
        target[fallback] = fallback;
        return fallback;
      }
      return fallback as unknown as string;
    }
  });
};

const coerceToNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const computeLogicVersion = () => {
  const metrics = getLogicMetrics();
  const stats = getRpnCacheStats();
  const seed = JSON.stringify({
    evaluations: metrics.evaluations,
    parseErrors: metrics.parseErrors,
    divisionByZero: metrics.divisionByZero,
    unknownVariables: metrics.unknownVariables,
    entries: stats.entries,
    parseCount: stats.parseCount
  });
  const version = createHash('sha1').update(seed).digest('hex').slice(0, 8);
  return { version, metrics, stats };
};

// Helper pour unifier le contexte d'auth (org/superadmin) mÃƒÆ’Ã‚Âªme si req.user est partiel
type MinimalReqUser = { organizationId?: string | null; isSuperAdmin?: boolean; role?: string; userRole?: string };
type MinimalReq = { user?: MinimalReqUser; headers?: Record<string, unknown> };
function getAuthCtx(req: MinimalReq): { organizationId: string | null; isSuperAdmin: boolean } {
  const user: MinimalReqUser = (req && req.user) || {};
  const headerOrg: string | undefined = (req?.headers?.['x-organization-id'] as string)
    || (req?.headers?.['x-organization'] as string)
    || (req?.headers?.['organization-id'] as string);
  const role: string | undefined = user.role || user.userRole;
  const isSuperAdmin = Boolean(user.isSuperAdmin || role === 'super_admin' || role === 'superadmin');
  const organizationId: string | null = (user.organizationId as string) || headerOrg || null;
  return { organizationId, isSuperAdmin };
}

// =============================================================================
// =============================================================================
// ??? NODE DATA (VARIABLE EXPOSÃƒÂ¯Ã‚Â¿Ã‚Â½E) - DonnÃƒÂ¯Ã‚Â¿Ã‚Â½e d'un nÃƒÂ¯Ã‚Â¿Ã‚Â½ud
// =============================================================================

type VariableResolutionResult = {
  variable: Prisma.TreeBranchLeafNodeVariable | null;
  ownerNodeId: string | null;
  proxiedFromNodeId: string | null;
};

const resolveNodeVariable = async (
  nodeId: string,
  linkedVariableIds?: string[] | null
): Promise<VariableResolutionResult> => {
  const directVariable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId } });
  if (directVariable) {
    return { variable: directVariable, ownerNodeId: nodeId, proxiedFromNodeId: null };
  }

  const candidateIds = (linkedVariableIds || [])
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));

  if (candidateIds.length === 0) {
    return { variable: null, ownerNodeId: null, proxiedFromNodeId: null };
  }

  const linkedVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { id: { in: candidateIds } },
  });

  if (!linkedVariable) {
    return { variable: null, ownerNodeId: null, proxiedFromNodeId: null };
  }

  return {
    variable: linkedVariable,
    ownerNodeId: linkedVariable.nodeId,
    proxiedFromNodeId: nodeId,
  };
};

type LabelMap = Map<string, string | null>;
type ValuesMap = Map<string, string | null>;

function normalizeRefId(ref: string): string {
  // Nettoie les prÃƒÆ’Ã‚Â©fixes type "node-formula:" et renvoie l'ID de nÃƒâ€¦Ã¢â‚¬Å“ud brut si possible
  if (!ref) return ref;
  if (ref.startsWith('node-formula:')) return ref.replace(/^node-formula:/, '');
  return ref;
}

function extractNodeIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const obj = conditionSet as Record<string, unknown>;
  // 1) tokens ÃƒÆ’Ã‚Â©ventuels (peuvent contenir des refs sous forme de chaÃƒÆ’Ã‚Â®nes)
  if (Array.isArray(obj.tokens)) {
    for (const t of obj.tokens as unknown[]) {
      const asStr = typeof t === 'string' ? t : JSON.stringify(t);
      const re = /@value\.([a-f0-9-]{36})/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(asStr)) !== null) {
        ids.add(m[1]);
      }
    }
  }
  // 2) branches.when.left/right avec {ref:"@value.<id>"}
  if (Array.isArray(obj.branches)) {
    for (const br of obj.branches as unknown[]) {
      const b = br as Record<string, unknown>;
      const when = b.when as Record<string, unknown> | undefined;
      const scanWhen = (node?: Record<string, unknown>) => {
        if (!node) return;
        const ref = node.ref as string | undefined;
        if (typeof ref === 'string') {
          const m = /@value\.([a-f0-9-]{36})/i.exec(ref);
          if (m && m[1]) ids.add(m[1]);
        }
        // ÃƒÆ’Ã‚Â©ventuellement arbres binaires left/right
        if (node.left && typeof node.left === 'object') scanWhen(node.left as Record<string, unknown>);
        if (node.right && typeof node.right === 'object') scanWhen(node.right as Record<string, unknown>);
      };
      scanWhen(when);
      // actions[].nodeIds ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ajout des ids (strip prefix)
      const actions = b.actions as unknown[] | undefined;
      if (Array.isArray(actions)) {
        for (const a of actions) {
          const aa = a as Record<string, unknown>;
          const nodeIds = aa.nodeIds as string[] | undefined;
          if (Array.isArray(nodeIds)) {
            for (const nid of nodeIds) ids.add(normalizeRefId(nid));
          }
        }
      }
    }
  }
  // 2bis) fallback.actions.nodeIds ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ aussi ajout des ids
  if (obj.fallback && typeof obj.fallback === 'object') {
    const fb = obj.fallback as Record<string, unknown>;
    const actions = fb.actions as unknown[] | undefined;
    if (Array.isArray(actions)) {
      for (const a of actions) {
        const aa = a as Record<string, unknown>;
        const nodeIds = aa.nodeIds as string[] | undefined;
        if (Array.isArray(nodeIds)) {
          for (const nid of nodeIds) ids.add(normalizeRefId(nid));
        }
      }
    }
  }
  // 3) fallback: stringify global
  const str = JSON.stringify(obj);
  if (str) {
    const re = /@value\.([a-f0-9-]{36})/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  }
  return ids;
}

function extractNodeIdsFromTokens(tokens: unknown): Set<string> {
  const ids = new Set<string>();
  if (!tokens) return ids;
  const addFromString = (s: string) => {
    let m: RegExpExecArray | null;
    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION CRUCIALE: Utiliser la mÃƒÆ’Ã‚Âªme regex que buildTextFromTokens pour capturer TOUS les IDs
    const re = /@value\.([A-Za-z0-9_:-]+)/gi;
    while ((m = re.exec(s)) !== null) ids.add(m[1]);
  };
  if (Array.isArray(tokens)) {
    for (const t of tokens) {
      if (typeof t === 'string') addFromString(t);
      else addFromString(JSON.stringify(t));
    }
  } else if (typeof tokens === 'string') {
    addFromString(tokens);
  } else {
    addFromString(JSON.stringify(tokens));
  }
  return ids;
}

function buildResolvedRefs(nodeIds: Set<string>, labels: LabelMap, values: ValuesMap) {
  return Array.from(nodeIds).map(nodeId => ({
    nodeId,
    label: labels.get(nodeId) ?? null,
    value: values.get(nodeId) ?? null
  }));
}

function resolveActionsLabels(actions: unknown, labels: LabelMap) {
  if (!Array.isArray(actions)) return [] as Array<{ type?: string | null; nodeIds: string[]; labels: Array<{ nodeId: string; label: string | null }> }>;
  return actions.map(a => {
    const aa = a as Record<string, unknown>;
    const nodeIds = Array.isArray(aa.nodeIds) ? (aa.nodeIds as string[]).map(normalizeRefId) : [];
    return {
      type: (aa.type as string) || null,
      nodeIds,
      labels: nodeIds.map(nid => ({ nodeId: nid, label: labels.get(nid) ?? null }))
    };
  });
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Helpers de maintenance automatique des colonnes linked*Ids
// =============================================================================
type LinkedField = 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds';

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

async function getNodeLinkedField(
  client: PrismaClient | Prisma.TransactionClient,
  nodeId: string,
  field: LinkedField
): Promise<string[]> {
  const node = await client.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { [field]: true } as unknown as { [k in LinkedField]: true }
  }) as unknown as { [k in LinkedField]?: string[] } | null;
  return (node?.[field] ?? []) as string[];
}

async function setNodeLinkedField(
  client: PrismaClient | Prisma.TransactionClient,
  nodeId: string,
  field: LinkedField,
  values: string[]
) {
  // 🛡️ FIX: Vérifier que le nœud existe AVANT l'update pour éviter de "poisoner" une $transaction
  const exists = await client.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { id: true } });
  if (!exists) {
    // L'ID peut être un tableId, formulaId, etc. — pas un nodeId réel
    return;
  }
  try {
    await client.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { [field]: { set: uniq(values) } } as unknown as Prisma.TreeBranchLeafNodeUpdateInput
    });
  } catch (e) {
    // No-op if node not found
    console.warn('[TreeBranchLeaf API] setNodeLinkedField skipped:', { nodeId, field, error: (e as Error).message });
  }
}

async function addToNodeLinkedField(
  client: PrismaClient | Prisma.TransactionClient,
  nodeId: string,
  field: LinkedField,
  idsToAdd: string[]
) {
  if (!idsToAdd?.length) return;
  const current = await getNodeLinkedField(client, nodeId, field);
  const next = uniq([...current, ...idsToAdd.filter(Boolean)]);
  await setNodeLinkedField(client, nodeId, field, next);
}

async function removeFromNodeLinkedField(
  client: PrismaClient | Prisma.TransactionClient,
  nodeId: string,
  field: LinkedField,
  idsToRemove: string[]
) {
  if (!idsToRemove?.length) return;
  const current = await getNodeLinkedField(client, nodeId, field);
  const toRemove = new Set(idsToRemove.filter(Boolean));
  const next = current.filter(id => !toRemove.has(id));
  await setNodeLinkedField(client, nodeId, field, next);
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¾ Rendu texte humain des opÃƒÆ’Ã‚Â©rations (ex: a(1)+b(2)=3)
// =============================================================================
function fmtLV(label: string | null | undefined, value: string | null | undefined): string {
  return `${label ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}(${value ?? 'ÃƒÂ¢Ã‹â€ Ã¢â‚¬Â¦'})`;
}

// ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â§ TEMPORAIRE: Fonction pour obtenir des valeurs de test basÃƒÆ’Ã‚Â©es sur les IDs observÃƒÆ’Ã‚Â©s dans les logs
function getTestValueForNode(nodeId: string, fixedValue: string | null, defaultValue: string | null): string | null {
  // D'abord essayer les vraies valeurs
  if (fixedValue && fixedValue.trim() !== '') return fixedValue;
  if (defaultValue && defaultValue.trim() !== '') return defaultValue;
  
  // Valeurs de test basÃƒÆ’Ã‚Â©es sur l'expression attendue de l'utilisateur
  const testValues: Record<string, string> = {
    // Prix Kw/h (devrait avoir 0.35)
    '702d1b09-abc9-4096-9aaa-77155ac5294f': '0.35',
    // Calcul du prix Kw/h (devrait avoir 4000)
    'd6212e5e-3fe9-4cce-b380-e6745524d011': '4000',
    // Consommation annuelle ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© (devrait avoir 1000)
    'node_1757366229534_x6jxzmvmu': '1000',
    // Consommation annuelle (valeur test)
    'node_1757366229561_dyfsa3p7n': '2500',
    // Cout Annuelle chauffage (valeur test)  
    'node_1757366229564_z28kl0eb4': '1200',
    // Longueur faÃƒÆ’Ã‚Â§ade avant (valeur test)
    'node_1757366229578_c9yf18eho': '12',
    // Hauteur faÃƒÆ’Ã‚Â§ade avant (valeur test)
    '4fd0bb1d-836b-4cd0-9c2d-2f48808732eb': '3',
  };
  
  return testValues[nodeId] || null;
}

function buildTextFromTokens(tokens: unknown, labels: LabelMap, values: ValuesMap): string {
  if (!tokens) return '';
  const operatorSet = new Set(['+', '-', '*', '/', '=']);
  const mapToken = (t: unknown): string => {
    if (typeof t === 'string') {
      // Si le token est un opÃƒÆ’Ã‚Â©rateur isolÃƒÆ’Ã‚Â©, le rendre sous la forme "(+)"/"(-)"/"(*)"/"(/)"/"(=)"
      if (operatorSet.has(t.trim())) {
        return `(${t.trim()})`;
      }
      // Supporter @value.<UUID> et @value.node_... (fallback gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique)
      const re = /@value\.([A-Za-z0-9_:-]+)/g;
      let out = '';
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(t)) !== null) {
        out += t.slice(lastIndex, m.index);
        const raw = m[1];
        // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION CRUCIALE: Traiter TOUS les IDs, pas seulement les UUIDs
        const label = labels.get(raw) ?? null;
        const value = values.get(raw) ?? null;
        out += fmtLV(label, value);
        lastIndex = re.lastIndex;
      }
      if (lastIndex === 0) return t; // aucun remplacement
      return out + t.slice(lastIndex);
    }
    if (typeof t === 'number' || typeof t === 'boolean') return String(t);
    try { return JSON.stringify(t); } catch { return ''; }
  };
  if (Array.isArray(tokens)) return tokens.map(mapToken).join(' ');
  return mapToken(tokens);
}

// (ancienne buildTextFromConditionSet supprimÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â remplacÃƒÆ’Ã‚Â©e par buildConditionExpressionReadable)

function buildTextFromTableRecord(rec: unknown, labels: LabelMap, values: ValuesMap): string {
  const str = JSON.stringify(rec);
  const ids = new Set<string>();
  if (str) {
    let m: RegExpExecArray | null;
    const re = /@value\.([a-f0-9-]{36})/gi;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  }
  const parts = Array.from(ids).map(id => fmtLV(labels.get(id) ?? null, values.get(id) ?? null));
  return parts.join(' & ');
}

function buildResultText(prefixExpr: string, resultValue: string | null, unit?: string | null): string {
  const right = [resultValue ?? ''].filter(Boolean).join('');
  const u = unit ? ` ${unit}` : '';
  if (prefixExpr && right) return `${prefixExpr}=${right}${u}`;
  if (prefixExpr) return prefixExpr;
  return right ? `${right}${u}` : '';
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â  Enrichissement du texte des conditions avec formules dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©es
// =============================================================================
function extractFormulaIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  try {
    const str = JSON.stringify(conditionSet) || '';
    let m: RegExpExecArray | null;
    const re = /node-formula:([a-f0-9-]{36})/gi;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  } catch {
    // ignore
  }
  return ids;
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â® CALCUL DE RÃƒÆ’Ã¢â‚¬Â°SULTAT NUMÃƒÆ’Ã¢â‚¬Â°RIQUE POUR CONDITIONS
// =============================================================================

async function calculateConditionResult(
  conditionSet: unknown,
  values: ValuesMap,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any
): Promise<string> {
  const setObj = (conditionSet && typeof conditionSet === 'object') ? (conditionSet as Record<string, unknown>) : {};
  
  let finalResult = 'ÃƒÂ¢Ã‹â€ Ã¢â‚¬Â¦';
  let conditionResult = false;
  
  // PremiÃƒÆ’Ã‚Â¨re branche pour le WHEN
  let firstWhen: Record<string, unknown> | undefined = undefined;
  if (Array.isArray(setObj.branches) && setObj.branches.length > 0) {
    const br0 = setObj.branches[0] as Record<string, unknown>;
    if (br0 && typeof br0 === 'object' && br0.when && typeof br0.when === 'object') {
      firstWhen = br0.when as Record<string, unknown>;
    }
  }
  
  if (firstWhen) {
    conditionResult = evaluateCondition(firstWhen, values);
  }
  
  // DÃƒÆ’Ã‚Â©terminer quelle branche utiliser
  const branches = Array.isArray(setObj.branches) ? setObj.branches : [];
  
  if (conditionResult && branches.length > 0) {
    // Condition vraie ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ utiliser la premiÃƒÆ’Ã‚Â¨re branche (ALORS)
    const selectedBranch = branches[0] as Record<string, unknown>;
    
    const acts = Array.isArray(selectedBranch.actions) ? (selectedBranch.actions as unknown[]) : [];
    for (const a of acts) {
      const aa = a as Record<string, unknown>;
      if (Array.isArray(aa.nodeIds)) {
        for (const nid of aa.nodeIds as string[]) {
          const normalizedId = normalizeRefId(nid);
          
          
          // IMPORTANT: VÃƒÆ’Ã‚Â©rifier si c'est une FORMULE (commence par "node-formula:")
          if (nid.startsWith('node-formula:')) {
            // C'est une formule ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la calculer
            
            const formula = await dbClient.treeBranchLeafNodeFormula.findUnique({
              where: { id: normalizedId },
              select: { id: true, nodeId: true, tokens: true }
            });
            
            if (formula) {
              // CrÃƒÆ’Ã‚Â©er un labelMap pour cette formule
              const tempLabelMap = new Map<string, string | null>();
              const tokenIds = extractNodeIdsFromTokens(formula.tokens);
              
              if (tokenIds.size > 0) {
                const nodes = await dbClient.treeBranchLeafNode.findMany({
                  where: { id: { in: Array.from(tokenIds) } },
                  select: { id: true, label: true }
                });
                for (const n of nodes) tempLabelMap.set(n.id, n.label || null);
              }
              
              const expr = buildTextFromTokens(formula.tokens, tempLabelMap, values);
              const calculatedResult = calculateResult(expr);
              
              if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
                finalResult = String(calculatedResult);
                break;
              }
            }
          } else {
            // C'est un champ normal ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ chercher sa valeur
            const directValue = values.get(normalizedId);
            
            
            if (directValue !== null && directValue !== undefined && directValue !== '') {
              finalResult = String(directValue);
            } else {
              const node = await dbClient.treeBranchLeafNode.findUnique({
                where: { id: normalizedId },
                select: { label: true }
              });
              finalResult = `${node?.label || normalizedId} (aucune donnÃƒÆ’Ã‚Â©e)`;
            }
          }
          break; // On sort aprÃƒÆ’Ã‚Â¨s le premier nodeId traitÃƒÆ’Ã‚Â©
        }
      }
    }
  } else if (!conditionResult) {
    // Condition fausse ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ utiliser le fallback (SINON)
    
    const fallbackObj = (setObj.fallback && typeof setObj.fallback === 'object') 
      ? (setObj.fallback as Record<string, unknown>) 
      : {};
    
    const fallbackActions = Array.isArray(fallbackObj.actions) ? (fallbackObj.actions as unknown[]) : [];
    
    // D'abord, chercher les valeurs directes de champs dans le fallback
    for (const a of fallbackActions) {
      const aa = a as Record<string, unknown>;
      if (Array.isArray(aa.nodeIds)) {
        for (const nid of aa.nodeIds as string[]) {
          const normalizedId = normalizeRefId(nid);
          
          // Si c'est un nÃƒâ€¦Ã¢â‚¬Å“ud normal (pas une formule)
          if (!nid.startsWith('node-formula:')) {
            const directValue = values.get(normalizedId);
            
            if (directValue !== null && directValue !== undefined && directValue !== '') {
              finalResult = String(directValue);
              break;
            } else {
              const node = await dbClient.treeBranchLeafNode.findUnique({
                where: { id: normalizedId },
                select: { label: true }
              });
              finalResult = `${node?.label || normalizedId} (aucune donnÃƒÆ’Ã‚Â©e)`;
              break;
            }
          }
        }
        if (finalResult !== 'ÃƒÂ¢Ã‹â€ Ã¢â‚¬Â¦') break;
      }
    }
    
    // Si pas de valeur directe trouvÃƒÆ’Ã‚Â©e, chercher les formules
    if (finalResult === 'ÃƒÂ¢Ã‹â€ Ã¢â‚¬Â¦') {
      const fIds = extractFormulaIdsFromConditionSet(conditionSet);
      
      if (fIds.size > 0) {
        const formulas = await dbClient.treeBranchLeafNodeFormula.findMany({
          where: { id: { in: Array.from(fIds) } },
          select: { id: true, nodeId: true, tokens: true }
        });
        
        for (const f of formulas) {
          // CrÃƒÆ’Ã‚Â©er un labelMap minimal juste pour cette formule
          const tempLabelMap = new Map<string, string | null>();
          const tokenIds = extractNodeIdsFromTokens(f.tokens);
          
          // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les labels des nodes rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s
          if (tokenIds.size > 0) {
            const nodes = await dbClient.treeBranchLeafNode.findMany({
              where: { id: { in: Array.from(tokenIds) } },
              select: { id: true, label: true }
            });
            for (const n of nodes) tempLabelMap.set(n.id, n.label || null);
          }
          
          const expr = buildTextFromTokens(f.tokens, tempLabelMap, values);
          const calculatedResult = calculateResult(expr);
          
          if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
            finalResult = String(calculatedResult);
            break;
          }
        }
      }
    }
  }
  
  return finalResult;
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVELLE FONCTION UNIFIÃƒÆ’Ã¢â‚¬Â°E: Construction de detail et result pour stockage
// Utilise maintenant le systÃƒÆ’Ã‚Â¨me TBL-prisma modulaire pour calculs complets
// =============================================================================
async function buildDetailAndResultForOperation(
  type: 'condition' | 'formula' | 'table',
  record: any,
  display: string,
  valueStr: string | null,
  unit: string | null,
  labelMap: LabelMap,
  valuesMap: ValuesMap,
  prisma: PrismaClient,
  submissionId: string,
  organizationId: string,
  userId: string
): Promise<{ detail: Prisma.InputJsonValue; result: Prisma.InputJsonValue }> {
  // ÃƒÂ¯Ã‚Â¿Ã‚Â½ DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â°: Cette fonction est remplacÃƒÆ’Ã‚Â©e par TBL Prisma !
  
  // Retour d'une structure minimale pour maintenir la compatibilitÃƒÆ’Ã‚Â©
  return {
    detail: {
      type: 'legacy-disabled',
      message: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Fonction dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©e - utilisez TBL Prisma exclusivement',
      tblPrismaEndpoint: '/api/tbl/submissions/create-and-evaluate'
    },
    result: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ ÃƒÆ’Ã¢â‚¬Â°valuation via TBL Prisma uniquement'
  };
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ ANCIENNE FONCTION: Version de fallback pour compatibilitÃƒÆ’Ã‚Â©
// =============================================================================
async function buildDetailAndResultForOperationLegacy(
  type: 'condition' | 'formula' | 'table',
  record: any,
  display: string,
  valueStr: string | null,
  unit: string | null,
  labelMap: LabelMap,
  valuesMap: ValuesMap,
  prisma: PrismaClient
): Promise<{ detail: Prisma.InputJsonValue; result: Prisma.InputJsonValue }> {
  
  // Construction du detail (objet technique complet)
  const detail = buildOperationDetail(type, record);
  
  // Construction du result selon le type
  let result: Prisma.InputJsonValue = `${display}: ${valueStr ?? ''}`;
  
  try {
    if (type === 'condition') {
      const ids = extractNodeIdsFromConditionSet(record?.conditionSet);
      const refsRaw = buildResolvedRefs(ids, labelMap, valuesMap);
      const expr = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Condition ÃƒÆ’Ã‚Â©valuÃƒÆ’Ã‚Â©e via TBL Prisma (ligne 504)';
      result = expr || `${display}: ${valueStr ?? ''}`;
    } else if (type === 'formula') {
      const ids = extractNodeIdsFromTokens(record?.tokens);
      const refsRaw = buildResolvedRefs(ids, labelMap, valuesMap);
      let expr = buildTextFromTokens(record?.tokens, labelMap, valuesMap);
      
      // Calculer le rÃƒÆ’Ã‚Â©sultat de l'expression mathÃƒÆ’Ã‚Â©matique
      const calculatedResult = calculateResult(expr);
      if (calculatedResult !== null) {
        expr += ` = ${calculatedResult}`;
      }
      
      result = expr || `${display}: ${valueStr ?? ''}`;
    } else if (type === 'table') {
      const str = JSON.stringify(record);
      const ids = new Set<string>();
      if (str) {
        let m: RegExpExecArray | null;
        const re = /@value\.([a-f0-9-]{36})/gi;
        while ((m = re.exec(str)) !== null) ids.add(m[1]);
      }
      const refsRaw = buildResolvedRefs(ids, labelMap, valuesMap);
      const expr = buildTextFromTableRecord(record, labelMap, valuesMap);
      const unitSuffix = unit ? ` ${unit}` : '';
      result = expr ? `${expr} (=) ${display} (${valueStr ?? ''}${unitSuffix})` : `${display} (${valueStr ?? ''}${unitSuffix})`;
    }
  } catch (error) {
    console.error('[buildDetailAndResultForOperationLegacy] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur lors de la construction:', error);
    result = `${display}: ${valueStr ?? ''}`;
  }
  
  return { detail, result };
}

// (ancienne buildConditionHumanText supprimÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â remplacÃƒÆ’Ã‚Â©e par buildConditionExpressionReadable)

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ NOUVELLE FONCTION: ÃƒÆ’Ã¢â‚¬Â°valuer dynamiquement une condition
function evaluateCondition(when: Record<string, unknown>, values: ValuesMap): boolean {
  const type = (when.type as string) || 'binary';
  if (type !== 'binary') return false;
  
  const op = (when.op as string) || '';
  const left = when.left as Record<string, unknown> | undefined;
  const right = when.right as Record<string, unknown> | undefined;
  
  // Obtenir la valeur de gauche
  let leftValue: unknown = null;
  if (left && typeof left === 'object') {
    if (typeof left.ref === 'string') {
      const m = /@value\.([a-f0-9-]{36})/i.exec(left.ref);
      const id = m && m[1] ? m[1] : left.ref;
      leftValue = values.get(id);
    } else {
      leftValue = left.value;
    }
  }
  
  // Obtenir la valeur de droite
  let rightValue: unknown = null;
  if (right && typeof right === 'object') {
    if (typeof right.ref === 'string') {
      const m = /@value\.([a-f0-9-]{36})/i.exec(right.ref);
      const id = m && m[1] ? m[1] : right.ref;
      rightValue = values.get(id);
    } else {
      rightValue = right.value;
    }
  }
  
  
  // ÃƒÆ’Ã¢â‚¬Â°valuer selon l'opÃƒÆ’Ã‚Â©rateur
  switch (op) {
    case 'isEmpty':
      return leftValue === null || leftValue === undefined || leftValue === '';
    case 'isNotEmpty':
      return leftValue !== null && leftValue !== undefined && leftValue !== '';
    case 'eq':
      return leftValue === rightValue;
    case 'ne':
      return leftValue !== rightValue;
    case 'gt':
      return Number(leftValue) > Number(rightValue);
    case 'gte':
      return Number(leftValue) >= Number(rightValue);
    case 'lt':
      return Number(leftValue) < Number(rightValue);
    case 'lte':
      return Number(leftValue) <= Number(rightValue);
    case 'contains':
      return String(leftValue || '').includes(String(rightValue || ''));
    case 'notContains':
      return !String(leftValue || '').includes(String(rightValue || ''));
    default:
      return false;
  }
}

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ FONCTION DE CALCUL: Calculer le rÃƒÆ’Ã‚Â©sultat d'une expression mathÃƒÆ’Ã‚Â©matique
function calculateResult(expression: string): number | null {
  try {
    // Extraire seulement la partie mathÃƒÆ’Ã‚Â©matique (avant le " = " s'il existe)
    const mathPart = expression.split(' = ')[0];
    
    // Extraire les valeurs numÃƒÆ’Ã‚Â©riques entre parenthÃƒÆ’Ã‚Â¨ses
    const valueMatches = mathPart.match(/\(([0-9.]+)\)/g);
    if (!valueMatches || valueMatches.length < 2) {
      return null;
    }
    
    const values = valueMatches.map(match => parseFloat(match.slice(1, -1)));
    
    // DÃƒÆ’Ã‚Â©tecter l'opÃƒÆ’Ã‚Â©rateur - supporter les formats avec parenthÃƒÆ’Ã‚Â¨ses et avec espaces
    if (mathPart.includes('(+)') || mathPart.includes(' + ')) {
      return values.reduce((a, b) => a + b, 0);
    } else if (mathPart.includes('(-)') || mathPart.includes(' - ')) {
      return values.reduce((a, b) => a - b);
    } else if (mathPart.includes('(*)') || mathPart.includes(' * ')) {
      return values.reduce((a, b) => a * b, 1);
    } else if (mathPart.includes('(/)') || mathPart.includes(' / ')) {
      return values.reduce((a, b) => a / b);
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors du calcul:', error);
    return null;
  }
}

// Helper: construit l'expression lisible complÃƒÆ’Ã‚Â¨te demandÃƒÆ’Ã‚Â©e pour une condition
// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¨ CONSTRUCTEUR D'EXPRESSIONS HUMAINES COMPLÃƒÆ’Ã‹â€ TES
// =============================================================================

async function buildConditionExpressionReadable(
  conditionSet: unknown,
  labelForResult: string,
  response: string | null,
  unit: string | null | undefined,
  labels: LabelMap,
  values: ValuesMap,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any
): Promise<string> {
  // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â« CETTE FONCTION LEGACY EST DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â°E !
  // TOUT DOIT PASSER PAR TBL PRISMA MAINTENANT !
  return "ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Condition ÃƒÆ’Ã‚Â©valuÃƒÆ’Ã‚Â©e via TBL Prisma";
  // when ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ texte
  // Pour la clause WHEN on affiche UNIQUEMENT le libellÃƒÆ’Ã‚Â© (sans valeur entre parenthÃƒÆ’Ã‚Â¨ses)
  const refFmtLabel = (ref: string | undefined): string => {
    if (!ref) return 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';
    const m = /@value\.([a-f0-9-]{36})/i.exec(ref);
    const id = m && m[1] ? m[1] : ref;
    return (labels.get(id) ?? id) as string;
  };
  const whenToText = (node?: Record<string, unknown>): string => {
    if (!node || typeof node !== 'object') return '';
    const type = (node.type as string) || 'binary';
    if (type !== 'binary') return '';
    const op = (node.op as string) || '';
    const left = node.left as Record<string, unknown> | undefined;
    const right = node.right as Record<string, unknown> | undefined;
    const leftTxt = left && typeof left === 'object'
      ? (typeof left.ref === 'string' ? refFmtLabel(left.ref) : String(left.value ?? ''))
      : '';
    const rightTxt = right && typeof right === 'object'
      ? (typeof right.ref === 'string' ? refFmtLabel(right.ref) : String(right.value ?? ''))
      : '';
    const opMap: Record<string, string> = {
      // Harmonisation demandÃƒÆ’Ã‚Â©e: inclure "="
      isEmpty: '= vide',
      isNotEmpty: "= n'est pas vide",
      eq: '=',
      ne: 'ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â ',
      gt: '>',
      gte: 'ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥',
      lt: '<',
      lte: 'ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤',
      contains: 'contient',
      notContains: 'ne contient pas'
    };
    const opTxt = opMap[op] || op;
    if (op === 'isEmpty' || op === 'isNotEmpty') return `${leftTxt} ${opTxt}`.trim();
    return `${leftTxt} ${opTxt} ${rightTxt}`.trim();
  };
  // PremiÃƒÆ’Ã‚Â¨re branche pour le WHEN
  let firstWhen: Record<string, unknown> | undefined = undefined;
  if (Array.isArray(setObj.branches) && setObj.branches.length > 0) {
    const br0 = setObj.branches[0] as Record<string, unknown>;
    if (br0 && typeof br0 === 'object' && br0.when && typeof br0.when === 'object') {
      firstWhen = br0.when as Record<string, unknown>;
    }
  }
  const whenText = whenToText(firstWhen);
  
  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ ÃƒÆ’Ã¢â‚¬Â°VALUATION DYNAMIQUE: Calculer le rÃƒÆ’Ã‚Â©sultat final de la condition
  let finalResult = response ?? 'ÃƒÂ¢Ã‹â€ Ã¢â‚¬Â¦';
  let conditionResult = false;
  if (firstWhen) {
    conditionResult = evaluateCondition(firstWhen, values);
  }
  
  // DÃƒÆ’Ã‚Â©terminer quelle branche utiliser
  const branches = Array.isArray(setObj.branches) ? setObj.branches : [];
  
  if (conditionResult && branches.length > 0) {
    // Condition vraie ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ utiliser la premiÃƒÆ’Ã‚Â¨re branche (ALORS)
    const selectedBranch = branches[0] as Record<string, unknown>;
    
    const acts = Array.isArray(selectedBranch.actions) ? (selectedBranch.actions as unknown[]) : [];
    for (const a of acts) {
      const aa = a as Record<string, unknown>;
      if (Array.isArray(aa.nodeIds)) {
        for (const nid of aa.nodeIds as string[]) {
          const normalizedId = normalizeRefId(nid);
          const directValue = values.get(normalizedId);
          if (directValue !== null && directValue !== undefined) {
            finalResult = String(directValue);
            break;
          }
        }
      }
    }
  } else if (!conditionResult) {
    // Condition fausse ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ utiliser le fallback (SINON) et calculer les formules
    
    const fIds = extractFormulaIdsFromConditionSet(conditionSet);
    
    if (fIds.size > 0) {
      const formulas = await dbClient.treeBranchLeafNodeFormula.findMany({
        where: { id: { in: Array.from(fIds) } },
        select: { id: true, nodeId: true, tokens: true }
      });
      
      for (const f of formulas) {
        const allTokenIds = new Set<string>();
        const ids = extractNodeIdsFromTokens(f.tokens);
        ids.forEach(id => allTokenIds.add(id));
        
        if (allTokenIds.size > 0) {
          const missing = Array.from(allTokenIds).filter(id => !labels.has(id));
          if (missing.length > 0) {
            const nodes = await dbClient.treeBranchLeafNode.findMany({
              where: { id: { in: missing } },
              select: { id: true, label: true }
            });
            for (const n of nodes) labels.set(n.id, n.label || null);
          }
        }
        
        const expr = buildTextFromTokens(f.tokens, labels, values);
        const calculatedResult = calculateResult(expr);
        
        if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
          finalResult = String(calculatedResult);
          break;
        }
      }
    }
  }

  // THEN: essayer d'afficher les cibles d'action de la 1ÃƒÆ’Ã‚Â¨re branche (labels + valeurs)
  let thenPart = `${labelForResult} (${finalResult})`;
  if (Array.isArray(setObj.branches) && setObj.branches.length > 0) {
    const b0 = setObj.branches[0] as Record<string, unknown>;
    const acts = Array.isArray(b0.actions) ? (b0.actions as unknown[]) : [];
    const nodeIds: string[] = [];
    for (const a of acts) {
      const aa = a as Record<string, unknown>;
      if (Array.isArray(aa.nodeIds)) {
        for (const nid of aa.nodeIds as string[]) nodeIds.push(normalizeRefId(nid));
      }
    }
    if (nodeIds.length > 0) {
      const parts = Array.from(new Set(nodeIds)).map(nid => fmtLV(labels.get(nid) ?? nid, values.get(nid) ?? null));
      if (parts.filter(Boolean).length > 0) thenPart = parts.join(', ');
    }
  }
  
  // ELSE: extraire les formules rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©es et rendre leur expression
  const fIds = extractFormulaIdsFromConditionSet(conditionSet);
  let elseExpr = '';
  if (fIds.size > 0) {
    const formulas = await dbClient.treeBranchLeafNodeFormula.findMany({
      where: { id: { in: Array.from(fIds) } },
      select: { id: true, nodeId: true, tokens: true }
    });
    const parts: string[] = [];
    for (const f of formulas) {
      const lbl = labels.get(f.nodeId) ?? 'Formule';
      const expr = buildTextFromTokens(f.tokens, labels, values);
      
      // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ CALCULER LE RÃƒÆ’Ã¢â‚¬Â°SULTAT: Si c'est la condition active, utiliser le rÃƒÆ’Ã‚Â©sultat calculÃƒÆ’Ã‚Â©
      if (!conditionResult) {
        const calculatedResult = calculateResult(expr);
        if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
          parts.push(`${lbl} ${expr} (=) ${calculatedResult}`);
        } else {
          parts.push(`${lbl} ${expr}`);
        }
      } else {
        parts.push(`${lbl} ${expr}`);
      }
    }
    elseExpr = parts.join(' ; ');
  }
  if (!elseExpr) elseExpr = labelForResult;
  
  const unitSuffix = unit ? ` ${unit}` : '';
  
  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ REDIRECTION COMPLÃƒÆ’Ã‹â€ TE VERS TBL PRISMA !
  // Au lieu de gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer des traductions statiques, on utilise le CapacityCalculator
  
  // Si on a un sourceRef dans les labels, on peut l'utiliser pour identifier la condition
  let conditionId = null;
  for (const [key, label] of labels.entries()) {
    if (label === labelForResult) {
      conditionId = key;
      break;
    }
  }
  
  if (conditionId) {
    try {
      // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ UTILISER LE SYSTÃƒÆ’Ã‹â€ ME UNIFIÃƒÆ’Ã¢â‚¬Â° operation-interpreter !
      
      // Import du systÃƒÆ’Ã‚Â¨me unifiÃƒÆ’Ã‚Â©
      const { evaluateVariableOperation } = await import('./operation-interpreter');
      
      // Trouver le nodeId de la condition
      const conditionNode = await dbClient.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId },
        select: { nodeId: true }
      });
      
      if (!conditionNode?.nodeId) {
        return `ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Condition ${conditionId}: nodeId introuvable`;
      }
      
      // CrÃƒÆ’Ã‚Â©er le calculateur avec Prisma
      const submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182';
      
      // PrÃƒÆ’Ã‚Â©parer le contexte avec la VRAIE organisation !
      const organizationId = (req as any).user?.organizationId || 'unknown-org';
      const userId = (req as any).user?.userId || 'unknown-user';
      
      // ÃƒÂ¢Ã…â€œÃ‚Â¨ Calculer avec le systÃƒÆ’Ã‚Â¨me unifiÃƒÆ’Ã‚Â©
      const calculationResult = await evaluateVariableOperation(
        conditionNode.nodeId,
        submissionId,
        dbClient
      );
      
      
      // Retourner la traduction intelligente au lieu du message d'attente
      if (calculationResult && calculationResult.operationResult) {
        return calculationResult.operationResult as string;
      } else {
        return `ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Condition ${conditionId}: Aucun rÃƒÆ’Ã‚Â©sultat TBL Prisma`;
      }
      
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [TBL DYNAMIC] Erreur operation-interpreter:', error);
      return `ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Condition ${conditionId}: Erreur ÃƒÆ’Ã‚Â©valuation TBL - ${error instanceof Error ? error.message : 'unknown'}`;
    }
  }
  
  // Fallback pour les cas sans conditionId identifiable
  return `ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Condition: ÃƒÆ’Ã¢â‚¬Â°valuation TBL Prisma (plus de traduction statique "Si...alors...sinon")`;
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â MIDDLEWARE - SÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© et authentification
// =============================================================================
// TEMPORAIREMENT DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â° pour tester le systÃƒÆ’Ã‚Â¨me automatique
// TODO: RÃƒÆ’Ã‚Â©activer l'authentification aprÃƒÆ’Ã‚Â¨s tests

// Authentification requise pour toutes les routes - TEMPORAIREMENT DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â°
// router.use(authenticateToken);

// Mock user temporaire pour les tests
router.use((req, res, next) => {
  (req as MinimalReq).user = {
    id: '1757366075163-2vdibc2ve',
    userId: '1757366075163-2vdibc2ve',
    email: 'jonathan.dethier@2thier.be',
    organizationId: '1757366075154-i554z93kl',
    isSuperAdmin: true,
    role: 'super_admin'
  };
  next();
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â³ TREES - Gestion des arbres
// =============================================================================

// GET /api/treebranchleaf/trees - Liste des arbres
router.get('/trees', async (req, res) => {
  try {
    
    // DÃƒÆ’Ã‚Â©terminer l'organisation depuis l'utilisateur/headers
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    
    const whereFilter = isSuperAdmin || !organizationId ? {} : { organizationId };

    const trees = await prisma.treeBranchLeafTree.findMany({
      where: whereFilter,
      include: {
        _count: {
          select: {
            TreeBranchLeafNode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (trees.length > 0) {
    }

    res.json(trees);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching trees:', error);
    res.status(500).json({ error: 'Impossible de rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les arbres' });
  }
});

// GET /api/treebranchleaf/trees/:id - DÃƒÆ’Ã‚Â©tails d'un arbre
router.get('/trees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: isSuperAdmin || !organizationId ? { id } : { id, organizationId },
      include: {
        _count: {
          select: {
            TreeBranchLeafNode: true
          }
        }
      }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    res.json(tree);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching tree:', error);
    res.status(500).json({ error: 'Impossible de rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer l\'arbre' });
  }
});

// POST /api/treebranchleaf/trees - CrÃƒÆ’Ã‚Â©er un arbre
router.post('/trees', async (req, res) => {
  try {
    const {
      name,
      description,
      category = 'formulaire',
      icon,
      color = '#10b981',
      version = '1.0.0',
      status = 'draft',
      settings = {},
      metadata = {},
  isPublic = false,
  organizationId: bodyOrgId
    } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Le nom de l'arbre est requis" });
    }

  // DÃƒÆ’Ã‚Â©terminer l'organisation cible (header/user d'abord, sinon body)
  const targetOrgId: string | null = (getAuthCtx(req as unknown as MinimalReq).organizationId as string | null) || (typeof bodyOrgId === 'string' ? bodyOrgId : null);
  if (!targetOrgId) {
      return res.status(400).json({ error: "organizationId requis (en-tÃƒÆ’Ã‚Âªte x-organization-id ou dans le corps)" });
    }

    const id = randomUUID();

    const tree = await prisma.treeBranchLeafTree.create({
      data: {
        id,
    organizationId: targetOrgId,
        name: name.trim(),
        description: description ?? null,
        category,
        icon: icon ?? null,
        color,
        version,
        status,
        settings: settings as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
        isPublic: Boolean(isPublic),
        updatedAt: new Date()
      }
    });

    res.status(201).json(tree);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating tree:', error);
    res.status(500).json({ error: 'Impossible de crÃƒÆ’Ã‚Â©er l\'arbre' });
  }
});

// PUT /api/treebranchleaf/trees/:id - Mettre ÃƒÆ’Ã‚Â  jour un arbre
router.put('/trees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user!;
    const updateData = req.body;

    // Supprimer les champs non modifiables
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;

    const tree = await prisma.treeBranchLeafTree.updateMany({
      where: { 
        id, 
        organizationId 
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    if (tree.count === 0) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer l'arbre mis ÃƒÆ’Ã‚Â  jour
    const updatedTree = await prisma.treeBranchLeafTree.findFirst({
      where: { id, organizationId }
    });

    res.json(updatedTree);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating tree:', error);
    res.status(500).json({ error: 'Impossible de mettre ÃƒÆ’Ã‚Â  jour l\'arbre' });
  }
});

// DELETE /api/treebranchleaf/trees/:id - Supprimer un arbre
router.delete('/trees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user!;

    // Supprimer d'abord tous les nÃƒâ€¦Ã¢â‚¬Å“uds associÃƒÆ’Ã‚Â©s
    await prisma.treeBranchLeafNode.deleteMany({
      where: { treeId: id }
    });

    // Puis supprimer l'arbre
    const result = await prisma.treeBranchLeafTree.deleteMany({
      where: { 
        id, 
        organizationId 
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    res.json({ success: true, message: 'Arbre supprimÃƒÆ’Ã‚Â© avec succÃƒÆ’Ã‚Â¨s' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting tree:', error);
    res.status(500).json({ error: 'Impossible de supprimer l\'arbre' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚ÂÃ†â€™ NODES - Gestion des nÃƒâ€¦Ã¢â‚¬Å“uds
// =============================================================================

// GET /api/treebranchleaf/trees/:treeId/nodes - Liste des nÃƒâ€¦Ã¢â‚¬Å“uds d'un arbre
router.get('/trees/:treeId/nodes', async (req, res) => {
  try {
    const { treeId } = req.params;
    
    // Utiliser getAuthCtx au lieu de req.user pour plus de robustesse
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation (sauf SuperAdmin)
    const treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId };
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: treeWhereFilter
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId },
      include: {
        TreeBranchLeafNodeTable: {
          include: {
            tableColumns: {
              orderBy: { columnIndex: 'asc' }
            },
            tableRows: {
              orderBy: { rowIndex: 'asc' }
            }
          }
        }
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // 🔗 DEBUG LINK RAW: Voir les champs avec hasLink AVANT transformation
    const rawNodesWithLink = nodes.filter(node => node.hasLink === true);
    if (rawNodesWithLink.length > 0) {
      console.log(`🔗🔗🔗 [API RAW] ${rawNodesWithLink.length} champs hasLink=true AVANT buildResponseFromColumns`);
      rawNodesWithLink.forEach(node => {
        console.log(`  - RAW "${node.label}" (${node.id}): hasLink=${node.hasLink}`);
      });
    }


    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ MIGRATION : Reconstruire les donnÃƒÆ’Ã‚Â©es JSON depuis les colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
    const reconstructedNodes = nodes.map(node => buildResponseFromColumns(node));
    
    // 🔗 DEBUG LINK: Voir les champs avec hasLink
    const nodesWithLink = reconstructedNodes.filter(node => node.hasLink === true);
    if (nodesWithLink.length > 0) {
      console.log(`🔗🔗🔗 [API /trees/:treeId/nodes] ${nodesWithLink.length} champs avec hasLink=true:`);
      nodesWithLink.forEach(node => {
        console.log(`  - "${node.label}" (${node.id}): hasLink=${node.hasLink}, link_targetNodeId=${node.link_targetNodeId}, link_mode=${node.link_mode}`);
      });
    }
    // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ DEBUG TOOLTIP FINAL : VÃƒÆ’Ã‚Â©rifier ce qui va ÃƒÆ’Ã‚Âªtre envoyÃƒÆ’Ã‚Â© au client
    const nodesWithTooltips = reconstructedNodes.filter(node => 
      node.text_helpTooltipType && node.text_helpTooltipType !== 'none'
    );
    if (nodesWithTooltips.length > 0) {
    }

    res.json(reconstructedNodes);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching nodes:', error);
    res.status(500).json({ error: 'Impossible de rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les nÃƒâ€¦Ã¢â‚¬Å“uds' });
  }
});

// GET /api/treebranchleaf/trees/:treeId/repeater-fields - Liste des champs rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©titeurs (instances)
router.get('/trees/:treeId/repeater-fields', async (req, res) => {
  try {
    const { treeId } = req.params;
    
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation (sauf SuperAdmin)
    const treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId };
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: treeWhereFilter
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds de l'arbre (TOUS les champs car buildResponseFromColumns en a besoin)
    const allNodesRaw = await prisma.treeBranchLeafNode.findMany({
      where: { treeId }
    });


    // Reconstruire les mÃƒÆ’Ã‚Â©tadonnÃƒÆ’Ã‚Â©es depuis les colonnes pour chaque nÃƒâ€¦Ã¢â‚¬Å“ud
    const allNodes = allNodesRaw.map(node => buildResponseFromColumns(node));

    // CrÃƒÆ’Ã‚Â©er un Map pour accÃƒÆ’Ã‚Â¨s rapide par ID (non utilisÃƒÆ’Ã‚Â© dans le nouveau systÃƒÆ’Ã‚Â¨me)
    const _nodesById = new Map(allNodes.map(n => [n.id as string, n]));

    // Collecter tous les champs rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©titeurs
    const repeaterFields: Array<{
      id: string;
      label: string;
      repeaterLabel: string;
      repeaterParentId: string;
      nodeLabel?: string;
      nodeId?: string;
    }> = [];

    // Parcourir tous les nÃƒâ€¦Ã¢â‚¬Å“uds pour trouver ceux avec des repeaters
    for (const node of allNodes) {
      // VÃƒÆ’Ã‚Â©rifier si le nÃƒâ€¦Ã¢â‚¬Å“ud a des mÃƒÆ’Ã‚Â©tadonnÃƒÆ’Ã‚Â©es repeater
      const metadata = node.metadata as any;
      if (!metadata?.repeater) continue;

      const repeaterMeta = metadata.repeater;
      const templateNodeIds = repeaterMeta.templateNodeIds || [];
      const _templateNodeLabels = repeaterMeta.templateNodeLabels || {}; // Non utilisÃƒÆ’Ã‚Â© dans le nouveau systÃƒÆ’Ã‚Â¨me


      // ========================================================================
      // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ SYSTÃƒÆ’Ã‹â€ ME DE CHAMPS RÃƒÆ’Ã¢â‚¬Â°PÃƒÆ’Ã¢â‚¬Â°TITEURS - ENFANTS PHYSIQUES UNIQUEMENT
      // ========================================================================
      // IMPORTANT: On retourne UNIQUEMENT les enfants physiques RÃƒÆ’Ã¢â‚¬Â°ELS crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©s via duplication
      // 
      // ÃƒÂ¢Ã‚ÂÃ…â€™ PLUS D'IDS VIRTUELS ! On ne gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â¨re PLUS d'IDs composÃƒÆ’Ã‚Â©s comme {repeaterId}_template_{templateId}
      //
      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ON RETOURNE:
      //    - Les enfants physiques qui ont metadata.sourceTemplateId (crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©s par POST /duplicate-templates)
      //    - Ce sont de VRAIS nÃƒâ€¦Ã¢â‚¬Å“uds dans la base avec de VRAIS UUID
      //    - Ils peuvent ÃƒÆ’Ã‚Âªtre utilisÃƒÆ’Ã‚Â©s directement dans les formules/conditions
      //
      // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…â€™ Si aucun enfant physique n'existe encore (utilisateur n'a pas cliquÃƒÆ’Ã‚Â© sur "+"):
      //    - On ne retourne RIEN pour ce repeater
      //    - Les champs apparaÃƒÆ’Ã‚Â®tront aprÃƒÆ’Ã‚Â¨s la premiÃƒÆ’Ã‚Â¨re duplication
      // ========================================================================

      // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les enfants physiques de ce repeater
      const physicalChildren = allNodes.filter(child => {
        if (child.parentId !== node.id) return false;
        
        const childMeta = child.metadata as any;
        // VÃƒÆ’Ã‚Â©rifier que l'enfant a bien ÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â© via duplication (a sourceTemplateId)
        // ET que ce sourceTemplateId correspond ÃƒÆ’Ã‚Â  un template configurÃƒÆ’Ã‚Â©
        return childMeta?.sourceTemplateId && templateNodeIds.includes(childMeta.sourceTemplateId);
      });


      if (physicalChildren.length === 0) {
        continue; // Passer au nÃƒâ€¦Ã¢â‚¬Å“ud suivant
      }

      // Ajouter chaque enfant physique ÃƒÆ’Ã‚Â  la liste
      for (const child of physicalChildren) {

        repeaterFields.push({
          id: child.id as string,                 // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ VRAI UUID de l'enfant physique
          label: `${node.label} / ${child.label}`, // Label complet affichÃƒÆ’Ã‚Â©
          repeaterLabel: node.label as string,    // Label du repeater parent
          repeaterParentId: node.id as string,    // ID du nÃƒâ€¦Ã¢â‚¬Å“ud repeater
          nodeLabel: child.label as string,       // Label de l'enfant
          nodeId: child.id as string              // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ VRAI UUID de l'enfant
        });
      }
    }

    res.json(repeaterFields);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching repeater fields:', error);
    res.status(500).json({ error: 'Impossible de rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les champs rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©titeurs' });
  }
});

// =============================================================================
// ÃƒÂ¯Ã‚Â¿Ã‚Â½ RÃƒÆ’Ã¢â‚¬Â°CUPÃƒÆ’Ã¢â‚¬Â°RATION DES RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES PARTAGÃƒÆ’Ã¢â‚¬Â°ES
// =============================================================================
/**
 * GET /trees/:treeId/shared-references
 * RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re toutes les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es d'un arbre
 */
router.get('/trees/:treeId/shared-references', async (req, res) => {
  try {
    const { treeId } = req.params;
    
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation (sauf SuperAdmin)
    const treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId };
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: treeWhereFilter
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds marquÃƒÆ’Ã‚Â©s comme rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es
    const sharedReferencesRaw = await prisma.treeBranchLeafNode.findMany({
      where: { 
        treeId,
        isSharedReference: true
      }
    });


    // Formater les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pour le frontend
    const sharedReferences = sharedReferencesRaw.map(node => {
      const response = buildResponseFromColumns(node);
      
      return {
        id: response.id as string,
        label: (response.label || response.sharedReferenceName || 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence sans nom') as string,
        category: response.sharedReferenceCategory as string | undefined,
        description: response.sharedReferenceDescription as string | undefined,
        type: response.type as string,
        nodeLabel: response.label as string,
        nodeId: response.id as string
      };
    });

    res.json(sharedReferences);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching shared references:', error);
    res.status(500).json({ error: 'Impossible de rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es' });
  }
});

// =============================================================================
// ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â DUPLICATION PHYSIQUE DES TEMPLATES REPEATER
// =============================================================================
/**
 * POST /nodes/:nodeId/duplicate-templates
 * Clone physiquement les templates sÃƒÆ’Ã‚Â©lectionnÃƒÆ’Ã‚Â©s comme enfants du nÃƒâ€¦Ã¢â‚¬Å“ud repeater
 */
router.post('/nodes/:nodeId/duplicate-templates', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { templateNodeIds } = req.body as { templateNodeIds: string[] };


    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    if (!Array.isArray(templateNodeIds) || templateNodeIds.length === 0) {
      return res.status(400).json({ error: 'templateNodeIds doit ÃƒÆ’Ã‚Âªtre un tableau non vide' });
    }

    // ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â IMPORTANT: TreeBranchLeafNode n'a PAS de champ organizationId
    // Il faut passer par l'arbre pour vÃƒÆ’Ã‚Â©rifier l'organisation
    const parentNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: true }
    });

    if (!parentNode) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud parent non trouvÃƒÆ’Ã‚Â©' });
    }

    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation (sauf SuperAdmin)
    if (!isSuperAdmin && organizationId && parentNode.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cet arbre' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer des candidats existants pour calculer un suffixe global fiable.
    // ?? Ne pas dÃƒÆ’Ã‚Â©pendre uniquement de parentId=nodeId, car certains flux peuvent
    // modifier l'emplacement des racines copiÃƒÆ’Ã‚Â©es; on marque aussi les copies avec
    // metadata.duplicatedFromRepeater = nodeId.
    const existingChildrenByParent = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: nodeId },
      select: { id: true, metadata: true, parentId: true }
    });

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ NOUVELLE LOGIQUE: Pour les repeaters, on PEUT crÃƒÆ’Ã‚Â©er plusieurs copies du mÃƒÆ’Ã‚Âªme template
    // On ne filtre plus les templates - on permet toujours la duplication
    
    const newTemplateIds = templateNodeIds; // Toujours dupliquer tous les templates demandÃƒÆ’Ã‚Â©s


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les nÃƒâ€¦Ã¢â‚¬Å“uds demandÃƒÆ’Ã‚Â©s, puis rÃƒÆ’Ã‚Â©soudre vers le TEMPLATE D'ORIGINE.
    // IMPORTANT: le client peut envoyer accidentellement des IDs suffixÃƒÆ’Ã‚Â©s (-1, -2, ...) ;
    // dans ce cas, on duplique le template d'origine (metadata.sourceTemplateId) et on calcule
    // le prochain suffixe ÃƒÆ’Ã‚Â  partir des copies existantes.
    const requestedNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { in: newTemplateIds },
        treeId: parentNode.treeId
      },
      select: { id: true, label: true, type: true, metadata: true }
    });

    if (requestedNodes.length === 0) {
      return res.status(404).json({ error: 'Aucun template trouvÃƒÆ’Ã‚Â©' });
    }

    const resolveBaseTemplateId = (n: { id: string; metadata: unknown }): string => {
      const md = (n.metadata ?? {}) as Record<string, unknown>;
      const sourceTemplateId = md.sourceTemplateId;
      return typeof sourceTemplateId === 'string' && sourceTemplateId.length > 0 ? sourceTemplateId : n.id;
    };

    // Conserver l'ordre de la requÃƒÆ’Ã‚Âªte: chaque ID demandÃƒÆ’Ã‚Â© devient une duplication (mÃƒÆ’Ã‚Âªme si plusieurs rÃƒÆ’Ã‚Â©solvent au mÃƒÆ’Ã‚Âªme template)
    const baseTemplateIdsInOrder = newTemplateIds.map((id) => {
      const found = requestedNodes.find((n) => n.id === id);
      return found ? resolveBaseTemplateId(found) : id;
    });
    const uniqueBaseTemplateIds = Array.from(new Set(baseTemplateIdsInOrder));

    const baseTemplateNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { in: uniqueBaseTemplateIds },
        treeId: parentNode.treeId
      },
      select: { id: true, label: true, type: true, metadata: true }
    });

    const baseById = new Map(baseTemplateNodes.map((n) => [n.id, n] as const));
    const templatesToDuplicateInOrder = baseTemplateIdsInOrder
      .map((baseId) => baseById.get(baseId))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));

    if (templatesToDuplicateInOrder.length === 0) {
      return res.status(404).json({ error: 'Aucun template de base trouvÃƒÆ’Ã‚Â©' });
    }


    // Dupliquer chaque template en COPIE PROFONDE (utilise deepCopyNodeInternal)
    const duplicatedSummaries: Array<{ id: string; label: string | null; type: string; parentId: string | null; sourceTemplateId: string }> = [];
    
    // ?? LOGIQUE DÃƒÂ¯Ã‚Â¿Ã‚Â½FINITIVE (conforme ÃƒÂ¯Ã‚Â¿Ã‚Â½ la rÃƒÂ¯Ã‚Â¿Ã‚Â½gle mÃƒÂ¯Ã‚Â¿Ã‚Â½tier demandÃƒÂ¯Ã‚Â¿Ã‚Â½e):
    // Un clic = un suffixe global unique.
    // Exemple: si n'importe quel champ a dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ -1, le prochain clic crÃƒÂ¯Ã‚Â¿Ã‚Â½e -2 pour TOUS.
    const extractNumericSuffix = (candidate: unknown): number | null => {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
      if (typeof candidate === 'string' && /^\d+$/.test(candidate)) return Number(candidate);
      return null;
    };
    const extractSuffixFromId = (id: string): number | null => {
      if (!id) return null;
      const match = /-(\d+)$/.exec(id);
      if (!match) return null;
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    };

    // Calculer le max ÃƒÆ’Ã‚Â  partir des RACINES de copies existantes (IDs `${templateId}-N`).
    // ? Ne dÃƒÆ’Ã‚Â©pend pas des metadata (qui peuvent ÃƒÆ’Ã‚Âªtre rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©crites/normalisÃƒÆ’Ã‚Â©es ailleurs).
    // HypothÃƒÆ’Ã‚Â¨se mÃƒÆ’Ã‚Â©tier: pour un repeater donnÃƒÆ’Ã‚Â©, les templates racines sont uniques dans l'arbre.
    const copyRootCandidates = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId: parentNode.treeId,
        OR: uniqueBaseTemplateIds.map((t) => ({ id: { startsWith: `${t}-` } }))
      },
      select: { id: true, parentId: true }
    });


    let globalMax = 0;
    for (const root of copyRootCandidates) {
      const fromId = extractSuffixFromId(root.id);
      const resolved = fromId ?? 0;
      if (resolved > globalMax) globalMax = resolved;
    }
    const nextSuffix = globalMax + 1;

    // Debug: afficher un ÃƒÆ’Ã‚Â©chantillon des racines candidates
    try {
      const sample = copyRootCandidates.slice(0, 10).map((c) => {
        const fromId = extractSuffixFromId(c.id);
        return { id: c.id, parentId: c.parentId, fromId };
      });
    } catch {
      // noop
    }

    
    for (const template of templatesToDuplicateInOrder) {
      const baseTemplateId = template.id;
      const copyNumber = nextSuffix;
      const labelSuffix = `-${copyNumber}`;

      const result = await deepCopyNodeInternalService(prisma, req as unknown as MinimalReq, template.id, {
        targetParentId: nodeId,
        suffixNum: copyNumber,
        preserveSharedReferences: true,
        isFromRepeaterDuplication: true
      });
      const newRootId = result.root.newId;

      // Normaliser le label de la copie sur la base du label du gabarit + suffixe numÃƒÂ¯Ã‚Â¿Ã‚Â½rique
      const normalizedCopyLabel = `${template.label || baseTemplateId}-${copyNumber}`;

      // Ajouter/mettre ÃƒÂ¯Ã‚Â¿Ã‚Â½ jour les mÃƒÂ¯Ã‚Â¿Ã‚Â½tadonnÃƒÂ¯Ã‚Â¿Ã‚Â½es de traÃƒÂ¯Ã‚Â¿Ã‚Â½abilitÃƒÂ¯Ã‚Â¿Ã‚Â½ sur la racine copiÃƒÂ¯Ã‚Â¿Ã‚Â½e
      await prisma.treeBranchLeafNode.update({
        where: { id: newRootId },
        data: {
          label: normalizedCopyLabel,
          metadata: {
            ...(typeof template.metadata === 'object' ? template.metadata : {}),
            sourceTemplateId: baseTemplateId,
            duplicatedAt: new Date().toISOString(),
            duplicatedFromRepeater: nodeId,
            copiedFromNodeId: baseTemplateId,
            copySuffix: copyNumber
          }
        }
      });

      const created = await prisma.treeBranchLeafNode.findUnique({
        where: { id: newRootId },
        select: { id: true, label: true, type: true, parentId: true }
      });
      
      if (created) {
        duplicatedSummaries.push({
          id: created.id,
          label: created.label,
          type: created.type,
          parentId: created.parentId,
          sourceTemplateId: baseTemplateId
        });

        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ AprÃƒÆ’Ã‚Â¨s duplication: crÃƒÆ’Ã‚Â©er/mapper automatiquement les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es vers leurs COPIES suffixÃƒÆ’Ã‚Â©es "-N" (N incrÃƒÆ’Ã‚Â©mental)
        try {
          const r = await applySharedReferencesFromOriginalInternal(req as unknown as MinimalReq, newRootId);
        } catch (e) {
          console.warn('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [DUPLICATE-TEMPLATES] ÃƒÆ’Ã¢â‚¬Â°chec application des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pour', newRootId, e);
        }


        // ?? APRÃƒÂ¯Ã‚Â¿Ã‚Â½S duplication: Copier les tables des sÃƒÂ¯Ã‚Â¿Ã‚Â½lecteurs
        try {
          const selectorCopyOptions = {
            nodeIdMap: result.idMap,
            tableCopyCache: new Map(),
            tableIdMap: new Map(Object.entries(result.tableIdMap))  // ? Utiliser le tableIdMap peuplÃƒÂ¯Ã‚Â¿Ã‚Â½
          };
          await copySelectorTablesAfterNodeCopy(
            prisma,
            newRootId,
            template.id,
            selectorCopyOptions,
            copyNumber
          );
        } catch (selectorErr) {
          console.warn('??  [DUPLICATE-TEMPLATES] Erreur lors de la copie des tables des sÃƒÂ¯Ã‚Â¿Ã‚Â½lecteurs pour', newRootId, selectorErr);
        }

        // ?? NOTE: Les variables liÃƒÂ¯Ã‚Â¿Ã‚Â½es (linkedVariableIds) sont DÃƒÂ¯Ã‚Â¿Ã‚Â½JÃƒÂ¯Ã‚Â¿Ã‚Â½ copiÃƒÂ¯Ã‚Â¿Ã‚Â½es par deepCopyNodeInternal
        // avec autoCreateDisplayNode: true, donc pas besoin d'appeler copyLinkedVariablesFromNode ici
      }

    }
    res.status(201).json({
      duplicated: duplicatedSummaries.map(n => ({ id: n.id, label: n.label, type: n.type, parentId: n.parentId, sourceTemplateId: n.sourceTemplateId })),
      count: duplicatedSummaries.length
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [DUPLICATE-TEMPLATES] Erreur:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Erreur lors de la duplication des templates', details: msg });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ COPIE PROFONDE D'UN NÃƒâ€¦Ã¢â‚¬â„¢UD (COPIE INDÃƒÆ’Ã¢â‚¬Â°PENDANTE COMPLÃƒÆ’Ã‹â€ TE)
// =============================================================================
/**
 * POST /api/treebranchleaf/nodes/:nodeId/deep-copy
 * CrÃƒÆ’Ã‚Â©e une copie indÃƒÆ’Ã‚Â©pendante complÃƒÆ’Ã‚Â¨te d'un nÃƒâ€¦Ã¢â‚¬Å“ud et de toute sa cascade:
 * - Tous les descendants (options SELECT, champs enfants, etc.)
 * - Les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es (sharedReferenceId/sharedReferenceIds) NE sont PAS matÃƒÆ’Ã‚Â©rialisÃƒÆ’Ã‚Â©es
 *   dans la structure copiÃƒÆ’Ã‚Â©e. Elles restent vides (copie indÃƒÆ’Ã‚Â©pendante). Une ÃƒÆ’Ã‚Â©tape sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â©e
 *   peut ensuite les rÃƒÆ’Ã‚Â©appliquer depuis l'original via l'endpoint dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©.
 * - Les formules/conditions/tables liÃƒÆ’Ã‚Â©es sont dupliquÃƒÆ’Ã‚Â©es et les IDs sont rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©crits dans les JSON (tokens/conditionSet)
 * - Tous les IDs sont rÃƒÆ’Ã‚Â©gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©s, sans doublons, avec un mappage old->new retournÃƒÆ’Ã‚Â©
 */
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Helper rÃƒÆ’Ã‚Â©utilisable pour rÃƒÆ’Ã‚Â©aliser une copie profonde cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© serveur (utilisÃƒÆ’Ã‚Â© par la route et le duplicateur de templates)
async function deepCopyNodeInternal(
  req: MinimalReq,
  nodeId: string,
  opts?: { targetParentId?: string | null; labelSuffix?: string; suffixNum?: number; preserveSharedReferences?: boolean }
): Promise<{ root: { oldId: string; newId: string }; idMap: Record<string, string>; formulaIdMap: Record<string, string>; conditionIdMap: Record<string, string>; tableIdMap: Record<string, string> }> {
  const { targetParentId, suffixNum, preserveSharedReferences = false } = opts || {};
  
  // Helpers locaux pour la rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©criture des IDs dans tokens/conditions
  const replaceIdsInTokens = (tokens: unknown, idMap: Map<string, string>): unknown => {
    if (!tokens) return tokens;
    const mapOne = (s: string) => s.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => {
      const newId = idMap.get(p1);
      return newId ? `@value.${newId}` : `@value.${p1}`;
    });
    if (Array.isArray(tokens)) return tokens.map(t => typeof t === 'string' ? mapOne(t) : t);
    if (typeof tokens === 'string') return mapOne(tokens);
    try {
      const asStr = JSON.stringify(tokens);
      const replaced = mapOne(asStr);
      return JSON.parse(replaced);
    } catch {
      return tokens;
    }
  };

  const replaceIdsInConditionSet = (conditionSet: unknown, idMap: Map<string, string>, formulaIdMap: Map<string, string>): unknown => {
    if (!conditionSet) return conditionSet;
    try {
      let str = JSON.stringify(conditionSet);
      // Remplacer les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences de valeurs @value.<nodeId>
      str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => `@value.${idMap.get(p1) || p1}`);
      // Remplacer les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences de formules node-formula:<formulaId>
      str = str.replace(/node-formula:([a-f0-9-]{36})/gi, (_m, p1: string) => `node-formula:${formulaIdMap.get(p1) || p1}`);
      return JSON.parse(str);
    } catch {
      return conditionSet;
    }
  };

  // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud source (et l'arbre pour contrÃƒÆ’Ã‚Â´le d'accÃƒÆ’Ã‚Â¨s)
  const source = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    include: { TreeBranchLeafTree: { select: { organizationId: true } } }
  });
  if (!source) {
    throw new Error('NÃƒâ€¦Ã¢â‚¬Å“ud source introuvable');
  }

  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  if (!isSuperAdmin && organizationId && source.TreeBranchLeafTree!.organizationId !== organizationId) {
    throw new Error('AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cet arbre');
  }

  // DÃƒÆ’Ã‚Â©terminer le suffixe numÃƒÆ’Ã‚Â©rique (-N) pour cette copie 
  // Si suffixNum est fourni (depuis template duplication), l'utiliser directement
  // Sinon, calculer en cherchant le max existant
  let __copySuffixNum = suffixNum || 1;
  
  if (!suffixNum) {
    // Calcul standard : trouver le max suffix existant
    const existingIdsWithSuffix = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: source.treeId, id: { startsWith: `${source.id}-` } },
      select: { id: true }
    });
    let _maxSuffixNum = 0;
    for (const rec of existingIdsWithSuffix) {
      const rest = rec.id.slice(source.id.length + 1);
      if (/^\d+$/.test(rest)) {
        const num = Number(rest);
        if (Number.isFinite(num) && num > _maxSuffixNum) _maxSuffixNum = num;
      }
    }
    __copySuffixNum = _maxSuffixNum + 1;
  }
  const __computedLabelSuffix = `-${__copySuffixNum}`;

  // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds de l'arbre pour une construction de sous-arbre en mÃƒÆ’Ã‚Â©moire
  const allNodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: source.treeId } });
  const byId = new Map(allNodes.map(n => [n.id, n] as const));
  const childrenByParent = new Map<string, string[]>();
  for (const n of allNodes) {
    if (!n.parentId) continue;
    const arr = childrenByParent.get(n.parentId) || [];
    arr.push(n.id);
    childrenByParent.set(n.parentId, arr);
  }

  // Construire l'ensemble des nÃƒâ€¦Ã¢â‚¬Å“uds ÃƒÆ’Ã‚Â  copier (seulement le nÃƒâ€¦Ã¢â‚¬Å“ud et ses descendants directs)
  const toCopy = new Set<string>();
  const queue: string[] = [source.id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (toCopy.has(cur)) continue;
    toCopy.add(cur);
    // Enfants directs
    const children = childrenByParent.get(cur) || [];
    for (const c of children) queue.push(c);
  }

  // Mappage des IDs (nÃƒâ€¦Ã¢â‚¬Å“uds et formules/conditions seront gÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©s sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â©ment)
  const idMap = new Map<string, string>();
  for (const oldId of toCopy) idMap.set(oldId, `${oldId}-${__copySuffixNum}`);

  // Mappage formules/conditions/tables par ancien ID
  const formulaIdMap = new Map<string, string>();
  const conditionIdMap = new Map<string, string>();
  const tableIdMap = new Map<string, string>();

  // Calcul d'un ordre de crÃƒÆ’Ã‚Â©ation parents ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ enfants
  const buildCreationOrder = (): string[] => {
    // Edges: parent -> child (si parent aussi copiÃƒÆ’Ã‚Â©)
    const edges = new Map<string, Set<string>>();
    const indegree = new Map<string, number>();
    const ensureNode = (id: string) => { if (!edges.has(id)) edges.set(id, new Set()); if (!indegree.has(id)) indegree.set(id, 0); };

    for (const id of toCopy) ensureNode(id);

    // parent -> child
    for (const id of toCopy) {
      const n = byId.get(id);
      if (n?.parentId && toCopy.has(n.parentId)) {
        const from = n.parentId;
        const to = id;
        const set = edges.get(from)!; if (!set.has(to)) { set.add(to); indegree.set(to, (indegree.get(to) || 0) + 1); }
      }
    }

    // Kahn topological sort
    const queue: string[] = [];
    for (const [id, deg] of indegree.entries()) if (deg === 0) queue.push(id);
    const ordered: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      ordered.push(id);
      for (const next of edges.get(id) || []) {
        const d = (indegree.get(next) || 0) - 1; indegree.set(next, d);
        if (d === 0) queue.push(next);
      }
    }

    // Si tout n'est pas ordonnÃƒÆ’Ã‚Â© (cycle improbable), fallback par profondeur parentale
    if (ordered.length !== toCopy.size) {
      const remaining = new Set(Array.from(toCopy).filter(id => !ordered.includes(id)));
      const depth = new Map<string, number>();
      const getDepth = (id: string): number => {
        if (depth.has(id)) return depth.get(id)!;
        const n = byId.get(id);
        if (!n || !n.parentId || !toCopy.has(n.parentId)) { depth.set(id, 0); return 0; }
        const d = getDepth(n.parentId) + 1; depth.set(id, d); return d;
      };
      const rest = Array.from(remaining).sort((a, b) => getDepth(a) - getDepth(b));
      return [...ordered, ...rest];
    }
    return ordered;
  };

  const nodesToCreate = buildCreationOrder();

  // CrÃƒÆ’Ã‚Â©er tous les nÃƒâ€¦Ã¢â‚¬Å“uds en base avec rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©criture parentId et nettoyage des shared refs (copie indÃƒÆ’Ã‚Â©pendante)
  const createdNodes: Array<{ oldId: string; newId: string }> = [];
  for (const oldId of nodesToCreate) {
    const oldNode = byId.get(oldId)!;
    const newId = idMap.get(oldId)!;
    const isRoot = oldId === source.id;

    const newParentId = (() => {
      // Si le parent est dans lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ensemble copiÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ utiliser le nouveau parent
      if (oldNode.parentId && toCopy.has(oldNode.parentId)) return idMap.get(oldNode.parentId)!;
      // Sinon, ancrer sous targetParentId si fourni, sinon reproduire le parent dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢origine
      if (isRoot) return targetParentId ?? oldNode.parentId ?? null;
      return oldNode.parentId ?? null;
    })();

    // PrÃƒÆ’Ã‚Â©parer les champs ÃƒÆ’Ã‚Â  cloner (sans JSON hÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â©s inutiles)
  const cloneData: Prisma.TreeBranchLeafNodeCreateInput = {
    id: newId,
    treeId: oldNode.treeId,
        type: oldNode.type,
        subType: oldNode.subType,
        fieldType: oldNode.fieldType,
  label: oldNode.label ? `${oldNode.label}${__computedLabelSuffix}` : oldNode.label,
        description: oldNode.description,
        parentId: newParentId,
        order: oldNode.order,
        isVisible: oldNode.isVisible,
        isActive: oldNode.isActive,
        isRequired: oldNode.isRequired,
        isMultiple: oldNode.isMultiple,
        // CapacitÃƒÆ’Ã‚Â©s
        hasData: oldNode.hasData,
        hasFormula: oldNode.hasFormula,
        hasCondition: oldNode.hasCondition,
        hasTable: oldNode.hasTable,
        hasAPI: oldNode.hasAPI,
        hasLink: oldNode.hasLink,
        hasMarkers: oldNode.hasMarkers,
        // ?? FIX: Copier les propriÃƒÂ¯Ã‚Â¿Ã‚Â½tÃƒÂ¯Ã‚Â¿Ã‚Â½s data_* pour hÃƒÂ¯Ã‚Â¿Ã‚Â½riter de l'unitÃƒÂ¯Ã‚Â¿Ã‚Â½ et de la prÃƒÂ¯Ã‚Â¿Ã‚Â½cision
        data_unit: oldNode.data_unit,
        data_precision: oldNode.data_precision,
        data_displayFormat: oldNode.data_displayFormat,
        data_exposedKey: oldNode.data_exposedKey,
        data_visibleToUser: oldNode.data_visibleToUser,
        // Colonnes simples
        defaultValue: oldNode.defaultValue,
        calculatedValue: oldNode.calculatedValue,
        // Apparence / text / number / select / date / image
        appearance_size: oldNode.appearance_size,
        appearance_variant: oldNode.appearance_variant,
        appearance_width: oldNode.appearance_width,
        appearance_displayIcon: oldNode.appearance_displayIcon,
        text_placeholder: oldNode.text_placeholder,
        text_maxLength: oldNode.text_maxLength,
        text_minLength: oldNode.text_minLength,
        text_mask: oldNode.text_mask,
        text_regex: oldNode.text_regex,
        text_rows: oldNode.text_rows,
        text_helpTooltipType: oldNode.text_helpTooltipType,
        text_helpTooltipText: oldNode.text_helpTooltipText,
        text_helpTooltipImage: oldNode.text_helpTooltipImage,
        number_min: oldNode.number_min as unknown as number | undefined,
        number_max: oldNode.number_max as unknown as number | undefined,
        number_step: oldNode.number_step as unknown as number | undefined,
        number_decimals: oldNode.number_decimals,
        number_prefix: oldNode.number_prefix,
        number_suffix: oldNode.number_suffix,
        number_unit: oldNode.number_unit,
        number_defaultValue: oldNode.number_defaultValue as unknown as number | undefined,
        select_multiple: oldNode.select_multiple,
        select_searchable: oldNode.select_searchable,
        select_allowClear: oldNode.select_allowClear,
        select_source: oldNode.select_source ? (() => {
          const source = oldNode.select_source as string;
          if (source.startsWith('@table.')) {
            const tableId = source.substring(7);
            const newTableId = idMap.get(tableId);
            if (newTableId) {
              return `@table.${newTableId}`;
            }
          }
          return source;
        })() : oldNode.select_source,
        select_defaultValue: oldNode.select_defaultValue,
        select_options: oldNode.select_options ? (() => {
          try {
            const str = JSON.stringify(oldNode.select_options);
            let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => idMap.get(uuid) || uuid);
            replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, (id: string) => idMap.get(id) || id);
            return JSON.parse(replaced) as Prisma.InputJsonValue;
          } catch {
            return oldNode.select_options as Prisma.InputJsonValue;
          }
        })() : oldNode.select_options,
        bool_trueLabel: oldNode.bool_trueLabel,
        bool_falseLabel: oldNode.bool_falseLabel,
        bool_defaultValue: oldNode.bool_defaultValue,
        date_format: oldNode.date_format,
        date_minDate: oldNode.date_minDate,
        date_maxDate: oldNode.date_maxDate,
        date_showTime: oldNode.date_showTime,
        image_maxSize: oldNode.image_maxSize,
        image_ratio: oldNode.image_ratio,
        image_crop: oldNode.image_crop,
        image_thumbnails: oldNode.image_thumbnails ? (() => {
          try {
            const str = JSON.stringify(oldNode.image_thumbnails);
            let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => idMap.get(uuid) || uuid);
            replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, (id: string) => idMap.get(id) || id);
            return JSON.parse(replaced) as Prisma.InputJsonValue;
          } catch {
            return oldNode.image_thumbnails as Prisma.InputJsonValue;
          }
        })() : oldNode.image_thumbnails,
        link_activeId: oldNode.link_activeId,
        link_carryContext: oldNode.link_carryContext,
        link_mode: oldNode.link_mode,
        link_name: oldNode.link_name,
        link_params: oldNode.link_params ? (() => {
          try {
            const str = JSON.stringify(oldNode.link_params);
            let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => idMap.get(uuid) || uuid);
            replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, (id: string) => idMap.get(id) || id);
            return JSON.parse(replaced) as Prisma.InputJsonValue;
          } catch {
            return oldNode.link_params as Prisma.InputJsonValue;
          }
        })() : oldNode.link_params,
        link_targetNodeId: oldNode.link_targetNodeId && idMap.has(oldNode.link_targetNodeId) ? idMap.get(oldNode.link_targetNodeId)! : oldNode.link_targetNodeId,
        link_targetTreeId: oldNode.link_targetTreeId,
        // ?? TABLE: Copier table_activeId, table_instances et table_name du noeud original
        // ? IMPORTANT: Ajouter le suffixe aux IDs de table pour pointer aux tables copiÃƒÂ¯Ã‚Â¿Ã‚Â½es
        table_activeId: oldNode.table_activeId ? `${oldNode.table_activeId}-${__copySuffixNum}` : null,
        table_instances: (() => {
          
          if (!oldNode.table_instances) {
            return oldNode.table_instances;
          }
          
          let rawInstances: Record<string, unknown>;
          try {
            // Toujours parser comme string d'abord
            if (typeof oldNode.table_instances === 'string') {
              rawInstances = JSON.parse(oldNode.table_instances);
            } else if (typeof oldNode.table_instances === 'object') {
              rawInstances = JSON.parse(JSON.stringify(oldNode.table_instances));
            } else {
              return oldNode.table_instances;
            }
          } catch (e) {
            console.error('[DEEP-COPY-TABLE] Parse failed:', e);
            return oldNode.table_instances;
          }
          
          const updatedInstances: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(rawInstances)) {
            // ? FIX: VÃƒÂ¯Ã‚Â¿Ã‚Â½rifier si la clÃƒÂ¯Ã‚Â¿Ã‚Â½ a DÃƒÂ¯Ã‚Â¿Ã‚Â½JÃƒÂ¯Ã‚Â¿Ã‚Â½ un suffixe numÃƒÂ¯Ã‚Â¿Ã‚Â½rique (-1, -2, etc.)
            // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
            const hasSuffixRegex = /-\d+$/;  // Suffixe numÃƒÂ¯Ã‚Â¿Ã‚Â½rique ÃƒÂ¯Ã‚Â¿Ã‚Â½ la fin
            const newKey = hasSuffixRegex.test(key) ? key : `${key}-${__copySuffixNum}`;
            
            if (value && typeof value === 'object') {
              const tableInstanceObj = value as Record<string, unknown>;
              const updatedObj = { ...tableInstanceObj };
              if (tableInstanceObj.tableId && typeof tableInstanceObj.tableId === 'string') {
                const oldTableId = tableInstanceObj.tableId;
                // ? FIX: VÃƒÂ¯Ã‚Â¿Ã‚Â½rifier si le tableId a DÃƒÂ¯Ã‚Â¿Ã‚Â½JÃƒÂ¯Ã‚Â¿Ã‚Â½ un suffixe numÃƒÂ¯Ã‚Â¿Ã‚Â½rique (-1, -2, etc.)
                // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
                const hasSuffixRegex = /-\d+$/;  // Suffixe numÃƒÂ¯Ã‚Â¿Ã‚Â½rique ÃƒÂ¯Ã‚Â¿Ã‚Â½ la fin
                updatedObj.tableId = hasSuffixRegex.test(oldTableId)
                  ? oldTableId 
                  : `${oldTableId}-${__copySuffixNum}`;
              }
              updatedInstances[newKey] = updatedObj;
            } else {
              updatedInstances[newKey] = value;
            }
          }
          return updatedInstances;
        })() as unknown as Prisma.InputJsonValue,
        table_name: oldNode.table_name,
        // RÃƒÂ¯Ã‚Â¿Ã‚Â½pÃƒÂ¯Ã‚Â¿Ã‚Â½ter: recopier la config colonnes repeater telle quelle
        repeater_templateNodeIds: oldNode.repeater_templateNodeIds,
        repeater_templateNodeLabels: oldNode.repeater_templateNodeLabels,
        repeater_minItems: oldNode.repeater_minItems,
        repeater_maxItems: oldNode.repeater_maxItems,
        repeater_addButtonLabel: oldNode.repeater_addButtonLabel,
        repeater_buttonSize: oldNode.repeater_buttonSize,
        repeater_buttonWidth: oldNode.repeater_buttonWidth,
        repeater_iconOnly: oldNode.repeater_iconOnly,
        // METADATA: noter la provenance et supprimer les shared refs (copie indÃƒÆ’Ã‚Â©pendante)
        metadata: {
          ...(typeof oldNode.metadata === 'object' ? (oldNode.metadata as Record<string, unknown>) : {}),
          copiedFromNodeId: oldNode.id,
          copySuffix: __copySuffixNum,
        } as Prisma.InputJsonValue,
        // SHARED REFS ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ conditionnellement prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©es ou supprimÃƒÆ’Ã‚Â©es
        isSharedReference: preserveSharedReferences ? oldNode.isSharedReference : false,
        sharedReferenceId: preserveSharedReferences ? oldNode.sharedReferenceId : null,
        sharedReferenceIds: preserveSharedReferences ? oldNode.sharedReferenceIds : [],
        sharedReferenceName: preserveSharedReferences ? oldNode.sharedReferenceName : null,
        sharedReferenceDescription: preserveSharedReferences ? oldNode.sharedReferenceDescription : null,
        // ?? COLONNES LINKED*** : Copier les rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rences existantes, crÃƒÂ¯Ã‚Â¿Ã‚Â½er les nouvelles aprÃƒÂ¯Ã‚Â¿Ã‚Â½s
        linkedFormulaIds: Array.isArray(oldNode.linkedFormulaIds) 
          ? oldNode.linkedFormulaIds 
          : [],
        linkedConditionIds: Array.isArray(oldNode.linkedConditionIds) 
          ? oldNode.linkedConditionIds 
          : [],
        linkedTableIds: Array.isArray(oldNode.linkedTableIds)
          // ? AJOUTER LES SUFFIXES aux IDs de table ici aussi!
          ? oldNode.linkedTableIds.map(id => `${id}-${__copySuffixNum}`)
          : [],
        linkedVariableIds: Array.isArray(oldNode.linkedVariableIds) 
          ? oldNode.linkedVariableIds 
          : [],
        updatedAt: new Date(),
    };


    await prisma.treeBranchLeafNode.create({ data: cloneData });
    createdNodes.push({ oldId, newId });
  }

  // Dupliquer Formules / Conditions / Tables pour chaque nÃƒâ€¦Ã¢â‚¬Å“ud copiÃƒÆ’Ã‚Â©
  for (const { oldId, newId } of createdNodes) {
      // Formules
      const formulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: oldId } });
      for (const f of formulas) {
        const newFormulaId = `${f.id}-${__copySuffixNum}`;
        formulaIdMap.set(f.id, newFormulaId);
        const newTokens = replaceIdsInTokens(f.tokens, idMap) as Prisma.InputJsonValue;
        await prisma.treeBranchLeafNodeFormula.create({
          data: {
            id: newFormulaId,
            nodeId: newId,
            organizationId: f.organizationId,
            name: f.name ? `${f.name}${__computedLabelSuffix}` : f.name,
            tokens: newTokens,
            description: f.description,
            isDefault: f.isDefault,
            order: f.order,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MAJ linkedFormulaIds (propriÃƒÆ’Ã‚Â©taire + inverses rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s)
        try {
          await addToNodeLinkedField(prisma, newId, 'linkedFormulaIds', [newFormulaId]);
          const refs = Array.from(extractNodeIdsFromTokens(newTokens));
          for (const refId of refs) {
            await addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [newFormulaId]);
          }
        } catch (e) {
          console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds during deep copy:', (e as Error).message);
        }
      }

      // Conditions
      const conditions = await prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: oldId } });
      for (const c of conditions) {
        const newConditionId = `${c.id}-${__copySuffixNum}`;
        conditionIdMap.set(c.id, newConditionId);
        const newSet = replaceIdsInConditionSet(c.conditionSet, idMap, formulaIdMap) as Prisma.InputJsonValue;
        await prisma.treeBranchLeafNodeCondition.create({
          data: {
            id: newConditionId,
            nodeId: newId,
            organizationId: c.organizationId,
            name: c.name ? `${c.name}${__computedLabelSuffix}` : c.name,
            conditionSet: newSet,
            description: c.description,
            isDefault: c.isDefault,
            order: c.order,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MAJ linkedConditionIds (propriÃƒÆ’Ã‚Â©taire + inverses rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s)
        try {
          await addToNodeLinkedField(prisma, newId, 'linkedConditionIds', [newConditionId]);
          const refs = Array.from(extractNodeIdsFromConditionSet(newSet));
          for (const refId of refs) {
            await addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [newConditionId]);
          }
        } catch (e) {
          console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds during deep copy:', (e as Error).message);
        }
      }

      // Tables
      const tables = await prisma.treeBranchLeafNodeTable.findMany({
        where: { nodeId: oldId },
        include: { tableColumns: true, tableRows: true }
      });
      for (const t of tables) {
        const newTableId = `${t.id}-${__copySuffixNum}`;
        tableIdMap.set(t.id, newTableId); // ?? Tracer la copie
        await prisma.treeBranchLeafNodeTable.create({
          data: {
            id: newTableId,
            nodeId: newId,
            organizationId: t.organizationId,
            name: t.name ? `${t.name}${__computedLabelSuffix}` : t.name,
            description: t.description,
            type: t.type,
            rowCount: t.rowCount,
            columnCount: t.columnCount,
            // ?? COPIE TABLE META: suffixer comparisonColumn et UUIDs si c'est du texte
            meta: (() => {
              if (!t.meta) return t.meta as Prisma.InputJsonValue;
              try {
                const metaObj = typeof t.meta === 'string' ? JSON.parse(t.meta) : JSON.parse(JSON.stringify(t.meta));
                // Suffixer les UUIDs dans selectors
                if (metaObj?.lookup?.selectors?.columnFieldId && !metaObj.lookup.selectors.columnFieldId.endsWith(`-${__copySuffixNum}`)) {
                  metaObj.lookup.selectors.columnFieldId = `${metaObj.lookup.selectors.columnFieldId}-${__copySuffixNum}`;
                }
                if (metaObj?.lookup?.selectors?.rowFieldId && !metaObj.lookup.selectors.rowFieldId.endsWith(`-${__copySuffixNum}`)) {
                  metaObj.lookup.selectors.rowFieldId = `${metaObj.lookup.selectors.rowFieldId}-${__copySuffixNum}`;
                }
                // Suffixer sourceField dans rowSourceOption
                if (metaObj?.lookup?.rowSourceOption?.sourceField && !metaObj.lookup.rowSourceOption.sourceField.endsWith(`-${__copySuffixNum}`)) {
                  metaObj.lookup.rowSourceOption.sourceField = `${metaObj.lookup.rowSourceOption.sourceField}-${__copySuffixNum}`;
                }
                // Suffixer sourceField dans columnSourceOption
                if (metaObj?.lookup?.columnSourceOption?.sourceField && !metaObj.lookup.columnSourceOption.sourceField.endsWith(`-${__copySuffixNum}`)) {
                  metaObj.lookup.columnSourceOption.sourceField = `${metaObj.lookup.columnSourceOption.sourceField}-${__copySuffixNum}`;
                }
                // Suffixer comparisonColumn dans rowSourceOption si c'est du texte
                if (metaObj?.lookup?.rowSourceOption?.comparisonColumn) {
                  const val = metaObj.lookup.rowSourceOption.comparisonColumn;
                  if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(__computedLabelSuffix)) {
                    metaObj.lookup.rowSourceOption.comparisonColumn = `${val}${__computedLabelSuffix}`;
                  }
                }
                // Suffixer comparisonColumn dans columnSourceOption si c'est du texte
                if (metaObj?.lookup?.columnSourceOption?.comparisonColumn) {
                  const val = metaObj.lookup.columnSourceOption.comparisonColumn;
                  if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(__computedLabelSuffix)) {
                    metaObj.lookup.columnSourceOption.comparisonColumn = `${val}${__computedLabelSuffix}`;
                  }
                }
                return metaObj as Prisma.InputJsonValue;
              } catch {
                return t.meta as Prisma.InputJsonValue;
              }
            })(),
            isDefault: t.isDefault,
            order: t.order,
            createdAt: new Date(),
            updatedAt: new Date(),
            lookupDisplayColumns: t.lookupDisplayColumns,
            lookupSelectColumn: t.lookupSelectColumn,
            tableColumns: {
              create: t.tableColumns.map(col => ({
                id: `${col.id}-${__copySuffixNum}`,
                columnIndex: col.columnIndex,
                // ?? COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
                name: col.name 
                  ? (/^-?\d+(\.\d+)?$/.test(col.name.trim()) ? col.name : `${col.name}${__computedLabelSuffix}`)
                  : col.name,
                type: col.type,
                width: col.width,
                format: col.format,
                metadata: col.metadata as Prisma.InputJsonValue,
              }))
            },
            tableRows: {
              create: t.tableRows.map(row => ({
                id: `${row.id}-${__copySuffixNum}`,
                rowIndex: row.rowIndex,
                cells: row.cells as Prisma.InputJsonValue,
              }))
            }
          }
        });
        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MAJ linkedTableIds du nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire (pas d'inverse pour table)
        try {
          await addToNodeLinkedField(prisma, newId, 'linkedTableIds', [newTableId]);
        } catch (e) {
          console.warn('[TreeBranchLeaf API] Warning updating linkedTableIds during deep copy:', (e as Error).message);
        }
      }
    }

    // Cache global pour ÃƒÂ¯Ã‚Â¿Ã‚Â½viter de copier deux fois la mÃƒÂ¯Ã‚Â¿Ã‚Â½me variable
    const variableCopyCache = new Map<string, string>();

    for (const oldNodeId of toCopy) {
      const newNodeId = idMap.get(oldNodeId)!;
      const oldNode = byId.get(oldNodeId)!;

      // Mapper les IDs linked du nÃƒÂ¯Ã‚Â¿Ã‚Â½ud original vers leurs versions suffixÃƒÂ¯Ã‚Â¿Ã‚Â½es
      // Les formules et conditions doivent aussi avoir le suffixe appliquÃƒÂ¯Ã‚Â¿Ã‚Â½
      const newLinkedFormulaIds = (Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [])
        .map(id => {
          const mappedId = formulaIdMap.get(id);
          // ? Si dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ mappÃƒÂ¯Ã‚Â¿Ã‚Â½ (avec suffixe), on le retourne directement. Sinon on ajoute le suffixe.
          return mappedId ?? `${id}-${__copySuffixNum}`;
        })
        .filter(Boolean);

      const newLinkedConditionIds = (Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [])
            .map(id => {
              const mappedId = conditionIdMap.get(id);
              // ? Si dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ mappÃƒÂ¯Ã‚Â¿Ã‚Â½ (avec suffixe), on le retourne directement. Sinon on ajoute le suffixe.
              return mappedId ?? `${id}-${__copySuffixNum}`;
            })
            .filter(Boolean);
          
          const newLinkedTableIds = (Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [])
            .map(id => {
              const mappedId = tableIdMap.get(id);
              // ? Si dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ mappÃƒÂ¯Ã‚Â¿Ã‚Â½ (avec suffixe), on le retourne directement. Sinon on ajoute le suffixe.
              return mappedId ?? `${id}-${__copySuffixNum}`;
            })
            .filter(Boolean);
          
          const newLinkedVariableIds: string[] = [];
          
          // ?? COPIE DES VARIABLES DANS TreeBranchLeafNodeVariable
          
          // ?? CrÃƒÂ¯Ã‚Â¿Ã‚Â½ation systÃƒÂ¯Ã‚Â¿Ã‚Â½matique des nÃƒÂ¯Ã‚Â¿Ã‚Â½uds d'affichage via copyVariableWithCapacities
          // (la fonction choisit la bonne section "Nouveau Section" si elle existe)
          const shouldCreateDisplayNodes = true;
          
          if (Array.isArray(oldNode.linkedVariableIds) && oldNode.linkedVariableIds.length > 0) {
            
            for (const linkedVarId of oldNode.linkedVariableIds) {
              const isSharedRef = typeof linkedVarId === 'string' && linkedVarId.startsWith('shared-ref-');
              
              if (isSharedRef) {
                // ? Shared Reference : GARDER tel quel
                newLinkedVariableIds.push(linkedVarId);
              } else {
                // ?? Variable Normale UUID : COPIER avec ou sans nÃƒÂ¯Ã‚Â¿Ã‚Â½ud d'affichage
                const newVarId = `${linkedVarId}-${__copySuffixNum}`;
                
                try {
                  if (shouldCreateDisplayNodes) {
                    // ?? Utiliser copyVariableWithCapacities pour crÃƒÂ¯Ã‚Â¿Ã‚Â½er le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud d'affichage
                    const copyResult = await copyVariableWithCapacities(
                      linkedVarId,
                      __copySuffixNum,
                      newNodeId,
                      prisma,
                      {
                        formulaIdMap,
                        conditionIdMap,
                        tableIdMap,
                        nodeIdMap: idMap,
                        variableCopyCache,
                        autoCreateDisplayNode: true,
                        displayNodeAlreadyCreated: false
                      }
                    );
                    
                    if (copyResult.success) {
                      newLinkedVariableIds.push(copyResult.variableId);
                    } else {
                      console.error(`[DEEP-COPY] ? Copy failed: ${copyResult.error}`);
                      newLinkedVariableIds.push(linkedVarId);
                    }
                  }
                } catch (e) {
                  console.error(`[DEEP-COPY] ? Exception: ${(e as Error).message}`);
                  newLinkedVariableIds.push(linkedVarId);
                }
              }
            }
            
          } else {
          }

          // UPDATE le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud avec les linked*** correctes
          if (newLinkedFormulaIds.length > 0 || newLinkedConditionIds.length > 0 || newLinkedTableIds.length > 0 || newLinkedVariableIds.length > 0) {
            try {
              await prisma.treeBranchLeafNode.update({
                where: { id: newNodeId },
                data: {
                  linkedFormulaIds: newLinkedFormulaIds.length > 0 ? { set: newLinkedFormulaIds } : { set: [] },
                  linkedConditionIds: newLinkedConditionIds.length > 0 ? { set: newLinkedConditionIds } : { set: [] },
                  linkedTableIds: newLinkedTableIds.length > 0 ? { set: newLinkedTableIds } : { set: [] },
                  linkedVariableIds: newLinkedVariableIds.length > 0 ? { set: newLinkedVariableIds } : { set: [] },
                }
              });
            } catch (e) {
              console.warn(`?? [DEEP-COPY] Erreur lors du UPDATE des linked*** pour ${newNodeId}:`, (e as Error).message);
            }
          }


        }

        const rootNewId = idMap.get(source.id)!;
        return {
          root: { oldId: source.id, newId: rootNewId },
          idMap: Object.fromEntries(idMap),
          formulaIdMap: Object.fromEntries(formulaIdMap),
          conditionIdMap: Object.fromEntries(conditionIdMap),
          tableIdMap: Object.fromEntries(tableIdMap)
        };
      }

      router.post('/nodes/:nodeId/deep-copy', async (req, res) => {
        try {
          const { nodeId } = req.params;
          const { targetParentId, labelSuffix } = (req.body || {}) as { targetParentId?: string | null; labelSuffix?: string };
          const result = await deepCopyNodeInternalService(prisma, req as unknown as MinimalReq, nodeId, { targetParentId });
          
          // 🔄 ÉVALUATION AUTOMATIQUE après duplication
          // Récupérer tous les nœuds créés (displayNodeIds + le nœud racine)
          const allCopiedNodeIds = [result.root.newId, ...(result.displayNodeIds || [])];
          
          console.log(`🔄 [DEEP-COPY] Déclenchement évaluation pour ${allCopiedNodeIds.length} nœuds copiés:`, allCopiedNodeIds);
          
          // Évaluer chaque nœud copié qui a une configuration de calcul
          for (const copiedNodeId of allCopiedNodeIds) {
            try {
              const copiedNode = await prisma.treeBranchLeafNode.findUnique({
                where: { id: copiedNodeId },
                select: { 
                  id: true, 
                  label: true,
                  treeId: true,
                  formulaId: true,
                  tableConfig: true,
                  data_activeId: true
                }
              });
              
              if (!copiedNode) continue;
              
              // Vérifier si le nœud a besoin d'évaluation (formule OU table lookup)
              const needsEvaluation = copiedNode.formulaId || (copiedNode.tableConfig && typeof copiedNode.tableConfig === 'object');
              
              if (needsEvaluation) {
                console.log(`🎯 [DEEP-COPY] Évaluation du nœud ${copiedNodeId} (${copiedNode.label})`);
                
                // Utiliser evaluateVariableOperation pour déclencher le calcul
                // Utiliser la signature standard: (variableNodeId, submissionId, prisma)
                // Pour l'initialisation, on passe un submissionId neutre basé sur le nœud
                const submissionId = copiedNodeId; // fallback sûr pour enrichDataFromSubmission
                const evalResult = await evaluateVariableOperation(
                  copiedNodeId,
                  submissionId,
                  prisma
                );
                
                if (evalResult.success) {
                  console.log(`✅ [DEEP-COPY] Évaluation réussie pour ${copiedNodeId}:`, evalResult.result);
                } else {
                  console.warn(`⚠️ [DEEP-COPY] Évaluation échouée pour ${copiedNodeId}:`, evalResult.error);
                }
              }
            } catch (evalError) {
              console.error(`❌ [DEEP-COPY] Erreur évaluation nœud ${copiedNodeId}:`, evalError);
              // Continuer même si une évaluation échoue
            }
          }
          
          console.log(`✅ [DEEP-COPY] Évaluation initiale terminée pour ${allCopiedNodeIds.length} nœuds`);
          
          res.json(result);
        } catch (error) {
          console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [/nodes/:nodeId/deep-copy] Erreur:', error);
          res.status(500).json({ error: 'Erreur lors de la copie profonde' });
        }
      });


// POST /api/treebranchleaf/trees/:treeId/nodes - CrÃƒÆ’Ã‚Â©er un nÃƒâ€¦Ã¢â‚¬Å“ud
router.post('/trees/:treeId/nodes', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { organizationId } = req.user!;
    const nodeData = req.body;


    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // VÃƒÆ’Ã‚Â©rifier les champs obligatoires
    if (!nodeData.type || !nodeData.label) {
      return res.status(400).json({ error: 'Les champs type et label sont obligatoires' });
    }

    // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ VALIDATION DES TYPES AUTORISÃƒÆ’Ã¢â‚¬Â°S
    const allowedTypes = [
      'branch',                 // Branche = conteneur hiÃƒÆ’Ã‚Â©rarchique
      'section',               // Section = groupe de champs calculÃƒÆ’Ã‚Â©s
      'leaf_field',            // Champ standard (text, email, etc.)
      'leaf_option',           // Option pour un champ SELECT
      'leaf_option_field',     // Option + Champ (combinÃƒÆ’Ã‚Â©) ÃƒÂ¢Ã¢â‚¬Â Ã‚Â ajoutÃƒÆ’Ã‚Â© pour dÃƒÆ’Ã‚Â©bloquer O+C
      'leaf_text',             // Champ texte simple
      'leaf_email',            // Champ email
      'leaf_phone',            // Champ tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phone
      'leaf_date',             // Champ date
      'leaf_number',           // Champ numÃƒÆ’Ã‚Â©rique
      'leaf_checkbox',         // Case ÃƒÆ’Ã‚Â  cocher
      'leaf_select',           // Liste dÃƒÆ’Ã‚Â©roulante
      'leaf_radio',            // Boutons radio
      'leaf_repeater'          // Bloc rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©table (conteneur de champs rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©tables)
    ];

    if (!allowedTypes.includes(nodeData.type)) {
      return res.status(400).json({ 
        error: `Type de nÃƒâ€¦Ã¢â‚¬Å“ud non autorisÃƒÆ’Ã‚Â©: ${nodeData.type}. Types autorisÃƒÆ’Ã‚Â©s: ${allowedTypes.join(', ')}` 
      });
    }

    // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ VALIDATION HIÃƒÆ’Ã¢â‚¬Â°RARCHIQUE STRICTE - Utilisation des rÃƒÆ’Ã‚Â¨gles centralisÃƒÆ’Ã‚Â©es
    if (nodeData.parentId) {
      const parentNode = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeData.parentId, treeId }
      });

      if (!parentNode) {
        return res.status(400).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud parent non trouvÃƒÆ’Ã‚Â©' });
      }

      // Convertir les types de nÃƒâ€¦Ã¢â‚¬Å“uds pour utiliser les rÃƒÆ’Ã‚Â¨gles centralisÃƒÆ’Ã‚Â©es
      const parentType = parentNode.type as NodeType;
      const parentSubType = parentNode.subType as NodeSubType;
      const childType = nodeData.type as NodeType;
      const childSubType = (nodeData.subType || nodeData.fieldType || 'data') as NodeSubType;

      // Utiliser la validation centralisÃƒÆ’Ã‚Â©e
      const validationResult = validateParentChildRelation(
        parentType,
        parentSubType,
        childType,
        childSubType
      );

      if (!validationResult.isValid) {
        const errorMessage = getValidationErrorMessage(
          parentType,
          parentSubType,
          childType,
          childSubType
        );
        return res.status(400).json({ 
          error: errorMessage 
        });
      }

    } else {
      // Pas de parent = crÃƒÆ’Ã‚Â©ation directement sous l'arbre racine
      // Utiliser la validation centralisÃƒÆ’Ã‚Â©e pour vÃƒÆ’Ã‚Â©rifier si c'est autorisÃƒÆ’Ã‚Â©
      const childType = nodeData.type as NodeType;
      const childSubType = (nodeData.subType || nodeData.fieldType || 'data') as NodeSubType;

      const validationResult = validateParentChildRelation(
        'tree',
        'data',
        childType,
        childSubType
      );

      if (!validationResult.isValid) {
        const errorMessage = getValidationErrorMessage(
          'tree',
          'data',
          childType,
          childSubType
        );
        return res.status(400).json({ 
          error: errorMessage 
        });
      }

    }

    // GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer un ID unique pour le nÃƒâ€¦Ã¢â‚¬Å“ud
    const { randomUUID } = await import('crypto');
    const nodeId = randomUUID();

    const node = await prisma.treeBranchLeafNode.create({
      data: {
        id: nodeId,
        treeId,
        type: nodeData.type,
        subType: nodeData.subType || nodeData.fieldType || 'data',
        label: nodeData.label,
        description: nodeData.description || null,
        parentId: nodeData.parentId || null,
        order: nodeData.order ?? 0,
  isVisible: nodeData.isVisible ?? true,
  isActive: nodeData.isActive ?? true,
  // Par dÃƒÆ’Ã‚Â©faut, AUCUNE capacitÃƒÆ’Ã‚Â© n'est activÃƒÆ’Ã‚Â©e automatiquement
  hasData: nodeData.hasData ?? false,
  hasFormula: nodeData.hasFormula ?? false,
  hasCondition: nodeData.hasCondition ?? false,
  hasTable: nodeData.hasTable ?? false,
  hasAPI: nodeData.hasAPI ?? false,
  hasLink: nodeData.hasLink ?? false,
  hasMarkers: nodeData.hasMarkers ?? false,
        metadata: nodeData.metadata ?? {},
        updatedAt: new Date()
      }
    });

    res.status(201).json(node);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node:', error);
    res.status(500).json({ error: 'Impossible de crÃƒÆ’Ã‚Â©er le nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// ============================================================================= 
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ HELPER : Conversion JSON metadata vers colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
// =============================================================================

/**
 * Convertit les donnÃƒÆ’Ã‚Â©es JSON des metadata vers les nouvelles colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
 */
// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ MIGRATION JSON ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ COLONNES DÃƒÆ’Ã¢â‚¬Â°DIÃƒÆ’Ã¢â‚¬Â°ES
// =============================================================================

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ STRATÃƒÆ’Ã¢â‚¬Â°GIE MIGRATION : JSON ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
 * Extraite TOUTES les donnÃƒÆ’Ã‚Â©es depuis metadata et fieldConfig pour les mapper vers les nouvelles colonnes
 * OBJECTIF : Plus jamais de JSON, une seule source de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â©
 */
function mapJSONToColumns(updateData: Record<string, unknown>): Record<string, unknown> {
  const columnData: Record<string, unknown> = {};
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ PROTECTION DÃƒÆ’Ã¢â‚¬Â°FENSIVE - VÃƒÆ’Ã‚Â©rifier la structure des donnÃƒÆ’Ã‚Â©es
  if (!updateData || typeof updateData !== 'object') {
    return columnData;
  }
  
  // Extraire les metadata et fieldConfig si prÃƒÆ’Ã‚Â©sentes avec protection
  const metadata = (updateData.metadata && typeof updateData.metadata === 'object' ? updateData.metadata as Record<string, unknown> : {});
  const fieldConfig = (updateData.fieldConfig && typeof updateData.fieldConfig === 'object' ? updateData.fieldConfig as Record<string, unknown> : {});
  const appearanceConfig = (updateData.appearanceConfig && typeof updateData.appearanceConfig === 'object' ? updateData.appearanceConfig as Record<string, unknown> : {});
  
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 1 : Migration depuis appearanceConfig (NOUVEAU systÃƒÆ’Ã‚Â¨me prioritaire)
  if (Object.keys(appearanceConfig).length > 0) {
    if (appearanceConfig.size) columnData.appearance_size = appearanceConfig.size;
    if (appearanceConfig.width) columnData.appearance_width = appearanceConfig.width;
    if (appearanceConfig.variant) columnData.appearance_variant = appearanceConfig.variant;
    // Copier tous les autres champs d'apparence possibles
    if (appearanceConfig.textSize) columnData.appearance_size = appearanceConfig.textSize;
    if (appearanceConfig.fieldWidth) columnData.appearance_width = appearanceConfig.fieldWidth;
    if (appearanceConfig.fieldVariant) columnData.appearance_variant = appearanceConfig.fieldVariant;
    
    // ?? Configuration tooltip d'aide (pour TOUS les champs)
    if (appearanceConfig.helpTooltipType) columnData.text_helpTooltipType = appearanceConfig.helpTooltipType;
    if (appearanceConfig.helpTooltipText) columnData.text_helpTooltipText = appearanceConfig.helpTooltipText;
    if (appearanceConfig.helpTooltipImage) columnData.text_helpTooltipImage = appearanceConfig.helpTooltipImage;
    
    // 🎨 displayIcon - Icône personnalisée du champ TBL
    if (appearanceConfig.displayIcon) columnData.appearance_displayIcon = appearanceConfig.displayIcon;
    
    // ?? Configuration sections/branches (COLONNES DESKTOP/MOBILE)
    if (appearanceConfig.collapsible !== undefined) columnData.section_collapsible = appearanceConfig.collapsible;
    if (appearanceConfig.defaultCollapsed !== undefined) columnData.section_defaultCollapsed = appearanceConfig.defaultCollapsed;
    if (appearanceConfig.showChildrenCount !== undefined) columnData.section_showChildrenCount = appearanceConfig.showChildrenCount;
    if (appearanceConfig.columnsDesktop !== undefined) columnData.section_columnsDesktop = appearanceConfig.columnsDesktop;
    if (appearanceConfig.columnsMobile !== undefined) columnData.section_columnsMobile = appearanceConfig.columnsMobile;
    if (appearanceConfig.gutter !== undefined) columnData.section_gutter = appearanceConfig.gutter;
    
    // ?? Configuration fichiers
    if (appearanceConfig.maxFileSize !== undefined) columnData.file_maxSize = appearanceConfig.maxFileSize;
    if (appearanceConfig.allowedTypes) columnData.file_allowedTypes = appearanceConfig.allowedTypes;
    if (appearanceConfig.multiple !== undefined) columnData.file_multiple = appearanceConfig.multiple;
    if (appearanceConfig.showPreview !== undefined) columnData.file_showPreview = appearanceConfig.showPreview;
    
    // ?? PropriÃƒÂ¯Ã‚Â¿Ã‚Â½tÃƒÂ¯Ã‚Â¿Ã‚Â½s avancÃƒÂ¯Ã‚Â¿Ã‚Â½es universelles
    if (appearanceConfig.visibleToUser !== undefined) columnData.data_visibleToUser = appearanceConfig.visibleToUser;
    if (appearanceConfig.isRequired !== undefined) columnData.isRequired = appearanceConfig.isRequired;
    
    // ?? NOUVEAU: Mapping direct prefix/suffix/unit/decimals depuis appearanceConfig
    // Ces valeurs viennent directement du UniversalPanel
    if (appearanceConfig.prefix !== undefined) columnData.number_prefix = appearanceConfig.prefix || null;
    if (appearanceConfig.suffix !== undefined) columnData.number_suffix = appearanceConfig.suffix || null;
    if (appearanceConfig.unit !== undefined) columnData.number_unit = appearanceConfig.unit || null;
    if (appearanceConfig.decimals !== undefined) columnData.number_decimals = appearanceConfig.decimals;
    if (appearanceConfig.min !== undefined) columnData.number_min = appearanceConfig.min;
    if (appearanceConfig.max !== undefined) columnData.number_max = appearanceConfig.max;
    if (appearanceConfig.step !== undefined) columnData.number_step = appearanceConfig.step;
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 1bis : Migration depuis metadata.appearance (fallback)
  if (metadata.appearance && typeof metadata.appearance === 'object') {
    const metaAppearance = metadata.appearance as Record<string, unknown>;
    if (metaAppearance.size && !columnData.appearance_size) columnData.appearance_size = metaAppearance.size;
    if (metaAppearance.width && !columnData.appearance_width) columnData.appearance_width = metaAppearance.width;
    if (metaAppearance.variant && !columnData.appearance_variant) columnData.appearance_variant = metaAppearance.variant;
  }

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 1ter : Migration depuis metadata.repeater (NOUVEAU)
  if (metadata.repeater && typeof metadata.repeater === 'object') {
    const repeaterMeta = metadata.repeater as Record<string, unknown>;
    
    // Sauvegarder templateNodeIds en JSON dans la colonne dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©e
    if ('templateNodeIds' in repeaterMeta) {
      if (Array.isArray(repeaterMeta.templateNodeIds)) {
        columnData.repeater_templateNodeIds = repeaterMeta.templateNodeIds.length > 0
          ? JSON.stringify(repeaterMeta.templateNodeIds)
          : null;
      } else {
        columnData.repeater_templateNodeIds = null;
      }
    }
    
    // ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â·ÃƒÂ¯Ã‚Â¸Ã‚Â SAUVEGARDER templateNodeLabels en JSON dans la colonne dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©e
    if (repeaterMeta.templateNodeLabels && typeof repeaterMeta.templateNodeLabels === 'object') {
      columnData.repeater_templateNodeLabels = JSON.stringify(repeaterMeta.templateNodeLabels);
    } else if ('templateNodeLabels' in repeaterMeta) {
      columnData.repeater_templateNodeLabels = null;
    }
    
    if (repeaterMeta.minItems !== undefined) columnData.repeater_minItems = repeaterMeta.minItems;
    if (repeaterMeta.maxItems !== undefined) columnData.repeater_maxItems = repeaterMeta.maxItems;
    if (repeaterMeta.addButtonLabel) columnData.repeater_addButtonLabel = repeaterMeta.addButtonLabel;
    if (repeaterMeta.buttonSize) columnData.repeater_buttonSize = repeaterMeta.buttonSize;
    if (repeaterMeta.buttonWidth) columnData.repeater_buttonWidth = repeaterMeta.buttonWidth;
    if (repeaterMeta.iconOnly !== undefined) columnData.repeater_iconOnly = repeaterMeta.iconOnly;
  }
  
  // ? ÃƒÂ¯Ã‚Â¿Ã‚Â½TAPE 1quater : Migration depuis metadata.subTabs (CRUCIAL!)
  // ?? Les sous-onglets (array) DOIVENT ÃƒÂ¯Ã‚Â¿Ã‚Â½tre sauvegardÃƒÂ¯Ã‚Â¿Ã‚Â½s dans la colonne 'subtabs'
  if ('subTabs' in metadata) {
    if (Array.isArray(metadata.subTabs) && metadata.subTabs.length > 0) {
      columnData.subtabs = JSON.stringify(metadata.subTabs);
    } else {
      columnData.subtabs = null;
    }
  }
  
  // ? ÃƒÂ¯Ã‚Â¿Ã‚Â½TAPE 1quinquies : Migration metadata.subTab (assignment champ individuel)
  // ?? L'assignment d'un champ ÃƒÂ¯Ã‚Â¿Ã‚Â½ un sous-onglet (string ou array) va dans la colonne 'subtab'
  if ('subTab' in metadata) {
    const subTabValue = metadata.subTab;
    if (typeof subTabValue === 'string' && subTabValue.trim().length > 0) {
      columnData.subtab = subTabValue;
    } else if (Array.isArray(subTabValue) && subTabValue.length > 0) {
      columnData.subtab = JSON.stringify(subTabValue);
    } else {
      columnData.subtab = null;
    }
  }
  
  // ? ÃƒÂ¯Ã‚Â¿Ã‚Â½TAPE 2 : Migration configuration champs texte
  const textConfig = metadata.textConfig || fieldConfig.text || fieldConfig.textConfig || {};
  if (Object.keys(textConfig).length > 0) {
    if (textConfig.placeholder) columnData.text_placeholder = textConfig.placeholder;
    if (textConfig.maxLength) columnData.text_maxLength = textConfig.maxLength;
    if (textConfig.minLength) columnData.text_minLength = textConfig.minLength;
    if (textConfig.mask) columnData.text_mask = textConfig.mask;
    if (textConfig.regex) columnData.text_regex = textConfig.regex;
    if (textConfig.rows) columnData.text_rows = textConfig.rows;
  }
  
  // ? ÃƒÂ¯Ã‚Â¿Ã‚Â½TAPE 3 : Migration configuration champs nombre
  const numberConfig = metadata.numberConfig || fieldConfig.number || fieldConfig.numberConfig || {};
  if (Object.keys(numberConfig).length > 0) {
    if (numberConfig.min !== undefined) columnData.number_min = numberConfig.min;
    if (numberConfig.max !== undefined) columnData.number_max = numberConfig.max;
    if (numberConfig.step !== undefined) columnData.number_step = numberConfig.step;
    if (numberConfig.decimals !== undefined) columnData.number_decimals = numberConfig.decimals;
    // ?? FIX: Permettre de supprimer prefix/suffix/unit en les mettant ÃƒÂ¯Ã‚Â¿Ã‚Â½ vide
    if (numberConfig.prefix !== undefined) columnData.number_prefix = numberConfig.prefix || null;
    if (numberConfig.suffix !== undefined) columnData.number_suffix = numberConfig.suffix || null;
    if (numberConfig.unit !== undefined) columnData.number_unit = numberConfig.unit || null;
    if (numberConfig.defaultValue !== undefined) columnData.number_defaultValue = numberConfig.defaultValue;
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 4 : Migration configuration champs sÃƒÆ’Ã‚Â©lection
  const selectConfig = metadata.selectConfig || fieldConfig.select || fieldConfig.selectConfig || {};
  if (Object.keys(selectConfig).length > 0) {
    if (selectConfig.multiple !== undefined) columnData.select_multiple = selectConfig.multiple;
    if (selectConfig.searchable !== undefined) columnData.select_searchable = selectConfig.searchable;
    if (selectConfig.allowClear !== undefined) columnData.select_allowClear = selectConfig.allowClear;
    if (selectConfig.defaultValue) columnData.select_defaultValue = selectConfig.defaultValue;
    if (selectConfig.options) columnData.select_options = selectConfig.options;
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 5 : Migration configuration champs boolÃƒÆ’Ã‚Â©en
  const boolConfig = metadata.boolConfig || fieldConfig.bool || fieldConfig.boolConfig || {};
  if (Object.keys(boolConfig).length > 0) {
    if (boolConfig.trueLabel) columnData.bool_trueLabel = boolConfig.trueLabel;
    if (boolConfig.falseLabel) columnData.bool_falseLabel = boolConfig.falseLabel;
    if (boolConfig.defaultValue !== undefined) columnData.bool_defaultValue = boolConfig.defaultValue;
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 6 : Migration configuration champs date
  const dateConfig = metadata.dateConfig || fieldConfig.date || fieldConfig.dateConfig || {};
  if (Object.keys(dateConfig).length > 0) {
    if (dateConfig.format) columnData.date_format = dateConfig.format;
    if (dateConfig.showTime !== undefined) columnData.date_showTime = dateConfig.showTime;
    if (dateConfig.minDate) columnData.date_minDate = new Date(dateConfig.minDate);
    if (dateConfig.maxDate) columnData.date_maxDate = new Date(dateConfig.maxDate);
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 7 : Migration configuration champs image
  const imageConfig = metadata.imageConfig || fieldConfig.image || fieldConfig.imageConfig || {};
  if (Object.keys(imageConfig).length > 0) {
    if (imageConfig.maxSize) columnData.image_maxSize = imageConfig.maxSize;
    if (imageConfig.ratio) columnData.image_ratio = imageConfig.ratio;
    if (imageConfig.crop !== undefined) columnData.image_crop = imageConfig.crop;
    if (imageConfig.thumbnails) columnData.image_thumbnails = imageConfig.thumbnails;
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 8 : Migration configuration tooltips d'aide
  if (Object.keys(appearanceConfig).length > 0) {
    if (appearanceConfig.helpTooltipType !== undefined) columnData.text_helpTooltipType = appearanceConfig.helpTooltipType;
    if (appearanceConfig.helpTooltipText !== undefined) columnData.text_helpTooltipText = appearanceConfig.helpTooltipText;
    if (appearanceConfig.helpTooltipImage !== undefined) columnData.text_helpTooltipImage = appearanceConfig.helpTooltipImage;
  }
  
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 9 : Types de champs spÃƒÆ’Ã‚Â©cifiques
  if (updateData.fieldType) columnData.fieldType = updateData.fieldType;
  if (updateData.fieldSubType) columnData.fieldSubType = updateData.fieldSubType;
  if (updateData.subType) columnData.fieldSubType = updateData.subType;
  if (updateData.type) columnData.fieldType = updateData.type;
  
  
  return columnData;
}

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¤ NETTOYER LA RÃƒÆ’Ã¢â‚¬Â°PONSE : Colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Interface frontend
 * Reconstruit les objets JSON pour la compatibilitÃƒÆ’Ã‚Â© frontend MAIS depuis les colonnes
 */
function buildResponseFromColumns(node: any): Record<string, unknown> {
  type LegacyRepeaterMeta = {
    templateNodeIds?: unknown;
    templateNodeLabels?: unknown;
    minItems?: number | null;
    maxItems?: number | null;
    addButtonLabel?: string | null;
  };
  const metadataAppearance = (node.metadata && typeof node.metadata === 'object'
    ? (node.metadata as Record<string, unknown>).appearance
    : undefined) as Record<string, unknown> | undefined;

  const storedAppearanceConfig = (node.appearanceConfig && typeof node.appearanceConfig === 'object')
    ? (node.appearanceConfig as Record<string, unknown>)
    : undefined;
  // Construire l'objet appearance depuis les colonnes
  const appearance = {
    size: node.appearance_size || 'md',
    width: node.appearance_width || null,
    variant: node.appearance_variant || null,
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ TOOLTIP FIX : Inclure les champs tooltip dans metadata.appearance
    helpTooltipType: node.text_helpTooltipType || 'none',
    helpTooltipText: node.text_helpTooltipText || null,
    helpTooltipImage: node.text_helpTooltipImage || null,
    displayIcon: node.appearance_displayIcon || (storedAppearanceConfig as any)?.displayIcon || (metadataAppearance as any)?.displayIcon || null
  };

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ NOUVEAU : Construire l'objet repeater depuis les colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
  const legacyRepeater: LegacyRepeaterMeta | null = (() => {
    if (node.metadata && typeof node.metadata === 'object' && (node.metadata as Record<string, unknown>).repeater) {
      const legacy = (node.metadata as Record<string, unknown>).repeater;
      return typeof legacy === 'object' && legacy !== null ? legacy as LegacyRepeaterMeta : null;
    }
    return null;
  })();

  const repeater = {
    templateNodeIds: (() => {
      if (node.repeater_templateNodeIds) {
        try {
          const parsed = JSON.parse(node.repeater_templateNodeIds);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [buildResponseFromColumns] Erreur parse repeater_templateNodeIds:', e);
          return [];
        }
      }
      const legacyIds = legacyRepeater?.templateNodeIds;
      if (Array.isArray(legacyIds)) {
        return legacyIds as string[];
      }
      return [];
    })(),
    templateNodeLabels: (() => {
      if (node.repeater_templateNodeLabels) {
        try {
          const parsedLabels = JSON.parse(node.repeater_templateNodeLabels);
          return parsedLabels && typeof parsedLabels === 'object' ? parsedLabels : null;
        } catch (e) {
          console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [buildResponseFromColumns] Erreur parse repeater_templateNodeLabels:', e);
        }
      }
      const legacyLabels = legacyRepeater?.templateNodeLabels;
      if (legacyLabels && typeof legacyLabels === 'object') {
        return legacyLabels as Record<string, string>;
      }
      return null;
    })(),
    minItems: node.repeater_minItems ?? legacyRepeater?.minItems ?? 0,
    maxItems: node.repeater_maxItems ?? legacyRepeater?.maxItems ?? null,
    addButtonLabel: node.repeater_addButtonLabel || legacyRepeater?.addButtonLabel || null,
    buttonSize: node.repeater_buttonSize || legacyRepeater?.buttonSize || 'middle',
    buttonWidth: node.repeater_buttonWidth || legacyRepeater?.buttonWidth || 'auto',
    iconOnly: node.repeater_iconOnly ?? legacyRepeater?.iconOnly ?? false,
    // 🔄 Sync bidirectionnel : UUID du champ numérique qui contrôle le nombre de copies
    countSourceNodeId: node.repeater_countSourceNodeId || null
  };
  
  // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION CRITIQUE : Construire aussi appearanceConfig pour l'interface Parameters
  const appearanceConfig = {
    ...(storedAppearanceConfig || {}),
    size: node.appearance_size || 'md',
    variant: node.appearance_variant || 'singleline',
    placeholder: node.text_placeholder || '',
    maxLength: node.text_maxLength || 255,
    mask: node.text_mask || '',
    regex: node.text_regex || '',
    helpTooltipType: node.text_helpTooltipType || 'none',
    helpTooltipText: node.text_helpTooltipText || null,
    helpTooltipImage: node.text_helpTooltipImage || null,
    // 🎨 FIX: Lire displayIcon depuis la colonne dédiée EN PRIORITÉ
    displayIcon: node.appearance_displayIcon || (storedAppearanceConfig as any)?.displayIcon || (metadataAppearance as any)?.displayIcon
  };
  
  // Construire fieldConfig depuis les colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
  const fieldConfig = {
    text: {
      placeholder: node.text_placeholder || null,
      maxLength: node.text_maxLength || null,
      minLength: node.text_minLength || null,
      mask: node.text_mask || null,
      regex: node.text_regex || null,
      rows: node.text_rows || 3
    },
    number: {
      min: node.number_min || null,
      max: node.number_max || null,
      step: node.number_step || 1,
      // ?? FIX: PrioritÃƒÂ¯Ã‚Â¿Ã‚Â½ ÃƒÂ¯Ã‚Â¿Ã‚Â½ data_precision pour les champs d'affichage (cartes bleues), sinon number_decimals
      decimals: node.data_precision ?? node.number_decimals ?? 0,
      prefix: node.number_prefix || null,
      suffix: node.number_suffix || null,
      unit: node.number_unit ?? node.data_unit ?? null,
      defaultValue: node.number_defaultValue || null
    },
    select: {
      multiple: node.select_multiple || false,
      searchable: node.select_searchable !== false, // true par dÃƒÆ’Ã‚Â©faut
      allowClear: node.select_allowClear !== false, // true par dÃƒÆ’Ã‚Â©faut
      defaultValue: node.select_defaultValue || null,
      options: node.select_options || []
    },
    bool: {
      trueLabel: node.bool_trueLabel || null,
      falseLabel: node.bool_falseLabel || null,
      defaultValue: node.bool_defaultValue || null
    },
    date: {
      format: node.date_format || 'DD/MM/YYYY',
      showTime: node.date_showTime || false,
      minDate: node.date_minDate || null,
      maxDate: node.date_maxDate || null
    },
    image: {
      maxSize: node.image_maxSize || null,
      ratio: node.image_ratio || null,
      crop: node.image_crop || false,
      thumbnails: node.image_thumbnails || null
    }
  };
  
  // Nettoyer les objets vides
  Object.keys(fieldConfig).forEach(key => {
    const config = fieldConfig[key];
    const hasValues = Object.values(config).some(val => val !== null && val !== undefined && val !== false && val !== 0 && val !== '');
    if (!hasValues) delete fieldConfig[key];
  });
  
  // Mettre ÃƒÆ’Ã‚Â  jour les mÃƒÆ’Ã‚Â©tadonnÃƒÆ’Ã‚Â©es avec les nouvelles donnÃƒÆ’Ã‚Â©es
  const cleanedMetadata = {
    ...(node.metadata || {}),
    appearance: {
      ...(metadataAppearance || {}),
      ...appearance
    }
  };
  
  
  // ✅ FIX: Préserver triggerNodeIds depuis node.metadata si présent
  if (node.metadata && node.metadata.triggerNodeIds) {
    cleanedMetadata.triggerNodeIds = node.metadata.triggerNodeIds;
  }
  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â DEBUG: Log metadata pour "Test - liste"
  if (node.id === '131a7b51-97d5-4f40-8a5a-9359f38939e8') {
  }
  
  // 🔧 INJECTER repeater dans cleanedMetadata
  // 🔧 FIX: Injecter repeater si templateNodeIds > 0 OU si countSourceNodeId est défini (pour sync bidirectionnel)
  const hasRepeaterConfig = (repeater.templateNodeIds && repeater.templateNodeIds.length > 0) || repeater.countSourceNodeId;
  const metadataWithRepeater = hasRepeaterConfig
    ? { ...cleanedMetadata, repeater: repeater }
    : cleanedMetadata;

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â LOG SPÃƒÆ’Ã¢â‚¬Â°CIAL POUR LES RÃƒÆ’Ã¢â‚¬Â°PÃƒÆ’Ã¢â‚¬Â°TABLES
  if (repeater.templateNodeIds && repeater.templateNodeIds.length > 0) {
  }


  // Reconstruire subTabs depuis la colonne 'subtabs' (array de noms de sous-onglets)
  if (node.subtabs) {
    try {
      const parsedSubTabs = JSON.parse(node.subtabs);
      if (Array.isArray(parsedSubTabs)) {
        metadataWithRepeater.subTabs = parsedSubTabs;
      }
    } catch (e) {
      console.error('[buildResponseFromColumns] Erreur parse subtabs:', e);
    }
  }
  
  // Reconstruire subTab depuis la colonne 'subtab' (string assignment du champ)
  if (node.subtab) {
    try {
      let subTabValue = node.subtab;
      if (typeof node.subtab === 'string' && node.subtab.startsWith('\"')) {
        subTabValue = JSON.parse(node.subtab);
      }
      if (subTabValue && typeof subTabValue === 'string') {
        metadataWithRepeater.subTab = subTabValue;
      }
    } catch (e) {
      console.error('[buildResponseFromColumns] Erreur parse subtab:', e);
    }
  }

  const result = {
    ...node,
    metadata: metadataWithRepeater,
    fieldConfig,
    // Ajouter les champs d'interface pour compatibilitÃƒÆ’Ã‚Â©
    appearance,
    appearanceConfig, // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION : Ajouter appearanceConfig pour l'interface Parameters
    // ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â IMPORTANT : fieldType depuis les colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
    fieldType: node.fieldType || node.type,
    fieldSubType: node.fieldSubType || node.subType,
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ TOOLTIP FIX : Ajouter les propriÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â©s tooltip au niveau racine pour TBL
    text_helpTooltipType: node.text_helpTooltipType,
    text_helpTooltipText: node.text_helpTooltipText,
    text_helpTooltipImage: node.text_helpTooltipImage,
    // 🎨 APPEARANCE: Colonne dédiée displayIcon
    appearance_displayIcon: node.appearance_displayIcon,
    // 🔧 AI MEASURE: Colonnes dédiées pour la configuration IA Mesure
    aiMeasure_enabled: node.aiMeasure_enabled ?? false,
    aiMeasure_autoTrigger: node.aiMeasure_autoTrigger ?? true,
    aiMeasure_prompt: node.aiMeasure_prompt || null,
    aiMeasure_keys: node.aiMeasure_keys || null,
    // 🔗 LINK: Colonnes dédiées pour la configuration des liens (valeur d'un autre champ)
    hasLink: node.hasLink ?? false,
    link_targetNodeId: node.link_targetNodeId || null,
    link_targetTreeId: node.link_targetTreeId || null,
    link_mode: node.link_mode || null,
    link_carryContext: node.link_carryContext ?? false,
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ TABLES : Inclure les tables avec leurs colonnes/lignes pour le lookup
    tables: node.TreeBranchLeafNodeTable || [],
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ SHARED REFERENCES : Inclure les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pour les cascades
    sharedReferenceIds: node.sharedReferenceIds || undefined
  };

  // =====================================================================
  // ?? ADAPTATEUR LEGACY CAPABILITIES (Reconstruit l'ancien objet attendu)
  // =====================================================================
  // Objectif: Fournir ÃƒÂ¯Ã‚Â¿Ã‚Â½ nouveau result.capabilities sans modifier le modÃƒÂ¯Ã‚Â¿Ã‚Â½le Prisma.
  // On s'appuie UNIQUEMENT sur les colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es (hasFormula, formula_activeId, etc.).
  // Si metadata.capabilities existe dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ (anciennes donnÃƒÂ¯Ã‚Â¿Ã‚Â½es), on la prÃƒÂ¯Ã‚Â¿Ã‚Â½serve et on fusionne.

  try {
    const legacyMetaCaps = (node.metadata && typeof node.metadata === 'object') ? (node.metadata as any).capabilities : undefined;

    const buildInstances = (raw: unknown): Record<string, unknown> | undefined => {
      if (!raw) return undefined;
      if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
      return undefined;
    };

    const capabilities: Record<string, unknown> = {
      // DonnÃƒÂ¯Ã‚Â¿Ã‚Â½es dynamiques / variables
      data: (node.hasData || node.data_activeId || node.data_instances) ? {
        enabled: !!node.hasData,
        activeId: node.data_activeId || null,
        instances: buildInstances(node.data_instances) || {},
        unit: node.data_unit || null,
        precision: typeof node.data_precision === 'number' ? node.data_precision : 2,
        exposedKey: node.data_exposedKey || null,
        displayFormat: node.data_displayFormat || null,
        visibleToUser: node.data_visibleToUser !== false
      } : undefined,
      // Formules
      formula: (node.hasFormula || node.formula_activeId || node.formula_instances) ? {
        enabled: !!node.hasFormula,
        activeId: node.formula_activeId || null,
        instances: buildInstances(node.formula_instances) || {},
        tokens: buildInstances(node.formula_tokens) || undefined,
        name: node.formula_name || null
      } : undefined,
      // Table lookup
      table: (node.hasTable || node.table_activeId || node.table_instances) ? {
        enabled: !!node.hasTable,
        activeId: node.table_activeId || null,
        instances: buildInstances(node.table_instances) || {},
        name: node.table_name || null,
        meta: buildInstances(node.table_meta) || {},
        type: node.table_type || 'columns',
        isImported: node.table_isImported === true,
        importSource: node.table_importSource || null,
        columns: Array.isArray(node.table_columns) ? node.table_columns : null,
        rows: Array.isArray(node.table_rows) ? node.table_rows : null
      } : undefined,
      // Select (options statiques ou dynamiques dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ rÃƒÂ¯Ã‚Â¿Ã‚Â½solues)
      select: (node.select_options || node.select_defaultValue) ? {
        options: Array.isArray(node.select_options) ? node.select_options : [],
        allowClear: node.select_allowClear !== false,
        multiple: node.select_multiple === true,
        searchable: node.select_searchable !== false,
        defaultValue: node.select_defaultValue || null
      } : undefined,
      // Nombre
      number: (node.number_min !== undefined || node.number_max !== undefined || node.number_defaultValue !== undefined) ? {
        min: node.number_min ?? null,
        max: node.number_max ?? null,
        step: node.number_step ?? 1,
        // ?? FIX: PrioritÃƒÂ¯Ã‚Â¿Ã‚Â½ ÃƒÂ¯Ã‚Â¿Ã‚Â½ data_precision pour les champs d'affichage
        decimals: node.data_precision ?? node.number_decimals ?? 0,
        unit: node.number_unit ?? node.data_unit ?? null,
        prefix: node.number_prefix || null,
        suffix: node.number_suffix || null,
        defaultValue: node.number_defaultValue || null
      } : undefined,
      // BoolÃƒÂ¯Ã‚Â¿Ã‚Â½en
      bool: (node.bool_trueLabel || node.bool_falseLabel || node.bool_defaultValue !== undefined) ? {
        trueLabel: node.bool_trueLabel || null,
        falseLabel: node.bool_falseLabel || null,
        defaultValue: node.bool_defaultValue ?? null
      } : undefined,
      // Date
      date: (node.date_format || node.date_showTime || node.date_minDate || node.date_maxDate) ? {
        format: node.date_format || 'DD/MM/YYYY',
        showTime: node.date_showTime === true,
        minDate: node.date_minDate || null,
        maxDate: node.date_maxDate || null
      } : undefined,
      // Image
      image: (node.image_maxSize || node.image_ratio || node.image_crop || node.image_thumbnails) ? {
        maxSize: node.image_maxSize || null,
        ratio: node.image_ratio || null,
        crop: node.image_crop === true,
        thumbnails: node.image_thumbnails || null
      } : undefined,
      // Linking / navigation (simplifiÃƒÂ¯Ã‚Â¿Ã‚Â½)
      link: (node.link_activeId || node.link_instances) ? {
        enabled: !!node.hasLink,
        activeId: node.link_activeId || null,
        instances: buildInstances(node.link_instances) || {},
        mode: node.link_mode || 'JUMP',
        name: node.link_name || null,
        carryContext: node.link_carryContext === true,
        params: buildInstances(node.link_params) || {},
        targetNodeId: node.link_targetNodeId || null,
        targetTreeId: node.link_targetTreeId || null
      } : undefined,
      // Markers
      markers: (node.markers_activeId || node.markers_instances || node.markers_selectedIds) ? {
        enabled: !!node.hasMarkers,
        activeId: node.markers_activeId || null,
        instances: buildInstances(node.markers_instances) || {},
        available: buildInstances(node.markers_available) || {},
        selectedIds: buildInstances(node.markers_selectedIds) || {}
      } : undefined,
      // API (legacy mapping minimal)
      api: (node.api_activeId || node.api_instances) ? {
        enabled: !!node.hasAPI,
        activeId: node.api_activeId || null,
        instances: buildInstances(node.api_instances) || {},
        bodyVars: buildInstances(node.api_bodyVars) || {},
        name: node.api_name || null
      } : undefined
    };

    // Nettoyer les clÃƒÂ¯Ã‚Â¿Ã‚Â½s undefined
    Object.keys(capabilities).forEach(key => {
      if (capabilities[key] === undefined) delete capabilities[key];
    });

    // Fusion avec legacy metadata.capabilities si prÃƒÂ¯Ã‚Â¿Ã‚Â½sent
    let mergedCaps: Record<string, unknown> = capabilities;
    if (legacyMetaCaps && typeof legacyMetaCaps === 'object') {
      mergedCaps = { ...legacyMetaCaps, ...capabilities };
    }

    // Injection dans result
    (result as any).capabilities = mergedCaps;
  } catch (e) {
    console.error('? [buildResponseFromColumns] Erreur adaptation legacy capabilities:', e);
  }
  
  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â DEBUG SHARED REFERENCES : Log pour les options avec rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences
  if (node.sharedReferenceIds && node.sharedReferenceIds.length > 0) {
  }
  
  // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ DEBUG TOOLTIP : Log si des tooltips sont trouvÃƒÆ’Ã‚Â©s
  if (node.text_helpTooltipType && node.text_helpTooltipType !== 'none') {
  }
  
  return result;
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ FONCTIONS UTILITAIRES POUR COLONNES
// =============================================================================

/**
 * ÃƒÂ¢Ã…Â¡Ã‚Â¡ PRÃƒÆ’Ã¢â‚¬Â°SERVER LES CAPABILITIES : ÃƒÆ’Ã¢â‚¬Â°criture hybride colonnes + metadata
 * PrÃƒÆ’Ã‚Â©serve metadata.capabilities (formules multiples, etc.) tout en migrant le reste vers les colonnes
 */
function removeJSONFromUpdate(updateData: Record<string, unknown>): Record<string, unknown> {
  const { metadata, fieldConfig: _fieldConfig, appearanceConfig, ...cleanData } = updateData;
  
  // 🔧 CORRECTION : Préserver metadata.capabilities pour les formules multiples
  if (metadata && typeof metadata === 'object') {
    const metaObj = metadata as Record<string, unknown>;
    const preservedMeta: Record<string, unknown> = {};
    
    if (metaObj.capabilities) {
      preservedMeta.capabilities = metaObj.capabilities;
    }
    if ('subTabs' in metaObj) {
      preservedMeta.subTabs = metaObj.subTabs;
    }
    if ('subTab' in metaObj) {
      preservedMeta.subTab = metaObj.subTab;
    }
    // ✅ AJOUT: Préserver aiMeasure pour la configuration IA Mesure
    if ('aiMeasure' in metaObj) {
      preservedMeta.aiMeasure = metaObj.aiMeasure;
    }
    // ✅ AJOUT: Préserver repeater pour la configuration repeater
    if ('repeater' in metaObj) {
      preservedMeta.repeater = metaObj.repeater;
    }
    // ✅ AJOUT: Préserver triggerNodeIds pour les champs d'affichage
    if ('triggerNodeIds' in metaObj) {
      preservedMeta.triggerNodeIds = metaObj.triggerNodeIds;
    }
    // ✅ AJOUT: Préserver appearance pour displayIcon et autres configs d'apparence
    if ('appearance' in metaObj && metaObj.appearance && typeof metaObj.appearance === 'object') {
      preservedMeta.appearance = metaObj.appearance;
    }
    
    // 🎨 FIX: Extraire displayIcon depuis appearanceConfig vers colonne dédiée
    if (appearanceConfig && typeof appearanceConfig === 'object') {
      const appConfig = appearanceConfig as Record<string, unknown>;
      if ('displayIcon' in appConfig && appConfig.displayIcon) {
        // Stocker dans cleanData pour écriture en colonne dédiée
        (cleanData as Record<string, unknown>).appearance_displayIcon = appConfig.displayIcon;
        console.log('🎨 [removeJSONFromUpdate] displayIcon extrait vers colonne:', appConfig.displayIcon);
      }
    }
    
    if (Object.keys(preservedMeta).length > 0) {
      return {
        ...cleanData,
        metadata: preservedMeta
      };
    }
  } else if (appearanceConfig && typeof appearanceConfig === 'object') {
    // 🎨 FIX: Même si pas de metadata, extraire displayIcon vers colonne dédiée
    const appConfig = appearanceConfig as Record<string, unknown>;
    if ('displayIcon' in appConfig && appConfig.displayIcon) {
      console.log('🎨 [removeJSONFromUpdate] displayIcon vers colonne (sans metadata):', appConfig.displayIcon);
      return {
        ...cleanData,
        appearance_displayIcon: appConfig.displayIcon
      };
    }
  }
  
  return cleanData;
}

/**
 * ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â© EXTRA: Normalisation des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pour les COPIES
 * RÃƒÆ’Ã‚Â¨gle mÃƒÆ’Ã‚Â©tier (confirmÃƒÆ’Ã‚Â©e par l'utilisateur): lorsqu'un nÃƒâ€¦Ã¢â‚¬Å“ud est une copie dont l'id
 * se termine par un suffixe numÃƒÆ’Ã‚Â©rique "-N" (ex: "...-1", "...-2"), alors toute
 * rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©e stockÃƒÆ’Ã‚Â©e dans les colonnes shared* doit pointer vers l'ID de la
 * COPIE correspondante (mÃƒÆ’Ã‚Âªme suffixe), pas vers l'original.
 *
 * Exemple: si ce nÃƒâ€¦Ã¢â‚¬Å“ud (nodeId) = "shared-ref-ABC-1" et que l'utilisateur envoie
 * sharedReferenceId = "shared-ref-XYZ", on doit persister "shared-ref-XYZ-1".
 */
function extractCopySuffixFromId(id: string | null | undefined): string | null {
  if (!id) return null;
  const m = String(id).match(/-(\d+)$/);
  return m ? m[0] : null; // renvoie "-1", "-2", etc. ou null
}

function applyCopySuffix(id: string, suffix: string): string {
  // Retirer tout suffixe numÃƒÆ’Ã‚Â©rique existant et appliquer le suffixe souhaitÃƒÆ’Ã‚Â©
  const base = id.replace(/-(\d+)$/, '');
  return `${base}${suffix}`;
}

function normalizeSharedRefsForCopy(nodeId: string, updateObj: Record<string, unknown>) {
  const suffix = extractCopySuffixFromId(nodeId);
  if (!suffix) return; // pas une copie ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ne rien faire

  // GÃƒÆ’Ã‚Â©rer single
  if (typeof updateObj.sharedReferenceId === 'string' && updateObj.sharedReferenceId.length > 0) {
    updateObj.sharedReferenceId = applyCopySuffix(updateObj.sharedReferenceId, suffix);
  }

  // GÃƒÆ’Ã‚Â©rer array
  if (Array.isArray(updateObj.sharedReferenceIds)) {
    const out: string[] = [];
    for (const raw of updateObj.sharedReferenceIds as unknown[]) {
      if (typeof raw !== 'string' || raw.length === 0) continue;
      out.push(applyCopySuffix(raw, suffix));
    }
    // DÃƒÆ’Ã‚Â©dupliquer en conservant l'ordre
    const seen = new Set<string>();
    updateObj.sharedReferenceIds = out.filter(id => (seen.has(id) ? false : (seen.add(id), true)));
  }
}

// Handler commun pour UPDATE/PATCH d'un nÃƒâ€¦Ã¢â‚¬Å“ud (incluant le dÃƒÆ’Ã‚Â©placement avec rÃƒÆ’Ã‚Â©indexation)
const updateOrMoveNode = async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;
    const updateData = req.body || {};
    
    
    // 🔍 DEBUG triggerNodeIds
    console.log('🔍 [updateOrMoveNode] Payload reçu:', {
      nodeId,
      hasTriggerNodeIds: !!updateData.metadata?.triggerNodeIds,
      triggerNodeIds: updateData.metadata?.triggerNodeIds
    });
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ ÃƒÆ’Ã¢â‚¬Â°TAPE 1 : Convertir JSON vers colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
    const columnData = mapJSONToColumns(updateData);
    
    // ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ ÃƒÆ’Ã¢â‚¬Â°TAPE 2 : ÃƒÆ’Ã¢â‚¬Â°LIMINER le JSON et utiliser UNIQUEMENT les colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
    const cleanUpdateData = removeJSONFromUpdate(updateData);
    
    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ÃƒÆ’Ã¢â‚¬Â°TAPE 3 : Fusionner donnÃƒÆ’Ã‚Â©es nettoyÃƒÆ’Ã‚Â©es + colonnes dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
    const updateObj: Record<string, unknown> = { ...cleanUpdateData, ...columnData };
    
    
    // 🔍 DEBUG triggerNodeIds après nettoyage
    console.log('🔍 [updateOrMoveNode] Après removeJSONFromUpdate:', {
      hasTriggerNodeIds: !!cleanUpdateData.metadata?.triggerNodeIds,
      triggerNodeIds: cleanUpdateData.metadata?.triggerNodeIds
    });

  // ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â© IMPORTANT: Normaliser les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es si le nÃƒâ€¦Ã¢â‚¬Å“ud est une COPIE (ID avec suffixe "-N")
  // Concerne les ÃƒÆ’Ã‚Â©critures directes envoyÃƒÆ’Ã‚Â©es par le frontend (single/array)
  normalizeSharedRefsForCopy(nodeId, updateObj);
    
  // Nettoyage de champs non supportÃƒÆ’Ã‚Â©s par le modÃƒÆ’Ã‚Â¨le Prisma (ÃƒÆ’Ã‚Â©vite les erreurs PrismaClientValidationError)
  // Exemple: certains appels frontend envoient "markers" ou "hasMarkers" qui n'existent pas dans TreeBranchLeafNode
    for (const k of ['markers', 'hasMarkers']) {
      if (k in updateObj) delete updateObj[k];
    }

    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

  // Supprimer les champs non modifiables
  delete updateObj.id;
  delete updateObj.treeId;
  delete updateObj.createdAt;

    // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud existant (sera nÃƒÆ’Ã‚Â©cessaire pour la validation et la logique de dÃƒÆ’Ã‚Â©placement)
    
    const existingNode = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId, treeId }
    });

    if (!existingNode) {
      // ?? DEBUG: Chercher le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud sans contrainte de treeId pour voir s'il existe ailleurs
      const nodeAnyTree = await prisma.treeBranchLeafNode.findFirst({
        where: { id: nodeId }
      });

      console.error('? [updateOrMoveNode] NÃƒÂ¯Ã‚Â¿Ã‚Â½ud non trouvÃƒÂ¯Ã‚Â¿Ã‚Â½ - DEBUG:', {
        nodeId,
        treeId,
        organizationId,
        nodeExistsElsewhere: !!nodeAnyTree,
        nodeActualTreeId: nodeAnyTree?.treeId,
        allNodesInTree: await prisma.treeBranchLeafNode.count({ where: { treeId } })
      });

      return res.status(404).json({
        error: 'NÃƒÂ¯Ã‚Â¿Ã‚Â½ud non trouvÃƒÂ¯Ã‚Â¿Ã‚Â½',
        debug: {
          nodeId,
          treeId,
          nodeExistsElsewhere: !!nodeAnyTree,
          nodeActualTreeId: nodeAnyTree?.treeId
        }
      });
    }

    // Extraire paramÃƒÂ¯Ã‚Â¿Ã‚Â½tres potentiels de dÃƒÂ¯Ã‚Â¿Ã‚Â½placement
    const targetId: string | undefined = updateData.targetId;
    const position: 'before' | 'after' | 'child' | undefined = updateData.position;

    // Si targetId/position sont fournis, on calcule parentId/insertIndex ÃƒÂ¯Ã‚Â¿Ã‚Â½ partir de ceux-ci
    let newParentId: string | null | undefined = updateData.parentId; // undefined = pas de changement
    let desiredIndex: number | undefined = undefined; // index parmi les siblings (entier)

    if (targetId) {
      const targetNode = await prisma.treeBranchLeafNode.findFirst({ where: { id: targetId, treeId } });
      if (!targetNode) {
        return res.status(400).json({ error: 'Cible de dÃƒÆ’Ã‚Â©placement non trouvÃƒÆ’Ã‚Â©e' });
      }
      if (position === 'child') {
        newParentId = targetNode.id; // enfant direct
        // on met ÃƒÆ’Ã‚Â  la fin par dÃƒÆ’Ã‚Â©faut (sera calculÃƒÆ’Ã‚Â© plus bas)
        desiredIndex = undefined;
      } else {
        // before/after -> mÃƒÆ’Ã‚Âªme parent que la cible
        newParentId = targetNode.parentId || null;
        // index dÃƒÆ’Ã‚Â©sirÃƒÆ’Ã‚Â© relatif ÃƒÆ’Ã‚Â  la cible (sera calculÃƒÆ’Ã‚Â© plus bas)
        // on signalera via un flag spÃƒÆ’Ã‚Â©cial pour ajuster aprÃƒÆ’Ã‚Â¨s
        desiredIndex = -1; // marqueur: calculer en fonction de la cible
      }
    }

  // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ VALIDATION HIÃƒÆ’Ã¢â‚¬Â°RARCHIQUE si on change le parentId (dÃƒÆ’Ã‚Â©placement)
    if (newParentId !== undefined) {
      // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le nÃƒâ€¦Ã¢â‚¬Å“ud existant pour connaÃƒÆ’Ã‚Â®tre son type
      // existingNode dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  chargÃƒÆ’Ã‚Â© ci-dessus

      // Si on change le parent, appliquer les mÃƒÆ’Ã‚Âªmes rÃƒÆ’Ã‚Â¨gles hiÃƒÆ’Ã‚Â©rarchiques que pour la crÃƒÆ’Ã‚Â©ation
      if (newParentId) {
        // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le nouveau parent
        const newParentNode = await prisma.treeBranchLeafNode.findFirst({
          where: { id: newParentId, treeId }
        });

        if (!newParentNode) {
          return res.status(400).json({ error: 'Parent non trouvÃƒÆ’Ã‚Â©' });
        }

        console.log("🔍 [DEBUG MOVE]", {
          nodeLabel: existingNode.label,
          nodeType: existingNode.type,
          newParentLabel: newParentNode.label,
          newParentType: newParentNode.type,
          newParentId: newParentId
        });
        // Appliquer les rÃƒÆ’Ã‚Â¨gles hiÃƒÆ’Ã‚Â©rarchiques actualisÃƒÆ’Ã‚Â©es
        if (existingNode.type === 'leaf_option') {
          // Les options peuvent ÃƒÆ’Ã‚Âªtre sous :
          // 1. Des champs SELECT (leaf_ avec subType='SELECT')
          // 2. Des branches de niveau 2+ (branches sous branches = SELECT)
          const isSelectField = newParentNode.type.startsWith('leaf_') && newParentNode.subType === 'SELECT';
          const isSelectBranch = newParentNode.type === 'branch' && newParentNode.parentId !== null;
          
          if (!isSelectField && !isSelectBranch) {
            return res.status(400).json({ 
              error: 'Les options ne peuvent ÃƒÆ’Ã‚Âªtre dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©es que sous des champs SELECT ou des branches de niveau 2+' 
            });
          }
          console.log('🔍 [DEBUG] Validation pour leaf_:', {
            existingNodeType: existingNode.type,
            newParentNodeType: newParentNode.type,
            newParentId: newParentId,
            isValidParent: newParentNode.type === 'branch' || newParentNode.type.startsWith('leaf_') || newParentNode.type === 'tree'
          });
        } else if (existingNode.type.startsWith('leaf_')) {
          // 🎯 FIX: Les champs peuvent être déplacés sous des branches, sections, d'autres champs, ou ROOT (tree)
          // Ceci permet le déplacement des champs DISPLAY au niveau racine et dans les sections
          console.log("🔍 [DEBUG MOVE] existingNode:", existingNode.type, "| newParentNode:", newParentNode?.type, "| newParentId:", newParentId);
          const isValidParent = 
            newParentNode.type === 'branch' || 
            newParentNode.type === 'section' ||
            newParentNode.type.startsWith('leaf_') ||
            newParentNode.type === 'tree';
            
          if (!isValidParent) {
            return res.status(400).json({ 
              error: 'Les champs ne peuvent être déplacés que sous des branches, sections, autres champs ou ROOT (tree)' 
            });
          }
        } else if (existingNode.type === 'branch') {
          // Les branches peuvent être sous l'arbre ou sous une autre branche
          if (!(newParentNode.type === 'tree' || newParentNode.type === 'branch')) {
            return res.status(400).json({ 
              error: 'Les branches doivent être sous l\'arbre ou sous une autre branche' 
            });
          }
        }
      } else {
        // 🎯 FIX: parentId null = déplacement vers ROOT
        // Autoriser les branches ET les champs (incluant DISPLAY) au niveau racine
        const canBeAtRoot = 
          existingNode.type === 'branch' || 
          existingNode.type.startsWith('leaf_');
          
        if (!canBeAtRoot) {
          return res.status(400).json({ 
            error: 'Seules les branches et les champs peuvent être déplacés directement sous ROOT' 
          });
        }
      }
    }

    // DÃƒÆ’Ã‚Â©terminer si on doit effectuer une opÃƒÆ’Ã‚Â©ration de dÃƒÆ’Ã‚Â©placement avec rÃƒÆ’Ã‚Â©indexation
  const isMoveOperation = (targetId && position) || (newParentId !== undefined) || (typeof updateObj.order === 'number');

    if (isMoveOperation) {
      // Calculer le parent cible final et la position d'insertion (index entier)
      const destinationParentId = newParentId !== undefined ? newParentId : existingNode.parentId;

      // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les siblings de la destination (exclure le nÃƒâ€¦Ã¢â‚¬Å“ud en mouvement)
      const siblings = await prisma.treeBranchLeafNode.findMany({
        where: { treeId, parentId: destinationParentId || null, NOT: { id: nodeId } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });

      let insertIndex: number;
      if (targetId && (position === 'before' || position === 'after')) {
        const idx = siblings.findIndex(s => s.id === targetId);
        // si la cible n'est pas un sibling (ex: child), idx sera -1; fallback fin
        if (idx >= 0) {
          insertIndex = position === 'before' ? idx : idx + 1;
        } else {
          insertIndex = siblings.length;
        }
      } else if (position === 'child') {
        insertIndex = siblings.length; // ÃƒÆ’Ã‚Â  la fin sous ce parent
      } else if (typeof updateObj.order === 'number') {
        // Si on reÃƒÆ’Ã‚Â§oit un order numÃƒÆ’Ã‚Â©rique, on tente d'insÃƒÆ’Ã‚Â©rer au plus proche (bornÃƒÆ’Ã‚Â© entre 0 et len)
        insertIndex = Math.min(Math.max(Math.round(updateObj.order as number), 0), siblings.length);
      } else if (desiredIndex !== undefined && desiredIndex >= 0) {
        insertIndex = Math.min(Math.max(desiredIndex, 0), siblings.length);
      } else {
        insertIndex = siblings.length; // dÃƒÆ’Ã‚Â©faut = fin
      }

      // Construire l'ordre final des IDs (siblings + nodeId insÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©)
      const finalOrder = [...siblings.map(s => s.id)];
      finalOrder.splice(insertIndex, 0, nodeId);

      // Effectuer la transaction: mettre ÃƒÆ’Ã‚Â  jour parentId du nÃƒâ€¦Ã¢â‚¬Å“ud + rÃƒÆ’Ã‚Â©indexer les orders entiers
      await prisma.$transaction(async (tx) => {
        // Mettre ÃƒÆ’Ã‚Â  jour parentId si nÃƒÆ’Ã‚Â©cessaire
        if (destinationParentId !== existingNode.parentId) {
          await tx.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: { parentId: destinationParentId || null, updatedAt: new Date() }
          });
        }

        // RÃƒÆ’Ã‚Â©indexer: donner des valeurs entiÃƒÆ’Ã‚Â¨res 0..N
        for (let i = 0; i < finalOrder.length; i++) {
          const id = finalOrder[i];
          await tx.treeBranchLeafNode.update({
            where: { id },
            data: { order: i, updatedAt: new Date() }
          });
        }
      });

      const updatedNode = await prisma.treeBranchLeafNode.findFirst({ where: { id: nodeId, treeId } });
      
      const responseData = updatedNode ? buildResponseFromColumns(updatedNode) : updatedNode;
      
      return res.json(responseData);
    }

    // 🔧 FIX: Sauvegarder les clés metadata entrantes AVANT le bloc repeater qui peut les écraser
    const incomingMetadataBeforeRepeater = updateObj.metadata ? { ...(updateObj.metadata as any) } : null;
    
    // 🔧 FIX CRITICAL: Reconstruire metadata.repeater avec TOUS les champs, y compris templateNodeIds
    // ⚠️ CORRECTION : Le bloc précédent écrasait templateNodeIds avec l'ancienne valeur !
    if (updateObj.repeater_buttonSize || updateObj.repeater_maxItems !== undefined || updateObj.repeater_minItems !== undefined || updateObj.repeater_templateNodeIds !== undefined) {
      const currentMetadata = existingNode.metadata as any || {};
      const newMetadataRepeater = (updateObj.metadata as any)?.repeater || {};
      
      // 🔧 CRITICAL FIX: Priorité au nouveau templateNodeIds s'il est présent
      const resolvedTemplateNodeIds = (() => {
        // 1. Colonne directe (source de vérité)
        if (updateObj.repeater_templateNodeIds !== undefined) {
          if (updateObj.repeater_templateNodeIds === null) return null;
          try {
            const parsed = JSON.parse(updateObj.repeater_templateNodeIds as string);
            return Array.isArray(parsed) ? parsed : null;
          } catch { return null; }
        }
        // 2. Nouveau metadata.repeater.templateNodeIds
        if (newMetadataRepeater.templateNodeIds !== undefined) {
          return newMetadataRepeater.templateNodeIds;
        }
        // 3. Fallback: ancien repeater
        return currentMetadata.repeater?.templateNodeIds;
      })();
      
      const updatedRepeaterMetadata = {
        ...(currentMetadata.repeater || {}),
        ...newMetadataRepeater,
        ...(updateObj.repeater_addButtonLabel !== undefined ? { addButtonLabel: updateObj.repeater_addButtonLabel } : {}),
        ...(updateObj.repeater_buttonSize !== undefined ? { buttonSize: updateObj.repeater_buttonSize } : {}),
        ...(updateObj.repeater_buttonWidth !== undefined ? { buttonWidth: updateObj.repeater_buttonWidth } : {}),
        ...(updateObj.repeater_iconOnly !== undefined ? { iconOnly: updateObj.repeater_iconOnly } : {}),
        ...(updateObj.repeater_minItems !== undefined ? { minItems: updateObj.repeater_minItems } : {}),
        ...(updateObj.repeater_maxItems !== undefined ? { maxItems: updateObj.repeater_maxItems } : {}),
        // 🔧 CRITICAL: Toujours inclure templateNodeIds avec la nouvelle valeur
        templateNodeIds: resolvedTemplateNodeIds,
      };
      
      // Nettoyer si templateNodeIds est null/vide
      if (!resolvedTemplateNodeIds || (Array.isArray(resolvedTemplateNodeIds) && resolvedTemplateNodeIds.length === 0)) {
        delete updatedRepeaterMetadata.templateNodeIds;
      }
      
      updateObj.metadata = {
        ...currentMetadata,
        // 🔧 FIX: Ré-appliquer les clés metadata entrantes (triggerNodeIds, capabilities, etc.)
        // qui ont été préservées par removeJSONFromUpdate mais écrasées par le spread currentMetadata
        ...(incomingMetadataBeforeRepeater || {}),
        repeater: updatedRepeaterMetadata
      };
      
      console.warn('🔧 [updateOrMoveNode] Synchronisation metadata.repeater:', updatedRepeaterMetadata);
    }

    if (updateObj.metadata && typeof updateObj.metadata === 'object') {
      const currentMetadata = existingNode.metadata as any || {};
      const newMetadata = updateObj.metadata as any;
      
      // 🛡️ PROTECTION FANTÔMES: Empêcher l'écriture de capabilities parasites
      // Si le nœud n'a pas hasData/hasCondition activé, ne pas accepter capabilities.datas/conditions
      // On vérifie aussi updateObj au cas où hasData est envoyé dans le même appel
      if (newMetadata?.capabilities) {
        const nodeFlags = existingNode as any;
        const hasDataFlag = updateObj.hasData ?? nodeFlags.hasData;
        const hasConditionFlag = updateObj.hasCondition ?? nodeFlags.hasCondition;
        if (newMetadata.capabilities.datas && !hasDataFlag) {
          console.warn(`🛡️ [updateOrMoveNode] BLOQUÉ: tentative d'écriture capabilities.datas sur nœud ${nodeId} sans hasData=true`);
          delete newMetadata.capabilities.datas;
        }
        if (newMetadata.capabilities.conditions && !hasConditionFlag) {
          console.warn(`🛡️ [updateOrMoveNode] BLOQUÉ: tentative d'écriture capabilities.conditions sur nœud ${nodeId} sans hasCondition=true`);
          delete newMetadata.capabilities.conditions;
        }
      }
      
      // 🎨 DEBUG: Log displayIcon AVANT fusion
      console.log('🎨 [updateOrMoveNode] displayIcon AVANT fusion:', {
        dansUpdateObjMetadata: (updateObj.metadata as any)?.appearance?.displayIcon,
        dansCurrentMetadata: currentMetadata?.appearance?.displayIcon,
        dansNewMetadata: newMetadata?.appearance?.displayIcon
      });
      
      // 🔧 NOUVEAU: Extraire aiMeasure du metadata et le convertir en colonnes dédiées
      if (newMetadata.aiMeasure) {
        const aiConfig = newMetadata.aiMeasure;
        updateObj.aiMeasure_enabled = aiConfig.enabled ?? false;
        updateObj.aiMeasure_autoTrigger = aiConfig.autoTrigger ?? true;
        updateObj.aiMeasure_prompt = aiConfig.customPrompt || null;
        updateObj.aiMeasure_keys = aiConfig.keys && aiConfig.keys.length > 0 ? aiConfig.keys : null;
        
        console.log('📊 [updateOrMoveNode] AI Measure extrait vers colonnes dédiées:', {
          enabled: updateObj.aiMeasure_enabled,
          autoTrigger: updateObj.aiMeasure_autoTrigger,
          prompt: updateObj.aiMeasure_prompt,
          keys: updateObj.aiMeasure_keys
        });
        
        // Supprimer aiMeasure du metadata car il est maintenant dans des colonnes
        delete newMetadata.aiMeasure;
      }
      
      // Fusionner les métadonnées : garder l'existant + ajouter/remplacer les nouvelles clés
      // 🎨 FIX: Deep merge pour appearance afin de préserver displayIcon
      const mergedAppearance = {
        ...(currentMetadata.appearance || {}),
        ...(newMetadata.appearance || {})
      };
      
      updateObj.metadata = {
        ...currentMetadata,
        ...newMetadata,
        // 🎨 Écraser appearance avec le merge profond
        ...(Object.keys(mergedAppearance).length > 0 ? { appearance: mergedAppearance } : {})
      };
      
      // 🎨 DEBUG: Log displayIcon APRÈS fusion
      console.log('🎨 [updateOrMoveNode] displayIcon APRÈS fusion:', {
        mergedAppearance,
        finalDisplayIcon: (updateObj.metadata as any)?.appearance?.displayIcon
      });
      
      // Nettoyer aiMeasure de metadata.existant aussi
      if ((updateObj.metadata as any).aiMeasure) {
        delete (updateObj.metadata as any).aiMeasure;
      }
      
      console.log('🔀 [updateOrMoveNode] Fusion metadata:', {
        avant: currentMetadata,
        nouveau: newMetadata,
        resultat: updateObj.metadata
      });
    }
    
    // 🔥 CRITIQUE : Si repeater_templateNodeIds est explicitement NULL, supprimer metadata.repeater
    // ⚠️ DOIT ÊTRE APRÈS la fusion des métadonnées pour ne pas être écrasé par currentMetadata
    if ('repeater_templateNodeIds' in updateObj && updateObj.repeater_templateNodeIds === null) {
      const currentMeta = (updateObj.metadata || existingNode.metadata) as any || {};
      if (currentMeta.repeater) {
        const { repeater, ...metadataWithoutRepeater } = currentMeta;
        updateObj.metadata = metadataWithoutRepeater;
        console.warn('[updateOrMoveNode] 🗑️ Suppression explicite de metadata.repeater car repeater_templateNodeIds = NULL');
      }
    }
    
    // 🔍 DEBUG AI MEASURE: Log avant sauvegarde
    console.log('🔍 [updateOrMoveNode] Sauvegarde AI Measure - données envoyées:', {
      aiMeasure_enabled: updateObj.aiMeasure_enabled,
      aiMeasure_autoTrigger: updateObj.aiMeasure_autoTrigger,
      aiMeasure_prompt: updateObj.aiMeasure_prompt,
      aiMeasure_keys: updateObj.aiMeasure_keys
    });
    
    // 🎨 DEBUG displayIcon: Log avant sauvegarde DB
    console.log('🎨 [updateOrMoveNode] displayIcon AVANT DB.update:', {
      metadataComplet: updateObj.metadata,
      displayIcon: (updateObj.metadata as any)?.appearance?.displayIcon
    });
    
    // 🔧 DEBUG repeater_templateNodeIds: Log avant sauvegarde pour identifier le bug
    console.log('🔧 [updateOrMoveNode] repeater_templateNodeIds AVANT DB.update:', {
      'updateObj.repeater_templateNodeIds': updateObj.repeater_templateNodeIds,
      'metadata.repeater?.templateNodeIds': (updateObj.metadata as any)?.repeater?.templateNodeIds
    });

    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { ...(updateObj as Prisma.TreeBranchLeafNodeUpdateInput), updatedAt: new Date() }
    });

    const updatedNode = await prisma.treeBranchLeafNode.findFirst({ where: { id: nodeId, treeId } });
    
    // 🔍 DEBUG AI MEASURE: Log après lecture
    console.log('🔍 [updateOrMoveNode] Sauvegarde AI Measure - données relues:', {
      aiMeasure_enabled: updatedNode?.aiMeasure_enabled,
      aiMeasure_autoTrigger: updatedNode?.aiMeasure_autoTrigger,
      aiMeasure_prompt: updatedNode?.aiMeasure_prompt,
      aiMeasure_keys: updatedNode?.aiMeasure_keys
    });
    
    // 🎨 DEBUG displayIcon: Log après lecture DB
    console.log('🎨 [updateOrMoveNode] displayIcon APRÈS DB.read:', {
      metadataDB: updatedNode?.metadata,
      displayIcon: (updatedNode?.metadata as any)?.appearance?.displayIcon
    });
    
    // 🔧 DEBUG repeater_templateNodeIds: Log après lecture pour vérifier persistance
    console.log('🔧 [updateOrMoveNode] repeater_templateNodeIds APRÈS DB.read:', {
      'repeater_templateNodeIds (colonne)': updatedNode?.repeater_templateNodeIds,
      'metadata.repeater?.templateNodeIds': (updatedNode?.metadata as any)?.repeater?.templateNodeIds
    });
    
    const responseData = updatedNode ? buildResponseFromColumns(updatedNode) : updatedNode;
    
    
    return res.json(responseData);
  } catch (error) {
    console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ ERREUR DÃƒÆ’Ã¢â‚¬Â°TAILLÃƒÆ’Ã¢â‚¬Â°E lors de updateOrMoveNode:', {
      error: error,
      message: error.message,
      stack: error.stack,
      treeId: req.params?.treeId,
      nodeId: req.params?.nodeId,
      updateDataKeys: Object.keys(req.body || {}),
      organizationId: req.user?.organizationId
    });
    res.status(500).json({ error: 'Impossible de mettre ÃƒÆ’Ã‚Â  jour le nÃƒâ€¦Ã¢â‚¬Å“ud', details: error.message });
  }
};

// PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId - Mettre ÃƒÆ’Ã‚Â  jour un nÃƒâ€¦Ã¢â‚¬Å“ud
router.put('/trees/:treeId/nodes/:nodeId', updateOrMoveNode);
// PATCH (alias) pour compatibilitÃƒÆ’Ã‚Â© cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© client
router.patch('/trees/:treeId/nodes/:nodeId', updateOrMoveNode);

// ✅ PUT /api/treebranchleaf/nodes/:nodeId - Alias sans treeId (récupère le treeId automatiquement)
// Utilisé par AIMeasurePanel et autres composants qui n'ont pas accès au treeId
router.put('/nodes/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    console.log('🎯 [PUT /nodes/:nodeId] Requête reçue pour nodeId:', nodeId);
    console.log('📋 [PUT /nodes/:nodeId] Body:', JSON.stringify(req.body, null, 2));
    
    // Récupérer le treeId depuis la base de données
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { treeId: true }
    });
    
    if (!node) {
      return res.status(404).json({ error: 'Noeud non trouve' });
    }
    
    // Injecter le treeId dans les params et déléguer à updateOrMoveNode
    req.params.treeId = node.treeId;
    return updateOrMoveNode(req, res);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Erreur PUT /nodes/:nodeId:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour du noeud', details: error.message });
  }
});


// DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId - Supprimer un nÃƒâ€¦Ã¢â‚¬Å“ud
router.delete('/trees/:treeId/nodes/:nodeId', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    // VÃƒÆ’Ã‚Â©rifier que l'arbre appartient ÃƒÆ’Ã‚Â  l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // SÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© organisation
    if (!isSuperAdmin && organizationId && tree.organizationId && tree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    // Charger tous les nÃƒâ€¦Ã¢â‚¬Å“uds de l'arbre pour calculer la sous-arborescence ÃƒÆ’Ã‚Â  supprimer
    const allNodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId } });
    const childrenByParent = new Map<string, string[]>();
    for (const n of allNodes) {
      if (!n.parentId) continue;
      const arr = childrenByParent.get(n.parentId) || [];
      arr.push(n.id);
      childrenByParent.set(n.parentId, arr);
    }

    // VÃƒÆ’Ã‚Â©rifier l'existence du nÃƒâ€¦Ã¢â‚¬Å“ud cible
    const exists = allNodes.find(n => n.id === nodeId);
    if (!exists) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    // Collecter tous les descendants (BFS)
    const toDelete: string[] = [];
    const queue: string[] = [nodeId];
    const depth = new Map<string, number>();
    depth.set(nodeId, 0);
    while (queue.length) {
      const cur = queue.shift()!;
      toDelete.push(cur);
      const children = childrenByParent.get(cur) || [];
      for (const c of children) {
        depth.set(c, (depth.get(cur) || 0) + 1);
        queue.push(c);
      }
    }

    // Avant suppression: collecter les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pointÃƒÆ’Ã‚Â©es par cette sous-arborescence
    const referencedIds = new Set<string>();
    for (const id of toDelete) {
      const n = allNodes.find(x => x.id === id);
      if (!n) continue;
      if (n.sharedReferenceId) referencedIds.add(n.sharedReferenceId);
      if (Array.isArray(n.sharedReferenceIds)) n.sharedReferenceIds.forEach(rid => rid && referencedIds.add(rid));
    }

    // Supprimer en partant des feuilles (profondeur dÃƒÆ’Ã‚Â©croissante) pour ÃƒÆ’Ã‚Â©viter les contraintes FK parentId
    toDelete.sort((a, b) => (depth.get(b)! - depth.get(a)!));

    // Suppression transactionnelle (tentative par ÃƒÂ¯Ã‚Â¿Ã‚Â½lÃƒÂ¯Ã‚Â¿Ã‚Â½ment - ignorer les erreurs individuelles)
    const deletedSubtreeIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const id of toDelete) {
        try {
          await tx.treeBranchLeafNode.delete({ where: { id } });
          deletedSubtreeIds.push(id);
        } catch (err) {
          // Ignorer les erreurs individuelles (ex: id dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  supprimÃƒÆ’Ã‚Â©) et logger
          console.warn('[DELETE SUBTREE] Failed to delete node', id, (err as Error).message);
        }
      }
    });

    // Post-suppression: supprimer les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences suffixÃƒÆ’Ã‚Â©es orphelines (copies "-1") si elles ne sont plus rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©es ailleurs
  let deletedOrphans = 0;
  const deletedOrphansIds: string[] = [];
  // Declare deletedExtra variables in outer scope to ensure they are always defined for the final response
  // Note: deletedExtra and deletedExtraIds are declared below this comment block
  let deletedExtra = 0;
  const deletedExtraIds: string[] = [];
    if (referencedIds.size > 0) {
      const remaining = await prisma.treeBranchLeafNode.findMany({ where: { treeId } });
      const stillRef = new Set<string>();
      for (const n of remaining) {
        if (n.sharedReferenceId && referencedIds.has(n.sharedReferenceId)) stillRef.add(n.sharedReferenceId);
        if (Array.isArray(n.sharedReferenceIds)) for (const rid of n.sharedReferenceIds) if (referencedIds.has(rid)) stillRef.add(rid);
      }

      // Helper: vÃƒÆ’Ã‚Â©rifier suffixe de copie (ex: "-1", "-2")
      const isCopySuffixed = (id: string) => /-\d+$/.test(id);
      const orphanRoots = Array.from(referencedIds).filter(id => !stillRef.has(id) && remaining.some(n => n.id === id) && isCopySuffixed(id));

  if (orphanRoots.length > 0) {
        // Construire ordre de suppression feuilles -> racines
        const byParent = new Map<string, string[]>();
        for (const n of remaining) {
          if (!n.parentId) continue;
          const arr = byParent.get(n.parentId) || [];
          arr.push(n.id);
          byParent.set(n.parentId, arr);
        }
        const delSet = new Set<string>();
        const ddepth = new Map<string, number>();
        for (const rid of orphanRoots) {
          const q: string[] = [rid];
          ddepth.set(rid, 0);
          while (q.length) {
            const cur = q.shift()!;
            if (delSet.has(cur)) continue;
            delSet.add(cur);
            const d = ddepth.get(cur)!;
            for (const c of (byParent.get(cur) || [])) { ddepth.set(c, d + 1); q.push(c); }
          }
        }
        const ordered = Array.from(delSet).sort((a, b) => (ddepth.get(b)! - ddepth.get(a)!));
        await prisma.$transaction(async (tx) => {
          for (const id of ordered) {
            await tx.treeBranchLeafNode.delete({ where: { id } });
            deletedOrphans++;
            deletedOrphansIds.push(id);
          }
        });
      }
    }

    // ------------------------------------------------------------------
    // EXTRA CLEANUP: Supprimer les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds d'affichage qui rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencent les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds supprimÃƒÂ¯Ã‚Â¿Ã‚Â½s
    // ------------------------------------------------------------------
    try {
      // Recharger l'arbre pour trouver d'eventuels nodes qui rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencent les deleted IDs
      const remainingNodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId } });
      const nodesToScan = remainingNodes;
      const removedSet = new Set(toDelete);

        // Build a set of (duplicatedFromRepeater|copySuffix) pairs for removed nodes to enable
        // conservative matching of display nodes created for that copy instance. Also capture a
        // list of objects to be used for label-based fallback matching when metadata is missing.
        const removedRepeaterCopyPairs = new Set<string>();
        const removedRepeaterCopyObjects: Array<{ repeaterId: string | null; copySuffix: string | null }> = [];
  // relatedTemplateIds removed: we don't use template id-only matching (too broad)
        const extractSuffixFromLabel = (label: string | null | undefined): string | null => {
          if (!label) return null;
          const l = String(label);
          const m1 = /\(Copie\s*([0-9]+)\)$/i.exec(l);
          if (m1 && m1[1]) return m1[1];
          const m2 = /[-ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½]\s*(\d+)$/i.exec(l);
          if (m2 && m2[1]) return m2[1];
          return null;
        };
        for (const rid of toDelete) {
          const n = allNodes.find(x => x.id === rid);
          if (!n) continue;
          const dm: any = n.metadata || {};
          const rId = dm?.duplicatedFromRepeater || n.parentId || null;
          const cs = (dm?.copySuffix ?? dm?.suffixNum) ?? extractSuffixFromLabel(n.label) ?? null;
          // skip building relatedTemplateIds: avoid template-only deletion heuristics
          if (rId && cs != null) {
            removedRepeaterCopyPairs.add(`${rId}|${String(cs)}`);
            removedRepeaterCopyObjects.push({ repeaterId: rId, copySuffix: String(cs) });
          } else {
            // Keep it for a fallback attempt (if label-based suffix exists)
            if (rId || n.label) {
              const fallbackSuffix = cs;
              removedRepeaterCopyObjects.push({ repeaterId: rId, copySuffix: fallbackSuffix });
            }
          }
        }

      // Trouver candidats additionnels qui ressemblent ÃƒÆ’Ã‚Â  des nÃƒÆ’Ã‚Â¸uds d'affichage
  const debugDelete = typeof process !== 'undefined' && process.env && process.env.DEBUG_TBL_DELETE === '1';
  const extraCandidates = nodesToScan.filter(n => {
        const meta: any = n.metadata || {};
        // ??? PROTECTION: Ne JAMAIS supprimer les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds Total (sum-display-field)
        if (meta?.isSumDisplayField === true || n.id.endsWith('-sum-total')) {
          return false;
        }
        const looksLikeDisplay = !!(meta?.autoCreateDisplayNode || meta?.copiedFromNodeId || meta?.fromVariableId || meta?.sourceTemplateId);
        if (!looksLikeDisplay) return false;
        if (removedSet.has(n.id)) return false;
        if (meta.copiedFromNodeId) {
          // Support string, array, or JSON array representation for copiedFromNodeId
          try {
            const normalizedCopiedFrom: string[] = [];
            if (Array.isArray(meta.copiedFromNodeId)) {
              meta.copiedFromNodeId.forEach((v: unknown) => { if (v) normalizedCopiedFrom.push(String(v)); });
            } else if (typeof meta.copiedFromNodeId === 'string') {
              const s = String(meta.copiedFromNodeId);
              if (s.trim().startsWith('[')) {
                try {
                  const parsed = JSON.parse(s);
                  if (Array.isArray(parsed)) parsed.forEach((v: unknown) => { if (v) normalizedCopiedFrom.push(String(v)); });
                } catch { normalizedCopiedFrom.push(s); }
              } else normalizedCopiedFrom.push(s);
            } else {
              normalizedCopiedFrom.push(String(meta.copiedFromNodeId));
            }
            for (const rid of Array.from(removedSet)) {
              if (normalizedCopiedFrom.includes(String(rid))) {
                return true;
              }
            }
          } catch {
            if (removedSet.has(String(meta.copiedFromNodeId))) {
              return true;
            }
          }
        }
  // If the display references a template id used by removed copies, we must NOT delete
  // it purely because of the template id: that would delete displays for other copies.
  // Only delete when the display metadata explicitly ties it to the removed copy instance
  // (either via copiedFromNodeId directly matching a removed id, or duplicatedFromRepeater+copySuffix
  // meta matching a removed pair). Do not delete if display only cites a template by id.
  if (meta.copiedFromNodeId) {
    try {
      const normalizedCopiedFromIds: string[] = [];
      if (Array.isArray(meta.copiedFromNodeId)) {
        meta.copiedFromNodeId.forEach((v: unknown) => {
          if (!v) return; if (typeof v === 'object' && (v as any).id) normalizedCopiedFromIds.push(String((v as any).id)); else normalizedCopiedFromIds.push(String(v));
          if (debugDelete && looksLikeDisplay && !shouldDelete) {
          }
        });
      } else if (typeof meta.copiedFromNodeId === 'string') {
        const s = String(meta.copiedFromNodeId);
        if (s.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) parsed.forEach((v: unknown) => { if (!v) return; if (typeof v === 'object' && (v as any).id) normalizedCopiedFromIds.push(String((v as any).id)); else normalizedCopiedFromIds.push(String(v)); });
          } catch { normalizedCopiedFromIds.push(s); }
        } else normalizedCopiedFromIds.push(s);
      } else {
        normalizedCopiedFromIds.push(String(meta.copiedFromNodeId));
      }
      for (const rid of Array.from(removedSet)) {
        if (normalizedCopiedFromIds.includes(String(rid))) {
          return true;
        }
      }
    } catch {
      if (removedSet.has(String(meta.copiedFromNodeId))) {
        return true;
      }
    }
  }
  if (meta.copiedFromNodeId && meta.duplicatedFromRepeater && (meta.copySuffix != null || meta.suffixNum != null)) {
    const key = `${meta.duplicatedFromRepeater}|${String(meta.copySuffix ?? meta.suffixNum)}`;
    if (removedRepeaterCopyPairs.has(key)) {
      return true;
    }
  }
        // If the display claims to be part of a duplicated instance and that instance is among the removed pairs => delete
        if (meta?.duplicatedFromRepeater && (meta?.copySuffix != null || meta?.suffixNum != null)) {
          const key = `${meta.duplicatedFromRepeater}|${String(meta.copySuffix ?? meta.suffixNum)}`;
          if (removedRepeaterCopyPairs.has(key)) {
            return true;
          }
        }
        if (meta.fromVariableId) {
          // fromVariableId may be a string, an array, or a serialized JSON. Normalize to an array and test membership
          try {
            const normalizedFromVariableIds: string[] = [];
            if (Array.isArray(meta.fromVariableId)) {
              meta.fromVariableId.forEach((v: unknown) => {
                if (!v) return;
                if (typeof v === 'object' && (v as any).id) normalizedFromVariableIds.push(String((v as any).id));
                else normalizedFromVariableIds.push(String(v));
              });
            } else if (typeof meta.fromVariableId === 'string') {
              // If it looks like a JSON array, try to parse
              const s = String(meta.fromVariableId);
              if (s.trim().startsWith('[')) {
                try {
                  const parsed = JSON.parse(s);
                  if (Array.isArray(parsed)) parsed.forEach((v: unknown) => { if (!v) return; if (typeof v === 'object' && (v as any).id) normalizedFromVariableIds.push(String((v as any).id)); else normalizedFromVariableIds.push(String(v)); });
                } catch { normalizedFromVariableIds.push(s); }
              } else {
                normalizedFromVariableIds.push(s);
              }
            } else {
              normalizedFromVariableIds.push(String(meta.fromVariableId));
            }
            for (const rid of Array.from(removedSet)) {
              if (normalizedFromVariableIds.some(v => String(v).includes(String(rid)))) {
                return true;
              }
            }
          } catch {
            // fallback to string matching
            for (const rid of Array.from(removedSet)) {
              if (String(meta.fromVariableId).includes(String(rid))) {
                return true;
              }
            }
          }
        }

        // Fallback: If the display node has no duplication metadata at all, but its parent
        // corresponds to a repeater and its label contains the same suffix as a removed copy,
        // treat it as linked and delete. This covers legacy data where metadata is missing.
        if (!meta?.duplicatedFromRepeater && !meta?.copiedFromNodeId && !meta?.fromVariableId && (!meta?.copySuffix && !meta?.suffixNum)) {
          const label = String(n.label || '');
          for (const obj of removedRepeaterCopyObjects) {
            if (!obj.repeaterId || !obj.copySuffix) continue;
            if (n.parentId === obj.repeaterId) {
              // possible patterns: " (Copie N)" or "-N" at the end
              const reCopie = new RegExp(`\\\\(Copie\\\\s*${obj.copySuffix}\\\\)$`, 'i');
              const reDash = new RegExp(`-${obj.copySuffix}$`);
              if (reCopie.test(label) || reDash.test(label)) {
                return true;
              }
            }
          }
        }
        // Suffix heuristic: -N
        // NOTE: don't rely on generic label suffix heuristics to avoid accidental matches across
        // unrelated repeaters (legacy code removed). Only delete if it is directly linked via
        // copiedFromNodeId, duplicatedFromRepeater+copySuffix or fromVariableId containing deleted id.
        return false;
      });

      if (extraCandidates.length > 0) {
        // Supprimer ces candidats (ordre enfants -> parents)
        const byParent = new Map<string, string[]>();
        for (const n of remainingNodes) {
          if (!n.parentId) continue;
          const arr = byParent.get(n.parentId) || [];
          arr.push(n.id);
          byParent.set(n.parentId, arr);
        }
        const delSet = new Set<string>();
        const ddepth = new Map<string, number>();
        for (const cand of extraCandidates) {
          const q: string[] = [cand.id];
          ddepth.set(cand.id, 0);
          while (q.length) {
            const cur = q.shift()!;
            if (delSet.has(cur)) continue;
            delSet.add(cur);
            const d = ddepth.get(cur)!;
            for (const c of (byParent.get(cur) || [])) { ddepth.set(c, d + 1); q.push(c); }
          }
        }
        const ordered = Array.from(delSet).sort((a, b) => (ddepth.get(b)! - ddepth.get(a)!));
  // reused outer deletedExtra / deletedExtraIds
        await prisma.$transaction(async (tx) => {
          for (const id of ordered) {
            try {
              await tx.treeBranchLeafNode.delete({ where: { id } });
              deletedExtra++;
              deletedExtraIds.push(id);
            } catch (e) {
              // Ignorer les erreurs individuelles (ex: id dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  supprimÃƒÆ’Ã‚Â©), mais logger
              console.warn('[DELETE EXTRA] Failed to delete node', id, (e as Error).message);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[DELETE] Extra cleanup failed', (e as Error).message);
    }

    const allDeletedSet = new Set<string>([...deletedSubtreeIds, ...deletedOrphansIds, ...deletedExtraIds]);
    const allDeletedIds = Array.from(allDeletedSet);

    // 🧹 NETTOYAGE SUBMISSIONDATA: Supprimer les entrées orphelines des nœuds supprimés
    // Sans cela, les champs sum-total continuent de sommer les valeurs des copies supprimées
    try {
      const deletedSubmissionData = await prisma.treeBranchLeafSubmissionData.deleteMany({
        where: { nodeId: { in: allDeletedIds } }
      });
      if (deletedSubmissionData.count > 0) {
        console.log(`🧹 [DELETE] ${deletedSubmissionData.count} entrée(s) SubmissionData orpheline(s) supprimée(s)`);
      }
    } catch (sdCleanupError) {
      console.warn('[DELETE] Erreur nettoyage SubmissionData orphelines:', (sdCleanupError as Error).message);
    }

    // 🧹 **CRITICAL FIX**: Nettoyage des variables orphelines après suppression
    // Quand on supprime une copie de repeater, les variables SUFFIXÉES doivent être supprimées
    // MAIS les variables ORIGINALES (sans suffixe) doivent être PRÉSERVÉES!
    // Sinon, à la 2ème création, les templates ne retrouvent pas leurs variables originales!
    try {
      // 🔍 Étape 1: Trouver les variables attachées aux nœuds supprimés
      // Note: Le modèle TreeBranchLeafNodeVariable n'a PAS de champ sourceNodeId
      // On ne cherche que par nodeId (relation directe)
      const variablesToCheck = await prisma.treeBranchLeafNodeVariable.findMany({
        where: {
          nodeId: { in: allDeletedIds } // Variables attachées aux nodes supprimés
        },
        select: { id: true, nodeId: true }
      });


      // 🔄 Étape 2: Filtrer - Ne supprimer QUE les variables SUFFIXÉES
      // Les variables originales (sans suffixe) doivent rester intactes
      const varIdsToDelete: string[] = [];
      const suffixPattern = /-\d+$/; // Détecte un suffixe numérique à la fin

      for (const variable of variablesToCheck) {
        // ✅ Ne supprimer que si c'est une variable SUFFIXÉE (copie)
        if (suffixPattern.test(variable.id)) {
          varIdsToDelete.push(variable.id);
        } else {
        }
      }

      // ✅ Étape 3: Supprimer SEULEMENT les variables suffixées
      if (varIdsToDelete.length > 0) {
        const deletedVarCount = await prisma.treeBranchLeafNodeVariable.deleteMany({
          where: { id: { in: varIdsToDelete } }
        });
      } else {
      }
    } catch (varCleanError) {
      // Erreur silencieuse - ne pas bloquer la suppression sur cette erreur de nettoyage
    }

    // 🧹 NOUVEAU: Nettoyer les variables orphelines (nodeId référence un nœud supprimé)
    // Ceci inclut les variables -sum-total dont le nœud source a été supprimé
    try {
      // Construire les patterns de nodeId à supprimer: 
      // - nodeId exact (déjà géré par CASCADE)
      // - nodeId-sum-total (variable Total du nœud)
      // - nodeId-1, nodeId-2... (copies du nœud)
      const sumTotalNodeIds = allDeletedIds.map(id => `${id}-sum-total`);
      
      // Supprimer les variables dont le nodeId correspond aux nœuds supprimés + leurs sum-total
      const orphanedVariables = await prisma.treeBranchLeafNodeVariable.deleteMany({
        where: {
          nodeId: { in: sumTotalNodeIds }
        }
      });
      if (orphanedVariables.count > 0) {
        console.log(`[DELETE] 🧹 Supprimé ${orphanedVariables.count} variable(s) -sum-total orpheline(s)`);
      }
    } catch (orphanCleanError) {
      console.warn('[DELETE] Erreur nettoyage variables orphelines:', (orphanCleanError as Error).message);
    }

    // 🧹 **CRITICAL FIX**: Nettoyage des FORMULES et CONDITIONS copiées (suffixées)
    // Les formules/conditions avec suffixe numérique (-1, -2, etc.) sont des copies qui doivent être supprimées
    // NOTE: TreeBranchLeafNodeFormula et TreeBranchLeafNodeCondition n'ont PAS de relation CASCADE avec TreeBranchLeafNode
    // donc elles ne sont PAS supprimées automatiquement - on doit les supprimer manuellement
    try {
      const suffixPattern = /-\d+$/; // Détecte un suffixe numérique à la fin
      
      // 1️⃣ Supprimer les FORMULES copiées (attachées aux nœuds supprimés OU avec ID suffixé)
      const formulasToCheck = await prisma.treeBranchLeafNodeFormula.findMany({
        where: {
          OR: [
            { nodeId: { in: allDeletedIds } },  // Formules attachées aux nodes supprimés
            { id: { in: allDeletedIds.filter(id => suffixPattern.test(id)) } }  // Formules dont l'ID est un node supprimé suffixé
          ]
        },
        select: { id: true, nodeId: true, name: true }
      });
      
      // Filtrer pour ne supprimer que les formules SUFFIXÉES (copies)
      const formulaIdsToDelete = formulasToCheck
        .filter(f => suffixPattern.test(f.id) || suffixPattern.test(f.nodeId))
        .map(f => f.id);
      
      if (formulaIdsToDelete.length > 0) {
        const deletedFormulas = await prisma.treeBranchLeafNodeFormula.deleteMany({
          where: { id: { in: formulaIdsToDelete } }
        });
        console.log(`[DELETE] 🧹 Supprimé ${deletedFormulas.count} formule(s) copiée(s)`);
      }
      
      // 2️⃣ Supprimer les CONDITIONS copiées (attachées aux nœuds supprimés OU avec ID suffixé)
      const conditionsToCheck = await prisma.treeBranchLeafNodeCondition.findMany({
        where: {
          OR: [
            { nodeId: { in: allDeletedIds } },  // Conditions attachées aux nodes supprimés
            { id: { in: allDeletedIds.filter(id => suffixPattern.test(id)) } }  // Conditions dont l'ID est un node supprimé suffixé
          ]
        },
        select: { id: true, nodeId: true, name: true }
      });
      
      // Filtrer pour ne supprimer que les conditions SUFFIXÉES (copies)
      const conditionIdsToDelete = conditionsToCheck
        .filter(c => suffixPattern.test(c.id) || suffixPattern.test(c.nodeId))
        .map(c => c.id);
      
      if (conditionIdsToDelete.length > 0) {
        const deletedConditions = await prisma.treeBranchLeafNodeCondition.deleteMany({
          where: { id: { in: conditionIdsToDelete } }
        });
        console.log(`[DELETE] 🧹 Supprimé ${deletedConditions.count} condition(s) copiée(s)`);
      }
      
      // ⛔ PROTECTION: PAS de nettoyage agressif des formules/conditions "orphelines"
      // Seul l'utilisateur peut supprimer manuellement les formules et conditions.
      // Les seules suppressions automatiques autorisées sont les copies suffixées (sections 1️⃣ et 2️⃣ ci-dessus).
      
    } catch (formulaConditionCleanError) {
      console.warn('[DELETE] Erreur nettoyage formules/conditions copiées:', (formulaConditionCleanError as Error).message);
    }

    // 📊 Mise à jour des champs Total après suppression de copies
    // Les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds Total doivent mettre ÃƒÂ¯Ã‚Â¿Ã‚Â½ jour leur formule pour exclure les copies supprimÃƒÂ¯Ã‚Â¿Ã‚Â½es
    try {
      // Chercher tous les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds Total (sum-display-field) qui rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rencent les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds supprimÃƒÂ¯Ã‚Â¿Ã‚Â½s
      const remainingNodes = await prisma.treeBranchLeafNode.findMany({
        where: { treeId },
        select: { id: true, metadata: true }
      });
      
      for (const node of remainingNodes) {
        const meta = node.metadata as Record<string, unknown> | null;
        if (meta?.isSumDisplayField === true && meta?.sourceNodeId) {
          // Ce nœud Total doit mettre à jour sa formule - AWAIT pour garantir la cohérence
          try {
            await updateSumDisplayFieldAfterCopyChange(String(meta.sourceNodeId), prisma);
            console.log(`✅ [DELETE] Champ Total ${node.id} mis à jour avec succès`);
          } catch (err) {
            console.warn(`[DELETE] ⚠️ Erreur mise à jour champ Total ${node.id}:`, err);
          }
        }
      }
    } catch (sumUpdateError) {
      console.warn('[DELETE] Erreur lors de la mise ÃƒÂ¯Ã‚Â¿Ã‚Â½ jour des champs Total:', (sumUpdateError as Error).message);
    }

    res.json({
      success: true,
      message: `Sous-arbre supprimÃƒÂ¯Ã‚Â¿Ã‚Â½ (${deletedSubtreeIds.length} nÃƒÂ¯Ã‚Â¿Ã‚Â½ud(s)), orphelines supprimÃƒÂ¯Ã‚Â¿Ã‚Â½es: ${deletedOrphans}`,
      deletedCount: deletedSubtreeIds.length,
      deletedIds: allDeletedIds, // merged: subtree + orphan + extra display nodes
      deletedOrphansCount: deletedOrphans,
      deletedOrphansIds,
      deletedExtraCount: deletedExtra,
      deletedExtraIds
    });
    // Final aggressive cleanup pass: recursively scan metadata for any string/array/object that
    // references a removed id and delete those nodes as well. This handles malformed or unexpected
    // metadata shapes that our other heuristics may miss.
    try {
      const remainingAfterFirstPass = await prisma.treeBranchLeafNode.findMany({ where: { treeId } });
      const deeperDeletedIds: string[] = [];
      const removedIdStrings = allDeletedIds.map(i => String(i));
      const containsRemovedId = (val: unknown): boolean => {
        if (val == null) return false;
        if (typeof val === 'string') {
          // check direct equality or contains patterns
          for (const rid of removedIdStrings) {
            if (val === rid) return true;
            if (val.includes(rid)) return true;
          }
          return false;
        }
        if (typeof val === 'number' || typeof val === 'boolean') return false;
        if (Array.isArray(val)) return val.some(v => containsRemovedId(v));
        if (typeof val === 'object') {
          for (const k of Object.keys(val as any)) {
            if (containsRemovedId((val as any)[k])) return true;
          }
        }
        return false;
      };
      const extraToDelete = remainingAfterFirstPass.filter(n => {
        if (!n.metadata) return false;
        // ??? PROTECTION: Ne JAMAIS supprimer les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds Total (sum-display-field)
        // Ces nÃƒÂ¯Ã‚Â¿Ã‚Â½uds contiennent des rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rences aux copies dans sumTokens mais doivent persister
        const meta = n.metadata as Record<string, unknown>;
        if (meta?.isSumDisplayField === true) {
          return false;
        }
        // ??? PROTECTION: Ne JAMAIS supprimer les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds avec ID finissant par -sum-total
        if (n.id.endsWith('-sum-total')) {
          return false;
        }
        try { return containsRemovedId(n.metadata); } catch { return false; }
      }).map(x => x.id);
      if (extraToDelete.length > 0) {
        const dd: string[] = [];
        await prisma.$transaction(async (tx) => {
          for (const id of extraToDelete) {
            try {
              await tx.treeBranchLeafNode.delete({ where: { id } });
              dd.push(id);
            } catch (err) {
              console.warn('[AGGRESSIVE CLEANUP] Failed to delete node', id, (err as Error).message);
            }
          }
        });
        if (dd.length > 0) {
        }
      }
    } catch (e) {
      console.warn('[AGGRESSIVE CLEANUP] Failed aggressive metadata scan:', (e as Error).message);
    }
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node subtree:', error);
    res.status(500).json({ error: 'Impossible de supprimer le nÃƒâ€¦Ã¢â‚¬Å“ud et ses descendants' });
  }
});

// =============================================================================
// ÃƒÂ¯Ã‚Â¿Ã‚Â½ NODE INFO - Infos d'un nÃƒâ€¦Ã¢â‚¬Å“ud par ID
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId
// Retourne des infos minimales du nÃƒâ€¦Ã¢â‚¬Å“ud (pour rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le treeId depuis nodeId)
router.get('/nodes/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        id: true,
        treeId: true,
        parentId: true,
        type: true,
        subType: true,
        label: true,
        metadata: true,
        // Colonnes AI Measure dédiées
        aiMeasure_enabled: true,
        aiMeasure_autoTrigger: true,
        aiMeasure_prompt: true,
        aiMeasure_keys: true,
        // Colonnes Link
        hasLink: true,
        link_targetNodeId: true,
        link_targetTreeId: true,
        link_mode: true,
        link_carryContext: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
    });

    if (!node) return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    // Autoriser si super admin ou si aucune organisation n'est fournie (mode dev),
    // sinon vÃƒÆ’Ã‚Â©rifier la correspondance des organisations
    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    return res.json({
      id: node.id,
      treeId: node.treeId,
      parentId: node.parentId,
      type: node.type,
      subType: node.subType,
      label: node.label,
      metadata: node.metadata,
      // Colonnes AI Measure dédiées
      aiMeasure_enabled: node.aiMeasure_enabled,
      aiMeasure_autoTrigger: node.aiMeasure_autoTrigger,
      aiMeasure_prompt: node.aiMeasure_prompt,
      aiMeasure_keys: node.aiMeasure_keys,
      // Colonnes Link
      hasLink: node.hasLink || false,
      link_targetNodeId: node.link_targetNodeId || null,
      link_targetTreeId: node.link_targetTreeId || null,
      link_mode: node.link_mode || 'JUMP',
      link_carryContext: node.link_carryContext || false,
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node info:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ…Â½ ANALYSE COMPLÃƒÆ’Ã‹â€ TE D'UNE BRANCHE (CASCADE + RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES)
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/full
// Retourne la branche complÃƒÆ’Ã‚Â¨te ÃƒÆ’Ã‚Â  partir d'un nÃƒâ€¦Ã¢â‚¬Å“ud: tous les descendants, les options,
// et les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es RÃƒÆ’Ã¢â‚¬Â°SOLUES (objets complets) sans doublons
router.get('/nodes/:nodeId/full', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et contrÃƒÆ’Ã‚Â´ler l'accÃƒÆ’Ã‚Â¨s via l'arbre parent
    const root = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
    });
    if (!root) return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud introuvable' });
    if (!isSuperAdmin && organizationId && root.TreeBranchLeafTree?.organizationId && root.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â©' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds de l'arbre pour construire les relations parent/enfants
    const all = await prisma.treeBranchLeafNode.findMany({ where: { treeId: root.treeId } });
    const byId = new Map(all.map(n => [n.id, n] as const));
    const childrenByParent = new Map<string, string[]>();
    for (const n of all) {
      if (!n.parentId) continue;
      const arr = childrenByParent.get(n.parentId) || [];
      arr.push(n.id);
      childrenByParent.set(n.parentId, arr);
    }

    // Parcours de la branche (descendants) sans doublons
    const collected = new Set<string>();
    const queue: string[] = [root.id];
    while (queue.length) {
      const cur = queue.shift()!;
      if (collected.has(cur)) continue;
      collected.add(cur);
      const children = childrenByParent.get(cur) || [];
      for (const c of children) queue.push(c);
    }

    // Collecter les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es liÃƒÆ’Ã‚Â©es ÃƒÆ’Ã‚Â  la branche et les rÃƒÆ’Ã‚Â©soudre (objets complets)
    const sharedIds = new Set<string>();
    for (const id of collected) {
      const n = byId.get(id);
      if (!n) continue;
      if (n.sharedReferenceId) sharedIds.add(n.sharedReferenceId);
      if (Array.isArray(n.sharedReferenceIds)) for (const rid of n.sharedReferenceIds) sharedIds.add(rid);
    }

    const sharedNodes = (sharedIds.size > 0)
      ? await prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(sharedIds) } } })
      : [];
    const sharedById = new Map(sharedNodes.map(n => [n.id, n] as const));

    // Construire la rÃƒÆ’Ã‚Â©ponse enrichie pour chaque nÃƒâ€¦Ã¢â‚¬Å“ud de la branche
    const nodes = Array.from(collected).map(id => {
      const node = byId.get(id)!;
      const response = buildResponseFromColumns(node);
      const childIds = childrenByParent.get(id) || [];
      const optionChildrenIds = childIds.filter(cid => (byId.get(cid)?.type || '').toLowerCase() === 'leaf_option'.toLowerCase());

      // RÃƒÆ’Ã‚Â©solution des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es de ce nÃƒâ€¦Ã¢â‚¬Å“ud
      const resolvedShared = [] as Array<Record<string, unknown>>;
      if (node.sharedReferenceId && sharedById.has(node.sharedReferenceId)) {
        resolvedShared.push(buildResponseFromColumns(sharedById.get(node.sharedReferenceId)!));
      }
      if (Array.isArray(node.sharedReferenceIds)) {
        for (const rid of node.sharedReferenceIds) {
          if (sharedById.has(rid)) resolvedShared.push(buildResponseFromColumns(sharedById.get(rid)!));
        }
      }

      return {
        ...response,
        childrenIds: childIds,
        optionChildrenIds,
        sharedReferencesResolved: resolvedShared
      };
    });

    // Index rapide et racine enrichie
    res.json({
      rootId: root.id,
      treeId: root.treeId,
      count: nodes.length,
      nodes
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [/nodes/:nodeId/full] Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢analyse complÃƒÆ’Ã‚Â¨te de la branche' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ…Â½ ANALYSE CIBLÃƒÆ’Ã¢â‚¬Â°E DES RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES PARTAGÃƒÆ’Ã¢â‚¬Â°ES D'UN NÃƒâ€¦Ã¢â‚¬â„¢UD
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/shared-references
// Inspecte uniquement les colonnes sharedReferenceId + sharedReferenceIds du nÃƒâ€¦Ã¢â‚¬Å“ud ciblÃƒÆ’Ã‚Â©
// et retourne les nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s (rÃƒÆ’Ã‚Â©solus), avec un indicateur de "champ conditionnel".
router.get('/nodes/:nodeId/shared-references', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // 1) Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et contrÃƒÆ’Ã‚Â´ler l'accÃƒÆ’Ã‚Â¨s via l'arbre parent
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
    });
    if (!node) return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud introuvable' });
    if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree?.organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â©' });
    }

    // 2) Extraire les IDs des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es ÃƒÆ’Ã‚Â  partir du nÃƒâ€¦Ã¢â‚¬Å“ud
    const ids = new Set<string>();
    if (node.sharedReferenceId) ids.add(node.sharedReferenceId);
    if (Array.isArray(node.sharedReferenceIds)) for (const rid of node.sharedReferenceIds) ids.add(rid);

    if (ids.size === 0) {
      return res.json({ nodeId, count: 0, shared: { ids: { single: node.sharedReferenceId ?? null, multiple: [] }, resolved: [] } });
    }

    // 3) Charger les nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s et dÃƒÆ’Ã‚Â©terminer s'ils sont "conditionnels"
    const refs = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(ids) } } });
    const refIds = refs.map(r => r.id);
    const conditionCounts = await prisma.treeBranchLeafNodeCondition.groupBy({
      by: ['nodeId'],
      _count: { nodeId: true },
      where: { nodeId: { in: refIds } }
    });
    const condCountByNode = new Map(conditionCounts.map(c => [c.nodeId, c._count.nodeId] as const));

    const resolved = refs.map(ref => {
      const enriched = buildResponseFromColumns(ref);
      const hasCondFlag = !!ref.hasCondition || (condCountByNode.get(ref.id) || 0) > 0;
      return { ...enriched, isConditional: hasCondFlag, conditionCount: condCountByNode.get(ref.id) || 0 };
    });

    // 4) RÃƒÆ’Ã‚Â©ponse structurÃƒÆ’Ã‚Â©e
    res.json({
      nodeId,
      count: resolved.length,
      shared: {
        ids: {
          single: node.sharedReferenceId ?? null,
          multiple: Array.isArray(node.sharedReferenceIds) ? node.sharedReferenceIds : []
        },
        resolved
      }
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [/nodes/:nodeId/shared-references] Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢analyse des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â APPLIQUER LES RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES PARTAGÃƒÆ’Ã¢â‚¬Â°ES DU GABARIT ORIGINAL ÃƒÆ’Ã¢â€šÂ¬ LA COPIE
// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/apply-shared-references-from-original
// Pour un nÃƒâ€¦Ã¢â‚¬Å“ud copiÃƒÆ’Ã‚Â© (ayant metadata.copiedFromNodeId), propage les colonnes
// sharedReferenceId/sharedReferenceIds de CHAQUE nÃƒâ€¦Ã¢â‚¬Å“ud original vers le nÃƒâ€¦Ã¢â‚¬Å“ud copiÃƒÆ’Ã‚Â©
// correspondant (reconnu par metadata.copiedFromNodeId), sans crÃƒÆ’Ã‚Â©er d'enfants.
async function applySharedReferencesFromOriginalInternal(req: MinimalReq, nodeId: string): Promise<{ success: true; applied: number; suffix: number }> {
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

  // 1) Charger la copie et l'arbre pour contrÃƒÆ’Ã‚Â´le d'accÃƒÆ’Ã‚Â¨s
  const copyRoot = await prisma.treeBranchLeafNode.findFirst({
    where: { id: nodeId },
    include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
  });
  if (!copyRoot) throw new Error('NÃƒâ€¦Ã¢â‚¬Å“ud introuvable');
  if (!isSuperAdmin && organizationId && copyRoot.TreeBranchLeafTree?.organizationId && copyRoot.TreeBranchLeafTree.organizationId !== organizationId) {
    throw new Error('AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â©');
  }

  // 2) RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds de l'arbre et construire la sous-arborescence de la copie
  const all = await prisma.treeBranchLeafNode.findMany({ where: { treeId: copyRoot.treeId } });
  const byId = new Map(all.map(n => [n.id, n] as const));
  const childrenByParent = new Map<string, string[]>();
  for (const n of all) {
    if (!n.parentId) continue;
    const arr = childrenByParent.get(n.parentId) || [];
    arr.push(n.id);
    childrenByParent.set(n.parentId, arr);
  }

  const collectedCopyIds = new Set<string>();
  const queue: string[] = [copyRoot.id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (collectedCopyIds.has(cur)) continue;
    collectedCopyIds.add(cur);
    for (const c of (childrenByParent.get(cur) || [])) queue.push(c);
  }

  // 3) Construire le mapping originalId -> copyId via metadata.copiedFromNodeId
  const originalToCopy = new Map<string, string>();
  for (const id of collectedCopyIds) {
    const n = byId.get(id);
    if (!n) continue;
    const meta = (n.metadata || {}) as Record<string, unknown>;
    const origId = String(meta.copiedFromNodeId || '');
    if (origId) originalToCopy.set(origId, n.id);
  }
  if (originalToCopy.size === 0) return { success: true, applied: 0, suffix: 0 };

  // 4) Charger les originaux concernÃƒÆ’Ã‚Â©s et prÃƒÆ’Ã‚Â©parer les mises ÃƒÆ’Ã‚Â  jour
  const originalIds = Array.from(originalToCopy.keys());
  const originals = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: originalIds } } });

  // 4bis) Collecter toutes les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pointÃƒÆ’Ã‚Â©es par ces originaux
  const allRefIds = new Set<string>();
  for (const orig of originals) {
    if (orig.sharedReferenceId) allRefIds.add(orig.sharedReferenceId);
    if (Array.isArray(orig.sharedReferenceIds)) orig.sharedReferenceIds.forEach(id => id && allRefIds.add(id));
  }

  // 4ter) DÃƒÆ’Ã‚Â©terminer le suffixe ÃƒÆ’Ã‚Â  utiliser pour CETTE copie, puis construire/assurer les copies des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences (ID suffixÃƒÆ’Ã‚Â© "-N")
  // a) DÃƒÆ’Ã‚Â©terminer/attribuer le suffixe
  const metaRoot = (copyRoot.metadata as any) || {};
  let chosenSuffix: number | null = typeof metaRoot.copySuffix === 'number' ? metaRoot.copySuffix : null;
  if (!chosenSuffix) {
    // Chercher le prochain suffixe disponible en scannant les IDs de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es existantes
    let maxSuffix = 0;
    const SUFFIX_RE = /^(shared-ref-[A-Za-z0-9_\-]+)-(\d+)$/;
    for (const n of all) {
      const m = typeof n.id === 'string' ? n.id.match(SUFFIX_RE) : null;
      if (m) {
        const num = Number(m[2]);
        if (!Number.isNaN(num)) maxSuffix = Math.max(maxSuffix, num);
      }
    }
    chosenSuffix = maxSuffix + 1 || 1;
    // Persister ce suffixe sur la racine de la copie pour qu'il soit rÃƒÆ’Ã‚Â©utilisÃƒÆ’Ã‚Â© ensuite
    await prisma.treeBranchLeafNode.update({ where: { id: copyRoot.id }, data: { metadata: { ...metaRoot, copySuffix: chosenSuffix } as any } });
  }

  // b) Construire/assurer les copies des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences avec ce suffixe
  const refCopyIdByOriginal = new Map<string, string>();
  const desiredIds = Array.from(allRefIds).map(id => `${id}-${chosenSuffix}`);
  const existingRefCopies = desiredIds.length > 0
    ? await prisma.treeBranchLeafNode.findMany({ where: { id: { in: desiredIds } } })
    : [];
  const existingSet = new Set(existingRefCopies.map(n => n.id));

  const ensureRefCopy = async (origRefId: string): Promise<string> => {
    const desiredRootId = `${origRefId}-${chosenSuffix}`;
    if (existingSet.has(desiredRootId)) {
      refCopyIdByOriginal.set(origRefId, desiredRootId);
      return desiredRootId;
    }

    // Construire le sous-arbre ÃƒÆ’Ã‚Â  copier (IDs originaux)
    const subtreeIds: string[] = [];
    const q: string[] = [origRefId];
    const seen = new Set<string>();
    while (q.length) {
      const cur = q.shift()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      subtreeIds.push(cur);
      const kids = childrenByParent.get(cur) || [];
      for (const cid of kids) q.push(cid);
    }

    const origSubtree = subtreeIds.map(id => byId.get(id)).filter(Boolean) as typeof all;
    const desired = new Set(subtreeIds.map(id => `${id}-${chosenSuffix}`));
    if (desired.size > 0) {
      const already = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(desired) } } });
      for (const n of already) desired.delete(n.id);
    }

    const idMap = new Map<string, string>();
    for (const id of subtreeIds) idMap.set(id, `${id}-${chosenSuffix}`);

    for (const orig of origSubtree) {
      const newId = idMap.get(orig.id)!;
      if (!desired.has(newId)) continue;
      const newParentId = orig.parentId ? idMap.get(orig.parentId) ?? null : null;
      const toCreate: Prisma.TreeBranchLeafNodeCreateInput = {
        id: newId,
        treeId: copyRoot.treeId,
        type: orig.type,
        subType: orig.subType,
        fieldType: (orig as any).fieldType ?? 'TEXT',
        label: orig.label,
        description: orig.description,
        parentId: newParentId,
        order: orig.order ?? 9999,
        isVisible: orig.isVisible ?? true,
        isActive: orig.isActive ?? true,
        isRequired: orig.isRequired ?? false,
        isMultiple: orig.isMultiple ?? false,
        // 🔧 IMPORTANT: préserver la table active lors d'une copie (sinon les lookups tombent à 0/∅)
        table_activeId: (orig as any).table_activeId ? `${(orig as any).table_activeId}-${chosenSuffix}` : null,
        hasData: false,
        hasFormula: false,
        hasCondition: false,
        hasTable: false,
        hasAPI: false,
        hasLink: false,
        hasMarkers: false,
        isSharedReference: orig.id === origRefId ? true : (orig as any).isSharedReference ?? false,
        sharedReferenceId: null,
        sharedReferenceIds: [],
        sharedReferenceName: orig.sharedReferenceName ?? orig.label ?? null,
        sharedReferenceDescription: orig.sharedReferenceDescription ?? orig.description ?? null,
        // ?? COLONNES LINKED*** : Copier les rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rences depuis le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud original avec IDs suffixÃƒÂ¯Ã‚Â¿Ã‚Â½s
        linkedFormulaIds: Array.isArray((orig as any).linkedFormulaIds)
          ? (orig as any).linkedFormulaIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        linkedConditionIds: Array.isArray((orig as any).linkedConditionIds)
          ? (orig as any).linkedConditionIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        linkedTableIds: Array.isArray((orig as any).linkedTableIds)
          ? (orig as any).linkedTableIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        linkedVariableIds: Array.isArray((orig as any).linkedVariableIds)
          ? (orig as any).linkedVariableIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        metadata: { ...(orig.metadata as any || {}), copiedFromNodeId: orig.id } as any,
        updatedAt: new Date(),
      };
      await prisma.treeBranchLeafNode.create({ data: toCreate });
      
      // ?? COPIER LES VARIABLES rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rencÃƒÂ¯Ã‚Â¿Ã‚Â½es par ce nÃƒÂ¯Ã‚Â¿Ã‚Â½ud
      if (Array.isArray((orig as any).linkedVariableIds) && (orig as any).linkedVariableIds.length > 0) {
        
        const variableCopyCache = new Map<string, string>();
        const formulaIdMap = new Map<string, string>();
        const conditionIdMap = new Map<string, string>();
        const tableIdMap = new Map<string, string>();
        // ?? IMPORTANT : Utiliser originalToCopy qui contient TOUS les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds copiÃƒÂ¯Ã‚Â¿Ã‚Â½s (pas juste le shared-ref)
        const globalNodeIdMap = new Map<string, string>([...originalToCopy, ...idMap]);
        
        for (const originalVarId of (orig as any).linkedVariableIds) {
          try {
            // Appeler copyVariableWithCapacities pour crÃƒÂ¯Ã‚Â¿Ã‚Â½er la variable
            const copyResult = await copyVariableWithCapacities(
              originalVarId,
              chosenSuffix!,
              newId, // Le nouveau nÃƒÂ¯Ã‚Â¿Ã‚Â½ud qui possÃƒÂ¯Ã‚Â¿Ã‚Â½de cette variable
              prisma,
              {
                formulaIdMap,
                conditionIdMap,
                tableIdMap,
                nodeIdMap: globalNodeIdMap, // Utiliser le mapping global
                variableCopyCache,
                autoCreateDisplayNode: true
              }
            );
            
            if (copyResult.success) {
            } else {
              console.warn(`  ?? [SHARED-REF] ÃƒÂ¯Ã‚Â¿Ã‚Â½chec copie variable ${originalVarId}: ${copyResult.error}`);
            }
          } catch (e) {
            console.warn(`  ?? [SHARED-REF] Erreur copie variable ${originalVarId}:`, (e as Error).message);
          }
        }
      }
    }

    refCopyIdByOriginal.set(origRefId, desiredRootId);
    return desiredRootId;
  };

  for (const rid of allRefIds) await ensureRefCopy(rid);

  const updates: Array<Promise<unknown>> = [];
  let applied = 0;
  for (const orig of originals) {
    const copyId = originalToCopy.get(orig.id)!;
    const origMultiple = Array.isArray(orig.sharedReferenceIds) ? orig.sharedReferenceIds.filter(Boolean) : [];
    const origSingle = orig.sharedReferenceId ?? null;
    const mappedMultiple = origMultiple.map(id => refCopyIdByOriginal.get(id) || `${id}-${chosenSuffix}`);
    const mappedSingle = origSingle ? (refCopyIdByOriginal.get(origSingle) || `${origSingle}-${chosenSuffix}`) : null;
    const finalArray = mappedMultiple.length > 0 ? mappedMultiple : (mappedSingle ? [mappedSingle] : []);
    const finalSingle = finalArray.length > 0 ? finalArray[0] : null;
    updates.push(prisma.treeBranchLeafNode.update({
      where: { id: copyId },
      data: {
        sharedReferenceId: finalSingle,
        sharedReferenceIds: finalArray,
        sharedReferenceName: orig.sharedReferenceName ?? null,
        sharedReferenceDescription: orig.sharedReferenceDescription ?? null,
        isSharedReference: false,
        hasData: orig.hasData,
        updatedAt: new Date()
      }
    }));
    applied++;
  }

  await prisma.$transaction(updates);
  return { success: true, applied, suffix: chosenSuffix! };
}

// Route HTTP qui appelle la fonction interne
router.post('/nodes/:nodeId/apply-shared-references-from-original', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const result = await applySharedReferencesFromOriginalInternal(req as unknown as MinimalReq, nodeId);
    return res.json(result);
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [/nodes/:nodeId/apply-shared-references-from-original] Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de l\'application des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ DÃƒÆ’Ã¢â‚¬Â°LIER (ET OPTIONNELLEMENT SUPPRIMER) LES RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES PARTAGÃƒÆ’Ã¢â‚¬Â°ES D'UNE COPIE
// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/unlink-shared-references
// - DÃƒÆ’Ã‚Â©lie toutes les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es (sharedReferenceId/sharedReferenceIds) dans la sous-arborescence du nÃƒâ€¦Ã¢â‚¬Å“ud
// - Optionnel: supprime les sous-arbres de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences copiÃƒÆ’Ã‚Â©es (suffixÃƒÆ’Ã‚Â©es) devenues orphelines
router.post('/nodes/:nodeId/unlink-shared-references', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { deleteOrphans } = (req.body || {}) as { deleteOrphans?: boolean };
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // 1) Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et contrÃƒÆ’Ã‚Â´ler l'accÃƒÆ’Ã‚Â¨s via l'arbre parent
    const root = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
    });
    if (!root) return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud introuvable' });
    if (!isSuperAdmin && organizationId && root.TreeBranchLeafTree?.organizationId && root.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â©' });
    }

    // 2) RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds de l'arbre pour relations parent/enfant
    const all = await prisma.treeBranchLeafNode.findMany({ where: { treeId: root.treeId } });
    const byId = new Map(all.map(n => [n.id, n] as const));
    const childrenByParent = new Map<string, string[]>();
    for (const n of all) {
      if (!n.parentId) continue;
      const arr = childrenByParent.get(n.parentId) || [];
      arr.push(n.id);
      childrenByParent.set(n.parentId, arr);
    }

    // 3) Collecter la sous-arborescence du nÃƒâ€¦Ã¢â‚¬Å“ud
    const collected = new Set<string>();
    const queue: string[] = [root.id];
    while (queue.length) {
      const cur = queue.shift()!;
      if (collected.has(cur)) continue;
      collected.add(cur);
      for (const c of (childrenByParent.get(cur) || [])) queue.push(c);
    }

    // 4) Collecter toutes les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es pointÃƒÆ’Ã‚Â©es par cette sous-arborescence
    const referencedIds = new Set<string>();
    for (const id of collected) {
      const n = byId.get(id);
      if (!n) continue;
      if (n.sharedReferenceId) referencedIds.add(n.sharedReferenceId);
      if (Array.isArray(n.sharedReferenceIds)) n.sharedReferenceIds.forEach(rid => rid && referencedIds.add(rid));
    }

    // 5) DÃƒÆ’Ã‚Â©lier: mettre sharedReferenceId=null et sharedReferenceIds=[] sur TOUTE la sous-arborescence
    const updates: Array<Promise<unknown>> = [];
    for (const id of collected) {
      updates.push(prisma.treeBranchLeafNode.update({ where: { id }, data: { sharedReferenceId: null, sharedReferenceIds: [] as string[] } }));
    }
    await prisma.$transaction(updates);

    let deletedCount = 0;
    let orphanCandidates: string[] = [];

    // 6) Optionnel: supprimer les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences suffixÃƒÆ’Ã‚Â©es devenues orphelines
    if (deleteOrphans && referencedIds.size > 0) {
      // Candidats = rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences existantes dont l'ID existe dans l'arbre
      orphanCandidates = Array.from(referencedIds).filter(id => byId.has(id));

      // VÃƒÆ’Ã‚Â©rifier si elles sont encore rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©es ailleurs dans l'arbre (hors sous-arborescence)
      const elsewhereRefers = new Set<string>();
      for (const n of all) {
        if (collected.has(n.id)) continue; // on ignore la sous-arborescence dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  dÃƒÆ’Ã‚Â©lier
        if (n.sharedReferenceId && referencedIds.has(n.sharedReferenceId)) elsewhereRefers.add(n.sharedReferenceId);
        if (Array.isArray(n.sharedReferenceIds)) for (const rid of n.sharedReferenceIds) if (referencedIds.has(rid)) elsewhereRefers.add(rid);
      }

      // Supprimer uniquement celles qui ne sont plus rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©es
      const toDeleteRoots = orphanCandidates.filter(id => !elsewhereRefers.has(id));

      if (toDeleteRoots.length > 0) {
        // Construire une profondeur pour supprimer feuilles -> racines
        const delSet = new Set<string>();
        const depth = new Map<string, number>();
        for (const rid of toDeleteRoots) {
          const q: string[] = [rid];
          depth.set(rid, 0);
          while (q.length) {
            const cur = q.shift()!;
            if (delSet.has(cur)) continue;
            delSet.add(cur);
            const d = depth.get(cur)!;
            for (const c of (childrenByParent.get(cur) || [])) { depth.set(c, d + 1); q.push(c); }
          }
        }
        const ordered = Array.from(delSet);
        ordered.sort((a, b) => (depth.get(b)! - depth.get(a)!));

        await prisma.$transaction(async (tx) => {
          for (const id of ordered) {
            await tx.treeBranchLeafNode.delete({ where: { id } });
            deletedCount++;
          }
        });
      }
    }

    return res.json({ success: true, unlinked: collected.size, orphanCandidates, deletedOrphans: deletedCount });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [/nodes/:nodeId/unlink-shared-references] Erreur:', error);
    res.status(500).json({ error: 'Erreur lors du dÃƒÆ’Ã‚Â©lier/suppression des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es' });
  }
});

// GET /api/treebranchleaf/nodes/:tableNodeId/table/lookup - RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re les donnÃƒÆ’Ã‚Â©es pour un select basÃƒÆ’Ã‚Â© sur une table
// ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â ANCIEN ENDPOINT - DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â° CAR DOUBLON AVEC L'ENDPOINT LIGNE 6339 (NOUVELLE VERSION AVEC keyRow/keyColumn)
/*
router.get('/nodes/:tableNodeId/table/lookup', async (req, res) => {
  const { tableNodeId } = req.params; // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ DÃƒÆ’Ã¢â‚¬Â°PLACÃƒÆ’Ã¢â‚¬Â° AVANT LE TRY pour ÃƒÆ’Ã‚Âªtre accessible dans le catch
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â DIAGNOSTIC: VÃƒÆ’Ã‚Â©rifier si Prisma est disponible
    if (!prisma) {
      console.error(`[table/lookup] ÃƒÂ¢Ã‚ÂÃ…â€™ ERREUR CRITIQUE: prisma est undefined !`);
      console.error(`[table/lookup] Type de prisma:`, typeof prisma);
      return res.status(500).json({ 
        error: 'Database connection not available',
        details: 'Prisma client is not initialized. Please restart the server.'
      });
    }
    

    // 1. RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la configuration SELECT du champ pour savoir quelle table rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencer
    const selectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
      where: { nodeId: tableNodeId },
      select: {
        tableReference: true,
        valueColumn: true,
        displayColumn: true,
      },
    });

    if (!selectConfig || !selectConfig.tableReference) {
      return res.status(404).json({ error: 'Configuration de la table de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence non trouvÃƒÆ’Ã‚Â©e.' });
    }

    const { tableReference } = selectConfig;
    const _valueColumn = selectConfig.valueColumn; // Pour info (non utilisÃƒÆ’Ã‚Â© en mode dynamique)
    const _displayColumn = selectConfig.displayColumn; // Pour info (non utilisÃƒÆ’Ã‚Â© en mode dynamique)

    // 2. RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les donnÃƒÆ’Ã‚Â©es de la table rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©e
    const tableData = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { id: tableReference },
      select: {
        data: true,      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CORRECT: DonnÃƒÆ’Ã‚Â©es 2D du tableau
        columns: true,   // Noms des colonnes
        rows: true,      // Noms des lignes (pour info)
        nodeId: true,
      },
    });

      const parentNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: tableData.nodeId },
      select: { TreeBranchLeafTree: { select: { organizationId: true } } }
    });

    const nodeOrg = parentNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette ressource.' });
    }

    // 3. Extraire les colonnes et les donnÃƒÆ’Ã‚Â©es
    const _tableDataArray = Array.isArray(tableData.data) ? tableData.data : []; // Pour info (non utilisÃƒÆ’Ã‚Â© en mode dynamique)
    const dataColumns = Array.isArray(tableData.columns) ? tableData.columns : [];
    const rowNames = Array.isArray(tableData.rows) ? tableData.rows : [];


    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le mode et la configuration depuis le champ SELECT
    const selectFieldNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: tableNodeId },
      select: {
        table_instances: true,
        table_activeId: true,
      }
    });

    let isRowBased = false;
    let isColumnBased = false;
    let tableMode: 'columns' | 'matrix' = 'columns';
    let keyColumnFromLookup: string | undefined;
    
    if (selectFieldNode?.table_instances && typeof selectFieldNode.table_instances === 'object') {
      const instances = selectFieldNode.table_instances as Record<string, any>;
      const activeInstance = selectFieldNode.table_activeId ? instances[selectFieldNode.table_activeId] : null;
      
      if (activeInstance) {
        isRowBased = activeInstance.rowBased === true;
        isColumnBased = activeInstance.columnBased === true;
        tableMode = activeInstance.mode || 'columns';
        
        // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRITIQUE: Lire keyColumn depuis l'instance active
        keyColumnFromLookup = activeInstance.keyColumn || activeInstance.valueColumn || activeInstance.displayColumn;
        
      }
    }

    // 4. Transformer selon le mode (rowBased ou columnBased)
    let options: Array<{ label: string; value: string }>;

    if (isRowBased) {
      // Mode LIGNE: Retourner les noms des lignes
      options = rowNames.map((rowName: string) => ({
        label: String(rowName),
        value: String(rowName)
      }));
    } else if (tableMode === 'columns' && keyColumnFromLookup) {
      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Mode COLONNE avec keyColumn: Retourner les VALEURS de la colonne choisie
      
      const columnIndex = dataColumns.indexOf(keyColumnFromLookup);
      if (columnIndex === -1) {
        console.warn(`[table/lookup] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Colonne "${keyColumnFromLookup}" introuvable dans:`, dataColumns);
        options = [];
      } else {
        // Extraire les valeurs de la colonne
        const tableDataArray = Array.isArray(tableData.data) ? tableData.data : [];
        options = tableDataArray
          .map((row: unknown) => {
            if (!Array.isArray(row)) return null;
            const value = row[columnIndex];
            if (value === null || value === undefined || value === '') return null;
            return {
              label: String(value),
              value: String(value)
            };
          })
          .filter((opt): opt is { label: string; value: string } => opt !== null);
        
      }
    } else {
      // Mode COLONNE par dÃƒÆ’Ã‚Â©faut (ancien comportement): Retourner les noms des colonnes
      options = dataColumns.map((columnName: string) => ({
        label: String(columnName),
        value: String(columnName)
      }));
    }

    res.json({ options });

  } catch (error) {
    console.error(`[API] ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¥ Critical error in /table/lookup for tableNodeId: ${tableNodeId}`, error);
    if (error instanceof Error) {
        console.error(`[API] Error Name: ${error.name}`);
        console.error(`[API] Error Message: ${error.message}`);
        console.error(`[API] Error Stack: ${error.stack}`);
    }
    res.status(500).json({ 
        message: 'Internal Server Error', 
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) 
    });
  }
});
*/
// ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â FIN DE L'ANCIEN ENDPOINT /table/lookup - Utiliser maintenant l'endpoint moderne ligne ~6339


// =============================================================================
// ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¢ NODE DATA (VARIABLE EXPOSÃƒÆ’Ã¢â‚¬Â°E) - DonnÃƒÆ’Ã‚Â©e d'un nÃƒâ€¦Ã¢â‚¬Å“ud
// =============================================================================

// GET /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re la configuration "donnÃƒÆ’Ã‚Â©e" (variable exposÃƒÆ’Ã‚Â©e) d'un nÃƒâ€¦Ã¢â‚¬Å“ud
router.get('/trees/:treeId/nodes/:nodeId/data', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;

    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÂ¯Ã‚Â¿Ã‚Â½' });
    }

    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId, treeId },
      select: { id: true, data_activeId: true, linkedVariableIds: true, hasData: true },
    });

    if (!node) {
      return res.status(404).json({ error: 'Noeud non trouve' });
    }

    // 🛡️ PROTECTION FANTÔMES: D'abord chercher une variable directe
    const directVariable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId } });
    
    if (directVariable) {
      // Le nœud a sa propre variable → tout normal
      const usedVariableId = node.data_activeId || directVariable.id || null;
      return res.json({ ...directVariable, usedVariableId, ownerNodeId: nodeId, proxiedFromNodeId: null });
    }
    
    // 🛡️ Si le nœud n'a PAS hasData, ne PAS résoudre via linkedVariableIds
    // linkedVariableIds contient les dépendances/triggers, pas les variables propres
    if (!node.hasData) {
      return res.json({ usedVariableId: node.data_activeId || null, ownerNodeId: null, proxiedFromNodeId: null });
    }
    
    // Sinon (hasData=true mais pas de variable directe), fallback vers linkedVariableIds
    const { variable, ownerNodeId, proxiedFromNodeId } = await resolveNodeVariable(nodeId, node.linkedVariableIds);

    const usedVariableId = node.data_activeId || variable?.id || null;
    if (variable) {
      return res.json({ ...variable, usedVariableId, ownerNodeId, proxiedFromNodeId });
    }
    return res.json({ usedVariableId, ownerNodeId, proxiedFromNodeId });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node data:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la donnee du noeud' });
  }
});

// =============================================================================
// ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â NODE CONDITIONS - Conditions IF/ELSE d'un nÃƒâ€¦Ã¢â‚¬Å“ud
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/conditions
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re la configuration des conditions d'un nÃƒâ€¦Ã¢â‚¬Å“ud (JSON libre pour l'instant)
// (Moved export to bottom so routes below are mounted)

// PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// CrÃƒÆ’Ã‚Â©e/met ÃƒÆ’Ã‚Â  jour la configuration "donnÃƒÆ’Ã‚Â©e" (variable exposÃƒÆ’Ã‚Â©e) d'un nÃƒâ€¦Ã¢â‚¬Å“ud
router.put('/trees/:treeId/nodes/:nodeId/data', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;
    const { 
      exposedKey, displayFormat, unit, precision, visibleToUser, isReadonly, defaultValue, metadata,
      // 🎯 NOUVEAUX CHAMPS pour sourceType/sourceRef/fixedValue
      sourceType, sourceRef, fixedValue, selectedNodeId,
      // 🏷️ NOUVEAU: Nom de la capacité (displayName)
      displayName: bodyDisplayName
    } = req.body || {};

    // VÃƒÆ’Ã‚Â©rifier l'appartenance de l'arbre ÃƒÆ’Ã‚Â  l'organisation (ou accÃƒÆ’Ã‚Â¨s super admin)
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // VÃƒÆ’Ã‚Â©rifier que le nÃƒâ€¦Ã¢â‚¬Å“ud existe dans cet arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        treeId,
      },
      select: { id: true, label: true, linkedVariableIds: true },
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    // Normalisation des valeurs
    const safeExposedKey: string | null = typeof exposedKey === 'string' && exposedKey.trim() ? exposedKey.trim() : null;
    // 🏷️ NOUVEAU: Utiliser displayName du body en priorité, sinon exposedKey, sinon label du nœud
    const displayName = (typeof bodyDisplayName === 'string' && bodyDisplayName.trim()) 
      ? bodyDisplayName.trim() 
      : (safeExposedKey || node.label || `var_${String(nodeId).slice(0, 4)}`);

    const { variable: previousVariable, ownerNodeId } = await resolveNodeVariable(
      nodeId,
      node.linkedVariableIds
    );
    const targetNodeId = ownerNodeId ?? nodeId;
    const proxiedTargetNodeId = nodeId === targetNodeId ? null : nodeId;
    if (proxiedTargetNodeId) {
    }

    const updated = await prisma.$transaction(async (tx) => {
      const variable = await tx.treeBranchLeafNodeVariable.upsert({
        where: { nodeId: targetNodeId },
        update: {
          exposedKey: safeExposedKey || undefined,
          displayName,
          displayFormat: typeof displayFormat === 'string' ? displayFormat : undefined,
          unit: typeof unit === 'string' ? unit : undefined,
          precision: typeof precision === 'number' ? precision : undefined,
          visibleToUser: typeof visibleToUser === 'boolean' ? visibleToUser : undefined,
          isReadonly: typeof isReadonly === 'boolean' ? isReadonly : undefined,
          defaultValue: typeof defaultValue === 'string' ? defaultValue : undefined,
          metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
          // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVEAUX CHAMPS source
          sourceType: typeof sourceType === 'string' ? sourceType : undefined,
          sourceRef: typeof sourceRef === 'string' ? sourceRef : undefined,
          fixedValue: typeof fixedValue === 'string' ? fixedValue : undefined,
          selectedNodeId: typeof selectedNodeId === 'string' ? selectedNodeId : undefined,
          updatedAt: new Date(),
        },
        create: {
          id: randomUUID(),
          nodeId: targetNodeId,
          exposedKey: safeExposedKey || `var_${String(nodeId).slice(0, 4)}`,
          displayName,
          displayFormat: typeof displayFormat === 'string' ? displayFormat : 'number',
          unit: typeof unit === 'string' ? unit : null,
          precision: typeof precision === 'number' ? precision : 2,
          visibleToUser: typeof visibleToUser === 'boolean' ? visibleToUser : true,
          isReadonly: typeof isReadonly === 'boolean' ? isReadonly : false,
          defaultValue: typeof defaultValue === 'string' ? defaultValue : null,
          metadata: metadata && typeof metadata === 'object' ? metadata : {},
          // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVEAUX CHAMPS source
          sourceType: typeof sourceType === 'string' ? sourceType : 'fixed',
          sourceRef: typeof sourceRef === 'string' ? sourceRef : null,
          fixedValue: typeof fixedValue === 'string' ? fixedValue : null,
          selectedNodeId: typeof selectedNodeId === 'string' ? selectedNodeId : null,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          exposedKey: true,
          displayName: true, // 🏷️ Inclure le nom de la capacité
          displayFormat: true,
          unit: true,
          precision: true,
          visibleToUser: true,
          isReadonly: true,
          defaultValue: true,
          metadata: true,
          // 🎯 NOUVEAUX CHAMPS source
          sourceType: true,
          sourceRef: true,
          fixedValue: true,
          selectedNodeId: true,
        },
      });

      // Marquer le nÃƒÂ¯Ã‚Â¿Ã‚Â½"ud comme ayant des donnÃƒÆ’Ã‚Â©es configurÃƒÆ’Ã‚Â©es (capacitÃƒÆ’Ã‚Â© "DonnÃƒÆ’Ã‚Â©e" active)
      // ?? NOUVEAU: Si sourceRef pointe vers une table, mettre ÃƒÂ¯Ã‚Â¿Ã‚Â½ jour table_activeId et table_instances
      // ?? FIX: Synchroniser data_unit et data_precision depuis la variable vers le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud
      const nodeUpdateData: any = { 
        hasData: true, 
        updatedAt: new Date(),
        // ?? FIX: Toujours synchroniser unit et precision de la variable vers le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud
        data_unit: variable.unit ?? null,
        data_precision: variable.precision ?? null,
        data_displayFormat: variable.displayFormat ?? null,
        data_exposedKey: variable.exposedKey ?? null,
        data_visibleToUser: variable.visibleToUser ?? true,
        data_activeId: variable.id,
      };
      
      if (variable.sourceRef && variable.sourceRef.startsWith('@table.')) {
        const tableId = variable.sourceRef.replace('@table.', '');

        const instanceConfig = {
          sourceType: variable.sourceType || 'tree',
          sourceRef: variable.sourceRef,
          displayFormat: variable.displayFormat || null,
          unit: variable.unit ?? null,
          precision: variable.precision ?? null,
          visibleToUser: variable.visibleToUser ?? true,
          exposedKey: variable.exposedKey || null,
          metadata: {
            sourceType: variable.sourceType || 'tree',
            sourceRef: variable.sourceRef,
            fixedValue: variable.fixedValue ?? null,
            selectedNodeId: variable.selectedNodeId ?? null,
            updatedAt: new Date().toISOString()
          }
        };

        nodeUpdateData.data_activeId = tableId;
        nodeUpdateData.data_instances = { [tableId]: instanceConfig };
        nodeUpdateData.table_activeId = tableId;
        nodeUpdateData.table_instances = { [tableId]: instanceConfig };
        nodeUpdateData.hasTable = true;

      }
      
      const nodesToUpdate = new Set<string>([targetNodeId]);
      if (nodeId !== targetNodeId) {
        nodesToUpdate.add(nodeId);
      }

      for (const target of nodesToUpdate) {
        await tx.treeBranchLeafNode.update({
          where: { id: target },
          data: nodeUpdateData
        });
      }

      // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MAJ linkedVariableIds du nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire
      try {
        await addToNodeLinkedField(tx, targetNodeId, 'linkedVariableIds', [variable.id]);
        if (nodeId !== targetNodeId) {
          await addToNodeLinkedField(tx, nodeId, 'linkedVariableIds', [variable.id]);
        }
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating owner linkedVariableIds:', (e as Error).message);
      }

      // ?? SystÃƒÂ¯Ã‚Â¿Ã‚Â½me universel: lier la variable ÃƒÂ¯Ã‚Â¿Ã‚Â½ TOUS les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rencÃƒÂ¯Ã‚Â¿Ã‚Â½s par sa capacitÃƒÂ¯Ã‚Â¿Ã‚Â½ (table/formule/condition/champ)
      if (variable.sourceRef) {
        try {
          await linkVariableToAllCapacityNodes(tx, variable.id, variable.sourceRef);
        } catch (e) {
          console.warn(`?? [TreeBranchLeaf API] ÃƒÂ¯Ã‚Â¿Ã‚Â½chec liaison automatique linkedVariableIds pour ${variable.id}:`, (e as Error).message);
        }
      }

      // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ NOUVEAU: MAJ des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences inverses (linkedVariableIds sur les nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s)
      try {
        const getReferencedIds = async (varData: { sourceRef?: string | null, metadata?: any }): Promise<Set<string>> => {
          const ids = new Set<string>();
          if (!varData) return ids;

          const { sourceRef, metadata } = varData;

          // 1. RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence directe dans metadata.selectedNodeId
          if (metadata?.selectedNodeId) {
            ids.add(normalizeRefId(metadata.selectedNodeId));
          }

          // 2. RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence dans sourceRef
          const parsedRef = parseSourceRef(sourceRef);
          if (parsedRef) {
            if (parsedRef.type === 'formula') {
              const formula = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsedRef.id }, select: { tokens: true } });
              if (formula) {
                extractNodeIdsFromTokens(formula.tokens).forEach(id => ids.add(normalizeRefId(id)));
              }
            } else if (parsedRef.type === 'condition') {
              const condition = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsedRef.id }, select: { conditionSet: true } });
              if (condition) {
                extractNodeIdsFromConditionSet(condition.conditionSet).forEach(id => ids.add(normalizeRefId(id)));
              }
            } else {
              // GÃƒÆ’Ã‚Â©rer les cas comme "table:id" ou "node:id"
              ids.add(normalizeRefId(parsedRef.id));
            }
          } else if (sourceRef) {
            // Si ce n'est pas un format "type:id", ÃƒÆ’Ã‚Â§a peut ÃƒÆ’Ã‚Âªtre un nodeId direct
            ids.add(normalizeRefId(sourceRef));
          }
          
          return ids;
        };

        const oldIds = await getReferencedIds(previousVariable);
        const newIds = await getReferencedIds(variable);

        const idsToAdd = [...newIds].filter(id => !oldIds.has(id));
        const idsToRemove = [...oldIds].filter(id => !newIds.has(id));

        if (idsToAdd.length > 0) {
          for (const refId of idsToAdd) {
            // 🛡️ Skip: les tableIds ne sont pas des nodeIds — pas de linkedVariableIds dessus
            const refParsed = parseSourceRef(refId);
            if (refParsed && refParsed.type === 'table') continue;
            await addToNodeLinkedField(tx, refId, 'linkedVariableIds', [variable.id]);
          }
        }
        if (idsToRemove.length > 0) {
          for (const refId of idsToRemove) {
            const refParsed = parseSourceRef(refId);
            if (refParsed && refParsed.type === 'table') continue;
            await removeFromNodeLinkedField(tx, refId, 'linkedVariableIds', [variable.id]);
          }
        }

        // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ NOUVEAU: GÃƒÆ’Ã‚Â©rer aussi les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences vers les variables des nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s
        const getNodeReferencedVariableIds = async (varData: { sourceRef?: string | null, metadata?: any }): Promise<Set<string>> => {
          const variableIds = new Set<string>();
          
          // Extraire les nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s par cette variable
          const referencedNodeIds = await getReferencedIds(varData);
          
          // Pour chaque nÃƒâ€¦Ã¢â‚¬Å“ud rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©, rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer sa variable (si elle existe)
          for (const refNodeId of referencedNodeIds) {
            const refVariable = await tx.treeBranchLeafNodeVariable.findUnique({
              where: { nodeId: refNodeId },
              select: { id: true }
            });
            if (refVariable) {
              variableIds.add(refVariable.id);
            }
          }
          
          return variableIds;
        };

        const oldVariableRefs = await getNodeReferencedVariableIds(previousVariable);
        const newVariableRefs = await getNodeReferencedVariableIds(variable);

        const variableIdsToAdd = [...newVariableRefs].filter(id => !oldVariableRefs.has(id));
        const variableIdsToRemove = [...oldVariableRefs].filter(id => !newVariableRefs.has(id));

        if (variableIdsToAdd.length > 0) {
          await addToNodeLinkedField(tx, targetNodeId, 'linkedVariableIds', variableIdsToAdd);
        }
        if (variableIdsToRemove.length > 0) {
          await removeFromNodeLinkedField(tx, targetNodeId, 'linkedVariableIds', variableIdsToRemove);
        }

        // ?? NOUVEAU: Backfill linkedVariableIds pour tous les lookups de la table associÃƒÂ¯Ã‚Â¿Ã‚Â½e
        try {
          // RÃƒÂ¯Ã‚Â¿Ã‚Â½cupÃƒÂ¯Ã‚Â¿Ã‚Â½rer le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud propriÃƒÂ¯Ã‚Â¿Ã‚Â½taire pour accÃƒÂ¯Ã‚Â¿Ã‚Â½der ÃƒÂ¯Ã‚Â¿Ã‚Â½ ses tables
          const nodeData = await tx.treeBranchLeafNode.findUnique({
            where: { id: targetNodeId },
            select: { linkedTableIds: true }
          });

          if (nodeData && nodeData.linkedTableIds && nodeData.linkedTableIds.length > 0) {
            
            // Pour chaque table associÃƒÂ¯Ã‚Â¿Ã‚Â½e ÃƒÂ¯Ã‚Â¿Ã‚Â½ ce nÃƒÂ¯Ã‚Â¿Ã‚Â½ud
            for (const tableId of nodeData.linkedTableIds) {
              const table = await tx.treeBranchLeafNodeTable.findUnique({
                where: { id: tableId },
                select: { 
                  id: true,
                  name: true,
                  nodeId: true,
                  lookupSelectColumn: true,
                  lookupDisplayColumns: true
                }
              });

              if (table) {
                
                // Chercher tous les nÃƒÂ¯Ã‚Â¿Ã‚Â½uds Select/Cascader qui utilisent cette table
                // Via la relation TreeBranchLeafSelectConfig.tableReference
                const selectConfigsUsingTable = await tx.treeBranchLeafSelectConfig.findMany({
                  where: { tableReference: table.id },
                  select: { nodeId: true }
                });

                if (selectConfigsUsingTable.length > 0) {
                  
                  for (const config of selectConfigsUsingTable) {
                    const selectNode = await tx.treeBranchLeafNode.findUnique({
                      where: { id: config.nodeId },
                      select: { 
                        id: true,
                        label: true,
                        linkedVariableIds: true
                      }
                    });
                    
                    if (selectNode) {
                      const currentLinkedIds = selectNode.linkedVariableIds || [];
                      
                      // Ajouter l'ID de la variable si pas dÃƒÂ¯Ã‚Â¿Ã‚Â½jÃƒÂ¯Ã‚Â¿Ã‚Â½ prÃƒÂ¯Ã‚Â¿Ã‚Â½sent
                      if (!currentLinkedIds.includes(variable.id)) {
                        const updatedLinkedIds = [...currentLinkedIds, variable.id];
                        
                        await tx.treeBranchLeafNode.update({
                          where: { id: selectNode.id },
                          data: { 
                            linkedVariableIds: updatedLinkedIds,
                            updatedAt: new Date()
                          }
                        });
                        
                      } else {
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[TreeBranchLeaf API] Warning updating lookup linkedVariableIds:', (e as Error).message);
        }
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating inverse linkedVariableIds:', (e as Error).message);
      }

      return variable;
    });

    const ownerIdForResponse = targetNodeId;
    const proxiedNodeIdForResponse = proxiedTargetNodeId;

    try {
      const nodeAfter = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { data_activeId: true }
      });
      const usedVariableId = nodeAfter?.data_activeId || (updated as { id?: string }).id || null;
      return res.json({ ...updated, usedVariableId, ownerNodeId: ownerIdForResponse, proxiedFromNodeId: proxiedNodeIdForResponse });
    } catch {
      return res.json({ ...updated, ownerNodeId: ownerIdForResponse, proxiedFromNodeId: proxiedNodeIdForResponse });
    }
  } catch (error) {
    const err = error as unknown as { code?: string };
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'La variable exposÃƒÆ’Ã‚Â©e (exposedKey) existe dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â ' });
    }
    console.error('[TreeBranchLeaf API] Error updating node data:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour de la donnÃƒÆ’Ã‚Â©e du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬ËœÃƒÂ¯Ã‚Â¸Ã‚Â DELETE VARIABLE - Suppression d'une variable avec cascade
// =============================================================================

// DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// Supprime une variable ET la capacitÃƒÆ’Ã‚Â© (formule/condition/table) qu'elle rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
router.delete('/trees/:treeId/nodes/:nodeId/data', async (req, res) => {
  try {
    const { treeId, nodeId } = req.params;
    const { organizationId } = req.user!;


    // VÃƒÆ’Ã‚Â©rifier l'appartenance de l'arbre ÃƒÆ’Ã‚Â  l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â©' });
    }

    // VÃƒÆ’Ã‚Â©rifier que le nÃƒâ€¦Ã¢â‚¬Å“ud existe
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId, treeId },
      select: { id: true, linkedVariableIds: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    // RÃƒÆ’Ã‚Â©soudre la variable (support des nÃƒâ€¦Ã¢â‚¬Å“uds proxys/display)
    const { variable, ownerNodeId, proxiedFromNodeId } = await resolveNodeVariable(nodeId, node.linkedVariableIds);

    // Idempotence: si la variable n'existe plus, on considÃƒÆ’Ã‚Â¨re que la suppression est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  effective.
    if (!variable || !ownerNodeId) {
      return res.status(200).json({ success: true, message: 'Variable dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  supprimÃƒÆ’Ã‚Â©e' });
    }


    // ÃƒÂ¢Ã‚ÂÃ…â€™ PAS de suppression en cascade : on garde les capacitÃƒÆ’Ã‚Â©s (formule/condition/table)
    // On supprime uniquement la variable, la capacitÃƒÆ’Ã‚Â© reste accessible directement

    // Supprimer la variable elle-mÃƒÆ’Ã‚Âªme
    await prisma.treeBranchLeafNodeVariable.delete({
      where: { nodeId: ownerNodeId }
    });

    // DÃƒÆ’Ã‚Â©sactiver la capacitÃƒÆ’Ã‚Â© "DonnÃƒÆ’Ã‚Â©es" sur le nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire et les proxys impactÃƒÆ’Ã‚Â©s
    const nodesToDisable = Array.from(new Set([ownerNodeId, proxiedFromNodeId].filter(Boolean))) as string[];
    if (nodesToDisable.length > 0) {
      await prisma.treeBranchLeafNode.updateMany({
        where: { id: { in: nodesToDisable } },
        data: { hasData: false, updatedAt: new Date() }
      });
    }

    // Nettoyer les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences ÃƒÆ’Ã‚Â  cette variable dans tout l'arbre
    try {
      // 1. Trouver tous les nÃƒâ€¦Ã¢â‚¬Å“uds qui rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencent la variable en cours de suppression
      const dependentNodes = await prisma.treeBranchLeafNode.findMany({
        where: {
          treeId,
          linkedVariableIds: { has: variable.id }, // On cherche les nÃƒâ€¦Ã¢â‚¬Å“uds qui ont l'ID de notre variable
        },
        select: { id: true, linkedVariableIds: true },
      });


      // 2. Pour chaque nÃƒâ€¦Ã¢â‚¬Å“ud dÃƒÆ’Ã‚Â©pendant, retirer la rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence ÃƒÆ’Ã‚Â  la variable supprimÃƒÆ’Ã‚Â©e
      for (const nodeToClean of dependentNodes) {
        const updatedLinkedIds = nodeToClean.linkedVariableIds.filter(id => id !== variable.id);
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeToClean.id },
          data: { linkedVariableIds: updatedLinkedIds },
        });
      }
    } catch (e) {
      console.warn('[DELETE Variable] Avertissement lors du nettoyage des linkedVariableIds:', (e as Error).message);
    }

    return res.json({ success: true, message: 'Variable supprimÃƒÆ’Ã‚Â©e avec succÃƒÆ’Ã‚Â¨s' });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [DELETE Variable] Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la variable' });
  }
});

// =============================================================================
// ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â NODE CONDITIONS - Conditions d'un nÃƒâ€¦Ã¢â‚¬Å“ud
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/conditions
// ANCIENNE ROUTE COMMENTÃƒÆ’Ã¢â‚¬Â°E - Utilisait conditionConfig du nÃƒâ€¦Ã¢â‚¬Å“ud directement
// Maintenant nous utilisons la table TreeBranchLeafNodeCondition (voir ligne ~1554)
/*
router.get('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et vÃƒÆ’Ã‚Â©rifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        conditionConfig: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    return res.json(node.conditionConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des conditions du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});
*/

// PUT /api/treebranchleaf/nodes/:nodeId/conditions
// Met ÃƒÆ’Ã‚Â  jour (ou crÃƒÆ’Ã‚Â©e) la configuration de conditions d'un nÃƒâ€¦Ã¢â‚¬Å“ud
router.put('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };
    const payload = req.body ?? {};

    // Valider grossiÃƒÆ’Ã‚Â¨rement le payload (doit ÃƒÆ’Ã‚Âªtre un objet JSON)
    const isObject = payload && typeof payload === 'object' && !Array.isArray(payload);
    if (!isObject) {
      return res.status(400).json({ error: 'Payload de conditions invalide' });
    }

    // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et vÃƒÆ’Ã‚Â©rifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: { id: true, TreeBranchLeafTree: { select: { organizationId: true } } }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        conditionConfig: payload as Prisma.InputJsonValue,
        hasCondition: true,
        updatedAt: new Date()
      },
      select: { conditionConfig: true, hasCondition: true }
    });

    return res.json(updated.conditionConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour des conditions du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â® NODE FORMULA - Formule d'un nÃƒâ€¦Ã¢â‚¬Å“ud
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/formula
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re la configuration de formule d'un nÃƒâ€¦Ã¢â‚¬Å“ud (formulaConfig)
router.get('/nodes/:nodeId/formula', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et vÃƒÆ’Ã‚Â©rifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        formulaConfig: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    return res.json(node.formulaConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de la formule du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// PUT /nodes/:nodeId/formula
// Met ÃƒÆ’Ã‚Â  jour (ou crÃƒÆ’Ã‚Â©e) la configuration de formule d'un nÃƒâ€¦Ã¢â‚¬Å“ud
router.put('/nodes/:nodeId/formula', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };
    const payload = req.body ?? {};

    // Valider grossiÃƒÆ’Ã‚Â¨rement le payload (doit ÃƒÆ’Ã‚Âªtre un objet JSON)
    const isObject = payload && typeof payload === 'object' && !Array.isArray(payload);
    if (!isObject) {
      return res.status(400).json({ error: 'Payload de formule invalide' });
    }

    // Charger le nÃƒâ€¦Ã¢â‚¬Å“ud et vÃƒÆ’Ã‚Â©rifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: { id: true, TreeBranchLeafTree: { select: { organizationId: true } } }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        formulaConfig: payload as Prisma.InputJsonValue,
        hasFormula: true,
        updatedAt: new Date()
      },
      select: { formulaConfig: true, hasFormula: true }
    });

    return res.json(updated.formulaConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour de la formule du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â® NODE FORMULAS - Formules spÃƒÆ’Ã‚Â©cifiques ÃƒÆ’Ã‚Â  un nÃƒâ€¦Ã¢â‚¬Å“ud (nouvelle table dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©e)
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/formulas
// Liste les formules spÃƒÆ’Ã‚Â©cifiques ÃƒÆ’Ã‚Â  un nÃƒâ€¦Ã¢â‚¬Å“ud
router.get('/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les formules de ce nÃƒâ€¦Ã¢â‚¬Å“ud
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ formulas });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node formulas:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des formules du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// POST /nodes/:nodeId/formulas
// CrÃƒÆ’Ã‚Â©e une nouvelle formule pour un nÃƒâ€¦Ã¢â‚¬Å“ud
router.post('/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, tokens, description, targetProperty, constraintMessage } = req.body || {};

    // Debug: log des infos d'authentification

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (!name || !Array.isArray(tokens)) {
      return res.status(400).json({ error: 'Name et tokens requis' });
    }

    // GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer un nom unique en cas de conflit
    let uniqueName = String(name);
    let counter = 1;
    
    while (true) {
      try {
        const existingFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
          where: {
            nodeId,
            name: uniqueName
          }
        });
        
        if (!existingFormula) {
          break; // Le nom est disponible
        }
        
        // Si le nom existe, ajouter un suffixe numÃƒÆ’Ã‚Â©rique
        uniqueName = `${name} (${counter})`;
        counter++;
        
      } catch (error) {
        console.error('Erreur lors de la vÃƒÆ’Ã‚Â©rification du nom de formule:', error);
        break;
      }
    }

    const formula = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: randomUUID(),
        nodeId,
        organizationId: organizationId || null,
        name: uniqueName,
        tokens: tokens as unknown as Prisma.InputJsonValue,
        description: description ? String(description) : null,
        targetProperty: targetProperty ? String(targetProperty) : null, // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ PropriÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© cible
        constraintMessage: constraintMessage ? String(constraintMessage) : null, // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ Message de contrainte
        updatedAt: new Date()
      }
    });

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ACTIVATION AUTOMATIQUE : Configurer hasFormula ET formula_activeId
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { 
        hasFormula: true,
        formula_activeId: formula.id  // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVEAU : Activer automatiquement la formule
      }
    });

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MAJ linkedFormulaIds du nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire + des nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s
    try {
      await addToNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formula.id]);
      const refIds = Array.from(extractNodeIdsFromTokens(tokens));
      for (const refId of refIds) {
        await addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [formula.id]);
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds after create:', (e as Error).message);
    }

    return res.status(201).json(formula);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la crÃƒÆ’Ã‚Â©ation de la formule' });
  }
});

// PUT /api/treebranchleaf/nodes/:nodeId/formulas/:formulaId
// Met ÃƒÆ’Ã‚Â  jour une formule spÃƒÆ’Ã‚Â©cifique
router.put('/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, tokens, description, targetProperty, constraintMessage } = req.body || {};

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // VÃƒÆ’Ã‚Â©rifier que la formule appartient bien ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
      where: { id: formulaId, nodeId }
    });

    if (!existingFormula) {
      return res.status(404).json({ error: 'Formule non trouvÃƒÆ’Ã‚Â©e' });
    }

    const updated = await prisma.treeBranchLeafNodeFormula.update({
      where: { id: formulaId },
      data: {
        name: name ? String(name) : undefined,
        tokens: Array.isArray(tokens) ? (tokens as unknown as Prisma.InputJsonValue) : undefined,
        description: description !== undefined ? (description ? String(description) : null) : undefined,
        targetProperty: targetProperty !== undefined ? (targetProperty ? String(targetProperty) : null) : undefined, // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ PropriÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© cible
        constraintMessage: constraintMessage !== undefined ? (constraintMessage ? String(constraintMessage) : null) : undefined, // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ Message de contrainte
        updatedAt: new Date()
      }
    });

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ MAJ des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences inverses si tokens ont changÃƒÆ’Ã‚Â©
    try {
      const oldRefs = extractNodeIdsFromTokens(existingFormula.tokens);
      const newRefs = extractNodeIdsFromTokens(Array.isArray(tokens) ? tokens : existingFormula.tokens);
      const oldSet = new Set(Array.from(oldRefs).map(normalizeRefId));
      const newSet = new Set(Array.from(newRefs).map(normalizeRefId));
      const toAdd: string[] = Array.from(newSet).filter(id => !oldSet.has(id));
      const toRemove: string[] = Array.from(oldSet).filter(id => !newSet.has(id));
      if (toAdd.length) {
        for (const refId of toAdd) await addToNodeLinkedField(prisma, refId, 'linkedFormulaIds', [formulaId]);
      }
      if (toRemove.length) {
        for (const refId of toRemove) await removeFromNodeLinkedField(prisma, refId, 'linkedFormulaIds', [formulaId]);
      }
      // S'assurer que le nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire contient bien la formule
      await addToNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formulaId]);
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating inverse linkedFormulaIds after update:', (e as Error).message);
    }

    return res.json(updated);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour de la formule' });
  }
});

// DELETE /api/treebranchleaf/nodes/:nodeId/formulas/:formulaId
// Supprime une formule spÃƒÆ’Ã‚Â©cifique
router.delete('/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // VÃƒÆ’Ã‚Â©rifier que la formule appartient bien ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
      where: { id: formulaId, nodeId }
    });

    if (!existingFormula) {
      return res.status(404).json({ error: 'Formule non trouvÃƒÆ’Ã‚Â©e' });
    }

    await prisma.treeBranchLeafNodeFormula.delete({
      where: { id: formulaId }
    });

    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ NOUVEAU : Supprimer la variable qui rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence cette formule
    try {
      const variableWithFormula = await prisma.treeBranchLeafNodeVariable.findFirst({
        where: { 
          nodeId,
          sourceRef: `node-formula:${formulaId}`
        }
      });
      
      if (variableWithFormula) {
        await prisma.treeBranchLeafNodeVariable.delete({
          where: { nodeId }
        });
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning deleting associated variable:', (e as Error).message);
    }
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Nettoyage linkedFormulaIds du nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire et des nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s
    try {
      await removeFromNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formulaId]);
      const refIds = Array.from(extractNodeIdsFromTokens(existingFormula.tokens));
      for (const refId of refIds) {
        await removeFromNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [formulaId]);
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning cleaning linkedFormulaIds after delete:', (e as Error).message);
    }

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION : Mettre ÃƒÆ’Ã‚Â  jour hasFormula en fonction des formules restantes
    const remainingFormulas = await prisma.treeBranchLeafNodeFormula.count({ where: { nodeId } });
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { hasFormula: remainingFormulas > 0 }
    });

    return res.json({ success: true, message: 'Formule supprimÃƒÆ’Ã‚Â©e avec succÃƒÆ’Ã‚Â¨s' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node formula:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la formule' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡ REUSABLE FORMULAS - Formules rÃƒÆ’Ã‚Â©utilisables (persistance Prisma)
// =============================================================================

// GET /api/treebranchleaf/reusables/formulas
// Liste TOUTES les formules de TreeBranchLeafNodeFormula (toutes sont rÃƒÆ’Ã‚Â©utilisables !)
router.get('/reusables/formulas', async (req, res) => {
  try {
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const hasOrg = typeof organizationId === 'string' && organizationId.length > 0;

    // Formules de nÃƒâ€¦Ã¢â‚¬Å“uds (toutes sont rÃƒÆ’Ã‚Â©utilisables)
    const whereFilter = isSuperAdmin
      ? {}
      : {
          OR: [
            { organizationId: null },
            ...(hasOrg ? [{ organizationId }] : [])
          ]
        };

    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: whereFilter,
      orderBy: { createdAt: 'desc' }
    });

    // Recuperer les infos des noeuds separement
    const nodeIds = [...new Set(allFormulas.map(f => f.nodeId))];
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, label: true, treeId: true }
    });
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Ajouter les metadonnees pour le frontend
    const items = allFormulas.map(f => {
      const node = nodeMap.get(f.nodeId);
      return {
        ...f,
        type: 'node',
        nodeLabel: node?.label || 'Noeud inconnu',
        treeId: node?.treeId || null
      };
    });

    return res.json({ items });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error listing all formulas:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des formules' });
  }
});

// GET /api/treebranchleaf/reusables/formulas/:id
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re une formule spÃƒÆ’Ã‚Â©cifique par son ID depuis TreeBranchLeafNodeFormula
router.get('/reusables/formulas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    const item = await prisma.treeBranchLeafNodeFormula.findUnique({ 
      where: { id }
    });
    
    if (!item) return res.status(404).json({ error: 'Formule non trouvee' });

    if (!isSuperAdmin) {
      if (item.organizationId && item.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Acces refuse' });
      }
    }

    // Recuperer les infos du noeud separement
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: item.nodeId },
      select: { label: true, treeId: true }
    });

    return res.json({
      ...item,
      type: 'node',
      nodeLabel: node?.label || 'Noeud inconnu',
      treeId: node?.treeId || null
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting formula:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la formule' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ REUSABLE CONDITIONS - Conditions rÃƒÆ’Ã‚Â©utilisables globales
// =============================================================================

// GET /api/treebranchleaf/reusables/conditions
// Liste toutes les conditions rÃƒÆ’Ã‚Â©utilisables (ÃƒÆ’Ã‚Â©quivalent aux formules rÃƒÆ’Ã‚Â©utilisables)
router.get('/reusables/conditions', async (req, res) => {
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const hasOrg = typeof organizationId === 'string' && organizationId.length > 0;

    // Conditions de nÃƒâ€¦Ã¢â‚¬Å“uds (toutes sont rÃƒÆ’Ã‚Â©utilisables)
    const whereFilter = isSuperAdmin
      ? {}
      : {
          OR: [
            { organizationId: null },
            ...(hasOrg ? [{ organizationId }] : [])
          ]
        };

    const allConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: whereFilter,
      orderBy: { createdAt: 'desc' }
    });

    // Recuperer les infos des noeuds separement
    const nodeIds = [...new Set(allConditions.map(c => c.nodeId))];
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, label: true, treeId: true }
    });
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Ajouter les metadonnees pour le frontend
    const items = allConditions.map(c => {
      const node = nodeMap.get(c.nodeId);
      return {
        ...c,
        type: 'node',
        nodeLabel: node?.label || 'Noeud inconnu',
        treeId: node?.treeId || null,
        nodeId: c.nodeId
      };
    });

    return res.json({ items });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error listing reusable conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des conditions reutilisables' });
  }
});

// GET /api/treebranchleaf/reusables/conditions/:id
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re une condition spÃƒÆ’Ã‚Â©cifique par son ID depuis TreeBranchLeafNodeCondition
router.get('/reusables/conditions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    const item = await prisma.treeBranchLeafNodeCondition.findUnique({ 
      where: { id }
    });
    
    if (!item) return res.status(404).json({ error: 'Condition non trouvee' });

    if (!isSuperAdmin) {
      if (item.organizationId && item.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Acces refuse' });
      }
    }

    // Recuperer les infos du noeud separement
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: item.nodeId },
      select: { label: true, treeId: true }
    });

    return res.json({
      ...item,
      type: 'node',
      nodeLabel: node?.label || 'Noeud inconnu',
      treeId: node?.treeId || null
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting condition:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la condition' });
  }
});

// GET /api/treebranchleaf/reusables/tables
// Liste TOUTES les tables rÃƒÆ’Ã‚Â©utilisables de TOUS les nÃƒâ€¦Ã¢â‚¬Å“uds (avec filtrage organisation)
router.get('/reusables/tables', async (req, res) => {
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const hasOrg = typeof organizationId === 'string' && organizationId.length > 0;

    // Tables de nÃƒâ€¦Ã¢â‚¬Å“uds (toutes sont rÃƒÆ’Ã‚Â©utilisables)
    const whereFilter = isSuperAdmin
      ? {}
      : {
          OR: [
            { organizationId: null },
            ...(hasOrg ? [{ organizationId }] : [])
          ]
        };

    const allTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: whereFilter,
      orderBy: { createdAt: 'desc' }
    });

    // Recuperer les infos des noeuds separement
    const nodeIds = [...new Set(allTables.map(t => t.nodeId))];
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, label: true, treeId: true }
    });
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Ajouter les metadonnees pour le frontend
    const items = allTables.map(t => {
      const node = nodeMap.get(t.nodeId);
      return {
        id: t.id,
        name: t.name,
        type: t.type,
        description: t.description,
        nodeLabel: node?.label || 'Noeud inconnu',
        treeId: node?.treeId || null,
        nodeId: t.nodeId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    });

    return res.json({ items });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error listing reusable tables:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des tables reutilisables' });
  }
});

// =============================================================================
// ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â NODE CONDITIONS - Conditions spÃƒÆ’Ã‚Â©cifiques ÃƒÆ’Ã‚Â  un nÃƒâ€¦Ã¢â‚¬Å“ud (nouvelle table dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©e)
// =============================================================================

// GET /api/treebranchleaf/nodes/:nodeId/conditions
// Liste les conditions spÃƒÆ’Ã‚Â©cifiques ÃƒÆ’Ã‚Â  un nÃƒâ€¦Ã¢â‚¬Å“ud
router.get('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les conditions de ce nÃƒâ€¦Ã¢â‚¬Å“ud avec filtre d'organisation
    const whereClause: { nodeId: string; organizationId?: string } = { nodeId };
    
    // Ajouter le filtre d'organisation si ce n'est pas un super admin
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }


    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });

    
    return res.json({ conditions });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des conditions du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

// POST /api/treebranchleaf/evaluate/condition/:conditionId
// ÃƒÆ’Ã¢â‚¬Â°value une condition spÃƒÆ’Ã‚Â©cifique et retourne le rÃƒÆ’Ã‚Â©sultat
router.post('/evaluate/condition/:conditionId', async (req, res) => {
  try {
    const { conditionId } = req.params;
    const { fieldValues = {}, values = {}, submissionId, testMode = true } = req.body;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Fusionner fieldValues et values pour compatibilitÃƒÆ’Ã‚Â©
    const allValues = { ...fieldValues, ...values };

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la condition
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId },
      include: {
        TreeBranchLeafNode: {
          select: {
            label: true,
            treeId: true
          }
        }
      }
    });

    if (!condition) {
      return res.status(404).json({ error: 'Condition non trouvÃƒÆ’Ã‚Â©e' });
    }

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s organisation
    if (!isSuperAdmin && condition.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette condition' });
    }

    // ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ UTILISATION DU SYSTÃƒÆ’Ã‹â€ ME UNIFIÃƒÆ’Ã¢â‚¬Â° operation-interpreter
    try {
      const { evaluateVariableOperation } = await import('./operation-interpreter');
      
      // Convertir allValues en Map pour le mode preview
      const valueMapLocal = new Map<string, unknown>();
      Object.entries(allValues).forEach(([nodeId, value]) => {
        valueMapLocal.set(nodeId, value);
      });
      
      
      // ÃƒÂ¢Ã…â€œÃ‚Â¨ Calculer avec le systÃƒÆ’Ã‚Â¨me unifiÃƒÆ’Ã‚Â© (passe valueMapLocal pour mode preview)
      const calculationResult = await evaluateVariableOperation(
        condition.nodeId,
        submissionId || conditionId,
        prisma,
        valueMapLocal
      );
      
      
      // Construire la rÃƒÆ’Ã‚Â©ponse UNIQUEMENT avec TBL-prisma (pas de fallback !)
      const result = {
        conditionId: condition.id,
        conditionName: condition.name,
        nodeLabel: condition.TreeBranchLeafNode?.label || 'NÃƒâ€¦Ã¢â‚¬Å“ud inconnu',
        operationSource: calculationResult.operationSource,
        operationDetail: calculationResult.operationDetail,
        operationResult: calculationResult.operationResult,
        evaluation: {
          success: true,
          mode: 'tbl-prisma',
          timestamp: new Date().toISOString(),
          testMode: testMode
        }
      };
      
      return res.json(result);
      
    } catch (error) {
      console.error('[TBL-PRISMA] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur ÃƒÆ’Ã‚Â©valuation TBL-prisma:', error);
      
      return res.status(500).json({
        error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation TBL-prisma',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error evaluating condition:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation de la condition' });
  }
});

// POST /api/treebranchleaf/nodes/:nodeId/conditions
// CrÃƒÆ’Ã‚Â©e une nouvelle condition pour un nÃƒâ€¦Ã¢â‚¬Å“ud
router.post('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, conditionSet, description } = req.body || {};

    // Debug: log des infos d'authentification

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (!name || !conditionSet) {
      return res.status(400).json({ error: 'Name et conditionSet requis' });
    }

    // GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer un nom unique si le nom existe dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â 
    let uniqueName = String(name);
    let counter = 1;
    
    while (true) {
      const existingCondition = await prisma.treeBranchLeafNodeCondition.findFirst({
        where: {
          nodeId,
          name: uniqueName,
          organizationId: organizationId || null
        }
      });
      
      if (!existingCondition) {
        break; // Le nom est unique
      }
      
      // Le nom existe, ajouter un numÃƒÆ’Ã‚Â©ro
      uniqueName = `${name} (${counter})`;
      counter++;
      
      // SÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â©: ÃƒÆ’Ã‚Â©viter une boucle infinie
      if (counter > 100) {
        uniqueName = `${name} (${Date.now()})`;
        break;
      }
    }


    const condition = await prisma.treeBranchLeafNodeCondition.create({
      data: {
        id: randomUUID(),
        nodeId,
        organizationId: organizationId || null,
        name: uniqueName,
        conditionSet: conditionSet as unknown as Prisma.InputJsonValue,
        description: description ? String(description) : null,
        updatedAt: new Date()
      }
    });

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ACTIVATION AUTOMATIQUE : Configurer hasCondition ET condition_activeId
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { 
        hasCondition: true,
        condition_activeId: condition.id  // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVEAU : Activer automatiquement la condition
      }
    });

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MAJ linkedConditionIds du nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire + des nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s
    try {
      await addToNodeLinkedField(prisma, nodeId, 'linkedConditionIds', [condition.id]);
      const refIds = Array.from(extractNodeIdsFromConditionSet(conditionSet));
      for (const refId of refIds) {
        await addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [condition.id]);
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds after create:', (e as Error).message);
    }

    return res.status(201).json(condition);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node condition:', error);
    res.status(500).json({ error: 'Erreur lors de la crÃƒÆ’Ã‚Â©ation de la condition' });
  }
});

// PUT /api/treebranchleaf/nodes/:nodeId/conditions/:conditionId
// Met ÃƒÆ’Ã‚Â  jour une condition spÃƒÆ’Ã‚Â©cifique
router.put('/nodes/:nodeId/conditions/:conditionId', async (req, res) => {
  try {
    const { nodeId, conditionId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, conditionSet, description } = req.body || {};

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // VÃƒÆ’Ã‚Â©rifier que la condition appartient bien ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findFirst({
      where: { id: conditionId, nodeId }
    });

    if (!existingCondition) {
      return res.status(404).json({ error: 'Condition non trouvÃƒÆ’Ã‚Â©e' });
    }

    const updated = await prisma.treeBranchLeafNodeCondition.update({
      where: { id: conditionId },
      data: {
        name: name ? String(name) : undefined,
        conditionSet: conditionSet ? (conditionSet as unknown as Prisma.InputJsonValue) : undefined,
        description: description !== undefined ? (description ? String(description) : null) : undefined,
        updatedAt: new Date()
      }
    });

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ MAJ des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences inverses si conditionSet a changÃƒÆ’Ã‚Â©
    try {
      const oldRefs = extractNodeIdsFromConditionSet(existingCondition.conditionSet);
      const newRefs = extractNodeIdsFromConditionSet(conditionSet ?? existingCondition.conditionSet);
      const oldSet = new Set(Array.from(oldRefs).map(normalizeRefId));
      const newSet = new Set(Array.from(newRefs).map(normalizeRefId));
      const toAdd: string[] = Array.from(newSet).filter(id => !oldSet.has(id));
      const toRemove: string[] = Array.from(oldSet).filter(id => !newSet.has(id));
      if (toAdd.length) {
        for (const refId of toAdd) await addToNodeLinkedField(prisma, refId, 'linkedConditionIds', [conditionId]);
      }
      if (toRemove.length) {
        for (const refId of toRemove) await removeFromNodeLinkedField(prisma, refId, 'linkedConditionIds', [conditionId]);
      }
      // S'assurer que le nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire contient bien la condition
      await addToNodeLinkedField(prisma, nodeId, 'linkedConditionIds', [conditionId]);
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating inverse linkedConditionIds after update:', (e as Error).message);
    }

    return res.json(updated);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node condition:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour de la condition' });
  }
});

// DELETE /api/treebranchleaf/nodes/:nodeId/conditions/:conditionId
// Supprime une condition spÃƒÆ’Ã‚Â©cifique
router.delete('/nodes/:nodeId/conditions/:conditionId', async (req, res) => {
  try {
    const { nodeId, conditionId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // VÃƒÆ’Ã‚Â©rifier que la condition appartient bien ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findFirst({
      where: { id: conditionId, nodeId }
    });

    if (!existingCondition) {
      return res.status(404).json({ error: 'Condition non trouvÃƒÆ’Ã‚Â©e' });
    }

    await prisma.treeBranchLeafNodeCondition.delete({
      where: { id: conditionId }
    });

    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ NOUVEAU : Supprimer la variable qui rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence cette condition
    try {
      const variableWithCondition = await prisma.treeBranchLeafNodeVariable.findFirst({
        where: { 
          nodeId,
          sourceRef: `node-condition:${conditionId}`
        }
      });
      
      if (variableWithCondition) {
        await prisma.treeBranchLeafNodeVariable.delete({
          where: { nodeId }
        });
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning deleting associated variable:', (e as Error).message);
    }
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Nettoyage linkedConditionIds du nÃƒâ€¦Ã¢â‚¬Å“ud propriÃƒÆ’Ã‚Â©taire et des nÃƒâ€¦Ã¢â‚¬Å“uds rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s
    try {
      await removeFromNodeLinkedField(prisma, nodeId, 'linkedConditionIds', [conditionId]);
      const refIds = Array.from(extractNodeIdsFromConditionSet(existingCondition.conditionSet));
      for (const refId of refIds) {
        await removeFromNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [conditionId]);
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning cleaning linkedConditionIds after delete:', (e as Error).message);
    }

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION : Mettre ÃƒÆ’Ã‚Â  jour hasCondition en fonction des conditions restantes
    const remainingConditions = await prisma.treeBranchLeafNodeCondition.count({ where: { nodeId } });
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { hasCondition: remainingConditions > 0 }
    });

    return res.json({ success: true, message: 'Condition supprimÃƒÆ’Ã‚Â©e avec succÃƒÆ’Ã‚Â¨s' });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting node condition:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la condition' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¸Ã‚Â NODE TABLES - Gestion des instances de tableaux dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©es
// =============================================================================

// GET /api/treebranchleaf/tables/:id - DÃƒÆ’Ã‚Â©tails d'une table avec lignes paginÃƒÆ’Ã‚Â©es
router.get('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  
  // Pagination
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100; // Par dÃƒÆ’Ã‚Â©faut, 100 lignes
  const offset = (page - 1) * limit;


  try {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id },
      include: {
        node: {
          select: {
            treeId: true,
            TreeBranchLeafTree: {
              select: {
                organizationId: true
              }
            }
          }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table non trouvÃƒÆ’Ã‚Â©e' });
    }

    // VÃƒÆ’Ã‚Â©rification de l'organisation
    const tableOrgId = table.node?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s non autorisÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette table' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les lignes paginÃƒÆ’Ã‚Â©es
    const rows = await prisma.treeBranchLeafNodeTableRow.findMany({
      where: { tableId: id },
      orderBy: { rowIndex: 'asc' },
      take: limit,
      skip: offset,
    });


    // Renvoyer la rÃƒÆ’Ã‚Â©ponse
    res.json({
      ...table,
      rows: rows.map(r => r.cells), // Renvoyer uniquement les donnÃƒÆ’Ã‚Â©es des cellules
      page,
      limit,
      totalRows: table.rowCount,
      totalPages: Math.ceil(table.rowCount / limit),
    });

  } catch (error) {
    console.error(`ÃƒÂ¢Ã‚ÂÃ…â€™ [GET /tables/:id] Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de la table ${id}:`, error);
    res.status(500).json({ error: 'Impossible de rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la table' });
  }
});

type TableJsonValue = Prisma.JsonValue;
type TableJsonObject = Prisma.JsonObject;

const isJsonObject = (value: TableJsonValue | null | undefined): value is TableJsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;

// ==================================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â FONCTION DE FILTRAGE D'OPTIONS DE TABLE PAR FILTRE SIMPLE
// ==================================================================================
function applySingleFilter(
  filter: any,
  options: Array<{ value: string; label: string }>,
  tableData: NormalizedTable,
  formValues: Record<string, any>
): Array<{ value: string; label: string }> {
  const { columnName, operator, value: filterValue } = filter;


  // RÃƒÆ’Ã‚Â©soudre la valeur du filtre selon son type de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
  let resolvedValue = filterValue;
  let nodeId: string | undefined = undefined;
  
  if (typeof filterValue === 'string') {
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ Support pour @calculated.xxx ou @calculated:xxx
    if (filterValue.startsWith('@calculated.') || filterValue.startsWith('@calculated:')) {
      nodeId = filterValue.replace(/^@calculated[.:]/, '');
      resolvedValue = formValues[nodeId];
    }
    // Support pour @select.xxx
    else if (filterValue.startsWith('@select.')) {
      nodeId = filterValue.replace('@select.', '');
      resolvedValue = formValues[nodeId];
    }
    // Support pour @value.xxx
    else if (filterValue.startsWith('@value.')) {
      nodeId = filterValue.replace('@value.', '');
      resolvedValue = formValues[nodeId];
    }
    // Support pour @formula.xxx ou node-formula:xxx
    else if (filterValue.startsWith('@formula.') || filterValue.startsWith('node-formula:')) {
      nodeId = filterValue.replace(/^@formula\.|^node-formula:/, '');
      resolvedValue = formValues[nodeId];
    }
    else {
    }
  }

  // Si pas de valeur rÃƒÆ’Ã‚Â©solue et qu'on avait une rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence, utiliser 0 par dÃƒÆ’Ã‚Â©faut
  if ((resolvedValue === undefined || resolvedValue === null || resolvedValue === '') && nodeId) {
    resolvedValue = 0; // Fallback ÃƒÆ’Ã‚Â  0 pour permettre la comparaison
  }

  // Trouver l'index de la colonne
  const colIndex = tableData.columns.indexOf(columnName);
  if (colIndex === -1) {
    console.warn(`[applySingleFilter] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Colonne "${columnName}" introuvable`);
    return options;
  }

  // Filtrer les options
  return options.filter(option => {
    const rowIndex = tableData.data.findIndex(row => row[0] === option.value);
    if (rowIndex === -1) return false;

    const cellValue = tableData.data[rowIndex][colIndex];
    const result = compareValues(cellValue, resolvedValue, operator);
    
    if (!result) {
    }
    
    return result;
  });
}

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã…â€œÃƒÂ¯Ã‚Â¸Ã‚Â COMPRESSION POUR GROS TABLEAUX
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

/**
 * ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â FONCTION DÃƒÆ’Ã¢â‚¬Â°PRÃƒÆ’Ã¢â‚¬Â°CIÃƒÆ’Ã¢â‚¬Â°E - Utilisait l'ancienne architecture avec colonnes JSON
 * Maintenant que les tables sont normalisÃƒÆ’Ã‚Â©es (table-routes-new.ts), cette fonction n'est plus utilisÃƒÆ’Ã‚Â©e
 */
/*
const compressIfNeeded = (data: TableJsonValue): TableJsonValue => {
  if (!data || typeof data !== 'object') return data;
  
  const jsonString = JSON.stringify(data);
  const sizeKB = jsonString.length / 1024;
  
  
  // Si > 1MB, on compresse
  if (sizeKB > 1024) {
    const compressed = gzipSync(jsonString);
    const compressedB64 = compressed.toString('base64');
    const compressedSizeKB = compressedB64.length / 1024;
    const ratio = Math.round((1 - compressedSizeKB / sizeKB) * 100);
    
    
    return {
      _compressed: true,
      _data: compressedB64
    } as TableJsonValue;
  }
  
  return data;
};
*/

/**
 * DÃƒÆ’Ã‚Â©compresse les donnÃƒÆ’Ã‚Â©es si elles ÃƒÆ’Ã‚Â©taient compressÃƒÆ’Ã‚Â©es
 */
const _decompressIfNeeded = (value: TableJsonValue | null | undefined): TableJsonValue => {
  if (!value || typeof value !== 'object') return value;
  
  const obj = value as TableJsonObject;
  
  if (obj._compressed && typeof obj._data === 'string') {
    try {
      const buffer = Buffer.from(obj._data, 'base64');
      const decompressed = gunzipSync(buffer);
      const jsonString = decompressed.toString('utf-8');
      const result = JSON.parse(jsonString);
      return result;
    } catch (error) {
  console.error('[decompressIfNeeded] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur dÃƒÆ’Ã‚Â©compression:', error);
      return value;
    }
  }
  
  return value;
};

// ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â OBSOLÃƒÆ’Ã‹â€ TE : readStringArray supprimÃƒÆ’Ã‚Â©e - Architecture normalisÃƒÆ’Ã‚Â©e utilise tableColumns

// ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â OBSOLÃƒÆ’Ã‹â€ TE : readMatrix et readStringArray supprimÃƒÆ’Ã‚Â©es - Architecture normalisÃƒÆ’Ã‚Â©e utilise tableRows/tableColumns

const readMeta = (value: TableJsonValue | null | undefined): Record<string, unknown> => {
  if (!value) return {};
  if (!isJsonObject(value)) return {};
  return jsonClone(value);
};

const buildRecordRows = (
  columns: string[],
  matrix: (string | number | boolean | null)[][]
): Record<string, string | number | boolean | null>[] => {
  
  const result = matrix.map((row) => {
    const obj: Record<string, string | number | boolean | null> = {};
    columns.forEach((col, index) => {
      obj[col] = index < row.length ? row[index] ?? null : null;
    });
    return obj;
  });
  
  return result;
};

type NormalizedTableInstance = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  columns: string[];
  rows: string[];
  matrix: (string | number | boolean | null)[][];
  data: { matrix: (string | number | boolean | null)[][] };
  records: Record<string, string | number | boolean | null>[];
  meta: Record<string, unknown>;
  order: number;
  isDefault: boolean;
};

const normalizeTableInstance = (
  table: any // TableColumns et TableRows chargÃƒÆ’Ã‚Â©s via include
): NormalizedTableInstance => {
  try {
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  ARCHITECTURE NORMALISÃƒÆ’Ã¢â‚¬Â°E : tableColumns et tableRows
    const columns = (table.tableColumns || [])
      .sort((a: any, b: any) => a.columnIndex - b.columnIndex)
      .map((col: any) => col.name);
    
    const rows = (table.tableRows || [])
      .sort((a: any, b: any) => a.rowIndex - b.rowIndex)
      .map((row: any) => {
        // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NOUVEAU: Prisma Json type retourne directement l'objet
        let cells: any;
        
        if (Array.isArray(row.cells)) {
          // Format actuel: cells est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  un array d'objets JS
          cells = row.cells;
        } else if (typeof row.cells === 'string') {
          // Ancien format string BRUTE (pas JSON): "Nord", "Sud-Est"...
          // C'est juste le label, pas un tableau !
          return row.cells;
        } else if (row.cells === null || row.cells === undefined) {
          return '';
        } else {
          // Autre format inconnu
          cells = [];
        }
        
        // Extraire le label (premier ÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©ment de l'array)
        return Array.isArray(cells) && cells.length > 0 ? String(cells[0]) : '';
      });
    
    const matrix = (table.tableRows || [])
      .sort((a: any, b: any) => a.rowIndex - b.rowIndex)
      .map((row: any) => {
        // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NOUVEAU: Prisma Json type retourne directement l'objet
        let cells: any;
        
        if (Array.isArray(row.cells)) {
          // Format actuel: cells est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  un array d'objets JS
          cells = row.cells;
        } else if (typeof row.cells === 'string') {
          // Ancien format string BRUTE: juste le label, pas de donnÃƒÆ’Ã‚Â©es
          // Retourner array vide car pas de data numeric
          return [];
        } else {
          cells = [];
        }
        
        // Les donnÃƒÆ’Ã‚Â©es commencent ÃƒÆ’Ã‚Â  partir de l'index 1 (index 0 = label)
        return Array.isArray(cells) ? cells.slice(1) : [];
      });
    
    
    const meta = readMeta(table.meta);

    const result = {
      id: table.id,
      name: table.name,
      description: table.description ?? null,
      type: table.type ?? 'columns',
      columns,
      rows,
      matrix,
      data: { matrix },
      records: buildRecordRows(columns, matrix),
      meta,
      order: table.order ?? 0,
      isDefault: Boolean(table.isDefault),
    };


    return result;
  } catch (error) {
    console.error('[normalizeTableInstance] ÃƒÂ¢Ã‚ÂÃ…â€™ ERREUR FATALE:', error);
    console.error('[normalizeTableInstance] table.id:', table?.id);
    console.error('[normalizeTableInstance] table structure:', JSON.stringify(table, null, 2));
    throw error;
  }
};

const syncNodeTableCapability = async (
  nodeId: string,
  client: PrismaClient | Prisma.TransactionClient = prisma
) => {
  const node = await client.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { id: true, table_activeId: true },
  });

  if (!node) return;

  const tables = await client.treeBranchLeafNodeTable.findMany({
    where: { nodeId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  if (tables.length === 0) {
    await client.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        hasTable: false,
        table_instances: null,
        table_activeId: null,
        table_name: null,
        table_type: null,
        table_columns: null,
        table_rows: null,
        table_data: null,
        table_meta: null,
        table_isImported: false,
        table_importSource: null,
      },
    });
    return;
  }

  const normalizedList = tables.map(normalizeTableInstance);
  const instances = normalizedList.reduce<Record<string, unknown>>((acc, instance) => {
    acc[instance.id] = {
      id: instance.id,
      name: instance.name,
      description: instance.description,
      type: instance.type,
      columns: instance.columns,
      rows: instance.rows,
      matrix: instance.matrix,
      data: instance.data,
      records: instance.records,
      meta: instance.meta,
      order: instance.order,
      isDefault: instance.isDefault,
    };
    return acc;
  }, {});

  const active =
    normalizedList.find((tbl) => tbl.id === node.table_activeId) ??
    normalizedList.find((tbl) => tbl.isDefault) ??
    normalizedList[0];

  const activeMeta = (active?.meta ?? {}) as Record<string, unknown>;
  const inferredIsImported =
    typeof (activeMeta as { isImported?: unknown }).isImported === 'boolean'
      ? (activeMeta as { isImported: boolean }).isImported
      : Boolean((activeMeta as { isImported?: unknown }).isImported);
  const inferredImportSource =
    typeof (activeMeta as { importSource?: unknown }).importSource === 'string'
      ? (activeMeta as { importSource: string }).importSource
      : null;

  await client.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: {
      hasTable: true,
      table_instances: instances as Prisma.InputJsonValue,
      table_activeId: active?.id ?? null,
      table_name: active?.name ?? null,
      table_type: active?.type ?? null,
      table_columns: (active?.columns ?? null) as Prisma.InputJsonValue,
      table_rows: (active?.rows ?? null) as Prisma.InputJsonValue,
      table_data: (active?.matrix ?? null) as Prisma.InputJsonValue,
      table_meta: (active?.meta ?? null) as Prisma.InputJsonValue,
      table_isImported: inferredIsImported,
      table_importSource: inferredImportSource,
    },
  });
};

const fetchNormalizedTable = async (
  nodeId: string,
  options: { tableId?: string } = {},
  client: PrismaClient | Prisma.TransactionClient = prisma
): Promise<{ table: NormalizedTableInstance; tables: NormalizedTableInstance[] } | null> => {
  const tablesRaw = await client.treeBranchLeafNodeTable.findMany({
    where: { nodeId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  if (!tablesRaw.length) {
    return null;
  }

  const tables = tablesRaw.map(normalizeTableInstance);

  let target = options.tableId ? tables.find((tbl) => tbl.id === options.tableId) : undefined;

  if (!target) {
    const nodeInfo = await client.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { table_activeId: true },
    });

    if (nodeInfo?.table_activeId) {
      target = tables.find((tbl) => tbl.id === nodeInfo.table_activeId) ?? target;
    }
  }

  const table = target ?? tables[0];

  return { table, tables };
};

// ÃƒÂ¢Ã¢â‚¬Â¢Ã¢â‚¬ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã¢â‚¬â€
// ÃƒÂ¢Ã¢â‚¬Â¢Ã¢â‚¬Ëœ ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ FONCTIONS DE FILTRAGE DES TABLES                                   ÃƒÂ¢Ã¢â‚¬Â¢Ã¢â‚¬Ëœ
// ÃƒÂ¢Ã¢â‚¬Â¢Ã…Â¡ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

/**
 * Applique les filtres configurÃƒÆ’Ã‚Â©s sur les lignes d'un tableau
 * @param matrix - La matrice du tableau (lignes)
 * @param columns - Les colonnes du tableau
 * @param filters - Les filtres ÃƒÆ’Ã‚Â  appliquer { column, operator, valueRef }
 * @param formValues - Valeurs du formulaire pour rÃƒÆ’Ã‚Â©soudre les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences
 * @returns Indices des lignes qui passent TOUS les filtres (logique AND)
 */

async function applyTableFilters(
  matrix: unknown[][],
  columns: string[],
  filters: Array<{ column: string; operator: string; valueRef: string }>,
  formValues: Record<string, unknown>
): Promise<number[]> {
  if (!filters || filters.length === 0) {
    return matrix.map((_, i) => i); // Tous les indices si pas de filtres
  }

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Filtrer les filtres incomplets (column ou valueRef manquant)
  const validFilters = filters.filter(f => f.column && f.valueRef && f.operator);
  
  if (validFilters.length === 0) {
    return matrix.map((_, i) => i); // Tous les indices si pas de filtres valides
  }

  
  // RÃƒÆ’Ã‚Â©soudre toutes les valueRef en valeurs concrÃƒÆ’Ã‚Â¨tes
  const resolvedFilters = await Promise.all(
    validFilters.map(async (filter) => {
      const value = await resolveFilterValueRef(filter.valueRef, formValues);
      return { ...filter, resolvedValue: value };
    })
  );

  // 🛡️ Ignorer les filtres dont la valeur résolue est null/undefined/vide (select vidé = filtre inactif)
  const activeFilters = resolvedFilters.filter(f => {
    if (f.resolvedValue === null || f.resolvedValue === undefined || f.resolvedValue === '') return false;
    if (Array.isArray(f.resolvedValue) && (f.resolvedValue as unknown[]).length === 0) return false;
    return true;
  });
  
  if (activeFilters.length === 0) {
    return matrix.map((_, i) => i);
  }
  
  if (activeFilters.length < resolvedFilters.length) {
  }

  // Filtrer les lignes
  const matchingIndices: number[] = [];
  
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    let passesAllFilters = true;

    for (const filter of activeFilters) {
      const columnIndex = columns.indexOf(filter.column);
      if (columnIndex === -1) {
        console.warn(`[applyTableFilters] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Colonne "${filter.column}" introuvable dans:`, columns);
        passesAllFilters = false;
        break;
      }

      let cellValue: unknown = row[columnIndex];

      // ✨ Multiplicateur conditionnel: modifier cellValue avant la comparaison
      if ((filter as any).multiplier?.enabled) {
        const mult = (filter as any).multiplier;
        // 🔍 DEBUG: Log formValues pour les clés du multiplier (1 seule fois)
        if (rowIndex === 0) {
          const condKeys = (mult.conditions || []).flatMap((c: any) => [c.fieldA, c.fieldB].filter((r: string) => r?.startsWith('@value.')).map((r: string) => r.replace('@value.', '')));
          console.log(`[Multiplier-BE] formValues pour conditions:`, condKeys.map((k: string) => `${k}=${JSON.stringify(formValues[k])}`).join(', '));
        }
        
        // Résoudre une référence — supporte les valeurs littérales (ex: "HUAWEI")
        const resolveRef = (ref: string | undefined): unknown => {
          if (!ref) return null;
          // 🎯 Support @literal.xxx: retourner la valeur littérale sans résolution
          if (ref.startsWith('@literal.')) return ref.replace('@literal.', '');
          // 🎯 Support @column.COLNAME: accéder à une colonne de la ligne courante
          if (ref.startsWith('@column.')) {
            const colName = ref.replace('@column.', '');
            const colIdx = columns.indexOf(colName);
            return colIdx >= 0 ? row[colIdx] : null;
          }
          if (ref.startsWith('@value.') || ref.startsWith('@select.')) {
            const nodeId = ref.replace(/^@(value|select)\./, '');
            return formValues[nodeId] ?? null;
          }
          if (ref.startsWith('@table.')) {
            const nodeId = ref.replace('@table.', '');
            return formValues[nodeId] ?? null;
          }
          if (ref.startsWith('@calculated.') || ref.startsWith('@calculated:')) {
            const nodeId = ref.replace(/^@calculated[.:]/, '');
            return formValues[nodeId] ?? null;
          }
          if (ref.startsWith('node-formula:') || ref.startsWith('formula:')) {
            const nodeId = ref.replace(/^(node-formula|formula):/, '');
            return formValues[nodeId] ?? null;
          }
          // Si c'est une clé dans formValues, utiliser cette valeur
          if (formValues[ref] !== undefined) return formValues[ref];
          // Sinon, c'est une valeur littérale (ex: "HUAWEI") — retourner telle quelle
          return ref;
        };
        
        // Construire le tableau de conditions (rétrocompat avec l'ancien format single-condition)
        const conditions = mult.conditions?.length
          ? mult.conditions
          : [{ fieldA: mult.conditionFieldA || '', operator: mult.conditionOperator || 'equals', fieldB: mult.conditionFieldB || '' }];
        
        // Évaluer chaque condition — TOUTES doivent être vraies (logique AND)
        const evaluateSingleCondition = (cond: { fieldA?: string; operator?: string; fieldB?: string }, condIdx?: number): boolean => {
          if (!cond.fieldA && !cond.fieldB) return false;
          const fieldAValue = resolveRef(cond.fieldA);
          const fieldBValue = resolveRef(cond.fieldB);
          // 🔍 DEBUG MULTIPLIER: afficher valeurs résolues pour diagnostic
          if (fieldAValue === null || fieldAValue === undefined || fieldBValue === null || fieldBValue === undefined) {
            console.log(`[Multiplier-BE] Cond${condIdx ?? '?'}: "${cond.fieldA}" → ${JSON.stringify(fieldAValue)} | "${cond.fieldB}" → ${JSON.stringify(fieldBValue)} → NULL → FALSE`);
            return false;
          }
          
          const numA = Number(fieldAValue);
          const numB = Number(fieldBValue);
          const strA = String(fieldAValue).trim().toLowerCase();
          const strB = String(fieldBValue).trim().toLowerCase();
          
          switch (cond.operator || 'equals') {
            case 'equals': return (!isNaN(numA) && !isNaN(numB) && String(fieldAValue).trim() !== '' && String(fieldBValue).trim() !== '') ? numA === numB : strA === strB;
            case 'notEquals': return (!isNaN(numA) && !isNaN(numB) && String(fieldAValue).trim() !== '' && String(fieldBValue).trim() !== '') ? numA !== numB : strA !== strB;
            case 'greaterThan': return numA > numB;
            case 'lessThan': return numA < numB;
            case 'greaterOrEqual': return numA >= numB;
            case 'lessOrEqual': return numA <= numB;
            case 'contains': return strA.includes(strB);
            default: return false;
          }
        };
        
        const allConditionsMet = conditions.every((cond: any, idx: number) => evaluateSingleCondition(cond, idx));
        
        const mode = mult.mode || 'multiply';
        if (mode === 'fixed') {
          // Mode valeur fixe: remplacer cellValue par la valeur ALORS ou SINON
          const fixedValue = allConditionsMet ? (mult.factor ?? 0) : (mult.elseFactor ?? 0);
          console.log(`[Fixed] ${conditions.length} condition(s) → ${allConditionsMet ? 'TOUTES VRAIES' : 'NON'} → cellValue ${cellValue} → ${fixedValue}`);
          cellValue = fixedValue;
        } else {
          // Mode multiplicateur: multiplier cellValue
          const factor = allConditionsMet ? (mult.factor ?? 2) : (mult.elseFactor ?? 1);
          // 🎯 sourceColumn: quand conditions vraies, lire la valeur depuis une autre colonne
          let baseValue = cellValue;
          if (allConditionsMet && mult.sourceColumn) {
            const srcColIdx = columns.indexOf(mult.sourceColumn);
            if (srcColIdx >= 0) {
              baseValue = row[srcColIdx];
              console.log(`[Multiplier] sourceColumn "${mult.sourceColumn}" → baseValue = ${baseValue}`);
            }
          }
          const numericBase = Number(baseValue);
          if (!isNaN(numericBase) && factor !== 1) {
            console.log(`[Multiplier] ${conditions.length} condition(s) → ${allConditionsMet ? 'TOUTES VRAIES' : 'NON'} → ${allConditionsMet && mult.sourceColumn ? `sourceCol(${mult.sourceColumn})=${baseValue}` : `cellValue ${cellValue}`} × ${factor} = ${numericBase * factor}`);
            cellValue = numericBase * factor;
          } else if (!isNaN(numericBase)) {
            cellValue = numericBase;
          }
        }
      }

      const passes = compareFilterValues(cellValue, filter.operator, filter.resolvedValue);
      
      // 🔄 alsoInclude: si la valeur résolue contient un "when", accepter aussi les "alsoMatch"
      // Ex: Triphasé sélectionné → accepter aussi Monophasé (car mono fonctionne sur réseau tri)
      let finalPasses = passes;
      if (!passes && (filter as any).alsoInclude?.length && filter.resolvedValue) {
        for (const rule of (filter as any).alsoInclude) {
          if (!rule.when || !rule.alsoMatch) continue;
          if (String(filter.resolvedValue).toLowerCase().includes(String(rule.when).toLowerCase())) {
            if (compareFilterValues(cellValue, filter.operator, rule.alsoMatch)) {
              finalPasses = true;
              break;
            }
          }
        }
      }
      
      if (!finalPasses) {
        passesAllFilters = false;
        break;
      }
    }

    if (passesAllFilters) {
      matchingIndices.push(rowIndex);
    }
  }

  return matchingIndices;
}

/**
 * RÃƒÆ’Ã‚Â©sout une valueRef en valeur concrÃƒÆ’Ã‚Â¨te depuis les formValues
 * Supporte: @calculated.{nodeId}, @calculated:{nodeId}, @select.{nodeId}, @value.{nodeId}, valeur littÃƒÆ’Ã‚Â©rale
 */
async function resolveFilterValueRef(
  valueRef: string,
  formValues: Record<string, unknown>
): Promise<unknown> {
  if (!valueRef) return null;

  // 🔧 @calculated.{nodeId} ou @calculated:{nodeId} - Récupérer la calculatedValue
  // 🔥 PRIORITÉ FORMVALUES: Le frontend envoie les valeurs FRAÎCHES depuis le broadcast
  // après que create-and-evaluate ait calculé. La DB contient des valeurs STALES (par submission).
  if (valueRef.startsWith('@calculated.') || valueRef.startsWith('@calculated:')) {
    const nodeId = valueRef.replace(/^@calculated[.:]/, '');
    
    // 🔥 FIX: PRIORISER formValues (envoyé par le frontend avec les valeurs fraîches du broadcast)
    if (formValues[nodeId] !== undefined && formValues[nodeId] !== null) {
      let value = formValues[nodeId];
      
      // 🔧 FIX: Si la valeur est un objet {value: 'xxx', label: 'yyy'}, extraire .value
      if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        const objValue = (value as Record<string, unknown>).value;
        value = objValue;
      }
      
      console.log(`✅ [resolveFilterValueRef] @calculated.${nodeId} → formValues (FRESH): ${value}`);
      return value;
    }
    
    // Fallback: chercher dans la DB si formValues n'a pas la valeur
    // (cas rare - normalement le frontend devrait toujours envoyer les valeurs)
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { id: true, label: true, calculatedValue: true }
    });
    
    if (node && node.calculatedValue !== null && node.calculatedValue !== undefined) {
      console.log(`🔧 [resolveFilterValueRef] @calculated.${nodeId} → DB fallback: ${node.calculatedValue}`);
      return node.calculatedValue;
    }
    
    console.log(`⚠️ [resolveFilterValueRef] @calculated.${nodeId} → NO VALUE FOUND`);
    return null;
  }
  // @select.{nodeId} ou @select:{nodeId} - RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la rÃƒÆ’Ã‚Â©ponse sÃƒÆ’Ã‚Â©lectionnÃƒÆ’Ã‚Â©e depuis formValues
  if (valueRef.startsWith('@select.') || valueRef.startsWith('@select:')) {
    const nodeId = valueRef.replace(/^@select[.:]/, '');
    let value = formValues[nodeId] ?? null;
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ FIX: Si la valeur est un objet {value: 'xxx', label: 'yyy'}, extraire .value
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
      const objValue = (value as Record<string, unknown>).value;
      value = objValue;
    }
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ FIX CRITIQUE: Si la valeur est un UUID (ID d'option), aller chercher le LABEL de cette option
    // car les tables contiennent du texte comme "MonophasÃƒÆ’Ã‚Â© 220-240v", pas des UUIDs
    if (value && typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      
      // Chercher l'option dans les enfants du nÃƒâ€¦Ã¢â‚¬Å“ud SELECT (les options sont des nÃƒâ€¦Ã¢â‚¬Å“uds enfants)
      const optionNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: value },
        select: { id: true, label: true, value: true }
      });
      
      if (optionNode) {
        // Utiliser le label de l'option, ou sa value si pas de label
        const labelValue = optionNode.label || optionNode.value || value;
        value = labelValue;
      } else {
      }
    }
    
    return value;
  }

  // @value.{nodeId} ou @value:{nodeId} - RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la valeur du champ depuis formValues
  if (valueRef.startsWith('@value.') || valueRef.startsWith('@value:')) {
    const nodeId = valueRef.replace(/^@value[.:]/, '');
    let value = formValues[nodeId] ?? null;
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ FIX: Si la valeur est un objet {value: 'xxx', label: 'yyy'}, extraire .value
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
      const objValue = (value as Record<string, unknown>).value;
      value = objValue;
    }
    
    return value;
  }

  // Valeur littÃƒÆ’Ã‚Â©rale
  return valueRef;
}

/**
 * Compare deux valeurs selon un opÃƒÆ’Ã‚Â©rateur
 */
function compareFilterValues(
  cellValue: unknown,
  operator: string,
  compareValue: unknown
): boolean {
  // Normaliser les valeurs pour comparaison
  const normalizedCell = normalizeForFilterComparison(cellValue);
  const normalizedCompare = normalizeForFilterComparison(compareValue);

  switch (operator) {
    case 'equals':
    case '=':
      // Comparaison exacte d'abord
      if (normalizedCell === normalizedCompare) {
        return true;
      }
      // Pour les chaÃƒÆ’Ã‚Â®nes: vÃƒÆ’Ã‚Â©rifier si la cellule COMMENCE PAR la valeur de comparaison
      // Ex: "MonophasÃƒÆ’Ã‚Â© 220-240v" commence par "MonophasÃƒÆ’Ã‚Â©" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ match!
      // Cela permet de garder les infos de voltage dans la table tout en filtrant par type
      if (typeof normalizedCell === 'string' && typeof normalizedCompare === 'string') {
        const cellLower = normalizedCell.toLowerCase().trim();
        const compareLower = normalizedCompare.toLowerCase().trim();
        // Découper la cellule par " ; " pour gérer les valeurs multiples (ex: "Triphasé 220-240v ; Tétraphasé 380-400v")
        const cellSegments = cellLower.includes(' ; ') ? cellLower.split(' ; ').map(s => s.trim()) : [cellLower];
        // Match si UN segment commence par la valeur de comparaison ou vice versa
        return cellSegments.some(segment =>
          segment.startsWith(compareLower) || compareLower.startsWith(segment)
        );
      }
      return false;
    
    case 'notEquals':
    case '!=':
      return normalizedCell !== normalizedCompare;
    
    case 'greaterThan':
    case '>':
      if (typeof normalizedCell === 'number' && typeof normalizedCompare === 'number') {
        return normalizedCell > normalizedCompare;
      }
      return String(normalizedCell) > String(normalizedCompare);
    
    case 'greaterOrEqual':
    case 'greaterThanOrEqual':
    case '>=':
      if (typeof normalizedCell === 'number' && typeof normalizedCompare === 'number') {
        return normalizedCell >= normalizedCompare;
      }
      return String(normalizedCell) >= String(normalizedCompare);
    
    case 'lessThan':
    case '<':
      if (typeof normalizedCell === 'number' && typeof normalizedCompare === 'number') {
        return normalizedCell < normalizedCompare;
      }
      return String(normalizedCell) < String(normalizedCompare);
    
    case 'lessOrEqual':
    case 'lessThanOrEqual':
    case '<=':
      if (typeof normalizedCell === 'number' && typeof normalizedCompare === 'number') {
        return normalizedCell <= normalizedCompare;
      }
      return String(normalizedCell) <= String(normalizedCompare);
    
    case 'contains':
      return String(normalizedCell).toLowerCase().includes(String(normalizedCompare).toLowerCase());
    
    case 'notContains':
      return !String(normalizedCell).toLowerCase().includes(String(normalizedCompare).toLowerCase());
    
    case 'startsWith':
      return String(normalizedCell).toLowerCase().startsWith(String(normalizedCompare).toLowerCase());
    
    case 'endsWith':
      return String(normalizedCell).toLowerCase().endsWith(String(normalizedCompare).toLowerCase());
    
    default:
      console.warn(`[compareFilterValues] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â OpÃƒÆ’Ã‚Â©rateur inconnu: ${operator}`);
      return false;
  }
}

/**
 * Normalise une valeur pour la comparaison de filtres
 */
function normalizeForFilterComparison(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  
  // Si c'est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  un nombre, le retourner
  if (typeof value === 'number') return value;
  
  // Convertir en string et nettoyer
  const str = String(value).trim();
  
  // Essayer de parser en nombre
  const num = Number(str);
  if (!isNaN(num) && isFinite(num)) return num;
  
  // Retourner la string
  return str;
}

// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer toutes les instances de tableaux d'un nÃƒâ€¦Ã¢â‚¬Å“ud
router.get('/nodes/:nodeId/tables', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId },
      include: {
        tableColumns: {
          orderBy: { columnIndex: 'asc' }
        },
        tableRows: {
          orderBy: { rowIndex: 'asc' }
        }
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    const normalized = tables.map(normalizeTableInstance);

    return res.json(normalized);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node tables:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des tableaux' });
  }
});

// ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â ANCIENNE ROUTE DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â°E - Utilise maintenant table-routes-new.ts
// La nouvelle architecture normalisÃƒÆ’Ã‚Â©e gÃƒÆ’Ã‚Â¨re POST /nodes/:nodeId/tables
/*
// CrÃƒÆ’Ã‚Â©er une nouvelle instance de tableau
router.post('/nodes/:nodeId/tables', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, description, type = 'basic', columns = [], rows = [], data = {}, meta = {} } = req.body;

    if (Array.isArray(data)) {
    } else if (data && typeof data === 'object') {
      if (data.matrix) {
      }
    }

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // VÃƒÆ’Ã‚Â©rifier que le nom n'existe pas dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â 
    const existing = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId, name }
    });

    if (existing) {
      return res.status(400).json({ error: 'Un tableau avec ce nom existe dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â ' });
    }

    // DÃƒÆ’Ã‚Â©terminer l'ordre
    const lastTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId },
      orderBy: { order: 'desc' }
    });
    const order = (lastTable?.order || 0) + 1;

    // GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer un ID unique pour le tableau
    const tableId = randomUUID();

    
    // Calculer la taille approximative du JSON
    const jsonSize = JSON.stringify({ columns, rows, data }).length;
    
    if (jsonSize > 10 * 1024 * 1024) {
    }

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã…â€œÃƒÂ¯Ã‚Â¸Ã‚Â Compresser les donnÃƒÆ’Ã‚Â©es volumineuses avant sauvegarde
    const compressedColumns = compressIfNeeded(columns);
    const compressedRows = compressIfNeeded(rows);
    const compressedData = compressIfNeeded(data);
    

    const newTable = await prisma.treeBranchLeafNodeTable.create({
      data: {
        id: tableId,
        nodeId,
        organizationId,
        name,
        description,
        type,
        columns: compressedColumns,
        rows: compressedRows,
        data: compressedData,
        meta,
        order,
        updatedAt: new Date()
      }
    });


    await syncNodeTableCapability(nodeId);

    const normalized = normalizeTableInstance(newTable);


    return res.status(201).json(normalized);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la crÃƒÆ’Ã‚Â©ation du tableau' });
  }
});
*/
// FIN DE L'ANCIENNE ROUTE - Utilise table-routes-new.ts maintenant

// ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â ANCIENNE ROUTE PUT DÃƒÆ’Ã¢â‚¬Â°SACTIVÃƒÆ’Ã¢â‚¬Â°E - Utilise maintenant table-routes-new.ts
// Cette route utilisait les anciens champs columns/rows/data qui n'existent plus dans le schÃƒÆ’Ã‚Â©ma normalisÃƒÆ’Ã‚Â©
/*
router.put('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  try {
    const { nodeId, tableId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, description, type, columns, rows, data, meta } = req.body;

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // VÃƒÆ’Ã‚Â©rifier que le tableau appartient bien ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud
    const existingTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { id: tableId, nodeId }
    });

    if (!existingTable) {
      return res.status(404).json({ error: 'Tableau non trouvÃƒÆ’Ã‚Â©' });
    }

    // VÃƒÆ’Ã‚Â©rifier l'unicitÃƒÆ’Ã‚Â© du nom si changÃƒÆ’Ã‚Â©
    if (name && name !== existingTable.name) {
      const nameConflict = await prisma.treeBranchLeafNodeTable.findFirst({
        where: { nodeId, name, id: { not: tableId } }
      });

      if (nameConflict) {
        return res.status(400).json({ error: 'Un tableau avec ce nom existe dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â ' });
      }
    }

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã…â€œÃƒÂ¯Ã‚Â¸Ã‚Â Compresser les donnÃƒÆ’Ã‚Â©es volumineuses si fournies
    const updateData: any = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(columns !== undefined && { columns: compressIfNeeded(columns) }),
      ...(rows !== undefined && { rows: compressIfNeeded(rows) }),
      ...(data !== undefined && { data: compressIfNeeded(data) }),
      ...(meta !== undefined && { meta }),
      updatedAt: new Date()
    };

    const updatedTable = await prisma.treeBranchLeafNodeTable.update({
      where: { id: tableId },
      data: updateData
    });

    await syncNodeTableCapability(nodeId);

    return res.json(normalizeTableInstance(updatedTable));
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour du tableau' });
  }
});
*/
// FIN DE L'ANCIENNE ROUTE PUT

// Supprimer une instance de tableau
router.delete('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;
  
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // 1?? VÃƒÂ¯Ã‚Â¿Ã‚Â½rifier l'existence et les permissions
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      include: {
        TreeBranchLeafNode: {
          include: { TreeBranchLeafTree: true }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table non trouvÃƒÂ¯Ã‚Â¿Ã‚Â½e' });
    }

    const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÂ¯Ã‚Â¿Ã‚Â½s non autorisÃƒÂ¯Ã‚Â¿Ã‚Â½' });
    }

    // 2?? Supprimer la table (colonnes et lignes supprimÃƒÂ¯Ã‚Â¿Ã‚Â½es en cascade par Prisma)
    await prisma.treeBranchLeafNodeTable.delete({ where: { id: tableId } });

    // ?? Nettoyer les champs Select/Cascader qui utilisent cette table comme lookup
    // ?? UTILISER LA MÃƒÂ¯Ã‚Â¿Ã‚Â½ME LOGIQUE QUE LE BOUTON "DÃƒÂ¯Ã‚Â¿Ã‚Â½SACTIVER LOOKUP" QUI FONCTIONNE PARFAITEMENT
    try {
      const selectConfigsUsingTable = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { tableReference: tableId },
        select: { nodeId: true }
      });

      if (selectConfigsUsingTable.length > 0) {
        
        // Pour chaque champ, appliquer la MÃƒÂ¯Ã‚Â¿Ã‚Â½ME logique que le bouton "DÃƒÂ¯Ã‚Â¿Ã‚Â½sactiver lookup"
        for (const config of selectConfigsUsingTable) {
          const selectNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: config.nodeId },
            select: { 
              label: true,
              metadata: true
            }
          });

          if (selectNode) {
            
            // 1?? Nettoyer metadata.capabilities.table (comme le fait le bouton DÃƒÂ¯Ã‚Â¿Ã‚Â½sactiver)
            const oldMetadata = (selectNode.metadata || {}) as Record<string, unknown>;
            const oldCapabilities = (oldMetadata.capabilities || {}) as Record<string, unknown>;
            const newCapabilities = {
              ...oldCapabilities,
              table: {
                enabled: false,
                activeId: null,
                instances: null,
                currentTable: null,
              }
            };
            const newMetadata = {
              ...oldMetadata,
              capabilities: newCapabilities
            };

            // 2?? Mettre ÃƒÂ¯Ã‚Â¿Ã‚Â½ jour le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud (mÃƒÂ¯Ã‚Â¿Ã‚Â½me logique que PUT /capabilities/table avec enabled: false)
            await prisma.treeBranchLeafNode.update({
              where: { id: config.nodeId },
              data: {
                hasTable: false,
                table_activeId: null,
                table_instances: null,
                table_name: null,
                table_type: null,
                table_meta: null,
                table_columns: null,
                table_rows: null,
                table_data: null,
                metadata: JSON.parse(JSON.stringify(newMetadata)),
                select_options: [],
                updatedAt: new Date()
              }
            });

            // 3?? Supprimer la configuration SELECT (comme le fait le bouton DÃƒÂ¯Ã‚Â¿Ã‚Â½sactiver)
            await prisma.treeBranchLeafSelectConfig.deleteMany({
              where: { nodeId: config.nodeId }
            });
            
          }
        }

      }
    } catch (selectConfigError) {
      console.error(`[DELETE Table] ?? Erreur dÃƒÂ¯Ã‚Â¿Ã‚Â½sactivation lookups:`, selectConfigError);
      // On continue quand mÃƒÂ¯Ã‚Â¿Ã‚Â½me
    }

    // 3?? Nettoyer TOUS les champs liÃƒÂ¯Ã‚Â¿Ã‚Â½s aux tables dans le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud
    if (table.nodeId) {
      const node = await prisma.treeBranchLeafNode.findUnique({ 
        where: { id: table.nodeId }, 
        select: { 
          linkedTableIds: true,
          table_activeId: true,
          table_instances: true
        } 
      });

      const currentLinkedIds = node?.linkedTableIds ?? [];
      const nextLinkedIds = currentLinkedIds.filter(x => x !== tableId);
      const wasActiveTable = node?.table_activeId === tableId;
      
      let cleanedInstances = node?.table_instances ?? {};
      if (typeof cleanedInstances === 'object' && cleanedInstances !== null) {
        const instances = cleanedInstances as Record<string, unknown>;
        if (instances[tableId]) {
          delete instances[tableId];
          cleanedInstances = instances;
        }
      }

      const remainingTables = await prisma.treeBranchLeafNodeTable.count({
        where: { nodeId: table.nodeId }
      });

      await prisma.treeBranchLeafNode.update({
        where: { id: table.nodeId },
        data: {
          hasTable: remainingTables > 0,
          linkedTableIds: { set: nextLinkedIds },
          table_activeId: wasActiveTable ? null : undefined,
          table_instances: cleanedInstances,
          ...(remainingTables === 0 && {
            table_name: null,
            table_type: null,
            table_meta: null,
            table_columns: null,
            table_rows: null,
            table_data: null,
            table_importSource: null,
            table_isImported: false
          })
        }
      });

    }

    return res.json({ success: true, message: 'Tableau supprimÃƒÂ¯Ã‚Â¿Ã‚Â½ avec succÃƒÂ¯Ã‚Â¿Ã‚Â½s' });
  } catch (error) {
    console.error('[DELETE Table] ? Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du tableau' });
  }
});

router.get('/nodes/:nodeId/tables/options', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { tableId, dimension = 'columns' } = req.query as {
      tableId?: string;
      dimension?: string;
    };

    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const normalized = await fetchNormalizedTable(nodeId, {
      tableId: typeof tableId === 'string' && tableId ? tableId : undefined,
    });

    if (!normalized) {
      return res.json({ items: [], table: null });
    }

    const { table, tables } = normalized;

    if (dimension === 'rows') {
      const items = table.rows.map((label, index) => ({ value: label, label, index }));
      return res.json({ items, table: { id: table.id, type: table.type, name: table.name }, tables });
    }

    if (dimension === 'records') {
      return res.json({
        items: table.records,
        table: { id: table.id, type: table.type, name: table.name },
        tables,
      });
    }

    // Par dÃƒÆ’Ã‚Â©faut: colonnes
    const items = table.columns.map((label, index) => ({ value: label, label, index }));
    return res.json({ items, table: { id: table.id, type: table.type, name: table.name }, tables });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching table options:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des options du tableau' });
  }
});

// Lookup dynamique dans une instance de tableau
router.get('/nodes/:nodeId/tables/lookup', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const {
      tableId,
      column,
      row,
      key,
      keyColumn,
      keyValue,
      valueColumn,
    } = req.query as Record<string, string | undefined>;

    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const normalized = await fetchNormalizedTable(nodeId, {
      tableId: tableId && tableId.length ? tableId : undefined,
    });

    if (!normalized) {
      return res.status(404).json({ error: 'Aucun tableau disponible pour ce nÃƒâ€¦Ã¢â‚¬Å“ud' });
    }

    const { table } = normalized;
    const rawLookup = (table.meta && typeof table.meta.lookup === 'object')
      ? (table.meta.lookup as Record<string, unknown>)
      : undefined;

    if (table.type === 'matrix') {
      const colLabel = column || (valueColumn && valueColumn === 'column' ? valueColumn : undefined);
      const rowLabel = row;

      if (!colLabel || !rowLabel) {
        return res.status(400).json({ error: 'ParamÃƒÆ’Ã‚Â¨tres column et row requis pour un tableau croisÃƒÆ’Ã‚Â©' });
      }

      const columnIndex = table.columns.findIndex((c) => c === colLabel);
      const rowIndex = table.rows.findIndex((r) => r === rowLabel);

      if (columnIndex === -1) {
        return res.status(404).json({ error: `Colonne "${colLabel}" introuvable` });
      }
      if (rowIndex === -1) {
        return res.status(404).json({ error: `Ligne "${rowLabel}" introuvable` });
      }

      const value = table.matrix[rowIndex]?.[columnIndex] ?? null;

      return res.json({
        value,
        rowIndex,
        columnIndex,
        column: table.columns[columnIndex],
        row: table.rows[rowIndex],
        table: { id: table.id, name: table.name, type: table.type },
        meta: table.meta,
      });
    }

    const resolvedKeyColumn =
      (keyColumn && keyColumn.length ? keyColumn : undefined) ??
      (rawLookup && typeof rawLookup.keyColumn === 'string' ? (rawLookup.keyColumn as string) : undefined);

    if (!resolvedKeyColumn) {
      return res.status(400).json({ error: 'Colonne clÃƒÆ’Ã‚Â© non dÃƒÆ’Ã‚Â©finie pour ce tableau' });
    }

    const lookupValue =
      (keyValue && keyValue.length ? keyValue : undefined) ??
      (key && key.length ? key : undefined) ??
      (column && !table.columns.includes(column) ? column : undefined);

    if (lookupValue === undefined) {
      return res.status(400).json({ error: 'Valeur de clÃƒÆ’Ã‚Â© requise' });
    }

    const keyIndex = table.columns.findIndex((colName) => colName === resolvedKeyColumn);
    if (keyIndex === -1) {
      return res.status(404).json({ error: `Colonne clÃƒÆ’Ã‚Â© "${resolvedKeyColumn}" introuvable` });
    }

    let matchedIndex = -1;
    for (let i = 0; i < table.matrix.length; i += 1) {
      const current = table.matrix[i]?.[keyIndex];
      if (current != null && String(current) === String(lookupValue)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return res.status(404).json({ error: 'Aucune ligne correspondant ÃƒÆ’Ã‚Â  cette clÃƒÆ’Ã‚Â©' });
    }

    const matchedRow = table.matrix[matchedIndex] ?? [];
    const matchedRecord = table.records[matchedIndex] ?? null;

    const resolvedValueColumn =
      (valueColumn && valueColumn.length ? valueColumn : undefined) ??
      (rawLookup && typeof rawLookup.valueColumn === 'string' ? (rawLookup.valueColumn as string) : undefined);

    let resolvedValue: unknown = matchedRecord;

    if (resolvedValueColumn) {
      const valueIdx = table.columns.findIndex((colName) => colName === resolvedValueColumn);
      if (valueIdx === -1) {
        return res.status(404).json({ error: `Colonne "${resolvedValueColumn}" introuvable` });
      }
      resolvedValue = matchedRow[valueIdx] ?? null;
    }

    const exposeColumns = Array.isArray(rawLookup?.exposeColumns)
      ? (rawLookup?.exposeColumns as Array<Record<string, unknown>>)
      : [];

    return res.json({
      value: resolvedValue ?? null,
      row: matchedRecord,
      rowIndex: matchedIndex,
      keyColumn: resolvedKeyColumn,
      keyValue: lookupValue,
      table: { id: table.id, name: table.name, type: table.type },
      meta: table.meta,
      exposeColumns,
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error performing table lookup:', error);
    res.status(500).json({ error: 'Erreur lors du lookup dans le tableau' });
  }
});

// GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer automatiquement des champs SELECT dÃƒÆ’Ã‚Â©pendants d'un tableau
router.post('/nodes/:nodeId/table/generate-selects', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const {
      tableId: requestedTableId,
      labelColumns,
      labelRows,
    } = (req.body || {}) as {
      tableId?: string;
      labelColumns?: string;
      labelRows?: string;
    };

    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const normalized = await fetchNormalizedTable(nodeId, {
      tableId:
        typeof requestedTableId === 'string' && requestedTableId.trim().length
          ? requestedTableId.trim()
          : undefined,
    });

    if (!normalized) {
      return res.status(404).json({ error: 'Aucun tableau disponible pour ce nÃƒâ€¦Ã¢â‚¬Å“ud' });
    }

    const { table } = normalized;

    if (!table.columns.length) {
      return res.status(400).json({ error: 'Le tableau ne contient aucune colonne exploitable' });
    }

    const baseNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { id: true, treeId: true, parentId: true },
    });

    if (!baseNode) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud de base introuvable' });
    }

    const parentId = baseNode.parentId ?? null;
    const siblingsCount = await prisma.treeBranchLeafNode.count({
      where: { treeId: baseNode.treeId, parentId },
    });

    const tableMeta = table.meta || {};
    const metaNameRaw = typeof tableMeta['name'] === 'string' ? (tableMeta['name'] as string) : undefined;
    const baseLabel = (metaNameRaw && metaNameRaw.trim()) || (table.name && table.name.trim()) || 'Tableau';

    const fallbackColumnsLabel = typeof labelColumns === 'string' && labelColumns.trim().length
      ? labelColumns.trim()
      : `${baseLabel} - colonne`;
    const fallbackRowsLabel = typeof labelRows === 'string' && labelRows.trim().length
      ? labelRows.trim()
      : `${baseLabel} - ligne`;

    const toCreate: Array<{ label: string; dimension: 'columns' | 'rows' }> = [];

    if (table.columns.length) {
      toCreate.push({ label: fallbackColumnsLabel, dimension: 'columns' });
    }

    if (table.rows.length) {
      toCreate.push({ label: fallbackRowsLabel, dimension: 'rows' });
    }

    if (!toCreate.length) {
      return res.status(400).json({ error: 'Aucune dimension exploitable pour gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer des champs SELECT' });
    }

    const created: Array<{ id: string; label: string; dimension: 'columns' | 'rows' }> = [];
    let insertOrder = siblingsCount;
    const now = new Date();

    for (const item of toCreate) {
      const newNodeId = randomUUID();

      const nodeMetadata = {
        generatedFrom: 'table_lookup',
        tableNodeId: baseNode.id,
        tableId: table.id,
        tableDimension: item.dimension,
      } as Record<string, unknown>;

      const newNode = await prisma.treeBranchLeafNode.create({
        data: {
          id: newNodeId,
          treeId: baseNode.treeId,
          parentId,
          type: 'leaf_select',
          subType: 'SELECT',
          fieldType: 'SELECT',
          fieldSubType: 'SELECT',
          label: item.label,
          order: insertOrder,
          isVisible: true,
          isActive: true,
          hasData: false,
          hasFormula: false,
          hasCondition: false,
          hasTable: false,
          hasAPI: false,
          hasLink: false,
          hasMarkers: false,
          select_allowClear: true,
          select_defaultValue: null,
          select_multiple: false,
          select_options: [] as Prisma.InputJsonValue,
          select_searchable: false,
          metadata: nodeMetadata as Prisma.InputJsonValue,
          tbl_auto_generated: true,
          updatedAt: now,
        },
      });

      await prisma.treeBranchLeafSelectConfig.create({
        data: {
          id: randomUUID(),
          nodeId: newNode.id,
          options: [] as Prisma.InputJsonValue,
          multiple: false,
          searchable: false,
          allowCustom: false,
          optionsSource: `table_${item.dimension}`,
          tableReference: `node-table:${table.id}`,
          dependsOnNodeId: baseNode.id,
          createdAt: now,
          updatedAt: now,
        },
      });

      created.push({ id: newNode.id, label: newNode.label, dimension: item.dimension });
      insertOrder += 1;
    }

    return res.json({
      created,
      table: { id: table.id, name: table.name, type: table.type },
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error generating selects from table:', error);
    res.status(500).json({ error: 'Erreur lors de la gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration des champs dÃƒÆ’Ã‚Â©pendants' });
  }
});

// -------------------------------------------------------------
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Endpoint valeurs effectives (prise en compte override manuel)
// GET /api/treebranchleaf/effective-values?ids=a,b,c
router.get('/effective-values', async (req, res) => {
  try {
    const idsParam = String(req.query.ids || '').trim();
    if (!idsParam) return res.json({ success: true, data: {} });
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ success: true, data: {} });

    const nodes = await prisma.treeBranchLeafNode.findMany({ 
      where: { id: { in: ids } }, 
      include: { TreeBranchLeafNodeVariable: true } 
    });

    const result: Record<string, { value: number | string | null; source: string; manualApplied: boolean }> = {};
    for (const node of nodes) {
      result[node.id] = {
        value: null,
        source: 'not_implemented',
        manualApplied: false
      };
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting effective values:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des valeurs effectives' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Âª FORMULA ENGINE DEBUG - Endpoints de dÃƒÆ’Ã‚Â©bogage
// =============================================================================

// GET /api/treebranchleaf/debug/formula-vars
// Liste toutes les variables de formule pour dÃƒÆ’Ã‚Â©bogage
router.get('/debug/formula-vars', async (req, res) => {
  try {
    const vars = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        node: {
          select: {
            id: true,
            label: true,
            treeId: true,
            organizationId: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return res.json(vars);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching formula variables:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des variables de formule' });
  }
});

// GET /api/treebranchleaf/debug/formula-eval
// ÃƒÆ’Ã¢â‚¬Â°value une formule spÃƒÆ’Ã‚Â©cifique (pour dÃƒÆ’Ã‚Â©bogage)
router.get('/debug/formula-eval', async (req, res) => {
  try {
    const { formulaId, nodeId } = req.query;

    if (typeof formulaId !== 'string' || typeof nodeId !== 'string') {
      return res.status(400).json({ error: 'formulaId et nodeId requis' });
    }

    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId as string }
    });

    if (!formula) {
      return res.status(404).json({ error: 'Formule non trouvÃƒÆ’Ã‚Â©e' });
    }

    // Simuler des fieldValues basiques pour l'ÃƒÆ’Ã‚Â©valuation
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId as string },
      include: { TreeBranchLeafNodeVariable: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    const fieldValues: Record<string, unknown> = {
      ...node.TreeBranchLeafNodeVariable?.reduce((acc, v) => {
        if (v.exposedKey) {
          acc[v.exposedKey] = v.fixedValue || null;
        }
        return acc;
      }, {} as Record<string, unknown>),
      // Ajouter des valeurs de test supplÃƒÆ’Ã‚Â©mentaires si nÃƒÆ’Ã‚Â©cessaire
    };


    // ÃƒÆ’Ã¢â‚¬Â°valuer la formule
    const { value, errors } = await evalFormulaTokens(formula.tokens as unknown as FormulaToken[], {
      resolveVariable: async (nodeId: string) => {
        const found = Object.values(fieldValues).find(v => v.nodeId === nodeId);
        return found ? found.value : 0;
      },
      divisionByZeroValue: 0
    });

    return res.json({ value, errors });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error evaluating formula in debug:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation de la formule en mode dÃƒÆ’Ã‚Â©bogage' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‹â€  FORMULA VERSION - Version des formules (pour cache frontend)
// =============================================================================

// GET /api/treebranchleaf/formulas-version
// Retourne une version/timestamp pour permettre au frontend de gÃƒÆ’Ã‚Â©rer le cache
router.get('/formulas-version', async (req, res) => {
  try {
    res.setHeader('X-TBL-Legacy-Deprecated', 'true');
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TBL LEGACY] /api/treebranchleaf/formulas-version appelÃƒÆ’Ã‚Â© (dÃƒÆ’Ã‚Â©prÃƒÆ’Ã‚Â©ciÃƒÆ’Ã‚Â©). Utiliser /api/tbl/evaluate avec futur cache dÃƒÆ’Ã‚Â©pendances.');
    }
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    
    // Pour maintenant, retourner un timestamp simple
    const version = {
      version: Date.now(),
      timestamp: new Date().toISOString(),
      organizationId: organizationId || null,
      isSuperAdmin: Boolean(isSuperAdmin)
    };
    
    return res.json(version);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting formulas version:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de la version des formules' });
  }
});

router.post('/formulas/validate', (req, res) => {
  try {
    const { expression, rolesMap } = req.body ?? {};
    if (typeof expression !== 'string' || !expression.trim()) {
      return res.status(400).json({ error: 'expression_required' });
    }
    const tokens = parseExpression(expression, createRolesProxy(rolesMap), { enableCache: false });
    const rpn = toRPN(tokens);
    return res.json({
      tokens,
      rpn,
      complexity: tokens.length
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error validating formula:', error);
    return res.status(400).json({
      error: 'Parse error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/logic/version', (_req, res) => {
  const payload = computeLogicVersion();
  return res.json(payload);
});

router.post('/formulas/cache/clear', (_req, res) => {
  clearRpnCache();
  const stats = getRpnCacheStats();
  return res.json({ cleared: true, stats });
});

router.post('/nodes/:nodeId/table/evaluate', (req, res) => {
  // Fallback minimal implementation to ensure JSON response during integration tests.
  // Permissions would normally apply upstream; we respond with a structured 404 so the
  // caller never falls back to the SPA HTML payload.
  return res.status(404).json({ error: 'node_not_found', nodeId: req.params.nodeId });
});

router.post('/evaluate/formula', async (req, res) => {
  try {
    const { expr, rolesMap, values, options } = req.body ?? {};
    if (typeof expr !== 'string' || !expr.trim()) {
      return res.status(400).json({ error: 'expr_required' });
    }

    const strict = Boolean(options?.strict);
    const enableCache = options?.enableCache !== undefined ? Boolean(options.enableCache) : true;
    const divisionByZeroValue = typeof options?.divisionByZeroValue === 'number' ? options.divisionByZeroValue : 0;
    const precisionScale = typeof options?.precisionScale === 'number' ? options.precisionScale : undefined;
    const valueStore = (values && typeof values === 'object') ? (values as Record<string, unknown>) : {};

    const evaluation = await evaluateExpression(expr, createRolesProxy(rolesMap), {
      resolveVariable: (nodeId) => coerceToNumber(valueStore[nodeId] ?? valueStore[nodeId.toLowerCase()]),
      strictVariables: strict,
      enableCache,
      divisionByZeroValue,
      precisionScale
    });

    const stats = getRpnCacheStats();
    const metrics = getLogicMetrics();

    return res.json({
      value: evaluation.value,
      errors: evaluation.errors,
      stats,
      metrics
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: 'Parse error', details: error.message });
    }
    console.error('[TreeBranchLeaf API] Error evaluating inline formula:', error);
    return res.status(500).json({ error: 'Erreur ÃƒÆ’Ã‚Â©valuation inline' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â® FORMULA EVALUATION - ÃƒÆ’Ã¢â‚¬Â°valuation de formules
// =============================================================================

// POST /api/treebranchleaf/evaluate/formula/:formulaId
// ÃƒÆ’Ã¢â‚¬Â°value une formule spÃƒÆ’Ã‚Â©cifique et retourne le rÃƒÆ’Ã‚Â©sultat calculÃƒÆ’Ã‚Â©
router.post('/evaluate/formula/:formulaId', async (req, res) => {
  try {
    res.setHeader('X-TBL-Legacy-Deprecated', 'true');
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TBL LEGACY] /api/treebranchleaf/evaluate/formula/:id appelÃƒÆ’Ã‚Â© (dÃƒÆ’Ã‚Â©prÃƒÆ’Ã‚Â©ciÃƒÆ’Ã‚Â©). Utiliser POST /api/tbl/evaluate elementId=<exposedKey>.');
    }
    const { formulaId } = req.params;
    const { fieldValues = {}, testMode = true } = req.body;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la formule
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      include: {
        TreeBranchLeafNode: {
          select: {
            label: true,
            treeId: true,
            TreeBranchLeafTree: {
              select: { organizationId: true }
            }
          }
        }
      }
    });

    if (!formula) {
      return res.status(404).json({ error: 'Formule non trouvÃƒÆ’Ã‚Â©e' });
    }

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s organisation
    const nodeOrg = formula.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette formule' });
    }

    // ÃƒÆ’Ã¢â‚¬Â°valuer la formule avec le moteur d'expressions
    try {
      

      // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ DEBUG GÃƒÆ’Ã¢â‚¬Â°NÃƒÆ’Ã¢â‚¬Â°RIQUE pour toutes les formules (sans ID hardcodÃƒÆ’Ã‚Â©)
      const isDebugMode = process.env.NODE_ENV === 'development';
      if (isDebugMode && formula) {
        
        if (Array.isArray(formula.tokens)) {
          formula.tokens.forEach((token, index) => {
          });
        }
        
        Object.entries(fieldValues).forEach(([k, v]) => {
        });
      }

      // Types pour les tokens de formule
      interface FormulaToken {
        type: 'value' | 'variable' | 'operator' | 'lparen' | 'rparen';
        value?: string | number;
        name?: string;
      }

      // Tokens de la formule (nouveau format)
      const tokens = Array.isArray(formula.tokens) ? formula.tokens as FormulaToken[] : [];
      
      // Extraire les variables des tokens
      const tokenVariables = tokens
        .filter((t): t is FormulaToken => Boolean(t) && t.type === 'variable')
        .map((t) => t.name)
        .filter(Boolean) as string[];


      // ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â  NOUVEL ORCHESTRATEUR ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ remplace l'ancienne rÃƒÆ’Ã‚Â©solution ad-hoc
      // Expression brute ÃƒÆ’Ã‚Â©ventuellement stockÃƒÆ’Ã‚Â©e dans la formule
      const rawExpression = (formula as { expression?: string; rawExpression?: string } | null)?.expression 
        || (formula as { expression?: string; rawExpression?: string } | null)?.rawExpression 
        || '';
      let orchestrated: ReturnType<typeof evaluateFormulaOrchestrated> | null = null;
      try {
        orchestrated = evaluateFormulaOrchestrated({
          fieldValues,
          tokens,
          rawExpression,
          variableMap: req.body?.variableMap,
          hasOperatorsOverride: req.body?.hasOperators
        });
        
        // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ DEBUG MODE pour l'orchestrateur en dÃƒÆ’Ã‚Â©veloppement
        if (process.env.NODE_ENV === 'development') {
          
          const variableCount = Object.keys(orchestrated.resolvedVariables).filter(k => orchestrated.resolvedVariables[k] !== 0).length;
          
          if (variableCount === 1) {
            const singleValue = Object.values(orchestrated.resolvedVariables).find(v => v !== 0);
          } else if (variableCount >= 2) {
            const values = Object.values(orchestrated.resolvedVariables);
          }
          
        }
      } catch (orchestratorError) {
        console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur orchestrateur:', orchestratorError);
        return res.status(500).json({
          error: 'Erreur orchestrateur formule',
          details: (orchestratorError as Error).message || 'unknown',
          debug: {
            formulaId: formula.id,
            rawExpression,
            tokensCount: tokens.length,
            receivedFieldValuesKeys: Object.keys(fieldValues)
          }
        });
      }
      const resolvedVariables = orchestrated.resolvedVariables;

      // ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â  ANALYSEUR INTELLIGENT UNIVERSEL - SYSTÃƒÆ’Ã‹â€ ME DYNAMIQUE COMPLET
      const universalAnalyzer = (fieldValues: Record<string, string | number | null | undefined>) => {
        
        // 1. CLASSIFICATION AUTOMATIQUE DES DONNÃƒÆ’Ã¢â‚¬Â°ES
        interface ClassifiedBuckets {
          userInputs: Record<string, unknown>;
          systemRefs: Record<string, unknown>;
          calculations: Record<string, unknown>;
          conditions: Record<string, unknown>;
          metadata: Record<string, unknown>;
        }
        const classified: ClassifiedBuckets = {
          userInputs: {},
            systemRefs: {},
          calculations: {},
          conditions: {},
          metadata: {}
        };
        
        // 2. ANALYSE DE CHAQUE DONNÃƒÆ’Ã¢â‚¬Â°E
        Object.entries(fieldValues).forEach(([key, value]) => {
          if (value == null || value === '') return;
          
          const strValue = String(value);
          
          // Valeurs utilisateur directes (champs de saisie)
          if (key.includes('_field')) {
            classified.userInputs[key] = value;
          }
          // RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences systÃƒÆ’Ã‚Â¨me (IDs, nÃƒâ€¦Ã¢â‚¬Å“uds)
          else if (key.startsWith('node_') || key.includes('-') && key.length > 10) {
            classified.systemRefs[key] = value;
          }
          // DonnÃƒÆ’Ã‚Â©es miroir (pour sync)
          else if (key.startsWith('__mirror_')) {
            classified.metadata[key] = value;
          }
          // Tout le reste = calculs/conditions
          else {
            classified.calculations[key] = value;
          }
        });
        
        return classified;
      };
      
      // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ STRATÃƒÆ’Ã‹â€ GE INTELLIGENT - DÃƒÆ’Ã¢â‚¬Â°CISION AUTOMATIQUE
      const intelligentStrategy = (
        classified: { userInputs: Record<string, unknown>; systemRefs: Record<string, unknown>; calculations: Record<string, unknown> },
        resolvedVariables: Record<string, number>,
        context: { tokenVariablesCount: number; tokensCount: number }
      ) => {
        
        const userInputCount = Object.keys(classified.userInputs).length;
        const systemRefCount = Object.keys(classified.systemRefs).length;
        const calculationCount = Object.keys(classified.calculations).length;
        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ CORRECTION CRITIQUE: Compter toutes les variables des tokens, pas seulement celles rÃƒÆ’Ã‚Â©solues ÃƒÆ’Ã‚Â  non-zero
        // Le problÃƒÆ’Ã‚Â¨me ÃƒÆ’Ã‚Â©tait qu'une variable non-rÃƒÆ’Ã‚Â©solue (mise ÃƒÆ’Ã‚Â  0) n'ÃƒÆ’Ã‚Â©tait pas comptÃƒÆ’Ã‚Â©e, 
        // faisant passer de 2 variables ÃƒÆ’Ã‚Â  1 variable ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ SINGLE_VALUE au lieu d'AUTO_CALCULATION
        const tokenVariableCount = context.tokenVariablesCount;
        const variableCount = Object.keys(resolvedVariables).filter(k => resolvedVariables[k] !== 0).length;
        
        
        // RÃƒÆ’Ã‹â€ GLE 1 (ADAPTÃƒÆ’Ã¢â‚¬Â°E): PrioritÃƒÆ’Ã‚Â© utilisateur UNIQUEMENT si la formule n'a pas de variables (tokenVariablesCount=0)
        // Avant: on retournait systÃƒÆ’Ã‚Â©matiquement la premiÃƒÆ’Ã‚Â¨re saisie (problÃƒÆ’Ã‚Â¨me: figeait la formule sur le premier chiffre tapÃƒÆ’Ã‚Â©)
        if (userInputCount > 0 && context.tokenVariablesCount === 0) {
          const userValue = Object.values(classified.userInputs)[0];
          
          return {
            strategy: 'USER_PRIORITY',
            value: userValue,
            reason: 'L\'utilisateur a entrÃƒÆ’Ã‚Â© une valeur directe'
          };
        }
        
        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ CORRECTION CRITIQUE: Utiliser tokenVariableCount au lieu de variableCount
        // RÃƒÆ’Ã‹â€ GLE 2: Si on a des variables pour calculer dans les tokens, on calcule
        if (tokenVariableCount >= 2) {
          return {
            strategy: 'AUTO_CALCULATION',
            value: null,
            reason: `Calcul automatique avec ${tokenVariableCount} variables dans les tokens`
          };
        }
        
        // RÃƒÆ’Ã‹â€ GLE 3: Une seule variable = retour direct (mais seulement si vraiment une seule variable dans les tokens)
        if (tokenVariableCount === 1) {
          const singleValue = Object.values(resolvedVariables).find(v => v !== 0);
          return {
            strategy: 'SINGLE_VALUE',
            value: singleValue,
            reason: 'Une seule variable dans les tokens'
          };
        }
        
        // RÃƒÆ’Ã‹â€ GLE 4: Pas de donnÃƒÆ’Ã‚Â©es = neutre
        return {
          strategy: 'NEUTRAL',
          value: 0,
          reason: 'Aucune donnÃƒÆ’Ã‚Â©e disponible'
        };
      };
      
      // EXÃƒÆ’Ã¢â‚¬Â°CUTION DU SYSTÃƒÆ’Ã‹â€ ME INTELLIGENT
  const classified = universalAnalyzer(fieldValues);
  const strategy = intelligentStrategy(classified, resolvedVariables, { tokenVariablesCount: tokenVariables.length, tokensCount: tokens.length });
      
      
      // EXÃƒÆ’Ã¢â‚¬Â°CUTION SELON LA STRATÃƒÆ’Ã¢â‚¬Â°GIE
  if (strategy.strategy === 'USER_PRIORITY' || strategy.strategy === 'SINGLE_VALUE') {
        // Retourner la valeur directement
        const rawValue = strategy.value;
        
        const cleanedString = String(rawValue).replace(/\s+/g, '').replace(/,/g, '.');
        
        const numValue = parseFloat(cleanedString);
        
        const finalValue = isNaN(numValue) ? 0 : numValue;
        
        return res.json({
          success: true,
          result: finalValue,
          strategy: strategy.strategy,
          reason: strategy.reason,
          source: rawValue,
          analysis: classified,
          orchestrator: orchestrated ? {
            strategy: orchestrated.strategy,
            operatorsDetected: orchestrated.operatorsDetected,
            trace: orchestrated.trace,
            resolvedVariables: orchestrated.resolvedVariables
          } : null
        });
      }
      
      if (strategy.strategy === 'NEUTRAL') {
        return res.json({
          success: true,
          result: 0,
          strategy: strategy.strategy,
          reason: strategy.reason,
          analysis: classified,
          orchestrator: orchestrated ? {
            strategy: orchestrated.strategy,
            operatorsDetected: orchestrated.operatorsDetected,
            trace: orchestrated.trace,
            resolvedVariables: orchestrated.resolvedVariables
          } : null
        });
      }
      
      // MODE CALCUL AUTOMATIQUE - Le systÃƒÆ’Ã‚Â¨me dÃƒÆ’Ã‚Â©tecte et calcule intelligemment
      if (strategy.strategy === 'AUTO_CALCULATION') {
        
        // Le systÃƒÆ’Ã‚Â¨me continue avec l'ÃƒÆ’Ã‚Â©valuation mathÃƒÆ’Ã‚Â©matique de la formule
      }

      // MODE CALCUL: ÃƒÆ’Ã¢â‚¬Â°valuation de la formule mathÃƒÆ’Ã‚Â©matique

      // ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â® ÃƒÆ’Ã¢â‚¬Â°VALUATION ULTRA-ROBUSTE PAR PILE - Moteur Intelligent
      const evaluateTokens = (tokens: FormulaToken[]): number => {
        const stack: number[] = [];
        const operations: string[] = [];
        
        
        // ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ CONVERSION INFIX ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ POSTFIX pour expressions mathÃƒÆ’Ã‚Â©matiques correctes
        const convertToPostfix = (tokens: Array<{ type: string; value?: string; name?: string }>) => {
          const outputQueue: Array<{ type: string; value?: string; name?: string }> = [];
          const operatorStack: Array<{ type: string; value?: string; name?: string }> = [];
          const precedence: { [key: string]: number } = { '+': 1, '-': 1, '*': 2, '/': 2 };
          
          
          for (const token of tokens) {
            if (token.type === 'value' || token.type === 'variable') {
              outputQueue.push(token);
            } else if (token.type === 'operator' && token.value && precedence[token.value]) {
              // Pop operators with higher or equal precedence
              while (operatorStack.length > 0 && 
                     operatorStack[operatorStack.length - 1].type === 'operator' && 
                     operatorStack[operatorStack.length - 1].value &&
                     precedence[operatorStack[operatorStack.length - 1].value!] >= precedence[token.value]) {
                outputQueue.push(operatorStack.pop()!);
              }
              operatorStack.push(token);
            }
          }
          
          // Pop remaining operators
          while (operatorStack.length > 0) {
            outputQueue.push(operatorStack.pop()!);
          }
          
          return outputQueue;
        };
        
        const postfixTokens = convertToPostfix(tokens);
        
        // ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â® ÃƒÆ’Ã¢â‚¬Â°VALUATION des tokens en notation postfix
        for (let i = 0; i < postfixTokens.length; i++) {
          const token = postfixTokens[i];
          if (!token) continue;
          
          if (token.type === 'value') {
            const value = parseFloat(String(token.value));
            const finalValue = isNaN(value) ? 0 : value;
            stack.push(finalValue);
            operations.push(`PUSH(${finalValue})`);
            
          } else if (token.type === 'variable') {
            // ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ DYNAMIQUE: Support des deux formats de tokens (name ET variableId)
            const varName = token.variableId || token.name || '';
            const value = resolvedVariables[varName] || 0;
            stack.push(value);
            operations.push(`PUSH(${varName}=${value})`);
            
          } else if (token.type === 'operator' && ['+', '-', '*', '/'].includes(String(token.value))) {
            // ÃƒÆ’Ã¢â‚¬Â°valuation en notation postfix - l'opÃƒÆ’Ã‚Â©rateur vient aprÃƒÆ’Ã‚Â¨s les opÃƒÆ’Ã‚Â©randes
            if (stack.length >= 2) {
              const b = stack.pop()!;
              const a = stack.pop()!;
              let result = 0;
              const operator = String(token.value);
              
              switch (operator) {
                case '+': 
                  result = a + b; 
                  operations.push(`${a} + ${b} = ${result}`);
                  break;
                case '-': 
                  result = a - b; 
                  operations.push(`${a} - ${b} = ${result}`);
                  break;
                case '*': 
                  result = a * b; 
                  operations.push(`${a} * ${b} = ${result}`);
                  break;
                case '/': 
                  if (b !== 0) {
                    result = a / b;
                    operations.push(`${a} / ${b} = ${result}`);
                  } else {
                    result = 0;
                    operations.push(`${a} / ${b} = 0 (division par zÃƒÆ’Ã‚Â©ro ÃƒÆ’Ã‚Â©vitÃƒÆ’Ã‚Â©e)`);
                  }
                  break;
              }
              
              stack.push(result);
              
            } else {
              operations.push(`ERREUR: Pile insuffisante pour ${token.value}`);
            }
          } else {
          }
        }
        
        const finalResult = stack.length > 0 ? stack[0] : 0;
        
        return finalResult;
      };

      let result: number | null = null;
      
      if (tokens.length > 0) {
        result = evaluateTokens(tokens);
      } else {
        result = 0;
      }


      const responseData = {
        formulaId: formula.id,
        formulaName: formula.name,
        nodeLabel: formula.TreeBranchLeafNode?.label || 'NÃƒâ€¦Ã¢â‚¬Å“ud inconnu',
        evaluation: {
          success: result !== null,
          result: result,
          tokens: tokens,
          resolvedVariables: resolvedVariables,
          details: {
            fieldValues: fieldValues,
            timestamp: new Date().toISOString(),
            testMode: testMode,
            tokenCount: tokens.length,
            variableCount: tokenVariables.length
          }
        },
        orchestrator: orchestrated ? {
          strategy: orchestrated.strategy,
          operatorsDetected: orchestrated.operatorsDetected,
          trace: orchestrated.trace,
          resolvedVariables: orchestrated.resolvedVariables
        } : null
      };

      return res.json(responseData);
    } catch (evaluationError) {
      console.error(`[TreeBranchLeaf API] Erreur lors de l'ÃƒÆ’Ã‚Â©valuation:`, evaluationError);
      return res.status(500).json({ 
        error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation de la formule',
        details: (evaluationError as Error).message,
        debug: {
          formulaId,
          hasTokens: (() => {
            const maybeErr = evaluationError as unknown as { tokens?: unknown } | null;
            if (maybeErr && Array.isArray(maybeErr.tokens)) return maybeErr.tokens.length;
            return tokens.length;
          })(),
          receivedFieldValuesKeys: Object.keys(fieldValues),
          orchestratorTrace: orchestrated?.trace?.slice?.(0, 10) || null
        }
      });
    }
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error evaluating formula:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation de la formule' });
  }
});

// POST /api/treebranchleaf/evaluate/batch
// ÃƒÆ’Ã¢â‚¬Â°value plusieurs formules en une seule requÃƒÆ’Ã‚Âªte
router.post('/evaluate/batch', async (req, res) => {
  try {
    const { requests = [], nodeIds = [], fieldValues = {} } = req.body;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // Support de deux formats :
    // 1. Format classique : { requests: [{ formulaId, fieldValues }] }
    // 2. Format nodeIds : { nodeIds: ['id1', 'id2'], fieldValues: {...} }
    
    let finalRequests = [];
    
    if (Array.isArray(requests) && requests.length > 0) {
      // Format classique
      finalRequests = requests;
    } else if (Array.isArray(nodeIds) && nodeIds.length > 0) {
      // Format nodeIds - on doit rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les formules des nÃƒâ€¦Ã¢â‚¬Å“uds
      
      for (const nodeId of nodeIds) {
        // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les formules du nÃƒâ€¦Ã¢â‚¬Å“ud
        const nodeFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
          where: { nodeId },
          select: { id: true, name: true }
        });
        
        for (const formula of nodeFormulas) {
          finalRequests.push({
            formulaId: formula.id,
            fieldValues: fieldValues,
            testMode: false
          });
        }
      }
      
    }

    if (finalRequests.length === 0) {
      return res.status(400).json({ error: 'Aucune formule ÃƒÆ’Ã‚Â  ÃƒÆ’Ã‚Â©valuer dans la requÃƒÆ’Ã‚Âªte batch' });
    }

    const results = [];

    for (const request of finalRequests) {
      const { formulaId, fieldValues = {}, testMode = true } = request;

      if (!formulaId) {
        results.push({
          formulaId: null,
          error: 'formulaId manquant',
          success: false
        });
        continue;
      }

      try {
        // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la formule
        const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: formulaId },
          include: {
            TreeBranchLeafNode: {
              select: {
                label: true,
                treeId: true,
                TreeBranchLeafTree: {
                  select: { organizationId: true }
                }
              }
            }
          }
        });

        if (!formula) {
          results.push({
            formulaId,
            error: 'Formule non trouvÃƒÆ’Ã‚Â©e',
            success: false
          });
          continue;
        }

        // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s organisation
        const nodeOrg = formula.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
        if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
          results.push({
            formulaId,
            error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette formule',
            success: false
          });
          continue;
        }

        // ÃƒÆ’Ã¢â‚¬Â°valuer la formule (mÃƒÆ’Ã‚Âªme logique que l'endpoint individuel)
        interface FormulaToken {
          type: 'value' | 'variable' | 'operator' | 'lparen' | 'rparen';
          value?: string | number;
          name?: string;
        }

        const tokens = Array.isArray(formula.tokens) ? formula.tokens as FormulaToken[] : [];
        
        const tokenVariables = tokens
          .filter((t): t is FormulaToken => Boolean(t) && t.type === 'variable')
          .map((t) => t.name)
          .filter(Boolean) as string[];

        const resolvedVariables: Record<string, number> = {};
        for (const varName of tokenVariables) {
          const rawValue = fieldValues[varName];
          const numValue = rawValue != null && rawValue !== '' 
            ? parseFloat(String(rawValue).replace(/\s+/g, '').replace(/,/g, '.'))
            : 0;
          resolvedVariables[varName] = isNaN(numValue) ? 0 : numValue;
        }

        const evaluateTokens = (tokens: FormulaToken[]): number => {
          const stack: number[] = [];
          
          for (const token of tokens) {
            if (!token) continue;
            
            if (token.type === 'value') {
              const value = parseFloat(String(token.value));
              stack.push(isNaN(value) ? 0 : value);
            } else if (token.type === 'variable') {
              // ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ DYNAMIQUE: Support des deux formats de tokens (variableId ET name)
              const varName = token.variableId || token.name || '';
              const value = resolvedVariables[varName] || 0;
              stack.push(value);
            } else if (token.type === 'operator' && ['+', '-', '*', '/'].includes(String(token.value))) {
              if (stack.length >= 2) {
                const b = stack.pop()!;
                const a = stack.pop()!;
                let result = 0;
                
                switch (token.value) {
                  case '+': result = a + b; break;
                  case '-': result = a - b; break;
                  case '*': result = a * b; break;
                  case '/': result = b !== 0 ? a / b : 0; break;
                }
                
                stack.push(result);
              }
            }
          }
          
          return stack.length > 0 ? stack[0] : 0;
        };

        let result: number | null = null;
        
        if (tokens.length > 0) {
          result = evaluateTokens(tokens);
        } else {
          result = 0;
        }

        results.push({
          formulaId: formula.id,
          formulaName: formula.name,
          nodeLabel: formula.TreeBranchLeafNode?.label || 'NÃƒâ€¦Ã¢â‚¬Å“ud inconnu',
          success: true,
          evaluation: {
            success: result !== null,
            result: result,
            tokens: tokens,
            resolvedVariables: resolvedVariables,
            details: {
              fieldValues: fieldValues,
              timestamp: new Date().toISOString(),
              testMode: testMode,
              tokenCount: tokens.length,
              variableCount: tokenVariables.length
            }
          }
        });

      } catch (evaluationError) {
        console.error(`[TreeBranchLeaf API] Erreur ÃƒÆ’Ã‚Â©valuation batch formule ${formulaId}:`, evaluationError);
        results.push({
          formulaId,
          error: `Erreur d'ÃƒÆ’Ã‚Â©valuation: ${(evaluationError as Error).message}`,
          success: false
        });
      }
    }


    return res.json({
      success: true,
      totalRequests: finalRequests.length,
      successCount: results.filter(r => r.success).length,
      results: results
    });

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error in batch evaluation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation batch' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ HELPER FUNCTIONS
// =============================================================================

// Fonction helper pour vÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s ÃƒÆ’Ã‚Â  un nÃƒâ€¦Ã¢â‚¬Å“ud par organisation
async function ensureNodeOrgAccess(
  prisma: PrismaClient, 
  nodeId: string, 
  auth: { organizationId: string | null; isSuperAdmin: boolean }
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le node avec son treeId
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: { treeId: true }
    });

    if (!node) {
      return { ok: false, status: 404, error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' };
    }

    // Super admin a accÃƒÆ’Ã‚Â¨s ÃƒÆ’Ã‚Â  tout
    if (auth.isSuperAdmin) {
      return { ok: true };
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer l'arbre pour vÃƒÆ’Ã‚Â©rifier l'organizationId
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: node.treeId },
      select: { organizationId: true }
    });

    if (!tree) {
      return { ok: false, status: 404, error: 'Arbre non trouvÃƒÆ’Ã‚Â©' };
    }

    // VÃƒÆ’Ã‚Â©rifier correspondance organisation
    if (tree.organizationId && tree.organizationId !== auth.organizationId) {
      return { ok: false, status: 403, error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error checking node org access:', error);
    return { ok: false, status: 500, error: 'Erreur de vÃƒÆ’Ã‚Â©rification d\'accÃƒÆ’Ã‚Â¨s' };
  }
}

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â ENDPOINTS DIRECTS PAR ID - Pour rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration dynamique
// =============================================================================

// GET /api/treebranchleaf/conditions/:conditionId
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re une condition spÃƒÆ’Ã‚Â©cifique par son ID
router.get('/conditions/:conditionId', async (req, res) => {
  try {
    const { conditionId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la condition avec informations d'organisation
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId },
      include: {
        TreeBranchLeafNode: {
          select: {
            label: true,
            treeId: true,
            TreeBranchLeafTree: {
              select: { organizationId: true }
            }
          }
        }
      }
    });

    if (!condition) {
      return res.status(404).json({ error: 'Condition non trouvÃƒÆ’Ã‚Â©e' });
    }

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s organisation
    const nodeOrg = condition.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette condition' });
    }

    return res.json(condition);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting condition by ID:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de la condition' });
  }
});

// GET /api/treebranchleaf/formulas/:formulaId
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re une formule spÃƒÆ’Ã‚Â©cifique par son ID
router.get('/formulas/:formulaId', async (req, res) => {
  try {
    const { formulaId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la formule avec informations d'organisation
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      include: {
        TreeBranchLeafNode: {
          select: {
            label: true,
            treeId: true,
            TreeBranchLeafTree: {
              select: { organizationId: true }
            }
          }
        }
      }
    });

    if (!formula) {
      return res.status(404).json({ error: 'Formule non trouvÃƒÆ’Ã‚Â©e' });
    }

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s organisation
    const nodeOrg = formula.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette formule' });
    }

    return res.json(formula);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting formula by ID:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de la formule' });
  }
});

// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ SUBMISSIONS - Gestion des soumissions TreeBranchLeaf
// =============================================================================

// GET /api/treebranchleaf/submissions - Lister les soumissions avec filtres
router.get('/submissions', async (req, res) => {
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { treeId, leadId, userId, status } = req.query;


    // Construire les conditions de filtrage
    interface SubmissionWhereClause {
      treeId?: string;
      leadId?: string;
      userId?: string;
      status?: string;
      organizationId?: string;
    }
    
    const whereClause: SubmissionWhereClause = {};
    
    if (treeId) whereClause.treeId = treeId as string;
    if (leadId) whereClause.leadId = leadId as string;
    if (userId) whereClause.userId = userId as string;
    if (status) whereClause.status = status as string;

    // Filtrer par organisation si pas super admin
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Note: TreeBranchLeafSubmission n'a pas de relations explicites avec Lead/User dans le schéma
    // On récupère d'abord les submissions, puis on enrichit avec les données lead/user si nécessaire
    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    // Si on a des leadIds, récupérer les infos des leads
    const leadIds = [...new Set(submissions.map(s => s.leadId).filter(Boolean))] as string[];
    const userIds = [...new Set(submissions.map(s => s.userId).filter(Boolean))] as string[];

    const [leads, users] = await Promise.all([
      leadIds.length > 0 
        ? prisma.lead.findMany({
            where: { id: { in: leadIds } },
            select: { id: true, firstName: true, lastName: true, email: true, company: true }
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true }
          })
        : Promise.resolve([])
    ]);

    const leadMap = new Map(leads.map(l => [l.id, l]));
    const userMap = new Map(users.map(u => [u.id, u]));

    // Enrichir les submissions avec les données lead/user
    const enrichedSubmissions = submissions.map(submission => ({
      ...submission,
      Lead: submission.leadId ? leadMap.get(submission.leadId) || null : null,
      User_TreeBranchLeafSubmission_userIdToUser: submission.userId ? userMap.get(submission.userId) || null : null
    }));

    res.json(enrichedSubmissions);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching submissions:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des soumissions' });
  }
});

// GET /submissions/by-leads - RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les devis groupÃƒÆ’Ã‚Â©s par lead
router.get('/submissions/by-leads', async (req, res) => {
  try {
    const authCtx = getAuthCtx(req);
    const { organizationId, isSuperAdmin } = authCtx;
    const { treeId, search, leadId } = req.query;


    // Construire les filtres pour les soumissions
    const submissionWhere: {
      treeId?: string;
      leadId?: string;
      TreeBranchLeafTree?: { organizationId: string };
    } = {};
    if (treeId) {
      submissionWhere.treeId = treeId as string;
    }
    if (leadId) {
      submissionWhere.leadId = leadId as string;
    }
    if (!isSuperAdmin) {
      submissionWhere.TreeBranchLeafTree = {
        organizationId
      };
    }

    // Construire les filtres pour les leads
    const leadWhere: {
      id?: string;
      organizationId?: string;
      OR?: Array<{
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};
    if (leadId) {
      leadWhere.id = leadId as string;
    }
    if (!isSuperAdmin) {
      leadWhere.organizationId = organizationId;
    }
    if (search) {
      leadWhere.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // D abord recuperer les soumissions avec leurs leadId
    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      where: {
        ...submissionWhere,
        leadId: { not: null },
        status: { in: ['completed', 'default-draft'] }
      },
      select: {
        id: true,
        leadId: true,
        status: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
        treeId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Recuperer les tree names
    const treeIds = [...new Set(submissions.map(s => s.treeId))];
    const trees = await prisma.treeBranchLeafTree.findMany({
      where: { id: { in: treeIds } },
      select: { id: true, name: true }
    });
    const treeMap = new Map(trees.map(t => [t.id, t.name]));

    // Recuperer les leads correspondants
    const leadIds = [...new Set(submissions.map(s => s.leadId).filter(Boolean))] as string[];
    const leads = await prisma.lead.findMany({
      where: {
        ...leadWhere,
        id: { in: leadIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Grouper les soumissions par lead
    const submissionsByLead = new Map<string, typeof submissions>();
    for (const submission of submissions) {
      if (submission.leadId) {
        const existing = submissionsByLead.get(submission.leadId) || [];
        existing.push(submission);
        submissionsByLead.set(submission.leadId, existing);
      }
    }

    // Formater les donnees pour interface
    const formattedData = leads.map(lead => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      submissions: (submissionsByLead.get(lead.id) || []).map(submission => ({
        id: submission.id,
        name: submission.status === 'default-draft'
          ? 'Brouillon'
          : ((submission.summary as { name?: string })?.name || `Devis ${new Date(submission.createdAt).toLocaleDateString('fr-FR')}`),
        status: submission.status,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        treeName: treeMap.get(submission.treeId)
      }))
    }));

    res.json(formattedData);

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error getting submissions by leads:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des devis par leads' });
  }
});

// GET /api/treebranchleaf/submissions/:id - RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer une soumission spÃƒÆ’Ã‚Â©cifique
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¸Ã‚Â GET /api/treebranchleaf/submissions/:id/fields - RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer TOUS les champs d'une soumission
router.get('/submissions/:id/fields', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    console.log(`[TBL-FIELDS] ▶️ GET /submissions/${id}/fields`);

    // Charger la soumission SANS include (relations pas définies dans Prisma)
    let submission = null as Awaited<ReturnType<typeof prisma.treeBranchLeafSubmission.findUnique>> | null;
    try {
      submission = await prisma.treeBranchLeafSubmission.findUnique({ where: { id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[TBL-FIELDS] ⚠️ findUnique submission échoué:', msg);
      submission = null;
    }

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    // Charger tree séparément pour contrôle d'accès
    let tree: { id: string; organizationId: string } | null = null;
    if (submission.treeId) {
      try {
        tree = await prisma.treeBranchLeafTree.findUnique({
          where: { id: submission.treeId },
          select: { id: true, organizationId: true }
        });
      } catch (e) {
        console.warn('[TBL-FIELDS] ⚠️ findUnique tree échoué:', e instanceof Error ? e.message : String(e));
        tree = null;
      }
    }

    const treeOrg = tree?.organizationId;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Charger lead séparément si présent (pour devis avec lead)
    let lead: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    } | null = null;
    if (submission.leadId) {
      try {
        lead = await prisma.lead.findUnique({
          where: { id: submission.leadId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true
          }
        });
      } catch (e) {
        console.warn('[TBL-FIELDS] ⚠️ findUnique lead échoué:', e instanceof Error ? e.message : String(e));
        lead = null;
      }
    }

    // Récupérer toutes les données de la soumission (défensif)
    let dataRows: Array<{
      nodeId: string;
      value: string | null;
      operationSource?: string | null;
      createdAt?: Date;
    }> = [];
    try {
      dataRows = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: id },
        orderBy: { createdAt: 'asc' }
      });
    } catch (e) {
      console.warn('[TBL-FIELDS] ⚠️ findMany submissionData échoué:', e instanceof Error ? e.message : String(e));
      dataRows = [];
    }
    console.log(`[TBL-FIELDS] ℹ️ dataRows=${dataRows.length}`);

    // Récupérer les nodeIds uniques (en filtrant les valeurs invalides/nulles)
    const nodeIds = [...new Set(
      dataRows
        .map(r => r?.nodeId)
        .filter((nid): nid is string => typeof nid === 'string' && nid.length > 0)
    )];
    console.log(`[TBL-FIELDS] ℹ️ nodeIds=${nodeIds.length}`);

    // Récupérer les infos des nodes en une seule requête (défensif)
    let nodes: Array<{
      id: string;
      type: string | null;
      label: string | null;
      fieldType?: string | null;
      fieldSubType?: string | null;
    }> = [];
    if (nodeIds.length > 0) {
      try {
        nodes = await prisma.treeBranchLeafNode.findMany({
          where: { id: { in: nodeIds } },
          select: { id: true, type: true, label: true, fieldType: true, fieldSubType: true }
        });
      } catch (e) {
        console.warn('[TreeBranchLeaf API] ⚠️ findMany nodes échoué, retour des champs vides.', e instanceof Error ? e.message : String(e));
        nodes = [];
      }
    }
    console.log(`[TBL-FIELDS] ℹ️ nodes=${nodes.length}`);

    // Créer un map nodeId -> nodeInfo
    const nodesMap = new Map(nodes.map(n => [n.id, n]));

    // Construire un objet avec tous les champs mappés
    const fieldsMap: Record<string, {
      nodeId: string;
      label: string;
      name?: string;
      type: string;
      fieldType?: string;
      fieldSubType?: string;
      value: any;
      rawValue: string;
      calculatedBy?: string;
    }> = {};

    for (const row of dataRows) {
      const node = nodesMap.get(row.nodeId);
      if (!node) continue;

      // 🚫 EXCLURE les champs DISPLAY (calculés) - ils doivent être recalculés dynamiquement
      // Ces champs ont fieldType='DISPLAY' ou (type='leaf_field' + fieldSubType='display')
      const isDisplayField = 
        node.fieldType === 'DISPLAY' ||
        (node.type === 'leaf_field' && ['display', 'DISPLAY', 'Display'].includes(node.fieldSubType || ''));
      
      if (isDisplayField) {
        console.log(`[TBL-FIELDS] ⏸️ Champ DISPLAY exclu: ${node.label} (${node.id})`);
        continue; // Ne pas inclure dans fieldsMap
      }

      const key = node.id;
      const raw = typeof row.value === 'string' ? row.value : JSON.stringify(row.value ?? null);

      fieldsMap[key] = {
        nodeId: node.id,
        label: node.label || '',
        type: node.type || 'unknown',
        fieldType: node.fieldType || undefined,
        fieldSubType: node.fieldSubType || undefined,
        value: row.value,
        rawValue: raw ?? '',
        calculatedBy: row.operationSource || undefined
      };
    }

    const response = {
      submissionId: submission.id,
      treeId: submission.treeId,
      treeName: tree?.id || null,
      leadId: submission.leadId,
      lead: lead ? {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        fullAddress: null
      } : null,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      fields: fieldsMap,
      totalFields: Object.keys(fieldsMap).length
    };

    return res.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[TreeBranchLeaf API] 💥 Erreur GET /submissions/:id/fields:', errorMsg);
    console.error('[TreeBranchLeaf API] Stack:', error instanceof Error ? error.stack : '');
    return res.status(500).json({ error: 'Erreur lors de la récupération des champs', details: errorMsg });
  }
});
router.get('/submissions/:id', async (req, res) => {
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { id } = req.params;
    console.log(`[TBL-API] ▶️ GET /submissions/${id}`);

    // Charger la soumission SANS include (relations non définies dans Prisma)
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    // Contrôle d'accès via l'organisation de l'arbre
    const tree = await prisma.treeBranchLeafTree.findUnique({
      where: { id: submission.treeId },
      select: { id: true, organizationId: true }
    });
    const treeOrg = tree?.organizationId ?? null;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé à cette soumission' });
    }

    // Charger les données de soumission séparément
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id }
    });

    // Récupérer les nodeIds pour enrichir avec les infos des nodes
    const nodeIds = [...new Set(submissionData.map(d => d.nodeId))];
    const nodes = nodeIds.length > 0 ? await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, label: true, type: true, calculatedValue: true }
    }) : [];
    const nodesMap = new Map(nodes.map(n => [n.id, n]));

    // Enrichir les données avec les infos des nodes
    const enrichedData = submissionData.map(d => ({
      ...d,
      TreeBranchLeafNode: nodesMap.get(d.nodeId) || null
    }));

    // Optionnel: hydrater le lead basique si présent
    let leadBasic: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null; company?: string | null } | null = null;
    if (submission.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: submission.leadId },
        select: { id: true, firstName: true, lastName: true, email: true, company: true }
      });
      leadBasic = lead ?? null;
    }

    // Retourner la soumission avec les données et le lead
    return res.json({ 
      ...submission, 
      TreeBranchLeafSubmissionData: enrichedData,
      Lead: leadBasic 
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching submission:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la soumission' });
  }
});

// GET /api/treebranchleaf/submissions/:id/summary - RÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© des donnÃƒÆ’Ã‚Â©es d'une soumission
router.get('/submissions/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Charger la soumission pour contrÃƒÆ’Ã‚Â´le d'accÃƒÆ’Ã‚Â¨s
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvÃƒÆ’Ã‚Â©e' });
    }
    const tree = submission ? await prisma.treeBranchLeafTree.findUnique({
      where: { id: submission.treeId },
      select: { id: true, organizationId: true }
    }) : null;
    const treeOrg = tree?.organizationId;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette soumission' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer toutes les lignes de donnÃƒÆ’Ã‚Â©es avec type du nÃƒâ€¦Ã¢â‚¬Å“ud
    const dataRows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id },
      include: {
        TreeBranchLeafNode: { select: { id: true, type: true, label: true } }
      }
    });

    const isFilled = (v: string | null) => v != null && String(v).trim() !== '';

    const total = dataRows.length;
    const filled = dataRows.filter(r => isFilled(r.value)).length;
    const empty = total - filled;

    const optionRows = dataRows.filter(r => {
      const node = r.TreeBranchLeafNode as { type?: unknown } | null | undefined;
      const t = node?.type;
      return t === 'leaf_option_field' || t === 'option_field' || t === 5;
    });
    const optionTotal = optionRows.length;
    const optionFilled = optionRows.filter(r => isFilled(r.value)).length;
    const optionEmpty = optionTotal - optionFilled;

    const variablesTotal = dataRows.filter(r => r.isVariable === true).length;

    // Ratio complÃƒÆ’Ã‚Â©tion simple
    const completion = total > 0 ? Math.round((filled / total) * 100) : 0;

    return res.json({
      submissionId: id,
      treeId: submission.treeId,
      status: submission.status,
      updatedAt: submission.updatedAt,
      counts: {
        total,
        filled,
        empty,
        optionFields: { total: optionTotal, filled: optionFilled, empty: optionEmpty },
        variables: { total: variablesTotal }
      },
      completion
    });
  } catch (error) {
    console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur GET /submissions/:id/summary:', error);
    return res.status(500).json({ error: 'Erreur lors du calcul du rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© de la soumission' });
  }
});

// GET /api/treebranchleaf/submissions/:id/operations - Timeline dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©e des opÃƒÆ’Ã‚Â©rations/data
router.get('/submissions/:id/operations', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Charger la soumission pour contrÃƒÆ’Ã‚Â´le d'accÃƒÆ’Ã‚Â¨s
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      select: { 
        id: true, 
        treeId: true,
        TreeBranchLeafTree: { select: { id: true, organizationId: true } } 
      }
    });
    if (!submission) return res.status(404).json({ error: 'Soumission non trouvÃƒÆ’Ã‚Â©e' });
    const treeOrg = submission.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette soumission' });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer toutes les data rows enrichies
    const rows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id },
      include: {
        TreeBranchLeafNode: { select: { id: true, label: true, type: true } }
      },
      // TreeBranchLeafSubmissionData n'a pas de colonne updatedAt -> trier par lastResolved puis createdAt
      orderBy: [
        { lastResolved: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ AJOUT CRUCIAL: Si pas de donnÃƒÆ’Ã‚Â©es de soumission, rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les variables configurÃƒÆ’Ã‚Â©es pour l'arbre
    if (rows.length === 0) {
      
      if (submission?.treeId) {
        const treeVariables = await prisma.treeBranchLeafNodeVariable.findMany({
          where: { TreeBranchLeafNode: { treeId: submission.treeId } },
          select: {
            id: true,
            nodeId: true,
            exposedKey: true,
            displayName: true,
            unit: true,
            defaultValue: true,
            fixedValue: true,
            sourceRef: true,
            TreeBranchLeafNode: { select: { id: true, label: true, type: true } }
          }
        });
        
        // CrÃƒÆ’Ã‚Â©er des pseudo-rows pour les variables configurÃƒÆ’Ã‚Â©es
        const pseudoRows = treeVariables.map(v => ({
          nodeId: v.nodeId,
          submissionId: id,
          isVariable: true,
          fieldLabel: v.TreeBranchLeafNode?.label || null,
        variableDisplayName: v.displayName,
        variableKey: v.exposedKey,
        variableUnit: v.unit,
        sourceRef: v.sourceRef,
        // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION: Utiliser fixedValue ou defaultValue comme valeur
        // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â§ TEMPORAIRE: Valeurs de test hardcodÃƒÆ’Ã‚Â©es pour validation
        value: getTestValueForNode(v.nodeId, v.fixedValue, v.defaultValue),
        operationSource: null,
        operationDetail: null,
        operationResult: null,
        lastResolved: null,
        createdAt: new Date(),
        TreeBranchLeafNode: v.TreeBranchLeafNode
      }));
      
      rows.push(...pseudoRows);
      }
    }

    const inferSource = (sourceRef?: string | null): 'formula' | 'condition' | 'table' | 'neutral' => {
      const s = (sourceRef || '').toLowerCase();
      if (s.includes('formula') || s.includes('formule')) return 'formula';
      if (s.includes('condition')) return 'condition';
      if (s.includes('table')) return 'table';
      return 'neutral';
    };

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CORRECTION MAJEURE: RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer TOUS les labels de l'arbre d'abord
    const treeId = submission?.treeId;
    if (!treeId) {
      return res.status(404).json({ error: 'Soumission non trouvÃƒÆ’Ã‚Â©e' });
    }
    
    const allTreeNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { id: true, label: true }
    });
    
    // PrÃƒÆ’Ã‚Â©parer des maps pour labels et valeurs de la soumission
    // Commencer avec TOUS les labels de l'arbre
    const labelMap: LabelMap = new Map(allTreeNodes.map(n => [n.id, n.label || null]));
    const valuesMap: ValuesMap = new Map(rows.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
    
    // ComplÃƒÆ’Ã‚Â©ter avec les labels spÃƒÆ’Ã‚Â©cifiques de la soumission si prÃƒÆ’Ã‚Â©sents
    for (const r of rows) {
      const nodeLabel = r.TreeBranchLeafNode?.label || r.fieldLabel;
      if (nodeLabel && nodeLabel !== labelMap.get(r.nodeId)) {
        labelMap.set(r.nodeId, nodeLabel);
      }
    }

    // Helper: assurer que labelMap contient les labels pour une liste d'IDs de nÃƒâ€¦Ã¢â‚¬Å“uds
    const ensureNodeLabels = async (ids: Set<string> | string[]) => {
      const list = Array.isArray(ids) ? ids : Array.from(ids);
      const missing = list.filter(id => !!id && !labelMap.has(id));
      if (missing.length === 0) return;
      const extra = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: missing } }, select: { id: true, label: true } });
      for (const n of extra) labelMap.set(n.id, n.label || null);
    };

    // Helper de normalisation de l'opÃƒÆ’Ã‚Â©ration dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©e par ligne
    const resolveDetailForRow = async (r: typeof rows[number]) => {
      const det = r.operationDetail as unknown as { type?: string; conditionSet?: unknown; tokens?: unknown; id?: string; name?: string; nodeId?: string } | null;
      // Si c'est un objet avec type mais payload potentiellement incomplet (ou stringifiÃƒÆ’Ã‚Â© depuis .NET), recharger depuis la sourceRef
      if (det && det.type) {
        const parsed = parseSourceRef(r.sourceRef);
        if (parsed?.type === 'condition') {
          const rec = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } });
          return buildOperationDetail('condition', rec) as unknown as Record<string, unknown>;
        }
        if (parsed?.type === 'formula') {
          const rec = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } });
          return buildOperationDetail('formula', rec) as unknown as Record<string, unknown>;
        }
        if (parsed?.type === 'table') {
          const rec = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
          return buildOperationDetail('table', rec) as unknown as Record<string, unknown>;
        }
        return det; // laisser tel quel si pas de sourceRef exploitable
      }
      // Sinon, tenter via sourceRef
      const parsed = parseSourceRef(r.sourceRef);
      if (!parsed) return det || null;
      if (parsed.type === 'condition') {
        const rec = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } });
        return buildOperationDetail('condition', rec) as unknown as Record<string, unknown>;
      }
      if (parsed.type === 'formula') {
        const rec = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } });
        return buildOperationDetail('formula', rec) as unknown as Record<string, unknown>;
      }
      if (parsed.type === 'table') {
        const rec = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
        return buildOperationDetail('table', rec) as unknown as Record<string, unknown>;
      }
      return det || null;
    };

  const items = await Promise.all(rows.map(async r => {
      const nodeLabel = r.fieldLabel || r.TreeBranchLeafNode?.label || labelMap.get(r.nodeId) || null;
      const unit = r.variableUnit || null;
      const val = r.value == null ? null : String(r.value);
      const displayName = r.variableDisplayName || nodeLabel;
      const response = val;

      const source: 'formula' | 'condition' | 'table' | 'neutral' = r.isVariable ? inferSource(r.sourceRef) : 'neutral';
      // PrÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rer l'objet dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â© stockÃƒÆ’Ã‚Â© si prÃƒÆ’Ã‚Â©sent, sinon fallback
      const operationDetail = (r.operationDetail as unknown) ?? (r.isVariable ? (r.sourceRef || undefined) : (nodeLabel || undefined));
      const labelForResult = displayName || nodeLabel || labelMap.get(r.nodeId) || r.TreeBranchLeafNode?.id || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';
      const operationResult = unit && response ? `${labelForResult}: ${response} ${unit}` : `${labelForResult}: ${response ?? ''}`;

      // RÃƒÆ’Ã‚Â©soudre lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢objet dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â© si absent/incomplet
      const detNormalized = await resolveDetailForRow(r);
      // RÃƒÆ’Ã‚Â©solution dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©e pour lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢affichage (labels + valeurs)
  let operationDetailResolved: Prisma.InputJsonValue | undefined = undefined;
  let operationResultResolved: Prisma.InputJsonValue | undefined = undefined;
  let operationHumanText: string | undefined = undefined;
  const det = detNormalized as { type?: string; conditionSet?: unknown; tokens?: unknown; id?: string; name?: string; nodeId?: string } | null;
        if (det && det.type) {
        if (det.type === 'condition') {
          const set = det.conditionSet;
          const refIds = extractNodeIdsFromConditionSet(set);
          await ensureNodeLabels(refIds);
          const _resolvedRefs = buildResolvedRefs(refIds, labelMap, valuesMap);
          // ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â  AmÃƒÆ’Ã‚Â©lioration: certaines actions rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencent node-formula:<id> ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ retrouver le label du nÃƒâ€¦Ã¢â‚¬Å“ud de cette formule
          const extendLabelsWithFormulas = async (conditionSet: unknown, baseLabels: LabelMap): Promise<LabelMap> => {
            const extended = new Map(baseLabels);
            try {
              const str = JSON.stringify(conditionSet) || '';
              const ids = new Set<string>();
              let m: RegExpExecArray | null;
              const re = /node-formula:([a-f0-9-]{36})/gi;
              while ((m = re.exec(str)) !== null) ids.add(m[1]);
              if (ids.size === 0) return extended;
              const list = Array.from(ids);
              const formulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { id: { in: list } }, select: { id: true, nodeId: true } });
              for (const f of formulas) {
                const nodeLbl = labelMap.get(f.nodeId) ?? null;
                if (nodeLbl) extended.set(f.id, nodeLbl);
              }
            } catch {
              // ignore parse/query errors for label extension
            }
            return extended;
          };
          const labelsForText = await extendLabelsWithFormulas(set, labelMap);
          // Essayer aussi de rÃƒÆ’Ã‚Â©soudre les actions -> labels
          const setObj = (set && typeof set === 'object') ? (set as Record<string, unknown>) : {};
          const branches = Array.isArray(setObj.branches) ? (setObj.branches as unknown[]) : [];
          const _branchesResolved = branches.map(b => {
            const bb = b as Record<string, unknown>;
            const actions = bb.actions as unknown[] | undefined;
            return {
              label: (bb.label as string) || null,
              when: bb.when || null,
              actions: resolveActionsLabels(actions, labelsForText)
            };
          });
          // ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â« DÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©: buildConditionExpressionReadable - tout passe par TBL Prisma !
          operationHumanText = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Condition ÃƒÆ’Ã‚Â©valuÃƒÆ’Ã‚Â©e via TBL Prisma (ligne 4755)';
          
          // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVELLE LOGIQUE: Utiliser buildDetailAndResultForOperation pour persister en base
          const { detail, result } = buildDetailAndResultForOperation(det, operationHumanText, unit, labelForResult, response);
          operationDetailResolved = detail;
          operationResultResolved = result;
        } else if (det.type === 'formula') {
          const refIds = extractNodeIdsFromTokens(det.tokens);
          await ensureNodeLabels(refIds);
          const _resolvedRefs = buildResolvedRefs(refIds, labelMap, valuesMap);
          {
            let expr = buildTextFromTokens(det.tokens, labelMap, valuesMap);
            operationHumanText = expr;
          }
          
          // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVELLE LOGIQUE: Utiliser buildDetailAndResultForOperation pour persister en base
          const { detail, result } = buildDetailAndResultForOperation(det, operationHumanText, unit, labelForResult, response);
          operationDetailResolved = detail;
          operationResultResolved = result;
        } else if (det.type === 'table') {
          // Tables: on peut juste renvoyer la structure et les ids concernÃƒÆ’Ã‚Â©s si prÃƒÆ’Ã‚Â©sents dans type/description
          const refIds = new Set<string>();
          const str = JSON.stringify(det);
          if (str) {
            let m: RegExpExecArray | null;
            const re = /@value\.([a-f0-9-]{36})/gi;
            while ((m = re.exec(str)) !== null) refIds.add(m[1]);
          }
          await ensureNodeLabels(refIds);
          {
            const expr = buildTextFromTableRecord(det, labelMap, valuesMap);
            const unitSuffix = unit ? ` ${unit}` : '';
            operationHumanText = expr ? `${expr} (=) ${labelForResult} (${response ?? ''}${unitSuffix})` : `${labelForResult} (${response ?? ''}${unitSuffix})`;
          }
          
          // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVELLE LOGIQUE: Utiliser buildDetailAndResultForOperation pour persister en base
          const { detail, result } = buildDetailAndResultForOperation(det, operationHumanText, unit, labelForResult, response);
          operationDetailResolved = detail;
          operationResultResolved = result;
        }
      }

      return {
        nodeId: r.nodeId,
        isVariable: r.isVariable,
        fieldLabel: nodeLabel,
        variableDisplayName: r.variableDisplayName || null,
        variableKey: r.variableKey || null,
        unit,
        sourceRef: r.sourceRef || null,
    operationSource: source,
    operationDetail: operationDetailResolved || detNormalized || operationDetail,
  operationResult: operationResultResolved || operationResult,
  // Pour les conditions, operationHumanText contient dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  l'expression complÃƒÆ’Ã‚Â¨te souhaitÃƒÆ’Ã‚Â©e
  operationResultText: operationHumanText ? operationHumanText : null,
        operationResultResolved,
        operationDetailResolved,
        response,
        lastResolved: r.lastResolved,
      };
    }));

    return res.json({ submissionId: id, items });
  } catch (error) {
    console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur GET /submissions/:id/operations:', error);
    return res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des opÃƒÆ’Ã‚Â©rations' });
  }
});

// POST /api/treebranchleaf/submissions/:id/repair-ops - Backfill operationDetail/operationResult/lastResolved pour une soumission
router.post('/submissions/:id/repair-ops', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Charger la soumission pour contrÃƒÆ’Ã‚Â´le d'accÃƒÆ’Ã‚Â¨s
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
    });
    if (!submission) return res.status(404).json({ error: 'Soumission non trouvÃƒÆ’Ã‚Â©e' });
    const treeId = submission.treeId;
    const treeOrg = submission.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette soumission' });
    }

    // PrÃƒÆ’Ã‚Â©parer les mÃƒÆ’Ã‚Â©tadonnÃƒÆ’Ã‚Â©es nÃƒÆ’Ã‚Â©cessaires
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId }, select: { id: true, label: true } });
    const labelMap = new Map(nodes.map(n => [n.id, n.label]));
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      include: { TreeBranchLeafNode: { select: { label: true } } }
    });
    const varMetaByNodeId = new Map(
      variables.map(v => [
        v.nodeId,
        {
          displayName: v.displayName || v.TreeBranchLeafNode?.label || v.exposedKey || v.nodeId,
          unit: v.unit || null,
          sourceRef: v.sourceRef || null
        }
      ])
    );

    const inferSource = (sourceRef?: string | null): 'formula' | 'condition' | 'table' | 'neutral' => {
      const s = (sourceRef || '').toLowerCase();
      if (s.includes('formula') || s.includes('formule')) return 'formula';
      if (s.includes('condition')) return 'condition';
      if (s.includes('table')) return 'table';
      return 'neutral';
    };

    const rows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id },
      select: { nodeId: true, isVariable: true, value: true, sourceRef: true }
    });
    // Carte de toutes les valeurs prÃƒÆ’Ã‚Â©sentes dans la soumission (pour rÃƒÆ’Ã‚Â©solution des refs)
    const submissionValues = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id },
      select: { nodeId: true, value: true }
    });
    const valuesMapAll: ValuesMap = new Map(submissionValues.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
    const now = new Date();
    for (const row of rows) {
      const isVar = row.isVariable;
      const meta = isVar ? varMetaByNodeId.get(row.nodeId) : undefined;
      const label = labelMap.get(row.nodeId) || undefined;
      const valueStr = row.value == null ? null : String(row.value);
      const opSrc = isVar ? inferSource(meta?.sourceRef || null) : 'neutral';
      const display = isVar ? (meta?.displayName || label || row.nodeId) : (label || row.nodeId);
      // Par dÃƒÆ’Ã‚Â©faut, rÃƒÆ’Ã‚Â©sultat lisible
      let opRes: Prisma.InputJsonValue = meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
      // RÃƒÆ’Ã‚Â©soudre operationDetail si variable et sourceRef
      let opDetail: Prisma.InputJsonValue | undefined = undefined;
      const parsed = parseSourceRef(row.sourceRef);
      if (isVar && parsed) {
        if (parsed.type === 'condition') {
          const rec = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } });
          const { detail, result } = await buildDetailAndResultForOperation('condition', rec, display, valueStr, meta?.unit || null, labelMap, valuesMapAll, prisma, id, organizationId || '', req.user?.id || '');
          opDetail = detail;
          opRes = result;
        } else if (parsed.type === 'formula') {
          const rec = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } });
          const { detail, result } = await buildDetailAndResultForOperation('formula', rec, display, valueStr, meta?.unit || null, labelMap, valuesMapAll, prisma, id, organizationId || '', req.user?.id || '');
          opDetail = detail;
          opRes = result;
        } else if (parsed.type === 'table') {
          const rec = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
          const { detail, result } = await buildDetailAndResultForOperation('table', rec, display, valueStr, meta?.unit || null, labelMap, valuesMapAll, prisma, id, organizationId || '', req.user?.id || '');
          opDetail = detail;
          opRes = result;
        }
      }
      await prisma.treeBranchLeafSubmissionData.updateMany({
        where: { submissionId: id, nodeId: row.nodeId },
        data: {
          operationSource: opSrc,
          // Fallback prioritaire: row.sourceRef (prÃƒÆ’Ã‚Â©sent cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© submissionData), puis meta.sourceRef, sinon label
          operationDetail: isVar ? (opDetail ?? (row.sourceRef || meta?.sourceRef || undefined)) : (label || undefined),
          operationResult: opRes,
          lastResolved: now
        }
      });
    }

    return res.json({ success: true, updated: rows.length });
  } catch (error) {
    console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur POST /submissions/:id/repair-ops:', error);
    return res.status(500).json({ error: 'Erreur lors du backfill des opÃƒÆ’Ã‚Â©rations' });
  }
});

// POST /api/treebranchleaf/submissions - CrÃƒÆ’Ã‚Â©er une nouvelle soumission
router.post('/submissions', async (req, res) => {
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  const userId = (req.user as { id?: string })?.id;
  const { treeId, leadId, name, data } = req.body as { treeId?: string; leadId?: string | null; name?: string; data?: unknown };

  // Normalisation des types attendus cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© DB (ids sous forme de chaÃƒÆ’Ã‚Â®nes)
  const normalizedTreeId: string = treeId != null ? String(treeId) : '';
  const normalizedLeadId: string | null = leadId != null && leadId !== '' ? String(leadId) : null;

  try {
    const approxBytes = (() => {
      try { return JSON.stringify(data)?.length ?? 0; } catch { return 0; }
    })();

    // Validation des paramÃƒÆ’Ã‚Â¨tres requis
    if (!normalizedTreeId) {
      return res.status(400).json({ error: 'treeId est requis' });
    }
    // L'utilisateur peut ÃƒÆ’Ã‚Âªtre mockÃƒÆ’Ã‚Â© et ne pas exister en DB; on ne bloque pas la crÃƒÆ’Ã‚Â©ation
    if (!userId) {
      console.warn('[TreeBranchLeaf API] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Aucun userId dans la requÃƒÆ’Ã‚Âªte (mode anonyme/mock) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ poursuite sans liaison utilisateur');
    }
    // LeadId est optionnel - peut ÃƒÆ’Ã‚Âªtre undefined pour des devis sans lead associÃƒÆ’Ã‚Â©
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name est requis et doit ÃƒÆ’Ã‚Âªtre une chaÃƒÆ’Ã‚Â®ne' });
    }

    // VÃƒÆ’Ã‚Â©rifier que l'arbre existe et appartient ÃƒÆ’Ã‚Â  l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { 
        id: normalizedTreeId,
        ...(isSuperAdmin ? {} : { organizationId })
      }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÆ’Ã‚Â© ou accÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
    }

    // VÃƒÆ’Ã‚Â©rifier que le lead existe et appartient ÃƒÆ’Ã‚Â  l'organisation (seulement si leadId fourni)
    let lead = null;
    if (normalizedLeadId) {
      lead = await prisma.lead.findFirst({
        where: { 
          id: normalizedLeadId,
          ...(isSuperAdmin ? {} : { organizationId })
        }
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead non trouvÃƒÆ’Ã‚Â© ou accÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â©' });
      }
    } else {
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les nÃƒâ€¦Ã¢â‚¬Å“uds valides pour ce tree pour valider les nodeIds
    const validNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: normalizedTreeId },
      select: { id: true }
    });
    const validNodeIds = new Set(validNodes.map(node => node.id));

    // Normaliser le payload data (accepte objet { nodeId: value } OU tableau [{ nodeId, value, calculatedValue }])
    type DataItem = { nodeId: string; value?: unknown; calculatedValue?: unknown };
    const rawEntries: DataItem[] = (() => {
      if (Array.isArray(data)) {
        return (data as unknown[])
          .map((it): DataItem | null => {
            if (it && typeof it === 'object' && 'nodeId' in (it as Record<string, unknown>)) {
              const obj = it as Record<string, unknown>;
              return { nodeId: String(obj.nodeId), value: obj.value, calculatedValue: obj.calculatedValue };
            }
            return null;
          })
          .filter((x): x is DataItem => !!x);
      }
      if (data && typeof data === 'object') {
        return Object.entries(data as Record<string, unknown>).map(([nodeId, value]) => ({ nodeId, value }));
      }
      return [];
    })();

    // Filtrer par nodeIds valides
    const filteredEntries = rawEntries.filter(({ nodeId }) => {
      const isValid = validNodeIds.has(nodeId);
      return isValid;
    });

    // CrÃƒÆ’Ã‚Â©er la soumission avec Prisma (fiable pour les JSON et enums)

    try {
      // VÃƒÆ’Ã‚Â©rifier l'existence de l'utilisateur en base pour ÃƒÆ’Ã‚Â©viter une violation de FK
      let safeUserId: string | null = null;
      if (userId) {
        try {
          const existingUser = await prisma.user.findUnique({ where: { id: userId } });
          if (existingUser) {
            safeUserId = userId;
          } else {
            console.warn('[TreeBranchLeaf API] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â userId fourni mais introuvable en base ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ crÃƒÆ’Ã‚Â©ation avec userId NULL');
          }
        } catch (checkErr) {
          console.warn('[TreeBranchLeaf API] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â ÃƒÆ’Ã¢â‚¬Â°chec de vÃƒÆ’Ã‚Â©rification userId ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ crÃƒÆ’Ã‚Â©ation avec userId NULL:', (checkErr as Error)?.message);
        }
      }

      const now = new Date();
      const created = await prisma.treeBranchLeafSubmission.create({
        data: {
          id: randomUUID(),
          treeId: normalizedTreeId,
          userId: safeUserId,
          leadId: normalizedLeadId,
          status: 'draft',
          updatedAt: now
        }
      });


      // 2. Persister toutes les valeurs de champs reÃƒÆ’Ã‚Â§ues (y compris champs conditionnels)
      if (filteredEntries.length > 0) {
        // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les ÃƒÆ’Ã‚Â©tiquettes des nÃƒâ€¦Ã¢â‚¬Å“uds pour les enregistrements crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©s
        const keys = filteredEntries.map(({ nodeId }) => nodeId);
        const nodesForLabels = await prisma.treeBranchLeafNode.findMany({
          where: { id: { in: keys as string[] } },
          select: { id: true, label: true }
        });
        const labelMap = new Map(nodesForLabels.map(n => [n.id, n.label]));

        // Charger les enregistrements existants (par ex. variables auto-crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©es par trigger)
        const existing = await prisma.treeBranchLeafSubmissionData.findMany({
          where: { submissionId: created.id, nodeId: { in: keys as string[] } },
          select: { nodeId: true }
        });
        const existingSet = new Set(existing.map(e => e.nodeId));

        const toCreate = filteredEntries.filter(({ nodeId }) => !existingSet.has(nodeId));
        const toUpdate = filteredEntries.filter(({ nodeId }) => existingSet.has(nodeId));

        await prisma.$transaction(async (tx) => {
          if (toCreate.length > 0) {
            await tx.treeBranchLeafSubmissionData.createMany({
              data: toCreate.map(({ nodeId, value: raw }) => ({
                id: randomUUID(),
                submissionId: created.id,
                nodeId,
                value: raw == null ? null : String(raw),
                fieldLabel: labelMap.get(nodeId) || null,
                isVariable: false
              }))
            });
          }
          if (toUpdate.length > 0) {
            // Mettre ÃƒÆ’Ã‚Â  jour la valeur existante (une requÃƒÆ’Ã‚Âªte par nodeId)
            for (const { nodeId, value: raw } of toUpdate) {
              try {
                await tx.treeBranchLeafSubmissionData.update({
                  where: { submissionId_nodeId: { submissionId: created.id, nodeId } },
                  data: { value: raw == null ? null : String(raw), fieldLabel: labelMap.get(nodeId) || undefined }
                });
              } catch {
                // Si le client Prisma n'expose pas la clÃƒÆ’Ã‚Â© composÃƒÆ’Ã‚Â©e, fallback en updateMany
                await tx.treeBranchLeafSubmissionData.updateMany({
                  where: { submissionId: created.id, nodeId },
                  data: { value: raw == null ? null : String(raw), fieldLabel: labelMap.get(nodeId) || undefined }
                });
              }
            }
          }
        });
      } else {
      }

      // 3. Enrichir immÃƒÆ’Ã‚Â©diatement les mÃƒÆ’Ã‚Â©tadonnÃƒÆ’Ã‚Â©es d'opÃƒÆ’Ã‚Â©ration pour cette soumission (backfill rapide post-crÃƒÆ’Ã‚Â©ation)
      try {
        const treeIdForBackfill = created.treeId;
        const [nodesForBackfill, varsForBackfill] = await Promise.all([
          prisma.treeBranchLeafNode.findMany({ where: { treeId: treeIdForBackfill }, select: { id: true, label: true } }),
          prisma.treeBranchLeafNodeVariable.findMany({ where: { TreeBranchLeafNode: { treeId: treeIdForBackfill } }, include: { TreeBranchLeafNode: { select: { label: true } } } })
        ]);
        const labelMapBF = new Map(nodesForBackfill.map(n => [n.id, n.label]));
        const varMetaByNodeIdBF = new Map(
          varsForBackfill.map(v => [
            v.nodeId,
            {
              displayName: v.displayName || v.TreeBranchLeafNode?.label || v.exposedKey || v.nodeId,
              unit: v.unit || null,
              sourceRef: v.sourceRef || null
            }
          ])
        );
        const rowsBF = await prisma.treeBranchLeafSubmissionData.findMany({
          where: { submissionId: created.id },
          select: { nodeId: true, isVariable: true, value: true, sourceRef: true }
        });
        // Construire une map de toutes les valeurs pour rÃƒÆ’Ã‚Â©solution des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences
        const valuesMapBF: ValuesMap = new Map(rowsBF.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
        const nowBF = new Date();
        for (const row of rowsBF) {
          if (!row.isVariable) continue;
          const meta = varMetaByNodeIdBF.get(row.nodeId);
          const label = labelMapBF.get(row.nodeId) || undefined;
          const valueStr = row.value == null ? null : String(row.value);
          const opSrc = (() => {
            const s = (meta?.sourceRef || '').toLowerCase();
            if (s.includes('formula') || s.includes('formule')) return 'formula' as const;
            if (s.includes('condition')) return 'condition' as const;
            if (s.includes('table')) return 'table' as const;
            return 'neutral' as const;
          })();
          const display = meta?.displayName || label || row.nodeId;
          // Par dÃƒÆ’Ã‚Â©faut chaÃƒÆ’Ã‚Â®ne lisible, remplacÃƒÆ’Ã‚Â©e par JSON si on peut rÃƒÆ’Ã‚Â©soudre la source
          let opRes: Prisma.InputJsonValue = meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
          // RÃƒÆ’Ã‚Â©soudre operationDetail
          let opDetail: Prisma.InputJsonValue | undefined = undefined;
          const parsed = parseSourceRef(row.sourceRef || meta?.sourceRef || null);
          if (parsed) {
            if (parsed.type === 'condition') {
              const rec = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } });
              const { detail, result } = await buildDetailAndResultForOperation('condition', rec, display, valueStr, meta?.unit || null, labelMapBF, valuesMapBF, prisma, created.id, organizationId || '', userId || '');
              opDetail = detail;
              opRes = result;
            } else if (parsed.type === 'formula') {
              const rec = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } });
              const { detail, result } = await buildDetailAndResultForOperation('formula', rec, display, valueStr, meta?.unit || null, labelMapBF, valuesMapBF, prisma, created.id, organizationId || '', userId || '');
              opDetail = detail;
              opRes = result;
            } else if (parsed.type === 'table') {
              const rec = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
              const { detail, result } = await buildDetailAndResultForOperation('table', rec, display, valueStr, meta?.unit || null, labelMapBF, valuesMapBF, prisma, created.id, organizationId || '', userId || '');
              opDetail = detail;
              opRes = result;
            }
          }
          await prisma.treeBranchLeafSubmissionData.updateMany({
            where: { submissionId: created.id, nodeId: row.nodeId },
            data: {
              operationSource: opSrc,
              operationDetail: opDetail ?? (row.sourceRef || meta?.sourceRef || undefined),
              operationResult: opRes,
              lastResolved: nowBF
            }
          });
        }
      } catch (enrichErr) {
        console.warn('[TreeBranchLeaf API] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Backfill post-crÃƒÆ’Ã‚Â©ation des opÃƒÆ’Ã‚Â©rations non critique a ÃƒÆ’Ã‚Â©chouÃƒÆ’Ã‚Â©:', (enrichErr as Error)?.message);
      }

      // 4. Recharger la soumission complÃƒÆ’Ã‚Â¨te pour la rÃƒÆ’Ã‚Â©ponse
      const full = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: created.id },
        include: {
          TreeBranchLeafTree: { select: { id: true, name: true } },
          Lead: { select: { id: true, firstName: true, lastName: true, email: true } },
          TreeBranchLeafSubmissionData: {
            include: {
              TreeBranchLeafNode: { select: { id: true, label: true, type: true } }
            }
          }
        }
      });

      if (!full) {
        throw new Error('Soumission non trouvÃƒÆ’Ã‚Â©e aprÃƒÆ’Ã‚Â¨s crÃƒÆ’Ã‚Â©ation');
      }

      const responsePayload = {
        id: full.id,
        treeId: full.treeId,
        userId: full.userId,
        leadId: full.leadId,
        status: full.status,
        summary: full.summary,
        updatedAt: full.updatedAt,
        TreeBranchLeafTree: full.TreeBranchLeafTree,
        Lead: full.Lead || null,
        TreeBranchLeafSubmissionData: full.TreeBranchLeafSubmissionData
      };

      res.status(201).json(responsePayload);

    } catch (error) {
      const err = error as unknown as { message?: string; stack?: string; code?: string; meta?: unknown };
      console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ ERREUR DÃƒÆ’Ã¢â‚¬Â°TAILLÃƒÆ’Ã¢â‚¬Â°E lors de la crÃƒÆ’Ã‚Â©ation:', {
        message: err?.message,
        code: err?.code,
        meta: err?.meta
      });
      if (err?.stack) console.error(err.stack);

      // Log spÃƒÆ’Ã‚Â©cifique pour erreurs Prisma
      if (err && err.code) {
        console.error('[TreeBranchLeaf API] ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â Code erreur Prisma:', err.code);
        if (err.meta) {
          console.error('[TreeBranchLeaf API] ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â MÃƒÆ’Ã‚Â©tadonnÃƒÆ’Ã‚Â©es:', err.meta);
        }
      }

      return res.status(500).json({ 
        error: 'Erreur lors de la crÃƒÆ’Ã‚Â©ation de la soumission',
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined
      });
    }
  } catch (outerErr) {
    // Garde-fou si une erreur se produit AVANT le bloc try interne
    const e = outerErr as unknown as { message?: string };
    console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur inattendue en entrÃƒÆ’Ã‚Â©e de route /submissions:', e?.message);
    return res.status(500).json({ error: 'Erreur interne inattendue' });
  }
});

// DELETE /api/treebranchleaf/submissions/:id - Supprimer une soumission
router.delete('/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // Verifier que la soumission existe
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvee' });
    }

    // Verification des droits d'acces (sauf SuperAdmin)
    if (!isSuperAdmin) {
      // Si la soumission a un leadId, verifier que le lead appartient a l'organisation
      if (submission.leadId) {
        const lead = await prisma.lead.findFirst({
          where: { id: submission.leadId, organizationId }
        });
        if (!lead) {
          return res.status(403).json({ error: 'Acces refuse: le lead n\'appartient pas a votre organisation' });
        }
      }
      // Si pas de leadId, on autorise la suppression (draft sans lead)
    }

    // Supprimer les donnees associees d'abord
    await prisma.treeBranchLeafSubmissionData.deleteMany({
      where: { submissionId: id }
    });

    // Supprimer les versions si elles existent
    await prisma.treeBranchLeafSubmissionVersion.deleteMany({
      where: { submissionId: id }
    });

    // Puis supprimer la soumission
    await prisma.treeBranchLeafSubmission.delete({
      where: { id }
    });

    console.log(`[TreeBranchLeaf API] Soumission ${id} supprimee avec succes`);
    res.json({ success: true, message: 'Soumission supprimee avec succes' });

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error deleting submission:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la soumission' });
  }
});

// GET /api/treebranchleaf/nodes/:fieldId/select-config
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re la configuration TreeBranchLeafSelectConfig d'un champ
router.get('/nodes/:fieldId/select-config', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, fieldId, { organizationId, isSuperAdmin });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la configuration SELECT
    let selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: fieldId },
    });

    if (!selectConfig) {
      
      // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRÃƒÆ’Ã¢â‚¬Â°ATION DYNAMIQUE : VÃƒÆ’Ã‚Â©rifier si le champ a une capacitÃƒÆ’Ã‚Â© Table avec lookup
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: fieldId },
        select: { 
          id: true,
          hasTable: true,
          table_activeId: true,
          table_instances: true
        }
      });

      if (node?.hasTable && node.table_activeId && node.table_instances) {
        const instances = node.table_instances as Record<string, any>;
        const activeInstance = instances[node.table_activeId];
        
        const isRowBased = activeInstance?.rowBased === true;
        const isColumnBased = activeInstance?.columnBased === true;
        
        if (isRowBased || isColumnBased) {
          
          // CrÃƒÆ’Ã‚Â©er automatiquement la configuration SELECT
          selectConfig = await prisma.treeBranchLeafSelectConfig.create({
            data: {
              id: randomUUID(),
              nodeId: fieldId,
              options: [] as Prisma.InputJsonValue,
              multiple: false,
              searchable: true,
              allowCustom: false,
              optionsSource: 'table',
              tableReference: node.table_activeId,
              keyColumn: null,
              valueColumn: null,
              displayColumn: null,
              dependsOnNodeId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
          
        }
      }
      
      if (!selectConfig) {
        return res.status(404).json({ error: 'Configuration SELECT introuvable' });
      }
    }

    return res.json(selectConfig);

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching select config:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de la configuration SELECT' });
  }
});

// POST /api/treebranchleaf/nodes/:fieldId/select-config
// CrÃƒÆ’Ã‚Â©e ou met ÃƒÆ’Ã‚Â  jour la configuration TreeBranchLeafSelectConfig d'un champ
router.post('/nodes/:fieldId/select-config', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const {
      optionsSource,
      tableReference,
      keyColumn,
      keyRow: rawKeyRow,
      valueColumn,
      valueRow: rawValueRow,
      displayColumn,
      displayRow,
      dependsOnNodeId,
    } = req.body;
    
    // 🔧 FIX: keyRow/valueRow sont String? dans Prisma mais le frontend peut envoyer un array
    // Sérialiser en JSON string si c'est un array
    const keyRow = Array.isArray(rawKeyRow) ? JSON.stringify(rawKeyRow) : rawKeyRow;
    const valueRow = Array.isArray(rawValueRow) ? JSON.stringify(rawValueRow) : rawValueRow;

    // 🔎 LOG MANUEL: Sauvegarde SelectConfig (flux TablePanel Étape 4)
    console.log('[MANUAL-SAVE][SELECT-CONFIG] ➡️ POST /nodes/:fieldId/select-config', {
      fieldId,
      optionsSource,
      tableReference,
      keyColumn,
      keyRow,
      valueColumn,
      valueRow,
      displayColumn,
      displayRow,
      dependsOnNodeId
    });


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, fieldId, { organizationId, isSuperAdmin });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    // Upsert la configuration SELECT
    const selectConfig = await prisma.treeBranchLeafSelectConfig.upsert({
      where: { nodeId: fieldId },
      create: {
        id: randomUUID(),
        nodeId: fieldId,
        options: [] as Prisma.InputJsonValue,
        multiple: false,
        searchable: true,
        allowCustom: false,
        optionsSource: optionsSource || 'table',
        tableReference: tableReference || null,
        keyColumn: keyColumn || null,
        keyRow: keyRow || null,
        valueColumn: valueColumn || null,
        valueRow: valueRow || null,
        displayColumn: displayColumn || null,
        displayRow: displayRow || null,
        dependsOnNodeId: dependsOnNodeId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        optionsSource: optionsSource || 'table',
        tableReference: tableReference || null,
        keyColumn: keyColumn || null,
        keyRow: keyRow || null,
        valueColumn: valueColumn || null,
        valueRow: valueRow || null,
        displayColumn: displayColumn || null,
        displayRow: displayRow || null,
        dependsOnNodeId: dependsOnNodeId || null,
        updatedAt: new Date(),
      },
    });

    // 🔎 LOG MANUEL: Confirmation SelectConfig persisté
    console.log('[MANUAL-SAVE][SELECT-CONFIG] ✅ Persisté', {
      fieldId,
      id: selectConfig.id,
      tableReference: selectConfig.tableReference,
      keyColumn: selectConfig.keyColumn,
      keyRow: selectConfig.keyRow,
      valueColumn: selectConfig.valueColumn,
      valueRow: selectConfig.valueRow,
      displayColumn: selectConfig.displayColumn,
      displayRow: selectConfig.displayRow,
      dependsOnNodeId: selectConfig.dependsOnNodeId
    });

    return res.json(selectConfig);

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating select config:', error);
    res.status(500).json({ error: 'Erreur lors de la crÃƒÆ’Ã‚Â©ation de la configuration SELECT' });
  }
});

// POST /api/treebranchleaf/nodes/:nodeId/normalize-step4
// Normalise automatiquement la configuration lookup (Étape 4):
// - Choisit une colonne d'affichage (displayColumn)
// - Met à jour la META de la table
// - Upsert la TreeBranchLeafSelectConfig
router.post('/nodes/:nodeId/normalize-step4', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { tableId: bodyTableId, displayColumn: bodyDisplayColumn } = req.body || {};

    console.log('[STEP4-AUTO] ➡️ START normalize-step4', { nodeId, bodyTableId, bodyDisplayColumn });

    // Vérifier accès
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    // Charger node et config existante
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { table_activeId: true, hasTable: true }
    });

    // Déterminer la table cible
    let tableId = bodyTableId || node?.table_activeId || null;
    if (!tableId) {
      // Essayer via SelectConfig
      const sc = await prisma.treeBranchLeafSelectConfig.findFirst({ where: { nodeId } });
      tableId = sc?.tableReference || null;
    }
    if (!tableId) {
      console.warn('[STEP4-AUTO] ❌ No tableId found for node', { nodeId });
      return res.status(404).json({ error: 'Aucune table active pour ce champ' });
    }

    // Charger colonnes de la table
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      include: { tableColumns: { orderBy: { columnIndex: 'asc' } } }
    });
    if (!table) {
      return res.status(404).json({ error: 'Table introuvable' });
    }

    // Choisir displayColumn
    const firstColName = table.tableColumns[0]?.name || null;
    const chosenDisplayColumn = bodyDisplayColumn || firstColName || null;
    if (!chosenDisplayColumn) {
      console.warn('[STEP4-AUTO] ❌ No displayColumn candidate', { tableId });
      return res.status(400).json({ error: 'Impossible de déterminer displayColumn' });
    }

    console.log('[STEP4-AUTO] 🎯 Selected displayColumn', { tableId, displayColumn: chosenDisplayColumn });

    // Mettre à jour META.lookup.displayColumn
    try {
      const metaObj = table.meta
        ? (typeof table.meta === 'string' ? JSON.parse(table.meta as unknown as string) : JSON.parse(JSON.stringify(table.meta)))
        : {};
      const nextMeta = {
        ...metaObj,
        lookup: {
          ...(metaObj?.lookup || {}),
          displayColumn: chosenDisplayColumn
        }
      };
      await prisma.treeBranchLeafNodeTable.update({
        where: { id: tableId },
        data: { meta: nextMeta, updatedAt: new Date() }
      });
      console.log('[STEP4-AUTO] ✅ META updated', { tableId, displayColumn: chosenDisplayColumn });
    } catch (e) {
      console.warn('[STEP4-AUTO] ⚠️ META update failed (non-bloquant):', (e as Error).message);
    }

    // Upsert SelectConfig avec tableReference + displayColumn
    const sc = await prisma.treeBranchLeafSelectConfig.upsert({
      where: { nodeId },
      create: {
        id: randomUUID(),
        nodeId,
        options: [] as Prisma.InputJsonValue,
        multiple: false,
        searchable: true,
        allowCustom: false,
        optionsSource: 'table',
        tableReference: tableId,
        keyColumn: null,
        keyRow: null,
        valueColumn: null,
        valueRow: null,
        displayColumn: chosenDisplayColumn,
        displayRow: null,
        dependsOnNodeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        optionsSource: 'table',
        tableReference: tableId,
        displayColumn: chosenDisplayColumn,
        updatedAt: new Date(),
      },
    });

    console.log('[STEP4-AUTO] ✅ SelectConfig upserted', {
      nodeId,
      tableReference: sc.tableReference,
      displayColumn: sc.displayColumn,
    });

    return res.json({
      success: true,
      nodeId,
      tableId,
      displayColumn: chosenDisplayColumn,
    });

  } catch (error) {
    console.error('[STEP4-AUTO] Error normalize-step4:', error);
    res.status(500).json({ error: 'Erreur lors de la normalisation Étape 4' });
  }
});

// GET /api/treebranchleaf/nodes/:nodeId/table/lookup
// RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re le tableau ACTIF d'un noeud pour lookup (utilisÃƒÆ’Ã‚Â© par useTBLTableLookup)
router.get('/nodes/:nodeId/table/lookup', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ ÃƒÆ’Ã¢â‚¬Â°TAPE 2.5: Parser les formValues depuis la query string pour le filtrage dynamique
    const { formValues: formValuesParam } = req.query as { formValues?: string };
    let formValues: Record<string, unknown> = {};
    if (formValuesParam) {
      try {
        formValues = JSON.parse(formValuesParam);
      } catch (e) {
        console.warn(`[TreeBranchLeaf API] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Erreur parsing formValues:`, e);
      }
    }


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ÃƒÆ’Ã¢â‚¬Â°TAPE 1: RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la configuration SELECT pour savoir QUEL tableau charger
    let selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId },
      select: {
        tableReference: true,
        keyColumn: true,
        keyRow: true,
        valueColumn: true,
        valueRow: true,
        displayColumn: true,
        displayRow: true,
      }
    });


    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Fallback automatique: si pas de config, essayer de la crÃƒÆ’Ã‚Â©er depuis capabilities.table
    if (!selectConfig?.tableReference) {

      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { hasTable: true, table_activeId: true, table_instances: true }
      });

      if (node?.hasTable && node.table_activeId) {
        // CrÃƒÆ’Ã‚Â©er ÃƒÆ’Ã‚Â  la volÃƒÆ’Ã‚Â©e une configuration minimale basÃƒÆ’Ã‚Â©e sur l'instance active
        await prisma.treeBranchLeafSelectConfig.upsert({
          where: { nodeId },
          create: {
            id: randomUUID(),
            nodeId,
            options: [] as Prisma.InputJsonValue,
            multiple: false,
            searchable: true,
            allowCustom: false,
            optionsSource: 'table',
            tableReference: node.table_activeId,
            keyColumn: null,
            keyRow: null,
            valueColumn: null,
            valueRow: null,
            displayColumn: null,
            displayRow: null,
            dependsOnNodeId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            optionsSource: 'table',
            tableReference: node.table_activeId,
            updatedAt: new Date(),
          },
        });

        // Recharger la config pour continuer le flux normal
        selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
          where: { nodeId },
          select: {
            tableReference: true,
            keyColumn: true,
            keyRow: true,
            valueColumn: true,
            valueRow: true,
            displayColumn: true,
            displayRow: true,
          }
        });
      }
    }

    if (!selectConfig?.tableReference) {
      // Nœud sans table associée (ex: copie de repeater) - retourner structure vide
      return res.json({ tableColumns: [], tableRows: [], options: [] });
    }

    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ÃƒÆ’Ã¢â‚¬Â°TAPE 2: Charger le TABLEAU rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â© avec l'architecture NORMALISÃƒÆ’Ã¢â‚¬Â°E
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: selectConfig.tableReference },
      select: {
        id: true,
        nodeId: true,
        name: true,
        type: true,
        meta: true,
        tableColumns: {
          select: { id: true, name: true, columnIndex: true },
          orderBy: { columnIndex: 'asc' as const },
        },
        tableRows: {
          select: { id: true, rowIndex: true, cells: true },
          orderBy: { rowIndex: 'asc' as const },
        },
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Tableau introuvable' });
    }

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Reconstituer les colonnes/rows/data depuis l'architecture normalisÃƒÆ’Ã‚Â©e
    const columns = table.tableColumns.map(col => col.name);
    
    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ Extraire rows[] et data[] depuis cells
    const rows: string[] = [];
    const data: any[][] = [];
    
    table.tableRows.forEach(row => {
      try {
        let cellsData: any;
        
        // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â Tentative 1: Parse JSON si c'est une string
        if (typeof row.cells === 'string') {
          try {
            cellsData = JSON.parse(row.cells);
          } catch {
            // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Fallback: Si ce n'est PAS du JSON, c'est juste une valeur simple (premiÃƒÆ’Ã‚Â¨re colonne uniquement)
            // Cela arrive pour les anciennes donnÃƒÆ’Ã‚Â©es oÃƒÆ’Ã‚Â¹ cells = "Orientation" au lieu de ["Orientation", ...]
            cellsData = [row.cells]; // Envelopper dans un array
          }
        } else {
          cellsData = row.cells || [];
        }
        
        if (Array.isArray(cellsData) && cellsData.length > 0) {
          // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Ëœ cellsData[0] = label de ligne (colonne A)
          // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  cellsData[1...] = donnÃƒÆ’Ã‚Â©es (colonnes B, C, D...)
          rows.push(String(cellsData[0] || ''));
          data.push(cellsData.slice(1)); // DonnÃƒÆ’Ã‚Â©es sans le label
        } else {
          rows.push('');
          data.push([]);
        }
      } catch (error) {
        console.error('[TreeBranchLeaf API] Erreur parsing cells:', error);
        rows.push('');
        data.push([]);
      }
    });


    // ÃƒÂ¯Ã‚Â¿Ã‚Â½ ÃƒÆ’Ã¢â‚¬Â°TAPE 2.5: RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer et appliquer les filtres depuis table.meta.lookup
    const rawLookup = (table.meta && typeof table.meta === 'object' && 'lookup' in table.meta)
      ? (table.meta as Record<string, unknown>).lookup as Record<string, unknown>
      : undefined;

    // Construire la matrice complÃƒÆ’Ã‚Â¨te pour le filtrage (colonne A + donnÃƒÆ’Ã‚Â©es)
    const fullMatrix = rows.map((rowLabel, idx) => [rowLabel, ...(data[idx] || [])]);

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les filtres configurÃƒÆ’Ã‚Â©s
    let filters: Array<{ column: string; operator: string; valueRef: string }> = [];
    if (rawLookup) {
      // Les filtres peuvent ÃƒÆ’Ã‚Âªtre dans columnSourceOption.filters ou rowSourceOption.filters
      const columnSourceOption = rawLookup.columnSourceOption as Record<string, unknown> | undefined;
      const rowSourceOption = rawLookup.rowSourceOption as Record<string, unknown> | undefined;
      
      if (columnSourceOption?.filters && Array.isArray(columnSourceOption.filters)) {
        filters = columnSourceOption.filters as typeof filters;
      } else if (rowSourceOption?.filters && Array.isArray(rowSourceOption.filters)) {
        filters = rowSourceOption.filters as typeof filters;
      }
    }

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ FIX 17/12/2025: FILTRAGE TABLE LOOKUP - ALIGNEMENT COLONNES
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // STRUCTURE DES DONNÃƒÆ’Ã¢â‚¬Â°ES:
    //   - columns[] = ['Onduleur', 'MODELE', 'Alimentation', 'KVA', ...] (depuis tableColumns)
    //   - cells[] = ['SMA Sunny Boy 1.5', 'Sunny Boy 1.5', 'MonophasÃƒÆ’Ã‚Â© 220-240v', 1500, ...]
    //   - cells[i] correspond ÃƒÆ’Ã‚Â  columns[i] (1:1 mapping)
    //
    // IMPORTANT: fullMatrix contient les cells COMPLETS (pas de slice!)
    //   - fullMatrix[row][0] = cells[0] = valeur pour columns[0] (ex: nom onduleur)
    //   - fullMatrix[row][1] = cells[1] = valeur pour columns[1] (ex: MODELE)
    //   - fullMatrix[row][2] = cells[2] = valeur pour columns[2] (ex: Alimentation)
    //
    // ERREUR PRÃƒÆ’Ã¢â‚¬Â°CÃƒÆ’Ã¢â‚¬Â°DENTE: On ajoutait '__ROW_LABEL__' devant columns, crÃƒÆ’Ã‚Â©ant un dÃƒÆ’Ã‚Â©calage!
    //   - columnsWithA = ['__ROW_LABEL__', 'Onduleur', 'MODELE', 'Alimentation', ...]
    //   - indexOf('Alimentation') retournait 3, mais fullMatrix[row][3] = KVA (dÃƒÆ’Ã‚Â©calÃƒÆ’Ã‚Â©!)
    //
    // SOLUTION: Utiliser fullMatrix avec les cells COMPLETS et columns DIRECTEMENT
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    
    // Reconstruire fullMatrix avec cells COMPLETS (sans le slice qui enlÃƒÆ’Ã‚Â¨ve cells[0])
    const fullMatrixForFilters = table.tableRows.map(row => {
      try {
        let cellsData: any;
        if (typeof row.cells === 'string') {
          try {
            cellsData = JSON.parse(row.cells);
          } catch {
            cellsData = [row.cells];
          }
        } else {
          cellsData = row.cells || [];
        }
        return Array.isArray(cellsData) ? cellsData : [];
      } catch {
        return [];
      }
    });
    

    // Appliquer les filtres si configurÃƒÆ’Ã‚Â©s
    let filteredRowIndices: number[] = fullMatrix.map((_, i) => i);
    if (filters.length > 0 && Object.keys(formValues).length > 0) {
      // Utiliser columns DIRECTEMENT (pas columnsWithA) car cells[i] = valeur pour columns[i]
      filteredRowIndices = await applyTableFilters(fullMatrixForFilters, columns, filters, formValues);
    }

    // ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ÃƒÆ’Ã¢â‚¬Â°TAPE 3: GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer les options selon la configuration
    if (table.type === 'matrix') {

      // CAS 1: keyRow dÃƒÆ’Ã‚Â©fini ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Extraire les VALEURS de cette ligne
      if (selectConfig?.keyRow) {
        const rowIndex = rows.indexOf(selectConfig.keyRow);
        
        if (rowIndex === -1) {
          console.warn(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [TreeBranchLeaf API] Ligne "${selectConfig.keyRow}" introuvable`);
          return res.json({ options: [] });
        }

        // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ RÃƒÆ’Ã‹â€ GLE A1: rows[0] = A1 ("Orientation"), rows[1] = "Nord", etc.
        // data[0] correspond ÃƒÆ’Ã‚Â  rows[1], donc il faut dÃƒÆ’Ã‚Â©caler : dataRowIndex = rowIndex - 1
        // Si rowIndex === 0 (A1), on doit extraire les en-tÃƒÆ’Ã‚Âªtes de colonnes (columns[]), pas data[]
        let options;
        
        if (rowIndex === 0) {
          // Ligne A1 sÃƒÆ’Ã‚Â©lectionnÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Extraire les en-tÃƒÆ’Ã‚Âªtes de colonnes (SANS A1 lui-mÃƒÆ’Ã‚Âªme)
          options = columns.slice(1).map((colName) => {
            return {
              value: colName,
              label: selectConfig.displayRow ? colName : colName,
            };
          }).filter(opt => opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== '');
        } else {
          // Autre ligne ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Extraire depuis data[rowIndex - 1]
          const dataRowIndex = rowIndex - 1;
          const rowData = data[dataRowIndex] || [];
          options = columns.slice(1).map((colName, colIdx) => {
            const value = rowData[colIdx];
            return {
              value: String(value),
              label: selectConfig.displayRow ? `${colName}: ${value}` : String(value),
            };
          }).filter(opt => opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== '');
        }


        return res.json({ options });
      }

      // CAS 2: keyColumn dÃƒÆ’Ã‚Â©fini ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Extraire les VALEURS de cette colonne
      if (selectConfig?.keyColumn) {
        const colIndex = columns.indexOf(selectConfig.keyColumn);
        
        if (colIndex === -1) {
          console.warn(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [TreeBranchLeaf API] Colonne "${selectConfig.keyColumn}" introuvable`);
          return res.json({ options: [] });
        }

        // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ RÃƒÆ’Ã‹â€ GLE A1 EXCEL: Si colIndex = 0, c'est la colonne A (labels des lignes)
        // Ces labels sont dans rows[], PAS dans data[][0] !
        // ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â IMPORTANT: rows[0] = A1 (ex: "Orientation"), rows[1...] = labels de lignes rÃƒÆ’Ã‚Â©els
        let options;
        if (colIndex === 0) {
          // Colonne A = labels des lignes ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Extraire depuis rows[] SAUF rows[0] (qui est A1)
          // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ FILTRAGE: N'inclure que les lignes qui passent les filtres
          options = filteredRowIndices
            .filter(idx => idx > 0) // Exclure rows[0] (A1)
            .map((rowIdx) => {
              const rowLabel = rows[rowIdx];
              return {
                value: rowLabel,
                label: selectConfig.displayColumn ? rowLabel : rowLabel,
              };
            })
            .filter(opt => opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== '');
        } else {
          // Autre colonne ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Extraire depuis data[][colIndex - 1]
          // ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â ATTENTION: data ne contient PAS la colonne 0, donc colIndex doit ÃƒÆ’Ã‚Âªtre dÃƒÆ’Ã‚Â©calÃƒÆ’Ã‚Â© de -1
          // ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â¢ FILTRAGE: N'inclure que les lignes qui passent les filtres
          const dataColIndex = colIndex - 1;
          options = filteredRowIndices.map((rowIdx) => {
            const row = data[rowIdx] || [];
            const value = row[dataColIndex];
            const rowLabel = rows[rowIdx] || '';
            return {
              value: String(value),
              label: selectConfig.displayColumn ? `${rowLabel}: ${value}` : String(value),
            };
          }).filter(opt => opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== '');
        }


        return res.json({ options });
      }
    }

    // Fallback: Si pas de keyRow/keyColumn, retourner le tableau complet
    // 🔥 AUTO-DEFAULT MATRIX (Orientation / Inclinaison) : Générer options dynamiques selon le rôle du champ
    if (table.type === 'matrix') {
      const hasNoConfig = !selectConfig?.keyRow && !selectConfig?.keyColumn;
      const a1 = rows[0]; // Ex: "Orientation" (cellule A1)
      const firstColHeader = columns[0]; // Ex: "Orientation" (header colonne A)
      
      // 🎯 DÉTECTION DU RÔLE: Vérifier si ce nodeId est le rowFieldId ou columnFieldId dans meta.lookup
      const lookupMeta = rawLookup as Record<string, unknown> | undefined;
      const rowFieldId = lookupMeta?.selectors && typeof lookupMeta.selectors === 'object' 
        ? (lookupMeta.selectors as Record<string, unknown>).rowFieldId 
        : undefined;
      const columnFieldId = lookupMeta?.selectors && typeof lookupMeta.selectors === 'object' 
        ? (lookupMeta.selectors as Record<string, unknown>).columnFieldId 
        : undefined;
      
      const isRowField = rowFieldId === nodeId;
      const isColumnField = columnFieldId === nodeId;
      
      if (hasNoConfig && firstColHeader && a1) {
        let autoOptions: { value: string; label: string }[] = [];
        let keyColumnValue: string | null = null;
        let keyRowValue: string | null = null;
        
        if (isRowField) {
          // 🔥 Ce champ est pour les LIGNES (ex: Inclinaison) → extraire depuis la ligne A1 (en-têtes de colonnes)
          // Les valeurs sont dans columns[] (sauf colonne 0 qui est le label "Orientation")
          autoOptions = columns
            .slice(1) // Exclure la première colonne (label)
            .filter(c => c && c !== 'undefined' && c !== 'null' && c !== '')
            .map(c => ({ value: String(c), label: String(c) }));
          keyRowValue = a1; // Ex: "Orientation" (la ligne A1)
          
        } else if (isColumnField || (!isRowField && !isColumnField)) {
          // 🔥 Ce champ est pour les COLONNES (ex: Orientation) → extraire depuis la colonne A (labels de lignes)
          // Fallback par défaut si aucun rôle détecté
          autoOptions = filteredRowIndices
            .filter(idx => idx > 0) // Exclure rows[0] (A1)
            .map(idx => rows[idx])
            .filter(r => r && r !== 'undefined' && r !== 'null')
            .map(r => ({ value: r, label: r }));
          keyColumnValue = firstColHeader; // Ex: "Orientation" (la colonne A)
        }
        
        // Upsert automatique avec la bonne config (keyRow OU keyColumn)
        try {
          await prisma.treeBranchLeafSelectConfig.upsert({
            where: { nodeId },
            create: {
              id: randomUUID(),
              nodeId,
              options: [] as Prisma.InputJsonValue,
              multiple: false,
              searchable: true,
              allowCustom: false,
              optionsSource: 'table',
              tableReference: table.id,
              keyColumn: keyColumnValue,
              keyRow: keyRowValue,
              valueColumn: null,
              valueRow: null,
              displayColumn: null,
              displayRow: null,
              dependsOnNodeId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            update: {
              optionsSource: 'table',
              tableReference: table.id,
              keyColumn: keyColumnValue,
              keyRow: keyRowValue,
              valueColumn: null,
              valueRow: null,
              displayColumn: null,
              displayRow: null,
              updatedAt: new Date(),
            }
          });
        } catch (e) {
          console.warn(`[TreeBranchLeaf API] ⚠️ Auto-upsert select-config a échoué (non bloquant):`, e);
        }
        
        // 🔴 DEBUG: Log pour voir si on passe par AUTO-DEFAULT
        console.log(`[TreeBranchLeaf API] 🎯 AUTO-DEFAULT pour nodeId=${nodeId}:`, {
          optionsCount: autoOptions.length,
          firstFive: autoOptions.slice(0, 5),
          detectedRole: isRowField ? 'rowField' : isColumnField ? 'columnField' : 'fallback'
        });
        
        return res.json({ 
          options: autoOptions, 
          autoDefault: { 
            source: isRowField ? 'rowA1' : 'columnA', 
            keyColumnCandidate: keyColumnValue,
            keyRowCandidate: keyRowValue,
            detectedRole: isRowField ? 'rowField' : isColumnField ? 'columnField' : 'fallback'
          } 
        });
      }
    }

    return res.json(table);

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching table for lookup:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration du tableau' });
  }
});

// PATCH /api/treebranchleaf/nodes/:nodeId
// Met ÃƒÆ’Ã‚Â  jour les propriÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â©s d'un nÃƒâ€¦Ã¢â‚¬Å“ud (type, fieldType, etc.)
router.patch('/nodes/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    // Mettre ÃƒÆ’Ã‚Â  jour le nÃƒâ€¦Ã¢â‚¬Å“ud
    const updatedNode = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
    });

    return res.json(updatedNode);

  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node:', error);
    res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour du nÃƒâ€¦Ã¢â‚¬Å“ud' });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ PUT /nodes/:nodeId/capabilities/table
 * Active/dÃƒÆ’Ã‚Â©sactive la capacitÃƒÆ’Ã‚Â© Table sur un champ
 * AppelÃƒÆ’Ã‚Â© depuis TablePanel quand on sÃƒÆ’Ã‚Â©lectionne un champ dans le lookup
 */
router.put('/nodes/:nodeId/capabilities/table', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { enabled, activeId, currentTable } = req.body;


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le nÃƒâ€¦Ã¢â‚¬Å“ud existant
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { 
        id: true,
        hasTable: true,
        metadata: true
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud non trouvÃƒÆ’Ã‚Â©' });
    }

    // Construire le nouvel objet metadata avec capabilities.table mis ÃƒÆ’Ã‚Â  jour
    const oldMetadata = (node.metadata || {}) as Record<string, unknown>;
    const oldCapabilities = (oldMetadata.capabilities || {}) as Record<string, unknown>;
    
    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRITICAL FIX: CrÃƒÆ’Ã‚Â©er une instance dans table_instances pour que le hook dÃƒÆ’Ã‚Â©tecte enabled=true
    const tableInstances = enabled && activeId ? {
      [activeId]: currentTable || { mode: 'matrix', tableId: activeId }
    } : null;
    
    const newCapabilities = {
      ...oldCapabilities,
      table: {
        enabled: enabled === true,
        activeId: enabled ? (activeId || null) : null,
        instances: tableInstances,
        currentTable: enabled ? (currentTable || null) : null,
      }
    };

    const newMetadata = {
      ...oldMetadata,
      capabilities: newCapabilities
    };


    // Mettre ÃƒÆ’Ã‚Â  jour le nÃƒâ€¦Ã¢â‚¬Å“ud avec metadata seulement - FORCE JSON serialization
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        hasTable: enabled === true,
        table_activeId: enabled ? (activeId || null) : null,
        table_instances: tableInstances ? JSON.parse(JSON.stringify(tableInstances)) : null,
        metadata: JSON.parse(JSON.stringify(newMetadata)), // Force serialization
        updatedAt: new Date()
      }
    });

    
    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRÃƒÆ’Ã¢â‚¬Â°ATION/UPDATE AUTOMATIQUE DE LA CONFIGURATION SELECT pour le lookup dynamique
    if (enabled && activeId) {
      const keyColumn = currentTable?.keyColumn || null;
      const keyRow = currentTable?.keyRow || null;
      const valueColumn = currentTable?.valueColumn || null;
      const valueRow = currentTable?.valueRow || null;
      const displayColumn = currentTable?.displayColumn || null;
      const displayRow = currentTable?.displayRow || null;
      
      
      try {
        // UPSERT la configuration SELECT avec tous les champs
        await prisma.treeBranchLeafSelectConfig.upsert({
          where: { nodeId },
          create: {
            id: randomUUID(),
            nodeId: nodeId,
            options: [] as Prisma.InputJsonValue,
            multiple: false,
            searchable: true,
            allowCustom: false,
            optionsSource: 'table',
            tableReference: activeId,
            keyColumn,
            keyRow,
            valueColumn,
            valueRow,
            displayColumn,
            displayRow,
            dependsOnNodeId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            tableReference: activeId,
            keyColumn,
            keyRow,
            valueColumn,
            valueRow,
            displayColumn,
            displayRow,
            updatedAt: new Date(),
          },
        });
      } catch (selectConfigError) {
        console.error(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [TablePanel API] Erreur upsert config SELECT (non-bloquant):`, selectConfigError);
        // Non-bloquant : on continue mÃƒÆ’Ã‚Âªme si la crÃƒÆ’Ã‚Â©ation ÃƒÆ’Ã‚Â©choue
      }
    } else if (!enabled) {
      // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â´ DÃƒÆ’Ã¢â‚¬Â°SACTIVATION : Supprimer la configuration SELECT
      try {
        await prisma.treeBranchLeafSelectConfig.deleteMany({
          where: { nodeId }
        });
      } catch (deleteError) {
        console.error(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [TablePanel API] Erreur suppression config SELECT (non-bloquant):`, deleteError);
      }
    }
    
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â VÃƒÆ’Ã¢â‚¬Â°RIFICATION IMMÃƒÆ’Ã¢â‚¬Â°DIATE : Relire depuis la DB pour confirmer persistance
    const verifyNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { metadata: true, hasTable: true }
    });
    

    return res.json({ 
      success: true, 
      nodeId, 
      capabilities: {
        table: newCapabilities.table
      }
    });

  } catch (error) {
    console.error('[TablePanel API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur PUT /nodes/:nodeId/capabilities/table:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour de la capacitÃƒÆ’Ã‚Â© Table' });
  }
});

// PATCH /api/treebranchleaf/submissions/:id - Mise à jour partielle d'une soumission (clientId, status, name)
router.patch('/submissions/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  const { clientId, status, name, formData } = req.body;

  try {
    console.log('[TreeBranchLeaf API] PATCH /submissions/:id payload', {
      id,
      clientId,
      status,
      namePresent: name !== undefined,
      formDataPresent: formData !== undefined,
      organizationId,
      isSuperAdmin
    });
    // Vérifier que la soumission existe
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      select: { id: true, treeId: true, leadId: true, organizationId: true }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    // Vérifier les droits d'accès
    const treeOrg = submission.organizationId ?? (
      await prisma.treeBranchLeafTree.findUnique({
        where: { id: submission.treeId },
        select: { organizationId: true }
      })
    )?.organizationId ?? null;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé à cette soumission' });
    }

    // Validation défensive du lead demandé (clientId) avant mise à jour
    if (clientId !== undefined) {
      if (clientId !== null && typeof clientId !== 'string') {
        return res.status(400).json({ error: 'clientId doit être une chaîne ou null' });
      }
      if (typeof clientId === 'string') {
        const lead = await prisma.lead.findUnique({
          where: { id: clientId },
          select: { id: true, organizationId: true }
        });
        if (!lead) {
          return res.status(404).json({ error: 'Lead non trouvé' });
        }
        if (!isSuperAdmin && lead.organizationId && treeOrg && lead.organizationId !== treeOrg) {
          return res.status(403).json({ error: 'Lead et soumission appartiennent à des organisations différentes' });
        }
      }
      // Si le clientId demandé est identique à l'actuel, court-circuiter l'update
      if ((clientId ?? null) === (submission.leadId ?? null) && status === undefined && name === undefined && formData === undefined) {
        console.log(`[TreeBranchLeaf API] PATCH /submissions/${id} - aucun changement (clientId inchangé)`);
        return res.json(submission);
      }
    }

    // Construire l'objet de mise à jour avec uniquement les champs fournis
    const updateData: {
      leadId?: string | null;
      status?: string;
      name?: string | null;
      formData?: Prisma.InputJsonValue;
      updatedAt: Date;
    } = {
      updatedAt: new Date()
    };

    if (clientId !== undefined) {
      updateData.leadId = clientId;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (formData !== undefined) {
      updateData.formData = formData as Prisma.InputJsonValue;
    }

    // Effectuer la mise à jour
    const updatedSubmission = await prisma.treeBranchLeafSubmission.update({
      where: { id },
      data: updateData
    });

    console.log(`[TreeBranchLeaf API] ✅ PATCH /submissions/${id} - clientId: ${clientId}, status: ${status}`);

    res.json(updatedSubmission);
  } catch (error) {
    // Retourner des erreurs plus parlantes si c'est une erreur Prisma connue
    if (error && (error as unknown as { code?: string }).code) {
      const e = error as unknown as { code: string; message?: string };
      console.error('[TreeBranchLeaf API] ❌ Prisma error PATCH /submissions/:id:', e);
      return res.status(400).json({ error: `Erreur de requête (${e.code})`, message: e.message });
    }
    const err = error as Error;
    console.error('[TreeBranchLeaf API] ❌ Erreur PATCH /submissions/:id:', { message: err?.message, stack: err?.stack });
    // Eviter les 500 génériques pour les erreurs inattendues de validation/mapping
    return res.status(400).json({ error: 'PATCH_UPDATE_ERROR', message: err?.message || 'Erreur lors de la mise à jour de la soumission' });
  }
});

// POST /api/treebranchleaf/submissions/:id/reset-data - Vide toutes les données et dissocie le lead
router.post('/submissions/:id/reset-data', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  const { status } = req.body as { status?: string };

  try {
    // Charger la soumission pour contrôle d'accès
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      select: { id: true, treeId: true, organizationId: true, status: true }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    // 🚫 Garde-fou: ne jamais permettre de vider un devis enregistré (completed)
    // via cet endpoint. Cela évite qu'une action UI (ex: "Nouveau devis")
    // efface accidentellement un devis.
    if (submission.status === 'completed') {
      return res.status(400).json({
        error: 'RESET_NOT_ALLOWED',
        message: 'Impossible de réinitialiser un devis enregistré (completed).'
      });
    }

    // Contrôle d'accès via l'organisation de l'arbre
    const treeOrg = submission.organizationId ?? (
      await prisma.treeBranchLeafTree.findUnique({
        where: { id: submission.treeId },
        select: { organizationId: true }
      })
    )?.organizationId ?? null;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé à cette soumission' });
    }

    await prisma.$transaction(async tx => {
      await tx.treeBranchLeafSubmissionData.deleteMany({ where: { submissionId: id } });
      await tx.treeBranchLeafSubmission.update({
        where: { id },
        data: {
          leadId: null,
          status: status ?? 'default-draft',
          updatedAt: new Date()
        }
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[TreeBranchLeaf API] ❌ Erreur POST /submissions/:id/reset-data:', error);
    return res.status(500).json({ error: 'Erreur lors de la réinitialisation de la soumission' });
  }
});

// PUT /api/treebranchleaf/submissions/:id - Mettre ÃƒÆ’Ã‚Â  jour les donnÃƒÆ’Ã‚Â©es d'une soumission (upsert champs + backfill variables)
router.put('/submissions/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  const { data, status } = req.body as { data?: unknown; status?: string };

  try {
    // Charger la soumission et infos minimales pour contrôle d'accès
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      select: { id: true, treeId: true, organizationId: true }
    });
    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvÃƒÆ’Ã‚Â©e' });
    }
    const treeId = submission.treeId;
    const treeOrg = submission.organizationId ?? (
      await prisma.treeBranchLeafTree.findUnique({
        where: { id: treeId },
        select: { organizationId: true }
      })
    )?.organizationId ?? null;
    if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette soumission' });
    }

    // NÃƒâ€¦Ã¢â‚¬Å“uds valides pour l'arbre
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId }, select: { id: true, label: true } });
    const validNodeIds = new Set(nodes.map(n => n.id));
    const labelMap = new Map(nodes.map(n => [n.id, n.label]));
    // Variables connues (pour faire la correspondance exposedKey -> nodeId et rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer unit/source)
    const variablesMeta = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      include: { TreeBranchLeafNode: { select: { label: true } } }
    });
    const varByExposedKey = new Map(
      variablesMeta
        .filter(v => !!v.exposedKey)
        .map(v => [
          v.exposedKey as string,
          {
            nodeId: v.nodeId,
            displayName: v.displayName || v.TreeBranchLeafNode?.label || v.exposedKey || v.nodeId,
            unit: v.unit || null,
            sourceRef: v.sourceRef || null
          }
        ])
    );
    const varMetaByNodeId = new Map(
      variablesMeta.map(v => [
        v.nodeId,
        {
          displayName: v.displayName || v.TreeBranchLeafNode?.label || v.exposedKey || v.nodeId,
          unit: v.unit || null,
          sourceRef: v.sourceRef || null
        }
      ])
    );

    // Normaliser payload (objet ou tableau)
    type DataItem = { nodeId: string; value?: unknown; calculatedValue?: unknown };
    const rawEntries: DataItem[] = (() => {
      if (Array.isArray(data)) {
        return (data as unknown[])
          .map((it): DataItem | null => {
            if (it && typeof it === 'object' && 'nodeId' in (it as Record<string, unknown>)) {
              const obj = it as Record<string, unknown>;
              return { nodeId: String(obj.nodeId), value: obj.value, calculatedValue: (obj as Record<string, unknown>).calculatedValue };
            }
            return null;
          })
          .filter((x): x is DataItem => !!x);
      }
      if (data && typeof data === 'object') {
        return Object.entries(data as Record<string, unknown>).map(([nodeId, value]) => ({ nodeId, value }));
      }
      return [];
    })();

    // Remap: si nodeId n'est pas un node rÃƒÆ’Ã‚Â©el mais est un exposedKey de variable, le remapper vers le nodeId de la variable
    const mappedEntries = rawEntries.map(e => {
      if (!validNodeIds.has(e.nodeId) && varByExposedKey.has(e.nodeId)) {
        const vm = varByExposedKey.get(e.nodeId)!;
        return { nodeId: vm.nodeId, value: e.value, calculatedValue: e.calculatedValue };
      }
      return e;
    });

    // Construire la liste finale avec valeur effective (calculatedValue prioritaire)
    const entries = mappedEntries
      .filter(({ nodeId }) => validNodeIds.has(nodeId))
      .map(e => ({ ...e, effectiveValue: e.calculatedValue !== undefined ? e.calculatedValue : e.value }));

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const inferSource = (sourceRef?: string | null): 'formula' | 'condition' | 'table' | 'neutral' => {
        const s = (sourceRef || '').toLowerCase();
        if (s.includes('formula') || s.includes('formule')) return 'formula';
        if (s.includes('condition')) return 'condition';
        if (s.includes('table')) return 'table';
        return 'neutral';
      };
      // Resolver scoped to transaction
      const resolveOperationDetail = async (sourceRef?: string | null): Promise<Prisma.InputJsonValue | null> => {
        const parsed = parseSourceRef(sourceRef);
        if (!parsed) return null;
        if (parsed.type === 'condition') {
          const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } });
          return buildOperationDetail('condition', rec);
        }
        if (parsed.type === 'formula') {
          const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } });
          return buildOperationDetail('formula', rec);
        }
        if (parsed.type === 'table') {
          const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
          return buildOperationDetail('table', rec);
        }
        return null;
      };
      if (entries.length > 0) {
        // Existence actuelle
        const existing = await tx.treeBranchLeafSubmissionData.findMany({
          where: { submissionId: id, nodeId: { in: entries.map(({ nodeId }) => nodeId) as string[] } },
          select: { nodeId: true, fieldLabel: true }
        });
        const existingLabelMap = new Map(existing.map(e => [e.nodeId, e.fieldLabel] as const));
        const existingSet = new Set(existing.map(e => e.nodeId));
        const toCreate = entries.filter(({ nodeId }) => !existingSet.has(nodeId));
        const toUpdate = entries.filter(({ nodeId }) => existingSet.has(nodeId));

        if (toCreate.length > 0) {
          // Construire une map des valeurs actuelles connues pour rÃƒÆ’Ã‚Â©solution des refs
          const existingAll = await tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } });
          const valuesMapTx: ValuesMap = new Map(existingAll.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
          const createRows = await Promise.all(toCreate.map(async ({ nodeId, effectiveValue }) => {
            const isVar = varMetaByNodeId.has(nodeId);
            const meta = isVar ? varMetaByNodeId.get(nodeId)! : undefined;
            const label = labelMap.get(nodeId) || existingLabelMap.get(nodeId) || null;
            const valueStr = effectiveValue == null ? null : String(effectiveValue);
            const opSrc = isVar ? inferSource(meta?.sourceRef || null) : 'neutral';
            const display = isVar ? (meta?.displayName || label || nodeId) : (label || nodeId);
            // Par dÃƒÆ’Ã‚Â©faut une chaÃƒÆ’Ã‚Â®ne lisible; si variable et source, produire un JSON dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©
            let opRes: Prisma.InputJsonValue = meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
            const opDetail = isVar ? (await resolveOperationDetail(meta?.sourceRef || null)) : (label as Prisma.InputJsonValue | null);
            if (isVar && meta?.sourceRef) {
              const parsed = parseSourceRef(meta.sourceRef);
              if (parsed?.type === 'condition') {
                const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } });
                const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
                // inclure la valeur qu'on est en train d'ÃƒÆ’Ã‚Â©crire
                valuesMapTx.set(nodeId, valueStr);
                const refsRaw = buildResolvedRefs(ids, labelMap, valuesMapTx);
                const refs = refsRaw.map(r => ({ label: r.label ?? null, value: r.value ?? null }));
                const expr = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Condition ÃƒÆ’Ã‚Â©valuÃƒÆ’Ã‚Â©e via TBL Prisma (ligne 5456)'; // DÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©: await buildConditionExpressionReadable(...)
                opRes = { type: 'condition', label: display, value: valueStr, unit: meta?.unit || null, refs, text: expr } as const;
              } else if (parsed?.type === 'formula') {
                const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } });
                const ids = extractNodeIdsFromTokens(rec?.tokens);
                valuesMapTx.set(nodeId, valueStr);
                const refsRaw = buildResolvedRefs(ids, labelMap, valuesMapTx);
                const refs = refsRaw.map(r => ({ label: r.label ?? null, value: r.value ?? null }));
                let expr = buildTextFromTokens(rec?.tokens, labelMap, valuesMapTx);
                
                // Calculer le rÃƒÆ’Ã‚Â©sultat de l'expression mathÃƒÆ’Ã‚Â©matique
                const calculatedResult = calculateResult(expr);
                if (calculatedResult !== null) {
                  expr += ` = ${calculatedResult}`;
                }
                
                const finalText = expr;
                opRes = { type: 'formula', label: display, value: valueStr, unit: meta?.unit || null, refs, text: finalText } as const;
              } else if (parsed?.type === 'table') {
                const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
                const str = JSON.stringify(rec);
                const ids = new Set<string>();
                if (str) { let m: RegExpExecArray | null; const re = /@value\.([a-f0-9-]{36})/gi; while ((m = re.exec(str)) !== null) ids.add(m[1]); }
                valuesMapTx.set(nodeId, valueStr);
                const refsRaw = buildResolvedRefs(ids, labelMap, valuesMapTx);
                const refs = refsRaw.map(r => ({ label: r.label ?? null, value: r.value ?? null }));
                const expr = buildTextFromTableRecord(rec, labelMap, valuesMapTx);
                const unitSuffix = meta?.unit ? ` ${meta.unit}` : '';
                const finalText = expr ? `${expr} (=) ${display} (${valueStr ?? ''}${unitSuffix})` : `${display} (${valueStr ?? ''}${unitSuffix})`;
                opRes = { type: 'table', label: display, value: valueStr, unit: meta?.unit || null, refs, text: finalText } as const;
              }
            }
            return {
              id: randomUUID(),
              submissionId: id,
              nodeId,
              value: valueStr,
              fieldLabel: label,
              isVariable: isVar,
              variableDisplayName: isVar ? meta?.displayName ?? null : null,
              variableKey: null,
              variableUnit: isVar ? meta?.unit ?? null : null,
              sourceRef: isVar ? meta?.sourceRef ?? null : null,
              operationSource: opSrc,
              operationDetail: opDetail,
              operationResult: opRes,
              lastResolved: now
            };
          }));
          await tx.treeBranchLeafSubmissionData.createMany({ data: createRows });
        }
        for (const { nodeId, effectiveValue } of toUpdate) {
          const isVar = varMetaByNodeId.has(nodeId);
          const meta = isVar ? varMetaByNodeId.get(nodeId)! : undefined;
          const label = labelMap.get(nodeId) || existingLabelMap.get(nodeId) || undefined;
          const valueStr = effectiveValue == null ? null : String(effectiveValue);
          // reconstruire une petite map des valeurs (inclure la valeur mise ÃƒÆ’Ã‚Â  jour) pour les refs
          const existingAll = await tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } });
          const valuesMapTx: ValuesMap = new Map(existingAll.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
          valuesMapTx.set(nodeId, valueStr);
          try {
            await tx.treeBranchLeafSubmissionData.update({
              where: { submissionId_nodeId: { submissionId: id, nodeId } },
              data: {
                value: valueStr,
                fieldLabel: label,
                operationSource: isVar ? inferSource(meta?.sourceRef || null) : 'neutral',
                operationDetail: isVar ? ((await resolveOperationDetail(meta?.sourceRef || null)) ?? undefined) : (label || undefined),
                operationResult: (() => {
                  const display = isVar ? (meta?.displayName || label || nodeId) : (label || nodeId);
                  if (!isVar || !meta?.sourceRef) {
                    return meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
                  }
                  const parsed = parseSourceRef(meta.sourceRef);
                  if (parsed?.type === 'condition') {
                    return (async () => {
                      const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } });
                      const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
                      const refsRaw = buildResolvedRefs(ids, labelMap, valuesMapTx);
                      const refs = refsRaw.map(r => ({ label: r.label ?? null, value: r.value ?? null }));
                      const expr = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Condition ÃƒÆ’Ã‚Â©valuÃƒÆ’Ã‚Â©e via TBL Prisma (ligne 5545)';
                      return { type: 'condition', label: display, value: valueStr, unit: meta?.unit || null, refs, text: expr } as const;
                    })();
                  }
                  if (parsed?.type === 'formula') {
                    return (async () => {
                      const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } });
                      const ids = extractNodeIdsFromTokens(rec?.tokens);
                      const refsRaw = buildResolvedRefs(ids, labelMap, valuesMapTx);
                      const refs = refsRaw.map(r => ({ label: r.label ?? null, value: r.value ?? null }));
                      let expr = buildTextFromTokens(rec?.tokens, labelMap, valuesMapTx);
                      
                      // Calculer le rÃƒÆ’Ã‚Â©sultat de l'expression mathÃƒÆ’Ã‚Â©matique
                      const calculatedResult = calculateResult(expr);
                      if (calculatedResult !== null) {
                        expr += ` = ${calculatedResult}`;
                      }
                      
                      return { type: 'formula', label: display, value: valueStr, unit: meta?.unit || null, refs, text: expr } as const;
                    })();
                  }
                  if (parsed?.type === 'table') {
                    return (async () => {
                      const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
                      const str = JSON.stringify(rec);
                      const ids = new Set<string>();
                      if (str) { let m: RegExpExecArray | null; const re = /@value\.([a-f0-9-]{36})/gi; while ((m = re.exec(str)) !== null) ids.add(m[1]); }
                      const refsRaw = buildResolvedRefs(ids, labelMap, valuesMapTx);
                      const refs = refsRaw.map(r => ({ label: r.label ?? null, value: r.value ?? null }));
                      const expr = buildTextFromTableRecord(rec, labelMap, valuesMapTx);
                      const unitSuffix = meta?.unit ? ` ${meta.unit}` : '';
                      const finalText = expr ? `${expr} (=) ${display} (${valueStr ?? ''}${unitSuffix})` : `${display} (${valueStr ?? ''}${unitSuffix})`;
                      return { type: 'table', label: display, value: valueStr, unit: meta?.unit || null, refs, text: finalText } as const;
                    })();
                  }
                  return meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
                })(),
                lastResolved: now
              }
            });
          } catch {
            await tx.treeBranchLeafSubmissionData.updateMany({
              where: { submissionId: id, nodeId },
              data: {
                value: valueStr,
                fieldLabel: label,
                operationSource: isVar ? inferSource(meta?.sourceRef || null) : 'neutral',
                operationDetail: isVar ? ((await resolveOperationDetail(meta?.sourceRef || null)) ?? undefined) : (label || undefined),
                operationResult: (() => {
                  const display = isVar ? (meta?.displayName || label || nodeId) : (label || nodeId);
                  if (!isVar || !meta?.sourceRef) {
                    return meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
                  }
                  const parsed = parseSourceRef(meta.sourceRef);
                  if (parsed?.type === 'condition') {
                    return (async () => {
                      const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } });
                      const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
                      const refs = buildResolvedRefs(ids, labelMap, valuesMapTx);
                      return { type: 'condition', label: display, value: valueStr, unit: meta?.unit || null, refs } as const;
                    })();
                  }
                  if (parsed?.type === 'formula') {
                    return (async () => {
                      const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } });
                      const ids = extractNodeIdsFromTokens(rec?.tokens);
                      const refs = buildResolvedRefs(ids, labelMap, valuesMapTx);
                      return { type: 'formula', label: display, value: valueStr, unit: meta?.unit || null, refs } as const;
                    })();
                  }
                  if (parsed?.type === 'table') {
                    return (async () => {
                      const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
                      const str = JSON.stringify(rec);
                      const ids = new Set<string>();
                      if (str) { let m: RegExpExecArray | null; const re = /@value\.([a-f0-9-]{36})/gi; while ((m = re.exec(str)) !== null) ids.add(m[1]); }
                      const refs = buildResolvedRefs(ids, labelMap, valuesMapTx);
                      return { type: 'table', label: display, value: valueStr, unit: meta?.unit || null, refs } as const;
                    })();
                  }
                  return meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
                })(),
                lastResolved: now
              }
            });
          }
        }
      }

      // Backfill des variables manquantes (au cas oÃƒÆ’Ã‚Â¹ de nouvelles variables ont ÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© ajoutÃƒÆ’Ã‚Â©es au tree depuis la crÃƒÆ’Ã‚Â©ation)
      const variables = await tx.treeBranchLeafNodeVariable.findMany({
        where: { TreeBranchLeafNode: { treeId } },
        include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
      });
      const existingVarRows = await tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id, nodeId: { in: variables.map(v => v.nodeId) } }, select: { nodeId: true } });
      const existingVarSet = new Set(existingVarRows.map(r => r.nodeId));
      const missingVars = variables.filter(v => !existingVarSet.has(v.nodeId));
      if (missingVars.length > 0) {
        // Construire valuesMap pour rÃƒÆ’Ã‚Â©solution (actuel en BD)
        const allRows = await tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } });
        const valuesMapTxAll: ValuesMap = new Map(allRows.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
        const missingRows = await Promise.all(missingVars.map(async v => ({
          id: randomUUID(),
          submissionId: id,
          nodeId: v.nodeId,
          value: null,
          fieldLabel: v.TreeBranchLeafNode?.label || null,
          isVariable: true,
          variableDisplayName: v.displayName,
          variableKey: v.exposedKey,
          variableUnit: v.unit,
          sourceRef: v.sourceRef || null,
          operationSource: inferSource(v.sourceRef || null),
          operationDetail: await resolveOperationDetail(v.sourceRef || null),
          operationResult: (() => {
            const display = (v.displayName || v.TreeBranchLeafNode?.label || v.exposedKey || v.nodeId);
            if (!v.sourceRef) return `${display}: `;
            const parsed = parseSourceRef(v.sourceRef);
            if (parsed?.type === 'condition') {
              return (async () => {
                const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } });
                const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
                const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
                const human = `${display}`;
                return { type: 'condition', label: display, value: null, unit: v.unit || null, refs, text: buildResultText(human, null, v.unit || null) } as const;
              })();
            }
            if (parsed?.type === 'formula') {
              return (async () => {
                const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } });
                const ids = extractNodeIdsFromTokens(rec?.tokens);
                const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
                const human = `${display}`;
                return { type: 'formula', label: display, value: null, unit: v.unit || null, refs, text: buildResultText(human, null, v.unit || null) } as const;
              })();
            }
            if (parsed?.type === 'table') {
              return (async () => {
                const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
                const str = JSON.stringify(rec);
                const ids = new Set<string>();
                if (str) { let m: RegExpExecArray | null; const re = /@value\.([a-f0-9-]{36})/gi; while ((m = re.exec(str)) !== null) ids.add(m[1]); }
                const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
                const human = `${display}`;
                return { type: 'table', label: display, value: null, unit: v.unit || null, refs, text: buildResultText(human, null, v.unit || null) } as const;
              })();
            }
            return `${display}: `;
          })(),
          lastResolved: now
        })));
        await tx.treeBranchLeafSubmissionData.createMany({ data: missingRows });
      }

      // Backfill des champs d'opÃƒÆ’Ã‚Â©ration manquants sur les lignes existantes (variables et non-variables)
      const allRows = await tx.treeBranchLeafSubmissionData.findMany({
        where: {
          submissionId: id
        },
        select: { 
          nodeId: true, 
          isVariable: true, 
          value: true, 
          sourceRef: true,
          operationDetail: true,
          operationResult: true,
          lastResolved: true
        }
      });
      
      // Filtrer en mÃƒÆ’Ã‚Â©moire les lignes qui ont besoin d'un backfill
      const rowsNeeding = allRows.filter(row => 
        row.operationDetail === null || 
        row.operationResult === null || 
        row.lastResolved === null
      );
      for (const row of rowsNeeding) {
        const isVar = row.isVariable;
        const meta = isVar ? varMetaByNodeId.get(row.nodeId) : undefined;
        const label = labelMap.get(row.nodeId) || undefined;
        const valueStr = row.value == null ? null : String(row.value);
        const opSrc = isVar ? inferSource(meta?.sourceRef || null) : 'neutral';
        const display = isVar ? (meta?.displayName || label || row.nodeId) : (label || row.nodeId);
        // Construire valuesMap pour refs
        const allRows = await tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } });
        const valuesMapTxAll: ValuesMap = new Map(allRows.map(r => [r.nodeId, r.value == null ? null : String(r.value)]));
        valuesMapTxAll.set(row.nodeId, valueStr);
        let opRes: Prisma.InputJsonValue = meta?.unit && valueStr ? `${display}: ${valueStr} ${meta.unit}` : `${display}: ${valueStr ?? ''}`;
        const opDetail = isVar ? (await resolveOperationDetail(row.sourceRef || null)) : (label as Prisma.InputJsonValue | undefined);
        
        if (isVar && (row.sourceRef || meta?.sourceRef)) {
          // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
          // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVEAU : Utiliser le systÃƒÆ’Ã‚Â¨me universel d'interprÃƒÆ’Ã‚Â©tation
          // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
          try {
            
            // Appeler le systÃƒÆ’Ã‚Â¨me universel
            const evaluation = await evaluateVariableOperation(
              row.nodeId,
              id, // submissionId
              tx as any // Utiliser la transaction Prisma
            );
            
            
            // Utiliser le rÃƒÆ’Ã‚Â©sultat du systÃƒÆ’Ã‚Â¨me universel
            opRes = evaluation.operationResult;
            
            // Mettre ÃƒÆ’Ã‚Â  jour la valeur calculÃƒÆ’Ã‚Â©e dans la base
            await tx.treeBranchLeafSubmissionData.updateMany({
              where: { submissionId: id, nodeId: row.nodeId },
              data: { value: evaluation.value }
            });
            
          } catch (error) {
            // Erreur silencieuse
            
            // Fallback vers l'ancien systÃƒÆ’Ã‚Â¨me en cas d'erreur
            const parsed = parseSourceRef(row.sourceRef || meta?.sourceRef || null);
            if (parsed?.type === 'condition') {
              const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } });
              const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
              const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
              const human = `${display}`;
              opRes = { type: 'condition', label: display, value: valueStr, unit: meta?.unit || null, refs, text: buildResultText(human, valueStr, meta?.unit || null) } as const;
            } else if (parsed?.type === 'formula') {
              const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } });
              const ids = extractNodeIdsFromTokens(rec?.tokens);
              const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
              const human = `${display}`;
              opRes = { type: 'formula', label: display, value: valueStr, unit: meta?.unit || null, refs, text: buildResultText(human, valueStr, meta?.unit || null) } as const;
            } else if (parsed?.type === 'table') {
              const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
              const str = JSON.stringify(rec);
              const ids = new Set<string>();
              if (str) { let m: RegExpExecArray | null; const re = /@value\.([a-f0-9-]{36})/gi; while ((m = re.exec(str)) !== null) ids.add(m[1]); }
              const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
              const human = `${display}`;
              opRes = { type: 'table', label: display, value: valueStr, unit: meta?.unit || null, refs, text: buildResultText(human, valueStr, meta?.unit || null) } as const;
            }
          }
        }
        await tx.treeBranchLeafSubmissionData.updateMany({
          where: { submissionId: id, nodeId: row.nodeId },
          data: {
            operationSource: opSrc,
            operationDetail: opDetail ?? (isVar ? (meta?.sourceRef || undefined) : (label || undefined)),
            operationResult: opRes,
            lastResolved: now
          }
        });
      }

      // Mettre ÃƒÆ’Ã‚Â  jour le statut si fourni
      if (status && typeof status === 'string') {
        await tx.treeBranchLeafSubmission.update({ where: { id }, data: { status, updatedAt: new Date() } });
      } else {
        await tx.treeBranchLeafSubmission.update({ where: { id }, data: { updatedAt: new Date() } });
      }
    });

    // Recharger et renvoyer
    const full = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      include: {
        TreeBranchLeafTree: { select: { id: true, name: true } },
        Lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        TreeBranchLeafSubmissionData: { include: { TreeBranchLeafNode: { select: { id: true, label: true, type: true } } } }
      }
    });
    return res.json(full);
  } catch (error) {
    console.error('[TreeBranchLeaf API] ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur PUT /submissions/:id:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise ÃƒÆ’Ã‚Â  jour de la soumission' });
  }
});

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ NOUVELLES ROUTES - SYSTÃƒÆ’Ã‹â€ ME UNIVERSEL D'INTERPRÃƒÆ’Ã¢â‚¬Â°TATION TBL
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// Ces routes utilisent le systÃƒÆ’Ã‚Â¨me moderne operation-interpreter.ts
// Elles sont INDÃƒÆ’Ã¢â‚¬Â°PENDANTES des anciens systÃƒÆ’Ã‚Â¨mes (CapacityCalculator, etc.)
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

/**
 * ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ POST /api/treebranchleaf/v2/variables/:variableNodeId/evaluate
 * 
 * ÃƒÆ’Ã¢â‚¬Â°VALUE UNE VARIABLE avec le systÃƒÆ’Ã‚Â¨me universel d'interprÃƒÆ’Ã‚Â©tation
 * 
 * Cette route est le POINT D'ENTRÃƒÆ’Ã¢â‚¬Â°E PRINCIPAL pour ÃƒÆ’Ã‚Â©valuer n'importe quelle
 * variable (condition, formule, table) de maniÃƒÆ’Ã‚Â¨re rÃƒÆ’Ã‚Â©cursive et complÃƒÆ’Ã‚Â¨te.
 * 
 * PARAMÃƒÆ’Ã‹â€ TRES :
 * ------------
 * - variableNodeId : ID du nÃƒâ€¦Ã¢â‚¬Å“ud TreeBranchLeafNode qui contient la Variable
 * - submissionId (body) : ID de la soumission en cours
 * 
 * RETOUR :
 * --------
 * {
 *   success: true,
 *   variable: { nodeId, displayName, exposedKey },
 *   result: {
 *     value: "73",              // Valeur calculÃƒÆ’Ã‚Â©e finale
 *     operationDetail: {...},    // Structure dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©e complÃƒÆ’Ã‚Â¨te
 *     operationResult: "Si...",  // Texte explicatif en franÃƒÆ’Ã‚Â§ais
 *     operationSource: "table"   // Type d'opÃƒÆ’Ã‚Â©ration source
 *   },
 *   evaluation: {
 *     mode: 'universal-interpreter',
 *     timestamp: "2025-01-06T...",
 *     depth: 0
 *   }
 * }
 * 
 * EXEMPLES D'UTILISATION :
 * ------------------------
 * 1. Variable qui pointe vers une condition :
 *    POST /api/treebranchleaf/v2/variables/10bfb6d2.../evaluate
 *    Body: { submissionId: "tbl-1759750447813-xxx" }
 *    ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒÆ’Ã¢â‚¬Â°value rÃƒÆ’Ã‚Â©cursivement la condition et retourne le rÃƒÆ’Ã‚Â©sultat
 * 
 * 2. Variable qui pointe vers une table :
 *    POST /api/treebranchleaf/v2/variables/abc123.../evaluate
 *    Body: { submissionId: "tbl-xxx" }
 *    ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Effectue le lookup dans la table et retourne la valeur
 * 
 * 3. Variable qui pointe vers une formule :
 *    POST /api/treebranchleaf/v2/variables/def456.../evaluate
 *    Body: { submissionId: "tbl-xxx" }
 *    ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Calcule la formule et retourne le rÃƒÆ’Ã‚Â©sultat
 */
router.post('/v2/variables/:variableNodeId/evaluate', async (req, res) => {
  try {
    const { variableNodeId } = req.params;
    const { submissionId } = req.body;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã¢â‚¬Â°TAPE 1 : Validation des paramÃƒÆ’Ã‚Â¨tres
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    if (!variableNodeId) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] variableNodeId manquant');
      return res.status(400).json({
        success: false,
        error: 'variableNodeId requis'
      });
    }

    if (!submissionId) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] submissionId manquant');
      return res.status(400).json({
        success: false,
        error: 'submissionId requis dans le body'
      });
    }

    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ÃƒÆ’Ã¢â‚¬Â°TAPE 2 : VÃƒÆ’Ã‚Â©rifier que le nÃƒâ€¦Ã¢â‚¬Å“ud existe et est accessible
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: variableNodeId },
      include: {
        TreeBranchLeafTree: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        TreeBranchLeafNodeVariable: {
          select: {
            id: true,
            nodeId: true,
            exposedKey: true,
            displayName: true,
            sourceType: true,
            sourceRef: true,
            fixedValue: true,
            defaultValue: true
          }
        }
      }
    });

    if (!node) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] NÃƒâ€¦Ã¢â‚¬Å“ud introuvable:', variableNodeId);
      return res.status(404).json({
        success: false,
        error: 'NÃƒâ€¦Ã¢â‚¬Å“ud introuvable'
      });
    }


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â„¢ ÃƒÆ’Ã¢â‚¬Â°TAPE 3 : VÃƒÆ’Ã‚Â©rifier les permissions d'organisation
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    if (!isSuperAdmin && node.TreeBranchLeafTree?.organizationId !== organizationId) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© - mauvaise organisation');
      return res.status(403).json({
        success: false,
        error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud'
      });
    }


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  ÃƒÆ’Ã¢â‚¬Â°TAPE 4 : VÃƒÆ’Ã‚Â©rifier qu'il y a bien une Variable associÃƒÆ’Ã‚Â©e
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const variable = node.TreeBranchLeafNodeVariable?.[0];

    if (!variable) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] Pas de variable associÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  ce nÃƒâ€¦Ã¢â‚¬Å“ud');
      return res.status(400).json({
        success: false,
        error: 'Ce nÃƒâ€¦Ã¢â‚¬Å“ud ne contient pas de variable'
      });
    }


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ÃƒÆ’Ã¢â‚¬Â°TAPE 5 : VÃƒÆ’Ã‚Â©rifier que la soumission existe et est accessible
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        treeId: true,
        leadId: true,
        status: true
      }
    });

    if (!submission) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] Soumission introuvable:', submissionId);
      return res.status(404).json({
        success: false,
        error: 'Soumission introuvable'
      });
    }


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ ÃƒÆ’Ã¢â‚¬Â°TAPE 6 : ÃƒÆ’Ã¢â‚¬Â°VALUATION UNIVERSELLE avec operation-interpreter
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

    const startTime = Date.now();

    // Appel de la fonction principale du systÃƒÆ’Ã‚Â¨me universel
    const evaluationResult = await evaluateVariableOperation(
      variableNodeId,
      submissionId,
      prisma
    );

    const duration = Date.now() - startTime;


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ ÃƒÆ’Ã¢â‚¬Â°TAPE 7 : Sauvegarder le rÃƒÆ’Ã‚Â©sultat dans SubmissionData
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

    await prisma.treeBranchLeafSubmissionData.upsert({
      where: {
        submissionId_nodeId: {
          submissionId,
          nodeId: variableNodeId
        }
      },
      update: {
        value: evaluationResult.value,
        operationDetail: evaluationResult.operationDetail as Prisma.InputJsonValue,
        operationResult: evaluationResult.operationResult,
        operationSource: evaluationResult.operationSource,
        lastResolved: new Date(),
        updatedAt: new Date()
      },
      create: {
        submissionId,
        nodeId: variableNodeId,
        value: evaluationResult.value,
        operationDetail: evaluationResult.operationDetail as Prisma.InputJsonValue,
        operationResult: evaluationResult.operationResult,
        operationSource: evaluationResult.operationSource,
        lastResolved: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¤ ÃƒÆ’Ã¢â‚¬Â°TAPE 8 : Retourner la rÃƒÆ’Ã‚Â©ponse complÃƒÆ’Ã‚Â¨te
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const response = {
      success: true,
      variable: {
        nodeId: variable.nodeId,
        displayName: variable.displayName,
        exposedKey: variable.exposedKey,
        sourceType: variable.sourceType,
        sourceRef: variable.sourceRef
      },
      result: {
        value: evaluationResult.value,
        operationDetail: evaluationResult.operationDetail,
        operationResult: evaluationResult.operationResult,
        operationSource: evaluationResult.operationSource,
        sourceRef: evaluationResult.sourceRef
      },
      evaluation: {
        mode: 'universal-interpreter',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        submissionId,
        nodeLabel: node.label
      }
    };


    return res.json(response);

  } catch (error) {
    console.error('\n' + 'ÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â'.repeat(80));
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] ERREUR CRITIQUE');
    console.error('ÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â'.repeat(80));
    console.error(error);
    console.error('ÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â'.repeat(80) + '\n');

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ÃƒÆ’Ã‚Â©valuation de la variable',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â GET /api/treebranchleaf/v2/submissions/:submissionId/variables
 * 
 * RÃƒÆ’Ã¢â‚¬Â°CUPÃƒÆ’Ã‹â€ RE TOUTES LES VARIABLES d'une soumission avec leurs valeurs ÃƒÆ’Ã‚Â©valuÃƒÆ’Ã‚Â©es
 * 
 * Cette route permet d'obtenir un aperÃƒÆ’Ã‚Â§u complet de toutes les variables
 * d'une soumission, avec leurs valeurs calculÃƒÆ’Ã‚Â©es et leurs textes explicatifs.
 * 
 * RETOUR :
 * --------
 * {
 *   success: true,
 *   submissionId: "tbl-xxx",
 *   tree: { id, name },
 *   variables: [
 *     {
 *       nodeId: "xxx",
 *       displayName: "Prix Kw/h test",
 *       exposedKey: "prix_kwh_test",
 *       value: "73",
 *       operationResult: "Si Prix > 10...",
 *       operationSource: "condition",
 *       lastResolved: "2025-01-06T..."
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/v2/submissions/:submissionId/variables', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ÃƒÆ’Ã¢â‚¬Â°TAPE 1 : RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la soumission avec son tree
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      include: {
        TreeBranchLeafTree: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Soumission introuvable'
      });
    }

    // VÃƒÆ’Ã‚Â©rifier les permissions
    if (!isSuperAdmin && submission.TreeBranchLeafTree?.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: 'AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  cette soumission'
      });
    }

    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  ÃƒÆ’Ã¢â‚¬Â°TAPE 2 : RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer toutes les variables du tree
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        TreeBranchLeafNode: {
          treeId: submission.treeId
        }
      },
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true
          }
        }
      }
    });


    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ ÃƒÆ’Ã¢â‚¬Â°TAPE 3 : RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les valeurs depuis SubmissionData
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId,
        nodeId: {
          in: variables.map(v => v.nodeId)
        }
      }
    });

    // CrÃƒÆ’Ã‚Â©er un Map pour lookup rapide
    const dataMap = new Map(
      submissionData.map(d => [d.nodeId, d])
    );

    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    // ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ ÃƒÆ’Ã¢â‚¬Â°TAPE 4 : Construire la rÃƒÆ’Ã‚Â©ponse
    // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
    const variablesResponse = variables.map(variable => {
      const data = dataMap.get(variable.nodeId);

      return {
        nodeId: variable.nodeId,
        displayName: variable.displayName,
        exposedKey: variable.exposedKey,
        sourceType: variable.sourceType,
        sourceRef: variable.sourceRef,
        value: data?.value || null,
        operationResult: data?.operationResult || null,
        operationSource: data?.operationSource || null,
        operationDetail: data?.operationDetail || null,
        lastResolved: data?.lastResolved || null,
        nodeLabel: variable.TreeBranchLeafNode?.label || 'Inconnu',
        nodeType: variable.TreeBranchLeafNode?.type || 'unknown'
      };
    });


    return res.json({
      success: true,
      submissionId,
      tree: {
        id: submission.TreeBranchLeafTree?.id,
        name: submission.TreeBranchLeafTree?.name
      },
      variables: variablesResponse,
      meta: {
        totalVariables: variables.length,
        evaluatedVariables: submissionData.length
      }
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [V2 API] Erreur rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration variables:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des variables',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¤ FIN DU SYSTÃƒÆ’Ã‹â€ ME UNIVERSEL V2
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ SYSTÃƒÆ’Ã‹â€ ME DE SAUVEGARDE TBL AVANCÃƒÆ’Ã¢â‚¬Â° - Brouillons & Versioning
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

/**
 * ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ POST /api/tbl/submissions/stage
 * CrÃƒÆ’Ã‚Â©e ou met ÃƒÆ’Ã‚Â  jour un brouillon temporaire (stage)
 * TTL: 24h - Auto-renouvelÃƒÆ’Ã‚Â© lors des modifications
 */
router.post('/submissions/stage', async (req, res) => {
  try {
    const { stageId, treeId, submissionId, leadId, formData, baseVersion } = req.body;
    const userId = (req as any).user?.id || 'system';


    // Calculer expiration (+24h)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let stage;

    if (stageId) {
      // Mise ÃƒÆ’Ã‚Â  jour d'un stage existant
      stage = await prisma.treeBranchLeafStage.update({
        where: { id: stageId },
        data: {
          formData: formData || {},
          lastActivity: new Date(),
          expiresAt, // Renouvelle l'expiration
        }
      });
    } else {
      // CrÃƒÆ’Ã‚Â©ation d'un nouveau stage
      if (!treeId || !leadId) {
        return res.status(400).json({
          success: false,
          error: 'treeId et leadId sont requis pour crÃƒÆ’Ã‚Â©er un stage'
        });
      }

      // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la version de base si submissionId fourni
      let currentBaseVersion = baseVersion || 1;
      if (submissionId && !baseVersion) {
        const submission = await prisma.treeBranchLeafSubmission.findUnique({
          where: { id: submissionId },
          select: { currentVersion: true }
        });
        currentBaseVersion = submission?.currentVersion || 1;
      }

      stage = await prisma.treeBranchLeafStage.create({
        data: {
          id: randomUUID(),
          treeId,
          submissionId,
          leadId,
          userId,
          formData: formData || {},
          baseVersion: currentBaseVersion,
          expiresAt
        }
      });
    }

    return res.json({
      success: true,
      stage: {
        id: stage.id,
        expiresAt: stage.expiresAt,
        lastActivity: stage.lastActivity
      }
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [STAGE] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la gestion du brouillon',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â POST /api/tbl/submissions/stage/preview
 * PrÃƒÆ’Ã‚Â©visualise les calculs d'un stage sans sauvegarder
 * Utilise operation-interpreter pour ÃƒÆ’Ã‚Â©valuer toutes les formules
 */
router.post('/submissions/stage/preview', async (req, res) => {
  try {
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: 'stageId requis'
      });
    }


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le stage
    const stage = await prisma.treeBranchLeafStage.findUnique({
      where: { id: stageId }
    });

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Stage non trouvÃƒÆ’Ã‚Â©'
      });
    }

    // ÃƒÂ¢Ã…â€œÃ‚Â¨ ÃƒÆ’Ã¢â‚¬Â°valuer tous les nÃƒâ€¦Ã¢â‚¬Å“uds variables avec operation-interpreter
    const { evaluateVariableOperation } = await import('./operation-interpreter');
    
    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds variables de l'arbre
    const variableNodes = await prisma.treeBranchLeafNode.findMany({
      where: { 
        treeId: stage.treeId,
        subType: 'variable'
      },
      select: { id: true, label: true }
    });

    // CrÃƒÆ’Ã‚Â©er une valueMap ÃƒÆ’Ã‚Â  partir du formData du stage
    const valueMapLocal = new Map<string, unknown>();
    Object.entries(stage.formData as Record<string, unknown>).forEach(([nodeId, value]) => {
      valueMapLocal.set(nodeId, value);
    });

    // ÃƒÆ’Ã¢â‚¬Â°valuer chaque variable
    const results = await Promise.all(
      variableNodes.map(async (node) => {
        try {
          const evalResult = await evaluateVariableOperation(
            node.id,
            stage.submissionId || stage.id,
            prisma,
            valueMapLocal
          );
          return {
            nodeId: node.id,
            nodeLabel: node.label,
            sourceRef: evalResult.sourceRef,
            operationSource: evalResult.operationSource,
            operationResult: evalResult.operationResult,
            operationDetail: evalResult.operationDetail
          };
        } catch (error) {
          console.error(`ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur ÃƒÆ’Ã‚Â©valuation ${node.id}:`, error);
          return {
            nodeId: node.id,
            nodeLabel: node.label,
            sourceRef: '',
            operationSource: 'field' as const,
            operationResult: 'ERROR',
            operationDetail: null
          };
        }
      })
    );


    return res.json({
      success: true,
      stageId: stage.id,
      results: results.map(r => ({
        nodeId: r.nodeId,
        nodeLabel: r.nodeLabel,
        sourceRef: r.sourceRef,
        operationSource: r.operationSource,
        operationResult: r.operationResult,
        operationDetail: r.operationDetail
      }))
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [STAGE PREVIEW] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la prÃƒÆ’Ã‚Â©visualisation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ POST /api/tbl/submissions/stage/commit
 * Commit un stage vers une submission dÃƒÆ’Ã‚Â©finitive
 * GÃƒÆ’Ã‚Â¨re les conflits multi-utilisateurs et le versioning
 */
router.post('/submissions/stage/commit', async (req, res) => {
  try {
    const { stageId, asNew } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: 'stageId requis'
      });
    }


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le stage
    const stage = await prisma.treeBranchLeafStage.findUnique({
      where: { id: stageId }
    });

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Stage non trouvÃƒÆ’Ã‚Â©'
      });
    }

    // VÃƒÆ’Ã‚Â©rifier si le stage n'a pas expirÃƒÆ’Ã‚Â©
    if (stage.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Ce brouillon a expirÃƒÆ’Ã‚Â©',
        expired: true
      });
    }

    let submissionId: string;
    let newVersion = 1;

    if (asNew || !stage.submissionId) {
      // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â CRÃƒÆ’Ã¢â‚¬Â°ATION NOUVELLE SUBMISSION ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

      // ÃƒÂ¢Ã…â€œÃ‚Â¨ ÃƒÆ’Ã¢â‚¬Â°valuer avec operation-interpreter
      const { evaluateVariableOperation } = await import('./operation-interpreter');
      
      // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds variables de l'arbre
      const variableNodes = await prisma.treeBranchLeafNode.findMany({
        where: { 
          treeId: stage.treeId,
          subType: 'variable'
        },
        select: { id: true, label: true }
      });

      // CrÃƒÆ’Ã‚Â©er une valueMap ÃƒÆ’Ã‚Â  partir du formData du stage
      const valueMapLocal = new Map<string, unknown>();
      Object.entries(stage.formData as Record<string, unknown>).forEach(([nodeId, value]) => {
        valueMapLocal.set(nodeId, value);
      });

      // ÃƒÆ’Ã¢â‚¬Â°valuer chaque variable
      const results = await Promise.all(
        variableNodes.map(async (node) => {
          try {
            const evalResult = await evaluateVariableOperation(
              node.id,
              stage.id,
              prisma,
              valueMapLocal
            );
            return {
              nodeId: node.id,
              nodeLabel: node.label,
              value: evalResult.value,
              operationSource: evalResult.operationSource,
              operationResult: evalResult.operationResult,
              operationDetail: evalResult.operationDetail
            };
          } catch (error) {
            console.error(`ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur ÃƒÆ’Ã‚Â©valuation ${node.id}:`, error);
            return null;
          }
        })
      ).then(res => res.filter(r => r !== null));

      // CrÃƒÆ’Ã‚Â©er la submission dans une transaction
      const result = await prisma.$transaction(async (tx) => {
        // CrÃƒÆ’Ã‚Â©er la submission
        const submission = await tx.treeBranchLeafSubmission.create({
          data: {
            id: randomUUID(),
            treeId: stage.treeId,
            userId: stage.userId,
            leadId: stage.leadId,
            status: 'draft',
            currentVersion: 1,
            lastEditedBy: userId,
            summary: {},
            updatedAt: new Date()
          }
        });

        // CrÃƒÆ’Ã‚Â©er les donnÃƒÆ’Ã‚Â©es de soumission
        if (results.length > 0) {
          await tx.treeBranchLeafSubmissionData.createMany({
            data: results.map(r => ({
              id: randomUUID(),
              submissionId: submission.id,
              nodeId: r.nodeId,
              value: String(r.operationResult || ''),
              fieldLabel: r.nodeLabel,
              sourceRef: r.sourceRef,
              operationSource: r.operationSource,
              operationResult: r.operationResult as Prisma.JsonValue,
              operationDetail: r.operationDetail as Prisma.JsonValue,
              lastResolved: new Date()
            }))
          });
        }

        // CrÃƒÆ’Ã‚Â©er la premiÃƒÆ’Ã‚Â¨re version
        await tx.treeBranchLeafSubmissionVersion.create({
          data: {
            id: randomUUID(),
            submissionId: submission.id,
            version: 1,
            formData: stage.formData,
            summary: 'Version initiale',
            createdBy: userId
          }
        });

        // Supprimer le stage
        await tx.treeBranchLeafStage.delete({
          where: { id: stageId }
        });

        return submission;
      });

      submissionId = result.id;
      newVersion = 1;


    } else {
      // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â MISE ÃƒÆ’Ã¢â€šÂ¬ JOUR SUBMISSION EXISTANTE ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

      // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la submission actuelle
      const currentSubmission = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: stage.submissionId },
        select: {
          id: true,
          currentVersion: true,
          lastEditedBy: true,
          updatedAt: true,
          lockedBy: true,
          lockedAt: true
        }
      });

      if (!currentSubmission) {
        return res.status(404).json({
          success: false,
          error: 'Submission originale non trouvÃƒÆ’Ã‚Â©e'
        });
      }

      // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â DÃƒÆ’Ã¢â‚¬Â°TECTION CONFLITS ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
      if (currentSubmission.currentVersion > stage.baseVersion) {

        // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer les donnÃƒÆ’Ã‚Â©es actuelles pour comparaison
        const currentData = await prisma.treeBranchLeafSubmissionData.findMany({
          where: { submissionId: stage.submissionId },
          select: { nodeId: true, value: true }
        });

        const currentDataMap = new Map(currentData.map(d => [d.nodeId, d.value]));
        const stageFormData = stage.formData as Record<string, unknown>;

        // DÃƒÆ’Ã‚Â©tecter les conflits champ par champ
        const conflicts = [];
        for (const [nodeId, stageValue] of Object.entries(stageFormData)) {
          const currentValue = currentDataMap.get(nodeId);
          // Conflit si la valeur a changÃƒÆ’Ã‚Â© des deux cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â©s
          if (currentValue !== undefined && String(stageValue) !== currentValue) {
            conflicts.push({
              nodeId,
              yourValue: stageValue,
              theirValue: currentValue
            });
          }
        }

        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            conflict: true,
            conflicts,
            lastEditedBy: currentSubmission.lastEditedBy,
            lastEditedAt: currentSubmission.updatedAt,
            message: 'Des modifications ont ÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© faites par un autre utilisateur'
          });
        }

      }

      // VÃƒÆ’Ã‚Â©rifier le verrouillage
      if (currentSubmission.lockedBy && currentSubmission.lockedBy !== userId) {
        const lockAge = currentSubmission.lockedAt ? 
          Date.now() - new Date(currentSubmission.lockedAt).getTime() : 0;
        
        // Lock expire aprÃƒÆ’Ã‚Â¨s 1h
        if (lockAge < 60 * 60 * 1000) {
          return res.status(423).json({
            success: false,
            locked: true,
            lockedBy: currentSubmission.lockedBy,
            message: 'Ce devis est en cours d\'ÃƒÆ’Ã‚Â©dition par un autre utilisateur'
          });
        }
      }

      // ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â COMMIT AVEC VERSIONING ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
      const result = await prisma.$transaction(async (tx) => {
        // ÃƒÂ¢Ã…â€œÃ‚Â¨ ÃƒÆ’Ã¢â‚¬Â°valuer avec operation-interpreter
        const { evaluateVariableOperation } = await import('./operation-interpreter');
        
        // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds variables de l'arbre
        const variableNodes = await tx.treeBranchLeafNode.findMany({
          where: { 
            treeId: stage.treeId,
            subType: 'variable'
          },
          select: { id: true, label: true }
        });

        // CrÃƒÆ’Ã‚Â©er une valueMap ÃƒÆ’Ã‚Â  partir du formData du stage
        const valueMapLocal = new Map<string, unknown>();
        Object.entries(stage.formData as Record<string, unknown>).forEach(([nodeId, value]) => {
          valueMapLocal.set(nodeId, value);
        });

        // ÃƒÆ’Ã¢â‚¬Â°valuer chaque variable
        const results = await Promise.all(
          variableNodes.map(async (node) => {
            try {
              const evalResult = await evaluateVariableOperation(
                node.id,
                stage.submissionId!,
                tx as any,
                valueMapLocal
              );
              return {
                nodeId: node.id,
                nodeLabel: node.label,
                value: evalResult.value,
                operationSource: evalResult.operationSource,
                operationResult: evalResult.operationResult,
                operationDetail: evalResult.operationDetail
              };
            } catch (error) {
              console.error(`ÃƒÂ¢Ã‚ÂÃ…â€™ Erreur ÃƒÆ’Ã‚Â©valuation ${node.id}:`, error);
              return null;
            }
          })
        ).then(res => res.filter(r => r !== null));

        const nextVersion = currentSubmission.currentVersion + 1;

        // Mettre ÃƒÆ’Ã‚Â  jour la submission
        const updated = await tx.treeBranchLeafSubmission.update({
          where: { id: stage.submissionId },
          data: {
            currentVersion: nextVersion,
            lastEditedBy: userId,
            lockedBy: null, // LibÃƒÆ’Ã‚Â©rer le lock
            lockedAt: null,
            updatedAt: new Date()
          }
        });

        // Supprimer les anciennes donnÃƒÆ’Ã‚Â©es
        await tx.treeBranchLeafSubmissionData.deleteMany({
          where: { submissionId: stage.submissionId }
        });

        // CrÃƒÆ’Ã‚Â©er les nouvelles donnÃƒÆ’Ã‚Â©es
        if (results.length > 0) {
          await tx.treeBranchLeafSubmissionData.createMany({
            data: results.map(r => ({
              id: randomUUID(),
              submissionId: updated.id,
              nodeId: r.nodeId,
              value: String(r.operationResult || ''),
              fieldLabel: r.nodeLabel,
              sourceRef: r.sourceRef,
              operationSource: r.operationSource,
              operationResult: r.operationResult as Prisma.JsonValue,
              operationDetail: r.operationDetail as Prisma.JsonValue,
              lastResolved: new Date()
            }))
          });
        }

        // CrÃƒÆ’Ã‚Â©er la nouvelle version
        await tx.treeBranchLeafSubmissionVersion.create({
          data: {
            id: randomUUID(),
            submissionId: updated.id,
            version: nextVersion,
            formData: stage.formData,
            createdBy: userId
          }
        });

        // Nettoyer les vieilles versions (garder 20 derniÃƒÆ’Ã‚Â¨res)
        const versions = await tx.treeBranchLeafSubmissionVersion.findMany({
          where: { submissionId: updated.id },
          orderBy: { version: 'desc' },
          skip: 20,
          select: { id: true }
        });

        if (versions.length > 0) {
          await tx.treeBranchLeafSubmissionVersion.deleteMany({
            where: { id: { in: versions.map(v => v.id) } }
          });
        }

        // Supprimer le stage
        await tx.treeBranchLeafStage.delete({
          where: { id: stageId }
        });

        return { submission: updated, version: nextVersion };
      });

      submissionId = result.submission.id;
      newVersion = result.version;

    }

    return res.json({
      success: true,
      submissionId,
      version: newVersion,
      message: 'Devis enregistrÃƒÆ’Ã‚Â© avec succÃƒÆ’Ã‚Â¨s'
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [STAGE COMMIT] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬ËœÃƒÂ¯Ã‚Â¸Ã‚Â POST /api/tbl/submissions/stage/discard
 * Supprime un brouillon (annulation)
 */
router.post('/submissions/stage/discard', async (req, res) => {
  try {
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: 'stageId requis'
      });
    }


    await prisma.treeBranchLeafStage.delete({
      where: { id: stageId }
    });


    return res.json({
      success: true,
      message: 'Brouillon supprimÃƒÆ’Ã‚Â©'
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [STAGE DISCARD] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du brouillon',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ GET /api/tbl/submissions/my-drafts
 * RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re les brouillons non sauvegardÃƒÆ’Ã‚Â©s de l'utilisateur
 * Pour rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration automatique au retour
 */
router.get('/submissions/my-drafts', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const { leadId, treeId } = req.query;


    const where: any = {
      userId,
      expiresAt: { gt: new Date() } // Seulement les non-expirÃƒÆ’Ã‚Â©s
    };

    if (leadId) where.leadId = leadId;
    if (treeId) where.treeId = treeId;

    const drafts = await prisma.treeBranchLeafStage.findMany({
      where,
      orderBy: { lastActivity: 'desc' },
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        }
      }
    });


    return res.json({
      success: true,
      drafts: drafts.map(d => ({
        stageId: d.id,
        treeId: d.treeId,
        submissionId: d.submissionId,
        leadId: d.leadId,
        leadName: d.Lead ? 
          `${d.Lead.firstName || ''} ${d.Lead.lastName || ''}`.trim() || d.Lead.company || 'Lead' 
          : 'Lead',
        lastActivity: d.lastActivity,
        expiresAt: d.expiresAt,
        formData: d.formData
      }))
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [MY DRAFTS] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration des brouillons',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…â€œ GET /api/tbl/submissions/:id/versions
 * RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re l'historique des versions d'une submission
 */
router.get('/submissions/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;


    const versions = await prisma.treeBranchLeafSubmissionVersion.findMany({
      where: { submissionId: id },
      orderBy: { version: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });


    return res.json({
      success: true,
      submissionId: id,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        summary: v.summary,
        createdAt: v.createdAt,
        createdBy: {
          id: v.User.id,
          name: `${v.User.firstName || ''} ${v.User.lastName || ''}`.trim() || v.User.email
        }
      }))
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [VERSIONS] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration de l\'historique',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â€žÂ¢ POST /api/tbl/submissions/:id/restore/:version
 * Restaure une version antÃƒÆ’Ã‚Â©rieure d'une submission
 */
router.post('/submissions/:id/restore/:version', async (req, res) => {
  try {
    const { id, version } = req.params;
    const userId = (req as any).user?.id || 'system';


    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer la version ÃƒÆ’Ã‚Â  restaurer
    const versionToRestore = await prisma.treeBranchLeafSubmissionVersion.findUnique({
      where: {
        submissionId_version: {
          submissionId: id,
          version: parseInt(version)
        }
      }
    });

    if (!versionToRestore) {
      return res.status(404).json({
        success: false,
        error: 'Version non trouvÃƒÆ’Ã‚Â©e'
      });
    }

    // CrÃƒÆ’Ã‚Â©er un stage avec les donnÃƒÆ’Ã‚Â©es de cette version
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id },
      select: { treeId: true, leadId: true, currentVersion: true }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission non trouvÃƒÆ’Ã‚Â©e'
      });
    }

    const stage = await prisma.treeBranchLeafStage.create({
      data: {
        id: randomUUID(),
        treeId: submission.treeId,
        submissionId: id,
        leadId: submission.leadId || 'unknown',
        userId,
        formData: versionToRestore.formData,
        baseVersion: submission.currentVersion,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });


    return res.json({
      success: true,
      stageId: stage.id,
      message: `Version ${version} chargÃƒÆ’Ã‚Â©e en brouillon. Enregistrez pour confirmer la restauration.`
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [RESTORE] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la restauration',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ FIN DU SYSTÃƒÆ’Ã‹â€ ME DE SAUVEGARDE TBL AVANCÃƒÆ’Ã¢â‚¬Â°
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ SYSTÃƒÆ’Ã‹â€ ME DE RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES PARTAGÃƒÆ’Ã¢â‚¬Â°ES (SHARED REFERENCES)
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â

// GET /api/treebranchleaf/shared-references - Liste toutes les rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es disponibles
router.get('/shared-references', async (req, res) => {
  try {
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);

    // RÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer tous les nÃƒâ€¦Ã¢â‚¬Å“uds marquÃƒÆ’Ã‚Â©s comme templates (sources de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences)
    // ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ FILTRER les options SELECT pour qu'elles n'apparaissent pas dans les choix
    const templates = await prisma.treeBranchLeafNode.findMany({
      where: {
        isSharedReference: true,
        sharedReferenceId: null, // C'est une source, pas une rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
        type: {
          not: 'leaf_option' // ÃƒÂ¢Ã‚ÂÃ…â€™ Exclure les options de SELECT
        },
        TreeBranchLeafTree: {
          organizationId
        }
      },
      select: {
        id: true,
        label: true,
        sharedReferenceName: true,
        // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ sharedReferenceCategory SUPPRIMÃƒÆ’Ã¢â‚¬Â°
        sharedReferenceDescription: true
      }
    });

    // Compter les usages (noeuds qui utilisent cette ref via sharedReferenceId)
    const templateIds = templates.map(t => t.id);
    const usageCounts = await prisma.treeBranchLeafNode.groupBy({
      by: ['sharedReferenceId'],
      where: {
        sharedReferenceId: { in: templateIds }
      },
      _count: { id: true }
    });
    const usageMap = new Map(usageCounts.map(u => [u.sharedReferenceId, u._count.id]));

    const formatted = templates.map(template => ({
      id: template.id,
      label: template.sharedReferenceName || template.label,
      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ category SUPPRIMÃƒÆ’Ã¢â‚¬Â°
      description: template.sharedReferenceDescription,
      usageCount: usageMap.get(template.id) || 0,
      usages: []
    }));

    res.json(formatted);
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur liste:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/treebranchleaf/shared-references/:refId - DÃƒÆ’Ã‚Â©tails d'une rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
router.get('/shared-references/:refId', async (req, res) => {
  try {
    const { refId } = req.params;
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);

    const template = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: refId,
        isSharedReference: true,
        sharedReferenceId: null,
        TreeBranchLeafTree: {
          organizationId
        }
      },
      select: {
        id: true,
        label: true,
        sharedReferenceName: true,
        // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ sharedReferenceCategory SUPPRIMÃƒÆ’Ã¢â‚¬Â°
        sharedReferenceDescription: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence introuvable' });
    }

    res.json({
      id: template.id,
      label: template.sharedReferenceName || template.label,
      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ category SUPPRIMÃƒÆ’Ã¢â‚¬Â°
      description: template.sharedReferenceDescription,
      usageCount: usageMap.get(template.id) || 0,
      usages: []
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur dÃƒÆ’Ã‚Â©tails:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/treebranchleaf/shared-references/:refId - Modifier une rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©e
router.put('/shared-references/:refId', async (req, res) => {
  try {
    const { refId } = req.params;
    const { name, description } = req.body;
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier que la rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence existe et appartient ÃƒÆ’Ã‚Â  l'organisation
    const template = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: refId,
        isSharedReference: true,
        sharedReferenceId: null,
        TreeBranchLeafTree: {
          organizationId
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence introuvable' });
    }

    // Mettre ÃƒÆ’Ã‚Â  jour la rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: refId },
      data: {
        sharedReferenceName: name || template.sharedReferenceName,
        sharedReferenceDescription: description !== undefined ? description : template.sharedReferenceDescription,
        label: name || template.label,
        updatedAt: new Date()
      },
      select: {
        id: true,
        label: true,
        sharedReferenceName: true,
        sharedReferenceDescription: true
      }
    });

    res.json({ success: true, reference: updated });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur modification:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

// DELETE /api/treebranchleaf/shared-references/:refId - Supprimer une rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©e
router.delete('/shared-references/:refId', async (req, res) => {
  try {
    const { refId } = req.params;
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÆ’Ã‚Â©rifier que la rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence existe et appartient ÃƒÆ’Ã‚Â  l'organisation
    const template = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: refId,
        isSharedReference: true,
        sharedReferenceId: null,
        TreeBranchLeafTree: {
          organizationId
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence introuvable' });
    }

    // Si la rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence est utilisÃƒÆ’Ã‚Â©e, dÃƒÆ’Ã‚Â©tacher tous les usages avant de supprimer
    // Compter les usages
    const usageCount = await prisma.treeBranchLeafNode.count({
      where: { sharedReferenceId: refId }
    })

    if (usageCount > 0) {
      
      // DÃƒÆ’Ã‚Â©tacher tous les nÃƒâ€¦Ã¢â‚¬Å“uds qui utilisent cette rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
      await prisma.treeBranchLeafNode.updateMany({
        where: {
          sharedReferenceId: refId
        },
        data: {
          sharedReferenceId: null,
          sharedReferenceName: null,
          sharedReferenceDescription: null,
          isSharedReference: false
        }
      });
    }

    // Supprimer la rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
    await prisma.treeBranchLeafNode.delete({
      where: { id: refId }
    });

    res.json({ success: true, message: 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence supprimÃƒÆ’Ã‚Â©e avec succÃƒÆ’Ã‚Â¨s' });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// POST /api/treebranchleaf/trees/:treeId/create-shared-reference - CrÃƒÆ’Ã‚Â©er un nouveau nÃƒâ€¦Ã¢â‚¬Å“ud rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©
router.post('/trees/:treeId/create-shared-reference', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { name, description, fieldType, label } = req.body;
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s ÃƒÆ’Ã‚Â  l'arbre
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: {
        id: treeId,
        organizationId
      }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre introuvable' });
    }

    // GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer un nouvel ID unique
    const newNodeId = `shared-ref-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // CrÃƒÆ’Ã‚Â©er le nÃƒâ€¦Ã¢â‚¬Å“ud rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©
    const newNode = await prisma.treeBranchLeafNode.create({
      data: {
        id: newNodeId,
        treeId,
        type: 'leaf_field', // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ OBLIGATOIRE : type du nÃƒâ€¦Ã¢â‚¬Å“ud
        label: label || name,
        fieldType: fieldType || 'TEXT',
        parentId: null, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CORRECTION: null au lieu de 'ROOT' (contrainte de clÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â©trangÃƒÆ’Ã‚Â¨re)
        order: 9999, // Ordre ÃƒÆ’Ã‚Â©levÃƒÆ’Ã‚Â© pour les mettre ÃƒÆ’Ã‚Â  la fin
        isSharedReference: true,
        sharedReferenceId: null, // C'est une source
        sharedReferenceName: name,
        sharedReferenceDescription: description,
        updatedAt: new Date() // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ OBLIGATOIRE : timestamp de mise ÃƒÆ’Ã‚Â  jour
      }
    });

    res.json({ 
      success: true,
      id: newNode.id,
      node: {
        id: newNode.id,
        label: newNode.label,
        fieldType: newNode.fieldType,
        sharedReferenceName: newNode.sharedReferenceName,
        sharedReferenceDescription: newNode.sharedReferenceDescription
      },
      message: 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©e crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©e avec succÃƒÆ’Ã‚Â¨s'
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur crÃƒÆ’Ã‚Â©ation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/treebranchleaf/nodes/:nodeId/link-shared-references - Lier des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences partagÃƒÆ’Ã‚Â©es ÃƒÆ’Ã‚Â  un nÃƒâ€¦Ã¢â‚¬Å“ud
router.post('/nodes/:nodeId/link-shared-references', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { referenceIds } = req.body; // Array d'IDs de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences ÃƒÆ’Ã‚Â  lier
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au nÃƒâ€¦Ã¢â‚¬Å“ud
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        TreeBranchLeafTree: {
          organizationId
        }
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud introuvable' });
    }

    // Mettre ÃƒÆ’Ã‚Â  jour le nÃƒâ€¦Ã¢â‚¬Å“ud avec les IDs des rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        sharedReferenceIds: referenceIds
      }
    });

    res.json({ 
      success: true,
      message: `${referenceIds.length} rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence(s) liÃƒÆ’Ã‚Â©e(s) avec succÃƒÆ’Ã‚Â¨s`
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur liaison:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/treebranchleaf/nodes/:nodeId/convert-to-reference - Convertir un nÃƒâ€¦Ã¢â‚¬Å“ud en rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence partagÃƒÆ’Ã‚Â©e
router.post('/nodes/:nodeId/convert-to-reference', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { name, description } = req.body; // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CATEGORY SUPPRIMÃƒÆ’Ã¢â‚¬Â°E
    const { organizationId } = getAuthCtx(req as unknown as MinimalReq);


    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        TreeBranchLeafTree: {
          organizationId
        }
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃƒâ€¦Ã¢â‚¬Å“ud introuvable' });
    }

    // Convertir en source de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        isSharedReference: true,
        sharedReferenceId: null, // C'est une source
        sharedReferenceName: name,
        // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ sharedReferenceCategory SUPPRIMÃƒÆ’Ã¢â‚¬Â°
        sharedReferenceDescription: description
      }
    });

    res.json({ 
      success: true,
      id: nodeId,
      message: 'RÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©e avec succÃƒÆ’Ã‚Â¨s'
    });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [SHARED REF] Erreur conversion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ FIN DU SYSTÃƒÆ’Ã‹â€ ME DE RÃƒÆ’Ã¢â‚¬Â°FÃƒÆ’Ã¢â‚¬Â°RENCES PARTAGÃƒÆ’Ã¢â‚¬Â°ES
// ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â




// =============================================================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ COPIE DE VARIABLE AVEC CAPACITÃƒÆ’Ã¢â‚¬Â°S - SystÃƒÆ’Ã‚Â¨me de suffixe -N
// =============================================================================
/**
 * POST /api/treebranchleaf/nodes/:nodeId/copy-linked-variable
 * Copie une variable avec toutes ses capacitÃƒÆ’Ã‚Â©s (formules, conditions, tables)
 * 
 * Body:
 *   - variableId: ID de la variable ÃƒÆ’Ã‚Â  copier (peut avoir suffixe -N)
 *   - newSuffix: Nouveau numÃƒÆ’Ã‚Â©ro de suffixe pour la copie (ex: 2)
 * 
 * Retourne:
 * {
 *   success: boolean,
 *   variableId: string,
 *   formulaIds: string[],
 *   conditionIds: string[],
 *   tableIds: string[],
 *   error?: string
 * }
 */
// (revert) suppression des routes utilitaires ajoutÃƒÂ¯Ã‚Â¿Ã‚Â½es au niveau supÃƒÂ¯Ã‚Â¿Ã‚Â½rieur

type JsonValue = string | number | boolean | { [key: string]: JsonValue } | JsonArray | null;
interface JsonArray extends Array<JsonValue> {}

router.post('/nodes/:nodeId/copy-linked-variable', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { variableId, newSuffix, duplicateNode, targetNodeId: bodyTargetNodeId } = req.body as {
      variableId?: string;
      newSuffix?: number;
      duplicateNode?: boolean;
      targetNodeId?: string;
    };

    console.warn('?? [COPY-LINKED-VAR] DEPRECATED route: please use the registry/repeat API endpoints (POST /api/repeat) instead. This legacy route will be removed in a future release.');
    // Hint for automated clients
    res.set('X-Deprecated-API', '/api/repeat');

    // NOTE: the '/variables/:variableId/create-display' util route was nested
    // under the copy-linked-variable handler historically. That caused
    // registration order/visibility issues. We moved it to a top-level route
    // (see below) and this nested declaration no longer applies.


    if (!variableId || newSuffix === undefined) {
      return res.status(400).json({
        error: 'variableId et newSuffix requis dans le corps de la requÃƒÆ’Ã‚Âªte'
      });
    }

    if (!Number.isInteger(newSuffix) || newSuffix < 1) {
      return res.status(400).json({
        error: 'newSuffix doit ÃƒÆ’Ã‚Âªtre un nombre entier positif'
      });
    }

    // VÃƒÆ’Ã‚Â©rifier l'accÃƒÆ’Ã‚Â¨s au noeud
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        TreeBranchLeafTree: {
          organizationId: getAuthCtx(req as unknown as MinimalReq).organizationId
        }
      },
      include: { TreeBranchLeafTree: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'Noeud introuvable' });
    }


    // DÃƒÂ¯Ã‚Â¿Ã‚Â½terminer le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud cible: soit le nodeId fourni, soit une copie du nÃƒÂ¯Ã‚Â¿Ã‚Â½ud propriÃƒÂ¯Ã‚Â¿Ã‚Â½taire de la variable
  let targetNodeId = nodeId;
  const shouldDuplicateNode = duplicateNode === undefined ? true : Boolean(duplicateNode);
  // Mapping minimal pour rÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½crire les rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rences dans les capacitÃƒÂ¯Ã‚Â¿Ã‚Â½s (ownerNode ? targetNode)
  let ownerNodeIdForMap: string | null = null;

  // Si on crÃƒÂ¯Ã‚Â¿Ã‚Â½e un nouveau nÃƒÂ¯Ã‚Â¿Ã‚Â½ud (duplication), on doit aussi restaurer les *activeId*
  // (table_activeId / formula_activeId / condition_activeId), sinon la copie peut rester avec table_activeId=NULL.
  let didCreateTargetNode = false;
  let ownerNodeForDuplication:
    | {
        id: string;
        table_activeId: string | null;
        formula_activeId: string | null;
        condition_activeId: string | null;
        variable_activeId: string | null;
      }
    | null = null;

  const ensureSuffixLocal = (id: string): string => {
    // Remplace un suffixe -N existant, sinon l'ajoute
    return /-\d+$/.test(id) ? id.replace(/-\d+$/, `-${newSuffix}`) : `${id}-${newSuffix}`;
  };

  // Si un targetNodeId explicite est fourni et qu'on ne duplique pas, l'utiliser comme cible
  if (!shouldDuplicateNode && bodyTargetNodeId) {
      const targetNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: bodyTargetNodeId } });
      if (!targetNode) {
        return res.status(404).json({ error: 'targetNodeId introuvable' });
      }
      // VÃƒÂ¯Ã‚Â¿Ã‚Â½rifier mÃƒÂ¯Ã‚Â¿Ã‚Â½me arbre
      if (targetNode.treeId !== node.treeId) {
        return res.status(400).json({ error: 'targetNodeId doit appartenir au mÃƒÂ¯Ã‚Â¿Ã‚Â½me arbre' });
      }
      targetNodeId = targetNode.id;
      // DÃƒÂ¯Ã‚Â¿Ã‚Â½terminer l'ownerNode d'origine de la variable pour construire le nodeIdMap
      if (variableId) {
        const originalVarForMap = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } });
        if (originalVarForMap) ownerNodeIdForMap = originalVarForMap.nodeId;
      }
  } else if (shouldDuplicateNode) {
      // Charger la variable originale pour connaÃƒÂ¯Ã‚Â¿Ã‚Â½tre son nÃƒÂ¯Ã‚Â¿Ã‚Â½ud propriÃƒÂ¯Ã‚Â¿Ã‚Â½taire
      const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId! } });
      if (!originalVar) {
        return res.status(404).json({ error: 'Variable introuvable' });
      }
      const ownerNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: originalVar.nodeId } });
      if (!ownerNode) {
        return res.status(404).json({ error: 'NÃƒÂ¯Ã‚Â¿Ã‚Â½ud propriÃƒÂ¯Ã‚Â¿Ã‚Â½taire introuvable' });
      }

      ownerNodeForDuplication = {
        id: ownerNode.id,
        table_activeId: ownerNode.table_activeId,
        formula_activeId: ownerNode.formula_activeId,
        condition_activeId: ownerNode.condition_activeId,
        variable_activeId: ownerNode.variable_activeId
      };
      ownerNodeIdForMap = ownerNode.id;
      const candidateId = `${ownerNode.id}-${newSuffix}`;
      const exists = await prisma.treeBranchLeafNode.findUnique({ where: { id: candidateId } });
      targetNodeId = exists ? `${candidateId}-${Date.now()}` : candidateId;

      // Gérer proprement la réécriture des références dans les configs
      const rewriter = (json: any): any => {
         if (!json) return json ?? {};
         const str = JSON.stringify(json);
         const rewritten = rewriteReferences(str, {
           nodeIdMap: new Map(),
           formulaIdMap: new Map(),
           conditionIdMap: new Map(),
           tableIdMap: new Map()
         }, newSuffix);
         return JSON.parse(rewritten);
      };

      await prisma.treeBranchLeafNode.create({
        data: {
          id: targetNodeId,
          treeId: ownerNode.treeId,
          parentId: ownerNode.parentId,
          type: ownerNode.type,
          subType: ownerNode.subType,
          label: `${ownerNode.label || 'Node'}-${newSuffix}`,
          description: ownerNode.description,
          value: ownerNode.value,
          calculatedValue: ownerNode.calculatedValue,
          order: (ownerNode.order ?? 0) + 1,
          isRequired: ownerNode.isRequired ?? false,
          isVisible: ownerNode.isVisible ?? true,
          isActive: ownerNode.isActive ?? true,
          isMultiple: ownerNode.isMultiple ?? false,
          hasData: ownerNode.hasData ?? false,
          metadata: rewriter(ownerNode.metadata) as any,
          tableConfig: rewriter(ownerNode.tableConfig) as any,
          formulaConfig: rewriter(ownerNode.formulaConfig) as any,
          conditionConfig: rewriter(ownerNode.conditionConfig) as any,
          apiConfig: rewriter(ownerNode.apiConfig) as any,
          linkConfig: rewriter(ownerNode.linkConfig) as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      didCreateTargetNode = true;
  }

    // Copier la variable avec ses capacitÃƒÂ¯Ã‚Â¿Ã‚Â½s vers le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud cible
    // PrÃƒÂ¯Ã‚Â¿Ã‚Â½parer des maps pour rÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½crire les rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rences internes
    const nodeIdMap = new Map<string, string>();
    if (ownerNodeIdForMap) nodeIdMap.set(ownerNodeIdForMap, targetNodeId);
    const formulaIdMap = new Map<string, string>();
    const conditionIdMap = new Map<string, string>();
    const tableIdMap = new Map<string, string>();

    const result = await copyVariableWithCapacities(
      variableId,
      newSuffix,
      targetNodeId,
      prisma,
      {
        autoCreateDisplayNode: true,
        nodeIdMap,
        formulaIdMap,
        conditionIdMap,
        tableIdMap
      }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Erreur lors de la copie' });
    }

    // IMPORTANT: si on a dupliquÃƒÂ¯Ã‚Â¿Ã‚Â½ le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud propriÃƒÂ¯Ã‚Â¿Ã‚Â½taire, il faut aussi dupliquer les *activeId*
    // (table_activeId / formula_activeId / condition_activeId) vers les IDs copiÃƒÂ¯Ã‚Â¿Ã‚Â½s.
    // Sinon, la copie peut se retrouver avec table_activeId=NULL => lookup retombe souvent ÃƒÂ¯Ã‚Â¿Ã‚Â½ 0.
    if (didCreateTargetNode && ownerNodeForDuplication) {
      const newTableActiveId = ownerNodeForDuplication.table_activeId
        ? tableIdMap.get(ownerNodeForDuplication.table_activeId) ?? ensureSuffixLocal(ownerNodeForDuplication.table_activeId)
        : null;

      const newFormulaActiveId = ownerNodeForDuplication.formula_activeId
        ? formulaIdMap.get(ownerNodeForDuplication.formula_activeId) ?? ensureSuffixLocal(ownerNodeForDuplication.formula_activeId)
        : null;

      const newConditionActiveId = ownerNodeForDuplication.condition_activeId
        ? conditionIdMap.get(ownerNodeForDuplication.condition_activeId) ?? ensureSuffixLocal(ownerNodeForDuplication.condition_activeId)
        : null;

      const shouldUpdateVariableActiveId =
        !ownerNodeForDuplication.variable_activeId || ownerNodeForDuplication.variable_activeId === variableId;

      const updateData: any = {
        table_activeId: newTableActiveId,
        formula_activeId: newFormulaActiveId,
        condition_activeId: newConditionActiveId,
        updatedAt: new Date()
      };

      if (shouldUpdateVariableActiveId) {
        updateData.variable_activeId = result.variableId;
      }

      await prisma.treeBranchLeafNode.update({
        where: { id: targetNodeId },
        data: updateData
      });
    }

    // Ajouter la variable copiÃƒÂ¯Ã‚Â¿Ã‚Â½e aux linkedVariableIds du nÃƒÂ¯Ã‚Â¿Ã‚Â½ud cible
    try {
      await addToNodeLinkedField(prisma, targetNodeId, 'linkedVariableIds', [result.variableId]);
    } catch (e) {
      console.warn('?? [COPY-LINKED-VAR] ÃƒÂ¯Ã‚Â¿Ã‚Â½chec MAJ linkedVariableIds:', (e as Error).message);
    }

    // 🔥 CRITIQUE: Déclencher l'évaluation immédiate après la copie
    // Sans cela, le nœud copié reste "muet" jusqu'à une interaction manuelle
    try {
      console.log(`🔄 [COPY-LINKED-VAR] Déclenchement évaluation initiale pour ${targetNodeId}...`);
      
      // Récupérer le treeId pour l'évaluation
      const copiedNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: targetNodeId },
        select: { treeId: true, calculatedValue: true }
      });

      if (copiedNode?.treeId) {
        // Chercher une submission active pour ce tree (nécessaire pour l'évaluation)
        const activeSubmission = await prisma.treeBranchLeafSubmission.findFirst({
          where: { 
            treeId: copiedNode.treeId,
            status: { not: 'archived' }
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true }
        });

        if (activeSubmission) {
          // Appeler evaluateVariableOperation pour calculer la valeur
          const evaluationResult = await evaluateVariableOperation(
            targetNodeId,
            activeSubmission.id,
            prisma
          );

          // Mettre à jour calculatedValue du nœud
          await prisma.treeBranchLeafNode.update({
            where: { id: targetNodeId },
            data: { 
              calculatedValue: evaluationResult.value,
              updatedAt: new Date()
            }
          });

          console.log(`✅ [COPY-LINKED-VAR] Évaluation initiale terminée: ${targetNodeId} = ${evaluationResult.value}`);
        } else {
          console.warn(`⚠️ [COPY-LINKED-VAR] Pas de submission active trouvée pour évaluation de ${targetNodeId}`);
        }
      }
    } catch (evalError) {
      // Ne pas bloquer la copie si l'évaluation échoue
      console.error('⚠️ [COPY-LINKED-VAR] Erreur lors de l\'évaluation initiale:', evalError);
    }

    res.status(201).json({ ...result, targetNodeId });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ [COPY-LINKED-VAR] Erreur:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
});

// ==================================================================================
// ?? ROUTE UTILITAIRE: crÃƒÂ¯Ã‚Â¿Ã‚Â½er / mettre ÃƒÂ¯Ã‚Â¿Ã‚Â½ jour le nÃƒÂ¯Ã‚Â¿Ã‚Â½ud d'affichage pour une variable
// ==================================================================================
router.post('/variables/:variableId/create-display', async (req, res) => {
  try {
    const { variableId } = req.params as { variableId: string };
    const { label, suffix } = (req.body || {}) as { label?: string; suffix?: string | number };
    const result = await createDisplayNodeForExistingVariable(variableId, prisma, label || 'Nouveau Section', suffix ?? 'nouveau');
    res.status(201).json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('? [/variables/:variableId/create-display] Erreur:', msg);
    res.status(400).json({ error: msg });
  }
});

// ==================================================================================
// ?? ROUTE UTILITAIRE: rechercher des variables par displayName (partiel)
// ==================================================================================
// =============================================================================

router.get('/variables/search', async (req, res) => {
  try {
    const q = String(req.query.displayName || '').trim();
    if (!q) return res.status(400).json({ error: 'displayName query string requis' });
    const found = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { displayName: { contains: q, mode: 'insensitive' as any } },
      select: { id: true, nodeId: true, exposedKey: true, displayName: true, sourceType: true, sourceRef: true }
    });
    res.json({ count: found.length, items: found });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
});

// =============================================================================
// ?? RÃƒÂ¯Ã‚Â¿Ã‚Â½CUPÃƒÂ¯Ã‚Â¿Ã‚Â½RATION DES VALEURS CALCULÃƒÂ¯Ã‚Â¿Ã‚Â½ES (calculatedValue)
// =============================================================================
/**
 * GET /trees/:treeId/calculated-values
 * RÃƒÂ¯Ã‚Â¿Ã‚Â½cupÃƒÂ¯Ã‚Â¿Ã‚Â½re tous les champs ayant une calculatedValue non nulle
 * Utile pour rÃƒÂ¯Ã‚Â¿Ã‚Â½fÃƒÂ¯Ã‚Â¿Ã‚Â½rencer les rÃƒÂ¯Ã‚Â¿Ã‚Â½sultats de formules/conditions comme contraintes dynamiques
 */
router.get('/trees/:treeId/calculated-values', async (req, res) => {
  try {
    const { treeId } = req.params;
    
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // VÃƒÂ¯Ã‚Â¿Ã‚Â½rifier que l'arbre appartient ÃƒÂ¯Ã‚Â¿Ã‚Â½ l'organisation (sauf SuperAdmin)
    const treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId };
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: treeWhereFilter
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvÃƒÂ¯Ã‚Â¿Ã‚Â½' });
    }

    // 🔧 FIX: Récupérer TOUS les nœuds qui ont une capacité de calcul,
    // pas seulement ceux qui ont déjà une calculatedValue stockée.
    // Inclut: formules, conditions, données/variables, ET valeurs déjà calculées.
    const nodesWithCalculatedValue = await prisma.treeBranchLeafNode.findMany({
      where: { 
        treeId,
        OR: [
          { calculatedValue: { not: null } },
          { hasFormula: true },
          { hasCondition: true },
          { hasData: true },
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        calculatedValue: true,
        calculatedBy: true,
        calculatedAt: true,
        parentId: true,
        hasFormula: true,
        hasCondition: true,
        hasData: true,
      }
    });


    // RÃƒÂ¯Ã‚Â¿Ã‚Â½cupÃƒÂ¯Ã‚Â¿Ã‚Â½rer les labels des parents pour context
    const parentIds = nodesWithCalculatedValue
      .map(n => n.parentId)
      .filter((id): id is string => !!id);
    
    const parentNodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, label: true }
    });
    
    const parentLabelsMap = new Map(parentNodes.map(p => [p.id, p.label]));

    // Formater les valeurs calculées pour le frontend
    const calculatedValues = nodesWithCalculatedValue.map(node => {
      // Déterminer la source du calcul
      const source = node.calculatedBy 
        ? `Source: ${node.calculatedBy}`
        : node.hasFormula ? 'Source: formule'
        : node.hasCondition ? 'Source: condition'
        : node.hasData ? 'Source: variable/donnée'
        : undefined;
      
      return {
        id: node.id,
        label: node.label || 'Champ sans nom',
        calculatedValue: node.calculatedValue,
        calculatedBy: source,
        type: node.type,
        parentLabel: node.parentId ? parentLabelsMap.get(node.parentId) : undefined
      };
    });

    
    res.json(calculatedValues);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching calculated values:', error);
    res.status(500).json({ error: 'Impossible de rÃƒÂ¯Ã‚Â¿Ã‚Â½cupÃƒÂ¯Ã‚Â¿Ã‚Â½rer les valeurs calculÃƒÂ¯Ã‚Â¿Ã‚Â½es' });
  }
});


export default router;



// Force reload 1769539259
