import React, { useState, useEffect } from 'react';
import type { Formula } from "../../store/slices/types";
import FormulaSequenceEditor from './FormulaSequenceEditor';
import OperatorsPalette from './OperatorsPalette';
import FormulaEvaluator from './FormulaEvaluator';
import FormulaRefsPalette from './FormulaRefsPalette';
import FunctionsPalette from './FunctionsPalette';
import ConditionBlockPalette from './ConditionBlockPalette';
import ValueConstantsPalette from './ValueConstantsPalette';
import CollapsiblePanel from './CollapsiblePanel';
import { validateFormula, getAPIHeaders } from '../../utils/formulaValidator';
import { Tooltip, Button, Dropdown, Space, Card, Popconfirm } from 'antd';
import { DeleteOutlined, DownOutlined } from '@ant-design/icons';

interface FormulaItemEditorProps {
  formula: Formula;
  isOpen?: boolean; // Pour rétrocompatibilité
  isExpanded?: boolean;
  onToggleOpen?: () => void; // Pour rétrocompatibilité
  onToggleExpand?: () => void;
  onDelete: () => void;
  onUpdate?: (formula: Formula) => void;
}

/**
 * Affiche une seule formule et son éditeur si elle est dépliée.
 */
const FormulaItemEditor: React.FC<FormulaItemEditorProps> = ({ 
  formula, 
  isOpen, 
  isExpanded,
  onToggleOpen,
  onToggleExpand,
  onDelete,
  onUpdate
}) => {
  // Utiliser les nouvelles props ou retomber sur les anciennes pour la rétrocompatibilité
  const isFormulaOpen = isExpanded !== undefined ? isExpanded : isOpen;
  const toggleFormula = onToggleExpand || onToggleOpen;
  const invalid = !formula || !formula.id;

  // Initialiser avec le nom actuel ou "Nouvelle formule" par défaut
  const initialName = formula.name || "Nouvelle formule";
  // Limiter les logs en mode développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FormulaItemEditor] 🏷️ Initialisation avec nom: "${initialName}" pour formule ${formula.id}`);
  }
  const [name, setName] = useState(initialName);
  
  // État pour gérer l'affichage du mode test ou édition
  const [viewMode, setViewMode] = useState<'edit' | 'test'>('edit');

  // Mettre à jour le nom local si le nom de la formule change
  useEffect(() => {
    if (formula && formula.name) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FormulaItemEditor] 🔄 Mise à jour du nom local suite à changement: "${formula.name}"`);
      }
      setName(formula.name);
    }
  }, [formula]);

  const handleNameBlur = () => {
    if (formula && formula.id && name !== formula.name) {
      console.log(`[FormulaItemEditor] ✏️ Mise à jour du nom de la formule ${formula.id}: "${formula.name}" => "${name}"`);
      
      // Valider la formule actuelle
      const validation = validateFormula(formula, 'FormulaItemEditor');
      if (!validation.isValid) {
        console.error(`[FormulaItemEditor] ❌ Validation de la formule échouée: ${validation.message}`, validation.details);
        return;
      }
      
      // Préparer les données pour l'API directement, sans passer par prepareFormulaForAPI
      // Cela évite les problèmes de conversion de types entre les formules du store et notre utilitaire
      const updatedFormulaData = {
        id: formula.id,
        name: name,
        sequence: formula.sequence || [],
        targetProperty: formula.targetProperty,
        expression: formula.expression,
        targetFieldId: formula.targetFieldId,
        fieldId: formula.fieldId || formula.targetFieldId // S'assurer que le fieldId est envoyé explicitement
      };
      
      // Utiliser les headers standard
      const headers = getAPIHeaders();
      
      // Récupérer le fieldId associé à cette formule
      // Pour une formule, le targetFieldId est le fieldId où la formule est calculée/appliquée
      const fieldId = formula.fieldId || formula.targetFieldId;
      
      if (!fieldId) {
        console.error(`[FormulaItemEditor] ❌ Impossible de mettre à jour la formule: fieldId manquant.`);
        return;
      }
      
      console.log(`[FormulaItemEditor] 📤 Envoi de la mise à jour directe à l'API (fieldId: ${fieldId})`);
      
      // Utiliser l'URL qui fonctionne correctement avec le backend
      const apiUrl = `/api/fields/${fieldId}/formulas/${formula.id}`;
        
      // Mettre à jour directement via l'API au lieu du store
      fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedFormulaData)
      })
  .then(async response => {
        if (response.ok) {
          console.log(`[FormulaItemEditor] ✅ Nom de la formule mis à jour avec succès via API directe`);
          // Déclencher un événement personnalisé pour informer le parent (sans délai pour réduire les problèmes)
          const event = new CustomEvent('formula-updated', { 
            detail: { formulaId: formula.id, success: true, action: 'rename' } 
          });
          document.dispatchEvent(event);
          
          // Mettre à jour l'interface si onUpdate est défini
          if (onUpdate) {
            onUpdate({...formula, name: name});
          }
        } else {
          // Essayer de lire les détails de l'erreur
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || '';
          } catch {
            // Ignore les erreurs de parsing
          }
          
          console.error(`[FormulaItemEditor] ❌ Échec de la mise à jour du nom via API: ${response.statusText}`, 
            errorDetails ? `\nDétails: ${errorDetails}` : '');
            
          // Afficher une notification dans l'interface utilisateur
          const errorMessage = document.createElement('div');
          errorMessage.className = 'fixed bottom-4 right-4 bg-red-100 text-red-800 p-2 rounded shadow z-50';
          errorMessage.innerText = `Erreur de sauvegarde: ${response.statusText}${errorDetails ? `\n${errorDetails}` : ''}`;
          document.body.appendChild(errorMessage);
          setTimeout(() => errorMessage.remove(), 5000);
        }
      })
      .catch(error => {
        console.error(`[FormulaItemEditor] ❌ Erreur lors de la mise à jour du nom via API:`, error);
      });
    }
  };

  const insertOp = (op: string) => {
    const evt = new CustomEvent('formula-toolbar-insert', { detail: { type: 'operator', value: op, label: op, formulaId: formula.id } });
    document.dispatchEvent(evt);
  };

  // Debug limité en mode développement
  if (!invalid && process.env.NODE_ENV === 'development') {
    console.log(`[FormulaItemEditor] Rendering formula ${formula.id}, isOpen=${isFormulaOpen}`, { name: formula.name, id: formula.id, sequenceItems: formula.sequence?.length || 0 });
  }

  if (invalid) {
    console.error('[FormulaItemEditor] Formula is undefined or missing ID');
    return <div className="p-2 bg-red-50 text-red-800 text-xs rounded border border-red-200">Erreur: Formule invalide ou corrompue</div>;
  }

  // Affichage de l'en-tête de la formule et du contenu s'il est déplié
  return (
    <Card
      size="small"
      title={
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={toggleFormula}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#1677ff' }} />
          <span className="font-medium">{formula.name || 'Formule sans nom'}</span>
        </div>
      }
      extra={
        <Popconfirm
          title="Supprimer cette formule ?"
          okText="Oui"
          cancelText="Non"
          onConfirm={() => { onDelete(); }}
        >
          <Button size="small" danger icon={<DeleteOutlined />} onClick={e=>e.stopPropagation()} />
        </Popconfirm>
      }
      styles={{
        header: { background: '#fafafa', borderBottom: '1px solid #f0f0f0', padding: '8px 12px' },
        body: { padding: 12, background: '#f8fafc' }
      }}
      style={{ borderLeft: '4px solid #1677ff', marginBottom: 8 }}
    >
      {isFormulaOpen && (
        <div>
           <div className="flex flex-col gap-4 max-w-full">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la formule</label>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleNameBlur();
                }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={handleNameBlur}
                      onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                      placeholder="Nom de la formule"
                      className={`input input-bordered input-sm w-full ${formula.name !== name ? 'border-blue-500 bg-blue-50' : ''}`}
                      autoComplete="off"
                    />
                  </div>
                </form>
                {formula.name !== name && (
                  <p className="text-xs text-blue-600 mt-1">
                    <span className="font-bold">⚠️</span> Appuyez sur Entrée ou cliquez ailleurs pour sauvegarder le nom
                  </p>
                )}
                {formula.name === name && name && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-bold">✓</span> Nom actuel: {name}
                  </p>
                )}
              </div>
              <div className="w-full max-w-full">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Construction</label>
                {/* Palette compacte avec boutons Ant Design (icône + info-bulle) et menus déroulants */}
                <div className="mb-2">
                  <Space size={6} wrap>
                    {/* Constante 0 */}
                    <Tooltip title="Constante 0">
                      <Button
                        size="small"
                        shape="circle"
                        onClick={() => {
                          const evt = new CustomEvent('formula-toolbar-insert', { detail: { type: 'value', value: '0', label: '0', formulaId: formula.id } });
                          document.dispatchEvent(evt);
                        }}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('formula-element-type', 'value');
                          e.dataTransfer.setData('value-value', '0');
                          e.dataTransfer.setData('value-label', '0');
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        0
                      </Button>
                    </Tooltip>

                    {/* Opérateurs de base */}
                    {[
                      { v: '+', t: 'Addition' },
                      { v: '-', t: 'Soustraction' },
                      { v: '*', t: 'Multiplication' },
                      { v: '/', t: 'Division' },
                    ].map((op) => (
                      <Tooltip title={op.t} key={`op-btn-${op.v}`}>
                        <Button
                          size="small"
                          shape="circle"
                          onClick={() => {
                            const evt = new CustomEvent('formula-toolbar-insert', { detail: { type: 'operator', value: op.v, label: op.v, formulaId: formula.id } });
                            document.dispatchEvent(evt);
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('formula-element-type', 'operator');
                            e.dataTransfer.setData('operator-value', op.v);
                            e.dataTransfer.setData('operator-label', op.v);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                        >
                          {op.v}
                        </Button>
                      </Tooltip>
                    ))}

                    {/* Menu déroulant: Comparaison */}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'eq', label: '==', onClick: () => insertOp('==') },
                          { key: 'seq', label: '===', onClick: () => insertOp('===') },
                          { key: 'neq', label: '!=', onClick: () => insertOp('!=') },
                          { key: 'sneq', label: '!==', onClick: () => insertOp('!==') },
                          { key: 'gt', label: '>' , onClick: () => insertOp('>') },
                          { key: 'lt', label: '<' , onClick: () => insertOp('<') },
                          { key: 'gte', label: '>=' , onClick: () => insertOp('>=') },
                          { key: 'lte', label: '<=' , onClick: () => insertOp('<=') },
                        ],
                      }}
                      trigger={[ 'click' ]}
                    >
                      <Tooltip title="Opérateurs de comparaison">
                        <Button size="small">Comp <DownOutlined /></Button>
                      </Tooltip>
                    </Dropdown>

                    {/* Menu déroulant: Logique */}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'and', label: '&&', onClick: () => insertOp('&&') },
                          { key: 'or', label: '||', onClick: () => insertOp('||') },
                          { key: 'not', label: '!' , onClick: () => insertOp('!') },
                          { key: 'ternary', label: '?:', onClick: () => insertOp('?:') },
                          { key: 'nullish', label: '??', onClick: () => insertOp('??') },
                        ],
                      }}
                      trigger={[ 'click' ]}
                    >
                      <Tooltip title="Opérateurs logiques">
                        <Button size="small">Log <DownOutlined /></Button>
                      </Tooltip>
                    </Dropdown>

                    {/* Vider */}
                    <Tooltip title="Vider la séquence">
                      <Button
                        size="small"
                        shape="circle"
                        danger
                        onClick={() => {
                          if (window.confirm('Vider la séquence de cette formule ?')) {
                            const evt = new CustomEvent('formula-toolbar-clear', { detail: { formulaId: formula.id } });
                            document.dispatchEvent(evt);
                          }
                        }}
                        draggable
                        onDragStart={(e) => e.preventDefault()}
                        icon={<DeleteOutlined />}
                      />
                    </Tooltip>
                  </Space>
                </div>
                <div className="relative">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none shadow-sm" style={{ zIndex: 1 }}>
                    Zone de dépôt
                  </div>
                  <FormulaSequenceEditor formula={formula} />
                </div>
                {/* Palettes: Champs (large), opérateurs, fonctions, etc. */}
                {formula && formula.id && (
                  <div className="grid grid-cols-2 gap-2 mt-4 items-start content-start">
                    {/* Colonne gauche: 1er, 3e, 5e */}
                    <div className="flex flex-col gap-2">
                      {/* 1. Opérateurs disponibles */}
                      <CollapsiblePanel title="Opérateurs disponibles" small>
                        <OperatorsPalette formulaId={formula.id} formula={formula} />
                      </CollapsiblePanel>
                      {/* 3. Formules existantes */}
                      <CollapsiblePanel title="Formules existantes" small>
                        <FormulaRefsPalette currentFormulaId={formula.id} />
                      </CollapsiblePanel>
                      {/* 5. Constantes (nombres / texte) */}
                      <CollapsiblePanel title="Constantes (nombres / texte)" small>
                        <ValueConstantsPalette formulaId={formula.id} formula={formula as Formula} />
                      </CollapsiblePanel>
                    </div>
                    {/* Colonne droite: 2e, 4e, 6e */}
                    <div className="flex flex-col gap-2">
                      {/* 2. Fonctions avancées */}
                      <CollapsiblePanel title="Fonctions avancées" small>
                        <FunctionsPalette formulaId={formula.id} formula={formula} />
                      </CollapsiblePanel>
                      {/* 4. Bloc Condition (IF) */}
                      <CollapsiblePanel title="Bloc Condition (IF)" small>
                        <ConditionBlockPalette formulaId={formula.id} />
                      </CollapsiblePanel>
                      {/* 6. Tester */}
                      <CollapsiblePanel title="Tester" small>
                        <div className="flex items-center justify-between mb-2">
                          <button
                            className={`px-2 py-1 text-xs rounded ${viewMode === 'test' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                            onClick={() => setViewMode(viewMode === 'test' ? 'edit' : 'test')}
                          >{viewMode==='test'?'Masquer':'Ouvrir test'}</button>
                        </div>
                        {viewMode === 'test' && <FormulaEvaluator formula={formula} />}
                      </CollapsiblePanel>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}
    </Card>
  );
};

export default FormulaItemEditor;


