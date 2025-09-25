const { PrismaClient } = require('@prisma/client');

async function nettoyerAncienneConfig() {
  let prisma;
  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    
    console.log('🧹 NETTOYAGE ANCIENNE CONFIGURATION');
    console.log('===================================\n');
    
    // Récupérer la config actuelle
    const field = await prisma.field.findUnique({
      where: { id: '52c7f63b-7e57-4ba8-86da-19a176f09220' }
    });
    
    if (field && field.advancedConfig) {
      const config = field.advancedConfig;
      console.log('Config avant nettoyage:', JSON.stringify(config, null, 2));
      
      // Nettoyer la configuration
      const cleanConfig = {
        ui: config.ui, // Garder UI
        min: config.min,
        step: config.step,
        color: config.color, // ✅ Garder couleurs
        textColor: config.textColor, // ✅ Garder couleurs
        reactive: config.reactive,
        numberType: config.numberType,
        validation: config.validation, // ✅ Garder validations
        dependencies: config.dependencies, // ✅ Garder dépendances
        autoCalculate: config.autoCalculate,
        decimalPlaces: config.decimalPlaces,
        displayFormat: config.displayFormat,
        // ❌ SUPPRIMER calculation (remplacé par fieldFormula)
        // ❌ SUPPRIMER composer (inutile)
      };
      
      console.log('\\nConfig après nettoyage:', JSON.stringify(cleanConfig, null, 2));
      
      // Appliquer le nettoyage
      await prisma.field.update({
        where: { id: '52c7f63b-7e57-4ba8-86da-19a176f09220' },
        data: { advancedConfig: cleanConfig }
      });
      
      console.log('✅ Configuration nettoyée !');
      console.log('✅ Couleurs préservées');
      console.log('✅ Validations préservées');
      console.log('✅ Dépendances préservées');
      console.log('❌ Ancien système calculation supprimé');
      console.log('❌ Composer inutile supprimé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

nettoyerAncienneConfig();
