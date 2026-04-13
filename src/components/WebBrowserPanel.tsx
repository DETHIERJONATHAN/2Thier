import React, { useState, useRef, useCallback } from 'react';
import { Tooltip } from 'antd';
import {
  ArrowLeftOutlined, ReloadOutlined, CloseOutlined,
  GlobalOutlined, ExportOutlined, LinkOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { SF } from './zhiive/ZhiiveTheme';
import { useTranslation } from 'react-i18next';

interface WebBrowserPanelProps {
  url: string;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

/**
 * In-app web browser panel — displays web pages within an iframe,
 * using the backend proxy to bypass X-Frame-Options restrictions.
 */
const WebBrowserPanel: React.FC<WebBrowserPanelProps> = ({ url, onClose }) => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Build proxied URL for the iframe
  const proxyUrl = `/api/search/browse-proxy?url=${encodeURIComponent(url)}`;

  // Extract domain for display
  const displayDomain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setLoadError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setLoadError(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      iframeRef.current.src = proxyUrl;
    }
  }, [proxyUrl]);

  const handleOpenExternal = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#fff',
      borderRadius: SF.radius,
      overflow: 'hidden',
    }}>
      {/* ── Browser Toolbar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'linear-gradient(135deg, #0B0E2A 0%, #1a1e4e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Back / Close */}
        <Tooltip title={t('common.close')}>
          <div
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeftOutlined style={{ fontSize: 14 }} />
          </div>
        </Tooltip>

        {/* Refresh */}
        <Tooltip title={t('common.refresh')}>
          <div
            onClick={handleRefresh}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {isLoading ? <LoadingOutlined style={{ fontSize: 13 }} /> : <ReloadOutlined style={{ fontSize: 13 }} />}
          </div>
        </Tooltip>

        {/* URL bar */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '4px 12px',
          minWidth: 0,
        }}>
          <GlobalOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
          <span style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.75)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayDomain}
          </span>
          <LinkOutlined
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => navigator.clipboard?.writeText(url)}
          />
        </div>

        {/* Open in new tab */}
        <Tooltip title="Ouvrir dans un nouvel onglet">
          <div
            onClick={handleOpenExternal}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ExportOutlined style={{ fontSize: 13 }} />
          </div>
        </Tooltip>

        {/* Close */}
        <Tooltip title={t('common.close')}>
          <div
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,0,0,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <CloseOutlined style={{ fontSize: 12 }} />
          </div>
        </Tooltip>
      </div>

      {/* ── Loading bar ── */}
      {isLoading && (
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${SF.primary}, transparent)`,
          animation: 'browseLoading 1.5s ease-in-out infinite',
        }} />
      )}

      {/* ── Error state ── */}
      {loadError && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 32,
          color: SF.textSecondary,
        }}>
          <GlobalOutlined style={{ fontSize: 48, color: SF.textMuted }} />
          <div style={{ fontSize: 15, fontWeight: 500 }}>Impossible de charger cette page</div>
          <div style={{ fontSize: 12, color: SF.textMuted, textAlign: 'center' }}>
            {displayDomain}
          </div>
          <div
            onClick={handleOpenExternal}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              borderRadius: 20,
              background: SF.primary,
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Ouvrir dans un nouvel onglet
          </div>
        </div>
      )}

      {/* ── Iframe ── */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title={displayDomain}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          display: loadError ? 'none' : 'block',
          background: '#fff',
        }}
      />

      {/* Loading animation keyframes */}
      <style>{`
        @keyframes browseLoading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default WebBrowserPanel;
