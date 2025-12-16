"use strict";
/**
 * Fichier de mocks global pour les formules - à utiliser en développement uniquement
 * Version améliorée avec une meilleure gestion des données et des logs détaillés
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceRefreshStore = exports.clearStorage = exports.getLastOperations = exports.getStoreState = exports.deleteFormula = exports.updateFormula = exports.getFormulasForField = void 0;
// CORRECTIF MAJEUR : Initialisation du stockage global avec système de persistance amélioré
// Utiliser un système avec mécanisme de double stockage pour plus de fiabilité
if (!global._globalFormulasStore) {
    global._globalFormulasStore = new Map();
    console.log('[MOCK] 🆕 Initialisation du stockage global principal des formules');
    // Ajouter un stockage de secours comme redondance
    global._backupFormulasStore = new Map();
    console.log('[MOCK] 🆕 Initialisation du stockage de secours des formules');
}
// Initialiser le stockage de secours s'il n'existe pas encore
if (!global._backupFormulasStore) {
    global._backupFormulasStore = new Map();
    console.log('[MOCK] 🆕 Initialisation tardive du stockage de secours');
}
if (!global._formulasOperationLog) {
    global._formulasOperationLog = [];
    console.log('[MOCK] 📝 Initialisation du journal des opérations de formules');
}
// Fonction de journalisation des opérations
var logOperation = function (operation, fieldId, formulaId, status, details) {
    if (formulaId === void 0) { formulaId = null; }
    if (status === void 0) { status = 'success'; }
    if (details === void 0) { details = null; }
    var logEntry = __assign(__assign(__assign({ timestamp: new Date(), operation: operation, fieldId: fieldId }, (formulaId ? { formulaId: formulaId } : {})), { status: status }), (details ? { details: details } : {}));
    global._formulasOperationLog.push(logEntry);
    // Limiter la taille du log à 100 entrées
    if (global._formulasOperationLog.length > 100) {
        global._formulasOperationLog.shift();
    }
    return logEntry;
};
/**
 * Récupère les formules stockées pour un champ spécifique
 */
var getFormulasForField = function (fieldId) {
    try {
        if (!fieldId) {
            console.error('[MOCK] Erreur: fieldId est undefined ou null');
            logOperation('getFormulasForField', 'unknown', null, 'error', 'fieldId manquant');
            return [];
        }
        console.log('[MOCK] getFormulasForField - État du store global:', global._globalFormulasStore.size, 'champs stockés');
        console.log('[MOCK] getFormulasForField - Clés actuelles:', Array.from(global._globalFormulasStore.keys()).join(', '));
        if (!global._globalFormulasStore.has(fieldId)) {
            console.log('[MOCK] Initialisation du stockage pour le champ ' + fieldId);
            global._globalFormulasStore.set(fieldId, []);
            logOperation('initStorage', fieldId);
        }
        var storedData = global._globalFormulasStore.get(fieldId);
        if (!storedData) {
            console.warn('[MOCK] Données manquantes après vérification, création d\'un tableau vide');
            global._globalFormulasStore.set(fieldId, []);
            return [];
        }
        console.log('[MOCK] Récupération de ' + storedData.length + ' formules pour le champ ' + fieldId);
        if (storedData.length > 0) {
            console.log('[MOCK] Exemple de données:', JSON.stringify(storedData[0]));
        }
        logOperation('getFormulasForField', fieldId, null, 'success', { count: storedData.length });
        // Effectuer une copie profonde pour éviter toute modification accidentelle
        return JSON.parse(JSON.stringify(storedData));
    }
    catch (error) {
        console.error('[MOCK] Erreur lors de la récupération des formules pour le champ ' + fieldId + ':', error);
        logOperation('getFormulasForField', fieldId, null, 'error', error.message || String(error));
        return [];
    }
};
exports.getFormulasForField = getFormulasForField;
/**
 * Met à jour une formule ou la crée si elle n'existe pas
 */
var updateFormula = function (fieldId, formulaId, data) {
    var _a, _b;
    try {
        if (!fieldId || !formulaId) {
            console.error('[MOCK] Erreur: fieldId ou formulaId manquant');
            logOperation('updateFormula', fieldId || 'unknown', formulaId || null, 'error', 'Paramètres manquants');
            return null;
        }
        console.log('[MOCK] Mise à jour formule ' + formulaId + ' pour champ ' + fieldId, data);
        // Récupérer les formules actuelles (avec une copie pour éviter les références)
        var formulas = JSON.parse(JSON.stringify((0, exports.getFormulasForField)(fieldId)));
        // Trouver l'index de la formule à mettre à jour
        var index = formulas.findIndex(function (f) { return f.id === formulaId; });
        // Créer un objet formule avec les données
        var formula = {
            id: formulaId,
            fieldId: fieldId,
            name: data.name || 'Formule sans nom',
            sequence: data.sequence || [],
            order: typeof data.order === 'number' ? data.order : 0,
            updatedAt: new Date().toISOString()
        };
        // Mettre à jour ou ajouter la formule
        if (index >= 0) {
            formulas[index] = __assign(__assign({}, formulas[index]), formula);
            console.log('[MOCK] Formule ' + formulaId + ' mise à jour');
            logOperation('updateFormula', fieldId, formulaId, 'success', { type: 'update' });
        }
        else {
            formulas.push(formula);
            console.log('[MOCK] Formule ' + formulaId + ' ajoutée au stockage');
            logOperation('updateFormula', fieldId, formulaId, 'success', { type: 'create' });
        }
        // Mettre à jour le stockage avec une nouvelle référence
        var formulasCopy = JSON.parse(JSON.stringify(formulas));
        // Tri des formules par ordre pour garantir la cohérence
        var sortedFormulas = formulasCopy.sort(function (a, b) { return a.order - b.order; });
        // CORRECTIF MAJEUR : Double sauvegarde dans deux stores séparés pour redondance
        // Sauvegarde dans le store principal
        global._globalFormulasStore.set(fieldId, sortedFormulas);
        // Sauvegarde de secours
        try {
            // Créer une copie fraîche pour le stockage de secours
            var backupCopy = JSON.parse(JSON.stringify(sortedFormulas));
            global._backupFormulasStore.set(fieldId, backupCopy);
            console.log('[MOCK] ✅ Double sauvegarde réussie pour le champ ' + fieldId);
        }
        catch (backupError) {
            console.error('[MOCK] ❌ Échec de la sauvegarde de secours:', backupError);
        }
        console.log('[MOCK] 🔄 Stockage mis à jour pour le champ ' + fieldId + ', maintenant ' + formulas.length + ' formules');
        console.log('[MOCK] ✓ Vérification après mise à jour: ' + (((_a = global._globalFormulasStore.get(fieldId)) === null || _a === void 0 ? void 0 : _a.length) || 0) + ' formules dans le store principal');
        console.log('[MOCK] ✓ Vérification du store de secours: ' + (((_b = global._backupFormulasStore.get(fieldId)) === null || _b === void 0 ? void 0 : _b.length) || 0) + ' formules');
        // Vérification détaillée des données
        var storedFormulas = global._globalFormulasStore.get(fieldId);
        if (storedFormulas && storedFormulas.length > 0) {
            console.log('[MOCK] 📄 Vérification principale - premier élément:', JSON.stringify(storedFormulas[0]));
            // Vérifier la structure complète pour détecter les anomalies
            storedFormulas.forEach(function (f, idx) {
                if (!f.id || !f.sequence) {
                    console.warn("[MOCK] \u26A0\uFE0F Formule #".concat(idx, " potentiellement corrompue:"), JSON.stringify({ id: f.id, hasSequence: !!f.sequence, sequenceType: typeof f.sequence }));
                }
            });
        }
        // Renvoyer la formule mise à jour
        return formula;
    }
    catch (error) {
        console.error('[MOCK] Erreur lors de la mise à jour de la formule ' + formulaId + ':', error);
        logOperation('updateFormula', fieldId, formulaId, 'error', error.message || String(error));
        return null;
    }
};
exports.updateFormula = updateFormula;
/**
 * Supprime une formule
 */
var deleteFormula = function (fieldId, formulaId) {
    try {
        if (!fieldId || !formulaId) {
            console.error('[MOCK] Erreur: fieldId ou formulaId manquant pour la suppression');
            logOperation('deleteFormula', fieldId || 'unknown', formulaId || null, 'error', 'Paramètres manquants');
            return false;
        }
        var formulas = (0, exports.getFormulasForField)(fieldId);
        var index = formulas.findIndex(function (f) { return f.id === formulaId; });
        if (index >= 0) {
            formulas.splice(index, 1);
            global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
            console.log('[MOCK] Formule ' + formulaId + ' supprimée');
            logOperation('deleteFormula', fieldId, formulaId, 'success');
            return true;
        }
        console.log('[MOCK] Formule ' + formulaId + ' non trouvée pour suppression');
        logOperation('deleteFormula', fieldId, formulaId, 'warning', 'Formule non trouvée');
        return false;
    }
    catch (error) {
        console.error('[MOCK] Erreur lors de la suppression de la formule ' + formulaId + ':', error);
        logOperation('deleteFormula', fieldId, formulaId, 'error', error.message || String(error));
        return false;
    }
};
exports.deleteFormula = deleteFormula;
// Exporter l'état du stockage pour le debug
var getStoreState = function () {
    return {
        fieldsCount: global._globalFormulasStore.size,
        fields: Array.from(global._globalFormulasStore.keys()),
        totalFormulas: Array.from(global._globalFormulasStore.values()).reduce(function (acc, arr) { return acc + arr.length; }, 0),
        lastOperations: global._formulasOperationLog.slice(-10)
    };
};
exports.getStoreState = getStoreState;
// Fonction d'assistance pour voir les dernières opérations
var getLastOperations = function (count) {
    if (count === void 0) { count = 10; }
    return global._formulasOperationLog.slice(-count);
};
exports.getLastOperations = getLastOperations;
// Fonction pour vider le stockage (utile pour les tests)
var clearStorage = function (fieldId) {
    if (fieldId) {
        global._globalFormulasStore.delete(fieldId);
        logOperation('clearStorage', fieldId);
        return true;
    }
    else {
        global._globalFormulasStore.clear();
        logOperation('clearAllStorage', 'all');
        return true;
    }
};
exports.clearStorage = clearStorage;
// Fonction pour forcer le rechargement du store avec système de secours (utile pour déboguer)
var forceRefreshStore = function (fieldId) {
    if (!fieldId) {
        console.error('[MOCK] ❌ forceRefreshStore - ERREUR: fieldId est vide ou null');
        return [];
    }
    console.log('[MOCK] 🔄 Forçage du rechargement du store pour le champ ' + fieldId);
    console.log('[MOCK] 📊 État actuel du store principal: ' + global._globalFormulasStore.size + ' champs');
    console.log('[MOCK] 📊 État actuel du store de secours: ' + global._backupFormulasStore.size + ' champs');
    console.log('[MOCK] 🔑 Clés dans le store principal: ' + Array.from(global._globalFormulasStore.keys()).join(', '));
    console.log('[MOCK] 🔑 Clés dans le store de secours: ' + Array.from(global._backupFormulasStore.keys()).join(', '));
    var formulas = [];
    var source = 'aucune';
    // Tentative 1: Récupérer depuis le store principal
    if (global._globalFormulasStore.has(fieldId)) {
        try {
            var primaryData = global._globalFormulasStore.get(fieldId);
            if (primaryData && Array.isArray(primaryData) && primaryData.length > 0) {
                formulas = JSON.parse(JSON.stringify(primaryData));
                source = 'principale';
                console.log("[MOCK] \u2705 Donn\u00E9es r\u00E9cup\u00E9r\u00E9es depuis la source principale: ".concat(formulas.length, " formules"));
            }
            else {
                console.warn("[MOCK] \u26A0\uFE0F La source principale existe mais ne contient pas de donn\u00E9es valides");
            }
        }
        catch (primaryError) {
            console.error("[MOCK] \u274C Erreur lors de l'acc\u00E8s \u00E0 la source principale:", primaryError);
        }
    }
    else {
        console.warn("[MOCK] \u26A0\uFE0F Le champ ".concat(fieldId, " n'existe pas dans la source principale"));
    }
    // Tentative 2: Si la source principale a échoué, essayer la source de secours
    if (formulas.length === 0 && global._backupFormulasStore.has(fieldId)) {
        try {
            var backupData = global._backupFormulasStore.get(fieldId);
            if (backupData && Array.isArray(backupData) && backupData.length > 0) {
                formulas = JSON.parse(JSON.stringify(backupData));
                source = 'secours';
                console.log("[MOCK] \u2705 Donn\u00E9es r\u00E9cup\u00E9r\u00E9es depuis la source de secours: ".concat(formulas.length, " formules"));
                // Restaurer les données dans le store principal
                global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
                console.log("[MOCK] \uD83D\uDD04 Store principal restaur\u00E9 \u00E0 partir du store de secours");
            }
            else {
                console.warn("[MOCK] \u26A0\uFE0F La source de secours existe mais ne contient pas de donn\u00E9es valides");
            }
        }
        catch (backupError) {
            console.error("[MOCK] \u274C Erreur lors de l'acc\u00E8s \u00E0 la source de secours:", backupError);
        }
    }
    // Si aucune donnée n'a été récupérée, initialiser un tableau vide
    if (formulas.length === 0) {
        console.log("[MOCK] \u26A0\uFE0F Aucune donn\u00E9e trouv\u00E9e pour le champ ".concat(fieldId, ", initialisation d'un tableau vide"));
        global._globalFormulasStore.set(fieldId, []);
        global._backupFormulasStore.set(fieldId, []);
        logOperation('forceRefreshStore_init', fieldId);
        return [];
    }
    // Log détaillé des données récupérées
    console.log("[MOCK] \u2713 Store forc\u00E9 (source: ".concat(source, ") - ").concat(formulas.length, " formules r\u00E9cup\u00E9r\u00E9es pour ").concat(fieldId));
    if (formulas.length > 0) {
        console.log('[MOCK] 📄 Premier élément du store:', JSON.stringify(formulas[0]));
    }
    else {
        console.log('[MOCK] 📄 Store vide pour le champ ' + fieldId);
    }
    logOperation('forceRefreshStore', fieldId, null, 'success', { count: formulas.length, source: source });
    return formulas;
};
exports.forceRefreshStore = forceRefreshStore;
