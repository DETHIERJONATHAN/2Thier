import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareDetailedEmails() {
  try {
    console.log('🔍 COMPARAISON DÉTAILLÉE - VOS ENVOIS vs MES TESTS\n');
    
    // Récupérer tous les emails récents
    const recentEmails = await prisma.email.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    console.log(`📊 ${recentEmails.length} emails récents analysés\n`);
    
    // Séparer les emails automatiques vs utilisateur
    const autoEmails = recentEmails.filter(email => 
      email.subject.includes('[TEST') || 
      email.subject.includes('CRM') ||
      email.body.includes('Test automatique')
    );
    
    const userEmails = recentEmails.filter(email => 
      !email.subject.includes('[TEST') && 
      !email.subject.includes('CRM') &&
      !email.body.includes('Test automatique')
    );
    
    console.log('🤖 EMAILS AUTOMATIQUES (qui fonctionnent) :');
    console.log('=' .repeat(60));
    
    autoEmails.forEach((email, index) => {
      console.log(`📧 AUTO ${index + 1}:`);
      console.log(`  📅 Date: ${email.createdAt.toLocaleString('fr-FR')}`);
      console.log(`  📋 Sujet: "${email.subject}"`);
      console.log(`  📏 Taille sujet: ${email.subject.length} caractères`);
      console.log(`  📝 Contenu (début): "${email.body.substring(0, 100)}..."`);
      console.log(`  📏 Taille contenu: ${email.body.length} caractères`);
      console.log(`  📧 Message ID: ${email.messageId || 'N/A'}`);
      console.log(`  🏷️ Dossier: ${email.folder}`);
      
      // Analyse des patterns qui marchent
      console.log(`  ✅ FACTEURS DE SUCCÈS:`);
      if (email.subject.includes('[')) console.log(`    - Sujet avec crochets [...]`);
      if (email.subject.includes('TEST')) console.log(`    - Mot "TEST" dans le sujet`);
      if (email.subject.includes('CRM')) console.log(`    - Mot "CRM" dans le sujet`);
      if (email.subject.includes('-')) console.log(`    - Tiret dans le sujet`);
      if (email.body.includes('HTML') || email.body.includes('<')) console.log(`    - Format HTML`);
      if (email.body.includes('automatique')) console.log(`    - Contexte "automatique"`);
      if (email.body.includes('système')) console.log(`    - Mot "système"`);
      
      console.log();
    });
    
    console.log('👤 EMAILS UTILISATEUR (qui n\'arrivent pas) :');
    console.log('=' .repeat(60));
    
    userEmails.forEach((email, index) => {
      console.log(`📧 USER ${index + 1}:`);
      console.log(`  📅 Date: ${email.createdAt.toLocaleString('fr-FR')}`);
      console.log(`  📋 Sujet: "${email.subject}"`);
      console.log(`  📏 Taille sujet: ${email.subject.length} caractères`);
      console.log(`  📝 Contenu: "${email.body}"`);
      console.log(`  📏 Taille contenu: ${email.body.length} caractères`);
      console.log(`  📧 Message ID: ${email.messageId || 'N/A'}`);
      console.log(`  🏷️ Dossier: ${email.folder}`);
      
      // Analyse des problèmes potentiels
      console.log(`  🚨 PROBLÈMES POTENTIELS:`);
      if (email.subject.length <= 3) console.log(`    ❌ Sujet ultra-court (${email.subject.length} ≤ 3)`);
      if (email.body.length <= 3) console.log(`    ❌ Contenu ultra-court (${email.body.length} ≤ 3)`);
      if (!email.messageId) console.log(`    ⚠️ Pas de Message ID`);
      if (email.subject === email.body) console.log(`    ❌ Sujet = Contenu (suspect)`);
      if (/^[a-z]$/.test(email.subject)) console.log(`    ❌ Sujet = 1 lettre minuscule`);
      if (/^[a-z]$/.test(email.body)) console.log(`    ❌ Contenu = 1 lettre minuscule`);
      
      console.log();
    });
    
    // Comparaison directe
    console.log('🔍 ANALYSE COMPARATIVE:');
    console.log('=' .repeat(60));
    
    if (autoEmails.length > 0 && userEmails.length > 0) {
      const avgAutoSubjectLength = autoEmails.reduce((sum, e) => sum + e.subject.length, 0) / autoEmails.length;
      const avgUserSubjectLength = userEmails.reduce((sum, e) => sum + e.subject.length, 0) / userEmails.length;
      
      const avgAutoBodyLength = autoEmails.reduce((sum, e) => sum + e.body.length, 0) / autoEmails.length;
      const avgUserBodyLength = userEmails.reduce((sum, e) => sum + e.body.length, 0) / userEmails.length;
      
      console.log(`📊 LONGUEUR MOYENNE SUJET:`);
      console.log(`  🤖 Emails automatiques: ${Math.round(avgAutoSubjectLength)} caractères`);
      console.log(`  👤 Emails utilisateur: ${Math.round(avgUserSubjectLength)} caractères`);
      console.log(`  📉 Différence: ${Math.round(avgAutoSubjectLength - avgUserSubjectLength)} caractères\n`);
      
      console.log(`📊 LONGUEUR MOYENNE CONTENU:`);
      console.log(`  🤖 Emails automatiques: ${Math.round(avgAutoBodyLength)} caractères`);
      console.log(`  👤 Emails utilisateur: ${Math.round(avgUserBodyLength)} caractères`);
      console.log(`  📉 Différence: ${Math.round(avgAutoBodyLength - avgUserBodyLength)} caractères\n`);
    }
    
    // Recommandations
    console.log('💡 RECOMMANDATIONS POUR QUE VOS EMAILS ARRIVENT:');
    console.log('=' .repeat(60));
    console.log('1. 📋 Utilisez des sujets de 20+ caractères');
    console.log('2. 📝 Écrivez un contenu de 100+ caractères');
    console.log('3. 🏷️ Ajoutez des mots-clés professionnels ("test", "CRM", "système")');
    console.log('4. 📧 Utilisez un format: "[TYPE] Description - Détails"');
    console.log('5. 🎯 Évitez les sujets/contenus d\'1 seul caractère');
    console.log('6. 💼 Ajoutez du contexte professionnel');
    
    // Test de patterns gagnants
    console.log('\n🎯 PATTERNS QUI MARCHENT (à copier):');
    console.log('=' .repeat(60));
    if (autoEmails.length > 0) {
      const successPattern = autoEmails[0];
      console.log(`📧 MODÈLE À SUIVRE:`);
      console.log(`  Sujet: "${successPattern.subject}"`);
      console.log(`  Structure: [CATÉGORIE] Description - Détails`);
      console.log(`  Longueur sujet: ${successPattern.subject.length} caractères`);
      console.log(`  Longueur contenu: ${successPattern.body.length} caractères`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareDetailedEmails();
