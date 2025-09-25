import React, { useState } from 'react';
import { Button, Input, message, Typography, Card, Row, Col, Spin, Tabs, Tag } from 'antd';
import { MailOutlined, FileTextOutlined, SearchOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { PageHeader } from '../components/PageHeader';
// import { StatCard } from '../components/StatCard';

const { Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

// Mock data for demonstration
const mockLeads = [
  { id: '1', name: 'Entreprise A', sector: 'Technologie', interest: 'Haute' },
  { id: '2', name: 'Société B', sector: 'Santé', interest: 'Moyenne' },
];

const mockProposals = [
  { id: '1', client: 'Entreprise A', title: 'Proposition de services IA', status: 'Envoyé' },
];

export const GoogleGeminiPage: React.FC = () => {
  const [msgApi, msgCtx] = message.useMessage();
  const [loading, setLoading] = useState(false);
  // const [activeTab, setActiveTab] = useState('email');
  const [emailPrompt, setEmailPrompt] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [leadAnalysis, setLeadAnalysis] = useState('');
  const [proposalText, setProposalText] = useState('');

  const { api } = useAuthenticatedApi();
  // const { user } = useAuth();

  const handleGenerateEmail = async () => {
    if (!emailPrompt.trim()) {
      msgApi.warning('Veuillez saisir un contenu pour l\'e-mail.');
      return;
    }
    setLoading(true);
    try {
      // Utiliser le prompt de l'utilisateur comme données de lead
      const leadData = {
        name: emailPrompt.split(' ')[0] || 'Prospect',
        context: emailPrompt
      };
      
      const response = await api.post('/api/gemini/generate-email', { 
        leadData, 
        emailType: 'initial' 
      });
      setGeneratedEmail(response.data.email);
      msgApi.success('E-mail généré avec succès !');
    } catch (error) {
      msgApi.error('Erreur lors de la génération de l\'e-mail.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeLead = async (leadId: string) => {
    setLoading(true);
    try {
      // Utiliser l'ID du lead fourni
      const leadData = {
        id: leadId,
        name: `Lead ${leadId}`
      };
      
      const response = await api.post('/api/gemini/analyze-lead', { leadData });
      setLeadAnalysis(response.data.analysis);
      msgApi.success(`Analyse du lead ${leadId} terminée.`);
    } catch (error) {
      msgApi.error('Erreur lors de l\'analyse du lead.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProposal = async () => {
    setLoading(true);
    try {
      // Données minimales pour la proposition
      const leadData = {
        id: '1',
        name: 'Client Prospect'
      };
      
      const productData = {
        name: 'CRM 2Thier',
        description: 'Solution CRM complète'
      };
      
      const response = await api.post('/api/gemini/generate-proposal', { 
        leadData, 
        productData 
      });
      setProposalText(response.data.proposal);
      msgApi.success('Proposition commerciale générée.');
    } catch (error) {
      msgApi.error('Erreur lors de la génération de la proposition.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const GeminiFeatureCard = ({ title, icon, description, action, children }) => (
    <Card title={<><span style={{ marginRight: 8 }}>{icon}</span>{title}</>} style={{ height: '100%' }}>
      <Paragraph>{description}</Paragraph>
      {children}
      <Button type="primary" onClick={action} style={{ marginTop: 16 }} loading={loading}>
        Exécuter
      </Button>
    </Card>
  );

  return (
    <div>
      {msgCtx}
      <PageHeader
        title="Google Gemini AI"
        icon={<ExperimentOutlined />}
        subtitle="Votre assistant commercial intelligent."
        tags={<Tag color="gold">BÊTA</Tag>}
      />

      <Tabs defaultActiveKey="features" style={{ marginBottom: 24 }}>
        <TabPane tab="Fonctionnalités" key="features">
          <Spin spinning={loading}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <GeminiFeatureCard
                  title="Génération d'E-mail"
                  icon={<MailOutlined />}
                  description="Rédigez des e-mails de prospection personnalisés en quelques secondes."
                  action={handleGenerateEmail}
                >
                  <TextArea
                    rows={4}
                    placeholder="Ex: Rédige un e-mail pour présenter notre service IA à une entreprise technologique."
                    value={emailPrompt}
                    onChange={(e) => setEmailPrompt(e.target.value)}
                  />
                  {generatedEmail && <Card style={{ marginTop: 16, backgroundColor: '#f0f2f5' }}><Paragraph copyable>{generatedEmail}</Paragraph></Card>}
                </GeminiFeatureCard>
              </Col>
              <Col xs={24} lg={8}>
                <GeminiFeatureCard
                  title="Analyse de Lead"
                  icon={<SearchOutlined />}
                  description="Obtenez une analyse SWOT et des points de discussion pour un lead spécifique."
                  action={() => handleAnalyzeLead(mockLeads[0].id)}
                >
                  <Paragraph>Analyse pour : <strong>{mockLeads[0].name}</strong></Paragraph>
                  {leadAnalysis && <Card style={{ marginTop: 16, backgroundColor: '#f0f2f5' }}><Paragraph copyable>{leadAnalysis}</Paragraph></Card>}
                </GeminiFeatureCard>
              </Col>
              <Col xs={24} lg={8}>
                <GeminiFeatureCard
                  title="Proposition Commerciale"
                  icon={<FileTextOutlined />}
                  description="Générez une ébauche de proposition commerciale basée sur les données du lead."
                  action={handleGenerateProposal}
                >
                   <Paragraph>Générer pour : <strong>{mockProposals[0].client}</strong></Paragraph>
                  {proposalText && <Card style={{ marginTop: 16, backgroundColor: '#f0f2f5' }}><Paragraph copyable>{proposalText}</Paragraph></Card>}
                </GeminiFeatureCard>
              </Col>
            </Row>
          </Spin>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default GoogleGeminiPage;
