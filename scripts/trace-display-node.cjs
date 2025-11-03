#!/usr/bin/env node
/*
 * Petit script de traçage:
 * - Résout une variable TreeBranchLeafNodeVariable (par id, exposedKey ou nodeId)
 * - Vérifie/affiche le nœud d'affichage créé (id = `display-${variable.id}`)
 * - Cherche alternativement tout nœud ayant linkedVariableIds HAS variable.id
 * - Valide si le parent est la section "Nouveau Section"
 *
 * Exemples d'utilisation:
 *   node scripts/trace-display-node.cjs --varId <VARIABLE_ID>
 *   node scripts/trace-display-node.cjs --exposedKey <EXPOSED_KEY>
 *   node scripts/trace-display-node.cjs --nodeId <OWNER_NODE_ID>
 *   node scripts/trace-display-node.cjs --like "Facade"    # cherche par displayName LIKE
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
  const args = { varId: null, exposedKey: null, nodeId: null, like: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--varId') args.varId = v;
    if (k === '--exposedKey') args.exposedKey = v;
    if (k === '--nodeId') args.nodeId = v;
    if (k === '--like') args.like = v;
  }
  return args;
}

async function findVariable({ varId, exposedKey, nodeId, like }) {
  if (varId) {
    return prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: varId } });
  }
  if (exposedKey) {
    // exposedKey est unique
    return prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey } });
  }
  if (nodeId) {
    // nodeId est unique sur le modèle
    return prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId } });
  }
  if (like) {
    return prisma.treeBranchLeafNodeVariable.findFirst({
      where: { displayName: { contains: like, mode: 'insensitive' } },
      orderBy: { updatedAt: 'desc' }
    });
  }
  return null;
}

async function getNodeWithParent(nodeId) {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { id: true, label: true, type: true, parentId: true, data_activeId: true }
  });
  if (!node) return null;
  const parent = node.parentId
    ? await prisma.treeBranchLeafNode.findUnique({ where: { id: node.parentId }, select: { id: true, label: true, type: true, parentId: true } })
    : null;
  return { node, parent };
}

async function run() {
  const args = parseArgs(process.argv);
  if (!args.varId && !args.exposedKey && !args.nodeId && !args.like) {
    console.log('Usage:');
    console.log('  node scripts/trace-display-node.cjs --varId <VARIABLE_ID>');
    console.log('  node scripts/trace-display-node.cjs --exposedKey <EXPOSED_KEY>');
    console.log('  node scripts/trace-display-node.cjs --nodeId <OWNER_NODE_ID>');
    console.log('  node scripts/trace-display-node.cjs --like "Facade"');
    process.exit(1);
  }

  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL est manquant (aucune connexion DB). Chargez .env / .env.production ou définissez la variable d\'environnement.');
      process.exit(10);
    }
    console.log('🗄️  DATABASE_URL =', (process.env.DATABASE_URL || '').replace(/:[^:@]*@/, ':****@'));
    // 1) Résoudre la variable
    const variable = await findVariable(args);
    if (!variable) {
      console.error('❌ Variable introuvable avec les critères fournis.');
      process.exit(2);
    }

    console.log('\n════════ VARIABLE ════════');
    console.log({
      id: variable.id,
      nodeId: variable.nodeId,
      exposedKey: variable.exposedKey,
      displayName: variable.displayName,
      sourceType: variable.sourceType,
      sourceRef: variable.sourceRef,
      selectedNodeId: variable.selectedNodeId,
      visibleToUser: variable.visibleToUser,
    });

    // 2) Nœud propriétaire de la variable
    const ownerInfo = await getNodeWithParent(variable.nodeId);
    console.log('\n════════ OWNER NODE ════════');
    if (!ownerInfo) {
      console.log('Propriétaire introuvable:', variable.nodeId);
    } else {
      console.log({
        nodeId: ownerInfo.node.id,
        label: ownerInfo.node.label,
        type: ownerInfo.node.type,
        parentId: ownerInfo.node.parentId,
        parentLabel: ownerInfo.parent?.label || null,
      });
    }

    // 3) Chercher le display node attendu (id = display-<var.id>)
    const displayNodeId = `display-${variable.id}`;
    let displayInfo = await getNodeWithParent(displayNodeId);

    // 4) Sinon, essayer via linkedVariableIds HAS variable.id
    if (!displayInfo) {
      const candidates = await prisma.treeBranchLeafNode.findMany({
        where: {
          type: 'leaf_field',
          linkedVariableIds: { has: variable.id }
        },
        select: { id: true, label: true, parentId: true, data_activeId: true },
        orderBy: { updatedAt: 'desc' },
        take: 5
      });
      if (candidates.length > 0) {
        // prendre le plus récent
        displayInfo = await getNodeWithParent(candidates[0].id);
      }
    }

    console.log('\n════════ DISPLAY NODE ════════');
    if (!displayInfo) {
      console.log('Aucun nœud d\'affichage trouvé (ni id calculé, ni via linkedVariableIds).');
    } else {
      const { node, parent } = displayInfo;
      const isInNouveauSection = (parent?.label || '').toLowerCase() === 'nouveau section';
      console.log({
        id: node.id,
        label: node.label,
        parentId: node.parentId,
        parentLabel: parent?.label || null,
        data_activeId: node.data_activeId,
        inNouveauSection: isInNouveauSection
      });
    }

    // 5) Vérifier aussi les nœuds (max 5) sous un parent "Nouveau Section" qui pointent sur cette variable
    const possiblyInNouveau = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf_field',
        linkedVariableIds: { has: variable.id }
      },
      select: { id: true, label: true, parentId: true },
      take: 10
    });

    if (possiblyInNouveau.length > 0) {
      console.log('\n════════ AUTRES CANDIDATS (linkedVariableIds) ════════');
      for (const n of possiblyInNouveau) {
        const info = await getNodeWithParent(n.id);
        const isInNouveauSection = (info?.parent?.label || '').toLowerCase() === 'nouveau section';
        console.log({ id: n.id, label: n.label, parentLabel: info?.parent?.label || null, inNouveauSection: isInNouveauSection });
      }
    }
  } catch (e) {
    console.error('❌ Erreur:', e?.message || e);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
}

run();
