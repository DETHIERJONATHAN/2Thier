#!/usr/bin/env node

/**
 * ✅ VALIDATION FINALE - Tous les champs sont-ils disponibles ?
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validationFinaleChamps() {
    console.log('✅ VALIDATION FINALE - CHAMPS DISPONIBLES\n');

    try {
        // 1. Compter tous les types de champs
        console.log('📊 TYPES DE CHAMPS DANS LA BASE:');
        const fieldTypes = await prisma.field.groupBy({
            by: ['type'],
            _count: { type: true }
        });
        
        fieldTypes.sort((a, b) => a.type.localeCompare(b.type));
        fieldTypes.forEach(ft => {
            console.log(`   • ${ft.type}: ${ft._count.type} champ(s)`);
        });
        console.log('');

        // 2. Vérifier spécifiquement les champs créés
        console.log('🎯 VÉRIFICATION DES CHAMPS CRÉÉS:');
        
        const imageAdmin = await prisma.field.findMany({
            where: { type: 'image_admin' },
            select: { id: true, label: true, sectionId: true }
        });
        console.log(`   🖼️  image_admin: ${imageAdmin.length} champ(s)`);
        imageAdmin.forEach(f => console.log(`      • ${f.label} (${f.id})`));

        const fichierUser = await prisma.field.findMany({
            where: { type: 'fichier_user' },
            select: { id: true, label: true, sectionId: true }
        });
        console.log(`   📄 fichier_user: ${fichierUser.length} champ(s)`);
        fichierUser.forEach(f => console.log(`      • ${f.label} (${f.id})`));

        const produit = await prisma.field.findMany({
            where: { type: 'produit' },
            select: { id: true, label: true, sectionId: true }
        });
        console.log(`   📦 produit: ${produit.length} champ(s)`);
        produit.forEach(f => console.log(`      • ${f.label} (${f.id})`));

        console.log('');

        // 3. Vérifier les champs existants
        console.log('🖼️  CHAMPS IMAGE EXISTANTS:');
        const imageUser = await prisma.field.findMany({
            where: { type: 'image_user' },
            select: { id: true, label: true }
        });
        console.log(`   image_user: ${imageUser.length} champ(s)`);
        imageUser.forEach(f => console.log(`      • ${f.label}`));
        console.log('');

        // 4. Total par section
        console.log('📋 RÉPARTITION PAR SECTION:');
        const sections = await prisma.section.findMany({
            include: {
                Field: {
                    select: { type: true, label: true }
                }
            }
        });

        sections.forEach(section => {
            console.log(`   📂 ${section.name}: ${section.Field.length} champ(s)`);
            
            // Compter par type dans cette section
            const typeCount = {};
            section.Field.forEach(f => {
                typeCount[f.type] = (typeCount[f.type] || 0) + 1;
            });
            
            Object.entries(typeCount).forEach(([type, count]) => {
                console.log(`      • ${type}: ${count}`);
            });
        });
        console.log('');

        // 5. Résumé final
        const totalFields = await prisma.field.count();
        console.log('🎯 RÉSUMÉ FINAL:');
        console.log(`   📊 Total champs: ${totalFields}`);
        console.log(`   🖼️  Images admin: ${imageAdmin.length}`);
        console.log(`   🖼️  Images utilisateur: ${imageUser.length}`);
        console.log(`   📄 Fichiers utilisateur: ${fichierUser.length}`);
        console.log(`   📦 Produits: ${produit.length}`);
        console.log('');

        if (imageAdmin.length > 0 && fichierUser.length > 0 && produit.length > 0) {
            console.log('✅ TOUS LES CHAMPS MANQUANTS ONT ÉTÉ CRÉÉS !');
            console.log('🚀 Ils sont maintenant disponibles dans les formulaires et devis');
        } else {
            console.log('⚠️  Certains champs manquent encore');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

validationFinaleChamps();
