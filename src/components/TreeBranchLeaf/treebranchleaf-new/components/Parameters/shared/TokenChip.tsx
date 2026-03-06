import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { NODE_THEMES } from '../../../shared/hierarchyRules';

export type TokenChipProps = {
  token: string;
  onRemove?: (token: string) => void;
  onDoubleClick?: (token: string) => void;
  isGestionnaireExposed?: boolean;
};

// Cache simple en mémoire pour limiter les appels API
const nodeMetaCache: Record<string, { label: string; type?: string }> = {};
const formulaMetaCache: Record<string, { name: string }> = {};
const conditionMetaCache: Record<string, { name: string }> = {};
const tableMetaCache: Record<string, { name: string }> = {};

const normalizeToken = (raw: string) => {
  if (!raw) return '';
  const cleaned = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      // Remove zero-width chars, embeddings, isolates, LRM/RLM
      if (code === 0x200B || code === 0x200C || code === 0x200D || code === 0xFEFF) return false;
      if (code === 0x200E || code === 0x200F) return false; // LRM/RLM
      if (code >= 0x202A && code <= 0x202E) return false; // embeddings
      if (code >= 0x2066 && code <= 0x2069) return false; // isolates
      // Remove NBSP and other non-breaking spaces
      if (code === 0x00A0) return false;
      // Remove C0 and C1 control ranges
      if (code < 0x20 || (code >= 0x7F && code <= 0x9F)) return false;
      return true;
    })
    .join('')
    .trim();
  return cleaned;
};

const baseTokenKind = (rawToken: string) => {
  const token = normalizeToken(rawToken);
  
  // 🔍 DEBUG pour comprendre la classification
  // console.log(...) // ✨ Log réduit

  // {

  // }
  
  // ⚠️ IMPORTANT: Vérifier les formules EN PREMIER, même si elles sont wrappées dans @value.
  if (token.includes('node-formula:')) {
    // console.log('✅ baseTokenKind: Identifié comme nodeFormula (contient node-formula:)'); // ✨ Log réduit
    return 'nodeFormula' as const;
  }
  
  if (token.startsWith('formula:')) return 'formula' as const;
  if (token.startsWith('condition:') || token.startsWith('node-condition:')) return 'conditionRef' as const;
  if (token.startsWith('@const.')) return 'constGest' as const;
  if (token.startsWith('@table.') || token.startsWith('node-table:') || token.startsWith('table:')) return 'tableRef' as const;
  if (token.startsWith('@value.') || token.includes('@value.')) return 'nodeValue' as const;
  if (token.startsWith('@select.') || token.includes('@select.')) return 'nodeOption' as const;
  if (token.startsWith('#')) return 'marker' as const;
  if (['+', '-', '*', '/', '(', ')', 'CONCAT'].includes(token)) return 'operator' as const;
  if (/^".*"$/.test(token)) return 'string' as const;
  if (/^[-+]?\d*\.?\d+$/.test(token)) return 'number' as const;
  // Dernière chance: regex
  if (/@value\.[A-Za-z0-9_-]+/.test(token)) return 'nodeValue' as const;
  if (/@select\.[A-Za-z0-9_-]+/.test(token)) return 'nodeOption' as const;
  return 'other' as const;
};

export const TokenChip: React.FC<TokenChipProps> = ({ token, onRemove, onDoubleClick, isGestionnaireExposed }) => {
  const { api } = useAuthenticatedApi();
  const normToken = useMemo(() => normalizeToken(token), [token]);
  const kind = useMemo(() => baseTokenKind(normToken), [normToken]);
  const [label, setLabel] = useState<string>('');
  const [icon, setIcon] = useState<string>('');
  const [tooltip, setTooltip] = useState<string>('');
  const [color, setColor] = useState<string>('default');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // ⚠️ DEBUG: Log pour identifier le problème des formules
        if (normToken.includes('node-formula:')) {
          // console.log(...) // ✨ Log réduit

          // {

            // normToken,
            // kind,

          // }
        }
        
        if (kind === 'nodeValue' || kind === 'nodeOption') {
          const id = kind === 'nodeValue' ? normToken.slice('@value.'.length) : normToken.slice('@select.'.length).split('.')[0];
          
          // ⚠️ PROTECTION: Ne pas traiter les formules comme des nœuds
          if (id.startsWith('node-formula:')) {
            console.error('🚨 TokenChip ERREUR - Formule traitée comme nœud:', { id, kind, normToken, rawToken: token });
            if (!cancelled) { 
              setColor('red'); 
              setLabel('Erreur: Formule orpheline'); 
              setIcon('⚠️'); 
              setTooltip('Cette formule n\'existe plus ou est mal référencée'); 
            }
            return;
          }
          
          setColor(kind === 'nodeValue' ? 'green' : 'blue');
          setTooltip(token);
          if (nodeMetaCache[id]) {
            const m = nodeMetaCache[id];
            const ic = NODE_THEMES[m.type || 'leaf_field']?.icon || '🔘';
            if (!cancelled) { setLabel(m.label || id); setIcon(ic); }
            return;
          }
          try {
            const data = await api.get(`/api/treebranchleaf/nodes/${id}`) as { label?: string; type?: string } | null;
            if (!data) {
              if (!cancelled) { setColor('red'); setLabel('Référence introuvable'); setIcon('⚠️'); setTooltip(normToken); }
              return;
            }
            const meta = { label: data?.label || id, type: data?.type };
            nodeMetaCache[id] = meta;
            const ic = NODE_THEMES[meta.type || 'leaf_field']?.icon || '🔘';
            if (!cancelled) { setLabel(meta.label); setIcon(ic); }
          } catch {
            if (!cancelled) { setColor('red'); setLabel('Référence introuvable'); setIcon('⚠️'); setTooltip(normToken); }
          }
          return;
        }
        if (kind === 'nodeFormula') {
          const id = normToken.slice('node-formula:'.length);
          // console.log(...) // ✨ Log réduit

          // {
            // token,
            // normToken,

          // }
          
          setColor('purple');
          setTooltip('Formule réutilisable');
          setIcon('🧮');
          
          // Vérifier le cache d'abord
          if (formulaMetaCache[`node-formula:${id}`]) {
            const cached = formulaMetaCache[`node-formula:${id}`];
            // console.log('📋 TokenChip - Cache hit:', cached); // ✨ Log réduit
            if (!cancelled) { 
              setLabel(cached.name);
            }
            return;
          }
          
          // Charger directement depuis l'endpoint des formules réutilisables
          try {
            // console.log('🌐 TokenChip - Chargement API formule:', id); // ✨ Log réduit
            const formulasRes = await api.get('/api/treebranchleaf/reusables/formulas') as { 
              items?: Array<{ id: string; name: string; nodeLabel?: string }> 
            };
            // console.log(...) // ✨ Log réduit

            // {
              // formulasRes,

            // }
            
            const formula = formulasRes?.items?.find(f => f.id === id);
            if (formula && !cancelled) {
              const displayName = `${formula.name}${formula.nodeLabel ? ` (${formula.nodeLabel})` : ''}`;
              // console.log('✅ TokenChip - Formule trouvée:', { formula, displayName }); // ✨ Log réduit
              formulaMetaCache[`node-formula:${id}`] = { name: displayName };
              setLabel(displayName);
              setIcon('🧮');
              setColor('purple');
            } else if (!cancelled) {
              const fallbackName = `Formule — ${id.slice(0, 8)}...`;
              // console.log('⚠️ TokenChip - Formule non trouvée, fallback:', fallbackName); // ✨ Log réduit
              formulaMetaCache[`node-formula:${id}`] = { name: fallbackName };
              setLabel(fallbackName);
              setIcon('🧮');
              setColor('orange');
            }
          } catch {
            // console.warn(`❌ TokenChip - Erreur lors du chargement de la formule ${id}:`, error); // ✨ Log réduit
            if (!cancelled) {
              const fallbackName = `Formule — ${id.slice(0, 8)}...`;
              formulaMetaCache[`node-formula:${id}`] = { name: fallbackName };
              setLabel(fallbackName);
              setIcon('⚠️');
              setColor('red');
            }
          }
          return;
        }
        if (kind === 'formula') {
          const id = normToken.slice('formula:'.length);
          setColor('purple');
          setTooltip('Formule réutilisable');
          const fallback = 'Formule';
          if (formulaMetaCache[id]) {
            if (!cancelled) { setLabel(`${fallback} — ${formulaMetaCache[id].name}`); setIcon('🧮'); }
            return;
          }
          try {
            const data = await api.get(`/api/treebranchleaf/reusables/formulas/${id}`) as { name?: string } | null;
            const name = (data?.name && String(data.name)) || id;
            formulaMetaCache[id] = { name };
            if (!cancelled) { setLabel(`${fallback} — ${name}`); setIcon('🧮'); }
          } catch {
            if (!cancelled) { setLabel(`${fallback} — ${id}`); setIcon('🧮'); }
          }
          return;
        }
        if (kind === 'conditionRef') {
          const id = normToken.startsWith('condition:')
            ? normToken.slice('condition:'.length)
            : normToken.slice('node-condition:'.length);
          const cacheKey = `condition:${id}`;
          setColor('volcano');
          setIcon('⚖️');
          setTooltip('Condition réutilisable');
          if (conditionMetaCache[cacheKey]) {
            if (!cancelled) setLabel(conditionMetaCache[cacheKey].name);
            return;
          }
          try {
            const data = await api.get(`/api/treebranchleaf/reusables/conditions/${id}`) as { name?: string; nodeLabel?: string } | null;
            const displayName = data?.name ? `${data.name}${data.nodeLabel ? ` (${data.nodeLabel})` : ''}` : `Condition — ${id.slice(0, 8)}...`;
            conditionMetaCache[cacheKey] = { name: displayName };
            if (!cancelled) setLabel(displayName);
          } catch {
            const fallback = `Condition — ${id.slice(0, 8)}...`;
            conditionMetaCache[cacheKey] = { name: fallback };
            if (!cancelled) { setLabel(fallback); setColor('red'); }
          }
          return;
        }

        if (kind === 'tableRef') {
          const id = normToken.startsWith('@table.')
            ? normToken.slice('@table.'.length)
            : normToken.replace(/^node-table:/, '').replace(/^table:/, '');
          const cacheKey = `table:${id}`;
          setColor('geekblue');
          setIcon('📊');
          setTooltip('Tableau réutilisable');
          if (tableMetaCache[cacheKey]) {
            if (!cancelled) setLabel(tableMetaCache[cacheKey].name);
            return;
          }
          try {
            const tablesRes = await api.get('/api/treebranchleaf/reusables/tables') as { items?: Array<{ id: string; name: string; type?: string }> };
            const table = tablesRes?.items?.find(t => t.id === id);
            const displayName = table ? `${table.name}${table.type ? ` (${table.type})` : ''}` : `Table — ${id.slice(0, 8)}...`;
            tableMetaCache[cacheKey] = { name: displayName };
            if (!cancelled) setLabel(displayName);
          } catch {
            const fallback = `Table — ${id.slice(0, 8)}...`;
            tableMetaCache[cacheKey] = { name: fallback };
            if (!cancelled) { setLabel(fallback); setColor('red'); }
          }
          return;
        }

        // 📋 Constante gestionnaire (@const.id.value)
        if (kind === 'constGest') {
          const rest = normToken.slice('@const.'.length);
          const firstDot = rest.indexOf('.');
          const displayValue = firstDot > 0 ? rest.slice(firstDot + 1) : rest;
          setColor('geekblue');
          setLabel(displayValue);
          setIcon('📋');
          setTooltip(`Gestionnaire: ${displayValue}`);
          return;
        }

        // Constantes et opérateurs
        if (kind === 'operator') { setColor('gold'); setLabel(token); setIcon('➕'); setTooltip('Opérateur'); return; }
        if (kind === 'string') { setColor('cyan'); setLabel(token); setIcon('"'); setTooltip('Texte'); return; }
        if (kind === 'number') { setColor('geekblue'); setLabel(token); setIcon('123'); setTooltip('Nombre'); return; }
        if (kind === 'marker') { setColor('magenta'); setLabel(token); setIcon('🏷️'); setTooltip('Marqueur'); return; }
    setColor('default'); setLabel(normToken); setIcon(''); setTooltip(normToken);
      } catch {
    if (!cancelled) { setColor('default'); setLabel(normToken); setIcon(''); setTooltip(normToken); }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [api, normToken, kind, token]);
  useEffect(() => {
    if (kind === 'nodeFormula') {
      // console.log(...) // ✨ Log réduit

      // {
        // kind,
        // token,
        // normToken,
        // label,
        // icon,
        // color,
        // tooltip,

      // }
    }
  }, [kind, token, normToken, label, icon, color, tooltip]);

  const displayText = useMemo(() => {
    if (kind === 'nodeValue' || kind === 'nodeOption' || kind === 'formula' || kind === 'nodeFormula') {
      return label || '…';
    }
    return label || normToken;
  }, [kind, label, normToken]);

  const content = (
    <span>
      {icon ? <span style={{ marginRight: 6 }}>{icon}</span> : null}
      {displayText}
    </span>
  );

  const gestionnaireStyle: React.CSSProperties | undefined = isGestionnaireExposed
    ? { backgroundColor: '#1a1a1a', color: '#ffffff', borderColor: '#1a1a1a', marginBottom: 4, cursor: onDoubleClick ? 'pointer' : undefined }
    : { marginBottom: 4, cursor: onDoubleClick ? 'pointer' : undefined };

  return (
    <Tooltip title={isGestionnaireExposed ? `📋 Gestionnaire: ${tooltip || token}` : (tooltip || token)}>
      <Tag
        color={isGestionnaireExposed ? undefined : color}
        closable={!!onRemove}
        onClose={(e) => { e.preventDefault(); onRemove?.(token); }}
        style={gestionnaireStyle}
        onDoubleClick={onDoubleClick ? (e) => { e.stopPropagation(); onDoubleClick(token); } : undefined}
      >
        {content}
      </Tag>
    </Tooltip>
  );
};

export default TokenChip;
