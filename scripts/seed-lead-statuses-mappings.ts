#!/usr/bin/env npx tsx
/**
 * Seed statuts d'appels, statuts de leads, mappings et sources.
 */
import { db } from '../src/lib/database';

const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const leadStatuses = [
  { name: 'Nouveau', color: '#1890ff', isDefault: true },
  { name: 'À qualifier', color: '#722ed1' },
  { name: 'En contact', color: '#13c2c2' },
  { name: 'RDV fixé', color: '#52c41a' },
  { name: 'Devis envoyé', color: '#fa8c16' },
  { name: 'Négociation', color: '#faad14' },
  { name: 'Gagné', color: '#237804' },
  { name: 'Perdu', color: '#f5222d' },
];

const callStatuses = [
  { name: 'À appeler', color: '#1890ff', isDefault: true },
  { name: 'Pas de réponse', color: '#faad14' },
  { name: 'Rappel demandé', color: '#13c2c2' },
  { name: 'RDV fixé', color: '#52c41a' },
  { name: 'Devis envoyé', color: '#fa8c16' },
  { name: 'Gagné', color: '#237804' },
  { name: 'Perdu', color: '#f5222d' },
  { name: 'Numéro invalide', color: '#8c8c8c' },
];

const leadSources = [
  { name: 'Formulaire en ligne', color: '#1890ff' },
  { name: 'Appel entrant', color: '#13c2c2' },
  { name: 'Recommandation', color: '#722ed1' },
  { name: 'Partenaire', color: '#fa8c16' },
  { name: 'Campagne Ads', color: '#f5222d' },
  { name: 'Email', color: '#2f54eb' },
  { name: 'Salon', color: '#52c41a' },
  { name: 'Autre', color: '#8c8c8c' },
];

const mappings: Array<{ call: string; lead: string }> = [
  { call: 'À appeler', lead: 'À qualifier' },
  { call: 'Pas de réponse', lead: 'En contact' },
  { call: 'Rappel demandé', lead: 'En contact' },
  { call: 'RDV fixé', lead: 'RDV fixé' },
  { call: 'Devis envoyé', lead: 'Devis envoyé' },
  { call: 'Gagné', lead: 'Gagné' },
  { call: 'Perdu', lead: 'Perdu' },
  { call: 'Numéro invalide', lead: 'Perdu' },
];

async function seedForOrg(organizationId: string) {
  // Lead statuses
  const leadStatusMap = new Map<string, string>();
  for (const [index, status] of leadStatuses.entries()) {
    const existing = await db.leadStatus.findFirst({
      where: { organizationId, name: status.name }
    });
    if (existing) {
      await db.leadStatus.update({
        where: { id: existing.id },
        data: {
          color: status.color,
          order: index + 1,
          isDefault: status.isDefault ?? false
        }
      });
      leadStatusMap.set(status.name, existing.id);
    } else {
      const created = await db.leadStatus.create({
        data: {
          id: generateId(),
          organizationId,
          name: status.name,
          color: status.color,
          order: index + 1,
          isDefault: status.isDefault ?? false,
          updatedAt: new Date()
        }
      });
      leadStatusMap.set(status.name, created.id);
    }
  }

  // Call statuses
  const callStatusMap = new Map<string, string>();
  for (const [index, status] of callStatuses.entries()) {
    const existing = await db.callStatus.findFirst({
      where: { organizationId, name: status.name }
    });
    if (existing) {
      await db.callStatus.update({
        where: { id: existing.id },
        data: {
          color: status.color,
          order: index + 1,
          isDefault: status.isDefault ?? false
        }
      });
      callStatusMap.set(status.name, existing.id);
    } else {
      const created = await db.callStatus.create({
        data: {
          id: generateId(),
          organizationId,
          name: status.name,
          color: status.color,
          order: index + 1,
          isDefault: status.isDefault ?? false,
          updatedAt: new Date()
        }
      });
      callStatusMap.set(status.name, created.id);
    }
  }

  // Lead sources
  for (const source of leadSources) {
    const existing = await db.leadSource.findFirst({
      where: { organizationId, name: source.name }
    });
    if (existing) {
      await db.leadSource.update({
        where: { id: existing.id },
        data: { color: source.color }
      });
    } else {
      await db.leadSource.create({
        data: {
          id: generateId(),
          organizationId,
          name: source.name,
          color: source.color,
          updatedAt: new Date()
        }
      });
    }
  }

  // Mappings
  for (const [index, map] of mappings.entries()) {
    const callStatusId = callStatusMap.get(map.call);
    const leadStatusId = leadStatusMap.get(map.lead);
    if (!callStatusId || !leadStatusId) continue;

    const existing = await db.callToLeadMapping.findFirst({
      where: { organizationId, callStatusId, leadStatusId }
    });

    if (existing) {
      await db.callToLeadMapping.update({
        where: { id: existing.id },
        data: {
          priority: index + 1,
          isActive: true,
          updatedAt: new Date()
        }
      });
    } else {
      await db.callToLeadMapping.create({
        data: {
          id: generateId(),
          organizationId,
          callStatusId,
          leadStatusId,
          priority: index + 1,
          isActive: true,
          updatedAt: new Date()
        }
      });
    }
  }
}

async function main() {
  const orgs = await db.organization.findMany();
  for (const org of orgs) {
    await seedForOrg(org.id);
  }
  console.log('✅ Statuts, mappings et sources ajoutés');
}

main().catch((err) => {
  console.error('❌ Erreur seed statuts:', err);
  process.exit(1);
});
