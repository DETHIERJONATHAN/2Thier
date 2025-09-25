import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type générique souple mais typé
type AnyObj = Record<string, unknown>;

const norm = (s: unknown) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

function suggestDbField(label: string | null | undefined, id?: string | null): string | '' {
  const ln = norm(label);
  const idn = norm(id);
  const hay = `${ln}|${idn}`;

  const has = (re: RegExp) => re.test(hay);

  // Lead-level direct fields
  if (has(/email|mail/)) return 'lead.email';
  if (has(/societe|entreprise|company/)) return 'lead.company';
  if (has(/site\s?web|website|web/)) return 'lead.website';
  if (has(/linkedin/)) return 'lead.linkedin';

  // Client data fields
  if (has(/prenom|first\s?name/)) return 'data.client.firstName';
  // "nom" seul = lastName
  if (has(/(^|[^a-z])nom([^a-z]|$)|last\s?name/)) return 'data.client.lastName';
  if (has(/telephone|tel\b|phone/)) return 'data.client.phone';
  if (has(/adresse.*(ligne\s*1|1)|address.*(line\s*1|1)/)) return 'data.client.address1';
  if (has(/adresse.*(ligne\s*2|2)|address.*(line\s*2|2)/)) return 'data.client.address2';
  if (has(/adresse|address/)) return 'data.client.address1'; // générique
  if (has(/code\s?postal|postal\s?code|zip/)) return 'data.client.postalCode';
  if (has(/ville|city/)) return 'data.client.city';
  if (has(/pays|country/)) return 'data.client.country';
  if (has(/siret/)) return 'data.client.siret';
  if (has(/tva|vat/)) return 'data.client.vatNumber';

  return '';
}

async function main() {
  console.log('🔧 Mapping automatique des dbField (champs Client)…');
  const fields = await prisma.field.findMany({ include: { Section: true } });

  let updated = 0;
  let skipped = 0;
  const total = fields.length;

  for (const f of fields) {
    try {
      // advancedConfig existant
      const ac: AnyObj = (typeof f.advancedConfig === 'object' && f.advancedConfig !== null) ? (f.advancedConfig as AnyObj) : {};

      // Ne pas écraser si déjà présent
      if (ac.dbField && typeof ac.dbField === 'string' && ac.dbField.trim().length > 0) {
        skipped++;
        continue;
      }

      const suggestion = suggestDbField(f.label, f.id);
      // Option: n’appliquer que si la Section évoque un bloc client/contact
      const sectionName = norm(f.Section?.name);
      const looksClientSection = /client|coordonnees|contact/.test(sectionName);

      if (suggestion && (looksClientSection || /lead\.|data\.client\./.test(suggestion))) {
        const nextAc = { ...ac, dbField: suggestion };
        await prisma.field.update({ where: { id: f.id }, data: { advancedConfig: nextAc } });
        updated++;
        console.log(`  ✅ ${f.label} → ${suggestion}`);
      } else {
        skipped++;
      }
    } catch (e) {
      console.warn(`  ⚠️  Skip ${f.id} (${f.label}) - ${String((e as Error)?.message || e)}`);
      skipped++;
    }
  }

  console.log(`✅ Terminé. Total: ${total}, mis à jour: ${updated}, ignorés: ${skipped}`);
}

main()
  .catch((e) => { console.error('❌ Échec mapping dbField', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
