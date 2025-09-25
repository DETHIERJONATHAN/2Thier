const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyserElectriciteStructure() {
  console.log('🔍 ANALYSE COMPLÈTE DE LA STRUCTURE ELECTRICITÉ');
  console.log('===============================================\n');

  try {
    // 1. Trouver tous les nœuds de l'arbre TreeBranchLeaf
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId: 'cmf1mwoz10005gooked1j6orn' // ID de l'arbre depuis les logs
      },
      orderBy: [
        { parentId: 'asc' },
        { order: 'asc' }
      ]
    });

    console.log(`📊 Total nœuds trouvés: ${allNodes.length}\n`);

    // 2. Construire la hiérarchie
    const rootNodes = allNodes.filter(n => n.parentId === null);
    const buildHierarchy = (parentId, level = 0) => {
      const children = allNodes.filter(n => n.parentId === parentId);
      return children.map(child => {
        const indent = '  '.repeat(level);
        console.log(`${indent}${level === 0 ? '🌲' : level === 1 ? '📁' : '📄'} [${child.type}] ${child.label} (ID: ${child.id.slice(-8)}...)`);
        
        // Afficher les détails spécifiques
        if (child.type === 'section') {
          console.log(`${indent}   └─ 📋 SECTION - Peut contenir des champs données`);
        }
        if (child.fieldType) {
          console.log(`${indent}   └─ 🎯 fieldType: ${child.fieldType}`);
        }
        if (child.hasData) {
          console.log(`${indent}   └─ 💾 hasData: ${child.hasData}`);
        }
        if (child.hasFormula) {
          console.log(`${indent}   └─ 🧮 hasFormula: ${child.hasFormula}`);
        }
        
        buildHierarchy(child.id, level + 1);
        return child;
      });
    };

    console.log('📋 HIÉRARCHIE COMPLÈTE:\n');
    rootNodes.forEach(root => {
      buildHierarchy(root.id);
      console.log(''); // Ligne vide entre les arbres racines
    });

    // 3. Focus sur Electricité
    console.log('\n🔍 FOCUS SUR ELECTRICITÉ:\n');
    const electriciteNode = allNodes.find(n => n.label === 'Electricité');
    
    if (!electriciteNode) {
      console.log('❌ Nœud Electricité non trouvé!');
      return;
    }

    console.log('⚡ NŒUD ELECTRICITÉ:');
    console.log(`   ID: ${electriciteNode.id}`);
    console.log(`   Type: ${electriciteNode.type}`);
    console.log(`   FieldType: ${electriciteNode.fieldType || 'N/A'}`);
    console.log(`   Parent: ${electriciteNode.parentId || 'ROOT'}`);
    console.log(`   Ordre: ${electriciteNode.order}`);

    // 4. Enfants directs d'Electricité
    const electriciteChildren = allNodes.filter(n => n.parentId === electriciteNode.id);
    console.log(`\n📂 ENFANTS DIRECTS D'ELECTRICITÉ (${electriciteChildren.length}):`);
    
    electriciteChildren.forEach((child, index) => {
      console.log(`\n   ${index + 1}. ${child.label}`);
      console.log(`      - ID: ${child.id}`);
      console.log(`      - Type: ${child.type}`);
      console.log(`      - FieldType: ${child.fieldType || 'N/A'}`);
      console.log(`      - Ordre: ${child.order}`);
      
      // Vérifier si c'est une section
      if (child.type === 'section') {
        console.log(`      - 📋 C'EST UNE SECTION!`);
        
        // Regarder les enfants de cette section
        const sectionChildren = allNodes.filter(n => n.parentId === child.id);
        console.log(`      - Enfants: ${sectionChildren.length}`);
        sectionChildren.forEach(sChild => {
          console.log(`         └─ ${sChild.label} (${sChild.type}) ${sChild.fieldType ? `[${sChild.fieldType}]` : ''}`);
        });
      }
    });

    // 5. Tous les descendants d'Electricité (récursif)
    const getDescendants = (nodeId) => {
      const directChildren = allNodes.filter(n => n.parentId === nodeId);
      let descendants = [...directChildren];
      directChildren.forEach(child => {
        descendants = descendants.concat(getDescendants(child.id));
      });
      return descendants;
    };

    const allElectriciteDescendants = getDescendants(electriciteNode.id);
    console.log(`\n🌿 TOUS LES DESCENDANTS D'ELECTRICITÉ (${allElectriciteDescendants.length}):`);
    
    // Grouper par type
    const byType = allElectriciteDescendants.reduce((acc, node) => {
      acc[node.type] = acc[node.type] || [];
      acc[node.type].push(node);
      return acc;
    }, {});

    Object.entries(byType).forEach(([type, nodes]) => {
      console.log(`\n   📋 ${type.toUpperCase()} (${nodes.length}):`);
      nodes.forEach(node => {
        console.log(`      - ${node.label} ${node.fieldType ? `[${node.fieldType}]` : ''}`);
      });
    });

    console.log('\n✅ Analyse terminée!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyserElectriciteStructure();