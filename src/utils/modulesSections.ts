import { SharedSection } from '../hooks/useSharedSections';

// Interface pour un module avec son statut d'organisation
export interface ModuleWithStatus {
  id: string;
  key: string;
  label: string;
  feature: string;
  icon?: string;
  route?: string;
  description?: string;
  page?: string;
  
  // 🏷️ CATÉGORIE D'ADMINISTRATION (ex: "Administration", "Google Workspace", "CRM")
  // ⚠️  NE PAS CONFONDRE avec la table Section (formulaires dynamiques Block→Section→Field)
  category?: string; // 📂 Catégorie d'administration des modules
  categoryIcon?: string; // 🎨 Icône de la catégorie
  categoryColor?: string; // 🎨 Couleur de la catégorie
  
  order?: number;
  active: boolean; // global status
  parameters?: Record<string, unknown>; // 🔧 Paramètres JSON du module
  organizationId?: string | null;
  isActiveForOrg?: boolean; // status for the current org
}

// Interface pour une section complète avec ses modules
export interface SectionWithModules extends SharedSection {
  modules: ModuleWithStatus[];
}

// ✅ NOUVELLE LOGIQUE: Obtenir la catégorie depuis la BDD (plus de hardcoded !)
export const getModuleCategoryFromDB = (module: ModuleWithStatus, sections: SharedSection[]): string | null => {
  // 1. Si le module a une catégorie définie, on cherche la section correspondante
  if (module.category) {
    const matchingSection = sections.find(s => s.title === module.category);
    if (matchingSection) {
      return matchingSection.id;
    }
  }
  
  // 2. Si pas de catégorie ou section non trouvée, retourner null
  // Les modules sans catégorie valide ne seront pas affichés
  return null;
};

// ✅ FONCTION ORGANISATRICE ENTIÈREMENT BASÉE SUR LA BDD
export const organizeModulesInSections = (
  sections: SharedSection[],
  modules: ModuleWithStatus[]
): SectionWithModules[] => {
  // Si aucune catégorie n'est chargée, ne rien organiser (évite les faux warnings au démarrage)
  if (!sections || sections.length === 0) {
    return [];
  }
  
  // Inclure toutes les sections (actives et inactives)
  const sectionsWithModules: SectionWithModules[] = sections.map(section => ({
    ...section,
    modules: []
  }));

  // Ajouter les modules à leurs catégories appropriées
  modules.forEach(module => {
    const sectionId = getModuleCategoryFromDB(module, sections);
    
    // Si pas de section trouvée (null), ignorer le module
    if (!sectionId) {
      return;
    }
    
    const targetSection = sectionsWithModules.find(s => s.id === sectionId);
    
    if (targetSection) {
      // Si la section est désactivée, marquer le module comme inactif pour l'organisation
      const moduleWithSectionStatus = {
        ...module,
        // Si la section est inactive, le module est aussi inactif pour l'org
        isActiveForOrg: targetSection.active ? module.isActiveForOrg : false
      };
      
      targetSection.modules.push(moduleWithSectionStatus);
    }
  });

  // Trier les modules dans chaque section par ordre puis par label
  sectionsWithModules.forEach(section => {
    section.modules.sort((a, b) => {
      if (a.order !== b.order) {
        return (a.order || 0) - (b.order || 0);
      }
      return a.label.localeCompare(b.label);
    });
  });

  const result = sectionsWithModules.sort((a, b) => a.order - b.order);
  
  return result;
};
