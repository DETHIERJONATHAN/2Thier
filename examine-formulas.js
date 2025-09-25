import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
    console.log('🔍 EXAMEN DÉTAILLÉ DES FORMULES EXISTANTES\n');
    
    const formulas = await prisma.fieldFormula.findMany({
        include: { Field: true }
    });
    
    console.log(`📋 Nombre de formules trouvées: ${formulas.length}\n`);
    
    formulas.forEach((f, index) => {
        console.log(`📄 FORMULE ${index + 1}:`);
        console.log(`   🏷️  Champ: ${f.Field.label}`);
        console.log(`   🎯 Field ID: ${f.fieldId}`);
        console.log(`   📄 Type de champ: ${f.Field.type}`);
        console.log(`   🧮 Formule: ${f.formula}`);
        console.log(`   📝 Titre: ${f.title || 'N/A'}`);
        console.log(`   📖 Description: ${f.description || 'N/A'}`);
        console.log('');
    });
    
    // Test direct de la formule existante
    if (formulas.length > 0) {
        const f = formulas[0];
        console.log('🧪 TEST DE LA FORMULE EXISTANTE...');
        
        try {
            const response = await fetch('http://localhost:4000/api/dynamic-formulas/calculate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-organization-id': '1' // ID d'organisation par défaut
                },
                body: JSON.stringify({
                    fieldId: f.fieldId,
                    fieldValues: {
                        [f.fieldId]: 'calcul-prix-kwh',
                        'montant': 1200,
                        'consommation': 4000
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Résultat: ${result.result || result.value || JSON.stringify(result)}`);
                console.log(`📝 Trace: ${result.executionTrace || result.trace || 'N/A'}`);
            } else {
                const error = await response.text();
                console.log(`❌ Erreur: ${error.substring(0, 200)}...`);
            }
        } catch (error) {
            console.log(`❌ Erreur réseau: ${error.message}`);
        }
    }
    
    await prisma.$disconnect();
})();
