import { ApiResponse, ModuleCategory, ModulesResponse, CategoriesResponse, DynamicSection } from './types';
import { logger } from '../../../lib/logger';

export class AdminModulesService {
  private api: unknown;

  constructor(api: unknown) {
    this.api = api;
  }

  // ===== CATEGORIES =====
  async getCategories(organizationId: string): Promise<ModuleCategory[]> {
    try {
      logger.debug('[AdminModulesService] Récupération catégories...');
      const response: CategoriesResponse = await this.api.get(`/api/admin-modules/categories?organizationId=${organizationId}`);
      
      if (response.success) {
        logger.debug(`[AdminModulesService] ${response.data.length} catégories trouvées`);
        return response.data;
      }
      return [];
    } catch (error) {
      logger.error('[AdminModulesService] Erreur getCategories:', error);
      return [];
    }
  }

  async createCategory(category: Partial<ModuleCategory>): Promise<ModuleCategory | null> {
    try {
      logger.debug('[AdminModulesService] Création catégorie:', category.name);
      const response: ApiResponse<ModuleCategory> = await this.api.post('/api/admin-modules/categories', category);
      
      if (response.success) {
        logger.debug('[AdminModulesService] Catégorie créée:', response.data.id);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur createCategory:', error);
      return null;
    }
  }

  async updateCategory(id: string, updates: Partial<ModuleCategory>): Promise<ModuleCategory | null> {
    try {
      logger.debug('[AdminModulesService] Modification catégorie:', id);
      const response: ApiResponse<ModuleCategory> = await this.api.put(`/api/admin-modules/categories/${id}`, updates);
      
      if (response.success) {
        logger.debug('[AdminModulesService] Catégorie modifiée:', response.data.name);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur updateCategory:', error);
      return null;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      logger.debug('[AdminModulesService] Suppression catégorie:', id);
      const response: ApiResponse<void> = await this.api.delete(`/api/admin-modules/categories/${id}`);
      
      if (response.success) {
        logger.debug('[AdminModulesService] Catégorie supprimée');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur deleteCategory:', error);
      return false;
    }
  }

  // ===== MODULES =====
  async getModulesBySections(organizationId: string) {
    try {
      logger.debug('[AdminModulesService] Récupération modules par sections...');
      const response: ModulesResponse = await this.api.get(`/api/admin-modules?organizationId=${organizationId}`);
      
      if (response.success) {
        logger.debug(`[AdminModulesService] ${response.data.totalModules} modules répartis en ${response.data.totalSections} sections`);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur getModulesBySections:', error);
      return null;
    }
  }

  async updateModule(id: string, updates: { active?: boolean; superAdminOnly?: boolean }): Promise<any | null> {
    try {
      logger.debug('[AdminModulesService] Modification module:', id);
      const response = await this.api.put(`/api/admin-modules/modules/${id}`, updates);
      
      if (response.success) {
        logger.debug('[AdminModulesService] Module modifié:', response.data.label);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur updateModule:', error);
      return null;
    }
  }

  async toggleModuleForOrganization(moduleId: string, organizationId: string, currentStatus: boolean): Promise<boolean> {
    try {
      logger.debug('[AdminModulesService] Toggle module:', { moduleId, organizationId, currentStatus });
      const response: ApiResponse<void> = await this.api.post(`/api/admin-modules/toggle`, {
        moduleId,
        organizationId,
        active: !currentStatus
      });
      
      if (response.success) {
        logger.debug('[AdminModulesService] Module toggle réussi');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur toggleModuleForOrganization:', error);
      return false;
    }
  }

  // ===== SECTIONS =====
  async toggleSectionActive(sectionId: string, organizationId: string): Promise<boolean> {
    try {
      logger.debug('[AdminModulesService] Toggle section:', { sectionId, organizationId });
      const response: ApiResponse<void> = await this.api.post(`/api/admin-modules/sections/toggle`, {
        sectionId,
        organizationId
      });
      
      if (response.success) {
        logger.debug('[AdminModulesService] Section toggle réussi');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur toggleSectionActive:', error);
      return false;
    }
  }

  async addSection(section: Partial<DynamicSection>, organizationId: string): Promise<DynamicSection | null> {
    try {
      logger.debug('[AdminModulesService] Ajout section:', section.title);
      const response: ApiResponse<DynamicSection> = await this.api.post(`/api/admin-modules/sections`, {
        ...section,
        organizationId
      });
      
      if (response.success) {
        logger.debug('[AdminModulesService] Section ajoutée:', response.data.id);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur addSection:', error);
      return null;
    }
  }

  async deleteSection(sectionId: string): Promise<boolean> {
    try {
      logger.debug('[AdminModulesService] Suppression section:', sectionId);
      const response: ApiResponse<void> = await this.api.delete(`/api/admin-modules/sections/${sectionId}`);
      
      if (response.success) {
        logger.debug('[AdminModulesService] Section supprimée');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur deleteSection:', error);
      return false;
    }
  }

  async updateSectionName(sectionId: string, newName: string): Promise<boolean> {
    try {
      logger.debug('[AdminModulesService] Modification nom section:', { sectionId, newName });
      const response: ApiResponse<void> = await this.api.put(`/api/admin-modules/sections/${sectionId}`, {
        title: newName
      });
      
      if (response.success) {
        logger.debug('[AdminModulesService] Nom section modifié');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur updateSectionName:', error);
      return false;
    }
  }

  async reorderSections(updates: { id: string; order: number }[]): Promise<boolean> {
    try {
      logger.debug('[AdminModulesService] Réorganisation sections:', updates.length);
      const response: ApiResponse<void> = await this.api.put('/api/admin-modules/sections/reorder', {
        updates
      });
      
      if (response.success) {
        logger.debug('[AdminModulesService] Sections réorganisées');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[AdminModulesService] Erreur reorderSections:', error);
      return false;
    }
  }
}

// Export par défaut
export default AdminModulesService;
