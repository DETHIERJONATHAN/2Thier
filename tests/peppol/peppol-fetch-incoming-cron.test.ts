/**
 * Tests — Peppol Auto-Fetch Incoming Invoices (Cron)
 * 
 * Vérifie le nouveau job cron fetchIncomingInvoices :
 *   - Filtre les orgs ACTIVE + autoReceiveEnabled
 *   - Appelle Odoo bridge pour fetch + import
 *   - Déduplique par peppolMessageId
 *   - Gère les erreurs par org sans crasher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──

const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock('../../src/lib/database', () => ({
  db: {
    peppolConfig: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    peppolIncomingInvoice: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

const mockCheckPeppolStatus = vi.fn();
vi.mock('../../src/services/vatLookupService', () => ({
  checkPeppolStatus: (...args: unknown[]) => mockCheckPeppolStatus(...args),
}));

const mockCheckRegistrationStatus = vi.fn();
const mockFetchIncomingDocuments = vi.fn();
const mockGetIncomingInvoices = vi.fn();
const mockGetPeppolBridge = vi.fn(() => ({
  checkRegistrationStatus: mockCheckRegistrationStatus,
  fetchIncomingDocuments: mockFetchIncomingDocuments,
  getIncomingInvoices: mockGetIncomingInvoices,
}));
vi.mock('../../src/services/peppolBridge', () => ({
  getPeppolBridge: () => mockGetPeppolBridge(),
}));

// Mock node-cron
const { cronCallbacks } = vi.hoisted(() => {
  const cronCallbacks: Record<string, () => Promise<void>> = {};
  return { cronCallbacks };
});

vi.mock('node-cron', () => ({
  default: {
    schedule: (expression: string, callback: () => Promise<void>, _opts?: unknown) => {
      cronCallbacks[expression] = callback;
      return {
        start: vi.fn(),
        stop: vi.fn(),
      };
    },
  },
}));

// ── Import après mocks ──
import '../../src/cron/peppol-status-checker';

describe('Peppol Auto-Fetch Incoming Invoices (Cron)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Callback pour le job fetch-incoming (toutes les 4h)
  const runFetchIncoming = () => cronCallbacks['0 */4 * * *']();

  // ════════════════════════════════════════════
  // EXISTENCE DU JOB
  // ════════════════════════════════════════════

  describe('Enregistrement du cron', () => {
    it('doit enregistrer un cron job toutes les 4 heures', () => {
      expect(cronCallbacks['0 */4 * * *']).toBeDefined();
      expect(typeof cronCallbacks['0 */4 * * *']).toBe('function');
    });
  });

  // ════════════════════════════════════════════
  // FILTRAGE DES ORGANISATIONS
  // ════════════════════════════════════════════

  describe('Filtrage des organisations', () => {
    it('ne fait rien s\'il n\'y a aucune config éligible', async () => {
      mockFindMany.mockResolvedValue([]);
      await runFetchIncoming();
      expect(mockFindMany).toHaveBeenCalled();
      expect(mockFetchIncomingDocuments).not.toHaveBeenCalled();
    });

    it('query les configs ACTIVE + autoReceiveEnabled + odooCompanyId', async () => {
      mockFindMany.mockResolvedValue([]);
      await runFetchIncoming();

      // Trouver l'appel qui a le filtre ACTIVE + autoReceiveEnabled
      const calls = mockFindMany.mock.calls;
      const fetchCall = calls.find((c: unknown[]) => {
        const where = (c[0] as { where?: { registrationStatus?: string; autoReceiveEnabled?: boolean } })?.where;
        return where?.registrationStatus === 'ACTIVE' && where?.autoReceiveEnabled === true;
      });

      expect(fetchCall).toBeDefined();
      expect(fetchCall![0]).toEqual(expect.objectContaining({
        where: expect.objectContaining({
          registrationStatus: 'ACTIVE',
          enabled: true,
          autoReceiveEnabled: true,
          odooCompanyId: { not: null },
        }),
      }));
    });
  });

  // ════════════════════════════════════════════
  // IMPORT DES FACTURES
  // ════════════════════════════════════════════

  describe('Import des factures entrantes', () => {
    const mockConfig = {
      organizationId: 'org-peppol',
      odooCompanyId: 42,
      registrationStatus: 'ACTIVE',
      enabled: true,
      autoReceiveEnabled: true,
      organization: { name: 'Test Peppol Corp' },
    };

    it('appelle fetchIncomingDocuments puis getIncomingInvoices', async () => {
      mockFindMany.mockResolvedValue([mockConfig]);
      mockFindFirst.mockResolvedValue(null); // Pas de facture précédente
      mockGetIncomingInvoices.mockResolvedValue([]);

      await runFetchIncoming();

      expect(mockFetchIncomingDocuments).toHaveBeenCalledWith(42);
      expect(mockGetIncomingInvoices).toHaveBeenCalledWith(42, { since: undefined });
    });

    it('passe la date de la dernière facture importée', async () => {
      const lastDate = new Date('2026-03-15T10:00:00Z');
      mockFindMany.mockResolvedValue([mockConfig]);
      mockFindFirst.mockResolvedValue({ createdAt: lastDate });
      mockGetIncomingInvoices.mockResolvedValue([]);

      await runFetchIncoming();

      expect(mockGetIncomingInvoices).toHaveBeenCalledWith(42, { since: lastDate.toISOString() });
    });

    it('crée les factures qui n\'existent pas encore', async () => {
      mockFindMany.mockResolvedValue([mockConfig]);
      mockFindFirst.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(null); // N'existe pas encore
      mockGetIncomingInvoices.mockResolvedValue([
        {
          peppolMessageId: 'msg-001',
          partnerName: 'Fournisseur A',
          partnerVat: 'BE0123456789',
          name: 'FACTURE-2026-001',
          invoiceDate: '2026-03-28',
          dueDate: '2026-04-28',
          amountTotal: 1210.00,
          amountTax: 210.00,
          currency: 'EUR',
        },
      ]);

      await runFetchIncoming();

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-peppol',
          peppolMessageId: 'msg-001',
          senderName: 'Fournisseur A',
          senderVat: 'BE0123456789',
          invoiceNumber: 'FACTURE-2026-001',
          totalAmount: 1210.00,
          taxAmount: 210.00,
          currency: 'EUR',
          status: 'RECEIVED',
        }),
      });
    });

    it('ne duplique pas les factures déjà importées', async () => {
      mockFindMany.mockResolvedValue([mockConfig]);
      mockFindFirst.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue({ id: 'existing' }); // Déjà importée
      mockGetIncomingInvoices.mockResolvedValue([
        { peppolMessageId: 'msg-existing', partnerName: 'Test', name: 'F-001' },
      ]);

      await runFetchIncoming();

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('ignore les factures sans peppolMessageId', async () => {
      mockFindMany.mockResolvedValue([mockConfig]);
      mockFindFirst.mockResolvedValue(null);
      mockGetIncomingInvoices.mockResolvedValue([
        { peppolMessageId: null, partnerName: 'Test', name: 'F-002' },
        { peppolMessageId: '', partnerName: 'Test2', name: 'F-003' },
      ]);

      await runFetchIncoming();

      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════
  // GESTION DES ERREURS
  // ════════════════════════════════════════════

  describe('Gestion des erreurs', () => {
    it('continue avec les autres orgs si une échoue', async () => {
      const configs = [
        {
          organizationId: 'org-fail',
          odooCompanyId: 10,
          organization: { name: 'Fail Corp' },
        },
        {
          organizationId: 'org-ok',
          odooCompanyId: 20,
          organization: { name: 'OK Corp' },
        },
      ];
      mockFindMany.mockResolvedValue(configs);
      mockFetchIncomingDocuments
        .mockRejectedValueOnce(new Error('Odoo down'))
        .mockResolvedValueOnce(undefined);
      mockFindFirst.mockResolvedValue(null);
      mockGetIncomingInvoices.mockResolvedValue([]);

      // Ne doit PAS crasher
      await expect(runFetchIncoming()).resolves.toBeUndefined();

      // La deuxième org doit quand même être traitée
      expect(mockFetchIncomingDocuments).toHaveBeenCalledTimes(2);
      expect(mockGetIncomingInvoices).toHaveBeenCalledWith(20, expect.anything());
    });
  });
});
