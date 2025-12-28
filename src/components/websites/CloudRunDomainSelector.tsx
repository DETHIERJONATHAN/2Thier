/**
 * Composant de sélection de domaine Cloud Run
 * Permet de lier un site CRM à un domaine mappé dans Google Cloud Run
 */

import React, { useState, useEffect } from 'react';
import { Select, Space, Tag, Button, Alert, Spin, message, Tooltip } from 'antd';
import { CloudOutlined, CheckCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface CloudRunDomain {
  domain: string;
  serviceName: string;
  region: string;
  status: string;
  mappedAt: string;
  description: string;
}

interface CloudRunDomainSelectorProps {
  value?: {
    cloudRunDomain?: string;
    cloudRunServiceName?: string;
    cloudRunRegion?: string;
  };
  onChange?: (value: any) => void;
  disabled?: boolean;
}

export const CloudRunDomainSelector: React.FC<CloudRunDomainSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [domains, setDomains] = useState<CloudRunDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { api } = useAuthenticatedApi();

  useEffect(() => {
    fetchCloudRunDomains();
  }, []);

  const fetchCloudRunDomains = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/cloud-run-domains');
      setDomains(response.domains || []);
    } catch (error) {
      console.error('❌ Erreur chargement domaines Cloud Run:', error);
      message.error('Erreur lors du chargement des domaines Cloud Run');
    } finally {
      setLoading(false);
    }
  };

  const handleDomainChange = (selectedDomain: string) => {
    const domain = domains.find(d => d.domain === selectedDomain);
    if (domain && onChange) {
      onChange({
        cloudRunDomain: domain.domain,
        cloudRunServiceName: domain.serviceName,
        cloudRunRegion: domain.region
      });
    }
  };

  const verifyDomain = async () => {
    if (!value?.cloudRunDomain) {
      message.warning('Veuillez d\'abord sélectionner un domaine');
      return;
    }

    setVerifying(true);
    try {
      const response = await api.post('/api/cloud-run-domains/verify', {
        domain: value.cloudRunDomain
      });

      if (response.verified) {
        message.success(`✅ Domaine ${value.cloudRunDomain} vérifié et accessible`);
      } else {
        message.warning(`⚠️ Le domaine ${value.cloudRunDomain} n'est pas accessible`);
      }
    } catch (error) {
      console.error('❌ Erreur vérification domaine:', error);
      message.error('Erreur lors de la vérification du domaine');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert
        message="Domaines Cloud Run"
        description={
          <div>
            <p>Liez ce site à un domaine déjà mappé dans Google Cloud Run.</p>
            <p>
              <a 
                href="https://console.cloud.google.com/run/domains?hl=fr&project=thiernew" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                🔗 Voir les domaines mappés dans Cloud Run
              </a>
            </p>
          </div>
        }
        type="info"
        showIcon
        icon={<CloudOutlined />}
      />

      <Space.Compact style={{ width: '100%' }}>
        <Select
          style={{ flex: 1 }}
          placeholder="Sélectionnez un domaine Cloud Run"
          value={value?.cloudRunDomain}
          onChange={handleDomainChange}
          disabled={disabled || loading}
          loading={loading}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={domains.map(domain => ({
            value: domain.domain,
            label: domain.domain,
            description: domain.description
          }))}
          optionRender={(option) => {
            const domain = domains.find(d => d.domain === option.value);
            return (
              <Space direction="vertical" size="small" style={{ padding: '4px 0' }}>
                <Space>
                  <strong>{option.label}</strong>
                  {domain?.status === 'active' && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>Actif</Tag>
                  )}
                </Space>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {domain?.description}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  Service: {domain?.serviceName} • Région: {domain?.region}
                </div>
              </Space>
            );
          }}
        />
        
        <Tooltip title="Recharger la liste des domaines">
          <Button 
            htmlType="button"
            icon={<ReloadOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fetchCloudRunDomains();
            }}
            loading={loading}
          />
        </Tooltip>
        
        <Tooltip title="Vérifier que le domaine est accessible">
          <Button 
            htmlType="button"
            icon={<CheckCircleOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              verifyDomain();
            }}
            loading={verifying}
            disabled={!value?.cloudRunDomain}
            type="primary"
          >
            Vérifier
          </Button>
        </Tooltip>
      </Space.Compact>

      {value?.cloudRunDomain && (
        <Alert
          message="Domaine sélectionné"
          description={
            <Space direction="vertical" size="small">
              <div>
                <strong>Domaine:</strong> {value.cloudRunDomain}
              </div>
              <div>
                <strong>Service:</strong> {value.cloudRunServiceName}
              </div>
              <div>
                <strong>Région:</strong> {value.cloudRunRegion}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                💡 Ce site sera accessible via <strong>https://{value.cloudRunDomain}</strong>
              </div>
            </Space>
          }
          type="success"
          showIcon
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="Chargement des domaines Cloud Run..." />
        </div>
      )}
    </Space>
  );
};

export default CloudRunDomainSelector;
