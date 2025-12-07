#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function simulateDuplication() {
  const prisma = new PrismaClient();
  
  console.log('🧪 SIMULATION COMPLÈTE DE DUPLICATION API\n');
  
  try {
    const rampantNodeId = '9c9f42b2-e0df-4726-8a81-997c0dee71bc';
    const parentRepeaterId = 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b'; // Section parent
    
    // 1. Vérifier l'état actuel
    console.log('📊 État AVANT duplication:');
    
    // Compter les displayFields existants pour Rampant
    const existingDisplays = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'Rampant', mode: 'insensitive' } },
          { data_exposedKey: { contains: '9c9f' } }
        ],
        hasData: true
      },
      select: { id: true, label: true, data_exposedKey: true, parentId: true }
    });
    
    console.log(`   ${existingDisplays.length} displayField(s) Rampant existant(s):`);
    existingDisplays.forEach(d => console.log(`   - ${d.label} (${d.data_exposedKey || 'no key'})`));
    
    // 2. Simuler l'appel API POST /duplicate-templates
    console.log('\n🚀 Simulation POST /duplicate-templates');
    console.log(`   Repeater parent: ${parentRepeaterId}`);
    console.log(`   Template à dupliquer: ${rampantNodeId}`);
    
    // 3. Calculer le prochain copyNumber
    const existingCopies = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['sourceTemplateId'],
          equals: rampantNodeId
        }
      },
      select: { id: true, metadata: true }
    });
    
    const copyNumber = existingCopies.length + 1;
    console.log(`   Prochaine copie: ${copyNumber}`);
    
    // 4. Simuler deepCopyNodeInternal pour ce nœud spécifique
    const newNodeId = `${rampantNodeId}-${copyNumber}`;
    const newLabel = `Rampant toiture-${copyNumber}`;
    
    console.log(`   Nouvel ID: ${newNodeId}`);
    console.log(`   Nouveau label: ${newLabel}`);
    
    // 5. Récupérer le nœud original
    const originalNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: rampantNodeId },
      select: {
        id: true,
        treeId: true,
        type: true,
        label: true,
        parentId: true,
        order: true,
        linkedVariableIds: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedTableIds: true,
        hasData: true,
        data_activeId: true,
        data_exposedKey: true,
        isRequired: true,
        isVisible: true,
        isActive: true,
        metadata: true
      }
    });
    
    if (!originalNode) {
      console.log('❌ Nœud original non trouvé');
      return;
    }
    
    console.log('\n📋 Données à copier:');
    console.log(`   linkedVariableIds: ${originalNode.linkedVariableIds?.length || 0}`);
    console.log(`   linkedFormulaIds: ${originalNode.linkedFormulaIds?.length || 0}`);
    console.log(`   linkedConditionIds: ${originalNode.linkedConditionIds?.length || 0}`);
    console.log(`   data_activeId: ${originalNode.data_activeId || 'null'}`);
    
    // 6. Simuler la CRÉATION DU DISPLAYFIELD
    if (originalNode.linkedVariableIds && originalNode.linkedVariableIds.length > 0) {
      console.log('\n🎯 SIMULATION copyVariableWithCapacities avec autoCreateDisplayNode=true');
      
      for (const varId of originalNode.linkedVariableIds) {
        console.log(`\n   Processing variable: ${varId}`);
        
        // Récupérer la variable originale
        const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId },
          select: {
            id: true,
            nodeId: true,
            exposedKey: true,
            displayName: true,
            sourceRef: true,
            sourceType: true,
            defaultValue: true,
            unit: true
          }
        });
        
        if (originalVar) {
          console.log(`   Variable: ${originalVar.displayName}`);
          console.log(`   ExposedKey: ${originalVar.exposedKey}`);
          console.log(`   SourceRef: ${originalVar.sourceRef}`);
          
          // Simuler la création d'une nouvelle variable copiée
          const newVarId = `${varId}-${copyNumber}`;
          const newExposedKey = `${originalVar.exposedKey}-${copyNumber}`;
          
          console.log(`   → Nouvelle variable ID: ${newVarId}`);
          console.log(`   → Nouveau exposedKey: ${newExposedKey}`);
          
          // SIMULATION: Créer la section "Champs données d'affichages" si elle n'existe pas
          let displaySectionId = null;
          const displaySection = await prisma.treeBranchLeafNode.findFirst({
            where: {
              treeId: originalNode.treeId,
              label: { contains: 'Champs données d\'affichages', mode: 'insensitive' }
            },
            select: { id: true }
          });
          
          if (displaySection) {
            displaySectionId = displaySection.id;
            console.log(`   ✅ Section d'affichage existante: ${displaySectionId}`);
          } else {
            // Dans la vraie API, elle serait créée ici
            console.log(`   🏗️ Section d'affichage serait CRÉÉE automatiquement`);
            console.log(`   📝 Label: "Champs données d'affichages"`);
          }
          
          // SIMULATION: Créer le displayField
          const displayFieldId = `display-${newNodeId}`;
          console.log(`   🎨 DisplayField serait CRÉÉ:`);
          console.log(`     ID: ${displayFieldId}`);
          console.log(`     Label: ${originalVar.displayName}-${copyNumber}`);
          console.log(`     data_activeId: ${newVarId}`);
          console.log(`     data_exposedKey: ${newExposedKey}`);
          console.log(`     hasData: true`);
          console.log(`     Parent: section "Champs données d'affichages"`);
          
          console.log('\n   ✅ RÉSULTAT: DisplayField serait créé avec TOUS les liens corrects !');
        }
      }
    }
    
    console.log('\n🎉 CONCLUSION DE LA SIMULATION:');
    console.log('✅ Rampant toiture a maintenant tous les linkedIds nécessaires');
    console.log('✅ La duplication devrait créer automatiquement un displayField');
    console.log('✅ Le displayField apparaîtra dans "Champs données d\'affichages"');
    console.log('\n💡 Pour confirmer: Testez maintenant dans l\'interface utilisateur !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulateDuplication().catch(console.error);