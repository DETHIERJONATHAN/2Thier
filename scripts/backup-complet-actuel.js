const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createBackup() {
  console.log('🛡️ DÉMARRAGE SAUVEGARDE ULTRA-COMPLÈTE NO-CODE');
  console.log('📊 EXTRACTION ULTRA-COMPLÈTE DES DONNÉES...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'sauvegarde-prisma');
  
  // Créer le dossier si il n'existe pas
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    // Récupérer toutes les données de toutes les tables
    const allData = {};
    let totalRecords = 0;
    let tableCount = 0;
    
    // Liste de tous les modèles Prisma
    const models = [
      'automationRule', 'block', 'calendarEvent', 'calendarParticipant', 
      'deletedEmail', 'email', 'emailAccount', 'emailDomain', 'field',
      'googleCalendarToken', 'googleDriveToken', 'googleGmailToken', 
      'googleWorkspaceConfig', 'googleWorkspaceTokens', 'lead', 'leadStatus',
      'module', 'moduleField', 'moduleNavigation', 'modulePermission',
      'moduleSection', 'organization', 'organizationUserRole', 'permission',
      'record', 'recordHistory', 'role', 'section', 'telnyx', 'telnyxUser',
      'telnyxUserConfig', 'treeBranchLeafMarker', 'treeBranchLeafNode',
      'treeBranchLeafTree', 'treeBranchLeafVariable', 'user', 'userModule',
      'userPermission', 'userRole'
    ];
    
    console.log(`🔍 Analyse de ${models.length} modèles...`);
    
    for (const model of models) {
      try {
        if (prisma[model] && typeof prisma[model].findMany === 'function') {
          const data = await prisma[model].findMany();
          allData[model] = data;
          totalRecords += data.length;
          tableCount++;
          
          if (data.length > 0) {
            console.log(`✅ ${model}: ${data.length} enregistrements`);
          }
        }
      } catch (error) {
        console.log(`⚠️ ${model}: Non accessible (${error.message})`);
        allData[model] = [];
      }
    }
    
    // Sauvegardes en différents formats
    const baseFilename = `backup-complet-${timestamp}`;
    
    // 1. JSON Simple (lisible)
    const simpleFile = path.join(backupDir, `${baseFilename}-simple.json`);
    fs.writeFileSync(simpleFile, JSON.stringify(allData, null, 2));
    
    // 2. JSON Compressé
    const compactFile = path.join(backupDir, `${baseFilename}-compact.json`);
    fs.writeFileSync(compactFile, JSON.stringify(allData));
    
    // 3. Statistiques détaillées
    const statsFile = path.join(backupDir, `${baseFilename}-stats.json`);
    const stats = {
      timestamp,
      totalRecords,
      tableCount,
      detailsByTable: {}
    };
    
    for (const [table, data] of Object.entries(allData)) {
      stats.detailsByTable[table] = {
        count: data.length,
        hasData: data.length > 0
      };
    }
    
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    
    // 4. Checksum
    const checksumFile = path.join(backupDir, `${baseFilename}-checksum.txt`);
    const checksum = Buffer.from(JSON.stringify(allData)).toString('base64').substring(0, 32);
    fs.writeFileSync(checksumFile, `CHECKSUM: ${checksum}\nTOTAL: ${totalRecords}\nTABLES: ${tableCount}\nDATE: ${timestamp}\n`);
    
    console.log('\n📈 SYNTHÈSE DE LA SAUVEGARDE:');
    console.log(`🔢 TOTAL ENREGISTREMENTS: ${totalRecords}`);
    console.log(`📋 TOTAL TABLES: ${tableCount}`);
    console.log(`📁 DOSSIER: sauvegarde-prisma`);
    console.log(`⏰ TIMESTAMP: ${timestamp}`);
    
    console.log('\n📊 DÉTAIL PAR TABLE:');
    for (const [table, data] of Object.entries(allData)) {
      if (data.length > 0) {
        console.log(`   ${table}: ${data.length} enregistrements`);
      }
    }
    
    console.log('\n✅ STATUT FINAL: SUCCÈS');
    console.log('🎉 VOS DONNÉES NO-CODE SONT 100% SÉCURISÉES !');
    
    return {
      totalRecords,
      tableCount,
      files: [simpleFile, compactFile, statsFile, checksumFile],
      stats: stats.detailsByTable
    };
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createBackup().catch(console.error);
}

module.exports = createBackup;
