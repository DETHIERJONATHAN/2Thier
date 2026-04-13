/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkOnly, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

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

// ═══════════════════════════════════════════════════════════════
// #50 — BACKGROUND SYNC for mutations (POST/PUT/DELETE)
// Queues failed mutation requests and replays them when online
// ═══════════════════════════════════════════════════════════════
const bgSyncPlugin = new BackgroundSyncPlugin('zhiive-mutation-queue', {
  maxRetentionTime: 24 * 60, // Retry for max 24 hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
      } catch (error) {
        // Put the entry back in the queue and re-throw to signal retry
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    // Notify client that sync completed
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({ type: 'BACKGROUND_SYNC_COMPLETE' });
    });
  },
});

// API mutation routes (POST/PUT/PATCH/DELETE) → NetworkOnly with background sync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    // Exclude auth routes (can't replay login/logout)
    !url.pathname.includes('/auth/') &&
    !url.pathname.includes('/push/'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST' // This matches POST, PUT, PATCH, DELETE via the route callback
);

// Also register for other mutation methods
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    !url.pathname.includes('/auth/') &&
    !url.pathname.includes('/push/'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'PUT'
);

// Navigation (HTML pages) → Network First, fallback vers /offline.html
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 })],
  })
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
// OFFLINE FALLBACK — retourner /offline.html si navigation échoue
// ═══════════════════════════════════════════════════════════════
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    const offlineCache = await caches.open('offline-fallback');
    const cached = await offlineCache.match('/offline.html');
    return cached ?? Response.error();
  }
  return Response.error();
});

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

// ─── INSTALL: pré-cacher la page offline ─────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-fallback').then(cache => cache.add('/offline.html'))
  );
});

// ─── DEEP LINK: intercepter les web+zhiive:// links ──────────
// et les share_target GET params
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // share_target: /share-target?url=...&title=...&text=...
  if (url.pathname === '/share-target' && event.request.method === 'GET') {
    const shareUrl = url.searchParams.get('url') ?? '';
    const shareTitle = url.searchParams.get('title') ?? '';
    const shareText = url.searchParams.get('text') ?? '';
    const redirectUrl = `/?shared_url=${encodeURIComponent(shareUrl)}&shared_title=${encodeURIComponent(shareTitle)}&shared_text=${encodeURIComponent(shareText)}`;
    event.respondWith(Response.redirect(redirectUrl, 302));
    return;
  }
  
  // protocole web+zhiive://path → redirected to /path
  if (url.pathname === '/' && url.searchParams.has('proto')) {
    const proto = url.searchParams.get('proto') ?? '';
    try {
      const target = new URL(proto.replace('web+zhiive://', 'https://zhiive.app/'));
      event.respondWith(Response.redirect(target.pathname + target.search, 302));
    } catch {
      // ignore invalid proto
    }
  }
});
