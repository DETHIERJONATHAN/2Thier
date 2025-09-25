const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingOptionNodes() {
    console.log('🔗 AJOUT DES OPTIONS MANQUANTES POUR PRIX KW/H');
    console.log('=' .repeat(50));
    
    try {
        // Trouver le champ Prix Kw/h
        const prixKwhField = await prisma.field.findFirst({
            where: { label: 'Prix Kw/h', type: 'advanced_select' }
        });
        
        if (!prixKwhField) {
            console.log('❌ Champ Prix Kw/h non trouvé');
            return;
        }
        
        console.log(`✅ Champ Prix Kw/h trouvé: ${prixKwhField.id}`);
        
        // Créer les options manquantes
        const optionsToCreate = [
            {
                id: "07c45baa-c3d2-4d48-8a95-7f711f5e45d3",
                fieldId: prixKwhField.id,
                parentId: null,
                label: "Calcul du prix Kw/h",
                value: "calcul-du-prix-kwh",
                order: 0,
                data: { "nextField": { "type": "number", "placeholder": "Calcul du prix Kw/H" } }
            },
            {
                id: "56bb1a91-20ef-453f-925a-41e1c565402b",
                fieldId: prixKwhField.id,
                parentId: null,
                label: "Prix Kw/h",
                value: "prix-kwh",
                order: 1,
                data: { "nextField": { "type": "number", "placeholder": "Prix Kh/h" } }
            }
        ];
        
        for (const option of optionsToCreate) {
            await prisma.fieldOptionNode.create({ data: option });
            console.log(`✅ Option créée: ${option.label}`);
        }
        
        console.log('\\n🎉 OPTIONS RESTAURÉES !');
        
        // Vérification finale
        const optionNodes = await prisma.fieldOptionNode.findMany({
            where: { fieldId: prixKwhField.id }
        });
        
        console.log('📋 Options du champ Prix Kw/h:');
        optionNodes.forEach(option => {
            console.log(`   - ${option.label} (${option.value})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addMissingOptionNodes();
