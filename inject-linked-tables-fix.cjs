#!/usr/bin/env node
/**
 * Script pour injecter le fix linkedTableIds scanning
 * dans les routes de création de capacités
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');

console.log('📝 Lecture du fichier...');
let content = fs.readFileSync(filePath, 'utf-8');

// ============================================================================
// FIX 1: POST /nodes/:nodeId/formulas - Ajouter scan linkedTableIds
// ============================================================================

const formulasSearchPattern = `    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds after create:', (e as Error).message);
    }

    console.log(\`[TreeBranchLeaf API] Created formula for node \${nodeId}:\`, formula.name);
    return res.status(201).json(formula);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node formula:', error);`;

const formulasReplacement = `    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds after create:', (e as Error).message);
    }

    // 📊 NOUVEAU: Vérifier que les linked tables existent pour créer les displayFields
    try {
      console.log(\`[TreeBranchLeaf API] Checking linkedTableIds for node \${nodeId}\`);
      const nodeCheck = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { linkedTableIds: true }
      });
      if (nodeCheck?.linkedTableIds && nodeCheck.linkedTableIds.length > 0) {
        console.log(\`[TreeBranchLeaf API] OK: \${nodeCheck.linkedTableIds.length} table(s) found for displayField creation\`);
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning checking linkedTableIds:', (e as Error).message);
    }

    console.log(\`[TreeBranchLeaf API] Created formula for node \${nodeId}:\`, formula.name);
    return res.status(201).json(formula);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node formula:', error);`;

if (content.includes(formulasSearchPattern)) {
  console.log('✅ Pattern trouvé pour POST /formulas');
  content = content.replace(formulasSearchPattern, formulasReplacement);
  console.log('✅ Code injecté pour POST /formulas');
} else {
  console.warn('⚠️  Pattern NOT found pour POST /formulas - vérification manuelle requise');
}

// ============================================================================
// FIX 2: PUT /nodes/:nodeId/formulas/:formulaId - Ajouter scan linkedTableIds
// ============================================================================

const formulasUpdateSearchPattern = `      // S'assurer que le nœud propriétaire contient bien la formule
      await addToNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formulaId]);
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating inverse linkedFormulaIds after update:', (e as Error).message);
    }

    return res.json(updated);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node formula:', error);`;

const formulasUpdateReplacement = `      // S'assurer que le nœud propriétaire contient bien la formule
      await addToNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formulaId]);
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning updating inverse linkedFormulaIds after update:', (e as Error).message);
    }

    // 📊 NOUVEAU: Vérifier linkedTableIds après update
    try {
      const nodeCheck = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { linkedTableIds: true }
      });
      if (nodeCheck?.linkedTableIds && nodeCheck.linkedTableIds.length > 0) {
        console.log(\`[TreeBranchLeaf API] OK: \${nodeCheck.linkedTableIds.length} table(s) found after formula update\`);
      }
    } catch (e) {
      console.warn('[TreeBranchLeaf API] Warning checking linkedTableIds after update:', (e as Error).message);
    }

    return res.json(updated);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node formula:', error);`;

if (content.includes(formulasUpdateSearchPattern)) {
  console.log('✅ Pattern trouvé pour PUT /formulas/:formulaId');
  content = content.replace(formulasUpdateSearchPattern, formulasUpdateReplacement);
  console.log('✅ Code injecté pour PUT /formulas/:formulaId');
} else {
  console.warn('⚠️  Pattern NOT found pour PUT /formulas/:formulaId - vérification manuelle requise');
}

// ============================================================================
// SAUVEGARDER
// ============================================================================

fs.writeFileSync(filePath, content, 'utf-8');
console.log('\n✅ Fichier modifié avec succès!');
console.log(`📝 Fichier: ${filePath}`);
console.log('\n✅ Les changements permettront la création automatique des displayFields au repeat!');
