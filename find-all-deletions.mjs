#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Chercher toutes les mentions de prisma.treebranchleaf*.delete dans le code
const srcDir = path.join(process.cwd(), 'src');

function searchFiles(dir, pattern) {
  let matches = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      matches = [...matches, ...searchFiles(fullPath, pattern)];
    } else if (file.name.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (pattern.test(content)) {
          const lines = content.split('\n');
          const lineNumbers = [];
          lines.forEach((line, idx) => {
            if (pattern.test(line)) {
              lineNumbers.push(idx + 1);
            }
          });
          if (lineNumbers.length > 0) {
            matches.push({ file: fullPath.replace(srcDir, ''), lines: lineNumbers });
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
  return matches;
}

console.log('\n🔍 SEARCHING FOR ALL VARIABLE DELETIONS\n');

const deletePatterns = [
  { name: 'deleteMany on Variable', regex: /treeBranchLeafNodeVariable.*deleteMany/ },
  { name: 'delete on Variable', regex: /treeBranchLeafNodeVariable.*\.delete\(/ },
  { name: 'prisma.treeBranchLeafNodeVariable', regex: /prisma\.treeBranchLeafNodeVariable.*delete/ }
];

for (const pattern of deletePatterns) {
  const matches = searchFiles(srcDir, pattern.regex);
  if (matches.length > 0) {
    console.log(`\n📌 ${pattern.name}:`);
    for (const match of matches) {
      console.log(`   ${match.file} (lines: ${match.lines.join(', ')})`);
    }
  }
}

console.log('\n');
