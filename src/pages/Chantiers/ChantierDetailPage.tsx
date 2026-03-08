import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card, Tabs, Descriptions, Tag, Button, Spin, Avatar, Input, message,
  Select, Empty, Typography, Space, Divider, Tooltip, Alert, DatePicker
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DownloadOutlined,
  LinkOutlined,
  PartitionOutlined,
  DollarOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useChantierStatuses } from '../../hooks/useChantierStatuses';
import { useAuth } from '../../auth/useAuth';
import { renderProductIcon } from '../../components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/ProductFilterPanel';
import type { Chantier } from '../../types/chantier';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');
import ChantierInvoicesTab from './ChantierInvoicesTab';
import ChantierEventsTab from './ChantierEventsTab';
import ChantierHistoryTab from './ChantierHistoryTab';
import ChantierPointageTab from './ChantierPointageTab';

const { TextArea } = Input;
const { Text, Title } = Typography;

const ChantierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'info';
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { statuses: chantierStatuses } = useChantierStatuses();
  const { isSuperAdmin, userRole } = useAuth();
  const isAdminOrAbove = isSuperAdmin || userRole === 'admin';
  const canSeeCompta = isAdminOrAbove || userRole === 'comptable';

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<{
    siteAddress?: string;
    notes?: string;
    amount?: number | null;
    statusId?: string;
    customLabel?: string;
    plannedDate?: string | null;
    receptionDate?: string | null;
    deliveryDate?: string | null;
    completedDate?: string | null;
  }>({});

  // Mini-agenda : prochains événements
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const fetchUpcomingEvents = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/api/chantier-workflow/chantiers/${id}/events`) as any;
      const all = res.data || res || [];
      const now = new Date();
      const upcoming = all
        .filter((e: any) => new Date(e.startDate) >= now && e.status !== 'CANCELLED')
        .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3);
      setUpcomingEvents(upcoming);
    } catch { /* silencieux */ }
  }, [api, id]);

  const fetchChantier = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/chantiers/${id}`) as { success: boolean; data: Chantier };
      setChantier(response.data);
    } catch (err) {
      console.error('[ChantierDetail] Erreur:', err);
      message.error('Erreur lors du chargement du chantier');
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    fetchChantier();
    fetchUpcomingEvents();
  }, [fetchChantier, fetchUpcomingEvents]);

  const startEditing = useCallback(() => {
    if (!chantier) return;
    setEditForm({
      siteAddress: chantier.siteAddress || '',
      notes: chantier.notes || '',
      amount: chantier.amount,
      statusId: chantier.statusId || undefined,
      customLabel: chantier.customLabel || '',
      plannedDate: chantier.plannedDate || null,
      receptionDate: chantier.receptionDate || null,
      deliveryDate: chantier.deliveryDate || null,
      completedDate: chantier.completedDate || null,
    });
    setEditing(true);
  }, [chantier]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditForm({});
  }, []);

  const saveChanges = useCallback(async () => {
    if (!id) return;
    try {
      setSaving(true);
      // Séparer le changement de statut du reste — le statut passe par le workflow
      const { statusId: newStatusId, ...otherFields } = editForm;

      // 1) Sauvegarder les champs classiques (sans statusId)
      await api.put(`/api/chantiers/${id}`, otherFields);

      // 2) Si le statut a changé, passer par l'API workflow dédiée
      if (newStatusId && chantier && newStatusId !== chantier.statusId) {
        try {
          await api.put(`/api/chantiers/${id}/status`, { statusId: newStatusId });
          message.success('Chantier et statut mis à jour');
        } catch (statusErr: any) {
          const errMsg = statusErr?.message || statusErr?.data?.message || 'Transition non autorisée';
          message.warning(`Chantier sauvegardé, mais le statut n'a pas changé : ${errMsg}`);
        }
      } else {
        message.success('Chantier mis à jour');
      }

      setEditing(false);
      fetchChantier();
    } catch (err) {
      console.error('[ChantierDetail] Erreur sauvegarde:', err);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [api, id, editForm, fetchChantier, chantier]);

  // Map des statuts pour le composant historique (doit être avant les early returns)
  const statusesMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    for (const s of (chantierStatuses || [])) {
      map[s.id] = { name: s.name, color: s.color };
    }
    return map;
  }, [chantierStatuses]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="p-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/chantiers')} className="mb-4">
          Retour
        </Button>
        <Empty description="Chantier non trouvé" />
      </div>
    );
  }

  const clientName = chantier.clientName
    || (chantier.Lead ? `${chantier.Lead.firstName || ''} ${chantier.Lead.lastName || ''}`.trim() : '')
    || 'Client inconnu';

  const responsableName = chantier.Responsable
    ? `${chantier.Responsable.firstName || ''} ${chantier.Responsable.lastName || ''}`.trim()
    : null;

  const commercialName = chantier.Commercial
    ? `${chantier.Commercial.firstName || ''} ${chantier.Commercial.lastName || ''}`.trim()
    : null;

  const statusColor = chantier.ChantierStatus?.color || '#1890ff';
  const statusName = chantier.ChantierStatus?.name || 'Non défini';

  // URL TBL avec le devisId lié
  const tblUrl = chantier.leadId
    ? `/tbl/${chantier.leadId}${chantier.submissionId ? `?devisId=${chantier.submissionId}` : ''}`
    : null;

  // Données du devis lié (GeneratedDocument + dataSnapshot)
  const genDoc = chantier.GeneratedDocument;
  const snapshot = (genDoc?.dataSnapshot as any) || {};
  const quoteData = snapshot?.quote || {};
  const leadSnapshotData = snapshot?.lead || {};

  // Montant avec fallback : chantier.amount > devis TTC > paymentAmount
  const displayAmount = chantier.amount
    || (quoteData.totalTTC ? Number(quoteData.totalTTC) : null)
    || (genDoc?.paymentAmount ? Number(genDoc.paymentAmount) : null)
    || null;

  // Adresse : priorité chantier > snapshot lead > lead.data
  const displayAddress = chantier.siteAddress
    || leadSnapshotData.address
    || (() => {
      const ld = chantier.Lead?.data || {} as any;
      const parts = [];
      const street = ld.street || ld.address || '';
      if (street) parts.push(street + (ld.number ? ' ' + ld.number : ''));
      if (ld.postalCode || ld.city || ld.ville) parts.push([ld.postalCode || ld.zipCode, ld.city || ld.ville].filter(Boolean).join(' '));
      return parts.length > 0 ? parts.join(', ') : null;
    })()
    || null;

  return (
    <div style={{ padding: '16px 24px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/chantiers')}
            type="text"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {chantier.productIcon && <span style={{ fontSize: '24px' }}>{renderProductIcon(chantier.productIcon, 24)}</span>}
              <Title level={3} style={{ margin: 0 }}>
                {chantier.productLabel}
                {chantier.customLabel && <Text type="secondary" style={{ fontSize: '16px', marginLeft: '8px' }}>({chantier.customLabel})</Text>}
              </Title>
              <Tag color={statusColor} style={{ fontSize: '13px', padding: '2px 12px' }}>
                {statusName}
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              <UserOutlined style={{ marginRight: '6px' }} />
              {clientName}
              {displayAddress && (
                <>
                  <span style={{ margin: '0 10px' }}>·</span>
                  <EnvironmentOutlined style={{ marginRight: '4px' }} />
                  {displayAddress}
                </>
              )}
            </Text>
          </div>
        </div>

        <Space>
          {chantier.leadId && (
            <Tooltip title="Ouvrir le formulaire TBL">
              <Button
                icon={<PartitionOutlined />}
                onClick={() => tblUrl && navigate(tblUrl)}
                style={{ borderColor: '#722ed1', color: '#722ed1' }}
              >
                Ouvrir TBL
              </Button>
            </Tooltip>
          )}
          {isAdminOrAbove && !editing ? (
            <Button icon={<EditOutlined />} onClick={startEditing}>
              Modifier
            </Button>
          ) : isAdminOrAbove && editing ? (
            <>
              <Button icon={<CloseOutlined />} onClick={cancelEditing}>
                Annuler
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveChanges} loading={saving}>
                Sauvegarder
              </Button>
            </>
          ) : null}
        </Space>
      </div>

      {/* ── Bandeau validation admin ── */}
      {!chantier.isValidated && isAdminOrAbove && (
        <Alert
          type="warning"
          banner
          showIcon
          icon={<SafetyCertificateOutlined />}
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>
                ⚠️ Ce chantier n'est pas encore validé — il n'apparaît pas dans le pipeline actif
              </span>
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                size="small"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={async () => {
                  try {
                    await api.post(`/api/chantier-workflow/chantiers/${chantier.id}/validate`, {});
                    message.success('Chantier validé !');
                    fetchChantier();
                  } catch (err: any) {
                    message.error(err?.message || 'Erreur lors de la validation');
                  }
                }}
              >
                Valider le chantier
              </Button>
            </div>
          }
          style={{ marginBottom: 16, borderLeft: '4px solid #faad14' }}
        />
      )}
      {chantier.isValidated && (
        <Alert
          type="success"
          banner
          showIcon
          icon={<SafetyCertificateOutlined />}
          message={<span style={{ fontWeight: 500 }}>✅ Chantier validé</span>}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Content Tabs */}
      <Tabs defaultActiveKey={initialTab} type="card" items={[
        { key: 'info', label: <span><FileTextOutlined /> Informations</span>, children: (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '16px 0' }}>
            {/* Colonne gauche - Détails chantier */}
            <Card title="Détails du chantier" size="small">
              <Descriptions column={1} styles={{ label: { fontWeight: 600, width: '140px' } }}>
                <Descriptions.Item label="Produit">
                  <Tag color={chantier.productColor || '#722ed1'}>
                    {renderProductIcon(chantier.productIcon, 14)} {chantier.productLabel}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Label personnalisé">
                  {editing ? (
                    <Input
                      value={editForm.customLabel}
                      onChange={e => setEditForm(f => ({ ...f, customLabel: e.target.value }))}
                      placeholder="Ex: Bâtiment A"
                      size="small"
                    />
                  ) : (
                    chantier.customLabel || <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  {editing ? (
                    <Select
                      value={editForm.statusId}
                      onChange={v => setEditForm(f => ({ ...f, statusId: v }))}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {chantierStatuses.map(s => (
                        <Select.Option key={s.id} value={s.id}>
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: s.color,
                            marginRight: '6px',
                          }} />
                          {s.name}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <Tag color={statusColor}>{statusName}</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Montant">
                  {editing ? (
                    <Input
                      type="number"
                      value={editForm.amount ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, amount: e.target.value ? Number(e.target.value) : null }))}
                      suffix="€"
                      size="small"
                    />
                  ) : (
                    displayAmount
                      ? <Text strong style={{ color: '#52c41a' }}>{displayAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text>
                      : <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Adresse chantier">
                  {editing ? (
                    <Input
                      value={editForm.siteAddress}
                      onChange={e => setEditForm(f => ({ ...f, siteAddress: e.target.value }))}
                      placeholder="Adresse du chantier"
                      size="small"
                    />
                  ) : (
                    displayAddress
                      ? <><EnvironmentOutlined style={{ marginRight: '4px' }} />{displayAddress}</>
                      : <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Date signature">
                  {chantier.signedAt
                    ? <><CalendarOutlined style={{ marginRight: '4px' }} />{new Date(chantier.signedAt).toLocaleDateString('fr-FR')}</>
                    : <Text type="secondary">—</Text>
                  }
                </Descriptions.Item>
                <Descriptions.Item label="📅 Date chantier prévue">
                  {editing ? (
                    <DatePicker
                      value={editForm.plannedDate ? dayjs(editForm.plannedDate) : null}
                      onChange={d => setEditForm(f => ({ ...f, plannedDate: d ? d.toISOString() : null }))}
                      format="DD/MM/YYYY"
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Sélectionner"
                    />
                  ) : (
                    chantier.plannedDate
                      ? <><CalendarOutlined style={{ marginRight: '4px', color: '#1677ff' }} />{dayjs(chantier.plannedDate).format('DD/MM/YYYY')}</>
                      : <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="📦 Date livraison matériel">
                  {editing ? (
                    <DatePicker
                      value={editForm.deliveryDate ? dayjs(editForm.deliveryDate) : null}
                      onChange={d => setEditForm(f => ({ ...f, deliveryDate: d ? d.toISOString() : null }))}
                      format="DD/MM/YYYY"
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Sélectionner"
                    />
                  ) : (
                    chantier.deliveryDate
                      ? <><CalendarOutlined style={{ marginRight: '4px', color: '#722ed1' }} />{dayjs(chantier.deliveryDate).format('DD/MM/YYYY')}</>
                      : <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="✅ Date réception">
                  {editing ? (
                    <DatePicker
                      value={editForm.receptionDate ? dayjs(editForm.receptionDate) : null}
                      onChange={d => setEditForm(f => ({ ...f, receptionDate: d ? d.toISOString() : null }))}
                      format="DD/MM/YYYY"
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Sélectionner"
                    />
                  ) : (
                    chantier.receptionDate
                      ? <><CalendarOutlined style={{ marginRight: '4px', color: '#52c41a' }} />{dayjs(chantier.receptionDate).format('DD/MM/YYYY')}</>
                      : <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="🏁 Date fin de chantier">
                  {editing ? (
                    <DatePicker
                      value={editForm.completedDate ? dayjs(editForm.completedDate) : null}
                      onChange={d => setEditForm(f => ({ ...f, completedDate: d ? d.toISOString() : null }))}
                      format="DD/MM/YYYY"
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Sélectionner"
                    />
                  ) : (
                    chantier.completedDate
                      ? <><CalendarOutlined style={{ marginRight: '4px', color: '#fa8c16' }} />{dayjs(chantier.completedDate).format('DD/MM/YYYY')}</>
                      : <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Créé le">
                  {new Date(chantier.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Colonne droite - Équipe & Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Client */}
              <Card title="Client" size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                    {clientName.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: '15px' }}>{clientName}</Text>
                    {chantier.Lead?.company && (
                      <div><Text type="secondary">{chantier.Lead.company}</Text></div>
                    )}
                  </div>
                </div>
                {chantier.Lead?.email && (
                  <div style={{ marginBottom: '4px' }}>
                    <MailOutlined style={{ marginRight: '6px', color: '#8c8c8c' }} />
                    <a href={`mailto:${chantier.Lead.email}`}>{chantier.Lead.email}</a>
                  </div>
                )}
                {chantier.Lead?.phone && (
                  <div style={{ marginBottom: '4px' }}>
                    <PhoneOutlined style={{ marginRight: '6px', color: '#8c8c8c' }} />
                    <a href={`tel:${chantier.Lead.phone}`}>{chantier.Lead.phone}</a>
                  </div>
                )}
                {chantier.leadId && (
                  <div style={{ marginTop: '8px' }}>
                    <Button
                      type="link"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/leads/${chantier.leadId}`)}
                    >
                      Voir le lead
                    </Button>
                  </div>
                )}
              </Card>

              {/* Devis lié (GeneratedDocument) */}
              {genDoc && (
                <Card 
                  title={<Space><LinkOutlined /> Devis lié</Space>} 
                  size="small"
                  style={{ borderColor: '#722ed1', borderWidth: 1 }}
                >
                  <Descriptions column={1} styles={{ label: { fontWeight: 600, width: '120px' } }} size="small">
                    {genDoc.documentNumber && (
                      <Descriptions.Item label="N° devis">
                        <Tag color="purple">{genDoc.documentNumber}</Tag>
                      </Descriptions.Item>
                    )}
                    {genDoc.title && (
                      <Descriptions.Item label="Titre">{genDoc.title}</Descriptions.Item>
                    )}
                    {(quoteData.totalHT || quoteData.totalTTC) && (
                      <>
                        {quoteData.totalHT ? (
                          <Descriptions.Item label="Total HT">
                            <Text>{Number(quoteData.totalHT).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text>
                          </Descriptions.Item>
                        ) : null}
                        {quoteData.totalTVA ? (
                          <Descriptions.Item label="TVA">
                            <Text>{Number(quoteData.totalTVA).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text>
                          </Descriptions.Item>
                        ) : null}
                        {quoteData.totalTTC ? (
                          <Descriptions.Item label="Total TTC">
                            <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                              {Number(quoteData.totalTTC).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €
                            </Text>
                          </Descriptions.Item>
                        ) : null}
                      </>
                    )}
                    {genDoc.status && (
                      <Descriptions.Item label="Statut">
                        <Tag color={genDoc.status === 'SIGNED' ? 'green' : genDoc.status === 'SENT' ? 'blue' : 'default'}>
                          {genDoc.status === 'SIGNED' ? 'Signé' : genDoc.status === 'SENT' ? 'Envoyé' : genDoc.status}
                        </Tag>
                      </Descriptions.Item>
                    )}
                    {genDoc.createdAt && (
                      <Descriptions.Item label="Créé le">
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {new Date(genDoc.createdAt).toLocaleDateString('fr-BE')}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                  {genDoc.pdfUrl && (
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(genDoc.pdfUrl!, '_blank')}
                      style={{ marginTop: 4, padding: 0 }}
                    >
                      Voir le PDF du devis
                    </Button>
                  )}
                </Card>
              )}

              {/* Équipe */}
              <Card title="Équipe" size="small">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Responsable chantier</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }}>
                        {responsableName?.charAt(0) || '?'}
                      </Avatar>
                      <Text>{responsableName || <Text type="secondary">Non assigné</Text>}</Text>
                    </div>
                  </div>
                  <Divider style={{ margin: '4px 0' }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Commercial</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                        {commercialName?.charAt(0) || '?'}
                      </Avatar>
                      <Text>{commercialName || <Text type="secondary">Non assigné</Text>}</Text>
                    </div>
                  </div>

                  {/* Techniciens assignés */}
                  {chantier.ChantierAssignments && chantier.ChantierAssignments.length > 0 && (
                    <>
                      <Divider style={{ margin: '4px 0' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Techniciens assignés</Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          {chantier.ChantierAssignments.map((a: any) => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: 6, background: '#fafafa' }}>
                              <Avatar
                                size={28}
                                style={{
                                  backgroundColor: a.Technician?.color || '#722ed1',
                                  fontSize: 11,
                                  border: a.Technician?.type === 'SUBCONTRACTOR' ? '2px dashed #8c8c8c' : undefined,
                                }}
                              >
                                {(a.Technician?.firstName?.[0] || '') + (a.Technician?.lastName?.[0] || '')}
                              </Avatar>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Text style={{ fontSize: 13 }}>
                                    {a.Technician?.firstName || ''} {a.Technician?.lastName || ''}
                                  </Text>
                                  {a.role === 'CHEF_EQUIPE' && <Tag color="orange" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>Chef</Tag>}
                                  {a.Technician?.type === 'SUBCONTRACTOR' && <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>🏢 ST</Tag>}
                                </div>
                                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                                  {a.Technician?.specialties?.map((s: string) => (
                                    <Tag key={s} style={{ fontSize: 9, lineHeight: '14px', padding: '0 3px', margin: 0 }} color={s === 'all' ? 'blue' : 'green'}>
                                      {s === 'all' ? 'ALL' : s === 'pc' ? 'PV' : s}
                                    </Tag>
                                  ))}
                                  {a.Team && <Tag style={{ fontSize: 9, lineHeight: '14px', padding: '0 3px', margin: 0 }} color={a.Team.color}>👥 {a.Team.name}</Tag>}
                                </div>
                              </div>
                              <Tooltip title="Retirer du chantier">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={async () => {
                                    try {
                                      await api.delete(`/api/teams/assignments/${a.id}`);
                                      message.success('Technicien retiré');
                                      fetchChantier();
                                    } catch (err: any) {
                                      message.error(err?.message || 'Erreur lors du retrait');
                                    }
                                  }}
                                  style={{ fontSize: 10 }}
                                />
                              </Tooltip>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {(!chantier.ChantierAssignments || chantier.ChantierAssignments.length === 0) && (
                    <>
                      <Divider style={{ margin: '4px 0' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Techniciens assignés</Text>
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>Glissez un technicien ou une équipe depuis le Kanban</Text>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Mini-agenda : prochains événements */}
              {upcomingEvents.length > 0 && (
                <Card
                  title={<span><ClockCircleOutlined /> Prochains événements</span>}
                  size="small"
                  extra={<Button type="link" size="small" onClick={() => {
                    // Scroll to events tab
                    const tabsEl = document.querySelector('.ant-tabs');
                    if (tabsEl) tabsEl.scrollIntoView({ behavior: 'smooth' });
                  }}>Voir tout</Button>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcomingEvents.map((evt: any) => (
                      <div key={evt.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', borderRadius: 6,
                        background: '#fafafa', border: '1px solid #f0f0f0',
                      }}>
                        <CalendarOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 12, fontWeight: 500, display: 'block' }} ellipsis>
                            {evt.type === 'VISITE' ? 'Visite' : evt.type === 'INSTALLATION' ? 'Installation' : evt.type === 'LIVRAISON' ? 'Livraison' : evt.type === 'REUNION' ? 'Réunion' : evt.type}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(evt.startDate).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
                            {evt.endDate && ` — ${new Date(evt.endDate).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}`}
                          </Text>
                        </div>
                        <Tag color={evt.status === 'COMPLETED' ? 'green' : evt.status === 'PROBLEM' ? 'red' : 'blue'} style={{ fontSize: 10, margin: 0 }}>
                          {evt.status === 'PLANNED' ? 'Planifié' : evt.status === 'COMPLETED' ? 'OK' : evt.status === 'PROBLEM' ? 'Problème' : evt.status}
                        </Tag>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Notes */}
          <Card title="Notes" size="small" style={{ marginTop: '16px' }}>
            {editing ? (
              <TextArea
                rows={4}
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes sur le chantier..."
              />
            ) : (
              chantier.notes
                ? <Text style={{ whiteSpace: 'pre-wrap' }}>{chantier.notes}</Text>
                : <Text type="secondary">Aucune note</Text>
            )}
          </Card>
        </>), },
        { key: 'document', label: <span><FileTextOutlined /> Document</span>, children: (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Document signé (uploadé) */}
            {chantier.documentUrl ? (
              <Card title="Document signé">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileTextOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                    <div>
                      <Text strong>{chantier.documentName || 'Document'}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {chantier.signedAt
                            ? `Signé le ${new Date(chantier.signedAt).toLocaleDateString('fr-FR')}`
                            : `Uploadé le ${new Date(chantier.createdAt).toLocaleDateString('fr-FR')}`
                          }
                        </Text>
                      </div>
                    </div>
                  </div>
                  <Tooltip title="Ouvrir le document signé">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(chantier.documentUrl!, '_blank')}
                    >
                      Ouvrir
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            ) : (
              <Card>
                <Empty
                  description="Aucun document signé uploadé"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </Card>
            )}

            {/* Devis PDF généré (lié) */}
            {genDoc?.pdfUrl && (
              <Card title={<Space><LinkOutlined /> Devis PDF généré</Space>} style={{ borderColor: '#722ed1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileTextOutlined style={{ fontSize: '32px', color: '#722ed1' }} />
                    <div>
                      <Text strong>{genDoc.documentNumber || genDoc.title || 'Devis TBL'}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {genDoc.createdAt ? `Généré le ${new Date(genDoc.createdAt).toLocaleDateString('fr-FR')}` : 'Document TBL'}
                        </Text>
                        {quoteData.totalTTC && (
                          <Text strong style={{ marginLeft: 12, color: '#52c41a' }}>
                            {Number(quoteData.totalTTC).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} € TTC
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                  <Tooltip title="Ouvrir le devis PDF">
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(genDoc.pdfUrl!, '_blank')}
                      style={{ borderColor: '#722ed1', color: '#722ed1' }}
                    >
                      Ouvrir le devis
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            )}
          </div>
        ), },
        { key: 'tbl', label: <span><PartitionOutlined /> TBL</span>, children: (
          <div style={{ padding: '24px 0' }}>
            <Card>
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <PartitionOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
                <Title level={4} style={{ marginBottom: 8 }}>Formulaire TBL</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                  Accédez au formulaire Tree Branch Leaf pour visualiser et compléter les données techniques de ce chantier.
                </Text>
                {chantier.leadId ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PartitionOutlined />}
                    onClick={() => tblUrl && navigate(tblUrl)}
                    style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                  >
                    Ouvrir le TBL
                  </Button>
                ) : (
                  <Text type="secondary">Aucun lead associé — TBL non disponible</Text>
                )}
              </div>
            </Card>

            {/* Infos résumées pour les techniciens */}
            <Card title="Résumé du chantier" size="small" style={{ marginTop: 16 }}>
              <Descriptions column={2} size="small" styles={{ label: { fontWeight: 600 } }}>
                <Descriptions.Item label="Produit">
                  <Tag color={chantier.productColor || '#722ed1'}>
                    {renderProductIcon(chantier.productIcon, 14)} {chantier.productLabel}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Client">{clientName}</Descriptions.Item>
                <Descriptions.Item label="Montant">
                  {displayAmount
                    ? <Text strong style={{ color: '#52c41a' }}>{displayAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text>
                    : <Text type="secondary">—</Text>
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Adresse">
                  {displayAddress || <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  <Tag color={statusColor}>{statusName}</Tag>
                </Descriptions.Item>
                {chantier.customLabel && (
                  <Descriptions.Item label="Label">{chantier.customLabel}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {chantier.TreeBranchLeafSubmission?.summary && (
              <Card title="Données de soumission TBL" size="small" style={{ marginTop: 16 }}>
                <pre style={{ fontSize: 12, maxHeight: 300, overflow: 'auto', background: '#fafafa', padding: 12, borderRadius: 6 }}>
                  {JSON.stringify(chantier.TreeBranchLeafSubmission.summary, null, 2)}
                </pre>
              </Card>
            )}
          </div>
        ), },
        { key: 'history', label: <span><HistoryOutlined /> Historique</span>, children: (
          <ChantierHistoryTab chantierId={chantier.id} statusesMap={statusesMap} />
        ), },
        ...(canSeeCompta ? [{ key: 'compta', label: <span><DollarOutlined /> Comptabilité</span>, children: (
          <ChantierInvoicesTab
            chantierId={chantier.id}
            chantierAmount={displayAmount}
            isValidated={chantier.isValidated}
            onChantierStatusChanged={fetchChantier}
            onValidationChanged={fetchChantier}
          />
        ), }] : []),
        { key: 'events', label: <span><CalendarOutlined /> Événements</span>, children: (
          <ChantierEventsTab
            chantierId={chantier.id}
            chantierAddress={displayAddress}
            chantierLabel={chantier.customLabel || chantier.clientName || chantier.productLabel || ''}
          />
        ), },
        { key: 'pointage', label: <span><ClockCircleOutlined /> Pointage</span>, children: (
          <ChantierPointageTab
            chantierId={chantier.id}
            chantierName={chantier.clientName || chantier.customLabel || chantier.productLabel}
            chantierLatitude={chantier.latitude}
            chantierLongitude={chantier.longitude}
            geoFenceRadius={chantier.geoFenceRadius}
          />
        ), },
      ]} />
    </div>
  );
};

export default ChantierDetailPage;
