import React from 'react';
import { TblNode, TblFieldConfig } from "../types/types";

export interface FieldRendererProps {
  node: TblNode; // doit être de type LEAF
  value: unknown;
  onChange: (value: unknown) => void;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({ node, value, onChange }) => {
  const cfg = node.fieldConfig as TblFieldConfig | undefined;
  if (!cfg) return null;

  switch (cfg.fieldType) {
    case 'TEXT':
      return (
        <input
          type="text"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder={cfg.textConfig?.placeholder || ''}
          value={(value as string) ?? cfg.textConfig?.defaultValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'NUMBER': {
      const asNumber = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? cfg.numberConfig?.defaultValue ?? 0));
      if (cfg.numberConfig?.ui === 'slider') {
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={cfg.numberConfig.min ?? 0}
              max={cfg.numberConfig.max ?? 100}
              step={cfg.numberConfig.step ?? 1}
              value={asNumber(value)}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="w-20 text-right text-sm font-medium tabular-nums">{asNumber(value)}</div>
          </div>
        );
      }
      return (
        <input
          type="number"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={asNumber(value)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    }
    case 'SELECT':
      return (
        <select
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={(value as string) ?? cfg.selectConfig?.defaultValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {(cfg.selectConfig?.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case 'CHECKBOX':
      return (
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="accent-slate-900"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {node.title}
        </label>
      );
    case 'DATE':
      return (
        <input
          type="date"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return null;
  }
};

export default FieldRenderer;
