let dmmf;
try {
  // Prefer the .prisma client generated path
  dmmf = require('./node_modules/.prisma/client').dmmf;
} catch (e) {
  try {
    dmmf = require('@prisma/client/runtime').dmmf;
  } catch (err) {
    try {
      dmmf = require('@prisma/client').Prisma.dmmf;
    } catch (err2) {
      console.error('Unable to load dmmf from @prisma/client.');
      console.error(e, err, err2);
      process.exit(1);
    }
  }
}
const models = dmmf.schema && dmmf.schema.models ? dmmf.schema.models : [];
console.log('Models in DMMF: ', models.map(m => m.name).slice(0, 50));
const model = models.find(m => m.name === 'TreeBranchLeafNode');
if (!model) {
  console.error('Model TreeBranchLeafNode not found in DMMF');
  process.exit(1);
}
console.log('Fields for TreeBranchLeafNode:\n');
console.log(model.fields.map(f => ({ name: f.name, dbName: f.dbName || f.name })).sort((a,b)=>a.name.localeCompare(b.name)));
