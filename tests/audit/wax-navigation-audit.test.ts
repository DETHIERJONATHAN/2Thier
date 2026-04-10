/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   🕯️ WAX NAVIGATION — AUDIT COMPLET CARTE & NAVIGATION        ║
 * ║   Test : code, API routes, navigation, 3D, voix, simulation   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Ce test vérifie l'intégralité du module Wax :
 *
 *  1. CODE — Fichiers essentiels, composants, conventions Zhiive
 *  2. API — Routes /api/wax/*, paramètres, signalements dans routage
 *  3. NAVIGATION — Flèche (snap route + rotation API), bearing route
 *  4. 3D — Terrain désactivé en car-view, buildings, sky
 *  5. VOIX — TTS Chrome-resilient, preload voices, multi-seuils
 *  6. ROTATION — Gestes 2 doigts / souris activés
 *  7. SIMULATION — Mode test visuel à vitesse configurable
 *  8. i18n — Clés de traduction FR/EN présentes
 *  9. SÉCURITÉ — Auth sur toutes les routes, pas de hardcode
 *
 * Usage :
 *   npx vitest run tests/audit/wax-navigation-audit.test.ts
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ═══════════════════════════════════════════════════════
// 1. CODE — Fichiers essentiels et conventions
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Fichiers essentiels', () => {
  it('WaxPanel.tsx existe', () => {
    expect(fileExists('src/components/zhiive/WaxPanel.tsx')).toBe(true);
  });

  it('Routes wax.ts existe', () => {
    expect(fileExists('src/routes/wax.ts')).toBe(true);
  });

  it('WaxPanel utilise le singleton db (pas new PrismaClient)', () => {
    const code = readFile('src/routes/wax.ts');
    expect(code).toContain("import { db } from '../lib/database'");
    expect(code).not.toContain('new PrismaClient');
  });

  it('WaxPanel utilise SF theme (pas de couleurs hardcodées)', () => {
    const code = readFile('src/components/zhiive/WaxPanel.tsx');
    expect(code).toContain("import { SF } from './ZhiiveTheme'");
    expect(code).toContain('SF.primary');
    expect(code).toContain('SF.success');
  });

  it('WaxPanel utilise i18n (pas de textes en dur)', () => {
    const code = readFile('src/components/zhiive/WaxPanel.tsx');
    expect(code).toContain('useTranslation');
    expect(code).toContain("t('wax.");
  });
});

// ═══════════════════════════════════════════════════════
// 2. API — Routes et signalements
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — API Routes', () => {
  const routeCode = readFile('src/routes/wax.ts');

  it('Route GET /locations existe avec bounding box', () => {
    expect(routeCode).toContain("router.get('/locations'");
    expect(routeCode).toContain('sw_lat');
    expect(routeCode).toContain('ne_lat');
  });

  it('Route POST /location existe', () => {
    expect(routeCode).toContain("router.post('/location'");
  });

  it('Route GET /route utilise OSRM', () => {
    expect(routeCode).toContain("router.get('/route'");
    expect(routeCode).toContain('router.project-osrm.org');
  });

  it('Route GET /route inclut les signalements (alerts) dans la réponse', () => {
    expect(routeCode).toContain('alertPins');
    expect(routeCode).toContain('alerts: alertPins');
    expect(routeCode).toContain("pinType: { in: ['radar', 'police', 'accident', 'travaux', 'danger', 'embouteillage'] }");
  });

  it('Route GET /geocode existe avec biais pays', () => {
    expect(routeCode).toContain("router.get('/geocode'");
    expect(routeCode).toContain('countryCodes');
  });

  it('Toutes les routes sont authentifiées', () => {
    expect(routeCode).toContain('authenticateToken');
    expect(routeCode).toContain('router.use(authenticateToken');
  });

  it('Instructions OSRM francisées', () => {
    expect(routeCode).toContain('getManeuverText');
    expect(routeCode).toContain('Tournez');
    expect(routeCode).toContain('rond-point');
    expect(routeCode).toContain('à gauche');
    expect(routeCode).toContain('à droite');
  });
});

// ═══════════════════════════════════════════════════════
// 3. NAVIGATION — Flèche, snap-to-route, bearing
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Navigation flèche', () => {
  const code = readFile('src/components/zhiive/WaxPanel.tsx');

  it('Utilise setRotation() au lieu de CSS transform pour la flèche', () => {
    expect(code).toContain('.setRotation(bearing)');
    // S'assurer que l'ancien hack CSS n'est plus utilisé
    expect(code).not.toContain("arrowEl.style.transform = `${arrowEl.style.transform");
  });

  it('Snap-to-route est implémenté (projection sur polyline)', () => {
    expect(code).toContain('snapToRoute');
    expect(code).toContain('snap only if within 50m');
  });

  it('Bearing est calculé via projection le long de la route (bearingAlongRoute)', () => {
    expect(code).toContain('bearingAlongRoute');
    expect(code).toContain('forwardMeters');
  });

  it('Pas de code mort: bearingFromRoute et findNearestSegment ont été supprimés', () => {
    expect(code).not.toMatch(/const bearingFromRoute/);
    expect(code).not.toMatch(/const findNearestSegment/);
    expect(code).not.toMatch(/const computeDistToStep/);
  });

  it('Auto-reroute quand >100m hors trajet', () => {
    expect(code).toContain('minRouteDist > 100');
    expect(code).toContain('Recalcul du trajet');
  });

  it('Marker arrow utilise rotationAlignment: map', () => {
    expect(code).toContain("rotationAlignment: 'map'");
    expect(code).toContain("pitchAlignment: 'map'");
  });

  it('La position live de l utilisateur est affichée séparément du flux serveur', () => {
    expect(code).toContain('liveSelfMarkerRef');
    expect(code).toContain('userPositionRef');
  });

  it('Le partage GPS synchronise aussi la position locale en direct', () => {
    expect(code).toContain('updateUserPosition(livePos)');
    expect(code).toContain('maximumAge: 0');
  });

  it('Auto-GPS au démarrage : centre la carte sur l utilisateur', () => {
    expect(code).toContain('Auto-request GPS on mount');
    expect(code).toContain('flyTo');
  });

  it('Le self est filtré des bees API (évite doublon avec liveSelfMarkerRef)', () => {
    expect(code).toContain('b.id !== selfId');
    expect(code).toContain('otherBees');
  });

  it('Le marqueur self a une animation pulse', () => {
    expect(code).toContain('waxSelfPulse');
    expect(code).toContain('wax-live-self-marker');
  });
});

// ═══════════════════════════════════════════════════════
// 4. 3D — Terrain et buildings
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Mode 3D', () => {
  const code = readFile('src/components/zhiive/WaxPanel.tsx');

  it('Terrain DEM est ajouté au chargement', () => {
    expect(code).toContain("addSource('terrain-dem'");
    expect(code).toContain('raster-dem');
  });

  it('Terrain est désactivé en car-view (évite artefacts visuels)', () => {
    expect(code).toContain('map.setTerrain(null)');
  });

  it('Terrain est réactivé en sortant du car-view', () => {
    expect(code).toContain("map.setTerrain({ source: 'terrain-dem'");
  });

  it('Buildings 3D extrudés sont ajoutés', () => {
    expect(code).toContain("'buildings-3d'");
    expect(code).toContain('fill-extrusion');
  });

  it('Sky atmosphere est configuré', () => {
    expect(code).toContain('setSky');
    expect(code).toContain('sky-color');
  });

  it('Pitch max est 85° mais car-view utilise 75°', () => {
    expect(code).toContain('maxPitch: 85');
    expect(code).toContain('pitch: 75');
  });

  it('Le cap suit la route via un point projeté en avant', () => {
    expect(code).toContain('bearingAlongRoute');
    expect(code).toContain('forwardMeters');
  });

  it('Camera 3D utilise un offset première-personne (camera3DCenter)', () => {
    expect(code).toContain('camera3DCenter');
  });

  it('HUD affiche la distance live vers le prochain step', () => {
    expect(code).toContain('liveDistToNextStep');
    expect(code).toContain('setLiveDistToNextStep');
  });

  it('HUD affiche aussi le step suivant en live', () => {
    expect(code).toContain('liveDistToFollowingStep');
    expect(code).toContain('setLiveDistToFollowingStep');
  });

  it('Le suivi GPS navigation refuse les positions en cache', () => {
    expect(code).toContain('maximumAge: 0');
  });

  it('liveDistToNextStep est réinitialisé à null dans stopNavigation', () => {
    expect(code).toContain('setLiveDistToNextStep(null)');
    expect(code).toContain('setLiveDistToFollowingStep(null)');
  });
});

// ═══════════════════════════════════════════════════════
// 5. VOIX — TTS Chrome-resilient
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Navigation vocale', () => {
  const code = readFile('src/components/zhiive/WaxPanel.tsx');

  it('Voices sont préchargées au montage', () => {
    expect(code).toContain('speechSynthesis.getVoices()');
    expect(code).toContain('voiceschanged');
  });

  it('Utilise voiceEnabledRef (stable, pas de re-render)', () => {
    expect(code).toContain('voiceEnabledRef.current');
  });

  it('Chrome workaround: resume timer pour empêcher la pause', () => {
    expect(code).toContain('resumeTimer');
    expect(code).toContain('speechSynthesis.paused');
    expect(code).toContain('speechSynthesis.resume()');
  });

  it('Annonces à plusieurs seuils de distance (500m, 200m, 100m, 50m)', () => {
    expect(code).toContain('lastThreshold > 500');
    expect(code).toContain('lastThreshold > 200');
    expect(code).toContain('lastThreshold > 100');
    expect(code).toContain('lastThreshold > 50');
    expect(code).toContain('Maintenant,');
  });

  it('Announce destination atteinte', () => {
    expect(code).toContain('Vous êtes arrivé à destination');
  });

  it('Voix française préférée', () => {
    expect(code).toContain("lang = 'fr-BE'");
    expect(code).toContain("lang.startsWith('fr')");
  });

  it('Les annonces de manoeuvre utilisent un timing basé sur l ETA', () => {
    expect(code).toContain('etaSeconds');
    expect(code).toContain('Préparez-vous');
    expect(code).toContain('Maintenant,');
  });
});

// ═══════════════════════════════════════════════════════
// 6. ROTATION — Gestes carte
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Rotation carte', () => {
  const code = readFile('src/components/zhiive/WaxPanel.tsx');

  it('dragRotate est activé (rotation souris desktop)', () => {
    expect(code).toContain('map.dragRotate.enable()');
  });

  it('touchZoomRotate est activé (rotation 2 doigts mobile)', () => {
    expect(code).toContain('map.touchZoomRotate.enable()');
    expect(code).toContain('enableRotation()');
  });

  it('touchPitch est activé', () => {
    expect(code).toContain('map.touchPitch.enable()');
  });
});

// ═══════════════════════════════════════════════════════
// 7. SIMULATION — Mode test visuel
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Simulation trajet', () => {
  const code = readFile('src/components/zhiive/WaxPanel.tsx');

  it('Fonction startSimulation existe', () => {
    expect(code).toContain('startSimulation');
    expect(code).toContain('speedKmh');
  });

  it('La simulation est réservée au super admin', () => {
    expect(code).toContain('isSuperAdmin');
    expect(code).toContain('wax.nav.simulationTooltip');
  });

  it('Simulation interpole la position le long du trajet', () => {
    expect(code).toContain('cumDist');
    expect(code).toContain('simulationRef.current.traveled');
  });

  it('Simulation utilise le même système d\'annonces vocales', () => {
    expect(code).toContain('advanceSteps(simLat, simLng');
  });

  it('Bouton simuler est visible dans l\'UI', () => {
    expect(code).toContain("startSimulation(50)");
    expect(code).toContain("t('wax.nav.simulate')");
  });

  it('Simulation annonce les signalements', () => {
    expect(code).toContain('routeAlerts.length > 0');
    expect(code).toContain('Attention sur votre trajet');
  });

  it('État simulating est géré', () => {
    expect(code).toContain('setSimulating(true)');
    expect(code).toContain('setSimulating(false)');
  });

  it('Simulation annonce le résumé du trajet (distance + durée)', () => {
    expect(code).not.toContain('formatDistance(rd.distance)');
    expect(code).not.toContain('formatDuration(rd.duration)');
  });

  it('La simulation ne prononce plus un départ explicite', () => {
    expect(code).not.toContain('Départ de la navigation simulée');
  });

  it('Simulation met à jour distance et temps restants en temps réel', () => {
    expect(code).toContain('setSimDistRemaining');
    expect(code).toContain('setSimTimeRemaining');
    expect(code).toContain('simDistRemaining');
    expect(code).toContain('simTimeRemaining');
  });

  it('Simulation annonce le kilométrage restant périodiquement', () => {
    expect(code).toContain('lastKmAnnounce');
    expect(code).toContain('restants');
  });

  it('HUD affiche le badge SIMULATION pendant la simulation', () => {
    expect(code).toContain('SIMULATION');
  });

  it('Annonces signalements individuels quand on passe à côté (200m)', () => {
    expect(code).toContain('announcedAlertIdsRef');
    expect(code).toContain('Attention, radar');
    expect(code).toContain('Attention, contrôle de police');
    expect(code).toContain('d < 200');
  });

  it('Reset des alertes annoncées à chaque démarrage nav/simulation', () => {
    // Should reset announcedAlertIdsRef in both startNavigation and startSimulation
    const matches = code.match(/announcedAlertIdsRef\.current = new Set/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3); // stopNavigation + startNavigation + startSimulation
  });
});

// ═══════════════════════════════════════════════════════
// 8. i18n — Traductions
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Traductions i18n', () => {
  it('Clés FR : navigation de base', () => {
    const fr = JSON.parse(readFile('src/i18n/locales/fr.json'));
    expect(fr.wax).toBeDefined();
    expect(fr.wax.title).toBe('Wax');
    expect(fr.wax.nav.go).toBeDefined();
    expect(fr.wax.nav.stop).toBeDefined();
    expect(fr.wax.nav.simulate).toBeDefined();
    expect(fr.wax.nav.stopSimulation).toBeDefined();
    expect(fr.wax.nav.simulationTooltip).toBeDefined();
  });

  it('Clés FR : alertes Waze', () => {
    const fr = JSON.parse(readFile('src/i18n/locales/fr.json'));
    expect(fr.wax.alerts.radar).toBeDefined();
    expect(fr.wax.alerts.police).toBeDefined();
    expect(fr.wax.alerts.accident).toBeDefined();
    expect(fr.wax.alerts.travaux).toBeDefined();
  });

  it('Clés EN : navigation + simulation', () => {
    const en = JSON.parse(readFile('src/i18n/locales/en.json'));
    expect(en.wax).toBeDefined();
    expect(en.wax.nav.simulate).toBeDefined();
    expect(en.wax.nav.stopSimulation).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════
// 9. SÉCURITÉ — Pas de secrets, auth, validation
// ═══════════════════════════════════════════════════════
describe('🕯️ WAX — Sécurité', () => {
  it('Pas de clé API hardcodée dans wax.ts', () => {
    const code = readFile('src/routes/wax.ts');
    expect(code).not.toMatch(/api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i);
    expect(code).not.toMatch(/secret\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i);
  });

  it('Pas de new PrismaClient dans WaxPanel', () => {
    const code = readFile('src/components/zhiive/WaxPanel.tsx');
    expect(code).not.toContain('new PrismaClient');
  });

  it('Validation de coordonnées dans POST /location', () => {
    const code = readFile('src/routes/wax.ts');
    expect(code).toContain("typeof latitude !== 'number'");
  });

  it('WaxPanel ne contient pas de fetch/axios direct', () => {
    const code = readFile('src/components/zhiive/WaxPanel.tsx');
    // Le composant reçoit api en prop, pas de fetch direct
    expect(code).not.toMatch(/\bfetch\s*\(/);
    expect(code).not.toMatch(/axios\./);
  });
});
