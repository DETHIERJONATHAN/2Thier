import { FB } from '../../components/zhiive/ZhiiveTheme';
import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import {
  DownloadOutlined,
  CameraOutlined,
  PrinterOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { logger } from '../../lib/logger';

const useScreenSize = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return { isMobile: w < 768 };
};

const FBCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 20, marginBottom: 16, ...style }}>
    {children}
  </div>
);

const AIMeasureSettings: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        await api.get('/api/settings/ai-measure');
      } catch (error) {
        logger.error('Erreur chargement config IA Mesure:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [api]);

  const downloadMarkerPDF = () => {
    window.open('/printable/metre-a4-v10.pdf', '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: FB.purple,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CameraOutlined style={{ fontSize: 22, color: FB.white }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Configuration IA Mesure</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>
              Paramétrage du marqueur de référence pour la mesure par IA
            </div>
          </div>
        </div>
      </FBCard>

      {/* Marker Config */}
      <FBCard>
        <div style={{ fontSize: 17, fontWeight: 700, color: FB.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          📐 Métré A4 V10 (référence unique)
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
          {/* Left: specs */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Référence unique :</div>
              <div style={{ fontSize: 13, color: FB.textSecondary, lineHeight: 1.8 }}>
                Largeur centres : <strong style={{ color: FB.text }}>13.0 cm</strong> · Hauteur centres : <strong style={{ color: FB.text }}>20.5 cm</strong>
              </div>
              <div style={{ fontSize: 13, color: FB.textSecondary }}>
                Vérifiez la distance centre‑à‑centre haut/bas : <strong style={{ color: FB.text }}>20.5 cm</strong>
              </div>
            </div>

            <div style={{ height: 1, background: FB.border, margin: '14px 0' }} />

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: FB.text, marginBottom: 8 }}>Dimensions calculées :</div>
              {[
                ['Rectangle centres', '13.0 × 20.5 cm'],
                ['Feuille A4', '21.0 × 29.7 cm'],
                ['Tags', '6 tags 5cm + 1 tag 10cm'],
              ].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 13, color: FB.textSecondary }}>
                  <CheckCircleOutlined style={{ color: FB.green, fontSize: 12 }} />
                  {label} : <strong style={{ color: FB.text }}>{val}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Right: download */}
          <div style={{
            minWidth: isMobile ? 'auto' : 260, padding: 20, background: FB.bg,
            borderRadius: FB.radius, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: FB.text, marginBottom: 4 }}>Téléchargement</div>
            <button
              onClick={downloadMarkerPDF}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 6, border: 'none',
                background: FB.blue, color: FB.white, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <DownloadOutlined /> PDF Métré A4 V10
            </button>
            <button
              onClick={downloadMarkerPDF}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 6,
                border: '1px solid ' + FB.border, background: FB.white, color: FB.text,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <PrinterOutlined /> Imprimer
            </button>
          </div>
        </div>
      </FBCard>

      {/* Instructions */}
      <FBCard>
        <div style={{ fontSize: 17, fontWeight: 700, color: FB.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          📖 Instructions d'utilisation
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Téléchargez', 'le PDF Métré A4 V10'],
            ['Imprimez', 'le marqueur à l\'échelle 100% (sans mise à l\'échelle)'],
            ['Vérifiez', 'que la distance centre‑à‑centre haut/bas est bien 20.5 cm'],
            ['Si la taille ne correspond pas,', 'mesurez la distance réelle et réimprimez sans ajustement'],
            ['Collez', 'le marqueur sur un support rigide (carton, aluminium...)'],
          ].map(([bold, rest], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: FB.text }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: FB.blue,
                color: FB.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              <span><strong>{bold}</strong> {rest}</span>
            </div>
          ))}
        </div>
      </FBCard>

      {/* Important notice */}
      <FBCard style={{ background: FB.blue + '08', border: '1px solid ' + FB.blue + '20' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <InfoCircleOutlined style={{ fontSize: 20, color: FB.blue, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: FB.blue, marginBottom: 6 }}>Important</div>
            <div style={{ fontSize: 13, color: FB.text, lineHeight: 1.6 }}>
              La précision des mesures dépend directement de la correspondance entre
              la taille configurée ici et la taille réelle du marqueur imprimé.
              <br />
              Une erreur de 1mm sur un marqueur de 13cm entraîne une erreur de ~0.77% sur toutes les mesures.
            </div>
          </div>
        </div>
      </FBCard>
    </div>
  );
};

export default AIMeasureSettings;
