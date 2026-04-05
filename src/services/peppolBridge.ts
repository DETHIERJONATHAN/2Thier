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

  async call(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<unknown> {
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

    // Installer le plan comptable belge pour cette nouvelle company
    await this.installChartOfAccounts(companyId);

    return { odooCompanyId: companyId };
  }

  /**
   * Installe le plan comptable belge (l10n_be) pour une company Odoo.
   * Sans plan comptable, Odoo ne crée pas de comptes (account.account) pour cette company,
   * et toute création de facture échoue avec "Missing required account on accountable line".
   */
  async installChartOfAccounts(odooCompanyId: number): Promise<void> {
    await this.authenticate();
    const companyContext = { allowed_company_ids: [odooCompanyId], company_id: odooCompanyId };

    try {
      // Vérifier si la company a déjà des comptes
      const existingAccounts = await this.call('account.account', 'search_read', [
        [['company_id', '=', odooCompanyId]],
      ], { fields: ['id'], limit: 1 }) as Array<{ id: number }>;

      if (existingAccounts.length > 0) {
        console.log(`[PeppolBridge] Company ${odooCompanyId} a déjà ${existingAccounts.length}+ comptes, skip chart install`);
        return;
      }

      console.log(`[PeppolBridge] Installation plan comptable belge pour company ${odooCompanyId}...`);

      // Méthode 1: Odoo 17+ — account.chart.template.try_loading('be')
      try {
        await this.call('account.chart.template', 'try_loading', ['be'], {
          context: companyContext,
        });
        console.log(`[PeppolBridge] ✅ Plan comptable 'be' installé via try_loading pour company ${odooCompanyId}`);
        return;
      } catch (e1) {
        console.warn(`[PeppolBridge] try_loading('be') échoué:`, (e1 as Error).message);
      }

      // Méthode 2: Odoo 16 — via res.config.settings
      try {
        // Chercher le template belge
        const templates = await this.call('account.chart.template', 'search_read', [
          [['name', 'ilike', 'belg']],
        ], { fields: ['id', 'name'], limit: 1 }) as Array<{ id: number; name: string }>;

        if (templates.length > 0) {
          const templateId = templates[0].id;
          console.log(`[PeppolBridge] Template trouvé: ${templates[0].name} (id=${templateId})`);

          // Créer un wizard res.config.settings avec le chart_template
          const settingsId = await this.call('res.config.settings', 'create', [{
            company_id: odooCompanyId,
            chart_template_id: templateId,
          }], { context: companyContext }) as number;

          // Exécuter le wizard
          await this.call('res.config.settings', 'set_chart_of_accounts', [[settingsId]], {
            context: companyContext,
          });

          console.log(`[PeppolBridge] ✅ Plan comptable installé via res.config.settings pour company ${odooCompanyId}`);
          return;
        }
      } catch (e2) {
        console.warn(`[PeppolBridge] res.config.settings chart échoué:`, (e2 as Error).message);
      }

      // Méthode 3: Fallback — copier les comptes essentiels depuis la company principale
      console.log(`[PeppolBridge] Fallback: copie des comptes essentiels pour company ${odooCompanyId}`);
      await this.copyEssentialAccounts(odooCompanyId);

    } catch (e) {
      console.error(`[PeppolBridge] Erreur installation plan comptable pour company ${odooCompanyId}:`, e);
      // Ne pas bloquer — on essaiera de créer des comptes à la volée lors de l'envoi
    }

    // TOUJOURS garantir les taxes belges standard après l'installation du plan comptable
    // Même si try_loading a fonctionné, on s'assure que les taxes sont bien présentes
    await this.ensureBelgianTaxes(odooCompanyId);
  }

  /**
   * Copie les comptes essentiels (ventes, achats, banque) depuis la company principale vers une nouvelle company.
   * Utilisé en dernier recours si l'installation du plan comptable échoue.
   */
  private async copyEssentialAccounts(targetCompanyId: number): Promise<void> {
    // Trouver la première company qui a des comptes (normalement company_id=1)
    const sourceAccounts = await this.call('account.account', 'search_read', [
      [['account_type', 'in', ['income', 'income_other']]],
    ], { fields: ['id', 'code', 'name', 'account_type', 'company_id', 'reconcile'], limit: 5 }) as Array<{
      id: number; code: string; name: string; account_type: string; company_id: [number, string]; reconcile: boolean;
    }>;

    if (sourceAccounts.length === 0) {
      console.warn('[PeppolBridge] Aucun compte source trouvé pour copie');
      return;
    }

    const sourceCompanyId = sourceAccounts[0].company_id[0];
    console.log(`[PeppolBridge] Source company pour comptes: ${sourceCompanyId} (${sourceAccounts[0].company_id[1]})`);

    // Comptes essentiels à copier: revenus + taxes
    const accountsToCopy = await this.call('account.account', 'search_read', [
      [['company_id', '=', sourceCompanyId], ['account_type', 'in', ['income', 'income_other', 'expense', 'asset_receivable', 'liability_payable']]],
    ], { fields: ['code', 'name', 'account_type', 'reconcile'], limit: 20 }) as Array<{
      code: string; name: string; account_type: string; reconcile: boolean;
    }>;

    let created = 0;
    for (const acc of accountsToCopy) {
      try {
        await this.call('account.account', 'create', [{
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type,
          company_id: targetCompanyId,
          reconcile: acc.reconcile,
        }]);
        created++;
      } catch (e) {
        // Peut échouer si le code existe déjà pour cette company
        console.warn(`[PeppolBridge] Skip compte ${acc.code}: ${(e as Error).message?.substring(0, 80)}`);
      }
    }

    // Les taxes sont gérées par ensureBelgianTaxes() — appelé automatiquement après
    console.log(`[PeppolBridge] ✅ Comptes copiés: ${created}/${accountsToCopy.length} (taxes via ensureBelgianTaxes)`);
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
    await this.authenticate();
    const adminUid = this.uid!;

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
      // 3. Switcher l'admin sur la company cible (obligatoire pour res.config.settings)
      await this.call('res.users', 'write', [[adminUid], { company_id: odooCompanyId }]);

      try {
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
          account_peppol_edi_mode: 'prod',
          ...(params.migrationKey ? { account_peppol_migration_key: params.migrationKey } : {}),
        }], { context: companyContext }) as number;

        // 4. Appeler le bouton d'enregistrement Peppol (méthode publique)
        await this.call('res.config.settings', 'button_create_peppol_proxy_user', [
          [settingsId],
        ], { context: companyContext });
      } finally {
        // 5. TOUJOURS restaurer l'admin sur company 1
        await this.call('res.users', 'write', [[adminUid], { company_id: 1 }]).catch(e =>
          console.error('[PeppolBridge] Erreur restauration admin company:', e)
        );
      }
    }

    // 6. Vérifier le statut final
    const company = await this.call('res.company', 'read', [
      [odooCompanyId],
    ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

    const state = company[0]?.account_peppol_proxy_state || 'not_registered';
    console.log(`[PeppolBridge] registerPeppol company ${odooCompanyId} → state: ${state}`);
    return { status: state };
  }

  /**
   * Envoie le SMS de vérification Peppol pour une company
   */
  async sendVerificationCode(odooCompanyId: number): Promise<{ success: boolean }> {
    await this.authenticate();
    const adminUid = this.uid!;

    // Switcher l'admin sur la company cible
    await this.call('res.users', 'write', [[adminUid], { company_id: odooCompanyId }]);

    try {
      const companyContext = {
        lang: 'fr_BE',
        allowed_company_ids: [odooCompanyId],
        force_company: odooCompanyId,
      };

      const settingsId = await this.call('res.config.settings', 'create', [{}], {
        context: companyContext,
      }) as number;

      await this.call('res.config.settings', 'button_send_peppol_verification_code', [
        [settingsId],
      ], { context: companyContext });

      console.log(`[PeppolBridge] SMS de vérification envoyé pour company ${odooCompanyId}`);
      return { success: true };
    } finally {
      await this.call('res.users', 'write', [[adminUid], { company_id: 1 }]).catch(e =>
        console.error('[PeppolBridge] Erreur restauration admin company:', e)
      );
    }
  }

  /**
   * Vérifie le code SMS Peppol pour une company
   */
  async verifyCode(odooCompanyId: number, code: string): Promise<{ status: string }> {
    await this.authenticate();
    const adminUid = this.uid!;

    // Switcher l'admin sur la company cible
    await this.call('res.users', 'write', [[adminUid], { company_id: odooCompanyId }]);

    try {
      const companyContext = {
        lang: 'fr_BE',
        allowed_company_ids: [odooCompanyId],
        force_company: odooCompanyId,
      };

      // Créer un wizard et écrire le code
      const settingsId = await this.call('res.config.settings', 'create', [{}], {
        context: companyContext,
      }) as number;

      await this.call('res.config.settings', 'write', [
        [settingsId],
        { account_peppol_verification_code: code },
      ], { context: companyContext });

      await this.call('res.config.settings', 'button_check_peppol_verification_code', [
        [settingsId],
      ], { context: companyContext });

      // Vérifier le statut après vérification
      const company = await this.call('res.company', 'read', [
        [odooCompanyId],
      ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

      const state = company[0]?.account_peppol_proxy_state || 'not_verified';
      console.log(`[PeppolBridge] Vérification SMS company ${odooCompanyId} → state: ${state}`);
      return { status: state };
    } finally {
      await this.call('res.users', 'write', [[adminUid], { company_id: 1 }]).catch(e =>
        console.error('[PeppolBridge] Erreur restauration admin company:', e)
      );
    }
  }

  /**
   * Vérifie le statut d'enregistrement Peppol d'une company.
   * Déclenche d'abord le cron Odoo pour forcer la mise à jour depuis le réseau Peppol.
   */
  async checkRegistrationStatus(odooCompanyId: number): Promise<string> {
    // Déclencher le cron Odoo "PEPPOL: update participant status" (id=20)
    // pour que Odoo contacte peppol.api.odoo.com et mette à jour pending → active
    try {
      await this.call('ir.cron', 'method_direct_trigger', [[20]]);
    } catch (e) {
      console.warn('[PeppolBridge] Cron Peppol trigger échoué (non bloquant):', (e as Error).message?.substring(0, 100));
    }

    const company = await this.call('res.company', 'read', [
      [odooCompanyId],
    ], { fields: ['account_peppol_proxy_state'] }) as OdooCompany[];

    return company[0]?.account_peppol_proxy_state || 'not_registered';
  }

  // ── Recherche de comptes comptables ──

  /**
   * Cherche un compte de type revenu pour une company Odoo spécifique.
   * Renvoie l'id du compte ou undefined si aucun trouvé.
   * NE cherche JAMAIS dans d'autres companies (évite "Incompatible companies" Odoo).
   */
  private async findIncomeAccount(odooCompanyId: number): Promise<number | undefined> {
    try {
      // Odoo 17+: account_type = 'income' ou 'income_other'
      const accounts = await this.call('account.account', 'search_read', [
        [['company_id', '=', odooCompanyId], ['account_type', 'in', ['income', 'income_other']]],
      ], { fields: ['id', 'code', 'name'], limit: 5 }) as Array<{ id: number; code: string; name: string }>;
      console.log(`[PeppolBridge] Comptes revenus (company=${odooCompanyId}):`, accounts.map(a => `${a.id}:${a.code}:${a.name}`));
      if (accounts.length > 0) {
        // Préférer le 700000 (ventes marchandises Belgique)
        const preferred = accounts.find(a => a.code?.startsWith('7000')) || accounts[0];
        return preferred.id;
      }

      // Fallback: code commençant par 7
      const accByCode = await this.call('account.account', 'search_read', [
        [['company_id', '=', odooCompanyId], ['code', '=like', '7%']],
      ], { fields: ['id', 'code'], limit: 5 }) as Array<{ id: number; code: string }>;
      if (accByCode.length > 0) return accByCode[0].id;

      // Dernier fallback: n'importe quel compte non-receivable/payable DE CETTE company uniquement
      const anyAccounts = await this.call('account.account', 'search_read', [
        [['company_id', '=', odooCompanyId], ['account_type', 'not in', ['asset_receivable', 'liability_payable', 'off_balance']]],
      ], { fields: ['id', 'code', 'account_type'], limit: 1 }) as Array<{ id: number; code: string; account_type: string }>;
      if (anyAccounts.length > 0) return anyAccounts[0].id;

      return undefined;
    } catch (e) {
      console.warn('[PeppolBridge] Erreur recherche compte:', e);
      return undefined;
    }
  }

  // ── Auto-provisioning Taxes Belges ──

  /**
   * Taxes belges standard — identiques pour TOUTES les colonies Zhiive.
   * Crée les tax groups + taxes de vente si manquants pour une company.
   * C'est le coeur du système self-service : quand une Colony active Peppol,
   * on garantit que toute l'infrastructure fiscale est en place.
   */
  private static readonly BELGIAN_TAX_GROUPS = [
    { name: 'VAT 21%' },
    { name: 'VAT 12%' },
    { name: 'VAT 6%' },
    { name: 'VAT 0%' },
  ];

  private static readonly BELGIAN_SALES_TAXES = [
    { name: '21%', amount: 21, groupName: 'VAT 21%' },
    { name: '12%', amount: 12, groupName: 'VAT 12%' },
    { name: '6%', amount: 6, groupName: 'VAT 6%' },
    { name: '0%', amount: 0, groupName: 'VAT 0%' },
    { name: '0% Cocont', amount: 0, groupName: 'VAT 0%' },
  ];

  async ensureBelgianTaxes(odooCompanyId: number): Promise<void> {
    await this.authenticate();

    // 1. Vérifier si cette company a déjà des taxes de vente
    const existingTaxes = await this.call('account.tax', 'search_read', [
      [['company_id', '=', odooCompanyId], ['type_tax_use', '=', 'sale']],
    ], { fields: ['id', 'name', 'amount'], limit: 20 }) as Array<{ id: number; name: string; amount: number }>;

    if (existingTaxes.length >= 4) {
      // Déjà provisionné (au moins 21%, 12%, 6%, 0%)
      console.log(`[PeppolBridge] Company ${odooCompanyId}: ${existingTaxes.length} taxes de vente existantes, skip provisioning`);
      return;
    }

    console.log(`[PeppolBridge] 🏗️ Auto-provisioning taxes belges pour company ${odooCompanyId} (actuellement: ${existingTaxes.length} taxes)...`);

    // 2. Garantir les tax groups pour cette company
    const existingGroups = await this.call('account.tax.group', 'search_read', [
      [['company_id', '=', odooCompanyId]],
    ], { fields: ['id', 'name'], limit: 20 }) as Array<{ id: number; name: string }>;

    const groupMap = new Map(existingGroups.map(g => [g.name, g.id]));

    for (const tg of PeppolBridge.BELGIAN_TAX_GROUPS) {
      if (!groupMap.has(tg.name)) {
        try {
          const newId = await this.call('account.tax.group', 'create', [{
            name: tg.name,
            company_id: odooCompanyId,
          }]) as number;
          groupMap.set(tg.name, newId);
          console.log(`[PeppolBridge]   ✅ Tax group '${tg.name}' créé (id=${newId})`);
        } catch (e) {
          console.warn(`[PeppolBridge]   ⚠️ Tax group '${tg.name}' création échouée:`, (e as Error).message?.substring(0, 100));
        }
      }
    }

    // 3. Créer les taxes de vente manquantes
    const existingAmounts = new Set(existingTaxes.map(t => `${t.name}|${t.amount}`));

    for (const tax of PeppolBridge.BELGIAN_SALES_TAXES) {
      const key = `${tax.name}|${tax.amount}`;
      if (existingAmounts.has(key)) continue;

      const taxGroupId = groupMap.get(tax.groupName);
      if (!taxGroupId) {
        console.warn(`[PeppolBridge]   ⚠️ Pas de tax group '${tax.groupName}' pour la taxe '${tax.name}', skip`);
        continue;
      }

      try {
        const taxId = await this.call('account.tax', 'create', [{
          name: tax.name,
          amount: tax.amount,
          amount_type: 'percent',
          type_tax_use: 'sale',
          company_id: odooCompanyId,
          tax_group_id: taxGroupId,
        }]) as number;
        console.log(`[PeppolBridge]   ✅ Taxe '${tax.name}' (${tax.amount}%) créée (id=${taxId})`);
      } catch (e) {
        console.warn(`[PeppolBridge]   ⚠️ Taxe '${tax.name}' création échouée:`, (e as Error).message?.substring(0, 100));
      }
    }

    console.log(`[PeppolBridge] ✅ Auto-provisioning taxes terminé pour company ${odooCompanyId}`);
  }

  // ── Envoi Peppol via Wizard Odoo 17 ──

  /**
   * Envoie une facture via Peppol en utilisant le wizard account.move.send (Odoo 17).
   * C'est la SEULE méthode correcte — action_send_and_print retourne un wizard
   * au lieu d'envoyer directement dans Odoo 17.
   */
  async sendViaWizard(odooInvoiceId: number, odooCompanyId: number): Promise<boolean> {
    try {
      const companyContext = {
        active_model: 'account.move',
        active_ids: [odooInvoiceId],
        allowed_company_ids: [odooCompanyId],
        company_id: odooCompanyId,
      };

      // 1. Créer le wizard pour cette facture
      const wizardId = await this.call('account.move.send', 'create', [{
        move_ids: [[6, 0, [odooInvoiceId]]],
      }], { context: companyContext }) as number;

      // 2. Activer l'envoi Peppol sur le wizard
      await this.call('account.move.send', 'write', [[wizardId], {
        checkbox_send_peppol: true,
        checkbox_send_mail: false,
      }]);

      // 3. Exécuter le wizard (action_send_and_print sur le wizard, pas sur account.move)
      await this.call('account.move.send', 'action_send_and_print', [[wizardId]], {
        context: companyContext,
      });

      console.log(`[PeppolBridge] ✅ Wizard Peppol exécuté pour facture Odoo ${odooInvoiceId}`);
      return true;
    } catch (e) {
      console.error(`[PeppolBridge] ❌ Wizard Peppol échoué pour facture ${odooInvoiceId}:`, (e as Error).message);
      return false;
    }
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

    // 2. Trouver le compte de vente par défaut pour les lignes de facture
    let accountId: number | undefined;
    console.log('[PeppolBridge] Recherche compte pour odooCompanyId:', odooCompanyId);

    // Première passe : chercher les comptes de cette company
    accountId = await this.findIncomeAccount(odooCompanyId);

    // Si aucun compte trouvé, c'est que le plan comptable n'est pas installé pour cette company
    // → On l'installe à la volée et on réessaie
    if (!accountId) {
      console.log(`[PeppolBridge] Aucun compte trouvé pour company ${odooCompanyId}, installation du plan comptable...`);
      await this.installChartOfAccounts(odooCompanyId);
      accountId = await this.findIncomeAccount(odooCompanyId);
    }

    console.log('[PeppolBridge] account_id résolu:', accountId);
    if (!accountId) {
      throw new Error(
        `Aucun compte comptable trouvé dans Odoo pour company_id=${odooCompanyId}. ` +
        `Le plan comptable belge n'a pas pu être installé. Vérifiez la configuration Odoo.`
      );
    }

    // Garantir que les taxes belges existent pour cette company
    await this.ensureBelgianTaxes(odooCompanyId);

    // Trouver la taxe TVA de vente correspondante pour chaque ligne
    // Cache des taxes par pourcentage pour cette company
    const taxCache = new Map<number, number[]>();
    const findTaxForPercent = async (percent: number): Promise<number[]> => {
      if (taxCache.has(percent)) return taxCache.get(percent)!;
      try {
        const taxes = await this.call('account.tax', 'search_read', [
          [['company_id', '=', odooCompanyId], ['type_tax_use', '=', 'sale'], ['amount', '=', percent]],
        ], { fields: ['id'], limit: 1 }) as Array<{ id: number }>;
        const ids = taxes.length > 0 ? [taxes[0].id] : [];
        taxCache.set(percent, ids);
        return ids;
      } catch (e) {
        console.warn(`[PeppolBridge] Impossible de trouver la taxe TVA ${percent}%:`, e);
        return [];
      }
    };

    // Créer la facture dans Odoo — chaque ligne avec sa propre taxe
    const invoiceLines = [];
    for (const line of invoice.lines) {
      const lineTaxIds = await findTaxForPercent(line.taxPercent);
      if (lineTaxIds.length === 0) {
        console.warn(`[PeppolBridge] ⚠️ Aucune taxe trouvée pour ${line.taxPercent}% — UBL requiert au minimum une taxe par ligne !`);
      }
      invoiceLines.push([0, 0, {
        name: line.description,
        quantity: line.quantity,
        price_unit: line.unitPrice,
        ...(accountId ? { account_id: accountId } : {}),
        // UBL BIS Billing 3.0 EXIGE au moins une taxe par ligne, même 0%
        ...(lineTaxIds.length > 0 ? { tax_ids: [[6, 0, lineTaxIds]] } : {}),
      }]);
    }

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

    // 4. Envoyer via Peppol — utiliser le wizard Odoo 17 (la SEULE méthode qui fonctionne)
    const wizardSuccess = await this.sendViaWizard(odooInvoiceId, odooCompanyId);
    if (!wizardSuccess) {
      console.error(`[PeppolBridge] ❌ L'envoi Peppol via wizard a échoué pour facture ${odooInvoiceId}. Le cron auto-retry prendra le relais.`);
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
    try {
      await this.call('account_edi_proxy_client.user', '_peppol_get_new_documents', [], {
        context: { allowed_company_ids: [odooCompanyId] },
      });
      console.log(`[PeppolBridge] ✅ Fetched incoming Peppol documents for company ${odooCompanyId}`);
    } catch (error) {
      console.error(`[PeppolBridge] ❌ Erreur fetch incoming documents company ${odooCompanyId}:`, (error as Error).message);
      throw error;
    }
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
    partnerId?: number;
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
      limit: options?.limit || 200,
      order: 'create_date desc',
    }) as Array<Record<string, unknown>>;

    // Collect unique partner IDs to fetch their VAT numbers
    const partnerIds = [...new Set(
      bills.map(b => (b.partner_id as [number, string])?.[0]).filter(Boolean)
    )] as number[];

    // Batch-fetch partner VAT numbers
    const partnerVatMap: Record<number, string> = {};
    if (partnerIds.length > 0) {
      try {
        const partners = await this.call('res.partner', 'read', [partnerIds], {
          fields: ['vat'],
        }) as Array<{ id: number; vat: string | false }>;
        for (const p of partners) {
          if (p.vat) partnerVatMap[p.id] = p.vat;
        }
      } catch (err) {
        console.warn(`[PeppolBridge] ⚠️ Could not fetch partner VATs:`, (err as Error).message);
      }
    }

    return bills.map((bill) => {
      const partnerId = (bill.partner_id as [number, string])?.[0];
      return {
        id: bill.id as number,
        name: bill.name as string,
        partnerName: (bill.partner_id as [number, string])?.[1] || '',
        partnerVat: partnerId ? partnerVatMap[partnerId] : undefined,
        partnerId,
        amountTotal: bill.amount_total as number,
        amountTax: bill.amount_tax as number,
        currency: (bill.currency_id as [number, string])?.[1] || 'EUR',
        invoiceDate: bill.invoice_date as string,
        dueDate: (bill.invoice_date_due as string) || undefined,
        state: bill.state as string,
        peppolMessageId: (bill.peppol_message_uuid as string) || undefined,
      };
    });
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
