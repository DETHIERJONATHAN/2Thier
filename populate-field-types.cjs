// Script pour peupler la table FieldType avec les types de champs standards
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const fieldTypes = [
  {
    id: '0be13076-43a3-4110-b68c-f6adbe8e9359',
    name: 'textarea',
    label: 'Texte long',
    has_options: false,
    has_subfields: false,
    config: { inputType: 'textarea', icon: '📝' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: '0fa0180a-0ea7-470f-930e-694afe98e643',
    name: 'advanced_select',
    label: 'Liste déroulante avancée',
    has_options: true,
    has_subfields: true,
    config: { icon: '🔽' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: '24f0bfe2-7a4f-4d54-a683-532e5ed60a76',
    name: 'radio',
    label: 'Boutons radio',
    has_options: true,
    has_subfields: false,
    config: { icon: '🔘' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: '42a179e2-599f-40b1-98d3-6323a4684be7',
    name: 'number',
    label: 'Nombre',
    has_options: false,
    has_subfields: false,
    config: { inputType: 'number', icon: '🔢' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: '591b419a-8b52-4fd9-8277-9b93177c228f',
    name: 'checkbox',
    label: 'Case à cocher',
    has_options: false,
    has_subfields: false,
    config: { icon: '☑️' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: '6d4a2ef0-497d-4e42-8059-80ebe3aaa787',
    name: 'checkboxes',
    label: 'Cases à cocher multiples',
    has_options: true,
    has_subfields: false,
    config: { icon: '☑️' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: '786ceb53-e7a2-4f00-9ee5-4e8be9e2c5f9',
    name: 'text',
    label: 'Texte',
    has_options: false,
    has_subfields: false,
    config: { inputType: 'text', icon: '🅰️' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  },
  {
    id: 'e94112b3-67ad-487a-aca4-f9814fad1b7a',
    name: 'select',
    label: 'Liste déroulante',
    has_options: true,
    has_subfields: false,
    config: { icon: '🔽' },
    createdAt: new Date('2025-06-18T07:28:27.456Z'),
    updatedAt: new Date('2025-06-18T07:28:27.456Z')
  }
];

async function populateFieldTypes() {
  try {
    console.log('🚀 Début de l\'insertion des types de champs...');

    // Nettoyer d'abord la table si elle existe
    await prisma.fieldType.deleteMany({});
    console.log('🧹 Table FieldType nettoyée');

    // Insérer tous les types
    for (const fieldType of fieldTypes) {
      const result = await prisma.fieldType.create({
        data: fieldType
      });
      console.log(`✅ Créé: ${result.name} (${result.label})`);
    }

    console.log(`\n🎉 Terminé ! ${fieldTypes.length} types de champs créés avec succès.`);
    console.log('🔄 Redémarrez votre application pour voir les changements.');

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des types de champs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateFieldTypes();
