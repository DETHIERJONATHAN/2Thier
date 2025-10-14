/**
 * 🤝 Composant ConflictResolutionModal
 * 
 * Interface pour résoudre les conflits multi-utilisateurs
 * Affiche les conflits champ par champ et permet de choisir quelle valeur garder
 */

import React, { useState, useEffect } from 'react';
import { Modal, Card, Radio, Space, Button, Alert, Tag, Typography, Divider } from 'antd';
import { ExclamationCircleOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Text, Paragraph } = Typography;

export interface ConflictField {
  nodeId: string;
  fieldLabel?: string;
  yourValue: unknown;
  theirValue: unknown;
}

export interface ConflictResolutionModalProps {
  /**
   * Afficher ou masquer la modal
   */
  visible: boolean;
  
  /**
   * Liste des champs en conflit
   */
  conflicts: ConflictField[];
  
  /**
   * Informations sur le dernier éditeur
   */
  lastEditedBy?: string;
  lastEditedAt?: Date | string;
  
  /**
   * Callback quand l'utilisateur a résolu tous les conflits
   * Reçoit un objet avec les résolutions : { nodeId: 'yours' | 'theirs' | customValue }
   */
  onResolve: (resolutions: Record<string, 'yours' | 'theirs'>) => void;
  
  /**
   * Callback si l'utilisateur annule
   */
  onCancel: () => void;
  
  /**
   * Chargement en cours (lors de la sauvegarde)
   */
  loading?: boolean;
}

/**
 * Formatte une valeur pour l'affichage
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '(vide)';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') {
    // Formater les nombres avec séparateurs
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2
    }).format(value);
  }
  return String(value);
};

/**
 * Obtient une couleur pour différencier les valeurs
 */
const getValueColor = (isYours: boolean): string => {
  return isYours ? 'blue' : 'orange';
};

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  conflicts,
  lastEditedBy = 'Un autre utilisateur',
  lastEditedAt,
  onResolve,
  onCancel,
  loading = false
}) => {
  const [resolutions, setResolutions] = useState<Record<string, 'yours' | 'theirs'>>({});

  // Réinitialiser les résolutions quand la modal s'ouvre
  useEffect(() => {
    if (visible) {
      setResolutions({});
    }
  }, [visible]);

  /**
   * Gère le changement de sélection pour un champ
   */
  const handleResolutionChange = (nodeId: string, choice: 'yours' | 'theirs') => {
    setResolutions(prev => ({
      ...prev,
      [nodeId]: choice
    }));
  };

  /**
   * Vérifie si tous les conflits sont résolus
   */
  const allResolved = conflicts.every(conflict => resolutions[conflict.nodeId]);

  /**
   * Gère la validation
   */
  const handleOk = () => {
    if (!allResolved) {
      Modal.warning({
        title: 'Conflits non résolus',
        content: 'Veuillez résoudre tous les conflits avant de continuer.'
      });
      return;
    }

    onResolve(resolutions);
  };

  /**
   * Sélectionner toutes les valeurs "Vos modifications"
   */
  const selectAllYours = () => {
    const allYours: Record<string, 'yours' | 'theirs'> = {};
    conflicts.forEach(conflict => {
      allYours[conflict.nodeId] = 'yours';
    });
    setResolutions(allYours);
  };

  /**
   * Sélectionner toutes les valeurs "Leurs modifications"
   */
  const selectAllTheirs = () => {
    const allTheirs: Record<string, 'yours' | 'theirs'> = {};
    conflicts.forEach(conflict => {
      allTheirs[conflict.nodeId] = 'theirs';
    });
    setResolutions(allTheirs);
  };

  /**
   * Formatte la date relative
   */
  const formatRelativeTime = (date: Date | string | undefined): string => {
    if (!date) return 'récemment';
    return dayjs(date).fromNow();
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />
          <span>Conflits de modifications détectés</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="✅ Résoudre et enregistrer"
      cancelText="❌ Annuler"
      width={800}
      okButtonProps={{
        disabled: !allResolved || loading,
        loading
      }}
      cancelButtonProps={{
        disabled: loading
      }}
      maskClosable={false}
      keyboard={false}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Alerte d'information */}
        <Alert
          type="warning"
          showIcon
          message="Un autre utilisateur a modifié ce devis"
          description={
            <div>
              <p>
                <UserOutlined /> <strong>{lastEditedBy}</strong> a effectué des modifications{' '}
                <ClockCircleOutlined /> {formatRelativeTime(lastEditedAt)}
              </p>
              <p style={{ marginBottom: 0 }}>
                Veuillez choisir quelles valeurs conserver pour chaque champ en conflit.
              </p>
            </div>
          }
        />

        {/* Boutons de sélection rapide */}
        <Space>
          <Button onClick={selectAllYours} size="small">
            Tout sélectionner : Mes valeurs
          </Button>
          <Button onClick={selectAllTheirs} size="small">
            Tout sélectionner : Leurs valeurs
          </Button>
        </Space>

        {/* Statistiques */}
        <div>
          <Text type="secondary">
            {Object.keys(resolutions).length} / {conflicts.length} conflits résolus
          </Text>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Liste des conflits */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {conflicts.map((conflict, index) => (
              <Card
                key={conflict.nodeId}
                size="small"
                title={
                  <Space>
                    <Tag color="default">#{index + 1}</Tag>
                    <span>{conflict.fieldLabel || conflict.nodeId}</span>
                    {resolutions[conflict.nodeId] && (
                      <Tag color="success">✓ Résolu</Tag>
                    )}
                  </Space>
                }
                style={{
                  borderColor: resolutions[conflict.nodeId] ? '#52c41a' : '#faad14'
                }}
              >
                <Radio.Group
                  value={resolutions[conflict.nodeId]}
                  onChange={(e) => handleResolutionChange(conflict.nodeId, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Radio value="yours">
                      <Space>
                        <Tag color={getValueColor(true)}>Votre valeur</Tag>
                        <Text strong>{formatValue(conflict.yourValue)}</Text>
                      </Space>
                    </Radio>
                    
                    <Radio value="theirs">
                      <Space>
                        <Tag color={getValueColor(false)}>Leur valeur</Tag>
                        <Text strong>{formatValue(conflict.theirValue)}</Text>
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>

                {/* Différence visuelle */}
                {conflict.yourValue !== conflict.theirValue && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatValue(conflict.yourValue)} → {formatValue(conflict.theirValue)}
                    </Text>
                  </div>
                )}
              </Card>
            ))}
          </Space>
        </div>
      </Space>
    </Modal>
  );
};

export default ConflictResolutionModal;
