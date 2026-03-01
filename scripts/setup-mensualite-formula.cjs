/**
 * Script pour créer la formule VPM (Mensualité - Prêt) dans la base de données.
 * 
 * Formule PMT/VPM : M = P × r × (1+r)^n / ((1+r)^n - 1)
 * Où P = Prix TVAC, r = taux mensuel (taux annuel / 1200), n = nb mois
 * 
 * Identique à =VPM(taux/12; nb_mois; -montant; 0) d'Excel.
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const db = new PrismaClient();

// ─── IDs des nœuds existants ───
const NODE_MENSUALITE  = '399f2d0b-ce5c-4c17-b666-530b4f44c0a8'; // Mensualité - Prêt (display cible)
const NODE_PRIX_TVAC   = '4aee7537-6704-4528-b646-41e098572b5b'; // Prix TVAC (display calculé)
const NODE_NB_MOIS     = '1c132e46-3222-4d0b-b754-80dc19fe875b'; // Financement (N° de mois) (champ saisie)
const NODE_TAUX        = '5f6761b9-a7b5-4a49-9f74-06a77d115c8e'; // Taux d'interet (champ saisie)
const ORG_ID           = '1757366075154-i554z93kl';

// ─── Nouveaux IDs ───
const FORMULA_ID  = crypto.randomUUID();
const VARIABLE_ID = crypto.randomUUID();

// ─── Tokens de la formule VPM ───
// Expression finale (une fois les refs remplacées par {{var_N}}) :
// if ( or ( empty ( NB_MOIS ) , eq ( TAUX , 0 ) , eq ( NB_MOIS , 0 ) ) , 0 ,
//   round ( safediv ( TVAC * ( TAUX / 1200 ) * ( 1 + TAUX / 1200 ) ^ NB_MOIS ,
//   ( 1 + TAUX / 1200 ) ^ NB_MOIS - 1 , 0 ) , 2 ) )
const TOKENS = [
  "if", "(", "or", "(", 
    "empty", "(", `@value.${NODE_NB_MOIS}`, ")", ",",
    "eq", "(", `@value.${NODE_TAUX}`, ",", "0", ")", ",",
    "eq", "(", `@value.${NODE_NB_MOIS}`, ",", "0", ")",
  ")", ",", "0", ",",
  "round", "(", 
    "safediv", "(",
      `@calculated.${NODE_PRIX_TVAC}`, "*",
      "(", `@value.${NODE_TAUX}`, "/", "1200", ")", "*",
      "(", "1", "+", `@value.${NODE_TAUX}`, "/", "1200", ")", "^", `@value.${NODE_NB_MOIS}`, ",",
      "(", "1", "+", `@value.${NODE_TAUX}`, "/", "1200", ")", "^", `@value.${NODE_NB_MOIS}`, "-", "1", ",",
      "0",
    ")", ",", "2",
  ")", ")"
];

async function main() {
  console.log('=== CRÉATION FORMULE MENSUALITÉ - PRÊT (VPM) ===\n');
  console.log(`Formula ID: ${FORMULA_ID}`);
  console.log(`Variable ID: ${VARIABLE_ID}`);
  console.log(`Organisation: ${ORG_ID}\n`);

  // 1. Créer la formule
  console.log('1. Création de la formule...');
  const formula = await db.treeBranchLeafNodeFormula.create({
    data: {
      id: FORMULA_ID,
      nodeId: NODE_MENSUALITE,
      organizationId: ORG_ID,
      name: 'Mensualité VPM',
      tokens: TOKENS,
      description: 'Formule PMT/VPM : M = P × r × (1+r)^n / ((1+r)^n - 1). Identique à =VPM() Excel.',
      isDefault: true,
      order: 0,
    }
  });
  console.log(`   ✅ Formule créée: ${formula.id}`);

  // 2. Mettre à jour le nœud : hasFormula=true, subType=display
  console.log('2. Mise à jour du nœud Mensualité...');
  const node = await db.treeBranchLeafNode.update({
    where: { id: NODE_MENSUALITE },
    data: {
      hasFormula: true,
      subType: 'display',
    }
  });
  console.log(`   ✅ Node mis à jour: hasFormula=${node.hasFormula}, subType=${node.subType}`);

  // 3. Créer la variable associée
  console.log('3. Création de la variable...');
  const variable = await db.treeBranchLeafNodeVariable.create({
    data: {
      id: VARIABLE_ID,
      nodeId: NODE_MENSUALITE,
      exposedKey: `var_${NODE_MENSUALITE.substring(0, 4)}`,
      displayName: 'Mensualité - Prêt',
      displayFormat: 'number',
      unit: '€',
      precision: 2,
      visibleToUser: false,
      isReadonly: false,
      sourceRef: `node-formula:${FORMULA_ID}`,
      sourceType: 'tree',
      metadata: {},
    }
  });
  console.log(`   ✅ Variable créée: ${variable.id} (exposedKey=${variable.exposedKey})`);

  // 4. Vérification
  console.log('\n=== VÉRIFICATION ===');
  const check = await db.treeBranchLeafNode.findUnique({
    where: { id: NODE_MENSUALITE },
    select: { id: true, label: true, hasFormula: true, subType: true }
  });
  console.log(`Node: ${check.label} | hasFormula=${check.hasFormula} | subType=${check.subType}`);
  
  const checkFormula = await db.treeBranchLeafNodeFormula.findUnique({
    where: { id: FORMULA_ID },
    select: { id: true, name: true, tokens: true }
  });
  console.log(`Formula: ${checkFormula.name} | ${checkFormula.tokens.length} tokens`);
  
  const checkVar = await db.treeBranchLeafNodeVariable.findUnique({
    where: { id: VARIABLE_ID },
    select: { id: true, sourceRef: true, displayName: true }
  });
  console.log(`Variable: ${checkVar.displayName} | sourceRef=${checkVar.sourceRef}`);

  console.log('\n✅ TERMINÉ ! La formule Mensualité - Prêt est configurée.');
  console.log('   Elle utilise: Prix TVAC × taux_mensuel × (1+taux_mensuel)^nb_mois / ((1+taux_mensuel)^nb_mois - 1)');
  console.log('   = Identique à =VPM(taux/12; nb_mois; -montant; 0) Excel');
  
  await db.$disconnect();
}

main().catch(async e => {
  console.error('❌ ERREUR:', e);
  await db.$disconnect();
  process.exit(1);
});
