/**
 * 🔄 Cron Peppol — Vérification périodique des statuts d'enregistrement
 * 
 * Fréquences :
 *   - PENDING / MIGRATION_PENDING : toutes les 30 minutes
 *   - ACTIVE : toutes les 6 heures (santé)
 * 
 * Détecte automatiquement :
 *   - Quand un transfert est terminé (ancien AP → nous)
 *   - Quand l'enregistrement est validé (PENDING → ACTIVE)
 *   - Quand un problème survient (ACTIVE mais plus dans l'annuaire)
 */

import cron from 'node-cron';
import { db } from '../lib/database';
import { checkPeppolStatus } from '../services/vatLookupService';
import { getPeppolBridge } from '../services/peppolBridge';

const LOG_PREFIX = '🔄 [PEPPOL-CRON]';

/**
 * Vérifie les organisations en transition (PENDING / MIGRATION_PENDING)
 * Toutes les 30 minutes
 */
export const checkTransitionStatuses = cron.schedule('*/30 * * * *', async () => {
  try {
    const configs = await db.peppolConfig.findMany({
      where: {
        registrationStatus: { in: ['PENDING', 'MIGRATION_PENDING'] },
        peppolEndpoint: { not: null },
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (configs.length === 0) return;

    console.log(`${LOG_PREFIX} Vérification de ${configs.length} organisation(s) en transition...`);

    for (const config of configs) {
      try {
        const vatNumber = `${config.peppolEas === '0208' ? 'BE' : ''}${config.peppolEndpoint}`;
        const peppolCheck = await checkPeppolStatus(vatNumber);
        const orgName = config.organization?.name || config.organizationId;
        const oldStatus = config.registrationStatus;

        const updateData: Record<string, unknown> = {};

        if (peppolCheck.isRegistered) {
          if (peppolCheck.isRegisteredWithUs) {
            // Transfert terminé ou activation confirmée → ACTIVE
            updateData.registrationStatus = 'ACTIVE';
            updateData.enabled = true;
            console.log(`${LOG_PREFIX} ✅ ${orgName}: ${oldStatus} → ACTIVE (confirmé sur Peppol)`);
          } else if (peppolCheck.isRegisteredElsewhere) {
            // Toujours chez l'ancien AP
            if (oldStatus !== 'MIGRATION_PENDING') {
              updateData.registrationStatus = 'MIGRATION_PENDING';
            }
            if (peppolCheck.accessPoint && peppolCheck.accessPoint !== config.previousAccessPoint) {
              updateData.previousAccessPoint = peppolCheck.accessPoint;
              updateData.previousApDetectedAt = new Date();
            }
            console.log(`${LOG_PREFIX} ⏳ ${orgName}: toujours chez ${peppolCheck.accessPoint || 'ancien AP'}`);
          }
        } else {
          // Pas dans l'annuaire — vérifier Odoo
          if (config.odooCompanyId) {
            try {
              const bridge = getPeppolBridge();
              const odooStatus = await bridge.checkRegistrationStatus(config.odooCompanyId);
              if (odooStatus === 'active') {
                // Odoo (Access Point certifié) confirme ACTIVE → faire confiance
                updateData.registrationStatus = 'ACTIVE';
                updateData.enabled = true;
                console.log(`${LOG_PREFIX} ✅ ${orgName}: ${oldStatus} → ACTIVE (confirmé par Odoo AP)`);
              } else if (odooStatus === 'not_registered' && oldStatus === 'MIGRATION_PENDING') {
                // L'ancien AP a libéré le numéro, mais notre enregistrement n'est pas encore fait
                console.log(`${LOG_PREFIX} 🔓 ${orgName}: ancien AP a libéré le numéro — prêt pour enregistrement`);
              }
            } catch {
              // Service temporairement indisponible
            }
          }
        }

        if (Object.keys(updateData).length > 0) {
          updateData.lastCheckedAt = new Date();
          await db.peppolConfig.update({
            where: { organizationId: config.organizationId },
            data: updateData,
          });
        } else {
          // Mettre à jour uniquement le timestamp de dernière vérification
          await db.peppolConfig.update({
            where: { organizationId: config.organizationId },
            data: { lastCheckedAt: new Date() },
          });
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} ❌ Erreur pour org ${config.organizationId}:`, (err as Error).message);
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Erreur globale:`, error);
  }
}, { scheduled: false });

/**
 * Vérifie les organisations actives (santé)
 * Toutes les 6 heures
 */
export const checkActiveStatuses = cron.schedule('0 */6 * * *', async () => {
  try {
    const configs = await db.peppolConfig.findMany({
      where: {
        registrationStatus: 'ACTIVE',
        enabled: true,
        peppolEndpoint: { not: null },
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (configs.length === 0) return;

    console.log(`${LOG_PREFIX} Vérification santé de ${configs.length} organisation(s) active(s)...`);

    for (const config of configs) {
      try {
        const vatNumber = `${config.peppolEas === '0208' ? 'BE' : ''}${config.peppolEndpoint}`;
        const peppolCheck = await checkPeppolStatus(vatNumber);
        const orgName = config.organization?.name || config.organizationId;

        if (peppolCheck.isRegistered && peppolCheck.isRegisteredWithUs) {
          // Tout est OK
          await db.peppolConfig.update({
            where: { organizationId: config.organizationId },
            data: { lastCheckedAt: new Date() },
          });
        } else if (peppolCheck.isRegistered && peppolCheck.isRegisteredElsewhere) {
          // ALERTE : quelqu'un d'autre a pris notre enregistrement !
          console.warn(`${LOG_PREFIX} ⚠️ ALERTE: ${orgName} n'est plus chez nous ! Maintenant chez ${peppolCheck.accessPoint}`);
          await db.peppolConfig.update({
            where: { organizationId: config.organizationId },
            data: {
              registrationStatus: 'MIGRATION_PENDING',
              previousAccessPoint: peppolCheck.accessPoint || 'Inconnu',
              previousApDetectedAt: new Date(),
              lastCheckedAt: new Date(),
            },
          });
        } else {
          // Plus dans l'annuaire du tout — peut-être une erreur temporaire
          console.warn(`${LOG_PREFIX} ⚠️ ${orgName}: plus visible dans l'annuaire Peppol (erreur réseau ?)`);
          await db.peppolConfig.update({
            where: { organizationId: config.organizationId },
            data: { lastCheckedAt: new Date() },
          });
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} ❌ Erreur santé org ${config.organizationId}:`, (err as Error).message);
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Erreur globale santé:`, error);
  }
}, { scheduled: false });

/**
 * Récupère automatiquement les factures entrantes Peppol
 * Toutes les 4 heures, pour toutes les orgs avec autoReceiveEnabled + ACTIVE
 */
export const fetchIncomingInvoices = cron.schedule('0 */4 * * *', async () => {
  try {
    const configs = await db.peppolConfig.findMany({
      where: {
        registrationStatus: 'ACTIVE',
        enabled: true,
        autoReceiveEnabled: true,
        odooCompanyId: { not: null },
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (configs.length === 0) return;

    console.log(`${LOG_PREFIX} 📥 Récupération des factures entrantes pour ${configs.length} organisation(s)...`);

    for (const config of configs) {
      try {
        const orgName = config.organization?.name || config.organizationId;
        const bridge = getPeppolBridge();

        // 1. Déclencher le fetch dans Odoo
        await bridge.fetchIncomingDocuments(config.odooCompanyId!);

        // 2. Récupérer les nouvelles factures depuis Odoo
        const lastFetch = await db.peppolIncomingInvoice.findFirst({
          where: { organizationId: config.organizationId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const incomingBills = await bridge.getIncomingInvoices(config.odooCompanyId!, {
          since: lastFetch?.createdAt.toISOString(),
        });

        // 3. Importer dans Zhiive DB
        let imported = 0;
        for (const bill of incomingBills) {
          if (!bill.peppolMessageId) continue;

          const exists = await db.peppolIncomingInvoice.findUnique({
            where: { peppolMessageId: bill.peppolMessageId },
          });

          if (!exists) {
            await db.peppolIncomingInvoice.create({
              data: {
                organizationId: config.organizationId,
                peppolMessageId: bill.peppolMessageId,
                senderEas: '0208',
                senderEndpoint: bill.partnerVat || '',
                senderName: bill.partnerName,
                senderVat: bill.partnerVat,
                invoiceNumber: bill.name,
                invoiceDate: bill.invoiceDate ? new Date(bill.invoiceDate) : null,
                dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
                totalAmount: bill.amountTotal,
                taxAmount: bill.amountTax,
                currency: bill.currency,
                status: 'RECEIVED',
              },
            });
            imported++;
          }
        }

        if (imported > 0) {
          console.log(`${LOG_PREFIX} 📥 ${orgName}: ${imported} nouvelle(s) facture(s) importée(s)`);
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} ❌ Erreur fetch incoming org ${config.organizationId}:`, (err as Error).message);
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Erreur globale fetch incoming:`, error);
  }
}, { scheduled: false });

/**
 * Démarrer tous les jobs Peppol
 */
export function startPeppolCronJobs() {
  checkTransitionStatuses.start();
  checkActiveStatuses.start();
  fetchIncomingInvoices.start();
  console.log(`${LOG_PREFIX} ✅ Jobs démarrés:`);
  console.log(`${LOG_PREFIX}   - Transition (PENDING/MIGRATION): toutes les 30 min`);
  console.log(`${LOG_PREFIX}   - Santé (ACTIVE): toutes les 6h`);
  console.log(`${LOG_PREFIX}   - Factures entrantes: toutes les 4h`);
}
