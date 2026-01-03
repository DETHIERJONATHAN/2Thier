/**
 * 🎯 RealTimeGuidanceOverlay - Overlay affichant le guide temps réel
 * 
 * Affiche visuellement les conseils de l'IA pendant la capture:
 * - Barres de score (visibilité, centrage, éclairage, netteté, perspective)
 * - Message principal
 * - Bouton de capture (vert si prêt, grisé sinon)
 */

import React from 'react';
import { Progress, Space, Typography, Tag, Button } from 'antd';
import { 
  CameraOutlined, 
  LoadingOutlined,
  EyeOutlined,
  AimOutlined,
  BulbOutlined,
  ZoomInOutlined,
  SwapOutlined
} from '@ant-design/icons';
import type { GuidanceState } from './useRealTimeGuidance';

const { Text } = Typography;

interface RealTimeGuidanceOverlayProps {
  guidance: GuidanceState;
  onCapture: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const scoreIcons: Record<string, React.ReactNode> = {
  visibility: <EyeOutlined />,
  centering: <AimOutlined />,
  lighting: <BulbOutlined />,
  sharpness: <ZoomInOutlined />,
  perspective: <SwapOutlined />
};

const scoreLabels: Record<string, string> = {
  visibility: 'Visible',
  centering: 'Centré',
  lighting: 'Éclairage',
  sharpness: 'Netteté',
  perspective: 'Angle'
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
};

export const RealTimeGuidanceOverlay: React.FC<RealTimeGuidanceOverlayProps> = ({
  guidance,
  onCapture,
  disabled = false,
  compact = false
}) => {
  const avgScore = Object.values(guidance.scores).reduce((a, b) => a + b, 0) / 5;

  if (compact) {
    // Version compacte pour petit écran
    return (
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        padding: '16px 12px',
        color: 'white'
      }}>
        {/* Message principal */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 12,
          fontSize: 16,
          fontWeight: 'bold'
        }}>
          {guidance.isAnalyzing ? (
            <Space>
              <LoadingOutlined spin />
              Analyse...
            </Space>
          ) : guidance.message}
        </div>

        {/* Scores compacts en ligne */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          marginBottom: 12 
        }}>
          {Object.entries(guidance.scores).map(([key, score]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ color: getScoreColor(score), fontSize: 20 }}>
                {scoreIcons[key]}
              </div>
              <Progress
                type="circle"
                percent={score}
                size={30}
                strokeColor={getScoreColor(score)}
                format={() => ''}
              />
            </div>
          ))}
        </div>

        {/* Bouton capture */}
        <Button
          type="primary"
          size="large"
          block
          icon={<CameraOutlined />}
          onClick={onCapture}
          disabled={disabled || !guidance.canCapture}
          style={{
            background: guidance.canCapture ? '#52c41a' : '#ff4d4f',
            borderColor: guidance.canCapture ? '#52c41a' : '#ff4d4f',
            height: 50,
            fontSize: 18
          }}
        >
          {guidance.canCapture ? '📸 CAPTURER' : '⏳ Attendez...'}
        </Button>
      </div>
    );
  }

  // Version complète
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
      padding: '24px 16px',
      color: 'white',
      borderRadius: '12px 12px 0 0'
    }}>
      {/* Message principal */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 16,
        fontSize: 18,
        fontWeight: 'bold',
        color: guidance.canCapture ? '#52c41a' : '#faad14'
      }}>
        {guidance.isAnalyzing ? (
          <Space>
            <LoadingOutlined spin />
            <span>L'IA analyse la frame...</span>
          </Space>
        ) : guidance.message}
      </div>

      {/* Scores détaillés */}
      <div style={{ marginBottom: 16 }}>
        {Object.entries(guidance.scores).map(([key, score]) => (
          <div key={key} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 6 
          }}>
            <span style={{ width: 30, color: getScoreColor(score) }}>
              {scoreIcons[key]}
            </span>
            <span style={{ width: 80, fontSize: 12 }}>
              {scoreLabels[key]}
            </span>
            <Progress
              percent={score}
              size="small"
              strokeColor={getScoreColor(score)}
              style={{ flex: 1, margin: '0 8px' }}
              format={() => `${score}%`}
            />
          </div>
        ))}
      </div>

      {/* Problèmes détectés */}
      {guidance.issues.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            {guidance.issues.map((issue, idx) => (
              <Tag key={idx} color="red">{issue}</Tag>
            ))}
          </Space>
        </div>
      )}

      {/* Suggestions */}
      {guidance.suggestions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            {guidance.suggestions.map((suggestion, idx) => (
              <Tag key={idx} color="blue">{suggestion}</Tag>
            ))}
          </Space>
        </div>
      )}

      {/* Score global et bouton */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16 
      }}>
        <div style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={Math.round(avgScore)}
            size={60}
            strokeColor={getScoreColor(avgScore)}
            format={percent => (
              <span style={{ color: 'white', fontSize: 16 }}>{percent}%</span>
            )}
          />
          <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>
            Score global
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<CameraOutlined />}
          onClick={onCapture}
          disabled={disabled || !guidance.canCapture}
          style={{
            flex: 1,
            height: 60,
            fontSize: 18,
            background: guidance.canCapture ? '#52c41a' : '#ff4d4f',
            borderColor: guidance.canCapture ? '#52c41a' : '#ff4d4f'
          }}
        >
          {guidance.canCapture ? '📸 CAPTURER MAINTENANT' : '⏳ Ajustez la position'}
        </Button>
      </div>
    </div>
  );
};

export default RealTimeGuidanceOverlay;
