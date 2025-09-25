const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function configurerTableauAvecExemples() {
  try {
    // Configuration complète avec colonnes et templates
    const configCompleteTableau = {
      columns: [
        { key: "nom", label: "Nom du produit", type: "text" },
        { key: "quantite", label: "Quantité", type: "number" },
        { key: "prix_unitaire", label: "Prix unitaire", type: "currency" },
        { key: "total", label: "Total", type: "currency" }
      ],
      templates: [
        {
          name: "Panneaux solaires",
          description: "Gamme standard de panneaux photovoltaïques",
          data: [
            { nom: "Panneau 300W", quantite: 10, prix_unitaire: 250, total: 2500 },
            { nom: "Panneau 400W", quantite: 8, prix_unitaire: 320, total: 2560 },
            { nom: "Panneau 500W", quantite: 6, prix_unitaire: 420, total: 2520 }
          ]
        },
        {
          name: "Onduleurs",
          description: "Onduleurs selon puissance",
          data: [
            { nom: "Onduleur 3kW", quantite: 1, prix_unitaire: 1200, total: 1200 },
            { nom: "Onduleur 5kW", quantite: 1, prix_unitaire: 1800, total: 1800 },
            { nom: "Onduleur 10kW", quantite: 1, prix_unitaire: 3200, total: 3200 }
          ]
        },
        {
          name: "Installation",
          description: "Éléments d'installation",
          data: [
            { nom: "Fixations toiture", quantite: 1, prix_unitaire: 450, total: 450 },
            { nom: "Câblage DC", quantite: 100, prix_unitaire: 2.5, total: 250 },
            { nom: "Protection AC", quantite: 1, prix_unitaire: 180, total: 180 }
          ]
        }
      ]
    };

    // Mise à jour du champ tableau
    const result = await prisma.fieldType.updateMany({
      where: { name: 'tableau' },
      data: {
        config: configCompleteTableau
      }
    });

    console.log(`✅ Champ tableau configuré avec exemples complets !`);
    console.log(`📊 Configuration appliquée:`);
    console.log(`   • ${configCompleteTableau.columns.length} colonnes`);
    console.log(`   • ${configCompleteTableau.templates.length} templates`);
    console.log(`   • ${configCompleteTableau.templates.reduce((acc, t) => acc + t.data.length, 0)} lignes d'exemples au total`);

    // Affichage détaillé
    console.log('\n📋 Colonnes configurées:');
    configCompleteTableau.columns.forEach((col, i) => {
      console.log(`   ${i+1}. ${col.label} (${col.key}) - Type: ${col.type}`);
    });

    console.log('\n🎯 Templates configurés:');
    configCompleteTableau.templates.forEach((template, i) => {
      console.log(`   ${i+1}. ${template.name} - ${template.data.length} ligne(s)`);
      console.log(`      ${template.description}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

configurerTableauAvecExemples();
