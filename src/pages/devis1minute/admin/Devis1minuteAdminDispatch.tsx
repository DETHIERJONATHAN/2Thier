import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, Switch, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExperimentOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function Devis1minuteAdminDispatch() {
  type Rule = { id: string; createdAt: string | Date; event: string; action: string; params?: Record<string, unknown> | null; active: boolean };
  const { api } = useAuthenticatedApi();
  const [rows, setRows] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
  const res = await api.get<{ success: boolean; data: Rule[] }>('/api/dispatch/rules');
      setRows(res?.data || []);
    } catch (e) {
      console.error(e);
      message.error("Impossible de charger les règles");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const onAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ active: true, event: 'lead_received', action: 'send_to_crm', params: '{"conditions": {}}' });
    setOpen(true);
  };
  const onEdit = useCallback((rec: Rule) => {
    setEditing(rec);
    form.setFieldsValue({ ...rec, params: JSON.stringify(rec.params ?? {}, null, 2) });
    setOpen(true);
  }, [form]);
  const onDelete = useCallback(async (rec: Rule) => {
    Modal.confirm({
      title: 'Supprimer cette règle ?',
      onOk: async () => {
        try { await api.delete(`/api/dispatch/rules/${rec.id}`); message.success('Règle supprimée'); load(); } catch { message.error('Suppression échouée'); }
      }
    });
  }, [api, load]);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, params: JSON.parse(values.params || '{}') };
      if (editing) {
        await api.put(`/api/dispatch/rules/${editing.id}`, payload);
        message.success('Règle mise à jour');
      } else {
        await api.post('/api/dispatch/rules', payload);
        message.success('Règle créée');
      }
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
      message.error('Enregistrement échoué');
    }
  };

  const simulate = useCallback(async () => {
    try {
      const exampleLead = { source: 'landing', sector: 'solar', postalCode: '1000' };
      const res = await api.post('/api/dispatch/simulate', { lead: exampleLead });
      Modal.info({ title: 'Résultats de la simulation', content: <pre className="whitespace-pre-wrap">{JSON.stringify(res?.data, null, 2)}</pre>, width: 600 });
    } catch (e) {
      console.error(e);
      message.error('Simulation échouée');
    }
  }, [api]);

  const columns: ColumnsType<Rule> = useMemo(() => ([
    { title: 'Créé le', dataIndex: 'createdAt', width: 160, render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Événement', dataIndex: 'event', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Action', dataIndex: 'action', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'Actif', dataIndex: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Oui' : 'Non'}</Tag> },
    { title: 'Paramètres', dataIndex: 'params', ellipsis: true, render: (p: Rule['params']) => <span className="text-xs text-gray-500">{p ? JSON.stringify(p) : '—'}</span> },
    { title: 'Actions', key: 'actions', render: (_: unknown, rec: Rule) => (
      <Space>
        <Button icon={<ExperimentOutlined />} onClick={() => simulate()}>Simuler</Button>
        <Button icon={<EditOutlined />} onClick={() => onEdit(rec)}>Modifier</Button>
        <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(rec)}>Supprimer</Button>
      </Space>
    ) }
  ]), [onDelete, onEdit, simulate]);

  return (
    <div className="p-6">
      <Typography>
        <Title level={3}>Règles de dispatch</Title>
        <Paragraph type="secondary">Configurez les règles d'orientation des leads.</Paragraph>
      </Typography>
      <div className="mb-3 flex items-center gap-2">
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Ajouter une règle</Button>
        <Button icon={<ReloadOutlined />} onClick={load}>Rafraîchir</Button>
        <Button icon={<ExperimentOutlined />} onClick={() => simulate()}>Simulation globale</Button>
      </div>
      <Card>
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal open={open} onCancel={() => setOpen(false)} title={editing ? 'Modifier la règle' : 'Nouvelle règle'} onOk={onSubmit} okText="Enregistrer" width={720}>
        <Form layout="vertical" form={form}>
          <Form.Item name="event" label="Événement" rules={[{ required: true }]}>
            <Input placeholder="lead_received" />
          </Form.Item>
          <Form.Item name="action" label="Action" rules={[{ required: true }]}>
            <Input placeholder="send_to_crm | send_to_partner | webhook" />
          </Form.Item>
          <Form.Item name="params" label="Paramètres (JSON)">
            <Input.TextArea rows={8} placeholder='{"conditions": {"source": "landing"}}' />
          </Form.Item>
          <Form.Item name="active" label="Actif" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
