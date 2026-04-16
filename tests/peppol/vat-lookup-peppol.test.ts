/**
 * Tests — VAT Lookup + Peppol Auto-Registration System
 * 
 * Couvre :
 *   1. Service vatLookupService (normalisation TVA, lookup KBO/VIES, check Peppol)
 *   2. Routes API (/vat-lookup, /peppol-check, /auto-register, /complete-migration)
 *   3. UI PeppolSettings (alerte Peppol, auto-fill, migration)
 *   4. Intégrité système (schéma, routes, bridge)
 *   5. Sécurité (auth, validation, injection)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// ═══════════════════════════════════════════════════
// 1. VAT LOOKUP SERVICE — Normalisation & Utilitaires
// ═══════════════════════════════════════════════════

describe('vatLookupService — normalizeVatNumber', () => {
  // Import des fonctions directement depuis le source
  const servicePath = path.join(ROOT, 'src/services/vatLookupService.ts');
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  it('exporte normalizeVatNumber', () => {
    expect(serviceContent).toContain('export function normalizeVatNumber');
  });

  it('exporte extractVatDigits', () => {
    expect(serviceContent).toContain('export function extractVatDigits');
  });

  it('exporte vatLookup', () => {
    expect(serviceContent).toContain('export async function vatLookup');
  });

  it('exporte checkPeppolStatus', () => {
    expect(serviceContent).toContain('export async function checkPeppolStatus');
  });

  it('gère le préfixe BE correctement', () => {
    // Vérifie que la logique de normalisation gère BE + 10 chiffres
    expect(serviceContent).toContain("cleaned.startsWith('BE')");
    expect(serviceContent).toContain('digits.length === 10');
  });

  it('retire les caractères non numériques', () => {
    expect(serviceContent).toContain(".replace(/[\\s.\\-/]/g, '')");
  });

  it('gère la conversion en majuscules', () => {
    expect(serviceContent).toContain('.toUpperCase()');
  });
});

describe('vatLookupService — Interfaces', () => {
  const servicePath = path.join(ROOT, 'src/services/vatLookupService.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');

  it('définit interface CompanyInfo', () => {
    expect(content).toContain('export interface CompanyInfo');
    expect(content).toContain('name: string');
    expect(content).toContain('vatNumber: string');
    expect(content).toContain('address?: string');
    expect(content).toContain('city?: string');
    expect(content).toContain('country?: string');
  });

  it('définit interface PeppolRegistrationInfo', () => {
    expect(content).toContain('export interface PeppolRegistrationInfo');
    expect(content).toContain('isRegistered: boolean');
    expect(content).toContain('accessPoint?: string');
    expect(content).toContain('isRegisteredElsewhere: boolean');
  });

  it('définit interface VatLookupResult', () => {
    expect(content).toContain('export interface VatLookupResult');
    expect(content).toContain('valid: boolean');
    expect(content).toContain('company?: CompanyInfo');
    expect(content).toContain('peppol: PeppolRegistrationInfo');
    expect(content).toContain("source: 'kbo' | 'vies' | 'manual'");
  });
});

// ═══════════════════════════════════════════════════
// 2. LOOKUP SOURCES — KBO & VIES
// ═══════════════════════════════════════════════════

describe('vatLookupService — Sources de données', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/services/vatLookupService.ts'), 'utf-8');

  it('utilise KBO/BCE Open Data pour les entreprises belges', () => {
    expect(content).toContain('kbopub.economie.fgov.be');
  });

  it('utilise VIES en fallback', () => {
    expect(content).toContain('ec.europa.eu/taxation_customs/vies');
  });

  it('utilise le Peppol Directory pour la vérification', () => {
    expect(content).toContain('directory.peppol.eu');
  });

  it('a un timeout sur les requêtes KBO (5s)', () => {
    expect(content).toContain('AbortSignal.timeout(5000)');
  });

  it('a un timeout sur les requêtes VIES (10s)', () => {
    expect(content).toContain('AbortSignal.timeout(10000)');
  });

  it('a un timeout sur le Peppol Directory (8s)', () => {
    expect(content).toContain('AbortSignal.timeout(8000)');
  });

  it('gère les erreurs de chaque source silencieusement', () => {
    // Chaque lookup retourne null en cas d'erreur, ne propage pas
    const catchCount = (content.match(/} catch \{/g) || []).length;
    expect(catchCount).toBeGreaterThanOrEqual(3);
  });

  it('priorise KBO puis VIES pour les entreprises belges', () => {
    // L'ordre d'appel doit être: KBO d'abord, VIES ensuite.
    // Regex tolère l'indentation et CRLF/LF.
    const kboIndex = content.search(/=\s*await\s+lookupKBO/);
    const viesFallback = content.search(/if\s*\(!company\)\s*\{[\s\S]{0,80}?lookupVIES/);
    expect(kboIndex).toBeGreaterThan(-1);
    expect(viesFallback).toBeGreaterThan(-1);
    expect(kboIndex).toBeLessThan(viesFallback);
  });
});

// ═══════════════════════════════════════════════════
// 3. ROUTES API — /vat-lookup, /peppol-check
// ═══════════════════════════════════════════════════

describe('Routes Peppol — VAT Lookup & Peppol Check', () => {
  const routeContent = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');

  it('importe vatLookupService', () => {
    expect(routeContent).toContain("import { vatLookup, checkPeppolStatus, normalizeVatNumber, extractVatDigits }");
  });

  it('définit POST /vat-lookup', () => {
    expect(routeContent).toContain("router.post('/vat-lookup'");
  });

  it('définit POST /peppol-check', () => {
    expect(routeContent).toContain("router.post('/peppol-check'");
  });

  it('valide vatNumber avec Zod (min 8, max 30)', () => {
    expect(routeContent).toContain("vatNumber: z.string().min(8");
    expect(routeContent).toContain(".max(30)");
  });

  it('/vat-lookup requiert authenticateToken', () => {
    const match = routeContent.match(/router\.post\('\/vat-lookup',\s*authenticateToken/);
    expect(match).toBeTruthy();
  });

  it('/peppol-check requiert authenticateToken', () => {
    const match = routeContent.match(/router\.post\('\/peppol-check',\s*authenticateToken/);
    expect(match).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════
// 4. ROUTES API — /auto-register & /complete-migration
// ═══════════════════════════════════════════════════

describe('Routes Peppol — Auto-register & Migration', () => {
  const routeContent = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');

  it('définit POST /auto-register', () => {
    expect(routeContent).toContain("router.post('/auto-register'");
  });

  it('définit POST /complete-migration', () => {
    expect(routeContent).toContain("router.post('/complete-migration'");
  });

  it('/auto-register requiert isAdmin', () => {
    const match = routeContent.match(/router\.post\('\/auto-register',\s*authenticateToken,\s*isAdmin/);
    expect(match).toBeTruthy();
  });

  it('/complete-migration requiert isAdmin', () => {
    const match = routeContent.match(/router\.post\('\/complete-migration',\s*authenticateToken,\s*isAdmin/);
    expect(match).toBeTruthy();
  });

  it('auto-register valide avec Zod (organizationId UUID, vatNumber, email, phone)', () => {
    expect(routeContent).toContain('organizationId: z.string().uuid()');
    expect(routeContent).toContain('contactEmail: z.string().email()');
  });

  it('auto-register vérifie le statut Peppol avant enregistrement', () => {
    expect(routeContent).toContain('checkPeppolStatus(vatNumber)');
  });

  it('auto-register crée un statut MIGRATION_PENDING si déjà enregistré ailleurs', () => {
    expect(routeContent).toContain("registrationStatus: 'MIGRATION_PENDING'");
  });

  it('auto-register enregistre directement si pas enregistré ailleurs', () => {
    expect(routeContent).toContain('bridge.registerPeppol(odooCompanyId');
  });

  it('complete-migration vérifie que le statut est MIGRATION_PENDING', () => {
    expect(routeContent).toContain("config.registrationStatus !== 'MIGRATION_PENDING'");
  });

  it('complete-migration passe la clé de migration au bridge', () => {
    expect(routeContent).toContain('migrationKey: validation.data.migrationKey');
  });
});

// ═══════════════════════════════════════════════════
// 5. UI — PeppolSettings avec VAT lookup & alerte
// ═══════════════════════════════════════════════════

describe('PeppolSettings — UI VAT Lookup', () => {
  const uiContent = fs.readFileSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'), 'utf-8');

  it('a un champ de recherche par TVA', () => {
    expect(uiContent).toContain('Recherche par numéro de TVA');
    expect(uiContent).toContain('vatInput');
    expect(uiContent).toContain('handleVatLookup');
  });

  it('utilise le bouton Rechercher', () => {
    expect(uiContent).toContain('Rechercher');
    expect(uiContent).toContain('SearchOutlined');
  });

  it('affiche les infos entreprise trouvées', () => {
    expect(uiContent).toContain('vatResult?.valid && vatResult.company');
    expect(uiContent).toContain('vatResult.company.name');
    expect(uiContent).toContain('vatResult.company.vatNumber');
  });

  it('affiche une erreur si TVA non trouvée', () => {
    expect(uiContent).toContain('Numéro de TVA non trouvé ou invalide');
  });

  it('auto-remplit le peppolEndpoint après lookup', () => {
    expect(uiContent).toContain('peppolEndpoint: digits');
  });

  it('appelle POST /api/peppol/vat-lookup', () => {
    expect(uiContent).toContain("'/api/peppol/vat-lookup'");
  });
});

describe('PeppolSettings — Alerte Peppol déjà enregistré', () => {
  const uiContent = fs.readFileSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'), 'utf-8');

  it('affiche une alerte si Peppol enregistré ailleurs', () => {
    expect(uiContent).toContain("vatResult?.peppol?.isRegistered && vatResult.peppol.isRegisteredElsewhere");
    expect(uiContent).toContain('Ce numéro est déjà enregistré sur Peppol');
  });

  it('indique le fournisseur actuel (Access Point)', () => {
    expect(uiContent).toContain('vatResult.peppol.accessPoint');
  });

  it('explique les étapes de migration', () => {
    expect(uiContent).toContain('désactivation de Peppol');
    expect(uiContent).toContain('clé de migration');
  });

  it('propose de l aide', () => {
    expect(uiContent).toContain('nous pouvons vous accompagner');
  });

  it('a un bouton "J\'ai ma clé de migration"', () => {
    expect(uiContent).toContain("J'ai ma clé de migration");
  });
});

describe('PeppolSettings — Modal de migration', () => {
  const uiContent = fs.readFileSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'), 'utf-8');

  it('a un Modal de migration', () => {
    expect(uiContent).toContain('Migration Peppol');
    expect(uiContent).toContain('showMigrationModal');
  });

  it('a un champ pour la clé de migration', () => {
    expect(uiContent).toContain('migrationKeyInput');
    expect(uiContent).toContain('Collez votre clé de migration');
  });

  it('appelle handleCompleteMigration', () => {
    expect(uiContent).toContain('handleCompleteMigration');
    expect(uiContent).toContain("'/api/peppol/complete-migration'");
  });

  it('mentionne les fournisseurs courants', () => {
    expect(uiContent).toContain('Accountable');
    expect(uiContent).toContain('Billit');
  });

  it('a le statut MIGRATION_PENDING dans STATUS_MAP', () => {
    expect(uiContent).toContain("MIGRATION_PENDING:");
    expect(uiContent).toContain('transfert');
  });
});

// ═══════════════════════════════════════════════════
// 6. SCHÉMA PRISMA — Support migration
// ═══════════════════════════════════════════════════

describe('Schéma Prisma — PeppolConfig', () => {
  const schemaContent = fs.readFileSync(path.join(ROOT, 'prisma/schema.prisma'), 'utf-8');

  it('modèle PeppolConfig existe', () => {
    expect(schemaContent).toContain('model PeppolConfig');
  });

  it('a le champ registrationStatus (String, supporte MIGRATION_PENDING)', () => {
    expect(schemaContent).toMatch(/registrationStatus\s+String/);
  });

  it('a le champ migrationKey', () => {
    expect(schemaContent).toMatch(/migrationKey\s+String\?/);
  });

  it('a le champ odooCompanyId', () => {
    expect(schemaContent).toMatch(/odooCompanyId\s+Int\?/);
  });

  it('a le champ contactEmail', () => {
    expect(schemaContent).toMatch(/contactEmail\s+String\?/);
  });

  it('a le champ contactPhone', () => {
    expect(schemaContent).toMatch(/contactPhone\s+String\?/);
  });
});

// ═══════════════════════════════════════════════════
// 7. INTÉGRITÉ SYSTÈME — Cohérence des fichiers
// ═══════════════════════════════════════════════════

describe('Intégrité système — Fichiers critiques', () => {
  it('vatLookupService.ts existe', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/services/vatLookupService.ts'))).toBe(true);
  });

  it('peppolBridge.ts existe', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/services/peppolBridge.ts'))).toBe(true);
  });

  it('peppol.ts routes existe', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/routes/peppol.ts'))).toBe(true);
  });

  it('PeppolSettings.tsx existe', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'))).toBe(true);
  });
});

describe('Intégrité système — Imports cohérents', () => {
  it('routes/peppol.ts importe vatLookupService', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');
    expect(content).toContain("from '../services/vatLookupService'");
  });

  it('routes/peppol.ts importe peppolBridge', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');
    expect(content).toContain("from '../services/peppolBridge'");
  });

  it('api-server-clean.ts monte les routes peppol', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/api-server-clean.ts'), 'utf-8');
    expect(content).toContain("app.use('/api/peppol'");
  });

  it('PeppolSettings utilise useAuthenticatedApi (pas fetch direct)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'), 'utf-8');
    expect(content).toContain('useAuthenticatedApi');
    // Ne doit PAS utiliser fetch() directement
    expect(content).not.toMatch(/\bfetch\(/);
  });

  it('routes/peppol.ts utilise db singleton (pas new PrismaClient)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');
    expect(content).toContain("import { db } from '../lib/database'");
    expect(content).not.toContain('new PrismaClient');
  });
});

// ═══════════════════════════════════════════════════
// 8. SÉCURITÉ — Validation & Auth
// ═══════════════════════════════════════════════════

describe('Sécurité — VAT Lookup routes', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');

  it('toutes les routes requièrent authenticateToken', () => {
    // Compter les routes post/get/put qui n'ont PAS authenticateToken
    const routeLines = content.split('\n').filter(l => l.match(/router\.(post|get|put)\(/));
    const authLines = routeLines.filter(l => l.includes('authenticateToken'));
    expect(authLines.length).toBe(routeLines.length);
  });

  it('les routes d écriture requièrent isAdmin', () => {
    // register, auto-register, complete-migration, config PUT
    const adminRoutes = content.split('\n').filter(l => l.includes('isAdmin'));
    expect(adminRoutes.length).toBeGreaterThanOrEqual(4);
  });

  it('validation Zod sur vatNumber (empêche injection)', () => {
    expect(content).toContain("vatNumber: z.string().min(8");
  });

  it('validation Zod sur organizationId (UUID only)', () => {
    expect(content).toContain("organizationId: z.string().uuid()");
  });

  it('validation Zod sur contactEmail', () => {
    expect(content).toContain("contactEmail: z.string().email()");
  });
});

describe('Sécurité — vatLookupService', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/services/vatLookupService.ts'), 'utf-8');

  it('utilise AbortSignal.timeout pour toutes les requêtes externes', () => {
    const timeoutCount = (content.match(/AbortSignal\.timeout/g) || []).length;
    expect(timeoutCount).toBeGreaterThanOrEqual(3); // KBO, VIES, Peppol
  });

  it('ne fait pas de requête non sécurisée (http au lieu de https)', () => {
    // Les URLs externes doivent être en HTTPS
    const httpUrls = content.match(/fetch\(\s*['"`]http:/g);
    expect(httpUrls).toBeNull();
  });

  it('gère les erreurs sans crash (tous les lookups ont try/catch)', () => {
    const catchBlocks = (content.match(/} catch/g) || []).length;
    expect(catchBlocks).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════
// 9. FLUX COMPLET — Scénarios utilisateur
// ═══════════════════════════════════════════════════

describe('Flux — Scénario nouvel utilisateur (pas sur Peppol)', () => {
  const routeContent = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');

  it('vérifie le statut Peppol via checkPeppolStatus', () => {
    expect(routeContent).toContain('checkPeppolStatus(vatNumber)');
  });

  it('sync vers Odoo si pas enregistré ailleurs', () => {
    expect(routeContent).toContain('bridge.syncOrganization');
  });

  it('enregistre directement via bridge.registerPeppol', () => {
    expect(routeContent).toContain('bridge.registerPeppol(odooCompanyId');
  });

  it('sauvegarde la config avec enabled=true', () => {
    expect(routeContent).toContain('enabled: true');
  });
});

describe('Flux — Scénario utilisateur déjà enregistré ailleurs', () => {
  const routeContent = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');

  it('détecte isRegisteredElsewhere', () => {
    expect(routeContent).toContain('peppolStatus.isRegistered && peppolStatus.isRegisteredElsewhere');
  });

  it('crée une config MIGRATION_PENDING (pas ACTIVE)', () => {
    expect(routeContent).toContain("registrationStatus: 'MIGRATION_PENDING'");
    // Et enabled: false
    expect(routeContent).toContain('enabled: false');
  });

  it('renvoie peppolAlreadyRegistered: true', () => {
    expect(routeContent).toContain('peppolAlreadyRegistered: true');
  });

  it('indique le currentAccessPoint dans la réponse', () => {
    expect(routeContent).toContain('currentAccessPoint: peppolStatus.accessPoint');
  });
});

describe('Flux — Scénario migration avec clé', () => {
  const routeContent = fs.readFileSync(path.join(ROOT, 'src/routes/peppol.ts'), 'utf-8');

  it('vérifie que le statut est MIGRATION_PENDING avant migration', () => {
    expect(routeContent).toContain("config.registrationStatus !== 'MIGRATION_PENDING'");
  });

  it('passe la migrationKey au bridge', () => {
    expect(routeContent).toContain('migrationKey: validation.data.migrationKey');
  });

  it('met à jour le statut après migration réussie', () => {
    expect(routeContent).toContain("registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING'");
  });
});

// ═══════════════════════════════════════════════════
// 10. CONVENTIONS ZHIIVE
// ═══════════════════════════════════════════════════

describe('Conventions Zhiive', () => {
  it('vatLookupService n utilise PAS new PrismaClient', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/services/vatLookupService.ts'), 'utf-8');
    expect(content).not.toContain('new PrismaClient');
    expect(content).not.toContain("from '@prisma/client'");
  });

  it('PeppolSettings utilise useAuth', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'), 'utf-8');
    expect(content).toContain('useAuth()');
  });

  it('PeppolSettings utilise useAuthenticatedApi (pas fetch/axios)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/pages/settings/PeppolSettings.tsx'), 'utf-8');
    expect(content).toContain('useAuthenticatedApi');
    expect(content).not.toContain("import axios");
  });
});
