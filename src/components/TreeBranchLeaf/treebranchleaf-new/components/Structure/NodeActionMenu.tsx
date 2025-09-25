import React, { useState } from 'react';
import { Dropdown, Modal, message } from 'antd';
import { 
  MoreOutlined, 
  EditOutlined, 
  CopyOutlined, 
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { TreeNode } from '../../types';

interface NodeActionMenuProps {
  node: TreeNode;
  readOnly?: boolean;
  isExpanded?: boolean;
  onEdit?: (node: TreeNode, newLabel?: string) => void;
  onDuplicate?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  onMoveUp?: (node: TreeNode) => void;
  onMoveDown?: (node: TreeNode) => void;
  onToggleVisibility?: (node: TreeNode) => void;
  onOpenSettings?: (node: TreeNode) => void;
  onMoveToRoot?: (node: TreeNode) => void;
  onToggleExpand?: (node: TreeNode) => void;
}

export const NodeActionMenu: React.FC<NodeActionMenuProps> = ({
  node,
  readOnly = false,
  isExpanded,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onOpenSettings,
  onMoveToRoot,
  onToggleExpand
}) => {
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // Log pour vérifier que le composant est monté et l'ID
  console.log('🔄 [NodeActionMenu] Composant monté pour node:', node.label, 'ID:', node.id, 'readOnly:', readOnly);

  // Vérification que le nœud a un ID valide
  const hasValidId = node.id && node.id !== 'undefined';

  const handleEdit = () => {
    if (onEdit) {
      onEdit(node);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(node);
    }
  };

  const handleDelete = () => {
    if (!hasValidId) {
      message.error('Impossible de supprimer: nœud sans ID valide');
      return;
    }
    setIsDeleteModalVisible(true);
  };

  const handleDeleteConfirm = () => {
    if (!onDelete) {
      message.error('Erreur: fonction de suppression non disponible');
      return;
    }

    if (!hasValidId) {
      message.error('Impossible de supprimer: nœud sans ID valide');
      setIsDeleteModalVisible(false);
      return;
    }
    
    try {
      onDelete(node);
      setIsDeleteModalVisible(false);
      message.success('Élément supprimé avec succès');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      message.error(`Erreur lors de la suppression: ${errorMessage}`);
      setIsDeleteModalVisible(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
  };

  const handleMoveUp = () => {
    if (!hasValidId) {
      message.error('Impossible de déplacer: nœud sans ID valide');
      return;
    }
    if (onMoveUp) {
      onMoveUp(node); // Passer le nœud complet, pas juste l'ID
    }
  };

  const handleMoveDown = () => {
    if (!hasValidId) {
      message.error('Impossible de déplacer: nœud sans ID valide');
      return;
    }
    if (onMoveDown) {
      onMoveDown(node); // Passer le nœud complet, pas juste l'ID
    }
  };

  const handleToggleVisibility = () => {
    if (!hasValidId) {
      message.error('Impossible de modifier la visibilité: nœud sans ID valide');
      return;
    }
    if (onToggleVisibility) {
      onToggleVisibility(node); // Passer le nœud complet, pas juste l'ID
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings(node);
    }
  };

  const handleMenuClick = (menuInfo: { key: string }) => {
    const { key } = menuInfo;

    switch (key) {
      case 'edit':
        handleEdit();
        break;
      case 'duplicate':
        handleDuplicate();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'moveUp':
        handleMoveUp();
        break;
      case 'moveDown':
        handleMoveDown();
        break;
      case 'toggleVisibility':
        handleToggleVisibility();
        break;
      case 'settings':
        handleOpenSettings();
        break;
      default:
        break;
    }
  };

  const menuItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Modifier',
      disabled: readOnly || !onEdit
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Dupliquer',
      disabled: readOnly || !onDuplicate
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Supprimer',
      disabled: readOnly || !onDelete || !hasValidId,
      danger: true
    },
    {
      type: 'divider' as const
    },
    {
      key: 'moveUp',
      icon: <ArrowUpOutlined />,
      label: 'Monter',
      disabled: readOnly || !onMoveUp || !hasValidId
    },
    {
      key: 'moveDown',
      icon: <ArrowDownOutlined />,
      label: 'Descendre',
      disabled: readOnly || !onMoveDown || !hasValidId
    },
    {
      key: 'toggleVisibility',
      icon: node.visible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      label: node.visible ? 'Masquer' : 'Afficher',
      disabled: readOnly || !onToggleVisibility || !hasValidId
    },
    {
      type: 'divider' as const
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Paramètres',
      disabled: readOnly || !onOpenSettings || !hasValidId
    }
  ];

  return (
    <>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: handleMenuClick
        }}
        trigger={['click']}
        placement="bottomRight"
        onOpenChange={(open) => {
          console.log('🔄 [NodeActionMenu] Dropdown onOpenChange:', open);
        }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded cursor-pointer opacity-60 hover:opacity-100"
          style={{ zIndex: 1000 }}
          onClick={(e) => {
            console.log('🔄 [NodeActionMenu] Click détecté sur le menu 3 points');
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            console.log('🔄 [NodeActionMenu] MouseDown détecté');
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            console.log('🔄 [NodeActionMenu] PointerDown détecté - ARRÊT complet de la propagation');
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragStart={(e) => {
            console.log('🔄 [NodeActionMenu] DragStart bloqué');
            e.preventDefault();
            e.stopPropagation();
          }}
          draggable={false}
        >
          <MoreOutlined className="text-xs text-gray-500" />
        </div>
      </Dropdown>

      <Modal
        title="Confirmer la suppression"
        open={isDeleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer l'élément "<strong>{node.label}</strong>" ?
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Cette action est irréversible.
        </p>
      </Modal>
    </>
  );
};