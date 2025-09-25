import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Ajout/MAJ de la section "Informations client" dans le bloc Formulaire existant...');

  // 1) Récupérer tous les blocs (toutes organisations) pour trouver explicitement celui avec sections A/B/C
  const blocks = await prisma.block.findMany({
    include: { Section: true, Organization: true },
  });

  const normalize = (s?: string | null) => (s || '').trim().toLowerCase();
  const hasABC = (names: string[]) => {
    const set = new Set(names.map((n) => normalize(n)));
    return set.has('a') && set.has('b') && set.has('c');
  };
  const abcBlocks = blocks.filter((b) => hasABC(b.Section.map((s) => s.name)));
  const targets = abcBlocks.length > 0
    ? abcBlocks
    : blocks.filter((b) => normalize(b.name).includes('formulaire'));

  if (targets.length === 0) {
    console.error('❌ Aucun bloc correspondant (avec sections A/B/C ou nommé "formulaire") trouvé.');
    return;
  }

  console.log(`🧱 Blocs cibles: ${targets.map(t => `${t.name}(${t.id})`).join(', ')}`);

  // 3) Section + champs sur chaque bloc cible
  const sectionName = 'Informations client';
  type NewField = { label: string; type: string; required?: boolean; width?: string };
  const fields: NewField[] = [
    { label: 'Prénom', type: 'text', required: true, width: '50%' },
    { label: 'Nom', type: 'text', required: true, width: '50%' },
    { label: 'Société', type: 'text', width: '50%' },
    { label: 'Téléphone', type: 'text', width: '50%' },
    { label: 'Email', type: 'text', width: '100%' },
    { label: 'Adresse (ligne 1)', type: 'text', width: '100%' },
    { label: 'Adresse (ligne 2)', type: 'text', width: '100%' },
    { label: 'Code postal', type: 'text', width: '50%' },
    { label: 'Ville', type: 'text', width: '50%' },
    { label: 'Pays', type: 'text', width: '100%' },
  ];

  for (const block of targets) {
    console.log(`➡️ Traitement du bloc: ${block.name} (${block.id})`);
    let section = await prisma.section.findFirst({ where: { name: sectionName, blockId: block.id } });
    if (!section) {
      const maxOrder = await prisma.section.aggregate({ where: { blockId: block.id }, _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? 0) + 1;
      section = await prisma.section.create({ data: { name: sectionName, order: nextOrder, blockId: block.id, active: true } });
      console.log(`   📄 Section créée: ${section.name}`);
    } else {
      console.log(`   📄 Section existante: ${section.name}`);
    }

    const existingFieldsCount = await prisma.field.count({ where: { sectionId: section.id } });
    let order = existingFieldsCount + 1;
    for (const f of fields) {
      const found = await prisma.field.findFirst({ where: { sectionId: section.id, label: f.label } });
      if (found) {
        await prisma.field.update({ where: { id: found.id }, data: { type: f.type, required: !!f.required, width: f.width ?? '100%' } });
        console.log(`      🔁 Champ mis à jour: ${f.label}`);
      } else {
        await prisma.field.create({ data: { label: f.label, type: f.type, required: !!f.required, order: order++, sectionId: section.id, width: f.width ?? '100%' } });
        console.log(`      ✅ Champ créé: ${f.label}`);
      }
    }
  }

  console.log('🎉 Section "Informations client" ajoutée aux blocs cibles.');
}

main()
  .catch((e) => {
    console.error('💥 ERREUR:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
