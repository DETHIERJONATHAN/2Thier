/**
 * 🔍 Recherche de tous les champs avec formule pour trouver les anciens qui fonctionnent
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findWorkingFields() {
  try {
    console.log('\n🔍 Recherche de TOUS les champs avec formules...\n');

    const allFields = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { hasFormula: true },
          { TreeBranchLeafNodeFormula: { some: {} } }
        ]
      },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`✅ Trouvé ${allFields.length} champs avec formules\n`);

    // Chercher spécifiquement "M² de la toiture"
    const m2ToitureField = allFields.find(f => f.label && f.label.includes('M²') && f.label.includes('toiture'));
    
    if (m2ToitureField) {
      console.log('🎯 ===== CHAMP "M² de la toiture" =====');
      console.log(`Label: "${m2ToitureField.label}"`);
      console.log(`ID: ${m2ToitureField.id}`);
      console.log(`Créé le: ${m2ToitureField.createdAt}`);
      console.log(`tbl_capacity: ${m2ToitureField.tbl_capacity}`);
      console.log(`tbl_code: "${m2ToitureField.tbl_code}"`);
      console.log(`A une variable: ${!!m2ToitureField.TreeBranchLeafNodeVariable}`);
      console.log(`Nombre de formules: ${m2ToitureField.TreeBranchLeafNodeFormula.length}\n`);
    }

    console.log('\n📋 Liste de TOUS les champs avec formules (du plus ancien au plus récent):\n');

    allFields.forEach((field, i) => {
      const age = new Date() - new Date(field.createdAt);
      const ageJours = Math.floor(age / (1000 * 60 * 60 * 24));
      
      console.log(`${i + 1}. "${field.label || 'Sans nom'}"`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Âge: ${ageJours} jours (créé le ${new Date(field.createdAt).toLocaleDateString('fr-FR')})`);
      console.log(`   tbl_capacity: ${field.tbl_capacity}`);
      console.log(`   A variable: ${!!field.TreeBranchLeafNodeVariable ? '✅' : '❌'}`);
      console.log(`   Formules: ${field.TreeBranchLeafNodeFormula.length}`);
      
      if (field.TreeBranchLeafNodeVariable) {
        console.log(`   → sourceType: "${field.TreeBranchLeafNodeVariable.sourceType}"`);
      }
      console.log('');
    });

    console.log('\n💡 RECOMMANDATION:');
    console.log('Les champs les plus ANCIENS sont ceux qui ont le plus de chances de fonctionner.');
    console.log('Choisissez-en un pour le comparer avec "M² de la toiture".');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findWorkingFields();
