import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Tag, Empty, Typography, Input, Button, message, Timeline } from 'antd';
import { HistoryOutlined, SendOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Text } = Typography;

interface HistoryEntry {
  id: string;
  chantierId: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  userId?: string | null;
  data?: any;
  createdAt: string;
  User?: { id: string; firstName: string; lastName: string; email: string } | null;
}

interface Props {
  chantierId: string;
  /** Statuses lookup for display */
  statusesMap?: Record<string, { name: string; color: string }>;
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  STATUS_CHANGED: { icon: '🔄', color: '#1890ff', label: 'Changement de statut' },
  DRAG_DROP: { icon: '↕️', color: '#1890ff', label: 'Déplacement Kanban' },
  INVOICE_CREATED: { icon: '📄', color: '#faad14', label: 'Facture créée' },
  INVOICE_PAID: { icon: '💰', color: '#52c41a', label: 'Facture payée' },
  EVENT_PLANNED: { icon: '📅', color: '#13c2c2', label: 'Événement planifié' },
  EVENT_VALIDATED: { icon: '✅', color: '#52c41a', label: 'Événement validé' },
  PROBLEM_REPORTED: { icon: '⚠️', color: '#ff4d4f', label: 'Problème signalé' },
  NOTE_ADDED: { icon: '📝', color: '#722ed1', label: 'Note ajoutée' },
  SUBCONTRACT_LOCKED: { icon: '🔒', color: '#eb2f96', label: 'Sous-traitance verrouillée' },
};

const ChantierHistoryTab: React.FC<Props> = ({ chantierId, statusesMap }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/chantier-workflow/chantiers/${chantierId}/history`);
      setHistory(res.data || []);
    } catch {
      console.error('Erreur chargement historique');
    } finally {
      setLoading(false);
    }
  }, [api, chantierId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim()) return;
    try {
      setAddingNote(true);
      await api.post(`/api/chantier-workflow/chantiers/${chantierId}/history`, {
        action: 'NOTE_ADDED',
        note: noteText.trim(),
      });
      setNoteText('');
      message.success('Note ajoutée');
      fetchHistory();
    } catch {
      message.error('Erreur ajout note');
    } finally {
      setAddingNote(false);
    }
  }, [api, chantierId, noteText, fetchHistory]);

  const getStatusName = useCallback((statusId: string | null | undefined) => {
    if (!statusId || !statusesMap) return statusId || '?';
    return statusesMap[statusId]?.name || statusId;
  }, [statusesMap]);

  const getStatusColor = useCallback((statusId: string | null | undefined) => {
    if (!statusId || !statusesMap) return '#d9d9d9';
    return statusesMap[statusId]?.color || '#d9d9d9';
  }, [statusesMap]);

  const renderDescription = useCallback((entry: HistoryEntry) => {
    switch (entry.action) {
      case 'STATUS_CHANGED':
      case 'DRAG_DROP': {
        const fromName = getStatusName(entry.fromValue);
        const toName = getStatusName(entry.toValue);
        const isAuto = entry.data?.auto;
        return (
          <div>
            <Tag color={getStatusColor(entry.fromValue)}>{fromName}</Tag>
            <span style={{ margin: '0 4px' }}>→</span>
            <Tag color={getStatusColor(entry.toValue)}>{toName}</Tag>
            {isAuto && <Tag color="purple" style={{ marginLeft: 4 }}>Auto</Tag>}
            {entry.data?.method === 'kanban_drag_drop' && <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>drag & drop</Text>}
          </div>
        );
      }
      case 'INVOICE_CREATED':
      case 'INVOICE_PAID':
        return (
          <Text>{entry.toValue}</Text>
        );
      case 'EVENT_PLANNED':
      case 'EVENT_VALIDATED':
        return (
          <Text>{entry.toValue}</Text>
        );
      case 'PROBLEM_REPORTED':
        return (
          <div>
            <Text type="danger">{entry.data?.problemNote || entry.toValue || 'Problème signalé'}</Text>
          </div>
        );
      case 'NOTE_ADDED':
        return (
          <Text>{entry.toValue}</Text>
        );
      case 'SUBCONTRACT_LOCKED':
        return (
          <Text>Montant verrouillé : <Text strong>{entry.toValue}</Text></Text>
        );
      default:
        return <Text>{entry.toValue || entry.action}</Text>;
    }
  }, [getStatusName, getStatusColor]);

  const timelineItems = useMemo(() => {
    return history.map(entry => {
      const config = ACTION_CONFIG[entry.action] || { icon: '•', color: '#999', label: entry.action };
      return {
        key: entry.id,
        color: config.color,
        children: (
          <div style={{ paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span>{config.icon}</span>
              <Text strong style={{ fontSize: 13 }}>{config.label}</Text>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                {dayjs(entry.createdAt).fromNow()}
              </Text>
            </div>
            <div style={{ marginLeft: 12 }}>
              {renderDescription(entry)}
              {entry.User && (
                <div style={{ marginTop: 2 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    par {entry.User.firstName} {entry.User.lastName}
                  </Text>
                </div>
              )}
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(entry.createdAt).format('DD/MM/YYYY HH:mm')}
              </Text>
            </div>
          </div>
        ),
      };
    });
  }, [history, renderDescription]);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Ajout de note */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input.TextArea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Ajouter une note ou un commentaire..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ flex: 1 }}
            onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAddNote}
            loading={addingNote}
            disabled={!noteText.trim()}
          >
            Envoyer
          </Button>
        </div>
      </Card>

      {/* Timeline */}
      <Card size="small" title={<span><HistoryOutlined /> Historique complet</span>}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Chargement...</Text></div>
        ) : history.length === 0 ? (
          <Empty description="Aucun historique" />
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Card>
    </div>
  );
};

export default ChantierHistoryTab;
