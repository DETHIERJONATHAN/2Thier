/**
 * Tests exhaustifs i18n — Complétude des fichiers de traduction
 *
 * Validations :
 *  - fr.json et en.json sont des JSON valides
 *  - Chaque clé de fr.json existe dans en.json (et inversement)
 *  - Aucune valeur vide
 *  - Le lexique Hive est correctement traduit
 *  - Les namespaces requis existent
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Load locale files ────────────────────────────────
const localesDir = path.resolve(__dirname, '../../../src/i18n/locales');
const frPath = path.join(localesDir, 'fr.json');
const enPath = path.join(localesDir, 'en.json');

let fr: Record<string, any> = {};
let en: Record<string, any> = {};

try {
  fr = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
  en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
} catch (e) {
  // Will be caught by tests below
}

// ── Helpers ──────────────────────────────────────────
function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// ═══════════════════════════════════════════════════════
describe('i18n — File Validity', () => {
  it('fr.json is a valid JSON file', () => {
    const content = fs.readFileSync(frPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('en.json is a valid JSON file', () => {
    const content = fs.readFileSync(enPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('fr.json is not empty', () => {
    expect(Object.keys(fr).length).toBeGreaterThan(0);
  });

  it('en.json is not empty', () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Key Parity (fr ↔ en)', () => {
  const frKeys = flattenKeys(fr);
  const enKeys = flattenKeys(en);
  const frSet = new Set(frKeys);
  const enSet = new Set(enKeys);

  it('all French keys exist in English', () => {
    const missingInEn = frKeys.filter(k => !enSet.has(k));
    if (missingInEn.length > 0) {
      console.warn(`Missing in en.json: ${missingInEn.join(', ')}`);
    }
    expect(missingInEn).toEqual([]);
  });

  it('all English keys exist in French', () => {
    const missingInFr = enKeys.filter(k => !frSet.has(k));
    if (missingInFr.length > 0) {
      console.warn(`Missing in fr.json: ${missingInFr.join(', ')}`);
    }
    expect(missingInFr).toEqual([]);
  });

  it('both files have the same number of keys', () => {
    expect(frKeys.length).toBe(enKeys.length);
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — No Empty Values', () => {
  const frKeys = flattenKeys(fr);

  it('no empty string values in fr.json', () => {
    const emptyKeys = frKeys.filter(k => {
      const val = getNestedValue(fr, k);
      return typeof val === 'string' && val.trim() === '';
    });
    if (emptyKeys.length > 0) {
      console.warn(`Empty values in fr.json: ${emptyKeys.join(', ')}`);
    }
    expect(emptyKeys).toEqual([]);
  });

  it('no empty string values in en.json', () => {
    const enKeys = flattenKeys(en);
    const emptyKeys = enKeys.filter(k => {
      const val = getNestedValue(en, k);
      return typeof val === 'string' && val.trim() === '';
    });
    if (emptyKeys.length > 0) {
      console.warn(`Empty values in en.json: ${emptyKeys.join(', ')}`);
    }
    expect(emptyKeys).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Required Namespaces', () => {
  const requiredNamespaces = [
    'common',
    'dashboard',
    'wall',
    'mood',
    'search',
  ];

  requiredNamespaces.forEach(ns => {
    it(`fr.json has "${ns}" namespace`, () => {
      expect(fr).toHaveProperty(ns);
      expect(typeof fr[ns]).toBe('object');
    });

    it(`en.json has "${ns}" namespace`, () => {
      expect(en).toHaveProperty(ns);
      expect(typeof en[ns]).toBe('object');
    });
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Hive Lexicon Preservation', () => {
  // These are the branded Zhiive terms that must NEVER
  // be auto-translated to generic words

  it('English uses "Buzz" for posts', () => {
    const enKeys = flattenKeys(en);
    const buzzKeys = enKeys.filter(k => k.includes('wall.'));
    // wall.buzzIt, wall.buzzPublished, wall.buzzing, etc.
    const hasBuzzTerms = buzzKeys.some(k => {
      const val = getNestedValue(en, k);
      return typeof val === 'string' && val.includes('Buzz');
    });
    expect(hasBuzzTerms).toBe(true);
  });

  it('English uses "Colony" for organization/group', () => {
    const enKeys = flattenKeys(en);
    const hasColony = enKeys.some(k => {
      const val = getNestedValue(en, k);
      return typeof val === 'string' && val.includes('Colony');
    });
    expect(hasColony).toBe(true);
  });

  it('English uses "Pollen" for reactions', () => {
    const val = getNestedValue(en, 'wall.pollen');
    expect(val).toBeDefined();
    expect(typeof val).toBe('string');
  });

  it('French uses "Buzz" for posts (same brand)', () => {
    const frKeys = flattenKeys(fr);
    const hasBuzz = frKeys.some(k => {
      const val = getNestedValue(fr, k);
      return typeof val === 'string' && val.includes('Buzz');
    });
    expect(hasBuzz).toBe(true);
  });

  it('French uses "Colony" for organization', () => {
    const frKeys = flattenKeys(fr);
    const hasColony = frKeys.some(k => {
      const val = getNestedValue(fr, k);
      return typeof val === 'string' && val.includes('Colony');
    });
    expect(hasColony).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Dashboard Keys Completeness', () => {
  const requiredDashboardKeys = [
    'dashboard.recentActivity',
    'dashboard.welcomeToHive',
    'dashboard.emptyFeedMessage',
    'dashboard.loadingFeed',
    'dashboard.analytics',
    'dashboard.statsViewOf',
    'dashboard.performance',
    'dashboard.totalLeads',
    'dashboard.thisMonth',
    'dashboard.converted',
    'dashboard.chantiers',
    'dashboard.revenue',
  ];

  requiredDashboardKeys.forEach(key => {
    it(`fr.json has "${key}"`, () => {
      expect(getNestedValue(fr, key)).toBeDefined();
    });
    it(`en.json has "${key}"`, () => {
      expect(getNestedValue(en, key)).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Wall Keys Completeness', () => {
  const requiredWallKeys = [
    'wall.buzz',
    'wall.share',
    'wall.buzzIt',
    'wall.buzzPublished',
    'wall.buzzing',
    'wall.shareABuzz',
    'wall.includeOriginal',
    'wall.visibilityPublic',
    'wall.visibilityColony',
    'wall.visibilityPrivate',
    'wall.unknown',
    'wall.pollen',
    'wall.feed',
    'wall.publishFailed',
  ];

  requiredWallKeys.forEach(key => {
    it(`fr.json has "${key}"`, () => {
      expect(getNestedValue(fr, key)).toBeDefined();
    });
    it(`en.json has "${key}"`, () => {
      expect(getNestedValue(en, key)).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Mood Keys Completeness', () => {
  const moods = [
    'mood.happy', 'mood.motivated', 'mood.party',
    'mood.grateful', 'mood.onFire', 'mood.coffee',
    'mood.atWork', 'mood.focused', 'mood.goal', 'mood.passionate',
  ];

  moods.forEach(key => {
    it(`has mood key "${key}" in both locales`, () => {
      expect(getNestedValue(fr, key)).toBeDefined();
      expect(getNestedValue(en, key)).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════
describe('i18n — Key Minimum Count', () => {
  it('fr.json has at least 100 keys', () => {
    const count = flattenKeys(fr).length;
    expect(count).toBeGreaterThanOrEqual(100);
  });

  it('en.json has at least 100 keys', () => {
    const count = flattenKeys(en).length;
    expect(count).toBeGreaterThanOrEqual(100);
  });
});
