#!/usr/bin/env npx tsx
/**
 * 🔧 SCRIPT DE CORRECTION DES CHAMPS ÉLECTRICITÉ
 * 
 * Corrige les problèmes suivants :
 * 1. Restaure le champ "Puissance compteur" manquant
 * 2. Définit l'ordre correct des champs
 * 3. Ajoute la priorité/autofocus sur "Prix Kw/h"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des champs du sous-onglet Électricité...\n');

  // 1. Récupérer tous les champs LEAF (tous les types leaf_*) et filtrer ceux avec subtab "Électricité"
  const allFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      type: {
        startsWith: 'leaf'
      }
    },
    orderBy: { order: 'asc' }
  });
  
  console.log(`📊 ${allFields.length} champs leaf trouvés au total\n`);
  
  const currentFields = allFields.filter(f => {
    const subtabs = f.subtabs as any;
    const subtab = f.subtab as any;
    
    // Vérifier dans subtabs (array)
    if (Array.isArray(subtabs)) {
      return subtabs.some((st: string) => 
        st?.toLowerCase().includes('électricité') || 
        st?.toLowerCase().includes('electricité')
      );
    }
    
    // Vérifier dans subtab (string unique)
    if (typeof subtab === 'string') {
      return subtab.toLowerCase().includes('électricité') || 
             subtab.toLowerCase().includes('electricité');
    }
    
    // Vérifier dans metadata.subtab ou metadata.subtabs
    const metadata = f.metadata as any;
    if (metadata) {
      if (Array.isArray(metadata.subtabs)) {
        return metadata.subtabs.some((st: string) => 
          st?.toLowerCase().includes('électricité') || 
          st?.toLowerCase().includes('electricité')
        );
      }
      if (typeof metadata.subtab === 'string') {
        return metadata.subtab.toLowerCase().includes('électricité') || 
               metadata.subtab.toLowerCase().includes('electricité');
      }
    }
    
    return false;
  });

  if (currentFields.length === 0) {
    console.error('❌ Aucun champ trouvé pour le sous-onglet Électricité!');
    console.log('\n📋 Quelques exemples de subtabs trouvés:');
    allFields.slice(0, 20).forEach(f => {
      const subtabs = f.subtabs as any;
      if (subtabs) {
        console.log(`   - ${f.label}: ${JSON.stringify(subtabs)}`);
      }
    });
    process.exit(1);
  }

  console.log(`✅ ${currentFields.length} champs trouvés dans le sous-onglet Électricité\n`);

  console.log(`📊 ${currentFields.length} champs trouvés:\n`);
  currentFields.forEach((field, idx) => {
    console.log(`${idx + 1}. [Ordre: ${field.order ?? 'N/A'}] ${field.label}`);
  });

  // 3. Vérifier si "Puissance compteur" existe
  const puissanceCompteur = currentFields.find(f => 
    (f.label?.toLowerCase().includes('puissance') && f.label?.toLowerCase().includes('compteur'))
  );

  if (puissanceCompteur) {
    console.log(`\n✅ Champ "Puissance compteur" existe: ${puissanceCompteur.id}`);
    console.log(`   Visible: ${puissanceCompteur.isVisible}, Actif: ${puissanceCompteur.isActive}, Ordre: ${puissanceCompteur.order}`);
    
    // Vérifier s'il est désactivé et le réactiver si nécessaire
    if (!puissanceCompteur.isVisible || !puissanceCompteur.isActive) {
      console.log('   🔧 Réactivation du champ...');
      await prisma.treeBranchLeafNode.update({
        where: { id: puissanceCompteur.id },
        data: {
          isVisible: true,
          isActive: true
        }
      });
      console.log('   ✅ Champ réactivé');
    }
  } else {
    console.log('\n❌ Champ "Puissance compteur" MANQUANT!');
    console.log('   🔧 Création du champ...');

    // Créer le champ manquant
    // On prend le treeId et parentId du premier champ existant
    const referenceField = currentFields[0];
    if (!referenceField) {
      console.error('❌ Impossible de créer le champ sans référence!');
      return;
    }
    
    const newFieldId = `elec-puissance-compteur-${Date.now()}`;
    const newField = await prisma.treeBranchLeafNode.create({
      data: {
        id: newFieldId,
        treeId: referenceField.treeId,
        parentId: referenceField.parentId,
        type: 'LEAF',
        label: 'Puissance compteur',
        description: 'Puissance du compteur électrique (en kVA ou Ampères)',
        order: 3,
        isVisible: true,
        isActive: true,
        isRequired: false,
        fieldType: 'NUMBER',
        number_min: 0,
        number_max: 100,
        number_step: 1,
        number_unit: 'A',
        text_placeholder: 'Ex: 40A, 63A...',
        appearance_size: 'md',
        appearance_variant: 'default',
        subtabs: ['Électricité'], // 🔥 IMPORTANT: Ajouter le subtab
        metadata: {}
      }
    });

    console.log(`   ✅ Champ créé: ${newField.id}`);
  }

  // 4. Définir l'ordre correct des champs
  const correctOrder = [
    { pattern: ['photo', 'compteur'], order: 0 },
    { pattern: ['compteur', 'intelligent'], order: 1 },
    { pattern: ['photo', 'coffret'], order: 2 },
    { pattern: ['puissance', 'compteur'], order: 3 },
    { pattern: ['réception'], order: 4 },
    { pattern: ['conformité', 'différentiel'], order: 5 },
    { pattern: ['présence', 'couteau'], order: 6 },
    { pattern: ['alimentation'], order: 7 },
    { pattern: ['consommation', 'annuelle'], order: 8 },
    { pattern: ['calcul', 'prix', 'kw'], order: 9 },
    { pattern: ['prix', 'kw/h'], order: 10 }
  ];

  console.log('\n🔄 Mise à jour de l\'ordre des champs...\n');

  for (const field of currentFields) {
    const fieldText = (field.label || '').toLowerCase();
    
    const matchingRule = correctOrder.find(rule =>
      rule.pattern.every(p => fieldText.includes(p.toLowerCase()))
    );

    if (matchingRule && field.order !== matchingRule.order) {
      console.log(`   Mise à jour: "${field.label}"`);
      console.log(`   Ancien ordre: ${field.order} → Nouvel ordre: ${matchingRule.order}`);
      
      await prisma.treeBranchLeafNode.update({
        where: { id: field.id },
        data: { order: matchingRule.order }
      });
    }
  }

  // 5. Ajouter la priorité/autofocus sur "Prix Kw/h"
  const prixKwhField = currentFields.find(f =>
    (f.label?.toLowerCase().includes('prix') && f.label?.toLowerCase().includes('kw/h'))
  );

  if (prixKwhField) {
    console.log(`\n🎯 Configuration de la priorité sur "Prix Kw/h"...`);
    
    const currentMetadata = (prixKwhField.metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      field: {
        ...(currentMetadata.field || {}),
        priority: true,
        autofocus: true,
        appearance: {
          ...((currentMetadata.field as any)?.appearance || {}),
          highlight: true,
          size: 'lg'
        }
      }
    };

    await prisma.treeBranchLeafNode.update({
      where: { id: prixKwhField.id },
      data: {
        metadata: updatedMetadata
      }
    });

    console.log('   ✅ Priorité configurée');
  }

  console.log('\n✅ Corrections terminées!\n');
  console.log('📋 Résumé:');
  console.log(`   - Champs dans le sous-onglet Électricité: ${currentFields.length + (puissanceCompteur ? 0 : 1)}`);
  console.log(`   - Ordre des champs: corrigé`);
  console.log(`   - Priorité "Prix Kw/h": ${prixKwhField ? 'configurée' : 'non trouvée'}`);
  console.log(`   - "Puissance compteur": ${puissanceCompteur ? 'existant' : 'créé'}`);

  // 6. Afficher le résultat final - recherche à nouveau les champs
  const allFieldsAgain = await prisma.treeBranchLeafNode.findMany({
    where: { type: 'LEAF' }
  });
  
  const finalFields = allFieldsAgain.filter(f => {
    const subtabs = (f.subtabs as any);
    const subtab = (f.subtab as any);
    
    if (Array.isArray(subtabs)) {
      return subtabs.some((st: string) => 
        st.toLowerCase().includes('électricité') || 
        st.toLowerCase().includes('electricité')
      );
    }
    
    if (typeof subtab === 'string') {
      return subtab.toLowerCase().includes('électricité') || 
             subtab.toLowerCase().includes('electricité');
    }
    
    return false;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  console.log('\n📊 Ordre final des champs:\n');
  finalFields.forEach((field, idx) => {
    const priority = (field.metadata as any)?.field?.priority ? ' 🎯' : '';
    const visible = field.isVisible ? '✅' : '❌';
    const active = field.isActive ? '✅' : '❌';
    console.log(`${idx + 1}. [${field.order}] ${field.label}${priority} (Visible: ${visible}, Actif: ${active})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
