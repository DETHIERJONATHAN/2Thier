/**
 * 📎 FilePreview — Rich file preview component for messages
 * Renders inline previews for images, PDFs, videos, audio, and generic files
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Modal } from 'antd';

interface FilePreviewProps {
  urls: string[];
  mediaType: string;
  voiceDuration?: number | null;
  voiceTranscript?: string | null;
  compact?: boolean;
}

const getFileExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return ext;
  } catch {
    return url.split('.').pop()?.toLowerCase() || '';
  }
};

const getFileName = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop() || 'file');
  } catch {
    return 'file';
  }
};

const getFileIcon = (ext: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    pdf: <FilePdfOutlined style={{ color: '#ff4444', fontSize: 24 }} />,
    doc: <FileWordOutlined style={{ color: '#2b579a', fontSize: 24 }} />,
    docx: <FileWordOutlined style={{ color: '#2b579a', fontSize: 24 }} />,
    xls: <FileExcelOutlined style={{ color: '#217346', fontSize: 24 }} />,
    xlsx: <FileExcelOutlined style={{ color: '#217346', fontSize: 24 }} />,
    png: <FileImageOutlined style={{ color: '#8e44ad', fontSize: 24 }} />,
    jpg: <FileImageOutlined style={{ color: '#8e44ad', fontSize: 24 }} />,
    jpeg: <FileImageOutlined style={{ color: '#8e44ad', fontSize: 24 }} />,
    gif: <FileImageOutlined style={{ color: '#8e44ad', fontSize: 24 }} />,
    webp: <FileImageOutlined style={{ color: '#8e44ad', fontSize: 24 }} />,
    mp4: <PlayCircleOutlined style={{ color: '#e74c3c', fontSize: 24 }} />,
    webm: <PlayCircleOutlined style={{ color: '#e74c3c', fontSize: 24 }} />,
    mp3: <SoundOutlined style={{ color: '#3498db', fontSize: 24 }} />,
    wav: <SoundOutlined style={{ color: '#3498db', fontSize: 24 }} />,
  };
  return iconMap[ext] || <FileOutlined style={{ color: '#95a5a6', fontSize: 24 }} />;
};

/** 🎙️ Voice message player — same look as VoiceRecorder (blue gradient bar) */
const WAVE_BARS = [3, 7, 12, 8, 16, 10, 5, 14, 18, 7, 12, 9, 5, 16, 10, 7, 14, 9, 12, 5, 10, 16, 7, 9, 4, 11, 15, 8];

const VoicePlayer: React.FC<{
  url: string;
  voiceDuration?: number | null;
  voiceTranscript?: string | null;
  compact?: boolean;
}> = ({ url, voiceDuration, voiceTranscript, compact }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voiceDuration || 0);

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}`;

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgress(a.currentTime / a.duration);
    setCurrentTime(a.currentTime);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const a = audioRef.current;
    if (a && a.duration && isFinite(a.duration)) setDuration(a.duration);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('loadedmetadata', onLoadedMetadata);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('loadedmetadata', onLoadedMetadata);
      a.removeEventListener('ended', onEnded);
    };
  }, [onTimeUpdate, onLoadedMetadata, onEnded]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * a.duration;
    setProgress(pct);
  };

  const displayTime = playing ? currentTime : (duration || voiceDuration || 0);

  return (
    <div style={{ maxWidth: compact ? 200 : 260 }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        background: 'linear-gradient(135deg, #0084ff, #00c6ff)',
        borderRadius: 22, width: '100%', minHeight: 40,
        overflow: 'hidden',
      }}>
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            fontSize: 16, transition: 'background 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >
          {playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        </button>

        {/* Waveform bars — clickable to seek */}
        <div
          onClick={seekTo}
          style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, height: 24, cursor: 'pointer', minWidth: 0, overflow: 'hidden' }}
        >
          {WAVE_BARS.map((h, i) => {
            const barPct = (i + 0.5) / WAVE_BARS.length;
            const filled = barPct <= progress;
            return (
              <div
                key={i}
                style={{
                  width: 2.5, borderRadius: 2,
                  height: Math.max(3, h * 1.3),
                  background: filled ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.35)',
                  transition: 'background 0.1s',
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>

        {/* Duration — always visible */}
        <span style={{
          color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
          whiteSpace: 'nowrap', flexShrink: 0,
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}>
          {formatDur(displayTime)}
        </span>
      </div>
      {voiceTranscript && (
        <p style={{ fontSize: 11, color: '#999', fontStyle: 'italic', margin: '2px 8px 0' }}>
          📝 {voiceTranscript}
        </p>
      )}
    </div>
  );
};

export const FilePreview: React.FC<FilePreviewProps> = ({ urls, mediaType, voiceDuration, voiceTranscript, compact }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');

  if (!urls || urls.length === 0) return null;

  const openPreview = (url: string, type: string) => {
    setPreviewUrl(url);
    setPreviewType(type);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <div className={`flex flex-col gap-1.5 ${compact ? 'max-w-[200px]' : 'max-w-[320px]'}`}>
        {urls.map((url, idx) => {
          const ext = getFileExtension(url);
          const name = getFileName(url);
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || mediaType === 'image';
          const isVoice = mediaType === 'voice';
          const isVideo = !isVoice && (['mp4', 'webm', 'mov'].includes(ext) || mediaType === 'video');
          const isPdf = ext === 'pdf';
          const isSignature = mediaType === 'signature';

          // Voice message — progress-fill player (MUST come before video since .webm is shared)
          if (isVoice) {
            return <VoicePlayer key={idx} url={url} voiceDuration={voiceDuration} voiceTranscript={voiceTranscript} compact={compact} />;
          }

          // Image preview
          if (isImage || isSignature) {
            return (
              <div key={idx} className="relative group cursor-pointer" onClick={() => openPreview(url, 'image')}>
                <img
                  src={url}
                  alt={name}
                  className="rounded-lg max-w-full max-h-48 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <EyeOutlined className="text-white text-xl" />
                </div>
                {isSignature && (
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    ✍️ Signature
                  </span>
                )}
              </div>
            );
          }

          // Video preview
          if (isVideo) {
            return (
              <div key={idx} className="relative group cursor-pointer" onClick={() => openPreview(url, 'video')}>
                <video src={url} className="rounded-lg max-w-full max-h-48" preload="metadata" />
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                  <PlayCircleOutlined className="text-white" style={{ fontSize: 40 }} />
                </div>
              </div>
            );
          }

          // PDF
          if (isPdf) {
            return (
              <div
                key={idx}
                className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2 cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => openPreview(url, 'pdf')}
              >
                <FilePdfOutlined style={{ color: '#ff4444', fontSize: 28 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{name}</p>
                  <p className="text-gray-400 text-xs">PDF</p>
                </div>
                <DownloadOutlined className="text-gray-400 hover:text-white" />
              </div>
            );
          }

          // Generic file
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2 hover:bg-gray-600/50 transition-colors no-underline"
            >
              {getFileIcon(ext)}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{name}</p>
                <p className="text-gray-400 text-xs uppercase">{ext}</p>
              </div>
              <DownloadOutlined className="text-gray-400" />
            </a>
          );
        })}
      </div>

      {/* Fullscreen preview modal */}
      <Modal
        open={!!previewUrl}
        onCancel={() => setPreviewUrl(null)}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        destroyOnClose
      >
        {previewType === 'image' && previewUrl && (
          <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
        )}
        {previewType === 'video' && previewUrl && (
          <video src={previewUrl} controls autoPlay style={{ width: '100%', maxHeight: '85vh' }} />
        )}
        {previewType === 'pdf' && previewUrl && (
          <iframe src={previewUrl} style={{ width: '100%', height: '85vh', border: 'none' }} title="PDF Preview" />
        )}
        {previewUrl && (
          <div className="text-center mt-2">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
              <DownloadOutlined /> Télécharger
            </a>
          </div>
        )}
      </Modal>
    </>
  );
};

export default FilePreview;
