/**
 * Zero-Hardcode Colors Enforcement Test
 *
 * Scans all TypeScript/TSX source files for hardcoded hex color values
 * that should use SF.* or WEBSITE_DEFAULTS.* from ZhiiveTheme.ts instead.
 *
 * Allowed exceptions:
 *  - ZhiiveTheme.ts itself (defines the source constants)
 *  - Test files
 *  - CSS / config files (tailwind.config.js, etc.)
 *  - Comments & string literals used for Prisma/SQL/data
 *  - Ant Design theme overrides (ConfigProvider)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const SRC = path.resolve(__dirname, '../../src');

// These hex values MUST NOT appear raw in source files (case-insensitive).
// They all have a named constant in SF or WEBSITE_DEFAULTS.
const BANNED_HEX = [
  '#6C5CE7',  // SF.primary
  '#1a1a2e',  // SF.dark
  '#10b981',  // SF.emerald / WEBSITE_DEFAULTS.primaryColor
  '#FF6B6B',  // use SF.like or SF.danger
  '#1877f2',  // FB.blue
  '#3b82f6',  // SF.blue
  '#8b5cf6',  // SF.violet
  '#ef4444',  // SF.red
  '#f59e0b',  // SF.amber
  '#059669',  // SF.emeraldDark
  '#047857',  // SF.emeraldDeep
] as const;

// Files / directories that are allowed to contain raw hex colors.
const ALLOWED_PATHS = [
  'components/zhiive/ZhiiveTheme.ts',           // source of truth
  'components/zhiive/ZhiiveTheme.test.ts',       // hypothetical test
  'components/Documents/DocumentThemes.ts',      // SVG content & theme configs
  'components/Documents/ModuleRegistry.ts',      // module config data
  'components/websites/IconPicker.tsx',          // color palette data
  'components/TreeBranchLeaf/',                  // TBL config & hierarchy data
  'site/',                                       // seed data, schemas, renderers
  'routes/treebranchleaf',                       // server default colors
];

function isAllowed(relPath: string): boolean {
  return ALLOWED_PATHS.some((a) => relPath.includes(a));
}

describe('Zero-Hardcode Colors Enforcement', () => {
  const files = glob.sync('**/*.{ts,tsx}', {
    cwd: SRC,
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
  });

  for (const hex of BANNED_HEX) {
    it(`no raw "${hex}" outside ZhiiveTheme`, () => {
      const violations: string[] = [];
      const regex = new RegExp(hex.replace('#', '#'), 'gi');

      for (const file of files) {
        if (isAllowed(file)) continue;

        const content = fs.readFileSync(path.join(SRC, file), 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip single-line comments
          if (line.trimStart().startsWith('//')) continue;
          // Skip lines that are purely inside a block comment
          if (line.trimStart().startsWith('*')) continue;

          if (regex.test(line)) {
            violations.push(`${file}:${i + 1}  →  ${line.trim()}`);
          }
          // Reset regex lastIndex
          regex.lastIndex = 0;
        }
      }

      expect(
        violations,
        `Found ${violations.length} raw "${hex}" occurrence(s). Use SF.* or WEBSITE_DEFAULTS.* instead:\n${violations.join('\n')}`,
      ).toHaveLength(0);
    });
  }
});
