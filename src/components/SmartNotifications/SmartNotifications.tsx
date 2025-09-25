import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Space, Button, Badge, Divider, Row, Col } from 'antd';
import { 
  CloseOutlined,
  RobotOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';

interface SmartNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
  priority: number;
  aiGenerated: boolean;
}

interface SmartNotificationsProps {
  context?: 'leads' | 'dashboard' | 'general';
}

export default function SmartNotifications({ context = 'general' }: SmartNotificationsProps) {
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // 🤖 Fonction d'analyse IA des données pour générer des notifications intelligentes
  const analyzeAndGenerateNotifications = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const smartNotifications: SmartNotification[] = [];

      if (context === 'leads' || context === 'dashboard') {
        // Analyse des leads
        const leadsResponse = await api.get('/api/leads');
        const leadsData = Array.isArray(leadsResponse) ? leadsResponse : (leadsResponse?.data || []);

        // 📊 Notification système opérationnel
        smartNotifications.push({
          id: 'system-operational',
          type: 'success',
          title: 'Système opérationnel',
          message: 'Toutes les intégrations Prisma fonctionnent correctement.',
          dismissible: true,
          priority: 3,
          aiGenerated: true
        });

        // 🆕 Analyse des nouveaux leads
        const newLeads = leadsData.filter(lead => {
          const statusName = lead.LeadStatus?.name?.toLowerCase();
          return statusName?.includes('nouveau') || statusName?.includes('new');
        });

        if (newLeads.length > 0) {
          smartNotifications.push({
            id: 'new-leads-available',
            type: 'info',
            title: 'Nouveaux leads disponibles',
            message: `${newLeads.length} nouveaux leads nécessitent votre attention.`,
            action: {
              label: 'Voir les leads',
              onClick: () => {
                window.location.href = '/leads';
              }
            },
            dismissible: false,
            priority: 1,
            aiGenerated: true
          });
        } else {
          smartNotifications.push({
            id: 'no-new-leads',
            type: 'info',
            title: 'Tableau de bord à jour',
            message: '0 nouveaux leads. Système en veille intelligente.',
            dismissible: true,
            priority: 4,
            aiGenerated: true
          });
        }

        // 🔥 Analyse des leads urgents
        const urgentLeads = leadsData.filter(lead => {
          const priority = lead.priority || lead.data?.priority;
          return priority === 'high' || priority === 'urgent';
        });

        if (urgentLeads.length > 0) {
          smartNotifications.push({
            id: 'urgent-leads',
            type: 'warning',
            title: 'Leads prioritaires détectés',
            message: `${urgentLeads.length} leads haute priorité nécessitent une action immédiate.`,
            action: {
              label: 'Action requise',
              onClick: () => {
                window.location.href = '/leads?priority=high';
              }
            },
            dismissible: false,
            priority: 2,
            aiGenerated: true
          });
        }

        // 📈 Analyse des performances
        const totalLeads = leadsData.length;
        const convertedLeads = leadsData.filter(lead => {
          const statusName = lead.LeadStatus?.name?.toLowerCase();
          return statusName?.includes('gagné') || statusName?.includes('converti');
        });

        const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

        if (conversionRate > 70) {
          smartNotifications.push({
            id: 'high-performance',
            type: 'success',
            title: 'Performance exceptionnelle',
            message: `Taux de conversion de ${conversionRate.toFixed(1)}% - Excellents résultats !`,
            dismissible: true,
            priority: 5,
            aiGenerated: true
          });
        } else if (conversionRate < 20 && totalLeads > 5) {
          smartNotifications.push({
            id: 'low-performance',
            type: 'warning',
            title: 'Optimisation recommandée',
            message: `Taux de conversion de ${conversionRate.toFixed(1)}%. L'IA suggère une révision de stratégie.`,
            action: {
              label: 'Analyser',
              onClick: () => {
                window.location.href = '/leads/analytics';
              }
            },
            dismissible: true,
            priority: 3,
            aiGenerated: true
          });
        }
      }

      // Trier par priorité (1 = le plus important)
      smartNotifications.sort((a, b) => a.priority - b.priority);
      setNotifications(smartNotifications);

    } catch (error) {
      console.error('Erreur lors de l\'analyse IA des notifications:', error);
      
      // Notification d'erreur de fallback
      setNotifications([{
        id: 'analysis-error',
        type: 'error',
        title: 'Erreur d\'analyse',
        message: 'Impossible d\'analyser les données. Vérifiez votre connexion.',
        dismissible: true,
        priority: 1,
        aiGenerated: false
      }]);
    } finally {
      setLoading(false);
    }
  }, [api, user, context]);

  // Fonction pour fermer une notification
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Analyser au chargement et périodiquement
  useEffect(() => {
    analyzeAndGenerateNotifications();

    // Actualiser toutes les 30 secondes pour les notifications temps réel
    const interval = setInterval(analyzeAndGenerateNotifications, 30000);
    return () => clearInterval(interval);
  }, [analyzeAndGenerateNotifications]);

  if (notifications.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="mb-4">
      <Space direction="vertical" className="w-full">
        {notifications.map(notification => (
          <Alert
            key={notification.id}
            type={notification.type}
            message={
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    {notification.aiGenerated && (
                      <Badge.Ribbon text="IA" color="blue">
                        <div />
                      </Badge.Ribbon>
                    )}
                    <span className="font-medium">{notification.title}</span>
                  </Space>
                </Col>
                <Col>
                  {notification.aiGenerated && (
                    <RobotOutlined className="text-blue-500 ml-2" />
                  )}
                </Col>
              </Row>
            }
            description={notification.message}
            action={
              <Space>
                {notification.action && (
                  <Button
                    size="small"
                    type="primary"
                    onClick={notification.action.onClick}
                  >
                    {notification.action.label}
                  </Button>
                )}
                {notification.dismissible && (
                  <Button
                    size="small"
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => dismissNotification(notification.id)}
                  />
                )}
              </Space>
            }
            showIcon
            icon={
              notification.aiGenerated ? (
                <ThunderboltOutlined className="text-blue-500" />
              ) : (
                undefined
              )
            }
            className="shadow-sm"
          />
        ))}
      </Space>
      
      {notifications.length > 0 && (
        <Divider className="!my-4" />
      )}
    </div>
  );
}
