import { PrismaClient } from '@prisma/client';

async function findAllRelevantVariables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 RECHERCHE ÉTENDUE DES VARIABLES');
    console.log('='.repeat(60));
    
    // Chercher toutes les variables du tree qui contiennent des mots-clés pertinents
    const allVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          { displayName: { contains: 'prix', mode: 'insensitive' } },
          { displayName: { contains: 'kwh', mode: 'insensitive' } },
          { displayName: { contains: 'kw', mode: 'insensitive' } },
          { displayName: { contains: 'consommation', mode: 'insensitive' } },
          { displayName: { contains: 'tarif', mode: 'insensitive' } },
          { displayName: { contains: 'coût', mode: 'insensitive' } },
          { displayName: { contains: 'facture', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`Variables pertinentes trouvées: ${allVars.length}`);
    allVars.forEach(v => {
      console.log('- ID:', v.id.substring(0,8)+'...');
      console.log('  DisplayName:', v.displayName);
      console.log('  ExposedKey:', v.exposedKey);
      console.log('  SourceRef:', v.sourceRef || 'null');
      console.log('  FixedValue:', v.fixedValue || 'null');
      console.log('  ---');
    });
    
    // Maintenant, implémentons la vraie logique !
    console.log('\n🧮 IMPLÉMENTATION DE LA LOGIQUE DYNAMIQUE');
    console.log('='.repeat(60));
    
    console.log('🎯 LOGIQUE À IMPLÉMENTER:');
    console.log('1. Condition ff05cc48-27ec-4d94-8975-30a0f9c1c275:');
    console.log('   - SI @value.702d1b09-abc9-4096-9aaa-77155ac5294f isNotEmpty');
    console.log('   - ALORS montrer ce node');
    console.log('   - SINON calculer formule 7097ff9b-974a-4fb3-80d8-49634a634efc');
    console.log('');
    console.log('2. Formule 7097ff9b-974a-4fb3-80d8-49634a634efc:');
    console.log('   - @value.d6212e5e-3fe9-4cce-b380-e6745524d011 / @value.node_1757366229534_x6jxzmvmu');
    console.log('   - Résultat = Prix total / Consommation kWh = Prix par kWh');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAllRelevantVariables();