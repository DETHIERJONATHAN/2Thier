## Déploiement Docker

1) Variables d’environnement
- Copiez `.env.production.example` en `.env` et remplissez les secrets.
- Vérifiez la connectivité `DATABASE_URL`.

2) Build et run (Docker / Compose)
- Build local (optionnel): `docker build -t 2thier/crm:local .`
- Compose: `docker compose up -d --build`

3) GitHub Container Registry (CI)
- Workflow `.github/workflows/docker-publish.yml` construit et pousse l’image vers `ghcr.io/<owner>/<repo>/crm` à chaque push sur main.
- Configurez les permissions de Packages et déployez avec votre orchestrateur (VM, Swarm, k8s).

4) Réseau / Reverse Proxy
- Exposez le port 4000 derrière Nginx/Traefik. Activez HTTPS.
- FRONTEND_URL doit pointer vers votre domaine applicatif.
