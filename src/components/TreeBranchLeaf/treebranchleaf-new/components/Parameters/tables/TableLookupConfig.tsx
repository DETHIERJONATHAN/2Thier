import React from 'react';
import { Space, Select, Typography, Alert, Divider, Tag } from 'antd';
import { CheckCircleOutlined, EyeOutlined, SelectOutlined } from '@ant-design/icons';

interface Column {
  name: string;
  type?: string;
}

interface TableLookupConfigProps {
  tableType: string;
  columns: Column[];
  lookupSelectColumn?: string | null;
  lookupDisplayColumns?: string[];
  onSelectColumnChange: (value: string | undefined) => void;
  onDisplayColumnsChange: (values: string[]) => void;
}

/**
 * Composant de configuration du lookup pour les tables simples (type = 'columns')
 * 
 * Permet de définir :
 * 1. La colonne de sélection (dans laquelle l'utilisateur choisit)
 * 2. Les colonnes de données à récupérer (qui seront stockées/disponibles après sélection)
 */
const TableLookupConfig: React.FC<TableLookupConfigProps> = ({
  tableType,
  columns,
  lookupSelectColumn,
  lookupDisplayColumns = [],
  onSelectColumnChange,
  onDisplayColumnsChange
}) => {
  // Afficher uniquement pour les tables de type 'columns'
  if (tableType !== 'columns' || columns.length === 0) {
    return null;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Divider orientation="left">
        <Space>
          <SelectOutlined style={{ color: '#1890ff' }} />
          <Typography.Text strong>Configuration Lookup</Typography.Text>
        </Space>
      </Divider>

      {/* 1️⃣ Colonne de sélection */}
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          <Typography.Text strong>
            1. Colonne de sélection
          </Typography.Text>
          <Tag color="blue" icon={<SelectOutlined />}>Choix</Tag>
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          La colonne dans laquelle l'utilisateur fait son choix (ex: Marque, Modèle, Référence...)
        </Typography.Text>
        <Select
          placeholder="Choisir la colonne de sélection..."
          style={{ width: '100%' }}
          allowClear
          value={lookupSelectColumn || undefined}
          onChange={(val) => {
            onSelectColumnChange(val);
            // Retirer la colonne de sélection des colonnes d'affichage si elle y est
            if (val && lookupDisplayColumns.includes(val)) {
              onDisplayColumnsChange(lookupDisplayColumns.filter(col => col !== val));
            }
          }}
          options={columns.map((col) => ({
            label: `${col.name}${col.type ? ` (${col.type})` : ''}`,
            value: col.name
          }))}
        />
      </Space>

      {/* 2️⃣ Colonnes de données à récupérer */}
      {lookupSelectColumn && (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space>
            <Typography.Text strong>
              2. Colonnes de données à récupérer
            </Typography.Text>
            <Tag color="green" icon={<EyeOutlined />}>Données</Tag>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            Les colonnes dont les valeurs seront stockées et disponibles après la sélection
          </Typography.Text>
          <Select
            mode="multiple"
            placeholder="Choisir les colonnes de données..."
            style={{ width: '100%' }}
            value={lookupDisplayColumns}
            onChange={onDisplayColumnsChange}
            maxTagCount="responsive"
            options={columns
              .filter((col) => col.name !== lookupSelectColumn)
              .map((col) => ({
                label: `${col.name}${col.type ? ` (${col.type})` : ''}`,
                value: col.name
              }))
            }
          />
        </Space>
      )}

      {/* 3️⃣ Aperçu de la configuration */}
      {lookupSelectColumn && lookupDisplayColumns.length > 0 && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="Configuration du lookup active"
          description={
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Text>
                🎯 <strong>L'utilisateur choisit parmi :</strong> <Tag color="blue">{lookupSelectColumn}</Tag>
              </Typography.Text>
              <Typography.Text>
                💾 <strong>Données récupérées :</strong>{' '}
                {lookupDisplayColumns.map((col) => (
                  <Tag key={col} color="green" style={{ marginBottom: 4 }}>
                    {col}
                  </Tag>
                ))}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 8 }}>
                <strong>Exemple :</strong> Si l'utilisateur sélectionne "Jinko" dans le dropdown, 
                les valeurs {lookupDisplayColumns.map((c) => `"${c}"`).join(', ')} 
                de cette ligne seront disponibles dans le système via des tokens comme{' '}
                <code style={{ fontSize: '10px', background: '#f0f0f0', padding: '2px 4px', borderRadius: '2px' }}>
                  @table.{'<tableId>'}.{lookupDisplayColumns[0]}
                </code>
              </Typography.Text>
            </Space>
          }
        />
      )}

      {/* Message d'aide si aucune configuration */}
      {!lookupSelectColumn && (
        <Alert
          type="info"
          showIcon
          message="Configuration optionnelle"
          description="Le lookup permet de récupérer automatiquement des données associées lors d'une sélection. Configurez une colonne de sélection pour activer cette fonctionnalité."
        />
      )}
    </Space>
  );
};

export default TableLookupConfig;
