#!/usr/bin/env node

/**
 * 🛠️ CRÉER LES CHAMPS MANQUANTS
 * 
 * Ajoute les champs image_admin, fichier_user et produit
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function creerChampsManquants() {
    console.log('🛠️  CRÉATION DES CHAMPS MANQUANTS\n');

    try {
        // Récupérer une section où ajouter les champs (par exemple "Mesures")
        const sectionMesures = await prisma.section.findFirst({
            where: { name: { contains: 'Mesures', mode: 'insensitive' } },
            include: { Field: true }
        });

        if (!sectionMesures) {
            console.log('❌ Section Mesures introuvable');
            return;
        }

        console.log(`📋 Section trouvée: ${sectionMesures.name} (${sectionMesures.Field.length} champs)`);
        
        const nextOrder = Math.max(...sectionMesures.Field.map(f => f.order || 0), 0) + 1;
        console.log(`📊 Prochain order: ${nextOrder}`);
        console.log('');

        // 1. CHAMP IMAGE_ADMIN
        console.log('🖼️  1. CRÉATION CHAMP IMAGE_ADMIN...');
        const imageAdmin = await prisma.field.create({
            data: {
                label: 'Image Admin',
                type: 'image_admin',
                sectionId: sectionMesures.id,
                order: nextOrder,
                required: false,
                width: '1/2',
                advancedConfig: {
                    imageUrl: '',
                    maxSize: '5MB',
                    acceptedTypes: ['jpg', 'jpeg', 'png', 'webp'],
                    description: 'Image uploadée par l\'administrateur'
                }
            }
        });
        console.log(`   ✅ Créé: ${imageAdmin.label} (ID: ${imageAdmin.id})`);

        // 2. CHAMP FICHIER_USER  
        console.log('📄 2. CRÉATION CHAMP FICHIER_USER...');
        const fichierUser = await prisma.field.create({
            data: {
                label: 'Documents utilisateur',
                type: 'fichier_user',
                sectionId: sectionMesures.id,
                order: nextOrder + 1,
                required: false,
                width: '1/2',
                advancedConfig: {
                    maxSize: '10MB',
                    acceptedTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
                    multiple: true,
                    description: 'Documents que l\'utilisateur peut envoyer'
                }
            }
        });
        console.log(`   ✅ Créé: ${fichierUser.label} (ID: ${fichierUser.id})`);

        // 3. CHAMP PRODUIT
        console.log('📦 3. CRÉATION CHAMP PRODUIT...');
        const produit = await prisma.field.create({
            data: {
                label: 'Produits',
                type: 'produit',
                sectionId: sectionMesures.id,
                order: nextOrder + 2,
                required: false,
                width: 'full',
                advancedConfig: {
                    product: {
                        columns: [
                            { name: 'designation', label: 'Désignation', type: 'text', required: true },
                            { name: 'quantite', label: 'Quantité', type: 'number', required: true },
                            { name: 'prix_unitaire', label: 'Prix unitaire', type: 'number', required: true },
                            { name: 'total', label: 'Total', type: 'number', calculated: true, formula: 'quantite * prix_unitaire' }
                        ],
                        addButton: 'Ajouter un produit',
                        removeButton: 'Supprimer'
                    },
                    description: 'Tableau dynamique de produits'
                }
            }
        });
        console.log(`   ✅ Créé: ${produit.label} (ID: ${produit.id})`);

        console.log('');
        console.log('🎯 RÉSUMÉ DES CRÉATIONS:');
        console.log(`   🖼️  Image Admin: ${imageAdmin.id}`);
        console.log(`   📄 Documents utilisateur: ${fichierUser.id}`);
        console.log(`   📦 Produits: ${produit.id}`);
        console.log('');

        // 4. Vérification finale
        console.log('✅ VÉRIFICATION FINALE...');
        const totalFields = await prisma.field.count();
        const imageAdminCount = await prisma.field.count({ where: { type: 'image_admin' } });
        const fichierUserCount = await prisma.field.count({ where: { type: 'fichier_user' } });
        const produitCount = await prisma.field.count({ where: { type: 'produit' } });

        console.log(`   📊 Total champs: ${totalFields}`);
        console.log(`   🖼️  image_admin: ${imageAdminCount}`);
        console.log(`   📄 fichier_user: ${fichierUserCount}`);  
        console.log(`   📦 produit: ${produitCount}`);
        console.log('');
        
        console.log('🚀 CHAMPS CRÉÉS AVEC SUCCÈS !');
        console.log('   Les champs apparaîtront maintenant dans les formulaires et devis');
        console.log('');

    } catch (error) {
        console.error('❌ Erreur lors de la création:', error);
    } finally {
        await prisma.$disconnect();
    }
}

creerChampsManquants();
