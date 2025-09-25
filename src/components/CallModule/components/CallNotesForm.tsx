/**
 * 📝 CallNotesForm - Formulaire de notes d'appel
 * 
 * Fonctionnalités :
 * - 📋 Saisie notes d'appel
 * - 🎯 Sélection statut d'appel
 * - ✅ Validation et sauvegarde
 * - 📊 Indicateurs visuels
 */

import React, { useCallback } from 'react';
import { Card, Form, Input, Select, Button, Space, Typography, Alert, Tooltip } from 'antd';
import { 
  SaveOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { CallState } from '../types/CallTypes';
import { useCallStatuses } from '../hooks/useCallStatuses';
import { CALL_STATUS_ICONS } from '../../../constants/statusIcons';
import { CALL_STATUSES } from '../../../constants/callStatuses';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

interface CallNotesFormProps {
  callState: CallState;
  onUpdateNotes: (notes: string) => void;
  onUpdateStatus: (status: string) => void;
  onEndCall: () => Promise<void>;
  isLoading: boolean;
  canSave: boolean;
  className?: string;
}

export const CallNotesForm: React.FC<CallNotesFormProps> = ({
  callState,
  onUpdateNotes,
  onUpdateStatus,
  onEndCall,
  isLoading,
  canSave,
  className
}) => {

  // 🎯 Hook pour récupérer les statuts d'appel depuis les paramètres
  const { 
    callStatuses, 
    loading: statusesLoading, 
    error: statusesError, 
    hasStatuses 
  } = useCallStatuses();

  // 📝 Gestion changement notes
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNotes(e.target.value);
  }, [onUpdateNotes]);

  // 🎯 Gestion changement statut
  const handleStatusChange = useCallback((statusValue: string) => {
    // 🔎 On retrouve l'objet statut sélectionné
    const selected = callStatuses.find(s => s.value === statusValue);

    const normalize = (str: string) => str
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (selected) {
      const nameNorm = normalize(selected.name);
      const rdvNorm = normalize('rdv fixé');
      // 🗓️ Si le nom correspond à RDV fixé (peu importe accents/casse), on force la valeur canonique
      if (nameNorm === rdvNorm || nameNorm.includes('rdvfixe')) {
        onUpdateStatus(CALL_STATUSES.MEETING_SCHEDULED);
        return;
      }
    }
    onUpdateStatus(statusValue);
  }, [onUpdateStatus, callStatuses]);

  // 💾 Finaliser l'appel
  const handleEndCall = useCallback(async () => {
    if (canSave) {
      await onEndCall();
    }
  }, [onEndCall, canSave]);

  // 🎨 Couleur du statut sélectionné
  const selectedStatusInfo = callStatuses.find(s => s.value === callState.status);

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Notes d'Appel</span>
          {callState.isInProgress && (
            <Text type="secondary">(En cours...)</Text>
          )}
        </Space>
      }
      className={className}
      extra={
        callState.isInProgress && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Durée: {Math.floor(callState.duration / 60)}:{(callState.duration % 60).toString().padStart(2, '0')}
          </Text>
        )
      }
    >
      
      {/* 🚨 Alerte si aucun statut configuré */}
      {!hasStatuses && !statusesLoading && (
        <Alert
          message="Aucun statut d'appel configuré"
          description={
            <div>
              <p>Vous devez configurer les statuts d'appel dans les paramètres avant de pouvoir finaliser cet appel.</p>
              <p>Allez dans <strong>Paramètres → Mapping Statuts</strong> pour créer vos statuts d'appel.</p>
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 🚨 Erreur de chargement des statuts */}
      {statusesError && (
        <Alert
          message="Erreur de chargement des statuts"
          description={statusesError}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 🚨 Validation formulaire */}
      {!callState.isFormValid && callState.status && (
        <Alert
          message="Formulaire incomplet"
          description="Veuillez remplir au moins les notes ou sélectionner un statut pour terminer l'appel."
          type="warning"
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Form layout="vertical" style={{ height: '100%' }}>
        
        {/* 🎯 Statut de l'appel */}
        <Form.Item
          label={
            <Space>
              <CheckCircleOutlined />
              <span>Statut de l'appel</span>
            </Space>
          }
        >
          <Select
            placeholder={
              statusesLoading 
                ? "Chargement des statuts..." 
                : !hasStatuses 
                  ? "Aucun statut configuré - Voir paramètres"
                  : "Sélectionner le résultat de l'appel"
            }
            value={callState.status || undefined}
            onChange={handleStatusChange}
            size="large"
            style={{ width: '100%' }}
            optionLabelProp="label"
            loading={statusesLoading}
            disabled={!hasStatuses}
            notFoundContent={
              !hasStatuses ? "Aucun statut configuré" : "Aucun statut trouvé"
            }
          >
            {callStatuses.map(status => (
              <Option 
                key={status.value} 
                value={status.value}
                label={
                  <Space>
                    {CALL_STATUS_ICONS[status.name as keyof typeof CALL_STATUS_ICONS] || '📞'}
                    {status.name}
                  </Space>
                }
              >
                <Tooltip 
                  title={
                    <div>
                      <div>{status.data?.description}</div>
                      {status.data?.tooltip && (
                        <div style={{ marginTop: 4, fontSize: '12px', color: '#8c8c8c' }}>
                          {status.data.tooltip}
                        </div>
                      )}
                    </div>
                  }
                >
                  <Space>
                    <span style={{ fontSize: '18px' }}>
                      {CALL_STATUS_ICONS[status.name as keyof typeof CALL_STATUS_ICONS] || '📞'}
                    </span>
                    <span>{status.name}</span>
                    <div 
                      style={{ 
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: status.color,
                        marginLeft: 4
                      }} 
                    />
                  </Space>
                </Tooltip>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 📝 Notes de l'appel */}
        <Form.Item
          label={
            <Space>
              <ExclamationCircleOutlined />
              <span>Notes de l'appel</span>
            </Space>
          }
        >
          <TextArea
            placeholder="Saisissez vos notes sur cet appel..."
            value={callState.notes}
            onChange={handleNotesChange}
            rows={6}
            maxLength={1000}
            showCount
            style={{ 
              resize: 'none',
              fontSize: 14
            }}
          />
        </Form.Item>

        {/* 💾 Actions */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            
            {/* Info validation */}
            <div>
              {canSave ? (
                <Text type="success" style={{ fontSize: 12 }}>
                  ✅ Prêt à sauvegarder
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ⏳ Saisie en cours...
                </Text>
              )}
            </div>

            {/* Bouton terminer appel */}
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleEndCall}
              loading={isLoading}
              disabled={!canSave}
              style={{
                backgroundColor: canSave ? '#52c41a' : undefined,
                borderColor: canSave ? '#52c41a' : undefined
              }}
            >
              {callState.isInProgress ? 'Terminer l\'appel' : 'Sauvegarder'}
            </Button>
            
          </Space>
        </Form.Item>

      </Form>

      {/* 📊 Résumé rapide */}
      {(callState.notes || callState.status) && (
        <div style={{ 
          marginTop: 20, 
          padding: 12, 
          backgroundColor: '#f6ffed', 
          borderRadius: 6,
          border: '1px solid #b7eb8f'
        }}>
          <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#389e0d' }}>
            📋 Résumé
          </Title>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            {callState.status && (
              <div>
                <Text strong>Statut: </Text>
                <Space>
                  <span style={{ fontSize: '16px' }}>
                    {selectedStatusInfo?.name && CALL_STATUS_ICONS[selectedStatusInfo.name as keyof typeof CALL_STATUS_ICONS] || '📞'}
                  </span>
                  <Text style={{ color: selectedStatusInfo?.color }}>
                    {selectedStatusInfo?.name || callState.status}
                  </Text>
                  <div 
                    style={{ 
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: selectedStatusInfo?.color,
                      display: 'inline-block',
                      marginLeft: 4
                    }} 
                  />
                </Space>
              </div>
            )}
            
            {callState.notes && (
              <div>
                <Text strong>Notes: </Text>
                <Text type="secondary">
                  {callState.notes.length > 50 
                    ? `${callState.notes.substring(0, 50)}...` 
                    : callState.notes
                  }
                </Text>
              </div>
            )}
            
            {callState.duration > 0 && (
              <div>
                <Text strong>Durée: </Text>
                <Text type="secondary">
                  {Math.floor(callState.duration / 60)} min {callState.duration % 60} sec
                </Text>
              </div>
            )}
          </Space>
        </div>
      )}

    </Card>
  );
};

export default CallNotesForm;
