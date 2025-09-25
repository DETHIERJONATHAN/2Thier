import React from 'react';
import DraggableItem from './DraggableItemHTML5';
import { ValidationItem } from './types';

// Liste des opérateurs disponibles pour les validations
const operators = [
  { id: 'eq', label: '=', description: 'Égalité' },
  { id: 'neq', label: '≠', description: 'Différence' },
  { id: 'gt', label: '>', description: 'Supérieur à' },
  { id: 'gte', label: '≥', description: 'Supérieur ou égal à' },
  { id: 'lt', label: '<', description: 'Inférieur à' },
  { id: 'lte', label: '≤', description: 'Inférieur ou égal à' },
  { id: 'and', label: 'ET', description: 'Condition AND' },
  { id: 'or', label: 'OU', description: 'Condition OR' },
  { id: 'not', label: 'NON', description: 'Négation' }
];

/**
 * Palette d'opérateurs pour l'éditeur de validation.
 * Permet de faire glisser des opérateurs dans la zone de validation.
 */
const OperatorsPalette: React.FC = () => {
  return (
    <div className="bg-white">
      <div className="flex flex-wrap gap-1">
        {operators.map(op => (
          <DraggableItem
            key={op.id}
            id={`operator-${op.id}`}
            type="operator"
            data={{
              type: 'operator',
              id: op.id,
              value: op.id,
              label: op.label
            } as ValidationItem}
            className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-700 text-sm hover:bg-purple-100"
          >
            <div className="flex items-center gap-1" title={op.description}>
              <span>{op.label}</span>
            </div>
          </DraggableItem>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-1 mt-2">
        {[
          { id: 'add', label: '+', description: 'Addition' },
          { id: 'sub', label: '-', description: 'Soustraction' },
          { id: 'mul', label: '×', description: 'Multiplication' },
          { id: 'div', label: '÷', description: 'Division' },
          { id: 'mod', label: '%', description: 'Modulo' }
        ].map(op => (
          <DraggableItem
            key={op.id}
            id={`math-${op.id}`}
            type="operator"
            data={{
              type: 'operator',
              id: op.id,
              value: op.id,
              label: op.label
            } as ValidationItem}
            className="px-2 py-1 bg-red-50 border border-red-200 rounded text-red-700 text-sm hover:bg-red-100"
          >
            <span title={op.description}>{op.label}</span>
          </DraggableItem>
        ))}
      </div>
    </div>
  );
};

export default OperatorsPalette;
