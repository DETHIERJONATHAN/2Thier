# Instructions de Configuration Google OAuth

## Étapes pour connecter le CRM à Google Workspace

### 1. Créer un projet Google Cloud
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Aller dans "APIs & Services" > "Credentials"

### 2. Configurer OAuth 2.0
1. Cliquer sur "Create Credentials" > "OAuth 2.0 Client IDs"
2. Sélectionner "Web application"
3. Nommer votre application (ex: "CRM Google Integration")
4. Ajouter les URIs de redirection autorisées :
   - `http://localhost:5173/auth/google/callback` (développement)
   - `https://votre-domaine.com/auth/google/callback` (production)

### 3. Activer les APIs Google nécessaires
Dans "APIs & Services" > "Library", activer :
- Google Calendar API
- Gmail API
- Google Drive API
- Google Meet API (si disponible)
- Google Workspace Admin SDK

### 4. Configuration de votre fichier .env
Copier le fichier `.env.example` vers `.env` et remplir :
```bash
cp .env.example .env
```

Puis modifier les valeurs :
```env
GOOGLE_CLIENT_ID="votre-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="votre-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback"
```

### 5. Tester la connexion
1. Démarrer le serveur : `npm run dev`
2. Aller dans l'interface utilisateur
3. Accéder à "Profil" > "Connexions Google"
4. Cliquer sur "Connecter Google Workspace"

### 6. Scopes OAuth configurés
Le système demande les permissions suivantes :
- `https://www.googleapis.com/auth/calendar` (Calendrier)
- `https://www.googleapis.com/auth/gmail.readonly` (Gmail lecture)
- `https://www.googleapis.com/auth/gmail.send` (Envoi d'emails)
- `https://www.googleapis.com/auth/drive` (Google Drive)
- `https://www.googleapis.com/auth/meetings` (Google Meet)

### Points importants
- Les tokens sont stockés de manière sécurisée dans la base de données
- Le refresh automatique des tokens est géré par le système
- Chaque utilisateur peut connecter son propre compte Google
- Les permissions sont vérifiées au niveau organisationnel
