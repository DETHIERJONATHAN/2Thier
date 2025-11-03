#!/usr/bin/env node
/**
 * 🔍 Trouver le champ d'affichage orientation-inclinaison
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 RECHERCHE DU CHAMP ORIENTATION-INCLINAISON\n');

  try {
    // 1. Chercher par ID exact
    console.log('1️⃣ Recherche par ID exact "display-orientation-inclinaison"...');
    const byId = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'display-orientation-inclinaison' },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        subType: true,
        parentId: true,
        metadata: true
      }
    });

    if (byId) {
      console.log('✅ TROUVÉ par ID:');
      console.log(JSON.stringify(byId, null, 2));
      
      // Chercher le parent
      if (byId.parentId) {
        const parent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: byId.parentId },
          select: { id: true, label: true, type: true, metadata: true }
        });
        console.log('\n📁 Parent du champ:');
        console.log(`   Label: ${parent?.label}`);
        console.log(`   ID: ${parent?.id}`);
        console.log(`   Type: ${parent?.type}`);
        console.log(`   Est template? ${parent?.metadata?.sourceTemplateId ? '❌ NON (c\'est une copie)' : '✅ OUI'}`);
      }
    } else {
      console.log('❌ Non trouvé par ID exact');
    }

    // 2. Chercher par label
    console.log('\n2️⃣ Recherche par label contenant "orientation-inclinaison"...');
    const byLabel = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: { contains: 'orientation-inclinaison', mode: 'insensitive' }
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        parentId: true
      }
    });

    if (byLabel.length > 0) {
      console.log(`✅ Trouvé ${byLabel.length} résultat(s):`);
      for (const field of byLabel) {
        console.log(`\n   - ${field.label} (${field.id})`);
        console.log(`     Type: ${field.type}, FieldType: ${field.fieldType}`);
        console.log(`     ParentId: ${field.parentId}`);
      }
    } else {
      console.log('❌ Aucun résultat');
    }

    // 3. Chercher le répéteur Versant
    console.log('\n3️⃣ Recherche du répéteur Versant...');
    const versant = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { contains: 'Versant', mode: 'insensitive' },
        type: 'leaf_repeater'
      },
      select: {
        id: true,
        label: true,
        repeater_templateNodeIds: true,
        metadata: true
      }
    });

    if (versant) {
      console.log('✅ Répéteur Versant trouvé:');
      console.log(`   ID: ${versant.id}`);
      console.log(`   Label: ${versant.label}`);
      
      let templateIds = versant.repeater_templateNodeIds;
      if (typeof templateIds === 'string') {
        try {
          templateIds = JSON.parse(templateIds);
        } catch (e) {
          templateIds = [];
        }
      }
      
      console.log(`\n   Templates configurés (${templateIds?.length || 0}):`);
      if (Array.isArray(templateIds)) {
        for (const tid of templateIds) {
          const t = await prisma.treeBranchLeafNode.findUnique({
            where: { id: tid },
            select: { id: true, label: true }
          });
          console.log(`     - ${t?.label} (${t?.id})`);
          
          // Chercher les enfants du template
          const children = await prisma.treeBranchLeafNode.findMany({
            where: { parentId: tid },
            select: { id: true, label: true, type: true }
          });
          
          if (children.length > 0) {
            console.log(`       Enfants (${children.length}):`);
            for (const child of children) {
              const isDisplay = child.id.startsWith('display-');
              console.log(`         ${isDisplay ? '👁️ ' : '📝 '} ${child.label} (${child.id})`);
            }
          }
        }
      }
    }

    // 4. Vérifier les copies récentes de Versant
    console.log('\n4️⃣ Vérification des copies de templates...');
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['sourceTemplateId'],
          not: null
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📋 10 copies les plus récentes:`);
    for (const copy of copies) {
      console.log(`\n   ${copy.label} (${copy.id})`);
      console.log(`     sourceTemplateId: ${copy.metadata?.sourceTemplateId}`);
      console.log(`     parentId: ${copy.parentId}`);
      console.log(`     créé: ${copy.createdAt}`);
      
      // Chercher les enfants de cette copie
      const children = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: copy.id },
        select: { id: true, label: true }
      });
      
      if (children.length > 0) {
        console.log(`     Enfants (${children.length}):`);
        for (const child of children) {
          console.log(`       - ${child.label} (${child.id})`);
        }
      } else {
        console.log(`     ⚠️  AUCUN ENFANT !`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
