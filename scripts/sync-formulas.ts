import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

interface FormulaConfig {
  key: string;
  label: string;
  output: { matchLabel: string; precision?: number; format?: string };
  inputs: { role: string; matchLabel: string }[];
  expression: string; // ex: {{a}} / {{b}}
  allowManualOverride?: boolean;
  description?: string;
}

const prisma = new PrismaClient();

function loadConfig(): FormulaConfig[] {
  const file = path.join(process.cwd(), 'scripts', 'formulas.config.json');
  if (!fs.existsSync(file)) throw new Error('Missing formulas.config.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

type Token =
  | { type: 'variable'; name: string }
  | { type: 'operator'; value: string }
  | { type: 'number'; value: number };

// Parse une expression très simple avec variables {{var}} et opérateurs + - * /
function buildTokens(expr: string, roleToNodeId: Record<string,string>): Token[] {
  const tokens: Token[] = [];
  // Remplacement temporaire des variables par un marqueur
  // Split sur espaces pour simplicité (améliorable si besoin)
  const parts = expr
    .replace(/\{\{\s*(.+?)\s*\}\}/g, (_, v) => `__VAR__${v}__`)
    .split(/\s+/)
    .filter(Boolean);
  for (const p of parts) {
    if (p.startsWith('__VAR__')) {
      const role = p.replace(/__VAR__|__/g, '');
      const nodeId = roleToNodeId[role];
      if (!nodeId) throw new Error('Unknown variable role in expression: ' + role);
      tokens.push({ type: 'variable', name: nodeId });
    } else if (/^[+\-*/]$/.test(p)) {
      tokens.push({ type: 'operator', value: p });
    } else if (/^[0-9]+(\.[0-9]+)?$/.test(p)) {
      tokens.push({ type: 'number', value: parseFloat(p) });
    } else {
      // Ignorer pour l'instant parenthèses ou autres (extension future)
    }
  }
  return tokens;
}

async function findNodeByLabel(label: string) {
  return prisma.treeBranchLeafNode.findFirst({ where: { label: { equals: label } } });
}

async function ensureManualNodes(baseKey: string, baseLabel: string) {
  const manualLabel = baseLabel + ' (manuel)';
  const modeLabel = baseLabel + ' (mode auto)';

  // Vérifier existence d'un tree pour attacher (on prend le tree du node output plus tard idéalement)
  // Pour simplifier: chercher un tree quelconque existant.
  const anyTree = await prisma.treeBranchLeafTree.findFirst();
  if (!anyTree) {
    console.warn('  ⚠ Aucun tree trouvé — override manuel ignoré');
    return { manualNode: null, modeNode: null };
  }

  const [manualNode, modeNode] = await Promise.all([
    prisma.treeBranchLeafNode.findFirst({ where: { label: manualLabel } }),
    prisma.treeBranchLeafNode.findFirst({ where: { label: modeLabel } })
  ]);
  let createdManual = manualNode;
  let createdMode = modeNode;
  const baseCommon = {
    treeId: anyTree.id,
    isActive: true,
    isVisible: true,
    hasCondition: false,
    hasFormula: false,
    hasTable: false,
    hasAPI: false,
    hasLink: false,
    hasMarkers: false,
    metadata: {},
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;

  if (!createdManual) {
    createdManual = await prisma.treeBranchLeafNode.create({
      data: {
        id: randomUUID(),
        type: 'leaf_field',
        label: manualLabel,
        hasData: true,
        data_exposedKey: baseKey + '_manuel',
        // On le masque côté UI standard: la bascule se fera via un endpoint ou un screen spécifique
        data_visibleToUser: false,
        number_decimals: 4,
        ...baseCommon,
      }
    });
  }
  if (!createdMode) {
    createdMode = await prisma.treeBranchLeafNode.create({
      data: {
        id: randomUUID(),
        type: 'leaf_field',
        label: modeLabel,
        fieldType: 'boolean',
        hasData: true,
        data_exposedKey: baseKey + '_mode_auto',
        // Masqué pour éviter duplication: UI pourra lire/écrire via API ciblée
        data_visibleToUser: false,
        bool_defaultValue: true,
        ...baseCommon,
      }
    });
  }
  return { manualNode: createdManual, modeNode: createdMode };
}

async function upsertFormulaOutputVariable(outputNodeId: string, key: string, displayName: string, formulaId: string, precision?: number, format?: string) {
  let variable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: outputNodeId } });
  if (!variable) {
    variable = await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: randomUUID(),
        nodeId: outputNodeId,
        exposedKey: key,
        displayName,
        displayFormat: format || 'number',
        precision: precision ?? 4,
        visibleToUser: true,
        isReadonly: true,
        sourceType: 'formula',
        sourceRef: `formula:${formulaId}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } else {
    if (variable.sourceType !== 'formula' || variable.sourceRef !== `formula:${formulaId}`) {
      await prisma.treeBranchLeafNodeVariable.update({
        where: { nodeId: outputNodeId },
        data: { sourceType: 'formula', sourceRef: `formula:${formulaId}` }
      });
    }
  }
}

async function main() {
  console.log('🔄 Sync formulas start');
  const configs = loadConfig();
  for (const cfg of configs) {
    console.log('\n▶', cfg.key, '-', cfg.label);
    // Résoudre output node
    const outputNode = await findNodeByLabel(cfg.output.matchLabel);
    if (!outputNode) {
      console.warn('  ⚠ Output node introuvable pour label', cfg.output.matchLabel);
      continue;
    }
    // Résoudre inputs
    const roleToNodeId: Record<string,string> = {};
    let inputsOk = true;
    for (const inp of cfg.inputs) {
      const n = await findNodeByLabel(inp.matchLabel);
      if (!n) {
        console.warn('  ⚠ Input introuvable:', inp.matchLabel);
        inputsOk = false;
        break;
      }
      roleToNodeId[inp.role] = n.id;
    }
    if (!inputsOk) continue;

    // Construire tokens
    const tokens = buildTokens(cfg.expression, roleToNodeId);

    // Upsert formula
    let formula = await prisma.treeBranchLeafNodeFormula.findFirst({ where: { nodeId: outputNode.id, name: cfg.label } });
    if (formula) {
      formula = await prisma.treeBranchLeafNodeFormula.update({ where: { id: formula.id }, data: { tokens, description: cfg.description } });
      console.log('  ♻️ Formula mise à jour', formula.id);
    } else {
      formula = await prisma.treeBranchLeafNodeFormula.create({
        data: {
          id: randomUUID(),
            nodeId: outputNode.id,
            name: cfg.label,
            tokens: tokens as unknown as object,
            description: cfg.description,
            isDefault: true
        }
      });
      console.log('  ➕ Formula créée', formula.id);
    }

    // Marquer node
    let manualNodeId: string | undefined;
    let modeNodeId: string | undefined;
    if (cfg.allowManualOverride) {
      const { manualNode, modeNode } = await ensureManualNodes(cfg.key, cfg.label);
      manualNodeId = manualNode?.id;
      modeNodeId = modeNode?.id;
      console.log('  ℹ Mode override nodes:', manualNode?.id, modeNode?.id);
    }

    await prisma.treeBranchLeafNode.update({
      where: { id: outputNode.id },
      data: {
        hasFormula: true,
        formula_activeId: formula.id,
        formulaConfig: {
          formula: cfg.expression,
          roles: roleToNodeId,
          manualNodeId,
            modeNodeId,
            override: cfg.allowManualOverride === true
        } as unknown as object
      }
    });
    console.log('  ✅ Node output mis à jour');

    // Variable formula
    await upsertFormulaOutputVariable(outputNode.id, cfg.key, cfg.label, formula.id, cfg.output.precision, cfg.output.format);
    console.log('  ✅ Variable output ok');
  }
  console.log('\n✅ Sync formulas done');
  // Mise à jour versioning
  try {
    const versionFile = path.join(process.cwd(),'scripts','formulas.version.json');
    let current = { version: 0 } as { version: number; generatedAt?: string; notes?: string };
    if (fs.existsSync(versionFile)) {
      try { current = JSON.parse(fs.readFileSync(versionFile,'utf-8')); } catch {/* noop */}
    }
    const nextVersion = (current.version || 0) + 1;
    const updated = { ...current, version: nextVersion, generatedAt: new Date().toISOString() };
    fs.writeFileSync(versionFile, JSON.stringify(updated,null,2));
    console.log('🔖 Version formules incrémentée =>', nextVersion);
  } catch (verErr) {
    console.warn('⚠️ Impossible de mettre à jour formulas.version.json', (verErr as Error)?.message);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
