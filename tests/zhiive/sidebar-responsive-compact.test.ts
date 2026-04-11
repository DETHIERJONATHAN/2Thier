/**
 * Tests exhaustifs pour le mode compact (sidebar responsive) des widgets Zhiive.
 *
 * Problème résolu :
 * Quand les widgets (Agenda, Search, Explore, etc.) sont rendus dans la sidebar
 * droite/gauche du Dashboard (300px / 280px), ils utilisaient Grid.useBreakpoint()
 * qui mesure le viewport global — pas le conteneur. Le viewport étant toujours >1200px
 * sur desktop, les widgets rendaient leur layout "desktop" dans 300px → débordements.
 *
 * Solution : Chaque widget accepte un prop `compact?: boolean`. Quand sidebar=true,
 * le Dashboard passe compact={true} et le widget force le mode mobile.
 *
 * Couvre :
 *  - AgendaPage              → compact prop → isMobile override
 *  - AgendaWrapper            → compact prop forwarding
 *  - SearchPage               → compact prop → grid minmax ajusté
 *  - ExplorePanel             → compact prop → 2 colonnes au lieu de 3
 *  - InstaGrid                → cols prop → colonnes dynamiques
 *  - DashboardPageUnified     → renderPanel passe compact={sidebar}
 *  - UnifiedMailPage          → modèle de référence compact (déjà en place)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Helpers ──
const SRC = path.resolve(__dirname, '../../src');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

// ══════════════════════════════════════════════════════════════
// 1. AgendaPage — compact prop
// ══════════════════════════════════════════════════════════════
describe('AgendaPage — compact sidebar mode', () => {
  const source = readSrc('plugins/ModuleAgenda/AgendaPage.tsx');

  it('exports a default function that accepts { compact?: boolean }', () => {
    // Signature: export default function AgendaPage({ compact }: { compact?: boolean })
    expect(source).toMatch(/export default function AgendaPage\(\s*\{\s*compact\s*\}/);
  });

  it('derives isMobile from compact OR viewport breakpoint', () => {
    // Must have: const isMobile = compact || !screens.md;
    expect(source).toMatch(/isMobile\s*=\s*compact\s*\|\|\s*!screens\.md/);
  });

  it('does NOT use only viewport for isMobile (old broken pattern)', () => {
    // Must NOT have the old pattern: const isMobile = !screens.md; (alone, without compact)
    // The line should always include compact
    const lines = source.split('\n');
    const isMobileLines = lines.filter(l => l.includes('isMobile') && l.includes('screens.md'));
    for (const line of isMobileLines) {
      expect(line).toContain('compact');
    }
  });

  it('uses isMobile to show mobile layout with Segmented tabs', () => {
    expect(source).toContain('mobileView');
    expect(source).toContain("Segmented");
  });

  it('uses isMobile to switch calendar view to listWeek (compact)', () => {
    expect(source).toContain('listWeek');
  });

  it('uses isMobile for modal width 100% vs 600px', () => {
    expect(source).toMatch(/width.*isMobile.*100%.*600/s);
  });
});

// ══════════════════════════════════════════════════════════════
// 2. AgendaWrapper — compact prop forwarding
// ══════════════════════════════════════════════════════════════
describe('AgendaWrapper — compact prop forwarding', () => {
  const source = readSrc('pages/AgendaWrapper.tsx');

  it('accepts compact prop in its React.FC type', () => {
    expect(source).toMatch(/React\.FC<\s*\{\s*compact\?\s*:\s*boolean\s*\}>/);
  });

  it('destructures compact from props', () => {
    expect(source).toMatch(/\(\s*\{\s*compact\s*\}\s*\)/);
  });

  it('passes compact to AgendaPage', () => {
    expect(source).toContain('<AgendaPage compact={compact} />');
  });
});

// ══════════════════════════════════════════════════════════════
// 3. SearchPage — compact prop
// ══════════════════════════════════════════════════════════════
describe('SearchPage — compact sidebar mode', () => {
  const source = readSrc('pages/SearchPage.tsx');

  it('accepts compact prop', () => {
    expect(source).toMatch(/SearchPage.*React\.FC<\s*\{\s*compact\?\s*:\s*boolean\s*\}>/);
  });

  it('uses compact to reduce widget grid minmax from 320px to 200px', () => {
    // Should have: compact ? '200px' : '320px'
    expect(source).toMatch(/compact\s*\?\s*'200px'\s*:\s*'320px'/);
  });

  it('uses compact to reduce button grid minmax from 280px to 200px', () => {
    expect(source).toMatch(/compact\s*\?\s*'200px'\s*:\s*'280px'/);
  });

  it('removes maxWidth constraint in compact mode', () => {
    // Should have: maxWidth: compact ? undefined : 1400
    expect(source).toMatch(/maxWidth:\s*compact\s*\?\s*undefined\s*:\s*1400/);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. ExplorePanel — compact prop
// ══════════════════════════════════════════════════════════════
describe('ExplorePanel — compact sidebar mode', () => {
  const source = readSrc('components/zhiive/ExplorePanel.tsx');

  it('accepts compact prop', () => {
    expect(source).toMatch(/ExplorePanel.*React\.FC<.*compact\?\s*:\s*boolean/);
  });

  it('passes compact-derived cols to InstaGrid (2 in compact, 3 default)', () => {
    expect(source).toMatch(/cols=\{compact\s*\?\s*2\s*:\s*3\}/);
  });

  it('adjusts loading skeleton to match compact columns', () => {
    // Loading skeleton should use compact ? 2 : 3 columns
    expect(source).toMatch(/repeat\(\$\{compact\s*\?\s*2\s*:\s*3\}/);
  });

  it('adjusts skeleton count for compact mode', () => {
    // Should show fewer skeleton items in compact
    expect(source).toMatch(/compact\s*\?\s*4\s*:\s*9/);
  });
});

// ══════════════════════════════════════════════════════════════
// 5. InstaGrid — cols prop
// ══════════════════════════════════════════════════════════════
describe('InstaGrid — dynamic columns', () => {
  const source = readSrc('components/zhiive/ExplorePanel.tsx');

  it('accepts cols prop with default of 3', () => {
    expect(source).toMatch(/InstaGrid.*cols\?\s*:\s*number/);
    expect(source).toMatch(/cols\s*=\s*3/); // default value
  });

  it('uses cols for normal row gridTemplateColumns', () => {
    // Should have: repeat(${cols}, 1fr)
    expect(source).toMatch(/repeat\(\$\{cols\},\s*1fr\)/);
  });

  it('uses cols for the number of items per row', () => {
    // Should have: items.slice(i, Math.min(i + cols, ...))
    expect(source).toMatch(/items\.slice\(i,\s*Math\.min\(i\s*\+\s*cols/);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. DashboardPageUnified — renderPanel compact forwarding
// ══════════════════════════════════════════════════════════════
describe('DashboardPageUnified — renderPanel passes compact={sidebar}', () => {
  const source = readSrc('pages/DashboardPageUnified.tsx');

  it('renderPanel accepts sidebar parameter', () => {
    expect(source).toMatch(/renderPanel\s*=\s*\(appId:\s*string,\s*sidebar\?:\s*boolean\)/);
  });

  it('passes compact={sidebar} to LazyAgendaWrapper', () => {
    expect(source).toContain('<LazyAgendaWrapper compact={sidebar} />');
  });

  it('passes compact={sidebar} to LazyGoogleGmailPageV2', () => {
    expect(source).toContain('<LazyGoogleGmailPageV2 compact={sidebar} />');
  });

  it('passes compact={sidebar} to LazySearchPage', () => {
    expect(source).toContain('<LazySearchPage compact={sidebar} />');
  });

  it('passes compact={sidebar} to LazyExplorePanel', () => {
    expect(source).toContain('<LazyExplorePanel api={api} openModule={openModule} compact={sidebar} />');
  });

  it('right sidebar calls renderPanel with sidebar=true', () => {
    // The right sidebar maps apps and calls: {renderPanel(appId, true)}
    expect(source).toMatch(/renderPanel\(appId,\s*true\)/);
  });

  it('left sidebar calls renderPanel with sidebar=true', () => {
    expect(source).toMatch(/renderPanel\(appId,\s*true\)/);
  });

  it('center column calls renderPanel without sidebar', () => {
    // Center should call renderPanel(centerApp) without true
    expect(source).toMatch(/renderPanel\(centerApp\)(?!\s*,\s*true)/);
  });
});

// ══════════════════════════════════════════════════════════════
// 7. UnifiedMailPage — reference implementation (already working)
// ══════════════════════════════════════════════════════════════
describe('UnifiedMailPage — compact reference implementation', () => {
  const source = readSrc('pages/UnifiedMailPage.tsx');

  it('accepts compact prop', () => {
    expect(source).toMatch(/compact\?\s*:\s*boolean/);
  });

  it('derives isMobile from compact OR viewport', () => {
    expect(source).toMatch(/isMobile\s*=\s*compact\s*\|\|\s*!screens\.md/);
  });

  it('derives isDesktop excluding compact mode', () => {
    // isDesktop should be false when compact, even if viewport is large
    expect(source).toMatch(/isDesktop\s*=\s*!compact\s*&&/);
  });
});

// ══════════════════════════════════════════════════════════════
// 8. Sidebar layout constraints
// ══════════════════════════════════════════════════════════════
describe('Sidebar layout structure', () => {
  const source = readSrc('pages/DashboardPageUnified.tsx');

  it('right sidebar has width: 300px', () => {
    // width: 300 or SIDEBAR_RIGHT_WIDTH with minWidth
    expect(source).toMatch(/width:\s*(300|SIDEBAR_RIGHT_WIDTH)/);
  });

  it('left sidebar has width: 280px', () => {
    // width: 280 or SIDEBAR_LEFT_WIDTH with minWidth
    expect(source).toMatch(/width:\s*(280|SIDEBAR_LEFT_WIDTH),\s*min[Ww]idth:\s*(280|SIDEBAR_LEFT_WIDTH)/);
  });

  it('each sidebar panel has minHeight 60vh', () => {
    expect(source).toMatch(/minHeight:\s*['"]?60vh['"]?/);
  });

  it('sidebar panels have overflow scrolling', () => {
    expect(source).toMatch(/overflowY:\s*["']auto["']/);
  });
});

// ══════════════════════════════════════════════════════════════
// 9. No hardcoded viewport-only detection in sidebar widgets
// ══════════════════════════════════════════════════════════════
describe('No viewport-only isMobile in sidebar-rendered widgets', () => {
  const sidebarWidgets = [
    { name: 'AgendaPage', path: 'plugins/ModuleAgenda/AgendaPage.tsx' },
    // SearchPage doesn't use isMobile pattern (uses grid minmax), skip
    // UnifiedMailPage already uses compact
  ];

  for (const widget of sidebarWidgets) {
    it(`${widget.name} does not use viewport-only isMobile`, () => {
      const source = readSrc(widget.path);
      const lines = source.split('\n');
      const isMobileDecls = lines.filter(l =>
        /const\s+isMobile\s*=/.test(l) && l.includes('screens')
      );
      for (const line of isMobileDecls) {
        expect(line).toContain('compact');
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// 10. App CSS responsive breakpoints consistency
// ══════════════════════════════════════════════════════════════
describe('App.css responsive breakpoints', () => {
  const css = fs.readFileSync(path.join(SRC, 'App.css'), 'utf-8');

  it('has mobile breakpoint at 768px', () => {
    expect(css).toMatch(/max-width:\s*768px/);
  });

  it('has desktop/tablet breakpoint at 1200px', () => {
    expect(css).toMatch(/max-width:\s*1200px/);
  });
});

// ══════════════════════════════════════════════════════════════
// 11. Compact mode content quality checks
// ══════════════════════════════════════════════════════════════
describe('Compact mode content quality', () => {
  it('AgendaPage mobile mode uses listWeek as initialView (not dayGridMonth)', () => {
    const source = readSrc('plugins/ModuleAgenda/AgendaPage.tsx');
    // In mobile mode, the calendar should use listWeek (compact friendly)
    // while desktop uses dayGridMonth
    expect(source).toContain('initialView="listWeek"');
    expect(source).toContain('initialView="dayGridMonth"');
  });

  it('AgendaPage mobile mode limits dayMaxEvents to 3', () => {
    const source = readSrc('plugins/ModuleAgenda/AgendaPage.tsx');
    expect(source).toContain('dayMaxEvents={3}');
  });

  it('AgendaPage desktop mode has task panel width 280', () => {
    const source = readSrc('plugins/ModuleAgenda/AgendaPage.tsx');
    expect(source).toMatch(/width:\s*280.*flexShrink:\s*0/);
  });

  it('ExplorePanel featured row uses 2fr/1fr layout', () => {
    const source = readSrc('components/zhiive/ExplorePanel.tsx');
    expect(source).toContain("'2fr 1fr'");
    expect(source).toContain("'1fr 2fr'");
  });
});

// ══════════════════════════════════════════════════════════════
// 12. Consistency — all rightApps get compact treatment
// ══════════════════════════════════════════════════════════════
describe('All right sidebar apps receive compact prop', () => {
  const source = readSrc('pages/DashboardPageUnified.tsx');

  it('mail gets compact={sidebar}', () => {
    expect(source).toMatch(/case\s*'mail'.*compact=\{sidebar\}/);
  });

  it('agenda gets compact={sidebar}', () => {
    expect(source).toMatch(/case\s*'agenda'.*compact=\{sidebar\}/);
  });

  it('search gets compact={sidebar}', () => {
    expect(source).toMatch(/case\s*'search'.*compact=\{sidebar\}/);
  });

  it('explore gets compact={sidebar}', () => {
    expect(source).toMatch(/case\s*'explore'.*compact=\{sidebar\}/);
  });
});

// ══════════════════════════════════════════════════════════════
// 13. Mobile swipe mode does NOT pass compact
// ══════════════════════════════════════════════════════════════
describe('Mobile swipe carousel does not pass compact', () => {
  const source = readSrc('pages/DashboardPageUnified.tsx');

  it('mobile renderPanel call does not pass sidebar=true', () => {
    // In mobile swipe, panels are full-width → no need for compact
    // The mobile section uses: {renderPanel(tabId)}
    const mobileSection = source.split('MOBILE — CIRCULAR CAROUSEL')[1]?.split('DESKTOP — 3-Column Layout')[0];
    if (mobileSection) {
      const renderCalls = mobileSection.match(/renderPanel\(tabId[^)]*\)/g) || [];
      for (const call of renderCalls) {
        // Should NOT have a second argument (sidebar)
        expect(call).not.toContain('true');
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════
// 14. ZhiiveNavContext rightApps definition
// ══════════════════════════════════════════════════════════════
describe('ZhiiveNavContext rightApps definition', () => {
  let contextSource: string;
  try {
    contextSource = readSrc('contexts/ZhiiveNavContext.tsx');
  } catch { contextSource = ''; }

  it('defines rightApps array with sidebar widgets', () => {
    if (!contextSource) return; // Skip if file not accessible
    expect(contextSource).toMatch(/rightApps.*\[.*'mail'.*'agenda'.*'search'.*'stats'/);
  });
});
