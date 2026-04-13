#!/usr/bin/env tsx

/**
 * ✅ Preuve (historique): pourquoi une valeur "0" pouvait ne pas s'afficher
 *
 * Ce script:
 *  1) Lit le node en DB (calculatedValue, type, fieldType)
 *  2) Rejoue la condition "hasValidExistingValue" du contrôleur
 *     src/controllers/calculatedValueController.ts (⚠️ 0 est désormais autorisé)
 *  3) (Optionnel) Tente un GET HTTP vers l'API locale pour confirmer le résultat réel
 *
 * Lecture seule: aucune écriture en DB.
 *
 * Usage:
 *   npx tsx src/scripts/prove-zero-rejected-by-backend.ts <nodeId>
 *
 * Options env:
 *   BACKEND_URL=http://localhost:4000
 *   AUTHORIZATION="Bearer ..."     (si l'API est protégée)
 *   COOKIE="session=..."          (si besoin)
 */

import { db } from '../lib/database';
import { logger } from '../lib/logger';

const prisma = db;

function mask(value: string, keep = 6): string {
  if (!value) return value;
  if (value.length <= keep * 2) return `${value.slice(0, 2)}…${value.slice(-2)}`;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

async function main() {
  const [nodeId] = process.argv.slice(2);
  if (!nodeId) {
    logger.error('Usage: npx tsx src/scripts/prove-zero-rejected-by-backend.ts <nodeId>');
    process.exit(1);
  }

  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      type: true,
      fieldType: true,
      subType: true
    }
  });

  if (!node) {
    logger.error('❌ Node introuvable en DB:', nodeId);
    process.exit(2);
  }

  logger.debug('🔎 === PREUVE "0" REJETE PAR LE BACKEND ===');
  logger.debug('Node:', node.id);
  logger.debug('Label:', JSON.stringify(node.label));
  logger.debug('type/subType:', `${node.type}/${node.subType ?? '∅'}`);
  logger.debug('fieldType:', node.fieldType ?? '∅');
  logger.debug('calculatedValue (DB):', node.calculatedValue ?? '∅');

  // ⚠️ Rejoue la logique du contrôleur
  // const isDisplayField = node.fieldType === 'DISPLAY' || node.type === 'DISPLAY' || node.type === 'leaf_field';
  const isDisplayField = node.fieldType === 'DISPLAY' || node.type === 'DISPLAY' || node.type === 'leaf_field';

  const existingValue = node.calculatedValue;
  const hasValidExistingValue_backend =
    existingValue &&
    existingValue !== '' &&
    existingValue !== '[]' &&
    existingValue !== 'null' &&
    existingValue !== 'undefined';

  logger.debug('\n🧠 Évaluation (mêmes règles que le backend)');
  logger.debug('isDisplayField:', isDisplayField);
  logger.debug('hasValidExistingValue (backend actuel):', Boolean(hasValidExistingValue_backend));

  if (isDisplayField) {
    if (existingValue === '0' || existingValue === 0) {
      logger.debug('\n✅ Note: "0" est une valeur légitime et doit maintenant être renvoyée/affichée.');
      logger.debug('Si l’UI affiche encore le placeholder, le problème est ailleurs (ex: valeur réellement ∅, ou mauvais calcul dû à table_activeId manquant).');
    } else if (!existingValue) {
      logger.debug('\nℹ️ Conclusion: pas de calculatedValue en DB, donc normal que rien ne s’affiche via cette route.');
    } else {
      logger.debug('\nℹ️ Conclusion: calculatedValue non vide et ≠ 0, le backend devrait pouvoir la renvoyer.');
    }
  } else {
    logger.debug('\nℹ️ Note: ce node n’est pas classé display field par l’heuristique backend actuelle.');
  }

  // Tentative d'appel HTTP (preuve runtime)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  const url = `${backendUrl.replace(/\/$/, '')}/api/tree-nodes/${encodeURIComponent(nodeId)}/calculated-value`;

  logger.debug('\n🌐 Tentative GET HTTP:', url);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    };

    const auth = process.env.AUTHORIZATION;
    const cookie = process.env.COOKIE;

    if (auth) headers.Authorization = auth;
    if (cookie) headers.Cookie = cookie;

    if (auth) logger.debug('   header Authorization:', mask(auth));
    if (cookie) logger.debug('   header Cookie:', mask(cookie));

    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();

    logger.debug('HTTP status:', res.status);
    logger.debug('Body:', text);

    if (res.status === 401 || res.status === 403) {
      logger.debug('\n⚠️ L’API est protégée: fournissez AUTHORIZATION ou COOKIE pour valider côté runtime.');
    }
  } catch (e) {
    logger.debug('⚠️ Appel HTTP impossible (serveur non démarré ou réseau):', e);
  }
}

main()
  .catch((e) => {
    logger.error('❌ Erreur script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
