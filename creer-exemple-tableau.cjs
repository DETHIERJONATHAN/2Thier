const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function creerExempleTableau() {
    console.log('📊 CRÉATION D\'EXEMPLES DE TABLEAUX\n');

    try {
        // Trouver une section où ajouter nos exemples
        const section = await prisma.section.findFirst({
            include: { Block: true }
        });

        if (!section) {
            console.log('❌ Aucune section trouvée. Créez d\'abord un formulaire.');
            return;
        }

        console.log(`📍 Section trouvée : "${section.name}" dans le bloc "${section.Block.name}"`);

        // 1. EXEMPLE : Panneaux Solaires
        console.log('\n🔹 Création : Tableau "Panneaux Solaires"...');
        
        const tableauPanneaux = await prisma.field.create({
            data: {
                label: 'Panneaux Solaires',
                type: 'tableau',
                sectionId: section.id,
                order: 100,
                required: false,
                width: '1/1',
                advancedConfig: {
                    tableType: 'products',
                    tableConfig: {
                        name: 'Panneaux Solaires',
                        description: 'Catalogue des panneaux photovoltaïques disponibles',
                        
                        columns: [
                            {
                                id: 'modele',
                                key: 'modele',
                                label: 'Modèle',
                                type: 'text',
                                isRowHeader: true,
                                searchable: true,
                                width: '180px',
                                required: true
                            },
                            {
                                id: 'puissance',
                                key: 'puissance',
                                label: 'Puissance',
                                type: 'number',
                                unit: 'W',
                                width: '100px',
                                format: 'integer'
                            },
                            {
                                id: 'voltage',
                                key: 'voltage',
                                label: 'Voltage',
                                type: 'number',
                                unit: 'V',
                                width: '90px',
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
                                id: 'garantie',
                                key: 'garantie',
                                label: 'Garantie',
                                type: 'text',
                                width: '100px'
                            },
                            {
                                id: 'efficacite',
                                key: 'efficacite',
                                label: 'Efficacité',
                                type: 'percentage',
                                width: '100px',
                                format: 'decimal:1'
                            }
                        ],
                        
                        rows: [
                            {
                                id: 'jinko_440',
                                label: 'JinkoSolar 440W',
                                data: {
                                    modele: 'JinkoSolar Tiger Pro 440W',
                                    puissance: 440,
                                    voltage: 41.4,
                                    prix: 185.50,
                                    garantie: '25 ans',
                                    efficacite: 21.2
                                }
                            },
                            {
                                id: 'canadian_450',
                                label: 'Canadian Solar 450W',
                                data: {
                                    modele: 'Canadian Solar HiKu6 450W',
                                    puissance: 450,
                                    voltage: 42.1,
                                    prix: 195.00,
                                    garantie: '20 ans',
                                    efficacite: 20.8
                                }
                            },
                            {
                                id: 'lg_380',
                                label: 'LG NeON 380W',
                                data: {
                                    modele: 'LG NeON R Prime 380W',
                                    puissance: 380,
                                    voltage: 40.8,
                                    prix: 225.00,
                                    garantie: '25 ans',
                                    efficacite: 22.1
                                }
                            }
                        ],
                        
                        searchConfig: {
                            primaryKey: 'modele',
                            displayColumns: ['puissance', 'prix', 'garantie'],
                            searchType: 'autocomplete',
                            enableFilters: true,
                            placeholder: 'Rechercher un panneau solaire...'
                        }
                    }
                }
            }
        });

        console.log(`✅ Tableau "Panneaux Solaires" créé (ID: ${tableauPanneaux.id})`);

        // 2. EXEMPLE : Orientation/Inclinaison  
        console.log('\n🔹 Création : Tableau "Orientation/Inclinaison"...');
        
        const tableauOrientation = await prisma.field.create({
            data: {
                label: 'Coefficients Orientation/Inclinaison',
                type: 'tableau',
                sectionId: section.id,
                order: 101,
                required: false,
                width: '1/1',
                advancedConfig: {
                    tableType: 'matrix',
                    tableConfig: {
                        name: 'Coefficients Orientation/Inclinaison',
                        description: 'Coefficients de production selon l\'orientation et l\'inclinaison des panneaux',
                        
                        columns: [
                            {
                                id: 'inclinaison',
                                key: 'inclinaison',
                                label: 'Inclinaison',
                                type: 'text',
                                isRowHeader: true,
                                searchable: true,
                                width: '100px'
                            },
                            {
                                id: 'nord',
                                key: 'nord',
                                label: 'Nord',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'nordEst',
                                key: 'nordEst',
                                label: 'Nord-Est',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'est',
                                key: 'est',
                                label: 'Est',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'sudEst',
                                key: 'sudEst',
                                label: 'Sud-Est',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'sud',
                                key: 'sud',
                                label: 'Sud',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'sudOuest',
                                key: 'sudOuest',
                                label: 'Sud-Ouest',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'ouest',
                                key: 'ouest',
                                label: 'Ouest',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            },
                            {
                                id: 'nordOuest',
                                key: 'nordOuest',
                                label: 'Nord-Ouest',
                                type: 'number',
                                width: '80px',
                                format: 'decimal:2'
                            }
                        ],
                        
                        rows: [
                            {
                                id: 'angle_0',
                                label: '0°',
                                data: {
                                    inclinaison: '0°',
                                    nord: 0.61, nordEst: 0.67, est: 0.72, sudEst: 0.75,
                                    sud: 0.76, sudOuest: 0.75, ouest: 0.72, nordOuest: 0.67
                                }
                            },
                            {
                                id: 'angle_15',
                                label: '15°',
                                data: {
                                    inclinaison: '15°',
                                    nord: 0.65, nordEst: 0.73, est: 0.81, sudEst: 0.87,
                                    sud: 0.89, sudOuest: 0.87, ouest: 0.81, nordOuest: 0.73
                                }
                            },
                            {
                                id: 'angle_30',
                                label: '30°',
                                data: {
                                    inclinaison: '30°',
                                    nord: 0.68, nordEst: 0.78, est: 0.88, sudEst: 0.96,
                                    sud: 1.00, sudOuest: 0.96, ouest: 0.88, nordOuest: 0.78
                                }
                            },
                            {
                                id: 'angle_45',
                                label: '45°',
                                data: {
                                    inclinaison: '45°',
                                    nord: 0.70, nordEst: 0.81, est: 0.91, sudEst: 0.99,
                                    sud: 1.04, sudOuest: 0.99, ouest: 0.91, nordOuest: 0.81
                                }
                            },
                            {
                                id: 'angle_60',
                                label: '60°',
                                data: {
                                    inclinaison: '60°',
                                    nord: 0.71, nordEst: 0.82, est: 0.91, sudEst: 0.98,
                                    sud: 1.02, sudOuest: 0.98, ouest: 0.91, nordOuest: 0.82
                                }
                            },
                            {
                                id: 'angle_90',
                                label: '90°',
                                data: {
                                    inclinaison: '90°',
                                    nord: 0.68, nordEst: 0.76, est: 0.83, sudEst: 0.86,
                                    sud: 0.87, sudOuest: 0.86, ouest: 0.83, nordOuest: 0.76
                                }
                            }
                        ],
                        
                        searchConfig: {
                            primaryKey: 'inclinaison',
                            displayColumns: ['nord', 'est', 'sud', 'ouest'],
                            searchType: 'grid',
                            enableFilters: true,
                            placeholder: 'Sélectionnez inclinaison et orientation...'
                        }
                    }
                }
            }
        });

        console.log(`✅ Tableau "Orientation/Inclinaison" créé (ID: ${tableauOrientation.id})`);

        console.log('\n🎉 EXEMPLES CRÉÉS AVEC SUCCÈS !');
        console.log('\n📊 UTILISATION :');
        console.log('1. Allez dans l\'interface des formulaires');
        console.log('2. Vous verrez le type "Tableau" dans les champs disponibles');
        console.log('3. Les deux exemples sont déjà créés pour tester');
        console.log('4. Dans les formules, vous pourrez utiliser :');
        console.log('   - {{panneaux_solaires.puissance}} pour récupérer la puissance');
        console.log('   - {{orientation.sud}} pour récupérer le coefficient Sud');
        console.log('\n🔄 RÉUTILISATION :');
        console.log('- Ces tableaux peuvent être référencés dans d\'autres champs');
        console.log('- Les données sont disponibles pour tous les calculs');
        console.log('- Configuration 100% modifiable via l\'interface');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

creerExempleTableau();
