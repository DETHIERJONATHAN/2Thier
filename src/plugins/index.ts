// Chargement dynamique des plugins via Vite (import.meta.glob eager)
const modules = import.meta.glob(['./**/index.ts', './**/index.tsx'], { eager: true }) as Record<string, unknown>;
const plugins = Object.values(modules)
  .map((m) => (m && typeof m === 'object' && 'default' in (m as Record<string, unknown>) ? (m as Record<string, unknown>).default : null))
  .filter(Boolean);

export default plugins;

/**
 * Exemple de plugin (voir /src/plugins/ModuleAgenda/index.ts) :
 * export default {
 *   key: 'agenda',
 *   label: 'Agenda',
 *   icon: 'CalendarIcon',
 *   feature: 'agenda',
 *   page: () => import('./AgendaPage'),
 *   hooks: {},
 * };
 */
