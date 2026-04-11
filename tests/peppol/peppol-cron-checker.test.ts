/**
 * Tests — Peppol Status Checker (Cron)
 * 
 * Vérifie le comportement du scheduler de vérification automatique
 * des statuts Peppol (transition + santé).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──

const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../src/lib/database', () => ({
  db: {
    peppolConfig: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const mockCheckPeppolStatus = vi.fn();
vi.mock('../../src/services/vatLookupService', () => ({
  checkPeppolStatus: (...args: unknown[]) => mockCheckPeppolStatus(...args),
}));

const mockCheckRegistrationStatus = vi.fn();
const mockGetPeppolBridge = vi.fn(() => ({
  checkRegistrationStatus: mockCheckRegistrationStatus,
}));
vi.mock('../../src/services/peppolBridge', () => ({
  getPeppolBridge: () => mockGetPeppolBridge(),
}));

// Mock node-cron pour capturer les callbacks
// Utiliser vi.hoisted pour que la variable soit disponible dans les factories
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
// Force l'exécution du module (enregistre les callbacks dans cronCallbacks)
import '../../src/cron/peppol-status-checker';

describe('Peppol Status Checker - Cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ════════════════════════════════════════════
  // TRANSITION CHECKER (every 30 min)
  // ════════════════════════════════════════════

  describe('checkTransitionStatuses (*/30 * * * *)', () => {
    const runTransitionCheck = () => cronCallbacks['*/30 * * * *']();

    it('ne fait rien s\'il n\'y a aucune config en transition', async () => {
      mockFindMany.mockResolvedValue([]);
      await runTransitionCheck();
      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCheckPeppolStatus).not.toHaveBeenCalled();
    });

    it('query correctement les configs PENDING et MIGRATION_PENDING', async () => {
      mockFindMany.mockResolvedValue([]);
      await runTransitionCheck();
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          registrationStatus: { in: ['PENDING', 'MIGRATION_PENDING', 'VERIFICATION_NEEDED'] },
          peppolEndpoint: { not: null },
        },
        include: {
          Organization: { select: { name: true } },
        },
      });
    });

    it('met à jour PENDING → ACTIVE quand isRegisteredWithUs', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-1',
        peppolEas: '0208',
        peppolEndpoint: '1025391354',
        registrationStatus: 'PENDING',
        odooCompanyId: 10,
        previousAccessPoint: null,
        Organization: { name: 'Test Corp' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: true,
        isRegisteredElsewhere: false,
        accessPoint: 'Our Service',
      });

      await runTransitionCheck();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          data: expect.objectContaining({
            registrationStatus: 'ACTIVE',
            enabled: true,
          }),
        })
      );
    });

    it('met à jour MIGRATION_PENDING → ACTIVE quand transfert terminé', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-2',
        peppolEas: '0208',
        peppolEndpoint: '0123456789',
        registrationStatus: 'MIGRATION_PENDING',
        odooCompanyId: 20,
        previousAccessPoint: 'Accountable',
        Organization: { name: 'Corp 2' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: true,
        isRegisteredElsewhere: false,
      });

      await runTransitionCheck();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-2' },
          data: expect.objectContaining({
            registrationStatus: 'ACTIVE',
            enabled: true,
          }),
        })
      );
    });

    it('reste MIGRATION_PENDING si toujours chez l\'ancien AP', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-3',
        peppolEas: '0208',
        peppolEndpoint: '0123456789',
        registrationStatus: 'MIGRATION_PENDING',
        odooCompanyId: 30,
        previousAccessPoint: 'Accountable',
        Organization: { name: 'Corp 3' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: true,
        accessPoint: 'Accountable',
      });

      await runTransitionCheck();

      // Should update lastCheckedAt but NOT change status
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-3' },
          data: expect.objectContaining({
            lastCheckedAt: expect.any(Date),
          }),
        })
      );
      // Should NOT set registrationStatus to ACTIVE
      const callData = mockUpdate.mock.calls[0][0].data;
      expect(callData.registrationStatus).toBeUndefined();
    });

    it('détecte un nouvel AP et met à jour previousAccessPoint', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-4',
        peppolEas: '0208',
        peppolEndpoint: '0123456789',
        registrationStatus: 'PENDING',
        odooCompanyId: 40,
        previousAccessPoint: null,
        Organization: { name: 'Corp 4' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: true,
        accessPoint: 'Billit',
      });

      await runTransitionCheck();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousAccessPoint: 'Billit',
            previousApDetectedAt: expect.any(Date),
            registrationStatus: 'MIGRATION_PENDING',
          }),
        })
      );
    });

    it('ne change pas previousAccessPoint si identique', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-5',
        peppolEas: '0208',
        peppolEndpoint: '0123456789',
        registrationStatus: 'MIGRATION_PENDING',
        odooCompanyId: 50,
        previousAccessPoint: 'Accountable',
        Organization: { name: 'Corp 5' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: true,
        accessPoint: 'Accountable',
      });

      await runTransitionCheck();

      const callData = mockUpdate.mock.calls[0][0].data;
      expect(callData.previousAccessPoint).toBeUndefined();
    });

    it('gère l\'erreur par organisation sans crasher les autres', async () => {
      mockFindMany.mockResolvedValue([
        {
          organizationId: 'org-err',
          peppolEas: '0208',
          peppolEndpoint: '1111111111',
          registrationStatus: 'PENDING',
          odooCompanyId: 60,
          previousAccessPoint: null,
          Organization: { name: 'Error Corp' },
        },
        {
          organizationId: 'org-ok',
          peppolEas: '0208',
          peppolEndpoint: '2222222222',
          registrationStatus: 'PENDING',
          odooCompanyId: 70,
          previousAccessPoint: null,
          Organization: { name: 'OK Corp' },
        },
      ]);

      mockCheckPeppolStatus
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          isRegistered: true,
          isRegisteredWithUs: true,
          isRegisteredElsewhere: false,
        });

      await runTransitionCheck();

      // La deuxième org doit quand même être traitée
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-ok' },
          data: expect.objectContaining({
            registrationStatus: 'ACTIVE',
          }),
        })
      );
    });

    it('vérifie Odoo quand pas dans l\'annuaire et a un odooCompanyId', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-6',
        peppolEas: '0208',
        peppolEndpoint: '0123456789',
        registrationStatus: 'PENDING',
        odooCompanyId: 80,
        previousAccessPoint: null,
        Organization: { name: 'Corp 6' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: false,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: false,
      });

      mockCheckRegistrationStatus.mockResolvedValue('active');

      await runTransitionCheck();

      // Doit avoir appelé le bridge
      expect(mockCheckRegistrationStatus).toHaveBeenCalledWith(80);
    });

    it('construit le numéro de TVA avec préfixe BE pour EAS 0208', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-7',
        peppolEas: '0208',
        peppolEndpoint: '1025391354',
        registrationStatus: 'PENDING',
        odooCompanyId: null,
        previousAccessPoint: null,
        Organization: { name: 'Corp BE' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: false,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: false,
      });

      await runTransitionCheck();

      expect(mockCheckPeppolStatus).toHaveBeenCalledWith('BE1025391354');
    });

    it('gère les erreurs globales de DB sans crasher', async () => {
      mockFindMany.mockRejectedValue(new Error('DB connection lost'));
      // Should not throw
      await expect(runTransitionCheck()).resolves.toBeUndefined();
    });
  });

  // ════════════════════════════════════════════
  // HEALTH CHECKER (every 6h)
  // ════════════════════════════════════════════

  describe('checkActiveStatuses (0 */6 * * *)', () => {
    const runHealthCheck = () => cronCallbacks['0 */6 * * *']();

    it('ne fait rien s\'il n\'y a aucune config active', async () => {
      mockFindMany.mockResolvedValue([]);
      await runHealthCheck();
      expect(mockCheckPeppolStatus).not.toHaveBeenCalled();
    });

    it('query uniquement les configs ACTIVE + enabled', async () => {
      mockFindMany.mockResolvedValue([]);
      await runHealthCheck();
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          registrationStatus: 'ACTIVE',
          enabled: true,
          peppolEndpoint: { not: null },
        },
        include: {
          Organization: { select: { name: true } },
        },
      });
    });

    it('met à jour lastCheckedAt si tout est OK', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-active',
        peppolEas: '0208',
        peppolEndpoint: '1025391354',
        registrationStatus: 'ACTIVE',
        Organization: { name: 'Active Corp' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: true,
        isRegisteredElsewhere: false,
      });

      await runHealthCheck();

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { organizationId: 'org-active' },
        data: { lastCheckedAt: expect.any(Date) },
      });
    });

    it('passe en MIGRATION_PENDING si enregistré chez un autre AP', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-stolen',
        peppolEas: '0208',
        peppolEndpoint: '1025391354',
        registrationStatus: 'ACTIVE',
        Organization: { name: 'Stolen Corp' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: true,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: true,
        accessPoint: 'Competitor AP',
      });

      await runHealthCheck();

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { organizationId: 'org-stolen' },
        data: expect.objectContaining({
          registrationStatus: 'MIGRATION_PENDING',
          previousAccessPoint: 'Competitor AP',
          previousApDetectedAt: expect.any(Date),
          lastCheckedAt: expect.any(Date),
        }),
      });
    });

    it('conserve ACTIVE si plus dans l\'annuaire (erreur réseau probable)', async () => {
      mockFindMany.mockResolvedValue([{
        organizationId: 'org-vanished',
        peppolEas: '0208',
        peppolEndpoint: '1025391354',
        registrationStatus: 'ACTIVE',
        Organization: { name: 'Vanished Corp' },
      }]);

      mockCheckPeppolStatus.mockResolvedValue({
        isRegistered: false,
        isRegisteredWithUs: false,
        isRegisteredElsewhere: false,
      });

      await runHealthCheck();

      // Should just update lastCheckedAt, NOT change status
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { organizationId: 'org-vanished' },
        data: { lastCheckedAt: expect.any(Date) },
      });
    });

    it('gère les erreurs par org sans bloquer les autres', async () => {
      mockFindMany.mockResolvedValue([
        {
          organizationId: 'org-err2',
          peppolEas: '0208',
          peppolEndpoint: '1111111111',
          registrationStatus: 'ACTIVE',
          Organization: { name: 'Error Corp 2' },
        },
        {
          organizationId: 'org-ok2',
          peppolEas: '0208',
          peppolEndpoint: '2222222222',
          registrationStatus: 'ACTIVE',
          Organization: { name: 'OK Corp 2' },
        },
      ]);

      mockCheckPeppolStatus
        .mockRejectedValueOnce(new Error('DNS timeout'))
        .mockResolvedValueOnce({
          isRegistered: true,
          isRegisteredWithUs: true,
          isRegisteredElsewhere: false,
        });

      await runHealthCheck();

      // La deuxième org doit quand même être traitée
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { organizationId: 'org-ok2' },
        data: { lastCheckedAt: expect.any(Date) },
      });
    });

    it('gère les erreurs globales de DB sans crasher', async () => {
      mockFindMany.mockRejectedValue(new Error('DB connection lost'));
      await expect(runHealthCheck()).resolves.toBeUndefined();
    });
  });

  // ════════════════════════════════════════════
  // STARTUP
  // ════════════════════════════════════════════

  describe('startPeppolCronJobs()', () => {
    it('exporte la fonction de démarrage', async () => {
      const mod = await import('../../src/cron/peppol-status-checker');
      expect(typeof mod.startPeppolCronJobs).toBe('function');
    });

    it('exporte les deux schedulers', async () => {
      const mod = await import('../../src/cron/peppol-status-checker');
      expect(mod.checkTransitionStatuses).toBeDefined();
      expect(mod.checkActiveStatuses).toBeDefined();
    });
  });
});
