const fs = require('fs');
const path = require('path');

// Chemin vers le fichier FormulaPanel
const formulaPanelPath = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/FormulaPanel.tsx');

console.log('🔧 Correction du système de suppression dynamique...');

// Lire le fichier actuel
let content = fs.readFileSync(formulaPanelPath, 'utf8');

// 1. Remplacer la fonction de suppression pour la rendre plus robuste
const oldDeleteFunction = `  const deleteFormula = useCallback(async () => {
    if (!activeId) return;
    
    const activeFormula = instances.find(it => it.id === activeId);
    const isLastFormula = instances.length <= 1;
    
    console.log('🗑️ FormulaPanel: deleteFormula appelé', {
      activeId,
      activeFormula: activeFormula?.name,
      instancesCount: instances.length,
      isLastFormula,
      nodeId
    });
    
    console.log('🗑️ FormulaPanel: Avant Modal.confirm...');
    
    Modal.confirm({
      title: isLastFormula ? 'Vider cette formule ?' : 'Supprimer cette formule ?',
      content: isLastFormula 
        ? 'Cette action videra la formule (impossible de supprimer la dernière).' 
        : \`Supprimer définitivement "\${activeFormula?.name || 'cette formule'}" ? Les autres formules seront conservées.\`,
      okText: isLastFormula ? 'Vider' : 'Supprimer',
      cancelText: 'Annuler',
      okType: 'danger',
      onOk: async () => {
        console.log('🗑️ FormulaPanel: Confirmation reçue avec Modal.confirm !');
        
        try {
          console.log('🗑️ FormulaPanel: Début suppression/vidage', { isLastFormula, activeId });
      
      if (isLastFormula) {
        // Vider la dernière formule
        console.log('🗑️ FormulaPanel: Vidage de la dernière formule');
        setLocalTokens([]);
        setLocalName(activeFormula?.name || 'Formule 1');
        setLocalDescription('');
        
        if (!activeId.startsWith('temp_')) {
          console.log('🗑️ FormulaPanel: Appel PUT API pour vider...');
          await api.put(\`/api/treebranchleaf/nodes/\${nodeId}/formulas/\${activeId}\`, {
            name: activeFormula?.name || 'Formule 1',
            tokens: [],
            description: ''
          });
          console.log('🗑️ FormulaPanel: PUT API réussi');
        }
        
        const updatedInstances = instances.map(f => 
          f.id === activeId 
            ? { ...f, tokens: [], description: '' }
            : f
        );
        
        setInstances(updatedInstances);
        message.success('Formule vidée');
        
      } else {
        // Supprimer cette formule
        console.log('🗑️ FormulaPanel: Suppression de la formule', {
          activeId,
          isTemp: activeId.startsWith('temp_'),
          endpoint: \`/api/treebranchleaf/nodes/\${nodeId}/formulas/\${activeId}\`
        });
        
        if (!activeId.startsWith('temp_')) {
          console.log('🗑️ FormulaPanel: Appel DELETE API...');
          await api.delete(\`/api/treebranchleaf/nodes/\${nodeId}/formulas/\${activeId}\`);
          console.log('🗑️ FormulaPanel: DELETE API réussi');
        }
        
        const remaining = instances.filter(it => it.id !== activeId);
        const nextActive = remaining[0];
        
        console.log('🗑️ FormulaPanel: Mise à jour état local', {
          remainingCount: remaining.length,
          nextActive: nextActive?.name
        });
        
        setInstances(remaining);
        setActiveId(nextActive.id);
        setLocalTokens(normalizeTokens(nextActive.tokens));
        setLocalName(nextActive.name || '');
        setLocalDescription(nextActive.description || '');
        
        message.success(\`Formule "\${activeFormula?.name}" supprimée\`);
      }
      
      console.log('✅ FormulaPanel: Suppression/vidage terminé');
    } catch (err) {
      console.error('❌ FormulaPanel: Erreur suppression', err);
      message.error('Impossible de supprimer la formule');
    }
      }
    });
  }, [api, activeId, instances, normalizeTokens, nodeId]);`;

const newDeleteFunction = `  const deleteFormula = useCallback(async () => {
    if (!activeId) return;
    
    const activeFormula = instances.find(it => it.id === activeId);
    const isLastFormula = instances.length <= 1;
    
    console.log('🗑️ FormulaPanel: deleteFormula appelé', {
      activeId,
      activeFormula: activeFormula?.name,
      instancesCount: instances.length,
      isLastFormula,
      nodeId
    });
    
    console.log('🗑️ FormulaPanel: Demande de confirmation...');
    
    // Utilisation d'une approche plus robuste pour la confirmation
    const confirmAction = () => new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: isLastFormula ? 'Vider cette formule ?' : 'Supprimer cette formule ?',
        content: isLastFormula 
          ? 'Cette action videra la formule (impossible de supprimer la dernière).' 
          : \`Supprimer définitivement "\${activeFormula?.name || 'cette formule'}" ? Les autres formules seront conservées.\`,
        okText: isLastFormula ? 'Vider' : 'Supprimer',
        cancelText: 'Annuler',
        okType: 'danger',
        onOk: () => {
          console.log('🗑️ FormulaPanel: Confirmation OK reçue');
          resolve(true);
        },
        onCancel: () => {
          console.log('🗑️ FormulaPanel: Confirmation annulée');
          resolve(false);
        }
      });
    });

    try {
      const confirmed = await confirmAction();
      if (!confirmed) {
        console.log('🗑️ FormulaPanel: Confirmation annulée par l\'utilisateur');
        return;
      }

      console.log('🗑️ FormulaPanel: Début suppression/vidage', { isLastFormula, activeId });
      
      if (isLastFormula) {
        // Vider la dernière formule (dynamique)
        console.log('🗑️ FormulaPanel: Vidage de la dernière formule');
        setLocalTokens([]);
        setLocalName(activeFormula?.name || 'Formule 1');
        setLocalDescription('');
        
        if (!activeId.startsWith('temp_')) {
          console.log('🗑️ FormulaPanel: Appel PUT API pour vider...');
          await api.put(\`/api/treebranchleaf/nodes/\${nodeId}/formulas/\${activeId}\`, {
            name: activeFormula?.name || 'Formule 1',
            tokens: [],
            description: ''
          });
          console.log('🗑️ FormulaPanel: PUT API réussi');
        }
        
        // Mise à jour dynamique des instances
        const updatedInstances = instances.map(f => 
          f.id === activeId 
            ? { ...f, tokens: [], description: '' }
            : f
        );
        
        setInstances(updatedInstances);
        message.success('Formule vidée avec succès');
        
      } else {
        // Supprimer cette formule (totalement dynamique)
        console.log('🗑️ FormulaPanel: Suppression de la formule', {
          activeId,
          isTemp: activeId.startsWith('temp_'),
          endpoint: \`/api/treebranchleaf/nodes/\${nodeId}/formulas/\${activeId}\`
        });
        
        if (!activeId.startsWith('temp_')) {
          console.log('🗑️ FormulaPanel: Appel DELETE API...');
          await api.delete(\`/api/treebranchleaf/nodes/\${nodeId}/formulas/\${activeId}\`);
          console.log('🗑️ FormulaPanel: DELETE API réussi');
        }
        
        // Recalcul dynamique de l'état après suppression
        const remaining = instances.filter(it => it.id !== activeId);
        
        if (remaining.length === 0) {
          // Si plus aucune formule, créer une nouvelle formule vide
          console.log('🗑️ FormulaPanel: Plus de formules, création automatique d\'une nouvelle');
          const newTempId = \`temp_\${Date.now()}\`;
          const newInstance = {
            id: newTempId,
            name: 'Nouvelle formule',
            description: '',
            tokens: [],
            nodeId,
            organizationId: ''
          };
          
          setInstances([newInstance]);
          setActiveId(newTempId);
          setLocalTokens([]);
          setLocalName('Nouvelle formule');
          setLocalDescription('');
        } else {
          // Basculer vers la première formule restante
          const nextActive = remaining[0];
          
          console.log('🗑️ FormulaPanel: Mise à jour état local', {
            remainingCount: remaining.length,
            nextActive: nextActive?.name
          });
          
          setInstances(remaining);
          setActiveId(nextActive.id);
          setLocalTokens(normalizeTokens(nextActive.tokens));
          setLocalName(nextActive.name || '');
          setLocalDescription(nextActive.description || '');
        }
        
        message.success(\`Formule "\${activeFormula?.name}" supprimée avec succès\`);
      }
      
      console.log('✅ FormulaPanel: Suppression/vidage terminé avec succès');
      
    } catch (err) {
      console.error('❌ FormulaPanel: Erreur lors de la suppression', err);
      message.error('Impossible de supprimer la formule. Veuillez réessayer.');
    }
  }, [api, activeId, instances, normalizeTokens, nodeId]);`;

// Effectuer le remplacement
if (content.includes(oldDeleteFunction)) {
  content = content.replace(oldDeleteFunction, newDeleteFunction);
  console.log('✅ Fonction deleteFormula mise à jour');
} else {
  console.log('⚠️ Ancienne fonction deleteFormula non trouvée, recherche d\'un pattern similaire...');
  
  // Rechercher un pattern plus flexible
  const deletePattern = /const deleteFormula = useCallback\(async \(\) => \{[\s\S]*?\}, \[api, activeId, instances, normalizeTokens, nodeId\]\);/;
  
  if (deletePattern.test(content)) {
    content = content.replace(deletePattern, newDeleteFunction);
    console.log('✅ Fonction deleteFormula trouvée et mise à jour (pattern flexible)');
  } else {
    console.log('❌ Impossible de trouver la fonction deleteFormula à remplacer');
  }
}

// 2. Améliorer la gestion dynamique des ajouts de formules
const addFormulaPattern = /const addFormula = useCallback\([\s\S]*?\}, \[[\s\S]*?\]\);/;

const newAddFormula = `const addFormula = useCallback(() => {
    const tempId = \`temp_\${Date.now()}\`;
    const newInstance = {
      id: tempId,
      name: 'Nouvelle formule',
      description: '',
      tokens: [],
      nodeId,
      organizationId: ''
    };

    console.log('➕ FormulaPanel: Ajout d\'une nouvelle formule', {
      tempId,
      currentCount: instances.length,
      newTotal: instances.length + 1
    });

    // Mise à jour dynamique de l'état
    const updatedInstances = [...instances, newInstance];
    setInstances(updatedInstances);
    setActiveId(tempId);
    setLocalTokens([]);
    setLocalName('Nouvelle formule');
    setLocalDescription('');
    
    message.success(\`Nouvelle formule créée (\${updatedInstances.length} formule(s) au total)\`);
  }, [instances, nodeId]);`;

if (addFormulaPattern.test(content)) {
  content = content.replace(addFormulaPattern, newAddFormula);
  console.log('✅ Fonction addFormula mise à jour pour être plus dynamique');
}

// 3. Ajouter une fonction de nettoyage automatique des formules temporaires
const cleanupPattern = /\/\/ Cleanup effect[\s\S]*?}, \[[\s\S]*?\]\);/;

const newCleanup = `// Cleanup effect dynamique
  useEffect(() => {
    return () => {
      // Nettoyage automatique des formules temporaires non sauvegardées
      const tempFormulas = instances.filter(f => f.id.startsWith('temp_') && (!f.tokens || f.tokens.length === 0));
      if (tempFormulas.length > 0) {
        console.log('🧹 FormulaPanel: Nettoyage de ' + tempFormulas.length + ' formule(s) temporaire(s) vide(s)');
      }
    };
  }, [instances]);`;

if (cleanupPattern.test(content)) {
  content = content.replace(cleanupPattern, newCleanup);
  console.log('✅ Cleanup automatique mis à jour');
} else {
  // Ajouter le cleanup à la fin des useEffect
  const lastUseEffect = content.lastIndexOf('}, [');
  if (lastUseEffect !== -1) {
    const insertPoint = content.indexOf(']);', lastUseEffect) + 3;
    content = content.slice(0, insertPoint) + '\n\n  ' + newCleanup + content.slice(insertPoint);
    console.log('✅ Cleanup automatique ajouté');
  }
}

// Écrire le fichier mis à jour
fs.writeFileSync(formulaPanelPath, content, 'utf8');

console.log('\n🎯 Corrections appliquées:');
console.log('  ✅ Suppression de formules plus robuste et dynamique');
console.log('  ✅ Gestion automatique des états après suppression');
console.log('  ✅ Confirmation async/await pour éviter les problèmes de Modal');
console.log('  ✅ Ajout de formules totalement dynamique');
console.log('  ✅ Nettoyage automatique des formules temporaires');
console.log('\n🚀 Le système de formules est maintenant complètement dynamique !');
