import fs from 'fs';

const sql = fs.readFileSync('./Backup/production-backup.sql', 'utf8');

// Find the COPY block for website_sections
const copyStart = sql.indexOf('COPY public.website_sections');
const dataStart = sql.indexOf('\n', copyStart) + 1;
const dataEnd = sql.indexOf('\\.', dataStart);
const dataBlock = sql.substring(dataStart, dataEnd);

const lines = dataBlock.split('\n').filter(l => l.trim() && !l.startsWith('COPY'));

console.log('=== SECTIONS TROUVÉES DANS LE BACKUP ===');
console.log('Nombre de sections:', lines.length);
console.log('');

const sections = [];

for (const line of lines) {
  const parts = line.split('\t');
  if (parts.length >= 6) {
    const id = parts[0];
    const websiteId = parts[1];
    const key = parts[2];
    const type = parts[3];
    const name = parts[4];
    const content = parts[5];
    
    sections.push({
      id,
      websiteId,
      key,
      type,
      name,
      content
    });
    
    console.log(`Section ${id}: ${type} - "${name}"`);
    console.log(`  Content length: ${content.length} chars`);
    
    // Try to parse and show structure
    try {
      const parsed = JSON.parse(content);
      console.log(`  Keys: ${Object.keys(parsed).join(', ')}`);
    } catch(e) {
      console.log(`  Could not parse JSON: ${e.message}`);
    }
    console.log('');
  }
}

// Save sections to file for review
fs.writeFileSync('./Backup/sections-extracted.json', JSON.stringify(sections, null, 2));
console.log('\n=== Sections saved to ./Backup/sections-extracted.json ===');
