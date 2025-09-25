import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TYPES: Array<{
  name: string;
  label: string;
  has_options?: boolean;
  has_subfields?: boolean;
  config?: Record<string, unknown> | null;
}> = [
  { name: 'donnee', label: 'Donnée', has_options: false, config: { icon: 'Σ', hidden: true } },
  { name: 'produit', label: 'Produit', has_options: false, config: { icon: '🛒' } },
  { name: 'image_admin', label: 'Image (admin)', has_options: false, config: { icon: '🖼️' } },
  { name: 'image_user', label: 'Image (utilisateur)', has_options: false, config: { icon: '📷' } },
  { name: 'fichier_user', label: 'Fichier (utilisateur)', has_options: false, config: { icon: '📎' } },
  { name: 'advanced_select', label: 'Liste déroulante avancée', has_options: true, config: { icon: '🔽✨' } },
];

async function main() {
  console.log('🔧 Seeding FieldType…');
  for (const t of TYPES) {
    await prisma.fieldType.upsert({
      where: { name: t.name },
      update: {
        label: t.label,
        has_options: Boolean(t.has_options),
        has_subfields: Boolean(t.has_subfields),
        config: t.config ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: t.name, // id = name pour stabilité
        name: t.name,
        label: t.label,
        has_options: Boolean(t.has_options),
        has_subfields: Boolean(t.has_subfields),
        config: t.config ?? undefined,
        updatedAt: new Date(),
      },
    });
    console.log(`  ✅ ${t.name}`);
  }
  console.log('✅ FieldType seed terminé');
}

main()
  .catch((e) => { console.error('❌ Seed FieldType échoué', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
