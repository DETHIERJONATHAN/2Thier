const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function implementerFormulairesVivants() {
    console.log('🚀 IMPLÉMENTATION FORMULAIRES VIVANTS - PRIX KW/H');
    console.log('=' .repeat(60));
    console.log('⚠️  AUCUNE SUPPRESSION - SEULEMENT DES AJOUTS ET MODIFICATIONS');
    
    try {
        // PHASE 1: ÉTENDRE LES FieldOptionNode EXISTANTS
        console.log('\\n📊 PHASE 1: EXTENSION DES FieldOptionNode');
        
        // 1.1 Récupérer les options actuelles du champ Prix Kw/h
        const prixKwhOptions = await prisma.fieldOptionNode.findMany({
            where: {
                fieldId: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5'
            },
            orderBy: { order: 'asc' }
        });
        
        console.log(`✅ ${prixKwhOptions.length} options trouvées pour Prix Kw/h`);
        
        // 1.2 Mettre à jour l'option "Calcul du prix Kw/h" avec logique avancée
        const optionCalcul = prixKwhOptions.find(opt => opt.value === 'calcul-du-prix-kwh');
        if (optionCalcul) {
            console.log('\\n🔧 Mise à jour option "Calcul du prix Kw/h"...');
            
            const nouvelleData = {
                ...optionCalcul.data,
                nextFields: [
                    {
                        id: 'calcul-montant-temp',
                        type: 'number',
                        label: 'Montant du calcul (€)',
                        placeholder: 'Entrez le montant à diviser',
                        required: true,
                        step: 0.01,
                        min: 0,
                        dependencies: {
                            formula: {
                                targetField: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
                                expression: 'thisValue / consommationAnnuelle',
                                dependsOn: ['aa448cfa-3d97-4c23-8995-8e013577e27d'], // Consommation annuelle
                                onCalculate: 'auto'
                            }
                        }
                    }
                ],
                isConditional: true,
                conditionalLogic: {
                    showWhen: 'selected',
                    hideOthers: false,
                    cascadeCalculation: true
                },
                formulas: [
                    {
                        name: 'calculPrixKwh',
                        expression: '[calcul-montant-temp] / [aa448cfa-3d97-4c23-8995-8e013577e27d]',
                        targetField: '52c7f63b-7e57-4ba8-86da-19a176f09220',
                        triggerOn: 'change',
                        validation: {
                            required: ['aa448cfa-3d97-4c23-8995-8e013577e27d'],
                            nonZero: ['aa448cfa-3d97-4c23-8995-8e013577e27d']
                        }
                    }
                ],
                styling: {
                    emphasis: true,
                    icon: '🧮',
                    description: 'Le prix sera automatiquement calculé en divisant votre montant par la consommation annuelle'
                }
            };
            
            await prisma.fieldOptionNode.update({
                where: { id: optionCalcul.id },
                data: { data: nouvelleData }
            });
            
            console.log('✅ Option "Calcul" mise à jour avec logique de formule');
        }
        
        // 1.3 Mettre à jour l'option "Prix Kw/h" avec logique directe
        const optionPrixDirect = prixKwhOptions.find(opt => opt.value === 'prix-kwh');
        if (optionPrixDirect) {
            console.log('\\n🔧 Mise à jour option "Prix Kw/h direct"...');
            
            const nouvelleDataDirect = {
                ...optionPrixDirect.data,
                nextFields: [
                    {
                        id: 'prix-direct-temp',
                        type: 'number',
                        label: 'Prix Kw/h direct (€)',
                        placeholder: 'Entrez le prix au Kw/h',
                        required: true,
                        step: 0.001,
                        min: 0,
                        dependencies: {
                            copyTo: {
                                targetField: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
                                onInput: 'realtime'
                            }
                        }
                    }
                ],
                isConditional: true,
                conditionalLogic: {
                    showWhen: 'selected',
                    hideOthers: false,
                    directCopy: true
                },
                formulas: [
                    {
                        name: 'copiePrixDirect',
                        expression: '[prix-direct-temp]',
                        targetField: '52c7f63b-7e57-4ba8-86da-19a176f09220',
                        triggerOn: 'input',
                        validation: {
                            required: ['prix-direct-temp'],
                            positive: ['prix-direct-temp']
                        }
                    }
                ],
                styling: {
                    emphasis: false,
                    icon: '💰',
                    description: 'Entrez directement le prix au Kw/h connu'
                }
            };
            
            await prisma.fieldOptionNode.update({
                where: { id: optionPrixDirect.id },
                data: { data: nouvelleDataDirect }
            });
            
            console.log('✅ Option "Prix direct" mise à jour avec copie directe');
        }
        
        // PHASE 2: CRÉER LES FORMULES DANS FieldFormula
        console.log('\\n\\n🧮 PHASE 2: CRÉATION DES FORMULES');
        
        // 2.1 Formule pour le calcul du prix
        console.log('\\n📝 Création formule calcul Prix Kw/h...');
        try {
            await prisma.fieldFormula.create({
                data: {
                    id: 'formula-prix-kwh-calcul',
                    fieldId: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
                    name: 'Calcul Prix Kw/h',
                    expression: 'DIVIDE({montant_calcul}, {consommation_annuelle})',
                    variables: {
                        montant_calcul: {
                            source: 'dynamicField',
                            fieldId: 'calcul-montant-temp',
                            dependsOnOption: '07c45baa-c3d2-4d48-8a95-7f711f5e45d3'
                        },
                        consommation_annuelle: {
                            source: 'field',
                            fieldId: 'aa448cfa-3d97-4c23-8995-8e013577e27d'
                        }
                    },
                    conditions: [
                        {
                            when: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5',
                            equals: 'calcul-du-prix-kwh',
                            then: 'execute'
                        }
                    ],
                    triggerOn: ['input', 'change'],
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            console.log('✅ Formule calcul créée');
        } catch (error) {
            if (error.code === 'P2002') {
                console.log('⚠️ Formule calcul existe déjà');
            } else {
                throw error;
            }
        }
        
        // 2.2 Formule pour la copie directe
        console.log('\\n📝 Création formule copie directe...');
        try {
            await prisma.fieldFormula.create({
                data: {
                    id: 'formula-prix-kwh-direct',
                    fieldId: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
                    name: 'Copie Prix Kw/h Direct',
                    expression: 'COPY({prix_direct})',
                    variables: {
                        prix_direct: {
                            source: 'dynamicField',
                            fieldId: 'prix-direct-temp',
                            dependsOnOption: '56bb1a91-20ef-453f-925a-41e1c565402b'
                        }
                    },
                    conditions: [
                        {
                            when: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5',
                            equals: 'prix-kwh',
                            then: 'execute'
                        }
                    ],
                    triggerOn: ['input'],
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            console.log('✅ Formule copie directe créée');
        } catch (error) {
            if (error.code === 'P2002') {
                console.log('⚠️ Formule copie directe existe déjà');
            } else {
                throw error;
            }
        }
        
        // PHASE 3: CRÉER LES CONDITIONS D'AFFICHAGE
        console.log('\\n\\n🎭 PHASE 3: CRÉATION DES CONDITIONS');
        
        // 3.1 Condition pour affichage champ Prix Kw/h - Défini
        console.log('\\n👁️ Création condition affichage Prix défini...');
        try {
            await prisma.fieldCondition.create({
                data: {
                    id: 'condition-prix-defini-display',
                    fieldId: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
                    name: 'Affichage Prix Défini',
                    type: 'visibility',
                    condition: {
                        field: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5',
                        operator: 'in',
                        value: ['calcul-du-prix-kwh', 'prix-kwh'],
                        logic: 'or'
                    },
                    action: {
                        show: true,
                        highlight: true,
                        readonly: true
                    },
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            console.log('✅ Condition affichage créée');
        } catch (error) {
            if (error.code === 'P2002') {
                console.log('⚠️ Condition affichage existe déjà');
            } else {
                throw error;
            }
        }
        
        // PHASE 4: VÉRIFICATION FINALE
        console.log('\\n\\n✨ PHASE 4: VÉRIFICATION FINALE');
        
        // Vérifier les options mises à jour
        const optionsVerif = await prisma.fieldOptionNode.findMany({
            where: { fieldId: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5' }
        });
        
        console.log('\\n📊 RÉSULTAT FINAL:');
        console.log(`✅ ${optionsVerif.length} options configurées`);
        
        optionsVerif.forEach(option => {
            console.log(`\\n🎯 Option "${option.label}"`);
            console.log(`   Value: ${option.value}`);
            console.log(`   NextFields: ${option.data?.nextFields?.length || 0}`);
            console.log(`   Formulas: ${option.data?.formulas?.length || 0}`);
            console.log(`   ConditionalLogic: ${option.data?.isConditional ? '✅' : '❌'}`);
        });
        
        // Compter les formules
        const formules = await prisma.fieldFormula.count({
            where: { fieldId: '52c7f63b-7e57-4ba8-86da-19a176f09220' }
        });
        
        // Compter les conditions
        const conditions = await prisma.fieldCondition.count({
            where: { fieldId: '52c7f63b-7e57-4ba8-86da-19a176f09220' }
        });
        
        console.log(`\\n🧮 Formules créées: ${formules}`);
        console.log(`🎭 Conditions créées: ${conditions}`);
        
        console.log('\\n🎉 FORMULAIRES VIVANTS IMPLÉMENTÉS !');
        console.log('✅ Le champ Prix Kw/h est maintenant dynamique et réactif');
        console.log('✅ Les calculs se feront automatiquement selon l\'option choisie');
        console.log('✅ Interface intuitive avec descriptions et icônes');
        console.log('✅ Validation automatique des dépendances');
        
        console.log('\\n🚀 PROCHAINES ÉTAPES:');
        console.log('1. Tester l\'interface utilisateur');
        console.log('2. Vérifier les calculs en temps réel');
        console.log('3. Étendre à d\'autres champs si besoin');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'implémentation:', error);
        console.error('Details:', error.message);
        if (error.code) {
            console.error('Code:', error.code);
        }
    } finally {
        await prisma.$disconnect();
    }
}

implementerFormulairesVivants();
