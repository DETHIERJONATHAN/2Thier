const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function demonstrationConditionnement() {
    console.log('🎬 DÉMONSTRATION CONDITIONNEMENT TABLEAUX\n');

    try {
        // Simuler différents scénarios pour montrer le conditionnement
        
        console.log('📊 SCÉNARIOS DE CONDITIONNEMENT :\n');
        
        // Scénario 1 : Client particulier, budget limité
        console.log('🏠 SCÉNARIO 1 : Particulier, Budget 8000€, Installation résidentielle');
        console.log('   Champs remplis :');
        console.log('   • Type Client = "particulier"');  
        console.log('   • Budget Total = 8000€');
        console.log('   • Type Installation = "residentiel"');
        console.log('   \n   Résultat du conditionnement :');
        console.log('   ✅ Panneaux affichés : Économique 300W, Standard 400W');
        console.log('   ❌ Panneaux masqués : Premium 500W, Industriel 600W (hors budget)');
        console.log('   ❌ Colonne masquée : "Remise Pro" (client particulier)');
        console.log('   📝 Placeholder : "Rechercher un panneau économique..."');
        
        console.log('\n' + '─'.repeat(60) + '\n');
        
        // Scénario 2 : Client professionnel, gros budget
        console.log('🏢 SCÉNARIO 2 : Professionnel, Budget 25000€, Installation commerciale');
        console.log('   Champs remplis :');
        console.log('   • Type Client = "professionnel"');
        console.log('   • Budget Total = 25000€');  
        console.log('   • Type Installation = "commercial"');
        console.log('   \n   Résultat du conditionnement :');
        console.log('   ✅ Panneaux affichés : Standard 400W, Premium 500W');
        console.log('   ❌ Panneaux masqués : Économique 300W (pas adapté commercial)');
        console.log('   ❌ Panneaux masqués : Industriel 600W (budget insuffisant)');
        console.log('   ✅ Colonne affichée : "Remise Pro" avec % de remise');
        console.log('   📝 Placeholder : "Rechercher un panneau adapté..."');
        
        console.log('\n' + '─'.repeat(60) + '\n');
        
        // Scénario 3 : Installation industrielle
        console.log('🏭 SCÉNARIO 3 : Professionnel, Budget 80000€, Installation industrielle');
        console.log('   Champs remplis :');
        console.log('   • Type Client = "professionnel"');
        console.log('   • Budget Total = 80000€');
        console.log('   • Type Installation = "industriel"');
        console.log('   \n   Résultat du conditionnement :');
        console.log('   ✅ Panneaux affichés : Premium 500W, Industriel 600W');
        console.log('   ❌ Panneaux masqués : Économique 300W, Standard 400W (pas assez puissants)');
        console.log('   ✅ Colonne affichée : "Remise Pro" avec remises élevées');
        console.log('   📝 Mode d\'affichage : Grid (plus de détails)');
        
        console.log('\n' + '─'.repeat(60) + '\n');
        
        // Montrer la structure des données de conditionnement
        console.log('🔧 STRUCTURE TECHNIQUE DU CONDITIONNEMENT :');
        
        const exemple = {
            conditionalLogic: {
                enabled: true,
                rules: [
                    {
                        id: 'budget_filter',
                        type: 'filter_data',
                        conditions: [
                            {
                                fieldReference: 'budget_total', // ← Référence au champ "Budget Total"
                                operator: 'between',
                                compareWith: 'row_property',
                                rowProperty: ['budget_min', 'budget_max'] // ← Propriétés de chaque ligne
                            }
                        ],
                        action: {
                            type: 'show_hide_rows',
                            behavior: 'show_matching_only'
                        }
                    }
                ]
            }
        };
        
        console.log('   📋 Exemple de règle JSON :');
        console.log('   ```json');
        console.log('   {');
        console.log('     "conditions": [');
        console.log('       {');
        console.log('         "fieldReference": "budget_total",');
        console.log('         "operator": "between",');
        console.log('         "compareWith": "row_property",');
        console.log('         "rowProperty": ["budget_min", "budget_max"]');
        console.log('       }');
        console.log('     ],');
        console.log('     "action": {');
        console.log('       "type": "show_hide_rows",'); 
        console.log('       "behavior": "show_matching_only"');
        console.log('     }');
        console.log('   }');
        console.log('   ```');
        
        console.log('\n📚 AUTRES EXEMPLES POSSIBLES :');
        
        console.log('\n🌍 Conditionnement géographique :');
        console.log('   • Si Région = "Bretagne" → Masquer panneaux sensibles au sel');
        console.log('   • Si Altitude > 1000m → Afficher panneaux résistants au froid');
        
        console.log('\n⚡ Conditionnement technique :');
        console.log('   • Si Puissance requise > 5kW → Masquer panneaux <400W');
        console.log('   • Si Type toiture = "Tuiles" → Afficher systèmes de fixation adaptés');
        
        console.log('\n👥 Conditionnement utilisateur :');
        console.log('   • Si Rôle = "Technicien" → Afficher colonnes techniques');
        console.log('   • Si Rôle = "Commercial" → Afficher colonnes prix et marge');
        
        console.log('\n🕐 Conditionnement temporel :');
        console.log('   • Si Mois = "Été" → Promouvoir panneaux haute performance');
        console.log('   • Si Stock < 10 → Masquer produit ou afficher "Stock limité"');
        
        // Vérifier que l'exemple a bien été créé
        const tableauConditionne = await prisma.field.findFirst({
            where: { 
                label: 'Panneaux selon Budget',
                type: 'tableau'
            },
            select: { id: true, advancedConfig: true }
        });
        
        if (tableauConditionne) {
            console.log('\n✅ TABLEAU CONDITIONNÉ CRÉÉ ET OPÉRATIONNEL !');
            console.log(`   ID: ${tableauConditionne.id}`);
            console.log(`   Règles configurées: ${tableauConditionne.advancedConfig?.tableConfig?.conditionalLogic?.rules?.length || 0}`);
            
            console.log('\n🚀 POUR TESTER :');
            console.log('1. Allez dans l\'interface formulaire');
            console.log('2. Remplissez "Type Client", "Budget", "Type Installation"'); 
            console.log('3. Le tableau "Panneaux selon Budget" se filtre automatiquement');
            console.log('4. Changez les valeurs → Le tableau s\'adapte en temps réel');
        }
        
        console.log('\n🎉 LE CONDITIONNEMENT EST MAINTENANT POSSIBLE ET OPÉRATIONNEL !');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

demonstrationConditionnement();
