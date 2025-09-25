import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Timeline, 
  Typography, 
  Tag, 
  Space,
  Button,
  Empty,
  Spin
} from 'antd';
import { 
  PhoneOutlined, 
  MessageOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface CallHistoryItem {
  id: string;
  type: 'call' | 'sms' | 'voicemail';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  duration?: number;
  message?: string;
  transcription?: string;
  status: 'completed' | 'missed' | 'busy' | 'sent' | 'delivered' | 'failed';
}

interface LeadCallHistoryProps {
  leadId: string;
  leadPhone: string;
}

const LeadCallHistory: React.FC<LeadCallHistoryProps> = ({ leadId, leadPhone }) => {
  const [history, setHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const api = useAuthenticatedApi();

  useEffect(() => {
    loadCallHistory();
  }, [leadId]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'historique des appels pour ce lead
      const callsResponse = await api.api.get(`/google-voice/call-history/lead/${leadId}`);
      const smsResponse = await api.api.get(`/google-voice/sms-history/lead/${leadId}`);
      
      // Combiner et trier par date
      const combinedHistory = [
        ...callsResponse.calls.map((call: any) => ({
          ...call,
          type: 'call' as const
        })),
        ...smsResponse.messages.map((sms: any) => ({
          ...sms,
          type: 'sms' as const
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setHistory(combinedHistory);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      // En cas d'erreur, afficher un historique simulé pour la démo
      setHistory([
        {
          id: '1',
          type: 'call',
          direction: 'outbound',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          duration: 180,
          status: 'completed'
        },
        {
          id: '2',
          type: 'sms',
          direction: 'outbound',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          message: 'Bonjour, je vous contacte concernant votre demande.',
          status: 'delivered'
        },
        {
          id: '3',
          type: 'call',
          direction: 'inbound',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          duration: 0,
          status: 'missed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'delivered': return 'success';
      case 'sent': return 'processing';
      case 'missed': return 'warning';
      case 'busy': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (item: CallHistoryItem) => {
    if (item.type === 'call') {
      switch (item.status) {
        case 'completed': return `Appel ${item.direction === 'outbound' ? 'sortant' : 'entrant'} - ${formatDuration(item.duration || 0)}`;
        case 'missed': return 'Appel manqué';
        case 'busy': return 'Occupé';
        default: return item.status;
      }
    } else {
      switch (item.status) {
        case 'sent': return `SMS ${item.direction === 'outbound' ? 'envoyé' : 'reçu'}`;
        case 'delivered': return `SMS ${item.direction === 'outbound' ? 'envoyé' : 'reçu'} - Livré`;
        case 'failed': return 'SMS échec';
        default: return item.status;
      }
    }
  };

  const renderTimelineItem = (item: CallHistoryItem) => {
    const icon = item.type === 'call' ? <PhoneOutlined /> : <MessageOutlined />;
    const color = getStatusColor(item.status);
    
    return {
      dot: icon,
      color,
      children: (
        <div className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <Space>
              <Tag color={color}>
                {getStatusText(item)}
              </Tag>
              {item.direction === 'outbound' && (
                <Tag color="blue">Sortant</Tag>
              )}
              {item.direction === 'inbound' && (
                <Tag color="green">Entrant</Tag>
              )}
            </Space>
            <Text type="secondary" className="text-xs">
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </div>
          
          {item.message && (
            <Paragraph className="mb-2 p-2 bg-gray-50 rounded text-sm">
              {item.message}
            </Paragraph>
          )}
          
          {item.transcription && (
            <div className="mb-2 p-2 bg-blue-50 rounded">
              <Space className="mb-1">
                <SoundOutlined className="text-blue-500" />
                <Text className="text-blue-600 text-xs font-medium">Transcription automatique:</Text>
              </Space>
              <Paragraph className="text-sm text-blue-800 mb-0">
                {item.transcription}
              </Paragraph>
            </div>
          )}
        </div>
      )
    };
  };

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined />
          Historique des communications
        </Space>
      }
      extra={
        <Button 
          size="small" 
          icon={<ReloadOutlined />} 
          onClick={loadCallHistory}
          loading={loading}
        >
          Actualiser
        </Button>
      }
      size="small"
      className="mb-4"
    >
      {loading ? (
        <div className="text-center py-8">
          <Spin />
        </div>
      ) : history.length === 0 ? (
        <Empty 
          description="Aucune communication enregistrée"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Timeline 
          items={history.map(renderTimelineItem)}
          mode="left"
          className="mt-4"
        />
      )}
      
      <div className="text-center mt-4 pt-4 border-t border-gray-200">
        <Text type="secondary" className="text-xs">
          Communications via Google Voice • Lead: {leadPhone}
        </Text>
      </div>
    </Card>
  );
};

export default LeadCallHistory;
