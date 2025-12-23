import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeBloc() {
  try {
    // Trouver l'arbre Bloc
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { name: { contains: 'Bloc', mode: 'insensitive' } }
    });
    
    if (!tree) {
      console.log('❌ Arbre "Bloc" non trouvé');
      // Lister les arbres disponibles
      const trees = await prisma.treeBranchLeafTree.findMany({
        select: { id: true, name: true }
      });
      console.log('\n📋 Arbres disponibles:');
      trees.forEach(t => console.log(`  - ${t.name} (${t.id})`));
      return;
    }
    
    console.log('='.repeat(60));
    console.log('🌳 ARBRE BLOC');
    console.log('='.repeat(60));
    console.log('ID:', tree.id);
    console.log('Nom:', tree.name);
    
    // Récupérer tous les nœuds
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: tree.id },
      orderBy: { order: 'asc' }
    });
    
    console.log('\n📊 STATISTIQUES');
    console.log('-'.repeat(40));
    console.log('Total nœuds:', nodes.length);
    
    // Analyser les types
    const types: Record<string, number> = {};
    const fieldTypes: Record<string, number> = {};
    const repeaters: any[] = [];
    const formulas: any[] = [];
    const conditions: any[] = [];
    const allFields: any[] = [];
    
    for (const node of nodes) {
      types[node.type] = (types[node.type] || 0) + 1;
      
      const config = (node.config || {}) as any;
      
      if (config.fieldType) {
        fieldTypes[config.fieldType] = (fieldTypes[config.fieldType] || 0) + 1;
      }
      
      // Collecter les champs avec leurs infos
      if (node.type === 'field' || config.fieldType) {
        allFields.push({
          id: node.id,
          label: node.label,
          type: node.type,
          fieldType: config.fieldType,
          variableName: config.variableName || config.variable,
          parentId: node.parentId
        });
      }
      
      // Repeaters
      if (node.type === 'repeat' || config.isRepeater || config.repeatConfig) {
        repeaters.push({
          id: node.id,
          label: node.label,
          type: node.type,
          repeatConfig: config.repeatConfig,
          minItems: config.minItems,
          maxItems: config.maxItems
        });
      }
      
      // Formules
      if (config.formula || config.calculatedField || config.calculation) {
        formulas.push({
          id: node.id,
          label: node.label,
          formula: config.formula || config.calculation,
          calculatedField: config.calculatedField
        });
      }
      
      // Conditions
      if (config.condition || config.conditions || config.visibilityCondition) {
        conditions.push({
          id: node.id,
          label: node.label,
          condition: config.condition || config.conditions || config.visibilityCondition
        });
      }
    }
    
    console.log('\n📁 TYPES DE NŒUDS:');
    Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n📝 TYPES DE CHAMPS:');
    Object.entries(fieldTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n🔄 REPEATERS (' + repeaters.length + '):');
    repeaters.forEach(r => {
      console.log(`  - ${r.label} (${r.id})`);
      if (r.repeatConfig) console.log(`    Config: ${JSON.stringify(r.repeatConfig)}`);
    });
    
    console.log('\n🧮 FORMULES (' + formulas.length + '):');
    formulas.slice(0, 15).forEach(f => {
      console.log(`  - ${f.label}: ${f.formula || f.calculatedField || 'N/A'}`);
    });
    if (formulas.length > 15) console.log(`  ... et ${formulas.length - 15} autres`);
    
    console.log('\n🔀 CONDITIONS (' + conditions.length + '):');
    conditions.slice(0, 10).forEach(c => {
      console.log(`  - ${c.label}:`);
      console.log(`    ${JSON.stringify(c.condition).substring(0, 100)}...`);
    });
    
    console.log('\n📋 TOUS LES CHAMPS (' + allFields.length + '):');
    console.log('-'.repeat(60));
    
    // Grouper par parent pour voir la hiérarchie
    const byParent: Record<string, any[]> = {};
    allFields.forEach(f => {
      const parent = f.parentId || 'root';
      if (!byParent[parent]) byParent[parent] = [];
      byParent[parent].push(f);
    });
    
    // Afficher les champs de premier niveau
    const rootFields = byParent['root'] || [];
    rootFields.slice(0, 30).forEach(f => {
      console.log(`  ${f.label} | type: ${f.fieldType || f.type} | var: ${f.variableName || 'N/A'}`);
    });
    
    // Chercher des champs qui ressemblent à des lignes de devis
    console.log('\n💰 CHAMPS POTENTIELS POUR DEVIS:');
    const priceKeywords = ['prix', 'price', 'total', 'montant', 'quantit', 'qty', 'qte', 'unit', 'ligne', 'produit', 'service', 'designation', 'description'];
    const devisFields = allFields.filter(f => {
      const label = (f.label || '').toLowerCase();
      const varName = (f.variableName || '').toLowerCase();
      return priceKeywords.some(kw => label.includes(kw) || varName.includes(kw));
    });
    
    devisFields.forEach(f => {
      console.log(`  📌 ${f.label} | ${f.fieldType} | var: ${f.variableName}`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeBloc();
