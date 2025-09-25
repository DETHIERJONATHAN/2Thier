import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const fieldId = 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5'; // Prix Kw/h

(async () => {
  try {
    console.log('📋 Analyse détaillée du champ Prix Kw/h');
    
    // Récupérer tous les nœuds pour ce champ
    const nodes = await prisma.fieldOptionNode.findMany({
      where: { fieldId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }]
    });
    
    console.log(`\nNœuds existants (${nodes.length}):`);
    nodes.forEach(node => {
      console.log(`• ${node.label}`);
      console.log(`  ID: ${node.id}`);
      console.log(`  Parent: ${node.parentId || 'root'}`);
      console.log(`  Value: ${node.value || 'N/A'}`);
      console.log(`  Order: ${node.order}`);
      console.log(`  Data: ${node.data ? JSON.stringify(node.data) : 'null'}`);
      console.log('');
    });

    // Créer une arborescence avec des sous-niveaux
    console.log('🔧 Création d\'une arborescence à plusieurs niveaux...');
    
    // D'abord nettoyer les nœuds existants
    await prisma.fieldOptionNode.deleteMany({
      where: { fieldId }
    });
    
    // Créer la nouvelle structure
    // Niveau 1 - Types de tarification
    const tarif_fixe = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: null,
        label: 'Tarif Fixe',
        value: 'tarif_fixe',
        order: 0
      }
    });
    
    const tarif_variable = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: null,
        label: 'Tarif Variable',
        value: 'tarif_variable',
        order: 1
      }
    });
    
    const tarif_heures_pleines_creuses = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: null,
        label: 'Tarif Heures Pleines/Creuses',
        value: 'tarif_hp_hc',
        order: 2
      }
    });

    // Niveau 2 - Sous-catégories pour Tarif Fixe
    const fixe_base = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: tarif_fixe.id,
        label: 'Tarif de Base',
        value: '0.20',
        order: 0,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix en €/kWh (ex: 0.20)'
          }
        }
      }
    });
    
    const fixe_premium = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: tarif_fixe.id,
        label: 'Tarif Premium',
        value: '0.25',
        order: 1,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix en €/kWh (ex: 0.25)'
          }
        }
      }
    });

    // Niveau 2 - Sous-catégories pour Tarif Variable
    const variable_jour = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: tarif_variable.id,
        label: 'Tarif Jour',
        value: '0.18',
        order: 0,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix jour en €/kWh'
          }
        }
      }
    });
    
    const variable_nuit = await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: tarif_variable.id,
        label: 'Tarif Nuit',
        value: '0.15',
        order: 1,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix nuit en €/kWh'
          }
        }
      }
    });

    // Niveau 2 - Sous-catégories pour HP/HC
    await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: tarif_heures_pleines_creuses.id,
        label: 'Heures Pleines',
        value: '0.22',
        order: 0,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix heures pleines en €/kWh'
          }
        }
      }
    });
    
    await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: tarif_heures_pleines_creuses.id,
        label: 'Heures Creuses',
        value: '0.16',
        order: 1,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix heures creuses en €/kWh'
          }
        }
      }
    });

    // Niveau 3 - Sous-catégories pour certains tarifs
    await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: fixe_base.id,
        label: 'Particulier',
        value: '0.2068',
        order: 0,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix final en €/kWh'
          }
        }
      }
    });
    
    await prisma.fieldOptionNode.create({
      data: {
        fieldId,
        parentId: fixe_base.id,
        label: 'Professionnel',
        value: '0.1850',
        order: 1,
        data: {
          nextField: {
            type: 'number',
            placeholder: 'Prix final en €/kWh'
          }
        }
      }
    });

    console.log('✅ Arborescence créée avec succès !');
    
    // Vérifier la nouvelle structure
    const newNodes = await prisma.fieldOptionNode.findMany({
      where: { fieldId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }]
    });
    
    console.log(`\n📋 Nouvelle structure (${newNodes.length} nœuds):`);
    
    // Fonction pour afficher l'arbre
    const displayTree = (nodes, parentId = null, depth = 0) => {
      const children = nodes.filter(n => n.parentId === parentId);
      children.forEach(node => {
        const indent = '  '.repeat(depth);
        const arrow = depth === 0 ? '•' : depth === 1 ? '├─' : '└─';
        console.log(`${indent}${arrow} ${node.label} (${node.value})`);
        if (node.data && node.data.nextField) {
          console.log(`${indent}   └─ Input: ${node.data.nextField.type} - "${node.data.nextField.placeholder}"`);
        }
        displayTree(nodes, node.id, depth + 1);
      });
    };
    
    displayTree(newNodes);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
