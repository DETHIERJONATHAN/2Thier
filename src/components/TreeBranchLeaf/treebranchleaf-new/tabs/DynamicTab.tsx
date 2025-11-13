import React, { useMemo, useState, useEffect } from 'react';
import SectionCard from '../components/SectionCard';
import { IconC, IconO, IconOC } from '../components/Icons';
import { TblNode } from '../types/types';
import FieldRenderer from '../components/FieldRenderer';

interface DynamicTabProps {
  groupNode: TblNode; // type GROUP, children = sous-sections ou feuilles
  values: Record<string, unknown>;
  onChange: (nodeId: string, value: unknown) => void;
  debugMode?: boolean;
}

const pickIcon = (leafType?: TblNode['leafType']) => {
  switch (leafType) {
    case 'OPTION': return <IconO />;
    case 'OPTION_FIELD': return <IconOC />;
    case 'FIELD':
    default:
      return <IconC />;
  }
};

const DynamicTab: React.FC<DynamicTabProps> = ({ groupNode, values, onChange, debugMode }) => {
  const children = groupNode.children || [];
  const subGroups = children.filter(n => n.type === 'GROUP');
  const leaves = children.filter(n => n.type === 'LEAF');

  // SubTabs: déduire depuis les feuilles (metadata.subTab) ou depuis le noeud parent (metadata.subTabs)
  const allSubTabs = useMemo(() => {
    const set = new Map<string, string>();
    const addKey = (k?: string | null) => {
      const key = (k && String(k)) || '__default__';
      if (!set.has(key)) set.set(key, key === '__default__' ? 'Général' : key);
    };
    leaves.forEach(l => addKey((l as any).metadata?.subTab));
    // Support: branch-level metadata.subTabs as array of strings
    try {
      const nodeTabs = (groupNode as any).metadata?.subTabs as (string[] | undefined);
      if (Array.isArray(nodeTabs)) nodeTabs.forEach(t => addKey(t));
    } catch { /* noop */ }
    return Array.from(set.entries()).map(([key, label]) => ({ key, label }));
  }, [leaves, groupNode]);

  useEffect(() => {
    try { console.debug('[DynamicTab] subTabs for group', groupNode.id, allSubTabs); } catch { /* noop */ }
  }, [allSubTabs, groupNode.id]);

  const explicitTabSubTabs = Array.isArray((groupNode as any).metadata?.subTabs) && (groupNode as any).metadata?.subTabs.length > 0;
  const showSubTabs = explicitTabSubTabs || allSubTabs.length > 1;

  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(allSubTabs.length ? allSubTabs[0].key : undefined);
  useEffect(() => { if (allSubTabs.length > 0 && !allSubTabs.find(st => st.key === activeSubTab)) setActiveSubTab(allSubTabs[0].key); }, [allSubTabs, activeSubTab]);

  return (
    <>
      {/* Feuilles directes du groupe courant */}
      { /* SubTabs UI: afficher si plus d'un subtab */ }
        {showSubTabs && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {allSubTabs.map(st => (
            <button
              key={st.key}
              className={`btn btn-sm ${activeSubTab === st.key ? 'btn-primary' : 'btn-default'}`}
              onClick={() => setActiveSubTab(st.key)}
            >{st.label}</button>
          ))}
        </div>
      )}

      {leaves.filter(l => {
        const key = (l as any).metadata?.subTab || '__default__';
        if (!activeSubTab) return true;
        return key === activeSubTab;
      }).map((leaf) => (
        <SectionCard
          key={leaf.id}
          title={<div className="flex items-center">{pickIcon(leaf.leafType)} {leaf.title}</div>}
          subtitle={leaf.subtitle || undefined}
          badges={debugMode ? [leaf.leafType || ''] : undefined}
          debugMode={debugMode}
        >
          <FieldRenderer
            node={leaf}
            value={values[leaf.id]}
            onChange={(v) => onChange(leaf.id, v)}
          />
        </SectionCard>
      ))}

      {/* Sous-groupes récursifs */}
      {subGroups.map((grp) => (
        <SectionCard
          key={grp.id}
          title={<div className="flex items-center">{pickIcon()} {grp.title}</div>}
          subtitle={grp.subtitle || undefined}
          debugMode={debugMode}
        >
          <DynamicTab groupNode={grp} values={values} onChange={onChange} debugMode={debugMode} />
        </SectionCard>
      ))}
    </>
  );
};

export default DynamicTab;
