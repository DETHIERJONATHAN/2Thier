const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('database-export.json', 'utf-8'));

  // Exemple pour Email
  if (data.emails && Array.isArray(data.emails)) {
    await prisma.email.deleteMany(); // Vide la table Email
    for (const email of data.emails) {
      await prisma.email.create({ data: email });
    }
    console.log(`Importé ${data.emails.length} emails`);
  }

  // Ajoute ici d'autres tables si besoin (ex: users, organisations, etc)
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
