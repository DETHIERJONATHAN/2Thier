// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — 2Thier CRM
// Gère les notifications push même quand le navigateur est fermé
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activé');
  event.waitUntil(self.clients.claim());
});

// ─── PUSH NOTIFICATION ──────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Notification', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/',
      callId: data.callId || null,
      type: data.type || 'notification',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '2Thier CRM', options).then(() => {
      // Mettre à jour le badge sur l'icône PWA
      if (navigator.setAppBadge) {
        navigator.setAppBadge().catch(() => {});
      }
    })
  );
});

// ─── CLICK SUR NOTIFICATION ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Envoyer un message au client pour gérer l'appel
          if (event.notification.data?.callId) {
            client.postMessage({
              type: 'INCOMING_CALL',
              callId: event.notification.data.callId,
            });
          }
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── ACTION SUR NOTIFICATION (Accepter/Refuser) ─────────────
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'reject' && event.notification.data?.callId) {
    // Reject call via API
    event.notification.close();
    event.waitUntil(
      fetch(`/api/calls/${event.notification.data.callId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    );
  }
}, false);
