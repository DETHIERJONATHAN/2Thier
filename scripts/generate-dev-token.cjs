#!/usr/bin/env node
// Génère un JWT DEV pour un utilisateur existant (sans modifier la base)
// Usage: node scripts/generate-dev-token.cjs --email=... [--raw]
// Retourne le token signé avec le même secret que le middleware d'auth (dev_secret_key si non défini)

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k,v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

const email = args.email || 'jonathan.dethier@2thier.be';
const secret = process.env.JWT_SECRET || 'dev_secret_key';
const rawOnly = !!args.raw;

(async () => {
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true, email: true, role: true } });
  if (!user) {
    console.error('❌ Utilisateur introuvable pour email:', email);
    process.exit(1);
  }
  const payload = { userId: user.id, email: user.email, role: user.role || 'user' };
  const token = jwt.sign(payload, secret, { expiresIn: '8h' });
  if (rawOnly) {
    process.stdout.write(token);
  } else {
    console.log('✅ Token généré pour', email);
    console.log('🆔 userId:', user.id);
    console.log('🔐 secret prefix:', secret.slice(0,6) + '...');
    console.log('\nTOKEN=');
    console.log(token);
    console.log('\nPowerShell ->  $Env:TOKEN = "' + token + '"');
  }
  await prisma.$disconnect();
})();
