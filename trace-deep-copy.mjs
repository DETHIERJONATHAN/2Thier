/**
 * 🔍 DIAGNOSTIC TRACE: Analyse pourquoi les display nodes ne sont pas créés
 * 
 * Ce script va:
 * 1. Simuler le parcours de deep-copy-service pour un template
 * 2. Voir ce que oldNode.linkedVariableIds contient réellement
 * 3. Tracer le flux exact
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Repeater Toit
const REPEATER_ID = 'd1d8810d-232b-46e0-a5dd-9ee889ad9fc0';

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 TRACE DEEP-COPY: Pourquoi les display nodes ne sont PAS créés?');
  console.log('='.repeat(80));

  // 1. Récupérer le repeater
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: REPEATER_ID }
  });

  if (!repeater) {
    console.log('❌ Repeater non trouvé');
    return;
  }

  // 2. Récupérer les templateNodeIds
  let templateNodeIds = [];
  if (repeater.repeater_templateNodeIds) {
    try {
      const raw = repeater.repeater_templateNodeIds;
      templateNodeIds = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.log('❌ Erreur parsing templateNodeIds:', e.message);
      return;
    }
  }

  console.log(`\n📋 ${templateNodeIds.length} templates dans le repeater`);

  // 3. Pour chaque template, analyser ce qui se passe lors de la copie
  for (const templateId of templateNodeIds) {
    const template = await prisma.treeBranchLeafNode.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      console.log(`\n⚠️ Template ${templateId} non trouvé`);
      continue;
    }

    const hasLinked = Array.isArray(template.linkedVariableIds) && template.linkedVariableIds.length > 0;
    
    if (!hasLinked) continue;

    console.log('\n' + '-'.repeat(60));
    console.log(`📌 Template: ${template.name || template.id}`);
    console.log(`   ID: ${templateId}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(template.linkedVariableIds)}`);

    // 4. Chercher la copie de ce template (suffixe -1)
    const copyId = `${templateId}-1`;
    const copy = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copyId }
    });

    if (!copy) {
      console.log(`   ❌ Copie ${copyId} NON trouvée!`);
      continue;
    }

    console.log(`\n   ✅ Copie trouvée: ${copy.name || copy.id}`);
    console.log(`      linkedVariableIds: ${JSON.stringify(copy.linkedVariableIds)}`);

    // 5. SIMULER ce que deep-copy-service fait
    console.log('\n   🔄 SIMULATION du code deep-copy-service:');
    
    // Code à simuler:
    // const sourceLinkedVariableIds = new Set<string>();
    // if (Array.isArray(oldNode.linkedVariableIds)) {
    //   for (const rawId of oldNode.linkedVariableIds) {
    //     const baseId = stripNumericSuffix(normalized);
    //     sourceLinkedVariableIds.add(baseId || normalized);
    //   }
    // }

    const oldNode = template; // Dans deep-copy, oldNode = le template original
    const sourceLinkedVariableIds = new Set();
    
    if (Array.isArray(oldNode.linkedVariableIds)) {
      console.log(`      oldNode.linkedVariableIds = ${JSON.stringify(oldNode.linkedVariableIds)}`);
      for (const rawId of oldNode.linkedVariableIds) {
        if (typeof rawId === 'string') {
          const normalized = rawId.trim();
          if (normalized) {
            // Simuler stripNumericSuffix
            const baseId = normalized.replace(/-\d+$/, '');
            sourceLinkedVariableIds.add(baseId || normalized);
            console.log(`         -> rawId "${normalized}" => baseId "${baseId}"`);
          }
        }
      }
    }

    console.log(`\n      sourceLinkedVariableIds.size = ${sourceLinkedVariableIds.size}`);
    console.log(`      Contenu: ${JSON.stringify([...sourceLinkedVariableIds])}`);

    // 6. Vérifier si la boucle est entrée
    if (sourceLinkedVariableIds.size > 0) {
      console.log('\n      ✅ Boucle copyVariableWithCapacities DEVRAIT être entrée');
      
      for (const linkedVarId of sourceLinkedVariableIds) {
        console.log(`\n      📍 Pour linkedVarId = "${linkedVarId}":`);
        
        // Vérifier si la variable source existe
        const sourceVar = await prisma.$queryRaw`
          SELECT id, name FROM "TreeBranchLeafNodeVariable" WHERE id = ${linkedVarId}
        `;
        
        if (sourceVar && sourceVar.length > 0) {
          console.log(`         ✅ Variable source existe: ${sourceVar[0].name || sourceVar[0].id}`);
        } else {
          console.log(`         ❌ Variable source N'EXISTE PAS!`);
        }

        // Vérifier si la copie de variable existe
        const varCopyId = `${linkedVarId}-1`;
        const varCopy = await prisma.$queryRaw`
          SELECT id, name FROM "TreeBranchLeafNodeVariable" WHERE id = ${varCopyId}
        `;
        
        if (varCopy && varCopy.length > 0) {
          console.log(`         ✅ Copie variable existe: ${varCopy[0].name || varCopy[0].id}`);
        } else {
          console.log(`         ❌ Copie variable N'EXISTE PAS: ${varCopyId}`);
        }

        // Vérifier si display node existe (parentId = copy)
        const displayNodes = await prisma.treeBranchLeafNode.findMany({
          where: {
            parentId: copyId,
            type: 'display'
          }
        });
        
        console.log(`         Display nodes (parentId=${copyId}): ${displayNodes.length}`);
        for (const dn of displayNodes) {
          console.log(`            - ${dn.name || dn.id}`);
        }
      }
    } else {
      console.log('\n      ❌ sourceLinkedVariableIds.size = 0, boucle NON entrée!');
    }
  }

  // 7. Vérifier les logs récents pour voir si copyVariableWithCapacities a été appelée
  console.log('\n' + '='.repeat(80));
  console.log('🔎 VÉRIFICATION DIRECTE: Appels copyVariableWithCapacities');
  console.log('='.repeat(80));

  // Chercher tous les display nodes créés récemment
  const recentDisplayNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      type: 'display',
      id: { contains: '-1' }
    },
    take: 10
  });

  console.log(`\nDisplay nodes avec ID contenant "-1": ${recentDisplayNodes.length}`);
  for (const dn of recentDisplayNodes) {
    console.log(`   - ${dn.id} (parent: ${dn.parentId})`);
  }

  // Chercher toutes les variables avec suffixe
  const variablesWithSuffix = await prisma.$queryRaw`
    SELECT id, name FROM "TreeBranchLeafNodeVariable" WHERE id LIKE '%-1%' LIMIT 10
  `;

  console.log(`\nVariables avec ID contenant "-1": ${variablesWithSuffix.length}`);
  for (const v of variablesWithSuffix) {
    console.log(`   - ${v.id} (name: ${v.name})`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(80));

  // Compter combien de templates ont linkedVariableIds
  let templatesWithLinked = 0;
  let totalLinkedVars = new Set();
  
  for (const tid of templateNodeIds) {
    const t = await prisma.treeBranchLeafNode.findUnique({ where: { id: tid } });
    if (t && Array.isArray(t.linkedVariableIds) && t.linkedVariableIds.length > 0) {
      templatesWithLinked++;
      for (const v of t.linkedVariableIds) {
        totalLinkedVars.add(v);
      }
    }
  }

  console.log(`\n   Templates avec linkedVariableIds: ${templatesWithLinked}`);
  console.log(`   Variables uniques référencées: ${totalLinkedVars.size}`);
  console.log(`   Display nodes "-1" trouvés: ${recentDisplayNodes.length}`);
  console.log(`   Variables "-1" trouvées: ${variablesWithSuffix.length}`);

  if (recentDisplayNodes.length === 0 && variablesWithSuffix.length === 0) {
    console.log('\n   ⚠️ AUCUN display node NI variable copié trouvé!');
    console.log('   💡 Hypothèse: copyVariableWithCapacities n\'est JAMAIS appelée');
    console.log('      OU retourne toujours success=false');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
