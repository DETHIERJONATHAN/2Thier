/**
 * 🎨 Script d'ajout automatique de GridLayout et SectionHeader dans tous les editors
 * 
 * Ajoute 2 nouveaux onglets dans chaque section editor :
 * - Layout : GridLayoutEditor
 * - Header : SectionHeaderEditor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDITORS_DIR = path.join(__dirname, '../src/components/websites/section-editors');

const EDITORS = [
  'HeroEditor.tsx',
  'StatsEditor.tsx',
  'HeaderEditor.tsx',
  'FooterEditor.tsx',
  'CTAEditor.tsx',
  'ContentEditor.tsx',
];

/**
 * Ajoute les imports GridLayout et SectionHeader
 */
function addLayoutImports(content) {
  if (content.includes('GridLayoutEditor')) {
    return content;
  }

  const importLine = "import { GridLayoutEditor } from '../GridLayoutEditor';\nimport { SectionHeaderEditor } from '../SectionHeaderEditor';\n";
  const lastImportIndex = content.lastIndexOf("import");
  const endOfLineIndex = content.indexOf('\n', lastImportIndex);
  content = content.slice(0, endOfLineIndex + 1) + importLine + content.slice(endOfLineIndex + 1);

  return content;
}

/**
 * Ajoute les états pour gridLayout et sectionHeader
 */
function addLayoutStates(content) {
  if (content.includes('const [gridLayout, setGridLayout]')) {
    return content;
  }

  const firstUseStateMatch = content.match(/const \[.*?\] = useState/);
  if (firstUseStateMatch) {
    const insertIndex = content.indexOf(firstUseStateMatch[0]);
    const layoutStates = `  const [gridLayout, setGridLayout] = useState<any>(null);
  const [sectionHeader, setSectionHeader] = useState<any>(null);
  `;
    content = content.slice(0, insertIndex) + layoutStates + content.slice(insertIndex);
  }

  return content;
}

/**
 * Met à jour le useEffect pour charger gridLayout et sectionHeader
 */
function updateUseEffect(content) {
  // Trouver le useEffect
  const useEffectPattern = /useEffect\(\(\) => {[\s\S]*?if \(section\) {([\s\S]*?)}/;
  const match = content.match(useEffectPattern);

  if (!match) {
    return content;
  }

  const useEffectContent = match[1];
  
  // Vérifier si déjà ajouté
  if (useEffectContent.includes('setGridLayout(section.gridLayout')) {
    return content;
  }

  // Ajouter après le form.setFieldsValue
  const setFieldsValuePattern = /(form\.setFieldsValue\([^)]*\);)/;
  const setFieldsMatch = useEffectContent.match(setFieldsValuePattern);

  if (setFieldsMatch) {
    const layoutCode = `\n      setGridLayout(section.gridLayout || null);\n      setSectionHeader(section.sectionHeader || null);`;
    content = content.replace(
      setFieldsMatch[1],
      setFieldsMatch[1] + layoutCode
    );
  }

  return content;
}

/**
 * Met à jour handleSubmit pour inclure gridLayout et sectionHeader
 */
function updateHandleSubmit(content) {
  // Trouver le handleSubmit
  const handleSubmitPattern = /const handleSubmit = \(values: any\) => {[\s\S]*?onSave\({([\s\S]*?)}\);/;
  const match = content.match(handleSubmitPattern);

  if (!match) {
    return content;
  }

  const saveContent = match[1];

  // Vérifier si déjà ajouté
  if (saveContent.includes('gridLayout')) {
    return content;
  }

  // Ajouter gridLayout et sectionHeader après le contenu existant
  const layoutCode = `,
      gridLayout,
      sectionHeader`;

  content = content.replace(
    /onSave\({([\s\S]*?)}\);/,
    (match, inner) => `onSave({${inner}${layoutCode}\n    });`
  );

  return content;
}

/**
 * Ajoute les composants GridLayoutEditor et SectionHeaderEditor avant les boutons
 */
function addLayoutComponents(content) {
  if (content.includes('<GridLayoutEditor')) {
    return content;
  }

  // Trouver <Form.Item> avec les boutons (Sauvegarder/Annuler)
  const submitButtonPattern = /(<Form\.Item>\s*<Space>\s*<Button type="primary" htmlType="submit">)/;
  const match = content.match(submitButtonPattern);

  if (!match) {
    return content;
  }

  const layoutComponents = `
      {/* LAYOUT GRID */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>⚙️ Configuration du Layout</h4>
        <GridLayoutEditor
          config={gridLayout}
          onChange={setGridLayout}
        />
      </div>

      {/* HEADER DE SECTION */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>📋 En-tête de Section</h4>
        <SectionHeaderEditor
          config={sectionHeader}
          onChange={setSectionHeader}
        />
      </div>

      `;

  content = content.replace(submitButtonPattern, layoutComponents + match[1]);

  return content;
}

/**
 * Traite un fichier editor
 */
function processEditor(filename) {
  const filePath = path.join(EDITORS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filename} - Fichier non trouvé`);
    return;
  }

  console.log(`\n🔧 Traitement de ${filename}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // 1. Ajouter les imports
  content = addLayoutImports(content);

  // 2. Ajouter les états
  content = addLayoutStates(content);

  // 3. Mettre à jour useEffect
  content = updateUseEffect(content);

  // 4. Mettre à jour handleSubmit
  content = updateHandleSubmit(content);

  // 5. Ajouter les composants
  content = addLayoutComponents(content);

  // Sauvegarder si modifié
  if (content !== originalContent) {
    // Backup
    fs.writeFileSync(filePath + '.backup-layout', originalContent, 'utf-8');
    
    // Écrire
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${filename} - GridLayout + SectionHeader ajoutés (backup créé)`);
  } else {
    console.log(`ℹ️  ${filename} - Aucune modification nécessaire`);
  }
}

/**
 * Main
 */
console.log('🎨 AJOUT AUTOMATIQUE DE GRIDLAYOUT + SECTIONHEADER');
console.log('====================================================\n');

EDITORS.forEach(processEditor);

console.log('\n✅ TERMINÉ !');
console.log('\nVérifiez les fichiers modifiés et testez l\'application.');
console.log('Les backups sont dans *.tsx.backup-layout si besoin de rollback.');
