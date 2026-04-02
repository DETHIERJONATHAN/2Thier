/**
 * Tests — Désinscription Peppol (Deregister)
 * 
 * Couvre :
 *   1. PeppolBridge — méthode deregisterPeppol
 *   2. Route API POST /deregister (validation, auth, protection factures en cours)
 *   3. UI PeppolSettings — bouton + modal de désinscription
 *   4. Schéma DB — statut DEREGISTERED
 *   5. Intégrité — cohérence bridge ↔ routes ↔ UI
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(relPath: string): string {
  const p = path.join(ROOT, relPath);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

// ═══════════════════════════════════════════════════
// 1. PEPPOL BRIDGE — Méthode deregisterPeppol
// ═══════════════════════════════════════════════════

describe('PeppolBridge — deregisterPeppol', () => {
  const bridgeContent = readFile('src/services/peppolBridge.ts');

  it('exporte la méthode deregisterPeppol', () => {
    expect(bridgeContent).toContain('async deregisterPeppol(');
  });

  it('accepte un odooCompanyId en paramètre', () => {
    expect(bridgeContent).toContain('deregisterPeppol(odooCompanyId: number)');
  });

  it('retourne un objet { success, previousState }', () => {
    expect(bridgeContent).toContain('Promise<{ success: boolean; previousState?: string }>');
  });

  it('lit l état actuel de la company avant désinscription', () => {
    expect(bridgeContent).toContain("'account_peppol_proxy_state'");
  });

  it('recherche le proxy user Peppol existant', () => {
    expect(bridgeContent).toContain("['proxy_type', '=', 'peppol']");
  });

  it('tente la désinscription officielle via _peppol_deregister', () => {
    expect(bridgeContent).toContain("'_peppol_deregister'");
  });

  it('a un fallback si _peppol_deregister échoue', () => {
    // Vérifie que le catch existe avec un fallback
    expect(bridgeContent).toContain('account_peppol_proxy_state: false');
    expect(bridgeContent).toContain('is_account_peppol_participant: false');
  });

  it('supprime le proxy user en fallback (unlink)', () => {
    expect(bridgeContent).toContain("'account_edi_proxy_client.user', 'unlink'");
  });

  it('vérifie l état final après désinscription', () => {
    // Il doit relire la company après désinscription
    const matches = bridgeContent.match(/res\.company.*read/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2); // au moins 2 read dans deregisterPeppol
  });

  it('log la désinscription', () => {
    expect(bridgeContent).toContain('[PeppolBridge] Deregistered company');
  });
});

// ═══════════════════════════════════════════════════
// 2. ROUTE API — POST /deregister
// ═══════════════════════════════════════════════════

describe('Route API — POST /deregister', () => {
  const routeContent = readFile('src/routes/peppol.ts');

  it('déclare la route POST /deregister', () => {
    expect(routeContent).toContain("router.post('/deregister'");
  });

  it('exige authenticateToken', () => {
    // La route doit utiliser authenticateToken
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 500
    );
    expect(deregisterSection).toContain('authenticateToken');
  });

  it('exige isAdmin', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 500
    );
    expect(deregisterSection).toContain('isAdmin');
  });

  it('vérifie l organizationId', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 1500
    );
    expect(deregisterSection).toContain('getOrganizationId');
  });

  it('vérifie que la config Peppol existe', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 1500
    );
    expect(deregisterSection).toContain('peppolConfig.findUnique');
  });

  it('refuse si statut ni ACTIVE ni PENDING', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 1500
    );
    expect(deregisterSection).toContain("'ACTIVE'");
    expect(deregisterSection).toContain("'PENDING'");
    expect(deregisterSection).toContain('Impossible de désinscrire');
  });

  it('bloque si des factures sont en cours d envoi (PROCESSING)', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2000
    );
    expect(deregisterSection).toContain("peppolStatus: 'PROCESSING'");
    expect(deregisterSection).toContain('chantierInvoice.count');
  });

  it('appelle bridge.deregisterPeppol si odooCompanyId existe', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2000
    );
    expect(deregisterSection).toContain('bridge.deregisterPeppol');
  });

  it('met à jour le statut en DEREGISTERED', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2000
    );
    expect(deregisterSection).toContain("registrationStatus: 'DEREGISTERED'");
  });

  it('désactive enabled, autoSend et autoReceive', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2000
    );
    expect(deregisterSection).toContain('enabled: false');
    expect(deregisterSection).toContain('autoSendEnabled: false');
    expect(deregisterSection).toContain('autoReceiveEnabled: false');
  });

  it('log la désinscription avec userId', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2500
    );
    expect(deregisterSection).toContain('désinscrite de Peppol par utilisateur');
  });

  it('retourne un message de confirmation', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2500
    );
    expect(deregisterSection).toContain('Désinscription Peppol effectuée');
  });

  it('gère les erreurs avec try/catch', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2500
    );
    expect(deregisterSection).toContain('Erreur de désinscription');
  });
});

// ═══════════════════════════════════════════════════
// 3. UI — PeppolSettings Bouton Désinscription
// ═══════════════════════════════════════════════════

describe('PeppolSettings — UI Désinscription', () => {
  const uiContent = readFile('src/pages/settings/PeppolSettings.tsx');

  it('importe StopOutlined pour le bouton', () => {
    expect(uiContent).toContain('StopOutlined');
  });

  it('importe DeleteOutlined pour la modal', () => {
    expect(uiContent).toContain('DeleteOutlined');
  });

  it('a un state deregistering', () => {
    expect(uiContent).toContain('const [deregistering, setDeregistering]');
  });

  it('a un state showDeregisterModal', () => {
    expect(uiContent).toContain('const [showDeregisterModal, setShowDeregisterModal]');
  });

  it('a un handler handleDeregister', () => {
    expect(uiContent).toContain('const handleDeregister');
  });

  it('handleDeregister appelle POST /api/peppol/deregister', () => {
    expect(uiContent).toContain("'/api/peppol/deregister'");
  });

  it('met à jour le statut en DEREGISTERED après succès', () => {
    const handlerSection = uiContent.substring(
      uiContent.indexOf('handleDeregister'),
      uiContent.indexOf('handleDeregister') + 800
    );
    expect(handlerSection).toContain("registrationStatus: 'DEREGISTERED'");
  });

  it('affiche le bouton désinscrire uniquement si ACTIVE ou PENDING', () => {
    expect(uiContent).toContain('isRegistered || config.registrationStatus === \'PENDING\'');
  });

  it('le bouton a un style danger (rouge)', () => {
    expect(uiContent).toContain('border: `1px solid ${FB.danger}`');
    expect(uiContent).toContain('color: FB.danger');
  });

  it('affiche le texte "Se désinscrire de Peppol"', () => {
    expect(uiContent).toContain('Se désinscrire de Peppol');
  });

  it('a une modal de confirmation de désinscription', () => {
    expect(uiContent).toContain('showDeregisterModal');
    expect(uiContent).toContain('Désinscription Peppol');
  });

  it('la modal a un bouton danger pour confirmer', () => {
    expect(uiContent).toContain('okButtonProps={{ danger: true }}');
  });

  it('la modal affiche un avertissement Alert', () => {
    const modalSection = uiContent.substring(
      uiContent.indexOf('Modal de confirmation de désinscription'),
      uiContent.indexOf('Modal de confirmation de désinscription') + 1500
    );
    expect(modalSection).toContain('type="warning"');
    expect(modalSection).toContain('action irréversible');
  });

  it('la modal liste les conséquences de la désinscription', () => {
    expect(uiContent).toContain('ne pourront plus vous envoyer de factures Peppol');
    expect(uiContent).toContain('ne pourront plus recevoir vos factures');
    expect(uiContent).toContain('sera libéré');
    expect(uiContent).toContain('vous réinscrire ultérieurement');
  });

  it('la modal mentionne que les factures existantes ne sont pas affectées', () => {
    expect(uiContent).toContain('factures déjà envoyées ou reçues ne seront pas affectées');
  });

  it('le bouton confirmer de la modal appelle handleDeregister', () => {
    expect(uiContent).toContain('onOk={handleDeregister}');
  });
});

// ═══════════════════════════════════════════════════
// 4. SCHÉMA DB — Statut DEREGISTERED
// ═══════════════════════════════════════════════════

describe('Schéma & Status Map — DEREGISTERED', () => {
  const uiContent = readFile('src/pages/settings/PeppolSettings.tsx');

  it('STATUS_MAP contient DEREGISTERED', () => {
    expect(uiContent).toContain("DEREGISTERED:");
  });

  it('DEREGISTERED a un label "Désinscrit"', () => {
    expect(uiContent).toContain("label: 'Désinscrit'");
  });

  it('DEREGISTERED utilise la couleur warning', () => {
    expect(uiContent).toContain("DEREGISTERED: { color: 'warning'");
  });

  it('registrationStatus est un String dans le schéma Prisma', () => {
    const schema = readFile('prisma/schema.prisma');
    const peppolSection = schema.substring(
      schema.indexOf('model PeppolConfig'),
      schema.indexOf('model PeppolConfig') + 800
    );
    expect(peppolSection).toContain('registrationStatus');
    expect(peppolSection).toContain('String');
  });
});

// ═══════════════════════════════════════════════════
// 5. INTÉGRITÉ — Bridge ↔ Routes ↔ UI
// ═══════════════════════════════════════════════════

describe('Intégrité système désinscription', () => {
  const bridgeContent = readFile('src/services/peppolBridge.ts');
  const routeContent = readFile('src/routes/peppol.ts');
  const uiContent = readFile('src/pages/settings/PeppolSettings.tsx');

  it('la route utilise getPeppolBridge() pas new PeppolBridge()', () => {
    const deregisterSection = routeContent.substring(
      routeContent.indexOf("'/deregister'"),
      routeContent.indexOf("'/deregister'") + 2000
    );
    expect(deregisterSection).toContain('getPeppolBridge()');
    expect(deregisterSection).not.toContain('new PeppolBridge');
  });

  it('la route utilise db depuis database (pas new PrismaClient)', () => {
    expect(routeContent).toContain("from '../lib/database'");
    expect(routeContent).not.toContain('new PrismaClient');
  });

  it('l UI utilise useAuthenticatedApi (pas fetch/axios)', () => {
    expect(uiContent).toContain('useAuthenticatedApi');
    expect(uiContent).not.toContain('axios');
    // fetch est OK si utilisé dans les services côté serveur, pas dans l'UI
    const uiFetchUses = (uiContent.match(/\bfetch\(/g) || []).length;
    expect(uiFetchUses).toBe(0);
  });

  it('le bridge, la route et l UI gèrent tous le statut DEREGISTERED', () => {
    expect(bridgeContent).toContain('not_registered');
    expect(routeContent).toContain("'DEREGISTERED'");
    expect(uiContent).toContain("'DEREGISTERED'");
  });

  it('la route loggue les erreurs avec le préfixe [Peppol]', () => {
    expect(routeContent).toContain("[Peppol] Erreur POST /deregister:");
  });

  it('le bouton désinscrire ne s affiche pas si déjà DEREGISTERED', () => {
    // Le bouton s'affiche uniquement pour ACTIVE ou PENDING
    expect(uiContent).toContain("isRegistered || config.registrationStatus === 'PENDING'");
    // isRegistered = registrationStatus === 'ACTIVE'
    expect(uiContent).toContain("const isRegistered = config.registrationStatus === 'ACTIVE'");
  });

  it('après désinscription UI désactive autoSendEnabled et autoReceiveEnabled', () => {
    const handlerSection = uiContent.substring(
      uiContent.indexOf('handleDeregister'),
      uiContent.indexOf('handleDeregister') + 800
    );
    expect(handlerSection).toContain('autoSendEnabled: false');
    expect(handlerSection).toContain('autoReceiveEnabled: false');
  });
});
