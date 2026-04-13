import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { SF } from './zhiive/ZhiiveTheme';

const CONSENT_KEY = 'zhiive_cookie_consent';

type ConsentChoice = 'all' | 'essential' | null;

function getStoredConsent(): ConsentChoice {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'all' || stored === 'essential') return stored;
  } catch (_e) { /* intentionally empty */ }
  return null;
}

/**
 * 🍪 GDPR Cookie Consent Banner
 * Displays once until user accepts/declines. Choice stored in localStorage.
 */
const CookieConsentBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      // Small delay so it doesn't flash on fast-loading pages
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = useCallback((choice: 'all' | 'essential') => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch (_e) { /* intentionally empty */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: SF.cardBg,
        borderTop: `1px solid ${SF.border}`,
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ flex: 1, minWidth: 250, color: SF.text, fontSize: 14 }}>
        {t('gdpr.cookieBannerText', 'Ce site utilise des cookies essentiels au fonctionnement et des cookies analytiques pour améliorer votre expérience.')}
        {' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: SF.primary, textDecoration: 'underline' }}
        >
          {t('gdpr.privacyPolicy', 'Politique de confidentialité')}
        </a>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button
          size="small"
          onClick={() => handleAccept('essential')}
          style={{ borderColor: SF.border, color: SF.textSecondary }}
        >
          {t('gdpr.essentialOnly', 'Essentiels uniquement')}
        </Button>
        <Button
          type="primary"
          size="small"
          onClick={() => handleAccept('all')}
          style={{ background: SF.primary }}
        >
          {t('gdpr.acceptAll', 'Tout accepter')}
        </Button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
