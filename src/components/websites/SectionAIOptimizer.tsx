/**
 * 🤖 SectionAIOptimizer - Assistant IA Contextuel
 * ================================================
 * Analyse le contenu actuel d'une section et propose des optimisations :
 * - Layout & Design (grille, couleurs, espacement)
 * - Contenu (titres, descriptions, CTA)
 * - UX & Accessibilité
 */

import React, { useState } from 'react';
import {
  Modal,
  Card,
  Space,
  Button,
  Spin,
  Alert,
  Divider,
  Typography,
  Tag,
  Row,
  Col,
  Collapse,
  Switch,
  Tooltip,
  Progress,
  message
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  BulbOutlined,
  WarningOutlined,
  FireOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Suggestion {
  id: string;
  category: 'layout' | 'design' | 'content' | 'ux';
  type: 'improvement' | 'warning' | 'best-practice';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  changes: Record<string, any>;
  preview?: {
    before: string;
    after: string;
  };
}

interface AnalysisResult {
  score: number;
  suggestions: Suggestion[];
  summary: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
}

interface SectionAIOptimizerProps {
  visible: boolean;
  onClose: () => void;
  sectionType: string;
  currentContent: any;
  onApplySuggestions: (changes: Record<string, any>) => void;
}

export const SectionAIOptimizer: React.FC<SectionAIOptimizerProps> = ({
  visible,
  onClose,
  sectionType,
  currentContent,
  onApplySuggestions
}) => {
  const { api } = useAuthenticatedApi();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  // Analyser la section avec l'IA
  const analyzeSection = async () => {
    setAnalyzing(true);
    try {
      const prompt = buildAnalysisPrompt();
      
      const response = await api.post('/api/ai/analyze-section', {
        sectionType,
        content: currentContent,
        prompt
      });

      setAnalysis(response.data);
      message.success('✅ Analyse terminée !');
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      message.error('Impossible d\'analyser la section');
    } finally {
      setAnalyzing(false);
    }
  };

  // Construire le prompt d'analyse
  const buildAnalysisPrompt = () => {
    return `Tu es un expert en UX/UI et design web spécialisé dans les sites de transition énergétique.

Analyse cette section de type "${sectionType}" et son contenu actuel :
${JSON.stringify(currentContent, null, 2)}

Fournis une analyse détaillée avec :

1. **Score global** (0-100) basé sur :
   - Clarté du message
   - Efficacité visuelle
   - UX et accessibilité
   - Cohérence du design

2. **Suggestions concrètes** dans ces catégories :
   
   📐 **LAYOUT** (disposition, grille, espacement)
   - Nombre de colonnes optimal
   - Espacement entre éléments
   - Alignement et justification
   - Responsive design
   
   🎨 **DESIGN** (couleurs, typographie, style)
   - Palette de couleurs
   - Tailles de police
   - Contraste et accessibilité
   - Cohérence visuelle
   
   📝 **CONTENU** (textes, messages, CTA)
   - Titres et sous-titres
   - Descriptions et textes
   - Appels à l'action
   - Ton et clarté
   
   ⚡ **UX** (expérience utilisateur)
   - Navigation et hiérarchie
   - Points de friction
   - Conversion et engagement
   - Performance perçue

3. **Pour CHAQUE suggestion**, fournis :
   - Titre court et clair
   - Description détaillée
   - Impact estimé (low/medium/high)
   - Les changements précis à appliquer (JSON)
   - Si possible, un aperçu avant/après

4. **Résumé** :
   - 3 forces principales
   - 3 faiblesses à corriger
   - 3 opportunités d'amélioration

Format de réponse attendu : JSON structuré
{
  "score": 75,
  "suggestions": [
    {
      "id": "layout-1",
      "category": "layout",
      "type": "improvement",
      "title": "Passer à 4 colonnes",
      "description": "Avec 6 services, une grille 3×2 crée un déséquilibre. 4 colonnes optimise l'espace.",
      "impact": "medium",
      "changes": {
        "gridLayout.columns": 4,
        "gridLayout.preset": "4x2"
      },
      "preview": {
        "before": "3 colonnes × 2 lignes",
        "after": "4 colonnes × 2 lignes (meilleure utilisation de l'espace)"
      }
    }
  ],
  "summary": {
    "strengths": ["Contenu clair", "Bonne structure"],
    "weaknesses": ["Layout déséquilibré", "Couleurs ternes"],
    "opportunities": ["Optimiser l'espacement", "Renforcer les CTA"]
  }
}`;
  };

  // Toggle une suggestion
  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  // Sélectionner toutes les suggestions
  const selectAll = () => {
    if (!analysis) return;
    setSelectedSuggestions(analysis.suggestions.map(s => s.id));
  };

  // Désélectionner tout
  const deselectAll = () => {
    setSelectedSuggestions([]);
  };

  // Appliquer les suggestions sélectionnées
  const applySuggestions = async () => {
    if (selectedSuggestions.length === 0) {
      message.warning('Sélectionnez au moins une suggestion');
      return;
    }

    setApplying(true);
    try {
      // Fusionner tous les changements
      const allChanges: Record<string, any> = {};
      
      analysis?.suggestions
        .filter(s => selectedSuggestions.includes(s.id))
        .forEach(suggestion => {
          Object.entries(suggestion.changes).forEach(([key, value]) => {
            // Gérer les clés imbriquées (ex: "gridLayout.columns")
            const keys = key.split('.');
            if (keys.length === 1) {
              allChanges[key] = value;
            } else {
              // Créer l'objet imbriqué si nécessaire
              if (!allChanges[keys[0]]) {
                allChanges[keys[0]] = {};
              }
              allChanges[keys[0]][keys[1]] = value;
            }
          });
        });

      // Appliquer les changements
      onApplySuggestions(allChanges);
      
      message.success(`✅ ${selectedSuggestions.length} suggestion(s) appliquée(s) !`);
      onClose();
    } catch (error) {
      console.error('Erreur application suggestions:', error);
      message.error('Impossible d\'appliquer les suggestions');
    } finally {
      setApplying(false);
    }
  };

  // Icône selon la catégorie
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'layout': return '📐';
      case 'design': return '🎨';
      case 'content': return '📝';
      case 'ux': return '⚡';
      default: return '💡';
    }
  };

  // Couleur selon l'impact
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  // Label d'impact
  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high': return '🔥 Impact Élevé';
      case 'medium': return '⚡ Impact Moyen';
      case 'low': return '💡 Impact Faible';
      default: return 'Impact';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>Assistant IA - Optimisation de Section</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* Section d'analyse */}
        {!analysis ? (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
              <RobotOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <Title level={4}>Analysez votre section avec l'IA</Title>
              <Paragraph type="secondary">
                L'IA va analyser votre section <Tag color="blue">{sectionType}</Tag> et vous proposer
                des optimisations pour améliorer le design, le contenu et l'expérience utilisateur.
              </Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={analyzeSection}
                loading={analyzing}
              >
                {analyzing ? 'Analyse en cours...' : 'Lancer l\'analyse'}
              </Button>
            </Space>
          </Card>
        ) : (
          <>
            {/* Score global */}
            <Card>
              <Row gutter={24} align="middle">
                <Col span={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>Score Global</Text>
                    <Progress
                      percent={analysis.score}
                      status={analysis.score >= 80 ? 'success' : analysis.score >= 60 ? 'normal' : 'exception'}
                      strokeColor={{
                        '0%': analysis.score >= 80 ? '#52c41a' : analysis.score >= 60 ? '#faad14' : '#ff4d4f',
                        '100%': analysis.score >= 80 ? '#73d13d' : analysis.score >= 60 ? '#ffc53d' : '#ff7a45',
                      }}
                    />
                  </Space>
                </Col>
                <Col span={12}>
                  <Alert
                    message={
                      analysis.score >= 80 ? '✅ Excellente section !' :
                      analysis.score >= 60 ? '⚡ Quelques améliorations possibles' :
                      '🔥 Optimisations recommandées'
                    }
                    type={analysis.score >= 80 ? 'success' : analysis.score >= 60 ? 'warning' : 'error'}
                    showIcon
                  />
                </Col>
              </Row>
            </Card>

            {/* Résumé */}
            <Card title="📊 Résumé de l'analyse">
              <Row gutter={16}>
                <Col span={8}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text strong style={{ color: '#52c41a' }}>
                      <CheckCircleOutlined /> Forces
                    </Text>
                    {analysis.summary.strengths.map((s, i) => (
                      <Text key={i} type="secondary">• {s}</Text>
                    ))}
                  </Space>
                </Col>
                <Col span={8}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      <CloseCircleOutlined /> Faiblesses
                    </Text>
                    {analysis.summary.weaknesses.map((s, i) => (
                      <Text key={i} type="secondary">• {s}</Text>
                    ))}
                  </Space>
                </Col>
                <Col span={8}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text strong style={{ color: '#1890ff' }}>
                      <BulbOutlined /> Opportunités
                    </Text>
                    {analysis.summary.opportunities.map((s, i) => (
                      <Text key={i} type="secondary">• {s}</Text>
                    ))}
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Suggestions */}
            <Card 
              title={`💡 ${analysis.suggestions.length} Suggestions d'optimisation`}
              extra={
                <Space>
                  <Button size="small" onClick={selectAll}>Tout sélectionner</Button>
                  <Button size="small" onClick={deselectAll}>Tout désélectionner</Button>
                </Space>
              }
            >
              <Collapse ghost>
                {analysis.suggestions.map((suggestion) => (
                  <Panel
                    key={suggestion.id}
                    header={
                      <Space>
                        <Switch
                          checked={selectedSuggestions.includes(suggestion.id)}
                          onChange={() => toggleSuggestion(suggestion.id)}
                          size="small"
                        />
                        <Text strong>
                          {getCategoryIcon(suggestion.category)} {suggestion.title}
                        </Text>
                        <Tag color={getImpactColor(suggestion.impact)}>
                          {getImpactLabel(suggestion.impact)}
                        </Tag>
                      </Space>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Paragraph>{suggestion.description}</Paragraph>
                      
                      {suggestion.preview && (
                        <Alert
                          message="Aperçu"
                          description={
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Text type="secondary">❌ Avant : {suggestion.preview.before}</Text>
                              <Text type="success">✅ Après : {suggestion.preview.after}</Text>
                            </Space>
                          }
                          type="info"
                          icon={<EyeOutlined />}
                        />
                      )}
                      
                      <Alert
                        message="Changements appliqués"
                        description={
                          <pre style={{ fontSize: 11, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                            {JSON.stringify(suggestion.changes, null, 2)}
                          </pre>
                        }
                        type="info"
                        showIcon={false}
                      />
                    </Space>
                  </Panel>
                ))}
              </Collapse>
            </Card>

            {/* Actions */}
            <Row gutter={16}>
              <Col span={12}>
                <Button
                  block
                  size="large"
                  icon={<RobotOutlined />}
                  onClick={analyzeSection}
                  loading={analyzing}
                >
                  Réanalyser
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={applySuggestions}
                  loading={applying}
                  disabled={selectedSuggestions.length === 0}
                >
                  Appliquer {selectedSuggestions.length > 0 ? `(${selectedSuggestions.length})` : ''}
                </Button>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default SectionAIOptimizer;
