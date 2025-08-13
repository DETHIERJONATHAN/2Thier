// 🧪 Page de test pour le système de mail
import React, { useState, useEffect } from 'react';
import { Button, Card, Spin, Typography, Alert, Space } from 'antd';
import { CheckCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  data?: any;
}

const MailSystemTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Connexion API', status: 'loading', message: 'Test en cours...' },
    { name: 'Récupération emails', status: 'loading', message: 'Test en cours...' },
    { name: 'Statistiques', status: 'loading', message: 'Test en cours...' }
  ]);

  const runTests = async () => {
    const newTests: TestResult[] = [];

    // Test 1: Connexion API
    try {
      const response = await fetch('/api/mail-system/test');
      const data = await response.json();
      if (response.ok && data.success) {
        newTests.push({
          name: 'Connexion API',
          status: 'success',
          message: data.message,
          data
        });
      } else {
        newTests.push({
          name: 'Connexion API',
          status: 'error',
          message: 'Réponse API invalide'
        });
      }
    } catch (error) {
      newTests.push({
        name: 'Connexion API',
        status: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }

    // Test 2: Récupération emails
    try {
      const response = await fetch('/api/mail-system/emails');
      const data = await response.json();
      if (response.ok && data.emails) {
        newTests.push({
          name: 'Récupération emails',
          status: 'success',
          message: `${data.emails.length} email(s) récupéré(s)`,
          data
        });
      } else {
        newTests.push({
          name: 'Récupération emails',
          status: 'error',
          message: 'Format de réponse invalide'
        });
      }
    } catch (error) {
      newTests.push({
        name: 'Récupération emails',
        status: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }

    // Test 3: Statistiques
    try {
      const response = await fetch('/api/mail-system/stats');
      const data = await response.json();
      if (response.ok && typeof data.total === 'number') {
        newTests.push({
          name: 'Statistiques',
          status: 'success',
          message: `${data.total} email(s) total`,
          data
        });
      } else {
        newTests.push({
          name: 'Statistiques',
          status: 'error',
          message: 'Format de statistiques invalide'
        });
      }
    } catch (error) {
      newTests.push({
        name: 'Statistiques',
        status: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }

    setTests(newTests);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      case 'loading':
        return <Spin size="small" />;
      default:
        return null;
    }
  };

  const allTestsPassed = tests.every(test => test.status === 'success');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>🧪 Test du Système de Mail Interne</Title>
      
      <div className="mb-6">
        {allTestsPassed && tests.length === 3 ? (
          <Alert
            message="✅ Tous les tests sont passés avec succès !"
            description="Le système de mail interne est opérationnel et prêt à l'utilisation."
            type="success"
            showIcon
          />
        ) : (
          <Alert
            message="⚠️ Certains tests ont échoué"
            description="Vérifiez que le serveur backend est démarré sur le port 4000."
            type="warning"
            showIcon
          />
        )}
      </div>

      <Space direction="vertical" size="large" className="w-full">
        <Card
          title="📊 Résultats des Tests"
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={runTests}
              type="primary"
            >
              Relancer les tests
            </Button>
          }
        >
          <Space direction="vertical" size="middle" className="w-full">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <Text strong>{test.name}</Text>
                    <br />
                    <Text type="secondary">{test.message}</Text>
                  </div>
                </div>
                {test.data && (
                  <Button 
                    size="small" 
                    type="link"
                    onClick={() => console.log(`${test.name}:`, test.data)}
                  >
                    Voir détails
                  </Button>
                )}
              </div>
            ))}
          </Space>
        </Card>

        <Card title="🔧 Configuration">
          <Paragraph>
            <Text strong>Backend :</Text> http://localhost:4000<br />
            <Text strong>Frontend :</Text> http://localhost:5173<br />
            <Text strong>API Mail :</Text> /api/mail-system/*
          </Paragraph>
        </Card>

        <Card title="🚀 Prochaines étapes">
          <Paragraph>
            Si tous les tests passent, vous pouvez maintenant :
          </Paragraph>
          <ul>
            <li>✅ Utiliser le composant <code>GmailLayout</code> dans votre application</li>
            <li>✅ Créer, lire, modifier et supprimer des emails</li>
            <li>✅ Gérer les pièces jointes</li>
            <li>✅ Effectuer des recherches avancées</li>
            <li>🔄 Connecter à une vraie base de données (remplacer le serveur de test)</li>
            <li>🔐 Implémenter l'authentification réelle</li>
          </ul>
        </Card>
      </Space>
    </div>
  );
};

export default MailSystemTest;
