import React, { useState } from 'react';
import { Input, Card, Typography } from 'antd';
import { 
  CaretRightOutlined, 
  CaretDownOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  FieldBinaryOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface UserNodeData {
  id: string;
  label: string;
  type: 'O' | 'O+C' | 'C';
  fieldType?: string;
  fieldConfig?: {
    required?: boolean;
    placeholder?: string;
    options?: string[];
  };
  children?: UserNodeData[];
}

// Icônes selon le type - Version utilisateur
const UserNodeIcon: React.FC<{ type: 'O' | 'O+C' | 'C' }> = ({ type }) => {
  switch (type) {
    case 'O':
      return <span className="text-blue-600 mr-2">📄</span>;
    case 'O+C':
      return <span className="text-green-600 mr-2">🟩</span>;
    case 'C':
      return <span className="text-yellow-500 mr-2">🟨</span>;
  }
};

// Composant TreeNode pour les utilisateurs
const UserTreeNode: React.FC<{
  node: UserNodeData;
  level: number;
  onFieldChange?: (nodeId: string, value: any) => void;
}> = ({ node, level, onFieldChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [fieldValue, setFieldValue] = useState("");

  const hasChildren = node.children && node.children.length > 0;
  const indentWidth = level * 20;

  const handleFieldChange = (value: string) => {
    setFieldValue(value);
    if (onFieldChange) {
      onFieldChange(node.id, value);
    }
  };

  return (
    <div className="select-none">
      {/* Ligne principale du nœud */}
      <div 
        className="flex items-center py-2 px-3 hover:bg-gray-50 rounded cursor-pointer transition-colors"
        style={{ paddingLeft: indentWidth + 12 }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Chevron d'expansion */}
        <div className="w-4 flex justify-center mr-2">
          {hasChildren ? (
            expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
          ) : (
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
          )}
        </div>

        {/* Icône du type */}
        <UserNodeIcon type={node.type} />

        {/* Label */}
        <span className="font-medium text-gray-800">{node.label}</span>
      </div>

      {/* Champ inline pour O+C ou C */}
      {(node.type === 'O+C' || node.type === 'C') && expanded && (
        <div className="mb-2" style={{ paddingLeft: indentWidth + 40 }}>
          <Input
            placeholder={node.fieldConfig?.placeholder || `Valeur pour ${node.label}`}
            value={fieldValue}
            onChange={(e) => handleFieldChange(e.target.value)}
            className="w-full"
            required={node.fieldConfig?.required}
          />
        </div>
      )}

      {/* Enfants */}
      {expanded && hasChildren && (
        <div className="border-l border-gray-300 pl-2" style={{ marginLeft: indentWidth + 16 }}>
          {node.children!.map(child => (
            <UserTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onFieldChange={onFieldChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Composant principal pour les utilisateurs
interface GenealogyUserViewProps {
  tree: UserNodeData[];
  onFormChange?: (formData: Record<string, any>) => void;
}

const GenealogyUserView: React.FC<GenealogyUserViewProps> = ({ tree, onFormChange }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFieldChange = (nodeId: string, value: any) => {
    const newFormData = { ...formData, [nodeId]: value };
    setFormData(newFormData);
    
    if (onFormChange) {
      onFormChange(newFormData);
    }
  };

  if (!tree || tree.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <Text className="text-gray-500">Aucune option disponible</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-2xl">
      <div className="mb-4">
        <Text className="text-lg font-semibold text-gray-800">Explorateur d'options</Text>
      </div>
      
      <div className="space-y-1">
        {tree.map(node => (
          <UserTreeNode
            key={node.id}
            node={node}
            level={0}
            onFieldChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  );
};

export default GenealogyUserView;
