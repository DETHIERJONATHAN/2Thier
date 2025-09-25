import React, { useState, useEffect } from 'react';
import { Card, Select, Typography, Space, Divider, Alert } from 'antd';
import { UserOutlined, CrownOutlined, TeamOutlined } from '@ant-design/icons';
import TableauPermissions from '../components/TableauPermissions';
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;
const { Option } = Select;

interface DemoFieldConfig {
  config: {
    permissions: {
      levels: {
        super_admin: {
          formulaire: string[];
          devis: string[];
        };
        admin: {
          formulaire: string[];
          devis: string[];
        };
        user: {
          formulaire: string[];
          devis: string[];
        };
      };
    };
  };
  advancedConfig: {
    tableConfig: {
      name: string;
      description: string;
      columns: Array<{
        id: string;
        key: string;
        label: string;
        type: string;
        width?: string;
        permissions?: {
          edit?: string[];
          view?: string[];
        };
      }>;
      rows: Array<{
        id: string;
        label: string;
        data: Record<string, unknown>;
        permissions?: {
          edit?: string[];
          view?: string[];
          delete?: string[];
        };
      }>;
      permissions: Record<string, string[]>;
    };
  };
}

const TableauxDemoPage: React.FC = () => {
  const { user } = useAuth();
  const [context, setContext] = useState<'formulaire' | 'devis'>('devis');
  
  // Configuration d'exemple avec permissions complètes
  const demoFieldConfig: DemoFieldConfig = {
    config: {
      permissions: {
        levels: {
          super_admin: {
            formulaire: ['create_structure', 'edit_structure', 'manage_data', 'use_data', 'export_data', 'import_data'],
            devis: ['manage_data', 'use_data', 'export_data', 'import_data']
          },
          admin: {
            formulaire: [],
            devis: ['manage_data', 'use_data', 'export_data', 'import_data']
          },
          user: {
            formulaire: [],
            devis: ['use_data']
          }
        }
      }
    },
    advancedConfig: {
      tableConfig: {
        name: 'Onduleurs avec Permissions',
        description: 'Tableau démonstratif avec système de permissions complet selon les rôles utilisateurs',
        
        columns: [
          {
            id: 'marque',
            key: 'marque',
            label: 'Marque',
            type: 'text',
            width: '150px',
            permissions: {
              edit: ['super_admin', 'admin'],
              view: ['super_admin', 'admin', 'user']
            }
          },
          {
            id: 'modele',
            key: 'modele',
            label: 'Modèle',
            type: 'text',
            width: '200px',
            permissions: {
              edit: ['super_admin', 'admin'],
              view: ['super_admin', 'admin', 'user']
            }
          },
          {
            id: 'puissance',
            key: 'puissance',
            label: 'Puissance (kW)',
            type: 'number',
            width: '120px',
            permissions: {
              edit: ['super_admin', 'admin'],
              view: ['super_admin', 'admin', 'user']
            }
          },
          {
            id: 'prix_achat',
            key: 'prix_achat',
            label: 'Prix d\'achat',
            type: 'currency',
            width: '120px',
            permissions: {
              edit: ['super_admin'],
              view: ['super_admin', 'admin'] // Utilisateurs ne voient pas le prix d'achat
            }
          },
          {
            id: 'prix_vente',
            key: 'prix_vente',
            label: 'Prix de vente',
            type: 'currency',
            width: '120px',
            permissions: {
              edit: ['super_admin', 'admin'],
              view: ['super_admin', 'admin', 'user']
            }
          },
          {
            id: 'marge',
            key: 'marge',
            label: 'Marge (%)',
            type: 'percentage',
            width: '100px',
            permissions: {
              edit: ['super_admin'],
              view: ['super_admin'] // Seulement Super Admin voit la marge
            }
          },
          {
            id: 'disponible',
            key: 'disponible',
            label: 'Disponible',
            type: 'boolean',
            width: '100px',
            permissions: {
              edit: ['super_admin', 'admin'],
              view: ['super_admin', 'admin', 'user']
            }
          }
        ],
        
        rows: [
          {
            id: 'onduleur_1',
            label: 'Fronius Primo 3.0-1',
            permissions: {
              edit: ['super_admin', 'admin'],
              delete: ['super_admin'],
              view: ['super_admin', 'admin', 'user']
            },
            data: {
              marque: 'Fronius',
              modele: 'Primo 3.0-1',
              puissance: 3.0,
              prix_achat: 850,
              prix_vente: 1200,
              marge: 41.2,
              disponible: true
            }
          },
          {
            id: 'onduleur_2',
            label: 'SolarEdge SE5000H',
            permissions: {
              edit: ['super_admin', 'admin'],
              delete: ['super_admin'],
              view: ['super_admin', 'admin', 'user']
            },
            data: {
              marque: 'SolarEdge',
              modele: 'SE5000H',
              puissance: 5.0,
              prix_achat: 1250,
              prix_vente: 1750,
              marge: 40.0,
              disponible: true
            }
          },
          {
            id: 'onduleur_3',
            label: 'Huawei SUN2000-3KTL-L1',
            permissions: {
              edit: ['super_admin'],
              delete: ['super_admin'],
              view: ['super_admin', 'admin', 'user']
            },
            data: {
              marque: 'Huawei',
              modele: 'SUN2000-3KTL-L1',
              puissance: 3.0,
              prix_achat: 720,
              prix_vente: 1100,
              marge: 52.7,
              disponible: false
            }
          },
          {
            id: 'onduleur_4',
            label: 'SMA Sunny Boy 2.5',
            permissions: {
              edit: ['super_admin', 'admin'],
              delete: ['super_admin'],
              view: ['super_admin', 'admin', 'user']
            },
            data: {
              marque: 'SMA',
              modele: 'Sunny Boy 2.5',
              puissance: 2.5,
              prix_achat: 680,
              prix_vente: 980,
              marge: 44.1,
              disponible: true
            }
          }
        ],
        
        permissions: {
          create_row: ['super_admin', 'admin'],
          delete_row: ['super_admin'],
          edit_data: ['super_admin', 'admin'],
          view_data: ['super_admin', 'admin', 'user'],
          export_data: ['super_admin', 'admin'],
          import_data: ['super_admin', 'admin'],
          edit_structure: ['super_admin']
        }
      }
    }
  };

  // Indicateur de rôle pour l'utilisateur
  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return <CrownOutlined style={{ color: '#722ed1' }} />;
      case 'admin':
        return <TeamOutlined style={{ color: '#1890ff' }} />;
      default:
        return <UserOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return '#722ed1';
      case 'admin':
        return '#1890ff';
      default:
        return '#52c41a';
    }
  };

  const getRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return 'Super Administrateur';
      case 'admin':
        return 'Administrateur';
      default:
        return 'Utilisateur';
    }
  };

  return (
    <div className="p-6">
      {/* En-tête de la page */}
      <div className="mb-6">
        <Title level={2}>
          Démonstration Tableaux avec Permissions
        </Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Informations utilisateur actuel */}
          <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Space>
              {getRoleIcon(user?.role?.name || 'user')}
              <Text strong style={{ color: getRoleColor(user?.role?.name || 'user') }}>
                Connecté en tant que : {getRoleLabel(user?.role?.name || 'user')} ({user?.role?.name})
              </Text>
            </Space>
          </Card>

          {/* Sélecteur de contexte */}
          <div>
            <Text strong style={{ marginRight: '16px' }}>Contexte d'utilisation :</Text>
            <Select
              value={context}
              onChange={setContext}
              style={{ width: 200 }}
            >
              <Option value="formulaire">
                <Space>
                  📋 Formulaire
                  <Text type="secondary">(Configuration)</Text>
                </Space>
              </Option>
              <Option value="devis">
                <Space>
                  💼 Devis
                  <Text type="secondary">(Utilisation)</Text>
                </Space>
              </Option>
            </Select>
          </div>

          {/* Alertes informatives selon le contexte */}
          {context === 'formulaire' && user?.role?.name !== 'super_admin' && (
            <Alert
              message="Accès limité en Formulaire"
              description="Seuls les Super Administrateurs peuvent configurer les tableaux dans le contexte Formulaire. Vous pouvez consulter mais pas modifier."
              type="warning"
              showIcon
              icon={<CrownOutlined />}
            />
          )}
          
          {context === 'devis' && (
            <Alert
              message="Mode Devis Actif"
              description={`En tant que ${getRoleLabel(user?.role?.name || 'user')}, vous pouvez ${
                user?.role?.name === 'super_admin' || user?.role?.name === 'admin' 
                  ? 'modifier les données et utiliser les tableaux'
                  : 'uniquement consulter et sélectionner dans les tableaux'
              }.`}
              type="info"
              showIcon
            />
          )}
        </Space>
      </div>

      <Divider />

      {/* Composant tableau avec permissions */}
      <Card title="Tableau Onduleurs - Démonstration Permissions">
        <TableauPermissions
          fieldConfig={demoFieldConfig}
          context={context}
          readOnly={false}
        />
      </Card>

      {/* Documentation des permissions */}
      <Card title="Documentation des Permissions" style={{ marginTop: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          
          <div>
            <Title level={4} style={{ color: '#722ed1' }}>
              <CrownOutlined /> Super Administrateur
            </Title>
            <Text>
              <strong>Formulaire :</strong> Configuration complète - Structure, colonnes, types, conditionnement<br/>
              <strong>Devis :</strong> Gestion complète des données - Modification, ajout, suppression, export/import<br/>
              <strong>Visibilité :</strong> Toutes les colonnes incluant prix d'achat et marges
            </Text>
          </div>

          <div>
            <Title level={4} style={{ color: '#1890ff' }}>
              <TeamOutlined /> Administrateur
            </Title>
            <Text>
              <strong>Formulaire :</strong> Consultation uniquement - Pas de modification de structure<br/>
              <strong>Devis :</strong> Gestion des données - Modification, ajout, suppression, export/import<br/>
              <strong>Visibilité :</strong> Prix de vente mais pas prix d'achat ni marges
            </Text>
          </div>

          <div>
            <Title level={4} style={{ color: '#52c41a' }}>
              <UserOutlined /> Utilisateur
            </Title>
            <Text>
              <strong>Formulaire :</strong> Pas d'accès<br/>
              <strong>Devis :</strong> Consultation et sélection uniquement - Aucune modification<br/>
              <strong>Visibilité :</strong> Informations produits de base, prix de vente uniquement
            </Text>
          </div>

        </Space>
      </Card>
    </div>
  );
};

export default TableauxDemoPage;
