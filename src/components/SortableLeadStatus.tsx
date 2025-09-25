import React from 'react';
import { Card, Button, Space, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useDrag, useDrop } from 'react-dnd';
import { LeadStatus } from '../types/leads';

interface SortableLeadStatusProps {
  status: LeadStatus;
  index: number;
  onEdit: (status: LeadStatus) => void;
  onDelete: (id: string) => void;
  moveStatus: (dragIndex: number, hoverIndex: number) => void;
  onAcceptCallStatus?: (callStatusId: string, leadStatusId: string) => void;
  onDragEnd?: () => void; // ✨ Nouveau prop pour la sauvegarde
}

interface DragItem {
  type: string;
  index: number;
  id: string;
}

const SortableLeadStatus: React.FC<SortableLeadStatusProps> = ({
  status,
  index,
  onEdit,
  onDelete,
  moveStatus,
  onAcceptCallStatus,
  onDragEnd
}) => {
  // Ref pour combiner drag et drop - DOIT être déclaré AVANT son utilisation
  const ref = React.useRef<HTMLDivElement>(null);

  // Configuration drag pour la réorganisation
  const [{ isDragging }, drag] = useDrag({
    type: 'LEAD_STATUS_REORDER',
    item: { type: 'LEAD_STATUS_REORDER', index, id: status.id },
    end: () => {
      // ✨ Déclencher la sauvegarde à la fin du drag
      if (onDragEnd) {
        onDragEnd();
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Configuration drop pour la réorganisation
  const [{ isOverReorder }, dropReorder] = useDrop({
    accept: 'LEAD_STATUS_REORDER',
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
      isOverReorder: monitor.isOver() && monitor.getItemType() === 'LEAD_STATUS_REORDER',
    }),
  });

  // Configuration drop pour les statuts d'appels (mapping)
  const [{ isOverMapping }, dropMapping] = useDrop({
    accept: 'CALL_STATUS',
    drop: (item: { id: string; name: string; type: string }) => {
      if (onAcceptCallStatus && item.id) {
        onAcceptCallStatus(item.id, status.id);
      }
    },
    collect: (monitor) => ({
      isOverMapping: monitor.isOver() && monitor.getItemType() === 'CALL_STATUS',
    }),
  });

  React.useEffect(() => {
    if (ref.current) {
      drag(ref.current);
      dropReorder(ref.current);
      dropMapping(ref.current);
    }
  }, [drag, dropReorder, dropMapping]);

  return (
    <div
      ref={ref}
      className={`
        transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isOverReorder ? 'ring-2 ring-blue-400 bg-blue-50 scale-105' : ''}
        ${isOverMapping ? 'ring-2 ring-green-400 bg-green-50 scale-105' : ''}
      `}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <Card
        size="small"
        className={`
          border-l-4 shadow-sm hover:shadow-md transition-shadow 
          ${isOverReorder ? 'border-blue-400 bg-blue-50' : ''}
          ${isOverMapping ? 'border-green-400 bg-green-50' : ''}
        `}
        style={{ borderLeftColor: status.color }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DragOutlined className="text-gray-400 cursor-grab" />
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
            Ordre: {status.order} • Position: {index + 1}
          </div>
        </div>
        
        <div className={`mt-2 p-2 border-2 border-dashed rounded text-center text-xs transition-all ${
          isOverMapping 
            ? 'border-green-400 bg-green-100 text-green-700' 
            : isOverReorder
            ? 'border-blue-400 bg-blue-100 text-blue-700'
            : 'border-gray-200 text-gray-400'
        }`}>
          {isOverMapping 
            ? '🎯 Relâchez pour créer la liaison !' 
            : isOverReorder
            ? '📋 Relâchez pour réorganiser !'
            : '🎯 Zone de drop - Accepte les statuts d\'appel • 📋 Glissez pour réorganiser'
          }
        </div>
      </Card>
    </div>
  );
};

export default SortableLeadStatus;
