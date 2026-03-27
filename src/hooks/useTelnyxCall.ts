/**
 * useTelnyxCall — Hook React pour les appels téléphoniques via Telnyx WebRTC SDK
 * 
 * Gère le cycle de vie complet : register → call → hangup → unregister
 * Utilise @telnyx/webrtc pour connecter le navigateur au réseau PSTN via Telnyx
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type TelnyxCallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'held' | 'ending' | 'error';

export interface TelnyxEligibility {
  eligible: boolean;
  assignedNumber: string | null;
  canMakeCalls: boolean;
  canSendSms: boolean;
  orgHasTelnyx: boolean;
  sipCredentials: {
    sipUsername: string;
    sipPassword: string;
    sipDomain: string;
  } | null;
}

interface UseTelnyxCallOptions {
  _api?: any;
  eligibility: TelnyxEligibility | null;
  onCallStarted?: (callId: string) => void;
  onCallEnded?: (duration: number) => void;
  onIncomingCall?: (callerNumber: string, callerName: string) => void;
}

interface UseTelnyxCallReturn {
  // State
  callState: TelnyxCallState;
  isRegistered: boolean;
  currentNumber: string | null;
  callDuration: number;
  isMuted: boolean;
  isOnHold: boolean;
  callerInfo: { number: string; name?: string } | null;
  errorMessage: string | null;

  // Actions
  makeCall: (destination: string) => void;
  hangup: () => void;
  answer: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDTMF: (digit: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useTelnyxCall({
  _api,
  eligibility,
  onCallStarted,
  onCallEnded,
  onIncomingCall,
}: UseTelnyxCallOptions): UseTelnyxCallReturn {
  const [callState, setCallState] = useState<TelnyxCallState>('idle');
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentNumber, setCurrentNumber] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ number: string; name?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientRef = useRef<TelnyxRTC | null>(null);
  const currentCallRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartTimeRef = useRef<number>(0);

  // ─── DURATION TIMER ────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    return duration;
  }, []);

  // ─── CLEANUP CALL STATE ────────────────────────────────────
  const resetCallState = useCallback(() => {
    currentCallRef.current = null;
    setCallState('idle');
    setCurrentNumber(null);
    setCallerInfo(null);
    setIsMuted(false);
    setIsOnHold(false);
    setErrorMessage(null);
  }, []);

  // ─── INITIALIZE TELNYX CLIENT ──────────────────────────────
  useEffect(() => {
    if (!eligibility?.eligible || !eligibility.sipCredentials) {
      // Not eligible — don't connect
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
        setIsRegistered(false);
      }
      return;
    }

    const { sipUsername, sipPassword } = eligibility.sipCredentials;

    try {
      const client = new TelnyxRTC({
        login: sipUsername,
        password: sipPassword,
        // Telnyx handles TURN/STUN internally
      });

      // ─── EVENT HANDLERS ──────────────────────────────────
      client.on('telnyx.ready', () => {
        console.log('[TELNYX-RTC] ✅ Registered & ready');
        setIsRegistered(true);
        setErrorMessage(null);
      });

      client.on('telnyx.error', (error: any) => {
        console.error('[TELNYX-RTC] ❌ Error:', error);
        setErrorMessage(error?.message || 'Erreur de connexion Telnyx');
        setIsRegistered(false);
      });

      client.on('telnyx.socket.error', (error: any) => {
        console.error('[TELNYX-RTC] ❌ Socket error:', error);
        setErrorMessage('Connexion WebSocket perdue');
        setIsRegistered(false);
      });

      client.on('telnyx.socket.close', () => {
        console.warn('[TELNYX-RTC] ⚠️ Socket closed');
        setIsRegistered(false);
      });

      client.on('telnyx.notification', (notification: any) => {
        const call = notification.call;
        if (!call) return;

        switch (notification.type) {
          case 'callUpdate': {
            const state = call.state;
            console.log('[TELNYX-RTC] Call state:', state);

            if (state === 'ringing' || state === 'requesting') {
              setCallState('ringing');
            } else if (state === 'active' || state === 'answering') {
              setCallState('active');
              startDurationTimer();
            } else if (state === 'held') {
              setCallState('held');
              setIsOnHold(true);
            } else if (state === 'hangup' || state === 'destroy' || state === 'purge') {
              const duration = stopDurationTimer();
              onCallEnded?.(duration);
              resetCallState();
            }
            break;
          }
          case 'userMediaError': {
            setErrorMessage('Impossible d\'accéder au microphone');
            setCallState('error');
            break;
          }
        }
      });

      // Handle incoming calls
      client.on('telnyx.notification', (notification: any) => {
        if (notification.type === 'callUpdate' && notification.call?.direction === 'inbound') {
          const call = notification.call;
          if (call.state === 'ringing') {
            currentCallRef.current = call;
            const callerNumber = call.options?.remoteCallerNumber || call.options?.callerNumber || 'Inconnu';
            const callerName = call.options?.remoteCallerName || call.options?.callerName;
            setCallerInfo({ number: callerNumber, name: callerName });
            setCallState('ringing');
            setCurrentNumber(callerNumber);
            onIncomingCall?.(callerNumber, callerName || callerNumber);
          }
        }
      });

      client.connect();
      clientRef.current = client;
    } catch (err: any) {
      console.error('[TELNYX-RTC] Failed to init:', err);
      setErrorMessage(err?.message || 'Erreur d\'initialisation Telnyx');
    }

    return () => {
      if (clientRef.current) {
        try { clientRef.current.disconnect(); } catch { /* ignore disconnect errors */ }
        clientRef.current = null;
      }
      setIsRegistered(false);
      stopDurationTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibility?.eligible, eligibility?.sipCredentials?.sipUsername]);

  // ─── MAKE CALL ─────────────────────────────────────────────
  const makeCall = useCallback((destination: string) => {
    if (!clientRef.current || !isRegistered) {
      setErrorMessage('Telnyx non connecté');
      return;
    }
    if (callState !== 'idle') {
      setErrorMessage('Un appel est déjà en cours');
      return;
    }

    try {
      setCallState('connecting');
      setCurrentNumber(destination);
      setCallerInfo({ number: destination });
      setErrorMessage(null);

      const call = clientRef.current.newCall({
        destinationNumber: destination,
        callerNumber: eligibility?.assignedNumber || undefined,
        audio: true,
        video: false,
      });

      currentCallRef.current = call;
      onCallStarted?.(call.id || destination);
    } catch (err: any) {
      console.error('[TELNYX-RTC] Call error:', err);
      setErrorMessage(err?.message || 'Erreur lors de l\'appel');
      setCallState('error');
    }
  }, [isRegistered, callState, eligibility?.assignedNumber, onCallStarted]);

  // ─── ANSWER INCOMING ──────────────────────────────────────
  const answer = useCallback(() => {
    if (!currentCallRef.current) return;
    try {
      currentCallRef.current.answer();
    } catch (err: any) {
      console.error('[TELNYX-RTC] Answer error:', err);
      setErrorMessage(err?.message || 'Erreur en décrochant');
    }
  }, []);

  // ─── HANGUP ────────────────────────────────────────────────
  const hangup = useCallback(() => {
    if (!currentCallRef.current) {
      resetCallState();
      return;
    }
    try {
      setCallState('ending');
      currentCallRef.current.hangup();
    } catch {
      resetCallState();
    }
  }, [resetCallState]);

  // ─── TOGGLE MUTE ──────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!currentCallRef.current) return;
    try {
      if (isMuted) {
        currentCallRef.current.unmuteAudio();
      } else {
        currentCallRef.current.muteAudio();
      }
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('[TELNYX-RTC] Mute error:', err);
    }
  }, [isMuted]);

  // ─── TOGGLE HOLD ──────────────────────────────────────────
  const toggleHold = useCallback(() => {
    if (!currentCallRef.current) return;
    try {
      if (isOnHold) {
        currentCallRef.current.unhold();
      } else {
        currentCallRef.current.hold();
      }
      setIsOnHold(!isOnHold);
    } catch (err) {
      console.error('[TELNYX-RTC] Hold error:', err);
    }
  }, [isOnHold]);

  // ─── SEND DTMF ────────────────────────────────────────────
  const sendDTMF = useCallback((digit: string) => {
    if (!currentCallRef.current) return;
    try {
      currentCallRef.current.dtmf(digit);
    } catch (err) {
      console.error('[TELNYX-RTC] DTMF error:', err);
    }
  }, []);

  return {
    callState,
    isRegistered,
    currentNumber,
    callDuration,
    isMuted,
    isOnHold,
    callerInfo,
    errorMessage,
    makeCall,
    hangup,
    answer,
    toggleMute,
    toggleHold,
    sendDTMF,
  };
}
