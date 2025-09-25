const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierTypesChamps() {
    console.log('🔍 VÉRIFICATION TYPES DE CHAMPS\n');

    try {
        // 1. Types disponibles dans FieldType
        console.log('📋 TYPES DANS FieldType:');
        const typesFieldType = await prisma.fieldType.findMany({
            orderBy: { label: 'asc' }
        });
        
        typesFieldType.forEach(type => {
            console.log(`   • ${type.name} : ${type.label} (has_options: ${type.has_options})`);
        });
        console.log(`Total: ${typesFieldType.length} types\n`);

        // 2. Types utilisés dans Field
        console.log('📊 TYPES UTILISÉS DANS Field:');
        const typesField = await prisma.field.groupBy({
            by: ['type'],
            _count: { type: true }
        });
        
        typesField.sort((a, b) => a.type.localeCompare(b.type));
        typesField.forEach(type => {
            const existsInFieldType = typesFieldType.find(ft => ft.name === type.type);
            const status = existsInFieldType ? '✅' : '❌';
            console.log(`   ${status} ${type.type}: ${type._count.type} champ(s)`);
        });
        console.log(`Total: ${typesField.length} types différents\n`);

        // 3. Types manquants dans FieldType
        console.log('⚠️ TYPES MANQUANTS DANS FieldType:');
        const typesMissing = typesField.filter(tf => 
            !typesFieldType.find(ft => ft.name === tf.type)
        );
        
        if (typesMissing.length === 0) {
            console.log('   Aucun type manquant - Tout va bien ! ✅');
        } else {
            typesMissing.forEach(type => {
                console.log(`   🚨 ${type.type} (utilisé ${type._count.type} fois)`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifierTypesChamps();
