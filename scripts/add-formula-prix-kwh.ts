// 🚨 DEPRECATED: Ce script est obsolète.
// Utiliser désormais: `npx tsx scripts/sync-formulas.ts` avec configuration dans `scripts/formulas.config.json`.
// Il est conservé uniquement comme référence historique et NE DOIT PLUS ÊTRE EXÉCUTÉ.
console.error('[DEPRECATED] Utiliser sync-formulas.ts au lieu de add-formula-prix-kwh.ts');
process.exit(1);

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Script idempotent pour créer (ou mettre à jour) une formule "Prix kWh (auto)" sur un nœud cible
 * et l'attacher comme source formula:<id> à un nœud variable cible.
 *
 * Hypothèses à ajuster:
 * - NODE_FACTURE_ID: id du node (valeur annuelle facture)
 * - NODE_CONSO_ID: id du node (valeur consommation annuelle)
 * - NODE_PRIX_KWH_ID: id du mini champ prix kWh (variable / field) à alimenter
 * - TREE_ID: id de l'arbre si filtrage nécessaire (facultatif ici)
 *
 * Usage:  npx tsx scripts/add-formula-prix-kwh.ts
 */

const prisma = new PrismaClient();

// TODO: REMPLACER par les vrais IDs (placer éventuellement via variables d'environnement)
const NODE_FACTURE_ID = process.env.KWH_NODE_FACTURE_ID || 'REPLACE_FACTURE_NODE_ID';
const NODE_CONSO_ID = process.env.KWH_NODE_CONSO_ID || 'REPLACE_CONSO_NODE_ID';
const NODE_PRIX_KWH_ID = process.env.KWH_NODE_PRIX_NODE_ID || 'REPLACE_PRIX_NODE_ID';

// Nom interne stable de la formule
const FORMULA_NAME = 'Prix kWh (auto)';

async function main() {
  console.log('🔧 Démarrage script création formule Prix kWh');

  // Vérifications minimales
  const missing: string[] = [];
  if (NODE_FACTURE_ID.startsWith('REPLACE_')) missing.push('NODE_FACTURE_ID');
  if (NODE_CONSO_ID.startsWith('REPLACE_')) missing.push('NODE_CONSO_ID');
  if (NODE_PRIX_KWH_ID.startsWith('REPLACE_')) missing.push('NODE_PRIX_KWH_ID');
  if (missing.length) {
    console.error('❌ IDs manquants. Remplacer les placeholders:', missing.join(', '));
    process.exit(1);
  }

  // 1. Vérifier existence des nœuds
  const [factureNode, consoNode, prixNode] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({ where: { id: NODE_FACTURE_ID } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: NODE_CONSO_ID } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: NODE_PRIX_KWH_ID } })
  ]);

  if (!factureNode) throw new Error(`Node facture introuvable: ${NODE_FACTURE_ID}`);
  if (!consoNode) throw new Error(`Node consommation introuvable: ${NODE_CONSO_ID}`);
  if (!prixNode) throw new Error(`Node prix kWh introuvable: ${NODE_PRIX_KWH_ID}`);

  // 2. Chercher une formule existante sur le node prix avec le même nom
  let existing = await prisma.treeBranchLeafNodeFormula.findFirst({
    where: { nodeId: NODE_PRIX_KWH_ID, name: FORMULA_NAME }
  });

  // Tokens simples: variable facture / variable conso / division protégée via opérateur standard
  // Le moteur inline existant supporte tokens {type:'variable'| 'operator' | 'value'}
  // On laisse la division produire 0 si denom=0 (implémentation actuelle applique b===0?0)
  // Option: filtrer via condition mais on garde simple.

  interface VariableToken { type: 'variable'; name: string }
  interface OperatorToken { type: 'operator'; value: '/' | '+' | '-' | '*' }
  type SimpleFormulaToken = VariableToken | OperatorToken;
  const tokens: SimpleFormulaToken[] = [
    { type: 'variable', name: factureNode.id },
    { type: 'operator', value: '/' },
    { type: 'variable', name: consoNode.id }
  ];

  if (existing) {
    console.log('♻️ Formule existante trouvée, mise à jour des tokens si nécessaire...');
    existing = await prisma.treeBranchLeafNodeFormula.update({
      where: { id: existing.id },
      data: { tokens, updatedAt: new Date() }
    });
  } else {
    console.log('➕ Création nouvelle formule Prix kWh');
    existing = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: randomUUID(),
        nodeId: NODE_PRIX_KWH_ID,
        name: FORMULA_NAME,
        description: 'facture_annuelle / consommation_annuelle (auto)',
        tokens: tokens as unknown as object // Prisma InputJsonValue
      }
    });
  }

  console.log('✅ Formule prête:', existing.id, existing.name);

  // 3. Marquer le node prix comme ayant une formule + stocker une formulaConfig minimale (compat UI)
  await prisma.treeBranchLeafNode.update({
    where: { id: NODE_PRIX_KWH_ID },
    data: {
      hasFormula: true,
      formula_activeId: existing.id,
      formulaConfig: {
        formula: `${factureNode.id} / ${consoNode.id}`,
        variables: [factureNode.id, consoNode.id],
        updatedAt: new Date().toISOString()
      } as unknown as object
    }
  });

  // 4. Attacher la variable (si variable node) => mettre sourceRef sur TreeBranchLeafNodeVariable si existante
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: NODE_PRIX_KWH_ID } });
  if (variable) {
    if (variable.sourceType !== 'formula' || variable.sourceRef !== `formula:${existing.id}`) {
      await prisma.treeBranchLeafNodeVariable.update({
        where: { nodeId: NODE_PRIX_KWH_ID },
        data: { sourceType: 'formula', sourceRef: `formula:${existing.id}` }
      });
      console.log('🔗 Variable attachée à formula:', existing.id);
    } else {
      console.log('🔗 Variable déjà reliée à la formula.');
    }
  } else {
    console.log('ℹ️ Pas de record TreeBranchLeafNodeVariable pour ce nœud — si nécessaire créer manuellement.');
  }

  console.log('🎉 Terminé. Le moteur utilisera désormais la formule.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
