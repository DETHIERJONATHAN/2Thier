# ==============================================================================
# DOCKERFILE OPTIMISÉ POUR CLOUD RUN - CRM 2THIER
# ==============================================================================
# Multi-stage build pour réduire la taille finale et accélérer le build
# Compatible avec Cloud Run et buildpacks

# ------------------------------------------------------------------------------
# STAGE 1: Base - Image Node.js Alpine (légère)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app

# Installer les dépendances système nécessaires pour Prisma et autres packages natifs
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    libc6-compat

# ------------------------------------------------------------------------------
# STAGE 2: Dependencies - Installation des dépendances NPM
# ------------------------------------------------------------------------------
FROM base AS deps

# Copier uniquement les fichiers de dépendances pour profiter du cache Docker
COPY package.json package-lock.json ./

# Installer les dépendances en mode production (plus rapide et moins de packages)
# --legacy-peer-deps pour gérer les conflits de dépendances
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# ------------------------------------------------------------------------------
# STAGE 3: Build - Génération du client Prisma et build de l'application
# ------------------------------------------------------------------------------
FROM base AS builder

# Copier les dépendances depuis le stage précédent
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci --legacy-peer-deps

# Copier le code source
COPY . .

# Générer le client Prisma
# DATABASE_URL dummy car on n'a pas besoin de connexion pour generate
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Build de l'application (backend + frontend)
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 4: Runner - Image finale de production (minimale)
# ------------------------------------------------------------------------------
FROM base AS runner

# Variables d'environnement de production
ENV NODE_ENV=production \
    PORT=8080

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

# Copier uniquement les fichiers nécessaires en production
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/dist-server ./dist-server
COPY --from=builder --chown=nodeuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./package.json

# Copier le client Prisma généré
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Passer à l'utilisateur non-root
USER nodeuser

# Exposer le port 8080 (standard Cloud Run)
EXPOSE 8080

# Healthcheck pour vérifier que le serveur répond
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "dist-server/api-server-clean.cjs"]
