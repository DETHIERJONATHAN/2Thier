/**
 * 🎯 SIMULATEUR FULL-PAGE RENDERER - 1 Question = 1 Écran Pleine Page
 * 
 * Rendu style moderne avec :
 * - UNE question par écran (pleine page)
 * - Navigation conditionnelle selon les réponses
 * - Design mobile-first 100% responsive
 * - Cartes cliquables avec icônes/images
 * - Barre de progression
 * - Bouton retour
 * 
 * @module FullPageFormRenderer
 * @version 2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  InputNumber,
  Progress,
  message,
  Spin,
  Result,
  Checkbox
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  PhoneOutlined,
  CloseOutlined
} from '@ant-design/icons';

// ==================== TYPES ====================
interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  imageUrl?: string;
}

interface NavigationRule {
  answerValue?: string;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'greaterThan' | 'lessThan';
    value: any;
  };
  nextQuestionKey: string;
}

interface Question {
  id: number;
  questionKey: string;
  title: string;
  subtitle?: string;
  helpText?: string;
  icon?: string;
  questionType: string;
  placeholder?: string;
  inputSuffix?: string;
  minValue?: number;
  maxValue?: number;
  options?: QuestionOption[];
  defaultNextQuestionKey?: string;
  navigation?: NavigationRule[];
  isEndQuestion: boolean;
  isRequired: boolean;
}

interface FormData {
  id: number;
  name: string;
  slug: string;
  description?: string;
  settings: any;
  startQuestionKey: string;
  successTitle?: string;
  successMessage?: string;
  questions: Question[];
}

// ==================== STYLES ====================
const styles = {
  container: {
    minHeight: '100vh',
    minHeight: '100dvh', // Dynamic viewport height pour mobile
    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const
  },

  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },

  closeButton: {
    background: 'transparent',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    fontSize: '18px',
    transition: 'all 0.2s',
    flexShrink: 0
  },

  backButton: {
    background: 'transparent',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    fontSize: '20px',
    transition: 'all 0.2s'
  },

  progressContainer: {
    flex: 1,
    maxWidth: '200px'
  },

  phoneButton: {
    background: '#10b981',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    color: 'white',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '24px 16px',
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    paddingBottom: '120px' // Espace pour le bouton fixe
  },

  questionIcon: {
    fontSize: '48px',
    textAlign: 'center' as const,
    marginBottom: '16px'
  },

  questionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
    textAlign: 'center' as const,
    marginBottom: '8px',
    lineHeight: 1.3
  },

  questionSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginBottom: '32px'
  },

  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    width: '100%'
  },

  optionCard: (selected: boolean) => ({
    background: selected ? '#eff6ff' : 'white',
    border: selected ? '2px solid #3b82f6' : '2px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '120px',
    position: 'relative' as const,
    boxShadow: selected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
  }),

  optionIcon: {
    fontSize: '36px',
    marginBottom: '8px'
  },

  optionImage: {
    width: '48px',
    height: '48px',
    objectFit: 'contain' as const,
    marginBottom: '8px'
  },

  optionLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'center' as const
  },

  optionDescription: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '4px'
  },

  selectedCheck: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    color: '#3b82f6',
    fontSize: '20px'
  },

  inputContainer: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto'
  },

  inputField: {
    fontSize: '18px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    width: '100%',
    textAlign: 'center' as const
  },

  footer: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 100
  },

  continueButton: (enabled: boolean) => ({
    background: enabled ? '#3b82f6' : '#d1d5db',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 48px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'not-allowed',
    width: '100%',
    maxWidth: '400px',
    transition: 'all 0.2s'
  }),

  checkboxOption: (selected: boolean) => ({
    background: selected ? '#eff6ff' : 'white',
    border: selected ? '2px solid #3b82f6' : '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  })
};

// ==================== COMPOSANT PRINCIPAL ====================
const EffyFormRenderer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // États
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Navigation et réponses
  const [currentQuestionKey, setCurrentQuestionKey] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<string[]>([]); // Pour le bouton retour
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  
  // 🔥 GESTION MULTI-BRANCHES: File d'attente des branches à parcourir
  // Quand l'utilisateur sélectionne plusieurs travaux, on stocke les branches restantes
  const [pendingBranches, setPendingBranches] = useState<string[]>([]);
  // Question de retour après avoir terminé toutes les branches
  const [returnToQuestion, setReturnToQuestion] = useState<string | null>(null);

  // Chargement du formulaire
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/public/forms/${slug}/questions`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Formulaire introuvable');
          } else {
            setError('Erreur lors du chargement');
          }
          return;
        }
        const data = await response.json();
        setFormData(data);
        setCurrentQuestionKey(data.startQuestionKey || data.questions[0]?.questionKey || '');
      } catch (err) {
        console.error('Erreur chargement formulaire:', err);
        setError('Impossible de charger le formulaire');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchForm();
    }
  }, [slug]);

  // Question actuelle
  const currentQuestion = useMemo(() => {
    if (!formData) return null;
    return formData.questions.find(q => q.questionKey === currentQuestionKey) || null;
  }, [formData, currentQuestionKey]);

  // Calcul de la progression
  const progress = useMemo(() => {
    if (!formData) return 0;
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = formData.questions.length;
    return Math.round((answeredCount / totalQuestions) * 100);
  }, [formData, answers]);

  // 🔥 NOUVELLE LOGIQUE: Trouver toutes les branches pour un choix multiple
  const getAllBranchesForMultipleChoice = useCallback((questionKey: string, selectedValues: string[]): string[] => {
    if (!formData) return [];
    
    const question = formData.questions.find(q => q.questionKey === questionKey);
    if (!question?.navigation) return [];
    
    const branches: string[] = [];
    
    for (const value of selectedValues) {
      const rule = question.navigation.find((r: NavigationRule) => r.answerValue === value);
      if (rule?.nextQuestionKey) {
        branches.push(rule.nextQuestionKey);
      }
    }
    
    return branches;
  }, [formData]);

  // Trouver la question suivante basée sur la navigation conditionnelle
  const getNextQuestionKey = useCallback((questionKey: string, answerValue: any): string | null => {
    if (!formData) return null;
    
    const question = formData.questions.find(q => q.questionKey === questionKey);
    if (!question) return null;

    // Si c'est une question finale
    if (question.isEndQuestion) return null;

    // Vérifier les règles de navigation conditionnelle
    if (question.navigation && Array.isArray(question.navigation)) {
      for (const rule of question.navigation) {
        // Navigation simple basée sur la valeur de réponse
        if (rule.answerValue !== undefined) {
          // Pour les choix multiples, on retourne la PREMIÈRE branche
          // Les autres seront mises dans pendingBranches
          if (Array.isArray(answerValue)) {
            if (answerValue.includes(rule.answerValue)) {
              return rule.nextQuestionKey;
            }
          } else if (answerValue === rule.answerValue) {
            return rule.nextQuestionKey;
          }
        }
        
        // Navigation avec condition complexe
        if (rule.condition) {
          const fieldValue = answers[rule.condition.field];
          let conditionMet = false;
          
          switch (rule.condition.operator) {
            case 'equals':
              conditionMet = fieldValue === rule.condition.value;
              break;
            case 'notEquals':
              conditionMet = fieldValue !== rule.condition.value;
              break;
            case 'in':
              conditionMet = Array.isArray(rule.condition.value) && rule.condition.value.includes(fieldValue);
              break;
            case 'greaterThan':
              conditionMet = Number(fieldValue) > Number(rule.condition.value);
              break;
            case 'lessThan':
              conditionMet = Number(fieldValue) < Number(rule.condition.value);
              break;
          }
          
          if (conditionMet) {
            return rule.nextQuestionKey;
          }
        }
      }
    }

    // Question suivante par défaut
    return question.defaultNextQuestionKey || null;
  }, [formData, answers]);

  // Gérer la sélection d'une option (single choice)
  const handleOptionSelect = useCallback((value: string) => {
    setCurrentAnswer(value);
  }, []);

  // Gérer la sélection multiple (checkbox)
  const handleMultipleSelect = useCallback((value: string) => {
    setCurrentAnswer((prev: string[] | null) => {
      const current = prev || [];
      if (current.includes(value)) {
        return current.filter(v => v !== value);
      }
      return [...current, value];
    });
  }, []);

  // Gérer les inputs (number, text, etc.)
  const handleInputChange = useCallback((value: any) => {
    setCurrentAnswer(value);
  }, []);

  // Soumettre le formulaire
  const handleSubmit = useCallback(async (finalAnswers: Record<string, any>) => {
    if (!formData) return;

    setSubmitting(true);
    try {
      // 🔥 Transformer les réponses au format attendu par l'API
      // L'API attend: { formData, contact, metadata }
      const contact = {
        firstName: finalAnswers.prenom || '',
        lastName: finalAnswers.nom || '',
        email: finalAnswers.email || '',
        phone: finalAnswers.telephone || '',
        civility: finalAnswers.civilite || ''
      };

      // Exclure les champs de contact des formData (préfixés _ car extraits mais non utilisés directement)
      const { prenom: _prenom, nom: _nom, email: _email, telephone: _telephone, civilite: _civilite, ...otherAnswers } = finalAnswers;
      
      const response = await fetch(`/api/public/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: otherAnswers, // Réponses du simulateur
          contact,               // Informations de contact
          metadata: {
            referrer: document.referrer || null,
            userAgent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la soumission');
      }

      const result = await response.json();
      setSubmitted(true);
      message.success(result.message || 'Formulaire envoyé avec succès !');
    } catch (err) {
      console.error('Erreur soumission:', err);
      message.error(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, slug]);

  // Continuer vers la question suivante
  const handleContinue = useCallback(async () => {
    if (!currentQuestion || currentAnswer === null || currentAnswer === undefined) return;
    
    // Pour les champs required, vérifier la valeur
    if (currentQuestion.isRequired) {
      if (currentAnswer === '' || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) {
        message.warning('Veuillez répondre à cette question');
        return;
      }
    }

    // Log de debug pour le multi-branches
    console.log(`📍 [Nav] Question: ${currentQuestion.questionKey}, pendingBranches: [${pendingBranches.join(', ')}], returnTo: ${returnToQuestion}`);

    // Sauvegarder la réponse
    const newAnswers = { ...answers, [currentQuestion.questionKey]: currentAnswer };
    setAnswers(newAnswers);

    // 🔥 GESTION MULTI-BRANCHES pour les choix multiples
    if (currentQuestion.questionType === 'multiple_choice' && Array.isArray(currentAnswer) && currentAnswer.length > 0) {
      // Récupérer toutes les branches correspondant aux choix
      const allBranches = getAllBranchesForMultipleChoice(currentQuestion.questionKey, currentAnswer);
      
      if (allBranches.length > 0) {
        // Première branche = question suivante immédiate
        const [firstBranch, ...newRemainingBranches] = allBranches;
        
        // 🔥 IMPORTANT: Combiner les nouvelles branches avec les branches pendantes existantes
        // (ne pas écraser les branches de niveau supérieur)
        if (newRemainingBranches.length > 0 || pendingBranches.length > 0) {
          // Ajouter les nouvelles branches AVANT les branches existantes
          // Les nouvelles sont prioritaires car elles sont plus "profondes" dans l'arbre
          setPendingBranches([...newRemainingBranches, ...pendingBranches]);
          
          // Stocker la question de retour SEULEMENT si on n'en a pas déjà une
          if (returnToQuestion === null) {
            setReturnToQuestion(currentQuestion.defaultNextQuestionKey || null);
          }
        }
        
        // Aller à la première branche
        setHistory(prev => [...prev, currentQuestionKey]);
        setCurrentQuestionKey(firstBranch);
        setCurrentAnswer(newAnswers[firstBranch] || null);
        return;
      }
    }

    // 🔥 Vérifier s'il y a des branches en attente à parcourir
    // La fin de branche est détectée quand nextKey pointe vers returnToQuestion (ex: motif_simulation)
    if (pendingBranches.length > 0) {
      const nextKey = getNextQuestionKey(currentQuestion.questionKey, currentAnswer);
      
      // Si la prochaine question est la question de retour (fin de branche commune)
      // OU si c'est une question sans suite (null)
      // → Passer à la branche suivante au lieu d'aller à la question commune
      if (!nextKey || nextKey === returnToQuestion) {
        // Fin de cette branche, passer à la branche suivante
        const [nextBranch, ...remainingBranches] = pendingBranches;
        setPendingBranches(remainingBranches);
        
        console.log(`🌿 [MultiBranch] Fin de branche, passage à: ${nextBranch}, restantes: ${remainingBranches.length}`);
        
        setHistory(prev => [...prev, currentQuestionKey]);
        setCurrentQuestionKey(nextBranch);
        setCurrentAnswer(newAnswers[nextBranch] || null);
        return;
      }
    }

    // Trouver la question suivante (navigation standard)
    let nextKey = getNextQuestionKey(currentQuestion.questionKey, currentAnswer);

    // Si la prochaine question est la question de retour ET qu'il n'y a plus de branches pendantes
    // → On peut maintenant aller à la question de retour
    if (nextKey === returnToQuestion && pendingBranches.length === 0) {
      console.log(`🏁 [MultiBranch] Toutes les branches terminées, retour à: ${returnToQuestion}`);
      setReturnToQuestion(null); // Reset car on y va maintenant
    }

    // Si pas de question suivante et qu'on a terminé toutes les branches, retourner à la question de retour
    if (!nextKey && pendingBranches.length === 0 && returnToQuestion) {
      nextKey = returnToQuestion;
      setReturnToQuestion(null); // Reset
    }

    if (nextKey) {
      // Ajouter à l'historique pour le retour
      setHistory(prev => [...prev, currentQuestionKey]);
      setCurrentQuestionKey(nextKey);
      setCurrentAnswer(newAnswers[nextKey] || null); // Restaurer la réponse si déjà répondue
    } else {
      // Fin du formulaire - soumettre
      await handleSubmit(newAnswers);
    }
  }, [currentQuestion, currentAnswer, answers, currentQuestionKey, getNextQuestionKey, handleSubmit, getAllBranchesForMultipleChoice, pendingBranches, returnToQuestion]);

  // Retour à la question précédente
  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const prevKey = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentQuestionKey(prevKey);
      setCurrentAnswer(answers[prevKey] || null);
    }
  }, [history, answers]);

  // Vérifier si on peut continuer
  const canContinue = useMemo(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.isRequired) return true;
    if (currentAnswer === null || currentAnswer === undefined) return false;
    if (currentAnswer === '') return false;
    if (Array.isArray(currentAnswer) && currentAnswer.length === 0) return false;
    return true;
  }, [currentQuestion, currentAnswer]);

  // ==================== RENDU DES QUESTIONS ====================
  
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.questionType) {
      case 'single_choice':
        return (
          <div style={styles.optionsGrid}>
            {(currentQuestion.options || []).map((option) => (
              <div
                key={option.value}
                style={styles.optionCard(currentAnswer === option.value)}
                onClick={() => handleOptionSelect(option.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleOptionSelect(option.value)}
                role="button"
                tabIndex={0}
              >
                {currentAnswer === option.value && (
                  <CheckCircleOutlined style={styles.selectedCheck} />
                )}
                {option.imageUrl ? (
                  <img src={option.imageUrl} alt={option.label} style={styles.optionImage} />
                ) : option.icon ? (
                  <span style={styles.optionIcon}>{option.icon}</span>
                ) : null}
                <span style={styles.optionLabel}>{option.label}</span>
                {option.description && (
                  <span style={styles.optionDescription}>{option.description}</span>
                )}
              </div>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <div>
            {(currentQuestion.options || []).map((option) => {
              const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
              return (
                <div
                  key={option.value}
                  style={styles.checkboxOption(isSelected)}
                  onClick={() => handleMultipleSelect(option.value)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                >
                  <Checkbox checked={isSelected} />
                  {option.icon && <span style={{ fontSize: '24px' }}>{option.icon}</span>}
                  <div>
                    <span style={{ fontWeight: 600, color: '#1f2937' }}>{option.label}</span>
                    {option.description && (
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{option.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'number':
        return (
          <div style={styles.inputContainer}>
            <InputNumber
              size="large"
              value={currentAnswer}
              onChange={handleInputChange}
              placeholder={currentQuestion.placeholder}
              min={currentQuestion.minValue}
              max={currentQuestion.maxValue}
              style={{ ...styles.inputField, width: '100%' }}
              addonAfter={currentQuestion.inputSuffix}
            />
          </div>
        );

      case 'text':
        return (
          <div style={styles.inputContainer}>
            <Input
              size="large"
              value={currentAnswer || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              style={styles.inputField}
            />
          </div>
        );

      case 'email':
        return (
          <div style={styles.inputContainer}>
            <Input
              size="large"
              type="email"
              value={currentAnswer || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder || 'votre@email.com'}
              style={styles.inputField}
            />
          </div>
        );

      case 'phone':
        return (
          <div style={styles.inputContainer}>
            <Input
              size="large"
              type="tel"
              value={currentAnswer || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder || '06 12 34 56 78'}
              style={styles.inputField}
              prefix={<PhoneOutlined />}
            />
          </div>
        );

      case 'address':
        return (
          <div style={styles.inputContainer}>
            <Input
              size="large"
              value={currentAnswer || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder || 'Entrez votre adresse...'}
              style={styles.inputField}
            />
          </div>
        );

      default:
        return (
          <div style={styles.inputContainer}>
            <Input
              size="large"
              value={currentAnswer || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              style={styles.inputField}
            />
          </div>
        );
    }
  };

  // ==================== ÉTATS DE RENDU ====================

  // Loading
  if (loading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#3b82f6' }} spin />} />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Chargement du simulateur...</p>
      </div>
    );
  }

  // Erreur
  if (error || !formData) {
    return (
      <div style={styles.container}>
        <Result
          status="404"
          title="Simulateur introuvable"
          subTitle={error || "Ce formulaire n'existe pas ou n'est plus disponible."}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          }
        />
      </div>
    );
  }

  // Succès
  if (submitted) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '16px' }}>
            {formData.successTitle || 'Merci pour votre demande !'}
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
            {formData.successMessage || 'Nous vous recontacterons dans les plus brefs délais.'}
          </p>
          <Button type="primary" size="large" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Submitting
  if (submitting) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#3b82f6' }} spin />} />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Envoi en cours...</p>
      </div>
    );
  }

  // Question actuelle
  if (!currentQuestion) {
    return (
      <div style={styles.container}>
        <Result
          status="error"
          title="Question introuvable"
          subTitle="Une erreur s'est produite dans le parcours."
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header avec progression */}
      <header style={styles.header}>
        {/* Bouton fermer - retour à la page d'origine */}
        <button
          style={styles.closeButton}
          onClick={() => {
            // Si on a un historique de navigation, on retourne en arrière
            // Sinon on va à la page d'accueil
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = '/';
            }
          }}
          aria-label="Fermer et retourner"
          title="Quitter le formulaire"
        >
          <CloseOutlined />
        </button>

        {/* Bouton retour question précédente */}
        <button
          style={{
            ...styles.backButton,
            visibility: history.length > 0 ? 'visible' : 'hidden'
          }}
          onClick={handleBack}
          aria-label="Question précédente"
          title="Question précédente"
        >
          <ArrowLeftOutlined />
        </button>
        
        <div style={styles.progressContainer}>
          <Progress 
            percent={progress} 
            showInfo={false}
            strokeColor="#3b82f6"
            trailColor="#e5e7eb"
            size="small"
          />
        </div>

        {/* Bouton téléphone - affiché uniquement si un numéro est configuré */}
        {formData?.settings?.phoneNumber && (
          <a 
            href={`tel:${formData.settings.phoneNumber.replace(/\s/g, '')}`}
            style={{ ...styles.phoneButton, textDecoration: 'none' }}
            aria-label={`Appeler ${formData.settings.phoneNumber}`}
          >
            <PhoneOutlined />
            <span style={{ marginLeft: '4px' }}>{formData.settings.phoneNumber}</span>
          </a>
        )}
      </header>

      {/* Contenu de la question */}
      <main style={styles.content}>
        {currentQuestion.icon && (
          <div style={styles.questionIcon}>{currentQuestion.icon}</div>
        )}
        
        <h1 style={styles.questionTitle}>{currentQuestion.title}</h1>
        
        {currentQuestion.subtitle && (
          <p style={styles.questionSubtitle}>{currentQuestion.subtitle}</p>
        )}

        {renderQuestion()}

        {currentQuestion.helpText && (
          <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', marginTop: '24px' }}>
            {currentQuestion.helpText}
          </p>
        )}
      </main>

      {/* Footer avec bouton continuer */}
      <footer style={styles.footer}>
        <button
          style={styles.continueButton(canContinue)}
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {currentQuestion.isEndQuestion ? 'Terminer' : 'Continuer'}
        </button>
      </footer>
    </div>
  );
};

export default EffyFormRenderer;
