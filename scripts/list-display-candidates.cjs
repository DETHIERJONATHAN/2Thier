#!/usr/bin/env node
/*
 * Liste des variables récentes et leurs nœuds d'affichage potentiels.
 * Options:
 *   --limit N         (par défaut 30)
 *   --filter <text>   (filtre sur displayName contient <text>, insensible)
 */

const fs = require('fs');
const path = require('path');
// Charger les variables d'environnement (priorité à .env.local puis .env.production)
const envPath = fs.existsSync(path.resolve('.env.local'))
  ? path.resolve('.env.local')
  : (fs.existsSync(path.resolve('.env.production'))
    ? path.resolve('.env.production')
    : path.resolve('.env'));
require('dotenv').config({ path: envPath });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

function parseArgs(argv) {
  const args = { limit: 30, filter: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--limit') args.limit = Number(v || 30) || 30;
    if (k === '--filter') args.filter = v || null;
  }
  return args;
}

async function getNodeWithParent(id) {
  if (!id) return null;
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id },
    select: { id: true, label: true, type: true, parentId: true }
  });
  if (!node) return null;
  const parent = node.parentId
    ? await prisma.treeBranchLeafNode.findUnique({ where: { id: node.parentId }, select: { id: true, label: true, type: true } })
    : null;
  return { node, parent };
}

async function run() {
  const args = parseArgs(process.argv);
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL est manquant (aucune connexion DB). Chargez .env / .env.production ou définissez la variable d\'environnement.');
      process.exit(10);
    }
    console.log('🗄️  DATABASE_URL =', (process.env.DATABASE_URL || '').replace(/:[^:@]*@/, ':****@'));
    const where = args.filter
      ? { displayName: { contains: args.filter, mode: 'insensitive' } }
      : {};

    const vars = await prisma.treeBranchLeafNodeVariable.findMany({
      where,
      select: { id: true, nodeId: true, exposedKey: true, displayName: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: args.limit
    });

    if (vars.length === 0) {
      console.log('Aucune variable trouvée.');
      return;
    }

    console.log(`Trouvé ${vars.length} variables`);
    for (const v of vars) {
      const displayNodeId = `display-${v.id}`;
      let displayInfo = await getNodeWithParent(displayNodeId);

      if (!displayInfo) {
        const candidates = await prisma.treeBranchLeafNode.findMany({
          where: { type: 'leaf_field', linkedVariableIds: { has: v.id } },
          select: { id: true, label: true, parentId: true },
          take: 3
        });
        if (candidates.length > 0) {
          displayInfo = await getNodeWithParent(candidates[0].id);
        }
      }

      const owner = await getNodeWithParent(v.nodeId);
      const inNouveau = displayInfo && (displayInfo.parent?.label || '').toLowerCase() === 'nouveau section';

      console.log('\n— VARIABLE —');
      console.log({ id: v.id, exposedKey: v.exposedKey, displayName: v.displayName });
      console.log('  owner:', owner ? { id: owner.node.id, label: owner.node.label, parentLabel: owner.parent?.label || null } : null);
      console.log('  display:', displayInfo ? { id: displayInfo.node.id, label: displayInfo.node.label, parentLabel: displayInfo.parent?.label || null, inNouveauSection: inNouveau } : null);
    }
  } catch (e) {
    console.error('❌ Erreur:', e?.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
