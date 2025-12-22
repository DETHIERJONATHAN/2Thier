/**
 * Script pour ajouter le module "Gérer les documents" dans la catégorie Administration
 * Exécuter avec : npx ts-node add-documents-module.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDocumentsModule() {
  try {
    console.log('🚀 Ajout du module "Gérer les documents"...');

    // 1. Trouver la catégorie "Administration" ou "Admin"
    const adminCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { contains: 'Administration', mode: 'insensitive' } },
          { name: { contains: 'Admin', mode: 'insensitive' } }
        ]
      }
    });

    if (!adminCategory) {
      console.error('❌ Catégorie "Administration" non trouvée!');
      console.log('📋 Catégories disponibles:');
      const categories = await prisma.category.findMany({
        select: { id: true, name: true }
      });
      categories.forEach(cat => console.log(`  - ${cat.name} (${cat.id})`));
      return;
    }

    console.log(`✅ Catégorie trouvée: ${adminCategory.name} (${adminCategory.id})`);

    // 2. Vérifier si le module existe déjà
    const existingModule = await prisma.module.findFirst({
      where: {
        OR: [
          { key: 'documents_admin' },
          { feature: 'documents_admin' },
          { route: '/admin/documents' }
        ]
      }
    });

    if (existingModule) {
      console.log('⚠️ Module déjà existant, mise à jour...');
      const updated = await prisma.module.update({
        where: { id: existingModule.id },
        data: {
          label: 'Gérer les documents',
          feature: 'documents_admin',
          icon: 'FileTextOutlined',
          route: '/admin/documents',
          description: 'Créer et gérer les modèles de documents PDF (devis, factures, contrats)',
          order: 50,
          active: true,
          superAdminOnly: true,
          categoryId: adminCategory.id,
          updatedAt: new Date()
        }
      });
      console.log('✅ Module mis à jour:', updated.id);
    } else {
      // 3. Créer le nouveau module
      const newModule = await prisma.module.create({
        data: {
          id: 'documents-admin-module-' + Date.now(),
          key: 'documents_admin',
          label: 'Gérer les documents',
          feature: 'documents_admin',
          icon: 'FileTextOutlined',
          route: '/admin/documents',
          description: 'Créer et gérer les modèles de documents PDF (devis, factures, contrats)',
          order: 50,
          active: true,
          superAdminOnly: true,
          categoryId: adminCategory.id,
          organizationId: null, // Module global
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Module créé:', newModule.id);
    }

    // 4. Afficher le résultat
    console.log('\n📄 Module "Gérer les documents" configuré:');
    console.log('   - Route: /admin/documents');
    console.log('   - Icône: FileTextOutlined');
    console.log('   - SuperAdmin uniquement: OUI');
    console.log(`   - Catégorie: ${adminCategory.name}`);
    console.log('\n✅ Terminé! Le menu devrait maintenant apparaître dans le dropdown Admin.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
addDocumentsModule();
