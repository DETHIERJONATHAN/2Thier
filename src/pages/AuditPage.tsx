import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  DatePicker, 
  Tag, 
  Modal,
  Descriptions,
  message,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  EyeOutlined,
  DownloadOutlined,
  BarChartOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  organizationId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  User: {
    firstName: string;
    lastName: string;
    email: string;
  };
  Organization?: {
    name: string;
  };
}

interface AuditStats {
  totalActions: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  recentActivity: number;
}

const AuditPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalActions: 0,
    uniqueUsers: 0,
    topActions: [],
    recentActivity: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    userId: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 🔄 API STABLE
  const stableApi = useMemo(() => api, [api]);

  // 📊 CHARGER STATISTIQUES AUDIT
  const loadStats = useCallback(async () => {
    try {
      const response = await stableApi.get('/api/analytics/audit-stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Erreur stats audit:', error);
    }
  }, [stableApi]);

  // 📋 CHARGER LOGS AUDIT
  const loadAuditLogs = useCallback(async (page = 1, pageSize = 20) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());
      
      if (filters.search) params.append('search', filters.search);
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0].toISOString());
        params.append('endDate', filters.dateRange[1].toISOString());
      }

      const response = await stableApi.get(`/analytics/audit-trail?${params.toString()}`);
      if (response.success) {
        setAuditLogs(response.data);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: response.pagination.total
        }));
      }
    } catch (error) {
      console.error('Erreur chargement audit:', error);
      message.error('Erreur chargement des logs d\'audit');
    } finally {
      setLoading(false);
    }
  }, [stableApi, filters]);

  // 📈 EXPORT AUDIT LOGS
  const handleExport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('format', 'csv');
      params.append('type', 'audit');
      
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0].toISOString());
        params.append('endDate', filters.dateRange[1].toISOString());
      }

      const response = await stableApi.get(`/analytics/export?${params.toString()}`);
      
      // Télécharger CSV
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      message.success('Export terminé avec succès');
    } catch (error) {
      console.error('Erreur export:', error);
      message.error('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  // 👁️ VOIR DÉTAILS LOG
  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  // 🔄 EFFETS
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadAuditLogs(1, 20);
  }, [filters, loadAuditLogs]);

  // 🎨 COULEUR ACTION
  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'green';
    if (action.includes('update')) return 'blue';
    if (action.includes('delete')) return 'red';
    if (action.includes('login')) return 'purple';
    return 'default';
  };

  // 📊 COLONNES TABLE
  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Date/Heure',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YY HH:mm'),
      sorter: true,
    },
    {
      title: 'Utilisateur',
      key: 'user',
      width: 200,
      render: (record) => (
        <div>
          <div>{record.User.firstName} {record.User.lastName}</div>
          <div className="text-xs text-gray-500">{record.User.email}</div>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action) => (
        <Tag color={getActionColor(action)}>{action}</Tag>
      ),
    },
    {
      title: 'Organisation',
      key: 'organization',
      width: 150,
      render: (record) => record.Organization?.name || 'N/A',
    },
    {
      title: 'Détails',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details) => details || 'Aucun détail',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => viewLogDetails(record)}
        >
          Voir
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 🎯 EN-TÊTE */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📋 Journal d'Audit</h1>
        
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={loading}
          >
            Exporter CSV
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => loadAuditLogs(1, 20)}
            loading={loading}
          >
            Actualiser
          </Button>
        </Space>
      </div>

      {/* 📊 STATISTIQUES */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Actions"
              value={stats.totalActions}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Utilisateurs Actifs"
              value={stats.uniqueUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Activité Récente"
              value={stats.recentActivity}
              prefix={<ClockCircleOutlined />}
              suffix="dernières 24h"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Actions Principales"
              value={stats.topActions[0]?.count || 0}
              prefix={<TeamOutlined />}
              formatter={(value) => `${value} ${stats.topActions[0]?.action || ''}`}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 🔍 FILTRES */}
      <Card title="🔍 Filtres">
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="Rechercher dans les logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Type d'action"
              value={filters.action}
              onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="create">Création</Option>
              <Option value="update">Modification</Option>
              <Option value="delete">Suppression</Option>
              <Option value="login">Connexion</Option>
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 📋 TABLE AUDIT */}
      <Card title="📋 Logs d'Audit">
        <Table
          columns={columns}
          dataSource={auditLogs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} logs`,
            onChange: (page, pageSize) => {
              loadAuditLogs(page, pageSize || 20);
            }
          }}
          size="small"
        />
      </Card>

      {/* 👁️ MODAL DÉTAILS */}
      <Modal
        title="📋 Détails du Log d'Audit"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="Action">{selectedLog.action}</Descriptions.Item>
            <Descriptions.Item label="Utilisateur">
              {selectedLog.User.firstName} {selectedLog.User.lastName} ({selectedLog.User.email})
            </Descriptions.Item>
            <Descriptions.Item label="Organisation">
              {selectedLog.Organization?.name || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Date/Heure">
              {dayjs(selectedLog.createdAt).format('DD/MM/YYYY HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Adresse IP">
              {selectedLog.ipAddress || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent">
              {selectedLog.userAgent || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Détails">
              {selectedLog.details || 'Aucun détail disponible'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AuditPage;
