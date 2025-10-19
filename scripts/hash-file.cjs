const fs = require('fs');
const crypto = require('crypto');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/hash-file.cjs <file>');
  process.exit(1);
}

const content = fs.readFileSync(filePath);
const hash = crypto.createHash('sha256').update(content).digest('hex');
console.log(hash);
