#!/usr/bin/env npx tsx
/**
 * 🔧 Backfill des leads depuis les soumissions de formulaires
 * Remplit nom/email/téléphone/adresse si manquants.
 */

import { db } from '../src/lib/database';

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(v => String(v)).join(' ').trim();
  return String(value).trim();
};

const extractFromFormData = (formData: unknown, keys: string[]): string => {
  if (!formData) return '';
  const direct = formData as Record<string, unknown>;
  for (const key of keys) {
    const directValue = normalizeString(direct[key]);
    if (directValue) return directValue;
  }

  const formDataObj = formData as Record<string, Record<string, unknown> | unknown>;
  for (const stepValue of Object.values(formDataObj)) {
    if (stepValue && typeof stepValue === 'object' && !Array.isArray(stepValue)) {
      for (const key of keys) {
        const nestedValue = normalizeString((stepValue as Record<string, unknown>)[key]);
        if (nestedValue) return nestedValue;
      }
    }
  }
  return '';
};

async function main() {
  const submissions = await db.website_form_submissions.findMany({
    where: { leadId: { not: null } },
    orderBy: { createdAt: 'desc' },
  });

  let updated = 0;
  for (const submission of submissions) {
    if (!submission.leadId) continue;
    const lead = await db.lead.findUnique({ where: { id: submission.leadId } });
    if (!lead) continue;

    const formData = submission.formData as Record<string, unknown>;
    const firstName = lead.firstName || extractFromFormData(formData, ['firstName', 'prenom', 'prénom']);
    const lastName = lead.lastName || extractFromFormData(formData, ['lastName', 'nom']);
    const email = lead.email || extractFromFormData(formData, ['email', 'mail', 'e-mail']);
    const phone = lead.phone || extractFromFormData(formData, ['phone', 'telephone', 'téléphone', 'gsm', 'mobile']);
    const address = extractFromFormData(formData, ['address', 'adresse', 'street', 'rue']);

    const hasUpdates = !!(firstName !== lead.firstName || lastName !== lead.lastName || email !== lead.email || phone !== lead.phone || address);
    if (!hasUpdates) continue;

    await db.lead.update({
      where: { id: lead.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        data: {
          ...((lead.data as Record<string, unknown>) || {}),
          firstName,
          lastName,
          email,
          phone,
          address,
        }
      }
    });

    updated += 1;
  }

  console.log(`✅ Leads mis à jour: ${updated}`);
}

main().catch((error) => {
  console.error('❌ Erreur backfill:', error);
  process.exit(1);
});
