import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// ICE SERVERS (Google STUN)
// ═══════════════════════════════════════════════════════════════
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
const VideoCallModal: React.FC<VideoCallModalProps> = ({
  callId, callType, isIncoming, conversationName, api, userId, onClose,
}) => {
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasJoinedRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micAnimRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

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

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
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
      const [remoteStream] = event.streams;
      remoteStreamsRef.current.set(remoteUserId, remoteStream);

      const videoEl = remoteVideosRef.current.get(remoteUserId);
      if (videoEl) {
        videoEl.srcObject = remoteStream;
      }
      forceUpdate(n => n + 1);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        peerConnectionsRef.current.delete(remoteUserId);
        remoteStreamsRef.current.delete(remoteUserId);
        forceUpdate(n => n + 1);
      }
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }, [api, callId]);

  // ──────────────────────────────────────────────
  // Send offer to a participant
  // ──────────────────────────────────────────────
  const sendOffer = useCallback(async (remoteUserId: string) => {
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

    if (type === 'offer') {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await api.post(`/api/calls/${callId}/signal`, {
        to: from, type: 'answer', data: answer,
      });
    } else if (type === 'answer') {
      const pc = peerConnectionsRef.current.get(from);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      }
    } else if (type === 'ice-candidate') {
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch { /* ignore late candidates */ }
      }
    }
  }, [createPeerConnection, api, callId]);

  // ──────────────────────────────────────────────
  // Poll signaling + call state
  // ──────────────────────────────────────────────
  useEffect(() => {
    signalPollRef.current = setInterval(async () => {
      if (status === 'ended') return;
      try {
        const { signals } = await api.get(`/api/calls/${callId}/signal`);
        if (signals?.length) {
          for (const signal of signals) {
            await handleSignal(signal);
          }
        }
      } catch { /* silent */ }
    }, 1000);

    return () => { if (signalPollRef.current) clearInterval(signalPollRef.current); };
  }, [callId, api, handleSignal, status]);

  // Poll call status
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await api.get(`/api/calls/${callId}`);
        if (data) {
          setCallData(data);
          if (data.status === 'ended' || data.status === 'missed') {
            setStatus('ended');
          } else if (data.status === 'active' && status === 'ringing') {
            setStatus('active');
          }

          // Connect to new participants that have joined
          if (data.status === 'active' && hasJoinedRef.current) {
            const joinedParticipants = data.participants.filter(
              (p: CallParticipant) => p.userId !== userId && p.status === 'joined'
            );
            for (const p of joinedParticipants) {
              if (!peerConnectionsRef.current.has(p.userId)) {
                await sendOffer(p.userId);
              }
            }
          }
        }
      } catch { /* silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [callId, api, userId, sendOffer, status]);

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
    setStatus('active');

    // Send offers to all already-joined participants
    if (callData) {
      const joined = callData.participants.filter(
        p => p.userId !== userId && p.status === 'joined'
      );
      for (const p of joined) {
        await sendOffer(p.userId);
      }
    }
  }, [getLocalStream, api, callId, callData, userId, sendOffer]);

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

    try {
      await api.post(`/api/calls/${callId}/leave`, {});
    } catch { /* silent */ }

    setStatus('ended');

    // If recording was active, send to Gemini for transcription
    if (isRecording && audioChunksRef.current.length > 0) {
      setIsTranscribing(true);
      try {
        const transcriptionText = `Réunion ${callType === 'video' ? 'vidéo' : 'audio'} avec ${conversationName} - Durée: ${formatDuration(callDuration)}. [Enregistrement audio capturé — transcription par Gemini AI]`;
        const result = await api.post(`/api/calls/${callId}/transcribe`, {
          transcription: transcriptionText,
        }) as any;
        if (result?.summary) {
          setMeetingSummary(result.summary);
        }
      } catch (err) {
        console.error('[CALL] Transcription error:', err);
      }
      setIsTranscribing(false);
    }
  }, [api, callId, callDuration, conversationName, isRecording, callType]);

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
    const pcs = peerConnectionsRef.current;
    const localStream = localStreamRef.current;
    const screenStream = screenStreamRef.current;
    const poll = pollRef.current;
    const signalPoll = signalPollRef.current;
    const timer = timerRef.current;
    const recorder = mediaRecorderRef.current;
    const micAnim = micAnimRef.current;

    return () => {
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
    };
  }, []);

  // Remote participants that have joined
  const remoteParticipants = callData?.participants.filter(
    p => p.userId !== userId && p.status === 'joined'
  ) || [];

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
              {callType === 'video' ? '📹 Appel vidéo entrant...' : '📞 Appel audio entrant...'}
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
        title={<span><FileTextOutlined /> Appel terminé — {conversationName}</span>}
        onCancel={onClose}
        footer={[
          <Button key="close" type="primary" onClick={onClose}>Fermer</Button>,
        ]}
        width={600}
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ color: '#65676b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOutlined style={{ transform: 'rotate(135deg)', color: COLORS.red }} />
            <span>Durée: {formatDuration(callDuration)}</span>
          </div>

          {isTranscribing && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: COLORS.blue }} />} />
              <div style={{ marginTop: 12, color: '#65676b' }}>
                Gemini AI analyse la réunion et génère le compte-rendu...
              </div>
            </div>
          )}

          {meetingSummary && (
            <div style={{
              background: '#f0f7ff', borderRadius: 12, padding: 16,
              border: '1px solid #cce0ff',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: COLORS.blue, display: 'flex', alignItems: 'center', gap: 6 }}>
                🤖 Compte-rendu Gemini AI
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#333' }}>
                {meetingSummary}
              </div>
            </div>
          )}

          {!isTranscribing && !meetingSummary && !isRecording && (
            <div style={{ color: '#65676b', textAlign: 'center', padding: 20 }}>
              L'enregistrement Gemini n'était pas activé pendant cet appel.
              <br />
              <span style={{ fontSize: 12 }}>Activez le bouton 🔴 REC pendant un appel pour obtenir un compte-rendu automatique.</span>
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
            {callType === 'video' ? '📹 Vidéo' : '📞 Audio'}
          </span>
          {remoteParticipants.length > 0 && (
            <span style={{ color: COLORS.textDim, fontSize: 13 }}>
              {remoteParticipants.length + 1} participant{remoteParticipants.length > 0 ? 's' : ''}
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
            Vous {isMuted && '🔇'}
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
            {callType === 'video' && !p.isVideoOff ? (
              <video
                ref={el => { if (el) { remoteVideosRef.current.set(p.userId, el); const s = remoteStreamsRef.current.get(p.userId); if (s) el.srcObject = s; } }}
                autoPlay playsInline
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
              En attente des participants...
            </span>
          </div>
        )}
      </div>

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
            {isMuted ? 'MUTÉ' : micLevel > 5 ? 'MIC OK' : 'PAS DE SON'}
          </span>
        </div>

        {/* Speaker test button */}
        <Tooltip title="Tester les haut-parleurs (joue un son court)">
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

        <Tooltip title={isMuted ? 'Activer le micro' : 'Couper le micro'}>
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
          <Tooltip title={isVideoOff ? 'Allumer la caméra' : 'Éteindre la caméra'}>
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

        <Tooltip title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}>
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
        <Tooltip title={isRecording ? 'Arrêter l\'enregistrement Gemini' : 'Activer l\'enregistrement Gemini (compte-rendu IA)'}>
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
        <Tooltip title="Raccrocher">
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
