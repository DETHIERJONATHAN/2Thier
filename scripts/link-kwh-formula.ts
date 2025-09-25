import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Lie trois nœuds existants pour produire un prix kWh calculé: prix = facture / consommation.
 * - NE CRÉE PAS les nœuds de saisie; ils doivent déjà exister (facture, consommation, prix cible).
 * - N'ajoute QUE la formule + variable sur le nœud prix.
 * - NE RESET RIEN (pas de migrate reset).
 *
 * Utilisation (PowerShell):
 * $env:KWH_NODE_FACTURE_ID="<id_facture>"; $env:KWH_NODE_CONSO_ID="<id_conso>"; $env:KWH_NODE_PRIX_NODE_ID="<id_prix>"; npx tsx scripts/link-kwh-formula.ts
 */

const prisma = new PrismaClient();

const FACTURE = process.env.KWH_NODE_FACTURE_ID || '';
const CONSO   = process.env.KWH_NODE_CONSO_ID || '';
const PRIX    = process.env.KWH_NODE_PRIX_NODE_ID || '';

const FORMULA_NAME = 'Prix kWh (auto)';

async function main() {
  console.log('🔧 Link KWh Formula - Start');
  if (!FACTURE || !CONSO || !PRIX) {
    console.error('❌ Manque au moins un ID: FACTURE / CONSO / PRIX');
    process.exit(1);
  }

  const [factureNode, consoNode, prixNode] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({ where: { id: FACTURE } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: CONSO } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: PRIX } })
  ]);
  if (!factureNode) throw new Error('Node facture introuvable ' + FACTURE);
  if (!consoNode) throw new Error('Node consommation introuvable ' + CONSO);
  if (!prixNode) throw new Error('Node prix introuvable ' + PRIX);

  // Formula upsert (unique par (nodeId,name))
  let formula = await prisma.treeBranchLeafNodeFormula.findFirst({ where: { nodeId: PRIX, name: FORMULA_NAME } });
  const tokens = [
    { type: 'variable', name: factureNode.id },
    { type: 'operator', value: '/' },
    { type: 'variable', name: consoNode.id }
  ];
  if (formula) {
    console.log('♻️ Mise à jour formule existante');
    formula = await prisma.treeBranchLeafNodeFormula.update({
      where: { id: formula.id },
      data: { tokens }
    });
  } else {
    console.log('➕ Création formule');
    formula = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: randomUUID(),
        nodeId: PRIX,
        name: FORMULA_NAME,
        description: 'facture / consommation (auto)',
        tokens: tokens as unknown as object
      }
    });
  }
  console.log('✅ Formula ID:', formula.id);

  // Mettre à jour le node prix
  await prisma.treeBranchLeafNode.update({
    where: { id: PRIX },
    data: {
      hasFormula: true,
      formula_activeId: formula.id,
      formulaConfig: { formula: `${factureNode.id} / ${consoNode.id}`, variables: [factureNode.id, consoNode.id] } as unknown as object
    }
  });
  console.log('✅ Node prix mis à jour (hasFormula=true)');

  // Variable (créer si manquante)
  let variable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: PRIX } });
  if (!variable) {
    variable = await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: randomUUID(),
        nodeId: PRIX,
        exposedKey: 'prix_kwh_auto',
        displayName: 'Prix kWh (auto)',
        displayFormat: 'number',
        precision: 4,
        visibleToUser: true,
        isReadonly: true,
        sourceType: 'formula',
        sourceRef: `formula:${formula.id}`,
        metadata: {}
      }
    });
    console.log('✅ Variable créée');
  } else {
    if (variable.sourceType !== 'formula' || variable.sourceRef !== `formula:${formula.id}`) {
      await prisma.treeBranchLeafNodeVariable.update({
        where: { nodeId: PRIX },
        data: { sourceType: 'formula', sourceRef: `formula:${formula.id}` }
      });
      console.log('🔗 Variable mise à jour vers formula');
    } else {
      console.log('🔗 Variable déjà reliée');
    }
  }

  // Nettoyage éventuel: si ce node avait une Data capability pointant vers condition -> laisser en place ou purger ?
  // Ici on ne purge pas agressivement; le front doit préférer formula. Pour forcer: mettre hasData=false (optionnel).
  // await prisma.treeBranchLeafNode.update({ where: { id: PRIX }, data: { hasData: false } });

  console.log('🎉 Terminé. Recharge le front pour voir la valeur calculée.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
