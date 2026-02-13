import React from 'react';
import { Select } from 'antd';
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
    case 'SELECT': {
      const selectOptions = (cfg.selectConfig?.options ?? []).map(o => ({ label: o.label, value: o.value }));
      if (cfg.multiple) {
        // 🛒 Mode multiselect avec Ant Design
        const multiVal = Array.isArray(value) ? value as string[] : (value ? [value as string] : []);
        return (
          <Select
            mode="multiple"
            className="mt-2 w-full"
            placeholder="Sélectionnez…"
            value={multiVal}
            onChange={(v: string[]) => onChange(v)}
            options={selectOptions}
            allowClear
          />
        );
      }
      return (
        <Select
          className="mt-2 w-full"
          placeholder="Sélectionnez…"
          value={(value as string) ?? cfg.selectConfig?.defaultValue ?? undefined}
          onChange={(v: string) => onChange(v)}
          options={selectOptions}
          allowClear
        />
      );
    }
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
    case 'PHOTO':
      return (
        <div className="mt-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            id={`photo-input-${node.id}`}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onChange(file);
            }}
          />
          <label htmlFor={`photo-input-${node.id}`}>
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Photo
            </button>
          </label>
          {value && typeof value === 'object' && 'name' in value && (
            <div className="mt-2">
              <img
                src={URL.createObjectURL(value as File)}
                alt="Photo prise"
                className="max-w-xs max-h-48 rounded border mt-2"
              />
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
};

export default FieldRenderer;
