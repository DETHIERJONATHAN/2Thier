#!/usr/bin/env node
// Affiche 5 organisations (id, name) pour faciliter les tests manuels
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, createdAt: true },
      take: 5,
      orderBy: { createdAt: 'asc' }
    });
    if (!orgs.length) {
      console.log('[]');
    } else {
      console.log(JSON.stringify(orgs, null, 2));
    }
  } catch (e) {
    console.error('Erreur print-orgs:', e.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
