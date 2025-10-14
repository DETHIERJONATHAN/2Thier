import fs from 'fs';
import path from 'path';

/**
 * ⚡ SCRIPT POUR AJOUTER LES BOUTONS IA
 * DANS TOUS LES CHAMPS DE TEXTE DU SectionEditor.tsx
 */

const filePath = path.join(process.cwd(), 'src/components/websites/SectionEditor.tsx');

console.log('\n⚡ AJOUT DES BOUTONS IA DANS SectionEditor.tsx\n');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf-8');

// Backup
const backupPath = filePath + '.backup-ai';
fs.writeFileSync(backupPath, content);
console.log(`💾 Backup créé: ${backupPath}\n`);

// 1. Ajouter l'import ThunderboltOutlined si absent
if (!content.includes('ThunderboltOutlined')) {
  console.log('📦 Ajout de l\'import ThunderboltOutlined...');
  
  // Trouver la ligne des imports Ant Design icons
  const iconImportPattern = /from '@ant-design\/icons';/;
  const match = content.match(iconImportPattern);
  
  if (match) {
    const importLineStart = content.lastIndexOf('import', match.index);
    const importLineEnd = content.indexOf(';', match.index) + 1;
    const importLine = content.substring(importLineStart, importLineEnd);
    
    // Ajouter ThunderboltOutlined dans l'import
    if (!importLine.includes('ThunderboltOutlined')) {
      const newImportLine = importLine.replace(
        "} from '@ant-design/icons';",
        ", ThunderboltOutlined } from '@ant-design/icons';"
      );
      content = content.replace(importLine, newImportLine);
      console.log('✅ ThunderboltOutlined ajouté aux imports');
    }
  }
}

// 2. Ajouter l'import AIAssistant si absent
if (!content.includes("import AIAssistant from './AIAssistant';")) {
  console.log('📦 Ajout de l\'import AIAssistant...');
  
  const modalImport = content.indexOf("import { Modal");
  if (modalImport !== -1) {
    const endOfLine = content.indexOf('\n', modalImport);
    const before = content.substring(0, endOfLine + 1);
    const after = content.substring(endOfLine + 1);
    
    content = before + "import AIAssistant from './AIAssistant';\n" + after;
    console.log('✅ AIAssistant importé');
  }
}

// 3. Ajouter les states pour l'IA si absents
if (!content.includes('const [showAI, setShowAI]')) {
  console.log('📦 Ajout des states IA...');
  
  const formUseState = content.indexOf('const [form] = Form.useForm();');
  if (formUseState !== -1) {
    const endOfLine = content.indexOf('\n', formUseState);
    const before = content.substring(0, endOfLine + 1);
    const after = content.substring(endOfLine + 1);
    
    content = before +
      '  const [showAI, setShowAI] = useState(false);\n' +
      '  const [aiContext, setAIContext] = useState(\'\');\n' +
      '  const [aiCurrentValue, setAICurrentValue] = useState(\'\');\n' +
      after;
    
    console.log('✅ States IA ajoutés');
  }
}

// 4. Ajouter des boutons IA sur les champs principaux
console.log('\n📦 Ajout des boutons IA sur les champs de texte...\n');

let aiButtonsAdded = 0;

// Pattern pour les Form.Item avec Input (title, subtitle, description, etc.)
const targetFields = [
  'title', 
  'subtitle', 
  'description',
  'heading',
  'subheading',
  'question',
  'answer',
  'buttonText',
  'primaryButtonText',
  'secondaryButtonText'
];

targetFields.forEach(fieldName => {
  // Pattern : <Form.Item label="..." name="fieldName"> <Input ...
  const pattern = new RegExp(
    `(<Form\\.Item[^>]*name="${fieldName}"[^>]*>\\s*<Input\\s)([^>]*?)(\\s*\\/?>)`,
    'g'
  );
  
  const matches = [...content.matchAll(pattern)];
  
  matches.forEach(match => {
    // Vérifier si suffix= existe déjà
    if (match[2].includes('suffix=')) {
      return; // Skip
    }
    
    const replacement = match[1] + match[2] + `
              suffix={
                <Button
                  type="link"
                  size="small"
                  icon={<ThunderboltOutlined style={{ color: '#10b981' }} />}
                  onClick={() => {
                    setAIContext('${fieldName}');
                    setAICurrentValue(form.getFieldValue('${fieldName}') || '');
                    setShowAI(true);
                  }}
                />
              }
            ` + match[3];
    
    content = content.replace(match[0], replacement);
    aiButtonsAdded++;
  });
});

// Pattern pour TextArea
const textAreaPattern = new RegExp(
  `(<Form\\.Item[^>]*name="(description|message|content)"[^>]*>\\s*<Input\\.TextArea\\s)([^>]*?)(\\s*\\/?>)`,
  'g'
);

const textAreaMatches = [...content.matchAll(textAreaPattern)];

textAreaMatches.forEach(match => {
  const fieldName = match[2];
  
  if (match[3].includes('suffix=')) {
    return; // Skip
  }
  
  const replacement = match[1] + match[3] + `
              suffix={
                <Button
                  type="link"
                  size="small"
                  icon={<ThunderboltOutlined style={{ color: '#10b981' }} />}
                  onClick={() => {
                    setAIContext('${fieldName}');
                    setAICurrentValue(form.getFieldValue('${fieldName}') || '');
                    setShowAI(true);
                  }}
                />
              }
            ` + match[4];
  
  content = content.replace(match[0], replacement);
  aiButtonsAdded++;
});

console.log(`✅ ${aiButtonsAdded} boutons IA ajoutés sur les champs de texte\n`);

// 5. Ajouter le composant AIAssistant modal à la fin du render (avant </Modal>)
if (!content.includes('<AIAssistant')) {
  console.log('📦 Ajout du composant AIAssistant modal...');
  
  // Trouver le dernier </Modal> du composant
  const lastModalClose = content.lastIndexOf('</Modal>');
  
  if (lastModalClose !== -1) {
    const before = content.substring(0, lastModalClose);
    const after = content.substring(lastModalClose);
    
    content = before + `

      {/* ⚡ ASSISTANT IA */}
      <AIAssistant
        visible={showAI}
        onClose={() => setShowAI(false)}
        context={aiContext}
        currentValue={aiCurrentValue}
        siteName={section?.name || 'Section'}
        onContentGenerated={(newContent) => {
          form.setFieldsValue({ [aiContext]: newContent });
          setShowAI(false);
        }}
      />
` + after;
    
    console.log('✅ AIAssistant modal ajouté');
  }
}

// 6. Sauvegarder
fs.writeFileSync(filePath, content);
console.log('\n✅ TERMINÉ ! Boutons IA ajoutés dans SectionEditor.tsx');
console.log(`📝 Fichier modifié: ${filePath}`);
console.log(`💾 Backup disponible: ${backupPath}\n`);
