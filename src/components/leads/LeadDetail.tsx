/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Avatar, Space, Button, Timeline, Spin, Row, Col } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  GlobalOutlined, 
  LinkedinOutlined,
  EditOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import type { Lead } from '../../types/leads';
import dayjs from 'dayjs';

interface LeadDetailProps {
  leadId: string;
  onEdit?: (lead: Lead) => void;
  onCall?: (leadId: string) => void;
  onEmail?: (leadId: string) => void; 
  onSchedule?: (leadId: string) => void;
}

/**
 * 📋 Composant de détail complet d'un lead
 */
export default function LeadDetail({ leadId, onEdit, onCall, onEmail, onSchedule }: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { api } = useAuthenticatedApi();
  
  // Récupérer les détails du lead
  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[LeadDetail] Récupération du lead:', leadId);
        const leadData = await api.get(`/api/leads/${leadId}`) as Lead;
        
        console.log('[LeadDetail] Données reçues:', leadData);
        setLead(leadData);
        
      } catch (err) {
        console.error('[LeadDetail] Erreur lors de la récupération:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    
    if (leadId) {
      fetchLeadDetails();
    }
  }, [leadId, api]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>❌ Erreur lors du chargement des détails</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  if (!lead) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>❓ Lead non trouvé</p>
      </div>
    );
  }

  // Helpers de normalisation communs (priorité top-level, fallback data.*)
  const asString = (v: unknown): string => (v == null ? '' : String(v));
  const joinName = (a?: unknown, b?: unknown) => [a, b].filter(Boolean).map(asString).join(' ').trim();
  const pickFirst = (...vals: Array<unknown>): string => {
    for (const v of vals) {
      if (Array.isArray(v)) {
        if (v.length > 0 && v[0]) {
          const first = v[0] as unknown;
          if (typeof first === 'string') return first.trim();
          if (typeof first === 'object') return JSON.stringify(first);
        }
      } else if (typeof v === 'string') {
        const s = v.trim();
        if (s) return s;
      } else if (v != null) {
        const s = String(v).trim();
        if (s) return s;
      }
    }
    return '';
  };

  const displayName = (
    pickFirst(
      joinName(lead.firstName, lead.lastName),
      (lead as any)?.name,
      joinName((lead as any)?.data?.firstName, (lead as any)?.data?.lastName),
      (lead as any)?.data?.name
    ) || ''
  ) || 'Nom non renseigné';

  const displayEmail = pickFirst(
    (lead as any)?.email,
    (lead as any)?.contactEmail,
    (lead as any)?.contact?.email,
    (lead as any)?.emails,
    (lead as any)?.contact?.emails,
    (lead as any)?.data?.email
  );

  const displayPhone = pickFirst(
    (lead as any)?.phone,
    (lead as any)?.mobile,
    (lead as any)?.telephone,
    (lead as any)?.contact?.phone,
    (lead as any)?.contact?.mobile,
    (lead as any)?.phones,
    (lead as any)?.contact?.phones,
    (lead as any)?.data?.phone
  );

  const displayCompany = pickFirst(
    (lead as any)?.company,
    (lead as any)?.companyName,
    (lead as any)?.organization?.name,
    (lead as any)?.contact?.company,
    (lead as any)?.customer?.company,
    (lead as any)?.isCompany ? (lead as any)?.name : '',
    (lead as any)?.data?.company
  );
  
  return (
    <div className="space-y-6">
      {/* Header avec informations principales */}
      <Card>
        <Row gutter={16} align="middle">
          <Col>
            <Avatar 
              size={64} 
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Col>
          <Col flex={1}>
            <div>
              <h2 className="text-xl font-semibold mb-1">{displayName}</h2>
              <div className="text-gray-600">
                {(displayCompany || lead.company) && <p className="mb-1">{displayCompany || lead.company}</p>}
                <Space>
                  {lead.leadStatus && (
                    <Tag color={lead.leadStatus.color}>{lead.leadStatus.name}</Tag>
                  )}
                  {lead.source && (
                    <Tag>{lead.source}</Tag>
                  )}
                </Space>
              </div>
            </div>
          </Col>
          <Col>
            <Space>
              {onEdit && (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => onEdit(lead)}
                >
                  Modifier
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<PhoneOutlined />} 
                onClick={() => onCall?.(lead.id)}
                disabled={!onCall}
              >
                Appeler avec Telnyx
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Informations de contact */}
      <Card title="📞 Informations de contact" size="small">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Email" span={1}>
            {displayEmail ? (
              <Space>
                <MailOutlined />
                <a href={`mailto:${displayEmail}`}>{displayEmail}</a>
                <Button 
                  size="small" 
                  type="link" 
                  onClick={() => onEmail?.(lead.id)}
                  disabled={!onEmail}
                >
                  📧 Envoyer via Gmail
                </Button>
              </Space>
            ) : (
              <span className="text-gray-400">Non renseigné</span>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="Téléphone" span={1}>
            {displayPhone ? (
              <Space>
                <PhoneOutlined />
                <a href={`tel:${displayPhone}`}>{displayPhone}</a>
              </Space>
            ) : (
              <span className="text-gray-400">Non renseigné</span>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="Site web" span={1}>
            {lead.website ? (
              <Space>
                <GlobalOutlined />
                <a href={lead.website} target="_blank" rel="noopener noreferrer">
                  {lead.website}
                </a>
              </Space>
            ) : (
              <span className="text-gray-400">Non renseigné</span>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="LinkedIn" span={1}>
            {lead.linkedin ? (
              <Space>
                <LinkedinOutlined />
                <a href={lead.linkedin} target="_blank" rel="noopener noreferrer">
                  Profil LinkedIn
                </a>
              </Space>
            ) : (
              <span className="text-gray-400">Non renseigné</span>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Informations business */}
      <Card title="🏢 Informations business" size="small">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Société" span={1}>
            {lead.company || <span className="text-gray-400">Non renseignée</span>}
          </Descriptions.Item>
          
          <Descriptions.Item label="Source" span={1}>
            {lead.source ? (
              <Tag color="blue">{lead.source}</Tag>
            ) : (
              <span className="text-gray-400">Non renseignée</span>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="Statut" span={1}>
            {lead.leadStatus ? (
              <Tag color={lead.leadStatus.color}>{lead.leadStatus.name}</Tag>
            ) : (
              <span className="text-gray-400">Non défini</span>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="Commercial assigné" span={1}>
            {lead.assignedTo ? (
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                {lead.assignedTo.firstName} {lead.assignedTo.lastName}
              </Space>
            ) : (
              <span className="text-gray-400">Non assigné</span>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Notes */}
      {lead.notes && (
        <Card title="📝 Notes" size="small">
          <p className="whitespace-pre-wrap">{lead.notes}</p>
        </Card>
      )}

      {/* Timeline/Historique */}
      <Card title="📅 Historique" size="small">
        <Timeline>
          <Timeline.Item color="green">
            <div>
              <strong>Lead créé</strong>
              <div className="text-gray-500 text-sm">
                {dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
          </Timeline.Item>
          
          {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
            <Timeline.Item color="blue">
              <div>
                <strong>Dernière modification</strong>
                <div className="text-gray-500 text-sm">
                  {dayjs(lead.updatedAt).format('DD/MM/YYYY HH:mm')}
                </div>
              </div>
            </Timeline.Item>
          )}
          
          {lead.lastContactDate && (
            <Timeline.Item color="orange">
              <div>
                <strong>Dernier contact</strong>
                <div className="text-gray-500 text-sm">
                  {dayjs(lead.lastContactDate).format('DD/MM/YYYY HH:mm')}
                </div>
              </div>
            </Timeline.Item>
          )}
          
          {lead.nextFollowUpDate && (
            <Timeline.Item color="red">
              <div>
                <strong>Prochain suivi programmé</strong>
                <div className="text-gray-500 text-sm">
                  {dayjs(lead.nextFollowUpDate).format('DD/MM/YYYY HH:mm')}
                </div>
                <Button 
                  size="small" 
                  type="link" 
                  icon={<CalendarOutlined />}
                  onClick={() => onSchedule?.(lead.id)}
                  disabled={!onSchedule}
                >
                  📅 Reprogrammer
                </Button>
              </div>
            </Timeline.Item>
          )}
        </Timeline>
      </Card>

      {/* Actions rapides */}
      <Card title="⚡ Actions rapides" size="small">
        <Space wrap>
          <Button 
            icon={<PhoneOutlined />} 
            onClick={() => onCall?.(lead.id)}
            type="primary"
            disabled={!onCall}
          >
            📞 Appeler avec Telnyx
          </Button>
          <Button 
            icon={<MailOutlined />} 
            onClick={() => onEmail?.(lead.id)}
            disabled={!onEmail}
          >
            ✉️ Gmail Google
          </Button>
          <Button 
            icon={<CalendarOutlined />} 
            onClick={() => onSchedule?.(lead.id)}
            disabled={!onSchedule}
          >
            📅 Agenda Google
          </Button>
          {onEdit && (
            <Button icon={<EditOutlined />} onClick={() => onEdit(lead)}>
              Modifier les informations
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
}
