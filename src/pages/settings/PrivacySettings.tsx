/**
 * PrivacySettings — RGPD self-service page
 * Allows users to:
 *  - Export all their personal data (Art. 20)
 *  - Delete their account (Art. 17 — Right to Erasure)
 */
import React, { useState } from 'react';
import { Button, Card, Typography, Alert, Modal, Input, message } from 'antd';
import { DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

const PrivacySettings: React.FC = () => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const [exporting, setExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.get('/api/rgpd/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zhiive-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(t('privacy.exportSuccess'));
    } catch {
      message.error(t('privacy.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE_MY_ACCOUNT') return;
    setDeleting(true);
    try {
      await api.post('/api/rgpd/delete-account', { confirmation: 'DELETE_MY_ACCOUNT' });
      message.success(t('privacy.deleteSuccess'));
      // Force logout after a short delay
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch {
      message.error(t('privacy.deleteError'));
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, padding: '16px 0' }}>
      <Title level={4}>{t('privacy.title')}</Title>
      <Paragraph type="secondary">{t('privacy.description')}</Paragraph>

      {/* Data Export */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><DownloadOutlined /> {t('privacy.exportTitle')}</Title>
        <Paragraph type="secondary">{t('privacy.exportDescription')}</Paragraph>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          {t('privacy.exportButton')}
        </Button>
      </Card>

      {/* Account Deletion */}
      <Card>
        <Title level={5} type="danger"><DeleteOutlined /> {t('privacy.deleteTitle')}</Title>
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={t('privacy.deleteWarning')}
          style={{ marginBottom: 16 }}
        />
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => setDeleteModalOpen(true)}
        >
          {t('privacy.deleteButton')}
        </Button>
      </Card>

      <Modal
        open={deleteModalOpen}
        title={t('privacy.deleteConfirmTitle')}
        onCancel={() => { setDeleteModalOpen(false); setDeleteConfirm(''); }}
        footer={[
          <Button key="cancel" onClick={() => { setDeleteModalOpen(false); setDeleteConfirm(''); }}>
            {t('common.cancel')}
          </Button>,
          <Button
            key="delete"
            danger
            type="primary"
            loading={deleting}
            disabled={deleteConfirm !== 'DELETE_MY_ACCOUNT'}
            onClick={handleDelete}
          >
            {t('privacy.deleteConfirmButton')}
          </Button>,
        ]}
      >
        <Paragraph>{t('privacy.deleteConfirmText')}</Paragraph>
        <Paragraph strong>{t('privacy.deleteConfirmInstruction')}</Paragraph>
        <Input
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          placeholder="DELETE_MY_ACCOUNT"
          status={deleteConfirm.length > 0 && deleteConfirm !== 'DELETE_MY_ACCOUNT' ? 'error' : undefined}
        />
      </Modal>
    </div>
  );
};

export default PrivacySettings;
