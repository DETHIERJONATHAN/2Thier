import React, { useState } from 'react';
import { Tabs, Card, Typography, Space, Switch } from 'antd';
import { SettingOutlined, EyeOutlined } from '@ant-design/icons';
import GenealogyExplorer from './index';
import GenealogyUserView from './UserView';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Données d'exemple pour la démo
const demoTree = [
  {
    id: '1',
    label: 'Isolation murale',
    type: 'O' as const,
    children: [
      {
        id: '1-1',
        label: 'Épaisseur standard',
        type: 'O' as const,
        children: [
          {
            id: '1-1-1',
            label: 'Préciser épaisseur',
            type: 'O+C' as const,
            fieldType: 'number',
            fieldConfig: {
              placeholder: 'Épaisseur en mm',
              required: true
            }
          }
        ]
      },
      {
        id: '1-2',
        label: 'Épaisseur personnalisée',
        type: 'O+C' as const,
        fieldType: 'number',
        fieldConfig: {
          placeholder: 'Saisir l\'épaisseur en mm',
          required: true
        }
      }
    ]
  },
  {
    id: '2',
    label: 'Type de chauffage',
    type: 'O' as const,
    children: [
      {
        id: '2-1',
        label: 'Gaz',
        type: 'O' as const,
      },
      {
        id: '2-2',
        label: 'Électrique',
        type: 'O' as const,
      },
      {
        id: '2-3',
        label: 'Autre',
        type: 'O+C' as const,
        fieldType: 'text',
        fieldConfig: {
          placeholder: 'Préciser le type de chauffage',
          required: false
        }
      }
    ]
  },
  {
    id: '3',
    label: 'Budget approximatif',
    type: 'C' as const,
    fieldType: 'number',
    fieldConfig: {
      placeholder: 'Montant en euros',
      required: false
    }
  }
];

// Composant de démonstration
const GenealogyExplorerDemo: React.FC<{ fieldId: string }> = ({ fieldId }) => {
  const [activeTab, setActiveTab] = useState('admin');
  const [formData, setFormData] = useState<Record<string, any>>({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <Title level={2} className="mb-4">
            🧬 Système Généalogique Révolutionnaire
          </Title>
          <Text className="text-lg text-gray-600">
            Interface Super Admin + Vue Utilisateur • Types O/O+C/C • Structure Infinie
          </Text>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          className="bg-white rounded-lg shadow-lg"
        >
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                Interface Super Admin
              </span>
            }
            key="admin"
          >
            <div className="p-6">
              <GenealogyExplorer
                fieldId={fieldId}
                onTreeChange={(tree) => console.log('Arbre modifié:', tree)}
              />
            </div>
          </TabPane>

          <TabPane
            tab={
              <span>
                <EyeOutlined />
                Vue Utilisateur
              </span>
            }
            key="user"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vue utilisateur */}
                <div>
                  <Title level={4} className="mb-4">
                    Explorateur pour les utilisateurs
                  </Title>
                  <GenealogyUserView
                    tree={demoTree}
                    onFormChange={setFormData}
                  />
                </div>

                {/* Données capturées */}
                <div>
                  <Title level={4} className="mb-4">
                    Données capturées en temps réel
                  </Title>
                  <Card className="bg-gray-50">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(formData, null, 2) || 'Aucune donnée saisie'}
                    </pre>
                  </Card>

                  <div className="mt-6">
                    <Title level={5} className="mb-3">
                      🚀 Fonctionnalités révolutionnaires :
                    </Title>
                    <Space direction="vertical" className="w-full">
                      <Text>✅ <strong>3 types</strong> : O (option), O+C (option+champ), C (champ seul)</Text>
                      <Text>✅ <strong>Structure infinie</strong> : arbre évolutif à tous niveaux</Text>
                      <Text>✅ <strong>Interface familière</strong> : style explorateur Windows</Text>
                      <Text>✅ <strong>No-code</strong> : création drag & drop pour les admins</Text>
                      <Text>✅ <strong>Capture temps réel</strong> : données JSON structurées</Text>
                      <Text>✅ <strong>Validation intégrée</strong> : champs requis, types, contraintes</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default GenealogyExplorerDemo;
