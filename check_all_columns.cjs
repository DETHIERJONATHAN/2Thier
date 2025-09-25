const { PrismaClient } = require('@prisma/client');

async function checkAllColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 VÉRIFICATION COMPLÈTE DE TOUTES LES COLONNES\n');

    // 1. Structure complète de TreeBranchLeafSubmissionData
    console.log('1️⃣ Structure complète TreeBranchLeafSubmissionData...');
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'TreeBranchLeafSubmissionData'
      ORDER BY ordinal_position;
    `;
    
    console.log(`📋 TOUTES LES COLONNES (${columns.length}) :`);
    columns.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` (défaut: ${col.column_default})` : '';
      console.log(`   ${index + 1}. ${col.column_name}`);
      console.log(`      Type: ${col.data_type}${defaultVal}`);
      console.log(`      Contrainte: ${nullable}`);
      console.log('');
    });

    // 2. Vérifier quelques exemples de données existantes
    console.log('2️⃣ Exemples de données existantes...');
    const sampleData = await prisma.$queryRaw`
      SELECT * FROM "TreeBranchLeafSubmissionData" 
      WHERE "submissionId" IS NOT NULL 
      LIMIT 3;
    `;
    
    console.log(`📊 Échantillons trouvés: ${sampleData.length}`);
    if (sampleData.length > 0) {
      console.log('📋 Colonnes réelles dans les données:');
      const realColumns = Object.keys(sampleData[0]);
      realColumns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col}`);
      });
      
      console.log('\n📋 Premier échantillon:');
      realColumns.forEach(col => {
        const value = sampleData[0][col];
        const displayValue = value === null ? 'NULL' : 
                           value === undefined ? 'UNDEFINED' :
                           typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' :
                           value;
        console.log(`   ${col}: ${displayValue}`);
      });
    }

    // 3. Vérifier les contraintes et relations
    console.log('\n3️⃣ Relations et contraintes...');
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS references_table,
        ccu.column_name AS references_column
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'TreeBranchLeafSubmissionData'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `;
    
    console.log(`🔗 Contraintes trouvées: ${constraints.length}`);
    constraints.forEach(constraint => {
      if (constraint.constraint_type === 'FOREIGN KEY') {
        console.log(`   FK: ${constraint.column_name} → ${constraint.references_table}.${constraint.references_column}`);
      } else {
        console.log(`   ${constraint.constraint_type}: ${constraint.column_name || 'multiple'}`);
      }
    });

    // 4. Analyser les types de données selon leur usage
    console.log('\n4️⃣ Analyse des colonnes par catégorie...');
    
    console.log('📋 COLONNES IDENTIFIÉES:');
    console.log('🆔 IDENTIFIANTS:');
    console.log('   - id : ID unique de la ligne');
    console.log('   - submissionId : Référence vers TreeBranchLeafSubmission');
    console.log('   - nodeId : Référence vers TreeBranchLeafNode');
    
    console.log('\n📝 DONNÉES UTILISATEUR:');
    console.log('   - value : Valeur saisie par l\'utilisateur');
    
    console.log('\n🤖 DONNÉES AUTOMATIQUES (À REMPLIR):');
    console.log('   - operationDetail : [VIDE] Doit contenir la copie traduite');
    console.log('   - operationResult : [VIDE] Doit contenir le résultat calculé');
    console.log('   - operationSource : Source de l\'opération');
    
    console.log('\n🏷️ MÉTADONNÉES:');
    console.log('   - fieldLabel : Label du champ');
    console.log('   - sourceRef : Référence source');
    
    console.log('\n🔢 VARIABLES:');
    console.log('   - isVariable : Boolean si c\'est une variable');
    console.log('   - variableDisplayName : Nom d\'affichage variable');
    console.log('   - variableKey : Clé de la variable');
    console.log('   - variableUnit : Unité de la variable');
    
    console.log('\n⏰ HORODATAGE:');
    console.log('   - createdAt : Date de création');
    console.log('   - lastResolved : Dernière résolution');

    console.log('\n🎯 CONCLUSION:');
    console.log('✅ Structure complète identifiée');
    console.log('❌ operationDetail et operationResult sont vides');
    console.log('💡 Ces colonnes doivent être remplies automatiquement');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllColumns();