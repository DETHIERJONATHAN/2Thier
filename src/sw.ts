/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// ═══════════════════════════════════════════════════════════════
// WORKBOX PRECACHING (injected by VitePWA build)
// ═══════════════════════════════════════════════════════════════
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ═══════════════════════════════════════════════════════════════
// RUNTIME CACHING
// ═══════════════════════════════════════════════════════════════

// API routes → ALWAYS network
registerRoute(
  /^.*\/api\/.*/i,
  new NetworkOnly()
);

// Google Fonts → cache first
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// Images → cache first
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// ═══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS (migrated from public/sw.js)
// ═══════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: Record<string, unknown>;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Notification', body: event.data.text() };
  }

  const options: NotificationOptions = {
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

// ─── CLICK SUR NOTIFICATION ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const isTelnyxCall = data.type === 'incoming-telnyx-call';
  const isCall = data.type === 'incoming-call' || isTelnyxCall;

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

  event.notification.close();
  const urlToOpen = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (isCall && data.callId) {
            client.postMessage({
              type: isTelnyxCall ? 'INCOMING_TELNYX_CALL' : 'INCOMING_CALL',
              callId: data.callId,
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── SKIP WAITING ────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
