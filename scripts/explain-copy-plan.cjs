#!/usr/bin/env node
/**
 * Explain and verify what a variable copy will create, and optionally execute it.
 *
 * Usage examples:
 *   node scripts/explain-copy-plan.cjs --variableId <VAR_ID> --suffix 1 --verify
 *   node scripts/explain-copy-plan.cjs --variableId <VAR_ID> --suffix 1 --execute
 *
 * What it does:
 *  - Prints the exact plan of entities involved by the copy:
 *      • Target node to create (if duplicateNode=true)
 *      • New variable id/exposedKey
 *      • App Field to upsert (id=nodeId, label=displayName-suffix, type)
 *      • Target Section (existing section ancestor or synthetic tree section)
 *      • Block used/created for autofields
 *  - With --verify, checks current DB state for these entities and reports PASS/FAIL
 *  - With --execute, calls the HTTP route to perform the copy, then verifies
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.replace(/^--/, '');
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true; // boolean flag
    }
  }
  return args;
}

async function findSectionAncestorId(nodeId) {
  let current = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { id: true, parentId: true, type: true, treeId: true, order: true }
  });
  while (current) {
    if (current.type === 'section') return { sectionNodeId: current.id, treeId: current.treeId, order: current.order || 0 };
    if (!current.parentId) break;
    current = await prisma.treeBranchLeafNode.findUnique({
      where: { id: current.parentId },
      select: { id: true, parentId: true, type: true, treeId: true, order: true }
    });
  }
  // No ancestor section; fallback will use treeId from original leaf
  return null;
}

function mapFieldType(displayFormat) {
  const fmt = String(displayFormat || '').toLowerCase();
  if (fmt.includes('number')) return 'number';
  if (fmt.includes('date')) return 'date';
  if (fmt.includes('email')) return 'email';
  if (fmt.includes('phone')) return 'phone';
  if (fmt.includes('select')) return 'select';
  if (fmt.includes('radio')) return 'radio';
  if (fmt.includes('checkbox')) return 'checkbox';
  return 'text';
}

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers }
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode || 0, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify(body || {}));
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv);
  let variableId = args.variableId || args.var || args.v;
  const suffix = Number(args.suffix || args.s);
  const doVerify = Boolean(args.verify || args.vrfy);
  const doExecute = Boolean(args.execute || args.exec);
  const noDuplicateNode = Boolean(args.noDuplicateNode || args.nodup);
  const apiBase = args.apiBase || 'http://localhost:4000';
  const userTargetNodeId = args.targetNodeId || args.target || args.t;

  if ((!variableId && !args.auto) || !Number.isFinite(suffix) || suffix < 1) {
    console.error('❌ Usage: --variableId <ID> --suffix <N> [--verify] [--execute] [--noDuplicateNode] [--apiBase <url>]');
    console.error('   Astuce: utilisez --auto pour sélectionner automatiquement la première variable.');
    process.exit(1);
  }

  // 1) Load the original variable and owner node
  if (!variableId && args.auto) {
    const anyVar = await prisma.treeBranchLeafNodeVariable.findFirst({});
    if (!anyVar) {
      console.error('❌ Aucune variable trouvée en base.');
      process.exit(1);
    }
    variableId = anyVar.id;
  }
  const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } });
  if (!originalVar) {
    console.error('❌ Variable introuvable:', variableId);
    process.exit(2);
  }
  const owner = await prisma.treeBranchLeafNode.findUnique({ where: { id: originalVar.nodeId } });
  if (!owner) {
    console.error('❌ Nœud propriétaire introuvable:', originalVar.nodeId);
    process.exit(3);
  }
  const tree = await prisma.treeBranchLeafTree.findUnique({ where: { id: owner.treeId } });
  if (!tree) {
    console.error('❌ Arbre introuvable:', owner.treeId);
    process.exit(4);
  }

  // 2) Compute targets
  const plannedTargetNodeId = `${owner.id}-${suffix}`;
  const plannedNewVarId = `${variableId}-${suffix}`;
  const plannedNewExposedKey = `${originalVar.exposedKey}-${suffix}`;
  const plannedNewDisplayName = originalVar.displayName ? `${originalVar.displayName}-${suffix}` : originalVar.displayName;
  const fieldId = plannedTargetNodeId; // upsert Field with id = nodeId
  const fieldType = mapFieldType(originalVar.displayFormat);

  const sectionInfo = await findSectionAncestorId(owner.id);
  const blockId = `${tree.id}-autofields-block`;
  const targetSectionId = sectionInfo?.sectionNodeId || `${tree.id}-autofields-section`;
  const ownerOrder = owner.order || 0;

  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log('🧭 PLAN DE COPIE (sans exécution)');
  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log('• Variable source:', originalVar.id, `«${originalVar.displayName || ''}»`);
  console.log('• Nœud propriétaire:', owner.id, `«${owner.label || ''}»`, '(tree:', tree.id + ')');
  console.log('• Nœud cible (si duplication):', plannedTargetNodeId);
  if (userTargetNodeId) {
    console.log('• Nœud cible explicite (si fourni):', userTargetNodeId);
  }
  console.log('• Nouvelle variable id:', plannedNewVarId);
  console.log('• Nouvelle exposedKey:', plannedNewExposedKey);
  console.log('• Nouveau displayName:', plannedNewDisplayName);
  console.log('• Field à upserter:');
  console.log('   - id =', fieldId);
  console.log('   - label =', plannedNewDisplayName);
  console.log('   - type =', fieldType);
  console.log('   - order =', ownerOrder);
  console.log('• Section cible (app):', targetSectionId, sectionInfo ? '(depuis section ancêtre)' : '(section synthétique)');
  console.log('• Block utilisé:', blockId);

  async function verifyNow(targetNodeId) {
    console.log('\n🔎 VÉRIFICATION EN BASE');
    const existsNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: targetNodeId } });
    const existsVar = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: plannedNewVarId } });
    const field = await prisma.field.findUnique({ where: { id: targetNodeId } });
    const section = await prisma.section.findUnique({ where: { id: targetSectionId } });
    const block = await prisma.block.findUnique({ where: { id: blockId } });
    const linked = await prisma.treeBranchLeafNode.findUnique({
      where: { id: targetNodeId },
      select: { linkedVariableIds: true }
    });

    const checks = [
      { name: 'Node cible', pass: Boolean(existsNode) },
      { name: 'Variable copiée', pass: Boolean(existsVar) && existsVar?.nodeId === targetNodeId },
      { name: 'Field upserté', pass: Boolean(field) && field?.sectionId === targetSectionId },
      { name: 'Section présente', pass: Boolean(section) },
      { name: 'Block présent', pass: Boolean(block) },
      { name: 'linkedVariableIds mis à jour', pass: Array.isArray(linked?.linkedVariableIds) ? linked.linkedVariableIds.includes(plannedNewVarId) : false }
    ];

    for (const c of checks) {
      console.log(` - ${c.pass ? '✅' : '❌'} ${c.name}`);
    }

    const ok = checks.every(c => c.pass);
    console.log(ok ? '\n✅ VÉRIFICATION: PASS' : '\n❌ VÉRIFICATION: FAIL');
    if (!ok) {
      console.log('\nℹ️ Détails actuels:');
      console.log('   Node:', existsNode ? `${existsNode.id} «${existsNode.label || ''}»` : 'absent');
      console.log('   Var:', existsVar ? `${existsVar.id} @node=${existsVar.nodeId}` : 'absente');
      console.log('   Field:', field ? `${field.id} «${field.label}» section=${field.sectionId}` : 'absent');
      console.log('   Section:', section ? `${section.id} «${section.name}»` : 'absente');
      console.log('   Block:', block ? `${block.id} «${block.name}»` : 'absent');
      console.log('   linkedVariableIds:', Array.isArray(linked?.linkedVariableIds) ? linked.linkedVariableIds : 'n/a');
    }
    return ok;
  }

  if (doVerify && !doExecute) {
    await verifyNow(plannedTargetNodeId);
  }

  if (doExecute) {
    console.log('\n🚀 EXÉCUTION DE LA COPIE via API');
    // Déterminer si on doit cibler un nœud existant (même id-suffix) pour éviter une nouvelle duplication
    let effectiveTargetNodeId = userTargetNodeId;
    if (!effectiveTargetNodeId) {
      const maybeExisting = await prisma.treeBranchLeafNode.findUnique({ where: { id: plannedTargetNodeId } });
      if (maybeExisting) {
        effectiveTargetNodeId = plannedTargetNodeId;
        console.log('ℹ️ Cible existante détectée, on ne duplique pas:', effectiveTargetNodeId);
      }
    }

    const nodeIdForPath = effectiveTargetNodeId || owner.id;
    const url = `${apiBase}/api/treebranchleaf/nodes/${nodeIdForPath}/copy-linked-variable`;
    const payload = effectiveTargetNodeId
      ? { variableId, newSuffix: suffix, duplicateNode: false, targetNodeId: effectiveTargetNodeId }
      : { variableId, newSuffix: suffix, duplicateNode: !noDuplicateNode };
    const headers = { 'x-organization-id': tree.organizationId };
    const resp = await postJson(url, payload, headers);
    console.log('↩️  Réponse API:', resp.status, resp.body);
    const finalTarget = resp.body && resp.body.targetNodeId ? resp.body.targetNodeId : (effectiveTargetNodeId || plannedTargetNodeId);
    await verifyNow(finalTarget);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('💥 Erreur script:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(13);
});
