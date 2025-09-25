import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Table, Tag, Space, Button, Input, Dropdown, MenuProps, message, DatePicker, Select, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { ReloadOutlined, CheckCircleOutlined, StopOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

type LeadRow = {
  id: string;
  createdAt: string | Date;
  status: string;
  source?: string | null;
  data?: Record<string, unknown> | null;
  leadStatus?: { id: string; name: string } | null;
  assignedTo?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

export default function Devis1minuteAdminIntake() {
  const { api } = useAuthenticatedApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [q, setQ] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [statusId, setStatusId] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
  const [statusOptions, setStatusOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceOptions, setSourceOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<Array<{ value: string; label: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString();
      if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString();
      if (source) params.source = source;
      // API actuelle supporte status (texte) et statusId via PUT; pour filtre, on utilise status (nom) si connu
      // On récupère le nom du statut à partir de statusId sélectionné
      if (statusId) {
        const s = statusOptions.find((x) => x.id === statusId);
        if (s) params.status = s.name;
      }
      if (assignedToId) params.assignedTo = assignedToId;
  if (q) params.q = q;
  // Par défaut, Intake D1M n'affiche que les leads d'origine D1M
  params.origin = 'd1m';

      const res = await api.get<{ success: boolean; data: LeadRow[] }>('/api/leads', { params });
      setRows(res?.data || []);
    } catch (e) {
      console.error(e);
      message.error("Impossible de charger les leads");
    } finally {
      setLoading(false);
    }
  }, [api, dateRange, source, statusId, assignedToId, q, statusOptions]);

  useEffect(() => { load(); }, [load]);

  // Charger options: statuts, sources (campagnes), assignés
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statuses, campaigns, users] = await Promise.all([
          api.get<{ success: boolean; data: Array<{ id: string; name: string }> }>(
            '/api/lead-statuses'
          ),
          api.get<{ success: boolean; data: Array<{ id: string; name: string }> }>(
            '/api/lead-generation/campaigns'
          ),
          api.get<{ success: boolean; data: Array<{ id: string; firstName?: string | null; lastName?: string | null; email?: string | null }> }>(
            '/api/users'
          )
        ]);
        if (!mounted) return;
        setStatusOptions(statuses?.data || []);
        setSourceOptions((campaigns?.data || []).map((c) => ({ value: c.name, label: c.name })));
        setAssigneeOptions((users?.data || []).map((u) => ({
          value: u.id,
          label: [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.email || 'Utilisateur')
        })));
      } catch (err) {
        console.error(err);
        // Options non bloquantes
      }
    })();
    return () => { mounted = false; };
  }, [api]);

  const filtered: LeadRow[] = useMemo(() => {
    // Les résultats sont côté serveur; on garde un léger fallback sur q si besoin
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r: LeadRow) => {
      const d = r.data || {};
      const dd = d as Record<string, unknown>;
      const hay = [r.source, r.status, r.leadStatus?.name, dd.firstName, dd.lastName, dd.email, dd.phone, dd.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const applyStatus = useCallback(async (ids: string[], status: string) => {
    try {
      await Promise.all(ids.map((id) => api.put(`/api/leads/${id}`, { status })));
      message.success('Statut mis à jour');
      setSelectedRowKeys([]);
      load();
    } catch (e) {
      console.error(e);
      message.error("Échec de la mise à jour du statut");
    }
  }, [api, load]);

  const batchMenu: MenuProps['items'] = [
    { key: 'contacted', icon: <CheckCircleOutlined />, label: 'Qualifier (Contacté)', onClick: () => applyStatus(selectedRowKeys as string[], 'contacted') },
    { key: 'lost', icon: <StopOutlined />, label: 'Rejeter (Perdu)', onClick: () => applyStatus(selectedRowKeys as string[], 'lost') },
    { key: 'completed', icon: <DeleteOutlined />, label: 'Clôturer (Terminé)', onClick: () => applyStatus(selectedRowKeys as string[], 'completed') },
  ];

  const columns: ColumnsType<LeadRow> = [
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => new Date(val).toLocaleString()
    },
    {
      title: 'Prospect',
      key: 'prospect',
      render: (_: unknown, rec: LeadRow) => {
        const d = rec.data || {};
        const dd = d as Record<string, unknown>;
        const name = (dd.name as string) || [dd.firstName, dd.lastName].filter(Boolean).join(' ') || (dd.email as string) || (dd.phone as string) || rec.id.slice(0, 8);
        return (
          <div>
            <div className="font-medium">{name || 'Inconnu'}</div>
            <div className="text-xs text-gray-500">{[dd.email, dd.phone].filter(Boolean).join(' · ') as string}</div>
          </div>
        );
      }
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => <Tag color="blue">{v || 'direct'}</Tag>
    },
    {
      title: 'Statut',
      key: 'status',
      render: (_: unknown, rec: LeadRow) => <Tag color={rec.leadStatus?.name ? 'geekblue' : 'default'}>{rec.leadStatus?.name || rec.status}</Tag>
    },
    {
      title: 'Assigné à',
      key: 'assignedTo',
      render: (_: unknown, rec: LeadRow) => rec.assignedTo?.email || rec.assignedTo?.firstName || '—'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, rec: LeadRow) => (
        <Space>
          <Button size="small" icon={<CheckCircleOutlined />} onClick={() => applyStatus([rec.id], 'contacted')}>Qualifier</Button>
          <Button size="small" icon={<StopOutlined />} onClick={() => applyStatus([rec.id], 'lost')}>Rejeter</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => applyStatus([rec.id], 'completed')}>Clôturer</Button>
          <Button size="small" onClick={() => navigate(`/leads/${rec.id}`)}>Ouvrir dans CRM</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Typography>
        <Title level={3}>Centre de tri des leads</Title>
        <Paragraph type="secondary">
          Tous les leads entrants sont centralisés ici avant orientation automatique via les règles de Dispatch.
        </Paragraph>
      </Typography>
      <Card className="mb-3" size="small">
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker.RangePicker
            onChange={(v) => setDateRange((v as [Dayjs | null, Dayjs | null]) ?? null)}
            value={dateRange ?? undefined}
            allowEmpty={[true, true]}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 180 }}
            value={statusId}
            onChange={setStatusId}
            options={statusOptions.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Source"
            style={{ width: 200 }}
            value={source}
            onChange={setSource}
            options={sourceOptions}
            filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
          />
          <Select
            allowClear
            showSearch
            placeholder="Assigné à"
            style={{ width: 220 }}
            value={assignedToId}
            onChange={setAssignedToId}
            options={assigneeOptions}
            filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
          />
          <Input allowClear prefix={<FilterOutlined />} placeholder="Recherche texte" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
          <Button icon={<ReloadOutlined />} onClick={load}>Appliquer</Button>
          <Button onClick={() => { setDateRange(null); setStatusId(undefined); setSource(undefined); setAssignedToId(undefined); setQ(''); }}>Réinitialiser</Button>
          <Divider type="vertical" />
          <Dropdown menu={{ items: batchMenu }} disabled={!selectedRowKeys.length}>
            <Button type="primary">Actions groupées ({selectedRowKeys.length})</Button>
          </Dropdown>
        </div>
      </Card>
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          columns={columns}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
