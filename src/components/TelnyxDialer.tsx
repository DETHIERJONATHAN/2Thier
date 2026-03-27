/**
 * TelnyxDialer — Composant dialer PSTN intégré au Messenger
 * 
 * Affiche un pavé numérique, la durée d'appel, les boutons mute/hold/hangup,
 * et la gestion des appels entrants Telnyx.
 */
import React, { useState, useCallback } from 'react';
import { Avatar, Tooltip } from 'antd';
import {
  PhoneOutlined,
  AudioMutedOutlined,
  PauseCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  UserOutlined,
  SoundOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TelnyxCallState } from '../hooks/useTelnyxCall';

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const DIALER = {
  bg: '#fff',
  cardBg: '#f8f9fa',
  primary: '#1877f2',
  green: '#31a24c',
  red: '#ff3b30',
  orange: '#ff9500',
  text: '#1c1e21',
  textSecondary: '#65676b',
  border: '#e4e6eb',
  keyBg: '#f0f2f5',
  keyHover: '#e4e6eb',
  keyActive: '#d8dadf',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TelnyxDialerProps {
  // Call state from useTelnyxCall hook
  callState: TelnyxCallState;
  isRegistered: boolean;
  assignedNumber: string | null;
  callDuration: number;
  isMuted: boolean;
  isOnHold: boolean;
  callerInfo: { number: string; name?: string } | null;
  errorMessage: string | null;

  // Actions from useTelnyxCall hook
  makeCall: (destination: string) => void;
  hangup: () => void;
  answer: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDTMF: (digit: string) => void;

  // Optional: pre-fill phone number (from click-to-call)
  initialNumber?: string;
  // Optional: close dialer
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const KEYPAD: { key: string; sub: string }[] = [
  { key: '1', sub: '' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '' },
  { key: '0', sub: '+' },
  { key: '#', sub: '' },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatPhoneDisplay(number: string): string {
  // Simple formatting for display
  const cleaned = number.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+32') && cleaned.length === 12) {
    return `+32 ${cleaned.slice(3, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('+33') && cleaned.length === 12) {
    return `+33 ${cleaned.slice(3, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }
  return cleaned;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const TelnyxDialer: React.FC<TelnyxDialerProps> = ({
  callState,
  isRegistered,
  assignedNumber,
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
  initialNumber = '',
  onClose,
}) => {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [showKeypad, setShowKeypad] = useState(true);

  const isInCall = ['connecting', 'ringing', 'active', 'held'].includes(callState);
  const isIncoming = callState === 'ringing' && !!callerInfo;

  // ─── KEY PRESS ─────────────────────────────────────────────
  const handleKeyPress = useCallback((key: string) => {
    if (isInCall) {
      sendDTMF(key);
    } else {
      setPhoneNumber(prev => prev + key);
    }
  }, [isInCall, sendDTMF]);

  const handleBackspace = useCallback(() => {
    setPhoneNumber(prev => prev.slice(0, -1));
  }, []);

  const handleCall = useCallback(() => {
    if (!phoneNumber.trim()) return;
    let destination = phoneNumber.trim();
    // Auto-add +32 if Belgian local number
    if (/^0[1-9]/.test(destination)) {
      destination = '+32' + destination.slice(1);
    }
    makeCall(destination);
  }, [phoneNumber, makeCall]);

  // ─── STATUS LABEL ──────────────────────────────────────────
  const getStatusLabel = (): string => {
    switch (callState) {
      case 'connecting': return t('telnyx.connecting', 'Connexion...');
      case 'ringing': return callerInfo ? t('telnyx.incoming', 'Appel entrant') : t('telnyx.ringing', 'Sonnerie...');
      case 'active': return t('telnyx.inCall', 'En cours');
      case 'held': return t('telnyx.onHold', 'En attente');
      case 'ending': return t('telnyx.ending', 'Fin...');
      case 'error': return errorMessage || t('telnyx.error', 'Erreur');
      default: return '';
    }
  };

  const getStatusColor = (): string => {
    switch (callState) {
      case 'connecting': return DIALER.orange;
      case 'ringing': return DIALER.green;
      case 'active': return DIALER.green;
      case 'held': return DIALER.orange;
      case 'error': return DIALER.red;
      default: return DIALER.textSecondary;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER: Incoming call banner
  // ═══════════════════════════════════════════════════════════
  if (isIncoming && callerInfo) {
    return (
      <div style={{
        background: DIALER.bg,
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
      }}>
        {/* Caller info */}
        <div style={{
          animation: 'pulse 1.5s ease-in-out infinite',
          marginBottom: 16,
        }}>
          <Avatar size={64} icon={<UserOutlined />} style={{ background: DIALER.green }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: DIALER.text, marginBottom: 4 }}>
          {callerInfo.name || callerInfo.number}
        </div>
        {callerInfo.name && (
          <div style={{ fontSize: 13, color: DIALER.textSecondary, marginBottom: 4 }}>
            {formatPhoneDisplay(callerInfo.number)}
          </div>
        )}
        <div style={{ fontSize: 13, color: DIALER.green, fontWeight: 500, marginBottom: 20 }}>
          {t('telnyx.incoming', 'Appel entrant')}...
        </div>

        {/* Answer / Decline buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          <Tooltip title={t('telnyx.decline', 'Refuser')}>
            <div
              onClick={hangup}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: DIALER.red, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 22,
                boxShadow: '0 2px 8px rgba(255,59,48,0.3)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PhoneOutlined rotate={135} />
            </div>
          </Tooltip>
          <Tooltip title={t('telnyx.answer', 'Répondre')}>
            <div
              onClick={answer}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: DIALER.green, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 22,
                boxShadow: '0 2px 8px rgba(49,162,76,0.3)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PhoneOutlined />
            </div>
          </Tooltip>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Active call screen
  // ═══════════════════════════════════════════════════════════
  if (isInCall) {
    const displayNumber = callerInfo?.number || phoneNumber;
    const displayName = callerInfo?.name;

    return (
      <div style={{
        background: DIALER.bg,
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
      }}>
        {/* Close button */}
        {onClose && callState === 'idle' && (
          <div onClick={onClose} style={{
            position: 'absolute', top: 8, right: 8,
            cursor: 'pointer', color: DIALER.textSecondary,
          }}>
            <CloseOutlined />
          </div>
        )}

        {/* Caller/callee info */}
        <Avatar size={56} icon={<UserOutlined />} style={{
          background: getStatusColor(),
          marginBottom: 12,
        }} />
        {displayName && (
          <div style={{ fontSize: 16, fontWeight: 600, color: DIALER.text }}>
            {displayName}
          </div>
        )}
        <div style={{ fontSize: 14, color: DIALER.textSecondary, marginBottom: 4 }}>
          {formatPhoneDisplay(displayNumber)}
        </div>

        {/* Status + Duration */}
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: getStatusColor(),
          marginBottom: 4,
        }}>
          {getStatusLabel()}
        </div>
        {callState === 'active' && (
          <div style={{
            fontSize: 22, fontWeight: 600, color: DIALER.text,
            fontVariantNumeric: 'tabular-nums',
            marginBottom: 16,
          }}>
            {formatDuration(callDuration)}
          </div>
        )}
        {callState === 'connecting' && (
          <div style={{ marginBottom: 16 }}>
            <LoadingOutlined style={{ fontSize: 24, color: DIALER.orange }} />
          </div>
        )}

        {/* In-call controls */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20,
          marginBottom: 16, flexWrap: 'wrap',
        }}>
          <Tooltip title={isMuted ? t('telnyx.unmute', 'Rétablir le son') : t('telnyx.mute', 'Couper le son')}>
            <div
              onClick={toggleMute}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isMuted ? DIALER.red : DIALER.keyBg,
                color: isMuted ? '#fff' : DIALER.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 18,
                transition: 'all 0.15s',
              }}
            >
              {isMuted ? <AudioMutedOutlined /> : <SoundOutlined />}
            </div>
          </Tooltip>

          <Tooltip title={isOnHold ? t('telnyx.resume', 'Reprendre') : t('telnyx.hold', 'Mettre en attente')}>
            <div
              onClick={toggleHold}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isOnHold ? DIALER.orange : DIALER.keyBg,
                color: isOnHold ? '#fff' : DIALER.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 18,
                transition: 'all 0.15s',
              }}
            >
              <PauseCircleOutlined />
            </div>
          </Tooltip>

          <Tooltip title={t('telnyx.keypad', 'Clavier')}>
            <div
              onClick={() => setShowKeypad(!showKeypad)}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: showKeypad ? DIALER.primary : DIALER.keyBg,
                color: showKeypad ? '#fff' : DIALER.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, fontWeight: 700,
                transition: 'all 0.15s',
              }}
            >
              #
            </div>
          </Tooltip>
        </div>

        {/* In-call DTMF keypad */}
        {showKeypad && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6, marginBottom: 16, maxWidth: 200, margin: '0 auto 16px',
          }}>
            {KEYPAD.map(({ key, sub }) => (
              <div
                key={key}
                onClick={() => sendDTMF(key)}
                style={{
                  height: 40, borderRadius: 8,
                  background: DIALER.keyBg,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', userSelect: 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = DIALER.keyHover)}
                onMouseLeave={e => (e.currentTarget.style.background = DIALER.keyBg)}
              >
                <span style={{ fontSize: 16, fontWeight: 500, color: DIALER.text, lineHeight: 1 }}>{key}</span>
                {sub && <span style={{ fontSize: 8, color: DIALER.textSecondary, letterSpacing: 2 }}>{sub}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Hangup button */}
        <Tooltip title={t('telnyx.hangup', 'Raccrocher')}>
          <div
            onClick={hangup}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: DIALER.red, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 22,
              margin: '0 auto',
              boxShadow: '0 2px 8px rgba(255,59,48,0.3)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <PhoneOutlined rotate={135} />
          </div>
        </Tooltip>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Idle — Dialer keypad
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      background: DIALER.bg,
      borderRadius: 12,
      padding: 16,
    }}>
      {/* Header with status */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isRegistered ? DIALER.green : DIALER.red,
          }} />
          <span style={{ fontSize: 11, color: DIALER.textSecondary }}>
            {isRegistered ? t('telnyx.ready', 'Prêt') : t('telnyx.notRegistered', 'Non connecté')}
          </span>
        </div>
        {assignedNumber && (
          <span style={{ fontSize: 11, color: DIALER.textSecondary }}>
            {formatPhoneDisplay(assignedNumber)}
          </span>
        )}
        {onClose && (
          <div onClick={onClose} style={{ cursor: 'pointer', color: DIALER.textSecondary, marginLeft: 8 }}>
            <CloseOutlined style={{ fontSize: 12 }} />
          </div>
        )}
      </div>

      {/* Phone number display */}
      <div style={{
        background: DIALER.cardBg,
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 44,
        border: `1px solid ${DIALER.border}`,
      }}>
        <span style={{
          fontSize: phoneNumber.length > 15 ? 16 : 20,
          fontWeight: 500,
          color: phoneNumber ? DIALER.text : DIALER.textSecondary,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {phoneNumber || t('telnyx.enterNumber', 'Entrer un numéro')}
        </span>
        {phoneNumber && (
          <div
            onClick={handleBackspace}
            style={{ cursor: 'pointer', color: DIALER.textSecondary, marginLeft: 8, padding: 4 }}
          >
            <DeleteOutlined />
          </div>
        )}
      </div>

      {/* Error */}
      {errorMessage && (
        <div style={{
          fontSize: 12, color: DIALER.red, textAlign: 'center',
          marginBottom: 8, padding: '4px 8px',
          background: 'rgba(255,59,48,0.08)', borderRadius: 6,
        }}>
          {errorMessage}
        </div>
      )}

      {/* Keypad */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8, marginBottom: 16,
      }}>
        {KEYPAD.map(({ key, sub }) => (
          <div
            key={key}
            onClick={() => handleKeyPress(key)}
            style={{
              height: 52, borderRadius: 12,
              background: DIALER.keyBg,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', userSelect: 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = DIALER.keyHover)}
            onMouseLeave={e => (e.currentTarget.style.background = DIALER.keyBg)}
            onMouseDown={e => (e.currentTarget.style.background = DIALER.keyActive)}
            onMouseUp={e => (e.currentTarget.style.background = DIALER.keyHover)}
          >
            <span style={{ fontSize: 22, fontWeight: 500, color: DIALER.text, lineHeight: 1 }}>{key}</span>
            {sub && <span style={{ fontSize: 9, color: DIALER.textSecondary, letterSpacing: 2, marginTop: 1 }}>{sub}</span>}
          </div>
        ))}
      </div>

      {/* Call button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={!isRegistered ? t('telnyx.notRegistered', 'Non connecté') : !phoneNumber ? t('telnyx.enterNumber', 'Entrer un numéro') : t('telnyx.call', 'Appeler')}>
          <div
            onClick={handleCall}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: isRegistered && phoneNumber ? DIALER.green : DIALER.keyBg,
              color: isRegistered && phoneNumber ? '#fff' : DIALER.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isRegistered && phoneNumber ? 'pointer' : 'not-allowed',
              fontSize: 22,
              boxShadow: isRegistered && phoneNumber ? '0 2px 8px rgba(49,162,76,0.3)' : 'none',
              transition: 'all 0.2s',
              opacity: isRegistered && phoneNumber ? 1 : 0.5,
            }}
            onMouseEnter={e => {
              if (isRegistered && phoneNumber) e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <PhoneOutlined />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default TelnyxDialer;
