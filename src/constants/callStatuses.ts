/**
 * 📞 Constantes pour les statuts d'appel
 */

export const CALL_STATUSES = {
  MEETING_SCHEDULED: 'meeting_scheduled',
  ANSWERED: 'answered',
  CALLBACK: 'callback',
  REFUSED: 'refused',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy',
  VOICEMAIL: 'voicemail'
} as const;

export const CALL_STATUS_NAMES = {
  [CALL_STATUSES.MEETING_SCHEDULED]: 'RDV fixé',
  [CALL_STATUSES.ANSWERED]: 'Contact établi',
  [CALL_STATUSES.CALLBACK]: 'À rappeler',
  [CALL_STATUSES.REFUSED]: 'Refusé',
  [CALL_STATUSES.NO_ANSWER]: 'Pas de réponse',
  [CALL_STATUSES.BUSY]: 'Occupé',
  [CALL_STATUSES.VOICEMAIL]: 'Messagerie'
} as const;

export const CALL_STATUS_COLORS = {
  [CALL_STATUSES.MEETING_SCHEDULED]: '#52c41a', // Vert
  [CALL_STATUSES.ANSWERED]: '#1890ff', // Bleu
  [CALL_STATUSES.CALLBACK]: '#faad14', // Orange
  [CALL_STATUSES.REFUSED]: '#ff4d4f', // Rouge
  [CALL_STATUSES.NO_ANSWER]: '#d9d9d9', // Gris
  [CALL_STATUSES.BUSY]: '#ffa39e', // Rose
  [CALL_STATUSES.VOICEMAIL]: '#91d5ff' // Bleu clair
} as const;

export type CallStatusType = (typeof CALL_STATUSES)[keyof typeof CALL_STATUSES];
