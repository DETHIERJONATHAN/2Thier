// ═══════════════════════════════════════════════════════════════
// PWA Badge Manager
// Gère le compteur affiché sur l'icône PWA de l'écran d'accueil
// Combine notifications non lues + messages non lus
// ═══════════════════════════════════════════════════════════════

let notificationCount = 0;
let messageCount = 0;

function updateBadge() {
  const total = notificationCount + messageCount;
  if ('setAppBadge' in navigator) {
    if (total > 0) {
      (navigator as any).setAppBadge(total).catch(() => {});
    } else {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }
}

/** Appelé par NotificationsBell quand le nombre de notifications non lues change */
export function setNotificationBadgeCount(count: number) {
  notificationCount = count;
  updateBadge();
}

/** Appelé par MessengerChat quand le nombre de messages non lus change */
export function setMessageBadgeCount(count: number) {
  messageCount = count;
  updateBadge();
}
