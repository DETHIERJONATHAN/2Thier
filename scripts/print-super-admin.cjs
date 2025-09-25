#!/usr/bin/env node
// Affiche le premier utilisateur super_admin (id, email)
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { role: 'super_admin' },
      select: { id: true, email: true, createdAt: true }
    });
    if (!user) {
      console.log('{}');
    } else {
      console.log(JSON.stringify(user, null, 2));
    }
  } catch (e) {
    console.error('Erreur print-super-admin:', e.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
