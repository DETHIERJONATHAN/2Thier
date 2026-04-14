# Zhiive

## The Living Hive

Zhiive is a living digital ecosystem where users and companies interact through social activity, messaging, geolocation, navigation, visibility, events, client transparency and business workflows.

This repository contains the current full-stack application behind that vision: a React 19 + Vite 6 frontend, an Express 5 API, a Prisma/PostgreSQL data layer, a PWA setup, and a growing set of social, spatial and operational modules.

The project still carries part of its historical 2Thier CRM/ERP foundation, especially on the business and workflow side. Zhiive builds on that base to move toward a broader product: social-first, spatially aware, operationally powerful.

## Product Overview

Zhiive brings together capabilities that are usually split across separate tools:

- Social activity: wall, stories, reels, follows, reactions, Hive Live
- Communication: messenger, calls, notifications, real-time interactions
- Spatial presence: Wax map, proximity, pins, navigation, geolocated activity
- Events and participation: Arena, tournaments, local interactions
- Business operations: leads, quotes, documents, signatures, chantier tracking, invoices, expenses, websites, forms, AI-assisted workflows

The product ambition is simple: create a living hive where user activity creates density, density creates visibility, and visibility creates value for companies.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite 6 |
| UI | Ant Design 5 + Tailwind CSS |
| Backend | Express 5 on Node.js 20 |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + Google OAuth 2.0 |
| Realtime | Socket.IO |
| i18n | react-i18next (FR/EN) |
| Tests | Vitest |
| PWA | vite-plugin-pwa / Workbox |
| CI/CD | GitHub Actions -> Cloud Build -> Cloud Run |

## Repository Snapshot

- Unified full-stack app: one repo, one frontend, one backend, one Prisma schema
- Express serves both the API and the production frontend build
- PWA-ready frontend with manual code splitting, gzip/brotli compression and dynamic manifest handling
- Domain-rich backend covering social, messaging, websites, AI, documents, invoices, expenses, calendar, Peppol and more
- Strong code conventions around database access, authenticated API usage, identity handling, logging and theming

## Quick Start

Prerequisites:

- Node.js 20
- npm
- PostgreSQL / Cloud SQL access depending on your environment

Install dependencies:

```bash
npm install
```

Recommended local startup:

```bash
bash scripts/start-local.sh
```

This script is the preferred entry point when you need the full local environment, including the database proxy and the API/client pair.

If your environment is already configured, you can also run:

```bash
npm run dev
```

Expected local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

For local connection details, Cloud Run deployment notes and troubleshooting, see [CONNECTION-GENERALE.md](./CONNECTION-GENERALE.md).

## Key Commands

```bash
# Development
npm run dev
npm run dev:server
npm run dev:client

# Quality
npm run test
npm run lint

# Build
npm run build
npm run start
```

## Project Structure

```text
src/
├── api-server-clean.ts     # Unified Express API/server entry point
├── auth/                   # Authentication and identity handling
├── components/             # Shared UI components and large feature systems
├── contexts/               # React contexts
├── hooks/                  # Custom hooks and API access patterns
├── i18n/                   # FR/EN translations
├── lib/                    # Core infrastructure utilities
├── pages/                  # Application pages
├── routes/                 # Express route modules
├── services/               # Domain services
└── utils/                  # Shared helpers
prisma/
├── schema.prisma           # Main data model
├── migrations/             # Database migrations
└── seed.ts                 # Seed entry points
tests/                      # Vitest test suite
scripts/                    # Tooling, DB scripts, diagnostics and helpers
```

## Engineering Conventions

- Database: always import `db` from `@/lib/database`; never instantiate `new PrismaClient()` in feature code
- API access: prefer `useAuthenticatedApi()` over direct `fetch`
- Identity: use the shared identity helpers and context instead of duplicating local role/mode logic
- Logging: use `logger` from `@/lib/logger`
- i18n: use `t('key')` instead of hardcoded UI text
- Theme: use shared theme tokens such as `SF.*` and `FB.*`

## Documentation

- Product and positioning: [ZHIIVE-PRESENTATION.md](./ZHIIVE-PRESENTATION.md)
- Local setup and deployment: [CONNECTION-GENERALE.md](./CONNECTION-GENERALE.md)

## Status

Zhiive is an active, ambitious codebase with a strong historical business core and an expanding product surface. Some repository areas still reflect the older 2Thier naming and architecture, but the direction is now clearly centered on Zhiive as a living social and operational platform.

---

© 2025-2026 Zhiive (2Thier)
