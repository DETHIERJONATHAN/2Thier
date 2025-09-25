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

const FormulaPanel: React.FC<FormulaPanelProps> = ({ treeId, nodeId, onChange, readOnly }) => {
  // API optimisée pour éviter les conflits
  const { api } = useOptimizedApi();
  
  // Refs pour cleanup et stabilité
  const mountedRef = useRef<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializing = useRef<boolean>(false);
  const lastSavedTokens = useRef<string>('');
  const lastSavedName = useRef<string>('');
  
  // État local stable
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  const [localName, setLocalName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
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
  
  // Multi instances
  const [instances, setInstances] = useState<FormulaInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Chargement initial UNE SEULE FOIS
  useEffect(() => {
    if (isInitializing.current || isLoaded) return;
    
    isInitializing.current = true;
    let mounted = true;

    (async () => {
      try {
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const fromMeta: FormulaInstance[] = node?.metadata?.capabilities?.formulas || [];
        
        if (fromMeta.length > 0) {
          if (!mounted) return;
          
          const first = fromMeta[0];
          setInstances(fromMeta);
          setActiveId(first.id);
          setLocalTokens(first.tokens || []);
          setLocalName(first.name || '');
          
          // Sauvegarder la référence pour éviter les re-saves inutiles
          lastSavedTokens.current = JSON.stringify(first.tokens || []);
          lastSavedName.current = first.name || '';
        } else {
          // Fallback: charger depuis l'API formule
          const data = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formula`);
          const initialTokens = (data?.tokens as string[]) || [];
          const initialName = typeof data?.name === 'string' ? String(data.name) : 'Formule 1';
          
          if (!mounted) return;
          
          const first: FormulaInstance = { 
            id: `form_${Date.now()}`, 
            name: initialName, 
            tokens: initialTokens 
          };
          
          setInstances([first]);
          setActiveId(first.id);
          setLocalTokens(initialTokens);
          setLocalName(initialName);
          
          // Sauvegarder la référence
          lastSavedTokens.current = JSON.stringify(initialTokens);
          lastSavedName.current = initialName;
          
          // Persister dans metadata (sans déclencher de re-render)
          if (treeId) {
            try {
              const md = node?.metadata || {};
              const nextMd = { ...md, capabilities: { ...(md.capabilities || {}), formulas: [first] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }
        
        if (mounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Erreur chargement formule:', err);
        if (mounted) {
          setIsLoaded(true);
        }
      } finally {
        isInitializing.current = false;
      }
    })();

    return () => { 
      mounted = false; 
    };
  }, [api, nodeId, treeId, isLoaded]); // Dépendances fixes

  // Fonction de sauvegarde ULTRA-OPTIMISÉE avec protection complète contre les boucles
  const saveFormula = useCallback(async (nextTokens: string[], nextName: string) => {
    // Vérifications de sécurité
    if (!mountedRef.current || isSaving || !isLoaded) return;
    
    // Éviter les sauvegardes identiques
    const tokensStr = JSON.stringify(nextTokens);
    if (tokensStr === lastSavedTokens.current && nextName === lastSavedName.current) {
      return;
    }

    console.log('💾 FormulaPanel: Sauvegarde demandée', { tokens: nextTokens, name: nextName });
    
    // Debounce pour éviter les appels trop fréquents
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || isSaving) return;
      
      setIsSaving(true);
      try {
        // Sauvegarde backend
        await api.put(`/api/treebranchleaf/nodes/${nodeId}/formula`, { 
          tokens: nextTokens, 
          name: nextName 
        });

        // Mettre à jour metadata si nécessaire
        if (treeId && activeId) {
          try {
            const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
            const md = node?.metadata || {};
            const list: FormulaInstance[] = md?.capabilities?.formulas || instances;
            const updated = list.map((it: FormulaInstance) => 
              it.id === activeId ? { ...it, tokens: nextTokens, name: nextName } : it
            );
            const nextMd = { ...md, capabilities: { ...(md.capabilities || {}), formulas: updated } };
            await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            
            setInstances(updated);
          } catch (err) {
            console.warn('⚠️ Erreur mise à jour metadata', err);
          }
        }

        // Mettre à jour les références pour éviter les re-saves
        lastSavedTokens.current = tokensStr;
        lastSavedName.current = nextName;

        // Notifier le parent SEULEMENT si on a vraiment changé quelque chose
        if (mountedRef.current) {
          onChange?.({ tokens: nextTokens, name: nextName });
        }
        
        console.log('✅ FormulaPanel: Sauvegarde réussie');
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
    }, 500); // Debounce de 500ms
  }, [api, nodeId, treeId, activeId, instances, onChange, isSaving, isLoaded]);

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

  // Supprimer une formule
  const deleteFormula = useCallback(async () => {
    Modal.confirm({
      title: 'Supprimer la formule ?',
      content: 'Cette action vide la formule et désactive la capacité.',
      okText: 'Supprimer',
      okButtonProps: { danger: true },
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.put(`/api/treebranchleaf/nodes/${nodeId}/formula`, { tokens: [], name: '' });
          
          setLocalTokens([]);
          setLocalName('');
          lastSavedTokens.current = '[]';
          lastSavedName.current = '';
          
          // Supprimer l'instance active si multi-instances
          if (treeId && activeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = node?.metadata || {};
              const list: FormulaInstance[] = md?.capabilities?.formulas || instances;
              const remaining = list.filter((it: FormulaInstance) => it.id !== activeId);
              const nextMd = { ...md, capabilities: { ...(md.capabilities || {}), formulas: remaining } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
              
              setInstances(remaining);
              const nextActive = remaining[0] || null;
              setActiveId(nextActive ? nextActive.id : null);
              if (nextActive) {
                setLocalTokens(nextActive.tokens || []);
                setLocalName(nextActive.name || '');
              }
            } catch { /* noop */ }
          }
          
          onChange?.({ tokens: [], name: '' });
          message.success('Formule supprimée');
        } catch {
          message.error('Impossible de supprimer la formule');
        }
      }
    });
  }, [api, nodeId, treeId, activeId, instances, onChange]);

  // Aide rendu: extraire id depuis token
  const extractNodeIdFromRef = useCallback((ref?: string): string | undefined => {
    if (!ref) return undefined;
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

  // Ne pas afficher tant que pas chargé
  if (!isLoaded) {
    return (
      <Card size="small" bordered>
        <Title level={5}>🧮 Formule</Title>
        <Text type="secondary">Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card size="small" bordered>
      <Title level={5}>🧮 Formule</Title>
      
      {/* Multi-instances: sélection + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Instance:</Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ value: it.id, label: it.name || 'Sans nom' }))}
          onChange={(id) => {
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) { 
              setLocalTokens(it.tokens || []); 
              setLocalName(it.name || '');
              lastSavedTokens.current = JSON.stringify(it.tokens || []);
              lastSavedName.current = it.name || '';
            }
          }}
          placeholder="Sélectionner une instance"
        />
        
        <Button size="small" onClick={async () => {
          const id = `form_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const newName = `Formule ${instances.length + 1}`;
          const it: FormulaInstance = { id, name: newName, tokens: [] };
          const next = [...instances, it];
          
          setInstances(next);
          setActiveId(id);
          setLocalTokens([]);
          setLocalName(newName);
          lastSavedTokens.current = '[]';
          lastSavedName.current = newName;
          
          // Persist in metadata
          if (treeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = node?.metadata || {};
              const nextMd = { ...md, capabilities: { ...(md.capabilities || {}), formulas: next } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }}>Ajouter</Button>
        
        <Button size="small" danger onClick={deleteFormula} disabled={!activeId}>
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
        La formule (nom et éléments) est sauvegardée automatiquement.
      </Text>
      
      <NodeTreeSelector 
        nodeId={nodeId} 
        open={pickRef} 
        onClose={() => setPickRef(false)} 
        onSelect={onSelectRef} 
      />
    </Card>
  );
};

export default FormulaPanel;
