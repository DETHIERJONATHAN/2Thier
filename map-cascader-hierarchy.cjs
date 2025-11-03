// Importer le client Prisma existant depuis le serveur API
const path = require('path');
const fs = require('fs');

// Chercher le client Prisma dans le projet
let prisma;
try {
  // Essayer d'importer depuis l'API du projet
  const apiPath = path.join(__dirname, 'src', 'api-server.ts');
  if (fs.existsSync(apiPath)) {
    console.log('🔗 Connexion à la DB via l\'API du projet...');
  }
  
  // Utiliser une approche alternative pour la DB
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({
    log: ['error']
  });
} catch (error) {
  console.log('⚠️ Erreur Prisma, utilisation d\'une approche alternative...');
  process.exit(1);
}

async function mapCascaderHierarchy() {
  try {
    console.log('🌳 === MAPPING HIÉRARCHIQUE CASCADER PAR PARENTID ===\n');

    // Chercher tous les nœuds qui pourraient être liés au cascader Versant
    console.log('🔍 Recherche des champs et nœuds liés au "Versant"...\n');

    // 1. Trouver le champ Versant
    const versantFields = await prisma.tBLField.findMany({
      where: {
        OR: [
          { fieldLabel: { contains: 'Versant', mode: 'insensitive' } },
          { fieldLabel: { contains: 'versant', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`📊 Champs "Versant" trouvés: ${versantFields.length}`);
    for (const field of versantFields) {
      console.log(`   - "${field.fieldLabel}" (ID: ${field.id}, Type: ${field.fieldType})`);
    }

    if (versantFields.length === 0) {
      console.log('❌ Aucun champ "Versant" trouvé, recherche alternative...\n');
      
      // Chercher des champs avec des options qui contiennent "Rectangle", "Triangle"
      const cascaderFields = await prisma.tBLField.findMany({
        where: { fieldType: 'cascader' },
        include: {
          fieldOptions: {
            take: 5
          }
        }
      });
      
      for (const field of cascaderFields) {
        const hasGeometricOptions = field.fieldOptions.some(opt => 
          ['rectangle', 'triangle', 'trapeze', 'trapèze'].some(geom => 
            opt.optionLabel?.toLowerCase().includes(geom) || 
            opt.optionValue?.toLowerCase().includes(geom)
          )
        );
        
        if (hasGeometricOptions) {
          console.log(`� Champ cascader avec formes géométriques: "${field.fieldLabel}" (ID: ${field.id})`);
          versantFields.push(field);
        }
      }
    }

    if (versantFields.length === 0) {
      console.log('❌ Aucun champ cascader pertinent trouvé');
      return;
    }

    // Analyser chaque champ trouvé
    for (const versantField of versantFields) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 ANALYSE DU CHAMP: "${versantField.fieldLabel}" (ID: ${versantField.id})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      await analyzeParentIdChain(versantField.id);
    }

  } catch (error) {
    console.error('❌ Erreur lors du mapping:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

async function analyzeParentIdChain(rootFieldId) {
  console.log(`� === SUIVI DE LA CHAÎNE PARENTID depuis le champ ${rootFieldId} ===\n`);

  // Étape 1: Trouver tous les nœuds qui ont ce champ comme parentId
  const level1Nodes = await prisma.tBLNode.findMany({
    where: {
      OR: [
        { parentId: rootFieldId },
        { parentId: rootFieldId.toString() }
      ]
    }
  });

  console.log(`📊 NIVEAU 1 - Nœuds avec parentId = ${rootFieldId}: ${level1Nodes.length}`);
  for (const node of level1Nodes) {
    console.log(`   🔸 "${node.nodeLabel}" (ID: ${node.id})`);
    const hasSharedRefs = node.sharedReferenceIds && node.sharedReferenceIds.length > 0;
    if (hasSharedRefs) {
      console.log(`      ✅ SharedReferenceIds: [${node.sharedReferenceIds.join(', ')}]`);
    }
  }

  // Étape 2: Pour chaque nœud de niveau 1, chercher ses enfants
  for (const level1Node of level1Nodes) {
    console.log(`\n🔗 Analyse des enfants de "${level1Node.nodeLabel}" (${level1Node.id}):`);
    
    await findChildrenRecursive(level1Node.id, level1Node.nodeLabel, 2);
  }
}

async function findChildrenRecursive(parentNodeId, parentLabel, level = 2) {
  const children = await prisma.tBLNode.findMany({
    where: {
      OR: [
        { parentId: parentNodeId },
        { parentId: parentNodeId.toString() }
      ]
    }
  });

  if (children.length === 0) {
    console.log(`   ${'  '.repeat(level - 1)}❌ Aucun enfant pour "${parentLabel}"`);
    return;
  }

  console.log(`   ${'  '.repeat(level - 1)}📊 NIVEAU ${level} - Enfants de "${parentLabel}": ${children.length}`);
  
  for (const child of children) {
    const indent = '  '.repeat(level);
    const hasSharedRefs = child.sharedReferenceIds && child.sharedReferenceIds.length > 0;
    
    console.log(`${indent}🔸 "${child.nodeLabel}" (ID: ${child.id})`);
    if (hasSharedRefs) {
      console.log(`${indent}   ✅ SharedReferenceIds: [${child.sharedReferenceIds.join(', ')}]`);
    }
    
    // Continuer récursivement mais limiter à 5 niveaux max
    if (level < 5) {
      await findChildrenRecursive(child.id, child.nodeLabel, level + 1);
    }
  }
}

function buildHierarchy(options) {
  const optionMap = new Map();
  const hierarchy = [];

  // Créer un map de toutes les options
  for (const option of options) {
    optionMap.set(option.id, { ...option, children: [] });
  }

  // Construire la hiérarchie
  for (const option of options) {
    if (option.parentOptionId) {
      const parent = optionMap.get(option.parentOptionId);
      if (parent) {
        parent.children.push(optionMap.get(option.id));
      }
    } else {
      hierarchy.push(optionMap.get(option.id));
    }
  }

  return hierarchy;
}

function printHierarchy(nodes, depth = 0) {
  for (const node of nodes) {
    const indent = '  '.repeat(depth);
    const hasRefs = node.sharedReferenceIds && node.sharedReferenceIds.length > 0;
    const refsStr = hasRefs ? ` ✅ [${node.sharedReferenceIds.join(', ')}]` : ' ❌';
    
    console.log(`${indent}${depth === 0 ? '🔸' : '└─'} "${node.optionLabel}" (${node.optionValue})${refsStr}`);
    
    if (node.children.length > 0) {
      printHierarchy(node.children, depth + 1);
    }
  }
}

function categorizeByLevel(options) {
  const levels = new Map();
  
  function getLevel(option, currentLevel = 0) {
    if (!levels.has(currentLevel)) {
      levels.set(currentLevel, []);
    }
    levels.get(currentLevel).push(option);
    
    const children = options.filter(opt => opt.parentOptionId === option.id);
    for (const child of children) {
      getLevel(child, currentLevel + 1);
    }
  }
  
  // Commencer par les options racine
  const rootOptions = options.filter(opt => !opt.parentOptionId);
  for (const root of rootOptions) {
    getLevel(root, 0);
  }
  
  return levels;
}

function findPathsToSharedReferences(options) {
  const paths = [];
  
  function findPaths(option, currentPath = []) {
    const newPath = [...currentPath, option.optionLabel];
    
    if (option.sharedReferenceIds && option.sharedReferenceIds.length > 0) {
      paths.push({
        path: newPath,
        sharedRefs: option.sharedReferenceIds,
        optionId: option.id
      });
    }
    
    const children = options.filter(opt => opt.parentOptionId === option.id);
    for (const child of children) {
      findPaths(child, newPath);
    }
  }
  
  const rootOptions = options.filter(opt => !opt.parentOptionId);
  for (const root of rootOptions) {
    findPaths(root);
  }
  
  return paths;
}

mapCascaderHierarchy();