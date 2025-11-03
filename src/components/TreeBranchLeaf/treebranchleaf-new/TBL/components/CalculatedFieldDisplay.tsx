import React from 'react';
import { Spin, Alert, Tag } from 'antd';
import { EyeInvisibleOutlined } from '@ant-design/icons';
import { useCalculatedFieldValue } from '../hooks/useCalculatedFieldValue';
import { useAuth } from '../../../../../auth/useAuth';

interface CalculatedFieldDisplayProps {
  /** ID du node variable à évaluer */
  nodeId: string;
  /** ID de l'arbre TreeBranchLeaf */
  treeId: string;
  /** Données du formulaire */
  formData: Record<string, unknown>;
  /** Placeholder pendant le chargement */
  placeholder?: string;
}

/**
 * 🎯 Composant simple qui affiche la valeur calculée par le backend
 * 
 * Utilise le hook useCalculatedFieldValue pour appeler /api/tbl/submissions/preview-evaluate
 * et affiche le résultat formaté selon displayConfig du backend
 * 
 * 👑 SUPER ADMIN : Voit toujours toutes les valeurs, même si visibleToUser = false
 * 👤 UTILISATEUR NORMAL : Les valeurs avec visibleToUser = false affichent "(Valeur réservée au système)"
 */
export const CalculatedFieldDisplay: React.FC<CalculatedFieldDisplayProps> = ({
  nodeId,
  treeId,
  formData,
  placeholder = '---'
}) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  // 🔍 DEBUG: Log quand le composant est monté
  console.log('[CalculatedFieldDisplay] 🎯 Rendu avec:', {
    nodeId,
    treeId,
    formDataKeys: Object.keys(formData).length,
    isSuperAdmin
  });

  const { value, loading, error, displayConfig } = useCalculatedFieldValue(nodeId, treeId, formData);
  
  console.error('═══════════════════════════════════════════════════════');
  console.error('🔍 [STEP 6] COMPOSANT CalculatedFieldDisplay');
  console.error('NodeId:', nodeId);
  console.error('Value reçue du hook:', value);
  console.error('Type de value:', typeof value);
  console.error('Loading:', loading);
  console.error('Error:', error);
  console.error('DisplayConfig:', displayConfig);
  console.error('Est undefined?', value === undefined);
  console.error('Est null?', value === null);
  console.error('Est 0?', value === 0);
  console.error('Est "0"?', value === "0");
  console.error('Est 56?', value === 56);
  console.error('Est "56"?', value === "56");
  console.error('═══════════════════════════════════════════════════════');

  if (loading) {
    return (
      <span style={{ color: '#888' }}>
        <Spin size="small" /> {placeholder}
      </span>
    );
  }

  if (error) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        style={{ marginTop: 8 }}
      />
    );
  }

  // 🔒 Gestion de la visibilité selon le rôle
  const isVisible = displayConfig?.visibleToUser ?? true;
  
  if (!isVisible && !isSuperAdmin) {
    // 👤 Utilisateur normal : valeur cachée
    return (
      <span style={{ color: '#888', fontStyle: 'italic' }}>
        <EyeInvisibleOutlined /> (Valeur réservée au système)
      </span>
    );
  }

  if (value === undefined || value === null) {
    return <span style={{ color: '#888' }}>{placeholder}</span>;
  }

  // Récupérer la config d'affichage
  const displayFormat = displayConfig?.displayFormat || 'number';
  const unit = displayConfig?.unit || undefined;
  const precision = displayConfig?.precision ?? 2;

  // Formater la valeur
  const formatValue = (val: unknown): string => {
    // Si c'est un tableau, formater chaque élément
    if (Array.isArray(val)) {
      return val.map(v => formatSingleValue(v)).join(' / ');
    }
    return formatSingleValue(val);
  };

  const formatSingleValue = (val: unknown): string => {
    // Convertir les strings numériques en number
    let numValue: number | undefined;
    if (typeof val === 'number') {
      numValue = val;
    } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
      numValue = Number(val);
    }

    // Si on a un nombre, appliquer le formatage
    if (numValue !== undefined) {
      const formatted = numValue.toFixed(precision);
      
      if (displayFormat === 'currency') {
        return `${formatted} €`;
      }
      if (displayFormat === 'percentage') {
        return `${formatted} %`;
      }
      if (unit) {
        return `${formatted} ${unit}`;
      }
      return formatted;
    }
    
    if (typeof val === 'boolean') {
      return val ? 'Oui' : 'Non';
    }
    
    return String(val);
  };

  return (
    <span style={{ fontWeight: 'bold', color: '#047857' }}>
      {formatValue(value)}
      {/* 👑 Badge Super Admin pour les valeurs cachées */}
      {!isVisible && isSuperAdmin && (
        <Tag color="orange" style={{ marginLeft: 8, fontSize: '11px' }}>
          <EyeInvisibleOutlined /> Caché
        </Tag>
      )}
    </span>
  );
};
