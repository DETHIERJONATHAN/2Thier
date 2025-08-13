import React from 'react';
import { Card, Progress, Space, Typography, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Permission {
  id?: string;
  moduleId: string;
  action: string;
  allowed: boolean;
  resource: string;
}

interface Module {
  id: string;
  key: string;
  label: string;
  description?: string;
  category?: string;
}

interface PermissionStatsProps {
  permissions: Permission[];
  modules: Module[];
  selectedRole?: { label: string } | null;
}

const PermissionStats: React.FC<PermissionStatsProps> = ({
  permissions,
  modules,
  selectedRole
}) => {
  // Actions standard uniquement
  const STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete', 'manage'];
  
  // Filtrer seulement les permissions pour les actions standard
  const standardPermissions = permissions.filter(p => STANDARD_ACTIONS.includes(p.action));
  
  // Calcul des statistiques globales CORRIGÉ
  const totalModules = modules.length;
  // Calcul correct: permissions standard activées pour chaque module
  const totalAllowedStandardPermissions = modules.reduce((total, module) => {
    const moduleStandardPermissions = standardPermissions.filter(p => 
      p.moduleId === module.id && p.allowed && STANDARD_ACTIONS.includes(p.action)
    );
    return total + Math.min(moduleStandardPermissions.length, 5); // Max 5 par module
  }, 0);
  
  const totalPossiblePermissions = totalModules * 5; // 5 actions par module
  const globalPercentage = totalPossiblePermissions > 0 
    ? Math.round((totalAllowedStandardPermissions / totalPossiblePermissions) * 100) 
    : 0;

  // Debug pour voir les calculs CORRIGÉS (une seule fois)
  if (selectedRole?.label === 'Super Admin') {
    console.log('[DEBUG] PermissionStats CORRIGÉ:', {
      totalModules,
      totalPossiblePermissions,
      allPermissions: permissions.length,
      standardPermissions: standardPermissions.length,
      totalAllowedStandardPermissions,
      globalPercentage
    });
  }

  // Modules avec toutes les permissions CORRIGÉ
  const fullyEnabledModules = modules.filter(module => {
    const moduleStandardPermissions = standardPermissions.filter(p => 
      p.moduleId === module.id && p.allowed && STANDARD_ACTIONS.includes(p.action)
    );
    return moduleStandardPermissions.length >= 5; // Au moins 5 actions activées
  }).length;

  // Modules avec quelques permissions CORRIGÉ
  const partiallyEnabledModules = modules.filter(module => {
    const moduleStandardPermissions = standardPermissions.filter(p => 
      p.moduleId === module.id && p.allowed && STANDARD_ACTIONS.includes(p.action)
    );
    return moduleStandardPermissions.length > 0 && moduleStandardPermissions.length < 5;
  }).length;

  // Modules sans permissions
  const disabledModules = totalModules - fullyEnabledModules - partiallyEnabledModules;

  // Couleur de la progress bar selon le pourcentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#52c41a'; // Vert
    if (percentage >= 50) return '#faad14'; // Orange
    return '#ff4d4f'; // Rouge
  };

  if (!selectedRole) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <LockOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <Title level={4} style={{ marginTop: 16, color: '#999' }}>
            Sélectionnez un rôle pour voir les statistiques
          </Title>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`Statistiques pour ${selectedRole.label}`}>
      <Row gutter={[16, 16]}>
        {/* Progression globale */}
        <Col xs={24} lg={12}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={globalPercentage}
              size={120}
              strokeColor={getProgressColor(globalPercentage)}
              format={() => (
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: getProgressColor(globalPercentage) }}>
                    {globalPercentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    des permissions
                  </div>
                </div>
              )}
            />
            <Title level={4} style={{ marginTop: 16 }}>
              Couverture globale
            </Title>
            <Text type="secondary">
              {totalAllowedStandardPermissions} sur {totalPossiblePermissions} permissions activées
            </Text>
          </div>
        </Col>

        {/* Détails par modules */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Statistic
              title="Modules avec accès complet"
              value={fullyEnabledModules}
              suffix={`/ ${totalModules}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            
            <Statistic
              title="Modules avec accès partiel"
              value={partiallyEnabledModules}
              suffix={`/ ${totalModules}`}
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
            
            <Statistic
              title="Modules sans accès"
              value={disabledModules}
              suffix={`/ ${totalModules}`}
              prefix={<LockOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: disabledModules > 0 ? '#ff4d4f' : '#999' }}
            />
          </Space>
        </Col>

        {/* Barre de progression détaillée */}
        <Col xs={24}>
          <div style={{ marginTop: 24 }}>
            <Text strong>Répartition des accès par module :</Text>
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={100}
                success={{ percent: (fullyEnabledModules / totalModules) * 100 }}
                strokeColor={(partiallyEnabledModules / totalModules) * 100 > 0 ? '#faad14' : '#f5f5f5'}
                trailColor="#f5f5f5"
                showInfo={false}
              />
              <div style={{ marginTop: 8, fontSize: '12px' }}>
                <Space size="large">
                  <span>
                    <span style={{ color: '#52c41a' }}>●</span> Accès complet ({fullyEnabledModules})
                  </span>
                  <span>
                    <span style={{ color: '#faad14' }}>●</span> Accès partiel ({partiallyEnabledModules})
                  </span>
                  <span>
                    <span style={{ color: '#f5f5f5' }}>●</span> Aucun accès ({disabledModules})
                  </span>
                </Space>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default PermissionStats;
