/**
 * 🗺️ Configuration centrale des IDs de champs
 * 
 * Évite les IDs hardcodés dans le code en centralisant 
 * les références aux champs critiques du système
 */

export interface FieldMapping {
  prix_kwh: string;
  prix_mois: string;
  consommation_kwh: string;
  // Ajoutez d'autres champs selon les besoins
}

/**
 * Mapping des champs par défaut
 * Ces IDs peuvent être surchargés via des variables d'environnement
 * ou une configuration base de données
 */
export const DEFAULT_FIELD_MAPPING: FieldMapping = {
  prix_kwh: process.env.FIELD_ID_PRIX_KWH || 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5',
  prix_mois: process.env.FIELD_ID_PRIX_MOIS || '52c7f63b-7e57-4ba8-86da-19a176f09220',
  consommation_kwh: process.env.FIELD_ID_CONSOMMATION_KWH || 'aa448cfa-3d97-4c23-8995-8e013577e27d',
};

/**
 * Récupère le mapping des champs pour une organisation
 * Pour l'instant utilise le mapping par défaut, mais pourrait
 * être étendu pour récupérer des configurations spécifiques
 */
export function getFieldMapping(organizationId?: string): FieldMapping {
  // Returns default mapping; DB-backed config can be added per org
  return DEFAULT_FIELD_MAPPING;
}

export default DEFAULT_FIELD_MAPPING;