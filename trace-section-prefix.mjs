import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceWhereComesSection() {
  console.log('🔍 TRAÇAGE: D\'OÙ VIENT "section-" ?\n');
  console.log('='.repeat(80));

  // 1. Le parent avec "section-"
  const sectionParent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'section-dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-1' },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true,
      metadata: true
    }
  });

  if (sectionParent) {
    console.log('\n📊 PARENT AVEC PRÉFIXE "section-":');
    console.log(`  ID: ${sectionParent.id}`);
    console.log(`  Label: ${sectionParent.label}`);
    console.log(`  Type: ${sectionParent.type}`);
    console.log(`  ParentId: ${sectionParent.parentId}`);
    console.log(`  Metadata:`, JSON.stringify(sectionParent.metadata, null, 2));
  }

  // 2. Le parent source
  const sourceParent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b' },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true
    }
  });

  if (sourceParent) {
    console.log('\n📊 PARENT SOURCE:');
    console.log(`  ID: ${sourceParent.id}`);
    console.log(`  Label: ${sourceParent.label}`);
    console.log(`  Type: ${sourceParent.type}`);
    console.log(`  ParentId: ${sourceParent.parentId}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 ANALYSE:\n');

  console.log('Le préfixe "section-" est ajouté par buildParentSuffix dans deep-copy-service.ts');
  console.log('Cette fonction est utilisée dans ensureExternalParentChain ligne 506:\n');
  console.log('  const suffixedParentId = buildParentSuffix(parentId);\n');
  
  console.log('buildParentSuffix (ligne 147):');
  console.log('  const base = value.replace(/-\\d+$/, \'\');');
  console.log('  return `${base}-${suffixToken}`;');
  console.log('\nMais elle ne devrait PAS ajouter "section-" !');
  console.log('Le préfixe doit venir d\'ailleurs...\n');

  // Chercher dans le code si "section-" est hardcodé
  console.log('💡 HYPOTHÈSE:');
  console.log('Le préfixe "section-" doit être ajouté quelque part dans le code');
  console.log('pour identifier les parents externes comme des "sections".\n');
  
  console.log('Regardons le type du parent:');
  if (sourceParent) {
    console.log(`  Type du parent source: ${sourceParent.type}`);
    console.log('\n  → Si type === "section", peut-être que le code préfixe avec "section-" ?');
  }
}

traceWhereComesSection()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
