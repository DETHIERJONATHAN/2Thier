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
    silent: false,
    data: {
      url: data.url || '/',
      callId: data.callId || null,
      type: data.type || 'notification',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Zhiive', options).then(() => {
      // Mettre à jour le badge sur l'icône PWA
      if (navigator.setAppBadge) {
        navigator.setAppBadge().catch(() => {});
      }

      // Notify open clients to play a sound (SW cannot use Web Audio API)
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const soundType = (data.type === 'incoming-call' || data.type === 'incoming-telnyx-call')
          ? 'ringtone' : 'messageNotification';
        clients.forEach((client) => {
          client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND', soundType });
        });
      });
    })
  );
});

// ─── CLICK SUR NOTIFICATION (unifié) ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const isTelnyxCall = data.type === 'incoming-telnyx-call';
  const isCall = data.type === 'incoming-call' || isTelnyxCall;

  // ── Action "Rejeter" ──
  if (event.action === 'reject' || event.action === 'decline') {
    event.notification.close();
    if (data.callId) {
      event.waitUntil(
        fetch(`/api/calls/${data.callId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {})
      );
    }
    return;
  }

  // ── Action "Répondre" ou clic simple sur notification ──
  event.notification.close();
  const urlToOpen = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Envoyer un message au client pour gérer l'appel entrant
          if (isCall && data.callId) {
            client.postMessage({
              type: isTelnyxCall ? 'INCOMING_TELNYX_CALL' : 'INCOMING_CALL',
              callId: data.callId,
            });
          }
          return client.focus();
        }
      }
      // Aucune fenêtre ouverte → en ouvrir une
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
