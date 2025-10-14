# 🤖 Système d'IA Intelligent - Website Builder

## 📋 Vue d'ensemble

Le système d'IA intelligent permet de **générer automatiquement du contenu optimisé** pour tous les champs du Website Builder. Il propose plusieurs suggestions de haute qualité avec scoring et analyse, laissant l'utilisateur choisir la meilleure option.

---

## ✨ Fonctionnalités

### 1. **Génération Contextuelle**
- Analyse du type de champ (titre, description, features, etc.)
- Prise en compte du contexte business (industrie, audience, ton)
- Intégration des mots-clés SEO
- Adaptation au secteur d'activité

### 2. **Suggestions Multiples**
- **3 propositions variées** pour chaque demande
- Approches différentes : rationnel, émotionnel, social proof
- **Scoring de qualité** (0-100) pour chaque suggestion
- **Explication** de la logique derrière chaque proposition

### 3. **Analyse Intelligente**
- Score moyen de qualité
- Niveau de qualité : excellent / good / acceptable / needs-improvement
- Mots-clés SEO pertinents extraits
- Recommandations d'amélioration
- Conseils de lisibilité

### 4. **Interface Utilisateur**
- Bouton ✨ à côté de chaque champ éditable
- Modal élégant pour afficher les suggestions
- Prévisualisation du contenu
- Sélection en un clic
- Indicateurs visuels (meilleure suggestion marquée ⭐)

---

## 🏗️ Architecture Technique

### Backend

#### **Endpoint Principal**
```
POST /api/ai/generate-field
```

**Requête:**
```json
{
  "fieldId": "title",
  "fieldType": "text",
  "fieldLabel": "Titre du service",
  "currentValue": "Panneaux Photovoltaïques",
  "aiContext": {
    "sectionType": "services",
    "businessType": "transition énergétique",
    "tone": "professionnel et convaincant",
    "targetAudience": "particuliers",
    "language": "français",
    "keywords": ["panneaux solaires", "énergie verte"]
  }
}
```

**Réponse:**
```json
{
  "success": true,
  "content": "Meilleure suggestion (contenu directement utilisable)",
  "suggestions": [
    {
      "content": "Installation de Panneaux Solaires Haute Performance",
      "reasoning": "Titre technique et rassurant avec notion de qualité",
      "score": 92,
      "angle": "rationnel"
    },
    {
      "content": "Produisez Votre Propre Électricité Verte",
      "reasoning": "Approche orientée bénéfice et autonomie",
      "score": 88,
      "angle": "émotionnel"
    },
    {
      "content": "Panneaux Photovoltaïques - Économisez jusqu'à 70%",
      "reasoning": "Chiffre accrocheur pour conversion",
      "score": 85,
      "angle": "social proof"
    }
  ],
  "analysis": {
    "avgScore": 88,
    "qualityLevel": "good",
    "bestApproach": "Mettre en avant la performance et l'autonomie",
    "keywords": ["panneaux solaires", "énergie verte", "autonomie", "économies"],
    "fieldType": "title",
    "generatedAt": "2025-10-11T14:30:00.000Z"
  },
  "metadata": {
    "duration": 2340,
    "model": "gemini-pro",
    "fieldType": "text",
    "fieldId": "title"
  }
}
```

#### **Fichiers Backend**

1. **`src/routes/ai-field-generator.ts`** - Route principale
   - `SmartPromptBuilder` : Construction de prompts optimisés selon le type
   - `QualityAnalyzer` : Analyse et scoring des suggestions
   - Gestion des erreurs et timeout
   - Circuit breaker pour résilience

2. **`src/services/googleGeminiService.ts`** - Service IA
   - Intégration Google Gemini API
   - Mode démo / production
   - Retry automatique
   - Rate limiting

### Frontend

#### **Composant Principal**

**`src/site/ai/AIAssistButton.tsx`**
- Bouton déclencheur avec icône ⚡
- Modal de sélection des suggestions
- Affichage du score et de l'analyse
- Application de la suggestion choisie

#### **Flux Utilisateur**

1. 👤 Utilisateur clique sur le bouton ✨ IA
2. ⏳ Chargement (2-4 secondes)
3. 🎯 Modal s'ouvre avec 3 suggestions
4. 👀 Utilisateur lit les propositions + scores + explications
5. ✅ Utilisateur choisit une suggestion
6. 🎉 Le champ est automatiquement rempli

---

## 🎯 Prompts Intelligents par Type de Champ

### **Champs Texte Courts** (titres, CTA, labels)
- Maximum 40-60 caractères
- Accrocheur et mémorable
- Orienté bénéfice client
- Verbe d'action pour CTA
- Éviter les clichés

**Exemple:**
- Input: `fieldId: "ctaText"`, `label: "Bouton d'action"`
- Output: 
  1. "Demander un devis gratuit"
  2. "Calculer mes économies"
  3. "Découvrir nos solutions"

### **Champs Textarea** (descriptions, à propos)
- 2-4 phrases persuasives
- Structure: Problème → Solution → Bénéfice
- Inclure des chiffres si pertinent
- Call-to-action implicite
- Maximum 200-300 caractères

**Exemple:**
- Input: `fieldId: "description"`, `section: "services"`
- Output:
  1. "Installation de panneaux solaires haute performance pour produire votre propre électricité verte et réduire vos factures jusqu'à 70%. Garantie 25 ans, pose professionnelle en 2 jours."
  2. "Transformez votre toit en source d'énergie renouvelable. Nos panneaux photovoltaïques dernière génération vous permettent d'atteindre l'autonomie énergétique tout en valorisant votre bien immobilier."

### **Champs Liste** (features, tags, avantages)
- 4-5 items complémentaires
- Mix: technique + bénéfice + chiffré
- Format court (5-12 mots par item)
- Cohérence entre les items

**Exemple:**
- Input: `fieldId: "features"`, `type: "select"`
- Output:
  ```json
  [
    "Garantie 25 ans sur les panneaux",
    "Installation en 2 jours chrono",
    "Économies jusqu'à 70% sur vos factures",
    "Suivi de production en temps réel"
  ]
  ```

### **Champs Richtext** (contenu long)
- 2-4 paragraphes structurés
- Intro → Développement → Conclusion/CTA
- Transitions fluides
- Optimisé SEO et lisibilité

---

## 🎨 Système de Scoring

### **Critères d'Évaluation (0-100)**

- **90-100** : Excellent - Contenu exceptionnel, optimisé SEO, très convaincant
- **80-89** : Good - Contenu de qualité, bien structuré, efficace
- **70-79** : Acceptable - Contenu correct, peut être amélioré
- **0-69** : Needs Improvement - Contenu à retravailler

### **Facteurs de Score**

1. **Pertinence contextuelle** (30%)
   - Cohérence avec le secteur d'activité
   - Adaptation au ton et à l'audience

2. **Optimisation SEO** (25%)
   - Intégration naturelle des mots-clés
   - Densité appropriée
   - Lisibilité

3. **Impact marketing** (25%)
   - Capacité de conversion
   - Appel à l'action
   - Bénéfices clients clairs

4. **Qualité rédactionnelle** (20%)
   - Grammaire et orthographe
   - Fluidité de lecture
   - Originalité

---

## 🚀 Utilisation dans le Builder

### **Activation Automatique**

L'IA est disponible sur **tous les champs éditables** du `UniversalSectionEditor` :

- ✅ Titres
- ✅ Sous-titres
- ✅ Descriptions
- ✅ Caractéristiques (features)
- ✅ Tags
- ✅ CTA (call-to-action)
- ✅ Contenu richtext
- ✅ Textes de liens
- ✅ Labels

### **Contexte Automatique**

Le système détecte automatiquement :
- Type de section (hero, services, about, etc.)
- Industrie de l'organisation
- Valeurs existantes dans les champs
- Structure de la section

### **Personnalisation Avancée**

Possibilité d'enrichir le contexte avec :
```typescript
{
  businessType: "transition énergétique",
  tone: "professionnel et convaincant",
  targetAudience: "particuliers et professionnels",
  language: "français",
  keywords: ["photovoltaïque", "énergie verte", "autonomie"]
}
```

---

## 🔧 Configuration

### **Variables d'Environnement**

```env
# API Google Gemini (REQUIS)
GOOGLE_AI_API_KEY="votre_clé_api_google"

# Modèle IA (optionnel)
GEMINI_MODEL="gemini-1.5-flash"  # Par défaut

# Mode IA (optionnel)
AI_MODE="auto"  # auto | force-mock | force-live

# Résilience (optionnel)
AI_MAX_RETRIES=2
AI_TIMEOUT_MS=12000
AI_RETRY_TIMEOUT_INCREMENT_MS=2000
```

### **Obtenir une Clé API**

1. Aller sur https://makersuite.google.com/app/apikey
2. Créer un projet Google Cloud
3. Activer l'API Generative Language
4. Générer une clé API
5. Copier dans `.env` : `GOOGLE_AI_API_KEY="..."`

---

## 📊 Performances

### **Temps de Réponse**

- **Moyenne** : 2-4 secondes
- **Maximum** : 12 secondes (avec retry)
- **Cache** : Prévu pour version future

### **Coûts**

- **Modèle** : Gemini 1.5 Flash
- **Prix** : ~0.001€ par requête
- **Gratuit** : 60 requêtes/minute (quota Google)

### **Optimisations**

- Circuit breaker pour éviter surcharge
- Retry automatique (2 tentatives)
- Timeout progressif
- Mode démo si pas de clé API

---

## 🛡️ Sécurité & Fiabilité

### **Protection des Données**

- ✅ Authentification requise (`authMiddleware`)
- ✅ Pas de stockage des prompts
- ✅ Logs minimaux (sans données sensibles)
- ✅ HTTPS en production

### **Gestion des Erreurs**

1. **400 Bad Request** : Paramètres invalides
2. **429 Too Many Requests** : Quota dépassé (1 min d'attente)
3. **500 Server Error** : Erreur IA ou timeout
4. **Fallback** : Message utilisateur clair

### **Circuit Breaker**

Si 3 échecs consécutifs → Mode dégradé 5 minutes
- Évite de surcharger l'API
- Message informatif à l'utilisateur
- Récupération automatique

---

## 🎓 Exemples Concrets

### **Cas 1 : Titre de Service**

**Input:**
```json
{
  "fieldId": "title",
  "fieldType": "text",
  "fieldLabel": "Titre",
  "aiContext": {
    "sectionType": "services",
    "businessType": "transition énergétique"
  }
}
```

**Output:**
1. ⭐ "Panneaux Solaires Haute Performance - Économisez 70%" (92/100)
2. "Installation Photovoltaïque Clé en Main" (88/100)
3. "Énergie Verte pour Votre Maison" (85/100)

### **Cas 2 : Description de Service**

**Input:**
```json
{
  "fieldId": "description",
  "fieldType": "textarea",
  "currentValue": "Installation de panneaux",
  "aiContext": {
    "sectionType": "services",
    "keywords": ["garantie", "économies"]
  }
}
```

**Output:**
1. ⭐ "Installation de panneaux solaires dernière génération avec garantie 25 ans. Réduisez vos factures jusqu'à 70% et produisez votre propre électricité verte. Pose professionnelle en 2 jours, suivi en temps réel." (91/100)

### **Cas 3 : Features**

**Input:**
```json
{
  "fieldId": "features",
  "fieldType": "select",
  "aiContext": {
    "sectionType": "services"
  }
}
```

**Output:**
```json
[
  "Garantie décennale incluse",
  "Installation en 48h chrono",
  "Économies jusqu'à 70%",
  "Suivi production en temps réel"
]
```

---

## 🔮 Évolutions Futures

### **Phase 2 : Optimisations**
- [ ] Cache des suggestions similaires
- [ ] Apprentissage des préférences utilisateur
- [ ] Suggestions contextuelles améliorées
- [ ] Support multilingue avancé

### **Phase 3 : Fonctionnalités Avancées**
- [ ] Régénération ciblée (plus court, plus technique, etc.)
- [ ] A/B testing automatique
- [ ] Analyse de performance des contenus
- [ ] Suggestions proactives (détection de contenu faible)

### **Phase 4 : Intelligence Collective**
- [ ] Partage de suggestions entre organisations
- [ ] Templates préremplis par industrie
- [ ] Benchmark qualité par secteur
- [ ] Recommendations personnalisées

---

## 📚 Documentation Technique

### **Fichiers Clés**

```
src/
├── routes/
│   └── ai-field-generator.ts          # 🤖 Route API principale
├── services/
│   └── googleGeminiService.ts         # 🧠 Service IA Gemini
├── site/
│   └── ai/
│       └── AIAssistButton.tsx         # ✨ Composant UI
└── api-server.ts                      # 🔌 Montage route /api/ai
```

### **Dépendances**

```json
{
  "@google/generative-ai": "^0.1.3",
  "express": "^4.18.2",
  "antd": "^5.x",
  "react": "^18.x"
}
```

---

## 🎉 Conclusion

Le système d'IA intelligent du Website Builder offre :

✅ **Gain de temps massif** : Génération en 3 secondes vs 10+ minutes manuellement
✅ **Qualité professionnelle** : Contenu optimisé SEO et marketing
✅ **Contrôle utilisateur** : Choix entre plusieurs propositions
✅ **Expérience fluide** : Interface intuitive et rapide
✅ **Évolutivité** : Architecture prête pour fonctionnalités avancées

---

**Créé le 11 octobre 2025**  
**Par l'équipe IA Assistant - 2Thier CRM**
