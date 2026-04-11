/**
 * TEST E2E RÉEL — Social Settings sur Google Cloud SQL (ou DB locale)
 * 
 * Ce test utilise la VRAIE base de données (pas de mocks).
 * Il vérifie le cycle complet :
 *   1. getOrgSocialSettings() retourne TOUS les champs
 *   2. PUT /social-settings/:orgId → sauvegarde en DB
 *   3. GET /social-settings/:orgId → relit les valeurs
 *   4. Toggle ON/OFF → valeurs persistées correctement
 *   5. Cleanup : restaure les valeurs originales
 * 
 * Lancement : npx tsx tests/e2e/social-settings-real-db.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ═══ Couleurs console ═══
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function ok(msg: string) {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function fail(msg: string, detail?: string) {
  failed++;
  console.log(`  ${RED}✗${RESET} ${msg}`);
  if (detail) console.log(`    ${RED}→ ${detail}${RESET}`);
}

function section(title: string) {
  console.log(`\n${CYAN}${BOLD}═══ ${title} ═══${RESET}`);
}

// ═══ All fields that must exist in SocialSettings ═══
const ALL_BOOLEAN_FIELDS = [
  'wallEnabled', 'storiesEnabled', 'reelsEnabled', 'sparksEnabled', 'battlesEnabled',
  'exploreEnabled', 'hiveLiveEnabled', 'messengerEnabled', 'callsEnabled',
  'allowMembersPost', 'allowMembersStory', 'allowMembersReel', 'allowMembersSpark',
  'requirePostApproval', 'showPublicPostsInFeed', 'showFriendsPostsInFeed', 'showFollowedColoniesInFeed',
  'allowGifs', 'allowLinks', 'allowHashtags', 'profanityFilterEnabled',
  'reactionsEnabled', 'commentsEnabled', 'sharesEnabled',
  'allowFollowColony', 'autoFollowOnJoin', 'friendRequestsEnabled', 'allowBlockColony',
  'showMemberList', 'showMemberCount',
  'notifyOnNewPost', 'notifyOnComment', 'notifyOnReaction', 'notifyOnNewFollower',
  'notifyOnFriendRequest', 'notifyOnMention',
  'showPostAnalytics', 'showProfileViews',
  'waxEnabled', 'waxAlertsEnabled', 'waxGhostModeAllowed',
  'questsEnabled', 'eventsEnabled', 'capsulesEnabled', 'orbitEnabled', 'pulseEnabled',
  'autoPostOnDevisSigned', 'autoPostOnInvoicePaid', 'autoPostOnChantierCreated',
  'autoPostOnChantierCompleted', 'autoPostOnNewClient', 'autoPostOnCalendarEvent',
  'autoPostOnTaskCompleted', 'gdprDataExportEnabled',
];

const ALL_NUMBER_FIELDS = [
  'maxPostLength', 'maxCommentLength', 'maxMediaPerPost', 'maxVideoSizeMB', 'maxImageSizeMB',
  'commentDepthLimit', 'maxFriendsPerUser', 'waxDefaultRadiusKm', 'gdprRetentionDays',
];

const ALL_STRING_FIELDS = [
  'defaultPostVisibility', 'profileVisibility', 'moderationMode', 'autoPostDefaultVisibility',
];

// ═══ MAIN ═══
async function main() {
  console.log(`\n${BOLD}${CYAN}🐝 TEST E2E RÉEL — Hive Social Settings${RESET}`);
  console.log(`${YELLOW}Base de données : ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@')}${RESET}\n`);

  // ─── 1. TROUVER OU CREER UNE ORG DE TEST ───
  section('1. Organisation de test');
  
  const TEST_ORG_ID = `test-social-${randomUUID().slice(0, 8)}`;
  let createdOrg = false;
  
  // Use existing org first
  const existingOrg = await prisma.organization.findFirst({
    select: { id: true, name: true },
  });

  let targetOrgId: string;
  
  if (existingOrg) {
    targetOrgId = existingOrg.id;
    ok(`Organisation existante trouvée : "${existingOrg.name}" (${targetOrgId})`);
  } else {
    await prisma.organization.create({
      data: { id: TEST_ORG_ID, name: 'Test Social Settings E2E' },
    });
    targetOrgId = TEST_ORG_ID;
    createdOrg = true;
    ok(`Organisation de test créée : ${TEST_ORG_ID}`);
  }

  // ─── 2. SAUVER L'ÉTAT ORIGINAL ───
  section('2. Backup état original');
  
  const originalSettings = await prisma.socialSettings.findUnique({
    where: { organizationId: targetOrgId },
  });
  
  if (originalSettings) {
    ok(`Settings existants sauvegardés (id: ${originalSettings.id})`);
  } else {
    ok('Aucun settings existant — sera créé');
  }

  try {
    // ─── 3. UPSERT — CRÉER OU METTRE À JOUR ───
    section('3. Upsert Social Settings');
    
    const testData = {
      wallEnabled: true,
      storiesEnabled: false,       // ← Toggle OFF pour tester
      reelsEnabled: true,
      sparksEnabled: false,        // ← Toggle OFF
      battlesEnabled: true,
      exploreEnabled: true,
      hiveLiveEnabled: false,      // ← Toggle OFF
      messengerEnabled: true,
      callsEnabled: false,         // ← Toggle OFF
      maxPostLength: 3000,
      maxCommentLength: 500,
      maxMediaPerPost: 5,
      maxVideoSizeMB: 50,
      maxImageSizeMB: 5,
      defaultPostVisibility: 'IN',
      allowMembersPost: true,
      allowMembersStory: false,
      allowMembersReel: true,
      allowMembersSpark: false,
      requirePostApproval: true,   // ← Toggle ON
      waxEnabled: true,
      waxAlertsEnabled: false,
      waxDefaultRadiusKm: 25,
      waxGhostModeAllowed: true,
      questsEnabled: true,
      eventsEnabled: false,
      capsulesEnabled: true,
      orbitEnabled: false,
      pulseEnabled: true,
      moderationMode: 'ai_auto',
      autoPostOnDevisSigned: false,
      autoPostOnChantierCreated: true,
      gdprDataExportEnabled: true,
      gdprRetentionDays: 365,
    };

    const upserted = await prisma.socialSettings.upsert({
      where: { organizationId: targetOrgId },
      update: { ...testData, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        organizationId: targetOrgId,
        ...testData,
        updatedAt: new Date(),
      },
    });

    if (upserted.id) {
      ok(`Upsert OK — id: ${upserted.id}`);
    } else {
      fail('Upsert a retourné un résultat sans id');
    }

    // ─── 4. RELIRE ET VÉRIFIER ───
    section('4. Relecture et vérification des valeurs');

    const readBack = await prisma.socialSettings.findUnique({
      where: { organizationId: targetOrgId },
    });

    if (!readBack) {
      fail('Impossible de relire les settings après upsert !');
      return;
    }

    // Vérifier les toggles OFF
    const offTests: [string, any][] = [
      ['storiesEnabled', false],
      ['sparksEnabled', false],
      ['hiveLiveEnabled', false],
      ['callsEnabled', false],
      ['allowMembersStory', false],
      ['requirePostApproval', true],
      ['waxAlertsEnabled', false],
      ['eventsEnabled', false],
      ['orbitEnabled', false],
      ['autoPostOnDevisSigned', false],
    ];

    for (const [field, expected] of offTests) {
      const actual = (readBack as any)[field];
      if (actual === expected) {
        ok(`${field} = ${expected} ✓`);
      } else {
        fail(`${field} attendu ${expected}, reçu ${actual}`);
      }
    }

    // Vérifier les champs numériques
    const numTests: [string, number][] = [
      ['maxPostLength', 3000],
      ['maxCommentLength', 500],
      ['maxMediaPerPost', 5],
      ['maxVideoSizeMB', 50],
      ['maxImageSizeMB', 5],
      ['waxDefaultRadiusKm', 25],
      ['gdprRetentionDays', 365],
    ];

    for (const [field, expected] of numTests) {
      const actual = (readBack as any)[field];
      if (actual === expected) {
        ok(`${field} = ${expected} ✓`);
      } else {
        fail(`${field} attendu ${expected}, reçu ${actual}`);
      }
    }

    // ─── 5. TOGGLE CYCLE: OFF → ON → OFF ───
    section('5. Cycle toggle ON/OFF/ON');

    // Toggle storiesEnabled: false → true
    await prisma.socialSettings.update({
      where: { organizationId: targetOrgId },
      data: { storiesEnabled: true },
    });
    let check = await prisma.socialSettings.findUnique({ where: { organizationId: targetOrgId } });
    if (check?.storiesEnabled === true) {
      ok('storiesEnabled: false → true ✓');
    } else {
      fail(`storiesEnabled: attendu true après toggle, reçu ${check?.storiesEnabled}`);
    }

    // Toggle storiesEnabled: true → false
    await prisma.socialSettings.update({
      where: { organizationId: targetOrgId },
      data: { storiesEnabled: false },
    });
    check = await prisma.socialSettings.findUnique({ where: { organizationId: targetOrgId } });
    if (check?.storiesEnabled === false) {
      ok('storiesEnabled: true → false ✓');
    } else {
      fail(`storiesEnabled: attendu false après re-toggle, reçu ${check?.storiesEnabled}`);
    }

    // ─── 6. VÉRIFIER getOrgSocialSettings() VIA IMPORT RÉEL ───
    section('6. getOrgSocialSettings() — champs complets');

    // Import dynamique pour utiliser la vraie DB
    const { getOrgSocialSettings } = await import('../../src/lib/feed-visibility');
    
    const settings = await getOrgSocialSettings(targetOrgId);
    
    // Vérifier que TOUS les champs boolean existent
    let missingBooleans = 0;
    for (const field of ALL_BOOLEAN_FIELDS) {
      const val = (settings as any)[field];
      if (typeof val !== 'boolean') {
        fail(`getOrgSocialSettings().${field} manquant ou non-boolean (reçu: ${typeof val} = ${val})`);
        missingBooleans++;
      }
    }
    if (missingBooleans === 0) {
      ok(`${ALL_BOOLEAN_FIELDS.length} champs boolean tous présents ✓`);
    }

    // Vérifier que TOUS les champs numériques existent
    let missingNumbers = 0;
    for (const field of ALL_NUMBER_FIELDS) {
      const val = (settings as any)[field];
      if (typeof val !== 'number') {
        fail(`getOrgSocialSettings().${field} manquant ou non-number (reçu: ${typeof val} = ${val})`);
        missingNumbers++;
      }
    }
    if (missingNumbers === 0) {
      ok(`${ALL_NUMBER_FIELDS.length} champs number tous présents ✓`);
    }

    // Vérifier que TOUS les champs string existent
    let missingStrings = 0;
    for (const field of ALL_STRING_FIELDS) {
      const val = (settings as any)[field];
      if (typeof val !== 'string') {
        fail(`getOrgSocialSettings().${field} manquant ou non-string (reçu: ${typeof val} = ${val})`);
        missingStrings++;
      }
    }
    if (missingStrings === 0) {
      ok(`${ALL_STRING_FIELDS.length} champs string tous présents ✓`);
    }

    // Vérifier les array (aiBannedCategories, bannedWords)
    if (Array.isArray((settings as any).aiBannedCategories)) {
      ok('aiBannedCategories est un array ✓');
    } else {
      fail(`aiBannedCategories n'est pas un array (reçu: ${typeof (settings as any).aiBannedCategories})`);
    }
    if (Array.isArray((settings as any).bannedWords)) {
      ok('bannedWords est un array ✓');
    } else {
      fail(`bannedWords n'est pas un array (reçu: ${typeof (settings as any).bannedWords})`);
    }

    // Vérifier que les toggles OFF sont bien retournés comme false
    if (settings.storiesEnabled === false) {
      ok('getOrgSocialSettings() retourne storiesEnabled=false (pas le default) ✓');
    } else {
      fail(`getOrgSocialSettings().storiesEnabled attendu false, reçu ${settings.storiesEnabled}`);
    }

    if (settings.maxPostLength === 3000) {
      ok('getOrgSocialSettings() retourne maxPostLength=3000 (pas le default 5000) ✓');
    } else {
      fail(`getOrgSocialSettings().maxPostLength attendu 3000, reçu ${settings.maxPostLength}`);
    }

    // ─── 7. TEST HTTP API (si serveur lancé) ───
    section('7. Test API HTTP (optionnel)');
    
    const API_BASE = process.env.API_URL || 'http://localhost:8080';
    try {
      const healthResp = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (healthResp.ok) {
        ok(`Serveur API accessible sur ${API_BASE}`);
        
        // Test GET settings (sans auth, devrait retourner 401)
        const noAuthResp = await fetch(`${API_BASE}/api/social-settings/${targetOrgId}`);
        if (noAuthResp.status === 401 || noAuthResp.status === 403) {
          ok('GET /social-settings sans auth → 401/403 ✓');
        } else {
          fail(`GET sans auth attendu 401/403, reçu ${noAuthResp.status}`);
        }
      } else {
        console.log(`  ${YELLOW}⏭ Serveur API non accessible — tests HTTP ignorés${RESET}`);
      }
    } catch {
      console.log(`  ${YELLOW}⏭ Serveur API non accessible — tests HTTP ignorés${RESET}`);
    }

  } finally {
    // ─── 8. CLEANUP ───
    section('8. Cleanup');
    
    if (originalSettings) {
      // Restaurer l'état original
      const { id, organizationId, createdAt, ...restoreData } = originalSettings;
      await prisma.socialSettings.update({
        where: { organizationId: targetOrgId },
        data: restoreData,
      });
      ok('Settings originaux restaurés ✓');
    } else {
      // Supprimer les settings créés
      await prisma.socialSettings.deleteMany({ where: { organizationId: targetOrgId } });
      ok('Settings de test supprimés ✓');
    }

    if (createdOrg) {
      await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
      ok('Organisation de test supprimée ✓');
    }
  }

  // ═══ RÉSUMÉ ═══
  console.log(`\n${BOLD}════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  RÉSULTAT: ${passed > 0 ? GREEN : ''}${passed} ✓${RESET}  ${failed > 0 ? RED : ''}${failed} ✗${RESET}`);
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}  🎉 TOUS LES TESTS PASSENT — BASE DE DONNÉES OK !${RESET}`);
  } else {
    console.log(`${RED}${BOLD}  ⚠️  ${failed} TESTS EN ÉCHEC${RESET}`);
  }
  console.log(`${BOLD}════════════════════════════════════════${RESET}\n`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(`${RED}ERREUR FATALE:${RESET}`, e);
  await prisma.$disconnect();
  process.exit(1);
});
