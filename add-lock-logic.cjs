const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Chercher la position du bloc problematique
const searchText = '    }\n\n\n    // ';
const replaceWithText = '    }\n\n    // Verrouillage: si utilisateur a deja selectionne une valeur\n    const userSelectedValue = formValues?.[nodeId];\n    if (userSelectedValue !== undefined && userSelectedValue !== null && userSelectedValue !== \'\') {\n      console.log(`[TreeBranchLeaf API] Selection verrouillee`);\n      return res.json({ options: [{ value: String(userSelectedValue), label: String(userSelectedValue) }] });\n    }\n\n    // ';

// Remplacer UNIQUEMENT apres "Erreur parsing formValues"
const lines = content.split('\n');
let result = [];
for (let i = 0; i < lines.length; i++) {
  result.push(lines[i]);
  if (lines[i].includes('Erreur parsing formValues') && lines[i+1].includes('error') && lines[i+2].includes('}') && lines[i+3].includes('}')) {
    // Inserer le code apres la fermeture de try/catch
    result.push('');
    result.push('    // Verrouillage: si utilisateur a deja selectionne une valeur');
    result.push('    const userSelectedValue = formValues?.[nodeId];');
    result.push('    if (userSelectedValue !== undefined && userSelectedValue !== null && userSelectedValue !== \'\') {');
    result.push('      console.log(`[TreeBranchLeaf API] Selection verrouillee`);');
    result.push('      return res.json({ options: [{ value: String(userSelectedValue), label: String(userSelectedValue) }] });');
    result.push('    }');
    i += 3; // Sauter les lignes deja traitees
  }
}

const newContent = result.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Fichier modifie avec succes');
