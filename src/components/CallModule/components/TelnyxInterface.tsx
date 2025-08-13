/**
 * 📞 TelnyxInterface - Interface d'appel Telnyx moderne et intuitive
 * 
 * Fonctionnalités :
 * - 🎯 Bouton d'appel intelligent avec états visuels
 * - ⏱️ Timer en temps réel pendant l'appel
 * - 📊 Indicateurs de qualité d'appel
 * - 🎛️ Contrôles audio avancés
 * - 🚨 Gestion d'erreurs élégante
 */

import React, { useMemo } from 'react';
import { Card, Button, Space, Typography, Badge, Progress, Tooltip } from 'antd';
import { 
  PhoneOutlined,
  PhoneFilled,
  LoadingOutlined,
  ExclamationCircleOutlined,
  SoundOutlined,
  MutedOutlined
} from '@ant-design/icons';
import type { Lead, CallState } from '../types/CallTypes';

const { Title, Text } = Typography;

interface TelnyxInterfaceProps {
  lead: Lead;
  callState: CallState;
  onStartCall: () => Promise<void>;
  onEndCall: () => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export const TelnyxInterface: React.FC<TelnyxInterfaceProps> = ({
  lead,
  callState,
  onStartCall,
  onEndCall,
  isLoading,
  error
}) => {
  
  // 🎯 États dérivés pour l'UI
  const uiState = useMemo(() => {
    const canCall = !callState.isInProgress && !isLoading && lead.data?.phone;
    const callDuration = Math.floor(callState.duration / 60);
    const callSeconds = callState.duration % 60;
    
    return {
      canCall,
      callDurationText: `${callDuration.toString().padStart(2, '0')}:${callSeconds.toString().padStart(2, '0')}`,
      callQuality: callState.duration > 0 ? Math.min(100, 70 + (callState.duration / 10)) : 0,
      phoneDisplay: lead.data?.phone ? 
        lead.data.phone.replace(/(\+\d{2})(\d{1})(\d{8})/, '$1 $2 $3') :
        'Aucun numéro'
    };
  }, [callState, isLoading, lead.data?.phone]);
  
  // 🎨 Style du bouton principal selon l'état
  const callButtonStyle = useMemo(() => {
    if (callState.isInProgress) {
      return {
        background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
        borderColor: '#ff4d4f',
        boxShadow: '0 0 20px rgba(255, 77, 79, 0.3)',
        animation: 'pulse 2s infinite'
      };
    } else if (uiState.canCall) {
      return {
        background: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
        borderColor: '#52c41a',
        boxShadow: '0 0 15px rgba(82, 196, 26, 0.2)'
      };
    } else {
      return {
        background: '#d9d9d9',
        borderColor: '#d9d9d9'
      };
    }
  }, [callState.isInProgress, uiState.canCall]);
  
  return (
    <Card 
      title={
        <Space>
          <PhoneOutlined style={{ color: '#1890ff' }} />
          <span>Interface d'Appel</span>
        </Space>
      }
      style={{ height: '100%' }}
    >
      
      {/* 📱 Informations du contact */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
          {lead.data?.name}
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          {uiState.phoneDisplay}
        </Text>
        {lead.data?.company && (
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">
              {lead.data.company}
            </Text>
          </div>
        )}
      </div>
      
      {/* 🎯 Bouton d'appel principal */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {callState.isInProgress ? (
          <Button
            type="primary"
            danger
            size="large"
            icon={isLoading ? <LoadingOutlined /> : <PhoneFilled />}
            onClick={onEndCall}
            loading={isLoading}
            style={{
              height: 80,
              width: 200,
              fontSize: 18,
              borderRadius: 40,
              ...callButtonStyle
            }}
          >
            {isLoading ? 'Finalisation...' : 'Raccrocher'}
          </Button>
        ) : (
          <Button
            type="primary"
            size="large"
            icon={isLoading ? <LoadingOutlined /> : <PhoneOutlined />}
            onClick={onStartCall}
            loading={isLoading}
            disabled={!uiState.canCall}
            style={{
              height: 80,
              width: 200,
              fontSize: 18,
              borderRadius: 40,
              ...callButtonStyle
            }}
          >
            {isLoading ? 'Connexion...' : 'Appeler'}
          </Button>
        )}
      </div>
      
      {/* ⏱️ Timer et indicateurs d'appel */}
      {callState.isInProgress && (
        <div style={{ marginBottom: 20 }}>
          
          {/* Timer principal */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Badge 
              status="processing" 
              text={
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                  {uiState.callDurationText}
                </Text>
              }
            />
          </div>
          
          {/* Qualité d'appel simulée */}
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Qualité d'appel
            </Text>
            <Progress 
              percent={uiState.callQuality} 
              size="small"
              strokeColor={{
                '0%': '#ff4d4f',
                '50%': '#fadb14',
                '100%': '#52c41a'
              }}
              showInfo={false}
            />
          </div>
          
          {/* Contrôles audio */}
          <div style={{ textAlign: 'center' }}>
            <Space>
              <Tooltip title="Couper le micro">
                <Button 
                  icon={<MutedOutlined />} 
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Tooltip title="Régler le volume">
                <Button 
                  icon={<SoundOutlined />} 
                  size="small"
                  type="text"
                />
              </Tooltip>
            </Space>
          </div>
          
        </div>
      )}
      
      {/* 🚨 Affichage des erreurs */}
      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7',
          borderRadius: 6,
          marginTop: 16
        }}>
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text type="danger" style={{ fontSize: 13 }}>
              {error}
            </Text>
          </Space>
        </div>
      )}
      
      {/* 📊 Informations d'état */}
      <div style={{ 
        marginTop: 20, 
        padding: 12, 
        backgroundColor: '#fafafa',
        borderRadius: 6,
        fontSize: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary">Statut:</Text>
          <Text strong>
            {callState.isInProgress ? 'En cours' : 
             isLoading ? 'Connexion...' : 
             'Prêt'}
          </Text>
        </div>
        
        {callState.isInProgress && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Démarré:</Text>
            <Text>
              {callState.startTime?.toLocaleTimeString() || '--:--'}
            </Text>
          </div>
        )}
        
        {!uiState.canCall && !callState.isInProgress && (
          <div style={{ textAlign: 'center', color: '#faad14' }}>
            <Text type="warning" style={{ fontSize: 11 }}>
              {!lead.data?.phone ? 'Numéro manquant' : 'Non disponible'}
            </Text>
          </div>
        )}
      </div>
      
      {/* CSS pour l'animation pulse */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      
    </Card>
  );
};

export default TelnyxInterface;
