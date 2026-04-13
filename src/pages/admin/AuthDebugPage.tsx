import React from 'react';
import { Card, Descriptions, Tag, Alert, Button } from 'antd';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';

const AuthDebugPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, organizations, currentOrganization, permissions, modules, loading, isSuperAdmin, userRole } = useAuth();
  const { api } = useAuthenticatedApi();

  const testApiCall = async () => {
    try {
      console.log("Test API - Appel de /users");
      const response = await api.get('/api/users');
      console.log("Réponse:", response);
      alert(`API Test réussi! ${Array.isArray(response) ? response.length : response?.data?.length || 0} utilisateurs trouvés.`);
    } catch (error) {
      console.error("Erreur API:", error);
      alert(`Erreur API: ${error}`);
    }
  };

  const testAuthCheck = async () => {
    try {
      console.log("Test Auth - Appel de /auth/me");
      const response = await api.get('/api/auth/me');
      console.log("Réponse auth:", response);
      alert(`Auth Test réussi! Utilisateur: ${response?.currentUser?.email || 'Unknown'}`);
    } catch (error) {
      console.error("Erreur Auth:", error);
      alert(`Erreur Auth: ${error}`);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement de l'authentification...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🔍 Debug - État d'authentification</h1>
      
      {/* État utilisateur */}
      <Card title="👤 Utilisateur connecté" style={{ marginBottom: 16 }}>
        {user ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label={t('fields.email')}>{user.email}</Descriptions.Item>
            <Descriptions.Item label={t('fields.name')}>{user.firstName} {user.lastName}</Descriptions.Item>
            <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
            <Descriptions.Item label="Super Admin">
              <Tag color={isSuperAdmin ? 'red' : 'default'}>
                {isSuperAdmin ? 'OUI' : 'NON'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Rôle">
              <Tag color="blue">{userRole || 'Aucun'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert message="Aucun utilisateur connecté" type="error" />
        )}
      </Card>

      {/* Organisation courante */}
      <Card title="🏢 Organisation courante" style={{ marginBottom: 16 }}>
        {currentOrganization ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label={t('fields.name')}>{currentOrganization.name}</Descriptions.Item>
            <Descriptions.Item label="ID">{currentOrganization.id}</Descriptions.Item>
            <Descriptions.Item label={t('fields.status')}>
              <Tag color="green">{currentOrganization.status}</Tag>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert message="Aucune organisation sélectionnée" type="warning" />
        )}
      </Card>

      {/* Organisations disponibles */}
      <Card title="🏢 Organisations disponibles" style={{ marginBottom: 16 }}>
        <p><strong>Total:</strong> {organizations.length}</p>
        {organizations.map(org => (
          <Tag key={org.id} color={org.id === currentOrganization?.id ? 'blue' : 'default'}>
            {org.name}
          </Tag>
        ))}
      </Card>

      {/* Permissions */}
      <Card title="🔐 Permissions" style={{ marginBottom: 16 }}>
        <p><strong>Total:</strong> {permissions.length}</p>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {permissions.map(perm => (
            <Tag key={perm} style={{ margin: 2 }}>{perm}</Tag>
          ))}
        </div>
      </Card>

      {/* Modules */}
      <Card title="📦 Modules" style={{ marginBottom: 16 }}>
        <p><strong>Total:</strong> {modules.length}</p>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {modules.map(mod => (
            <Tag key={mod.key} color={mod.isActive ? 'green' : 'default'} style={{ margin: 2 }}>
              {mod.name}
            </Tag>
          ))}
        </div>
      </Card>

      {/* Tests API */}
      <Card title="🧪 Tests API">
        <div style={{ display: 'flex', gap: 16 }}>
          <Button type="primary" onClick={testAuthCheck}>
            Tester /auth/me
          </Button>
          <Button onClick={testApiCall}>
            Tester /users
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AuthDebugPage;
