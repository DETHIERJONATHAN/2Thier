/**
 * Peppol Bridge — Odoo JSON-RPC Client
 * 
 * Ce service fait le pont entre Zhiive et Odoo Community pour la e-facturation Peppol.
 * Odoo fonctionne en mode headless comme Access Point Peppol certifié.
 * 
 * Architecture:
 *   Zhiive API → PeppolBridge → Odoo JSON-RPC → peppol.api.odoo.com → Réseau Peppol
 * 
 * Flux supportés:
 *   - Enregistrement d'une organisation sur le réseau Peppol
 *   - Envoi de factures via Peppol (UBL BIS Billing 3.0)
 *   - Réception de factures fournisseurs via Peppol
 *   - Vérification du statut d'envoi
 *   - Vérification de la validité d'un endpoint Peppol
 */

interface OdooJsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data: { message: string; debug?: string };
  };
}

interface OdooCompany {
  id: number;
  name: string;
  vat?: string;
  street?: string;
  city?: string;
  zip?: string;
  country_id?: [number, string];
  peppol_eas?: string;
  peppol_endpoint?: string;
  account_peppol_proxy_state?: string;
}

interface OdooInvoice {
  id: number;
  name: string;
  partner_id: [number, string];
  amount_total: number;
  amount_tax: number;
  currency_id: [number, string];
  invoice_date: string;
  invoice_date_due: string;
  state: string;
  peppol_message_uuid?: string;
  peppol_move_state?: string;
}

interface PeppolBridgeConfig {
  odooUrl: string;
  odooDb: string;
  odooUser: string;
  odooPassword: string;
}

export class PeppolBridge {
  private config: PeppolBridgeConfig;
  private uid: number | null = null;
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(config?: Partial<PeppolBridgeConfig>) {
    this.config = {
      odooUrl: config?.odooUrl || process.env.ODOO_URL || 'http://localhost:8069',
      odooDb: config?.odooDb || process.env.ODOO_DB_NAME || 'odoo_peppol',
      odooUser: config?.odooUser || process.env.ODOO_USER || 'admin',
      odooPassword: config?.odooPassword || process.env.ODOO_PASSWORD || 'admin',
    };
  }

  // ── Authentification Odoo ──

  private async jsonRpc<T = unknown>(url: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${this.config.odooUrl}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionId ? { Cookie: `session_id=${this.sessionId}` } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: ++this.requestId,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Odoo HTTP error: ${response.status} ${response.statusText}`);
    }

    // Extract session cookie if present
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/session_id=([^;]+)/);
      if (match) this.sessionId = match[1];
    }

    const data = (await response.json()) as OdooJsonRpcResponse<T>;
    if (data.error) {
      throw new Error(`Odoo RPC error: ${data.error.data?.message || data.error.message}`);
    }
    return data.result as T;
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    const result = await this.jsonRpc<{ uid: number }>('/web/session/authenticate', {
      db: this.config.odooDb,
      login: this.config.odooUser,
      password: this.config.odooPassword,
    });

    if (!result?.uid) {
      throw new Error('Odoo authentication failed: invalid credentials');
    }
    this.uid = result.uid;
    console.log(`[PeppolBridge] Authenticated with Odoo (uid: ${this.uid})`);
    return this.uid;
  }

  private async call(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<unknown> {
    await this.authenticate();
    return this.jsonRpc('/web/dataset/call_kw', {
      model,
      method,
      args,
      kwargs: { ...kwargs, context: { ...(kwargs.context as object || {}), lang: 'fr_BE' } },
    });
  }

  // ── Gestion des Companies Odoo ──

  /**
   * Crée ou met à jour une company Odoo correspondant à une Colony Zhiive
   */
  async syncOrganization(org: {
    id: string;
    name: string;
    vatNumber?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    peppolEas?: string;
    peppolEndpoint?: string | null;
  }): Promise<{ odooCompanyId: number }> {
    await this.authenticate();

    // Chercher une company existante par VAT (si fourni) ou par nom
    let existing: OdooCompany[] = [];

    if (org.vatNumber) {
      existing = await this.call('res.company', 'search_read', [
        [['vat', '=', org.vatNumber]],
      ], { fields: ['id', 'name'], limit: 1 }) as OdooCompany[];
    }

    if (existing.length === 0) {
      // Fallback: chercher par nom exact
      existing = await this.call('res.company', 'search_read', [
        [['name', '=', org.name]],
      ], { fields: ['id', 'name'], limit: 1 }) as OdooCompany[];
    }

    const companyData = {
      name: org.name,
      vat: org.vatNumber || false,
      street: org.address || false,
      email: org.email || false,
      phone: org.phone || false,
      country_id: 21, // Belgium
      peppol_eas: org.peppolEas || '0208',
      peppol_endpoint: org.peppolEndpoint || false,
    };

    if (existing?.length > 0) {
      await this.call('res.company', 'write', [[existing[0].id], companyData]);
      return { odooCompanyId: existing[0].id };
    }

    // Créer une nouvelle company
    const companyId = await this.call('res.company', 'create', [{
      ...companyData,
      currency_id: 1, // EUR
    }]) as number;

    console.log(`[PeppolBridge] Created Odoo company ${companyId} for org "${org.name}"`);
    return { odooCompanyId: companyId };
  }

  // ── Enregistrement Peppol ──

  /**
   * Enregistre une company Odoo sur le réseau Peppol
   * Utilise le wizard res.config.settings (la bonne API publique d'Odoo 17)
   */
  async registerPeppol(odooCompanyId: number, params: {
    peppolEas: string;
    peppolEndpoint: string;
    contactEmail: string;
    contactPhone: string;
    migrationKey?: string;
  }): Promise<{ status: string }> {
    // 1. Configurer les paramètres Peppol sur la company
    await this.call('res.company', 'write', [
      [odooCompanyId],
      {
        peppol_eas: params.peppolEas,
        peppol_endpoint: params.peppolEndpoint,
        account_peppol_contact_email: params.contactEmail,
        account_peppol_phone_number: params.contactPhone,
        ...(params.migrationKey ? { account_peppol_migration_key: params.migrationKey } : {}),
      },
    ]);

    // 2. Vérifier s'il y a déjà un proxy user (déjà enregistré)
    const proxyUsers = await this.call('account_edi_proxy_client.user', 'search_read', [
      [['company_id', '=', odooCompanyId], ['proxy_type', '=', 'peppol']],
    ], { fields: ['id', 'edi_mode'], limit: 1 }) as Array<{ id: number; edi_mode: string }>;

    if (proxyUsers.length === 0) {
      // 3. Créer un settings wizard et déclencher l'enregistrement via la méthode publique
      const companyContext = {
        lang: 'fr_BE',
        allowed_company_ids: [odooCompanyId],
        force_company: odooCompanyId,
      };

      const settingsId = await this.call('res.config.settings', 'create', [{
        is_account_peppol_participant: true,
        account_peppol_eas: params.peppolEas,
        account_peppol_endpoint: params.peppolEndpoint,
        account_peppol_contact_email: params.contactEmail,
        account_peppol_phone_number: params.contactPhone,
        account_peppol_edi_mode: 'demo',
        ...(params.migrationKey ? { account_peppol_migration_key: params.migrationKey } : {}),
      }], { context: companyContext }) as number;

      // 4. Appeler le bouton d'enregistrement Peppol (méthode publique)
      await this.call('res.config.settings', 'button_create_peppol_proxy_user', [
        [settingsId],
      ], { context: companyContext });
    }

    // 5. Vérifier le statut final
    const company = await this.call('res.company', 'read', [
      [odooCompanyId],
    ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

    return { status: company[0]?.account_peppol_proxy_state || 'pending' };
  }

  /**
   * Vérifie le statut d'enregistrement Peppol d'une company
   */
  async checkRegistrationStatus(odooCompanyId: number): Promise<string> {
    const company = await this.call('res.company', 'read', [
      [odooCompanyId],
    ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

    return company[0]?.account_peppol_proxy_state || 'not_registered';
  }

  // ── Envoi de factures ──

  /**
   * Crée une facture dans Odoo et l'envoie via Peppol
   */
  async sendInvoice(odooCompanyId: number, invoice: {
    partnerName: string;
    partnerVat?: string;
    partnerPeppolEas: string;
    partnerPeppolEndpoint: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    lines: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxPercent: number;
    }>;
  }): Promise<{ odooInvoiceId: number; peppolMessageId?: string }> {
    // 1. Trouver ou créer le partenaire (destinataire)
    let partnerId: number;
    const existingPartners = await this.call('res.partner', 'search_read', [
      [['vat', '=', invoice.partnerVat || ''], ['company_id', '=', odooCompanyId]],
    ], { fields: ['id'], limit: 1 }) as Array<{ id: number }>;

    if (existingPartners.length > 0) {
      partnerId = existingPartners[0].id;
      // Mettre à jour les infos Peppol
      await this.call('res.partner', 'write', [
        [partnerId],
        {
          peppol_eas: invoice.partnerPeppolEas,
          peppol_endpoint: invoice.partnerPeppolEndpoint,
        },
      ]);
    } else {
      partnerId = await this.call('res.partner', 'create', [{
        name: invoice.partnerName,
        vat: invoice.partnerVat || false,
        company_id: odooCompanyId,
        peppol_eas: invoice.partnerPeppolEas,
        peppol_endpoint: invoice.partnerPeppolEndpoint,
        country_id: 21, // Belgium
      }]) as number;
    }

    // 2. Créer la facture dans Odoo
    const invoiceLines = invoice.lines.map((line) => [0, 0, {
      name: line.description,
      quantity: line.quantity,
      price_unit: line.unitPrice,
      // La taxe sera recherchée dans le plan comptable belge
    }]);

    const odooInvoiceId = await this.call('account.move', 'create', [{
      move_type: 'out_invoice',
      company_id: odooCompanyId,
      partner_id: partnerId,
      ref: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      invoice_date_due: invoice.dueDate || false,
      invoice_line_ids: invoiceLines,
    }]) as number;

    // 3. Valider (poster) la facture
    await this.call('account.move', 'action_post', [[odooInvoiceId]]);

    // 4. Envoyer via Peppol
    try {
      await this.call('account.move', 'action_send_and_print', [[odooInvoiceId]], {
        context: {
          force_send_peppol: true,
          company_id: odooCompanyId,
        },
      });
    } catch {
      console.warn(`[PeppolBridge] Peppol send may require manual trigger for invoice ${odooInvoiceId}`);
    }

    // 5. Récupérer le message ID Peppol
    const createdInvoice = await this.call('account.move', 'read', [
      [odooInvoiceId],
    ], { fields: ['peppol_message_uuid', 'peppol_move_state'] }) as OdooInvoice[];

    return {
      odooInvoiceId,
      peppolMessageId: createdInvoice[0]?.peppol_message_uuid || undefined,
    };
  }

  /**
   * Vérifie le statut d'envoi d'une facture Peppol
   */
  async checkInvoiceStatus(odooInvoiceId: number): Promise<{
    status: string;
    messageId?: string;
    error?: string;
  }> {
    const invoice = await this.call('account.move', 'read', [
      [odooInvoiceId],
    ], { fields: ['peppol_move_state', 'peppol_message_uuid'] }) as OdooInvoice[];

    if (!invoice?.length) {
      return { status: 'NOT_FOUND' };
    }

    return {
      status: invoice[0].peppol_move_state || 'unknown',
      messageId: invoice[0].peppol_message_uuid || undefined,
    };
  }

  // ── Réception de factures ──

  /**
   * Déclenche la récupération des documents Peppol entrants
   */
  async fetchIncomingDocuments(odooCompanyId: number): Promise<void> {
    await this.call('account_edi_proxy_client.user', '_peppol_get_new_documents', [], {
      context: { allowed_company_ids: [odooCompanyId] },
    });
    console.log(`[PeppolBridge] Fetched incoming Peppol documents for company ${odooCompanyId}`);
  }

  /**
   * Liste les factures fournisseur reçues via Peppol (vendor bills)
   */
  async getIncomingInvoices(odooCompanyId: number, options?: {
    since?: string;
    limit?: number;
  }): Promise<Array<{
    id: number;
    name: string;
    partnerName: string;
    partnerVat?: string;
    amountTotal: number;
    amountTax: number;
    currency: string;
    invoiceDate: string;
    dueDate?: string;
    state: string;
    peppolMessageId?: string;
  }>> {
    const domain: unknown[][] = [
      ['company_id', '=', odooCompanyId],
      ['move_type', '=', 'in_invoice'],
    ];

    if (options?.since) {
      domain.push(['create_date', '>=', options.since]);
    }

    const bills = await this.call('account.move', 'search_read', [
      domain,
    ], {
      fields: [
        'name', 'partner_id', 'amount_total', 'amount_tax',
        'currency_id', 'invoice_date', 'invoice_date_due',
        'state', 'peppol_message_uuid',
      ],
      limit: options?.limit || 50,
      order: 'create_date desc',
    }) as Array<Record<string, unknown>>;

    return bills.map((bill) => ({
      id: bill.id as number,
      name: bill.name as string,
      partnerName: (bill.partner_id as [number, string])?.[1] || '',
      partnerVat: undefined,
      amountTotal: bill.amount_total as number,
      amountTax: bill.amount_tax as number,
      currency: (bill.currency_id as [number, string])?.[1] || 'EUR',
      invoiceDate: bill.invoice_date as string,
      dueDate: (bill.invoice_date_due as string) || undefined,
      state: bill.state as string,
      peppolMessageId: (bill.peppol_message_uuid as string) || undefined,
    }));
  }

  // ── Utilitaires ──

  /**
   * Vérifie si un endpoint Peppol est valide sur le réseau
   */
  async verifyPeppolEndpoint(eas: string, endpoint: string): Promise<boolean> {
    try {
      const result = await this.call('res.partner', '_check_peppol_participant_exists', [
        `${eas}:${endpoint}`,
      ]);
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si le service Odoo est disponible
   */
  async healthCheck(): Promise<{ ok: boolean; version?: string }> {
    try {
      const response = await fetch(`${this.config.odooUrl}/web/health`);
      if (response.ok) {
        return { ok: true };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Désinscrit une company du réseau Peppol
   * Supprime le proxy user et réinitialise le statut Peppol
   */
  async deregisterPeppol(odooCompanyId: number): Promise<{ success: boolean; previousState?: string }> {
    // 1. Lire l'état actuel
    const company = await this.call('res.company', 'read', [
      [odooCompanyId],
    ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

    const previousState = company[0]?.account_peppol_proxy_state;

    // 2. Trouver le proxy user Peppol
    const proxyUsers = await this.call('account_edi_proxy_client.user', 'search_read', [
      [['company_id', '=', odooCompanyId], ['proxy_type', '=', 'peppol']],
    ], { fields: ['id', 'edi_mode'], limit: 1 }) as Array<{ id: number; edi_mode: string }>;

    if (proxyUsers.length > 0) {
      // 3. Appeler la méthode de désinscription Peppol via le wizard settings
      const companyContext = {
        lang: 'fr_BE',
        allowed_company_ids: [odooCompanyId],
        force_company: odooCompanyId,
      };

      try {
        // Tenter la désinscription officielle via le proxy API Odoo
        await this.call('account_edi_proxy_client.user', '_peppol_deregister', [
          [proxyUsers[0].id],
        ], { context: companyContext });
      } catch {
        // Fallback: réinitialiser manuellement le state
        await this.call('res.company', 'write', [
          [odooCompanyId],
          {
            account_peppol_proxy_state: false,
            is_account_peppol_participant: false,
          },
        ]);

        // Supprimer le proxy user
        await this.call('account_edi_proxy_client.user', 'unlink', [
          [proxyUsers[0].id],
        ]);
      }
    }

    // 4. Vérifier l'état final
    const updated = await this.call('res.company', 'read', [
      [odooCompanyId],
    ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

    const newState = updated[0]?.account_peppol_proxy_state;
    console.log(`[PeppolBridge] Deregistered company ${odooCompanyId}: ${previousState} → ${newState}`);

    return { success: !newState || newState === 'not_registered', previousState };
  }

  /**
   * Déconnexion
   */
  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.jsonRpc('/web/session/destroy', {});
      } catch { /* ignore */ }
      this.sessionId = null;
      this.uid = null;
    }
  }
}

// Singleton — réutilisé par toutes les routes API
let bridgeInstance: PeppolBridge | null = null;

export function getPeppolBridge(): PeppolBridge {
  if (!bridgeInstance) {
    bridgeInstance = new PeppolBridge();
  }
  return bridgeInstance;
}

export default getPeppolBridge;
