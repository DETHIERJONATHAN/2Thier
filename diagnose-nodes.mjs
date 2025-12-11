/**
 * Diagnostic: Vérifier si les nodes suffixés existent
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 DIAGNOSTIC: NODES SUFFIXÉS\n');

// Chercher les node IDs qui contiennent "1764930447619"
// (C'est le timestamp du shared-ref ID)

console.log('Chercher tous les nodes avec "1764930447619" en BD:');
console.log('(Cela peut prendre un moment...)\n');

try {
  // Utiliser prisma db execute pour faire une requête SQL directe
  const { stdout } = await execAsync(`
cd "${process.cwd()}" && npx prisma db execute --stdin <<'EOF'
SELECT id, label, isSharedReference, sharedReferenceId
FROM "TreeBranchLeafNode"
WHERE id LIKE '%1764930447619%'
LIMIT 20;
EOF
`, { maxBuffer: 10 * 1024 * 1024 });
  
  console.log('Nodes trouvés:');
  console.log(stdout);
  
  // Maintenant chercher dans les shared-ref IDs aussi
  const { stdout: stdout2 } = await execAsync(`
cd "${process.cwd()}" && npx prisma db execute --stdin <<'EOF'
SELECT id, label, sharedReferenceId
FROM "TreeBranchLeafNode"
WHERE sharedReferenceId LIKE '%1764930447619%'
LIMIT 20;
EOF
`, { maxBuffer: 10 * 1024 * 1024 });
  
  console.log('\nNodes qui RÉFÉRENCENT des shared-ref avec ce timestamp:');
  console.log(stdout2);

} catch (err) {
  console.log('❌ Error:', err.stderr || err.message);
}

console.log('\n✓ Fin du diagnostic');
