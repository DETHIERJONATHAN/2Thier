import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, ColorPicker } from 'antd';
import IconPicker from '../components/shared/IconPicker';
import IconRenderer from '../components/shared/IconRenderer';
import { useAuth } from '../../../../auth/useAuth';
import { ModuleWithStatus } from '../types';

export type ModuleFormData = Partial<Pick<ModuleWithStatus,
  'id' | 'key' | 'label' | 'feature' | 'icon' | 'iconColor' | 'route' | 'description' | 'page' | 'order' | 'active' | 'categoryId'
>> & { isGlobal?: boolean };

export function ModuleForm({ initial, onSave, onCancel }:{
  initial: ModuleFormData | null;
  onSave: (data: ModuleFormData) => void;
  onCancel: () => void;
}) {
  const { isSuperAdmin, currentOrganization } = useAuth();
  const [form, setForm] = useState<ModuleFormData>({
  key: '', label: '', feature: '', icon: '', iconColor: '#1890ff', route: '', description: '', page: '', order: 0, active: true,
    isGlobal: isSuperAdmin && !currentOrganization?.id,
  });

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  return (
    <Card size="small" className="rounded-lg bg-slate-900/60 border-slate-700 text-white mb-4">
      <Form layout="vertical" className="text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <Form.Item label="Clé" className="m-0">
          <Input value={form.key} onChange={e=>setForm(f=>({...f, key:e.target.value}))} placeholder="crm, dashboard..." />
        </Form.Item>
        <Form.Item label="Label" className="m-0">
          <Input value={form.label} onChange={e=>setForm(f=>({...f, label:e.target.value}))} placeholder="CRM, Tableau de bord..." />
        </Form.Item>
        <div className="md:col-span-2">
          <Form.Item label="Icône du module" className="m-0">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <IconPicker value={{ name: form.icon || 'AppstoreOutlined', color: form.iconColor || '#1890ff' }} onChange={(val)=> setForm(f=>({ ...f, icon: val?.name, iconColor: val?.color || f.iconColor }))} />
              </div>
              <div className="w-44">
                <div className="flex items-center gap-2 border rounded px-2 py-1 bg-slate-800 text-white">
                  <IconRenderer name={form.icon || 'AppstoreOutlined'} color={form.iconColor || '#1890ff'} />
                  <span className="text-xs text-slate-300 truncate">{form.icon || 'AppstoreOutlined'}</span>
                </div>
              </div>
              <div className="w-40">
                <ColorPicker
                  value={form.iconColor || '#1890ff'}
                  onChange={(_, hex)=> setForm(f=>({ ...f, iconColor: hex }))}
                  showText
                />
              </div>
            </div>
          </Form.Item>
        </div>
        <Form.Item label="Route" className="m-0">
          <Input value={form.route} onChange={e=>setForm(f=>({...f, route:e.target.value}))} placeholder="/crm" />
        </Form.Item>
        <Form.Item label="Feature" className="m-0">
          <Input value={form.feature} onChange={e=>setForm(f=>({...f, feature:e.target.value}))} placeholder="crm, dashboard..." />
        </Form.Item>
        <Form.Item label="Page" className="m-0">
          <Input value={form.page} onChange={e=>setForm(f=>({...f, page:e.target.value}))} placeholder="LeadsPage" />
        </Form.Item>
        <Form.Item label="Ordre" className="m-0">
          <InputNumber value={form.order} onChange={v=>setForm(f=>({...f, order:Number(v)||0}))} style={{width:'100%'}} />
        </Form.Item>
        <Form.Item className="m-0">
          <div className="flex items-end">
            <label className="flex items-center gap-2 p-2 border rounded bg-slate-800 text-white h-full">
              <Switch checked={!!form.active} onChange={v=>setForm(f=>({...f, active:v}))} />
              <span>Actif (global)</span>
            </label>
          </div>
        </Form.Item>
      </div>
      {/* Champ caché pour categoryId si présent (pré-rempli depuis la catégorie) */}
      {form.categoryId && (
        <input type="hidden" value={form.categoryId} />
      )}
      <Form.Item label="Description" className="m-0">
        <Input.TextArea value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} rows={3} />
      </Form.Item>
      <div className="flex gap-2 mt-3">
        <Button 
          type="primary" 
          onClick={() => {
            // Validation côté client
            if (!form.key?.trim()) {
              alert('La clé du module est requise');
              return;
            }
            if (!form.label?.trim()) {
              alert('Le label du module est requis');
              return;
            }
            onSave(form);
          }}
        >
          Enregistrer
        </Button>
        <Button onClick={onCancel}>Annuler</Button>
      </div>
      </Form>
    </Card>
  );
}
