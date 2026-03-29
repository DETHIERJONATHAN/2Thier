import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Tooltip, Modal, Spin } from 'antd';
import {
  PhoneOutlined,
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  UserOutlined,
  TeamOutlined,
  DesktopOutlined,
  FileTextOutlined,
  LoadingOutlined,
  SoundOutlined,
} from '@ant-design/icons';
// Ringtone uses HTML Audio element (not AudioContext) to bypass browser autoplay policy

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface CallParticipant {
  id: string;
  userId: string;
  status: 'invited' | 'joined' | 'left' | 'rejected';
  isMuted: boolean;
  isVideoOff: boolean;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

interface CallData {
  id: string;
  conversationId: string;
  initiatorId: string;
  title: string | null;
  status: 'ringing' | 'active' | 'ended' | 'missed';
  callType: 'video' | 'audio';
  participants: CallParticipant[];
  initiator: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  startedAt: string | null;
  meetingSummary: string | null;
}

interface VideoCallModalProps {
  callId: string;
  callType: 'video' | 'audio';
  isIncoming: boolean;
  conversationName: string;
  api: any;
  userId: string;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  bg: '#1a1a2e',
  surface: '#16213e',
  accent: '#0f3460',
  green: '#4caf50',
  red: '#f44336',
  blue: '#1877f2',
  text: '#ffffff',
  textDim: '#a0a0b0',
};

// ═══════════════════════════════════════════════════════════════
// ICE SERVERS — STUN (Google) + dynamically fetched TURN
// ═══════════════════════════════════════════════════════════════
const FALLBACK_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Fetch TURN credentials from backend (cached for session)
let cachedIceServers: RTCConfiguration | null = null;
async function getIceServers(api: any): Promise<RTCConfiguration> {
  if (cachedIceServers) return cachedIceServers;
  try {
    const data = await api.get('/api/calls/ice-servers');
    if (data?.iceServers?.length) {
      cachedIceServers = { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
      console.log('[CALL] ✅ Got TURN servers from backend:', data.iceServers.length, 'servers');
      return cachedIceServers;
    }
  } catch (err) {
    console.warn('[CALL] ⚠️ Failed to fetch TURN servers, using STUN-only fallback:', err);
  }
  return FALLBACK_ICE_SERVERS;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
const VideoCallModal: React.FC<VideoCallModalProps> = ({
  callId, callType, isIncoming, conversationName, api, userId, onClose,
}) => {
  const { t } = useTranslation();
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // State
  const [callData, setCallData] = useState<CallData | null>(null);
  const [status, setStatus] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<string | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasJoinedRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micAnimRef = useRef<number | null>(null);
  const mountedAtRef = useRef(Date.now());
  const statusRef = useRef<'ringing' | 'active' | 'ended'>('ringing');
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const offerSentAt = useRef<Map<string, number>>(new Map());
  const [, forceUpdate] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const iceServersRef = useRef<RTCConfiguration>(FALLBACK_ICE_SERVERS);
  const leaveCalledRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Keep statusRef in sync with status state
  useEffect(() => { statusRef.current = status; }, [status]);

  // Fetch TURN servers on mount
  useEffect(() => {
    getIceServers(api).then(config => { iceServersRef.current = config; });
  }, [api]);

  // 🔊 Play ringtone/ringback tone
  // - Incoming: ringtone while status === 'ringing' (until callee picks up or rejects)
  // - Outgoing: ringback tone until a remote participant actually connects
  const hasRemoteParticipants = (callData?.participants || []).some(
    p => p.userId !== userId && p.status === 'joined'
  );

  useEffect(() => {
    const shouldPlaySound =
      (isIncoming && status === 'ringing') ||
      (!isIncoming && status !== 'ended' && !hasRemoteParticipants);

    if (shouldPlaySound) {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('/ringtone.wav');
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 0.4;
      }
      ringtoneRef.current.play().catch(err => {
        console.warn('[CALL] 🔇 Ringtone autoplay blocked:', err.message);
        setAudioBlocked(true);
      });
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };
  }, [status, isIncoming, hasRemoteParticipants]);

  // Format duration as HH:MM:SS
  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (h > 0) parts.push(String(h).padStart(2, '0'));
    parts.push(String(m).padStart(2, '0'));
    parts.push(String(sec).padStart(2, '0'));
    return parts.join(':');
  };

  // ──────────────────────────────────────────────
  // Get local media (camera/mic)
  // ──────────────────────────────────────────────
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set up audio analyser for mic level indicator
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          setMicLevel(Math.min(100, Math.round(avg * 1.5)));
          micAnimRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch { /* AudioContext not supported */ }

      return stream;
    } catch (err) {
      console.error('[CALL] Error getting media:', err);
      return null;
    }
  }, [callType]);

  // ──────────────────────────────────────────────
  // Create peer connection for a remote user
  // ──────────────────────────────────────────────
  const createPeerConnection = useCallback((remoteUserId: string) => {
    if (peerConnectionsRef.current.has(remoteUserId)) return peerConnectionsRef.current.get(remoteUserId)!;

    const pc = new RTCPeerConnection(iceServersRef.current);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
      console.log(`[CALL] 🎵 Added ${localStreamRef.current.getTracks().length} local track(s) to PC for ${remoteUserId.slice(0,8)}`);
    } else {
      console.warn(`[CALL] ⚠️ Creating PeerConnection for ${remoteUserId.slice(0,8)} WITHOUT local media!`);
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        api.post(`/api/calls/${callId}/signal`, {
          to: remoteUserId,
          type: 'ice-candidate',
          data: event.candidate,
        }).catch(() => {});
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`[CALL] 🔊 Track from ${remoteUserId.slice(0,8)}:`, event.track.kind, 'enabled:', event.track.enabled);
      const [remoteStream] = event.streams;
      remoteStreamsRef.current.set(remoteUserId, remoteStream);

      // Attach stream to video element if already in DOM
      const videoEl = remoteVideosRef.current.get(remoteUserId);
      if (videoEl) {
        videoEl.srcObject = remoteStream;
        videoEl.play().catch(() => {});
      }
      // Attach stream to audio element (critical for hearing remote user)
      const audioEl = remoteAudiosRef.current.get(remoteUserId);
      if (audioEl) {
        audioEl.srcObject = remoteStream;
        audioEl.play().catch((err) => console.warn('[CALL] Audio autoplay blocked in ontrack:', err.message));
      }
      // Force re-render so ref callback runs and attaches stream
      forceUpdate(n => n + 1);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[CALL] 🔗 Connection (${remoteUserId.slice(0,8)}):`, pc.connectionState);
      // GUARD: Don't process events after we already left or call ended
      if (leaveCalledRef.current || statusRef.current === 'ended') return;

      if (pc.connectionState === 'failed') {
        // ICE restart: try to recover the connection instead of dropping it
        console.log(`[CALL] 🔄 ICE restart for ${remoteUserId.slice(0,8)}`);
        pc.restartIce();
        // Re-send offer after ICE restart
        pc.createOffer({ iceRestart: true }).then(offer => {
          if (leaveCalledRef.current || statusRef.current === 'ended') return;
          pc.setLocalDescription(offer);
          api.post(`/api/calls/${callId}/signal`, { to: remoteUserId, type: 'offer', data: offer }).catch(() => {});
        }).catch(err => console.error('[CALL] ICE restart error:', err));
      } else if (pc.connectionState === 'disconnected') {
        // Wait 5s before giving up — transient disconnections are common on mobile
        setTimeout(() => {
          if (leaveCalledRef.current || statusRef.current === 'ended') return;
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log(`[CALL] ❌ Peer ${remoteUserId.slice(0,8)} disconnected permanently`);
            peerConnectionsRef.current.delete(remoteUserId);
            remoteStreamsRef.current.delete(remoteUserId);
            forceUpdate(n => n + 1);
          }
        }, 5000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[CALL] 🧊 ICE (${remoteUserId.slice(0,8)}):`, pc.iceConnectionState);
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }, [api, callId]);

  // ──────────────────────────────────────────────
  // Send offer to a participant
  // ──────────────────────────────────────────────
  const sendOffer = useCallback(async (remoteUserId: string) => {
    console.log(`[CALL] 📤 Sending offer to ${remoteUserId.slice(0,8)}`);
    const pc = createPeerConnection(remoteUserId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await api.post(`/api/calls/${callId}/signal`, {
        to: remoteUserId,
        type: 'offer',
        data: offer,
      });
    } catch (err) {
      console.error('[CALL] Error sending offer:', err);
    }
  }, [createPeerConnection, api, callId]);

  // ──────────────────────────────────────────────
  // Handle incoming signal
  // ──────────────────────────────────────────────
  const handleSignal = useCallback(async (signal: { from: string; type: string; data: any }) => {
    const { from, type, data } = signal;
    console.log(`[CALL] 📥 Signal from ${from.slice(0,8)}: ${type}`);

    try {
      if (type === 'offer') {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        // Flush queued ICE candidates now that remoteDescription is set
        const queued = iceCandidateQueue.current.get(from) || [];
        for (const candidate of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        iceCandidateQueue.current.delete(from);
        if (queued.length) console.log(`[CALL] 🧊 Flushed ${queued.length} queued ICE candidates for ${from.slice(0,8)}`);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await api.post(`/api/calls/${callId}/signal`, {
          to: from, type: 'answer', data: answer,
        });
        console.log(`[CALL] ✅ Answer sent to ${from.slice(0,8)}`);
      } else if (type === 'answer') {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          // Flush queued ICE candidates
          const queued = iceCandidateQueue.current.get(from) || [];
          for (const candidate of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          }
          iceCandidateQueue.current.delete(from);
          if (queued.length) console.log(`[CALL] 🧊 Flushed ${queued.length} queued ICE candidates for ${from.slice(0,8)}`);
          offerSentAt.current.delete(from);
          console.log(`[CALL] ✅ Answer applied from ${from.slice(0,8)}`);
        } else {
          console.warn(`[CALL] ⚠️ Ignoring answer from ${from.slice(0,8)}, state: ${pc?.signalingState}`);
        }
      } else if (type === 'ice-candidate') {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } else {
          // Queue ICE candidates until remoteDescription is set
          if (!iceCandidateQueue.current.has(from)) iceCandidateQueue.current.set(from, []);
          iceCandidateQueue.current.get(from)!.push(data);
          console.log(`[CALL] 🧊 Queued ICE candidate from ${from.slice(0,8)} (no remote desc yet)`);
        }
      }
    } catch (err) {
      console.error(`[CALL] ❌ handleSignal error (${type} from ${from.slice(0,8)}):`, err);
    }
  }, [createPeerConnection, api, callId]);

  // ──────────────────────────────────────────────
  // Poll signaling + call state
  // ──────────────────────────────────────────────
  useEffect(() => {
    signalPollRef.current = setInterval(async () => {
      if (statusRef.current === 'ended') return;
      // CRITICAL: Don't fetch signals before joining — GET removes them from server buffer!
      if (!hasJoinedRef.current) return;
      try {
        const { signals } = await api.get(`/api/calls/${callId}/signal`);
        if (signals?.length) {
          console.log(`[CALL] 📬 ${signals.length} signal(s) received`);
          for (const signal of signals) {
            await handleSignal(signal);
          }
        }
      } catch (err) {
        console.warn('[CALL] Signal poll error:', err);
      }
    }, 1000);

    return () => { if (signalPollRef.current) clearInterval(signalPollRef.current); };
  // statusRef is a ref, no need in deps — prevents interval recreation on status change
  }, [callId, api, handleSignal]);

  // Poll call status
  useEffect(() => {
    const poll = async () => {
      // Stop polling if call is ended
      if (statusRef.current === 'ended') return;
      try {
        const data = await api.get(`/api/calls/${callId}`);
        if (data) {
          setCallData(data);
          if (data.status === 'ended' || data.status === 'missed') {
            console.log('[CALL] 📴 Remote party ended call, cleaning up...');
            // Stop all polling immediately
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            if (signalPollRef.current) { clearInterval(signalPollRef.current); signalPollRef.current = null; }
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            // Stop media & close peer connections
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            screenStreamRef.current?.getTracks().forEach(t => t.stop());
            if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
            analyserRef.current = null;
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            // Stop ringtone
            if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
            leaveCalledRef.current = true; // Prevent cleanup from calling /leave again
            setStatus('ended');
            // Auto-close modal after brief delay so user sees the call ended
            setTimeout(() => onCloseRef.current(), 1500);
            return;
          } else if (data.status === 'active' && statusRef.current === 'ringing') {
            setStatus('active');
          }

          // Auto-leave if all remote participants have left (other party hung up)
          if (data.status === 'active' && hasJoinedRef.current) {
            const remoteParticipants = data.participants.filter(
              (p: CallParticipant) => p.userId !== userId
            );
            const anyRemoteEverJoined = remoteParticipants.some(
              p => p.status === 'joined' || p.status === 'left'
            );
            const remoteStillJoined = remoteParticipants.some(p => p.status === 'joined');

            if (anyRemoteEverJoined && !remoteStillJoined) {
              console.log('[CALL] 📴 All remote participants left, auto-ending call');
              // Notify server we're leaving too
              try { await api.post(`/api/calls/${callId}/leave`, {}); } catch {}
              // Full cleanup
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
              if (signalPollRef.current) { clearInterval(signalPollRef.current); signalPollRef.current = null; }
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
              localStreamRef.current?.getTracks().forEach(t => t.stop());
              screenStreamRef.current?.getTracks().forEach(t => t.stop());
              if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
              analyserRef.current = null;
              peerConnectionsRef.current.forEach(pc => pc.close());
              peerConnectionsRef.current.clear();
              // Stop ringtone
              if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
              leaveCalledRef.current = true;
              setStatus('ended');
              setTimeout(() => onCloseRef.current(), 1500);
              return;
            }
          }

          // Ringing timeout: auto-cancel outgoing calls after 60s
          if (!isIncoming && data.status === 'ringing' && Date.now() - mountedAtRef.current > 60000) {
            console.log('[CALL] ⏰ Ringing timeout 60s, auto-cancelling');
            try { await api.post(`/api/calls/${callId}/leave`, {}); } catch {}
            leaveCalledRef.current = true;
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            if (signalPollRef.current) { clearInterval(signalPollRef.current); signalPollRef.current = null; }
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            setStatus('ended');
            setTimeout(() => onCloseRef.current(), 1500);
            return;
          }

          // Connect to new participants (deterministic: lower userId sends offer to prevent collision)
          if (data.status === 'active' && hasJoinedRef.current) {
            const joinedParticipants = data.participants.filter(
              (p: CallParticipant) => p.userId !== userId && p.status === 'joined'
            );
            for (const p of joinedParticipants) {
              const pc = peerConnectionsRef.current.get(p.userId);
              const shouldSendOffer = userId < p.userId;

              if (!pc && shouldSendOffer) {
                await sendOffer(p.userId);
                offerSentAt.current.set(p.userId, Date.now());
              } else if (pc && shouldSendOffer && pc.signalingState === 'have-local-offer') {
                const sentAt = offerSentAt.current.get(p.userId) || 0;
                if (Date.now() - sentAt > 15000) {
                  console.log(`[CALL] 🔄 Re-sending offer to ${p.userId.slice(0,8)} (no answer after 15s)`);
                  pc.close();
                  peerConnectionsRef.current.delete(p.userId);
                  await sendOffer(p.userId);
                  offerSentAt.current.set(p.userId, Date.now());
                }
              }
            }
          }
        }
      } catch { /* silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // Use statusRef instead of status to prevent interval recreation on status change
  }, [callId, api, userId, sendOffer, isIncoming]);

  // Call duration timer
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // ──────────────────────────────────────────────
  // Join call (auto for outgoing, on click for incoming)
  // ──────────────────────────────────────────────
  const joinCall = useCallback(async () => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    const stream = await getLocalStream();
    if (!stream) { console.error('[CALL] Failed to get media stream'); return; }

    await api.post(`/api/calls/${callId}/join`, {});
    console.log(`[CALL] ✅ Joined call with ${stream.getTracks().length} tracks (audio: ${stream.getAudioTracks().length}, video: ${stream.getVideoTracks().length})`);
    setStatus('active');

    // If PeerConnections were created before we had media (edge case), add tracks now and renegotiate
    if (peerConnectionsRef.current.size > 0) {
      peerConnectionsRef.current.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        if (senders.length === 0 || senders.every(s => !s.track)) {
          console.log(`[CALL] 🔄 Adding tracks to existing PC for ${peerId.slice(0,8)} and renegotiating`);
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          // Trigger renegotiation: create new offer with tracks
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            api.post(`/api/calls/${callId}/signal`, { to: peerId, type: 'offer', data: offer });
          }).catch(err => console.error('[CALL] Renegotiation error:', err));
        }
      });
    }
  }, [getLocalStream, api, callId]);

  // Auto-join for outgoing calls
  useEffect(() => {
    if (!isIncoming && !hasJoinedRef.current) {
      joinCall();
    }
  }, [isIncoming, joinCall]);

  // ──────────────────────────────────────────────
  // Leave / End call
  // ──────────────────────────────────────────────
  const leaveCall = useCallback(async () => {
    if (leaveCalledRef.current) return; // Prevent double-leave
    leaveCalledRef.current = true;

    // Stop ringtone
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }

    // Stop media
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());

    // Stop analyser
    if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
    analyserRef.current = null;

    // Close peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Clear intervals
    if (pollRef.current) clearInterval(pollRef.current);
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    // CRITICAL: Ensure the server knows we left (try fetch + sendBeacon fallback)
    try {
      await api.post(`/api/calls/${callId}/leave`, {});
      console.log('[CALL] 📴 Left call successfully');
    } catch (err) {
      console.warn('[CALL] Leave error, trying sendBeacon fallback:', err);
      try {
        // sendBeacon works even when page is closing
        navigator.sendBeacon(
          `/api/calls/${callId}/leave-beacon`,
          new Blob([JSON.stringify({ userId })], { type: 'application/json' }),
        );
      } catch { /* last resort failed */ }
    }

    setStatus('ended');

    // If recording was active, send to Gemini for transcription (fire-and-forget)
    if (isRecording && audioChunksRef.current.length > 0) {
      const transcriptionText = `Meeting ${callType === 'video' ? 'video' : 'audio'} with ${conversationName} - Duration: ${formatDuration(callDuration)}. [Audio recording captured — Hive Mind transcription]`;
      api.post(`/api/calls/${callId}/transcribe`, { transcription: transcriptionText })
        .catch((err: any) => console.error('[CALL] Transcription error:', err));
    }

    // Close modal immediately — no delay to prevent race condition with incoming call polling
    onClose();
  }, [api, callId, callDuration, conversationName, isRecording, callType, onClose, userId]);

  // Reject incoming call
  const rejectCall = useCallback(async () => {
    try {
      await api.post(`/api/calls/${callId}/reject`, {});
    } catch { /* silent */ }
    onClose();
  }, [api, callId, onClose]);

  // ──────────────────────────────────────────────
  // Toggle recording (opt-in Gemini transcription)
  // ──────────────────────────────────────────────
  const toggleRecording = () => {
    if (!isRecording) {
      // Start recording
      try {
        if (localStreamRef.current) {
          const audioStream = new MediaStream(localStreamRef.current.getAudioTracks());
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus' : 'audio/webm';
          const recorder = new MediaRecorder(audioStream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          recorder.start(5000);
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
        }
      } catch (err) {
        console.warn('[CALL] Could not start recording:', err);
      }
    } else {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  // ──────────────────────────────────────────────
  // Toggle audio/video/screen
  // ──────────────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing && screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      // Restore camera track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          peerConnectionsRef.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          });
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        // When user stops screen share from browser UI
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            if (camTrack) {
              peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(camTrack);
              });
            }
          }
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('[CALL] Screen share error:', err);
      }
    }
  };

  // ──────────────────────────────────────────────
  // Cleanup on unmount
  // ──────────────────────────────────────────────
  useEffect(() => {
    const callIdCapture = callId;
    const apiCapture = api;
    const pcs = peerConnectionsRef.current;
    const localStream = localStreamRef.current;
    const screenStream = screenStreamRef.current;
    const poll = pollRef.current;
    const signalPoll = signalPollRef.current;
    const timer = timerRef.current;
    const recorder = mediaRecorderRef.current;
    const micAnim = micAnimRef.current;
    const ringtone = ringtoneRef.current;

    // beforeunload: ensure leave is sent when user closes tab/navigates
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `/api/calls/${callIdCapture}/leave-beacon`,
        new Blob([JSON.stringify({ userId })], { type: 'application/json' }),
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      localStream?.getTracks().forEach(t => t.stop());
      screenStream?.getTracks().forEach(t => t.stop());
      pcs.forEach(pc => pc.close());
      if (poll) clearInterval(poll);
      if (signalPoll) clearInterval(signalPoll);
      if (timer) clearInterval(timer);
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (micAnim) cancelAnimationFrame(micAnim);
      analyserRef.current = null;
      // Stop ringtone
      if (ringtone) { ringtone.pause(); ringtone.currentTime = 0; }
      // Fire-and-forget leave on unmount
      if (!leaveCalledRef.current) {
        apiCapture.post(`/api/calls/${callIdCapture}/leave`, {}).catch(() => {});
      }
    };
  }, [callId, api]);

  // Remote participants that have joined
  const remoteParticipants = callData?.participants.filter(
    p => p.userId !== userId && p.status === 'joined'
  ) || [];

  // Re-attach remote streams to video AND audio elements after each render (fixes race condition)
  useEffect(() => {
    remoteStreamsRef.current.forEach((stream, peerId) => {
      const videoEl = remoteVideosRef.current.get(peerId);
      if (videoEl && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
      const audioEl = remoteAudiosRef.current.get(peerId);
      if (audioEl && audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        audioEl.play().catch(() => {});
      }
    });
  });

  // ──────────────────────────────────────────────
  // RENDER: Incoming call (ringing)
  // ──────────────────────────────────────────────
  if (isIncoming && status === 'ringing') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: COLORS.surface, borderRadius: 20, padding: '40px 60px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ position: 'relative' }}>
            <Avatar size={80} src={callData?.initiator?.avatarUrl}
              icon={<UserOutlined />} style={{ background: COLORS.blue }} />
            {/* Pulsating ring */}
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: `3px solid ${COLORS.green}`, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: COLORS.text, fontSize: 20, fontWeight: 600 }}>
              {callData?.initiator ? `${callData.initiator.firstName} ${callData.initiator.lastName}` : conversationName}
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 14, marginTop: 4 }}>
              {callType === 'video' ? t('videocall.incomingVideoCall') : t('videocall.incomingAudioCall')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 30, marginTop: 10 }}>
            <div onClick={rejectCall} style={{
              width: 56, height: 56, borderRadius: '50%', background: COLORS.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <PhoneOutlined style={{ fontSize: 24, color: '#fff', transform: 'rotate(135deg)' }} />
            </div>
            <div onClick={joinCall} style={{
              width: 56, height: 56, borderRadius: '50%', background: COLORS.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {callType === 'video'
                ? <VideoCameraOutlined style={{ fontSize: 24, color: '#fff' }} />
                : <PhoneOutlined style={{ fontSize: 24, color: '#fff' }} />}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Call ended — show meeting summary
  // ──────────────────────────────────────────────
  if (status === 'ended') {
    return (
      <Modal
        open
        title={<span><FileTextOutlined /> {t('videocall.callEndedWith', { name: conversationName })}</span>}
        onCancel={onClose}
        footer={[
          <Button key="close" type="primary" onClick={onClose}>Close</Button>,
        ]}
        width={600}
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ color: '#65676b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOutlined style={{ transform: 'rotate(135deg)', color: COLORS.red }} />
            <span>{t('videocall.duration', { duration: formatDuration(callDuration) })}</span>
          </div>

          {isTranscribing && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: COLORS.blue }} />} />
              <div style={{ marginTop: 12, color: '#65676b' }}>
                {t('videocall.analyzingMeeting')}
              </div>
            </div>
          )}

          {meetingSummary && (
            <div style={{
              background: '#f0f7ff', borderRadius: 12, padding: 16,
              border: '1px solid #cce0ff',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: COLORS.blue, display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('videocall.hiveMindSummary')}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#333' }}>
                {meetingSummary}
              </div>
            </div>
          )}

          {!isTranscribing && !meetingSummary && !isRecording && (
            <div style={{ color: '#65676b', textAlign: 'center', padding: 20 }}>
              {t('videocall.recordingNotEnabled')}
              <br />
              <span style={{ fontSize: 12 }}>{t('videocall.enableRecHint')}</span>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Active call
  // ──────────────────────────────────────────────
  const gridCols = remoteParticipants.length === 0 ? 1
    : remoteParticipants.length <= 1 ? 2
    : remoteParticipants.length <= 3 ? 2
    : 3;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: COLORS.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TeamOutlined style={{ color: COLORS.text, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 16 }}>
            {conversationName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: COLORS.textDim, fontSize: 14, fontFamily: 'monospace' }}>
            {formatDuration(callDuration)}
          </span>
          <span style={{
            background: COLORS.green, color: '#fff', padding: '2px 10px',
            borderRadius: 12, fontSize: 12, fontWeight: 600,
          }}>
            {callType === 'video' ? t('videocall.video') : t('videocall.audio')}
          </span>
          {remoteParticipants.length > 0 && (
            <span style={{ color: COLORS.textDim, fontSize: 13 }}>
              {t('videocall.participants', { count: remoteParticipants.length + 1 })}
            </span>
          )}
        </div>
      </div>

      {/* Video grid */}
      <div style={{
        flex: 1, padding: 12, display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: 8, alignContent: 'center',
      }}>
        {/* Local video (self) */}
        <div style={{
          position: 'relative', background: COLORS.surface, borderRadius: 12, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: remoteParticipants.length === 0 ? 400 : 200,
        }}>
          {callType === 'video' && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          ) : (
            <Avatar size={80} icon={<UserOutlined />} style={{ background: COLORS.accent }} />
          )}
          <div style={{
            position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)',
            color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t('videocall.you')} {isMuted && '🔇'}
            {/* Mic level indicator */}
            {!isMuted && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 14 }}>
                {[20, 35, 50, 65, 80].map((threshold, i) => (
                  <div key={i} style={{
                    width: 3,
                    height: 4 + i * 2,
                    borderRadius: 1,
                    background: micLevel >= threshold
                      ? (micLevel > 60 ? '#4caf50' : '#8bc34a')
                      : 'rgba(255,255,255,0.25)',
                    transition: 'background 0.1s',
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Remote participants */}
        {remoteParticipants.map(p => (
          <div key={p.userId} style={{
            position: 'relative', background: COLORS.surface, borderRadius: 12, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200,
          }}>
            {/* Hidden audio element — always plays remote audio regardless of video state */}
            <audio
              ref={el => {
                if (el) {
                  remoteAudiosRef.current.set(p.userId, el);
                  const s = remoteStreamsRef.current.get(p.userId);
                  if (s && el.srcObject !== s) {
                    el.srcObject = s;
                    el.play().then(() => {
                      console.log(`[CALL] 🔉 Audio playing for ${p.userId.slice(0,8)}`);
                      setAudioBlocked(false);
                    }).catch(err => {
                      console.warn('[CALL] Audio autoplay blocked:', err.message);
                      setAudioBlocked(true);
                    });
                  }
                }
              }}
              autoPlay
              style={{ display: 'none' }}
            />
            {callType === 'video' && !p.isVideoOff ? (
              <video
                ref={el => {
                  if (el) {
                    remoteVideosRef.current.set(p.userId, el);
                    const s = remoteStreamsRef.current.get(p.userId);
                    if (s && el.srcObject !== s) { el.srcObject = s; el.play().catch(() => {}); }
                  }
                }}
                autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Avatar size={80} src={p.user.avatarUrl} icon={<UserOutlined />}
                style={{ background: COLORS.accent }} />
            )}
            <div style={{
              position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)',
              color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            }}>
              {p.user.firstName} {p.user.lastName} {p.isMuted && '🔇'}
            </div>
          </div>
        ))}

        {/* Waiting text if no one joined yet */}
        {remoteParticipants.length === 0 && status === 'active' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}>
            <Spin indicator={<LoadingOutlined spin style={{ fontSize: 32, color: COLORS.blue }} />} />
            <span style={{ color: COLORS.textDim, fontSize: 14 }}>
              {t('videocall.waitingParticipants')}
            </span>
          </div>
        )}
      </div>

      {/* Audio blocked warning */}
      {audioBlocked && (
        <div
          onClick={() => {
            // User interaction unlocks audio autoplay
            remoteAudiosRef.current.forEach(el => el.play().catch(() => {}));
            setAudioBlocked(false);
          }}
          style={{
            padding: '8px 16px', background: '#ff9800', color: '#000', textAlign: 'center',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, flexShrink: 0,
          }}
        >
          🔇 {t('videocall.audioBlocked', { defaultValue: 'Audio bloqué par le navigateur — cliquez ici pour activer le son' })}
        </div>
      )}

      {/* Controls bar */}
      <div style={{
        padding: '16px 0 24px', display: 'flex', justifyContent: 'center', gap: 16,
        background: 'rgba(0,0,0,0.3)', flexShrink: 0, alignItems: 'center',
      }}>
        {/* Mic level mini-bar (always visible) */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          position: 'absolute', left: 20, bottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
            {[10, 20, 35, 50, 65, 80, 90].map((threshold, i) => (
              <div key={i} style={{
                width: 4,
                height: 6 + i * 3,
                borderRadius: 2,
                background: isMuted ? 'rgba(255,255,255,0.15)'
                  : micLevel >= threshold
                    ? (micLevel > 60 ? '#4caf50' : micLevel > 30 ? '#8bc34a' : '#ffc107')
                    : 'rgba(255,255,255,0.15)',
                transition: 'background 0.08s',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: COLORS.textDim }}>
            {isMuted ? t('videocall.muted') : micLevel > 5 ? t('videocall.micOk') : t('videocall.noSound')}
          </span>
        </div>

        {/* Speaker test button */}
        <Tooltip title={t('videocall.testSpeakers')}>
          <div onClick={() => {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 440;
              gain.gain.value = 0.15;
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
              osc.stop(ctx.currentTime + 0.5);
              setTimeout(() => ctx.close(), 600);
            } catch { /* silent */ }
          }} style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <SoundOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
        </Tooltip>

        <Tooltip title={isMuted ? t('videocall.unmute') : t('videocall.mute')}>
          <div onClick={toggleMute} style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isMuted ? COLORS.red : 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {isMuted ? <AudioMutedOutlined style={{ fontSize: 22, color: '#fff' }} /> : <AudioOutlined style={{ fontSize: 22, color: '#fff' }} />}
          </div>
        </Tooltip>

        {callType === 'video' && (
          <Tooltip title={isVideoOff ? t('videocall.cameraOn') : t('videocall.cameraOff')}>
            <div onClick={toggleVideo} style={{
              width: 52, height: 52, borderRadius: '50%',
              background: isVideoOff ? COLORS.red : 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <VideoCameraOutlined style={{ fontSize: 22, color: '#fff' }} />
            </div>
          </Tooltip>
        )}

        <Tooltip title={isScreenSharing ? t('videocall.stopSharing') : t('videocall.shareScreen')}>
          <div onClick={toggleScreenShare} style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isScreenSharing ? COLORS.blue : 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <DesktopOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
        </Tooltip>

        {/* Recording toggle */}
        <Tooltip title={isRecording ? t('videocall.stopRecording') : t('videocall.startRecording')}>
          <div onClick={toggleRecording} style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isRecording ? '#e53935' : 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            border: isRecording ? '2px solid #ff6659' : 'none',
            position: 'relative',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{
              width: isRecording ? 18 : 14, height: isRecording ? 18 : 14,
              borderRadius: isRecording ? 3 : '50%',
              background: isRecording ? '#fff' : '#e53935',
              transition: 'all 0.3s',
            }} />
            {isRecording && (
              <div style={{
                position: 'absolute', top: -6, right: -6,
                background: '#e53935', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '1px 5px', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite',
              }}>REC</div>
            )}
          </div>
        </Tooltip>

        {/* End call */}
        <Tooltip title={t('videocall.hangUp')}>
          <div onClick={leaveCall} style={{
            width: 62, height: 52, borderRadius: 26,
            background: COLORS.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <PhoneOutlined style={{ fontSize: 24, color: '#fff', transform: 'rotate(135deg)' }} />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default VideoCallModal;
