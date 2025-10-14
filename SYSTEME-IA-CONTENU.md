# 🤖 Système de Génération de Contenu IA

## Vue d'ensemble

Le système de génération de contenu IA utilise **Google Gemini** pour créer automatiquement du contenu optimisé pour vos sites web (Site Vitrine 2Thier, Devis1Minute, etc.).

## ✨ Fonctionnalités

### Option A : Génération de contenu individuel

#### 1. Services
Génère le contenu complet d'un service :
- Titre accrocheur
- Description persuasive
- Liste de 4 caractéristiques
- Call-to-action pertinent
- Icône Ant Design suggérée
- Slug technique

**Endpoint:** `POST /api/ai-content/generate-service`

**Exemple de requête:**
```json
{
  "siteName": "2Thier",
  "industry": "transition énergétique",
  "serviceType": "Installation de panneaux photovoltaïques",
  "keywords": ["énergie", "économie", "écologique"]
}
```

**Exemple de réponse:**
```json
{
  "success": true,
  "content": {
    "key": "panneaux-photovoltaiques",
    "icon": "ThunderboltOutlined",
    "title": "Panneaux Photovoltaïques",
    "description": "Installation de panneaux solaires haute performance pour réduire vos factures",
    "features": [
      "Panneaux jusqu'à 440 Wp",
      "Garantie 25-30 ans",
      "Monitoring en temps réel",
      "Primes et déductions fiscales"
    ],
    "ctaText": "Demander un devis gratuit"
  }
}
```

#### 2. Projets
Génère le contenu d'un projet réalisé :
- Titre technique
- Localisation
- Description détaillée
- Tags pertinents

**Endpoint:** `POST /api/ai-content/generate-project`

#### 3. Témoignages
Génère un témoignage client réaliste :
- Nom du client (belge francophone)
- Localisation
- Service utilisé
- Note (toujours 5/5)
- Témoignage détaillé et authentique

**Endpoint:** `POST /api/ai-content/generate-testimonial`

### Option B : Génération de page complète

Génère tout le contenu d'une page d'accueil :
- Titre et sous-titre Hero
- Call-to-actions
- Meta title, description, keywords
- Texte "À propos"

**Endpoint:** `POST /api/ai-content/generate-page`

**Exemple:**
```json
{
  "siteName": "2Thier Energy",
  "siteType": "vitrine",
  "industry": "transition énergétique",
  "mainServices": ["Photovoltaïque", "Pompes à chaleur", "Isolation"],
  "targetAudience": "Propriétaires en Wallonie"
}
```

### Option C : Optimisation SEO

Analyse un contenu existant et propose des améliorations SEO :
- Meta title optimisé
- Meta description persuasive
- Mots-clés pertinents
- Liste d'améliorations concrètes

**Endpoint:** `POST /api/ai-content/optimize-seo`

## 🎨 Interface utilisateur

### Composant `AIContentAssistant`

Composant React réutilisable qui affiche un bouton "✨ Générer avec l'IA" et ouvre un modal avec un formulaire.

**Utilisation:**
```tsx
import AIContentAssistant from '../components/AIContentAssistant';

<AIContentAssistant
  type="service"
  siteName="2Thier"
  industry="transition énergétique"
  onContentGenerated={(content) => {
    // Utiliser le contenu généré
    form.setFieldsValue(content);
  }}
/>
```

**Props:**
- `type`: 'service' | 'project' | 'testimonial' | 'page' | 'seo'
- `siteName`: Nom du site (défaut: '2Thier')
- `industry`: Secteur d'activité (défaut: 'transition énergétique')
- `onContentGenerated`: Callback avec le contenu généré
- `buttonText`: Texte du bouton (optionnel)
- `currentContent`: Contenu actuel pour le type 'seo' (optionnel)

## 📍 Accès dans l'application

### Menu drapeau (🏴)
1. Cliquez sur l'icône drapeau en haut à droite
2. Sélectionnez "⚙️ Gérer les sites web"
3. Vous accédez à la page d'administration

### Page d'administration (`/admin/sites-web`)
- Liste de tous les sites web
- Bouton "🤖 Générer un nouveau site" pour créer un site complet avec l'IA
- Onglets pour chaque type de contenu :
  - **Services** : Générer des services avec l'IA
  - **Projets** : Générer des projets avec l'IA
  - **Témoignages** : Générer des témoignages avec l'IA
  - **SEO** : Optimiser le référencement avec l'IA

## 🔧 Architecture technique

### Backend

**Service:** `src/services/aiContentService.ts`
- Classe `AIContentService` qui utilise `GoogleGeminiService`
- Méthodes pour chaque type de génération
- Prompts optimisés pour des réponses JSON structurées

**Routes:** `src/api/ai-content.ts`
- 6 endpoints REST
- Validation des paramètres
- Gestion des erreurs

**Intégration:** `src/api-server-clean.ts`
```typescript
import aiContentRouter from './api/ai-content';
app.use('/api/ai-content', aiContentRouter);
```

### Frontend

**Hook:** `src/hooks/useAuthenticatedApi.ts`
- Utilisé pour tous les appels API
- Gère l'authentification automatiquement

**Composant:** `src/components/AIContentAssistant.tsx`
- Modal avec formulaire dynamique selon le type
- Affichage du contenu généré
- Bouton "Utiliser ce contenu"

**Page Admin:** `src/pages/admin/WebsitesAdminPage.tsx`
- Tableau de gestion des sites
- Intégration des assistants IA dans les onglets
- Réservée au Super Admin

## 🚀 Workflow complet

### Créer un nouveau service avec l'IA

1. Accédez à `/admin/sites-web`
2. Cliquez sur "Éditer" pour un site
3. Allez dans l'onglet "Services"
4. Cliquez sur "✨ Générer avec l'IA"
5. Remplissez le formulaire :
   - Type de service : "Installation de panneaux photovoltaïques"
   - Mots-clés : "énergie, économie, écologique"
6. Cliquez sur "Générer avec l'IA"
7. L'IA génère le contenu en quelques secondes
8. Vérifiez le résultat
9. Cliquez sur "Utiliser ce contenu"
10. Le contenu est appliqué au formulaire
11. Sauvegardez

### Optimiser le SEO d'une page

1. Accédez à `/admin/sites-web`
2. Éditez un site
3. Allez dans l'onglet "SEO"
4. Cliquez sur "✨ Générer avec l'IA"
5. Collez le contenu de votre page
6. Ajoutez des mots-clés cibles (optionnel)
7. L'IA analyse et propose des améliorations
8. Appliquez les suggestions

## 🎯 Avantages

✅ **Gain de temps** : Génération en quelques secondes
✅ **Cohérence** : Ton professionnel et structure optimisée
✅ **SEO** : Contenu optimisé pour le référencement naturellement
✅ **Qualité** : Prompts affinés pour des résultats pertinents
✅ **Flexibilité** : Personnalisation via les paramètres

## 📊 Exemples de prompts utilisés

### Service
```
Tu es un expert en rédaction web et marketing pour le secteur {industry}.
Génère le contenu complet d'un service pour le site "{siteName}".
Type de service : {serviceType}
Mots-clés à inclure : {keywords}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "key": "identifiant-technique-du-service (slug, kebab-case)",
  "icon": "Nom d'une icône Ant Design pertinente",
  ...
}
```

Le prompt complet contient des règles strictes pour garantir :
- Ton professionnel
- Orientation bénéfices client
- Optimisation SEO naturelle
- Format JSON exact

## 🔐 Sécurité

- Endpoints protégés par authentification
- Page admin réservée au Super Admin
- Rate limiting sur les appels API
- Validation des inputs côté backend

## 🚧 Évolution future

- [ ] Génération d'images avec DALL-E
- [ ] Traduction multilingue automatique
- [ ] A/B testing automatique de contenus
- [ ] Génération de scripts marketing
- [ ] Suggestions de mots-clés SEO avancées
- [ ] Analyse de la concurrence
- [ ] Génération de posts réseaux sociaux

## 📝 Notes techniques

- **Modèle IA** : Google Gemini 1.5 Flash
- **Format de réponse** : JSON structuré
- **Timeout** : 30 secondes par requête
- **Longueur max** : ~1000 tokens par génération
- **Langue** : Français (Belgique)

## 🆘 Support

Si l'IA génère du contenu non conforme :
1. Vérifiez les paramètres d'entrée
2. Essayez de reformuler la demande
3. Utilisez des mots-clés plus précis
4. Contactez le support technique

---

**Créé le** : 8 octobre 2025  
**Version** : 1.0.0  
**Auteur** : 2Thier CRM - Système IA
