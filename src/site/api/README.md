# 🤖 API ROUTES IA - DOCUMENTATION

## 📋 Vue d'ensemble

Ce module contient toutes les routes API pour les fonctionnalités d'intelligence artificielle du Website Builder.

## 🚀 Installation

### 1. Installer les dépendances

```bash
npm install openai
```

### 2. Configuration des variables d'environnement

Créer un fichier `.env` à la racine :

```env
OPENAI_API_KEY=sk-...votre-clé-ici...
```

### 3. Intégration dans `api-server.ts`

```typescript
import { registerAIRoutes } from './site/api/ai-routes';

// Après la configuration d'Express
registerAIRoutes(app);
```

---

## 📡 ROUTES DISPONIBLES

### 1️⃣ Génération de contenu par champ

**Endpoint :** `POST /api/ai/generate-field`

**Description :** Génère du contenu pour un champ spécifique basé sur le contexte.

**Request Body :**
```json
{
  "fieldId": "hero-title",
  "fieldType": "text",
  "fieldLabel": "Titre principal",
  "currentValue": "Ancien titre",
  "aiContext": {
    "sectionType": "hero",
    "businessType": "agence web",
    "tone": "professionnel",
    "targetAudience": "entrepreneurs",
    "language": "français",
    "keywords": ["innovation", "digital", "solutions"]
  }
}
```

**Response :**
```json
{
  "success": true,
  "fieldId": "hero-title",
  "content": "Transformez votre vision digitale en réalité",
  "analysis": {
    "score": 85,
    "suggestions": [],
    "seo": {
      "keywordsFound": 2,
      "keywordsTotal": 3,
      "density": 66.67,
      "recommendations": ["Intégrez plus de mots-clés ciblés"]
    }
  },
  "usage": {
    "tokens": 245,
    "model": "gpt-4"
  }
}
```

**Utilisation dans le code :**
```typescript
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

const { api } = useAuthenticatedApi();

const generateContent = async () => {
  const response = await api.post('/api/ai/generate-field', {
    fieldId: 'hero-title',
    fieldType: 'text',
    fieldLabel: 'Titre principal',
    aiContext: {
      sectionType: 'hero',
      businessType: 'agence web',
      tone: 'professionnel'
    }
  });
  
  console.log(response.content); // "Transformez votre vision..."
};
```

---

### 2️⃣ Génération de section complète

**Endpoint :** `POST /api/ai/generate-section`

**Description :** Génère le contenu complet d'une section en une seule fois.

**Request Body :**
```json
{
  "sectionType": "hero",
  "businessType": "agence web",
  "tone": "dynamique",
  "targetAudience": "startups",
  "language": "français",
  "keywords": ["innovation", "technologie", "croissance"],
  "includeImages": true
}
```

**Response :**
```json
{
  "success": true,
  "sectionType": "hero",
  "content": {
    "title": "Propulsez votre startup vers le succès",
    "subtitle": "Des solutions technologiques innovantes pour accélérer votre croissance",
    "ctaButtons": [
      {
        "text": "Démarrer maintenant",
        "url": "/contact",
        "variant": "primary"
      },
      {
        "text": "En savoir plus",
        "url": "/services",
        "variant": "secondary"
      }
    ],
    "media": {
      "type": "image",
      "url": "https://..."
    }
  },
  "usage": {
    "tokens": 687,
    "model": "gpt-4"
  }
}
```

**Utilisation dans le code :**
```typescript
const generateFullSection = async () => {
  const response = await api.post('/api/ai/generate-section', {
    sectionType: 'hero',
    businessType: 'agence web',
    tone: 'dynamique',
    targetAudience: 'startups',
    language: 'français',
    keywords: ['innovation', 'technologie']
  });
  
  // Appliquer le contenu généré à la section
  setContent(response.content);
};
```

---

### 3️⃣ Optimisation d'image

**Endpoint :** `POST /api/ai/optimize-image`

**Description :** Analyse une image et suggère des optimisations avec GPT-4 Vision.

**Request Body :**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "targetFormat": "webp",
  "quality": 85,
  "maxWidth": 1920,
  "maxHeight": 1080
}
```

**Response :**
```json
{
  "success": true,
  "originalUrl": "https://example.com/image.jpg",
  "analysis": {
    "description": "Image professionnelle d'une équipe en réunion",
    "suggestions": [
      "Recadrer pour mettre l'accent sur les visages",
      "Augmenter légèrement la luminosité",
      "Appliquer un filtre chaleureux"
    ],
    "accessibility": "Bonne lisibilité",
    "seoAlt": "Équipe collaborative travaillant sur un projet innovant"
  },
  "recommendations": {
    "format": "webp",
    "quality": 85,
    "dimensions": { "maxWidth": 1920, "maxHeight": 1080 }
  },
  "usage": {
    "tokens": 342,
    "model": "gpt-4-vision-preview"
  }
}
```

---

### 4️⃣ Suggestions de styles

**Endpoint :** `POST /api/ai/suggest-styles`

**Description :** Génère des variations de styles CSS pour une section.

**Request Body :**
```json
{
  "sectionType": "hero",
  "currentStyle": {
    "background": "#ffffff",
    "color": "#000000"
  },
  "brand": {
    "primaryColor": "#1890ff",
    "secondaryColor": "#52c41a",
    "fontFamily": "Inter"
  },
  "preferences": {
    "modern": true,
    "minimalist": true,
    "colorful": false
  }
}
```

**Response :**
```json
{
  "success": true,
  "sectionType": "hero",
  "suggestions": [
    {
      "name": "Moderne",
      "description": "Design épuré avec accent sur le contenu",
      "styles": {
        "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "color": "#ffffff",
        "padding": "100px 48px",
        "borderRadius": "0",
        "boxShadow": "none"
      }
    },
    {
      "name": "Élégant",
      "description": "Style sophistiqué avec contrastes subtils",
      "styles": {
        "background": "#f8f9fa",
        "color": "#212529",
        "padding": "80px 64px",
        "borderRadius": "16px",
        "boxShadow": "0 10px 40px rgba(0,0,0,0.1)"
      }
    },
    {
      "name": "Audacieux",
      "description": "Design impactant avec couleurs vives",
      "styles": {
        "background": "#1890ff",
        "color": "#ffffff",
        "padding": "120px 48px",
        "borderRadius": "0 0 50px 50px",
        "boxShadow": "0 20px 60px rgba(24, 144, 255, 0.3)"
      }
    }
  ],
  "usage": {
    "tokens": 521,
    "model": "gpt-4"
  }
}
```

---

## 🔧 INTÉGRATION DANS LES COMPOSANTS

### AIAssistButton.tsx

```typescript
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

const AIAssistButton = ({ fieldId, fieldType, aiContext, onGenerated }) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/ai/generate-field', {
        fieldId,
        fieldType,
        aiContext
      });
      
      onGenerated(response.content);
      message.success('Contenu généré avec succès !');
    } catch (error) {
      message.error('Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      icon={<ThunderboltOutlined />}
      loading={loading}
      onClick={handleGenerate}
    >
      ✨ Générer avec IA
    </Button>
  );
};
```

### AIContentGenerator.tsx

```typescript
const AIContentGenerator = ({ sectionType, onGenerated }) => {
  const { api } = useAuthenticatedApi();
  const [form] = Form.useForm();
  
  const handleSubmit = async (values) => {
    const response = await api.post('/api/ai/generate-section', {
      sectionType,
      ...values
    });
    
    onGenerated(response.content);
  };

  return (
    <Modal title="Générer avec l'IA" open={visible}>
      <Form form={form} onFinish={handleSubmit}>
        <Form.Item name="businessType" label="Type d'entreprise">
          <Input placeholder="Ex: agence web" />
        </Form.Item>
        <Form.Item name="tone" label="Ton">
          <Select>
            <Option value="professionnel">Professionnel</Option>
            <Option value="dynamique">Dynamique</Option>
            <Option value="amical">Amical</Option>
          </Select>
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Générer
        </Button>
      </Form>
    </Modal>
  );
};
```

---

## 🎯 EXEMPLES D'UTILISATION PAR SCÉNARIO

### Scénario 1 : User édite le titre d'un Hero

1. User ouvre UniversalSectionEditor pour un hero
2. Clique sur le ✨ à côté du champ "Titre"
3. `AIAssistButton` appelle `/api/ai/generate-field`
4. GPT-4 génère un titre accrocheur
5. User clique "Appliquer"
6. Le champ est rempli automatiquement

### Scénario 2 : User crée une nouvelle section

1. User clique "Ajouter une section" → Sélectionne "Services"
2. Modal `AIContentGenerator` s'ouvre
3. User remplit le formulaire (business type, tone, etc.)
4. Clique "Générer"
5. Appel à `/api/ai/generate-section`
6. GPT-4 génère toute la structure (titre, items, descriptions)
7. La section est créée avec le contenu généré

### Scénario 3 : User optimise une image

1. User upload une image dans ImageUploader
2. Clique "Optimiser avec IA"
3. Appel à `/api/ai/optimize-image`
4. GPT-4 Vision analyse l'image
5. Suggestions affichées (recadrage, luminosité, alt text)
6. User applique les suggestions

---

## 📊 COÛTS ET LIMITES

### Coûts OpenAI (approximatifs)

| Route | Modèle | Tokens moyen | Coût approximatif |
|-------|--------|--------------|-------------------|
| generate-field | GPT-4 | 200-500 | $0.01-0.03 |
| generate-section | GPT-4 | 500-1500 | $0.03-0.09 |
| optimize-image | GPT-4 Vision | 300-600 | $0.02-0.04 |
| suggest-styles | GPT-4 | 400-800 | $0.02-0.05 |

**Budget estimé :** ~$0.50/utilisateur/mois (usage moyen)

### Limites de rate

- OpenAI : 3,500 requests/min (tier 1)
- Recommandation : Implémenter un cache Redis pour les résultats fréquents

---

## 🔒 SÉCURITÉ

### Validation des inputs

```typescript
// Déjà implémenté dans les routes
if (!fieldId || !fieldType) {
  return res.status(400).json({ error: 'Paramètres manquants' });
}
```

### Rate limiting

```typescript
import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requêtes par minute max
  message: 'Trop de requêtes IA, réessayez dans 1 minute'
});

app.use('/api/ai/*', aiLimiter);
```

### Authentication

```typescript
// Middleware déjà présent dans api-server.ts
app.use('/api/ai/*', requireAuth);
```

---

## 🧪 TESTS

### Test manuel avec curl

```bash
# Test génération de champ
curl -X POST http://localhost:3000/api/ai/generate-field \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fieldId": "hero-title",
    "fieldType": "text",
    "aiContext": {
      "sectionType": "hero",
      "businessType": "agence web"
    }
  }'
```

### Test avec Postman

1. Importer la collection Postman (à créer)
2. Configurer l'environnement avec votre token
3. Exécuter les requêtes

---

## 🚀 PROCHAINES AMÉLIORATIONS

- [ ] Cache Redis pour résultats fréquents
- [ ] Support de Claude (Anthropic) en alternative
- [ ] Génération d'images avec Midjourney API
- [ ] A/B testing automatique du contenu généré
- [ ] Analytics sur la qualité des générations
- [ ] Fine-tuning sur le contenu existant du CRM

---

## 📞 SUPPORT

Pour toute question sur les routes IA :
- **Documentation OpenAI :** https://platform.openai.com/docs
- **Exemples de prompts :** Voir `buildFieldPrompt()` et `buildSectionPrompt()`
- **Debugging :** Activer `console.log` dans les routes

---

**Développé avec ❤️ pour le CRM 2Thier**
**Phase C - Système IA complet ✨**
