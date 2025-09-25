#!/usr/bin/env node
/*
  Script: repair-devis1minute-modules.cjs
  Objectif:
  - (Re)créer les catégories "Devis1minute" et "Devis1minute - Admin" si manquantes
  - (Re)créer les modules Devis1minute manquants
  - Réassigner tous les modules Devis1minute à la catégorie "Devis1minute"
  - Marquer les modules Admin comme superAdminOnly et les placer dans "Devis1minute - Admin"

  Usage:
    node scripts/repair-devis1minute-modules.cjs
*/

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function ensureCategory(name, { icon = 'AppstoreOutlined', iconColor = '#1890ff', order = 50, organizationId = null, active = true, superAdminOnly = false } = {}) {
  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) return existing;
  const created = await prisma.category.create({
    data: {
      id: randomUUID(),
      name,
      description: name,
      icon,
      iconColor,
      order,
      organizationId,
      active,
      superAdminOnly,
      updatedAt: new Date(),
    }
  });
  console.log(`✅ Catégorie créée: ${name} (${created.id})`);
  return created;
}

async function upsertModule(data) {
  const now = new Date();
  const existing = await prisma.module.findFirst({ where: { key: data.key } });
  // Sécurité: si une autre entrée existe déjà avec la même feature, on la met à jour au lieu de créer pour éviter un conflit d'unicité
  const existingByFeature = !existing ? await prisma.module.findFirst({ where: { feature: data.feature } }) : null;
  const payload = {
    key: data.key,
    label: data.label,
    feature: data.feature,
    icon: data.icon,
    route: data.route,
    description: data.description,
    page: data.page,
    order: data.order ?? 10,
    active: data.active ?? true,
    superAdminOnly: data.superAdminOnly ?? false,
    categoryId: data.categoryId ?? null,
    organizationId: data.organizationId ?? null,
    updatedAt: now,
  };
  if (!existing && !existingByFeature) {
    const created = await prisma.module.create({ data: { id: randomUUID(), ...payload, createdAt: now } });
    console.log(`  ➕ Module créé: ${created.label} (${created.key})`);
    return created;
  } else {
    const target = existing || existingByFeature;
    // Si collision par feature mais clé différente, on conserve la clé existante pour éviter conflit de clé
    if (existingByFeature && !existing) {
      payload.key = target.key; // conserver ancienne clé
    }
    const updated = await prisma.module.update({ where: { id: target.id }, data: payload });
    console.log(`  ♻️  Module mis à jour: ${updated.label} (${updated.key})`);
    return updated;
  }
}

// Déduplique les modules partageant la même feature: conserve un "module primaire"
// (idéalement celui avec la clé préférée) et désactive les autres (legacy)
async function dedupeByFeature(feature, {
  preferredKey,
  normalizeTo, // { label, icon, route, description, page, order, superAdminOnly, categoryId, active }
} = {}) {
  const all = await prisma.module.findMany({ where: { feature } });
  if (!all || all.length <= 1) return; // rien à dédupliquer

  // Choisir le module primaire
  let primary = preferredKey ? all.find(m => m.key === preferredKey) : null;
  if (!primary) primary = all[0];

  // Normaliser le module primaire avec les données attendues
  if (normalizeTo) {
    await prisma.module.update({
      where: { id: primary.id },
      data: {
        key: preferredKey || primary.key,
        label: normalizeTo.label ?? primary.label,
        icon: normalizeTo.icon ?? primary.icon,
        route: normalizeTo.route ?? primary.route,
        description: normalizeTo.description ?? primary.description,
        page: normalizeTo.page ?? primary.page,
        order: typeof normalizeTo.order === 'number' ? normalizeTo.order : (primary.order ?? 10),
        active: typeof normalizeTo.active === 'boolean' ? normalizeTo.active : (primary.active ?? true),
        superAdminOnly: typeof normalizeTo.superAdminOnly === 'boolean' ? normalizeTo.superAdminOnly : (primary.superAdminOnly ?? false),
        categoryId: normalizeTo.categoryId ?? primary.categoryId ?? null,
        updatedAt: new Date(),
      }
    });
  }

  // Désactiver/démarquer les autres comme legacy pour éviter les doublons d'affichage
  const legacy = all.filter(m => m.id !== primary.id);
  for (const m of legacy) {
    const legacyLabel = m.label && !m.label.toLowerCase().includes('legacy') ? `${m.label} (legacy)` : m.label || 'legacy';
    await prisma.module.update({
      where: { id: m.id },
      data: {
        active: false,
        superAdminOnly: true,
        label: legacyLabel,
        updatedAt: new Date(),
      }
    });
    console.log(`  🧹 Désactivé doublon legacy: ${legacyLabel} [${m.key}] (feature: ${feature})`);
  }
  console.log(`✅ Déduplication terminée pour feature "${feature}" – module principal: ${primary.key}`);
}

async function main() {
  console.log('🔧 Réparation des modules Devis1minute...');

  // 1) Catégories
  const generalCat = await ensureCategory('Devis1minute', { icon: 'ThunderboltOutlined', iconColor: '#fa8c16', order: 30, active: true, superAdminOnly: false });
  const adminCat = await ensureCategory('Devis1minute - Admin', { icon: 'SettingOutlined', iconColor: '#722ed1', order: 31, active: true, superAdminOnly: true });
  const proCat = await ensureCategory('Devis1minute - Pro', { icon: 'TeamOutlined', iconColor: '#13c2c2', order: 32, active: true, superAdminOnly: false });

  // 2) Modules généraux à assurer
  // Modules "internes" Devis1minute (non Pro): orientés pilotage/marketing -> rangés dans Admin
  const adminOrientedModules = [
    {
      key: 'lead-generation',
      label: 'Lead Generation',
      feature: 'lead_generation',
      icon: 'RocketOutlined',
      route: '/lead-generation',
      description: 'Générateur de campagnes publicitaires Google/Meta/TikTok',
      page: 'LeadGenerationPage',
      order: 20,
    },
    {
      key: 'public-forms',
      label: 'Formulaires Publics',
      feature: 'public_forms',
      icon: 'FormOutlined',
      route: '/forms',
      description: 'Gestion des formulaires de capture leads',
      page: 'PublicFormsPage',
      order: 23,
    },
    {
      key: 'landing-pages',
      label: 'Landing Pages',
      feature: 'landing_pages',
      icon: 'LayoutOutlined',
      route: '/landing-pages',
      description: 'Création de pages de destination no-code',
      page: 'LandingPagesPage',
      order: 24,
    },
    {
      key: 'campaign-analytics',
      label: 'Analytics Campagnes',
      feature: 'campaign_analytics',
      icon: 'BarChartOutlined',
      route: '/campaign-analytics',
      description: 'Analytics et performances des campagnes',
      page: 'CampaignAnalyticsPage',
      order: 25,
    }
  ];

  // Modules "Pro" (partenaires externes)
  const proModules = [
    {
      key: 'marketplace',
      label: 'Marketplace Leads',
      feature: 'marketplace',
      icon: 'ShoppingOutlined',
      route: '/marketplace',
      description: 'Achat et vente de leads qualifiés',
      page: 'MarketplacePage',
      order: 21,
    },
    {
      key: 'partner-portal',
      label: 'Espace Partenaire',
      feature: 'partner_portal',
      icon: 'TeamOutlined',
      route: '/partner/portal',
      description: 'Interface dédiée aux partenaires pros',
      page: 'PartnerPortalPage',
      order: 22,
    }
  ];

  console.log('📦 (Re)création des modules orientés Admin...');
  for (const mod of adminOrientedModules) {
    await upsertModule({ ...mod, categoryId: adminCat.id, active: true, superAdminOnly: true });
  }

  console.log('🤝 (Re)création des modules Pro...');
  for (const mod of proModules) {
    await upsertModule({ ...mod, categoryId: proCat.id, active: true, superAdminOnly: false });
  }

  // 3) Modules Admin (SuperAdminOnly)
  const adminModules = [
    {
      key: 'devis1minute_admin_dashboard',
      label: 'Tableau de bord Admin',
      feature: 'devis1minute_admin_dashboard',
      icon: 'DashboardOutlined',
      route: '/devis1minute/admin/dashboard',
      description: 'Tableau de bord administrateur Devis1minute',
      page: 'Devis1minuteAdminDashboard',
      order: 10,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_intake',
      label: 'Centre de tri des leads',
      feature: 'devis1minute_admin_intake',
      icon: 'InboxOutlined',
      route: '/devis1minute/admin/intake',
      description: 'Boîte de réception des leads entrants avant dispatch CRM/Partenaires',
      page: 'Devis1minuteAdminIntake',
      order: 12,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_dispatch',
      label: 'Règles de dispatch',
      feature: 'devis1minute_admin_dispatch',
      icon: 'PartitionOutlined',
      route: '/devis1minute/admin/dispatch',
      description: 'Moteur de règles et distribution automatique vers CRM/Partenaires',
      page: 'Devis1minuteAdminDispatch',
      order: 13,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_integrations',
      label: 'Intégrations & Connecteurs',
      feature: 'devis1minute_admin_integrations',
      icon: 'ApiOutlined',
      route: '/devis1minute/admin/integrations',
      description: 'Connecteurs API (Google, Meta, TikTok, Zapier/Make, etc.)',
      page: 'Devis1minuteAdminIntegrations',
      order: 14,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_site',
      label: 'Contenus du site',
      feature: 'devis1minute_admin_site',
      icon: 'EditOutlined',
      route: '/devis1minute/admin/site',
      description: 'CMS pour les pages publiques (texte, visuels, sections)',
      page: 'Devis1minuteAdminSite',
      order: 15,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_users',
      label: 'Gestion Utilisateurs Devis1minute',
      feature: 'devis1minute_admin_users',
      icon: 'UserOutlined',
      route: '/devis1minute/admin/users',
      description: 'Gestion des utilisateurs Devis1minute',
      page: 'Devis1minuteAdminUsers',
      order: 20,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_config',
      label: 'Configuration Devis1minute',
      feature: 'devis1minute_admin_config',
      icon: 'SettingOutlined',
      route: '/devis1minute/admin/config',
      description: 'Configuration système Devis1minute',
      page: 'Devis1minuteAdminConfig',
      order: 30,
      superAdminOnly: true,
    },
    {
      key: 'devis1minute_admin_reports',
      label: 'Rapports Admin',
      feature: 'devis1minute_admin_reports',
      icon: 'BarChartOutlined',
      route: '/devis1minute/admin/reports',
      description: 'Rapports administrateur Devis1minute',
      page: 'Devis1minuteAdminReports',
      order: 40,
      superAdminOnly: true,
    }
  ];

  console.log('🛠️  (Re)création des modules Admin...');
  for (const mod of adminModules) {
    await upsertModule({ ...mod, categoryId: adminCat.id, active: true });
  }

  // 4) Gérer les modules "my-leads" et "devis1minute-billing"
  // - my-leads: redondant avec la page Leads du CRM -> on le désactive
  // - billing: on le laisse pour l’instant en Admin pour gestion crédits/paiements
  await upsertModule({
    key: 'my-leads',
    label: 'Mes Leads',
    feature: 'my_leads',
    icon: 'UserOutlined',
    route: '/my-leads',
    description: 'Vue consolidée des leads (désactivée: utiliser la page Leads du CRM)',
    page: 'MyLeadsPage',
    order: 26,
    active: false,
    superAdminOnly: false,
    categoryId: generalCat.id,
  });

  await upsertModule({
    key: 'devis1minute-billing',
    label: 'Facturation Devis1Minute',
    feature: 'devis1minute_billing',
    icon: 'CreditCardOutlined',
    route: '/devis1minute/billing',
    description: 'Facturation, crédits et paiements',
    page: 'Devis1MinuteBillingPage',
    order: 27,
    active: true,
    superAdminOnly: true,
    categoryId: adminCat.id,
  });

  // 5) Déduplication des modules par feature (évite doublons: Landing, Forms, LeadGen, Analytics)
  await dedupeByFeature('landing_pages', {
    preferredKey: 'landing-pages',
    normalizeTo: {
      label: 'Landing Pages',
      icon: 'LayoutOutlined',
      route: '/landing-pages',
      description: 'Création de pages de destination no-code',
      page: 'LandingPagesPage',
      order: 24,
      active: true,
      superAdminOnly: true,
      categoryId: adminCat.id,
    }
  });
  await dedupeByFeature('public_forms', {
    preferredKey: 'public-forms',
    normalizeTo: {
      label: 'Formulaires Publics',
      icon: 'FormOutlined',
      route: '/forms',
      description: 'Gestion des formulaires de capture leads',
      page: 'PublicFormsPage',
      order: 23,
      active: true,
      superAdminOnly: true,
      categoryId: adminCat.id,
    }
  });
  await dedupeByFeature('campaign_analytics', {
    preferredKey: 'campaign-analytics',
    normalizeTo: {
      label: 'Analytics Campagnes',
      icon: 'BarChartOutlined',
      route: '/campaign-analytics',
      description: 'Analytics et performances des campagnes',
      page: 'CampaignAnalyticsPage',
      order: 25,
      active: true,
      superAdminOnly: true,
      categoryId: adminCat.id,
    }
  });
  await dedupeByFeature('lead_generation', {
    preferredKey: 'lead-generation',
    normalizeTo: {
      label: 'Lead Generation',
      icon: 'RocketOutlined',
      route: '/lead-generation',
      description: 'Générateur de campagnes publicitaires Google/Meta/TikTok',
      page: 'LeadGenerationPage',
      order: 20,
      active: true,
      superAdminOnly: true,
      categoryId: adminCat.id,
    }
  });

  console.log('\n✅ Réparation terminée. Ouvrez l\'Admin des Modules pour vérifier les catégories et modules.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur réparation Devis1minute:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
