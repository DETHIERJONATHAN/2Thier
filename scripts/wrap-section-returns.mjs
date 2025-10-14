/**
 * 🔧 Script pour wrapper tous les return dans SectionRendererV2
 * 
 * Encapsule chaque return de section avec renderWithEnhancements()
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(__dirname, '../src/components/websites/SectionRendererV2.tsx');

console.log('🔧 WRAPPER DES RETURNS DANS SECTIONRENDERERV2');
console.log('===============================================\n');

let content = fs.readFileSync(FILE_PATH, 'utf-8');
const originalContent = content;

// Compter les sections
const sectionMatches = content.match(/if \(section\.type === '[^']+'\)/g);
console.log(`📊 ${sectionMatches?.length || 0} sections détectées\n`);

// Pattern pour trouver chaque return de section
// On cherche : return ( <div ... jusqu'au ); qui ferme
const returnPattern = /(\s+)(return\s*\(\s*<div[^>]*?>[\s\S]*?<\/div>\s*\);)/g;

let matches = 0;
content = content.replace(returnPattern, (match, indent, returnBlock) => {
  // Vérifier si déjà wrappé
  if (returnBlock.includes('renderWithEnhancements')) {
    return match;
  }

  matches++;

  // Extraire le JSX (entre les parenthèses du return)
  const jsxMatch = returnBlock.match(/return\s*\(\s*([\s\S]*)\s*\);/);
  if (!jsxMatch) return match;

  const jsxContent = jsxMatch[1];

  // Créer le nouveau return wrappé
  const newReturn = `${indent}return renderWithEnhancements(
${indent}  ${jsxContent}
${indent});`;

  return newReturn;
});

console.log(`✅ ${matches} returns wrappés avec renderWithEnhancements()\n`);

// Backup et save
if (content !== originalContent) {
  fs.writeFileSync(FILE_PATH + '.backup-wrapper', originalContent, 'utf-8');
  fs.writeFileSync(FILE_PATH, content, 'utf-8');
  console.log('✅ SectionRendererV2.tsx modifié');
  console.log('💾 Backup créé : SectionRendererV2.tsx.backup-wrapper');
} else {
  console.log('ℹ️  Aucune modification nécessaire');
}

console.log('\n✅ TERMINÉ !');
