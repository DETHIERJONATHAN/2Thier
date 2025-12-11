/**
 * 🔴 DIAGNOSTIC SPÉCIFIQUE - Pourquoi les calculs ne fonctionnent pas
 * 
 * Ce script teste la chaîne complète:
 * 1. Formules existent
 * 2. Variables liées à la formule existent
 * 3. Les opérations sont valides
 * 4. Les mappages sont corrects après copie
 * 5. Le calcul peut être évalué
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simuler un système de calcul simple pour tester
function evaluateFormula(operation, variables) {
  if (!operation) return null;
  
  let expr = operation;
  
  // Remplacer les noms de variables par leurs valeurs
  for (const [name, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    expr = expr.replace(regex, value);
  }

  try {
    // Utiliser Function au lieu de eval (un peu plus sûr)
    const result = Function(`'use strict'; return (${expr})`)();
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(18) + '🔴 DIAGNOSTIC: CALCULS NE SE FONT PAS' + ' '.repeat(22) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  try {
    // 1️⃣ Trouver le nœud "Rampant toiture"
    const rampantNode = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'Rampant toiture' } }
    });

    if (!rampantNode) {
      console.log('❌ Nœud "Rampant toiture" non trouvé');
      return;
    }

    console.log(`📍 Nœud: ${rampantNode.label} (${rampantNode.id})\n`);

    // 2️⃣ Récupérer toutes les formules du nœud
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: rampantNode.id }
    });

    console.log(`📐 Trouvé ${formulas.length} formules\n`);
    console.log('─'.repeat(80));

    for (const formula of formulas) {
      console.log(`\n🔍 DIAGNOSTIC FORMULE: ${formula.name || '(sans nom)'}`);
      console.log(`   ID: ${formula.id}`);
      console.log(`   Opération: "${formula.operation}"`);
      
      // 3️⃣ Vérifier l'opération
      const checks = {
        opExists: !!formula.operation && formula.operation.trim() !== '',
        opLength: formula.operation?.length || 0,
        hasVariables: formula.linkedVariableIds && formula.linkedVariableIds.length > 0,
        variableCount: formula.linkedVariableIds?.length || 0,
        linkedVarIds: formula.linkedVariableIds || []
      };

      console.log(`\n   ✅ VÉRIFICATIONS:`);
      console.log(`      • Opération existe: ${checks.opExists ? '✅ OUI' : '❌ NON'}`);
      if (checks.opExists) {
        console.log(`      • Longueur: ${checks.opLength} caractères`);
      }
      console.log(`      • Variables liées: ${checks.hasVariables ? '✅ OUI' : '❌ NON'} (${checks.variableCount})`);

      // 4️⃣ Vérifier les variables liées
      if (checks.hasVariables) {
        console.log(`\n   📋 VARIABLES LIÉES:`);
        const variables = {};
        let allVarsExist = true;

        for (const varId of checks.linkedVarIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId }
          });

          if (!variable) {
            console.log(`      ❌ ${varId} → N'EXISTE PAS!`);
            allVarsExist = false;
          } else {
            console.log(`      ✅ ${variable.exposedKey} (ID: ${varId})`);
            console.log(`         value: "${variable.value}"`);
            console.log(`         type: ${variable.type}`);
            variables[variable.exposedKey] = variable.value;
          }
        }

        // 5️⃣ Tenter d'évaluer la formule
        if (allVarsExist && Object.keys(variables).length > 0) {
          console.log(`\n   🧮 ÉVALUATION DE LA FORMULE:`);
          console.log(`      Variables: ${JSON.stringify(variables)}`);
          console.log(`      Opération: ${formula.operation}`);

          const result = evaluateFormula(formula.operation, variables);
          if (result?.error) {
            console.log(`      ❌ ERREUR: ${result.error}`);
            console.log(`         La formule contient une erreur syntaxique!`);
          } else {
            console.log(`      ✅ RÉSULTAT: ${result}`);
          }
        } else if (!allVarsExist) {
          console.log(`\n   ❌ PROBLÈME: Certaines variables n'existent pas!`);
        }
      } else {
        console.log(`\n   ❌ PROBLÈME: Aucune variable liée!`);
        console.log(`      La formule ne peut pas être calculée sans variables.`);
      }

      console.log(`\n` + '─'.repeat(80));
    }

    // 6️⃣ Analyser les COPIES
    console.log(`\n\n📋 ANALYSE DES COPIES\n`);
    console.log('─'.repeat(80));

    const copiedNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['copiedFromNodeId'],
          equals: rampantNode.id
        }
      }
    });

    console.log(`\nTrouvé ${copiedNodes.length} copies du nœud\n`);

    for (const copiedNode of copiedNodes) {
      console.log(`\n📌 COPIE: ${copiedNode.label} (${copiedNode.id})`);

      // Récupérer les formules copiées
      const copiedFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: copiedNode.id }
      });

      console.log(`   📐 ${copiedFormulas.length} formules\n`);

      for (const copiedFormula of copiedFormulas) {
        console.log(`   🔍 Formule: ${copiedFormula.name || '(sans nom)'}`);
        console.log(`      ID: ${copiedFormula.id}`);
        console.log(`      Opération: "${copiedFormula.operation}"`);
        console.log(`      Variables liées: ${copiedFormula.linkedVariableIds?.length || 0}`);

        // Vérifier les variables
        if (copiedFormula.linkedVariableIds && copiedFormula.linkedVariableIds.length > 0) {
          console.log(`\n      📋 Vérification des variables liées:`);
          for (const varId of copiedFormula.linkedVariableIds) {
            const exists = await prisma.treeBranchLeafNodeVariable.findUnique({
              where: { id: varId }
            });

            if (!exists) {
              console.log(`         ❌ ${varId} → N'EXISTE PAS!`);
            } else {
              console.log(`         ✅ ${exists.exposedKey}`);
            }
          }
        }

        console.log('');
      }
    }

    // 7️⃣ RAPPORT FINAL
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 RAPPORT FINAL');
    console.log('═'.repeat(80) + '\n');

    const issues = [];

    // Vérifier si les formules ont des opérations vides
    const emptyOpFormulas = formulas.filter(f => !f.operation || f.operation.trim() === '');
    if (emptyOpFormulas.length > 0) {
      issues.push(`🔴 ${emptyOpFormulas.length} formule(s) ont une opération VIDE`);
    }

    // Vérifier si les formules n'ont pas de variables liées
    const noVarFormulas = formulas.filter(f => !f.linkedVariableIds || f.linkedVariableIds.length === 0);
    if (noVarFormulas.length > 0) {
      issues.push(`🔴 ${noVarFormulas.length} formule(s) n'ont AUCUNE VARIABLE LIÉE`);
    }

    // Vérifier les variables cassées
    for (const formula of formulas) {
      if (formula.linkedVariableIds && formula.linkedVariableIds.length > 0) {
        for (const varId of formula.linkedVariableIds) {
          const exists = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId }
          });
          if (!exists) {
            issues.push(`🔴 Variable liée ${varId} n'existe pas`);
            break;
          }
        }
      }
    }

    if (issues.length === 0) {
      console.log('✅ Aucun problème majeur détecté dans les formules originales\n');
    } else {
      console.log('❌ PROBLÈMES DÉTECTÉS:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('DIAGNOSTIC TERMINÉ');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('ERREUR CRITIQUE:', error);
  process.exit(1);
});
