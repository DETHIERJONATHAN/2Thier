import React from 'react';
import { Card, Alert, List, Tag } from 'antd';
import { BulbOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';

interface AIInsightsProps {
  leadId?: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ leadId }) => {
  const insights = [
    {
      type: 'suggestion',
      icon: <BulbOutlined />,
      title: 'Script d\'appel suggéré',
      content: 'Mentionner la réduction de 15% valable cette semaine',
      priority: 'high'
    },
    {
      type: 'opportunity',
      icon: <TrophyOutlined />,
      title: 'Opportunité détectée',
      content: 'Le lead a visité 3 fois votre page tarifs - très intéressé',
      priority: 'high'
    },
    {
      type: 'timing',
      icon: <ClockCircleOutlined />,
      title: 'Meilleur moment d\'appel',
      content: 'Historiquement répond mieux entre 14h-16h',
      priority: 'medium'
    }
  ];

  const suggestions = [
    'Envoyer un email de confirmation de RDV',
    'Planifier un rappel dans 2 jours',
    'Préparer une proposition commerciale',
    'Organiser une démo produit'
  ];

  return (
    <div className="space-y-4">
      {/* Insights IA */}
      <Card title="🤖 Insights IA" size="small">
        <List
          size="small"
          dataSource={insights}
          renderItem={(insight) => (
            <List.Item>
              <List.Item.Meta
                avatar={insight.icon}
                title={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{insight.title}</span>
                    <Tag 
                      color={insight.priority === 'high' ? 'red' : 'orange'}
                      size="small"
                    >
                      {insight.priority === 'high' ? 'Urgent' : 'Important'}
                    </Tag>
                  </div>
                }
                description={<span className="text-xs">{insight.content}</span>}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Suggestions d'actions */}
      <Card title="💡 Actions suggérées" size="small">
        <List
          size="small"
          dataSource={suggestions}
          renderItem={(suggestion) => (
            <List.Item className="py-1">
              <span className="text-sm">• {suggestion}</span>
            </List.Item>
          )}
        />
      </Card>

      {/* Analyse de sentiment */}
      <Card title="📊 Analyse" size="small">
        <div className="space-y-2">
          <Alert
            message="Lead chaud 🔥"
            description="Score de conversion: 87%"
            type="success"
            showIcon
            size="small"
          />
          <div className="text-xs text-gray-500">
            Basé sur: activité site web, historique d'emails, temps de réponse
          </div>
        </div>
      </Card>
    </div>
  );
};
