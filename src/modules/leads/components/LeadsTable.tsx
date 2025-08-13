import React from 'react';
import { Table, Tag, Avatar, Button, Space, Tooltip } from 'antd';
import { PhoneOutlined, CalendarOutlined, MailOutlined, EyeOutlined } from '@ant-design/icons';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  source: string;
  status: string;
  createdAt: string;
  assignedTo: string;
  lastAction?: string;
  nextFollowUp?: string;
  priority: 'high' | 'medium' | 'low';
}

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  selectedLeads: string[];
  setSelectedLeads: (ids: string[]) => void;
  onViewLead?: (leadId: string) => void;
  onCallLead?: (leadId: string) => void;
  onEmailLead?: (leadId: string) => void;
  onCalendarLead?: (leadId: string) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  loading,
  selectedLeads,
  setSelectedLeads,
  onViewLead,
  onCallLead,
  onEmailLead,
  onCalendarLead
}) => {

  const getStatusColor = (status: string) => {
    const colors = {
      'nouveau': 'blue',
      'contacte': 'orange',
      'rendez-vous': 'purple',
      'propose': 'cyan',
      'gagne': 'green',
      'perdu': 'red'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟠';
      case 'low': return '🟢';
      default: return '';
    }
  };

  const columns = [
    {
      title: 'Lead',
      key: 'lead',
      render: (record: Lead) => (
        <div className="flex items-center space-x-3">
          <Avatar size="small">{record.firstName[0]}{record.lastName[0]}</Avatar>
          <div>
            <div className="font-medium">
              {getPriorityIcon(record.priority)} {record.firstName} {record.lastName}
            </div>
            {record.company && (
              <div className="text-sm text-gray-500">{record.company}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => <Tag>{source}</Tag>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Commercial',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
    },
    {
      title: 'Dernière action',
      dataIndex: 'lastAction',
      key: 'lastAction',
      render: (action: string) => action || 'Aucune',
    },
    {
      title: 'Prochain suivi',
      dataIndex: 'nextFollowUp',
      key: 'nextFollowUp',
      render: (date: string) => date || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Lead) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => onViewLead?.(record.id)}
            />
          </Tooltip>
          <Tooltip title="Appeler">
            <Button 
              type="text" 
              icon={<PhoneOutlined />}
              onClick={() => onCallLead?.(record.id)}
            />
          </Tooltip>
          <Tooltip title="Planifier RDV">
            <Button 
              type="text" 
              icon={<CalendarOutlined />}
              onClick={() => onCalendarLead?.(record.id)}
            />
          </Tooltip>
          <Tooltip title="Envoyer email">
            <Button 
              type="text" 
              icon={<MailOutlined />}
              onClick={() => onEmailLead?.(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedLeads,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedLeads(selectedRowKeys as string[]);
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <Table
        columns={columns}
        dataSource={leads}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} sur ${total} leads`,
        }}
        scroll={{ x: true }}
      />
    </div>
  );
};
