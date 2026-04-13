import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/database';
import { verifyAuthToken } from '../../../../../auth/auth';
import { logger } from '../../../../../lib/logger';

const prisma = db;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('🚀 [activate-devis1minute] Début de la demande d\'activation');

    // Vérification de l'authentification
    const authResult = await verifyAuthToken(request);
    if (!authResult.isValid || !authResult.user) {
      logger.debug('❌ [activate-devis1minute] Utilisateur non authentifié');
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    // Vérification des permissions Super Admin
    if (authResult.user.role !== 'super_admin') {
      logger.debug('❌ [activate-devis1minute] Utilisateur pas Super Admin:', authResult.user.role);
      return NextResponse.json({ success: false, message: 'Accès refusé - Super Admin requis' }, { status: 403 });
    }

    const organizationId = params.id;
    const { features } = await request.json();

    logger.debug('🎯 [activate-devis1minute] Organisation ID:', organizationId);
    logger.debug('🎯 [activate-devis1minute] Features à activer:', features);

    // Vérifier que l'organisation existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      logger.debug('❌ [activate-devis1minute] Organisation introuvable:', organizationId);
      return NextResponse.json({ 
        success: false, 
        message: 'Organisation introuvable' 
      }, { status: 404 });
    }

    logger.debug('✅ [activate-devis1minute] Organisation trouvée:', organization.name);

    // Trouver tous les modules correspondant aux features Devis1Minute
    const modulesToActivate = await prisma.module.findMany({
      where: {
        feature: { in: features }
      }
    });

    logger.debug(`📦 [activate-devis1minute] ${modulesToActivate.length} modules trouvés pour activation:`, 
      modulesToActivate.map(m => ({ key: m.key, feature: m.feature }))
    );

    if (modulesToActivate.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Aucun module Devis1Minute trouvé à activer' 
      }, { status: 404 });
    }

    // Activer tous les modules pour cette organisation
    const activationResults = [];
    
    for (const module of modulesToActivate) {
      try {
        await prisma.organizationModuleStatus.upsert({
          where: {
            organizationId_moduleId: {
              organizationId: organizationId,
              moduleId: module.id
            }
          },
          update: {
            active: true,
            updatedAt: new Date()
          },
          create: {
            organizationId: organizationId,
            moduleId: module.id,
            active: true
          }
        });

        activationResults.push({
          module: module.key,
          feature: module.feature,
          status: 'activated'
        });

        logger.debug(`✅ [activate-devis1minute] Module "${module.key}" activé`);
      } catch (moduleError) {
        logger.error(`❌ [activate-devis1minute] Erreur activation module "${module.key}":`, moduleError);
        activationResults.push({
          module: module.key,
          feature: module.feature,
          status: 'error'
        });
      }
    }

    logger.debug('📊 [activate-devis1minute] Résultats d\'activation:', activationResults);

    const successCount = activationResults.filter(r => r.status === 'activated').length;
    const totalCount = activationResults.length;

    return NextResponse.json({ 
      success: true, 
      message: `${successCount}/${totalCount} modules Devis1Minute activés pour ${organization.name}`,
      data: {
        organization: organization.name,
        activatedCount: successCount,
        totalCount: totalCount,
        results: activationResults
      }
    });

  } catch (error) {
    logger.error('💥 [activate-devis1minute] Erreur générale:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erreur interne du serveur lors de l\'activation' 
    }, { status: 500 });
  }
  // ⚠️ NE PAS appeler prisma.$disconnect() — le singleton `db` est partagé.
}
