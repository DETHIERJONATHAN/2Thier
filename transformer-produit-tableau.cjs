const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function transformerProduitEnTableau() {
    console.log('🔄 TRANSFORMATION : produit → tableau\n');

    try {
        // 1. Mettre à jour le type dans FieldType
        console.log('📝 Mise à jour du type produit → tableau...');
        
        const updatedFieldType = await prisma.fieldType.updateMany({
            where: { name: 'produit' },
            data: {
                name: 'tableau',
                label: 'Tableau de données',
                has_options: true,
                updatedAt: new Date(),
                config: {
                    tableTypes: ['products', 'lookup', 'matrix'],
                    defaultType: 'products',
                    features: {
                        searchable: true,
                        sortable: true,
                        filterable: true,
                        multipleSelection: false,
                        dynamicFields: true
                    },
                    templates: {
                        products: {
                            name: 'Base de données produits',
                            description: 'Tableau de produits avec recherche et sélection',
                            defaultColumns: ['nom', 'prix', 'description']
                        },
                        lookup: {
                            name: 'Table de correspondance',
                            description: 'Matrice de valeurs pour recherche croisée',
                            defaultColumns: ['ligne', 'colonne', 'valeur']
                        },
                        matrix: {
                            name: 'Matrice de calcul',
                            description: 'Tableau 2D pour calculs (ex: orientation/inclinaison)',
                            defaultColumns: ['axe_x', 'axe_y', 'coefficient']
                        }
                    }
                }
            }
        });

        console.log(`✅ ${updatedFieldType.count} type(s) mis à jour`);

        // 2. Mettre à jour les champs existants
        console.log('🔧 Mise à jour des champs existants...');
        
        const updatedFields = await prisma.field.updateMany({
            where: { type: 'produit' },
            data: {
                type: 'tableau',
                updatedAt: new Date()
            }
        });

        console.log(`✅ ${updatedFields.count} champ(s) mis à jour`);

        // 3. Vérification
        console.log('\n🔍 VÉRIFICATION FINALE...');
        
        const champsTableau = await prisma.field.findMany({
            where: { type: 'tableau' },
            select: { id: true, label: true, advancedConfig: true }
        });

        console.log(`📊 Champs "tableau" trouvés: ${champsTableau.length}`);
        champsTableau.forEach(champ => {
            console.log(`   • ${champ.label} (ID: ${champ.id.substring(0, 8)}...)`);
        });

        // 4. Configuration par défaut pour les champs existants
        if (champsTableau.length > 0) {
            console.log('\n⚙️ Application de la configuration par défaut...');
            
            for (const champ of champsTableau) {
                const defaultConfig = {
                    tableType: 'products',
                    structure: {
                        columns: [
                            { key: 'nom', label: 'Nom du produit', type: 'text', searchable: true, required: true },
                            { key: 'prix', label: 'Prix', type: 'currency', currency: 'EUR', searchable: false },
                            { key: 'description', label: 'Description', type: 'textarea', searchable: true },
                            { key: 'disponible', label: 'Disponible', type: 'boolean', searchable: false }
                        ],
                        searchKey: 'nom',
                        displayFields: ['prix', 'description', 'disponible']
                    },
                    data: [
                        { nom: 'Exemple Produit 1', prix: 100, description: 'Description exemple', disponible: true },
                        { nom: 'Exemple Produit 2', prix: 150, description: 'Autre description', disponible: false }
                    ]
                };

                await prisma.field.update({
                    where: { id: champ.id },
                    data: {
                        advancedConfig: {
                            ...champ.advancedConfig || {},
                            ...defaultConfig
                        },
                        updatedAt: new Date()
                    }
                });
            }
            
            console.log('✅ Configuration par défaut appliquée');
        }

        console.log('\n🎉 TRANSFORMATION TERMINÉE !');
        console.log('📋 Le champ "produit" est maintenant "tableau"');
        console.log('🔧 Vous pouvez configurer les colonnes et données dans l\'interface');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

transformerProduitEnTableau();
