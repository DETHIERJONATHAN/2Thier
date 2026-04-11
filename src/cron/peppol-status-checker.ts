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
import { SF } from '../components/zhiive/ZhiiveTheme';
import { checkPeppolStatus } from '../services/vatLookupService';
import { getPeppolBridge } from '../services/peppolBridge';
import { notify } from '../services/NotificationHelper';
import { sendPushToUser } from '../routes/push';
import UniversalNotificationService from '../services/UniversalNotificationService';
import { getPostalService } from '../services/PostalEmailService.js';

const LOG_PREFIX = '🔄 [PEPPOL-CRON]';

/**
 * Vérifie les organisations en transition (PENDING / MIGRATION_PENDING)
 * Toutes les 30 minutes
 */
export const checkTransitionStatuses = cron.schedule('*/30 * * * *', async () => {
  try {
    const configs = await db.peppolConfig.findMany({
      where: {
        registrationStatus: { in: ['PENDING', 'MIGRATION_PENDING', 'VERIFICATION_NEEDED'] },
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
              } else if (odooStatus === 'pending') {
                if (oldStatus !== 'PENDING') {
                  updateData.registrationStatus = 'PENDING';
                  console.log(`${LOG_PREFIX} ⏳ ${orgName}: ${oldStatus} → PENDING (Odoo confirme pending)`);
                }
              } else if (odooStatus === 'not_verified' || odooStatus === 'sent_verification') {
                if (oldStatus !== 'VERIFICATION_NEEDED') {
                  updateData.registrationStatus = 'VERIFICATION_NEEDED';
                  console.log(`${LOG_PREFIX} 📱 ${orgName}: ${oldStatus} → VERIFICATION_NEEDED (SMS requis)`);
                }
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
 * Toutes les heures, pour toutes les orgs avec autoReceiveEnabled + ACTIVE
 */
export const fetchIncomingInvoices = cron.schedule('0 */1 * * *', async () => {
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

        // 1. Tenter de déclencher le fetch dans Odoo (non-bloquant — Odoo 17 bloque les méthodes privées via RPC)
        await bridge.fetchIncomingDocuments(config.odooCompanyId!);

        // 2. Récupérer les nouvelles factures depuis Odoo (toujours exécuté, même si étape 1 échoue)
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
        interface CronImportedInvoice { invoiceNumber: string | null; senderName: string | null; totalAmount: number | null; currency: string; }
        const newlyImported: CronImportedInvoice[] = [];
        for (const bill of incomingBills) {
          if (!bill.peppolMessageId) continue;
          // Skip Odoo demo/test bills (e.g. "2_demo_vendor_bill")
          if (bill.peppolMessageId.toLowerCase().includes('demo')) continue;

          const exists = await db.peppolIncomingInvoice.findUnique({
            where: { peppolMessageId: bill.peppolMessageId },
          });

          if (!exists) {
            await db.peppolIncomingInvoice.create({
              data: {
                organizationId: config.organizationId,
                peppolMessageId: bill.peppolMessageId,
                senderEas: bill.partnerVat?.startsWith('BE') ? '0208' : '0208',
                senderEndpoint: bill.partnerVat?.replace(/^BE/, '').replace(/[\s.\-]/g, '') || bill.partnerName || '',
                senderName: bill.partnerName,
                senderVat: bill.partnerVat || null,
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
            newlyImported.push({
              invoiceNumber: bill.name || null,
              senderName: bill.partnerName || null,
              totalAmount: bill.amountTotal ?? null,
              currency: bill.currency || 'EUR',
            });
          }
        }

        if (imported > 0) {
          console.log(`${LOG_PREFIX} 📥 ${orgName}: ${imported} nouvelle(s) facture(s) importée(s)`);

          // 4. Notifications (push + in-app + email)
          try {
            const org = await db.organization.findUnique({
              where: { id: config.organizationId },
              select: { name: true, email: true },
            });

            const orgAdmins = await db.userOrganization.findMany({
              where: { organizationId: config.organizationId, Role: { name: { in: ['admin', 'owner', 'super_admin'] } } },
              include: {
                User: { select: { id: true, firstName: true, lastName: true, EmailAccount: { select: { emailAddress: true } } } },
              },
            });

            const title = imported === 1
              ? `🧾 Nouvelle facture Peppol reçue`
              : `🧾 ${imported} nouvelles factures Peppol reçues`;

            const shortBody = imported === 1
              ? `${newlyImported[0].invoiceNumber || 'Facture'} de ${newlyImported[0].senderName || 'Fournisseur'} (${newlyImported[0].totalAmount?.toFixed(2) || '0.00'}€)`
              : `${imported} factures reçues via Peppol`;

            const notifService = UniversalNotificationService.getInstance();

            for (const admin of orgAdmins) {
              // In-app notification
              notifService.createNotification({
                type: 'NEW_INVOICE',
                title,
                message: shortBody,
                userId: admin.userId,
                organizationId: config.organizationId,
                priority: 'high',
                actionUrl: '/facture?tab=incoming',
                tags: ['peppol', 'incoming', 'cron'],
                metadata: { count: imported, invoices: newlyImported.map(i => i.invoiceNumber) },
              }).catch(err => console.error(`${LOG_PREFIX} Erreur notification in-app:`, err.message));

              // Push notification
              sendPushToUser(admin.userId, {
                title,
                body: shortBody,
                icon: '/icons/peppol-incoming.png',
                tag: `peppol-incoming-${Date.now()}`,
                url: '/facture?tab=incoming',
                type: 'peppol_incoming',
              }).catch(err => console.error(`${LOG_PREFIX} Erreur push:`, err.message));

              // Email @zhiive.com
              const zhiiveEmail = admin.User?.EmailAccount?.emailAddress;
              if (zhiiveEmail) {
                const postal = getPostalService();
                const htmlEmail = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,${SF.primary},#a855f7);padding:20px;border-radius:12px 12px 0 0;color:white;"><h2 style="margin:0;">${title}</h2><p style="margin:5px 0 0;opacity:0.9;">${orgName} — Peppol e-Invoicing</p></div><div style="background:#f8f9fa;padding:20px;border-radius:0 0 12px 12px;"><p>${shortBody}</p><p style="margin-top:16px;"><a href="https://app.2thier.be/facture?tab=incoming" style="background:${SF.primary};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Voir les factures</a></p></div></div>`;
                postal.sendEmail({
                  from: 'comptabilite@zhiive.com',
                  to: zhiiveEmail,
                  subject: `${title} — ${orgName}`,
                  body: htmlEmail,
                  isHtml: true,
                }).catch(err => console.error(`${LOG_PREFIX} Erreur email zhiive ${zhiiveEmail}:`, err.message));
              }
            }

            // Email Colony
            if (org?.email) {
              const postal = getPostalService();
              const htmlEmail = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,${SF.primary},#a855f7);padding:20px;border-radius:12px 12px 0 0;color:white;"><h2 style="margin:0;">${title}</h2><p style="margin:5px 0 0;opacity:0.9;">${orgName} — Peppol e-Invoicing</p></div><div style="background:#f8f9fa;padding:20px;border-radius:0 0 12px 12px;"><p>${shortBody}</p><p style="margin-top:16px;"><a href="https://app.2thier.be/facture?tab=incoming" style="background:${SF.primary};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Voir les factures</a></p></div></div>`;
              postal.sendEmail({
                from: 'comptabilite@zhiive.com',
                to: org.email,
                subject: `${title} — ${orgName}`,
                body: htmlEmail,
                isHtml: true,
              }).catch(err => console.error(`${LOG_PREFIX} Erreur email colony ${org.email}:`, err.message));
            }

            console.log(`${LOG_PREFIX} 🔔 Notifications envoyées: ${imported} facture(s), ${orgAdmins.length} admin(s)`);
          } catch (notifyErr) {
            console.error(`${LOG_PREFIX} ❌ Erreur notifications:`, (notifyErr as Error).message);
          }
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
 * Toutes les 2 minutes — détecte et corrige automatiquement les factures bloquées
 * 
 * Gère 3 cas critiques :
 *   1. Odoo peppol_move_state = 'done'  → SENT + notification
 *   2. Odoo peppol_move_state = 'error' → ERROR + notification
 *   3. Odoo peppol_move_state = 'ready' → Re-trigger l'envoi Peppol (retry auto)
 *   4. Facture PROCESSING > 30 min sans changement → Alerte utilisateur
 */
const MAX_PEPPOL_RETRIES = 5;
const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const checkInvoiceDeliveryStatuses = cron.schedule('*/2 * * * *', async () => {
  try {
    // 1. Trouver les factures PROCESSING + ERROR récentes (< 24h) pour rechecks
    const recentErrorCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [standaloneInvoices, chantierInvoices] = await Promise.all([
      db.standaloneInvoice.findMany({
        where: {
          OR: [
            { peppolStatus: 'PROCESSING' },
            { peppolStatus: 'ERROR', peppolSentAt: { gte: recentErrorCutoff } },
          ],
        },
        select: {
          id: true, invoiceNumber: true, organizationId: true, clientName: true,
          totalAmount: true, createdById: true, peppolSentAt: true,
          peppolRetryCount: true, peppolOdooInvoiceId: true, peppolStatus: true,
        },
      }),
      db.chantierInvoice.findMany({
        where: {
          OR: [
            { peppolStatus: 'PROCESSING' },
            { peppolStatus: 'ERROR', peppolSentAt: { gte: recentErrorCutoff } },
          ],
        },
        select: {
          id: true, invoiceNumber: true, organizationId: true, label: true,
          amount: true, peppolSentAt: true,
          peppolRetryCount: true, peppolOdooInvoiceId: true, peppolStatus: true,
        },
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
        // INCLURE 'ready', 'processing' pour détecter les envois et les recoveries
        const odooInvoices = await bridge.call('account.move', 'search_read', [
          [
            ['company_id', '=', peppolConfig.odooCompanyId],
            ['move_type', '=', 'out_invoice'],
            ['peppol_move_state', 'in', ['done', 'error', 'to_send', 'ready', 'processing']],
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

        /**
         * Tente de re-trigger l'envoi Peppol dans Odoo quand peppol_move_state = 'ready'
         * Utilise le wizard account.move.send (Odoo 17) — la seule méthode qui fonctionne
         */
        const retriggerPeppolSend = async (odooInvoiceId: number, invoiceNumber: string | null): Promise<boolean> => {
          try {
            console.log(`${LOG_PREFIX} 🔄 Re-trigger Peppol send via wizard pour Odoo invoice ${odooInvoiceId} (${invoiceNumber})...`);
            const success = await bridge.sendViaWizard(odooInvoiceId, peppolConfig.odooCompanyId!);
            if (success) {
              console.log(`${LOG_PREFIX} ✅ Re-trigger réussi pour ${invoiceNumber}`);
            } else {
              console.warn(`${LOG_PREFIX} ⚠️ Re-trigger wizard retourné false pour ${invoiceNumber}`);
            }
            return success;
          } catch (err) {
            console.error(`${LOG_PREFIX} ❌ Re-trigger échoué pour ${invoiceNumber}:`, (err as Error).message);
            return false;
          }
        };

        /**
         * Gère le traitement d'une facture selon l'état Odoo
         */
        const processInvoice = async (
          inv: { id: string; invoiceNumber: string | null; peppolSentAt: Date | null; peppolRetryCount: number; peppolOdooInvoiceId: number | null; createdById?: string | null; peppolStatus?: string | null },
          type: 'standalone' | 'chantier',
          displayName: string,
          amount: number,
        ) => {
          const odooMatch = findOdooMatch(inv.invoiceNumber);
          const now = Date.now();
          const sentAt = inv.peppolSentAt ? new Date(inv.peppolSentAt).getTime() : now;
          const isStuck = (now - sentAt) > STUCK_THRESHOLD_MS;

          if (odooMatch) {
            const odooState = odooMatch.peppol_move_state;

            if (odooState === 'done') {
              // ✅ DELIVERED !
              const updateData = {
                peppolStatus: 'SENT' as const,
                peppolMessageId: odooMatch.peppol_message_uuid || inv.id,
                peppolError: null,
                ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
              };

              if (type === 'standalone') {
                await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
              } else {
                await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
              }

              console.log(`${LOG_PREFIX} ✅ Facture ${inv.invoiceNumber} → SENT (Peppol delivered)`);

              // Notification
              const targetUserId = inv.createdById || undefined;
              if (targetUserId) {
                await notify.peppolInvoiceDelivered(orgId, {
                  invoiceNumber: inv.invoiceNumber || inv.id,
                  clientName: displayName,
                  amount,
                }, targetUserId, inv.id);

                await sendPushToUser(targetUserId, {
                  title: '✅ Facture Peppol envoyée',
                  body: `${inv.invoiceNumber} (${displayName}) a été livrée via Peppol`,
                  icon: '/icons/peppol-success.png',
                  tag: `peppol-sent-${inv.id}`,
                  url: `/facture?id=${inv.id}`,
                  type: 'peppol_delivered',
                });
              }

            } else if (odooState === 'error') {
              // ❌ ERROR — only update if not already ERROR (avoid re-notifying)
              if (inv.peppolStatus !== 'ERROR') {
                const updateData = {
                  peppolStatus: 'ERROR' as const,
                  peppolError: 'Erreur détectée par Odoo lors de la livraison Peppol',
                  ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
                };

                if (type === 'standalone') {
                  await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
                } else {
                  await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
                }

                console.warn(`${LOG_PREFIX} ❌ Facture ${inv.invoiceNumber} → ERROR (Odoo peppol_move_state=error)`);

                const targetUserId = inv.createdById || undefined;
                if (targetUserId) {
                  await sendPushToUser(targetUserId, {
                    title: '❌ Erreur Peppol',
                    body: `${inv.invoiceNumber} n'a pas pu être livrée via Peppol`,
                    icon: '/icons/peppol-error.png',
                    tag: `peppol-error-${inv.id}`,
                    url: `/facture?id=${inv.id}`,
                  type: 'peppol_error',
                });
              }
              } // end if not already ERROR

            } else if (odooState === 'processing') {
              // 🔄 Odoo est en train de traiter — si Zhiive dit ERROR, c'était prématuré → revert to PROCESSING
              if (inv.peppolStatus === 'ERROR') {
                const updateData = {
                  peppolStatus: 'PROCESSING' as const,
                  peppolError: 'Odoo traite encore la facture — statut corrigé automatiquement',
                  ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
                };
                if (type === 'standalone') {
                  await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
                } else {
                  await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
                }
                console.log(`${LOG_PREFIX} 🔄 Facture ${inv.invoiceNumber}: ERROR → PROCESSING (Odoo dit processing, recovery auto)`);
              }
              // Sinon, déjà PROCESSING dans Zhiive — rien à faire

            } else if (odooState === 'ready' || odooState === 'to_send') {
              // 🔄 L'envoi Peppol n'a jamais été déclenché ou est bloqué → RETRY AUTO
              if (inv.peppolRetryCount < MAX_PEPPOL_RETRIES) {
                const newRetryCount = inv.peppolRetryCount + 1;
                console.warn(`${LOG_PREFIX} ⚠️ Facture ${inv.invoiceNumber}: Odoo state="${odooState}" — retry ${newRetryCount}/${MAX_PEPPOL_RETRIES}`);

                const retriggerSuccess = await retriggerPeppolSend(odooMatch.id, inv.invoiceNumber);

                const updateData = {
                  peppolRetryCount: newRetryCount,
                  peppolOdooInvoiceId: odooMatch.id,
                  peppolError: retriggerSuccess
                    ? `Retry ${newRetryCount}/${MAX_PEPPOL_RETRIES} — re-trigger envoyé`
                    : `Retry ${newRetryCount}/${MAX_PEPPOL_RETRIES} — re-trigger échoué`,
                  ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
                };

                if (type === 'standalone') {
                  await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
                } else {
                  await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
                }
              } else {
                // Max retries atteint → ERROR
                console.error(`${LOG_PREFIX} 🚨 Facture ${inv.invoiceNumber}: MAX RETRIES (${MAX_PEPPOL_RETRIES}) atteint → ERROR`);

                const updateData = {
                  peppolStatus: 'ERROR' as const,
                  peppolError: `Échec après ${MAX_PEPPOL_RETRIES} tentatives. L'envoi Peppol via Odoo n'a pas abouti (state: ${odooState}). Contactez le support.`,
                  ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
                };

                if (type === 'standalone') {
                  await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
                } else {
                  await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
                }

                const targetUserId = inv.createdById || undefined;
                if (targetUserId) {
                  await sendPushToUser(targetUserId, {
                    title: '🚨 Peppol: échec définitif',
                    body: `${inv.invoiceNumber} n'a pas pu être envoyée après ${MAX_PEPPOL_RETRIES} tentatives`,
                    icon: '/icons/peppol-error.png',
                    tag: `peppol-maxretry-${inv.id}`,
                    url: `/facture?id=${inv.id}`,
                    type: 'peppol_error',
                  });
                }
              }
            }
          } else if (isStuck) {
            // Pas trouvé dans Odoo ET bloqué depuis > 30 min → Alerte
            console.warn(`${LOG_PREFIX} 🚨 Facture ${inv.invoiceNumber} PROCESSING depuis ${Math.round((now - sentAt) / 60000)} min — non trouvée dans Odoo !`);

            if (inv.peppolRetryCount >= MAX_PEPPOL_RETRIES) {
              // Max retries + pas dans Odoo → ERROR définitif
              const updateData = {
                peppolStatus: 'ERROR' as const,
                peppolError: `Facture introuvable dans Odoo après ${MAX_PEPPOL_RETRIES} tentatives. Réessayez manuellement.`,
                ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
              };

              if (type === 'standalone') {
                await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
              } else {
                await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
              }
            } else {
              // Juste mettre à jour l'erreur pour info mais laisser en PROCESSING
              const updateData = {
                peppolError: `⏳ En attente depuis ${Math.round((now - sentAt) / 60000)} min — vérification en cours`,
                ...(type === 'chantier' ? { updatedAt: new Date() } : {}),
              };

              if (type === 'standalone') {
                await db.standaloneInvoice.update({ where: { id: inv.id }, data: updateData });
              } else {
                await db.chantierInvoice.update({ where: { id: inv.id }, data: updateData });
              }

              // Notifier après 30 min
              const targetUserId = inv.createdById || undefined;
              if (targetUserId && inv.peppolRetryCount === 0) {
                await sendPushToUser(targetUserId, {
                  title: '⏳ Peppol: envoi lent',
                  body: `${inv.invoiceNumber} est en cours d'envoi depuis ${Math.round((now - sentAt) / 60000)} min`,
                  icon: '/icons/peppol-warning.png',
                  tag: `peppol-slow-${inv.id}`,
                  url: `/facture?id=${inv.id}`,
                  type: 'peppol_warning',
                });
              }
            }
          }
        };

        // 3. Traiter les standalone invoices
        const orgStandalone = standaloneInvoices.filter(i => i.organizationId === orgId);
        for (const inv of orgStandalone) {
          await processInvoice(inv, 'standalone', inv.clientName || 'Client', inv.totalAmount);
        }

        // 4. Traiter les chantier invoices
        const orgChantier = chantierInvoices.filter(i => i.organizationId === orgId);
        for (const inv of orgChantier) {
          await processInvoice(
            { ...inv, createdById: null },
            'chantier',
            inv.label,
            inv.amount,
          );
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
  console.log(`${LOG_PREFIX}   - Statut livraison factures: toutes les 2 min (retry auto + alerte stuck)`);
}
