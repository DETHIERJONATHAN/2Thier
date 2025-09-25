// src/plugins/ModuleAgenda/index.ts
import AgendaPage from './AgendaPage';

export default {
  key: 'agenda',
  label: 'Agenda',
  icon: '📅',
  feature: 'agenda',
  page: () => import('./AgendaPage'),
  hooks: {},
};

/**
 * Plugin exemple : Module Agenda
 * - Ajoute la feature 'agenda' à l'organisation
 * - Apparaît automatiquement dans la sidebar/routing si la feature est active
 * - Peut exporter des hooks d'extension (voir hooks)
 */
