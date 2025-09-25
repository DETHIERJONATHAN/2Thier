## Secrets et protections GitHub

Configurez ces éléments dans le dépôt GitHub (Settings > Secrets and variables > Actions) :

- DATABASE_URL
- JWT_SECRET
- SESSION_SECRET
- FRONTEND_URL
- API_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GOOGLE_AI_API_KEY
- GEMINI_MODEL (optionnel)
- AI_MODE (auto | force-live | force-mock)
- AI_MAX_RETRIES (optionnel)
- AI_TIMEOUT_MS (optionnel)
- AI_RETRY_TIMEOUT_INCREMENT_MS (optionnel)
- GOOGLE_PROJECT_ID (si Pub/Sub)
- TELNYX_API_KEY (si voix/SMS)
- TELNYX_WEBHOOK_SIGNING_SECRET (si webhooks)

Protections de branche (Settings > Branches > Branch protection rules) :

- Protéger la branche main
- Exiger des PRs (Require a pull request before merging)
- Interdire le force-push et la suppression
- Exiger le statut vert du workflow CI

Astuce: Créez un environnement GitHub "production" avec des secrets d’env env-specifiques si nécessaire.
