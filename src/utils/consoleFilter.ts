import { logger } from '../lib/logger';
/**
 * consoleFilter
 * Filtre centralisé des logs de développement pour réduire le bruit sans toucher au code métier.
 *
 * Principes:
 * - Ne touche pas à logger.error pour ne jamais masquer les erreurs réelles.
 * - Filtre logger.debug/info/debug/warn pour certains préfixes/tags verbeux.
 * - Possibilité d’opt-out via localStorage.DEBUG_VERBOSE === '1' (aucun filtre).
 * - Possibilité d’allowlist via localStorage.DEBUG_ALLOW (liste séparée par des virgules de fragments à préserver).
 * - Déduplication et rate-limit des messages identiques (config via localStorage.DEBUG_DEDUP_MS).
 * - Namespaces: si localStorage.DEBUG_NS est défini (liste séparée par des virgules), on n'autorise que les logs contenant l'un de ces fragments.
 * - Timestamp optionnel: localStorage.DEBUG_TS === '1' préfixe l'heure.
 * - Résumé périodique des suppressions de duplicats (toutes les 10s en dev).
 */

type ConsoleMethod = (...args: unknown[]) => void;

function buildSuppressMatchers(): RegExp[] {
  const patterns: RegExp[] = [
    // Ant Design warnings déjà gérés ailleurs, on les filtre ici aussi pour être sûr
    /\[antd: compatible] antd v5 support React is 16 ~ 18/,
    /Instance created by `useForm` is not connected to any Form element/,
    /Received `true` for a non-boolean attribute `jsx`/,

    // Logs très verbeux du module TreeBranchLeaf/Tableaux
    /\[TBL-PRISMA\]/,
    /\[TBL-SECTION\]/,
    /\[SECTION RENDERER\]/,
    /\[TEST ANALYSE\]/,
    /\[TEST INJECTION\]/,
    /\bTBL[:\- ]/i, // préfixes TBL génériques
    /\bMIRROR\b/i, // logs miroir
    /\bSYNC\b/i, // logs synchronisation
    /TreeBranchLeaf SMART/, // info/warn répétitives
    /TreeBranchLeaf\b/i, // autres logs TreeBranchLeaf
    /^tbl:/i, // scripts de debug "tbl:..."

    // Logs verbeux TBL HOOK
    /\[TBL HOOK FIXED\]/,
    /🔔🔔🔔🔔🔔/,
    /✅✅✅✅✅/,
    /🎯🎯🎯🎯🎯/,
    /EVENT LISTENER USEEFFECT/,
    /LISTENER ATTACHÉ À WINDOW/,
    /EVENT REÇU.*TBL_FORM_DATA_CHANGED/,

    // Logs TBL.tsx
    /🔄🔄🔄.*\[TBL\] handleFieldChange/,
    /✅✅✅.*\[TBL\] setFormData/,
    /📦.*\[TBL\] formData COMPLET/,
    /🚀.*\[TBL\] Événement TBL_FORM_DATA_CHANGED/,
    /\[TBL\].*DEBUG rawNodes/,

    // Logs de style/onglets
    /⚪ \[ONGLET NORMAL\]/,
    /🎯 \[STYLE DEBUG\]/,
    /⚪ \[STYLE\].*→ NORMAL/,
    /🟢 \[STYLE\].*→ VERT/,

    // Logs CalculatedFieldDisplay
    /\[CalculatedFieldDisplay\].*Rendu avec/,
    /🔴.*\[CalculatedFieldDisplay\].*Valeur BRUTE/,
    /\[CalculatedFieldDisplay\].*État du hook/,

    // Logs useTBLTooltip (très verbeux)
    /🚨 \[useTBLTooltip\] APPELÉ/,
    /🔍 \[useTBLTooltip\] OBJET FIELD COMPLET/,
    /✅ \[useTBLTooltip\] AppearanceConfig/,
    /🔍 \[useTBLTooltip\] Propriétés field/,
    /🔥 \[useTBLTooltip\] TOUTES LES PROPRIÉTÉS/,
    /🔍 \[useTBLTooltip\]\[.*\] Données brutes/,
    /❌ \[useTBLTooltip\]\[.*\] AUCUN TOOLTIP/,
    /❌ \[useTBLTooltip\] Pas d'appearanceConfig/,

    // Logs CASCADER
    /🔍 \[CASCADER DEBUG\] Champ/,
    /✅ \[CASCADER\] Options construites/,

    // Logs useCalculatedFieldValue
    /\[useCalculatedFieldValue\].*Appel API/,
    /\[useCalculatedFieldValue\].*Valeur sélectionnée/,

    // Logs useTBLTableLookup
    /\[DEBUG\]\[Test - liste\]/,
    /📊 \[extractOptions\]/,

    // Logs AuthProvider (redondants)
    /\[AuthProvider\].*Premier fetch/,
    /\[AuthProvider\].*Pas de user\/org/,
    /\[AuthProvider\].*Cleanup effect/,
    /\[AuthProvider\].*response:/,
    /\[AuthProvider\].*Organisation restaurée/,
    /\[AuthProvider\].*Tentative de connexion/,
    /\[AuthProvider\].*Chargement modules/,
    /\[AuthProvider\].*SuperAdmin.*permission/,
    /\[AuthProvider\].*Réponse de.*auto-google-auth/,
    /\[AuthProvider\].*Connexion Google/,
    /\[AuthProvider\].*Modules actifs chargés/,
    /\[AuthProvider\].*Modules déjà chargés/,

    // Logs AppLayout
    /\[AppLayout\].*Layout complet initialisé/,
    /\[AppLayout\] User:/,
    /\[AppLayout\] Organization:/,
    /\[AppLayout\] Modules visibles:/,
    /\[AppLayout\] Loading:/,
    /\[AppLayout\] IsSuperAdmin:/,
    /\[AppLayout\] Modules sample:/,

    // Logs blocksSlice
    /\[DEBUG\] blocksSlice/,
    /\[DEBUG\] store\/index/,
    /\[DEBUG\] createBlocksSlice/,
  ];
  return patterns;
}

function shouldSuppress(message: unknown, suppressed: RegExp[], allowlist: string[], nsFilter: string[]): boolean {
  if (typeof message !== 'string') return false;
  if (!message) return false;

  // Allowlist: si l’un des fragments est présent, on ne supprime pas
  if (allowlist.length) {
    for (const frag of allowlist) {
      if (!frag) continue;
      if (message.includes(frag)) return false;
    }
  }

  // Namespaces: si DEBUG_NS est défini, n'autoriser que si l'un des fragments est présent
  if (nsFilter.length) {
    let match = false;
    for (const frag of nsFilter) {
      if (!frag) continue;
      if (message.includes(frag)) { match = true; break; }
    }
    if (!match) return true; // supprime si rien ne matche les namespaces autorisés
  }

  // Supprimer si une des regex matche
  for (const rx of suppressed) {
    try {
      if (rx.test(message)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export default function initConsoleFilter() {
  // Opt-out global pour les devs: saisir localStorage.DEBUG_VERBOSE = '1'
  try {
    const verbose = (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_VERBOSE')) === '1';
    // @ts-expect-error vite env peut ne pas exister selon le contexte
    const envVerbose = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEBUG_VERBOSE === '1');
    if (verbose || envVerbose) {
      logger.info('🟢 consoleFilter: mode VERBOSE (aucun filtre)');
      return;
    }
  } catch {
    // localStorage indisponible (SSR/tests)
  }

  const allowlist: string[] = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('DEBUG_ALLOW') : null;
      return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  })();

  const nsFilter: string[] = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('DEBUG_NS') : null;
      return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  })();

  const suppressed = buildSuppressMatchers();

  // Déduplication / rate limit config
  const dedupMs = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('DEBUG_DEDUP_MS') : null;
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) ? Math.max(0, n) : 800; // défaut 800ms
    } catch { return 800; }
  })();
  const showTs = (() => {
    try { return (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_TS')) === '1'; } catch { return false; }
  })();

  const original = {
    log: logger.debug as ConsoleMethod,
    info: logger.info as ConsoleMethod,
    debug: logger.debug as ConsoleMethod,
    warn: logger.warn as ConsoleMethod,
    error: logger.error as ConsoleMethod,
  };

  // Ne jamais toucher aux erreurs
  logger.error = original.error;

  // État pour déduplication et résumé
  const lastSeen = new Map<string, number>();
  const suppressedCount = new Map<string, number>();

  // Afficher périodiquement un résumé des duplicats supprimés
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      if (!suppressedCount.size) return;
      const summary: string[] = [];
      suppressedCount.forEach((count, key) => {
        if (count > 0) summary.push(`• "${key.slice(0, 80)}${key.length>80?'…':''}" ×${count}`);
      });
      if (summary.length) {
        original.info('🔁 consoleFilter: duplicats supprimés récemment:\n' + summary.join('\n'));
        suppressedCount.clear();
      }
    }, 10_000);
  }

  const wrap = (fn: ConsoleMethod): ConsoleMethod => {
    return (...args: unknown[]) => {
      const first = args[0];
      if (shouldSuppress(first, suppressed, allowlist, nsFilter)) {
        return; // silencieux
      }
      // Déduplication: si premier argument string identique récemment, supprime
      const key = typeof first === 'string' ? first : undefined;
      if (key && dedupMs > 0) {
        const now = Date.now();
        const last = lastSeen.get(key) || 0;
        if (now - last < dedupMs) {
          suppressedCount.set(key, (suppressedCount.get(key) || 0) + 1);
          return;
        }
        lastSeen.set(key, now);
      }
      // Timestamp optionnel
      if (showTs) {
        const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
        fn.apply(console, [`⏱ ${ts}`, ...args] as unknown as Parameters<ConsoleMethod>);
      } else {
        fn.apply(console, args as Parameters<ConsoleMethod>);
      }
    };
  };

  logger.debug = wrap(original.log);
  logger.info = wrap(original.info);
  logger.debug = wrap(original.debug);
  logger.warn = wrap(original.warn);

  if (process.env.NODE_ENV === 'development') {
    logger.info('🧹 consoleFilter: filtres appliqués', {
      allowlist,
      nsFilter,
      dedupMs,
      ts: showTs ? 'on' : 'off',
      hint: 'set localStorage.DEBUG_VERBOSE="1" pour désactiver',
    });
  }
}
