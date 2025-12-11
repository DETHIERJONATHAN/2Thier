import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🎯 SIMULATION COMPLÈTE: Que se passe-t-il quand on clique "Ajouter Toit" ?
 * 
 * Cette simulation reproduit EXACTEMENT le flux du code:
 * 1. Récupérer le repeater node
 * 2. Récupérer les templates à copier
 * 3. Appliquer les suffixes
 * 4. Créer les copies
 */

async function simulateAddToitClick() {
  console.log('🎯 === SIMULATION: CLÉ SUR "AJOUTER TOIT" ===\n');
  console.log('='.repeat(100) + '\n');

  // ÉTAPE 1: Récupérer le repeater "Nouveau Section"
  console.log('📍 ÉTAPE 1: Récupérer le repeater node "Nouveau Section"\n');

  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (!repeater) {
    console.log('❌ Repeater introuvable');
    return;
  }

  console.log(`✅ Trouvé: "${repeater.label}" (${repeater.id})\n`);

  // ÉTAPE 2: Parser les template IDs
  console.log('📍 ÉTAPE 2: Parser repeater_templateNodeIds\n');

  let templateIdsFromColumn = [];
  if (repeater.repeater_templateNodeIds) {
    try {
      templateIdsFromColumn = JSON.parse(repeater.repeater_templateNodeIds);
      console.log(`✅ IDs trouvés dans repeater_templateNodeIds: ${templateIdsFromColumn.length}`);
      templateIdsFromColumn.forEach((id, idx) => {
        console.log(`   ${idx + 1}. ${id}`);
      });
    } catch (e) {
      console.log('❌ Erreur parsing templateNodeIds');
    }
  } else {
    console.log('⚠️  repeater_templateNodeIds est NULL');
  }

  console.log('');

  // ÉTAPE 3: Récupérer les templates de la metadata
  console.log('📍 ÉTAPE 3: Vérifier metadata pour autres templates\n');

  let templateIdsFromMeta = [];
  if (repeater.metadata && repeater.metadata.repeater) {
    if (Array.isArray(repeater.metadata.repeater.templateNodeIds)) {
      templateIdsFromMeta = repeater.metadata.repeater.templateNodeIds;
      console.log(`✅ IDs trouvés dans metadata.repeater.templateNodeIds: ${templateIdsFromMeta.length}`);
      templateIdsFromMeta.forEach((id, idx) => {
        console.log(`   ${idx + 1}. ${id}`);
      });
    }
  }

  if (templateIdsFromMeta.length === 0) {
    console.log('✅ Aucun ID dans metadata.repeater.templateNodeIds');
  }

  console.log('');

  // ÉTAPE 4: Fusionner et dédupliquer
  console.log('📍 ÉTAPE 4: Fusionner les templates\n');

  const allTemplateIds = [...new Set([...templateIdsFromColumn, ...templateIdsFromMeta])];
  console.log(`✅ Templates finaux (après déduplication): ${allTemplateIds.length}`);
  allTemplateIds.forEach((id, idx) => {
    console.log(`   ${idx + 1}. ${id}`);
  });

  console.log('\n');

  // ÉTAPE 5: Récupérer les copies existantes pour calculer le prochain suffixe
  console.log('📍 ÉTAPE 5: Chercher les copies existantes\n');

  const children = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: repeater.id },
    select: {
      id: true,
      label: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`✅ Enfants du repeater: ${children.length}\n`);

  // Analyser quels sont les copies
  const copies = children.filter(c => c.metadata?.duplicatedFromRepeater === true);
  const templates = children.filter(c => !c.metadata?.duplicatedFromRepeater);

  console.log(`   - Templates (duplicatedFromRepeater = false): ${templates.length}`);
  templates.forEach(t => console.log(`     • ${t.label || 'N/A'} (${t.id})`));

  console.log(`\n   - Copies (duplicatedFromRepeater = true): ${copies.length}`);
  copies.forEach(c => {
    const match = c.id.match(/-(\d+)$/);
    const suffix = match ? match[1] : '?';
    console.log(`     • ${c.label || 'N/A'} → suffixe -${suffix} (${c.id})`);
  });

  console.log('');

  // ÉTAPE 6: Calculer le prochain suffixe
  console.log('📍 ÉTAPE 6: Calculer le prochain suffixe\n');

  const usedSuffixes = copies
    .map(c => {
      const match = c.id.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(s => s > 0);

  const nextSuffix = usedSuffixes.length === 0 ? 1 : Math.max(...usedSuffixes) + 1;

  console.log(`   Suffixes utilisés: [${usedSuffixes.join(', ') || 'aucun'}]`);
  console.log(`   ➡️  Prochain suffixe: ${nextSuffix}\n`);

  // ÉTAPE 7: POUR CHAQUE TEMPLATE, CRÉER LA COPIE
  console.log('📍 ÉTAPE 7: Créer les copies (ceci est la partie CRITIQUE)\n');
  console.log('='.repeat(100) + '\n');

  for (const templateId of allTemplateIds) {
    // Récupérer le template original
    const template = await prisma.treeBranchLeafNode.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        label: true,
        metadata: true,
        repeater_templateNodeIds: true
      }
    });

    if (!template) {
      console.log(`❌ Template introuvable: ${templateId}\n`);
      continue;
    }

    console.log(`Template: "${template.label}" (${template.id})\n`);

    // ⚠️ CRITICAL: Comment le nouvel ID est-il créé ?
    // Chercher dans repeat-blueprint-builder.ts et deep-copy-service.ts

    // Le code applique simplement: newId = templateId + '-' + suffix
    const newId = `${templateId}-${nextSuffix}`;

    console.log(`   Nouvelle copie:`);
    console.log(`   ID original:  ${templateId}`);
    console.log(`   ➡️  Nouvel ID: ${newId}\n`);

    // Analyser le nouvel ID
    const suffixCount = (newId.match(/-\d+/g) || []).length;

    console.log(`   Analyse du nouvel ID:`);
    console.log(`   - Tirets-chiffres détectés: ${suffixCount}`);
    console.log(`   - Structure: ${suffixCount === 1 ? '✅ CORRECT (un seul suffixe)' : suffixCount > 1 ? '❌ PROBLÈME (double suffixe)' : '❓ ÉTRANGE'}\n`);

    if (suffixCount > 1) {
      console.log(`   ⚠️  ATTENTION: Cet ID aura PLUSIEURS tirets-chiffres!\n`);
      
      // Analyser pourquoi
      console.log(`   🔍 Analyse détaillée:\n`);
      
      // Compter les tirets
      const dashes = templateId.match(/-/g) || [];
      console.log(`   - templateId original contient ${dashes.length} tirets`);
      console.log(`   - On ajoute 1 tiret pour le suffixe`);
      console.log(`   - Total: ${dashes.length + 1} tirets\n`);

      // Vérifier si le templateId est déjà suffixé
      const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
      const isTemplateAlreadySuffixed = hasCopySuffix.test(templateId);

      console.log(`   - templateId contient déjà des suffixes? ${isTemplateAlreadySuffixed ? 'OUI ❌ PROBLÈME!' : 'NON ✅'}\n`);

      if (isTemplateAlreadySuffixed) {
        console.log(`   💡 CAUSE IDENTIFIÉE: Le templateId lui-même est déjà une copie!`);
        console.log(`      On est en train de copier une copie, ce qui crée: uuid-1-1\n`);
        
        // Proposer la solution
        const cleaned = templateId.replace(/(-\d+)+$/, '');
        console.log(`   ✅ SOLUTION: Utiliser l'UUID de base: ${cleaned}\n`);
      }
    }

    console.log('');
  }

  console.log('='.repeat(100) + '\n');
  console.log('🎯 CONCLUSION:\n');

  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
  const problematicTemplates = allTemplateIds.filter(id => hasCopySuffix.test(id));

  if (problematicTemplates.length > 0) {
    console.log(`❌ PROBLÈME IDENTIFIÉ: ${problematicTemplates.length} template(s) avec suffixes\n`);
    console.log('Répétition actuellement en cours:');
    console.log('1. Récupère repeater_templateNodeIds');
    console.log('2. Trouve que ces IDs CONTIENNENT DÉJÀ des suffixes');
    console.log('3. Ajoute un nouveau suffixe: uuid-1 ➡️ uuid-1-1');
    console.log('4. Crée les nœuds avec double suffixe\n');
    
    console.log('💡 FIX: repeater_templateNodeIds doit contenir UNIQUEMENT les UUIDs de base\n');

    problematicTemplates.forEach((id, idx) => {
      const cleaned = id.replace(/(-\d+)+$/, '');
      console.log(`${idx + 1}. ${id}`);
      console.log(`   ➡️  Doit être: ${cleaned}\n`);
    });
  } else {
    console.log('✅ Aucun problème: Les templates sont des UUIDs purs\n');
    console.log('Les copies seront créées correctement: -1, -2, -3, etc.\n');
  }
}

simulateAddToitClick()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
