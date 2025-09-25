import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, Switch, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function Devis1minuteAdminSite() {
  type Landing = {
    id: string; title: string; slug: string; description?: string; status: string;
    views: number; conversions: number; conversionRate: number; createdAt: string | Date; updatedAt: string | Date;
  };
  const { api } = useAuthenticatedApi();
  const [rows, setRows] = useState<Landing[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Landing | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Landing[] }>("/api/landing-pages");
      setRows(res?.data || []);
    } catch (e) {
      console.error(e);
      message.error("Impossible de charger les landings");
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = useCallback((rec: Landing) => {
    setEditing(rec);
    form.resetFields();
    // Charger les détails publics (seo/tracking/content)
    (async () => {
      try {
        const detail = await api.get<{ success: boolean; data: unknown }>(`/api/landing-pages/public/${rec.slug}`);
        const d = (detail?.data as Record<string, unknown>) || {};
        form.setFieldsValue({
          title: (d as any).title || rec.title, // eslint-disable-line @typescript-eslint/no-explicit-any
          description: rec.description,
          seoTitle: (d as any).seo?.title, // eslint-disable-line @typescript-eslint/no-explicit-any
          seoDescription: (d as any).seo?.description, // eslint-disable-line @typescript-eslint/no-explicit-any
          seoKeywords: Array.isArray((d as any).seo?.keywords) ? (d as any).seo.keywords.join(',') : '', // eslint-disable-line @typescript-eslint/no-explicit-any
          trackingEnable: !!(d as any).tracking?.enable, // eslint-disable-line @typescript-eslint/no-explicit-any
          googleTagId: (d as any).tracking?.googleTagId, // eslint-disable-line @typescript-eslint/no-explicit-any
          metaPixelId: (d as any).tracking?.metaPixelId, // eslint-disable-line @typescript-eslint/no-explicit-any
          blocksJson: (d as any).content?.blocks ? JSON.stringify((d as any).content.blocks, null, 2) : '' // eslint-disable-line @typescript-eslint/no-explicit-any
        });
      } catch {
        // valeurs par défaut
        form.setFieldsValue({ title: rec.title, description: rec.description });
      } finally {
        setOpen(true);
      }
    })();
  }, [api, form]);
  const onDelete = useCallback((rec: Landing) => {
    Modal.confirm({ title: 'Supprimer cette page ?', onOk: async () => { try { await api.delete(`/api/landing-pages/${rec.id}`); message.success('Supprimé'); load(); } catch { message.error('Suppression échouée'); } } });
  }, [api, load]);
  const onPublish = useCallback(async (rec: Landing, publish: boolean) => {
    try { await api.patch(`/api/landing-pages/${rec.id}/publish`, { publish }); message.success(publish ? 'Publiée' : 'Dépubliée'); load(); } catch { message.error('Échec publication'); }
  }, [api, load]);
  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      let blocks: unknown = undefined;
      if (values.blocksJson) {
        try { blocks = JSON.parse(values.blocksJson); } catch { message.warning('Blocs JSON invalide: ignoré'); }
      }
      const content = { title: values.title, description: values.description, seo: { title: values.seoTitle, description: values.seoDescription, keywords: (values.seoKeywords || '').split(',').map((s: string) => s.trim()).filter(Boolean) }, ...(blocks ? { blocks } : {}) };
      const settings = { tracking: { enable: !!values.trackingEnable, googleTagId: values.googleTagId || undefined, metaPixelId: values.metaPixelId || undefined } };
      if (editing) {
        await api.put(`/api/landing-pages/${editing.id}`, { title: values.title, description: values.description, content, settings });
        message.success('Mise à jour');
      } else {
        await api.post('/api/landing-pages', { title: values.title, description: values.description, status: 'DRAFT', content, settings });
        message.success('Créée');
      }
      setOpen(false); load();
    } catch (e) { console.error(e); message.error('Enregistrement échoué'); }
  };

  const columns: ColumnsType<Landing> = useMemo(() => ([
    { title: 'Titre', dataIndex: 'title' },
    { title: 'Statut', dataIndex: 'status', render: (v: string) => <Tag color={v === 'PUBLISHED' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Vues', dataIndex: 'views' },
    { title: 'Conv.', dataIndex: 'conversions' },
    { title: 'Taux', dataIndex: 'conversionRate', render: (v: number) => `${v}%` },
    { title: 'MAJ', dataIndex: 'updatedAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Actions', key: 'actions', render: (_: unknown, rec: Landing) => (
      <Space>
        <Button icon={<ShareAltOutlined />} onClick={() => window.open(`/api/landing-pages/public/${rec.slug}`, '_blank')}>Voir</Button>
        <Button icon={<EditOutlined />} onClick={() => onEdit(rec)}>Modifier</Button>
        <Button onClick={() => onPublish(rec, rec.status !== 'PUBLISHED')}>{rec.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}</Button>
        <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(rec)}>Supprimer</Button>
      </Space>
    ) }
  ]), [onDelete, onEdit, onPublish]);

  return (
    <div className="p-6">
      <Typography>
        <Title level={3}>Contenus du site</Title>
        <Paragraph type="secondary">Pages publiques Devis1Minute (landings).</Paragraph>
      </Typography>
      <div className="mb-3 flex items-center gap-2">
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Nouvelle page</Button>
        <Button icon={<ReloadOutlined />} onClick={load}>Rafraîchir</Button>
      </div>
      <Card>
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal open={open} onCancel={() => setOpen(false)} onOk={onSubmit} title={editing ? 'Modifier la page' : 'Nouvelle page'} okText="Enregistrer">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
            <Input placeholder="Titre de la landing" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Card size="small" className="mb-4" title="SEO">
            <Form.Item name="seoTitle" label="Titre SEO">
              <Input placeholder="Balise <title>" />
            </Form.Item>
            <Form.Item name="seoDescription" label="Meta description">
              <Input placeholder="Meta description" />
            </Form.Item>
            <Form.Item name="seoKeywords" label="Mots-clés (séparés par des virgules)">
              <Input placeholder="ex: isolation, rénovation, devis" />
            </Form.Item>
          </Card>
          <Card size="small" title="Tracking & Pixels">
            <Form.Item name="trackingEnable" valuePropName="checked">
              <Switch /> Activer les pixels sur cette page
            </Form.Item>
            <Form.Item name="googleTagId" label="Google Tag ID (G-XXXX)">
              <Input placeholder="G-XXXXXXX" />
            </Form.Item>
            <Form.Item name="metaPixelId" label="Meta Pixel ID">
              <Input placeholder="1234567890" />
            </Form.Item>
          </Card>
          <Card size="small" title="Blocs (JSON)">
            <Form.Item name="blocksJson" tooltip="Saisir un tableau JSON de blocs [{ type, props }]">
              <Input.TextArea rows={6} placeholder='Ex: [{"type":"hero","props":{"title":"Bienvenue","subtitle":"Sous-titre"}}]' />
            </Form.Item>
          </Card>
          <Form.Item label="Publication" tooltip="La publication se fait après création via le bouton Publier">
            <Switch checked={false} disabled />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
