const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

function parseModelFields(schemaPath, modelName) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const lines = schema.split(/\r?\n/);
  let inModel = false;
  const fields = [];
  for (let raw of lines) {
    let line = raw.trim();
    if (!inModel) {
      if (line.startsWith('model ') && line.includes(modelName)) {
        inModel = true;
      }
      continue;
    }
    if (line.startsWith('}')) break;
    // Skip comments and @@ indexes
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    // Field lines look like: `name Type? annotations...`
    const tokens = line.split(/\s+/);
    if (tokens.length >= 2) {
      let name = tokens[0];
      // Remove optional field mapping like @map(...) trailing on the same token may not be present
      // ignore \"index\" or @@
      if (name.startsWith('@')) continue;
      // remove optional colon at end
      name = name.replace(/,$/, '');
      fields.push(name);
    }
  }
  return fields;
}

(async()=>{
  try {
    const modelName = 'TreeBranchLeafNode';
    const schemaPath = './prisma/schema.prisma';
    const modelFields = parseModelFields(schemaPath, modelName);
    console.log('Prisma model fields count:', modelFields.length);

    const prisma = new PrismaClient();
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = ${modelName}`;
    const dbColumns = cols.map(r => r.column_name);
    console.log('DB columns count:', dbColumns.length);

    const missingInDB = modelFields.filter(f => !dbColumns.includes(f));
    const extraInDB = dbColumns.filter(c => !modelFields.includes(c));

    console.log('\n---- Missing in DB (in model but not in DB):', missingInDB.length);
    console.log(missingInDB.slice(0,100));
    console.log('\n---- Extra in DB (in DB but not in model):', extraInDB.length);
    console.log(extraInDB.slice(0,100));

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error comparing fields:', err);
  }
})();
