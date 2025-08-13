import React, { useState } from 'react';
import { Card, Button, Space, Dropdown, Tag, Select, notification, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, MoreOutlined, DragOutlined, LinkOutlined } from '@ant-design/icons';
import { useDrag } from 'react-dnd';

interface CallStatus {
  id?: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  mappedToLeadStatus?: string;
}

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface CallStatusCardProps {
  callStatus: CallStatus;
  leadStatuses: LeadStatus[];
  onEdit: (status: CallStatus) => void;
  onDelete: (id: string) => void;
  onUpdateMapping: (callStatusId: string, leadStatusId: string) => void;
}

const CallStatusCard: React.FC<CallStatusCardProps> = ({
  callStatus,
  leadStatuses,
  onEdit,
  onDelete,
  onUpdateMapping
}) => {
  const [isEditingMapping, setIsEditingMapping] = useState(false);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState(callStatus.mappedToLeadStatus);

  // Configuration drag & drop
  const [{ isDragging }, drag] = useDrag({
    type: 'CALL_STATUS',
    item: { 
      id: callStatus.id, 
      name: callStatus.name,
      type: 'CALL_STATUS'
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const mappedLeadStatus = leadStatuses.find(ls => ls.id === callStatus.mappedToLeadStatus);

  const handleSaveMapping = () => {
    if (selectedLeadStatus && callStatus.id) {
      onUpdateMapping(callStatus.id, selectedLeadStatus);
      setIsEditingMapping(false);
      notification.success({
        message: 'Mapping mis à jour',
        description: 'La liaison a été sauvegardée',
        duration: 2
      });
    }
  };

  const menuItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Modifier',
      onClick: () => onEdit(callStatus)
    },
    {
      key: 'mapping',
      icon: <LinkOutlined />,
      label: 'Changer la liaison',
      onClick: () => setIsEditingMapping(true)
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Supprimer',
      danger: true,
      onClick: () => {}
    }
  ];

  return (
    <div
      ref={drag}
      className={`
        transition-all duration-200 cursor-move
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
    >
      <Card
        size="small"
        className={`
          border-l-4 shadow-sm hover:shadow-md transition-shadow
        `}
        style={{ borderLeftColor: callStatus.color }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DragOutlined className="text-gray-400" />
              {callStatus.icon && <span>{callStatus.icon}</span>}
              <Tooltip title={callStatus.description || `Statut d'appel: ${callStatus.name}`} placement="top">
                <span className="font-medium cursor-help">{callStatus.name}</span>
              </Tooltip>
              <Tag color={callStatus.color} className="text-xs">
                Statut d'appel
              </Tag>
            </div>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </div>
        }
      >
        <div className="space-y-3">
          {callStatus.description && (
            <div className="text-sm text-gray-600">
              {callStatus.description}
            </div>
          )}

          {/* Affichage de la liaison actuelle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Lié à :</span>
            
            {!isEditingMapping ? (
              <div className="flex items-center space-x-2">
                {mappedLeadStatus ? (
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: mappedLeadStatus.color }}
                    />
                    <span className="text-sm">{mappedLeadStatus.name}</span>
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<EditOutlined />}
                      onClick={() => setIsEditingMapping(true)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Aucune liaison</span>
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<LinkOutlined />}
                      onClick={() => setIsEditingMapping(true)}
                    >
                      Créer
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Select
                  size="small"
                  style={{ width: 150 }}
                  placeholder="Choisir statut"
                  value={selectedLeadStatus}
                  onChange={setSelectedLeadStatus}
                >
                  {leadStatuses.map(status => (
                    <Select.Option key={status.id} value={status.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.name}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
                <Button size="small" type="primary" onClick={handleSaveMapping}>
                  Sauver
                </Button>
                <Button size="small" onClick={() => setIsEditingMapping(false)}>
                  Annuler
                </Button>
              </div>
            )}
          </div>

          {/* Zone de drop pour créer des liaisons */}
          <div className={`
            p-2 border-2 border-dashed rounded text-center text-xs
            border-gray-200 text-gray-400
          `}>
            📎 Glissez ce statut vers un statut de lead pour le lier
          </div>

          {/* Actions rapides */}
          <div className="flex justify-end">
            <Space size="small">
              <Tooltip title="Modifier ce statut d'appel">
                <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(callStatus)} />
              </Tooltip>
              <Popconfirm
                title="Supprimer ce statut ?"
                description="Cette action est irréversible"
                onConfirm={() => callStatus.id && onDelete(callStatus.id)}
                okText="Supprimer"
                cancelText="Annuler"
                okType="danger"
              >
                <Tooltip title="Supprimer ce statut d'appel">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CallStatusCard;
