# 🤖 Guide d'utilisation - Assistant IA Gemini

## 📋 Vue d'ensemble

L'assistant IA est désormais pleinement fonctionnel et intégré dans le CRM. Il utilise Google Gemini pour fournir des analyses intelligentes et des suggestions d'amélioration.

---

## 🎨 1. Analyseur de sections Web

### Où le trouver ?
**Sections de site web** > **🎨 Sections** > Sélectionner une section > Cliquer sur l'icône **🤖 IA** ou **⚡ Optimiser**

### Ce qu'il fait
- Analyse la structure et le contenu de la section
- Évalue selon 4 critères :
  - 📐 **Layout** (disposition, grille, espacement)
  - 🎨 **Design** (couleurs, typographie, contraste)
  - 📝 **Contenu** (textes, CTA, messages)
  - ⚡ **UX** (navigation, conversion, accessibilité)

### Résultats fournis
```json
{
  "score": 78,  // Note sur 100
  "suggestions": [
    {
      "id": "hero-img-1",
      "category": "design",
      "type": "warning",
      "title": "Image de fond manquante",
      "description": "Une image de fond impactante augmente l'engagement de 45%",
      "impact": "high",
      "changes": { "backgroundImage": "url..." },
      "preview": {
        "before": "Aucune image",
        "after": "Image panoramique énergétique"
      }
    }
  ],
  "summary": {
    "strengths": ["Structure solide", "Titre accrocheur"],
    "weaknesses": ["CTA manquant", "Contraste faible"],
    "opportunities": ["Ajouter témoignages", "Optimiser mobile"]
  }
}
```

### Types de suggestions
- 🔴 **warning** : Problème important à corriger
- 🟡 **improvement** : Amélioration recommandée
- 🟢 **best-practice** : Bonne pratique à appliquer

### Niveaux d'impact
- 🔥 **high** : Impact majeur sur conversion/UX
- 🔶 **medium** : Amélioration notable
- 🔵 **low** : Optimisation mineure

---

## 💬 2. Chat conversationnel

### Où le trouver ?
**Partout dans le CRM** > Icône **🤖** dans le coin (si disponible)

### Ce qu'il fait
- Répond aux questions sur le CRM
- Aide à la prospection et qualification
- Propose des scripts d'appel
- Suggère des actions commerciales

### Exemples d'utilisation

#### 📞 Prospection
```
Utilisateur: "Comment appeler ce lead ?"
IA: Bonjour ! Pour Jean Dupont (Dupont SARL):
• 2 appels récents, dernière conversation positive
• Prochaine étape: relance technique

Script suggéré:
"Bonjour M. Dupont, Jonathan de 2Thier. Suite à notre échange 
de mardi, j'ai les détails techniques que vous attendiez..."

Questions de qualification:
1. "Quel est votre budget prévisionnel pour ce projet ?"
2. "Quand souhaitez-vous démarrer les travaux ?"

Action: Planifier RDV technique dans 3-5 jours ✅
```

#### 📊 Analyse page
```
Utilisateur: "Analyse la page Gmail"
IA: AUDIT PAGE GMAIL
✅ Points forts:
• Structure claire avec liste/détail
• Actions principales visibles

⚠️ Problèmes:
• Pas de skeleton loader au chargement
• Recherche limitée

💡 Améliorations:
• Ajouter filtres avancés (date, expéditeur, labels)
• Implémenter raccourcis clavier (j/k navigation)
• Sanitiser HTML emails (DOMPurify anti-XSS)

Quick wins (2h):
1. Skeleton loader au chargement
2. Message d'état vide/erreur
3. Boutons refresh explicite
```

---

## 🔧 3. Mode de fonctionnement

### Mode LIVE (Gemini actif)
✅ Clé API Gemini configurée dans `.env`
```env
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-1.5-flash"
```

**Avantages :**
- Analyses contextuelles et intelligentes
- Suggestions personnalisées
- Apprentissage continu

### Mode MOCK (Fallback)
⚠️ Si Gemini indisponible ou quota dépassé

**Avantages :**
- Aucune interruption de service
- Suggestions génériques mais utiles
- Aucun coût API

### Vérifier le mode actif
```bash
GET /api/ai/status

Response:
{
  "success": true,
  "data": {
    "mode": "live",  // ou "mock"
    "model": "gemini-1.5-flash",
    "timestamp": "2025-10-09T14:45:00Z"
  }
}
```

---

## 📡 4. Endpoints API disponibles

### Analyse de section
```bash
POST /api/ai/analyze-section
Content-Type: application/json

{
  "sectionType": "hero",
  "content": {
    "title": "Bienvenue",
    "description": "Notre solution",
    "image": "https://...",
    "ctaText": "En savoir plus"
  },
  "prompt": "(optionnel) prompt personnalisé"
}
```

### Chat conversationnel
```bash
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Comment qualifier ce lead ?",
  "context": {
    "currentPage": "LeadDetail",
    "currentModule": "leads",
    "userRole": "commercial",
    "lead": { ... }
  },
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

### Contexte système
```bash
GET /api/ai/context/summary?fields=modules,leads,events

GET /api/ai/context/lead/:leadId

GET /api/ai/context/leads?ids=id1,id2,id3
```

### Logs d'utilisation
```bash
GET /api/ai/usage/recent?limit=50&type=chat&success=true
```

---

## 🎯 5. Bonnes pratiques

### ✅ À faire
- Fournir le maximum de contexte (page, module, données lead)
- Utiliser l'historique conversationnel pour la continuité
- Vérifier le mode (live/mock) si besoin de précision maximale
- Tester les suggestions IA avant application massive

### ❌ À éviter
- Envoyer des données sensibles non nécessaires
- Faire confiance aveuglément aux suggestions
- Ignorer le score de confiance
- Appliquer toutes les suggestions sans discernement

---

## 📊 6. Métriques et monitoring

### Logs automatiques
Chaque appel IA est loggé dans `AiUsageLog`:
- Type d'endpoint utilisé
- Mode (live/mock)
- Latence
- Tokens consommés (si Gemini)
- Succès/échec

### Consulter les statistiques
```sql
SELECT 
  type,
  COUNT(*) as calls,
  AVG(latencyMs) as avg_latency,
  SUM(tokensPrompt + tokensOutput) as total_tokens,
  COUNT(CASE WHEN success THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM "AiUsageLog"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY type;
```

---

## 🔒 7. Sécurité et confidentialité

### Données envoyées à Gemini
- Contenu des sections (public)
- Messages utilisateur (contexte commercial)
- Métadonnées lead (anonymisées)

### Données NON envoyées
- Mots de passe
- Tokens d'authentification
- Données bancaires
- Informations personnelles sensibles

### Protection
- Authentification requise sur tous les endpoints
- Rate limiting sur les appels IA
- Logs d'audit complets
- Mode fallback si quota dépassé

---

## 🐛 8. Dépannage

### L'assistant ne répond pas
1. Vérifier le statut : `GET /api/ai/status`
2. Vérifier la clé API dans `.env`
3. Consulter les logs serveur : `npm run dev`
4. Vérifier le quota Gemini : [Google Cloud Console](https://console.cloud.google.com)

### Réponses génériques/peu pertinentes
- **Cause probable** : Mode mock actif
- **Solution** : Vérifier/renouveler la clé API Gemini

### Latence élevée (>5s)
- **Normal** : Première requête (cold start)
- **Si persistant** : Vérifier la connexion réseau ou quota API

### Erreur 500 sur /analyze-section
- Vérifier le format du `content` (objet JSON valide)
- Réduire la taille du contenu si >10KB
- Consulter logs : `console.error` côté serveur

---

## 📚 9. Ressources

### Documentation
- [Google Gemini API](https://ai.google.dev/docs)
- [Service GoogleGeminiService](./src/services/GoogleGeminiService.ts)
- [Routes AI](./src/routes/ai.ts)

### Exemples de code
```typescript
// Utiliser l'assistant dans un composant
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const MonComposant = () => {
  const { api } = useAuthenticatedApi();
  
  const analyserSection = async (section) => {
    const result = await api.post('/api/ai/analyze-section', {
      sectionType: section.type,
      content: section.content
    });
    
    console.log('Score:', result.score);
    console.log('Suggestions:', result.suggestions);
  };
};
```

---

## 🎉 10. Prochaines améliorations

### En cours
- ✅ Analyse de sections web (FAIT)
- ✅ Chat conversationnel (FAIT)
- ✅ Mode fallback mock (FAIT)

### Planifié
- 🔜 Génération automatique de contenu
- 🔜 Optimisation d'images IA
- 🔜 Suggestions de palette de couleurs
- 🔜 A/B testing automatique
- 🔜 Prédiction de conversion

### Idées futures
- 💡 Voix de l'assistant (text-to-speech)
- 💡 Analyse de sentiment des emails
- 💡 Recommandations produits intelligentes
- 💡 Auto-apprentissage sur vos données

---

**Version :** 1.0.0  
**Dernière mise à jour :** 9 octobre 2025  
**Auteur :** Équipe 2Thier + GitHub Copilot
