/**
 * 🚀 SCRIPT DE REMPLISSAGE RAPIDE DES CODES TBL
 * 
 * Script simple pour remplir les colonnes TBL des 70 éléments existants
 */

const { PrismaClient } = require('@prisma/client');

async function remplirCodesTBL() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Chargement des éléments sans codes TBL...');
    
    // Récupérer tous les éléments sans codes TBL
    const elements = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { tbl_code: null },
          { tbl_code: '' }
        ]
      },
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true, 
        TreeBranchLeafNodeTable: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 ${elements.length} éléments à migrer`);

    if (elements.length === 0) {
      console.log('✅ Tous les éléments ont déjà des codes TBL !');
      return;
    }

    console.log('\n🔍 ANALYSE DES CAPACITÉS DÉTECTÉES:');

    let compteur = 0;
    const codesUtilises = new Set();
    const statistiques = {
      formules: 0,
      conditions: 0,
      tableaux: 0,
      neutres: 0
    };

    for (const element of elements) {
      compteur++;
      
      // Détecter le type TBL basé sur le type TreeBranchLeaf
      let tblType = '1'; // Branche par défaut
      switch (element.type) {
        case 'section':
          tblType = '7'; // Section
          break;
        case 'leaf_field':
          tblType = '3'; // Champ
          break;
        case 'leaf_option':
          tblType = '4'; // Option
          break;
        case 'leaf_option_field':
          tblType = '5'; // Option+Champ
          break;
        case 'branch':
          tblType = element.parentId ? '2' : '1'; // Sous-branche ou branche
          break;
      }

      // 🎯 DÉTECTION DES CAPACITÉS - TEST RÉEL DES RELATIONS PRISMA
      let tblCapacity = '1'; // Neutre par défaut
      const capaciteDetails = [];

      // Vérifier formules (relation TreeBranchLeafNodeFormula)
      if (element.TreeBranchLeafNodeFormula && element.TreeBranchLeafNodeFormula.length > 0) {
        tblCapacity = '2';
        statistiques.formules++;
        capaciteDetails.push(`${element.TreeBranchLeafNodeFormula.length} formule(s)`);
        element.TreeBranchLeafNodeFormula.forEach((f, i) => {
          capaciteDetails.push(`  - Formule ${i+1}: "${f.name}"`);
        });
      }

      // Vérifier conditions (relation TreeBranchLeafNodeCondition)
      if (element.TreeBranchLeafNodeCondition && element.TreeBranchLeafNodeCondition.length > 0) {
        if (tblCapacity === '2') {
          capaciteDetails.push('⚠️ CONFLIT: Formule ET Condition détectées!');
        }
        tblCapacity = '3'; // Condition prioritaire
        statistiques.conditions++;
        capaciteDetails.push(`${element.TreeBranchLeafNodeCondition.length} condition(s)`);
        element.TreeBranchLeafNodeCondition.forEach((c, i) => {
          capaciteDetails.push(`  - Condition ${i+1}: "${c.name}"`);
        });
      }

      // Vérifier tableaux (relation TreeBranchLeafNodeTable)
      if (element.TreeBranchLeafNodeTable && element.TreeBranchLeafNodeTable.length > 0) {
        if (tblCapacity === '2' || tblCapacity === '3') {
          capaciteDetails.push('⚠️ CONFLIT: Tableau ET autre capacité détectées!');
        }
        tblCapacity = '4'; // Tableau prioritaire
        statistiques.tableaux++;
        capaciteDetails.push(`${element.TreeBranchLeafNodeTable.length} tableau(x)`);
        element.TreeBranchLeafNodeTable.forEach((t, i) => {
          capaciteDetails.push(`  - Tableau ${i+1}: "${t.name}" (type: ${t.type})`);
        });
      }

      // Si aucune capacité spéciale détectée
      if (tblCapacity === '1') {
        statistiques.neutres++;
        capaciteDetails.push('Neutre (aucune capacité spéciale)');
      }

      // FALLBACK: Analyser les champs JSON si pas de relations
      if (tblCapacity === '1') {
        // Vérifier formulaConfig
        if (element.formulaConfig) {
          try {
            const config = typeof element.formulaConfig === 'string' 
              ? JSON.parse(element.formulaConfig) 
              : element.formulaConfig;
            if (config && (config.activeId || config.formula || config.tokens)) {
              tblCapacity = '2';
              capaciteDetails.push('📋 Formule détectée via formulaConfig (fallback)');
            }
          } catch (e) {
            capaciteDetails.push('⚠️ Erreur parsing formulaConfig JSON');
          }
        }

        // Vérifier conditionConfig  
        if (element.conditionConfig && tblCapacity === '1') {
          try {
            const config = typeof element.conditionConfig === 'string' 
              ? JSON.parse(element.conditionConfig) 
              : element.conditionConfig;
            if (config && (config.activeId || config.condition || config.branches)) {
              tblCapacity = '3';
              capaciteDetails.push('📋 Condition détectée via conditionConfig (fallback)');
            }
          } catch (e) {
            capaciteDetails.push('⚠️ Erreur parsing conditionConfig JSON');
          }
        }

        // Vérifier tableConfig
        if (element.tableConfig && tblCapacity === '1') {
          try {
            const config = typeof element.tableConfig === 'string' 
              ? JSON.parse(element.tableConfig) 
              : element.tableConfig;
            if (config && (config.activeId || config.table || config.columns)) {
              tblCapacity = '4';
              capaciteDetails.push('📋 Tableau détecté via tableConfig (fallback)');
            }
          } catch (e) {
            capaciteDetails.push('⚠️ Erreur parsing tableConfig JSON');
          }
        }
      }

      // Générer le nom court basé sur le label
      const nomCourt = element.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
        .replace(/[^a-z0-9]/g, '-')      // Remplacer caractères spéciaux
        .replace(/-+/g, '-')             // Fusionner tirets consécutifs
        .replace(/^-|-$/g, '')           // Supprimer tirets début/fin
        .substring(0, 8);                // Limiter longueur

      // Créer le code TBL
      let tblCode = `${tblType}${tblCapacity}${nomCourt}`;
      
      // Résoudre les doublons
      let tentative = 1;
      let codeOriginal = tblCode;
      while (codesUtilises.has(tblCode)) {
        tblCode = `${codeOriginal}${tentative}`;
        tentative++;
      }
      codesUtilises.add(tblCode);

      // Afficher l'analyse détaillée
      const typeStr = ['?', 'Branche', 'Sous-branche', 'Champ', 'Option', 'Option+Champ', 'Données', 'Section'][parseInt(tblType)] || 'Inconnu';
      const capaciteStr = ['?', 'Neutre', 'Formule', 'Condition', 'Tableau'][parseInt(tblCapacity)] || 'Inconnu';
      
      console.log(`\n📋 ${compteur}/${elements.length} - "${element.label}"`);
      console.log(`   Type: ${element.type} → TBL Type ${tblType} (${typeStr})`);
      console.log(`   Capacité: ${tblCapacity} (${capaciteStr})`);
      console.log(`   Code TBL: ${tblCode}`);
      if (capaciteDetails.length > 0) {
        console.log(`   Détails:`);
        capaciteDetails.forEach(detail => console.log(`     ${detail}`));
      }

      // Mettre à jour l'élément
      await prisma.treeBranchLeafNode.update({
        where: { id: element.id },
        data: {
          tbl_code: tblCode,
          tbl_type: parseInt(tblType),
          tbl_capacity: parseInt(tblCapacity),
          tbl_auto_generated: true,
          tbl_created_at: new Date(),
          tbl_updated_at: new Date()
        }
      });
    }

    console.log(`\n🎉 MIGRATION TERMINÉE ! ${compteur} éléments migrés`);

    // Afficher les statistiques finales
    console.log('\n📊 STATISTIQUES DES CAPACITÉS DÉTECTÉES:');
    console.log(`🧮 Formules: ${statistiques.formules}`);
    console.log(`🔀 Conditions: ${statistiques.conditions}`);
    console.log(`📊 Tableaux: ${statistiques.tableaux}`);
    console.log(`🔹 Neutres: ${statistiques.neutres}`);

    // Afficher un résumé final par type et capacité
    const resume = await prisma.treeBranchLeafNode.groupBy({
      by: ['tbl_type', 'tbl_capacity'],
      _count: true,
      where: {
        tbl_code: { not: null }
      }
    });

    console.log('\n📊 RÉSUMÉ PAR TYPE ET CAPACITÉ:');
    resume.forEach(group => {
      const typeStr = ['?', 'Branche', 'Sous-branche', 'Champ', 'Option', 'Option+Champ', 'Données', 'Section'][group.tbl_type || 0];
      const capaciteStr = ['?', 'Neutre', 'Formule', 'Condition', 'Tableau'][group.tbl_capacity || 0];
      console.log(`  ${typeStr} - ${capaciteStr}: ${group._count} éléments`);
    });

  } catch (error) {
    console.error('❌ Erreur migration:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
remplirCodesTBL();