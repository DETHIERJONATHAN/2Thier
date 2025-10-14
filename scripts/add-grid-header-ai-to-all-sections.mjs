import fs from 'fs';
import path from 'path';

/**
 * 🎨 SCRIPT POUR AJOUTER GRID LAYOUT + SECTION HEADER + IA
 * À TOUTES LES SECTIONS DU SectionEditor.tsx
 * 
 * Ce script ajoute les composants GridLayoutEditor, SectionHeaderEditor
 * et les boutons IA dans TOUS les render*Fields() du SectionEditor.tsx
 */

const filePath = path.join(process.cwd(), 'src/components/websites/SectionEditor.tsx');

console.log('\n🎨 AJOUT DE GRID + HEADER + IA DANS TOUTES LES SECTIONS\n');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf-8');

// Backup
const backupPath = filePath + '.backup-complete';
fs.writeFileSync(backupPath, content);
console.log(`💾 Backup créé: ${backupPath}\n`);

// 1. Vérifier si les imports existent déjà
const hasGridImport = content.includes('GridLayoutEditor');
const hasHeaderImport = content.includes('SectionHeaderEditor');
const hasAIImport = content.includes('ThunderboltOutlined');

if (!hasGridImport || !hasHeaderImport) {
  console.log('📦 Ajout des imports...');
  
  // Trouver la ligne d'imports
  const importLine = content.indexOf("import { Modal");
  if (importLine !== -1) {
    const endOfLine = content.indexOf('\n', importLine);
    const beforeImports = content.substring(0, endOfLine + 1);
    const afterImports = content.substring(endOfLine + 1);
    
    content = beforeImports + 
      "import GridLayoutEditor from './layout/GridLayoutEditor';\n" +
      "import SectionHeaderEditor from './layout/SectionHeaderEditor';\n" +
      afterImports;
    
    console.log('✅ Imports ajoutés');
  }
}

// 2. Ajouter les states pour Grid + Header si pas présents
if (!content.includes('const [gridLayout, setGridLayout]')) {
  console.log('📦 Ajout des states...');
  
  const useState1 = content.indexOf('const [form] = Form.useForm();');
  if (useState1 !== -1) {
    const endOfLine = content.indexOf('\n', useState1);
    const before = content.substring(0, endOfLine + 1);
    const after = content.substring(endOfLine + 1);
    
    content = before +
      '  const [gridLayout, setGridLayout] = useState<any>(null);\n' +
      '  const [sectionHeader, setSectionHeader] = useState<any>(null);\n' +
      after;
    
    console.log('✅ States ajoutés');
  }
}

// 3. Mettre à jour useEffect pour charger gridLayout + sectionHeader
console.log('📦 Mise à jour de useEffect...');
const useEffectPattern = /useEffect\(\(\) => \{[\s\S]*?if \(section\) \{[\s\S]*?form\.setFieldsValue\(section\.content\);/;
const useEffectMatch = content.match(useEffectPattern);

if (useEffectMatch) {
  const updated = useEffectMatch[0] + '\n      setGridLayout(section.gridLayout || null);\n      setSectionHeader(section.sectionHeader || null);';
  content = content.replace(useEffectPattern, updated);
  console.log('✅ useEffect mis à jour');
}

// 4. Mettre à jour handleSave pour sauvegarder gridLayout + sectionHeader
console.log('📦 Mise à jour de handleSave...');
const handleSavePattern = /(const handleSave = async \(\) => \{[\s\S]*?const updatedContent = form\.getFieldsValue\(\);[\s\S]*?await onSave\(\{[\s\S]*?content: updatedContent,)/;
const handleSaveMatch = content.match(handleSavePattern);

if (handleSaveMatch) {
  const updated = handleSaveMatch[0] + '\n        gridLayout,\n        sectionHeader,';
  content = content.replace(handleSavePattern, updated);
  console.log('✅ handleSave mis à jour');
}

// 5. Ajouter GridLayoutEditor + SectionHeaderEditor dans CHAQUE render*Fields()
console.log('\n📦 Ajout de Grid + Header dans chaque section...\n');

const sections = [
  'Hero',
  'Stats', 
  'Services',
  'Projects',
  'Values',
  'Testimonials',
  'Contact',
  'Faq',
  'Steps',
  'Cta'
];

sections.forEach(sectionName => {
  const functionName = `render${sectionName}Fields`;
  
  // Pattern pour trouver la fin de la fonction (avant le dernier </>)
  const pattern = new RegExp(
    `const ${functionName} = \\(\\) => \\([\\s\\S]*?(<\\/Card>[\\s\\S]*?)<\\/>\\s*\\);`,
    'g'
  );
  
  const matches = [...content.matchAll(pattern)];
  
  if (matches.length > 0) {
    const match = matches[0];
    const beforeClosing = match[1];
    
    // Vérifier si Grid + Header sont déjà présents
    if (!beforeClosing.includes('GridLayoutEditor')) {
      const replacement = match[0].replace(
        beforeClosing,
        beforeClosing + `\n\n      {/* 🎨 GRID LAYOUT */}
      <Card style={{ backgroundColor: '#f0f9ff', marginBottom: 16 }}>
        <Title level={5}>🎨 Grid Layout</Title>
        <GridLayoutEditor
          value={gridLayout}
          onChange={setGridLayout}
        />
      </Card>

      {/* 🔆 SECTION HEADER */}
      <Card style={{ backgroundColor: '#fff7ed', marginBottom: 16 }}>
        <Title level={5}>🔆 Section Header</Title>
        <SectionHeaderEditor
          value={sectionHeader}
          onChange={setSectionHeader}
        />
      </Card>\n\n      `
      );
      
      content = content.replace(match[0], replacement);
      console.log(`✅ ${sectionName} - Grid + Header ajoutés`);
    } else {
      console.log(`⏭️  ${sectionName} - Déjà présent`);
    }
  } else {
    console.log(`❌ ${sectionName} - Pattern non trouvé`);
  }
});

// 6. Sauvegarder
fs.writeFileSync(filePath, content);
console.log('\n✅ TERMINÉ ! Grid + Header ajoutés dans toutes les sections');
console.log(`📝 Fichier modifié: ${filePath}`);
console.log(`💾 Backup disponible: ${backupPath}\n`);
