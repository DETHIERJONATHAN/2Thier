"use strict";
/**
 * 🗺️ Configuration centrale des IDs de champs
 *
 * Évite les IDs hardcodés dans le code en centralisant
 * les références aux champs critiques du système
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FIELD_MAPPING = void 0;
exports.getFieldMapping = getFieldMapping;
/**
 * Mapping des champs par défaut
 * Ces IDs peuvent être surchargés via des variables d'environnement
 * ou une configuration base de données
 */
exports.DEFAULT_FIELD_MAPPING = {
    prix_kwh: process.env.FIELD_ID_PRIX_KWH || 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5',
    prix_mois: process.env.FIELD_ID_PRIX_MOIS || '52c7f63b-7e57-4ba8-86da-19a176f09220',
    consommation_kwh: process.env.FIELD_ID_CONSOMMATION_KWH || 'aa448cfa-3d97-4c23-8995-8e013577e27d',
};
/**
 * Récupère le mapping des champs pour une organisation
 * Pour l'instant utilise le mapping par défaut, mais pourrait
 * être étendu pour récupérer des configurations spécifiques
 */
function getFieldMapping(organizationId) {
    // TODO: Implémenter la récupération depuis la base de données si besoin
    return exports.DEFAULT_FIELD_MAPPING;
}
exports.default = exports.DEFAULT_FIELD_MAPPING;
