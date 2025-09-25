// Localisation complète des statuts d'appels
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function locateCallStatuses() {
  try {
    console.log('📍 LOCALISATION DES STATUTS D\'APPELS\n');
    console.log('═'.repeat(60));

    // 1. BASE DE DONNÉES - Table CallStatus
    console.log('🗄️  BASE DE DONNÉES PostgreSQL:');
    console.log('   📋 Table: "CallStatus"');
    console.log('   📊 Schéma: prisma/schema.prisma (lignes ~1200+)');
    
    const callStatusExample = await prisma.callStatus.findFirst({
      include: {
        Organization: { select: { name: true } }
      }
    });
    
    if (callStatusExample) {
      console.log('   🔍 Exemple d\'enregistrement:');
      console.log(`      • ID: ${callStatusExample.id}`);
      console.log(`      • Nom: ${callStatusExample.name}`);
      console.log(`      • Organisation: ${callStatusExample.Organization.name}`);
      console.log(`      • Couleur: ${callStatusExample.color}`);
      console.log(`      • Ordre: ${callStatusExample.order}`);
    }

    // 2. Compter les statuts par organisation
    console.log('\n📊 RÉPARTITION PAR ORGANISATION:');
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    for (const org of organizations) {
      const count = await prisma.callStatus.count({
        where: { organizationId: org.id }
      });
      console.log(`   🏢 ${org.name}: ${count} statuts d'appels`);
    }

    // 3. Structure de la table
    console.log('\n🏗️  STRUCTURE DE LA TABLE CallStatus:');
    console.log('   📋 Champs:');
    console.log('      • id: String (UUID)');
    console.log('      • organizationId: String (FK vers Organization)');
    console.log('      • name: String (ex: "Répondu", "Occupé")');
    console.log('      • description: String (description du statut)');
    console.log('      • color: String (hex color, ex: "#10b981")');
    console.log('      • icon: String (emoji, ex: "✅")');
    console.log('      • order: Int (ordre d\'affichage)');
    console.log('      • isActive: Boolean (statut actif/inactif)');
    console.log('      • isDefault: Boolean (statut par défaut)');
    console.log('      • createdAt: DateTime');
    console.log('      • updatedAt: DateTime');

    // 4. Relations
    console.log('\n🔗 RELATIONS:');
    console.log('   📋 CallStatus appartient à:');
    console.log('      • Organization (1 organisation = N statuts)');
    console.log('   📋 CallStatus est lié à:');
    console.log('      • CallToLeadMapping (pour les mappings vers LeadStatus)');

    // 5. Fichiers concernés
    console.log('\n📁 FICHIERS CONCERNÉS:');
    console.log('   🗃️  Schema: prisma/schema.prisma');
    console.log('   📜 Migration: prisma/migrations/*/migration.sql');
    console.log('   🔧 Script création: create-call-statuses-and-mappings.mjs');
    console.log('   ✅ Script vérification: simple-verify.mjs');

    // 6. Comment accéder aux données
    console.log('\n💻 COMMENT ACCÉDER AUX DONNÉES:');
    console.log('   🔍 Via Prisma Client:');
    console.log('      prisma.callStatus.findMany()');
    console.log('   🔍 Via API (à créer):');
    console.log('      GET /api/call-statuses');
    console.log('   🔍 Via interface (à créer):');
    console.log('      Page de gestion des statuts d\'appels');

    console.log('\n🎯 RÉSUMÉ:');
    console.log('   • Stockage: Base PostgreSQL, table "CallStatus"');
    console.log('   • Accès: Prisma ORM');
    console.log('   • Organisation: Par organisation (multi-tenant)');
    console.log('   • Relations: Liés aux mappings et à l\'organisation');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

locateCallStatuses();
