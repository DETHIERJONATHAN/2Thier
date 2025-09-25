const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function ajouterTypesManquants() {
    console.log('🔧 AJOUT DES TYPES MANQUANTS DANS FieldType\n');

    const nouveauxTypes = [
        {
            id: randomUUID(),
            name: 'image_user',
            label: 'Image utilisateur',
            has_options: false,
            updatedAt: new Date(),
            config: {
                acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                maxSize: 5 * 1024 * 1024, // 5MB
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.8
            }
        },
        {
            id: randomUUID(),
            name: 'image_admin',
            label: 'Image administrateur',
            has_options: false,
            updatedAt: new Date(),
            config: {
                acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                maxSize: 10 * 1024 * 1024, // 10MB
                maxWidth: 2560,
                maxHeight: 1440,
                quality: 0.9
            }
        },
        {
            id: randomUUID(),
            name: 'fichier_user',
            label: 'Fichier utilisateur',
            has_options: false,
            updatedAt: new Date(),
            config: {
                acceptedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
                maxSize: 20 * 1024 * 1024, // 20MB
                allowMultiple: false
            }
        },
        {
            id: randomUUID(),
            name: 'produit',
            label: 'Produit',
            has_options: true,
            updatedAt: new Date(),
            config: {
                sourceTable: 'products',
                valueField: 'id',
                labelField: 'name',
                descriptionField: 'description',
                priceField: 'price',
                searchable: true
            }
        },
        {
            id: randomUUID(),
            name: 'donnee',
            label: 'Donnée',
            has_options: false,
            updatedAt: new Date(),
            config: {
                readonly: true,
                computed: true,
                source: 'database',
                format: 'auto'
            }
        }
    ];

    try {
        console.log('📝 Ajout des nouveaux types...\n');
        
        for (const type of nouveauxTypes) {
            try {
                const created = await prisma.fieldType.create({
                    data: type
                });
                console.log(`✅ ${type.name} (${type.label}) créé avec ID: ${created.id}`);
            } catch (error) {
                if (error.code === 'P2002') {
                    console.log(`⚠️  ${type.name} existe déjà`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n🔍 VÉRIFICATION FINALE...');
        
        // Vérifier que tous les types sont maintenant disponibles
        const tousLesTypes = await prisma.fieldType.findMany({
            orderBy: { label: 'asc' }
        });
        
        console.log(`\n📋 TYPES DISPONIBLES MAINTENANT (${tousLesTypes.length} total):`);
        tousLesTypes.forEach(type => {
            console.log(`   • ${type.name} : ${type.label} (options: ${type.has_options})`);
        });

        console.log('\n✅ TOUS LES CHAMPS SONT MAINTENANT DISPONIBLES dans l\'interface !');
        console.log('🚀 Rechargez l\'interface des formulaires pour voir les nouveaux types.');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

ajouterTypesManquants();
