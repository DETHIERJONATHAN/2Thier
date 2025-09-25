import React from 'react';
import { Card, Button, Space, Dropdown, Tag, Select, notification, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, MoreOutlined, DragOutlined, LinkOutlined } from '@ant-design/icons';
import { useDrag, useDrop } from 'react-dnd';

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

interface SortableCallStatusProps {
  callStatus: CallStatus;
  index: number;
  leadStatuses: LeadStatus[];
  onEdit: (status: CallStatus) => void;
  onDelete: (id: string) => void;
  moveStatus: (dragIndex: number, hoverIndex: number) => void;
  onUpdateMapping: (callStatusId: string, leadStatusId: string) => void;
  onDragEnd?: () => void; // ✨ Nouveau prop pour la sauvegarde
}

interface DragItem {
  type: string;
  index: number;
  id: string;
}

const SortableCallStatus: React.FC<SortableCallStatusProps> = ({
  callStatus,
  index,
  leadStatuses,
  onEdit,
  onDelete,
  moveStatus,
  onUpdateMapping,
  onDragEnd
}) => {
  const [isEditingMapping, setIsEditingMapping] = React.useState(false);
  const [selectedLeadStatus, setSelectedLeadStatus] = React.useState(callStatus.mappedToLeadStatus);

  // Configuration drag pour la réorganisation
  const [{ isDragging }, drag] = useDrag({
    type: 'CALL_STATUS_REORDER',
    item: { type: 'CALL_STATUS_REORDER', index, id: callStatus.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: onDragEnd,
  });

  // Configuration drop pour la réorganisation
  const [{ isOverReorder }, dropReorder] = useDrop({
    accept: 'CALL_STATUS_REORDER',
    hover: (item: DragItem) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      // Déplacer immédiatement pour le feedback visuel
      moveStatus(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOverReorder: monitor.isOver() && monitor.getItemType() === 'CALL_STATUS_REORDER',
    }),
  });

  // Configuration drag pour le mapping (existant)
  const [, dragMapping] = useDrag({
    type: 'CALL_STATUS',
    item: { 
      id: callStatus.id, 
      name: callStatus.name,
      type: 'CALL_STATUS'
    },
  });

  // Combiner les refs drag et drop de manière plus stable
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (ref.current) {
      drag(ref.current);
      dropReorder(ref.current);
      dragMapping(ref.current);
    }
  }, [drag, dropReorder, dragMapping]);

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
      ref={ref}
      className={`
        transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isOverReorder ? 'ring-2 ring-blue-400 bg-blue-50 scale-105' : ''}
      `}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <Card
        size="small"
        className={`
          border-l-4 shadow-sm hover:shadow-md transition-shadow
          ${isOverReorder ? 'border-blue-400 bg-blue-50' : ''}
        `}
        style={{ borderLeftColor: callStatus.color }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DragOutlined className="text-gray-400 cursor-grab" />
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

          <div className="text-sm text-gray-500">
            Position: {index + 1}
          </div>

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
            p-2 border-2 border-dashed rounded text-center text-xs transition-all
            ${isOverReorder
              ? 'border-blue-400 bg-blue-100 text-blue-700'
              : 'border-gray-200 text-gray-400'
            }
          `}>
            {isOverReorder 
              ? '📋 Relâchez pour réorganiser !'
              : '📎 Glissez ce statut vers un statut de lead pour le lier • 📋 Glissez pour réorganiser'
            }
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

export default SortableCallStatus;
