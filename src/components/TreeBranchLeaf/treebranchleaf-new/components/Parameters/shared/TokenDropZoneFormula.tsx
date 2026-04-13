import React from 'react';
import { Card, Empty, Tag } from 'antd';
import { logger } from '../../../../../../lib/logger';

interface TokenDropZoneProps {
  tokens: string[];
  onChange: (tokens: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  nodeCache: Record<string, { label: string; type: string }>;
}

const TokenDropZone: React.FC<TokenDropZoneProps> = ({ 
  tokens, 
  onChange, 
  placeholder = "Glissez ici des références (@value.*, @key.*, #marker.*) ou vides",
  disabled = false,
  nodeCache 
}) => {
  
  // Debug pour voir les tokens reçus
  // logger.debug('🔍 Debug TokenDropZoneFormula - tokens reçus:', tokens); // ✨ Log réduit
  // logger.debug('🔍 Debug TokenDropZoneFormula - nodeCache:', nodeCache); // ✨ Log réduit
  
  const renderToken = (token: string, index: number) => {
    const removeToken = () => {
      if (disabled) return;
      const newTokens = tokens.filter((_, i) => i !== index);
      onChange(newTokens);
    };

    // Si c'est une référence de nœud
    if (token.startsWith('@value.') || token.startsWith('@key.')) {
      const nodeId = token.replace('@value.', '').replace('@key.', '');
      const nodeInfo = nodeCache[nodeId];
      const displayLabel = nodeInfo?.label || nodeId.substring(0, 8) + '...';
      
      return (
        <Tag 
          key={`item-${index}`}
          color="blue"
          closable={!disabled}
          onClose={removeToken}
          style={{ margin: '2px', cursor: disabled ? 'default' : 'pointer' }}
        >
          {token.startsWith('@value.') ? '📊' : '🔑'} {displayLabel}
        </Tag>
      );
    }

    // Si c'est un marqueur
    if (token.startsWith('#marker.')) {
      return (
        <Tag 
          key={`item-${index}`}
          color="orange"
          closable={!disabled}
          onClose={removeToken}
          style={{ margin: '2px', cursor: disabled ? 'default' : 'pointer' }}
        >
          📍 {token.replace('#marker.', '')}
        </Tag>
      );
    }

    // Pour les autres tokens (opérateurs, nombres, etc.)
    const getTokenColor = (token: string) => {
      if (['+', '-', '*', '/', '(', ')'].includes(token)) return 'purple';
      if (!isNaN(Number(token))) return 'green';
      return 'default';
    };

    return (
      <Tag 
        key={`item-${index}`}
        color={getTokenColor(token)}
        closable={!disabled}
        onClose={removeToken}
        style={{ margin: '2px', cursor: disabled ? 'default' : 'pointer' }}
      >
        {token}
      </Tag>
    );
  };

  const content = () => {
    if (!tokens || tokens.length === 0) {
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description={placeholder}
          style={{ margin: '12px 0' }}
        />
      );
    }

    return (
      <div style={{ 
        minHeight: '40px', 
        padding: '8px',
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'flex-start',
        gap: '4px'
      }}>
        {tokens.map(renderToken)}
      </div>
    );
  };

  return (
    <Card 
      size="small" 
      style={{ 
        backgroundColor: '#fafafa',
        border: '1px dashed #d9d9d9',
        borderRadius: '6px'
      }}
    >
      {content()}
    </Card>
  );
};

export default TokenDropZone;
