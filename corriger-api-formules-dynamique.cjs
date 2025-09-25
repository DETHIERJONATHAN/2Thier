const fs = require('fs');
const path = require('path');

// Recherche du fichier API pour les formules
const apiPath = path.join(__dirname, 'src', 'api-server.ts');

console.log('🔧 Amélioration des API de suppression des formules...');

if (!fs.existsSync(apiPath)) {
  console.log('❌ Fichier api-server.ts non trouvé');
  process.exit(1);
}

let content = fs.readFileSync(apiPath, 'utf8');

// 1. Rechercher et améliorer l'endpoint DELETE pour les formules
const deleteEndpointPattern = /app\.delete\(['"`]\/api\/treebranchleaf\/nodes\/:nodeId\/formulas\/:formulaId['"`],[\s\S]*?}\);/;

const newDeleteEndpoint = `app.delete('/api/treebranchleaf/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    
    console.log('🗑️ [API] DELETE formule:', { nodeId, formulaId });

    // Vérifier que la formule existe
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId }
    });

    if (!formula) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    if (formula.nodeId !== nodeId) {
      return res.status(400).json({ error: 'Formule ne correspond pas au nœud' });
    }

    // Compter les formules restantes pour ce nœud
    const remainingCount = await prisma.treeBranchLeafNodeFormula.count({
      where: { 
        nodeId,
        id: { not: formulaId }
      }
    });

    console.log('🗑️ [API] Formules restantes après suppression:', remainingCount);

    // Supprimer la formule
    await prisma.treeBranchLeafNodeFormula.delete({
      where: { id: formulaId }
    });

    // Mise à jour dynamique du flag hasFormula si plus de formules
    if (remainingCount === 0) {
      console.log('🗑️ [API] Plus de formules, mise à jour hasFormula = false');
      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: { hasFormula: false }
      });
    }

    console.log('✅ [API] Formule supprimée avec succès');
    res.json({ 
      success: true, 
      message: 'Formule supprimée',
      remainingFormulas: remainingCount,
      nodeHasFormula: remainingCount > 0
    });

  } catch (error) {
    console.error('❌ [API] Erreur suppression formule:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression',
      details: error.message
    });
  }
});`;

if (deleteEndpointPattern.test(content)) {
  content = content.replace(deleteEndpointPattern, newDeleteEndpoint);
  console.log('✅ Endpoint DELETE mis à jour');
} else {
  console.log('⚠️ Endpoint DELETE non trouvé, ajout à la fin...');
  
  // Trouver la dernière route treebranchleaf
  const lastTreeRoute = content.lastIndexOf('app.') + content.slice(content.lastIndexOf('app.')).indexOf('});');
  const insertPoint = content.indexOf('\n', lastTreeRoute) + 1;
  
  content = content.slice(0, insertPoint) + '\n// Suppression dynamique de formules\n' + newDeleteEndpoint + '\n' + content.slice(insertPoint);
  console.log('✅ Endpoint DELETE ajouté');
}

// 2. Améliorer l'endpoint POST pour la création
const postEndpointPattern = /app\.post\(['"`]\/api\/treebranchleaf\/nodes\/:nodeId\/formulas['"`],[\s\S]*?}\);/;

const newPostEndpoint = `app.post('/api/treebranchleaf/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { name, description, tokens } = req.body;
    
    console.log('➕ [API] POST nouvelle formule:', { nodeId, name, tokensCount: tokens?.length || 0 });

    // Vérifier que le nœud existe
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // Créer la nouvelle formule
    const newFormula = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        nodeId,
        organizationId: node.organizationId,
        name: name || 'Nouvelle formule',
        description: description || '',
        tokens: tokens || []
      }
    });

    // Mise à jour dynamique du flag hasFormula
    if (!node.hasFormula) {
      console.log('➕ [API] Première formule, mise à jour hasFormula = true');
      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: { hasFormula: true }
      });
    }

    console.log('✅ [API] Formule créée avec succès:', newFormula.id);
    res.status(201).json(newFormula);

  } catch (error) {
    console.error('❌ [API] Erreur création formule:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création',
      details: error.message
    });
  }
});`;

if (postEndpointPattern.test(content)) {
  content = content.replace(postEndpointPattern, newPostEndpoint);
  console.log('✅ Endpoint POST mis à jour');
} else {
  // Chercher un pattern plus large
  const generalPostPattern = /\/\/ Formules[\s\S]*?app\.post\(['"`][^'"`]*formulas['"`],[\s\S]*?}\);/;
  if (generalPostPattern.test(content)) {
    content = content.replace(generalPostPattern, '// Formules - Création dynamique\n' + newPostEndpoint);
    console.log('✅ Endpoint POST trouvé et mis à jour (pattern général)');
  } else {
    console.log('➕ Ajout de l\'endpoint POST...');
    const insertPoint = content.indexOf(newDeleteEndpoint) - 50;
    content = content.slice(0, insertPoint) + '\n// Création dynamique de formules\n' + newPostEndpoint + '\n' + content.slice(insertPoint);
    console.log('✅ Endpoint POST ajouté');
  }
}

// 3. Améliorer l'endpoint PUT pour la mise à jour
const putEndpointPattern = /app\.put\(['"`]\/api\/treebranchleaf\/nodes\/:nodeId\/formulas\/:formulaId['"`],[\s\S]*?}\);/;

const newPutEndpoint = `app.put('/api/treebranchleaf/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    const { name, description, tokens } = req.body;
    
    console.log('✏️ [API] PUT mise à jour formule:', { nodeId, formulaId, name, tokensCount: tokens?.length || 0 });

    // Vérifier que la formule existe
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId }
    });

    if (!existingFormula) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    if (existingFormula.nodeId !== nodeId) {
      return res.status(400).json({ error: 'Formule ne correspond pas au nœud' });
    }

    // Mettre à jour la formule de manière dynamique
    const updatedFormula = await prisma.treeBranchLeafNodeFormula.update({
      where: { id: formulaId },
      data: {
        name: name !== undefined ? name : existingFormula.name,
        description: description !== undefined ? description : existingFormula.description,
        tokens: tokens !== undefined ? tokens : existingFormula.tokens
      }
    });

    console.log('✅ [API] Formule mise à jour avec succès');
    res.json(updatedFormula);

  } catch (error) {
    console.error('❌ [API] Erreur mise à jour formule:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour',
      details: error.message
    });
  }
});`;

if (putEndpointPattern.test(content)) {
  content = content.replace(putEndpointPattern, newPutEndpoint);
  console.log('✅ Endpoint PUT mis à jour');
} else {
  console.log('➕ Ajout de l\'endpoint PUT...');
  const insertPoint = content.indexOf(newPostEndpoint) + newPostEndpoint.length + 10;
  content = content.slice(0, insertPoint) + '\n// Mise à jour dynamique de formules\n' + newPutEndpoint + '\n' + content.slice(insertPoint);
  console.log('✅ Endpoint PUT ajouté');
}

// Écrire le fichier mis à jour
fs.writeFileSync(apiPath, content, 'utf8');

console.log('\n🎯 API améliorée:');
console.log('  ✅ DELETE: Suppression dynamique avec mise à jour hasFormula');
console.log('  ✅ POST: Création dynamique avec activation hasFormula');
console.log('  ✅ PUT: Mise à jour dynamique des formules');
console.log('  ✅ Gestion automatique des états des nœuds');
console.log('\n🚀 L\'API est maintenant complètement dynamique !');

// 4. Créer un script de test des API
const testScript = `const fetch = require('node-fetch');

async function testerAPIDynamique() {
  const baseUrl = 'http://localhost:3001';
  const nodeId = 'node_1757366229463_sye4llokt'; // Nœud Electricité
  
  console.log('🧪 Test des API dynamiques...');

  try {
    // 1. Lister les formules existantes
    const response1 = await fetch(\`\${baseUrl}/api/treebranchleaf/nodes/\${nodeId}/formulas\`);
    const formules = await response1.json();
    console.log(\`📋 Formules existantes: \${formules.length}\`);

    if (formules.length > 0) {
      const formulaId = formules[0].id;
      
      // 2. Test de suppression
      console.log(\`🗑️ Test suppression de: \${formules[0].name}\`);
      const response2 = await fetch(\`\${baseUrl}/api/treebranchleaf/nodes/\${nodeId}/formulas/\${formulaId}\`, {
        method: 'DELETE'
      });
      
      const result = await response2.json();
      console.log('✅ Résultat suppression:', result);
    }

    // 3. Test de création
    console.log('➕ Test création nouvelle formule...');
    const response3 = await fetch(\`\${baseUrl}/api/treebranchleaf/nodes/\${nodeId}/formulas\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Dynamique',
        description: 'Formule de test automatique',
        tokens: ['@value.test', '+', '100']
      })
    });

    const newFormula = await response3.json();
    console.log('✅ Nouvelle formule créée:', newFormula.name);

  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Décommenter pour tester:
// testerAPIDynamique();

console.log('📝 Script de test créé. Décommentez la dernière ligne pour tester.');`;

fs.writeFileSync(path.join(__dirname, 'test-api-formules-dynamique.js'), testScript);
console.log('📝 Script de test créé: test-api-formules-dynamique.js');
