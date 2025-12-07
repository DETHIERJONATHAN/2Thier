import { readFileSync } from 'fs';

const logContent = readFileSync('c:/Users/dethi/OneDrive/Desktop/CRM SAVE/crm/dist-server/api-server-clean.cjs', 'utf-8');

// Chercher les logs liés à la duplication
const patterns = [
  /console\.log\([^)]*Starting repeat execution[^)]*\)/gi,
  /console\.log\([^)]*Nodes to duplicate[^)]*\)/gi,
  /console\.log\([^)]*Skipping section[^)]*\)/gi,
  /console\.log\([^)]*nextSuffix[^)]*\)/gi,
  /console\.log\([^)]*existingMax[^)]*\)/gi,
  /console\.log\([^)]*globalMax[^)]*\)/gi,
  /console\.log\([^)]*Math\.max[^)]*\)/gi,
];

const matches = patterns.flatMap(pattern => logContent.match(pattern) || []);

console.log('📋 LOGS TROUVÉS DANS LE BUNDLE:\n');
matches.slice(0, 20).forEach((match, i) => {
  console.log(`${i + 1}. ${match.slice(0, 150)}`);
});

console.log(`\n✅ Total: ${matches.length} logs`);
