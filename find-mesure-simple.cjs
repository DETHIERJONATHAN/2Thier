const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findMesureSimpleReferences() {
  try {
    console.log('🔍 Recherche de l\'option "Mesure simple"...\n');

    // 1. Chercher directement les nœuds avec le label "Mesure simple"
    const mesureSimpleNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: "Mesure simple",
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true,
        sharedReferenceId: true,
        sharedReferenceIds: true,
        value: true,
      },
    });

    console.log(`📌 Nœuds trouvés avec "Mesure simple": ${mesureSimpleNodes.length}\n`);

    for (const node of mesureSimpleNodes) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 NŒUD: "${node.label}"`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Type: ${node.type}`);
      console.log(`   Parent ID: ${node.parentId || "RACINE"}`);
      console.log(`   Value: ${node.value || "N/A"}`);
      console.log(`   Single Ref ID: ${node.sharedReferenceId || "AUCUN"}`);
      console.log(`   Array Refs: ${JSON.stringify(node.sharedReferenceIds)}`);

      // Vérifier les références partagées
      const refIds = new Set();
      if (node.sharedReferenceId) {
        refIds.add(node.sharedReferenceId);
      }
      if (node.sharedReferenceIds && Array.isArray(node.sharedReferenceIds)) {
        node.sharedReferenceIds.forEach((id) => refIds.add(id));
      }

      if (refIds.size === 0) {
        console.log("   ⚠️  Aucune référence partagée directe");
        
        // Chercher dans les enfants
        console.log("\n   🔍 Recherche dans les enfants...");
        const children = await prisma.treeBranchLeafNode.findMany({
          where: {
            parentId: node.id,
          },
          select: {
            id: true,
            label: true,
            type: true,
            sharedReferenceId: true,
            sharedReferenceIds: true,
          },
        });

        console.log(`   👶 Enfants trouvés: ${children.length}`);
        
        let totalChildRefs = 0;
        for (const child of children) {
          const childRefIds = new Set();
          if (child.sharedReferenceId) {
            childRefIds.add(child.sharedReferenceId);
          }
          if (child.sharedReferenceIds && Array.isArray(child.sharedReferenceIds)) {
            child.sharedReferenceIds.forEach((id) => childRefIds.add(id));
          }

          if (childRefIds.size > 0) {
            console.log(`      ✅ "${child.label}" (${child.type}): [${Array.from(childRefIds).join(', ')}]`);
            totalChildRefs += childRefIds.size;
            
            // Chercher les détails de chaque référence
            for (const refId of childRefIds) {
              const referencedNode = await prisma.treeBranchLeafNode.findUnique({
                where: { id: refId },
                select: {
                  id: true,
                  label: true,
                  fieldType: true,
                  isSharedReference: true,
                },
              });

              if (referencedNode) {
                console.log(`         → ${refId}: "${referencedNode.label}" (${referencedNode.fieldType || 'N/A'})`);
              } else {
                console.log(`         → ${refId}: INTROUVABLE`);
              }
            }
          } else {
            console.log(`      ❌ "${child.label}" (${child.type}): aucune référence`);
          }
        }
        
        if (totalChildRefs === 0) {
          console.log("   ⚠️  Aucune référence partagée dans les enfants non plus");
        } else {
          console.log(`   ✅ Total références trouvées dans les enfants: ${totalChildRefs}`);
        }

      } else {
        console.log(`   📦 ${refIds.size} référence(s) partagée(s) directe(s):`);

        // Chercher chaque référence dans TreeBranchLeafNode
        for (const refId of refIds) {
          const referencedNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: refId },
            select: {
              id: true,
              label: true,
              fieldType: true,
              isSharedReference: true,
            },
          });

          if (referencedNode) {
            console.log(`      → ${refId}: "${referencedNode.label}" (${referencedNode.fieldType || 'N/A'})`);
          } else {
            console.log(`      → ${refId}: INTROUVABLE`);
          }
        }
      }

      // Chercher le parent si c'est un enfant
      if (node.parentId) {
        console.log(`\n   🔼 Parent: ${node.parentId}`);
        const parent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: node.parentId },
          select: {
            id: true,
            label: true,
            type: true,
          },
        });

        if (parent) {
          console.log(`      → "${parent.label}" (${parent.type})`);
        }
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMesureSimpleReferences();