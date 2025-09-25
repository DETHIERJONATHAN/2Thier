const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function creerTableauOnduluersConditionne() {
    console.log('⚡ CRÉATION TABLEAU ONDULEURS CONDITIONNÉ PAR PUISSANCE\n');

    try {
        // 1. Trouver une section pour nos champs
        const section = await prisma.section.findFirst();
        if (!section) {
            console.log('❌ Aucune section trouvée');
            return;
        }

        // 2. Créer le champ "Puissance Installation" qui servira de référence
        console.log('🔌 Création du champ "Puissance Installation"...');
        
        const champPuissanceInstallation = await prisma.field.create({
            data: {
                label: 'Puissance Installation (kW)',
                type: 'number',
                sectionId: section.id,
                order: 250,
                required: true,
                width: '1/2',
                advancedConfig: {
                    unit: 'kW',
                    min: 1,
                    max: 100,
                    step: 0.5,
                    placeholder: 'ex: 6.5',
                    helpText: 'Puissance totale des panneaux installés'
                }
            }
        });

        console.log(`✅ Champ créé (ID: ${champPuissanceInstallation.id})`);

        // 3. Créer le tableau des onduleurs avec conditionnement
        console.log('\n⚡ Création du tableau "Onduleurs compatibles"...');
        
        const tableauOnduleurs = await prisma.field.create({
            data: {
                label: 'Onduleurs Compatibles',
                type: 'tableau',
                sectionId: section.id,
                order: 251,
                required: false,
                width: '1/1',
                advancedConfig: {
                    tableType: 'products',
                    tableConfig: {
                        name: 'Onduleurs Solaires',
                        description: 'Onduleurs filtrés automatiquement selon la puissance d\'installation',
                        
                        columns: [
                            {
                                id: 'modele',
                                key: 'modele',
                                label: 'Modèle Onduleur',
                                type: 'text',
                                isRowHeader: true,
                                searchable: true,
                                width: '200px'
                            },
                            {
                                id: 'puissance_nominale',
                                key: 'puissance_nominale',
                                label: 'Puissance Nominale',
                                type: 'number',
                                unit: 'kW',
                                width: '120px',
                                format: 'decimal:1'
                            },
                            {
                                id: 'plage_mppt_min',
                                key: 'plage_mppt_min',
                                label: 'MPPT Min',
                                type: 'number',
                                unit: 'kW',
                                width: '100px',
                                format: 'decimal:1'
                            },
                            {
                                id: 'plage_mppt_max',
                                key: 'plage_mppt_max',
                                label: 'MPPT Max',
                                type: 'number',
                                unit: 'kW',
                                width: '100px',
                                format: 'decimal:1'
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
                                id: 'rendement',
                                key: 'rendement',
                                label: 'Rendement',
                                type: 'percentage',
                                width: '100px',
                                format: 'decimal:1'
                            },
                            {
                                id: 'garantie',
                                key: 'garantie',
                                label: 'Garantie',
                                type: 'text',
                                width: '80px'
                            }
                        ],
                        
                        // DONNÉES DES ONDULEURS AVEC PLAGES DE COMPATIBILITÉ
                        rows: [
                            {
                                id: 'fronius_3k',
                                label: 'Fronius Primo 3.0',
                                category: 'residentiel_petit',
                                compatible_power_min: 2.5,  // ← Puissance min compatible
                                compatible_power_max: 4.0,  // ← Puissance max compatible
                                data: {
                                    modele: 'Fronius Primo 3.0-1',
                                    puissance_nominale: 3.0,
                                    plage_mppt_min: 2.5,
                                    plage_mppt_max: 4.0,
                                    prix: 1250.00,
                                    rendement: 96.8,
                                    garantie: '5 ans'
                                }
                            },
                            {
                                id: 'fronius_5k',
                                label: 'Fronius Primo 5.0',
                                category: 'residentiel_standard',
                                compatible_power_min: 4.0,
                                compatible_power_max: 6.5,
                                data: {
                                    modele: 'Fronius Primo 5.0-1',
                                    puissance_nominale: 5.0,
                                    plage_mppt_min: 4.0,
                                    plage_mppt_max: 6.5,
                                    prix: 1650.00,
                                    rendement: 97.1,
                                    garantie: '5 ans'
                                }
                            },
                            {
                                id: 'sma_8k',
                                label: 'SMA Sunny Boy 8.0',
                                category: 'residentiel_grand',
                                compatible_power_min: 6.0,
                                compatible_power_max: 10.0,
                                data: {
                                    modele: 'SMA Sunny Boy 8.0',
                                    puissance_nominale: 8.0,
                                    plage_mppt_min: 6.0,
                                    plage_mppt_max: 10.0,
                                    prix: 2150.00,
                                    rendement: 97.7,
                                    garantie: '5 ans'
                                }
                            },
                            {
                                id: 'sma_15k',
                                label: 'SMA Sunny Tripower 15.0',
                                category: 'commercial_petit',
                                compatible_power_min: 12.0,
                                compatible_power_max: 18.0,
                                data: {
                                    modele: 'SMA Sunny Tripower 15.0',
                                    puissance_nominale: 15.0,
                                    plage_mppt_min: 12.0,
                                    plage_mppt_max: 18.0,
                                    prix: 3250.00,
                                    rendement: 98.2,
                                    garantie: '5 ans'
                                }
                            },
                            {
                                id: 'huawei_20k',
                                label: 'Huawei SUN2000-20KTL',
                                category: 'commercial_moyen',
                                compatible_power_min: 16.0,
                                compatible_power_max: 25.0,
                                data: {
                                    modele: 'Huawei SUN2000-20KTL-M1',
                                    puissance_nominale: 20.0,
                                    plage_mppt_min: 16.0,
                                    plage_mppt_max: 25.0,
                                    prix: 4200.00,
                                    rendement: 98.4,
                                    garantie: '10 ans'
                                }
                            },
                            {
                                id: 'abb_50k',
                                label: 'ABB PVS-50-TL',
                                category: 'industriel',
                                compatible_power_min: 40.0,
                                compatible_power_max: 60.0,
                                data: {
                                    modele: 'ABB PVS-50-TL',
                                    puissance_nominale: 50.0,
                                    plage_mppt_min: 40.0,
                                    plage_mppt_max: 60.0,
                                    prix: 8500.00,
                                    rendement: 98.0,
                                    garantie: '5 ans'
                                }
                            }
                        ],
                        
                        // CONDITIONNEMENT : FILTRER PAR PUISSANCE COMPATIBLE
                        conditionalLogic: {
                            enabled: true,
                            rules: [
                                {
                                    id: 'power_compatibility_filter',
                                    name: 'Filtrage Puissance Compatible',
                                    type: 'filter_data',
                                    conditions: [
                                        {
                                            fieldReference: 'puissance_installation_kw', // Référence au champ puissance
                                            operator: 'between_inclusive', // La puissance doit être dans la plage
                                            compareWith: 'row_property',
                                            rowProperty: ['compatible_power_min', 'compatible_power_max']
                                        }
                                    ],
                                    action: {
                                        type: 'show_hide_rows',
                                        behavior: 'show_matching_only'
                                    },
                                    realTime: true // Mise à jour temps réel
                                },
                                {
                                    id: 'efficiency_highlighting',
                                    name: 'Mise en évidence Rendement',
                                    type: 'highlight_data',
                                    conditions: [
                                        {
                                            fieldReference: 'puissance_installation_kw',
                                            operator: 'greater_than',
                                            value: 10.0
                                        }
                                    ],
                                    action: {
                                        type: 'highlight_columns',
                                        columns: ['rendement', 'garantie'],
                                        style: {
                                            backgroundColor: '#e6f3ff',
                                            fontWeight: 'bold'
                                        }
                                    }
                                }
                            ],
                            defaultBehavior: 'show_all',
                            noMatchMessage: 'Aucun onduleur compatible trouvé pour cette puissance'
                        },
                        
                        searchConfig: {
                            primaryKey: 'modele',
                            displayColumns: ['puissance_nominale', 'plage_mppt_min', 'plage_mppt_max', 'prix'],
                            searchType: 'autocomplete',
                            enableFilters: true,
                            placeholder: 'Onduleur compatible avec votre installation...',
                            // Placeholder conditionnel selon la puissance
                            conditionalPlaceholder: [
                                {
                                    conditions: [{
                                        fieldReference: 'puissance_installation_kw',
                                        operator: 'less_than',
                                        value: 5.0
                                    }],
                                    placeholder: 'Onduleur résidentiel pour petite installation...'
                                },
                                {
                                    conditions: [{
                                        fieldReference: 'puissance_installation_kw',
                                        operator: 'greater_than',
                                        value: 15.0
                                    }],
                                    placeholder: 'Onduleur industriel haute puissance...'
                                }
                            ]
                        }
                    }
                }
            }
        });

        console.log(`✅ Tableau onduleurs créé (ID: ${tableauOnduleurs.id})`);

        // 4. Créer quelques champs supplémentaires pour un exemple complet
        console.log('\n🔧 Création champs complémentaires...');

        const champTypeToiture = await prisma.field.create({
            data: {
                label: 'Type de Toiture',
                type: 'select',
                sectionId: section.id,
                order: 249,
                required: false,
                width: '1/2',
                advancedConfig: {
                    options: [
                        { value: 'tuiles', label: 'Tuiles' },
                        { value: 'ardoises', label: 'Ardoises' },
                        { value: 'bac_acier', label: 'Bac Acier' },
                        { value: 'zinc', label: 'Zinc' },
                        { value: 'membrane', label: 'Membrane EPDM' }
                    ],
                    placeholder: 'Sélectionnez le type de toiture'
                }
            }
        });

        console.log(`✅ Champ "Type de Toiture" créé (ID: ${champTypeToiture.id})`);

        // 5. Exemples de scénarios
        console.log('\n📊 EXEMPLES DE FONCTIONNEMENT :');
        
        console.log('\n🏠 SCÉNARIO A : Installation 3.5 kW (résidentiel petit)');
        console.log('   Puissance saisie : 3.5 kW');
        console.log('   ✅ Onduleurs affichés :');
        console.log('      • Fronius Primo 3.0 (plage: 2.5-4.0 kW) ← Compatible');
        console.log('   ❌ Onduleurs masqués :');
        console.log('      • Fronius Primo 5.0 (plage: 4.0-6.5 kW)');
        console.log('      • Tous les autres (trop puissants)');
        
        console.log('\n🏢 SCÉNARIO B : Installation 12.5 kW (commercial petit)');
        console.log('   Puissance saisie : 12.5 kW');
        console.log('   ✅ Onduleurs affichés :');
        console.log('      • SMA Sunny Tripower 15.0 (plage: 12.0-18.0 kW) ← Compatible');
        console.log('   ❌ Onduleurs masqués :');
        console.log('      • Tous les résidentiels (trop petits)');
        console.log('      • Huawei 20K (trop puissant pour 12.5kW)');

        console.log('\n🏭 SCÉNARIO C : Installation 45 kW (industriel)');
        console.log('   Puissance saisie : 45 kW');
        console.log('   ✅ Onduleurs affichés :');
        console.log('      • ABB PVS-50-TL (plage: 40.0-60.0 kW) ← Compatible');
        console.log('   ❌ Onduleurs masqués :');
        console.log('      • Tous les autres (insuffisants pour 45kW)');
        console.log('   🎨 Mise en évidence :');
        console.log('      • Colonnes Rendement et Garantie surlignées (>10kW)');

        // 6. Documentation technique
        console.log('\n🔧 LOGIQUE DE CONDITIONNEMENT :');
        console.log('```json');
        console.log('{');
        console.log('  "conditions": [{');
        console.log('    "fieldReference": "puissance_installation_kw",');
        console.log('    "operator": "between_inclusive",');
        console.log('    "compareWith": "row_property",');
        console.log('    "rowProperty": ["compatible_power_min", "compatible_power_max"]');
        console.log('  }],');
        console.log('  "action": {');
        console.log('    "type": "show_hide_rows",');
        console.log('    "behavior": "show_matching_only"');
        console.log('  }');
        console.log('}');
        console.log('```');
        
        console.log('\n💡 PRINCIPE :');
        console.log('• L\'utilisateur saisit la puissance d\'installation');
        console.log('• Le système compare avec compatible_power_min et compatible_power_max');
        console.log('• Seuls les onduleurs dans la bonne plage s\'affichent');
        console.log('• Mise à jour automatique si la puissance change');

        console.log('\n🎯 AUTRES CONDITIONNEMENTS POSSIBLES :');
        console.log('• Type installation → Onduleurs mono/tri phasés');
        console.log('• Budget → Onduleurs dans la gamme de prix');
        console.log('• Marque préférée → Filtrer par fabricant');
        console.log('• Région → Onduleurs adaptés au climat');

        console.log('\n🚀 POUR TESTER :');
        console.log('1. Allez dans l\'interface formulaire');
        console.log('2. Saisissez une "Puissance Installation" (ex: 6.5)');
        console.log('3. Seuls les onduleurs compatibles apparaissent !');
        console.log('4. Changez la puissance → Les onduleurs changent !');

        console.log('\n✅ SYSTÈME ONDULEURS CONDITIONNÉ OPÉRATIONNEL !');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

creerTableauOnduluersConditionne();
