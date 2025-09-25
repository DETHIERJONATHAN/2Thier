#!/usr/bin/env node

/**
 * Script de diagnostic approfondi du comportement d'authentification Google
 * Analyse les cookies, tokens, et le flux d'authentification complet
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

console.log('🔍 === DIAGNOSTIC APPROFONDI GOOGLE AUTH ===\n');

async function analyzeGoogleAuthBehavior() {
  try {
    console.log('📊 1. ANALYSE DES TOKENS GOOGLE EN BASE');
    console.log('=====================================');
    
    const googleTokens = await prisma.googleToken.findMany({
      include: {
        Organization: {
          select: { id: true, name: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`Tokens Google trouvés: ${googleTokens.length}\n`);

    if (googleTokens.length === 0) {
      console.log('❌ AUCUN TOKEN GOOGLE - C\'est pourquoi il faut se reconnecter !');
    } else {
      googleTokens.forEach((token, index) => {
        console.log(`Token ${index + 1}:`);
        console.log(`  - ID: ${token.id}`);
        console.log(`  - Organisation: ${token.Organization?.name} (${token.Organization?.id})`);
        console.log(`  - Créé: ${token.createdAt.toLocaleString('fr-FR')}`);
        console.log(`  - Modifié: ${token.updatedAt.toLocaleString('fr-FR')}`);
        console.log(`  - Access Token: ${token.accessToken ? 'Présent' : 'Manquant'}`);
        console.log(`  - Refresh Token: ${token.refreshToken ? 'Présent' : 'Manquant'}`);
        console.log(`  - Type: ${token.tokenType}`);
        console.log(`  - Scope: ${token.scope || 'Non défini'}`);
        
        if (token.expiresAt) {
          const isExpired = new Date(token.expiresAt) <= new Date();
          console.log(`  - Expiration: ${new Date(token.expiresAt).toLocaleString('fr-FR')} ${isExpired ? '❌ EXPIRÉ' : '✅ VALIDE'}`);
        } else {
          console.log(`  - Expiration: Non définie`);
        }
        
        console.log('');
      });
    }

    console.log('📊 2. ANALYSE DES CONFIGURATIONS GOOGLE WORKSPACE');
    console.log('================================================');
    
    const googleConfigs = await prisma.googleWorkspaceConfig.findMany({
      include: {
        Organization: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`Configurations Google Workspace: ${googleConfigs.length}\n`);

    googleConfigs.forEach((config, index) => {
      console.log(`Config ${index + 1}:`);
      console.log(`  - ID: ${config.id}`);
      console.log(`  - Organisation: ${config.Organization?.name} (${config.Organization?.id})`);
      console.log(`  - Domain: ${config.domain || 'Non défini'}`);
      console.log(`  - Admin Email: ${config.adminEmail || 'Non défini'}`);
      console.log(`  - Client ID: ${config.clientId ? 'Présent' : 'Manquant'}`);
      console.log(`  - Client Secret: ${config.clientSecret ? 'Présent' : 'Manquant'}`);
      console.log(`  - Actif: ${config.isActive ? '✅ OUI' : '❌ NON'}`);
      console.log('');
    });

    console.log('📊 3. ANALYSE DES UTILISATEURS ET ORGANISATIONS');
    console.log('===============================================');
    
    const users = await prisma.user.findMany({
      include: {
        Organization: {
          select: { id: true, name: true }
        }
      },
      where: {
        email: {
          contains: '@'
        }
      }
    });

    console.log(`Utilisateurs trouvés: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`Utilisateur ${index + 1}:`);
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Nom: ${user.firstName} ${user.lastName}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Organisation: ${user.Organization?.name} (${user.Organization?.id})`);
      console.log(`  - Actif: ${user.isActive ? '✅ OUI' : '❌ NON'}`);
      console.log(`  - Super Admin: ${user.isSuperAdmin ? '✅ OUI' : '❌ NON'}`);
      console.log('');
    });

    console.log('📊 4. RECOMMANDATIONS BASÉES SUR L\'ANALYSE');
    console.log('==========================================');

    if (googleTokens.length === 0) {
      console.log('🔧 PROBLÈME IDENTIFIÉ: Aucun token Google');
      console.log('   - Solution: L\'utilisateur doit s\'authentifier une première fois');
      console.log('   - Cause probable: Tokens supprimés ou jamais créés');
    } else {
      const expiredTokens = googleTokens.filter(t => t.expiresAt && new Date(t.expiresAt) <= new Date());
      
      if (expiredTokens.length > 0) {
        console.log('🔧 PROBLÈME IDENTIFIÉ: Tokens expirés');
        console.log(`   - ${expiredTokens.length} token(s) expiré(s) sur ${googleTokens.length}`);
        console.log('   - Solution: Supprimer les tokens expirés et forcer une nouvelle auth');
      }

      const tokensWithoutRefresh = googleTokens.filter(t => !t.refreshToken);
      if (tokensWithoutRefresh.length > 0) {
        console.log('🔧 PROBLÈME IDENTIFIÉ: Tokens sans refresh_token');
        console.log(`   - ${tokensWithoutRefresh.length} token(s) sans refresh_token`);
        console.log('   - Solution: Ces tokens ne peuvent pas être renouvelés automatiquement');
      }
    }

    if (googleConfigs.length === 0) {
      console.log('🔧 PROBLÈME IDENTIFIÉ: Aucune configuration Google Workspace');
      console.log('   - Solution: Créer une configuration Google Workspace');
    } else {
      const inactiveConfigs = googleConfigs.filter(c => !c.isActive);
      if (inactiveConfigs.length > 0) {
        console.log('🔧 ATTENTION: Configurations inactives détectées');
        console.log(`   - ${inactiveConfigs.length} config(s) inactives sur ${googleConfigs.length}`);
      }
    }

    console.log('\n🔧 ACTIONS RECOMMANDÉES:');
    
    if (googleTokens.length === 0) {
      console.log('1. ✅ Utilisateur doit faire l\'authentification Google complète');
      console.log('2. ✅ Vérifier que les credentials Google sont bien configurés');
    } else {
      console.log('1. ✅ Nettoyer tous les tokens expirés de la base');
      console.log('2. ✅ Forcer une nouvelle authentification après nettoyage');
      console.log('3. ✅ Vérifier le flow de refresh automatique des tokens');
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeGoogleAuthBehavior();
