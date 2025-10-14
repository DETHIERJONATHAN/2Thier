/**
 * 💾 DraftStatusIndicator - Indicateur visuel d'état de sauvegarde
 * 
 * Composant qui affiche l'état actuel du brouillon :
 * - ✅ Enregistré
 * - ⏳ Enregistrement en cours...
 * - ⚠️ Non enregistré
 * - 🔄 Prévisualisation...
 * 
 * Usage:
 * ```tsx
 * const { dirty, loading, committing } = useTblSubmission(...);
 * 
 * <DraftStatusIndicator 
 *   dirty={dirty}
 *   loading={committing}
 *   previewing={false}
 * />
 * ```
 */

import React from 'react';
import { Badge, Spin, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  LoadingOutlined,
  SyncOutlined
} from '@ant-design/icons';

export interface DraftStatusIndicatorProps {
  /** Modifications non sauvegardées */
  dirty?: boolean;
  
  /** Sauvegarde en cours */
  loading?: boolean;
  
  /** Prévisualisation en cours */
  previewing?: boolean;
  
  /** Message personnalisé */
  customMessage?: string;
  
  /** Affichage compact (badge seulement) */
  compact?: boolean;
  
  /** Style personnalisé */
  style?: React.CSSProperties;
}

/**
 * Composant d'indicateur de statut
 */
export const DraftStatusIndicator: React.FC<DraftStatusIndicatorProps> = ({
  dirty = false,
  loading = false,
  previewing = false,
  customMessage,
  compact = false,
  style
}) => {
  // Déterminer l'état actuel
  const getStatus = () => {
    if (loading) {
      return {
        icon: <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />,
        text: 'Enregistrement...',
        color: '#1890ff',
        badgeStatus: 'processing' as const
      };
    }
    
    if (previewing) {
      return {
        icon: <SyncOutlined spin style={{ fontSize: 14, color: '#1890ff' }} />,
        text: 'Prévisualisation...',
        color: '#1890ff',
        badgeStatus: 'processing' as const
      };
    }
    
    if (dirty) {
      return {
        icon: <ExclamationCircleOutlined style={{ fontSize: 14, color: '#faad14' }} />,
        text: 'Non enregistré',
        color: '#faad14',
        badgeStatus: 'warning' as const
      };
    }
    
    return {
      icon: <CheckCircleOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
      text: 'Enregistré',
      color: '#52c41a',
      badgeStatus: 'success' as const
    };
  };

  const status = getStatus();
  const displayText = customMessage || status.text;

  // Mode compact : badge seulement
  if (compact) {
    return (
      <Tooltip title={displayText}>
        <Badge status={status.badgeStatus} style={style} />
      </Tooltip>
    );
  }

  // Mode normal : badge + texte + icône
  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 8,
        padding: '4px 12px',
        borderRadius: 4,
        backgroundColor: '#fafafa',
        border: `1px solid ${status.color}20`,
        ...style 
      }}
    >
      {status.icon}
      <span style={{ fontSize: 13, color: status.color, fontWeight: 500 }}>
        {displayText}
      </span>
    </div>
  );
};

/**
 * Variante avec compte à rebours avant expiration
 */
export const DraftExpiryIndicator: React.FC<{
  expiresAt?: Date | string;
  onExpired?: () => void;
  style?: React.CSSProperties;
}> = ({ expiresAt, onExpired, style }) => {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expiré');
        onExpired?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`Expire dans ${hours}h ${minutes}min`);
      } else if (minutes > 5) {
        setTimeLeft(`Expire dans ${minutes}min`);
      } else {
        setTimeLeft(`⚠️ Expire dans ${minutes}min`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (!expiresAt || !timeLeft) return null;

  const isWarning = timeLeft.includes('⚠️');

  return (
    <Tooltip title="Les brouillons expirent automatiquement après 24h d'inactivité">
      <div 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: 4,
          backgroundColor: isWarning ? '#fff7e6' : '#f0f0f0',
          border: `1px solid ${isWarning ? '#ffa940' : '#d9d9d9'}`,
          fontSize: 12,
          color: isWarning ? '#fa8c16' : '#595959',
          ...style 
        }}
      >
        ⏰ {timeLeft}
      </div>
    </Tooltip>
  );
};

export default DraftStatusIndicator;
