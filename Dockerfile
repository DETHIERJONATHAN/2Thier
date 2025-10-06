# --- Base node image
FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencies layer
FROM base AS deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# --- Build layer (frontend)
FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate \
	&& npm run build \
	&& npm prune --omit=dev

# --- Runtime layer
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# System deps and tsx runner
RUN apk add --no-cache openssl libc6-compat \
	&& npm i -g tsx

# Copy built artifacts and production node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY ./src ./src
COPY ./prisma ./prisma
COPY ./scripts ./scripts

# Expose port
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

# Start API server (serves API + static dist)
ENV PGHOST=/cloudsql/thiernew:europe-west1:crm-db
ENV PGDATABASE=2thier
ENV PGUSER=postgres
CMD ["tsx", "./src/api-server-clean.ts"]
