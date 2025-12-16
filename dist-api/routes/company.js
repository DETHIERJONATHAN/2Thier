"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Routes pour la gestion des entreprises
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var router = (0, express_1.Router)();
// Authentification requise pour toutes les routes
router.use(auth_js_1.authMiddleware);
/**
 * GET /api/company
 * Obtenir les informations de l'entreprise
 */
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, companyInfo;
    return __generator(this, function (_a) {
        try {
            organizationId = req.user.organizationId;
            companyInfo = {
                id: organizationId,
                name: "2Thier CRM",
                address: "Rue de Floreffe 37, 5150 Franière",
                phone: "0470/29.50.77",
                email: "info@2thier.be",
                website: "https://2thier.be",
                vatNumber: "BE0123456789",
                registrationNumber: "123456789"
            };
            res.json({
                success: true,
                data: companyInfo
            });
        }
        catch (error) {
            console.error('❌ [CompanyAPI] Erreur récupération entreprise:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des informations de l\'entreprise'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * PUT /api/company
 * Mettre à jour les informations de l'entreprise (Admin seulement)
 */
router.put('/', (0, auth_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, updateData;
    return __generator(this, function (_a) {
        try {
            organizationId = req.user.organizationId;
            updateData = req.body;
            // TODO: Mettre à jour les informations dans la base de données
            console.log('🔄 [CompanyAPI] Mise à jour entreprise:', { organizationId: organizationId, updateData: updateData });
            res.json({
                success: true,
                message: 'Informations de l\'entreprise mises à jour avec succès',
                data: updateData
            });
        }
        catch (error) {
            console.error('❌ [CompanyAPI] Erreur mise à jour entreprise:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour des informations de l\'entreprise'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * GET /api/company/settings
 * Obtenir les paramètres de l'entreprise
 */
router.get('/settings', (0, auth_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, settings;
    return __generator(this, function (_a) {
        try {
            organizationId = req.user.organizationId;
            settings = {
                organizationId: organizationId,
                currency: "EUR",
                timezone: "Europe/Brussels",
                language: "fr",
                dateFormat: "DD/MM/YYYY",
                invoicePrefix: "INV-",
                quotePrefix: "DEV-"
            };
            res.json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            console.error('❌ [CompanyAPI] Erreur paramètres entreprise:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des paramètres'
            });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
