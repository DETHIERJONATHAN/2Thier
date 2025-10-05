const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TreeBranchLeaf', 'treebranchleaf-new', 'components', 'Parameters', 'capabilities', 'TablePanel.tsx');

console.log('📖 Lecture du fichier TablePanel.tsx...');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`📊 Fichier contient ${lines.length} lignes`);

// Trouver la fin du bloc columns
let columnsEndLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("cfg.type === 'columns'")) {
    // Trouver le </> ou )} qui ferme ce bloc
    let braceCount = 0;
    let inBlock = false;
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('{')) braceCount++;
      if (lines[j].includes('}')) {
        braceCount--;
        if (braceCount === 0 && inBlock) {
          columnsEndLine = j;
          break;
        }
      }
      if (braceCount > 0) inBlock = true;
    }
    break;
  }
}

console.log(`✅ Fin du bloc 'columns' trouvée à la ligne ${columnsEndLine + 1}`);

// Trouver le début de la section "Lookup & liaisons"
let lookupStartLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Lookup & liaisons')) {
    // Remonter pour trouver le <Divider> avant
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].trim().startsWith('<Divider')) {
        lookupStartLine = j;
        break;
      }
    }
    break;
  }
}

console.log(`✅ Début de la section 'Lookup & liaisons' trouvée à la ligne ${lookupStartLine + 1}`);

// Trouver la fin de la section "Lookup & liaisons"
let lookupEndLine = -1;
if (lookupStartLine !== -1) {
  let spaceCount = 0;
  let inLookupSpace = false;
  for (let i = lookupStartLine; i < lines.length; i++) {
    if (lines[i].includes('<Space') && lines[i].includes('direction="vertical"')) {
      spaceCount++;
      inLookupSpace = true;
    }
    if (lines[i].includes('</Space>') && inLookupSpace) {
      spaceCount--;
      if (spaceCount === 0) {
        lookupEndLine = i;
        break;
      }
    }
  }
}

console.log(`✅ Fin de la section 'Lookup & liaisons' trouvée à la ligne ${lookupEndLine + 1}`);

if (columnsEndLine === -1 || lookupStartLine === -1 || lookupEndLine === -1) {
  console.error('❌ Impossible de trouver les sections nécessaires');
  console.log({ columnsEndLine, lookupStartLine, lookupEndLine });
  process.exit(1);
}

// Extraire la section Lookup
const lookupSection = lines.slice(lookupStartLine, lookupEndLine + 1);
console.log(`📦 Section Lookup extraite (${lookupSection.length} lignes)`);

// Adapter la section pour cacher les champs "ligne" et "résultat" en mode columns
const adaptedLookup = [];
let inRowField = false;
let inResultField = false;
let fieldDepth = 0;

for (let i = 0; i < lookupSection.length; i++) {
  const line = lookupSection[i];
  
  // Détecter le début du champ "ligne"
  if (line.includes('Champ à transformer en liste (ligne)')) {
    inRowField = true;
    fieldDepth = 0;
    adaptedLookup.push(line.replace('<div style=', "{cfg.type === 'matrix' && (<div style="));
    continue;
  }
  
  // Détecter le début du champ "résultat"
  if (line.includes('Champ résultat (automatique)')) {
    inResultField = true;
    fieldDepth = 0;
    adaptedLookup.push(line.replace('<div style=', "{cfg.type === 'matrix' && (<div style="));
    continue;
  }
  
  // Gérer la fermeture des divs
  if (inRowField || inResultField) {
    if (line.includes('<div')) fieldDepth++;
    if (line.includes('</div>')) {
      fieldDepth--;
      if (fieldDepth < 0) {
        // Fin du champ
        adaptedLookup.push(line + ')}');
        inRowField = false;
        inResultField = false;
        continue;
      }
    }
  }
  
  adaptedLookup.push(line);
}

console.log(`🔧 Section Lookup adaptée (${adaptedLookup.length} lignes)`);

// Modifier le tooltip pour qu'il soit générique
const finalLookup = adaptedLookup.map(line => {
  if (line.includes('Associe ce tableau croisé à des champs ligne/colonne')) {
    return line.replace(
      'Associe ce tableau croisé à des champs ligne/colonne pour calculer une valeur automatiquement.',
      'Transforme une colonne de ce tableau en liste déroulante. En mode croisé, associe aussi des champs ligne/colonne.'
    );
  }
  return line;
});

// Reconstruire le fichier
const before = lines.slice(0, columnsEndLine + 1);
const lookupWithBlankLines = ['', '', ...finalLookup, ''];
const after = lines.slice(columnsEndLine + 1, lookupStartLine).concat(lines.slice(lookupEndLine + 1));

const newLines = before.concat(lookupWithBlankLines).concat(after);
const newContent = newLines.join('\n');

console.log(`💾 Sauvegarde du fichier modifié...`);
console.log(`   - Avant: ${lines.length} lignes`);
console.log(`   - Après: ${newLines.length} lignes`);

fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Section Lookup déplacée avec succès !');
console.log('📍 Position: Après le bloc COLUMNS, avant le bloc MATRIX');
console.log('🎯 Champs "ligne" et "résultat" cachés en mode COLUMNS');
