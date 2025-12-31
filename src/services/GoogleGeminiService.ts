/**
 * 🤖 GOOGLE GEMINI AI SERVICE POUR CRM 
 * Service d'intelligence artificielle pour automatiser les tâches CRM
 */

// Import pour l'API Google Generative AI
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

// Types légers partagés
export interface LeadLike { name?: string; company?: string; industry?: string; sector?: string; service?: string; notes?: string }
export interface ProductLike { name?: string }
export interface EmailCtx { objective?: string }

export interface EmailResult {
  subject: string;
  body: string;
  tone: string;
}

export interface AnalysisResult {
  profil: string;
  besoins: string;
  opportunites: string;
  actions: string;
  score: number;
}

export interface ProposalResult {
  content: string;
  wordCount: number;
  sections: string[];
}

export interface SentimentResult {
  sentiment: string;
  score: number;
  emotions: string[];
  urgence: string;
  recommandations: string;
}

export interface SuggestionsResult {
  principale: string;
  alternatives: string[];
  objet: string;
  callToAction: string;
}

// Types pour l'analyse d'images (Vision API)
export interface ImageMeasureResult {
  success: boolean;
  measurements?: Record<string, string | number>;
  rawResponse?: string;
  error?: string;
  model?: string;
}

export interface AIMeasureMapping {
  key: string;          // Clé du résultat (ex: "largeur", "hauteur")
  label: string;        // Label affiché (ex: "Largeur (cm)")
  targetRef: string;    // Référence du champ cible (@value.nodeId)
  type: 'number' | 'text' | 'boolean';
}

export interface AIMeasureConfig {
  enabled: boolean;
  prompt: string;           // Prompt personnalisé pour l'analyse
  measureKeys: string[];    // Liste des clés à extraire (ex: ["largeur", "hauteur", "type"])
  mappings: AIMeasureMapping[];
  autoTrigger: boolean;     // Déclencher automatiquement à l'upload
}

export class GoogleGeminiService {
  private isDemoMode: boolean;
  private apiKey: string | undefined;
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private primaryModelName: string;
  private fallbackModelNames: string[] = [];
  private modelCache: Map<string, GenerativeModel> = new Map();
  private modelName: string; // compat héritage routes existantes
  // Observabilité / Résilience
  private consecutiveFailures = 0;
  private lastError: string | null = null;
  private lastSuccessAt: Date | null = null;
  private degradedUntil: number | null = null; // timestamp ms si circuit breaker actif
  // Paramètres résilience
  private maxRetries: number;
  private baseTimeoutMs: number;
  private perAttemptExtraTimeoutMs: number;

  constructor() {
    // Vérifier si la clé API est configurée
    this.apiKey = process.env.GOOGLE_AI_API_KEY;
    const forcedMode = process.env.AI_MODE; // force-mock | force-live | auto
    this.isDemoMode = forcedMode === 'force-mock' ? true : (!this.apiKey && forcedMode !== 'force-live');
    const explicitDefaultModel = process.env.GEMINI_MODEL?.trim();
    const fastModel = process.env.GEMINI_FAST_MODEL?.trim();
    this.primaryModelName = fastModel || explicitDefaultModel || 'gemini-2.5-flash';
    const fallbackEnv = process.env.GEMINI_MODEL_FALLBACKS || explicitDefaultModel || 'gemini-2.5-pro';
    this.fallbackModelNames = fallbackEnv
      .split(',')
      .map((name) => name.trim())
      .filter((name) => !!name && name !== this.primaryModelName);
    // Compatibilité héritage (certaines routes lisent encore this.modelName)
    this.modelName = this.primaryModelName;

    // Paramètres par défaut (surchageables via .env)
    this.maxRetries = Math.max(0, parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2);
    this.baseTimeoutMs = Math.max(2000, parseInt(process.env.AI_TIMEOUT_MS || '12000', 10) || 12000);
    this.perAttemptExtraTimeoutMs = Math.max(0, parseInt(process.env.AI_RETRY_TIMEOUT_INCREMENT_MS || '2000', 10) || 2000);

    if (this.isDemoMode) {
      console.log('🤖 GoogleGeminiService initialisé (mode développement - démo)');
      console.log('ℹ️  Pour activer l\'API réelle, configurez GOOGLE_AI_API_KEY dans .env');
    } else {
      console.log('🤖 GoogleGeminiService initialisé (mode production - API réelle)');
      this.genAI = new GoogleGenerativeAI(this.apiKey!);
      this.model = this.getModelInstance(this.primaryModelName);
      this.modelCache.set(this.primaryModelName, this.model);
      console.log(`✅ Clé API Gemini détectée, modèle rapide: ${this.primaryModelName} (API v1beta)`);
      if (this.fallbackModelNames.length > 0) {
        console.log(`↪️  Modèles de secours configurés: ${this.fallbackModelNames.join(', ')}`);
      }
    }
  }

  /** Indique si on est en mode live */
  public isLive(): boolean { return !this.isDemoMode; }

  /** Chat générique multi-modules */
  public async chat(params: { prompt: string; raw?: boolean }): Promise<{ success: boolean; content?: string; mode: 'live' | 'mock'; error?: string; model?: string }> {
    const { prompt } = params;
    if (this.isDemoMode) {
      return { success: true, mode: 'mock', content: this.buildDemoChat(prompt), model: 'demo' };
    }
    // Circuit breaker actif ?
    if (this.degradedUntil && Date.now() < this.degradedUntil) {
      return {
        success: true,
        mode: 'mock',
        content: this.buildDemoChat(prompt),
        error: this.lastError || 'circuit-breaker-active',
        model: 'fallback-mock'
      };
    }
    try {
      const result = await this.callGeminiAPIWithFallbacks(prompt);
      if (result.success) {
        this.recordSuccess();
        return { success: true, content: result.content, mode: 'live', model: result.modelUsed };
      }
      this.recordFailure(result.error || 'unknown-error');
      return {
        success: true,
        content: this.buildDemoChat(prompt),
        mode: 'mock',
        error: result.error,
        model: result.modelUsed || this.primaryModelName
      };
    } catch (e) {
      const msg = (e as Error).message;
      this.recordFailure(msg);
      return {
        success: true,
        content: this.buildDemoChat(prompt),
        mode: 'mock',
        error: msg,
        model: this.primaryModelName
      };
    }
  }

  private buildDemoChat(userPrompt: string): string {
    return `\nRéponse simplifiée (mode simulé) pour: ${userPrompt.slice(0,120)}...\nJe peux proposer: planifier un RDV, analyser un lead, générer un email ou la prochaine action. Précisez votre besoin.`;
  }

  /**
   * 📧 GÉNÉRATION EMAIL PERSONNALISÉ
   * Génère un email personnalisé pour un prospect
   */
  async generatePersonalizedEmail(leadData: LeadLike, emailType = 'initial') {
    try {
      console.log(`🤖 [Gemini] Génération email ${emailType} pour ${leadData.name}`);
      
      if (this.isDemoMode) {
        return this.generateDemoEmail(leadData, emailType);
      }
      
      // Utilisation de l'API Gemini réelle
      const prompt = this.buildEmailPrompt(leadData, emailType);
      const result = await this.callGeminiAPIWithFallbacks(prompt, emailType === 'initial' ? undefined : [this.primaryModelName, ...this.fallbackModelNames]);

      if (result.success && result.content) {
        return {
          success: true,
          email: this.parseEmailResponse(result.content),
          source: 'gemini-api',
          model: result.modelUsed
        };
      }
      
      // Fallback en cas d'erreur API
      console.warn('⚠️ Erreur API Gemini, fallback vers démo');
      return { ...this.generateDemoEmail(leadData, emailType), model: 'demo' };
      
    } catch (error) {
      console.error('❌ Erreur génération email:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 📋 ANALYSE ET RÉSUMÉ DE LEAD
   * Analyse les données d'un lead et génère un résumé intelligent
   */
  async analyzeLeadData(leadData: LeadLike) {
    try {
      console.log(`🤖 [Gemini] Analyse lead ${leadData.name || 'Anonyme'}`);
      
      if (this.isDemoMode) {
        return this.generateDemoAnalysis(leadData);
      }
      
      // TODO: Intégration réelle Vertex AI
      return { success: false, error: 'Vertex AI non configuré' };
      
    } catch (error) {
      console.error('❌ Erreur analyse lead:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 📝 GÉNÉRATION PROPOSITION COMMERCIALE
   * Crée une proposition commerciale personnalisée
   */
  async generateCommercialProposal(leadData: LeadLike, productData: ProductLike) {
    try {
      console.log(`🤖 [Gemini] Génération proposition pour ${leadData.name}`);
      
      if (this.isDemoMode) {
        return this.generateDemoProposal(leadData, productData);
      }
      
      // TODO: Intégration réelle Vertex AI
      return { success: false, error: 'Vertex AI non configuré' };
      
    } catch (error) {
      console.error('❌ Erreur génération proposition:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 🔍 ANALYSE SENTIMENT EMAIL
   * Analyse le sentiment d'un email reçu
   */
  async analyzeSentiment(emailContent: string) {
    try {
      console.log('🤖 [Gemini] Analyse sentiment email');
      
      if (this.isDemoMode) {
        return this.generateDemoSentiment(emailContent);
      }
      
      // TODO: Intégration réelle Vertex AI
      return { success: false, error: 'Vertex AI non configuré' };
      
    } catch (error) {
      console.error('❌ Erreur analyse sentiment:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 💬 SUGGESTION RÉPONSE EMAIL
   * Suggère une réponse appropriée à un email
   */
  async suggestEmailResponse(emailContent: string, context: EmailCtx = {}) {
    try {
      console.log('🤖 [Gemini] Suggestion réponse email');
      
      if (this.isDemoMode) {
        return this.generateDemoResponse(emailContent, context);
      }
      
      // TODO: Intégration réelle Vertex AI
      return { success: false, error: 'Vertex AI non configuré' };
      
    } catch (error) {
      console.error('❌ Erreur suggestion email:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 🎭 MÉTHODES DEMO (SIMULATION)
   * Ces méthodes simulent les réponses de Gemini en attendant la configuration
   */
  
  private generateDemoEmail(leadData: LeadLike, emailType: string) {
    const emailTemplates = {
      initial: {
        subject: `Bonjour ${leadData.name} - Proposition CRM personnalisée pour ${leadData.company || 'votre entreprise'}`,
        body: `Bonjour ${leadData.name},

J'espère que vous allez bien. Je me permets de vous contacter suite à votre intérêt pour nos solutions CRM.

Chez 2Thier, nous aidons les entreprises comme ${leadData.company || 'la vôtre'} à optimiser leur gestion commerciale grâce à des outils innovants et intuitifs.

${leadData.industry ? `Ayant une expertise particulière dans le secteur ${leadData.industry}, ` : ''}Je serais ravi de vous présenter comment notre CRM peut répondre à vos besoins spécifiques.

Seriez-vous disponible pour un échange de 30 minutes la semaine prochaine ?

Cordialement,
L'équipe 2Thier CRM

P.S. : Nous offrons une démonstration gratuite et personnalisée.`
      },
      followup: {
        subject: `Suivi - Démonstration CRM pour ${leadData.company || 'votre entreprise'}`,
        body: `Bonjour ${leadData.name},

J'espère que vous avez pu consulter notre proposition CRM.

${leadData.notes ? `Suite à nos échanges concernant ${leadData.notes.substring(0, 50)}..., ` : ''}je souhaitais faire le point avec vous sur vos besoins.

Notre solution pourrait particulièrement vous aider à :
• Automatiser votre suivi commercial
• Intégrer vos emails et calendrier
• Analyser vos performances de vente

Quand pourriez-vous être disponible pour une démonstration personnalisée ?

Bien à vous,
L'équipe 2Thier CRM`
      }
    };

    const template = emailTemplates[emailType as keyof typeof emailTemplates] || emailTemplates.initial;
    
    return {
      success: true,
      email: {
        subject: template.subject,
        body: template.body,
        tone: 'professionnel'
      }
    };
  }

  private generateDemoAnalysis(leadData: LeadLike) {
    const qualificationScore = this.calculateQualificationScore(leadData);
    
    return {
      success: true,
      analysis: {
        profil: `${leadData.name} de ${leadData.company || 'une entreprise'} ${leadData.industry ? `dans le secteur ${leadData.industry}` : ''}. Contact via ${leadData.source || 'canal direct'}.`,
        besoins: leadData.notes ? this.extractNeeds(leadData.notes) : 'Besoins à clarifier lors du prochain contact',
        opportunites: this.generateOpportunities(leadData),
        actions: this.generateRecommendedActions(leadData, qualificationScore),
        score: qualificationScore
      }
    };
  }

  private generateDemoProposal(leadData: LeadLike, productData: ProductLike) {
    const proposal = `PROPOSITION COMMERCIALE PERSONNALISÉE

Destinataire: ${leadData.name} - ${leadData.company || 'Entreprise'}

1. INTRODUCTION
Nous avons le plaisir de vous proposer ${productData.name}, une solution parfaitement adaptée à vos besoins.

2. ANALYSE DE VOS BESOINS
${leadData.notes || 'Optimisation de la gestion commerciale et amélioration du suivi client.'}

3. SOLUTION PROPOSÉE
${productData.description}

Avantages clés :
${Array.isArray(productData.benefits) ? productData.benefits.map((b: string) => `• ${b}`).join('\n') : '• Solution complète et intuitive'}

4. INVESTISSEMENT
${productData.price || 'Sur devis personnalisé'}

5. PROCHAINES ÉTAPES
• Démonstration personnalisée (30 minutes)
• Configuration selon vos besoins
• Formation de votre équipe
• Support technique complet

Nous restons à votre disposition pour tout complément d'information.

Cordialement,
L'équipe commerciale 2Thier`;

    return {
      success: true,
      proposal: {
        content: proposal.trim(),
        wordCount: proposal.split(' ').length,
        sections: ['Introduction', 'Analyse besoins', 'Solution', 'Investissement', 'Prochaines étapes']
      }
    };
  }

  private generateDemoSentiment(emailContent: string) {
    const sentiment = this.analyzeSentimentDemo(emailContent);
    
    return {
      success: true,
      sentiment: {
        sentiment: sentiment.type,
        score: sentiment.score,
        emotions: sentiment.emotions,
        urgence: sentiment.urgence,
        recommandations: sentiment.recommandations
      }
    };
  }

  private generateDemoResponse(emailContent: string, context: EmailCtx) {
    const suggestion = this.generateResponseSuggestion(emailContent, context);
    
    return {
      success: true,
      suggestions: {
        principale: suggestion.main,
        alternatives: suggestion.alternatives,
        objet: suggestion.subject,
        callToAction: suggestion.cta
      }
    };
  }

  /**
   * 🛠️ MÉTHODES UTILITAIRES DEMO
   */
  
  private calculateQualificationScore(leadData: LeadLike): number {
    let score = 5; // Score de base
    
    if (leadData.email) score += 1;
    if (leadData.phone) score += 1;
    if (leadData.company) score += 1;
    if (leadData.industry) score += 1;
    if (leadData.notes && leadData.notes.length > 50) score += 1;
    if (leadData.status === 'Qualified') score += 2;
    if (leadData.notes && leadData.notes.includes('budget')) score += 1;
    
    return Math.min(score, 10);
  }

  private extractNeeds(notes: string): string {
    if (notes.toLowerCase().includes('crm')) return 'Solution CRM complète';
    if (notes.toLowerCase().includes('gestion')) return 'Amélioration gestion commerciale';
    if (notes.toLowerCase().includes('automatisation')) return 'Automatisation des processus';
    return 'Besoins à affiner lors du prochain échange';
  }

  private generateOpportunities(leadData: LeadLike): string {
    const opportunities = [];
    
    if (leadData.company) opportunities.push('Déploiement à l\'échelle de l\'entreprise');
    if (leadData.industry) opportunities.push(`Expertise sectorielle ${leadData.industry}`);
    if (leadData.notes && leadData.notes.includes('équipe')) opportunities.push('Formation équipe complète');
    
    return opportunities.length > 0 ? opportunities.join(', ') : 'Potentiel à évaluer';
  }

  private generateRecommendedActions(leadData: LeadLike, score: number): string {
    if (score >= 8) return 'Proposer démonstration immédiate, préparer offre commerciale';
    if (score >= 6) return 'Planifier rendez-vous téléphonique, qualifier les besoins';
    return 'Envoyer informations complémentaires, programmer rappel dans 1 semaine';
  }

  private analyzeSentimentDemo(emailContent: string) {
    const content = emailContent.toLowerCase();
    
    // Analyse basique du sentiment
    let score = 5;
    let type = 'neutre';
    const emotions: string[] = [];
    let urgence = 'moyenne';
    
    // Sentiment positif
    if (content.includes('merci') || content.includes('intéressant') || content.includes('parfait')) {
      score += 2;
      type = 'positif';
      emotions.push('satisfaction');
    }
    
    // Sentiment négatif
    if (content.includes('problème') || content.includes('déçu') || content.includes('pas satisfait')) {
      score -= 2;
      type = 'négatif';
      emotions.push('frustration');
    }
    
    // Urgence
    if (content.includes('urgent') || content.includes('rapidement') || content.includes('dès que possible')) {
      urgence = 'élevée';
      emotions.push('urgence');
    }
    
    // Recommandations
    let recommandations = 'Réponse standard professionnelle';
    if (type === 'positif') recommandations = 'Réponse enthousiaste, proposer prochaine étape';
    if (type === 'négatif') recommandations = 'Réponse empathique, proposer solution rapide';
    if (urgence === 'élevée') recommandations += ' - Répondre dans les 2 heures';
    
    return {
      type,
      score: Math.max(1, Math.min(10, score)),
      emotions,
      urgence,
      recommandations
    };
  }

  private generateResponseSuggestion(emailContent: string, context: EmailCtx) {
    const isPositive = emailContent.toLowerCase().includes('intéressant') || 
                      emailContent.toLowerCase().includes('merci');
    
    let main = '';
    if (isPositive) {
      main = `Bonjour,

Merci pour votre retour positif ! Je suis ravi de voir que notre solution vous intéresse.

Pour donner suite à votre message, je vous propose d'organiser une démonstration personnalisée qui vous permettra de découvrir concrètement les fonctionnalités adaptées à vos besoins.

Quelles sont vos disponibilités pour un échange de 30 minutes cette semaine ?

Cordialement`;
    } else {
      main = `Bonjour,

Merci pour votre message. Je prends note de vos remarques et vais m'assurer de vous apporter une réponse complète.

${context.objective || 'Je vous recontacte rapidement'} pour faire le point sur votre situation.

Bien à vous`;
    }

    return {
      main,
      alternatives: [
        'Version courte : Merci pour votre message. Je vous recontacte rapidement.',
        'Version formelle : Nous accusons réception de votre message et vous remercions de votre intérêt.'
      ],
      subject: 'Re: ' + (emailContent.substring(0, 30) + '...'),
      cta: isPositive ? 'Organiser une démonstration' : 'Faire le point ensemble'
    };
  }

  /**
   * 🚀 MÉTHODES POUR L'API GEMINI RÉELLE
   */

  private ensureLiveMode() {
    if (!this.genAI) {
      throw new Error('API Gemini non initialisée');
    }
  }

  private getModelInstance(modelName: string): GenerativeModel {
    this.ensureLiveMode();
    const cached = this.modelCache.get(modelName);
    if (cached) {
      return cached;
    }
    const model = this.genAI!.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
    this.modelCache.set(modelName, model);
    return model;
  }

  /**
   * 📐 ANALYSE D'IMAGE AVEC VISION API
   * Analyse une image et extrait des mesures/informations selon le prompt
   */
  async analyzeImageForMeasures(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    measureKeys: string[]
  ): Promise<ImageMeasureResult> {
    try {
      console.log(`📐 [Gemini Vision] Analyse d'image avec ${measureKeys.length} clés à extraire`);

      if (this.isDemoMode) {
        return this.generateDemoImageMeasures(measureKeys);
      }

      // Circuit breaker actif ?
      if (this.degradedUntil && Date.now() < this.degradedUntil) {
        console.warn('⚠️ [Gemini Vision] Circuit breaker actif, retour mode démo');
        return {
          ...this.generateDemoImageMeasures(measureKeys),
          error: this.lastError || 'circuit-breaker-active'
        };
      }

      // Construction du prompt structuré pour l'extraction
      const structuredPrompt = this.buildMeasurePrompt(prompt, measureKeys);

      // Appel à l'API Vision avec l'image
      const result = await this.callVisionAPI(imageBase64, mimeType, structuredPrompt);

      if (result.success && result.content) {
        this.recordSuccess();
        
        // Parser la réponse JSON
        const measurements = this.parseMeasureResponse(result.content, measureKeys);
        
        return {
          success: true,
          measurements,
          rawResponse: result.content,
          model: result.modelUsed
        };
      }

      // Fallback en cas d'erreur
      this.recordFailure(result.error || 'unknown-vision-error');
      console.warn('⚠️ [Gemini Vision] Erreur API, fallback vers démo');
      return {
        ...this.generateDemoImageMeasures(measureKeys),
        error: result.error
      };

    } catch (error) {
      const msg = (error as Error).message;
      console.error('❌ [Gemini Vision] Erreur:', msg);
      this.recordFailure(msg);
      return {
        success: false,
        error: msg
      };
    }
  }

  /**
   * 🔍 Appel à l'API Vision Gemini avec image en base64
   */
  private async callVisionAPI(
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<{ success: boolean; content?: string; error?: string; modelUsed: string }> {
    try {
      if (!this.genAI) {
        return { success: false, error: 'API Gemini non initialisée', modelUsed: this.primaryModelName };
      }

      // Utiliser le modèle Flash qui supporte la vision
      const visionModelName = this.primaryModelName; // gemini-2.5-flash supporte vision nativement
      const model = this.getModelInstance(visionModelName);

      console.log(`📷 [Gemini Vision] Envoi de l'image (${mimeType}) au modèle ${visionModelName}`);

      // Construire le contenu multimodal
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: imageBase64
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      console.log(`✅ [Gemini Vision] Réponse reçue (${text.length} caractères)`);
      return { success: true, content: text, modelUsed: visionModelName };

    } catch (error) {
      console.error('❌ [Gemini Vision API] Erreur:', error);
      return { success: false, error: (error as Error).message, modelUsed: this.primaryModelName };
    }
  }

  /**
   * 📝 Construit le prompt pour l'extraction de mesures
   */
  private buildMeasurePrompt(userPrompt: string, measureKeys: string[]): string {
    const keysDescription = measureKeys.map(k => `"${k}"`).join(', ');
    
    return `Tu es un assistant expert en analyse d'images et en prise de mesures.

INSTRUCTION UTILISATEUR:
${userPrompt}

CLÉS À EXTRAIRE:
${keysDescription}

RÈGLES IMPORTANTES:
1. Analyse l'image attentivement
2. TU DOIS TOUJOURS ESTIMER les dimensions (largeur, hauteur, profondeur) en centimètres, même si c'est approximatif
3. Utilise des indices visuels (proportions, objets de référence, perspective) pour estimer les mesures
4. Pour les châssis/fenêtres standard, une fenêtre typique fait entre 60-150cm de large et 80-200cm de haut
5. NE JAMAIS répondre "non_visible" pour les dimensions - FAIS TOUJOURS UNE ESTIMATION RAISONNABLE
6. Pour les autres champs (type, couleur, matériau, nombre), tu peux répondre "non_visible" UNIQUEMENT si vraiment impossible à déterminer
7. Pour les dimensions, utilise les unités en centimètres (cm) - donne un nombre entier
8. Réponds UNIQUEMENT au format JSON suivant (sans texte avant ou après):

{
  ${measureKeys.map(k => `"${k}": <valeur_numérique_ou_texte>`).join(',\n  ')}
}

Analyse maintenant cette image et ESTIME toutes les dimensions:`;
  }

  /**
   * 🔄 Parse la réponse JSON et extrait les mesures
   */
  private parseMeasureResponse(content: string, measureKeys: string[]): Record<string, string | number> {
    try {
      // Chercher le JSON dans la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ [Gemini Vision] Pas de JSON trouvé dans la réponse');
        return this.createEmptyMeasurements(measureKeys);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const measurements: Record<string, string | number> = {};

      for (const key of measureKeys) {
        if (parsed[key] !== undefined) {
          measurements[key] = parsed[key];
        } else {
          measurements[key] = 'non_visible';
        }
      }

      return measurements;

    } catch (error) {
      console.warn('⚠️ [Gemini Vision] Erreur parsing JSON:', error);
      return this.createEmptyMeasurements(measureKeys);
    }
  }

  /**
   * 🎭 Génère des mesures de démonstration
   */
  private generateDemoImageMeasures(measureKeys: string[]): ImageMeasureResult {
    const measurements: Record<string, string | number> = {};
    
    for (const key of measureKeys) {
      // Générer des valeurs démo réalistes selon le nom de la clé
      const keyLower = key.toLowerCase();
      if (keyLower.includes('largeur') || keyLower.includes('width')) {
        measurements[key] = Math.round(80 + Math.random() * 120); // 80-200 cm
      } else if (keyLower.includes('hauteur') || keyLower.includes('height')) {
        measurements[key] = Math.round(100 + Math.random() * 150); // 100-250 cm
      } else if (keyLower.includes('profondeur') || keyLower.includes('depth')) {
        measurements[key] = Math.round(5 + Math.random() * 30); // 5-35 cm
      } else if (keyLower.includes('nombre') || keyLower.includes('count') || keyLower.includes('nb')) {
        measurements[key] = Math.floor(1 + Math.random() * 5); // 1-5
      } else if (keyLower.includes('type') || keyLower.includes('style')) {
        const types = ['oscillo-battant', 'à soufflet', 'fixe', 'coulissant'];
        measurements[key] = types[Math.floor(Math.random() * types.length)];
      } else if (keyLower.includes('couleur') || keyLower.includes('color')) {
        const colors = ['blanc', 'gris anthracite', 'noir', 'chêne doré'];
        measurements[key] = colors[Math.floor(Math.random() * colors.length)];
      } else if (keyLower.includes('materiau') || keyLower.includes('material')) {
        const materials = ['PVC', 'aluminium', 'bois', 'mixte bois-alu'];
        measurements[key] = materials[Math.floor(Math.random() * materials.length)];
      } else {
        // Valeur numérique générique
        measurements[key] = Math.round(10 + Math.random() * 100);
      }
    }

    return {
      success: true,
      measurements,
      model: 'demo'
    };
  }

  /**
   * 📋 Crée un objet de mesures vide
   */
  private createEmptyMeasurements(measureKeys: string[]): Record<string, string | number> {
    const measurements: Record<string, string | number> = {};
    for (const key of measureKeys) {
      measurements[key] = 'non_visible';
    }
    return measurements;
  }

  private async callGeminiAPIWithFallbacks(
    prompt: string,
    modelCandidates?: string[]
  ): Promise<{ success: boolean; content?: string; error?: string; modelUsed?: string }> {
    const candidates = (modelCandidates && modelCandidates.length > 0)
      ? modelCandidates
      : [this.primaryModelName, ...this.fallbackModelNames];

    let lastError: string | undefined;
    for (const candidate of candidates) {
      const result = await this.callGeminiAPIWithRetries(prompt, candidate);
      if (result.success) {
        if (candidate !== this.primaryModelName) {
          console.warn(`↪️  [Gemini API] Basculé sur le modèle de secours ${candidate}`);
        }
        return result;
      }
      lastError = result.error;
      console.warn(`⚠️ [Gemini API] Échec avec ${candidate}: ${lastError || 'erreur inconnue'}`);
    }

    return {
      success: false,
      error: lastError || 'no-model-available',
      modelUsed: candidates[candidates.length - 1]
    };
  }
  
  private async callGeminiAPI(prompt: string, modelName: string): Promise<{ success: boolean; content?: string; error?: string; modelUsed: string }> {
    try {
      if (!this.genAI) {
        return { success: false, error: 'API Gemini non initialisée', modelUsed: modelName };
      }

      const modelToUse = this.getModelInstance(modelName);
      const result = await modelToUse.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(`✅ [Gemini API] Réponse reçue (${modelName})`);
      return { success: true, content: text, modelUsed: modelName };
      
    } catch (error) {
      console.error('❌ [Gemini API] Erreur:', error);
      return { success: false, error: (error as Error).message, modelUsed: modelName };
    }
  }

  /** Appel API avec timeout et retries exponentiels (backoff + jitter) */
  private async callGeminiAPIWithRetries(prompt: string, modelName: string): Promise<{ success: boolean; content?: string; error?: string; modelUsed: string }> {
    const attempts = this.maxRetries + 1; // tentative initiale + retries
    for (let i = 0; i < attempts; i++) {
      const timeoutMs = this.baseTimeoutMs + i * this.perAttemptExtraTimeoutMs;
      try {
        const res = await this.withTimeout(this.callGeminiAPI(prompt, modelName), timeoutMs);
        if (res.success) return res;
        // Si erreur non transitoire, on arrête
        if (!this.isTransientError(res.error || '')) return res;
        // Sinon retry
      } catch (err) {
        const msg = (err as Error).message || String(err);
        if (!this.isTransientError(msg)) {
          return { success: false, error: msg, modelUsed: modelName };
        }
      }
      // Backoff exponentiel avec jitter
      const base = Math.min(4000, 500 * Math.pow(2, i));
      const jitter = Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, base + jitter));
    }
    return { success: false, error: 'timeout-or-retry-exceeded', modelUsed: modelName };
  }

  private async withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`ai-timeout-${ms}ms`)), ms);
      })
    ]).finally(() => {
      // @ts-expect-error timer is set in both branches
      if (timer) clearTimeout(timer);
    });
  }

  private isTransientError(message: string): boolean {
    const m = message.toLowerCase();
    return (
      m.includes('timeout') ||
      m.includes('timed out') ||
      m.includes('etimedout') ||
      m.includes('econnreset') ||
      m.includes('econnrefused') ||
      m.includes('network') ||
      m.includes('fetch failed') ||
      m.includes('503') ||
      m.includes('502') ||
      m.includes('429')
    );
  }

  /** Expose un statut enrichi pour la route /api/ai/status */
  public getStatus() {
    const now = Date.now();
    const degraded = !!(this.degradedUntil && now < this.degradedUntil);
    return {
      mode: this.isDemoMode ? 'mock' : 'live',
  model: this.primaryModelName,
  fallbackModels: this.fallbackModelNames,
      hasApiKey: !!this.apiKey,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
      lastSuccessAt: this.lastSuccessAt?.toISOString() || null,
      degraded,
  degradedUntil: degraded && this.degradedUntil ? new Date(this.degradedUntil).toISOString() : null
    };
  }

  private recordFailure(err: string) {
    this.consecutiveFailures += 1;
    this.lastError = err;
    // Détection clé invalide -> circuit breaker rapide
    const isKeyInvalid = /API key not valid|API_KEY_INVALID|permission|unauthorized|401|403/i.test(err);
    if (isKeyInvalid) {
      // Paliers exponentiels simples
      let penaltyMinutes = 1;
      if (this.consecutiveFailures >= 3) penaltyMinutes = 5;
      if (this.consecutiveFailures >= 5) penaltyMinutes = 15;
      if (this.consecutiveFailures >= 7) penaltyMinutes = 60;
      this.degradedUntil = Date.now() + penaltyMinutes * 60_000;
    } else if (this.consecutiveFailures >= 4) {
      // Autres erreurs persistantes => courte pause 2-5 min selon charge
      const minutes = this.consecutiveFailures >= 6 ? 5 : 2;
      this.degradedUntil = Date.now() + minutes * 60_000;
    }
  }

  private recordSuccess() {
    this.consecutiveFailures = 0;
    this.lastError = null;
    this.lastSuccessAt = new Date();
    this.degradedUntil = null;
  }

  private buildEmailPrompt(leadData: LeadLike, emailType: string): string {
    const company = leadData.company || 'votre entreprise';
    const name = leadData.name || 'Monsieur/Madame';
    const sector = leadData.sector || 'votre secteur d\'activité';
    const service = leadData.service || 'nos services';

    return `Génère un email professionnel ${emailType} pour un prospect dans le CRM.

CONTEXTE:
- Nom: ${name}
- Entreprise: ${company}
- Secteur: ${sector}
- Service d'intérêt: ${service}
- Type d'email: ${emailType}

INSTRUCTIONS:
1. Crée un email personnalisé et professionnel
2. Adapte le ton au type d'email (${emailType})
3. Mentionne les besoins spécifiques du secteur
4. Inclus un appel à l'action clair
5. Réponds au format JSON: {"subject": "...", "body": "...", "tone": "..."}

L'email doit être en français et adapté au marché belge.`;
  }

  private parseEmailResponse(content: string): { subject: string; body: string; tone: string } {
    try {
      // Tenter de parser le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: extraire manuellement
      return {
        subject: this.extractFromContent(content, 'subject', 'Sujet généré par IA'),
        body: this.extractFromContent(content, 'body', content.substring(0, 500)),
        tone: this.extractFromContent(content, 'tone', 'professionnel')
      };
    } catch (error) {
      console.warn('⚠️ Erreur parsing réponse Gemini:', error);
      return {
        subject: 'Email généré par IA',
        body: content,
        tone: 'professionnel'
      };
    }
  }

  private extractFromContent(content: string, field: string, defaultValue: string): string {
    const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i');
    const match = content.match(regex);
    return match ? match[1] : defaultValue;
  }
}

export default GoogleGeminiService;
