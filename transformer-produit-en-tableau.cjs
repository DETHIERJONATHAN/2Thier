const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function transformerProduitEnTableau() {
    console.log('🔄 TRANSFORMATION : "produit" → "tableau"\n');

    try {
        // 1. Mettre à jour le FieldType
        console.log('📝 Étape 1 : Modification du FieldType...');
        
        const fieldTypeUpdated = await prisma.fieldType.update({
            where: { name: 'produit' },
            data: {
                name: 'tableau',
                label: 'Tableau',
                has_options: true,
                updatedAt: new Date(),
                config: {
                    description: 'Champ tableau universel pour matrices, produits, données croisées',
                    supportedTableTypes: ['matrix', 'products', 'lookup', 'custom'],
                    features: {
                        unlimitedColumns: true,
                        unlimitedRows: true,
                        configurableColumns: true,
                        configurableRows: true,
                        crossReferences: true,
                        searchable: true,
                        exportable: true,
                        reusableData: true
                    },
                    limits: {
                        maxColumns: 50,
                        maxRows: 10000,
                        maxCellSize: 1000
                    },
                    templates: [
                        {
                            name: 'Panneaux Solaires',
                            type: 'products',
                            columns: ['modele', 'puissance', 'prix', 'garantie', 'efficacite']
                        },
                        {
                            name: 'Orientation/Inclinaison',
                            type: 'matrix',
                            columns: ['angle', 'nord', 'nordEst', 'est', 'sudEst', 'sud', 'sudOuest', 'ouest', 'nordOuest']
                        },
                        {
                            name: 'Prix Électricité',
                            type: 'lookup',
                            columns: ['region', 'fournisseur', 'tarif_base', 'tarif_hp', 'tarif_hc']
                        }
                    ]
                }
            }
        });
        
        console.log(`✅ FieldType mis à jour : ${fieldTypeUpdated.name} (${fieldTypeUpdated.label})`);

        // 2. Mettre à jour tous les champs existants de type "produit"
        console.log('\n📝 Étape 2 : Mise à jour des champs existants...');
        
        const champsExistants = await prisma.field.findMany({
            where: { type: 'produit' },
            select: { id: true, label: true, advancedConfig: true }
        });

        console.log(`Trouvé ${champsExistants.length} champ(s) de type "produit"`);

        for (const champ of champsExistants) {
            // Conversion de la config existante vers la nouvelle structure
            const nouvelleConfig = {
                tableType: 'products', // Par défaut pour les anciens champs "produit"
                tableConfig: {
                    name: champ.label || 'Tableau produits',
                    description: `Tableau converti depuis le champ produit : ${champ.label}`,
                    
                    // Structure de colonnes par défaut pour produits
                    columns: [
                        {
                            id: 'modele',
                            key: 'modele',
                            label: 'Modèle',
                            type: 'text',
                            isRowHeader: true,
                            searchable: true,
                            width: '150px',
                            required: true
                        },
                        {
                            id: 'prix',
                            key: 'prix',
                            label: 'Prix',
                            type: 'currency',
                            currency: 'EUR',
                            width: '100px',
                            format: 'decimal:2'
                        },
                        {
                            id: 'description',
                            key: 'description',
                            label: 'Description',
                            type: 'text',
                            width: '200px'
                        }
                    ],
                    
                    // Données vides par défaut (à remplir par l'utilisateur)
                    rows: [
                        {
                            id: 'exemple_1',
                            label: 'Produit exemple',
                            data: {
                                modele: 'Produit exemple',
                                prix: 0,
                                description: 'Description du produit'
                            }
                        }
                    ],
                    
                    // Configuration de recherche
                    searchConfig: {
                        primaryKey: 'modele',
                        displayColumns: ['prix', 'description'],
                        searchType: 'autocomplete',
                        enableFilters: true,
                        placeholder: 'Rechercher un produit...'
                    },
                    
                    // Préservation de l'ancienne config si elle existe
                    legacy: champ.advancedConfig || null
                }
            };

            await prisma.field.update({
                where: { id: champ.id },
                data: {
                    type: 'tableau',
                    advancedConfig: nouvelleConfig
                }
            });

            console.log(`  ✅ Champ "${champ.label}" converti en tableau`);
        }

        // 3. Vérification finale
        console.log('\n🔍 Étape 3 : Vérification finale...');
        
        const nouveauxChamps = await prisma.field.findMany({
            where: { type: 'tableau' },
            select: { id: true, label: true }
        });

        console.log(`\n📊 RÉSULTAT FINAL :`);
        console.log(`   • ${nouveauxChamps.length} champ(s) de type "tableau"`);
        console.log(`   • FieldType "tableau" configuré avec templates`);
        
        nouveauxChamps.forEach((champ, index) => {
            console.log(`   ${index + 1}. ${champ.label} (ID: ${champ.id})`);
        });

        console.log('\n🎉 TRANSFORMATION RÉUSSIE !');
        console.log('🚀 Le champ "tableau" est maintenant disponible dans l\'interface');
        console.log('📝 Les utilisateurs peuvent créer des tableaux illimités :');
        console.log('   - Produits (panneaux solaires, onduleurs, etc.)');
        console.log('   - Matrices (orientation/inclinaison)');
        console.log('   - Lookups (tarifs électricité)'); 
        console.log('   - Tableaux personnalisés');

    } catch (error) {
        console.error('❌ Erreur lors de la transformation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

transformerProduitEnTableau();
