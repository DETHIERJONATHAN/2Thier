import React from 'react';
import { Card, Button, Dropdown, Input, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';

type TableToolbarProps = {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
};

const TableToolbar: React.FC<TableToolbarProps> = ({
  title,
  icon,
  count,
  searchValue,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  showDelete = false,
  dragHandleProps,
  className,
}) => {
  const menuItems = [
    { key: 'edit', label: 'Éditer', icon: <EditOutlined />, onClick: onEdit },
    ...(showDelete ? [{ key: 'delete', label: 'Supprimer', icon: <DeleteOutlined />, onClick: onDelete }] : []),
  ].map(it => ({ key: it.key, label: (
    <button type="button" className="flex items-center gap-2" onClick={it.onClick}>
      {it.icon}
      <span>{it.label}</span>
    </button>
  ) }));

  return (
    <Card size="small" bordered={false} className={`w-full px-3 py-2 ${className || 'rounded-md bg-slate-800/40 text-white'}`}>
      <div className="flex flex-wrap items-center gap-3 text-white">
        <div className="flex items-center gap-2 min-w-0 mr-auto">
          {icon}
          <span className="font-semibold truncate" title={title}>{title}</span>
          {typeof count === 'number' && (
            <span className="text-xs text-slate-300">• {count}</span>
          )}
        </div>
        <div className="flex-1 min-w-[220px] max-w-[440px]">
          <Input.Search
            allowClear
            size="small"
            placeholder="Rechercher dans cette catégorie…"
            value={searchValue}
            onChange={(e)=> onSearchChange(e.target.value)}
          />
        </div>
        <Space size={4} className="ml-auto">
          {onAdd && (
            <Tooltip title="Ajouter un module">
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                Ajouter
              </Button>
            </Tooltip>
          )}
          {dragHandleProps && (
            <Tooltip title="Déplacer la catégorie">
              <Button size="small" type="text" icon={<DragOutlined />} {...dragHandleProps} />
            </Tooltip>
          )}
          <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
            <Button size="small" type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </div>
    </div>
  );
};

export default TableToolbar;
