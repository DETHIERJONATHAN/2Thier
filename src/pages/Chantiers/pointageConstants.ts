/**
 * Constantes partagées pour le système de pointage
 */

/** Statut de pointage — labels, couleurs et emoji */
export const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  ARRIVEE: { label: 'Arrivée', emoji: '🟢', color: '#52c41a' },
  DEPART_PAUSE: { label: 'Départ pause', emoji: '☕', color: '#fa8c16' },
  RETOUR_PAUSE: { label: 'Reprise pause', emoji: '▶️', color: '#13c2c2' },
  DEPART_MIDI: { label: 'Départ midi', emoji: '🍽️', color: '#faad14' },
  RETOUR_MIDI: { label: 'Reprise midi', emoji: '▶️', color: '#a0d911' },
  DEPART_DEPLACEMENT: { label: 'Départ déplacement', emoji: '🚗', color: '#fa8c16' },
  RETOUR_DEPLACEMENT: { label: 'Retour déplacement', emoji: '🔙', color: '#1677ff' },
  FIN: { label: 'Fin de journée', emoji: '🔴', color: '#ff4d4f' },
  // Legacy
  CHANTIER: { label: 'Chantier', emoji: '🔧', color: '#1677ff' },
  DEPLACEMENT: { label: 'Déplacement', emoji: '🚗', color: '#fa8c16' },
  PAUSE: { label: 'Pause', emoji: '☕', color: '#8c8c8c' },
  REGIE: { label: 'Régie', emoji: '⏱️', color: '#722ed1' },
};

/** Options pour le Select de statut de pointage */
export const POINTAGE_STATUS_OPTIONS = [
  { value: 'ARRIVEE', label: '🟢 Arrivée' },
  { value: 'DEPART_PAUSE', label: '☕ Départ pause' },
  { value: 'RETOUR_PAUSE', label: '▶️ Reprise pause' },
  { value: 'DEPART_MIDI', label: '🍽️ Départ midi' },
  { value: 'RETOUR_MIDI', label: '▶️ Reprise midi' },
  { value: 'DEPART_DEPLACEMENT', label: '🚗 Départ déplacement' },
  { value: 'RETOUR_DEPLACEMENT', label: '🔙 Retour déplacement' },
  { value: 'FIN', label: '🔴 Fin de journée' },
];
