/*
  Script de test TBL Prisma — évalue une capacité (formula/condition/table)

  Usage (PowerShell):
    # Mode manuel
    npm run ts-node -- scripts/tbl-test-formula-eval.ts --treeId <TREE_ID> --sourceRef formula:<FORMULA_ID> --set <NODE_ID>=<VALUE> --set <NODE_ID>=<VALUE>

    # Mode démo (choisit une formule du tree et affecte 100 et 0.9 aux deux premiers inputs)
    npm run ts-node -- scripts/tbl-test-formula-eval.ts --treeId <TREE_ID> --demo

  Notes:
  - Crée une submission si --submissionId n'est pas fourni.
  - Enregistre les valeurs dans TreeBranchLeafSubmissionData (upsert) puis évalue via CapacityCalculator.
  - Affiche operationDetail (JSON) + operationResult (lisible) + quelques infos utiles.
*/

import { PrismaClient } from '@prisma/client';
import process from 'node:process';

// Import direct du calculateur (TypeScript) — nécessite ts-node
import { CapacityCalculator } from '../src/components/TreeBranchLeaf/treebranchleaf-new/TBL-prisma/conditions/capacity-calculator';

// Parse simple des arguments
interface Args {
  treeId?: string;
  submissionId?: string;
  sourceRef?: string; // e.g., formula:<id> | condition:<id> | table:<id>
  sets: Array<{ nodeId: string; value: string }>;
  demo: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { sets: [], demo: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--treeId') out.treeId = argv[++i];
    else if (a === '--submissionId') out.submissionId = argv[++i];
    else if (a === '--sourceRef') out.sourceRef = argv[++i];
    else if (a === '--set') {
      const kv = argv[++i];
      const eq = kv.indexOf('=');
      if (eq > 0) out.sets.push({ nodeId: kv.slice(0, eq), value: kv.slice(eq + 1) });
    } else if (a === '--demo') {
      out.demo = true;
    }
  }
  return out;
}

async function ensureSubmission(prisma: PrismaClient, treeId: string, submissionId?: string) {
  if (submissionId) return submissionId;
  const sub = await prisma.treeBranchLeafSubmission.create({
    data: {
      id: crypto.randomUUID(),
      treeId,
      status: 'draft',
      summary: {},
    },
    select: { id: true }
  });
  return sub.id;
}

async function upsertData(prisma: PrismaClient, submissionId: string, sets: Array<{ nodeId: string; value: string }>) {
  for (const { nodeId, value } of sets) {
    await prisma.treeBranchLeafSubmissionData.upsert({
      where: { submissionId_nodeId: { submissionId, nodeId } },
      update: { value: String(value) },
      create: { id: crypto.randomUUID(), submissionId, nodeId, value: String(value) }
    });
  }
}

// Extraction simple des ids à partir de tokens (strings '@value.<id>')
function extractIdsFromTokens(tokens: unknown): string[] {
  const ids = new Set<string>();
  if (Array.isArray(tokens)) {
    for (const t of tokens) {
      if (typeof t === 'string' && t.startsWith('@value.')) ids.add(t.replace('@value.', ''));
      // On peut ignorer les autres cas pour un mode démo simple
    }
  }
  return Array.from(ids);
}

type DemoFormula = { id: string; tokens: unknown; nodeId: string } | null;

async function pickDemoFormula(prisma: PrismaClient, treeId: string): Promise<DemoFormula> {
  // On prend la première formule dont le node appartient au tree via une requête en deux temps
  const node = await prisma.treeBranchLeafNode.findFirst({ where: { treeId }, select: { id: true } });
  if (!node) return null;
  const formula = await prisma.treeBranchLeafNodeFormula.findFirst({ where: { nodeId: node.id }, select: { id: true, tokens: true, nodeId: true } });
  return formula;
}

async function main() {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();

  try {
    if (!args.treeId && !args.submissionId) {
      console.error('❌ --treeId requis si --submissionId non fourni.');
      console.error('Exemple: npm run ts-node -- scripts/tbl-test-formula-eval.ts --treeId cmf1mwoz10005gooked1j6orn --demo');
      process.exit(1);
    }

    let treeId = args.treeId || '';
    // Mode démo: choisir une formule et peupler automatiquement 2 inputs
    if (args.demo) {
      const f = await pickDemoFormula(prisma, treeId);
      if (!f) {
        console.error('❌ Aucune formule trouvée pour le tree fourni.');
        process.exit(1);
      }
      // Si treeId n'est pas fiable, on essaie de le retrouver à partir du node
      if (!treeId && f.nodeId) {
        const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: f.nodeId }, select: { treeId: true } });
        treeId = node?.treeId || '';
      }
      args.sourceRef = `formula:${f.id}`;
      // Déduire des entrées simples dans tokens
      const ids = extractIdsFromTokens(f.tokens);
      if (ids[0]) args.sets.push({ nodeId: ids[0], value: '100' });
      if (ids[1]) args.sets.push({ nodeId: ids[1], value: '0.9' });
      console.log('🧪 DEMO - Formula choisie:', args.sourceRef, 'Inputs:', args.sets);
    }

    if (!args.sourceRef) {
      console.error('❌ --sourceRef requis (ex: formula:<id> | condition:<id> | table:<id>)');
      process.exit(1);
    }

    // Si on crée une submission, il faut un treeId
    if (!args.submissionId && !treeId) {
      console.error('❌ --treeId requis pour créer une nouvelle submission');
      process.exit(1);
    }

    // Créer ou réutiliser la submission
    const submissionId = await ensureSubmission(prisma, treeId, args.submissionId);

    // Récupérer l'organizationId pour le contexte (via tree)
    const tree = await prisma.treeBranchLeafTree.findUnique({ where: { id: treeId }, select: { organizationId: true, name: true } });
    if (!tree) {
      console.warn('⚠️ Tree introuvable, certaines traductions de conditions peuvent échouer (org manquante).');
    }

    // Upsert des valeurs si fournies
    if (args.sets.length) {
      await upsertData(prisma, submissionId, args.sets);
      console.log(`💾 Valeurs upsertées (${args.sets.length}) dans la submission ${submissionId}`);
    }

    // Construire le contexte et évaluer
    const calc = new CapacityCalculator(prisma);
    const context = {
      submissionId,
      labelMap: new Map(),
      valueMap: new Map(),
      organizationId: tree?.organizationId || 'unknown-org',
      userId: 'script',
      treeId: treeId
    };

    const res = await calc.calculateCapacity(args.sourceRef, context);

    // Affichage
    console.log('\n===== TBL TEST RESULT =====');
    console.log('Submission:', submissionId);
    console.log('Tree:', treeId, tree?.name ? `(${tree.name})` : '');
    console.log('SourceRef:', res.sourceRef);
    console.log('OperationSource:', res.operationSource);
    console.log('OperationDetail:', res.operationDetail);
    console.log('OperationResult:', res.operationResult);
    console.log('===========================\n');
  } catch (e) {
    console.error('❌ ERREUR SCRIPT:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Lancer si exécuté directement
main().catch(() => process.exit(1));
