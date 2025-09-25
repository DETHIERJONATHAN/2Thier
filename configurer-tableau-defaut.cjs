const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function configurerTableau() {
  try {
    // Configuration par défaut pour un tableau simple
    const config = {
      columns: [
        { key: "nom", label: "Nom", type: "text" },
        { key: "quantite", label: "Quantité", type: "number" },
        { key: "prix_unitaire", label: "Prix unitaire", type: "currency" },
        { key: "total", label: "Total", type: "currency" }
      ],
      templates: [
        {
          name: "Exemple de base",
          description: "Modèle de démarrage pour un tableau simple",
          data: [
            { nom: "Produit 1", quantite: 1, prix_unitaire: 100, total: 100 },
            { nom: "Produit 2", quantite: 2, prix_unitaire: 50, total: 100 }
          ]
        }
      ]
    };

    // Mise à jour du champ tableau
    const result = await prisma.fieldType.updateMany({
      where: { name: 'tableau' },
      data: {
        config: config
      }
    });

    console.log(`✅ Champ tableau configuré ! (${result.count} mise(s) à jour)`);
    console.log('Configuration appliquée:', JSON.stringify(config, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

configurerTableau();
