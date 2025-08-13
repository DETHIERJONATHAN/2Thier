import React, { useEffect, useState, useCallback } from 'react';
import { Card, List, Button, Typography, Spin, Empty, Badge } from 'antd';
import { FormOutlined, EditOutlined, FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;

interface FormBlock {
  id: number;
  name: string;
  sections: Array<{
    id: string | number;
    name: string;
    fields: Array<{
      id: string;
      label: string;
      type: string;
      required?: boolean;
    }>;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

const FormulairePage: React.FC = () => {
  const [blocks, setBlocks] = useState<FormBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const orgId = currentOrganization?.id;
      if (!orgId) {
        console.error('Aucune organisation sélectionnée');
        return;
      }

      const response = await api.get(`/api/blocks?organizationId=${orgId}`);
      setBlocks(response || []);
    } catch (error) {
      console.error('Erreur lors du chargement des formulaires:', error);
    } finally {
      setLoading(false);
    }
  }, [api, currentOrganization?.id]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleEditForm = (blockId: number) => {
    // Rediriger vers l'éditeur de formulaire
    navigate(`/admin/formulaire/${blockId}`);
  };

  const getTotalFields = (block: FormBlock) => {
    return block.sections.reduce((total, section) => total + section.fields.length, 0);
  };

  const getFieldsSummary = (block: FormBlock) => {
    const fieldTypes = block.sections.flatMap(section => 
      section.fields.map(field => field.type)
    );
    const uniqueTypes = [...new Set(fieldTypes)];
    return uniqueTypes.slice(0, 3).join(', ') + (uniqueTypes.length > 3 ? '...' : '');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <Title level={2} className="flex items-center gap-3">
          <FormOutlined className="text-blue-600" />
          Formulaires
        </Title>
        <Text type="secondary">
          Gérez et consultez vos formulaires personnalisés
        </Text>
      </div>

      {blocks.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p>Aucun formulaire disponible</p>
                <Text type="secondary">
                  Les formulaires apparaîtront ici une fois créés par un administrateur.
                </Text>
              </div>
            }
          />
        </Card>
      ) : (
        <List
          grid={{ 
            gutter: 16,
            xs: 1,
            sm: 1,
            md: 2,
            lg: 2,
            xl: 3,
            xxl: 3,
          }}
          dataSource={blocks}
          renderItem={(block) => (
            <List.Item>
              <Card
                hoverable
                className="h-full"
                actions={[
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditForm(block.id)}
                  >
                    Modifier
                  </Button>,
                  <Button
                    type="text"
                    icon={<FileTextOutlined />}
                  >
                    Aperçu
                  </Button>
                ]}
              >
                <Card.Meta
                  title={
                    <div className="flex items-center justify-between">
                      <span className="truncate">{block.name}</span>
                      <Badge count={getTotalFields(block)} color="blue" />
                    </div>
                  }
                  description={
                    <div className="space-y-2">
                      <div>
                        <Text strong>Sections:</Text> {block.sections.length}
                      </div>
                      <div>
                        <Text strong>Champs:</Text> {getTotalFields(block)}
                      </div>
                      {getTotalFields(block) > 0 && (
                        <div>
                          <Text strong>Types:</Text> {getFieldsSummary(block)}
                        </div>
                      )}
                      {block.updatedAt && (
                        <div className="text-xs text-gray-500 mt-2">
                          <CalendarOutlined className="mr-1" />
                          Modifié le {new Date(block.updatedAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* Section d'information pour les utilisateurs non-administrateurs */}
      <Card className="mt-8" style={{ backgroundColor: '#f0f9ff' }}>
        <div className="flex items-start gap-3">
          <FormOutlined className="text-blue-600 mt-1" />
          <div>
            <Title level={4} className="mb-2">À propos des formulaires</Title>
            <Text>
              Les formulaires vous permettent de collecter et organiser des données personnalisées pour votre organisation. 
              Seuls les administrateurs peuvent créer et modifier la structure des formulaires, 
              mais tous les utilisateurs autorisés peuvent les consulter et les utiliser.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FormulairePage;
