const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Chercher simplement le pattern orphelin
const lines = content.split('\n');

// Trouver les lignes avec les } problématiques
for (let i = lines.length - 500; i < lines.length; i++) {
  if (i >= 0 && i < lines.length) {
    const line = lines[i];
    if (line.trim() === '}' && i > 1690) {
      const prev1 = lines[i-1] || '';
      const prev2 = lines[i-2] || '';
      const prev3 = lines[i-3] || '';
      console.log(`\nLigne ${i+1} avec }:`);
      console.log(`${i-2}:  ${prev2}`);
      console.log(`${i-1}:  ${prev1}`);
      console.log(`${i}:  ${line}`);
    }
  }
}

// Chercher les } vides à proximité
const pattern1 = '\n      }\n      }\n    }';
if (content.includes(pattern1)) {
  console.log('\n✅ Pattern triple } trouvé!');
  const idx = content.indexOf(pattern1);
  const before = content.substring(Math.max(0, idx - 150), idx);
  console.log('Contexte avant:\n' + before);
}
