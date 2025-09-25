import { ModulesResponse, ModuleWithStatus } from '../types';

type ApiClient = {
  get: <T = unknown>(url: string, options?: Record<string, unknown>) => Promise<T>;
  post: <T = unknown>(url: string, body?: unknown, options?: Record<string, unknown>) => Promise<T>;
  put: <T = unknown>(url: string, body?: unknown, options?: Record<string, unknown>) => Promise<T>;
  delete: <T = unknown>(url: string, options?: Record<string, unknown>) => Promise<T>;
};

export class AdminModulesService {
  private api: ApiClient;
  constructor(api: ApiClient) { this.api = api; }

  async getModulesBySections(organizationId: string): Promise<ModulesResponse['data'] | null> {
    // Utiliser l'API V1 corrigée qui groupe maintenant correctement par catégories
    const res = await this.api.get(`/api/admin-modules?organizationId=${organizationId}`);
    return res?.success ? res.data : null;
  }

  async createCategory(payload: Record<string, unknown>) {
    const res = await this.api.post('/api/admin-modules/categories', payload);
    return res?.success ? res.data : null;
  }

  async updateCategory(
    id: string,
    updates: Record<string, unknown> & Partial<{ active: boolean; superAdminOnly: boolean }>
  ) {
    // Compatibilité: certains backends attendent d'autres clés (isActive, enabled, adminOnly...)
    const payload: Record<string, unknown> = { ...updates };
    if (typeof updates.active === 'boolean') {
      payload.isActive = updates.active;
      payload.enabled = updates.active;
      payload.status = updates.active ? 'active' : 'inactive';
    }
    if (typeof updates.superAdminOnly === 'boolean') {
      const v: boolean = updates.superAdminOnly;
      payload.superAdminOnly = v;
      payload.adminOnly = v;
      payload.super_admin_only = v;
      payload.visibleToSuperAdminOnly = v;
    }
    const res = await this.api.put(`/api/admin-modules/categories/${id}`, payload);
    return res?.success ? res.data : null;
  }

  async deleteCategory(id: string) {
    const res = await this.api.delete(`/api/admin-modules/categories/${id}`);
    return !!res?.success;
  }

  // Endpoint dédié pour réorganiser les sections
  async reorderSections(updates: Array<{ id: string; order: number }>) {
    const res = await this.api.put('/api/admin-modules/categories/reorder', { updates });
    return !!res?.success;
  }

  // Fallback pour certains backends: endpoint dédié pour toggler l'état d'une section
  async toggleSectionActive(sectionId: string, organizationId: string) {
    const res = await this.api.post('/api/admin-modules/sections/toggle', { sectionId, organizationId });
    return !!res?.success;
  }

  async toggleModuleForOrganization(moduleId: string, organizationId: string, active: boolean) {
    const res = await this.api.post('/api/admin-modules/toggle', { moduleId, organizationId, active });
    return !!res?.success;
  }

  async saveModule(module: Partial<ModuleWithStatus> & { id?: string }) {
    // Utiliser les routes /api/modules qui existent réellement
    if (module.id) return this.api.put(`/api/modules/${module.id}`, module);
    return this.api.post('/api/modules', module);
  }

  // Mise à jour module avec compatibilité de champs (ex: categoryId alias)
  async updateModule(
    id: string,
    updates: Record<string, unknown> & Partial<{ categoryId: string | number; order: number }>
  ) {
    const payload: Record<string, unknown> = { ...updates };
    // Alias pour categoryId selon variantes backend possibles
    if (typeof updates.categoryId !== 'undefined') {
      const raw = updates.categoryId as unknown as string;
      const numeric = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : (typeof updates.categoryId === 'number' ? updates.categoryId : undefined);
      const cid = (numeric ?? updates.categoryId) as unknown as number | string;
      payload.categoryId = cid;
      payload.categoryID = String(cid); // quelques backends camel/pascal
      payload.category_id = cid;
      payload.moduleCategoryId = cid;
      payload.module_category_id = cid;
      payload.CategoryId = String(cid);
    }
    // Alias pour l'ordre/position
    if (typeof updates.order === 'number') {
      const ord = updates.order;
      payload.order = ord;
      payload.position = ord;
      payload.sortOrder = ord;
      payload.sort_order = ord;
      payload.index = ord;
    }
    // Utiliser l'endpoint /api/modules/:id qui existe réellement
    const res = await this.api.put(`/api/modules/${id}`, payload);
    // on renvoie la réponse brute pour compatibilité appelant
    return res;
  }

  async deleteModule(id: string) {
    const res = await this.api.delete(`/api/modules/${id}`);
    return !!res?.success;
  }


}
