import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function ANALYSER_DONNEES_MANQUANTES() {
  try {
    console.log('🔍 ANALYSE COMPLÈTE DES DONNÉES MANQUANTES');
    
    // Lire la sauvegarde
    const backupData = JSON.parse(fs.readFileSync('backup-complete-27-08-2025-1756252940911.json', 'utf8'));
    const data = backupData.tables;
    
    console.log('\n📊 COMPARAISON SAUVEGARDE vs BASE ACTUELLE:');
    
    let totalBackup = 0;
    let totalActuel = 0;
    let manquants = [];
    
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        const backupCount = records.length;
        totalBackup += backupCount;
        
        let actualCount = 0;
        try {
          // Vérifier si la table existe dans Prisma
          const prismaModel = tableName.charAt(0).toLowerCase() + tableName.slice(1);
          if (prisma[prismaModel]) {
            actualCount = await prisma[prismaModel].count();
          } else {
            // Table pas dans le schéma Prisma
            actualCount = 0;
          }
        } catch (error) {
          actualCount = 0;
        }
        
        totalActuel += actualCount;
        const manque = backupCount - actualCount;
        
        const status = actualCount >= backupCount ? '✅' : manque > 0 ? '❌' : '⚠️';
        console.log(`  ${status} ${tableName}: ${actualCount}/${backupCount} (manque: ${manque})`);
        
        if (manque > 0) {
          manquants.push({
            table: tableName,
            backup: backupCount,
            actual: actualCount,
            missing: manque,
            records: records
          });
        }
      }
    }
    
    console.log(`\n🎯 RÉSUMÉ GLOBAL:`);
    console.log(`  Sauvegarde: ${totalBackup} enregistrements`);
    console.log(`  Actuel: ${totalActuel} enregistrements`);
    console.log(`  Manquants: ${totalBackup - totalActuel} enregistrements`);
    
    console.log(`\n🔥 TABLES AVEC DONNÉES MANQUANTES (${manquants.length} tables):`);
    manquants.sort((a, b) => b.missing - a.missing);
    
    for (const table of manquants.slice(0, 10)) { // Top 10 des plus importantes
      console.log(`\n  💥 ${table.table}: ${table.missing} manquants`);
      if (table.records.length > 0) {
        const sample = table.records[0];
        console.log(`     Exemple d'enregistrement:`);
        console.log(`     ID: ${sample.id}`);
        if (sample.label) console.log(`     Label: ${sample.label}`);
        if (sample.name) console.log(`     Name: ${sample.name}`);
        if (sample.type) console.log(`     Type: ${sample.type}`);
        if (sample.fieldId) console.log(`     FieldId: ${sample.fieldId}`);
        if (sample.formula) console.log(`     Formula: ${sample.formula}`);
        if (sample.condition) console.log(`     Condition: ${sample.condition}`);
      }
    }
    
    // Focus sur les FieldFormula et autres Field*
    console.log(`\n🎯 FOCUS SUR LES FIELD FORMULAS ET CONDITIONS:`);
    const fieldTables = manquants.filter(t => t.table.startsWith('Field'));
    fieldTables.forEach(table => {
      console.log(`  ❌ ${table.table}: ${table.missing}/${table.backup} manquants`);
    });
    
    return manquants;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ANALYSER_DONNEES_MANQUANTES();
