/**
 * useNotificationSound — Hook centralisé pour tous les sons de notification
 * 
 * Utilise le Web Audio API pour générer des sons programmatiquement :
 * - ringtone : sonnerie d'appel entrant (boucle)
 * - telnyxRing : sonnerie téléphone PSTN (boucle)
 * - messageNotification : ding court pour nouveau message
 * 
 * Aucun fichier audio requis — tout est généré via oscillateurs.
 */
import { useRef, useCallback } from 'react';
import { logger } from '../lib/logger';

type SoundType = 'ringtone' | 'telnyxRing' | 'messageNotification' | 'wizz';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

/**
 * Generate a classic phone ring pattern (two-tone alternating)
 */
function createRingtone(ctx: AudioContext, destination: AudioNode): { stop: () => void } {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.3;
  gainNode.connect(destination);

  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const oscillators: OscillatorNode[] = [];

  const playRingBurst = () => {
    if (stopped) return;

    // Two-tone ring (440Hz + 480Hz) — classic phone ring
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;

    const burstGain = ctx.createGain();
    burstGain.gain.value = 1;
    burstGain.connect(gainNode);

    osc1.connect(burstGain);
    osc2.connect(burstGain);

    oscillators.push(osc1, osc2);

    osc1.start();
    osc2.start();

    // Ring for 1s, silence for 2s, repeat
    setTimeout(() => {
      burstGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      setTimeout(() => {
        osc1.stop();
        osc2.stop();
      }, 150);
    }, 1000);

    timeoutId = setTimeout(() => playRingBurst(), 3000);
  };

  playRingBurst();

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
      oscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
      gainNode.disconnect();
    },
  };
}

/**
 * Generate a Telnyx-style phone ring (slightly different tone)
 */
function createTelnyxRing(ctx: AudioContext, destination: AudioNode): { stop: () => void } {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.25;
  gainNode.connect(destination);

  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const oscillators: OscillatorNode[] = [];

  const playRingBurst = () => {
    if (stopped) return;

    // European ring tone (425Hz)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 425;

    const burstGain = ctx.createGain();
    burstGain.gain.value = 1;
    burstGain.connect(gainNode);
    osc.connect(burstGain);
    oscillators.push(osc);

    osc.start();

    // Ring 1s, pause 1s, ring 1s, pause 3s
    setTimeout(() => {
      burstGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      setTimeout(() => osc.stop(), 100);
    }, 1000);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 425;
    const burstGain2 = ctx.createGain();
    burstGain2.gain.value = 1;
    burstGain2.connect(gainNode);
    osc2.connect(burstGain2);
    oscillators.push(osc2);

    setTimeout(() => {
      if (stopped) return;
      osc2.start();
      setTimeout(() => {
        burstGain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        setTimeout(() => osc2.stop(), 100);
      }, 1000);
    }, 2000);

    timeoutId = setTimeout(() => playRingBurst(), 5000);
  };

  playRingBurst();

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
      oscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
      gainNode.disconnect();
    },
  };
}

/**
 * Play the real MSN Messenger Wizz sound from the actual MP3 file
 */
function playWizzSound(_ctx: AudioContext, _destination: AudioNode): void {
  const audio = new Audio('/msn-wizz.mp3');
  audio.volume = 0.5;
  audio.play().catch(err => logger.warn('[SOUND] Wizz MP3 playback failed:', err));
}

/**
 * Play a short notification ding (non-looping)
 */
function playMessageDing(ctx: AudioContext, destination: AudioNode): void {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.2;
  gainNode.connect(destination);

  // Two quick notes: E5 (659Hz) then G5 (784Hz)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 659;
  osc1.connect(gainNode);
  osc1.start();

  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  setTimeout(() => {
    osc1.stop();
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 784;

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.2;
    gain2.connect(destination);
    osc2.connect(gain2);
    osc2.start();

    gain2.gain.setValueAtTime(0.2, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    setTimeout(() => osc2.stop(), 250);
  }, 150);
}

/**
 * Hook principal — utiliser dans les composants React
 */
export function useNotificationSound() {
  const activeRingRef = useRef<{ stop: () => void } | null>(null);

  const play = useCallback((type: SoundType) => {
    try {
      const ctx = getAudioContext();
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'messageNotification') {
        playMessageDing(ctx, ctx.destination);
        return;
      }

      if (type === 'wizz') {
        playWizzSound(ctx, ctx.destination);
        return;
      }

      // Stop any existing ring before starting a new one
      if (activeRingRef.current) {
        activeRingRef.current.stop();
        activeRingRef.current = null;
      }

      if (type === 'ringtone') {
        activeRingRef.current = createRingtone(ctx, ctx.destination);
      } else if (type === 'telnyxRing') {
        activeRingRef.current = createTelnyxRing(ctx, ctx.destination);
      }
    } catch (err) {
      logger.warn('[SOUND] Failed to play notification sound:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (activeRingRef.current) {
      activeRingRef.current.stop();
      activeRingRef.current = null;
    }
  }, []);

  return { play, stop };
}

/**
 * Fonction standalone (pour usage hors React, ex: Service Worker message handler)
 */
export function playNotificationSound(type: SoundType): { stop: () => void } {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'messageNotification') {
      playMessageDing(ctx, ctx.destination);
      return { stop: () => {} };
    }

    if (type === 'wizz') {
      playWizzSound(ctx, ctx.destination);
      return { stop: () => {} };
    }

    if (type === 'ringtone') {
      return createRingtone(ctx, ctx.destination);
    }

    if (type === 'telnyxRing') {
      return createTelnyxRing(ctx, ctx.destination);
    }
  } catch (err) {
    logger.warn('[SOUND] Failed to play notification sound:', err);
  }

  return { stop: () => {} };
}
