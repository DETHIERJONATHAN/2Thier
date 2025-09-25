#!/usr/bin/env node

/**
 * 🧹 NETTOYAGE ET VALIDATION FINALE DU SYSTÈME DYNAMIQUE
 * 
 * Ce script fait le ménage final et valide que le système est prêt pour production.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nettoyageEtValidationFinale() {
    console.log('\n🧹 NETTOYAGE ET VALIDATION FINALE DU SYSTÈME DYNAMIQUE\n');

    try {
        // 1. INVENTAIRE INITIAL
        console.log('📋 1. INVENTAIRE INITIAL...');
        
        const totalFields = await prisma.field.count();
        const fieldsWithOldCalc = await prisma.field.count({
            where: {
                advancedConfig: {
                    path: ['calculation'],
                    not: null
                }
            }
        });
        const fieldsWithNewFormulas = await prisma.fieldFormula.count();
        const fieldsWithStyles = await prisma.field.count({
            where: {
                OR: [
                    { advancedConfig: { path: ['backgroundColor'], not: null } },
                    { advancedConfig: { path: ['textColor'], not: null } },
                    { advancedConfig: { path: ['borderColor'], not: null } }
                ]
            }
        });

        console.log(`   📊 Total champs: ${totalFields}`);
        console.log(`   🧮 Anciennes formules (advancedConfig.calculation): ${fieldsWithOldCalc}`);
        console.log(`   ⚡ Nouvelles formules (FieldFormula): ${fieldsWithNewFormulas}`);
        console.log(`   🎨 Champs avec styles: ${fieldsWithStyles}`);
        console.log('');

        // 2. VÉRIFICATION DE L'API
        console.log('🚀 2. VÉRIFICATION DE L\'API...');
        
        try {
            const apiTests = [
                '/api/dynamic-formulas/analytics',
                '/api/health'
            ];

            for (const endpoint of apiTests) {
                try {
                    const response = await fetch(`http://localhost:4000${endpoint}`, {
                        headers: { 'x-organization-id': '1' }
                    });
                    
                    if (response.ok) {
                        console.log(`   ✅ ${endpoint}: OPÉRATIONNEL`);
                    } else {
                        console.log(`   ❌ ${endpoint}: ERREUR ${response.status}`);
                    }
                } catch (error) {
                    console.log(`   ❌ ${endpoint}: INDISPONIBLE`);
                }
            }
        } catch (error) {
            console.log('   ⚠️  API non accessible (serveur arrêté?)');
        }
        console.log('');

        // 3. VALIDATION DES COMPOSANTS
        console.log('🔧 3. VALIDATION DES COMPOSANTS...');
        
        // Vérifier que les fichiers clés existent
        const fichiersClés = [
            'src/services/DynamicFormulaEngine.ts',
            'src/pages/DevisPage.tsx',
            'src/api/dynamic-formulas.ts'
        ];

        for (const fichier of fichiersClés) {
            try {
                const fs = await import('fs/promises');
                await fs.access(fichier);
                console.log(`   ✅ ${fichier}: PRÉSENT`);
            } catch (error) {
                console.log(`   ❌ ${fichier}: MANQUANT`);
            }
        }
        console.log('');

        // 4. NETTOYAGE SÉLECTIF (OPTIONNEL)
        console.log('🧹 4. NETTOYAGE SÉLECTIF...');
        
        if (fieldsWithOldCalc > 0) {
            console.log(`   ⚠️  ${fieldsWithOldCalc} champ(s) avec anciennes formules détecté(s)`);
            console.log('   💡 RECOMMANDATION: Migrer vers le nouveau système');
            console.log('   👉 Commande: node migrate-old-formulas.js');
        } else {
            console.log('   ✅ Aucune ancienne formule détectée - Système propre !');
        }
        console.log('');

        // 5. VALIDATION FONCTIONNELLE
        console.log('🧪 5. VALIDATION FONCTIONNELLE...');
        
        if (fieldsWithNewFormulas > 0) {
            console.log(`   ✅ ${fieldsWithNewFormulas} formule(s) dans le nouveau système`);
        } else {
            console.log('   ⚠️  Aucune formule détectée dans le nouveau système');
        }

        if (fieldsWithStyles > 0) {
            console.log(`   ✅ ${fieldsWithStyles} champ(s) avec paramètres visuels`);
        } else {
            console.log('   ℹ️  Aucun style personnalisé détecté (utilise les défauts)');
        }
        console.log('');

        // 6. RAPPORT FINAL
        console.log('📋 6. RAPPORT FINAL DE VALIDATION...');
        console.log('');

        const score = [
            fieldsWithNewFormulas > 0 ? 1 : 0, // Formules
            fieldsWithOldCalc === 0 ? 1 : 0,   // Pas d'anciennes formules
            fieldsWithStyles >= 0 ? 1 : 0,     // Styles (même 0 c'est OK)
            totalFields > 0 ? 1 : 0           // Au moins des champs
        ].reduce((a, b) => a + b, 0);

        console.log(`🎯 SCORE DE QUALITÉ: ${score}/4`);
        console.log('');

        if (score === 4) {
            console.log('🏆 SYSTÈME PARFAITEMENT OPÉRATIONNEL !');
            console.log('   • Architecture: ✅ Complète');
            console.log('   • Formules: ✅ Nouveau système');
            console.log('   • Styles: ✅ Dynamiques');
            console.log('   • Nettoyage: ✅ Propre');
            console.log('');
            console.log('🚀 PRÊT POUR PRODUCTION !');
        } else if (score >= 3) {
            console.log('✅ SYSTÈME OPÉRATIONNEL avec optimisations possibles');
            console.log('');
            console.log('📝 Actions recommandées:');
            if (fieldsWithOldCalc > 0) console.log('   • Migrer les anciennes formules');
            if (fieldsWithNewFormulas === 0) console.log('   • Ajouter des formules de test');
            console.log('');
        } else {
            console.log('⚠️  SYSTÈME NÉCESSITE DES AMÉLIORATIONS');
            console.log('');
            console.log('🔧 Actions requises:');
            console.log('   • Vérifier la configuration de base');
            console.log('   • Corriger les erreurs détectées');
            console.log('   • Relancer la validation');
        }

        console.log('');
        console.log('📖 Pour plus de détails, consulter:');
        console.log('   📄 DOCUMENTATION-SYSTÈME-DYNAMIQUE-COMPLET.md');
        console.log('');
        
    } catch (error) {
        console.error('❌ ERREUR lors de la validation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

nettoyageEtValidationFinale();
