/**
 * usePushNotifications — Hook global pour l'enregistrement Service Worker + Web Push.
 * 
 * Doit être monté UNE SEULE FOIS dans le layout principal (MainLayoutNew).
 * Gère :
 * - Enregistrement du Service Worker (/sw.js)
 * - Souscription aux push notifications (VAPID)
 * - Envoi de la souscription au backend
 * - Écoute des messages du Service Worker (appels, sons)
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from './useAuthenticatedApi';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (registeredRef.current) return;
    registeredRef.current = true;

    const registerPush = async () => {
      try {
        // 1. Enregistrer le Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] Service Worker enregistré');

        // 2. Récupérer la clé VAPID publique
        const vapidResp = await api.get('/api/push/vapid-key') as any;
        if (!vapidResp?.publicKey) {
          console.warn('[PUSH] Pas de clé VAPID configurée côté serveur');
          return;
        }

        // 3. Vérifier si déjà abonné
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          // Demander la permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('[PUSH] Permission refusée par l\'utilisateur');
            return;
          }

          // S'abonner
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidResp.publicKey),
          });
        }

        // 4. Envoyer la souscription au backend
        const subJSON = subscription.toJSON();
        await api.post('/api/push/subscribe', {
          endpoint: subJSON.endpoint,
          keys: subJSON.keys,
        });
        console.log('[PUSH] ✅ Notifications push activées');
      } catch (err) {
        console.warn('[PUSH] Erreur enregistrement:', err);
      }
    };

    registerPush();
  }, [user, api]);

  // Écouter les messages du Service Worker (sons, actions d'appels)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND' && event.data?.soundType) {
        // Le SW demande de jouer un son — émettre un event custom pour que les composants intéressés le gèrent
        window.dispatchEvent(new CustomEvent('zhiive-play-sound', { detail: { soundType: event.data.soundType } }));
      }
      if (event.data?.type === 'INCOMING_CALL' || event.data?.type === 'INCOMING_TELNYX_CALL') {
        window.dispatchEvent(new CustomEvent('zhiive-incoming-call', { detail: event.data }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, []);
}
