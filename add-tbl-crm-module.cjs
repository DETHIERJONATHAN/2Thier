const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureCategory(name) {
  let cat = await prisma.category.findFirst({ where: { name } });
  if (!cat) {
    cat = await prisma.category.create({
      data: {
        name,
        icon: 'AppstoreOutlined',
        iconColor: '#2563eb',
        order: 50,
        active: true,
  // Prisma: Category.updatedAt is required
  updatedAt: new Date(),
      }
    });
    console.log('✅ Catégorie créée:', cat.name);
  } else {
    console.log('ℹ️ Catégorie existante:', cat.name);
  }
  return cat;
}

async function upsertTBL(categoryId) {
  const key = 'tbl';
  const route = '/module-tbl';
  const label = 'TBL';
  const feature = 'TBL';
  // Utiliser une icône FontAwesome reconnue par la Sidebar (fallback dynamique supporté)
  const icon = 'FaTree';

  const existing = await prisma.module.findFirst({ where: { OR: [ { key }, { route } ] } });
  if (existing) {
    const updated = await prisma.module.update({
      where: { id: existing.id },
      data: {
        key,
        label,
        feature,
        icon,
        route,
        description: 'TreeBranchLeaf – Rendu utilisateur (Modules CRM)',
        active: true,
        order: 12,
        categoryId,
    // keep timestamps fresh
    updatedAt: new Date(),
      }
    });
    console.log('🔄 Module TBL mis à jour:', updated.id);
    return updated;
  }
  const created = await prisma.module.create({
    data: {
  id: `tbl-${Date.now()}`,
      key,
      label,
      feature,
      icon,
      route,
      description: 'TreeBranchLeaf – Rendu utilisateur (Modules CRM)',
      active: true,
      order: 12,
      categoryId,
    // Prisma: Module.updatedAt is required
    updatedAt: new Date(),
    }
  });
  console.log('➕ Module TBL créé:', created.id);
  return created;
}

(async () => {
  try {
    console.log('🚀 Ajout/MAJ du module TBL dans la catégorie "Modules CRM"...');
    const cat = await ensureCategory('Modules CRM');
    await upsertTBL(cat.id);
  } catch (e) {
    console.error('❌ Erreur ajout TBL:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
