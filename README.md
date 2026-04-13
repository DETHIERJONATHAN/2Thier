# 2Thier CRM/ERP – Plateforme de gestion énergétique évolutive

## 🚀 Présentation
2Thier est un CRM/ERP nouvelle génération dédié à la rénovation énergétique, pensé pour être totalement pilotable, personnalisable et évolutif. Il s’agit d’un écosystème complet de gestion client/chantier, bien au-delà d’un simple CRM ou logiciel de devis. L’objectif : permettre à tout utilisateur de créer, modifier et faire évoluer son propre outil sans jamais avoir besoin de coder.

## 🧩 Fonctionnalités principales

### 1. Modules Bâtiment (Blocs duplicables)
- Gestion de blocs représentant chaque partie d’un chantier (maison, annexe, garage, etc.)
- Blocs duplicables, modifiables, supprimables, activables pour différents métiers
- Formulaires dynamiques ultra-complets (texte, nombre, listes, cases à cocher, choix multiples, conditions d’apparition, calculs, etc.)
- Calculs automatiques (ex : puissance, coût annuel, ROI, etc.)

### 2. Générateur de formulaires avancé
- Création de formulaires personnalisés par l’utilisateur (no-code)
- Champs conditionnels (apparition/disparition selon valeurs, opérateurs logiques, etc.)
- Calculs entre champs (additions, multiplications, conditions complexes)
- Interface “Excel-like” pour la logique et la visualisation

### 3. Pages modulaires & Sidebar dynamique
- Ajout/suppression de pages par l’admin
- Ajout de modules sur chaque page (tableaux, formulaires, graphiques, etc.)
- Personnalisation totale de l’interface

### 4. Intégrations & modules fonctionnels
- Leads & attribution (Bobex, Solvari)
- Téléphonie (Telnyx)
- Messagerie (One.com)
- Calendrier partagé & gestion des rôles
- Génération automatique de devis/factures (PDF, e-mail)
- Brochure interactive & signature électronique
- Espace client sécurisé
- Suivi de chantier (photos, statuts, validations)
- Tableau de bord analytique (CA, taux de conversion, satisfaction, etc.)
- IA d’aide à la saisie et recommandations (cross-selling, rappels, etc.)
- Gestion admin (modification des champs, types de travaux, utilisateurs, exports)

## 🖥️ Technologies utilisées
- **React** (dernier standard)
- **Vite** (build ultra-rapide)
- **TypeScript**
- **TailwindCSS** (UI moderne et responsive)
- **State management** (Zustand, Redux ou équivalent)
- **API REST/GraphQL** (pour la persistance et l’intégration)
- **Authentification sécurisée**
- **PDF generation** (pour devis/factures)
- **Intégration IA** (pour l’aide utilisateur et recommandations)

## 🎨 Design & UX
- Interface inspirée d’Excel (tableaux, logique conditionnelle, calculs visuels)
- Sidebar dynamique pour la navigation et la création de pages
- UI moderne, épurée, responsive (voir [exemple visuel](https://01c371dd-f4ad-4898-83e9-08201e55df1b-00-3a114fpxeenmr.kirk.replit.dev/))
- Expérience no-code : tout utilisateur peut créer ses propres formulaires, pages, modules et calculs

## 🛠️ Installation & démarrage
```powershell
# Cloner le projet
git clone <repo-url>
cd crm2thier-vite

# Installer les dépendances
npm install

# Lancer le projet en développement
npm run dev
```

## 📌 Priorités de développement
1. Intégration complète du formulaire bloc bâtiment
2. Système de leads + attribution + Telnyx
3. Connexion mails One.com
4. Générateur de devis automatique + brochure
5. Signature électronique
6. Espace client
7. Suivi de chantier + photos
8. Facturation
9. IA cross-selling
10. Statistiques globales

## 🤝 Contribution
Toute contribution est la bienvenue ! Merci de proposer vos idées, corrections ou améliorations via issues ou pull requests.

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript + Vite 6 |
| UI | Ant Design 5 + Tailwind CSS |
| Backend | Express 5 (Node.js) |
| Base de données | PostgreSQL (Google Cloud SQL) + Prisma ORM |
| Auth | JWT + Google OAuth 2.0 |
| i18n | react-i18next (FR/EN) |
| Tests | Vitest + 1210+ tests |
| CI/CD | GitHub Actions → Cloud Build → Cloud Run |
| PWA | vite-plugin-pwa (Workbox) |

## 📂 Structure du projet

```
src/
├── api-server-clean.ts   # Serveur API Express
├── auth/                 # Authentification (useAuth, JWT)
├── components/           # Composants React réutilisables
├── contexts/             # Contexts React (ActiveIdentity, etc.)
├── hooks/                # Hooks personnalisés (useAuthenticatedApi, etc.)
├── i18n/                 # Internationalisation (fr.json, en.json)
├── lib/                  # Utilitaires (database.ts, logger.ts)
├── pages/                # Pages de l'application
├── routes/               # Routes API Express
├── services/             # Services métier
└── utils/                # Utilitaires partagés
prisma/
├── schema.prisma         # Schéma de la base de données
├── migrations/           # Migrations Prisma
└── seed.ts               # Données de seed
tests/                    # Tests Vitest
```

## 🚀 Démarrage rapide

```bash
# Prérequis : Node.js 20+, accès Cloud SQL proxy
# 1. Installer les dépendances
npm install

# 2. Lancer l'environnement complet (proxy DB + frontend + backend)
bash scripts/start-local.sh

# 3. Résultat :
#   🌐 Frontend: http://localhost:5173
#   🔧 Backend:  http://localhost:4000
```

## 🧪 Tests

```bash
# Lancer tous les tests
npx vitest run

# Mode watch
npx vitest

# Couverture
npx vitest run --coverage
```

## 📦 Build & Déploiement

```bash
# Build frontend + backend
npm run build

# Le déploiement se fait automatiquement via GitHub Actions
# sur push vers main → Cloud Build → Cloud Run
```

## 🔑 Conventions de code

- **DB** : Toujours utiliser `import { db } from '@/lib/database'` (jamais `new PrismaClient()`)
- **API** : Toujours utiliser `useAuthenticatedApi()` (jamais `fetch` directement)
- **Identité** : Toujours utiliser `useActiveIdentity()` (jamais calculer `isOrgMode` localement)
- **Logs** : Toujours utiliser `import { logger } from '@/lib/logger'` (jamais `console.log`)
- **i18n** : Toujours utiliser `t('clé')` (jamais de texte français en dur)
- **Thème** : Toujours utiliser `SF.*`, `FB.*` depuis ZhiiveTheme (jamais de hex en dur)

## 🧠 Philosophie
Le but est de rendre Zhiive totalement évolutif, scalable et modulable, pour que chaque utilisateur puisse l'adapter à ses besoins sans jamais dépendre d'un développeur. L'intelligence artificielle viendra en support pour guider, automatiser et optimiser l'expérience.

---

© 2025-2026 Zhiive (2Thier) – Tous droits réservés.
