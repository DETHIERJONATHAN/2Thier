const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔍 DIAGNOSTIC 3: Analyse du code source');
console.log('='.repeat(80) + '\n');

const routesFile = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');

try {
  const content = fs.readFileSync(routesFile, 'utf-8');
  
  // Chercher les occurrences de table_instances
  const lines = content.split('\n');
  const assignments = [];
  
  lines.forEach((line, i) => {
    if (line.includes('table_instances') && (
      line.includes(':') || 
      line.includes('=') || 
      line.includes('data')
    )) {
      assignments.push({
        line: i + 1,
        code: line.trim(),
        context: 'Assignment or property'
      });
    }
  });

  console.log(`📍 Trouvé ${assignments.length} occurrences de "table_instances"\n`);

  assignments.slice(0, 20).forEach(({ line, code }) => {
    console.log(`Line ${line.toString().padStart(5)}: ${code.substring(0, 100)}`);
  });

  // Chercher specificaly deepCopyNodeInternal
  console.log('\n' + '─'.repeat(80));
  console.log('\n🔍 Fonction deepCopyNodeInternal:\n');

  const deepCopyStart = lines.findIndex(l => l.includes('async function deepCopyNodeInternal'));
  if (deepCopyStart !== -1) {
    console.log(`✅ Trouvée à la ligne ${deepCopyStart + 1}`);
    
    // Chercher la ligne avec table_instances dans cette fonction
    const funcEnd = lines.findIndex((l, i) => i > deepCopyStart && l.match(/^}/));
    const funcLines = lines.slice(deepCopyStart, funcEnd);
    
    const tableInstancesLine = funcLines.findIndex(l => l.includes('table_instances:'));
    if (tableInstancesLine !== -1) {
      console.log(`   → table_instances trouvée à ligne ${deepCopyStart + tableInstancesLine + 1}`);
      
      // Montrer le code autour
      console.log('\n   📝 Code autour:');
      const start = Math.max(0, tableInstancesLine - 2);
      const end = Math.min(funcLines.length, tableInstancesLine + 15);
      
      funcLines.slice(start, end).forEach((line, i) => {
        const lineNum = deepCopyStart + start + i + 1;
        const marker = i === (tableInstancesLine - start) ? '→ ' : '  ';
        console.log(`   ${marker}${lineNum.toString().padStart(5)}: ${line.substring(0, 100)}`);
      });
    }
  } else {
    console.log(`❌ Fonction deepCopyNodeInternal NON trouvée!`);
  }

  // Chercher si table_instances est assignée sans suffixe ailleurs
  console.log('\n' + '─'.repeat(80));
  console.log('\n⚠️ Chercher les assignements SANS suffixe:\n');

  const problematicLines = lines.filter((line, i) => {
    if (!line.includes('table_instances')) return false;
    if (line.includes('__copySuffixNum')) return false;  // OK si suffixe
    if (line.includes('const ') || line.includes('for ')) return false; // OK declarations
    if (line.includes('-1')) return false; // OK si déjà avec suffixe
    if (line.includes('oldNode.table_instances')) return true; // PROBLÈME!
    return false;
  });

  if (problematicLines.length > 0) {
    console.log(`⚠️ Trouvé ${problematicLines.length} lignes potentiellement problématiques:\n`);
    problematicLines.slice(0, 10).forEach(line => {
      console.log(`   ⚠️ ${line.trim().substring(0, 100)}`);
    });
  } else {
    console.log('✅ Aucune assignement problématique détectée');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
}

console.log('\n' + '='.repeat(80) + '\n');
