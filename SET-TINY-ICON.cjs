#!/usr/bin/env node

/**
 * 🚀 SCRIPT FINAL: Mettre tous les repeaters en TINY + ICÔNE
 */

const { Client } = require('pg');

async function setTinyIcon() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Jlsl2022%40@localhost:5432/2thier'
  });

  try {
    await client.connect();
    console.log('\n🚀 === MISE À JOUR REPEATERS: TINY + ICÔNE ===\n');

    // Mettre à jour
    const updateResult = await client.query(`
      UPDATE "TreeBranchLeafNode"
      SET 
        "repeater_buttonSize" = 'tiny',
        "repeater_buttonWidth" = 'auto',
        "repeater_iconOnly" = true,
        "repeater_addButtonLabel" = NULL,
        "updatedAt" = NOW()
      WHERE type = 'leaf_repeater'
      RETURNING id, label
    `);

    console.log(`✅ ${updateResult.rows.length} repeater(s) mis à jour:\n`);
    updateResult.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.label || r.id}`);
    });

    console.log('\n📋 Configuration appliquée:');
    console.log('   - Taille: TINY (28px)');
    console.log('   - Largeur: AUTO (responsive)');
    console.log('   - Affichage: ICÔNE SEULE (+)');
    console.log('');
    console.log('🔄 MAINTENANT:');
    console.log('   1. Va dans ton navigateur');
    console.log('   2. Recharge la page (Ctrl+F5)');
    console.log('   3. Ouvre un formulaire avec repeater');
    console.log('   4. TU DOIS VOIR: Un petit bouton [+] de 28x28px');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

setTinyIcon();
