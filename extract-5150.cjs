const XLSX = require('xlsx');
const fs = require('fs');

// Lire le fichier GRD complet
const workbook = XLSX.readFile('GRD.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Fichier GRD.xlsx charge');
console.log('Total lignes:', data.length);
console.log('');

// Chercher 5150
let found = false;
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (row[0] && String(row[0]).includes('5150')) {
    console.log('=== TROUVE 5150 ===');
    console.log('Ligne', i, ':', row);
    console.log('GRD:', row[0]);
    console.log('Sibelga:', row[1]);
    console.log('');
    found = true;
    
    // Extraire un petit fichier autour de cette ligne
    const start = Math.max(0, i - 50);
    const end = Math.min(data.length, i + 50);
    const extract = data.slice(start, end);
    
    const newWb = XLSX.utils.book_new();
    const newWs = XLSX.utils.aoa_to_sheet(extract);
    XLSX.utils.book_append_sheet(newWb, newWs, 'Extract');
    XLSX.writeFile(newWb, 'GRD-extract-5150.xlsx');
    
    console.log('Fichier extrait cree: GRD-extract-5150.xlsx');
    console.log('Lignes', start, 'a', end, '(', extract.length, 'lignes)');
    break;
  }
}

if (!found) {
  console.log('5150 NON TROUVE dans le fichier');
  console.log('Premieres lignes:');
  data.slice(0, 10).forEach((row, i) => {
    console.log(i, ':', row);
  });
}
