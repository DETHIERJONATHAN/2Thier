"use strict";
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
var express_1 = require("express");
var GoogleOAuthCore_js_1 = require("../google-auth/core/GoogleOAuthCore.js");
var prisma_1 = require("../lib/prisma");
var auth_js_1 = require("../middlewares/auth.js");
var router = (0, express_1.Router)();
var connectCache = new Map();
// POST /api/auto-google-auth/connect
// Tente de connecter l'utilisateur à Google Workspace en arrière-plan.
// Si les tokens existent et sont valides (ou peuvent être rafraîchis), c'est transparent.
// Sinon, renvoie une URL d'autorisation pour que le frontend puisse rediriger l'utilisateur.
router.post('/connect', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, organizationId, caller, isSuperAdmin, membership, key, now, cached, authClient, ttlConnected, payload_1, org, authUrl, ttlManual, payload, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.log('[ROUTE] /api/auto-google-auth/connect atteint');
                _a = req.body, userId = _a.userId, organizationId = _a.organizationId;
                caller = req.user;
                if (!userId || !organizationId) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'userId et organizationId sont requis.' })];
                }
                // 🔒 Validation d'autorisation: l'appelant doit être lui-même OU super_admin
                if (!caller) {
                    return [2 /*return*/, res.status(401).json({ success: false, error: 'Authentification requise.' })];
                }
                isSuperAdmin = caller.role === 'super_admin' || caller.isSuperAdmin === true;
                if (!isSuperAdmin && caller.userId !== userId) {
                    return [2 /*return*/, res.status(403).json({ success: false, error: "Accès interdit: utilisateur non autorisé." })];
                }
                if (!!isSuperAdmin) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma_1.prisma.userOrganization.findFirst({ where: { userId: caller.userId, organizationId: organizationId } })];
            case 1:
                membership = _c.sent();
                if (!membership) {
                    return [2 /*return*/, res.status(403).json({ success: false, error: "Accès interdit: organisation non autorisée." })];
                }
                _c.label = 2;
            case 2:
                _c.trys.push([2, 5, , 6]);
                key = "".concat(userId, ":").concat(organizationId || 'none');
                now = Date.now();
                cached = connectCache.get(key);
                if (cached && cached.expiresAt > now) {
                    res.setHeader('X-AutoGoogle-Cache-Until', new Date(cached.expiresAt).toISOString());
                    return [2 /*return*/, res.json(__assign(__assign({}, cached.payload), { cached: true }))];
                }
                return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.getAuthenticatedClientForOrganization(organizationId)];
            case 3:
                authClient = _c.sent();
                if (authClient) {
                    // L'utilisateur est déjà connecté et le token est valide (ou a été rafraîchi)
                    console.log('[AutoGoogleAuth] ✅ Connexion Google déjà active pour organisation:', organizationId);
                    ttlConnected = 15000;
                    payload_1 = { success: true, isConnected: true, needsManualAuth: false, message: 'Connexion Google déjà active.', cacheTtlMs: ttlConnected };
                    connectCache.set(key, { expiresAt: now + ttlConnected, payload: payload_1 });
                    res.setHeader('X-AutoGoogle-Cache-Until', new Date(now + ttlConnected).toISOString());
                    return [2 /*return*/, res.json(payload_1)];
                }
                // 2. Si aucun client n'est retourné, cela signifie qu'il n'y a pas de tokens valides.
                // Il faut donc initier le processus d'autorisation manuelle.
                console.log('[AutoGoogleAuth] 🔐 Connexion Google non active, génération de l\'URL d\'autorisation...');
                return [4 /*yield*/, prisma_1.prisma.organization.findUnique({
                        where: { id: organizationId },
                        include: { GoogleWorkspaceConfig: true }
                    })];
            case 4:
                org = _c.sent();
                if (!((_b = org === null || org === void 0 ? void 0 : org.GoogleWorkspaceConfig) === null || _b === void 0 ? void 0 : _b.adminEmail)) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Configuration Google Workspace introuvable pour cette organisation.' })];
                }
                authUrl = GoogleOAuthCore_js_1.googleOAuthService.getAuthUrl(userId, organizationId);
                ttlManual = 60000;
                payload = {
                    success: true,
                    isConnected: false,
                    needsManualAuth: true,
                    authUrl: authUrl,
                    adminEmail: org.GoogleWorkspaceConfig.adminEmail,
                    message: 'Autorisation manuelle requise.',
                    cacheTtlMs: ttlManual
                };
                connectCache.set(key, { expiresAt: now + ttlManual, payload: payload });
                res.setHeader('X-AutoGoogle-Cache-Until', new Date(now + ttlManual).toISOString());
                // Indication côté client pour un backoff recommandé
                res.setHeader('Retry-After', Math.ceil(ttlManual / 1000).toString());
                return [2 /*return*/, res.json(payload)];
            case 5:
                error_1 = _c.sent();
                console.error('[AutoGoogleAuth] Erreur lors de la connexion automatique:', error_1);
                res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de la connexion Google.' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /api/auto-google-auth/trigger-logout
router.post('/trigger-logout', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId;
    return __generator(this, function (_a) {
        console.log('[ROUTE] /api/auto-google-auth/trigger-logout atteint');
        userId = req.body.userId;
        console.log('[GOOGLE-LOGOUT] Reçu logout CRM pour utilisateur:', userId);
        if (!userId) {
            return [2 /*return*/, res.status(400).json({ success: false, error: 'userId requis.' })];
        }
        // Politique voulue: NE JAMAIS déconnecter Google automatiquement.
        // On ne révoque pas les tokens, on ne supprime rien. On retourne juste un succès "no-op".
        try {
            // Ancien comportement (désactivé): await googleOAuthService.disconnectUser(userId);
            console.log('[GOOGLE-LOGOUT] Politique NO-OP: aucune action sur les tokens Google');
            return [2 /*return*/, res.status(200).json({ success: true, message: 'Aucune déconnexion Google effectuée (politique persistante).' })];
        }
        catch (error) {
            console.error('[AutoGoogleAuth] Erreur inattendue trigger-logout (no-op):', error);
            return [2 /*return*/, res.status(200).json({ success: true, message: 'Aucune déconnexion Google effectuée (no-op avec erreur interne ignorée).' })];
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
