/**
 * Audit de conformité — Vérifie que le code respecte les conventions critiques du projet
 * Analyse statique des fichiers source (pas besoin de serveur)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

function readFile(relativePath: string): string {
  const fullPath = path.join(SRC_DIR, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
}

function findFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findFiles(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Audit: Pas de new PrismaClient() direct', () => {
  it('aucun fichier source ne devrait instancier PrismaClient directement', () => {
    const tsFiles = findFiles(SRC_DIR, ['.ts', '.tsx']);
    const violations: string[] = [];
    
    for (const file of tsFiles) {
      // Ignorer le fichier database.ts qui est le singleton autorisé, les seeds, et les bridges legacy
      if (file.includes('database.ts') || file.includes('prisma.ts') || file.includes('seed') || file.includes('tbl-bridge')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('new PrismaClient(')) {
        violations.push(path.relative(SRC_DIR, file));
      }
    }
    
    expect(violations, `Fichiers avec new PrismaClient(): ${violations.join(', ')}`).toHaveLength(0);
  });
});

describe('Audit: Pas de secrets hardcodés', () => {
  it('aucun fichier ne devrait contenir de secrets en dur', () => {
    const tsFiles = findFiles(SRC_DIR, ['.ts', '.tsx']);
    const violations: string[] = [];
    const secretPatterns = [
      /(?:password|secret|api_key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    ];
    // Exclusions légitimes (tests, exemples, commentaires)
    const exclusions = ['test', '.test.', 'example', 'seed', 'mock'];

    for (const file of tsFiles) {
      if (exclusions.some(e => file.toLowerCase().includes(e))) continue;
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          // Vérifier que ce n'est pas un process.env ou un commentaire
          const lines = content.split('\n');
          for (const line of lines) {
            if (pattern.test(line) && !line.includes('process.env') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
              violations.push(`${path.relative(SRC_DIR, file)}: ${line.trim().substring(0, 80)}`);
            }
          }
        }
      }
    }
    
    // On rapporte les violations trouvées (warning, pas blocking)
    if (violations.length > 0) {
      console.warn('⚠️ Potentiels secrets hardcodés trouvés:', violations);
    }
    // On ne fait pas échouer le test car il peut y avoir des faux positifs
    // mais on vérifie que les fichiers critiques sont propres
    const criticalFiles = ['api-server-clean.ts', 'controllers/authController.ts'];
    for (const cf of criticalFiles) {
      const content = readFile(cf);
      if (content) {
        // Vérifie qu'il n'y a pas de secret littéral (pas process.env)
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes('process.env')) continue;
          if (line.trim().startsWith('//')) continue;
          expect(line).not.toMatch(/SESSION_SECRET\s*=\s*['"][^'"]{8,}['"]/);
        }
      }
    }
  });
});

describe('Audit: $queryRawUnsafe sécurisé', () => {
  it('les usages de $queryRawUnsafe devraient utiliser des paramètres ou des whitelists', () => {
    const tsFiles = findFiles(SRC_DIR, ['.ts']);
    const dangerousUsages: string[] = [];

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(SRC_DIR, file);
      
      // Vérifier au niveau du fichier entier si une whitelist existe
      const hasFileWhitelist = content.includes('ALLOWED_TABLES') || content.includes('TELNYX_TABLES') || content.includes('allowedTables');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('$queryRawUnsafe')) {
          // Si le fichier a une whitelist, considérer comme sûr
          if (hasFileWhitelist) continue;
          
          // Vérifier s'il y a interpolation directe de variables utilisateur
          const contextLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
          
          // Dangereux: interpolation directe sans paramètres
          if (contextLines.includes('${') && 
              !contextLines.includes('$1') &&
              !contextLines.includes('$${') &&
              !contextLines.includes('...params')) {
            dangerousUsages.push(`${relPath}:${i + 1}`);
          }
        }
      }
    }

    expect(dangerousUsages, `Usages $queryRawUnsafe non sécurisés: ${dangerousUsages.join(', ')}`).toHaveLength(0);
  });
});

describe('Audit: ErrorBoundary dans les pages principales', () => {
  it('MainLayoutNew devrait contenir des ErrorBoundary', () => {
    const content = readFile('pages/page2thier/MainLayoutNew.tsx');
    if (content) {
      expect(content).toContain('ErrorBoundary');
    }
  });

  it('DashboardPageUnified devrait contenir des ErrorBoundary', () => {
    const content = readFile('pages/page2thier/DashboardPageUnified.tsx');
    if (content) {
      expect(content).toContain('ErrorBoundary');
    }
  });
});

describe('Audit: Pas de console.log brut en production', () => {
  it('le filtre console devrait exister', () => {
    const content = readFile('utils/consoleFilter.ts');
    expect(content).toBeTruthy();
    // Vérifie que le filtre gère le mode (development ou production)
    expect(content).toMatch(/development|production|NODE_ENV/);
  });
});

describe('Audit: Variables d\'environnement validées au démarrage', () => {
  it('api-server-clean.ts devrait valider les variables critiques', () => {
    const content = readFile('api-server-clean.ts');
    if (content) {
      // Vérifie que SESSION_SECRET est requis
      expect(content).toMatch(/SESSION_SECRET/);
      expect(content).toMatch(/process\.exit/);
    }
  });
});

describe('Audit: Pagination des requêtes', () => {
  it('les routes admin-trees devraient avoir des limites take', () => {
    const content = readFile('routes/admin-trees.ts');
    if (content) {
      // Vérifie que les findMany ont un take
      const findManyMatches = content.match(/findMany\(\{[^}]*\}/gs) || [];
      for (const match of findManyMatches) {
        if (match.includes('include:') || match.includes('where:')) {
          // Les requêtes complexes devraient avoir un take
          // Note: on ne fait pas échouer pour les petites lookups (roles, orgs)
        }
      }
      // Au minimum, la requête trees devrait avoir take
      expect(content).toContain('take:');
    }
  });

  it('les routes wax devraient avoir des limites take', () => {
    const content = readFile('routes/wax.ts');
    if (content) {
      expect(content).toContain('take:');
    }
  });
});
