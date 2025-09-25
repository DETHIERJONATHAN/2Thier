import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Button, Space, message } from 'antd';
import { 
  DownloadOutlined, 
  BarChartOutlined, 
  UserOutlined, 
  TeamOutlined,
  TrophyOutlined,
  RiseOutlined 
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface DashboardMetrics {
  totalUsers?: number;
  totalOrganizations?: number;
  activeModules?: number;
  totalLeads?: number;
  users?: number;
  leads?: number;
  growth?: {
    users: number;
    organizations: number;
  };
  conversion?: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
  User: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const AnalyticsPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportType, setExportType] = useState<'users' | 'organizations'>('users');

  // 🔄 API STABLE AVEC USEMEMO
  const stableApi = useMemo(() => api, [api]);

  // 📊 CHARGER MÉTRIQUES DASHBOARD
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (dateRange) {
        params.append('startDate', dateRange[0].toISOString());
        params.append('endDate', dateRange[1].toISOString());
      }

      const response = await stableApi.get(`/analytics/dashboard?${params.toString()}`);
      if (response.success) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
      message.error('Erreur chargement métriques');
    } finally {
      setLoading(false);
    }
  }, [stableApi, dateRange]);

  // 📋 CHARGER AUDIT TRAIL
  const loadAuditTrail = useCallback(async () => {
    try {
      const response = await stableApi.get('/api/analytics/audit-trail?limit=10');
      if (response.success) {
        setAuditLogs(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement audit:', error);
      message.error('Erreur chargement audit');
    }
  }, [stableApi]);

  // 📈 EXPORT DONNÉES
  const handleExport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('format', exportFormat);
      params.append('type', exportType);

      const response = await stableApi.get(`/analytics/export?${params.toString()}`);
      
      if (exportFormat === 'csv') {
        // Télécharger CSV
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}_export_${dayjs().format('YYYY-MM-DD')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Afficher JSON
        console.log('Export JSON:', response.data);
      }
      
      message.success('Export terminé avec succès');
    } catch (error) {
      console.error('Erreur export:', error);
      message.error('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 EFFET INITIAL
  useEffect(() => {
    loadMetrics();
    loadAuditTrail();
  }, [loadMetrics, loadAuditTrail]);

  // 📊 COLONNES AUDIT TRAIL
  const auditColumns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Utilisateur',
      key: 'user',
      render: (record) => `${record.User.firstName} ${record.User.lastName}`,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 🎯 EN-TÊTE */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📊 Analytics & Rapports</h1>
        
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            placeholder={['Date début', 'Date fin']}
          />
          <Button 
            icon={<BarChartOutlined />} 
            onClick={loadMetrics}
            loading={loading}
          >
            Actualiser
          </Button>
        </Space>
      </div>

      {/* 📈 MÉTRIQUES PRINCIPALES */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Utilisateurs"
              value={metrics.totalUsers || metrics.users || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            {metrics.growth?.users && (
              <div className="text-sm text-gray-500">
                <RiseOutlined /> +{metrics.growth.users}% ce mois
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Organisations"
              value={metrics.totalOrganizations || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            {metrics.growth?.organizations && (
              <div className="text-sm text-gray-500">
                <RiseOutlined /> +{metrics.growth.organizations}% ce mois
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Modules Actifs"
              value={metrics.activeModules || 0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Leads / Conversion"
              value={metrics.totalLeads || metrics.leads || 0}
              suffix={metrics.conversion ? `(${metrics.conversion}%)` : ''}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 📊 SECTION EXPORT */}
      <Card title="📈 Export de Données" className="mb-6">
        <Row gutter={16} align="middle">
          <Col>
            <Select
              value={exportType}
              onChange={setExportType}
              style={{ width: 150 }}
            >
              <Option value="users">Utilisateurs</Option>
              <Option value="organizations">Organisations</Option>
            </Select>
          </Col>
          <Col>
            <Select
              value={exportFormat}
              onChange={setExportFormat}
              style={{ width: 100 }}
            >
              <Option value="csv">CSV</Option>
              <Option value="json">JSON</Option>
            </Select>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              Exporter
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 📋 AUDIT TRAIL */}
      <Card title="📋 Journal d'Audit" className="mb-6">
        <Table
          columns={auditColumns}
          dataSource={auditLogs}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default AnalyticsPage;
