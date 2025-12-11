/**
 * 🕵️ SCRIPT DE TRAÇAGE DES APPELS - Fonction copyVariableWithCapacities
 * 
 * Trace CHAQUE appel à copyVariableWithCapacities et enregistre:
 * - Les paramètres d'entrée
 * - Les étapes intermédiaires
 * - Les résultats finaux
 * 
 * Utile pour comprendre pourquoi les capacités ne sont pas copiées
 */

const fs = require('fs');
const path = require('path');

// Fichier de trace
const traceFile = path.join(__dirname, '../logs/copy-trace-' + Date.now() + '.log');
const logDir = path.dirname(traceFile);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function trace(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}`;
  console.log(fullMessage);
  fs.appendFileSync(traceFile, fullMessage + '\n');
}

// Intercepter les console.log du module copy-variable-with-capacities
const originalLog = console.log;
console.log = function(...args) {
  // Rediriger TOUS les logs vers notre fichier de trace
  if (args[0] && typeof args[0] === 'string') {
    trace(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  }
  // Garder l'affichage en console
  originalLog.apply(console, args);
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  trace('═'.repeat(80));
  trace('🕵️ DÉMARRAGE DU TRAÇAGE DE copyVariableWithCapacities');
  trace('═'.repeat(80));

  try {
    // Trouver le nœud "Rampant toiture" original
    const originalNode = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Rampant toiture' }
    });

    if (!originalNode) {
      trace('❌ Nœud original non trouvé');
      return;
    }

    trace(`\n✅ Nœud original trouvé: ${originalNode.id}`);

    // Trouver les variables
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: originalNode.id }
    });

    trace(`\nTrouvé ${variables.length} variables à analyser`);

    // Simuler la copie de chaque variable
    for (const variable of variables) {
      trace(`\n${'─'.repeat(80)}`);
      trace(`🔍 ANALYSE DE LA VARIABLE: ${variable.exposedKey}`);
      trace(`   ID: ${variable.id}`);
      trace(`   sourceType: ${variable.sourceType}`);
      trace(`   sourceRef: ${variable.sourceRef}`);
      trace(`   value: ${variable.value}`);

      // Analyser le sourceRef
      if (variable.sourceRef) {
        const parts = variable.sourceRef.split(':');
        const isFormula = variable.sourceRef.includes('node-formula:');
        const isCondition = variable.sourceRef.includes('condition:') || variable.sourceRef.includes('node-condition:');
        const isTable = variable.sourceRef.includes('@table.') || variable.sourceRef.includes('node-table:');

        trace(`   📊 Type détecté:`);
        if (isFormula) trace(`      → Formule (préfixe: node-formula:)`);
        if (isCondition) trace(`      → Condition`);
        if (isTable) trace(`      → Table`);
        if (!isFormula && !isCondition && !isTable) {
          trace(`      → Champ/Field (UUID simple)`);
        }

        // Extraire l'ID
        let id = variable.sourceRef;
        if (isFormula) id = variable.sourceRef.replace('node-formula:', '');
        else if (isCondition && variable.sourceRef.includes('condition:')) id = variable.sourceRef.replace('condition:', '');
        else if (isCondition && variable.sourceRef.includes('node-condition:')) id = variable.sourceRef.replace('node-condition:', '');
        else if (isTable && variable.sourceRef.includes('@table.')) id = variable.sourceRef.replace('@table.', '');
        else if (isTable && variable.sourceRef.includes('node-table:')) id = variable.sourceRef.replace('node-table:', '');

        trace(`   🆔 ID extrait: ${id}`);

        // Vérifier si la capacité existe
        if (isFormula) {
          const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
            where: { id }
          });
          if (!formula) {
            trace(`   ❌ ERREUR: Formule ${id} N'EXISTE PAS!`);
          } else {
            trace(`   ✅ Formule trouvée: ${formula.name || '(sans nom)'}`);
            trace(`      operation: ${formula.operation}`);
          }
        } else if (isCondition) {
          const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
            where: { id }
          });
          if (!condition) {
            trace(`   ❌ ERREUR: Condition ${id} N'EXISTE PAS!`);
          } else {
            trace(`   ✅ Condition trouvée: ${condition.name || '(sans nom)'}`);
            trace(`      condition: ${condition.condition}`);
          }
        } else if (isTable) {
          const table = await prisma.treeBranchLeafNodeTable.findUnique({
            where: { id }
          });
          if (!table) {
            trace(`   ❌ ERREUR: Table ${id} N'EXISTE PAS!`);
          } else {
            trace(`   ✅ Table trouvée: ${table.name || '(sans nom)'}`);
          }
        }
      }
    }

    // Analyser les formules du nœud
    trace(`\n${'═'.repeat(80)}`);
    trace(`📐 ANALYSE DES FORMULES`);
    trace(`${'═'.repeat(80)}`);

    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: originalNode.id }
    });

    for (const formula of formulas) {
      trace(`\n🔍 FORMULE: ${formula.name || '(sans nom)'}`);
      trace(`   ID: ${formula.id}`);
      trace(`   operation: ${formula.operation}`);
      trace(`   linkedVariableIds: ${JSON.stringify(formula.linkedVariableIds)}`);

      if (!formula.operation) {
        trace(`   ❌ PROBLÈME: Opération vide!`);
      }

      if (formula.linkedVariableIds && formula.linkedVariableIds.length > 0) {
        trace(`   🔗 Variables liées:`);
        for (const varId of formula.linkedVariableIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId }
          });
          if (!variable) {
            trace(`      ❌ Variable ${varId} N'EXISTE PAS!`);
          } else {
            trace(`      ✅ ${variable.exposedKey}`);
          }
        }
      }
    }

    trace(`\n${'═'.repeat(80)}`);
    trace('✅ TRAÇAGE TERMINÉ');
    trace('Fichier de trace: ' + traceFile);
    trace(`${'═'.repeat(80)}\n`);

  } catch (error) {
    trace('❌ ERREUR: ' + error.message);
    trace(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  trace('ERREUR CRITIQUE: ' + error.message);
  process.exit(1);
});
