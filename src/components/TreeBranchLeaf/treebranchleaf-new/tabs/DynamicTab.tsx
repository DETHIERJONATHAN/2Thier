import React, { useMemo, useState, useEffect } from 'react';
import SectionCard from '../components/SectionCard';
import { IconC, IconO, IconOC } from '../components/Icons';
import { TblNode } from '../types/types';
import FieldRenderer from '../components/FieldRenderer';
import { normalizeSubTabValues } from '../utils/subTabNormalization';

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

const DEFAULT_SUBTAB_KEY = '__default__';
const normalizeSubTabs = normalizeSubTabValues;

const DynamicTab: React.FC<DynamicTabProps> = ({ groupNode, values, onChange, debugMode }) => {
  const children = groupNode.children || [];
  const subGroups = children.filter(n => n.type === 'GROUP');
  const leaves = children.filter(n => n.type === 'LEAF');

  // SubTabs: utiliser la définition explicite de la branche (metadata.subTabs) et ajouter "Général" uniquement si des champs restent non affectés
  const allSubTabs = useMemo(() => {
    const explicitTabs = Array.isArray((groupNode as any).metadata?.subTabs)
      ? normalizeSubTabs((groupNode as any).metadata?.subTabs)
      : [];

    const recognizedExplicit = new Set(explicitTabs);
    const groupAlwaysVisible = ((groupNode as any).metadata?.displayAlways === true || String((groupNode as any).metadata?.displayAlways) === 'true') || /affich|aperç|display/i.test(groupNode.title || '');

    let needsDefault = explicitTabs.length === 0; // si aucun onglet défini, afficher "Général"
    if (!needsDefault) {
      leaves.forEach(l => {
        const leafMeta = (l as any).metadata || {};
        const leafAlwaysVisible = (leafMeta.displayAlways === true || String(leafMeta.displayAlways) === 'true') || /affich|aperç|display/i.test(l.title || '');
        if (groupAlwaysVisible || leafAlwaysVisible) return;
        const assignments = normalizeSubTabs(leafMeta.subTab);
        const hasMatch = assignments.some(tab => recognizedExplicit.has(tab));
        if (!hasMatch) needsDefault = true;
      });
    }

    const tabs: Array<{ key: string; label: string }> = [];
    if (needsDefault) {
      tabs.push({ key: DEFAULT_SUBTAB_KEY, label: 'Général' });
    }

    explicitTabs.forEach(label => {
      if (!label) return;
      tabs.push({ key: label, label });
    });

    return tabs.length > 0 ? tabs : [{ key: DEFAULT_SUBTAB_KEY, label: 'Général' }];
  }, [leaves, groupNode]);

  useEffect(() => {
    try { console.debug('[DynamicTab] subTabs for group', groupNode.id, allSubTabs); } catch { /* noop */ }
  }, [allSubTabs, groupNode.id]);

  const showSubTabs = allSubTabs.length > 1;

  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(allSubTabs.length ? allSubTabs[0].key : undefined);
  useEffect(() => { if (allSubTabs.length > 0 && !allSubTabs.find(st => st.key === activeSubTab)) setActiveSubTab(allSubTabs[0].key); }, [allSubTabs, activeSubTab]);

  return (
    <>
      {/* Feuilles directes du groupe courant */}
      {/* SubTabs UI: afficher si plus d'un subtab */}
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
        const leafMeta = (l as any).metadata || {};
        const assignedTabs = normalizeSubTabs(leafMeta?.subTab);
        const groupAlwaysVisible = !!(groupNode as any).metadata?.displayAlways || /affich|aperç|display/i.test(groupNode.title || '');
        const leafAlwaysVisible = !!leafMeta.displayAlways || /affich|aperç|display/i.test(l.title || '');
        const recognized = new Set(allSubTabs.map(t => t.key));
        if (!activeSubTab) return true;
        if (groupAlwaysVisible || leafAlwaysVisible) return true;
        if (assignedTabs.length === 0) {
          return recognized.has(DEFAULT_SUBTAB_KEY) ? activeSubTab === DEFAULT_SUBTAB_KEY : true;
        }
        const matches = assignedTabs.filter(tab => recognized.has(tab));
        if (matches.length === 0) {
          return recognized.has(DEFAULT_SUBTAB_KEY) ? activeSubTab === DEFAULT_SUBTAB_KEY : true;
        }
        return matches.includes(activeSubTab);
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
