/**
 * 🎤 VoiceRecorder — Facebook-style voice recorder
 * Replaces the input bar with a blue recording interface
 * Shows animated waveform, timer, and controls inline
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DeleteOutlined, SendOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Waveform animation — 40 bars for wider display
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bars = Array.from(data).slice(0, 40).map(v => v / 255);
        setWaveformData(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onSend(audioBlob, duration);
    }
  }, [audioBlob, duration, onSend]);

  const handleCancel = useCallback(() => {
    stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCancel();
  }, [stopRecording, audioUrl, onCancel]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }, [audioUrl, playing]);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      background: recording ? 'linear-gradient(135deg, #0084ff, #00c6ff)' : '#0084ff',
      borderRadius: 24, width: '100%', minHeight: 48,
      transition: 'background 0.3s ease',
      boxShadow: recording ? '0 0 20px rgba(0, 132, 255, 0.4)' : 'none',
    }}>
      {/* Cancel button */}
      <button
        onClick={handleCancel}
        style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
          fontSize: 14, transition: 'background 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
      >
        <DeleteOutlined />
      </button>

      {/* Waveform / Playback area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
        {recording ? (
          // Live animated waveform
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, height: 32 }}>
            {/* Pulsing red dot */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#ff4444',
              animation: 'pulse 1s ease-in-out infinite', flexShrink: 0, marginRight: 6,
            }} />
            {/* Bars */}
            {waveformData.map((v, i) => (
              <div
                key={i}
                style={{
                  width: 3, borderRadius: 2,
                  height: Math.max(4, v * 28),
                  background: `rgba(255, 255, 255, ${0.5 + v * 0.5})`,
                  transition: 'height 0.08s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        ) : audioUrl ? (
          // Playback button
          <button
            onClick={togglePlayback}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
              borderRadius: '50%', width: 36, height: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#fff',
              transition: 'background 0.2s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            {playing ? <PauseCircleOutlined style={{ fontSize: 22 }} /> : <PlayCircleOutlined style={{ fontSize: 22 }} />}
          </button>
        ) : null}

        {/* Duration timer */}
        <span style={{
          color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'monospace',
          whiteSpace: 'nowrap', letterSpacing: 1, flexShrink: 0,
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Stop / Send button */}
      {recording ? (
        <button
          onClick={stopRecording}
          style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: '#fff', border: 'none', color: '#0084ff',
            fontSize: 16, transition: 'transform 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <PauseCircleOutlined />
        </button>
      ) : audioBlob ? (
        <button
          onClick={handleSend}
          style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: '#fff', border: 'none', color: '#0084ff',
            fontSize: 16, transition: 'transform 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <SendOutlined />
        </button>
      ) : null}

      {/* CSS animation for pulse dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default VoiceRecorder;
