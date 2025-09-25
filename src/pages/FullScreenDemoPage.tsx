import React from 'react';
import { Button, Row, Col, Statistic, Progress } from 'antd';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  ShoppingCart, 
  Mail, 
  Calendar,
  FileText,
  Settings
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import ContentCard from '../components/layout/ContentCard';

export const FullScreenDemoPage: React.FC = () => {
  return (
    <PageContainer 
      title="🚀 Démonstration Layout Plein Écran"
      subtitle="Header pleine largeur + Sidebar à gauche + Content qui utilise TOUT l'espace restant"
      actions={
        <div className="flex gap-2">
          <Button type="primary" icon={<Settings className="w-4 h-4" />}>
            Configurer
          </Button>
          <Button icon={<FileText className="w-4 h-4" />}>
            Exporter
          </Button>
        </div>
      }
      fullHeight
    >
      {/* PREMIÈRE RANGÉE - Stats principales */}
      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <ContentCard className="h-full">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <Statistic 
                title="Utilisateurs Actifs" 
                value={1432} 
                valueStyle={{ color: '#1890ff' }}
              />
              <div className="text-xs text-gray-500 mt-2">+12% ce mois</div>
            </div>
          </ContentCard>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <ContentCard className="h-full">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <Statistic 
                title="Chiffre d'Affaires" 
                value={84329} 
                precision={0}
                suffix="€"
                valueStyle={{ color: '#52c41a' }}
              />
              <div className="text-xs text-gray-500 mt-2">+8% ce mois</div>
            </div>
          </ContentCard>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <ContentCard className="h-full">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-4">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
              </div>
              <Statistic 
                title="Commandes" 
                value={523} 
                valueStyle={{ color: '#722ed1' }}
              />
              <div className="text-xs text-gray-500 mt-2">+15% ce mois</div>
            </div>
          </ContentCard>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <ContentCard className="h-full">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-4">
                <Mail className="w-6 h-6 text-orange-600" />
              </div>
              <Statistic 
                title="Emails Envoyés" 
                value={8472} 
                valueStyle={{ color: '#fa8c16' }}
              />
              <div className="text-xs text-gray-500 mt-2">+23% ce mois</div>
            </div>
          </ContentCard>
        </Col>
      </Row>

      {/* DEUXIÈME RANGÉE - Graphiques et données */}
      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} lg={16}>
          <ContentCard 
            title="📊 Performance Mensuelle" 
            accentColor="blue"
            fullHeight
            className="h-80"
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BarChart3 className="w-24 h-24 text-blue-400 mx-auto mb-4" />
                <p className="text-gray-500">Graphique des performances</p>
                <p className="text-sm text-gray-400">Données en temps réel</p>
              </div>
            </div>
          </ContentCard>
        </Col>
        
        <Col xs={24} lg={8}>
          <div className="space-y-6 h-80">
            <ContentCard className="flex-1">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 mb-3">🎯 Objectifs</h4>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Ventes</span>
                    <span className="text-sm font-medium">78%</span>
                  </div>
                  <Progress percent={78} strokeColor="#52c41a" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Leads</span>
                    <span className="text-sm font-medium">65%</span>
                  </div>
                  <Progress percent={65} strokeColor="#1890ff" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Support</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <Progress percent={92} strokeColor="#722ed1" />
                </div>
              </div>
            </ContentCard>
            
            <ContentCard className="flex-1">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-800 mb-2">📅 Agenda</h4>
                <p className="text-sm text-gray-600">3 réunions aujourd'hui</p>
                <p className="text-xs text-gray-500">Prochaine: 14h30</p>
              </div>
            </ContentCard>
          </div>
        </Col>
      </Row>

      {/* TROISIÈME RANGÉE - Détails étendus */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <ContentCard 
            title="📈 Utilisation COMPLÈTE de l'Espace"
            description="Cette zone démontre l'utilisation optimale de l'espace disponible"
            accentColor="green"
            className="min-h-64"
          >
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-sm text-gray-600">Largeur utilisée</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">100%</div>
                <div className="text-sm text-gray-600">Hauteur utilisée</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">✅</div>
                <div className="text-sm text-gray-600">Header pleine largeur</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">✅</div>
                <div className="text-sm text-gray-600">Sidebar optimisée</div>
              </div>
            </div>
          </ContentCard>
        </Col>
        
        <Col xs={24} md={12}>
          <ContentCard 
            title="🎨 Layout Achievements"
            description="Toutes les améliorations apportées au système"
            accentColor="purple"
            className="min-h-64"
          >
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Header prend toute la largeur</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Sidebar positionnée correctement</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Content utilise tout l'espace restant</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">100% Tailwind CSS partout</span>
              </div>
            </div>
          </ContentCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default FullScreenDemoPage;
