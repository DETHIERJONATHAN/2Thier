const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function addDevisSections() {
  try {
    console.log('🔍 Recherche du bloc existant...');
    
    // Trouver le bloc existant de l'organisation 2Thier CRM
    const existingBlock = await prisma.block.findFirst({
      where: {
        organizationId: '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'
      },
      include: {
        Section: {
          include: {
            Field: {
              include: {
                FieldOption: true
              }
            }
          }
        }
      }
    });

    if (!existingBlock) {
      console.log('❌ Aucun bloc trouvé pour cette organisation');
      return;
    }

    console.log(`✅ Bloc trouvé: ${existingBlock.name} (${existingBlock.id})`);
    console.log(`📊 Sections existantes: ${existingBlock.Section.length}`);

    if (existingBlock.Section.length > 0) {
      console.log('✅ Le bloc a déjà des sections:');
      existingBlock.Section.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.name} (${section.Field.length} champs)`);
      });
      return;
    }

    console.log('➕ Ajout de sections de test pour les devis...');

    // Créer des sections pour les devis
    const sectionsData = [
      {
        id: uuidv4(),
        name: 'Informations Client',
        active: true,
        order: 1,
        blockId: existingBlock.id,
        fields: [
          {
            id: uuidv4(),
            label: 'Nom de l\'entreprise',
            type: 'text',
            required: true,
            order: 1,
            width: 'full'
          },
          {
            id: uuidv4(),
            label: 'Personne de contact',
            type: 'text',
            required: true,
            order: 2,
            width: 'half'
          },
          {
            id: uuidv4(),
            label: 'Email',
            type: 'email',
            required: true,
            order: 3,
            width: 'half'
          },
          {
            id: uuidv4(),
            label: 'Téléphone',
            type: 'text',
            required: false,
            order: 4,
            width: 'half'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'Détails du Projet',
        active: true,
        order: 2,
        blockId: existingBlock.id,
        fields: [
          {
            id: uuidv4(),
            label: 'Type de projet',
            type: 'select',
            required: true,
            order: 1,
            width: 'full',
            options: [
              { id: uuidv4(), label: 'Installation solaire résidentielle', value: 'solar_residential', order: 1 },
              { id: uuidv4(), label: 'Installation solaire commerciale', value: 'solar_commercial', order: 2 },
              { id: uuidv4(), label: 'Rénovation énergétique', value: 'energy_renovation', order: 3 },
              { id: uuidv4(), label: 'Audit énergétique', value: 'energy_audit', order: 4 }
            ]
          },
          {
            id: uuidv4(),
            label: 'Surface approximative (m²)',
            type: 'number',
            required: false,
            order: 2,
            width: 'half'
          },
          {
            id: uuidv4(),
            label: 'Budget estimé (€)',
            type: 'currency',
            required: false,
            order: 3,
            width: 'half'
          },
          {
            id: uuidv4(),
            label: 'Description du projet',
            type: 'textarea',
            required: false,
            order: 4,
            width: 'full'
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'Équipements',
        active: true,
        order: 3,
        blockId: existingBlock.id,
        fields: [
          {
            id: uuidv4(),
            label: 'Liste des équipements',
            type: 'tableau',
            required: false,
            order: 1,
            width: 'full'
          }
        ]
      }
    ];

    // Créer les sections avec leurs champs
    for (const sectionData of sectionsData) {
      console.log(`📝 Création de la section: ${sectionData.name}`);
      
      const section = await prisma.section.create({
        data: {
          id: sectionData.id,
          name: sectionData.name,
          active: sectionData.active,
          order: sectionData.order,
          blockId: sectionData.blockId
        }
      });

      // Créer les champs pour cette section
      for (const fieldData of sectionData.fields) {
        console.log(`  ➕ Ajout du champ: ${fieldData.label}`);
        
        const field = await prisma.field.create({
          data: {
            id: fieldData.id,
            label: fieldData.label,
            type: fieldData.type,
            required: fieldData.required,
            order: fieldData.order,
            width: fieldData.width,
            sectionId: section.id
          }
        });

        // Ajouter les options si c'est un select
        if (fieldData.options) {
          for (const optionData of fieldData.options) {
            console.log(`    ⚡ Ajout de l'option: ${optionData.label}`);
            await prisma.fieldOption.create({
              data: {
                id: optionData.id,
                label: optionData.label,
                value: optionData.value,
                order: optionData.order,
                fieldId: field.id
              }
            });
          }
        }
      }
    }

    console.log('✅ Sections de devis créées avec succès !');
    
    // Vérifier le résultat
    const updatedBlock = await prisma.block.findUnique({
      where: { id: existingBlock.id },
      include: {
        Section: {
          orderBy: { order: 'asc' },
          include: {
            Field: {
              orderBy: { order: 'asc' },
              include: {
                FieldOption: {
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    console.log('📊 Structure finale du bloc:');
    updatedBlock.Section.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.name} (${section.Field.length} champs)`);
      section.Field.forEach((field, j) => {
        const optionsCount = field.FieldOption?.length || 0;
        console.log(`     ${j + 1}. ${field.label} [${field.type}${optionsCount > 0 ? `, ${optionsCount} options` : ''}]`);
      });
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDevisSections();
