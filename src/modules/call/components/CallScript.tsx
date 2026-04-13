import React, { useState, useEffect, useCallback } from 'react';
import { Card, Alert, Button, Collapse } from 'antd';
import { BulbOutlined, SyncOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { logger } from '../../../lib/logger';

// Utiliser l'API items (AntD v5)

interface CallScriptProps {
  leadId?: string;
}

export const CallScript: React.FC<CallScriptProps> = ({ leadId }) => {
  const { api } = useAuthenticatedApi();
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (leadId) {
      generateScript();
    }
  }, [leadId, generateScript]);

  const generateScript = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/gemini/generate-call-script', {
        leadId: leadId
      });
      setScript(response.data.script);
    } catch (error) {
      logger.error('Erreur génération script:', error);
      setScript(`
Bonjour [Nom du lead],

Je vous appelle concernant votre demande d'information sur nos services.

Points à aborder :
• Comprendre ses besoins spécifiques
• Présenter nos solutions adaptées
• Proposer un rendez-vous ou une démonstration
• Répondre à ses questions

N'oubliez pas :
• Être à l'écoute
• Poser des questions ouvertes
• Noter les objections
• Fixer un prochain point de contact
      `);
    } finally {
      setLoading(false);
    }
  }, [api, leadId]);

  return (
    <Card 
      title="Script d'appel IA"
      extra={
        <Button 
          icon={<SyncOutlined />} 
          size="small"
          loading={loading}
          onClick={generateScript}
        >
          Régénérer
        </Button>
      }
    >
      <Alert
        message="Script personnalisé généré par IA"
        description="Basé sur l'historique du lead et les meilleures pratiques"
        type="info"
        icon={<BulbOutlined />}
        className="mb-4"
      />

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm">{script}</pre>
        </div>

        <Collapse
          size="small"
          items={[
            {
              key: 'objectives',
              label: "🎯 Objectifs de l'appel",
              children: (
                <ul className="text-sm space-y-1">
                  <li>• Qualifier le besoin</li>
                  <li>• Identifier le budget</li>
                  <li>• Comprendre le processus de décision</li>
                  <li>• Fixer un rendez-vous</li>
                </ul>
              )
            },
            {
              key: 'questions',
              label: '❓ Questions types',
              children: (
                <ul className="text-sm space-y-1">
                  <li>• Pouvez-vous me parler de votre projet ?</li>
                  <li>• Quel est votre calendrier ?</li>
                  <li>• Qui prend les décisions ?</li>
                  <li>• Avez-vous un budget défini ?</li>
                </ul>
              )
            },
            {
              key: 'objections',
              label: '🚫 Objections courantes',
              children: (
                <div className="text-sm space-y-2">
                  <div><strong>"C'est trop cher"</strong> → Focus sur la valeur et le ROI</div>
                  <div><strong>"Je réfléchis"</strong> → Proposer un suivi structuré</div>
                  <div><strong>"Pas le bon moment"</strong> → Identifier le bon timing</div>
                </div>
              )
            }
          ]}
        />
      </div>
    </Card>
  );
};
