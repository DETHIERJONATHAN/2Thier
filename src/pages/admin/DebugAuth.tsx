import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Spin, Alert, Button, Tooltip, Tag, Statistic, Row, Col, Collapse, Typography, Space } from 'antd';
import { BugOutlined, UserOutlined, KeyOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, 
         TeamOutlined, SafetyOutlined, ApiOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { debugTranslations, permissionActionTranslations, moduleTranslations, tooltips } from '../../utils/userRightsTranslations';

const { Text, Paragraph } = Typography;

interface Permission {
  id?: string;
  action?: string;
  resource?: string;
  moduleId?: string;
  allowed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MeResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isSuperAdmin?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

const DebugAuth: React.FC = React.memo(() => {
  const { user, currentOrganization, isSuperAdmin, permissions } = useAuth();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook]);
  
  const [loading, setLoading] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [meResponse, setMeResponse] = useState<MeResponse | null>(null);

  const fetchDebugData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer le token
      const storedToken = localStorage.getItem('token');
      setToken(storedToken);
      
      // Appeler /api/me
      const response = await api.get('/api/me');
      console.log('[DebugAuth] /me response:', response);
      setMeResponse(response as MeResponse);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données de débogage:', error);
      setError('Impossible de charger les données de débogage');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDebugData();
  }, [fetchDebugData]);

  const formatPermissionDisplay = useCallback((perm: Permission | string): string => {
    if (typeof perm === 'string') {
      return perm;
    }
    
    if (typeof perm === 'object' && perm !== null) {
      const action = perm.action ? (permissionActionTranslations[perm.action as keyof typeof permissionActionTranslations] || perm.action) : 'Action inconnue';
      const resource = perm.resource || 'Ressource inconnue';
      const module = perm.moduleId ? (moduleTranslations[perm.moduleId as keyof typeof moduleTranslations] || perm.moduleId) : 'Module inconnu';
      return `${action} - ${resource} (${module})`;
    }
    
    return 'Permission invalide';
  }, []);

  const permissionStats = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) return { total: 0, allowed: 0, denied: 0 };
    
    let allowed = 0;
    let denied = 0;
    
    permissions.forEach(p => {
      if (typeof p === 'object' && p !== null && p.allowed !== undefined) {
        if (p.allowed === true) allowed++;
        else if (p.allowed === false) denied++;
      }
    });
    
    return {
      total: permissions.length,
      allowed,
      denied
    };
  }, [permissions]);

  const toggleRawData = useCallback(() => {
    setShowRawData(prev => !prev);
  }, []);

  // N'afficher le composant que si on a un utilisateur
  if (!user) {
    return null;
  }

  return (
    <Card 
      className="mt-8 shadow-xl border-0"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative'
      }}
      title={
        <div className="flex items-center gap-3" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BugOutlined style={{ color: 'white', fontSize: '1.2rem' }} />
          </div>
          <Text strong style={{ fontSize: '1.4rem', color: '#374151' }}>
            Informations de Débogage - Authentification
          </Text>
        </div>
      }
      extra={
        <Space>
          <Tooltip title={tooltips.refreshButton}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchDebugData}
              loading={loading}
              size="middle"
              style={{
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontWeight: '600',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Actualiser
            </Button>
          </Tooltip>
          <Tooltip title={tooltips.rawDataToggle}>
            <Button 
              icon={showRawData ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={toggleRawData}
              size="middle"
              style={{
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontWeight: '600',
                background: showRawData ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
                color: showRawData ? 'white' : '#374151',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                if (!showRawData) {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!showRawData) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {debugTranslations.toggleRawData}
            </Button>
          </Tooltip>
        </Space>
      }
    >
      {loading ? (
        <div className="text-center py-8">
          <Spin size="large" />
          <Text className="block mt-4 text-gray-500">{debugTranslations.loading}</Text>
        </div>
      ) : error ? (
        <Alert
          message="Erreur de chargement"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      ) : (
        <>
          {/* Statistiques rapides avec design premium */}
          <Row gutter={[24, 24]} className="mb-8">
            <Col xs={24} sm={6}>
              <Card 
                size="small" 
                style={{
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.06)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                }} />
                <Statistic
                  title={debugTranslations.totalPermissions}
                  value={permissionStats.total}
                  valueStyle={{ color: '#3b82f6', fontSize: '2rem', fontWeight: 800 }}
                  prefix={<KeyOutlined style={{ color: '#3b82f6' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card 
                size="small" 
                style={{
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.06)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                }} />
                <Statistic
                  title="Permissions Autorisées"
                  value={permissionStats.allowed}
                  valueStyle={{ color: '#10b981', fontSize: '2rem', fontWeight: 800 }}
                  prefix={<SafetyOutlined style={{ color: '#10b981' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card 
                size="small" 
                style={{
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.06)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                }} />
                <Statistic
                  title="Permissions Refusées"
                  value={permissionStats.denied}
                  valueStyle={{ color: '#ef4444', fontSize: '2rem', fontWeight: 800 }}
                  prefix={<SafetyOutlined style={{ color: '#ef4444' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card 
                size="small" 
                style={{
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.06)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)'
                }} />
                <Statistic
                  title="Super Admin"
                  value={isSuperAdmin ? 'OUI' : 'NON'}
                  valueStyle={{ color: isSuperAdmin ? '#10b981' : '#f59e0b', fontSize: '1.4rem', fontWeight: 800 }}
                  prefix={<TeamOutlined style={{ color: isSuperAdmin ? '#10b981' : '#f59e0b' }} />}
                />
              </Card>
            </Col>
          </Row>

          <Collapse
            defaultActiveKey={['user', 'organization', 'permissions']}
            className="mb-4"
            items={[
              {
                key: 'user',
                label: (
                  <div className="flex items-center gap-2">
                    <UserOutlined />
                    <Text strong>Utilisateur connecté</Text>
                    <Tag color={user ? 'success' : 'error'}>
                      {user ? 'Connecté' : 'Non connecté'}
                    </Tag>
                  </div>
                ),
                children: (
                  user ? (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded border">
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                          <Text strong>ID:</Text> <Text code className="ml-2">{user.id}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Email:</Text> <Text className="ml-2">{user.email}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Nom:</Text> <Text className="ml-2">{user.firstName} {user.lastName}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Rôle global:</Text> <Text className="ml-2">{user.role}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Super Admin:</Text> 
                          <Tag color={isSuperAdmin ? 'success' : 'default'} className="ml-2">
                            {isSuperAdmin ? debugTranslations.yes : debugTranslations.no}
                          </Tag>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Créé le:</Text> <Text className="ml-2">{new Date(user.createdAt).toLocaleString('fr-FR')}</Text>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <Alert message="Utilisateur non connecté" type="error" />
                  )
                )
              },
              {
                key: 'organization',
                label: (
                  <div className="flex items-center gap-2">
                    <TeamOutlined />
                    <Text strong>Organisation actuelle</Text>
                    <Tag color={currentOrganization ? 'success' : 'warning'}>
                      {currentOrganization ? 'Sélectionnée' : 'Aucune'}
                    </Tag>
                  </div>
                ),
                children: (
                  currentOrganization ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded border">
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                          <Text strong>ID:</Text> <Text code className="ml-2">{currentOrganization.id}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Nom:</Text> <Text className="ml-2">{currentOrganization.name}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Rôle dans l'organisation:</Text> <Text className="ml-2">{currentOrganization.role}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong>Statut:</Text> 
                          <Tag color="blue" className="ml-2">{currentOrganization.status}</Tag>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <Alert message="Aucune organisation sélectionnée" type="warning" />
                  )
                )
              },
              {
                key: 'token',
                label: (
                  <div className="flex items-center gap-2">
                    <ApiOutlined />
                    <Text strong>Token d'authentification</Text>
                    <Tag color={token ? 'success' : 'error'}>
                      {token ? 'Présent' : 'Absent'}
                    </Tag>
                  </div>
                ),
                children: (
                  token ? (
                    <div className="bg-gray-50 p-3 rounded border font-mono text-xs break-all">
                      <Text strong>Token (tronqué):</Text><br />
                      <Text code>{token.slice(0, 30)}...{token.slice(-20)}</Text>
                    </div>
                  ) : (
                    <Alert message="Aucun token d'authentification trouvé" type="error" />
                  )
                )
              },
              {
                key: 'api-me',
                label: (
                  <div className="flex items-center gap-2">
                    <ApiOutlined />
                    <Text strong>Réponse API /me</Text>
                    <Tag color={meResponse ? 'success' : 'processing'}>
                      {meResponse ? 'Chargé' : 'En cours...'}
                    </Tag>
                  </div>
                ),
                children: (
                  meResponse ? (
                    <div className="bg-gray-100 p-3 rounded border max-h-60 overflow-y-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(meResponse, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Spin />
                      <Text className="block mt-2 text-gray-500">Chargement de la réponse API...</Text>
                    </div>
                  )
                )
              },
              {
                key: 'permissions',
                label: (
                  <div className="flex items-center gap-2">
                    <KeyOutlined />
                    <Text strong>{debugTranslations.permissions}</Text>
                    <Tag color="blue">{permissions?.length || 0}</Tag>
                  </div>
                ),
                children: (
                  permissions && permissions.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {permissions.map((perm, idx) => {
                        const displayText = formatPermissionDisplay(perm);
                        const isObject = typeof perm === 'object' && perm !== null;
                        
                        return (
                          <Tooltip 
                            key={idx} 
                            title={isObject ? tooltips.permissionDetails : "Permission simple"}
                            placement="topLeft"
                          >
                            <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-400 mb-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <Text strong className="text-blue-700">
                                    {displayText}
                                  </Text>
                                  {isObject && perm.resource && (
                                    <>
                                      <br />
                                      <Text className="text-gray-600 text-sm">Ressource: {perm.resource}</Text>
                                    </>
                                  )}
                                  {isObject && perm.moduleId && (
                                    <>
                                      <br />
                                      <Text className="text-xs text-gray-500">
                                        Module: {moduleTranslations[perm.moduleId as keyof typeof moduleTranslations] || perm.moduleId}
                                      </Text>
                                    </>
                                  )}
                                </div>
                                {isObject && perm.allowed !== undefined && (
                                  <Tag color={perm.allowed ? 'success' : 'error'}>
                                    {perm.allowed ? 'Autorisé' : 'Refusé'}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ) : (
                    <Alert message={debugTranslations.noPermissions} type="warning" />
                  )
                )
              }
            ]}
          />

          {/* Données brutes JSON */}
          {showRawData && (
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <EyeOutlined />
                  <Text strong>{debugTranslations.rawData}</Text>
                </div>
              }
              size="small"
              className="mt-4"
            >
              <Paragraph>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify({ 
                    user, 
                    currentOrganization, 
                    isSuperAdmin, 
                    permissions, 
                    token: token ? `${token.slice(0, 10)}...` : null,
                    meResponse 
                  }, null, 2)}
                </pre>
              </Paragraph>
            </Card>
          )}
        </>
      )}
    </Card>
  );
});

DebugAuth.displayName = 'DebugAuth';

export default DebugAuth;
