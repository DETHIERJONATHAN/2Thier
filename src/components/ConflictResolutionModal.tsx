/**
 * 🔀 ConflictResolutionModal - Gestion des conflits multi-utilisateurs
 * 
 * Modal qui s'affiche lorsqu'un conflit de version est détecté lors de la
 * sauvegarde d'un devis. Permet de choisir entre :
 * - Votre version (écraser les modifications de l'autre utilisateur)
 * - Leur version (abandonner vos modifications)
 * - Fusion champ par champ (résolution manuelle)
 * 
 * Architecture:
 * - Détection automatique des conflits via baseVersion != currentVersion
 * - Affichage diff champ par champ
 * - Sélection radio pour chaque conflit
 * - Fusion intelligente des valeurs choisies
 */

import React, { useState } from 'react';
import { Modal, Radio, Button, Space, Typography, Divider, Alert, Spin } from 'antd';
import { ExclamationCircleOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export interface ConflictField {
  nodeId: string;
  nodeLabel?: string;
  yourValue: unknown;
  theirValue: unknown;
}

export interface ConflictResolutionModalProps {
  /** Modal visible */
  open: boolean;
  
  /** Liste des champs en conflit */
  conflicts: ConflictField[];
  
  /** Nom/ID de l'utilisateur qui a fait les modifications concurrentes */
  lastEditedBy?: string;
  
  /** Date de la dernière modification */
  lastEditedAt?: string;
  
  /** État de chargement pendant la résolution */
  loading?: boolean;
  
  /** Callback lors de la fermeture (annulation) */
  onCancel: () => void;
  
  /** Callback avec les choix de l'utilisateur */
  onResolve: (resolutions: Record<string, unknown>) => void;
  
  /** Callback pour écraser tout avec votre version */
  onForceOverwrite?: () => void;
  
  /** Callback pour abandonner vos modifications */
  onDiscardYours?: () => void;
}

/**
 * Modal de résolution de conflits avec sélection champ par champ
 */
export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  open,
  conflicts,
  lastEditedBy,
  lastEditedAt,
  loading = false,
  onCancel,
  onResolve,
  onForceOverwrite,
  onDiscardYours
}) => {
  // État: pour chaque nodeId, stocker le choix ('yours' | 'theirs')
  const [resolutions, setResolutions] = useState<Record<string, 'yours' | 'theirs'>>({});

  /**
   * Formater une valeur pour l'affichage
   */
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(vide)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  /**
   * Construire le résultat de la résolution
   */
  const handleSubmitResolution = () => {
    const resolved: Record<string, unknown> = {};
    
    conflicts.forEach(conflict => {
      const choice = resolutions[conflict.nodeId];
      
      if (choice === 'yours') {
        resolved[conflict.nodeId] = conflict.yourValue;
      } else if (choice === 'theirs') {
        resolved[conflict.nodeId] = conflict.theirValue;
      } else {
        // Par défaut, garder votre version si pas de choix explicite
        resolved[conflict.nodeId] = conflict.yourValue;
      }
    });

    onResolve(resolved);
  };

  /**
   * Tout sélectionner à "votre version"
   */
  const selectAllYours = () => {
    const all: Record<string, 'yours' | 'theirs'> = {};
    conflicts.forEach(c => { all[c.nodeId] = 'yours'; });
    setResolutions(all);
  };

  /**
   * Tout sélectionner à "leur version"
   */
  const selectAllTheirs = () => {
    const all: Record<string, 'yours' | 'theirs'> = {};
    conflicts.forEach(c => { all[c.nodeId] = 'theirs'; });
    setResolutions(all);
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />
          <Title level={4} style={{ margin: 0 }}>Conflit détecté</Title>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>,
        onDiscardYours && (
          <Button 
            key="discard" 
            danger 
            onClick={onDiscardYours}
            disabled={loading}
          >
            Abandonner mes modifications
          </Button>
        ),
        onForceOverwrite && (
          <Button 
            key="force" 
            type="primary" 
            danger
            onClick={onForceOverwrite}
            disabled={loading}
          >
            Écraser leurs modifications
          </Button>
        ),
        <Button
          key="resolve"
          type="primary"
          onClick={handleSubmitResolution}
          loading={loading}
          disabled={Object.keys(resolutions).length === 0}
        >
          Enregistrer la fusion
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        <Alert
          type="warning"
          showIcon
          message="Modifications concurrentes détectées"
          description={
            <>
              <Paragraph style={{ marginBottom: 8 }}>
                {lastEditedBy && (
                  <>
                    <UserOutlined /> <strong>{lastEditedBy}</strong> a modifié ce devis
                  </>
                )}
                {lastEditedAt && (
                  <> le <strong>{new Date(lastEditedAt).toLocaleString('fr-FR')}</strong></>
                )}
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                Veuillez choisir quelle version conserver pour chaque champ en conflit.
              </Paragraph>
            </>
          }
          style={{ marginBottom: 16 }}
        />

        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Button size="small" onClick={selectAllYours}>
            Tout sélectionner : Ma version
          </Button>
          <Button size="small" onClick={selectAllTheirs}>
            Tout sélectionner : Leur version
          </Button>
        </Space>

        <Divider orientation="left">Conflits ({conflicts.length})</Divider>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {conflicts.map((conflict, index) => (
            <div 
              key={conflict.nodeId} 
              style={{ 
                padding: 16, 
                border: '1px solid #d9d9d9', 
                borderRadius: 8,
                backgroundColor: resolutions[conflict.nodeId] ? '#f6ffed' : '#fff'
              }}
            >
              <Title level={5} style={{ marginBottom: 8 }}>
                {conflict.nodeLabel || conflict.nodeId}
              </Title>

              <Radio.Group
                value={resolutions[conflict.nodeId]}
                onChange={(e) => setResolutions(prev => ({
                  ...prev,
                  [conflict.nodeId]: e.target.value
                }))}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio value="yours" style={{ width: '100%' }}>
                    <div style={{ marginLeft: 8 }}>
                      <Text strong style={{ color: '#1890ff' }}>🙋 Ma version :</Text>
                      <div 
                        style={{ 
                          marginTop: 4, 
                          padding: 8, 
                          backgroundColor: '#e6f7ff',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 13
                        }}
                      >
                        {formatValue(conflict.yourValue)}
                      </div>
                    </div>
                  </Radio>

                  <Radio value="theirs" style={{ width: '100%' }}>
                    <div style={{ marginLeft: 8 }}>
                      <Text strong style={{ color: '#52c41a' }}>👤 Leur version :</Text>
                      <div 
                        style={{ 
                          marginTop: 4, 
                          padding: 8, 
                          backgroundColor: '#f6ffed',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 13
                        }}
                      >
                        {formatValue(conflict.theirValue)}
                      </div>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>
          ))}
        </Space>

        {conflicts.length === 0 && (
          <Alert
            type="info"
            message="Aucun conflit réel détecté"
            description="Les modifications peuvent être fusionnées automatiquement."
          />
        )}
      </Spin>
    </Modal>
  );
};

export default ConflictResolutionModal;
