import React, { useState, useEffect, useCallback } from 'react';

interface AdvancedSelectProps {
  fieldId: string;
  disabled?: boolean;
  loadChildren: (fieldId: string, parentId: string | null) => Promise<Array<{ id: string; label: string; value?: string }>>;
  fetchNodeDetail: (id: string) => Promise<{ id: string; data?: Record<string, unknown> } | null>;
  onChange: (value: unknown) => void;
  value?: unknown;
  style?: React.CSSProperties;
  className?: string;
}

export const AdvancedSelect: React.FC<AdvancedSelectProps> = ({ 
  fieldId, 
  disabled, 
  loadChildren, 
  fetchNodeDetail, 
  onChange, 
  value, 
  style, 
  className 
}) => {
  const [levels, setLevels] = useState<Array<{ 
    parentId: string | null; 
    options: Array<{ id: string; label: string; value?: string }>; 
    selectedId: string 
  }>>([]);
  const [extraField, setExtraField] = useState<{ type: string; placeholder?: string } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [extraValue, setExtraValue] = useState<string>('');
  const controlClass = `border rounded px-2 py-1 w-full text-sm h-10 ${className || ''}`;

  // Charger le niveau racine au montage
  useEffect(() => {
    let mounted = true;
    (async () => {
      const root = await loadChildren(fieldId, null);
      if (!mounted) return;
      // Si une valeur existe déjà (édition), tenter de reconstruire le chemin
      const existingSelection = (value && typeof value === 'object') ? (value as Record<string, unknown>)['nodeId'] as string | undefined : undefined;
      if (existingSelection) {
        // On pousse le niveau racine, puis on va descendre en lazy en suivant la sélection si possible
        setLevels([{ parentId: null, options: root, selectedId: '' }]);
        // Reconstruction différée pour laisser React appliquer root
        setTimeout(async () => {
          const chain: string[] = [];
          // Heuristique: si nodeId inconnu dans root, on tentera de le charger en descendant
          // On va parcourir en profondeur tant que des enfants uniques mènent vers le nodeId ciblé (simplification)
          const buildPath = async (currentParent: string | null, depth = 0): Promise<boolean> => {
            const opts = depth === 0 ? root : await loadChildren(fieldId, currentParent);
            if (!opts || opts.length === 0) return false;
            // Si l'un des opts est directement le node final
            if (opts.some(o => o.id === existingSelection)) {
              chain.push(existingSelection);
              return true;
            }
            // Sinon essayer récursivement chaque enfant (limiter profondeur)
            if (depth > 6) return false; // sécurité
            for (const o of opts) {
              const children = await loadChildren(fieldId, o.id);
              if (children.some(c => c.id === existingSelection)) {
                chain.push(o.id, existingSelection);
                return true;
              }
              // descente plus profonde si children non vides mais pas cible
              if (children.length > 0) {
                const ok = await buildPath(o.id, depth + 1);
                if (ok) { chain.unshift(o.id); return true; }
              }
            }
            return false;
          };
          try { await buildPath(null, 0); } catch { /* noop */ }
          // Appliquer la chaîne
          if (chain.length > 0) {
            // Construire niveaux séquentiels
            const accLevels: typeof levels = [{ parentId: null, options: root, selectedId: chain[0] || '' }];
            for (let i = 0; i < chain.length; i++) {
              const nid = chain[i];
              if (!nid) continue;
              const children = await loadChildren(fieldId, nid);
              if (children.length === 0) continue;
              const nextId = chain[i + 1] || '';
              accLevels.push({ parentId: nid, options: children, selectedId: nextId });
            }
            setLevels(accLevels);
            setSelectedNodeId(existingSelection);
            // Restaurer extra si présent
            const extraVal = (value && typeof value === 'object') ? (value as Record<string, unknown>)['extra'] : undefined;
            if (typeof extraVal !== 'undefined') setExtraValue(String(extraVal));
            // Vérifier si le node sélectionné possède un nextField (pour recréer extraField au rechargement)
            try {
              const detail = await fetchNodeDetail(existingSelection);
              const nf = detail?.data && typeof detail.data === 'object' ? (detail.data as Record<string, unknown>)['nextField'] as { type?: string; placeholder?: string } | undefined : undefined;
              if (nf && nf.type) {
                setExtraField({ type: nf.type, placeholder: nf.placeholder });
                // si pas d'extraVal, garder vide
              }
            } catch { /* noop */ }
          } else {
            setLevels([{ parentId: null, options: root, selectedId: '' }]);
          }
        }, 10);
      } else {
        setLevels([{ parentId: null, options: root, selectedId: '' }]);
      }
    })();
    return () => { mounted = false; };
  }, [fieldId, loadChildren, value, fetchNodeDetail]);

  const handleSelect = useCallback(async (levelIndex: number, selectedId: string) => {
    setLevels(prev => prev.slice(0, levelIndex + 1).map((lv, idx) => idx === levelIndex ? { ...lv, selectedId } : lv));
    // charger enfants du nœud sélectionné
    const children = await loadChildren(fieldId, selectedId || null);
    if (children.length > 0 && selectedId) {
      setLevels(prev => [...prev, { parentId: selectedId, options: children, selectedId: '' }]);
      // ne pas changer la valeur finale tant qu'on n'a pas choisi une feuille
      setExtraField(null);
      setSelectedNodeId('');
      setExtraValue('');
    } else {
      // feuille atteinte -> calculer la valeur
      // récupère la value du nœud sélectionné; si vide, utiliser label
      const lastLevel = levels[levelIndex];
      const opts = lastLevel?.options || [];
      const found = opts.find(o => o.id === selectedId);
      const finalValue = (found?.value || found?.label || '') as string;
      // vérifier s'il existe un champ suivant configuré
      setSelectedNodeId(selectedId || '');
      try {
        if (selectedId) {
          const detail = await fetchNodeDetail(selectedId);
          const nf = detail?.data && typeof detail.data === 'object' ? (detail.data as Record<string, unknown>)['nextField'] as { type?: string; placeholder?: string } | undefined : undefined;
          if (nf && nf.type) {
            setExtraField({ type: nf.type, placeholder: nf.placeholder });
            setExtraValue('');
            // ne pas émettre tout de suite; on attend la saisie extra
            onChange({ selection: finalValue, nodeId: selectedId, extra: '' });
            return;
          }
        }
      } catch {
        // ignorer erreurs; continuer avec finalValue
      }
      setExtraField(null);
      onChange({ selection: finalValue, nodeId: selectedId || '', extra: undefined });
      // supprimer d'éventuels niveaux plus profonds
      setLevels(prev => prev.slice(0, levelIndex + 1));
    }
  }, [fieldId, loadChildren, onChange, levels, fetchNodeDetail]);

  return (
    <div className="flex flex-col gap-2">
      {levels.map((lv, idx) => (
        <select
          key={`${lv.parentId || 'root'}-${idx}`}
          className={controlClass}
          style={style}
          disabled={disabled}
          value={lv.selectedId}
          onChange={(e) => handleSelect(idx, e.target.value)}
        >
          <option value="">Sélectionner…</option>
          {lv.options.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      ))}
      {extraField && (
        <div className="mt-1">
          {extraField.type === 'textarea' ? (
            <textarea
              className="border rounded px-2 py-1 w-full text-sm min-h-[2.5rem]"
              placeholder={extraField.placeholder || ''}
              disabled={disabled}
              value={extraValue}
              onChange={(e) => {
                const v = e.target.value;
                setExtraValue(v);
                const sel = (typeof value === 'object' && value) ? (value as Record<string, unknown>)['selection'] : (typeof value === 'string' ? value : undefined);
                onChange({ selection: sel, nodeId: selectedNodeId, extra: v });
              }}
            />
          ) : extraField.type === 'checkbox' ? (
            <div className="border rounded px-2 w-full h-10 flex items-center text-sm">
              <label className="inline-flex items-center gap-2 w-full">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={extraValue === 'true'}
                  onChange={(e) => {
                    const v = e.target.checked ? 'true' : 'false';
                    setExtraValue(v);
                    const sel = (typeof value === 'object' && value) ? (value as Record<string, unknown>)['selection'] : (typeof value === 'string' ? value : undefined);
                    onChange({ selection: sel, nodeId: selectedNodeId, extra: v === 'true' });
                  }}
                />
                <span className="truncate">{extraField.placeholder || 'Oui / Non'}</span>
              </label>
            </div>
          ) : (
            <input
              className={controlClass}
              style={style}
              type={extraField.type === 'number' ? 'number' : (extraField.type === 'date' ? 'date' : 'text')}
              placeholder={extraField.placeholder || ''}
              disabled={disabled}
              value={extraValue}
              onChange={(e) => {
                const v = e.target.value;
                setExtraValue(v);
                const sel = (typeof value === 'object' && value) ? (value as Record<string, unknown>)['selection'] : (typeof value === 'string' ? value : undefined);
                onChange({ selection: sel, nodeId: selectedNodeId, extra: v });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
