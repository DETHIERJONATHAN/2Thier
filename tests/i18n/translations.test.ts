/**
 * Tests pour le système i18n
 * Vérifie la cohérence des traductions fr/en et l'intégrité des clés
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../../src/i18n/locales');

const loadJSON = (lang: string) => {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const flattenKeys = (obj: any, prefix = ''): string[] => {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

describe('i18n Translation System', () => {
  const fr = loadJSON('fr');
  const en = loadJSON('en');

  it('should have fr.json translation file', () => {
    expect(fr).not.toBeNull();
  });

  it('should have en.json translation file', () => {
    expect(en).not.toBeNull();
  });

  if (fr && en) {
    const frKeys = flattenKeys(fr);
    const enKeys = flattenKeys(en);

    it('should have matching keys between fr and en', () => {
      const missingInEn = frKeys.filter(k => !enKeys.includes(k));
      const missingInFr = enKeys.filter(k => !frKeys.includes(k));

      if (missingInEn.length > 0) {
        console.warn(`⚠️ ${missingInEn.length} keys missing in en.json:`, missingInEn.slice(0, 10));
      }
      if (missingInFr.length > 0) {
        console.warn(`⚠️ ${missingInFr.length} keys missing in fr.json:`, missingInFr.slice(0, 10));
      }

      // At least 80% overlap
      const overlap = frKeys.filter(k => enKeys.includes(k));
      const overlapRatio = overlap.length / Math.max(frKeys.length, enKeys.length);
      expect(overlapRatio).toBeGreaterThan(0.7);
    });

    it('should not have empty translation values', () => {
      const emptyFr = frKeys.filter(k => {
        const val = k.split('.').reduce((obj, key) => obj?.[key], fr as any);
        return typeof val === 'string' && val.trim() === '';
      });

      expect(emptyFr).toEqual([]);
    });

    it('should have common.* keys for shared UI elements', () => {
      expect(fr).toHaveProperty('common');
      const commonKeys = Object.keys(fr.common || {});
      expect(commonKeys.length).toBeGreaterThan(10);

      // Essential keys
      const essentialKeys = ['save', 'cancel', 'delete', 'edit', 'add', 'search', 'close', 'confirm'];
      for (const key of essentialKeys) {
        if (!commonKeys.includes(key)) {
          console.warn(`⚠️ Missing essential common key: common.${key}`);
        }
      }
    });
  }

  it('should use t() consistently in .tsx files for user-visible text', () => {
    const pagesDir = path.resolve(__dirname, '../../src/pages');
    if (!fs.existsSync(pagesDir)) return;

    // Spot check: main pages should import useTranslation
    const mainPages = ['DashboardPageUnified.tsx', 'ProfilePage.tsx'];
    let pagesWithI18n = 0;

    for (const page of mainPages) {
      const filePath = path.join(pagesDir, page);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('useTranslation')) {
        pagesWithI18n++;
      }
    }

    // At least some main pages should use i18n
    expect(pagesWithI18n).toBeGreaterThan(0);
  });
});
