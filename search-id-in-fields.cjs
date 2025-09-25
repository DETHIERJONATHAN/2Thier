/**
 * 🔍 RECHERCHE INTELLIGENTE DE L'ID DANS TOUS LES CHAMPS
 * 
 * L'ID cb42c9a9-c6b4-49bb-bd55-74d763123bfb est probablement dans un champ,
 * pas comme ID principal !
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchInAllFields() {
  const elementId = 'cb42c9a9-c6b4-49bb-bd55-74d763123bfb';
  
  console.log(`🔍 RECHERCHE COMPLÈTE de ${elementId} dans TOUS les champs\n`);
  
  try {
    // 1. Chercher dans TreeBranchLeafNode - tous les champs texte et JSON
    console.log('📋 Recherche dans TreeBranchLeafNode...');
    
    const nodesWithId = await prisma.$queryRaw`
      SELECT id, label, type, "tbl_code", "value", "calculatedValue", "defaultValue",
             "metadata", "fieldConfig", "conditionConfig", "formulaConfig"
      FROM "TreeBranchLeafNode" 
      WHERE 
        "value"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "calculatedValue"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "defaultValue"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "metadata"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "fieldConfig"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "conditionConfig"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "formulaConfig"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    `;
    
    if (nodesWithId.length > 0) {
      console.log(`✅ Trouvé dans ${nodesWithId.length} node(s) TreeBranchLeafNode:`);
      nodesWithId.forEach(node => {
        console.log(`\n📋 Node: ${node.label} (${node.type})`);
        console.log(`   ID: ${node.id}`);
        console.log(`   TBL Code: ${node.tbl_code || 'Aucun'}`);
        
        // Vérifier chaque champ
        if (node.value && node.value.includes(elementId)) {
          console.log(`   🎯 Trouvé dans VALUE: ${node.value}`);
        }
        if (node.calculatedValue && node.calculatedValue.includes(elementId)) {
          console.log(`   🧮 Trouvé dans CALCULATED_VALUE: ${node.calculatedValue}`);
        }
        if (node.defaultValue && node.defaultValue.includes(elementId)) {
          console.log(`   📝 Trouvé dans DEFAULT_VALUE: ${node.defaultValue}`);
        }
        if (node.metadata && JSON.stringify(node.metadata).includes(elementId)) {
          console.log(`   📊 Trouvé dans METADATA: ${JSON.stringify(node.metadata).substring(0, 200)}...`);
        }
        if (node.fieldConfig && JSON.stringify(node.fieldConfig).includes(elementId)) {
          console.log(`   ⚙️ Trouvé dans FIELD_CONFIG: ${JSON.stringify(node.fieldConfig).substring(0, 200)}...`);
        }
        if (node.conditionConfig && JSON.stringify(node.conditionConfig).includes(elementId)) {
          console.log(`   ⚖️ Trouvé dans CONDITION_CONFIG: ${JSON.stringify(node.conditionConfig).substring(0, 200)}...`);
        }
        if (node.formulaConfig && JSON.stringify(node.formulaConfig).includes(elementId)) {
          console.log(`   🧮 Trouvé dans FORMULA_CONFIG: ${JSON.stringify(node.formulaConfig).substring(0, 200)}...`);
        }
      });
    } else {
      console.log('❌ Aucun résultat dans TreeBranchLeafNode');
    }
    
    // 2. Chercher dans TreeBranchLeafNodeFormula - tokens
    console.log('\n🧮 Recherche dans TreeBranchLeafNodeFormula...');
    
    const formulasWithId = await prisma.$queryRaw`
      SELECT f.id, f."nodeId", f.name, f.tokens, n.label as node_label, n.type as node_type, n."tbl_code"
      FROM "TreeBranchLeafNodeFormula" f
      LEFT JOIN "TreeBranchLeafNode" n ON f."nodeId" = n.id
      WHERE f.tokens::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    `;
    
    if (formulasWithId.length > 0) {
      console.log(`✅ Trouvé dans ${formulasWithId.length} formule(s):`);
      formulasWithId.forEach(formula => {
        console.log(`\n🧮 Formule: ${formula.name}`);
        console.log(`   Node: ${formula.node_label} (${formula.node_type})`);
        console.log(`   Node ID: ${formula.nodeId}`);
        console.log(`   TBL Code: ${formula.tbl_code || 'Aucun'}`);
        console.log(`   Tokens: ${JSON.stringify(formula.tokens).substring(0, 300)}...`);
      });
    } else {
      console.log('❌ Aucun résultat dans TreeBranchLeafNodeFormula');
    }
    
    // 3. Chercher dans TreeBranchLeafNodeCondition - conditionSet
    console.log('\n⚖️ Recherche dans TreeBranchLeafNodeCondition...');
    
    const conditionsWithId = await prisma.$queryRaw`
      SELECT c.id, c."nodeId", c.name, c."conditionSet", n.label as node_label, n.type as node_type, n."tbl_code"
      FROM "TreeBranchLeafNodeCondition" c
      LEFT JOIN "TreeBranchLeafNode" n ON c."nodeId" = n.id
      WHERE c."conditionSet"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    `;
    
    if (conditionsWithId.length > 0) {
      console.log(`✅ Trouvé dans ${conditionsWithId.length} condition(s):`);
      conditionsWithId.forEach(condition => {
        console.log(`\n⚖️ Condition: ${condition.name}`);
        console.log(`   Node: ${condition.node_label} (${condition.node_type})`);
        console.log(`   Node ID: ${condition.nodeId}`);
        console.log(`   TBL Code: ${condition.tbl_code || 'Aucun'}`);
        console.log(`   ConditionSet: ${JSON.stringify(condition.conditionSet).substring(0, 300)}...`);
      });
    } else {
      console.log('❌ Aucun résultat dans TreeBranchLeafNodeCondition');
    }
    
    // 4. Chercher dans TreeBranchLeafNodeTable si elle existe
    console.log('\n📊 Recherche dans TreeBranchLeafNodeTable...');
    
    try {
      const tablesWithId = await prisma.$queryRaw`
        SELECT t.id, t."nodeId", t.name, t."tableData", n.label as node_label, n.type as node_type, n."tbl_code"
        FROM "TreeBranchLeafNodeTable" t
        LEFT JOIN "TreeBranchLeafNode" n ON t."nodeId" = n.id
        WHERE t."tableData"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
      `;
      
      if (tablesWithId.length > 0) {
        console.log(`✅ Trouvé dans ${tablesWithId.length} tableau(x):`);
        tablesWithId.forEach(table => {
          console.log(`\n📊 Table: ${table.name || 'Sans nom'}`);
          console.log(`   Node: ${table.node_label} (${table.node_type})`);
          console.log(`   Node ID: ${table.nodeId}`);
          console.log(`   TBL Code: ${table.tbl_code || 'Aucun'}`);
          console.log(`   TableData: ${JSON.stringify(table.tableData).substring(0, 300)}...`);
        });
      } else {
        console.log('❌ Aucun résultat dans TreeBranchLeafNodeTable');
      }
    } catch (error) {
      console.log('⚠️ Table TreeBranchLeafNodeTable non accessible ou n\'existe pas');
    }
    
    // 5. Recherche dans tous les autres champs JSON potentiels
    console.log('\n🔍 Recherche dans autres champs JSON de TreeBranchLeafNode...');
    
    const otherFields = await prisma.$queryRaw`
      SELECT id, label, type, "tbl_code",
             "api_bodyVars", "api_instances", "condition_branches", "condition_instances", "condition_tokens",
             "data_instances", "formula_instances", "formula_tokens", "image_thumbnails",
             "link_instances", "link_params", "markers_available", "markers_instances", "markers_selectedIds",
             "select_options", "table_columns", "table_data", "table_instances", "table_meta", "table_rows"
      FROM "TreeBranchLeafNode" 
      WHERE 
        "api_bodyVars"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "api_instances"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "condition_branches"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "condition_instances"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "condition_tokens"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "data_instances"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "formula_instances"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "formula_tokens"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "link_instances"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "link_params"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "markers_instances"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "select_options"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%' OR
        "table_data"::text LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
    `;
    
    if (otherFields.length > 0) {
      console.log(`✅ Trouvé dans ${otherFields.length} autre(s) champ(s):`);
      otherFields.forEach(node => {
        console.log(`\n📋 Node: ${node.label} (${node.type})`);
        console.log(`   ID: ${node.id}`);
        console.log(`   TBL Code: ${node.tbl_code || 'Aucun'}`);
        
        // Lister tous les champs où on l'a trouvé
        const fields = [
          'api_bodyVars', 'api_instances', 'condition_branches', 'condition_instances', 'condition_tokens',
          'data_instances', 'formula_instances', 'formula_tokens', 'link_instances', 'link_params',
          'markers_instances', 'select_options', 'table_data'
        ];
        
        fields.forEach(field => {
          const value = node[field];
          if (value && JSON.stringify(value).includes(elementId)) {
            console.log(`   🎯 Trouvé dans ${field.toUpperCase()}: ${JSON.stringify(value).substring(0, 200)}...`);
          }
        });
      });
    } else {
      console.log('❌ Aucun résultat dans les autres champs JSON');
    }
    
    // 6. Recherche générale dans toute la base
    console.log('\n🌐 Recherche générale dans toutes les tables contenant des JSON...');
    
    // Chercher dans d'autres tables potentielles
    const allTables = [
      'Lead', 'Organization', 'User', 'FormSubmission', 'TreeBranchLeafSubmissionData'
    ];
    
    for (const tableName of allTables) {
      try {
        console.log(`   Recherche dans ${tableName}...`);
        const results = await prisma.$queryRawUnsafe(`
          SELECT * FROM "${tableName}" 
          WHERE CAST(row_to_json("${tableName}") AS TEXT) LIKE '%cb42c9a9-c6b4-49bb-bd55-74d763123bfb%'
          LIMIT 5
        `);
        
        if (results.length > 0) {
          console.log(`   ✅ Trouvé ${results.length} résultat(s) dans ${tableName}`);
          results.forEach((result, index) => {
            console.log(`      ${index + 1}. ID: ${result.id}, Data: ${JSON.stringify(result).substring(0, 150)}...`);
          });
        }
      } catch (error) {
        // Table n'existe pas ou erreur d'accès
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchInAllFields().catch(console.error);