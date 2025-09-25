/**
 * 📋 SectionFieldRenderer - Composant pour les champs dans les sections calculatrices
 * 
 * Les champs dans une section ne sont PAS des champs d'encodage mais des champs d'AFFICHAGE.
 * Ils montrent le résultat de formules, conditions, tableaux mais ne permettent pas la saisie.
 */

import React from 'react';
import { Card, Tag, Tooltip } from 'antd';
import { CalculatorOutlined, EyeOutlined, FormulaOutlined, TableOutlined, BranchesOutlined } from '@ant-design/icons';
import type { TreeBranchLeafNode } from '../types';

interface SectionFieldRendererProps {
  node: TreeBranchLeafNode;
  value?: unknown;
  isPreview?: boolean;
}

const SectionFieldRenderer: React.FC<SectionFieldRendererProps> = ({
  node,
  value,
  isPreview = false
}) => {
  // Détermine l'icône selon les capacités du champ
  const getFieldIcon = () => {
    if (node.hasFormula) return <FormulaOutlined style={{ color: '#1890ff' }} />;
    if (node.hasTable) return <TableOutlined style={{ color: '#52c41a' }} />;
    if (node.hasCondition) return <BranchesOutlined style={{ color: '#722ed1' }} />;
    return <CalculatorOutlined style={{ color: '#fa8c16' }} />;
  };

  // Formate la valeur selon le type de champ
  const formatDisplayValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    
    // Pour les nombres, ajouter l'unité si définie
    if (typeof val === 'number') {
      // Ici on pourrait récupérer l'unité depuis fieldConfig
      return val.toLocaleString('fr-FR');
    }
    
    if (typeof val === 'boolean') {
      return val ? '✅ Oui' : '❌ Non';
    }
    
    return String(val);
  };

  // Détermine les tags d'information
  const getInfoTags = () => {
    const tags = [];
    
    if (node.hasFormula) {
      tags.push(
        <Tag key="formula" color="blue" size="small">
          🧮 Formule
        </Tag>
      );
    }
    
    if (node.hasCondition) {
      tags.push(
        <Tag key="condition" color="purple" size="small">
          ⚖️ Condition
        </Tag>
      );
    }
    
    if (node.hasTable) {
      tags.push(
        <Tag key="table" color="green" size="small">
          🧩 Tableau
        </Tag>
      );
    }
    
    if (node.hasAPI) {
      tags.push(
        <Tag key="api" color="cyan" size="small">
          🔌 API
        </Tag>
      );
    }
    
    return tags;
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: '8px',
        backgroundColor: '#fafafa',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        position: 'relative'
      }}
      styles={{
        body: {
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }
      }}
    >
      {/* Icône indicatrice */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        fontSize: '16px'
      }}>
        {getFieldIcon()}
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1 }}>
        {/* Libellé */}
        <div style={{ 
          fontWeight: 500, 
          color: '#262626',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {node.label}
          <Tooltip title="Champ calculé en lecture seule">
            <EyeOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
          </Tooltip>
        </div>

        {/* Valeur calculée */}
        <div style={{ 
          fontSize: '14px',
          color: value ? '#262626' : '#8c8c8c',
          fontFamily: 'monospace',
          backgroundColor: '#fff',
          padding: '4px 8px',
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {formatDisplayValue(value)}
        </div>

        {/* Tags informatifs */}
        {getInfoTags().length > 0 && (
          <div style={{ 
            marginTop: '8px',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {getInfoTags()}
          </div>
        )}
      </div>

      {/* Description optionnelle */}
      {node.description && !isPreview && (
        <Tooltip title={node.description}>
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: '#8c8c8c',
            cursor: 'help'
          }}>
            ?
          </div>
        </Tooltip>
      )}
    </Card>
  );
};

export default SectionFieldRenderer;
