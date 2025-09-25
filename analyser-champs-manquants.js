#!/usr/bin/env node

/**
 * 🔍 ANALYSE DES CHAMPS MANQUANTS - Images, Documents, Produit
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyserChampsManquants() {
    console.log('🔍 ANALYSE DES CHAMPS EXISTANTS VS MANQUANTS\n');

    try {
        // 1. Types de champs actuels
        console.log('📊 TYPES DE CHAMPS ACTUELS DANS LA BASE:');
        const fieldTypes = await prisma.field.groupBy({
            by: ['type'],
            _count: { type: true }
        });
        
        fieldTypes.forEach(ft => {
            console.log(`   • ${ft.type}: ${ft._count.type} champ(s)`);
        });
        console.log('');

        // 2. Champs liés aux images/photos
        console.log('🖼️  CHAMPS LIÉS AUX IMAGES/PHOTOS:');
        const imageFields = await prisma.field.findMany({
            where: {
                OR: [
                    { type: { contains: 'image', mode: 'insensitive' } },
                    { label: { contains: 'photo', mode: 'insensitive' } },
                    { label: { contains: 'image', mode: 'insensitive' } },
                    { label: { contains: 'coffret', mode: 'insensitive' } },
                    { label: { contains: 'compteur', mode: 'insensitive' } }
                ]
            }
        });
        
        imageFields.forEach(f => {
            console.log(`   ✅ ${f.label} (type: ${f.type})`);
        });
        
        if (imageFields.length === 0) {
            console.log('   ❌ Aucun champ image trouvé dans la base');
        }
        console.log('');

        // 3. Champs produit
        console.log('📦 CHAMPS PRODUIT:');
        const productFields = await prisma.field.findMany({
            where: {
                OR: [
                    { type: { contains: 'produit', mode: 'insensitive' } },
                    { label: { contains: 'produit', mode: 'insensitive' } }
                ]
            }
        });
        
        productFields.forEach(f => {
            console.log(`   ✅ ${f.label} (type: ${f.type})`);
        });
        
        if (productFields.length === 0) {
            console.log('   ❌ Aucun champ produit trouvé dans la base');
        }
        console.log('');

        // 4. Champs de fichier/document
        console.log('📄 CHAMPS FICHIER/DOCUMENT:');
        const fileFields = await prisma.field.findMany({
            where: {
                OR: [
                    { type: { contains: 'fichier', mode: 'insensitive' } },
                    { type: { contains: 'file', mode: 'insensitive' } },
                    { type: { contains: 'document', mode: 'insensitive' } },
                    { label: { contains: 'document', mode: 'insensitive' } },
                    { label: { contains: 'fichier', mode: 'insensitive' } }
                ]
            }
        });
        
        fileFields.forEach(f => {
            console.log(`   ✅ ${f.label} (type: ${f.type})`);
        });
        
        if (fileFields.length === 0) {
            console.log('   ❌ Aucun champ fichier trouvé dans la base');
        }
        console.log('');

        // 5. Analyse des champs dans les sections existantes
        console.log('🎯 ANALYSE DES SECTIONS POUR RETROUVER LES CHAMPS:');
        const sections = await prisma.section.findMany({
            include: {
                Field: true
            }
        });

        const sectionMesures = sections.find(s => s.name.toLowerCase().includes('mesure'));
        if (sectionMesures) {
            console.log(`   📋 Section "${sectionMesures.name}" trouvée avec ${sectionMesures.Field.length} champs:`);
            sectionMesures.Field.forEach(f => {
                if (f.label.toLowerCase().includes('photo') || 
                    f.label.toLowerCase().includes('image') ||
                    f.label.toLowerCase().includes('coffret') ||
                    f.label.toLowerCase().includes('compteur')) {
                    console.log(`      🖼️  ${f.label} (${f.type})`);
                }
            });
        }
        console.log('');

        // 6. Recommandations
        console.log('💡 CHAMPS MANQUANTS À CRÉER:');
        console.log('   🖼️  image_admin - Image uploadée par l\'admin');
        console.log('   🖼️  image_user - Image uploadée par l\'utilisateur');
        console.log('   📄 fichier_user - Document uploadé par l\'utilisateur');
        console.log('   📦 produit - Champ produit (à transformer en tableau)');
        console.log('');
        
        console.log('🔧 PROCHAINES ÉTAPES:');
        console.log('   1. Créer les types de champs manquants');
        console.log('   2. Les ajouter aux sections appropriées');
        console.log('   3. Mettre à jour DevisPage pour les supporter');
        console.log('');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

analyserChampsManquants();
