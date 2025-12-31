/**
 * Script pour sauvegarder manuellement les données du formulaire actuel
 * Comme le fait l'autosave pour les devis
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche du dernier devis/submission en mode draft...\n');

  // Trouver la dernière submission en draft pour l'utilisateur
  const latestSubmission = await prisma.treeBranchLeafSubmission.findFirst({
    where: {
      status: 'draft'
    },
    orderBy: {
      updatedAt: 'desc'
    },
    select: {
      id: true,
      treeId: true,
      leadId: true,
      status: true,
      updatedAt: true,
      TreeBranchLeafSubmissionData: {
        select: {
          nodeId: true,
          value: true,
          TreeBranchLeafNode: {
            select: {
              label: true,
              type: true
            }
          }
        }
      }
    }
  });

  if (!latestSubmission) {
    console.log('❌ Aucune submission en draft trouvée');
    console.log('\n💡 Pour sauvegarder les données du formulaire actuel:');
    console.log('   1. Ouvre le formulaire dans le navigateur');
    console.log('   2. Remplis les champs');
    console.log('   3. L\'autosave se déclenchera automatiquement après 800ms');
    console.log('   4. Ou clique sur "Enregistrer" manuellement');
    return;
  }

  console.log('✅ Submission trouvée:');
  console.log(`   ID: ${latestSubmission.id}`);
  console.log(`   Tree ID: ${latestSubmission.treeId}`);
  console.log(`   Lead ID: ${latestSubmission.leadId || 'Non défini'}`);
  console.log(`   Status: ${latestSubmission.status}`);
  console.log(`   Dernière mise à jour: ${latestSubmission.updatedAt.toLocaleString('fr-FR')}`);
  console.log(`   Nombre de champs: ${latestSubmission.TreeBranchLeafSubmissionData.length}\n`);

  console.log('📊 Données sauvegardées:\n');
  
  latestSubmission.TreeBranchLeafSubmissionData.forEach((data, index) => {
    console.log(`${index + 1}. ${data.TreeBranchLeafNode?.label || 'Sans label'}`);
    console.log(`   Type: ${data.TreeBranchLeafNode?.type || 'inconnu'}`);
    console.log(`   NodeId: ${data.nodeId}`);
    console.log(`   Valeur: ${data.value}`);
    console.log('');
  });

  console.log(`\n✅ Total: ${latestSubmission.TreeBranchLeafSubmissionData.length} champs sauvegardés`);
  
  console.log('\n💡 Pour voir ces données dans l\'interface:');
  console.log('   1. Va sur la page Devis');
  console.log(`   2. Ouvre le devis avec leadId: ${latestSubmission.leadId || 'le dernier en draft'}`);
  console.log('   3. Toutes les valeurs devraient être chargées\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
