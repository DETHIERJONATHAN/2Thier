#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyseElectriciteSectionDonnees() {
  console.log('🔍 === ANALYSE APPROFONDIE SECTION DONNÉES ÉLECTRICITÉ ===\n');

  try {
    // 1. Trouver l'arbre Électricité
    const electriciteTree = await prisma.treeBranchLeafTree.findFirst({
      where: { name: { contains: 'Électricité' } }
    });

    if (!electriciteTree) {
      console.log('❌ Aucun arbre Électricité trouvé');
      return;
    }

    console.log(`🌳 Arbre trouvé: "${electriciteTree.name}" (ID: ${electriciteTree.id})\n`);

    // 2. Récupérer TOUS les nœuds de cet arbre
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: electriciteTree.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    console.log(`📊 Total nœuds dans l'arbre: ${allNodes.length}\n`);

    // 3. Analyser la hiérarchie complète
    console.log('🏗️ === STRUCTURE HIÉRARCHIQUE COMPLÈTE ===');
    const nodeMap = new Map(allNodes.map(node => [node.id, node]));
    const childrenMap = new Map();

    // Construire la map des enfants
    allNodes.forEach(node => {
      if (node.parentId) {
        if (!childrenMap.has(node.parentId)) {
          childrenMap.set(node.parentId, []);
        }
        childrenMap.get(node.parentId).push(node);
      }
    });

    // Fonction récursive pour afficher la hiérarchie
    function displayHierarchy(nodeId, level = 0) {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const indent = '  '.repeat(level);
      const typeIcon = {
        'root': '🌳',
        'branch': '🌿', 
        'section': '📦',
        'leaf_field': '🔗',
        'leaf_option': '⚪',
        'leaf_option_field': '🔘'
      }[node.type] || '❓';

      console.log(`${indent}${typeIcon} ${node.label} (${node.type}) [ID: ${node.id}]`);

      // Si c'est la section "Données", analyser en détail
      if (node.label === 'Données' || node.title === 'Données') {
        console.log(`${indent}  🎯 === SECTION DONNÉES TROUVÉE ===`);
        console.log(`${indent}  📝 Type: ${node.type}`);
        console.log(`${indent}  📝 Title: ${node.title}`);
        console.log(`${indent}  📝 Label: ${node.label}`);
        console.log(`${indent}  📝 Description: ${node.description || 'Aucune'}`);
        console.log(`${indent}  📝 Parent ID: ${node.parentId}`);
        console.log(`${indent}  📝 Order: ${node.order}`);
        
        // Analyser ses enfants (les champs)
        const children = childrenMap.get(node.id) || [];
        console.log(`${indent}  📊 Nombre d'enfants: ${children.length}`);
        
        children.forEach((child, index) => {
          console.log(`${indent}    🔗 Champ ${index + 1}: "${child.label}" (${child.type})`);
          console.log(`${indent}      📝 TBL Field Name: ${child.tblFieldName || 'Non défini'}`);
          console.log(`${indent}      📝 Configuration: ${child.configuration ? JSON.stringify(child.configuration, null, 2).replace(/\n/g, `\n${indent}      `) : 'Aucune'}`);
        });
      }

      // Continuer récursivement
      const children = childrenMap.get(nodeId) || [];
      children.sort((a, b) => a.order - b.order);
      children.forEach(child => displayHierarchy(child.id, level + 1));
    }

    // Trouver la racine
    const rootNode = allNodes.find(node => node.type === 'root');
    if (rootNode) {
      displayHierarchy(rootNode.id);
    }

    // 4. Analyser spécifiquement comment la section "Données" est traitée
    console.log('\n🎯 === ANALYSE SPÉCIFIQUE SECTION DONNÉES ===');
    const sectionDonnees = allNodes.find(node => 
      node.label === 'Données' || node.title === 'Données'
    );

    if (sectionDonnees) {
      console.log(`✅ Section trouvée: "${sectionDonnees.label}"`);
      console.log(`📝 Type: ${sectionDonnees.type}`);
      console.log(`📝 Est-ce une section? ${sectionDonnees.type === 'section' ? 'OUI' : 'NON'}`);
      
      // Ses champs
      const champsSection = allNodes.filter(node => node.parentId === sectionDonnees.id);
      console.log(`📊 Champs dans cette section: ${champsSection.length}`);
      
      champsSection.forEach((champ, index) => {
        console.log(`  🔗 ${index + 1}. "${champ.label}" (${champ.type})`);
        console.log(`      📝 TBL Field: ${champ.tblFieldName || 'Non défini'}`);
        if (champ.configuration) {
          console.log(`      ⚙️ Config: ${JSON.stringify(champ.configuration, null, 2).replace(/\n/g, '\n      ')}`);
        }
      });

      // 5. Vérifier comment elle est détectée comme "section données"
      console.log('\n🔍 === CRITÈRES DE DÉTECTION SECTION DONNÉES ===');
      console.log(`✓ Titre contient "Données": ${(sectionDonnees.title || sectionDonnees.label).includes('Données')}`);
      console.log(`✓ Type est "section": ${sectionDonnees.type === 'section'}`);
      console.log(`✓ Label exact "Données": ${sectionDonnees.label === 'Données'}`);
    } else {
      console.log('❌ Aucune section "Données" trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyseElectriciteSectionDonnees();