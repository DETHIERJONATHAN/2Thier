// src/components/FieldsPalette.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { List, Typography, Space } from 'antd';
import { iconForFieldType } from '../utils/fieldTypeIcons';
import useCRMStore from '../store';

type ApiFieldType = {
  id: string;
  name: string;
  label: string;
  has_options?: boolean;
  has_subfields?: boolean;
  config?: Record<string, unknown> | null;
};

const fallbackIcon = (name: string): React.ReactNode => iconForFieldType(name);

const DraggableField = ({ fieldType }: { fieldType: { type: string; label: string; icon: React.ReactNode } }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-field-${fieldType.type}`,
    data: { type: 'palette-field', fieldType: fieldType.type },
  });
  const style = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 1000 : 'auto' };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`palette-field-item ${isDragging ? 'dragging' : ''}`}
      data-type={fieldType.type}
    >
      <Space size={8} align="center">
        <span className="field-icon" aria-hidden>
          {fieldType.icon}
        </span>
        <Typography.Text className="field-label" ellipsis>
          {fieldType.label}
        </Typography.Text>
      </Space>
    </div>
  );
};

const FieldsPalette = () => {
  const { get } = useAuthenticatedApi();
  const { blocks } = useCRMStore();

  type WindowCacheShape = { __fieldsPaletteTypes?: { data: ApiFieldType[]; ts: number } };
  const initial = (): ApiFieldType[] => {
    try {
      const cache = (window as unknown as WindowCacheShape).__fieldsPaletteTypes;
      return cache?.data || [];
    } catch {
      return [];
    }
  };

  const [types, setTypes] = useState<ApiFieldType[]>(initial);
  const [loading, setLoading] = useState<boolean>(types.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number | null>(() => {
    try {
      return (window as unknown as WindowCacheShape).__fieldsPaletteTypes?.ts || null;
    } catch {
      return null;
    }
  });

  const saveCache = useCallback((list: ApiFieldType[]) => {
    try {
      (window as unknown as WindowCacheShape).__fieldsPaletteTypes = { data: list, ts: Date.now() };
    } catch {
      /* noop */
    }
  }, []);

  const load = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!opts.force && lastLoaded && Date.now() - lastLoaded < 30_000) return;
      if (types.length === 0) setLoading(true);
      setError(null);
      try {
        const resp = await get<{ success?: boolean; data?: ApiFieldType[] } | ApiFieldType[]>(`/api/field-types`);
        let list: ApiFieldType[] = [];
        if (Array.isArray(resp)) list = resp;
        else if (resp && typeof resp === 'object' && 'data' in resp) list = (resp as { data?: ApiFieldType[] }).data || [];
        if (list && list.length > 0) {
          setTypes(list);
          saveCache(list);
          setLastLoaded(Date.now());
        }
      } catch (e) {
        const msg = (e as Error)?.message || 'Erreur de chargement des types de champs';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [get, lastLoaded, saveCache, types.length]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 120_000);
    return () => clearInterval(id);
  }, [load]);

  const palette = useMemo(() => {
    // Types provenant des sections actuelles (parcourir tous les champs)
    const sectionTypes = new Set<string>();
    for (const b of blocks || []) {
      for (const s of b.sections || []) {
        for (const f of s.fields || []) {
          if (f?.type) sectionTypes.add(String(f.type));
        }
      }
    }

    // Types API -> base
    const apiTypes = new Set((types || []).map((t) => t.name));

    // Must-have explicit pour la palette
    const mustHave: string[] = ['image_user', 'donnee', 'tableau', 'image_admin', 'arbre'];

    // Union de tous les types désirés
    const allTypes = new Set<string>([...apiTypes, ...sectionTypes, ...mustHave]);

    // Dictionnaire des labels connus (fallback si l'API n’en fournit pas)
    const labelMap: Record<string, string> = {
      text: 'Texte',
      textarea: 'Zone de texte',
      password: 'Mot de passe',
      number: 'Nombre',
      date: 'Date',
      select: 'Liste',
      radio: 'Radio',
      checkboxes: 'Cases à cocher',
      checkbox: 'Case à cocher',
      donnee: 'Donnée',
      produit: 'Produit',
      image_admin: 'Image (statique)',
      image_user: 'Image utilisateur',
      fichier_user: 'Fichier utilisateur',
      tableau: 'Tableau',
      arbre: '🌳 Arbre TreeBranchLeaf',
    };

    // Construire la palette avec priorité aux labels de l’API
    const byName: Record<string, ApiFieldType> = Object.fromEntries((types || []).map((t) => [t.name, t]));
    const items: { type: string; label: string; icon: React.ReactNode }[] = [];
    for (const name of allTypes) {
      if (!name) continue;
      const api = byName[name];
      const label = api?.label || labelMap[name] || name;
      items.push({ type: name, label, icon: fallbackIcon(name) });
    }

    // Tri simple: alpha par label
    items.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    return items;
  }, [blocks, types]);

  return (
  <div className="fields-palette" data-testid="fields-palette">

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => load({ force: true })}>Réessayer</button>
        </div>
      )}

      {palette.length === 0 && loading && (
        <div className="loading-skeleton">
          <p>Chargement des types de champs...</p>
        </div>
      )}

      {palette.length === 0 && !loading && !error && (
        <div className="empty-state">
          <p>Aucun type de champ disponible</p>
        </div>
      )}

      {palette.length > 0 && (
        <List
          size="small"
          className="palette-list"
          dataSource={palette}
          split={false}
          renderItem={(ft) => (
            <List.Item className="palette-list-item" style={{ padding: 2 }}>
              <DraggableField fieldType={ft} />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default FieldsPalette;
