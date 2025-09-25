// Types et helpers pour les modules accessibles
export interface ModuleAccess {
  name?: string;
  key?: string;
  label?: string;
  enabled?: boolean;
  permissions?: string[];
  // Certains endpoints renvoient "active", d'autres pas → on le rend optionnel et on assume true si absent
  active?: boolean;
  // Nouveau champ (optionnel) : indicateur spécifique organisation renvoyé par certains endpoints
  isActiveForOrg?: boolean;
  // Champ interne utilisé dans l'UI : on le rend optionnel pour pouvoir le normaliser ensuite
  isActiveInOrg?: boolean;
  feature?: string | null;
  // Clés supplémentaires possibles depuis le backend, on les tolère via index signature si besoin plus tard
  // [extra: string]: any; // (décommenter si nécessaire)
}

// Helper pour vérifier l'accès à un module
export function hasModuleAccess(modules: ModuleAccess[], moduleName: string): boolean {
  return modules.some(m => m.name === moduleName && m.enabled);
}
