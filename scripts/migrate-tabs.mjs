/**
 * 🔧 Script de migration automatique : Tabs.TabPane → items API
 * Convertit tous les fichiers utilisant l'ancienne API Tabs.TabPane vers la nouvelle API items
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Configuration
const EDITORS_DIR = path.join(PROJECT_ROOT, 'src', 'components', 'websites', 'editors');
const OTHER_FILES = [
  path.join(PROJECT_ROOT, 'src', 'components', 'websites', 'ThemeManager.tsx')
];

// Statistiques
let filesProcessed = 0;
let tabsConverted = 0;

/**
 * Extrait les TabPane d'un fichier et les convertit en items
 */
function convertTabPanesToItems(content) {
  let count = 0;
  
  // Pattern pour détecter un groupe de Tabs.TabPane
  const tabsPattern = /<Tabs([^>]*)>([\s\S]*?)<\/Tabs>/g;
  
  const converted = content.replace(tabsPattern, (match, tabsProps, tabsContent) => {
    // Extraire tous les TabPane
    const tabPanePattern = /<Tabs\.TabPane\s+tab="([^"]+)"\s+key="([^"]+)">([\s\S]*?)<\/Tabs\.TabPane>/g;
    const tabPanes = [];
    
    let tabPaneMatch;
    while ((tabPaneMatch = tabPanePattern.exec(tabsContent)) !== null) {
      tabPanes.push({
        tab: tabPaneMatch[1],
        key: tabPaneMatch[2],
        children: tabPaneMatch[3].trim()
      });
      count++;
    }

    // Si aucun TabPane trouvé, retourner tel quel
    if (tabPanes.length === 0) {
      return match;
    }

    // Générer le code items
    const itemsCode = tabPanes.map((pane) => `
    {
      key: '${pane.key}',
      label: '${pane.tab}',
      children: (
        <>
${pane.children}
        </>
      )
    }`).join(',');

    // Reconstruire le Tabs avec items
    return `<Tabs${tabsProps} items={[${itemsCode}
  ]} />`;
  });

  return { converted, count };
}

/**
 * Traite un fichier
 */
function processFile(filePath) {
  try {
    console.log(`\n📄 Traitement de ${path.basename(filePath)}...`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Vérifier si le fichier contient Tabs.TabPane
    if (!content.includes('Tabs.TabPane')) {
      console.log('  ⏭️  Aucun Tabs.TabPane trouvé, fichier ignoré');
      return false;
    }

    // Convertir
    const { converted, count } = convertTabPanesToItems(content);
    
    if (count === 0) {
      console.log('  ⏭️  Aucune conversion possible');
      return false;
    }

    // Créer une sauvegarde
    const backupPath = `${filePath}.backup`;
    fs.writeFileSync(backupPath, content);
    console.log(`  💾 Backup créé: ${path.basename(backupPath)}`);

    // Écrire le fichier converti
    fs.writeFileSync(filePath, converted);
    console.log(`  ✅ ${count} TabPane convertis en items`);
    
    tabsConverted += count;
    filesProcessed++;
    return true;

  } catch (error) {
    console.error(`  ❌ Erreur lors du traitement de ${filePath}:`, error);
    return false;
  }
}

/**
 * Traite tous les fichiers d'un répertoire
 */
function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Répertoire non trouvé: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
      processFile(filePath);
    }
  });
}

/**
 * Point d'entrée principal
 */
function main() {
  console.log('🚀 Démarrage de la migration Tabs.TabPane → items API\n');
  console.log('=' .repeat(60));

  // Traiter le répertoire editors
  console.log(`\n📁 Traitement du répertoire: ${EDITORS_DIR}`);
  processDirectory(EDITORS_DIR);

  // Traiter les fichiers individuels
  console.log(`\n📁 Traitement des fichiers individuels...`);
  OTHER_FILES.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      processFile(filePath);
    } else {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    }
  });

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('✨ Migration terminée !');
  console.log(`📊 Statistiques:`);
  console.log(`   - Fichiers traités: ${filesProcessed}`);
  console.log(`   - TabPane convertis: ${tabsConverted}`);
  console.log('\n💡 Les fichiers originaux ont été sauvegardés avec l\'extension .backup');
  console.log('💡 Vérifiez que tout fonctionne, puis supprimez les .backup');
}

// Exécution
main();
