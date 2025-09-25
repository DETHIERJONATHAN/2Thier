import React from 'react';
import { Card, Button, Space, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useDrop } from 'react-dnd';
import { LeadStatus } from '../types/leads';

interface DragDropLeadStatusProps {
  status: LeadStatus;
  onEdit: (status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onAcceptCallStatus?: (callStatusId: string, leadStatusId: string) => void;
}

const DragDropLeadStatus: React.FC<DragDropLeadStatusProps> = ({
  status,
  onEdit,
  onDelete,
  onAcceptCallStatus
}) => {
  // Configuration drag & drop - Zone de drop pour les statuts d'appels
  const [{ isOver }, drop] = useDrop({
    accept: 'CALL_STATUS',
    drop: (item: { id: string; name: string; type: string }) => {
      if (onAcceptCallStatus && item.id) {
        onAcceptCallStatus(item.id, status.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`
        transition-all duration-200
        ${isOver ? 'ring-2 ring-green-400 bg-green-50 scale-105' : ''}
      `}
    >
      <Card
        size="small"
        className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${isOver ? 'border-green-400 bg-green-50' : ''}`}
        style={{ borderLeftColor: status.color }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DragOutlined className="text-gray-400" />
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: status.color }}
              />
              <Tooltip title={status.description || `Statut de lead: ${status.name}`} placement="top">
                <span className="font-medium cursor-help">{status.name}</span>
              </Tooltip>
            </div>
            <Space>
              <Tooltip title="Modifier ce statut">
                <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(status)} />
              </Tooltip>
              <Popconfirm
                title="Supprimer ce statut ?"
                description="Cette action est irréversible"
                onConfirm={() => onDelete(status.id)}
                okText="Supprimer"
                cancelText="Annuler"
                okType="danger"
              >
                <Tooltip title="Supprimer ce statut">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          </div>
        }
      >
        <div className="space-y-2">
          {/* Affichage de la description si disponible */}
          {status.description && (
            <div className="text-sm text-gray-600 italic">
              💡 {status.description}
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            Ordre: {status.order}
          </div>
        </div>
        
        <div className={`mt-2 p-2 border-2 border-dashed rounded text-center text-xs transition-all ${
          isOver 
            ? 'border-green-400 bg-green-100 text-green-700' 
            : 'border-gray-200 text-gray-400'
        }`}>
          {isOver 
            ? '🎯 Relâchez pour créer la liaison !' 
            : '🎯 Zone de drop - Accepte les statuts d\'appel'
          }
        </div>
      </Card>
    </div>
  );
};

export default DragDropLeadStatus;
