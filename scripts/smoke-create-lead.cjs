require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[SMOKE] Prisma create Lead sans id explicite');
  // 1) Trouver une organisation existante
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('[SMOKE] Aucune organisation trouvée dans la base. Abandon du test.');
    process.exitCode = 2;
    return;
  }
  console.log('[SMOKE] Organisation cible:', { id: org.id, name: org.name });

  // 2) Création d’un lead minimal avec id auto-généré côté Prisma
  const timestamp = Date.now();
  const email = `smoke.lead.${timestamp}@example.com`;
  const now = new Date();
  const newLead = await prisma.lead.create({
    data: {
      firstName: 'Smoke',
      lastName: 'Test',
      email,
      phone: null,
      company: 'SmokeCorp',
      source: 'manual',
      status: 'new',
      createdAt: now,
      updatedAt: now,
      organizationId: org.id,
      data: { createdBy: 'smoke-script', ts: timestamp }
    }
  });

  console.log('[SMOKE] Lead créé:', { id: newLead.id, email: newLead.email });
  if (!newLead.id || typeof newLead.id !== 'string') {
    throw new Error('ID non généré par Prisma Client');
  }

  // 3) Nettoyage: suppression du lead de test
  await prisma.lead.delete({ where: { id: newLead.id } });
  console.log('[SMOKE] Lead supprimé, test OK ✅');
}

main()
  .catch((err) => {
    console.error('[SMOKE] Échec:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
