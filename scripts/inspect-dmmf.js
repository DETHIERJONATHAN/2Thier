const { dmmf } = require('@prisma/client');
const model = dmmf.schema.models.find(m => m.name === 'TreeBranchLeafNode');
if (!model) {
  console.error('Model TreeBranchLeafNode not found in DMMF');
  process.exit(1);
}
console.log('Fields for TreeBranchLeafNode:\n');
console.log(model.fields.map(f => ({ name: f.name, dbName: f.dbName || f.name })).sort((a,b)=>a.name.localeCompare(b.name)));
