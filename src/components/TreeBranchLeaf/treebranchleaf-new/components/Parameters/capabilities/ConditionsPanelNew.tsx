import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Typography, Button, Input, message, Space, Divider, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import type { ConditionSet } from '../../../types';
import ConditionsDnDComposer from './conditions/ConditionsDnDComposer';
import { logger } from '../../../../../../lib/logger';

const { Title, Text } = Typography;

interface ConditionsPanelNewProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  onNodeUpdate?: (nodeData: { id: string; hasCondition: boolean }) => Promise<void>;
  readOnly?: boolean;
}

interface ConditionInstance {
  id: string;
  nodeId: string;
  organizationId?: string | null;
  name: string;
  conditionSet: ConditionSet;
  description?: string | null;
  isDefault?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

const emptyConditionSet = (nodeId: string): ConditionSet => ({
  id: `cond_${nodeId}`,
  tokens: [],
  mode: 'first-match',
  branches: []
});

const ConditionsPanelNew: React.FC<ConditionsPanelNewProps> = ({
  nodeId,
  value,
  onChange,
  onNodeUpdate,
  readOnly
}) => {
  const { api } = useAuthenticatedApi();
  
  // États locaux (similaires à FormulaPanel)
  const [instances, setInstances] = useState<ConditionInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localConditionSet, setLocalConditionSet] = useState<ConditionSet | null>(null);
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastSaveAtRef = useRef<number>(0);

  // Debounce utilitaire
  const debounce = useCallback((fn: () => void, delay = 600) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(fn, delay);
  }, []);

  // Sauvegarde (création / mise à jour) d'une condition
  const performSave = useCallback(async (payload: {
    id: string;
    name: string;
    conditionSet: ConditionSet;
    description?: string;
  }) => {
    if (!nodeId) return;
    const { id, name, conditionSet, description } = payload;
    if (!name || !conditionSet) {
      return; // rien à faire si données incomplètes
    }
    try {
      setSaving(true);
      // Création
      if (id.startsWith('temp_')) {
        const res = await api.post(`/api/treebranchleaf/nodes/${nodeId}/conditions`, {
          name: name.trim() || 'Conditions',
          conditionSet,
          description: description || ''
        }) as ConditionInstance;

        // Remplacer l'instance temporaire par celle retournée
        setInstances(prev => prev.map(inst => inst.id === id ? {
          ...inst,
          id: res.id,
          name: res.name,
          conditionSet: res.conditionSet,
          description: res.description || ''
        } : inst));
        setActiveId(res.id);
        // Pas de toast pour éviter le spam lors de la frappe
        lastSaveAtRef.current = Date.now();
        setSaving(false);
        setDirty(false);
        
        // 🔧 FIX: Mettre à jour hasCondition sur le nœud parent
        try {
          await onNodeUpdate?.({ id: nodeId, hasCondition: true });
        } catch (e) {
          logger.warn('Impossible de mettre à jour hasCondition sur le nœud:', e);
        }
        
        onChange?.({
          ...(value || {}),
          activeConditionId: res.id,
          conditions: instances.map(i => i.id === id ? { id: res.id, name: res.name } : { id: i.id, name: i.name }),
          lastSavedAt: lastSaveAtRef.current
        });
        return res;
      } else {
        // Mise à jour
        const res = await api.put(`/api/treebranchleaf/nodes/${nodeId}/conditions/${id}`, {
          name: name.trim() || 'Conditions',
          conditionSet,
          description: description || ''
        }) as ConditionInstance;

        setInstances(prev => prev.map(inst => inst.id === id ? {
          ...inst,
            name: res.name,
            conditionSet: res.conditionSet,
            description: res.description || ''
        } : inst));
        lastSaveAtRef.current = Date.now();
        setSaving(false);
        setDirty(false);
        onChange?.({
          ...(value || {}),
          activeConditionId: id,
          conditions: instances.map(i => ({ id: i.id, name: i.name })),
          lastSavedAt: lastSaveAtRef.current
        });
        return res;
      }
    } catch (e) {
      logger.error('❌ ConditionsPanelNew: Erreur sauvegarde condition', e);
      // message.error limité (sinon déclenché à chaque keypress) -> seulement création
      if (id.startsWith('temp_')) message.error('Impossible de sauvegarder la condition');
      setSaving(false);
    }
  }, [api, nodeId, onChange, value, instances, onNodeUpdate]);

  // API publique locale debounced
  const saveCondition = useCallback((payload: { id: string; name: string; conditionSet: ConditionSet; description?: string }) => {
    debounce(() => { void performSave(payload); });
  }, [debounce, performSave]);

  // Fonction pour normaliser un ConditionSet
  const normalizeConditionSet = useCallback((cs: unknown): ConditionSet => {
    if (!cs || typeof cs !== 'object') {
      return emptyConditionSet(nodeId);
    }
    
    const condSet = cs as Record<string, unknown>;
    return {
      id: typeof condSet.id === 'string' ? condSet.id : `cond_${nodeId}`,
      tokens: Array.isArray(condSet.tokens) ? condSet.tokens : [],
      mode: condSet.mode === 'first-match' || condSet.mode === 'all-match' ? condSet.mode : 'first-match',
      branches: Array.isArray(condSet.branches) ? condSet.branches : [],
      fallback: condSet.fallback || undefined  // 🔧 CORRECTION: Préserver le fallback (SINON)
,
    } as ConditionSet;
  }, [nodeId]);

  // Charger toutes les conditions de ce nœud
  const loadConditions = useCallback(async () => {
    if (!nodeId) return;
    
    try {
      // logger.debug('🚀 ConditionsPanelNew: Chargement depuis nouvelle table pour nodeId:', nodeId); // ✨ Log réduit
      setLoading(true);
      
      const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/conditions`) as { conditions: ConditionInstance[] };
      const conditions = response.conditions || [];
      
      // logger.debug('🚀 ConditionsPanelNew: Conditions chargées depuis table:', conditions.length); // ✨ Log réduit
      // logger.debug('🚀 ConditionsPanelNew: Détail conditions:', conditions.map(c => ({ id: c.id, name: c.name }))); // ✨ Log réduit
      
      if (conditions.length === 0) {
        // Créer une condition par défaut
        const defaultCondition: ConditionInstance = {
          id: `temp_${Date.now()}`,
          nodeId,
          name: 'Conditions 1',
          conditionSet: emptyConditionSet(nodeId),
          description: '',
          isDefault: true,
          order: 0
,
        };
        
        setInstances([defaultCondition]);
        setActiveId(defaultCondition.id);
        setLocalConditionSet(defaultCondition.conditionSet);
        setLocalName(defaultCondition.name);
        setLocalDescription(defaultCondition.description || '');
      } else {
        setInstances(conditions);
        // Sélectionner la première condition disponible
        const firstCondition = conditions[0];
        if (firstCondition) {
          setActiveId(firstCondition.id);
          setLocalConditionSet(normalizeConditionSet(firstCondition.conditionSet));
          setLocalName(firstCondition.name);
          setLocalDescription(firstCondition.description || '');
        }
        
        // 🔧 FIX: Ne pas mettre à jour hasCondition au chargement pour éviter les boucles
        // La mise à jour se fait uniquement lors des créations/suppressions
      }
    } catch (err) {
      logger.error('❌ ConditionsPanelNew: Erreur chargement conditions:', err);
      message.error('Impossible de charger les conditions');
    } finally {
      setLoading(false);
    }
  }, [api, nodeId, normalizeConditionSet]);

  // Charger les conditions au montage
  useEffect(() => {
    loadConditions();
  }, [loadConditions]);

  // Gestionnaire de changement de nom
  const handleNameChange = useCallback((newName: string) => {
  setLocalName(newName);
  setDirty(true);
    
    // Sauvegarder automatiquement
    if (activeId && localConditionSet) {
      saveCondition({
        id: activeId,
        name: newName,
        conditionSet: localConditionSet,
        description: localDescription
      });
    }
  }, [activeId, localConditionSet, localDescription, saveCondition]);

  // Gestionnaire de changement de description
  const handleDescriptionChange = useCallback((newDescription: string) => {
  setLocalDescription(newDescription);
  setDirty(true);
    
    // Sauvegarder automatiquement
    if (activeId && localConditionSet) {
      saveCondition({
        id: activeId,
        name: localName,
        conditionSet: localConditionSet,
        description: newDescription
      });
    }
  }, [activeId, localName, localConditionSet, saveCondition]);

  // Ajouter une nouvelle condition
  const addCondition = useCallback(async () => {
    const newCondition: ConditionInstance = {
      id: `temp_${Date.now()}`,
      nodeId,
      name: `Conditions ${instances.length + 1}`,
      conditionSet: emptyConditionSet(nodeId),
      description: '',
      isDefault: false,
      order: instances.length
    };
    
    // logger.debug('➕ ConditionsPanelNew: Ajout nouvelle condition:', newCondition); // ✨ Log réduit

    setInstances(prev => [...prev, newCondition]);
    setActiveId(newCondition.id);
    setLocalConditionSet(newCondition.conditionSet);
    setLocalName(newCondition.name);
    setLocalDescription(newCondition.description || '');
  }, [instances, nodeId]);

  // Basculer vers une autre condition
  const switchToCondition = useCallback((conditionId: string) => {
    const condition = instances.find(inst => inst.id === conditionId);
    if (!condition) return;

    // logger.debug('🔄 ConditionsPanelNew: Basculement vers condition:', condition.name); // ✨ Log réduit

    setActiveId(conditionId);
    setLocalConditionSet(normalizeConditionSet(condition.conditionSet));
    setLocalName(condition.name);
    setLocalDescription(condition.description || '');
  }, [instances, normalizeConditionSet]);

  // Supprimer une condition
  const deleteCondition = useCallback(async () => {
    if (!activeId || !nodeId) {
      // logger.warn('🗑️ ConditionsPanelNew: Pas de condition active ou nodeId manquant'); // ✨ Log réduit
      return;
    }

    const activeCondition = instances.find(c => c.id === activeId);
    if (!activeCondition) {
      // logger.warn('🗑️ ConditionsPanelNew: Condition introuvable', { activeId }); // ✨ Log réduit
      return;
    }

    // logger.debug(...) // ✨ Log réduit

    // {
      // activeId,

      // nodeId

    // }

    // logger.debug('🗑️ ConditionsPanelNew: Avant window.confirm...'); // ✨ Log réduit
    
    // Confirmation de suppression
    const userConfirmed = window.confirm(
      `Supprimer définitivement la condition "${activeCondition.name}" ?`
    );
    
    if (!userConfirmed) {
      // logger.debug('🚫 ConditionsPanelNew: Suppression annulée par l\'utilisateur (window.confirm)'); // ✨ Log réduit
      return;
    }

    // logger.debug('🗑️ ConditionsPanelNew: Confirmation reçue avec window.confirm !'); // ✨ Log réduit
    
    try {
      // logger.debug(...) // ✨ Log réduit

      // {
        // activeId,

      // }
      
      // Supprimer la condition de Prisma (comme pour les formules)
      if (!activeId.startsWith('temp_')) {
        // logger.debug('🗑️ ConditionsPanelNew: Appel DELETE API...'); // ✨ Log réduit
        await api.delete(`/api/treebranchleaf/nodes/${nodeId}/conditions/${activeId}`);
        // logger.debug('🗑️ ConditionsPanelNew: DELETE API réussi'); // ✨ Log réduit
      }
      
      // Mettre à jour les instances locales
      const remaining = instances.filter(it => it.id !== activeId);
      setInstances(remaining);
      
      // 🔧 FIX: Mettre à jour hasCondition sur le nœud parent
      try {
        await onNodeUpdate?.({ id: nodeId, hasCondition: remaining.length > 0 });
      } catch (e) {
        logger.warn('Impossible de mettre à jour hasCondition sur le nœud:', e);
      }
      
      // Sélectionner la prochaine condition ou vider
      const nextActive = remaining[0] || null;
      setActiveId(nextActive ? nextActive.id : null);
      
      if (nextActive) {
        setLocalConditionSet(normalizeConditionSet(nextActive.conditionSet));
        setLocalName(nextActive.name);
        setLocalDescription(nextActive.description || '');
      } else {
        // Aucune condition restante - vider les champs locaux
        const emptySet = emptyConditionSet(nodeId);
        setLocalConditionSet(emptySet);
        setLocalName('');
        setLocalDescription('');
      }
      
      message.success(`Condition "${activeCondition.name}" supprimée`);
      
      // logger.debug('✅ ConditionsPanelNew: Suppression terminée'); // ✨ Log réduit
    } catch (err) {
      logger.error('❌ ConditionsPanelNew: Erreur suppression', err);
      message.error('Impossible de supprimer la condition');
    }
  }, [api, activeId, instances, normalizeConditionSet, nodeId, onNodeUpdate]);

  // Gestionnaire de changement du condition set
  const handleConditionSetChange = useCallback((newConditionSet: ConditionSet) => {
  setLocalConditionSet(newConditionSet);
  setDirty(true);
    
    // Sauvegarder automatiquement
    if (activeId && localName) {
      saveCondition({
        id: activeId,
        name: localName,
        conditionSet: newConditionSet,
        description: localDescription
      });
    }
  }, [activeId, localName, localDescription, saveCondition]);

  if (loading) {
    return (
      <Card size="small" variant="outlined">
        <Title level={5}>⚖️ Conditions</Title>
        <Text>Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card size="small" variant="outlined">
      <Title level={5}>⚖️ Conditions</Title>
      
      {/* Sélection et gestion des conditions */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text type="secondary">Condition:</Text>
          <Select
            size="small"
            style={{ minWidth: 200, flex: 1 }}
            value={activeId || undefined}
            onChange={switchToCondition}
            options={instances.map(inst => ({
              value: inst.id,
              label: inst.name || 'Sans nom'
            }))}
            placeholder="Sélectionner une condition"
          />
            <Button size="small" icon={<PlusOutlined />} onClick={addCondition} disabled={readOnly}>Ajouter</Button>
            <Button size="small" disabled={readOnly || !activeId} onClick={() => {
              if (!activeId) return;
              const src = instances.find(i => i.id === activeId);
              if (!src) return;
              const clone: ConditionInstance = {
                ...src,
                id: `temp_${Date.now()}`,
                name: src.name + ' (copie)',
                conditionSet: JSON.parse(JSON.stringify(src.conditionSet)),
                isDefault: false,
                order: instances.length
              };
              setInstances(prev => [...prev, clone]);
              setActiveId(clone.id);
              setLocalConditionSet(clone.conditionSet);
              setLocalName(clone.name);
              setLocalDescription(clone.description || '');
              setDirty(true);
            }}>Dupliquer</Button>
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={deleteCondition}
            disabled={readOnly || !activeId}
          >
            Supprimer
          </Button>
        </div>

        {/* Nom de la condition */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text type="secondary">Nom:</Text>
          <Input
            size="small"
            style={{ flex: 1, maxWidth: 300 }}
            placeholder="Nom de la condition"
            value={localName}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={readOnly}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text type="secondary">Description:</Text>
          <Input.TextArea
            size="small"
            style={{ flex: 1 }}
            placeholder="Description de la condition (optionnel)"
            value={localDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            disabled={readOnly}
            rows={2}
          />
        </div>
      </Space>

      <Divider style={{ margin: '12px 0' }} />

      {/* Aperçu de la condition */}
      <div style={{ 
        marginBottom: 12, 
        padding: '8px 12px', 
        background: '#fafafa', 
        border: '1px solid #f0f0f0', 
        borderRadius: 6 
      }}>
        <Text strong style={{ marginRight: 8 }}>Résumé:</Text>
        <div>
          <Text type="secondary">
            Branches: {localConditionSet?.branches?.length || 0} | 
            Mode: {localConditionSet?.mode || 'first-match'}
          </Text>
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Utilisez l'éditeur ci-dessous pour configurer les règles conditionnelles.
          </Text>
        </div>
      </div>

      {/* Éditeur de conditions */}
      {localConditionSet && (
        <ConditionsDnDComposer
          nodeId={nodeId}
          value={localConditionSet}
          onChange={handleConditionSetChange}
          readOnly={readOnly}
        />
      )}
      <div style={{ marginTop: 8, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {saving ? '💾 Sauvegarde…' : dirty ? '⏳ (non sauvegardé)' : `✅ Enregistré${lastSaveAtRef.current ? ' • ' + new Date(lastSaveAtRef.current).toLocaleTimeString() : ''}`}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>• {instances.length} condition(s)</Text>
        {activeId && <Text type="secondary" style={{ fontSize: 12 }}>• Actif: {localName || activeId}</Text>}
      </div>
    </Card>
  );
};

export default ConditionsPanelNew;
