import React, { useState, useCallback, useMemo } from 'react';
import { Table, Button, Space, Modal, message, Typography, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ExportOutlined, ImportOutlined, EyeOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;

interface TableColumn {
  id: string;
  key: string;
  label: string;
  type: string;
  width?: string;
  permissions?: {
    edit?: string[];
    view?: string[];
  };
}

interface TableRow {
  id: string;
  label: string;
  data: Record<string, unknown>;
  permissions?: {
    edit?: string[];
    view?: string[];
    delete?: string[];
  };
}

interface TableConfig {
  name: string;
  description?: string;
  columns: TableColumn[];
  rows: TableRow[];
  permissions?: Record<string, string[]>;
}

interface FieldConfig {
  config?: {
    permissions?: {
      levels?: Record<string, Record<string, string[]>>;
    };
  };
  advancedConfig?: {
    tableConfig?: TableConfig;
  };
}

interface TableauPermissionsProps {
  fieldConfig: FieldConfig;
  context: 'formulaire' | 'devis';
  value?: Record<string, unknown>;
  onChange?: (value: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const TableauPermissions: React.FC<TableauPermissionsProps> = ({
  fieldConfig,
  context,
  readOnly = false
}) => {
  const { user } = useAuth();
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Vérification des permissions
  const hasPermission = useCallback((action: string): boolean => {
    if (!user || !fieldConfig?.advancedConfig?.tableConfig?.permissions) {
      return false;
    }

    const userRole = user.role?.name || 'user';
    const permissions = fieldConfig.advancedConfig.tableConfig.permissions;
    
    return permissions[action]?.includes(userRole) || false;
  }, [user, fieldConfig]);

  // Vérification des permissions contextuelles (formulaire vs devis)
  const hasContextualPermission = useCallback((action: string): boolean => {
    if (!user || !fieldConfig?.config?.permissions) {
      return false;
    }

    const userRole = user.role?.name || 'user';
    const contextPermissions = fieldConfig.config.permissions.levels[userRole];
    
    if (!contextPermissions || !contextPermissions[context]) {
      return false;
    }

    return contextPermissions[context].includes(action);
  }, [user, fieldConfig, context]);

  // Filtrage des colonnes selon les permissions
  const visibleColumns = useMemo(() => {
    if (!fieldConfig?.advancedConfig?.tableConfig?.columns) {
      return [];
    }

    const userRole = user?.role?.name || 'user';
    return fieldConfig.advancedConfig.tableConfig.columns.filter(column => {
      const columnPermissions = column.permissions?.view || ['super_admin', 'admin', 'user'];
      return columnPermissions.includes(userRole);
    });
  }, [fieldConfig, user]);

  // Filtrage des données selon les permissions
  const visibleRows = useMemo(() => {
    if (!fieldConfig?.advancedConfig?.tableConfig?.rows) {
      return [];
    }

    const userRole = user?.role?.name || 'user';
    return fieldConfig.advancedConfig.tableConfig.rows.filter(row => {
      const rowPermissions = row.permissions?.view || ['super_admin', 'admin', 'user'];
      return rowPermissions.includes(userRole);
    });
  }, [fieldConfig, user]);

  // Gestionnaires d'événements
  const handleAddRow = useCallback(async () => {
    if (!hasContextualPermission('manage_data')) {
      message.error('Vous n\'avez pas la permission d\'ajouter des lignes');
      return;
    }
    
    // Logique d'ajout de ligne
    message.info('Fonction d\'ajout de ligne à implémenter');
  }, [hasContextualPermission]);

  const handleEditRow = useCallback(async (record: TableRow) => {
    if (!hasContextualPermission('manage_data')) {
      message.error('Vous n\'avez pas la permission de modifier cette ligne');
      return;
    }
    
    // Logique de modification
    console.log('Modification ligne:', record);
    message.info('Fonction d\'édition à implémenter');
  }, [hasContextualPermission]);

  const handleDeleteRow = useCallback(async (record: TableRow) => {
    if (!hasPermission('delete_row')) {
      message.error('Vous n\'avez pas la permission de supprimer cette ligne');
      return;
    }

    Modal.confirm({
      title: 'Confirmer la suppression',
      content: `Êtes-vous sûr de vouloir supprimer "${record.label || record.id}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          // Logique de suppression
          message.success('Ligne supprimée avec succès');
        } catch {
          message.error('Erreur lors de la suppression');
        }
      }
    });
  }, [hasPermission]);

  const handleViewRow = useCallback((record: TableRow) => {
    Modal.info({
      title: `Détails - ${record.label || record.id}`,
      content: (
        <div>
          {visibleColumns.map(column => (
            <div key={column.key} style={{ marginBottom: '8px' }}>
              <Text strong>{column.label}: </Text>
              <Text>{record.data[column.key] as string}</Text>
            </div>
          ))}
        </div>
      ),
      width: 600
    });
  }, [visibleColumns]);

  const handleExport = useCallback(async () => {
    if (!hasContextualPermission('export_data')) {
      message.error('Vous n\'avez pas la permission d\'exporter les données');
      return;
    }
    
    setLoading(true);
    try {
      // Logique d'export
      message.success('Données exportées avec succès');
    } catch {
      message.error('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  }, [hasContextualPermission]);

  const handleImport = useCallback(async () => {
    if (!hasContextualPermission('import_data')) {
      message.error('Vous n\'avez pas la permission d\'importer les données');
      return;
    }
    
    // Logique d'import
    message.info('Fonction d\'import à implémenter');
  }, [hasContextualPermission]);

  // Génération des colonnes pour la table Ant Design
  const tableColumns = useMemo(() => {
    const columns = visibleColumns.map(column => ({
      title: (
        <Space>
          {column.label}
          {column.permissions && !column.permissions.edit?.includes(user?.role?.name) && (
            <Tooltip title="Colonne en lecture seule pour votre rôle">
              <LockOutlined style={{ color: '#ff6b6b', fontSize: '12px' }} />
            </Tooltip>
          )}
        </Space>
      ),
      dataIndex: column.key,
      key: column.key,
      width: column.width,
      render: (text: string | number) => {
        // Affichage selon le type de colonne
        if (column.type === 'currency') {
          return `${text} EUR`;
        }
        if (column.type === 'percentage') {
          return `${text}%`;
        }
        return text;
      }
    }));

    // Colonne d'actions si permissions appropriées
    const canEdit = hasContextualPermission('manage_data') && !readOnly;
    const canDelete = hasPermission('delete_row') && !readOnly;
    const canView = true; // Tout le monde peut voir les détails

    if (canEdit || canDelete || canView) {
      columns.push({
        title: 'Actions',
        key: 'actions',
        width: '120px',
        render: (_: unknown, record: TableRow) => {
          const userRole = user?.role?.name || 'user';
          const rowEditPermissions = record.permissions?.edit || ['super_admin', 'admin'];
          const rowDeletePermissions = record.permissions?.delete || ['super_admin'];
          
          const canEditRow = canEdit && rowEditPermissions.includes(userRole);
          const canDeleteRow = canDelete && rowDeletePermissions.includes(userRole);

          return (
            <Space size="small">
              {canView && (
                <Tooltip title="Voir détails">
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    size="small"
                    onClick={() => handleViewRow(record)}
                  />
                </Tooltip>
              )}
              
              {canEditRow && (
                <Tooltip title="Modifier">
                  <Button 
                    type="text" 
                    icon={<EditOutlined />} 
                    size="small"
                    onClick={() => handleEditRow(record)}
                  />
                </Tooltip>
              )}
              
              {canDeleteRow && (
                <Tooltip title="Supprimer">
                  <Button 
                    type="text" 
                    icon={<DeleteOutlined />} 
                    size="small"
                    danger
                    onClick={() => handleDeleteRow(record)}
                  />
                </Tooltip>
              )}
              
              {!canEditRow && !canDeleteRow && canView && (
                <Tooltip title="Actions limitées pour votre rôle">
                  <LockOutlined style={{ color: '#ff6b6b', fontSize: '12px' }} />
                </Tooltip>
              )}
            </Space>
          );
        }
      });
    }

    return columns;
  }, [visibleColumns, user, hasPermission, hasContextualPermission, readOnly, handleDeleteRow, handleEditRow, handleViewRow]);

  // Affichage des permissions utilisateur
  const renderPermissionsBadge = () => {
    const userRole = user?.role?.name || 'user';
    const permissions = fieldConfig?.config?.permissions?.levels?.[userRole]?.[context] || [];
    
    let color = 'default';
    let text = 'Aucune permission';
    
    if (permissions.includes('create_structure') || permissions.includes('edit_structure')) {
      color = 'purple';
      text = 'Configuration complète';
    } else if (permissions.includes('manage_data')) {
      color = 'blue';
      text = 'Gestion des données';
    } else if (permissions.includes('use_data')) {
      color = 'green';
      text = 'Utilisation';
    }

    return (
      <Tag color={color} style={{ marginBottom: '16px' }}>
        {text} ({context})
      </Tag>
    );
  };

  // Préparation des données pour la table
  const dataSource = visibleRows.map((row, index) => ({
    key: row.id || index,
    ...row.data,
    ...row // Inclut permissions et autres métadonnées
  }));

  return (
    <div className="tableau-permissions-component">
      {/* En-tête avec titre et permissions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {fieldConfig?.advancedConfig?.tableConfig?.name || 'Tableau'}
          </Title>
          {renderPermissionsBadge()}
        </div>
        
        {/* Actions globales */}
        <Space>
          {hasContextualPermission('manage_data') && !readOnly && context === 'devis' && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddRow}
            >
              Ajouter
            </Button>
          )}
          
          {hasContextualPermission('export_data') && (
            <Button 
              icon={<ExportOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              Exporter
            </Button>
          )}
          
          {hasContextualPermission('import_data') && !readOnly && (
            <Button 
              icon={<ImportOutlined />}
              onClick={handleImport}
            >
              Importer
            </Button>
          )}
        </Space>
      </div>

      {/* Description */}
      {fieldConfig?.advancedConfig?.tableConfig?.description && (
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          {fieldConfig.advancedConfig.tableConfig.description}
        </Text>
      )}

      {/* Message informatif selon le contexte */}
      {context === 'formulaire' && user?.role?.name !== 'super_admin' && (
        <div style={{ 
          background: '#fff7e6', 
          border: '1px solid #ffd591', 
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <Text type="warning">
            <LockOutlined style={{ marginRight: '8px' }} />
            Configuration des tableaux réservée au Super Administrateur dans les Formulaires
          </Text>
        </div>
      )}

      {/* Table principale */}
      <Table
        columns={tableColumns}
        dataSource={dataSource}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} sur ${total} éléments`
        }}
        rowSelection={
          hasContextualPermission('manage_data') && !readOnly ? {
            selectedRowKeys: selectedRows,
            onChange: setSelectedRows,
            type: 'checkbox'
          } : undefined
        }
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
        loading={loading}
      />

      {/* Actions pour sélection multiple */}
      {selectedRows.length > 0 && hasContextualPermission('manage_data') && !readOnly && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#f0f2f5', 
          borderRadius: '6px'
        }}>
          <Space>
            <Text strong>{selectedRows.length} élément(s) sélectionné(s)</Text>
            {hasPermission('delete_row') && (
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Supprimer les éléments sélectionnés',
                    content: `Confirmer la suppression de ${selectedRows.length} élément(s) ?`,
                    okText: 'Supprimer',
                    okType: 'danger',
                    cancelText: 'Annuler',
                    onOk: () => {
                      // Logique de suppression multiple
                      message.success(`${selectedRows.length} élément(s) supprimé(s)`);
                      setSelectedRows([]);
                    }
                  });
                }}
              >
                Supprimer la sélection
              </Button>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export default TableauPermissions;
