import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 DIAGNOSTIC SHARED-REFS - Direct SQL\n');

// Chercher les tokens de la formule copiée COS
const cosQuery = `
SELECT id, tokens FROM "TreeBranchLeafNodeFormula" 
WHERE id = 'af69d29c-a815-460a-a184-c12738d807fe-1'
`;

const racineQuery = `
SELECT id, tokens FROM "TreeBranchLeafNodeFormula" 
WHERE id = 'd443f3b4-428a-434e-83ae-e809ca15afd2-1'
`;

console.log('📌 Formule COS COPIÉE:');
console.log(`   Chercher: af69d29c-a815-460a-a184-c12738d807fe-1`);

try {
  const { stdout } = await execAsync(`npx prisma db execute --stdin`, {
    input: `SELECT json_extract(tokens, '$') as tokens_raw FROM "TreeBranchLeafNodeFormula" WHERE id = 'af69d29c-a815-460a-a184-c12738d807fe-1';`,
    cwd: process.cwd()
  });
  console.log('   Résultat:');
  console.log(stdout);
} catch (err) {
  console.log('   ❌ Error:', err.message?.split('\n')[0]);
}

console.log('\n📌 Maintenant, chercher les shared-refs EN BD:\n');

// Chercher tous les shared-refs qui contiennent "1764930447619"
console.log('Chercher tous les shared-refs avec "1764930447619" en BD:');
try {
  const { stdout } = await execAsync(`npx prisma db execute --stdin`, {
    input: `SELECT id, name FROM "TreeBranchLeafSharedRef" WHERE id LIKE '%1764930447619%' LIMIT 10;`,
    cwd: process.cwd()
  });
  console.log(stdout);
} catch (err) {
  console.log('Error:', err.message?.split('\n')[0]);
}

console.log('\n');
console.log('Chercher tous les shared-refs qui finissent par -1 (suffixés):');
try {
  const { stdout } = await execAsync(`npx prisma db execute --stdin`, {
    input: `SELECT id, name FROM "TreeBranchLeafSharedRef" WHERE id LIKE '%-1' LIMIT 20;`,
    cwd: process.cwd()
  });
  console.log(stdout.substring(0, 500));
} catch (err) {
  console.log('Error:', err.message?.split('\n')[0]);
}
