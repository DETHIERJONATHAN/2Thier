const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchInAll() {
  console.log('🔍 Recherche de cb42c9a9-c6b4-49bb-bd55-74d763123bfb dans TOUTES les colonnes JSON...');
  
  const query = `
    SELECT 'TreeBranchLeafNode' as table_name, id, label, 'metadata' as field_name, metadata::text as content
    FROM "TreeBranchLeafNode" 
    WHERE metadata::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    
    UNION ALL
    
    SELECT 'TreeBranchLeafNode' as table_name, id, label, 'value' as field_name, value::text as content
    FROM "TreeBranchLeafNode" 
    WHERE value::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    
    UNION ALL
    
    SELECT 'TreeBranchLeafNode' as table_name, id, label, 'defaultValue' as field_name, "defaultValue"::text as content
    FROM "TreeBranchLeafNode" 
    WHERE "defaultValue"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    
    UNION ALL
    
    SELECT 'TreeBranchLeafNode' as table_name, id, label, 'calculatedValue' as field_name, "calculatedValue"::text as content
    FROM "TreeBranchLeafNode" 
    WHERE "calculatedValue"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
  `;
  
  const results = await prisma.$queryRawUnsafe(query);
  
  if (results.length > 0) {
    console.log(`✅ Trouvé ${results.length} résultat(s):`);
    results.forEach((r, i) => {
      console.log(`\nRésultat ${i+1}:`, {
        table: r.table_name,
        id: r.id,
        label: r.label,
        field: r.field_name,
        content: r.content.substring(0, 200) + '...'
      });
    });
  } else {
    console.log('❌ Aucun résultat trouvé dans les colonnes JSON');
  }
  
  await prisma.$disconnect();
}

searchInAll().catch(console.error);