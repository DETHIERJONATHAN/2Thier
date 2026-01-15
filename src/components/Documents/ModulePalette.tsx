/**
 * 🎨 MODULE PALETTE - Panneau latéral avec tous les modules disponibles
 * Les modules peuvent être glissés sur la page
 */

import { useState } from 'react';
import { Input, Collapse, Tooltip, Badge, Button, Divider } from 'antd';
import { SearchOutlined, FileAddOutlined } from '@ant-design/icons';
import { MODULE_REGISTRY, MODULE_CATEGORIES, ModuleDefinition, ModuleCategory } from './ModuleRegistry';

interface ModulePaletteProps {
  onModuleDragStart: (moduleId: string) => void;
  onModuleDragEnd: () => void;
  onModuleClick: (moduleId: string) => void; // Pour ajouter directement au clic
  onApplyTemplate?: () => void; // Nouveau: pour appliquer un template pré-fait
}

const ModulePalette = ({
  onModuleDragStart,
  onModuleDragEnd,
  onModuleClick,
  onApplyTemplate,
}: ModulePaletteProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['content', 'media', 'data']);

  // Filtrer les modules par recherche
  const filteredModules = searchTerm
    ? MODULE_REGISTRY.filter(
        m =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : MODULE_REGISTRY;

  // Grouper par catégorie
  const modulesByCategory = Object.keys(MODULE_CATEGORIES).reduce((acc, category) => {
    acc[category as ModuleCategory] = filteredModules.filter(m => m.category === category);
    return acc;
  }, {} as Record<ModuleCategory, ModuleDefinition[]>);

  const handleDragStart = (e: React.DragEvent, module: ModuleDefinition) => {
    e.dataTransfer.setData('moduleId', module.id);
    e.dataTransfer.effectAllowed = 'copy';
    onModuleDragStart(module.id);
  };

  const handleDragEnd = () => {
    onModuleDragEnd();
  };

  const renderModule = (module: ModuleDefinition) => (
    <div
      key={module.id}
      draggable
      onDragStart={(e) => handleDragStart(e, module)}
      onDragEnd={handleDragEnd}
      onClick={() => onModuleClick(module.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: '#2d2d2d',
        borderRadius: '8px',
        cursor: 'grab',
        transition: 'all 0.2s',
        border: '1px solid #3d3d3d',
        marginBottom: '6px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = '#3d3d3d';
        (e.currentTarget as HTMLElement).style.borderColor = '#1890ff';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = '#2d2d2d';
        (e.currentTarget as HTMLElement).style.borderColor = '#3d3d3d';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
      }}
    >
      {/* Icône */}
      <span style={{ fontSize: '20px' }}>{module.icon}</span>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#fff',
          marginBottom: '2px',
        }}>
          {module.name}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {module.description}
        </div>
      </div>

      {/* Badge thèmes */}
      {module.themes.length > 0 && (
        <Tooltip title={`${module.themes.length} thèmes disponibles`}>
          <Badge
            count={module.themes.length}
            style={{
              backgroundColor: '#722ed1',
              fontSize: '10px',
            }}
          />
        </Tooltip>
      )}
    </div>
  );

  const collapseItems = Object.entries(MODULE_CATEGORIES).map(([categoryId, category]) => {
    const modules = modulesByCategory[categoryId as ModuleCategory] || [];
    if (modules.length === 0) return null;

    return {
      key: categoryId,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{category.icon}</span>
          <span style={{ fontWeight: 600, color: '#fff' }}>{category.name}</span>
          <Badge
            count={modules.length}
            style={{
              backgroundColor: category.color,
              fontSize: '10px',
              marginLeft: 'auto',
            }}
          />
        </div>
      ),
      children: (
        <div style={{ padding: '4px 0' }}>
          {modules.map(renderModule)}
        </div>
      ),
    };
  }).filter(Boolean);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1f1f1f',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '18px' }}>🧩</span>
          Modules disponibles
        </div>

        {/* Bouton Appliquer un template */}
        {onApplyTemplate && (
          <>
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={onApplyTemplate}
              block
              style={{
                marginBottom: '12px',
                background: 'linear-gradient(135deg, #722ed1 0%, #1890ff 100%)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              📋 Appliquer un template
            </Button>
            <Divider style={{ margin: '8px 0', borderColor: '#333' }} />
          </>
        )}

        {/* Recherche */}
        <Input
          prefix={<SearchOutlined style={{ color: '#666' }} />}
          placeholder="Rechercher un module..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            backgroundColor: '#2d2d2d',
            borderColor: '#3d3d3d',
            color: '#fff',
          }}
          allowClear
        />
      </div>

      {/* Hint drag & drop */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #333',
      }}>
        <div style={{
          fontSize: '11px',
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span>💡</span>
          <span>Glissez un module sur la page ou cliquez pour l'ajouter</span>
        </div>
      </div>

      {/* Liste des modules par catégorie */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        <Collapse
          activeKey={expandedCategories}
          onChange={(keys) => setExpandedCategories(keys as string[])}
          bordered={false}
          style={{ backgroundColor: 'transparent' }}
          items={collapseItems as any}
        />

        {/* Si recherche sans résultat */}
        {searchTerm && filteredModules.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div>Aucun module trouvé pour "{searchTerm}"</div>
          </div>
        )}
      </div>

      {/* Footer - Stats */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #333',
        backgroundColor: '#1a1a1a',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#666',
        }}>
          <span>{MODULE_REGISTRY.length} modules</span>
          <span>{Object.keys(MODULE_CATEGORIES).length} catégories</span>
        </div>
      </div>
    </div>
  );
};

export default ModulePalette;
