/**
 * Cross-platform replacement for `grep -rn "pattern" src/` in tests.
 *
 * Why: `execSync('grep ...')` is unavailable on Windows (no POSIX grep) and
 * also fails intermittently when OneDrive / antivirus hold file locks.
 * This walker uses pure Node APIs so tests run identically on any OS.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface GrepHit {
  file: string;   // relative to cwd
  line: number;   // 1-based
  text: string;   // original (trimmed) line content
}

export interface GrepOptions {
  /** Directory to walk (defaults to `src`). */
  dir: string;
  /** File extensions to include (e.g. ['.ts', '.tsx']). */
  extensions?: string[];
  /** Directory names to skip during walk. */
  skipDirs?: string[];
  /** Skip lines that look like single-line or block comments. */
  ignoreComments?: boolean;
}

const DEFAULT_SKIP = ['node_modules', 'dist', 'dist-server', '.git', 'coverage'];

export function grepSrc(pattern: RegExp, options: GrepOptions): GrepHit[] {
  const {
    dir,
    extensions = ['.ts', '.tsx'],
    skipDirs = DEFAULT_SKIP,
    ignoreComments = false,
  } = options;

  const hits: GrepHit[] = [];
  if (!fs.existsSync(dir)) return hits;

  const walk = (current: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      // Locked file / permission issue — skip silently, matches previous grep
      // behaviour that returned `|| true` on failure.
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.includes(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!extensions.some(ext => entry.name.endsWith(ext))) continue;

      let content: string;
      try {
        content = fs.readFileSync(full, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (ignoreComments) {
          const trimmed = line.trimStart();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        }
        // Reset lastIndex for stateful global regexes
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push({ file: full, line: i + 1, text: line.trim() });
        }
      }
    }
  };

  walk(dir);
  return hits;
}
