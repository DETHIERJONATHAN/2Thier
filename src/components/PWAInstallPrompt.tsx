/**
 * PWAInstallPrompt — Composant qui pousse l'utilisateur à installer la PWA.
 * 
 * Comportement :
 * - Android/Desktop Chrome : intercepte `beforeinstallprompt` et affiche un bandeau personnalisé
 * - iOS Safari : affiche des instructions manuelles (Partager → Ajouter à l'écran d'accueil)
 * - Si déjà installé (mode standalone) : ne montre rien
 * - Si fermé, réapparaît après 7 jours
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'antd';
import { CloseOutlined, DownloadOutlined, AppleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SF } from '../components/zhiive/ZhiiveTheme';

const STORAGE_KEY = 'zhiive_pwa_prompt_dismissed';
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Détecte si l'app tourne déjà en mode standalone (installée) */
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

/** Détecte iOS Safari */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

/** Vérifie si le prompt a été fermé récemment */
function wasDismissedRecently(): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

const PWAInstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Ne rien montrer si déjà installé ou fermé récemment
    if (isStandalone() || wasDismissedRecently()) return;

    // iOS : montrer les instructions manuelles
    if (isIOSSafari()) {
      setShowIOSInstructions(true);
      setShowPrompt(true);
      return;
    }

    // Android/Desktop : intercepter le prompt natif
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPromptRef.current) {
      await deferredPromptRef.current.prompt();
      const choice = await deferredPromptRef.current.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      deferredPromptRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* ignore */ }
  }, []);

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 70,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      maxWidth: 400,
      width: 'calc(100% - 32px)',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
      borderRadius: 16,
      padding: '16px 20px',
      boxShadow: '0 8px 32px ${SF.overlayDark}',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: '#fff',
    }}>
      <div style={{ fontSize: 32, lineHeight: 1 }}>🐝</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          {t('pwa.installTitle', 'Installer Zhiive')}
        </div>
        {showIOSInstructions ? (
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            <AppleOutlined /> {t('pwa.iosInstructions', 'Appuyez sur Partager puis "Sur l\'écran d\'accueil"')}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {t('pwa.installDesc', 'Accès rapide, notifications et mode hors-ligne')}
          </div>
        )}
        {!showIOSInstructions && (
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleInstall}
            style={{ marginTop: 8, borderRadius: 8, background: '#fff', color: '#1e3a5f', fontWeight: 600, border: 'none' }}
          >
            {t('pwa.installButton', 'Installer')}
          </Button>
        )}
      </div>
      <CloseOutlined
        onClick={handleDismiss}
        style={{ cursor: 'pointer', fontSize: 14, opacity: 0.7, alignSelf: 'flex-start' }}
      />
    </div>
  );
};

export default PWAInstallPrompt;
