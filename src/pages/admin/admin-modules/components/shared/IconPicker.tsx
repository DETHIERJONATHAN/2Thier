import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Segmented, Select, Spin, ColorPicker } from 'antd';
import IconRenderer from './IconRenderer';
import { useIcons } from '../../hooks/useIcons';

type IconPickerProps = {
  value?: { name?: string; color?: string };
  onChange?: (val: { name?: string; color?: string }) => void;
  withColor?: boolean;
};

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, withColor = false }) => {
  const { icons, categories, loading, category, search, setCategory, setSearch } = useIcons();
  const selected = value?.name || 'AppstoreOutlined';
  const color = value?.color || '#1890ff';
  const segRef = useRef<HTMLDivElement>(null);
  const [useDropdown, setUseDropdown] = useState(false);

  const byCategory = useMemo(() => {
    const map: Record<string, typeof icons> = {};
    icons.forEach(ic => { (map[ic.category] ||= []).push(ic); });
    return map;
  }, [icons]);

  // Basculer automatiquement vers un menu déroulant si la barre d'onglets déborde
  useEffect(() => {
    const el = segRef.current;
    if (!el) return;
    const needsDropdown = el.scrollWidth > el.clientWidth + 4; // tolérance
    setUseDropdown(needsDropdown);
  }, [categories.length]);

  return (
    <div className="space-y-2 w-full">
  <div className="flex flex-wrap items-center gap-2">
        {useDropdown ? (
          <div className="min-w-[200px]">
            <Select
              value={category || 'all'}
              onChange={(v)=> setCategory(String(v))}
              style={{ width: 240 }}
              options={[{ label: 'Toutes', value: 'all' }, ...categories.map(c => ({ label: `${c.name} (${c.count})`, value: c.name }))]}
              showSearch
              optionFilterProp="label"
              size="middle"
            />
          </div>
        ) : (
          <div ref={segRef} className="min-w-0 max-w-full overflow-x-hidden whitespace-nowrap py-1 px-0.5 rounded bg-transparent">
            <Segmented
              options={[{ label: 'Toutes', value: 'all' }, ...categories.map(c => ({ label: `${c.name} (${c.count})`, value: c.name }))]}
              value={category || 'all'}
              onChange={(val) => setCategory(String(val))}
            />
          </div>
        )}
        <div className="flex-1 min-w-[160px] max-w-[260px]">
          <Input.Search
            allowClear
            placeholder="Rechercher une icône…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {withColor && (
            <ColorPicker
              value={color}
              onChange={(_, hex) => onChange?.({ name: selected, color: hex })}
              showText={false}
              size="small"
            />
          )}
          <IconRenderer name={selected} color={color} size={22} />
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center"><Spin /></div>
      ) : (
        <div className="max-h-[46vh] overflow-auto border rounded-md p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 w-full">
          {Object.entries(byCategory).map(([cat, list]) => (
            <React.Fragment key={cat}>
              {list
                .filter(ic => !search || ic.name.toLowerCase().includes(search.toLowerCase()))
                .map(ic => (
                  <button
                    key={ic.id}
                    type="button"
                    className={`flex flex-col items-center gap-1 p-2 rounded hover:bg-slate-800/40 border w-full ${selected === ic.name ? 'border-blue-500' : 'border-transparent'}`}
                    onClick={() => onChange?.({ name: ic.name, color })}
                    title={`${ic.name} • ${cat}`}
                  >
                    <IconRenderer name={ic.name} color={color} />
                    <span className="text-[10px] text-slate-300 truncate w-full">{ic.name}</span>
                  </button>
                ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
