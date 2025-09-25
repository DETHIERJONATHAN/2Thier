const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const fields = await prisma.formField.findMany({
      where: {
        OR: [
          { label: { contains: 'compteur intelligent', mode: 'insensitive' } },
          { label: { contains: 'terre aux normes', mode: 'insensitive' } },
          { label: { contains: 'présence du couteau de terre', mode: 'insensitive' } },
          { label: { contains: 'compteur', mode: 'insensitive' } },
          { label: { contains: 'terre', mode: 'insensitive' } },
          { label: { contains: 'couteau', mode: 'insensitive' } }
        ]
      },
      include: {
        options: true
      },
      orderBy: { order: 'asc' }
    });

    console.log('=== CHAMPS TROUVÉS ===');
    fields.forEach(field => {
      console.log(`📋 ID: ${field.id} | Label: ${field.label} | Type: ${field.type} | Options: ${field.options.length}`);
      field.options.forEach((opt, i) => {
        console.log(`   ${i+1}. ${opt.label} (value: ${opt.value})`);
      });
      console.log('---');
    });

    // Cherchons aussi tous les champs après "prix kilowattheure"
    const prixKwhField = await prisma.formField.findFirst({
      where: { label: { contains: 'Prix Kw/h', mode: 'insensitive' } }
    });

    if (prixKwhField) {
      console.log('\n=== CHAMPS APRÈS Prix Kw/h ===');
      const fieldsAfter = await prisma.formField.findMany({
        where: {
          order: { gt: prixKwhField.order }
        },
        include: {
          options: true
        },
        orderBy: { order: 'asc' },
        take: 10 // Les 10 suivants
      });

      fieldsAfter.forEach(field => {
        console.log(`📋 ID: ${field.id} | Label: ${field.label} | Type: ${field.type} | Order: ${field.order} | Options: ${field.options.length}`);
        field.options.forEach((opt, i) => {
          console.log(`   ${i+1}. ${opt.label} (value: ${opt.value})`);
        });
        console.log('---');
      });
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
