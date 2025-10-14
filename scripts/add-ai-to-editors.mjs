/**
 * 🤖 Script d'ajout automatique de l'IA dans tous les editors
 * 
 * Ajoute les boutons IA sur les champs title, subtitle, description
 * dans tous les section editors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDITORS_DIR = path.join(__dirname, '../src/components/websites/section-editors');

const EDITORS = [
  'StatsEditor.tsx',
  'HeaderEditor.tsx',
  'FooterEditor.tsx',
  'CTAEditor.tsx',
  'ContentEditor.tsx',
];

/**
 * Ajoute les imports nécessaires
 */
function addImports(content) {
  // Vérifier si ThunderboltOutlined existe déjà
  if (content.includes('ThunderboltOutlined')) {
    return content;
  }

  // Ajouter ThunderboltOutlined dans les imports antd
  content = content.replace(
    /(import\s+{[^}]*?)\s*}\s*from\s+['"]@ant-design\/icons['"]/,
    (match, imports) => {
      if (!imports.includes('ThunderboltOutlined')) {
        return `${imports}, ThunderboltOutlined } from '@ant-design/icons'`;
      }
      return match;
    }
  );

  // Ajouter import AIAssistant si pas présent
  if (!content.includes('AIAssistant')) {
    const importLine = "import { AIAssistant } from '../AIAssistant';\n";
    const lastImportIndex = content.lastIndexOf("import");
    const endOfLineIndex = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, endOfLineIndex + 1) + importLine + content.slice(endOfLineIndex + 1);
  }

  return content;
}

/**
 * Ajoute les états IA dans le composant
 */
function addAIStates(content) {
  if (content.includes('const [showAI, setShowAI]')) {
    return content;
  }

  // Trouver le premier useState
  const firstUseStateMatch = content.match(/const \[.*?\] = useState/);
  if (firstUseStateMatch) {
    const insertIndex = content.indexOf(firstUseStateMatch[0]);
    const aiStates = `  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiCurrentValue, setAICurrentValue] = useState('');
  `;
    content = content.slice(0, insertIndex) + aiStates + content.slice(insertIndex);
  }

  return content;
}

/**
 * Ajoute le bouton IA sur un champ Input
 */
function addAIButtonToInput(content, fieldName) {
  // Pattern pour trouver <Input ... />
  const inputPattern = new RegExp(
    `(<Form\\.Item[^>]*name="${fieldName}"[^>]*>\\s*<Input\\s)([^>]*?)(\\s*/>)`,
    'g'
  );

  return content.replace(inputPattern, (match, before, props, after) => {
    if (props.includes('suffix=')) {
      return match; // Déjà un suffix
    }

    return `${before}${props}
          suffix={
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setAIContext('${fieldName}');
                setAICurrentValue(form.getFieldValue('${fieldName}') || '');
                setShowAI(true);
              }}
            />
          }
        ${after}`;
  });
}

/**
 * Ajoute le bouton IA sur un champ TextArea
 */
function addAIButtonToTextArea(content, fieldName) {
  const textareaPattern = new RegExp(
    `(<Form\\.Item[^>]*name="${fieldName}"[^>]*>\\s*<TextArea\\s)([^>]*?)(\\s*/>)`,
    'g'
  );

  return content.replace(textareaPattern, (match, before, props, after) => {
    if (props.includes('suffix=')) {
      return match;
    }

    return `${before}${props}
          suffix={
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setAIContext('${fieldName}');
                setAICurrentValue(form.getFieldValue('${fieldName}') || '');
                setShowAI(true);
              }}
            />
          }
        ${after}`;
  });
}

/**
 * Ajoute le composant AIAssistant à la fin
 */
function addAIAssistant(content, sectionType) {
  if (content.includes('<AIAssistant')) {
    return content;
  }

  // Trouver le dernier </Form>
  const lastFormClosing = content.lastIndexOf('</Form>');
  if (lastFormClosing === -1) {
    return content;
  }

  const aiAssistant = `

      {/* ASSISTANT IA */}
      {showAI && (
        <AIAssistant
          visible={showAI}
          onClose={() => setShowAI(false)}
          context={aiContext}
          sectionType="${sectionType}"
          currentValue={aiCurrentValue}
          onApply={(value) => {
            form.setFieldsValue({ [aiContext]: value });
            setShowAI(false);
          }}
        />
      )}
    </Form>`;

  content = content.slice(0, lastFormClosing) + aiAssistant + content.slice(lastFormClosing + 7);

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
  content = addImports(content);

  // 2. Ajouter les états IA
  content = addAIStates(content);

  // 3. Ajouter boutons IA sur les champs
  const fields = ['title', 'subtitle', 'description', 'heading', 'subheading', 'text'];
  fields.forEach(field => {
    content = addAIButtonToInput(content, field);
    content = addAIButtonToTextArea(content, field);
  });

  // 4. Ajouter AIAssistant
  const sectionType = filename.replace('Editor.tsx', '').toLowerCase();
  content = addAIAssistant(content, sectionType);

  // Sauvegarder si modifié
  if (content !== originalContent) {
    // Backup
    fs.writeFileSync(filePath + '.backup-ai', originalContent, 'utf-8');
    
    // Écrire
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${filename} - IA ajoutée (backup créé)`);
  } else {
    console.log(`ℹ️  ${filename} - Aucune modification nécessaire`);
  }
}

/**
 * Main
 */
console.log('🤖 AJOUT AUTOMATIQUE DE L\'IA DANS LES EDITORS');
console.log('================================================\n');

EDITORS.forEach(processEditor);

console.log('\n✅ TERMINÉ !');
console.log('\nVérifiez les fichiers modifiés et testez l\'application.');
console.log('Les backups sont dans *.tsx.backup-ai si besoin de rollback.');
