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

const pickIcon = (leafType?: TblNode['leafType'], displayIcon?: string) => {
  // 🎯 Si une icône est explicitement configurée dans l'apparence, l'utiliser
  if (displayIcon && displayIcon.trim()) {
    return <span title="Icône personnalisée" className="mr-2 text-base">{displayIcon}</span>;
  }
  
  // Sinon utiliser l'icône par défaut selon le type de feuille
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

  // 📦 Filtrage par Produit : vérifie si un nœud est visible selon la sélection produit
  const isProductVisible = (node: TblNode): boolean => {
    if (!node.hasProduct) return true;
    if (!node.product_visibleFor || !Array.isArray(node.product_visibleFor) || node.product_visibleFor.length === 0) return true;
    if (!node.product_sourceNodeId) return true;

    const sourceValue = values[node.product_sourceNodeId];
    // Si aucune valeur sélectionnée dans le champ source → tout afficher
    if (sourceValue === undefined || sourceValue === null || sourceValue === '') return true;
    if (Array.isArray(sourceValue) && sourceValue.length === 0) return true;

    const selectedValues: string[] = Array.isArray(sourceValue)
      ? sourceValue.map(String)
      : [String(sourceValue)];
    return node.product_visibleFor.some(v => selectedValues.includes(v));
  };

  // Appliquer le filtre produit aux feuilles et sous-groupes
  const visibleLeaves = useMemo(() => leaves.filter(isProductVisible), [leaves, values]);
  const visibleSubGroups = useMemo(() => subGroups.filter(isProductVisible), [subGroups, values]);

  // SubTabs: utiliser la définition explicite de la branche (metadata.subTabs) et ajouter "Général" uniquement si des champs restent non affectés
  const allSubTabs = useMemo(() => {
    const explicitTabs = Array.isArray((groupNode as any).metadata?.subTabs)
      ? normalizeSubTabs((groupNode as any).metadata?.subTabs)
      : [];

    const recognizedExplicit = new Set(explicitTabs);
    const groupAlwaysVisible = ((groupNode as any).metadata?.displayAlways === true || String((groupNode as any).metadata?.displayAlways) === 'true') || /affich|aperç|display/i.test(groupNode.title || '');

    // 🔧 FIX: Si des sous-onglets explicites sont définis, vérifier si des champs n'ont pas
    // de sous-onglet reconnu (soit pas de sous-onglet, soit un sous-onglet "parasite" comme "Générales")
    let needsDefault = explicitTabs.length === 0; // si aucun onglet défini, afficher "Général"
    if (!needsDefault) {
      visibleLeaves.forEach(l => {
        const leafMeta = (l as any).metadata || {};
        const leafAlwaysVisible = (leafMeta.displayAlways === true || String(leafMeta.displayAlways) === 'true') || /affich|aperç|display/i.test(l.title || '');
        if (groupAlwaysVisible || leafAlwaysVisible) return;
        // 🔧 FIX: Vérifier aussi subTabKey/subTabKeys directement sur le nœud (pas seulement metadata.subTab)
        // Les champs partagés et les champs TBL stockent leur affectation dans subTabKey/subTabKeys
        const leafSubTabKeys = (l as any).subTabKeys || ((l as any).subTabKey ? [(l as any).subTabKey] : []);
        const assignments = normalizeSubTabs([...leafSubTabKeys, ...(leafMeta.subTab ? [leafMeta.subTab] : [])]);
        
        // 🔧 FIX CRITIQUE: Vérifier si le champ a un sous-onglet RECONNU
        // Si le champ a un sous-onglet qui n'est pas dans la liste explicite (ex: "Générales"),
        // traiter comme s'il n'avait pas de sous-onglet → besoin de "Général"
        if (assignments.length === 0) {
          needsDefault = true;
        } else {
          const hasRecognizedSubTab = assignments.some(tab => recognizedExplicit.has(tab));
          if (!hasRecognizedSubTab) needsDefault = true;
        }
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
  }, [visibleLeaves, groupNode]);

  // 📦 Filtrage produit des sous-onglets : masquer ceux qui ne correspondent pas au produit sélectionné
  const visibleSubTabs = useMemo(() => {
    const meta = (groupNode as any).metadata;
    const subTabsVis = meta?.product_subTabsVisibility as Record<string, string[] | null> | undefined;
    if (!subTabsVis || !groupNode.hasProduct || !groupNode.product_sourceNodeId) return allSubTabs;

    const sourceValue = values[groupNode.product_sourceNodeId];
    // Si aucune valeur sélectionnée → tout afficher
    if (sourceValue === undefined || sourceValue === null || sourceValue === '') return allSubTabs;
    if (Array.isArray(sourceValue) && sourceValue.length === 0) return allSubTabs;

    const selectedValues: string[] = Array.isArray(sourceValue)
      ? sourceValue.map(String)
      : [String(sourceValue)];

    return allSubTabs.filter(tab => {
      if (tab.key === DEFAULT_SUBTAB_KEY) return true; // Général toujours visible
      const vis = subTabsVis[tab.label];
      if (vis === null || vis === undefined) return true; // null = toujours visible
      if (vis.length === 0) return false; // [] = jamais visible
      return vis.some(v => selectedValues.includes(v));
    });
  }, [allSubTabs, groupNode, values]);

  useEffect(() => {
    try { console.debug('[DynamicTab] subTabs for group', groupNode.id, visibleSubTabs); } catch { /* noop */ }
  }, [visibleSubTabs, groupNode.id]);

  const showSubTabs = visibleSubTabs.length > 1;

  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(visibleSubTabs.length ? visibleSubTabs[0].key : undefined);
  useEffect(() => { if (visibleSubTabs.length > 0 && !visibleSubTabs.find(st => st.key === activeSubTab)) setActiveSubTab(visibleSubTabs[0].key); }, [visibleSubTabs, activeSubTab]);

  return (
    <>
      {/* Feuilles directes du groupe courant */}
      {/* SubTabs UI: afficher si plus d'un subtab */}
      {showSubTabs && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {visibleSubTabs.map(st => (
            <button
              key={st.key}
              className={`btn btn-sm ${activeSubTab === st.key ? 'btn-primary' : 'btn-default'}`}
              onClick={() => setActiveSubTab(st.key)}
            >{st.label}</button>
          ))}
        </div>
      )}

      {visibleLeaves.filter(l => {
        const leafMeta = (l as any).metadata || {};
        // 🔧 FIX: Vérifier aussi subTabKey/subTabKeys directement sur le nœud (pas seulement metadata.subTab)
        // Les champs partagés et les champs TBL stockent leur affectation dans subTabKey/subTabKeys
        const leafSubTabKeys = (l as any).subTabKeys || ((l as any).subTabKey ? [(l as any).subTabKey] : []);
        const assignedTabs = normalizeSubTabs([...leafSubTabKeys, ...(leafMeta?.subTab ? [leafMeta.subTab] : [])]);
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
          title={<div className="flex items-center">{pickIcon(leaf.leafType, (leaf as any)?.metadata?.appearance?.displayIcon)} {leaf.title}</div>}
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
      {visibleSubGroups.map((grp) => (
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
