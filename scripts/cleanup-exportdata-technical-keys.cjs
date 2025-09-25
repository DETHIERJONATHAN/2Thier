#!/usr/bin/env node
/*
  Nettoie les clés techniques des exportData des soumissions TBL.
  - Supprime les clés commençant par __, __mirror_, __formula_, __condition_
  - Applique récursivement dans les objets/arrays
  - Met à jour uniquement si changement (NO-OP sinon)
*/

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('__') || k.startsWith('__mirror_') || k.startsWith('__formula_') || k.startsWith('__condition_')) continue;
      if (v === null || v === undefined || v === '') continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

function normalize(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === 'string') return x;
  try { return JSON.stringify(x); } catch { return String(x); }
}

async function main() {
  const submissions = await prisma.treeBranchLeafSubmission.findMany({
    select: { id: true, exportData: true }
  });
  let updated = 0; let scanned = 0;
  for (const sub of submissions) {
    scanned++;
    const cleaned = sanitize(sub.exportData);
    if (normalize(cleaned) !== normalize(sub.exportData)) {
      await prisma.treeBranchLeafSubmission.update({ where: { id: sub.id }, data: { exportData: cleaned } });
      updated++;
      console.log(`✅ Nettoyé exportData pour ${sub.id}`);
    }
  }
  console.log(`\nTerminé: ${updated} / ${scanned} soumissions mises à jour.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
