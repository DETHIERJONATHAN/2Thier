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
import { notify } from '../services/NotificationHelper';
import { sendPushToUser } from '../routes/push';

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
        Organization: { select: { name: true } },
      },
    });

    if (configs.length === 0) return;

    console.log(`${LOG_PREFIX} Vérification de ${configs.length} organisation(s) en transition...`);

    for (const config of configs) {
      try {
        const vatNumber = `${config.peppolEas === '0208' ? 'BE' : ''}${config.peppolEndpoint}`;
        const peppolCheck = await checkPeppolStatus(vatNumber);
        const orgName = config.Organization?.name || config.organizationId;
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
        Organization: { select: { name: true } },
      },
    });

    if (configs.length === 0) return;

    console.log(`${LOG_PREFIX} Vérification santé de ${configs.length} organisation(s) active(s)...`);

    for (const config of configs) {
      try {
        const vatNumber = `${config.peppolEas === '0208' ? 'BE' : ''}${config.peppolEndpoint}`;
        const peppolCheck = await checkPeppolStatus(vatNumber);
        const orgName = config.Organization?.name || config.organizationId;

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
        Organization: { select: { name: true } },
      },
    });

    if (configs.length === 0) return;

    console.log(`${LOG_PREFIX} 📥 Récupération des factures entrantes pour ${configs.length} organisation(s)...`);

    for (const config of configs) {
      try {
        const orgName = config.Organization?.name || config.organizationId;
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
 * Vérifie le statut de livraison des factures Peppol en cours (PROCESSING)
 * Toutes les 5 minutes — notifie l'utilisateur quand ça passe à SENT/DELIVERED
 */
export const checkInvoiceDeliveryStatuses = cron.schedule('*/5 * * * *', async () => {
  try {
    // 1. Trouver toutes les factures PROCESSING
    const [standaloneInvoices, chantierInvoices] = await Promise.all([
      db.standaloneInvoice.findMany({
        where: { peppolStatus: 'PROCESSING' },
        select: { id: true, invoiceNumber: true, organizationId: true, clientName: true, totalAmount: true, createdById: true, peppolSentAt: true },
      }),
      db.chantierInvoice.findMany({
        where: { peppolStatus: 'PROCESSING' },
        select: { id: true, invoiceNumber: true, organizationId: true, label: true, amount: true, peppolSentAt: true },
      }),
    ]);

    const totalProcessing = standaloneInvoices.length + chantierInvoices.length;
    if (totalProcessing === 0) return;

    console.log(`${LOG_PREFIX} 📬 Vérification statut de ${totalProcessing} facture(s) PROCESSING...`);

    // 2. Grouper par organization pour optimiser les appels Odoo
    const orgIds = [...new Set([
      ...standaloneInvoices.map(i => i.organizationId),
      ...chantierInvoices.map(i => i.organizationId),
    ])];

    for (const orgId of orgIds) {
      try {
        const peppolConfig = await db.peppolConfig.findUnique({
          where: { organizationId: orgId },
          select: { odooCompanyId: true },
        });
        if (!peppolConfig?.odooCompanyId) continue;

        const bridge = getPeppolBridge();

        // Récupérer TOUTES les factures out_invoice de cette company dans Odoo
        const odooInvoices = await bridge.call('account.move', 'search_read', [
          [
            ['company_id', '=', peppolConfig.odooCompanyId],
            ['move_type', '=', 'out_invoice'],
            ['peppol_move_state', 'in', ['done', 'error', 'to_send']],
          ],
        ], { fields: ['name', 'ref', 'peppol_move_state', 'peppol_message_uuid'] }) as Array<{
          id: number; name: string; ref?: string; peppol_move_state: string; peppol_message_uuid?: string;
        }>;

        // Map par numéro de facture Odoo (name) ET par référence CRM (ref)
        const odooByName = new Map(odooInvoices.map(inv => [inv.name, inv]));
        const odooByRef = new Map(odooInvoices.filter(inv => inv.ref).map(inv => [inv.ref!, inv]));

        console.log(`${LOG_PREFIX} Odoo: ${odooInvoices.length} facture(s) trouvée(s) pour company ${peppolConfig.odooCompanyId}`);
        odooInvoices.forEach(inv => console.log(`${LOG_PREFIX}   - ${inv.name} (ref: ${inv.ref || 'N/A'}) → ${inv.peppol_move_state}`));

        const findOdooMatch = (invoiceNumber: string | null) => {
          if (!invoiceNumber) return undefined;
          return odooByName.get(invoiceNumber) || odooByRef.get(invoiceNumber);
        };

        // 3. Vérifier les standalone invoices de cette org
        const orgStandalone = standaloneInvoices.filter(i => i.organizationId === orgId);
        for (const inv of orgStandalone) {
          const odooMatch = findOdooMatch(inv.invoiceNumber);
          if (!odooMatch) continue;

          const odooState = odooMatch.peppol_move_state;
          if (odooState === 'done') {
            // DELIVERED !
            await db.standaloneInvoice.update({
              where: { id: inv.id },
              data: {
                peppolStatus: 'SENT',
                peppolMessageId: odooMatch.peppol_message_uuid || inv.id,
              },
            });

            console.log(`${LOG_PREFIX} ✅ Facture ${inv.invoiceNumber} → SENT (Peppol delivered)`);

            // Notification + Push
            const targetUserId = inv.createdById;
            if (targetUserId) {
              await notify.peppolInvoiceDelivered(orgId, {
                invoiceNumber: inv.invoiceNumber || inv.id,
                clientName: inv.clientName || 'Client',
                amount: inv.totalAmount,
              }, targetUserId, inv.id);

              await sendPushToUser(targetUserId, {
                title: 'Facture Peppol envoyée',
                body: `${inv.invoiceNumber} (${inv.clientName}) a été livrée via Peppol`,
                icon: '/icons/peppol-success.png',
                tag: `peppol-sent-${inv.id}`,
                url: `/facture?id=${inv.id}`,
                type: 'peppol_delivered',
              });
            }
          } else if (odooState === 'error') {
            await db.standaloneInvoice.update({
              where: { id: inv.id },
              data: {
                peppolStatus: 'ERROR',
                peppolError: 'Erreur détectée par Odoo lors de la livraison Peppol',
              },
            });
            console.warn(`${LOG_PREFIX} ❌ Facture ${inv.invoiceNumber} → ERROR (Odoo peppol_move_state=error)`);

            const targetUserId = inv.createdById;
            if (targetUserId) {
              await sendPushToUser(targetUserId, {
                title: 'Erreur Peppol',
                body: `${inv.invoiceNumber} n'a pas pu être livrée via Peppol`,
                icon: '/icons/peppol-error.png',
                tag: `peppol-error-${inv.id}`,
                url: `/facture?id=${inv.id}`,
                type: 'peppol_error',
              });
            }
          }
        }

        // 4. Vérifier les chantier invoices de cette org
        const orgChantier = chantierInvoices.filter(i => i.organizationId === orgId);
        for (const inv of orgChantier) {
          const odooMatch = findOdooMatch(inv.invoiceNumber);
          if (!odooMatch) continue;

          const odooState = odooMatch.peppol_move_state;
          if (odooState === 'done') {
            await db.chantierInvoice.update({
              where: { id: inv.id },
              data: {
                peppolStatus: 'SENT',
                peppolMessageId: odooMatch.peppol_message_uuid || inv.id,
                updatedAt: new Date(),
              },
            });
            console.log(`${LOG_PREFIX} ✅ Facture chantier ${inv.invoiceNumber} → SENT (Peppol delivered)`);

            // Notifier les admins de l'org
            await notify.peppolInvoiceDelivered(orgId, {
              invoiceNumber: inv.invoiceNumber || inv.id,
              clientName: inv.label,
              amount: inv.amount,
            }, undefined, inv.id);

          } else if (odooState === 'error') {
            await db.chantierInvoice.update({
              where: { id: inv.id },
              data: {
                peppolStatus: 'ERROR',
                peppolError: 'Erreur détectée par Odoo lors de la livraison Peppol',
                updatedAt: new Date(),
              },
            });
            console.warn(`${LOG_PREFIX} ❌ Facture chantier ${inv.invoiceNumber} → ERROR`);
          }
        }

      } catch (err) {
        console.error(`${LOG_PREFIX} ❌ Erreur vérification delivery org ${orgId}:`, (err as Error).message);
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Erreur globale check delivery:`, error);
  }
}, { scheduled: false });

/**
 * Démarrer tous les jobs Peppol
 */
export function startPeppolCronJobs() {
  checkTransitionStatuses.start();
  checkActiveStatuses.start();
  fetchIncomingInvoices.start();
  checkInvoiceDeliveryStatuses.start();
  console.log(`${LOG_PREFIX} ✅ Jobs démarrés:`);
  console.log(`${LOG_PREFIX}   - Transition (PENDING/MIGRATION): toutes les 30 min`);
  console.log(`${LOG_PREFIX}   - Santé (ACTIVE): toutes les 6h`);
  console.log(`${LOG_PREFIX}   - Factures entrantes: toutes les 4h`);
  console.log(`${LOG_PREFIX}   - Statut livraison factures: toutes les 5 min`);
}
