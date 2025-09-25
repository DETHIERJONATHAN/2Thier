const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ajouterConditionnementTableaux() {
    console.log('🎯 AJOUT CONDITIONNEMENT AVANCÉ POUR TABLEAUX\n');

    try {
        // 1. Mettre à jour la configuration du FieldType pour supporter le conditionnement
        console.log('📝 Étape 1 : Extension du FieldType pour conditionnement...');
        
        const currentConfig = await prisma.fieldType.findUnique({
            where: { name: 'tableau' },
            select: { config: true }
        });

        const enhancedConfig = {
            ...currentConfig.config,
            conditionalFeatures: {
                supportedConditions: [
                    'field_value_equals',
                    'field_value_greater_than', 
                    'field_value_less_than',
                    'field_value_between',
                    'field_value_contains',
                    'multiple_conditions_AND',
                    'multiple_conditions_OR',
                    'user_role_based',
                    'organization_based'
                ],
                filterTypes: [
                    'show_hide_rows',      // Masquer/afficher certaines lignes
                    'show_hide_columns',   // Masquer/afficher certaines colonnes  
                    'filter_data',         // Filtrer les données selon critères
                    'change_display_mode', // Changer mode d'affichage (dropdown/grid)
                    'modify_search_config' // Modifier la config de recherche
                ],
                businessLogicSupport: true,
                realTimeUpdates: true
            }
        };

        await prisma.fieldType.update({
            where: { name: 'tableau' },
            data: {
                config: enhancedConfig,
                updatedAt: new Date()
            }
        });

        console.log('✅ FieldType étendu avec support conditionnement');

        // 2. Créer un exemple de tableau conditionné
        console.log('\n📊 Étape 2 : Création exemple tableau conditionné...');

        // D'abord, trouvons une section
        const section = await prisma.section.findFirst();
        if (!section) {
            console.log('❌ Aucune section trouvée');
            return;
        }

        // Créer un tableau "Panneaux selon Budget"
        const tableauConditionne = await prisma.field.create({
            data: {
                label: 'Panneaux selon Budget',
                type: 'tableau',
                sectionId: section.id,
                order: 200,
                required: false,
                width: '1/1',
                advancedConfig: {
                    tableType: 'products',
                    tableConfig: {
                        name: 'Panneaux Solaires Conditionnés',
                        description: 'Panneaux filtrés selon le budget et le type d\'installation',
                        
                        columns: [
                            {
                                id: 'modele',
                                key: 'modele',
                                label: 'Modèle',
                                type: 'text',
                                isRowHeader: true,
                                searchable: true,
                                width: '180px'
                            },
                            {
                                id: 'puissance',
                                key: 'puissance', 
                                label: 'Puissance',
                                type: 'number',
                                unit: 'W',
                                width: '100px'
                            },
                            {
                                id: 'prix',
                                key: 'prix',
                                label: 'Prix',
                                type: 'currency',
                                currency: 'EUR',
                                width: '100px'
                            },
                            {
                                id: 'categorie',
                                key: 'categorie',
                                label: 'Catégorie',
                                type: 'text',
                                width: '120px'
                            },
                            {
                                id: 'remise_pro',
                                key: 'remise_pro',
                                label: 'Remise Pro',
                                type: 'percentage',
                                width: '100px',
                                // Cette colonne sera conditionnelle
                                conditionalDisplay: {
                                    conditions: [{
                                        fieldReference: 'type_client', // Référence à un autre champ
                                        operator: 'equals',
                                        value: 'professionnel'
                                    }],
                                    logic: 'AND'
                                }
                            }
                        ],
                        
                        rows: [
                            {
                                id: 'entry_level_1',
                                label: 'Panneau Économique 300W',
                                category: 'economique',
                                budget_min: 0,
                                budget_max: 10000,
                                installation_type: ['residentiel'],
                                data: {
                                    modele: 'EcoSolar 300W',
                                    puissance: 300,
                                    prix: 120.00,
                                    categorie: 'Économique',
                                    remise_pro: 5.0
                                }
                            },
                            {
                                id: 'mid_range_1',
                                label: 'Panneau Standard 400W',
                                category: 'standard',
                                budget_min: 8000,
                                budget_max: 20000,
                                installation_type: ['residentiel', 'petit_commercial'],
                                data: {
                                    modele: 'Standard Solar 400W',
                                    puissance: 400,
                                    prix: 165.00,
                                    categorie: 'Standard',
                                    remise_pro: 8.0
                                }
                            },
                            {
                                id: 'premium_1',
                                label: 'Panneau Premium 500W',
                                category: 'premium',
                                budget_min: 15000,
                                budget_max: 999999,
                                installation_type: ['residentiel_haut_gamme', 'commercial', 'industriel'],
                                data: {
                                    modele: 'Premium Solar 500W',
                                    puissance: 500,
                                    prix: 245.00,
                                    categorie: 'Premium',
                                    remise_pro: 12.0
                                }
                            },
                            {
                                id: 'industrial_1',
                                label: 'Panneau Industriel 600W',
                                category: 'industriel',
                                budget_min: 50000,
                                budget_max: 999999,
                                installation_type: ['industriel'],
                                data: {
                                    modele: 'Industrial Solar 600W',
                                    puissance: 600,
                                    prix: 320.00,
                                    categorie: 'Industriel',
                                    remise_pro: 15.0
                                }
                            }
                        ],
                        
                        // CONFIGURATION DE CONDITIONNEMENT
                        conditionalLogic: {
                            enabled: true,
                            rules: [
                                {
                                    id: 'budget_filter',
                                    name: 'Filtrage par Budget',
                                    type: 'filter_data',
                                    conditions: [
                                        {
                                            fieldReference: 'budget_total', // Champ du formulaire
                                            operator: 'between',
                                            compareWith: 'row_property', // Comparer avec propriété de la ligne
                                            rowProperty: ['budget_min', 'budget_max']
                                        }
                                    ],
                                    action: {
                                        type: 'show_hide_rows',
                                        behavior: 'show_matching_only'
                                    }
                                },
                                {
                                    id: 'installation_type_filter',
                                    name: 'Filtrage par Type Installation',
                                    type: 'filter_data',
                                    conditions: [
                                        {
                                            fieldReference: 'type_installation',
                                            operator: 'in_array',
                                            compareWith: 'row_property',
                                            rowProperty: 'installation_type'
                                        }
                                    ],
                                    action: {
                                        type: 'show_hide_rows',
                                        behavior: 'show_matching_only'
                                    }
                                },
                                {
                                    id: 'pro_column_visibility',
                                    name: 'Colonne Remise Pro',
                                    type: 'show_hide_columns',
                                    conditions: [
                                        {
                                            fieldReference: 'type_client',
                                            operator: 'equals',
                                            value: 'professionnel'
                                        }
                                    ],
                                    action: {
                                        type: 'show_hide_columns',
                                        columns: ['remise_pro'],
                                        behavior: 'show_when_matching'
                                    }
                                }
                            ],
                            defaultBehavior: 'show_all' // Comportement si aucune condition ne s'applique
                        },
                        
                        searchConfig: {
                            primaryKey: 'modele',
                            displayColumns: ['puissance', 'prix', 'categorie'],
                            searchType: 'autocomplete',
                            enableFilters: true,
                            placeholder: 'Rechercher un panneau adapté...',
                            // Recherche aussi conditionnelle
                            conditionalPlaceholder: {
                                conditions: [{
                                    fieldReference: 'budget_total',
                                    operator: 'less_than',
                                    value: 10000
                                }],
                                placeholder: 'Rechercher un panneau économique...'
                            }
                        }
                    }
                }
            }
        });

        console.log(`✅ Tableau conditionné créé (ID: ${tableauConditionne.id})`);

        // 3. Créer des champs de référence pour les conditions
        console.log('\n🔗 Étape 3 : Création champs de référence...');

        // Champ Budget Total
        const champBudget = await prisma.field.create({
            data: {
                label: 'Budget Total',
                type: 'number',
                sectionId: section.id,
                order: 198,
                required: true,
                width: '1/2',
                advancedConfig: {
                    unit: '€',
                    min: 5000,
                    max: 200000,
                    placeholder: 'ex: 15000',
                    helpText: 'Budget total pour l\'installation solaire'
                }
            }
        });

        // Champ Type Installation
        const champTypeInstallation = await prisma.field.create({
            data: {
                label: 'Type d\'Installation', 
                type: 'select',
                sectionId: section.id,
                order: 199,
                required: true,
                width: '1/2',
                advancedConfig: {
                    options: [
                        { value: 'residentiel', label: 'Résidentiel Standard' },
                        { value: 'residentiel_haut_gamme', label: 'Résidentiel Haut de Gamme' },
                        { value: 'petit_commercial', label: 'Petit Commercial' },
                        { value: 'commercial', label: 'Commercial' },
                        { value: 'industriel', label: 'Industriel' }
                    ]
                }
            }
        });

        // Champ Type Client
        const champTypeClient = await prisma.field.create({
            data: {
                label: 'Type de Client',
                type: 'select', 
                sectionId: section.id,
                order: 197,
                required: true,
                width: '1/2',
                advancedConfig: {
                    options: [
                        { value: 'particulier', label: 'Particulier' },
                        { value: 'professionnel', label: 'Professionnel' }
                    ]
                }
            }
        });

        console.log('✅ Champs de référence créés :');
        console.log(`   • Budget Total (ID: ${champBudget.id})`);
        console.log(`   • Type Installation (ID: ${champTypeInstallation.id})`);
        console.log(`   • Type Client (ID: ${champTypeClient.id})`);

        // 4. Documentation du système
        console.log('\n📚 SYSTÈME DE CONDITIONNEMENT OPÉRATIONNEL :');
        
        console.log('\n🎯 TYPES DE CONDITIONS SUPPORTÉES :');
        console.log('   • Égalité : champ = valeur');
        console.log('   • Comparaison : champ >, <, >= valeur');
        console.log('   • Plage : valeur entre min et max');
        console.log('   • Contient : champ contient texte');
        console.log('   • Dans liste : valeur dans [options]');
        console.log('   • Multiple : ET / OU logique');
        
        console.log('\n🔧 ACTIONS POSSIBLES :');
        console.log('   • Masquer/Afficher lignes selon critères');
        console.log('   • Masquer/Afficher colonnes selon contexte');
        console.log('   • Changer mode d\'affichage (dropdown/grid)');
        console.log('   • Modifier placeholder de recherche');
        console.log('   • Filtrer données en temps réel');
        
        console.log('\n💡 EXEMPLES D\'UTILISATION :');
        console.log('   • Si Budget < 10000€ → Masquer panneaux premium');
        console.log('   • Si Type = Professionnel → Afficher colonne remise');
        console.log('   • Si Installation = Industriel → Filtrer panneaux >400W');
        console.log('   • Si Région = Nord → Masquer orientations Nord');

        console.log('\n🚀 PROCHAINES ÉTAPES :');
        console.log('1. Testez le formulaire dans l\'interface');
        console.log('2. Modifiez Budget/Type et voyez les panneaux changer');
        console.log('3. Le système s\'adapte automatiquement');
        console.log('4. Configuration 100% modifiable via interface');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

ajouterConditionnementTableaux();
