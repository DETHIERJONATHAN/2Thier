#!/usr/bin/env npx tsx
/**
 * Tests — Bouton Peppol dans FacturePage
 *
 * Vérifie que FacturePage :
 *   - Charge le statut Peppol de l'organisation
 *   - Affiche le bouton "Envoyer via Peppol" sur les factures éligibles
 *   - Contient le modal de saisie de l'endpoint Peppol
 *   - Respecte les conventions Zhiive (pas de hardcode, etc.)
 *
 * Usage:
 *   npx tsx tests/peppol/peppol-facture-ui.test.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label: string) {
  passed++;
  console.log(`  ✅ ${label}`);
}
function fail(label: string, detail?: string) {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}
function warn(label: string, detail?: string) {
  warnings++;
  console.log(`  ⚠️  ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('\n⚡ TEST — Bouton Peppol dans FacturePage\n');

const facturePath = path.join(SRC, 'pages', 'FacturePage.tsx');
const src = fs.existsSync(facturePath) ? fs.readFileSync(facturePath, 'utf-8') : '';
if (!src) { fail('FacturePage.tsx manquant'); process.exit(1); }
ok('FacturePage.tsx existe');

// ══════════════════════════════════════════════════
// 1. ÉTAT PEPPOL
// ══════════════════════════════════════════════════
console.log('\n  ── État Peppol ──');

if (src.includes('peppolActive'))
  ok('State : peppolActive pour suivre le statut Peppol de l\'org');
else fail('State : peppolActive manquant');

if (src.includes('setPeppolActive'))
  ok('State : setPeppolActive setter');
else fail('State : setPeppolActive manquant');

if (src.includes('peppolModalInvoice'))
  ok('State : peppolModalInvoice pour la facture à envoyer');
else fail('State : peppolModalInvoice manquant');

if (src.includes('peppolEndpoint'))
  ok('State : peppolEndpoint pour l\'identifiant du destinataire');
else fail('State : peppolEndpoint manquant');

if (src.includes('peppolSending'))
  ok('State : peppolSending pour le loading');
else fail('State : peppolSending manquant');

// ══════════════════════════════════════════════════
// 2. CHARGEMENT CONFIG PEPPOL
// ══════════════════════════════════════════════════
console.log('\n  ── Chargement config Peppol ──');

if (src.includes('/api/peppol/config'))
  ok('Fetch : appelle /api/peppol/config pour vérifier le statut');
else fail('Fetch : /api/peppol/config non appelé');

if (src.includes("registrationStatus === 'ACTIVE'"))
  ok('Check : vérifie registrationStatus === ACTIVE');
else fail('Check : ne vérifie pas le statut ACTIVE');

// Le check doit être dans le loadData pour recharger à chaque tab
if (src.includes('loadData') && src.includes('/api/peppol/config'))
  ok('Fetch : config Peppol chargée dans loadData');
else warn('Fetch : config Peppol peut-être pas chargée dans loadData');

// ══════════════════════════════════════════════════
// 3. CONDITION D'AFFICHAGE DU BOUTON
// ══════════════════════════════════════════════════
console.log('\n  ── Condition bouton Peppol ──');

if (src.includes('canSendPeppol'))
  ok('Cond : variable canSendPeppol calculée');
else fail('Cond : canSendPeppol manquant');

// Le bouton ne doit apparaître que si Peppol est actif
if (src.includes('peppolActive') && src.includes('canSendPeppol'))
  ok('Cond : peppolActive utilisé dans canSendPeppol');
else fail('Cond : peppolActive non lié à canSendPeppol');

// Le bouton ne doit pas apparaître sur les factures incoming
if (src.includes("inv.source !== 'incoming'"))
  ok('Cond : exclut les factures entrantes');
else warn('Cond : vérifier exclusion des factures entrantes');

// Le bouton ne doit pas apparaître si déjà envoyé via Peppol
if (src.includes('!inv.peppolStatus') || src.includes('peppolStatus'))
  ok('Cond : vérifie que la facture n\'a pas déjà un peppolStatus');
else warn('Cond : pas de vérification peppolStatus existant');

// Le bouton doit apparaître sur SENT/OVERDUE
if (src.includes("'SENT'") && src.includes("'OVERDUE'"))
  ok('Cond : factures SENT et OVERDUE éligibles');
else warn('Cond : vérifier éligibilité SENT/OVERDUE');

// ══════════════════════════════════════════════════
// 4. BOUTON PEPPOL DANS L'UI
// ══════════════════════════════════════════════════
console.log('\n  ── Bouton Peppol UI ──');

if (src.includes('{canSendPeppol') || src.includes('canSendPeppol &&'))
  ok('UI : rendu conditionnel du bouton Peppol');
else fail('UI : bouton Peppol non rendu conditionnellement');

if (src.includes('ThunderboltOutlined'))
  ok('UI : icône ThunderboltOutlined (éclair)');
else warn('UI : pas d\'icône ThunderboltOutlined');

if (src.includes('Peppol'))
  ok('UI : label "Peppol" sur le bouton');
else fail('UI : label Peppol manquant');

// Vérifier que le bouton ouvre le modal
if (src.includes('setPeppolModalInvoice'))
  ok('UI : bouton ouvre le modal Peppol (setPeppolModalInvoice)');
else fail('UI : bouton n\'ouvre pas le modal');

// ══════════════════════════════════════════════════
// 5. MODAL PEPPOL
// ══════════════════════════════════════════════════
console.log('\n  ── Modal Peppol ──');

// Le modal doit s'ouvrir quand peppolModalInvoice est non null
if (src.includes('!!peppolModalInvoice') || src.includes('open={!!peppolModalInvoice'))
  ok('Modal : ouverture contrôlée par peppolModalInvoice');
else fail('Modal : pas de contrôle d\'ouverture');

// Le modal doit afficher les infos de la facture
if (src.includes('peppolModalInvoice.invoiceNumber'))
  ok('Modal : affiche le numéro de facture');
else warn('Modal : n\'affiche pas le numéro de facture');

if (src.includes('peppolModalInvoice.clientName'))
  ok('Modal : affiche le nom du client');
else warn('Modal : n\'affiche pas le nom du client');

if (src.includes('peppolModalInvoice.amount'))
  ok('Modal : affiche le montant');
else warn('Modal : n\'affiche pas le montant');

// Le modal doit avoir un champ pour l'endpoint
if (src.includes('peppolEndpoint') && src.includes('onChange'))
  ok('Modal : champ de saisie peppolEndpoint');
else fail('Modal : champ peppolEndpoint manquant');

// Le modal doit avoir un bouton d'envoi
if (src.includes('handlePeppolSend'))
  ok('Modal : bouton d\'envoi (handlePeppolSend)');
else fail('Modal : handlePeppolSend manquant');

// Le modal doit avoir un bouton annuler
if (src.includes('Annuler') && src.includes('setPeppolModalInvoice(null)'))
  ok('Modal : bouton Annuler avec reset');
else warn('Modal : bouton Annuler manquant ou incomplet');

// ══════════════════════════════════════════════════
// 6. HANDLER D'ENVOI PEPPOL
// ══════════════════════════════════════════════════
console.log('\n  ── Handler envoi Peppol ──');

if (src.includes('handlePeppolSend'))
  ok('Handler : handlePeppolSend défini');
else { fail('Handler : handlePeppolSend manquant'); }

if (src.includes('/api/peppol/send/'))
  ok('Handler : appelle /api/peppol/send/:id');
else fail('Handler : n\'appelle pas la route Peppol');

if (src.includes('setPeppolSending(true)'))
  ok('Handler : loading state activé');
else warn('Handler : pas de loading state');

if (src.includes('setPeppolSending(false)'))
  ok('Handler : loading state désactivé dans finally');
else warn('Handler : loading state pas désactivé');

// Validation avant envoi
if (src.includes('peppolEndpoint.trim()'))
  ok('Handler : valide que l\'endpoint est non-vide');
else warn('Handler : pas de validation endpoint');

// Ferme le modal après succès
if (src.includes('setPeppolModalInvoice(null)') && src.includes('message.success'))
  ok('Handler : ferme le modal et affiche succès');
else warn('Handler : pas de fermeture modal après succès');

// Recharge les données
if (src.includes('loadData()'))
  ok('Handler : recharge les données après envoi');
else warn('Handler : pas de rechargement des données');

// ══════════════════════════════════════════════════
// 7. CONVENTIONS ZHIIVE
// ══════════════════════════════════════════════════
console.log('\n  ── Conventions Zhiive ──');

// Pas de couleurs hardcodées pour Peppol (utiliser FB.*)
const peppolColorRegex = /#[0-9a-fA-F]{3,8}/g;
const peppolUISection = src.match(/canSendPeppol[\s\S]{0,500}/)?.[0] || '';
const colors = peppolUISection.match(peppolColorRegex) || [];
const hasHardcodedColors = colors.filter(c => !['#fff', '#ffffff', '#000', '#000000'].includes(c.toLowerCase()));
if (hasHardcodedColors.length === 0)
  ok('Convention : pas de couleurs hardcodées dans la zone Peppol button');
else warn(`Convention : ${hasHardcodedColors.length} couleur(s) potentiellement hardcodée(s) dans bouton Peppol`);

// Utilise FB.purple pour la couleur Peppol
if (src.includes('FB.purple'))
  ok('Convention : utilise FB.purple pour le thème Peppol');
else warn('Convention : FB.purple non trouvé pour le thème Peppol');

// Utilise useAuthenticatedApi
if (src.includes('useAuthenticatedApi'))
  ok('Convention : utilise useAuthenticatedApi (pas fetch directement)');
else fail('Convention : n\'utilise PAS useAuthenticatedApi');

// Pas de new PrismaClient
if (!src.includes('PrismaClient'))
  ok('Convention : zéro PrismaClient côté frontend');
else fail('Convention : PrismaClient trouvé côté frontend !');

// ══════════════════════════════════════════════════
// 8. PRÉ-REMPLISSAGE INTELLIGENT
// ══════════════════════════════════════════════════
console.log('\n  ── Pré-remplissage ──');

if (src.includes('clientVat') && src.includes('setPeppolEndpoint'))
  ok('Pré-remplissage : endpoint pré-rempli avec clientVat si disponible');
else warn('Pré-remplissage : clientVat non utilisé pour pré-remplir');

// ── Summary ──
console.log('\n' + '─'.repeat(55));
console.log(`  TOTAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);
if (failed === 0) console.log('  🎉 Bouton Peppol FacturePage — TOUT OK');
else console.log('  🚨 Bouton Peppol FacturePage — corrections nécessaires');
console.log('─'.repeat(55) + '\n');

process.exit(failed > 0 ? 1 : 0);
