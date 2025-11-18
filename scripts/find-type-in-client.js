const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'node_modules', '@prisma', 'client');
function walk(dir) {
  const res = [];
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) res.push(...walk(full));
    else if (file.endsWith('.d.ts')) res.push(full);
  });
  return res;
}
const files = walk(root);
let found = false;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('TreeBranchLeafNode')) {
    console.log('Found in', file);
    found = true;
  }
});
if (!found) console.log('Type TreeBranchLeafNode not found in @prisma/client d.ts');
