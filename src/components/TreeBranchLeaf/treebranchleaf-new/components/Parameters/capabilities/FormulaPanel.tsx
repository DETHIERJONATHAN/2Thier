import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Card, Typography, message, Space, Button, Tooltip, Modal, Input, Divider, Select } from 'antd';
import TokenDropZone from '../shared/TokenDropZone';
import TokenChip from '../shared/TokenChip';
import { useOptimizedApi } from '../../../hooks/useOptimizedApi';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';

const { Title, Text } = Typography;

interface FormulaPanelProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type FormulaInstance = { id: string; name: string; tokens: string[]; enabled?: boolean };

const FormulaPanel: React.FC<FormulaPanelProps> = ({ nodeId, onChange, readOnly }) => {
  // API optimisée pour éviter les conflits
  const { api } = useOptimizedApi();
  
  // Refs pour cleanup et stabilité
  const mountedRef = useRef<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedTokens = useRef<string>('');
  const lastSavedName = useRef<string>('');
  
  // État local stable
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  const [localName, setLocalName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // État UI
  const [pickRef, setPickRef] = useState(false);
  const [nodeCache, setNodeCache] = useState<Record<string, { label: string; type: string }>>({});
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [numberInput, setNumberInput] = useState<string>('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState<string>('');
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string>('');
  
  // Modal de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formulaToDelete, setFormulaToDelete] = useState<string | null>(null);
  
  // Multi instances
  const [instances, setInstances] = useState<FormulaInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 🔄 CHARGEMENT INITIAL DES FORMULES
  useEffect(() => {
    if (!nodeId || !api) return;

    const loadFormulas = async () => {
      try {
        // Charger les formules existantes pour ce nœud
        const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`) as { formulas: FormulaInstance[] };
        const existingFormulas = response.formulas || [];
        
        if (existingFormulas.length > 0) {
          setInstances(existingFormulas);
          
          // Sélectionner la première formule par défaut
          const firstFormula = existingFormulas[0];
          setActiveId(firstFormula.id);
          setLocalTokens(firstFormula.tokens || []);
          setLocalName(firstFormula.name || '');
          lastSavedTokens.current = JSON.stringify(firstFormula.tokens || []);
          lastSavedName.current = firstFormula.name || '';
          
          console.log('✅ FormulaPanel: Formules chargées:', existingFormulas.length, existingFormulas);
        } else {
          // Aucune formule existante
          setInstances([]);
          setActiveId(null);
          setLocalTokens([]);
          setLocalName('');
          console.log('ℹ️ FormulaPanel: Aucune formule existante pour ce nœud');
        }
      } catch (err) {
        console.error('❌ FormulaPanel: Erreur chargement formules:', err);
        // En cas d'erreur, on réinitialise
        setInstances([]);
        setActiveId(null);
        setLocalTokens([]);
        setLocalName('');
      }
    };

    loadFormulas();
  }, [nodeId, api]);

  // Fonction de sauvegarde avec debounce
  const saveFormula = useCallback(async (nextTokens: string[], nextName: string) => {
    if (!mountedRef.current || isSaving) return;

    const tokensStr = JSON.stringify(nextTokens);
    if (tokensStr === lastSavedTokens.current && nextName === lastSavedName.current) {
      return; // Pas de changement
    }

    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      if (!mountedRef.current) return;

      try {
        let resultFormula: FormulaInstance | null = null;

        // Normaliser nom (backend exige name + tokens array)
        const finalName = nextName && nextName.trim().length > 0 ? nextName.trim() : 'Formule';

        if (activeId) {
          // PUT mise à jour distante + synchro locale
            await api.put(`/api/treebranchleaf/nodes/${nodeId}/formulas/${activeId}`, {
              tokens: nextTokens,
              name: finalName
            });
            setInstances(prev => prev.map(inst => inst.id === activeId ? { ...inst, tokens: nextTokens, name: finalName } : inst));
        } else {
          // POST création distante
          resultFormula = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, {
            tokens: nextTokens,
            name: finalName
          }) as FormulaInstance;
          if (resultFormula?.id) {
            setActiveId(resultFormula.id);
            setInstances(prev => [...prev, { id: resultFormula.id, name: finalName, tokens: nextTokens }]);
          }
        }

        // Mettre à jour les références pour éviter les re-saves
        lastSavedTokens.current = tokensStr;
  lastSavedName.current = finalName;

        // Notifier le parent
        if (mountedRef.current) {
          onChange?.({ tokens: nextTokens, name: finalName });
        }

        // console.log('✅ FormulaPanel: Sauvegarde réussie dans la table'); // ✨ Log réduit
      } catch (err) {
        console.error('❌ FormulaPanel: Erreur sauvegarde', err);
        if (mountedRef.current) {
          message.error('Erreur de sauvegarde de la formule');
        }
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    }, 300); // Debounce réduit à 300ms

    saveTimeoutRef.current = timeoutId;
  }, [api, nodeId, activeId, onChange, isSaving]);

  // Gestion des changements de tokens SANS déclencher de boucles
  const handleTokensChange = useCallback((nextTokens: string[]) => {
    if (!mountedRef.current) return;
    
    setLocalTokens(nextTokens);
    saveFormula(nextTokens, localName);
  }, [saveFormula, localName]);

  // Gestion des changements de nom SANS déclencher de boucles
  const handleNameChange = useCallback((nextName: string) => {
    if (!mountedRef.current) return;
    
    setLocalName(nextName);
    saveFormula(localTokens, nextName);
  }, [saveFormula, localTokens]);

  // Placeholder mémorisé
  const placeholder = useMemo(() => 'Glissez ici des références (@value.*, @key, #marker)…', []);

  // Gestion sélection via sélecteur
  const onSelectRef = useCallback((val: NodeTreeSelectorValue) => {
    const ref = val.ref;
    handleTokensChange([...localTokens, ref]);
  }, [localTokens, handleTokensChange]);

  // Actions sur les tokens
  const appendToken = useCallback((t: string) => {
    handleTokensChange([...localTokens, t]);
  }, [localTokens, handleTokensChange]);

  const removeLast = useCallback(() => {
    if (!localTokens?.length) return;
    handleTokensChange(localTokens.slice(0, -1));
  }, [localTokens, handleTokensChange]);

  const clearAll = useCallback(() => {
    handleTokensChange([]);
  }, [handleTokensChange]);

  // Supprimer une formule UNIQUEMENT de la table TreeBranchLeafNodeFormula
  const deleteFormula = useCallback(() => {
    // console.log(...) // ✨ Log réduit

    // {
      // activeId,

      // nodeId,
      // isDeleting

    // }

    // Protection contre les clics multiples
    if (!activeId || isDeleting) {
      // console.log('🗑️ FormulaPanel: Arrêt - pas d\'activeId ou déjà en cours de suppression', { activeId, isDeleting }); // ✨ Log réduit
      return;
    }
    
    // console.log('🗑️ FormulaPanel: Ouverture du modal de confirmation...'); // ✨ Log réduit
    setFormulaToDelete(activeId);
    setShowDeleteModal(true);
  }, [activeId, isDeleting]);

  // Confirmation de suppression SIMPLIFIÉE
  const confirmDelete = useCallback(async () => {
    if (!formulaToDelete) return;

    // console.log('🗑️ FormulaPanel: Suppression confirmée, appel API...'); // ✨ Log réduit
    setIsDeleting(true);
    setShowDeleteModal(false);
    
    try {
      // ✅ UNIQUEMENT: Supprimer de la table TreeBranchLeafNodeFormula
      await api.delete(`/api/treebranchleaf/nodes/${nodeId}/formulas/${formulaToDelete}`);
      
      // console.log('🗑️ FormulaPanel: Formule supprimée de la table avec succès'); // ✨ Log réduit
      
      // Mettre à jour les instances locales
      const remaining = instances.filter(f => f.id !== formulaToDelete);
      setInstances(remaining);
      
      // Sélectionner la prochaine formule ou vider
      const nextActive = remaining[0] || null;
      setActiveId(nextActive ? nextActive.id : null);
      
      if (nextActive) {
        setLocalTokens(nextActive.tokens || []);
        setLocalName(nextActive.name || '');
        lastSavedTokens.current = JSON.stringify(nextActive.tokens || []);
        lastSavedName.current = nextActive.name || '';
      } else {
        setLocalTokens([]);
        setLocalName('');
        lastSavedTokens.current = '[]';
        lastSavedName.current = '';
      }
      
      onChange?.({ tokens: nextActive?.tokens || [], name: nextActive?.name || '' });
      message.success('Formule supprimée');
    } catch (err) {
      console.error('🗑️ FormulaPanel: Erreur suppression:', err);
      message.error('Impossible de supprimer la formule');
    } finally {
      setIsDeleting(false);
      setFormulaToDelete(null);
    }
  }, [api, nodeId, formulaToDelete, instances, onChange]);

  // Annulation de suppression
  const cancelDelete = useCallback(() => {
    // console.log('🗑️ FormulaPanel: Suppression annulée'); // ✨ Log réduit
    setShowDeleteModal(false);
    setFormulaToDelete(null);
  }, []);

  // Aide rendu: extraire id depuis token
  const extractNodeIdFromRef = useCallback((ref?: string): string | undefined => {
    if (!ref || typeof ref !== 'string') return undefined;
    if (ref.startsWith('@value.')) return ref.slice('@value.'.length);
    if (ref.startsWith('@select.')) return ref.slice('@select.'.length).split('.')[0];
    return undefined;
  }, []);

  // Chargement des nœuds pour le cache
  const loadNode = useCallback(async (id: string) => {
    if (!id || nodeCache[id]) return;
    try {
      const data = await api.get(`/api/treebranchleaf/nodes/${id}`) as { label?: string; type?: string } | null;
      if (!data) return;
      setNodeCache(prev => ({ ...prev, [id]: { label: data.label || id, type: data.type || 'leaf_field' } }));
    } catch {
      // noop
    }
  }, [api, nodeCache]);

  // Charger les nœuds référencés
  useEffect(() => {
    const ids = localTokens.map(extractNodeIdFromRef).filter(Boolean) as string[];
    ids.forEach(loadNode);
  }, [localTokens, extractNodeIdFromRef, loadNode]);

  // Debug final avant rendu
  // console.log(...) // ✨ Log réduit

  // {
    // activeId,
    // localName,

  // }

  return (
    <Card size="small" variant="outlined">
      <Title level={5}>🧮 Formule</Title>
      
      {/* DEBUG INFO */}
      <div style={{ marginBottom: 8, padding: 4, background: '#f0f0f0', fontSize: '11px', borderRadius: 4 }}>
        <Text type="secondary">
          Debug: activeId={activeId || 'null'} | instances={instances.length}
        </Text>
      </div>
      
      {/* Multi-instances: sélection + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Instance:</Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ 
            value: it.id, 
            label: `${it.name || 'Sans nom'} (${(it.tokens || []).length} éléments)` 
          }))}
          onChange={(id) => {
            // console.log('🔄 FormulaPanel: Changement d\'instance:', { newId: id, availableInstances: instances.length }); // ✨ Log réduit
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) { 
              setLocalTokens(it.tokens || []); 
              setLocalName(it.name || '');
              lastSavedTokens.current = JSON.stringify(it.tokens || []);
              lastSavedName.current = it.name || '';
              // console.log('✅ FormulaPanel: Instance sélectionnée:', { name: it.name, tokensCount: (it.tokens || []).length }); // ✨ Log réduit
            }
          }}
          placeholder={instances.length === 0 ? "Aucune formule disponible" : "Sélectionner une instance"}
          notFoundContent="Aucune formule trouvée"
          allowClear={false}
        />
        
        <Button size="small" onClick={async () => {
          try {
            // ✅ UNIQUEMENT TABLE: Créer une nouvelle formule
            const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, {
              name: 'Nouvelle formule',
              tokens: [],
              description: 'Nouvelle formule',
              isDefault: instances.length === 0,
              order: instances.length + 1
,
            }) as FormulaInstance;
            
            // Mettre à jour les instances locales
            const next = [...instances, created];
            setInstances(next);
            setActiveId(created.id);
            setLocalTokens([]);
            setLocalName(created.name || '');
            lastSavedTokens.current = '[]';
            lastSavedName.current = created.name || '';
            
            message.success('Nouvelle formule créée');
          } catch (err) {
            console.error('Erreur création formule:', err);
            message.error('Impossible de créer une nouvelle formule');
          }
        }}>Ajouter</Button>
        
        <Button 
          size="small" 
          danger 
          onClick={deleteFormula} 
          disabled={!activeId || isDeleting}
          loading={isDeleting}
        >
          Supprimer
        </Button>
      </div>
      
      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Nom:</Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom de la formule"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>
      
      {/* Résumé test */}
      <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
        <Text strong style={{ marginRight: 8 }}>Résumé test:</Text>
        <Space wrap size={6}>
          <Text type="secondary">Éléments ({localTokens?.length || 0}):</Text>
          {localTokens.map((t, index) => (
            <TokenChip key={`${t}-${index}`} token={t} />
          ))}
        </Space>
        
        {/* Zone de test intégrée */}
        <div style={{ marginTop: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Space wrap>
              {(Array.from(new Set(localTokens.map(extractNodeIdFromRef).filter(Boolean))) as string[]).map(id => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TokenChip token={`@value.${id}`} />
                  <Input
                    size="small"
                    placeholder="Valeur de test"
                    style={{ width: 180 }}
                    value={testValues[id] || ''}
                    onChange={(e) => setTestValues(prev => ({ ...prev, [id]: e.target.value }))}
                  />
                </div>
              ))}
            </Space>
            
            <Button size="small" type="primary" onClick={() => {
              try {
                setTestError('');
                const expr = localTokens.map(tok => {
                  if (tok === 'CONCAT') return '+';
                  if (['+', '-', '*', '/', '(', ')'].includes(tok)) return tok;
                  if (/^".*"$/.test(tok)) return tok;
                  if (/^[-+]?[0-9]*\.?[0-9]+$/.test(tok)) return tok;
                  
                  if (tok.startsWith('@value.')) {
                    const id = tok.slice('@value.'.length);
                    const v = (testValues[id] ?? '').trim();
                    const num = Number(v.replace(',', '.'));
                    return Number.isFinite(num) ? String(num) : JSON.stringify(v);
                  }
                  if (tok.startsWith('@select.')) {
                    const id = tok.slice('@select.'.length).split('.')[0];
                    const v = testValues[id] ?? '';
                    return JSON.stringify(v);
                  }
                  
                  return JSON.stringify(tok);
                }).join(' ');
                
                const fn = new Function(`return (${expr});`);
                const res = fn();
                setTestResult(String(res));
              } catch (e: unknown) {
                setTestResult('');
                const hasMessage = (x: unknown): x is { message: unknown } => !!x && typeof x === 'object' && 'message' in x;
                const msg = hasMessage(e) ? String(e.message) : 'Erreur pendant l\'évaluation';
                setTestError(msg);
              }
            }}>Évaluer</Button>
            
            {testError ? (
              <Text type="danger">Erreur: {testError}</Text>
            ) : (
              <Text>Résultat: {testResult || '(vide)'}</Text>
            )}
          </Space>
        </div>
      </div>
      
      {/* Construction de la formule */}
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        Construisez votre formule étape par étape: sélectionnez un champ, ajoutez un opérateur, puis un autre champ, etc.
      </Text>
      
      <div style={{ marginBottom: 8 }}>
        <Space wrap size={6}>
          <Tooltip title="Addition"><Button size="small" onClick={() => appendToken('+')}>+</Button></Tooltip>
          <Tooltip title="Soustraction"><Button size="small" onClick={() => appendToken('-')}>-</Button></Tooltip>
          <Tooltip title="Multiplication"><Button size="small" onClick={() => appendToken('*')}>*</Button></Tooltip>
          <Tooltip title="Division"><Button size="small" onClick={() => appendToken('/')}>/</Button></Tooltip>
          <Tooltip title="Parenthèse ouvrante"><Button size="small" onClick={() => appendToken('(')}>(</Button></Tooltip>
          <Tooltip title="Parenthèse fermante"><Button size="small" onClick={() => appendToken(')')}>)</Button></Tooltip>
          <Tooltip title="Concaténation de texte"><Button size="small" onClick={() => appendToken('CONCAT')}>CONCAT</Button></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Ajouter un nombre"><Button size="small" onClick={() => { setNumberInput(''); setShowNumberModal(true); }}>Nombre…</Button></Tooltip>
          <Tooltip title="Ajouter un texte"><Button size="small" onClick={() => { setTextInput(''); setShowTextModal(true); }}>Texte…</Button></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Supprimer le dernier élément"><Button size="small" danger disabled={!localTokens?.length} onClick={removeLast}>⟲ Annuler dernier</Button></Tooltip>
          <Tooltip title="Vider la formule"><Button size="small" danger disabled={!localTokens?.length} onClick={clearAll}>🗑️ Vider</Button></Tooltip>
        </Space>
      </div>
      
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={() => setPickRef(true)} disabled={readOnly}>
          Sélectionner…
        </Button>
      </Space>

      {/* Modals */}
      <Modal
        title="Ajouter un nombre"
        open={showNumberModal}
        onCancel={() => setShowNumberModal(false)}
        onOk={() => {
          const v = numberInput.trim();
          if (!v) return setShowNumberModal(false);
          if (!/^[-+]?[0-9]*\.?[0-9]+$/.test(v)) {
            message.error('Entrez un nombre valide');
            return;
          }
          appendToken(v);
          setShowNumberModal(false);
        }}
        okText="Ajouter"
      >
        <Input
          placeholder="Ex: 10, 3.14"
          value={numberInput}
          onChange={(e) => setNumberInput(e.target.value)}
          inputMode="decimal"
        />
      </Modal>

      <Modal
        title="Ajouter un texte"
        open={showTextModal}
        onCancel={() => setShowTextModal(false)}
        onOk={() => {
          const v = textInput;
          const quoted = '"' + v.replace(/"/g, '\\"') + '"';
          appendToken(quoted);
          setShowTextModal(false);
        }}
        okText="Ajouter"
      >
        <Input
          placeholder="Ex: TVA"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
      </Modal>

      <TokenDropZone
        nodeId={nodeId}
        capability="formula"
        label="Références utilisées"
        placeholder={placeholder}
        value={localTokens}
        onChange={handleTokensChange}
        readOnly={readOnly}
      />
      
      <Text type="secondary" style={{ fontSize: 12 }}>
        ✅ Stockage uniquement dans TreeBranchLeafNodeFormula - Sauvegarde automatique activée.
      </Text>
      
      <NodeTreeSelector 
        nodeId={nodeId} 
        open={pickRef} 
        onClose={() => setPickRef(false)} 
        onSelect={onSelectRef} 
      />

      <Modal
        title="Supprimer la formule ?"
        open={showDeleteModal}
        onOk={confirmDelete}
        onCancel={cancelDelete}
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true, loading: isDeleting }}
        cancelButtonProps={{ disabled: isDeleting }}
      >
        <Text>Cette action supprime définitivement la formule de la table TreeBranchLeafNodeFormula.</Text>
        <br />
        <Text type="secondary">Cette action est irréversible.</Text>
      </Modal>
    </Card>
  );
};

export default FormulaPanel;
