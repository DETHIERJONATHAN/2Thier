import React from 'react';
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

  return (
    <>
      {/* Feuilles directes du groupe courant */}
      {leaves.map((leaf) => (
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
