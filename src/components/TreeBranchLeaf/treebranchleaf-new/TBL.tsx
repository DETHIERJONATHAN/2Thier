import React, { useState, useCallback, useEffect } from 'react';
import { Card, Tabs, Avatar, Tag, Button, Divider, Radio, InputNumber, Form, Alert, Spin } from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  HomeOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useTreeBranchLeafConfig } from './hooks/useTreeBranchLeafConfig';

interface FieldValue {
  id: string;
  value: number | string | null;
}

interface CalculState {
  modeId: string | null;
  fields: FieldValue[];
  resultat: number | null;
  enCalcul: boolean;
  erreur: string | null;
}

const TBL: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const { api } = useAuthenticatedApi();
  const [form] = Form.useForm();
  
  // Chargement de la configuration
  const { config, loading, error: configError } = useTreeBranchLeafConfig();
  
  // État pour le calcul
  const [calcul, setCalcul] = useState<CalculState>({
    modeId: null,
    fields: [],
    resultat: null,
    enCalcul: false,
    erreur: null
  });

  const calculerPrixKwh = useCallback(async () => {
    setPrixKwh(prev => ({ ...prev, enCalcul: true, erreur: null }));
    const { mode, prixDirect, montantFacture, consommationAnnuelle } = prixKwh;
    try {
      const response = await api.post('/api/tbl/evaluate', {
        elementId: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5',
        contextData: { mode, prixDirect, montantFacture, consommationAnnuelle }
      });
      if (response.data.success) {
        const value = response.data.value ?? response.data.evaluation?.result;
        setPrixKwh(prev => ({ ...prev, resultat: value ?? null, enCalcul: false }));
      } else {
        setPrixKwh(prev => ({ ...prev, erreur: 'Échec du calcul : ' + (response.data.error || response.data.evaluation?.error || 'Erreur inconnue'), enCalcul: false }));
      }
    } catch {
      setPrixKwh(prev => ({ ...prev, erreur: 'Erreur de communication avec le serveur', enCalcul: false }));
    }
  }, [api]);

  // Effet pour le calcul automatique quand les dépendances changent
  useEffect(() => {
    const { mode, prixDirect, montantFacture, consommationAnnuelle } = prixKwh;
    if ((mode === 'prix-kwh' && prixDirect) || (mode === 'calcul-du-prix-kwh' && montantFacture && consommationAnnuelle)) {
      calculerPrixKwh();
    }
  }, [calculerPrixKwh]);

  // Si chargement initial
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} />} />
        <span className="ml-4 text-gray-600">Chargement de la configuration...</span>
      </div>
    );
  }

  // Si erreur de configuration
  if (configError || !config) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Alert
          message="Erreur de configuration"
          description={configError || "Configuration TBL manquante"}
          type="error"
          showIcon
        />
      </div>
    );
  }

  const tabItems = [
    {
      key: '1',
      label: 'Mesures générales',
      children: (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              title={
                <div className="flex items-center">
                  <CalculatorOutlined className="mr-2" />
                  <span>{config.variables.find(v => v.exposedKey === 'TBL_KWH_TOTAL')?.displayName || 'Calcul'}</span>
                </div>
              }
              className="h-fit"
            >
              <Form
                form={form}
                layout="vertical"
                onValuesChange={(_, values) => {
                  const modeConfig = config.calculModes?.find(m => m.id === values.modeId);
                  if (!modeConfig) return;

                  const fields = modeConfig.fields.map(f => ({
                    id: f.id,
                    value: values[f.code] || null
                  }));

                  setCalcul(prev => ({
                    ...prev,
                    modeId: values.modeId,
                    fields,
                    resultat: null
                  }));
                }}
              >
                <Form.Item
                  name="modeId"
                  label="Mode de calcul"
                  rules={[{ required: true, message: 'Mode requis' }]}
                >
                  <Radio.Group>
                    {config.calculModes?.map(mode => (
                      <Radio key={mode.id} value={mode.id}>
                        {mode.label}
                      </Radio>
                    ))}
                  </Radio.Group>
                </Form.Item>

                {calcul.modeId && (
                  <>
                    {config.calculModes
                      ?.find(m => m.id === calcul.modeId)
                      ?.fields.map(field => (
                        <Form.Item
                          key={field.id}
                          name={field.code}
                          label={field.label}
                          rules={[{ required: true, message: `${field.label} requis` }]}
                        >
                          <InputNumber
                            min={0}
                            step={field.type === 'price' ? 0.001 : 1}
                            style={{ width: '100%' }}
                            addonAfter={field.unit}
                            disabled={calcul.enCalcul}
                          />
                        </Form.Item>
                      ))}

                    <Button
                      type="primary"
                      onClick={() => {
                        if (!config.variables.some(v => v.exposedKey === 'TBL_KWH_TOTAL')) {
                          setCalcul(prev => ({
                            ...prev,
                            erreur: "Variable TBL_KWH_TOTAL non trouvée"
                          }));
                          return;
                        }

                        setCalcul(prev => ({ ...prev, enCalcul: true, erreur: null }));
                        
                        const contextData = calcul.fields.reduce((acc, f) => {
                          const fieldConfig = config.calculModes
                            ?.find(m => m.id === calcul.modeId)
                            ?.fields.find(cf => cf.id === f.id);
                            
                          if (fieldConfig) {
                            acc[fieldConfig.code] = f.value;
                          }
                          return acc;
                        }, {} as Record<string, unknown>);

                        api.post('/api/tbl/evaluate', { elementId: 'TBL_KWH_TOTAL', contextData })
                        .then(response => {
                          if (response.data.success) {
                            const value = response.data.value ?? response.data.evaluation?.result;
                            setCalcul(prev => ({ ...prev, resultat: typeof value === 'number' ? value : null, enCalcul: false }));
                          } else {
                            throw new Error(response.data.error || response.data.evaluation?.error || 'Échec du calcul');
                          }
                        })
                        .catch(err => {
                          setCalcul(prev => ({
                            ...prev,
                            erreur: err.message || 'Erreur lors du calcul',
                            enCalcul: false
                          }));
                        });
                      }}
                      loading={calcul.enCalcul}
                      icon={<CalculatorOutlined />}
                      block
                    >
                      Calculer
                    </Button>
                  </>
                )}

                {calcul.erreur && (
                  <Alert
                    message="Erreur"
                    description={calcul.erreur}
                    type="error"
                    showIcon
                    className="mt-4"
                  />
                )}

                {calcul.resultat !== null && !calcul.erreur && (
                  <Alert
                    message="Résultat"
                    description={`Prix du kWh: ${calcul.resultat.toFixed(3)} €/kWh`}
                    type="success"
                    showIcon
                    className="mt-4"
                  />
                )}
              </Form>
            </Card>
          </div>
        </div>
      )
    },
    {
      key: '2', 
      label: 'Photovoltaïque',
      children: (
        <div className="p-6">
          <Card title="Configuration PV" className="h-fit">
            <div className="text-gray-600">Paramètres photovoltaïque...</div>
          </Card>
        </div>
      )
    },
    {
      key: '3',
      label: 'Toiture', 
      children: (
        <div className="p-6">
          <Card title="Type de toiture" className="h-fit">
            <div className="text-gray-600">Configuration toiture...</div>
          </Card>
        </div>
      )
    },
    {
      key: '4',
      label: 'PAC Air-Air',
      children: (
        <div className="p-6">
          <Card title="Pompe à chaleur Air-Air" className="h-fit">
            <div className="text-gray-600">Configuration PAC...</div>
          </Card>
        </div>
      )
    },
    {
      key: '5',
      label: 'PAC Air-Eau',
      children: (
        <div className="p-6">
          <Card title="Pompe à chaleur Air-Eau" className="h-fit">
            <div className="text-gray-600">Configuration PAC Air-Eau...</div>
          </Card>
        </div>
      )
    },
    {
      key: '6',
      label: 'Thermodynamique',
      children: (
        <div className="p-6">
          <Card title="Système thermodynamique" className="h-fit">
            <div className="text-gray-600">Configuration thermodynamique...</div>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec informations client */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar size={64} icon={<UserOutlined />} className="bg-blue-500" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{clientData.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center">
                    <MailOutlined className="mr-1" />
                    {clientData.email}
                  </span>
                  <span className="flex items-center">
                    <PhoneOutlined className="mr-1" />
                    {clientData.phone}
                  </span>
                  <span className="flex items-center">
                    <HomeOutlined className="mr-1" />
                    {clientData.address}
                  </span>
                </div>
                <div className="mt-2">
                  <Tag color="green">Système Multi-secteurs</Tag>
                  <Tag color="blue">Lead Actif</Tag>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button icon={<EyeOutlined />} type="default">
                Aperçu
              </Button>
              <Button icon={<EditOutlined />} type="primary">
                Modifier
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal avec sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          
          {/* Zone principale avec onglets */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
                tabBarStyle={{
                  marginBottom: 0,
                  borderBottom: '1px solid #f0f0f0'
                }}
              />
            </Card>
          </div>

          {/* Sidebar avec résumé */}
          <div className="space-y-6">
            <Card title="Résumé du projet" extra={<FileTextOutlined />} className="shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-semibold">{summaryData.budget}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Surface:</span>
                  <span className="font-semibold">{summaryData.surface}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Orientation:</span>
                  <span className="font-semibold">{summaryData.orientation}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Inclinaison:</span>
                  <span className="font-semibold">{summaryData.inclinaison}</span>
                </div>
              </div>
            </Card>

            <Card title="Calculs automatiques" className="shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Coût total:</span>
                  <span className="font-semibold text-green-600">{summaryData.coutTotal}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Rendement PV:</span>
                  <span className="font-semibold text-blue-600">{summaryData.rendement}</span>
                </div>
                <Divider className="my-2" />
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800 font-medium">
                    ✓ Projet rentable
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Budget suffisant pour la configuration
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Onglets disponibles" className="shadow-sm">
              <div className="space-y-2">
                {tabItems.map(tab => (
                  <div 
                    key={tab.key}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      activeTab === tab.key 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{tab.label}</span>
                      {activeTab === tab.key && (
                        <span className="text-xs text-blue-500">●</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TBL;
