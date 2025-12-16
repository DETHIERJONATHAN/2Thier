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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_1 = require("../middlewares/auth");
var impersonation_1 = require("../middlewares/impersonation");
var client_1 = require("@prisma/client");
var axios_1 = __importDefault(require("axios"));
var googleapis_1 = require("googleapis");
var crypto_1 = require("crypto");
var googleConfig_1 = require("../auth/googleConfig");
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
// Cache en mémoire (léger) pour éviter des rafales d'appels côté UI et vers Google Ads
// Clé: string -> Valeur: { expiresAt: number; payload: unknown }
var memCache = new Map();
function cacheGet(key) {
    var it = memCache.get(key);
    if (!it)
        return undefined;
    if (Date.now() > it.expiresAt) {
        memCache.delete(key);
        return undefined;
    }
    return it.payload;
}
function cacheSet(key, payload, ttlMs) {
    memCache.set(key, { expiresAt: Date.now() + ttlMs, payload: payload });
}
// Utilitaire: sécuriser/normaliser le redirectUri provenant des variables d'environnement
var DEFAULT_ADS_REDIRECT = (function () {
    var explicit = process.env.GOOGLE_ADS_REDIRECT_URI || googleConfig_1.googleOAuthConfig.redirectUri;
    if (explicit && explicit.trim().length > 0)
        return explicit.trim();
    return googleConfig_1.googleOAuthConfig.redirectUri;
})();
function sanitizeRedirectUri(raw) {
    if (!raw)
        return { uri: DEFAULT_ADS_REDIRECT, sanitized: false };
    var original = raw;
    var val = raw.trim();
    // Retirer guillemets d'encadrement
    val = val.replace(/^['"]/g, '').replace(/['"]$/g, '');
    // Extraire la première sous-chaîne http(s)://... si du bruit est présent autour
    var match = val.match(/https?:\/\/[^\s"']+/);
    if (match) {
        val = match[0];
    }
    try {
        // Valider via URL; si invalide: fallback
        var u = new URL(val);
        if (!/^https?:$/.test(u.protocol))
            throw new Error('Unsupported protocol');
        return { uri: u.toString(), raw: original, sanitized: val !== original, warning: val !== original ? 'Redirect URI corrigé depuis la variable d\'environnement (guillemets/texte parasite retirés)' : undefined };
    }
    catch (_a) {
        return { uri: DEFAULT_ADS_REDIRECT, raw: original, sanitized: true, warning: 'Redirect URI invalide détecté dans GOOGLE_ADS_REDIRECT_URI — fallback appliqué' };
    }
}
// Utilitaire: nettoyer client_id / client_secret (espaces/guillemets parasites)
function sanitizeClientValue(raw) {
    if (!raw)
        return { value: undefined, sanitized: false };
    var original = raw;
    var v = raw.trim();
    var looksQuoted = /^['"].*['"]$/.test(v);
    if (looksQuoted) {
        v = v.replace(/^['"]/, '').replace(/['"]$/, '');
    }
    var sanitized = v !== original;
    var warning = sanitized ? 'Credential nettoyé (espaces/guillemets retirés) — vérifiez votre .env' : undefined;
    return { value: v, sanitized: sanitized, warning: warning, looksQuoted: looksQuoted };
}
// Utilitaire: fingerprint non réversible pour vérifier quel secret est chargé sans l'exposer
function fingerprintSecret(secret) {
    if (!secret)
        return null;
    try {
        var hex = (0, crypto_1.createHash)('sha256').update(secret).digest('hex');
        return hex.slice(0, 12); // 12 hex chars (~48 bits) suffisent pour identifier sans divulguer
    }
    catch (_a) {
        return null;
    }
}
function maskValue(value, prefix, suffix) {
    if (prefix === void 0) { prefix = 4; }
    if (suffix === void 0) { suffix = 4; }
    if (!value)
        return null;
    var len = value.length;
    if (len <= prefix + suffix + 1)
        return value;
    return "".concat(value.slice(0, prefix), "\u2026").concat(value.slice(len - suffix));
}
function normalizeGoogleAdsCustomerId(raw) {
    if (!raw)
        return undefined;
    var digitsOnly = String(raw).replace(/[^0-9]/g, '');
    if (digitsOnly.length !== 10)
        return undefined;
    return digitsOnly;
}
function formatGoogleAdsCustomerId(raw) {
    var normalized = normalizeGoogleAdsCustomerId(raw);
    if (!normalized)
        return undefined;
    return "".concat(normalized.slice(0, 3), "-").concat(normalized.slice(3, 6), "-").concat(normalized.slice(6));
}
// ===== ROUTES PUBLIQUES (sans authentification) =====
// Callbacks OAuth - accessibles sans authentification car appelés directement par les plateformes
// Route callback Facebook standard (https://localhost/)
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, state, parsed, raw, redirectUrl;
    return __generator(this, function (_b) {
        _a = req.query, code = _a.code, state = _a.state;
        if (code && state) {
            try {
                parsed = void 0;
                try {
                    parsed = JSON.parse(decodeURIComponent(state));
                }
                catch (_c) {
                    raw = Buffer.from(String(state), 'base64url').toString('utf8');
                    parsed = JSON.parse(raw);
                }
                if (parsed.platform === 'meta_ads') {
                    redirectUrl = "/api/integrations/advertising/oauth/meta_ads/callback?code=".concat(encodeURIComponent(code), "&state=").concat(encodeURIComponent(state));
                    return [2 /*return*/, res.redirect(redirectUrl)];
                }
            }
            catch (e) {
                console.error('Erreur parsing state Facebook:', e);
            }
        }
        // Si pas de callback Facebook, page normale
        res.send('CRM API Server - Facebook OAuth Callback Handler');
        return [2 /*return*/];
    });
}); });
// Route callback simplifiée pour Facebook (qui refuse les URIs complexes)
router.get('/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, state, parsed, raw, redirectUrl;
    return __generator(this, function (_b) {
        _a = req.query, code = _a.code, state = _a.state;
        if (code && state) {
            // Déterminer la plateforme depuis le state
            try {
                parsed = void 0;
                try {
                    parsed = JSON.parse(decodeURIComponent(state));
                }
                catch (_c) {
                    raw = Buffer.from(String(state), 'base64url').toString('utf8');
                    parsed = JSON.parse(raw);
                }
                if (parsed.platform === 'meta_ads') {
                    redirectUrl = "/api/integrations/advertising/oauth/meta_ads/callback?code=".concat(encodeURIComponent(code), "&state=").concat(encodeURIComponent(state));
                    return [2 /*return*/, res.redirect(redirectUrl)];
                }
            }
            catch (e) {
                console.error('Erreur parsing state:', e);
            }
        }
        res.status(400).send('Callback invalide');
        return [2 /*return*/];
    });
}); });
router.get('/advertising/oauth/:platform/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var platform_1, _a, code, state, error, parsed, raw, organizationId_1, userId, upsertIntegration, idSan, secretSan, clientId, clientSecret, redirectUri, oauth2, tokens, e_1, idSanMasked, secretFp, errorMsg, userFriendlyError, appId, appSecret, redirectUri, tokenRes, accessToken, longLived, ll, _b, e_2, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                // Ajouter les en-têtes pour contourner la page d'avertissement ngrok
                res.setHeader('ngrok-skip-browser-warning', 'true');
                res.setHeader('User-Agent', 'CRM-OAuth-Handler');
                _e.label = 1;
            case 1:
                _e.trys.push([1, 23, , 24]);
                platform_1 = req.params.platform;
                _a = req.query, code = _a.code, state = _a.state, error = _a.error;
                if (error) {
                    console.warn('OAuth error from provider:', error);
                }
                if (!code || !state) {
                    res.status(400).send('Missing code/state');
                    return [2 /*return*/];
                }
                parsed = void 0;
                try {
                    // Essai 1: JSON direct (compatibilité ancienne génération)
                    parsed = JSON.parse(decodeURIComponent(state));
                }
                catch (_f) {
                    try {
                        raw = Buffer.from(String(state), 'base64url').toString('utf8');
                        parsed = JSON.parse(raw);
                    }
                    catch (_g) {
                        res.status(400).send('Invalid state');
                        return [2 /*return*/];
                    }
                }
                organizationId_1 = parsed.organizationId;
                userId = parsed.userId;
                upsertIntegration = function (data) { return __awaiter(void 0, void 0, void 0, function () {
                    var existing, created;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId_1, platform: platform_1 } })];
                            case 1:
                                existing = _c.sent();
                                if (!existing) return [3 /*break*/, 3];
                                return [4 /*yield*/, prisma.adPlatformIntegration.update({ where: { id: existing.id }, data: __assign(__assign({}, data), { status: 'connected', active: true, updatedAt: new Date() }) })];
                            case 2:
                                _c.sent();
                                return [2 /*return*/, existing.id];
                            case 3: return [4 /*yield*/, prisma.adPlatformIntegration.create({
                                    data: {
                                        id: (0, crypto_1.randomUUID)(),
                                        organizationId: organizationId_1,
                                        platform: platform_1,
                                        name: data.name || platform_1,
                                        credentials: (_a = data.credentials) !== null && _a !== void 0 ? _a : {},
                                        config: (_b = data.config) !== null && _b !== void 0 ? _b : {},
                                        status: 'connected',
                                        active: true,
                                        updatedAt: new Date()
                                    }
                                })];
                            case 4:
                                created = _c.sent();
                                return [2 /*return*/, created.id];
                        }
                    });
                }); };
                if (!(platform_1 === 'google_ads')) return [3 /*break*/, 9];
                idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID);
                secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET);
                clientId = idSan.value;
                clientSecret = secretSan.value;
                redirectUri = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI).uri;
                if (!(!clientId || !clientSecret)) return [3 /*break*/, 3];
                return [4 /*yield*/, upsertIntegration({ name: 'Google Ads (OAuth pending)', credentials: { authCode: code, error: 'missing_client_creds', userId: userId } })];
            case 2:
                _e.sent();
                return [3 /*break*/, 8];
            case 3:
                _e.trys.push([3, 6, , 8]);
                oauth2 = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
                return [4 /*yield*/, oauth2.getToken(code)];
            case 4:
                tokens = (_e.sent()).tokens;
                console.log('✅ Google Ads OAuth tokens received successfully');
                return [4 /*yield*/, upsertIntegration({ name: 'Google Ads OAuth', credentials: { tokens: tokens, userId: userId } })];
            case 5:
                _e.sent();
                return [3 /*break*/, 8];
            case 6:
                e_1 = _e.sent();
                idSanMasked = clientId ? (clientId.length > 8 ? clientId.slice(0, 4) + '...' + clientId.slice(-4) : 'defined') : 'MISSING';
                secretFp = fingerprintSecret(clientSecret);
                console.error("Google Ads token exchange failed (clientId=".concat(idSanMasked, ", secretFp=").concat(secretFp !== null && secretFp !== void 0 ? secretFp : 'null', "):"), e_1);
                errorMsg = e_1.message || e_1.code || 'unknown_error';
                userFriendlyError = 'Erreur d\'authentification';
                if (errorMsg.includes('invalid_client')) {
                    userFriendlyError = 'Client OAuth non autorisé pour Google Ads API';
                }
                else if (errorMsg.includes('invalid_scope')) {
                    userFriendlyError = 'Scope Google Ads non activé';
                }
                return [4 /*yield*/, upsertIntegration({
                        name: "Google Ads (".concat(userFriendlyError, ")"),
                        credentials: { authCode: code, error: errorMsg, userError: userFriendlyError, userId: userId }
                    })];
            case 7:
                _e.sent();
                return [3 /*break*/, 8];
            case 8: return [3 /*break*/, 22];
            case 9:
                if (!(platform_1 === 'meta_ads')) return [3 /*break*/, 21];
                appId = process.env.META_APP_ID;
                appSecret = process.env.META_APP_SECRET;
                redirectUri = process.env.META_REDIRECT_URI || 'https://localhost:3000/';
                if (!(!appId || !appSecret)) return [3 /*break*/, 11];
                return [4 /*yield*/, upsertIntegration({ name: 'Meta Ads (OAuth pending)', credentials: { authCode: code, error: 'missing_app_creds', userId: userId } })];
            case 10:
                _e.sent();
                return [3 /*break*/, 20];
            case 11:
                _e.trys.push([11, 18, , 20]);
                return [4 /*yield*/, axios_1.default.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                        params: { client_id: appId, redirect_uri: redirectUri, client_secret: appSecret, code: code }
                    })];
            case 12:
                tokenRes = _e.sent();
                accessToken = (_c = tokenRes.data) === null || _c === void 0 ? void 0 : _c.access_token;
                longLived = accessToken;
                _e.label = 13;
            case 13:
                _e.trys.push([13, 15, , 16]);
                return [4 /*yield*/, axios_1.default.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                        params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: accessToken }
                    })];
            case 14:
                ll = _e.sent();
                longLived = ((_d = ll.data) === null || _d === void 0 ? void 0 : _d.access_token) || accessToken;
                return [3 /*break*/, 16];
            case 15:
                _b = _e.sent();
                return [3 /*break*/, 16];
            case 16: return [4 /*yield*/, upsertIntegration({ name: 'Meta Ads OAuth', credentials: { accessToken: longLived, userId: userId } })];
            case 17:
                _e.sent();
                return [3 /*break*/, 20];
            case 18:
                e_2 = _e.sent();
                console.error('Meta token exchange failed:', e_2);
                return [4 /*yield*/, upsertIntegration({ name: 'Meta Ads (OAuth error)', credentials: { authCode: code, error: 'token_exchange_failed', userId: userId } })];
            case 19:
                _e.sent();
                return [3 /*break*/, 20];
            case 20: return [3 /*break*/, 22];
            case 21:
                res.status(400).send('Unsupported platform');
                return [2 /*return*/];
            case 22:
                // Simple page to close popup and notify opener
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send("<!doctype html><html><body style=\"font-family:sans-serif; padding:16px\">      <p>Authentification ".concat(platform_1, " termin\u00E9e. Vous pouvez fermer cette fen\u00EAtre.</p>      <script src=\"/api/integrations/advertising/oauth/callback-close.js?platform=").concat(encodeURIComponent(platform_1), "\"></script>    </body></html>"));
                return [3 /*break*/, 24];
            case 23:
                error_1 = _e.sent();
                console.error('Erreur oauth callback:', error_1);
                res.status(500).send('OAuth callback error');
                return [3 /*break*/, 24];
            case 24: return [2 /*return*/];
        }
    });
}); });
// Sert un script JS externe qui notifie l'onglet parent et tente de fermer le popup (meilleure compatibilité CSP)
router.get('/advertising/oauth/callback-close.js', function (req, res) {
    var platform = req.query.platform || 'google_ads';
    var js = "(() => {\n  const payload = { type: 'ads_oauth_done', platform: ".concat(JSON.stringify(platform), ", ts: Date.now() };\n  const notify = () => { try { window.opener && window.opener.postMessage(payload, '*'); } catch (e) {} };\n  // Notifier plusieurs fois\n  notify();\n  let n = 0;\n  const t1 = setInterval(() => { n++; notify(); if (n > 10) clearInterval(t1); }, 250);\n  // Fermer \u00E0 r\u00E9p\u00E9tition\n  let c = 0;\n  const t2 = setInterval(() => {\n    c++;\n    try { window.close(); } catch (e) {}\n    try { window.open('', '_self'); window.close(); } catch (e) {}\n    if (c > 20 || window.closed) clearInterval(t2);\n  }, 300);\n  // S\u00E9curit\u00E9: arr\u00EAt des timers\n  setTimeout(() => { try { clearInterval(t1); clearInterval(t2); } catch (e) {} }, 8000);\n})();");
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(js);
});
// ===== ROUTES AUTHENTIFIÉES =====
// Toutes les autres routes nécessitent une authentification
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
var getEffectiveOrgId = function (req) {
    // 1) Header (source standard via useAuthenticatedApi)
    var headerOrgId = req.headers['x-organization-id'];
    if (typeof headerOrgId === 'string' && headerOrgId !== 'all')
        return headerOrgId;
    // 2) Query param (utile pour tests directs dans le navigateur)
    var qOrg = (req.query.organizationId || req.query.orgId);
    if (qOrg && qOrg !== 'all')
        return qOrg;
    // 3) Fallback utilisateur (pour utilisateurs non super-admin)
    var user = req.user;
    return user === null || user === void 0 ? void 0 : user.organizationId;
};
// GET all integrations for the selected organization
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, integrationsSettings, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                user = req.user;
                organizationId = getEffectiveOrgId(req);
                if (!user) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return [2 /*return*/];
                }
                if (!organizationId) {
                    // Return empty array if no specific organization is selected (e.g., "All organizations" view)
                    res.json({ success: true, data: [] });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.integrationsSettings.findMany({
                        where: { organizationId: organizationId },
                        include: {
                            user: { select: { id: true, email: true, firstName: true, lastName: true } },
                        },
                    })];
            case 2:
                integrationsSettings = _a.sent();
                res.json({ success: true, data: integrationsSettings });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error('Failed to get integrations:', error_2);
                res.status(500).json({ success: false, message: 'Failed to get integrations' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST to create or update an integration
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, _a, type, config, enabled, upsertedIntegration, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                user = req.user;
                organizationId = getEffectiveOrgId(req);
                _a = req.body, type = _a.type, config = _a.config, enabled = _a.enabled;
                if (!user) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return [2 /*return*/];
                }
                if (!organizationId) {
                    res.status(400).json({ success: false, message: 'Organization ID is required to create or update an integration.' });
                    return [2 /*return*/];
                }
                if (!type) {
                    res.status(400).json({ success: false, message: 'Integration type is required.' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.integrationsSettings.upsert({
                        where: {
                            organizationId_type: {
                                organizationId: organizationId,
                                type: type,
                            },
                        },
                        update: {
                            config: config,
                            enabled: enabled,
                            userId: user.id,
                        },
                        create: {
                            type: type,
                            config: config,
                            enabled: enabled,
                            organizationId: organizationId,
                            userId: user.id,
                        },
                    })];
            case 2:
                upsertedIntegration = _b.sent();
                res.status(201).json({ success: true, data: upsertedIntegration });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('Failed to upsert integration:', error_3);
                res.status(500).json({ success: false, message: 'Failed to upsert integration' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE to remove an integration by type
router.delete('/:type', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, type, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                user = req.user;
                organizationId = getEffectiveOrgId(req);
                type = req.params.type;
                if (!user) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return [2 /*return*/];
                }
                if (!organizationId) {
                    res.status(400).json({ success: false, message: 'Organization context is missing.' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.integrationsSettings.delete({
                        where: {
                            organizationId_type: {
                                organizationId: organizationId,
                                type: type,
                            },
                        },
                    })];
            case 2:
                _a.sent();
                res.status(200).json({ success: true, message: 'Integration deleted successfully.' });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                if (error_4.code === 'P2025') {
                    res.status(404).json({ success: false, message: 'Integration not found' });
                    return [2 /*return*/];
                }
                console.error('Failed to delete integration:', error_4);
                res.status(500).json({ success: false, message: 'Failed to delete integration' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ==================== ROUTES ARCHITECTURE SCALABLE ====================
// Import des nouveaux services (ajouté ici pour éviter les conflits)
var adPlatformService_1 = require("../services/adPlatformService");
var ecommerceService_1 = require("../services/ecommerceService");
/**
 * GET /api/integrations/advertising/platforms
 * Récupère la liste des plateformes publicitaires disponibles
 */
router.get('/advertising/platforms', function (req, res) {
    res.json({
        success: true,
        platforms: Object.values(adPlatformService_1.AD_PLATFORMS)
    });
});
/**
 * GET /api/integrations/advertising/env-check
 * Vérifie la présence des variables d'environnement nécessaires (Google/Meta)
 */
router.get('/advertising/env-check', function (_req, res) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    var backendUrl = process.env.BACKEND_URL;
    var googleClientId = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID);
    var googleClientSecret = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET);
    var googleDeveloperToken = sanitizeClientValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
    var googleApiVersionRaw = (process.env.GOOGLE_ADS_API_VERSION || 'v18').trim();
    var googleRedirect = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);
    var googleManagerCustomer = normalizeGoogleAdsCustomerId(process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID);
    var googleLoginCustomer = normalizeGoogleAdsCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
    var googleWarnings = [];
    if (googleClientId.sanitized || googleClientId.looksQuoted) {
        googleWarnings.push('GOOGLE_ADS_CLIENT_ID semblait contenir des guillemets/espaces — valeur nettoyée.');
    }
    if (googleClientSecret.sanitized || googleClientSecret.looksQuoted) {
        googleWarnings.push('GOOGLE_ADS_CLIENT_SECRET semblait contenir des guillemets/espaces — valeur nettoyée.');
    }
    if (googleDeveloperToken.sanitized || googleDeveloperToken.looksQuoted) {
        googleWarnings.push('GOOGLE_ADS_DEVELOPER_TOKEN semblait contenir des guillemets/espaces — valeur nettoyée.');
    }
    if (googleRedirect.warning) {
        googleWarnings.push(googleRedirect.warning);
    }
    var metaAppId = sanitizeClientValue(process.env.META_APP_ID);
    var metaAppSecret = sanitizeClientValue(process.env.META_APP_SECRET);
    var metaRedirect = sanitizeRedirectUri(process.env.META_REDIRECT_URI);
    var metaWarnings = [];
    if (metaAppId.sanitized || metaAppId.looksQuoted) {
        metaWarnings.push('META_APP_ID semblait contenir des guillemets/espaces — valeur nettoyée.');
    }
    if (metaAppSecret.sanitized || metaAppSecret.looksQuoted) {
        metaWarnings.push('META_APP_SECRET semblait contenir des guillemets/espaces — valeur nettoyée.');
    }
    if (metaRedirect.warning) {
        metaWarnings.push(metaRedirect.warning);
    }
    var vars = {
        BACKEND_URL: !!backendUrl,
        GOOGLE_ADS_CLIENT_ID: !!googleClientId.value,
        GOOGLE_ADS_CLIENT_SECRET: !!googleClientSecret.value,
        GOOGLE_ADS_DEVELOPER_TOKEN: !!googleDeveloperToken.value,
        META_APP_ID: !!metaAppId.value,
        META_APP_SECRET: !!metaAppSecret.value,
    };
    var missing = Object.entries(vars)
        .filter(function (_a) {
        var ok = _a[1];
        return !ok;
    })
        .map(function (_a) {
        var k = _a[0];
        return k;
    });
    var maskOrNull = function (value) { return maskValue(value !== null && value !== void 0 ? value : undefined); };
    var details = {
        backend: {
            backendUrlDefined: !!backendUrl,
        },
        google: {
            clientId: {
                defined: !!googleClientId.value,
                sanitized: googleClientId.sanitized,
                looksQuoted: googleClientId.looksQuoted,
                length: (_b = (_a = googleClientId.value) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0,
                masked: maskOrNull(googleClientId.value),
            },
            clientSecret: {
                defined: !!googleClientSecret.value,
                sanitized: googleClientSecret.sanitized,
                looksQuoted: googleClientSecret.looksQuoted,
                length: (_d = (_c = googleClientSecret.value) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0,
                fingerprint: fingerprintSecret(googleClientSecret.value),
            },
            developerToken: {
                defined: !!googleDeveloperToken.value,
                sanitized: googleDeveloperToken.sanitized,
                looksQuoted: googleDeveloperToken.looksQuoted,
                length: (_f = (_e = googleDeveloperToken.value) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0,
                fingerprint: fingerprintSecret(googleDeveloperToken.value),
                masked: maskOrNull(googleDeveloperToken.value),
            },
            managerCustomerId: {
                raw: (_g = process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID) !== null && _g !== void 0 ? _g : null,
                normalized: googleManagerCustomer !== null && googleManagerCustomer !== void 0 ? googleManagerCustomer : null,
                formatted: (_h = formatGoogleAdsCustomerId(googleManagerCustomer)) !== null && _h !== void 0 ? _h : null,
            },
            loginCustomerId: {
                raw: (_j = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) !== null && _j !== void 0 ? _j : null,
                normalized: googleLoginCustomer !== null && googleLoginCustomer !== void 0 ? googleLoginCustomer : null,
                formatted: (_k = formatGoogleAdsCustomerId(googleLoginCustomer)) !== null && _k !== void 0 ? _k : null,
            },
            apiVersion: {
                value: googleApiVersionRaw,
                defaultApplied: !process.env.GOOGLE_ADS_API_VERSION,
            },
            redirectUri: {
                value: googleRedirect.uri,
                sanitized: googleRedirect.sanitized,
                warning: (_l = googleRedirect.warning) !== null && _l !== void 0 ? _l : null,
            },
        },
        meta: {
            appId: {
                defined: !!metaAppId.value,
                sanitized: metaAppId.sanitized,
                looksQuoted: metaAppId.looksQuoted,
                length: (_o = (_m = metaAppId.value) === null || _m === void 0 ? void 0 : _m.length) !== null && _o !== void 0 ? _o : 0,
                masked: maskOrNull(metaAppId.value),
            },
            appSecret: {
                defined: !!metaAppSecret.value,
                sanitized: metaAppSecret.sanitized,
                looksQuoted: metaAppSecret.looksQuoted,
                length: (_q = (_p = metaAppSecret.value) === null || _p === void 0 ? void 0 : _p.length) !== null && _q !== void 0 ? _q : 0,
                fingerprint: fingerprintSecret(metaAppSecret.value),
            },
            redirectUri: {
                value: metaRedirect.uri,
                sanitized: metaRedirect.sanitized,
                warning: (_r = metaRedirect.warning) !== null && _r !== void 0 ? _r : null,
            },
        },
    };
    res.json({
        success: true,
        vars: vars,
        missing: missing,
        ready: missing.length === 0,
        warnings: __spreadArray(__spreadArray([], googleWarnings, true), metaWarnings, true),
        details: details,
    });
});
/**
 * GET /api/integrations/advertising
 * Récupère toutes les intégrations publicitaires de l'organisation
 */
router.get('/advertising', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, integrations, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = getEffectiveOrgId(req);
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation requise' })];
                }
                return [4 /*yield*/, adPlatformService_1.AdPlatformService.getIntegrations(organizationId)];
            case 1:
                integrations = _a.sent();
                res.json({
                    success: true,
                    integrations: integrations
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('Erreur récupération intégrations publicitaires:', error_5);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * OAuth: Obtenir l'URL d'authentification pour une plateforme publicitaire
 * GET /api/integrations/advertising/oauth/:platform/url
 */
router.get('/advertising/oauth/:platform/url', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var platform, user, organizationId, stateObj, stateRaw, stateEncoded, idSan, secretSan, clientId, clientSecret, _a, redirectUri, warning, missing, backend, demoUrl, oauth2, authUrl, masked, warns, appId, redirectUri, missing, backend, demoUrl, basicScope, scope, authUrl, authUrl;
    return __generator(this, function (_b) {
        try {
            platform = req.params.platform;
            user = req.user;
            organizationId = getEffectiveOrgId(req);
            if (!user || !organizationId) {
                return [2 /*return*/, res.status(401).json({ success: false, message: 'Auth requise' })];
            }
            stateObj = {
                platform: platform,
                organizationId: organizationId,
                userId: user.userId,
                ts: Date.now()
            };
            stateRaw = JSON.stringify(stateObj);
            stateEncoded = Buffer.from(stateRaw, 'utf8').toString('base64url');
            if (platform === 'google_ads') {
                idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID);
                secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
                clientId = idSan.value;
                clientSecret = secretSan.value || '';
                _a = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI), redirectUri = _a.uri, warning = _a.warning;
                if (!clientId) {
                    missing = ['GOOGLE_ADS_CLIENT_ID'];
                    backend = (process.env.BACKEND_URL || process.env.API_URL || '').trim() || 'http://localhost:4000';
                    demoUrl = "".concat(backend, "/api/integrations/advertising/oauth/google_ads/demo?missing=").concat(encodeURIComponent(missing.join(',')));
                    return [2 /*return*/, res.json({ success: true, platform: platform, demo: true, requiredEnv: missing, authUrl: demoUrl, message: 'Mode démo: variables d\'environnement manquantes' })];
                }
                try {
                    oauth2 = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
                    authUrl = oauth2.generateAuthUrl({
                        access_type: 'offline',
                        prompt: 'consent',
                        scope: ['https://www.googleapis.com/auth/adwords'],
                        state: stateEncoded
                    });
                    masked = clientId.length > 8 ? clientId.slice(0, 4) + '...' + clientId.slice(-4) : 'defined';
                    warns = [];
                    if (warning)
                        warns.push(warning);
                    if (idSan.sanitized || idSan.looksQuoted)
                        warns.push('GOOGLE_ADS_CLIENT_ID semblait contenir des guillemets/espaces — valeur nettoyée');
                    if (secretSan.sanitized || secretSan.looksQuoted)
                        warns.push('GOOGLE_ADS_CLIENT_SECRET semblait contenir des guillemets/espaces — valeur nettoyée');
                    console.log("[ADS OAUTH] G\u00E9n\u00E9ration URL Google Ads OAuth | clientId=".concat(masked, " | redirectUri=").concat(redirectUri));
                    return [2 /*return*/, res.json({ success: true, platform: platform, authUrl: authUrl, warnings: warns })];
                }
                catch (err) {
                    console.error('Erreur génération URL OAuth Google Ads:', err);
                    return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur génération URL OAuth (Google Ads)' })];
                }
            }
            if (platform === 'meta_ads') {
                appId = process.env.META_APP_ID;
                redirectUri = process.env.META_REDIRECT_URI || 'https://localhost:3000/';
                if (!appId) {
                    missing = ['META_APP_ID'];
                    backend = (process.env.BACKEND_URL || process.env.API_URL || '').trim() || 'http://localhost:4000';
                    demoUrl = "".concat(backend, "/api/integrations/advertising/oauth/meta_ads/demo?missing=").concat(encodeURIComponent(missing.join(',')));
                    return [2 /*return*/, res.json({ success: true, platform: platform, demo: true, requiredEnv: missing, authUrl: demoUrl, message: 'Mode démo: variables d\'environnement manquantes' })];
                }
                basicScope = 'public_profile';
                scope = encodeURIComponent(basicScope);
                // Si utilisation de l'URI Facebook universelle, utiliser le SDK JavaScript
                if (redirectUri === 'https://www.facebook.com/connect/login_success.html') {
                    authUrl = "https://www.facebook.com/v18.0/dialog/oauth?client_id=".concat(appId, "&redirect_uri=").concat(encodeURIComponent(redirectUri), "&response_type=code&scope=").concat(scope, "&state=").concat(encodeURIComponent(stateRaw), "&display=popup");
                    return [2 /*return*/, res.json({
                            success: true,
                            platform: platform,
                            authUrl: authUrl,
                            usePopup: true,
                            message: 'Utilisation de l\'URI Facebook universelle avec popup'
                        })];
                }
                else {
                    authUrl = "https://www.facebook.com/v18.0/dialog/oauth?client_id=".concat(appId, "&redirect_uri=").concat(encodeURIComponent(redirectUri), "&response_type=code&scope=").concat(scope, "&state=").concat(encodeURIComponent(stateRaw));
                    return [2 /*return*/, res.json({ success: true, platform: platform, authUrl: authUrl })];
                }
            }
            return [2 /*return*/, res.status(400).json({ success: false, message: 'Plateforme non supportée' })];
        }
        catch (error) {
            console.error('Erreur oauth url:', error);
            res.status(500).json({ success: false, message: 'Erreur génération URL OAuth' });
        }
        return [2 /*return*/];
    });
}); });
/**
 * Endpoint de debug: affiche les paramètres OAuth Google Ads calculés
 * GET /api/integrations/advertising/oauth/google_ads/debug
 */
router.get('/advertising/oauth/google_ads/debug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, idSan, secretSan, clientId, clientSecret, _a, redirectUri, redirectWarning, masked, warnings, defaultScopes, testScopes, authUrl, testAuthUrl, stateRaw, oauth2;
    return __generator(this, function (_b) {
        try {
            user = req.user;
            organizationId = getEffectiveOrgId(req);
            if (!user || !organizationId) {
                return [2 /*return*/, res.status(401).json({ success: false, message: 'Auth requise' })];
            }
            idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID || '');
            secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
            clientId = idSan.value || '';
            clientSecret = secretSan.value || '';
            _a = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI), redirectUri = _a.uri, redirectWarning = _a.warning;
            masked = clientId ? (clientId.length > 8 ? clientId.slice(0, 4) + '...' + clientId.slice(-4) : 'defined') : 'MISSING';
            warnings = [];
            if (!clientId)
                warnings.push('GOOGLE_ADS_CLIENT_ID manquant');
            if (!redirectUri)
                warnings.push('Redirect URI manquant');
            if (redirectWarning)
                warnings.push(redirectWarning);
            if (idSan.sanitized || idSan.looksQuoted)
                warnings.push('GOOGLE_ADS_CLIENT_ID semblait contenir des guillemets/espaces — valeur nettoyée');
            if (secretSan.sanitized || secretSan.looksQuoted)
                warnings.push('GOOGLE_ADS_CLIENT_SECRET semblait contenir des guillemets/espaces — valeur nettoyée');
            defaultScopes = ['https://www.googleapis.com/auth/adwords'];
            testScopes = ['openid', 'email', 'profile'];
            authUrl = null;
            testAuthUrl = null;
            try {
                if (clientId) {
                    stateRaw = JSON.stringify({ platform: 'google_ads', organizationId: organizationId, userId: user.userId, ts: Date.now() });
                    oauth2 = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
                    // URL principale (Ads)
                    authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: defaultScopes, state: stateRaw });
                    // URL de test (scopes simples)
                    testAuthUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: testScopes, state: stateRaw });
                }
            }
            catch (e) {
                warnings.push('Erreur lors de la génération de l\'URL OAuth: ' + e.message);
            }
            return [2 /*return*/, res.json({
                    success: true,
                    platform: 'google_ads',
                    clientIdMasked: masked,
                    clientSecretFingerprint: fingerprintSecret(clientSecret),
                    clientSecretLength: clientSecret ? clientSecret.length : 0,
                    clientSecretStartsWithGOCSPX: clientSecret ? clientSecret.startsWith('GOCSPX-') : false,
                    redirectUri: redirectUri,
                    scope: defaultScopes,
                    testScopes: testScopes,
                    organizationId: organizationId,
                    userId: user.userId,
                    authUrl: authUrl,
                    testAuthUrl: testAuthUrl,
                    warnings: warnings
                })];
        }
        catch (error) {
            console.error('Erreur debug OAuth Google Ads:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur (debug OAuth)' });
        }
        return [2 /*return*/];
    });
}); });
/**
 * Page démo quand les variables d'environnement OAuth manquent.
 * GET /api/integrations/advertising/oauth/:platform/demo?missing=VAR1,VAR2
 */
router.get('/advertising/oauth/:platform/demo', function (req, res) {
    var platform = req.params.platform;
    var missing = String(req.query.missing || '').split(',').filter(Boolean);
    var platformLabel = platform === 'google_ads' ? 'Google Ads' : platform === 'meta_ads' ? 'Meta Ads' : platform;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send("<!doctype html>\n  <html lang=\"fr\">\n    <head>\n      <meta charset=\"utf-8\" />\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n      <title>Mode d\u00E9mo \u2014 OAuth non configur\u00E9</title>\n      <style>\n        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; }\n        .card { max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 10px 18px rgba(2,6,23,0.06); }\n        h1 { font-size: 20px; margin: 0 0 8px; }\n        .muted { color: #475569; }\n        code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }\n        ul { margin: 8px 0 16px 22px; }\n        .actions { display: flex; gap: 8px; }\n        button { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; }\n        button.primary { background: #2563eb; color: white; border-color: #2563eb; }\n      </style>\n    </head>\n    <body>\n      <div class=\"card\">\n        <h1>Mode d\u00E9mo \u2014 ".concat(platformLabel, " OAuth non configur\u00E9</h1>\n  <p class=\"muted\">Pour activer l'authentification ").concat(platformLabel, ", d\u00E9finissez les variables d'environnement suivantes c\u00F4t\u00E9 serveur :</p>\n        ").concat(missing.length ? "<ul>".concat(missing.map(function (v) { return "<li><code>".concat(v, "</code></li>"); }).join(''), "</ul>") : '', "\n        <p class=\"muted\">Apr\u00E8s configuration, relancez l'API puis r\u00E9essayez. Cette fen\u00EAtre se fermera automatiquement.</p>\n        <div class=\"actions\">\n          <button class=\"primary\" id=\"close\">Fermer maintenant</button>\n        </div>\n      </div>\n      <script>\n        const notify = () => { try { window.opener && window.opener.postMessage({ type: 'ads_oauth_done', platform: '").concat(platform, "', demo: true }, '*'); } catch (e) {} };\n        document.getElementById('close').addEventListener('click', () => { notify(); window.close(); });\n        setTimeout(() => { notify(); window.close(); }, 1600);\n      </script>\n    </body>\n  </html>"));
});
/**
 * Lister les comptes accessibles pour une plateforme
 * GET /api/integrations/advertising/:platform/accounts
 */
router.get('/advertising/:platform/accounts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var platform_2, organizationId_2, integration_1, devTokenSan_1, devToken_1, idSan_1, secretSan, clientId_1, clientSecret, redirectUri_1, creds, cfg, loginCustomerIdSelected_1, loginCustomerIdSelectedFormatted_1, envLoginCandidatesRaw, envLoginCandidates_1, loginCustomerCandidates_1, sendLoginOnListEnv, loginRequirementKey_1, forcedLoginFromCache_1, primaryCandidate, shouldSendLoginHeaderFirst, primaryLoginCustomerId_1, cloneIntegrationCredentials_1, credentialsForSuccess_1, credentialsForError_1, markIntegrationStatus_1, tokensRaw, storedTokens, warnings_1, accessToken_1, refreshToken, oauth2, tk, _a, candidateApiVersions, unsupportedVersions, extractGoogleAdsError_1, buildCacheKeyBase_1, runWithApiVersion, finalResult, _i, candidateApiVersions_1, apiVersion, result, primaryError, diag, finalErrorSummary, appIdSan, appSecretSan, warnings, rawCreds, rawAccessToken, trimmedAccessToken, accessToken_2, cloneIntegrationCredentials_2, credentialsForSuccess_2, credentialsForError_2, markIntegrationStatus, cacheKeyBase, cacheKeyOk, cacheKeyError, cacheTtlSuccessMs, cacheTtlErrorMs, cachedOk, diagnostics, cachedErr, diagnostics, accountsResp, rawAccounts, accounts, payload, error_6, ax, fbError, fbType, fbMessage, fbCode, fbSubcode, fbTraceId, userFriendly, payload, error_7;
    var _b, _c, _d, _e, _f, _g, _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                _k.trys.push([0, 27, , 28]);
                platform_2 = req.params.platform;
                organizationId_2 = getEffectiveOrgId(req);
                if (!organizationId_2)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organisation requise' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId_2, platform: platform_2 } })];
            case 1:
                integration_1 = _k.sent();
                // Si pas d'intégration, retourner un statut simple
                if (!integration_1) {
                    return [2 /*return*/, res.json({ success: true, platform: platform_2, integration: null, accounts: [], note: 'Aucune intégration configurée' })];
                }
                if (!(platform_2 === 'google_ads')) return [3 /*break*/, 20];
                devTokenSan_1 = sanitizeClientValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '');
                devToken_1 = devTokenSan_1.value || '';
                idSan_1 = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID || '');
                secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
                clientId_1 = idSan_1.value || '';
                clientSecret = secretSan.value || '';
                redirectUri_1 = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI).uri;
                creds = integration_1.credentials;
                cfg = integration_1.config;
                loginCustomerIdSelected_1 = normalizeGoogleAdsCustomerId((_b = cfg === null || cfg === void 0 ? void 0 : cfg.selectedAccount) === null || _b === void 0 ? void 0 : _b.id);
                loginCustomerIdSelectedFormatted_1 = formatGoogleAdsCustomerId(loginCustomerIdSelected_1);
                envLoginCandidatesRaw = [
                    process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID,
                    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
                    process.env.GOOGLE_ADS_MANAGER_ID
                ];
                envLoginCandidates_1 = envLoginCandidatesRaw
                    .map(function (value) { return normalizeGoogleAdsCustomerId(value); })
                    .filter(function (value) { return Boolean(value); });
                loginCustomerCandidates_1 = Array.from(new Set(__spreadArray([loginCustomerIdSelected_1], envLoginCandidates_1, true).filter(function (value) { return Boolean(value); })));
                sendLoginOnListEnv = (function () {
                    var v = String(process.env.GOOGLE_ADS_LIST_SEND_LOGIN_CUSTOMER || '').trim().toLowerCase();
                    return v === '1' || v === 'true' || v === 'yes';
                })();
                loginRequirementKey_1 = "ads.accounts.force-login:".concat(organizationId_2);
                forcedLoginFromCache_1 = cacheGet(loginRequirementKey_1) === true;
                primaryCandidate = loginCustomerCandidates_1[0];
                shouldSendLoginHeaderFirst = Boolean(primaryCandidate) &&
                    (sendLoginOnListEnv || forcedLoginFromCache_1 || Boolean(loginCustomerIdSelected_1));
                primaryLoginCustomerId_1 = shouldSendLoginHeaderFirst ? primaryCandidate : undefined;
                cloneIntegrationCredentials_1 = function () {
                    var raw = integration_1 === null || integration_1 === void 0 ? void 0 : integration_1.credentials;
                    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                        return raw && typeof raw === 'object' ? __assign({}, raw) : null;
                    }
                    return __assign({}, raw);
                };
                credentialsForSuccess_1 = function () {
                    var clone = cloneIntegrationCredentials_1();
                    if (!clone)
                        return undefined;
                    var mutated = false;
                    if (Object.prototype.hasOwnProperty.call(clone, 'userError')) {
                        delete clone.userError;
                        mutated = true;
                    }
                    if (Object.prototype.hasOwnProperty.call(clone, 'error')) {
                        delete clone.error;
                        mutated = true;
                    }
                    return mutated ? clone : undefined;
                };
                credentialsForError_1 = function (userError) {
                    var _a;
                    var clone = ((_a = cloneIntegrationCredentials_1()) !== null && _a !== void 0 ? _a : {});
                    var mutated = false;
                    if (userError && clone.userError !== userError) {
                        clone.userError = userError;
                        mutated = true;
                    }
                    return mutated ? clone : undefined;
                };
                markIntegrationStatus_1 = function (status, userError) { return __awaiter(void 0, void 0, void 0, function () {
                    var data, sanitized, credsWithError, updated;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!integration_1)
                                    return [2 /*return*/];
                                data = {
                                    status: status,
                                    updatedAt: new Date(),
                                };
                                if (status === 'connected') {
                                    data.lastSync = new Date();
                                    sanitized = credentialsForSuccess_1();
                                    if (sanitized)
                                        data.credentials = sanitized;
                                }
                                else if (status === 'error') {
                                    credsWithError = credentialsForError_1(userError);
                                    if (credsWithError)
                                        data.credentials = credsWithError;
                                }
                                return [4 /*yield*/, prisma.adPlatformIntegration.update({
                                        where: { id: integration_1.id },
                                        data: data,
                                    })];
                            case 1:
                                updated = _a.sent();
                                integration_1 = updated;
                                return [2 /*return*/];
                        }
                    });
                }); };
                tokensRaw = creds && typeof creds === 'object' && 'tokens' in creds
                    ? creds['tokens']
                    : undefined;
                storedTokens = (tokensRaw && typeof tokensRaw === 'object')
                    ? tokensRaw
                    : {};
                warnings_1 = [];
                if (!devToken_1)
                    warnings_1.push('GOOGLE_ADS_DEVELOPER_TOKEN manquant — requêtes Google Ads refusées');
                if (devTokenSan_1.sanitized || devTokenSan_1.looksQuoted)
                    warnings_1.push('GOOGLE_ADS_DEVELOPER_TOKEN semblait contenir des guillemets/espaces — valeur nettoyée');
                if (!clientId_1 || !clientSecret)
                    warnings_1.push('Client OAuth Google Ads incomplet — rafraîchissement du token impossible');
                accessToken_1 = storedTokens.access_token;
                refreshToken = storedTokens.refresh_token;
                _k.label = 2;
            case 2:
                _k.trys.push([2, 5, , 6]);
                if (!((!accessToken_1 || storedTokens.expiry_date) && clientId_1 && clientSecret && (refreshToken || storedTokens.expiry_date))) return [3 /*break*/, 4];
                oauth2 = new googleapis_1.google.auth.OAuth2(clientId_1, clientSecret, redirectUri_1);
                oauth2.setCredentials({
                    access_token: storedTokens.access_token,
                    refresh_token: storedTokens.refresh_token,
                    expiry_date: storedTokens.expiry_date,
                    token_type: storedTokens.token_type,
                    scope: storedTokens.scope,
                });
                return [4 /*yield*/, oauth2.getAccessToken()];
            case 3:
                tk = _k.sent();
                accessToken_1 = (tk === null || tk === void 0 ? void 0 : tk.token) || oauth2.credentials.access_token || accessToken_1;
                _k.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                _a = _k.sent();
                warnings_1.push('Échec du rafraîchissement de l’access token — tentative avec le token stocké');
                return [3 /*break*/, 6];
            case 6:
                if (!accessToken_1) {
                    return [2 /*return*/, res.json({ success: true, platform: platform_2, integration: integration_1, accounts: [], warnings: warnings_1, disabledReason: 'missing_access_token', message: 'Access token indisponible', connectionState: 'disconnected' })];
                }
                if (!devToken_1) {
                    return [2 /*return*/, res.json({ success: true, platform: platform_2, integration: integration_1, accounts: [], warnings: warnings_1, disabledReason: 'missing_developer_token', message: 'Developer token manquant', connectionState: 'disconnected' })];
                }
                candidateApiVersions = (function () {
                    var envValue = (process.env.GOOGLE_ADS_API_VERSION || '').trim();
                    var defaults = ['v19', 'v18', 'v17'];
                    var ordered = envValue ? __spreadArray([envValue], defaults, true) : defaults;
                    return Array.from(new Set(ordered)).filter(Boolean);
                })();
                unsupportedVersions = [];
                extractGoogleAdsError_1 = function (err) {
                    var _a, _b, _c;
                    var ax = err;
                    var data = (_a = ax === null || ax === void 0 ? void 0 : ax.response) === null || _a === void 0 ? void 0 : _a.data;
                    var apiError = data === null || data === void 0 ? void 0 : data.error;
                    var apiMsg = (apiError === null || apiError === void 0 ? void 0 : apiError.message) || 'Erreur Google Ads API';
                    var apiStatus = (apiError === null || apiError === void 0 ? void 0 : apiError.status) || 'UNKNOWN';
                    var detailMsgs = [];
                    var errorCodeKeys = [];
                    try {
                        var detailsArr = Array.isArray(apiError === null || apiError === void 0 ? void 0 : apiError.details) ? apiError.details : [];
                        for (var _i = 0, detailsArr_1 = detailsArr; _i < detailsArr_1.length; _i++) {
                            var d = detailsArr_1[_i];
                            var dA = d;
                            var dB = d;
                            var errorsContainer = Array.isArray(dA === null || dA === void 0 ? void 0 : dA.errors)
                                ? dA.errors
                                : Array.isArray((_b = dB === null || dB === void 0 ? void 0 : dB.data) === null || _b === void 0 ? void 0 : _b.errors)
                                    ? (_c = dB.data) === null || _c === void 0 ? void 0 : _c.errors
                                    : [];
                            for (var _d = 0, errorsContainer_1 = errorsContainer; _d < errorsContainer_1.length; _d++) {
                                var e = errorsContainer_1[_d];
                                if (e === null || e === void 0 ? void 0 : e.message)
                                    detailMsgs.push(String(e.message));
                                var ec = e === null || e === void 0 ? void 0 : e.errorCode;
                                if (ec && typeof ec === 'object') {
                                    for (var _e = 0, _f = Object.keys(ec); _e < _f.length; _e++) {
                                        var k = _f[_e];
                                        var val = ec[k];
                                        if (val)
                                            errorCodeKeys.push("".concat(k, ":").concat(String(val)));
                                    }
                                }
                            }
                        }
                    }
                    catch ( /* ignore detail extraction errors */_g) { /* ignore detail extraction errors */ }
                    var apiErrorSummary = "".concat(apiStatus, ": ").concat(apiMsg).concat(detailMsgs.length ? ' — ' + detailMsgs[0] : '');
                    return { data: data, apiErrorSummary: apiErrorSummary, apiStatus: apiStatus, errorCodeKeys: errorCodeKeys };
                };
                buildCacheKeyBase_1 = function (apiVersion, loginCustomerId, headerFormat) {
                    var loginKey = loginCustomerId !== null && loginCustomerId !== void 0 ? loginCustomerId : 'none';
                    var formatKey = headerFormat !== null && headerFormat !== void 0 ? headerFormat : 'none';
                    return "ads.accounts:".concat(organizationId_2, ":").concat(apiVersion, ":").concat(loginKey, ":").concat(formatKey, ":").concat(fingerprintSecret(devToken_1) || 'no-dev');
                };
                runWithApiVersion = function (apiVersion) { return __awaiter(void 0, void 0, void 0, function () {
                    var cacheTtlSuccessMs, cacheTtlErrorMs, attemptList, applyFormattedFallback, initialAttempt, shouldRetryWithLoginHeader, fallbackLoginCustomerId, fallbackLabel, fallbackAttempt, fallbackErrorSummary, initialErrorSummary;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                cacheTtlSuccessMs = 30000;
                                cacheTtlErrorMs = 20000;
                                attemptList = function (loginCustomerId_1) {
                                    var args_1 = [];
                                    for (var _i = 1; _i < arguments.length; _i++) {
                                        args_1[_i - 1] = arguments[_i];
                                    }
                                    return __awaiter(void 0, __spreadArray([loginCustomerId_1], args_1, true), void 0, function (loginCustomerId, allowCacheRead, options) {
                                        var headerFormat, sanitizedLoginForKey, cacheKeyBase, cacheKeyOk, cacheKeyErr, cachedOk, headerFmtDiag, headerFormatFromCache, cachedErr, cachedStatus, headerFmtDiag, headerFormatFromCache, url, headers, sanitizedLoginHeader, formattedLoginHeader, rawLoginHeader, loginHeaderValue, loginHeaderSent, resp, names, accounts, payload, error_8, _a, data, apiErrorSummary, apiStatus, errorCodeKeys, warningsForPayload, humanHint, payload;
                                        var _b, _c, _d, _e, _f;
                                        if (allowCacheRead === void 0) { allowCacheRead = true; }
                                        return __generator(this, function (_g) {
                                            switch (_g.label) {
                                                case 0:
                                                    headerFormat = (_b = options === null || options === void 0 ? void 0 : options.headerFormat) !== null && _b !== void 0 ? _b : 'digits';
                                                    sanitizedLoginForKey = normalizeGoogleAdsCustomerId(loginCustomerId);
                                                    cacheKeyBase = buildCacheKeyBase_1(apiVersion, sanitizedLoginForKey !== null && sanitizedLoginForKey !== void 0 ? sanitizedLoginForKey : loginCustomerId, headerFormat);
                                                    cacheKeyOk = cacheKeyBase;
                                                    cacheKeyErr = "".concat(cacheKeyBase, ":error");
                                                    if (allowCacheRead) {
                                                        cachedOk = cacheGet(cacheKeyOk);
                                                        if (cachedOk) {
                                                            headerFmtDiag = (_c = cachedOk === null || cachedOk === void 0 ? void 0 : cachedOk.diagnostics) === null || _c === void 0 ? void 0 : _c.loginCustomerHeaderFormatUsed;
                                                            headerFormatFromCache = headerFmtDiag === 'formatted' || headerFmtDiag === 'raw' || headerFmtDiag === 'digits'
                                                                ? headerFmtDiag
                                                                : 'none';
                                                            return [2 /*return*/, {
                                                                    type: 'success',
                                                                    payload: __assign(__assign({}, cachedOk), { cached: true }),
                                                                    loginCustomerId: sanitizedLoginForKey !== null && sanitizedLoginForKey !== void 0 ? sanitizedLoginForKey : loginCustomerId,
                                                                    headerFormatUsed: headerFormatFromCache,
                                                                    fromCache: true,
                                                                    cacheKeyBase: cacheKeyBase,
                                                                    cacheKeyUsed: cacheKeyOk,
                                                                    apiVersion: apiVersion
                                                                }];
                                                        }
                                                        cachedErr = cacheGet(cacheKeyErr);
                                                        if (cachedErr) {
                                                            cachedStatus = typeof cachedErr.apiStatus === 'string' ? cachedErr.apiStatus : 'UNKNOWN';
                                                            headerFmtDiag = (_d = cachedErr === null || cachedErr === void 0 ? void 0 : cachedErr.diagnostics) === null || _d === void 0 ? void 0 : _d.loginCustomerHeaderFormatUsed;
                                                            headerFormatFromCache = headerFmtDiag === 'formatted' || headerFmtDiag === 'raw' || headerFmtDiag === 'digits'
                                                                ? headerFmtDiag
                                                                : 'none';
                                                            return [2 /*return*/, {
                                                                    type: 'error',
                                                                    payload: __assign(__assign({}, cachedErr), { cached: true }),
                                                                    apiStatus: cachedStatus,
                                                                    loginCustomerId: sanitizedLoginForKey !== null && sanitizedLoginForKey !== void 0 ? sanitizedLoginForKey : loginCustomerId,
                                                                    headerFormatUsed: headerFormatFromCache,
                                                                    fromCache: true,
                                                                    cacheKeyBase: cacheKeyBase,
                                                                    cacheKeyUsed: cacheKeyErr,
                                                                    apiVersion: apiVersion
                                                                }];
                                                        }
                                                    }
                                                    url = "https://googleads.googleapis.com/".concat(apiVersion, "/customers:listAccessibleCustomers");
                                                    headers = {
                                                        Authorization: "Bearer ".concat(accessToken_1),
                                                        'developer-token': devToken_1,
                                                        Accept: 'application/json'
                                                    };
                                                    sanitizedLoginHeader = sanitizedLoginForKey;
                                                    formattedLoginHeader = sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : undefined;
                                                    rawLoginHeader = typeof loginCustomerId === 'string' ? loginCustomerId.trim() : undefined;
                                                    loginHeaderValue = (function () {
                                                        if (headerFormat === 'formatted')
                                                            return formattedLoginHeader;
                                                        if (headerFormat === 'raw')
                                                            return rawLoginHeader;
                                                        return sanitizedLoginHeader;
                                                    })();
                                                    loginHeaderSent = Boolean(loginHeaderValue);
                                                    if (loginHeaderSent && loginHeaderValue) {
                                                        headers['login-customer-id'] = loginHeaderValue;
                                                    }
                                                    _g.label = 1;
                                                case 1:
                                                    _g.trys.push([1, 3, , 4]);
                                                    return [4 /*yield*/, axios_1.default.get(url, { headers: headers })];
                                                case 2:
                                                    resp = _g.sent();
                                                    names = ((_e = resp.data) === null || _e === void 0 ? void 0 : _e.resourceNames) || ((_f = resp.data) === null || _f === void 0 ? void 0 : _f.resource_names) || [];
                                                    accounts = names.map(function (rn) {
                                                        var m = String(rn).match(/customers\/(\d+)/);
                                                        return { id: m ? m[1] : rn };
                                                    });
                                                    payload = {
                                                        success: true,
                                                        platform: platform_2,
                                                        integration: integration_1,
                                                        accounts: accounts,
                                                        warnings: __spreadArray([], warnings_1, true),
                                                        diagnostics: {
                                                            loginCustomerIdSelected: loginCustomerIdSelected_1,
                                                            loginCustomerIdSelectedFormatted: loginCustomerIdSelectedFormatted_1,
                                                            loginCustomerHeaderSent: loginHeaderSent,
                                                            loginCustomerAttempted: sanitizedLoginHeader !== null && sanitizedLoginHeader !== void 0 ? sanitizedLoginHeader : null,
                                                            loginCustomerAttemptFormatted: sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : null,
                                                            loginCustomerAttemptRaw: rawLoginHeader !== null && rawLoginHeader !== void 0 ? rawLoginHeader : null,
                                                            loginCustomerHeaderValue: loginHeaderValue !== null && loginHeaderValue !== void 0 ? loginHeaderValue : null,
                                                            loginCustomerHeaderFormatUsed: loginHeaderSent ? headerFormat : 'none',
                                                            loginHeaderSource: sanitizedLoginHeader
                                                                ? sanitizedLoginHeader === loginCustomerIdSelected_1
                                                                    ? 'selected_account'
                                                                    : envLoginCandidates_1.includes(sanitizedLoginHeader)
                                                                        ? 'environment'
                                                                        : 'manual'
                                                                : null,
                                                            apiVersion: apiVersion,
                                                            availableLoginCustomerCandidates: loginCustomerCandidates_1,
                                                            forcedLoginHeader: forcedLoginFromCache_1,
                                                            fallbackTriggered: false
                                                        },
                                                        cached: false,
                                                        cacheTtlMs: cacheTtlSuccessMs,
                                                        connectionState: 'connected'
                                                    };
                                                    cacheSet(cacheKeyOk, payload, cacheTtlSuccessMs);
                                                    return [2 /*return*/, { type: 'success', payload: payload, loginCustomerId: sanitizedLoginHeader !== null && sanitizedLoginHeader !== void 0 ? sanitizedLoginHeader : loginCustomerId, headerFormatUsed: loginHeaderSent ? headerFormat : 'none', fromCache: false, cacheKeyBase: cacheKeyBase, cacheKeyUsed: cacheKeyOk, apiVersion: apiVersion }];
                                                case 3:
                                                    error_8 = _g.sent();
                                                    _a = extractGoogleAdsError_1(error_8), data = _a.data, apiErrorSummary = _a.apiErrorSummary, apiStatus = _a.apiStatus, errorCodeKeys = _a.errorCodeKeys;
                                                    console.error('Erreur Google Ads listAccessibleCustomers:', data || error_8);
                                                    console.error('Google Ads diagnostics (listAccessibleCustomers):', {
                                                        organizationId: organizationId_2,
                                                        apiStatus: apiStatus,
                                                        loginHeader: {
                                                            sent: loginHeaderSent,
                                                            valueLength: loginHeaderValue ? loginHeaderValue.length : 0,
                                                            normalized: sanitizedLoginHeader !== null && sanitizedLoginHeader !== void 0 ? sanitizedLoginHeader : null,
                                                            formatted: sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : null,
                                                            formatUsed: loginHeaderSent ? headerFormat : 'none',
                                                            source: sanitizedLoginHeader
                                                                ? sanitizedLoginHeader === loginCustomerIdSelected_1
                                                                    ? 'selected_account'
                                                                    : envLoginCandidates_1.includes(sanitizedLoginHeader)
                                                                        ? 'environment'
                                                                        : 'manual'
                                                                : null,
                                                        },
                                                        developerToken: {
                                                            defined: Boolean(devToken_1),
                                                            fingerprint: fingerprintSecret(devToken_1),
                                                            length: devToken_1 ? devToken_1.length : 0,
                                                        },
                                                        clientId: {
                                                            defined: Boolean(clientId_1),
                                                            masked: clientId_1
                                                                ? clientId_1.length > 8
                                                                    ? "".concat(clientId_1.slice(0, 4), "...").concat(clientId_1.slice(-4))
                                                                    : 'defined'
                                                                : 'MISSING',
                                                        },
                                                        redirectUri: redirectUri_1,
                                                        errorCodeKeys: errorCodeKeys,
                                                        apiVersion: apiVersion,
                                                    });
                                                    warningsForPayload = __spreadArray([], warnings_1, true);
                                                    humanHint = void 0;
                                                    if (apiStatus === 'INVALID_ARGUMENT') {
                                                        humanHint = 'INVALID_ARGUMENT reçu. Vérifiez GOOGLE_ADS_DEVELOPER_TOKEN (sans guillemets/espaces), l’approbation API et redémarrez l’API après modification du .env.';
                                                        if (devTokenSan_1.sanitized || devTokenSan_1.looksQuoted) {
                                                            humanHint += ' Le token a été nettoyé automatiquement côté serveur (indice: guillemets/espaces détectés).';
                                                        }
                                                        if (!loginHeaderSent && loginCustomerCandidates_1.length === 0) {
                                                            warningsForPayload.push('INVALID_ARGUMENT sans login-customer-id et aucun identifiant de repli disponible. Définissez GOOGLE_ADS_MANAGER_CUSTOMER_ID ou sélectionnez un compte Google Ads.');
                                                        }
                                                    }
                                                    payload = {
                                                        success: true,
                                                        platform: platform_2,
                                                        integration: integration_1,
                                                        accounts: [],
                                                        warnings: warningsForPayload,
                                                        apiError: data,
                                                        apiErrorSummary: apiErrorSummary,
                                                        apiStatus: apiStatus,
                                                        disabledReason: 'ads_api_error',
                                                        diagnostics: {
                                                            apiVersion: apiVersion,
                                                            devTokenFingerprint: fingerprintSecret(devToken_1),
                                                            devTokenLength: devToken_1 ? devToken_1.length : 0,
                                                            clientIdMasked: (idSan_1.value ? (idSan_1.value.length > 8 ? idSan_1.value.slice(0, 4) + '...' + idSan_1.value.slice(-4) : 'defined') : 'MISSING'),
                                                            redirectUri: redirectUri_1,
                                                            loginCustomerIdSelected: loginCustomerIdSelected_1,
                                                            loginCustomerIdSelectedFormatted: loginCustomerIdSelectedFormatted_1,
                                                            loginCustomerHeaderSent: loginHeaderSent,
                                                            loginCustomerAttempted: sanitizedLoginHeader !== null && sanitizedLoginHeader !== void 0 ? sanitizedLoginHeader : null,
                                                            loginCustomerAttemptFormatted: sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : null,
                                                            loginCustomerAttemptRaw: rawLoginHeader !== null && rawLoginHeader !== void 0 ? rawLoginHeader : null,
                                                            loginCustomerHeaderValue: loginHeaderValue !== null && loginHeaderValue !== void 0 ? loginHeaderValue : null,
                                                            loginCustomerHeaderFormatUsed: loginHeaderSent ? headerFormat : 'none',
                                                            loginHeaderSource: sanitizedLoginHeader
                                                                ? sanitizedLoginHeader === loginCustomerIdSelected_1
                                                                    ? 'selected_account'
                                                                    : envLoginCandidates_1.includes(sanitizedLoginHeader)
                                                                        ? 'environment'
                                                                        : 'manual'
                                                                : null,
                                                            availableLoginCustomerCandidates: loginCustomerCandidates_1,
                                                            primaryErrorCode: errorCodeKeys[0] || null,
                                                            errorCodeKeys: errorCodeKeys,
                                                            humanHint: humanHint,
                                                            forcedLoginHeader: forcedLoginFromCache_1,
                                                            fallbackTriggered: false
                                                        },
                                                        cached: false,
                                                        cacheTtlMs: cacheTtlErrorMs,
                                                        connectionState: 'error'
                                                    };
                                                    cacheSet(cacheKeyErr, payload, cacheTtlErrorMs);
                                                    return [2 /*return*/, { type: 'error', payload: payload, apiStatus: apiStatus, loginCustomerId: sanitizedLoginHeader !== null && sanitizedLoginHeader !== void 0 ? sanitizedLoginHeader : loginCustomerId, headerFormatUsed: loginHeaderSent ? headerFormat : 'none', fromCache: false, cacheKeyBase: cacheKeyBase, cacheKeyUsed: cacheKeyErr, apiVersion: apiVersion }];
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    });
                                };
                                applyFormattedFallback = function (current, loginCustomerId, context) { return __awaiter(void 0, void 0, void 0, function () {
                                    var formattedAttempt, warningNoteSuccess, warningNoteFailure, diagAugmentation;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!loginCustomerId)
                                                    return [2 /*return*/, current];
                                                if (current.type === 'success')
                                                    return [2 /*return*/, current];
                                                if (current.apiStatus !== 'INVALID_ARGUMENT')
                                                    return [2 /*return*/, current];
                                                if (current.headerFormatUsed === 'formatted')
                                                    return [2 /*return*/, current];
                                                return [4 /*yield*/, attemptList(loginCustomerId, false, { headerFormat: 'formatted' })];
                                            case 1:
                                                formattedAttempt = _a.sent();
                                                warningNoteSuccess = 'La requête Google Ads a abouti après réémission du login-customer-id au format 123-456-7890.';
                                                warningNoteFailure = "Tentative suppl\u00E9mentaire avec login-customer-id format\u00E9 (tirets) \u00E9galement en \u00E9chec (".concat(formattedAttempt.apiStatus, ").");
                                                diagAugmentation = {
                                                    formatFallbackTriggered: true,
                                                    formatFallbackContext: context,
                                                };
                                                if (formattedAttempt.type === 'success') {
                                                    formattedAttempt.payload.warnings = __spreadArray(__spreadArray([], formattedAttempt.payload.warnings, true), [warningNoteSuccess], false);
                                                    formattedAttempt.payload.diagnostics = __assign(__assign({}, formattedAttempt.payload.diagnostics), diagAugmentation);
                                                }
                                                else {
                                                    formattedAttempt.payload.warnings = __spreadArray(__spreadArray([], formattedAttempt.payload.warnings, true), [warningNoteFailure], false);
                                                    formattedAttempt.payload.diagnostics = __assign(__assign({}, formattedAttempt.payload.diagnostics), diagAugmentation);
                                                }
                                                return [2 /*return*/, formattedAttempt];
                                        }
                                    });
                                }); };
                                return [4 /*yield*/, attemptList(primaryLoginCustomerId_1, true)];
                            case 1:
                                initialAttempt = _b.sent();
                                return [4 /*yield*/, applyFormattedFallback(initialAttempt, primaryLoginCustomerId_1, 'initial')];
                            case 2:
                                initialAttempt = _b.sent();
                                if (!(initialAttempt.type === 'success')) return [3 /*break*/, 6];
                                if (!!initialAttempt.fromCache) return [3 /*break*/, 4];
                                return [4 /*yield*/, markIntegrationStatus_1('connected')];
                            case 3:
                                _b.sent();
                                initialAttempt.payload.integration = integration_1;
                                cacheSet(initialAttempt.cacheKeyUsed, initialAttempt.payload, initialAttempt.payload.cacheTtlMs);
                                return [3 /*break*/, 5];
                            case 4:
                                initialAttempt.payload.integration = integration_1;
                                _b.label = 5;
                            case 5:
                                initialAttempt.payload.diagnostics = __assign(__assign({}, initialAttempt.payload.diagnostics), { apiVersion: apiVersion });
                                return [2 /*return*/, initialAttempt];
                            case 6:
                                shouldRetryWithLoginHeader = initialAttempt.apiStatus === 'INVALID_ARGUMENT'
                                    && !primaryLoginCustomerId_1
                                    && loginCustomerCandidates_1.length > 0;
                                if (!shouldRetryWithLoginHeader) return [3 /*break*/, 12];
                                fallbackLoginCustomerId = loginCustomerCandidates_1[0];
                                fallbackLabel = (_a = formatGoogleAdsCustomerId(fallbackLoginCustomerId)) !== null && _a !== void 0 ? _a : fallbackLoginCustomerId;
                                cacheSet(loginRequirementKey_1, true, 10 * 60 * 1000); // 10 minutes
                                return [4 /*yield*/, attemptList(fallbackLoginCustomerId, false)];
                            case 7:
                                fallbackAttempt = _b.sent();
                                return [4 /*yield*/, applyFormattedFallback(fallbackAttempt, fallbackLoginCustomerId, 'secondary')];
                            case 8:
                                fallbackAttempt = _b.sent();
                                if (!(fallbackAttempt.type === 'success')) return [3 /*break*/, 10];
                                fallbackAttempt.payload.warnings = __spreadArray(__spreadArray([], fallbackAttempt.payload.warnings, true), [
                                    "La requ\u00EAte initiale sans login-customer-id a retourn\u00E9 INVALID_ARGUMENT. Relance r\u00E9ussie avec l'identifiant ".concat(fallbackLabel, ".")
                                ], false);
                                fallbackAttempt.payload.diagnostics = __assign(__assign({}, fallbackAttempt.payload.diagnostics), { fallbackTriggered: true, fallbackLoginCustomerId: fallbackLoginCustomerId, fallbackLoginCustomerFormatted: fallbackLabel, fallbackReason: 'INVALID_ARGUMENT_without_login_header', apiVersion: apiVersion });
                                return [4 /*yield*/, markIntegrationStatus_1('connected')];
                            case 9:
                                _b.sent();
                                fallbackAttempt.payload.integration = integration_1;
                                cacheSet(fallbackAttempt.cacheKeyUsed, fallbackAttempt.payload, fallbackAttempt.payload.cacheTtlMs);
                                return [2 /*return*/, fallbackAttempt];
                            case 10:
                                fallbackAttempt.payload.warnings = __spreadArray(__spreadArray([], fallbackAttempt.payload.warnings, true), [
                                    "La requ\u00EAte initiale sans login-customer-id a retourn\u00E9 INVALID_ARGUMENT. La relance avec ".concat(fallbackLabel, " a \u00E9galement \u00E9chou\u00E9 (").concat(fallbackAttempt.apiStatus, ").")
                                ], false);
                                fallbackAttempt.payload.diagnostics = __assign(__assign({}, fallbackAttempt.payload.diagnostics), { fallbackTriggered: true, fallbackLoginCustomerId: fallbackLoginCustomerId, fallbackLoginCustomerFormatted: fallbackLabel, fallbackReason: 'INVALID_ARGUMENT_without_login_header', apiVersion: apiVersion });
                                fallbackErrorSummary = fallbackAttempt.payload.apiErrorSummary || fallbackAttempt.apiStatus;
                                return [4 /*yield*/, markIntegrationStatus_1('error', fallbackErrorSummary)];
                            case 11:
                                _b.sent();
                                fallbackAttempt.payload.integration = integration_1;
                                cacheSet(fallbackAttempt.cacheKeyUsed, fallbackAttempt.payload, fallbackAttempt.payload.cacheTtlMs);
                                return [2 /*return*/, fallbackAttempt];
                            case 12:
                                initialErrorSummary = initialAttempt.payload.apiErrorSummary || initialAttempt.apiStatus;
                                if (!!initialAttempt.fromCache) return [3 /*break*/, 14];
                                return [4 /*yield*/, markIntegrationStatus_1('error', initialErrorSummary)];
                            case 13:
                                _b.sent();
                                initialAttempt.payload.integration = integration_1;
                                cacheSet(initialAttempt.cacheKeyUsed, initialAttempt.payload, initialAttempt.payload.cacheTtlMs);
                                return [3 /*break*/, 15];
                            case 14:
                                initialAttempt.payload.integration = integration_1;
                                _b.label = 15;
                            case 15:
                                initialAttempt.payload.diagnostics = __assign(__assign({}, initialAttempt.payload.diagnostics), { apiVersion: apiVersion });
                                return [2 /*return*/, initialAttempt];
                        }
                    });
                }); };
                finalResult = void 0;
                _i = 0, candidateApiVersions_1 = candidateApiVersions;
                _k.label = 7;
            case 7:
                if (!(_i < candidateApiVersions_1.length)) return [3 /*break*/, 10];
                apiVersion = candidateApiVersions_1[_i];
                return [4 /*yield*/, runWithApiVersion(apiVersion)];
            case 8:
                result = _k.sent();
                if (result.type === 'success') {
                    finalResult = result;
                    return [3 /*break*/, 10];
                }
                primaryError = (_d = (_c = result.payload) === null || _c === void 0 ? void 0 : _c.diagnostics) === null || _d === void 0 ? void 0 : _d.primaryErrorCode;
                if (result.apiStatus === 'INVALID_ARGUMENT' && primaryError === 'requestError:UNSUPPORTED_VERSION') {
                    unsupportedVersions.push(apiVersion);
                    return [3 /*break*/, 9];
                }
                finalResult = result;
                return [3 /*break*/, 10];
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10:
                if (!!finalResult) return [3 /*break*/, 12];
                return [4 /*yield*/, runWithApiVersion(candidateApiVersions[candidateApiVersions.length - 1] || 'v18')];
            case 11:
                // fallback: renvoyer dernière tentative avec version par défaut
                finalResult = _k.sent();
                _k.label = 12;
            case 12:
                if (unsupportedVersions.length) {
                    diag = ((_f = (_e = finalResult.payload) === null || _e === void 0 ? void 0 : _e.diagnostics) !== null && _f !== void 0 ? _f : {});
                    finalResult.payload.diagnostics = __assign(__assign({}, diag), { unsupportedApiVersions: unsupportedVersions });
                    finalResult.payload.warnings = __spreadArray(__spreadArray([], (finalResult.payload.warnings || []), true), [
                        "Versions Google Ads non support\u00E9es d\u00E9tect\u00E9es: ".concat(unsupportedVersions.join(', '))
                    ], false);
                }
                console.log('[Google Ads] Résultat listAccessibleCustomers', {
                    organizationId: organizationId_2,
                    type: finalResult.type,
                    apiVersion: finalResult.apiVersion,
                    unsupportedVersions: unsupportedVersions,
                    fromCache: finalResult.fromCache,
                });
                if (!(finalResult.type === 'success')) return [3 /*break*/, 16];
                if (!!finalResult.fromCache) return [3 /*break*/, 14];
                return [4 /*yield*/, markIntegrationStatus_1('connected')];
            case 13:
                _k.sent();
                finalResult.payload.integration = integration_1;
                cacheSet(finalResult.cacheKeyUsed, finalResult.payload, finalResult.payload.cacheTtlMs);
                return [3 /*break*/, 15];
            case 14:
                finalResult.payload.integration = integration_1;
                _k.label = 15;
            case 15: return [2 /*return*/, res.json(finalResult.payload)];
            case 16:
                finalErrorSummary = finalResult.payload.apiErrorSummary || finalResult.apiStatus;
                if (!!finalResult.fromCache) return [3 /*break*/, 18];
                return [4 /*yield*/, markIntegrationStatus_1('error', finalErrorSummary)];
            case 17:
                _k.sent();
                finalResult.payload.integration = integration_1;
                cacheSet(finalResult.cacheKeyUsed, finalResult.payload, finalResult.payload.cacheTtlMs);
                return [3 /*break*/, 19];
            case 18:
                finalResult.payload.integration = integration_1;
                _k.label = 19;
            case 19: return [2 /*return*/, res.json(finalResult.payload)];
            case 20:
                if (!(platform_2 === 'meta_ads')) return [3 /*break*/, 26];
                appIdSan = sanitizeClientValue(process.env.META_APP_ID || '');
                appSecretSan = sanitizeClientValue(process.env.META_APP_SECRET || '');
                warnings = [];
                if (!appIdSan.value)
                    warnings.push('META_APP_ID manquant — authentification Meta impossible');
                if (!appSecretSan.value)
                    warnings.push('META_APP_SECRET manquant — échanges de tokens impossibles');
                if (appIdSan.sanitized || appIdSan.looksQuoted)
                    warnings.push('META_APP_ID semblait contenir des guillemets/espaces — valeur nettoyée');
                if (appSecretSan.sanitized || appSecretSan.looksQuoted)
                    warnings.push('META_APP_SECRET semblait contenir des guillemets/espaces — valeur nettoyée');
                rawCreds = integration_1.credentials;
                rawAccessToken = rawCreds && typeof rawCreds === 'object' ? rawCreds.accessToken : undefined;
                trimmedAccessToken = typeof rawAccessToken === 'string' ? rawAccessToken.trim() : undefined;
                accessToken_2 = trimmedAccessToken;
                cloneIntegrationCredentials_2 = function () {
                    var raw = integration_1 === null || integration_1 === void 0 ? void 0 : integration_1.credentials;
                    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                        return raw && typeof raw === 'object' ? __assign({}, raw) : null;
                    }
                    return __assign({}, raw);
                };
                credentialsForSuccess_2 = function () {
                    var clone = cloneIntegrationCredentials_2();
                    if (!clone)
                        return undefined;
                    var mutated = false;
                    if (accessToken_2 && clone.accessToken !== accessToken_2) {
                        clone.accessToken = accessToken_2;
                        mutated = true;
                    }
                    if (Object.prototype.hasOwnProperty.call(clone, 'userError')) {
                        delete clone.userError;
                        mutated = true;
                    }
                    if (Object.prototype.hasOwnProperty.call(clone, 'error')) {
                        delete clone.error;
                        mutated = true;
                    }
                    return mutated ? clone : undefined;
                };
                credentialsForError_2 = function (userError, errorCode) {
                    var _a;
                    var clone = ((_a = cloneIntegrationCredentials_2()) !== null && _a !== void 0 ? _a : {});
                    var mutated = false;
                    if (userError && clone.userError !== userError) {
                        clone.userError = userError;
                        mutated = true;
                    }
                    if (errorCode && clone.error !== errorCode) {
                        clone.error = errorCode;
                        mutated = true;
                    }
                    return mutated ? clone : undefined;
                };
                markIntegrationStatus = function (status, userError, errorCode) { return __awaiter(void 0, void 0, void 0, function () {
                    var data, sanitized, credsWithError, updated;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!integration_1)
                                    return [2 /*return*/];
                                data = {
                                    status: status,
                                    updatedAt: new Date()
                                };
                                if (status === 'connected') {
                                    data.lastSync = new Date();
                                    sanitized = credentialsForSuccess_2();
                                    if (sanitized)
                                        data.credentials = sanitized;
                                }
                                else if (status === 'error') {
                                    credsWithError = credentialsForError_2(userError, errorCode);
                                    if (credsWithError)
                                        data.credentials = credsWithError;
                                }
                                return [4 /*yield*/, prisma.adPlatformIntegration.update({
                                        where: { id: integration_1.id },
                                        data: data
                                    })];
                            case 1:
                                updated = _a.sent();
                                integration_1 = updated;
                                return [2 /*return*/];
                        }
                    });
                }); };
                if (!accessToken_2) {
                    return [2 /*return*/, res.json({
                            success: true,
                            platform: platform_2,
                            integration: integration_1,
                            accounts: [],
                            warnings: warnings,
                            disabledReason: 'missing_access_token',
                            message: 'Access token Meta Ads indisponible',
                            connectionState: 'disconnected'
                        })];
                }
                cacheKeyBase = "meta.accounts:".concat(organizationId_2, ":").concat(fingerprintSecret(accessToken_2) || 'anon');
                cacheKeyOk = "".concat(cacheKeyBase, ":ok");
                cacheKeyError = "".concat(cacheKeyBase, ":error");
                cacheTtlSuccessMs = 30000;
                cacheTtlErrorMs = 20000;
                cachedOk = cacheGet(cacheKeyOk);
                if (cachedOk) {
                    diagnostics = (cachedOk === null || cachedOk === void 0 ? void 0 : cachedOk.diagnostics) && typeof cachedOk.diagnostics === 'object' && !Array.isArray(cachedOk.diagnostics)
                        ? __assign(__assign({}, cachedOk.diagnostics), { cached: true }) : { cached: true };
                    return [2 /*return*/, res.json(__assign(__assign({}, cachedOk), { diagnostics: diagnostics }))];
                }
                cachedErr = cacheGet(cacheKeyError);
                if (cachedErr) {
                    diagnostics = (cachedErr === null || cachedErr === void 0 ? void 0 : cachedErr.diagnostics) && typeof cachedErr.diagnostics === 'object' && !Array.isArray(cachedErr.diagnostics)
                        ? __assign(__assign({}, cachedErr.diagnostics), { cached: true }) : { cached: true };
                    return [2 /*return*/, res.json(__assign(__assign({}, cachedErr), { diagnostics: diagnostics }))];
                }
                _k.label = 21;
            case 21:
                _k.trys.push([21, 24, , 26]);
                return [4 /*yield*/, axios_1.default.get('https://graph.facebook.com/v18.0/me/adaccounts', {
                        params: {
                            fields: 'id,account_id,name,account_status,currency,timezone_id,business_name',
                            access_token: accessToken_2
                        }
                    })];
            case 22:
                accountsResp = _k.sent();
                rawAccounts = Array.isArray((_g = accountsResp.data) === null || _g === void 0 ? void 0 : _g.data)
                    ? accountsResp.data.data
                    : [];
                accounts = rawAccounts.map(function (acc) {
                    var _a;
                    var accountId = typeof acc.account_id === 'string' ? acc.account_id : undefined;
                    var actId = typeof acc.id === 'string' ? acc.id : accountId;
                    return {
                        id: actId || accountId || 'unknown',
                        accountId: accountId || null,
                        name: typeof acc.name === 'string' ? acc.name : 'Compte Meta',
                        status: typeof acc.account_status === 'number' ? acc.account_status : (_a = acc.account_status) !== null && _a !== void 0 ? _a : null,
                        currency: typeof acc.currency === 'string' ? acc.currency : null,
                        timezoneId: typeof acc.timezone_id === 'string' ? acc.timezone_id : null,
                        businessName: typeof acc.business_name === 'string' ? acc.business_name : null
                    };
                });
                return [4 /*yield*/, markIntegrationStatus('connected')];
            case 23:
                _k.sent();
                payload = {
                    success: true,
                    platform: platform_2,
                    integration: integration_1,
                    accounts: accounts,
                    warnings: warnings,
                    diagnostics: {
                        tokenFingerprint: fingerprintSecret(accessToken_2),
                        accountCount: accounts.length,
                        cached: false
                    },
                    connectionState: 'connected'
                };
                cacheSet(cacheKeyOk, payload, cacheTtlSuccessMs);
                return [2 /*return*/, res.json(payload)];
            case 24:
                error_6 = _k.sent();
                ax = error_6;
                fbError = (_j = (_h = ax === null || ax === void 0 ? void 0 : ax.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.error;
                fbType = (fbError === null || fbError === void 0 ? void 0 : fbError.type) || 'MetaApiError';
                fbMessage = (fbError === null || fbError === void 0 ? void 0 : fbError.message) || 'Erreur Meta Ads API';
                fbCode = typeof (fbError === null || fbError === void 0 ? void 0 : fbError.code) === 'number' ? fbError === null || fbError === void 0 ? void 0 : fbError.code : null;
                fbSubcode = typeof (fbError === null || fbError === void 0 ? void 0 : fbError.error_subcode) === 'number' ? fbError === null || fbError === void 0 ? void 0 : fbError.error_subcode : null;
                fbTraceId = (fbError === null || fbError === void 0 ? void 0 : fbError.fbtrace_id) || null;
                userFriendly = fbMessage;
                if (fbCode === 190) {
                    userFriendly = 'Session Meta expirée — reconnectez-vous à Meta Ads.';
                }
                else if (fbCode === 102) {
                    userFriendly = 'Jeton Meta invalide — relancez l’authentification.';
                }
                return [4 /*yield*/, markIntegrationStatus('error', userFriendly, fbType)];
            case 25:
                _k.sent();
                payload = {
                    success: true,
                    platform: platform_2,
                    integration: integration_1,
                    accounts: [],
                    warnings: warnings,
                    apiError: fbError,
                    apiErrorSummary: "".concat(fbType).concat(fbCode ? " (".concat(fbCode).concat(fbSubcode ? "/".concat(fbSubcode) : '', ")") : '', ": ").concat(fbMessage),
                    disabledReason: 'ads_api_error',
                    connectionState: 'error',
                    diagnostics: {
                        tokenFingerprint: fingerprintSecret(accessToken_2),
                        appIdPresent: !!appIdSan.value,
                        errorCode: fbCode,
                        errorSubcode: fbSubcode,
                        errorType: fbType,
                        fbTraceId: fbTraceId,
                        cached: false
                    }
                };
                cacheSet(cacheKeyError, payload, cacheTtlErrorMs);
                return [2 /*return*/, res.json(payload)];
            case 26: 
            // Par défaut pour autres plateformes (placeholder)
            return [2 /*return*/, res.json({ success: true, platform: platform_2, integration: integration_1, accounts: [], note: 'Intégration configurée', connectionState: 'unknown' })];
            case 27:
                error_7 = _k.sent();
                console.error('Erreur listing comptes:', error_7);
                res.status(500).json({ success: false, message: 'Erreur listing comptes' });
                return [3 /*break*/, 28];
            case 28: return [2 /*return*/];
        }
    });
}); });
/**
 * Endpoint de test ciblé Google Ads: GET customer
 * Objectif: diagnostiquer les erreurs INVALID_ARGUMENT en testant un customerId précis
 * GET /api/integrations/advertising/google_ads/test/customers-get?customerId=XXX&withLoginHeader=true&apiVersion=v18
 */
router.get('/advertising/google_ads/test/customers-get', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, integ, devTokenSan, devToken, idSan, secretSan, clientId, clientSecret, redirectUri, qCustomerId, normalizedCustomerId, apiVersion, withLoginHeader, sendLoginHeader, warnings, creds, tokensRaw, storedTokens, accessToken, refreshToken, oauth2, tk, _a, url, headers, loginHeaderSent, resp, error_9, ax, data, apiError, apiMsg, apiStatus, detailMsgs, errorCodeKeys, detailsArr, _i, detailsArr_2, d, dA, dB, errorsContainer, _b, errorsContainer_2, e, ec, _c, _d, k, val, apiErrorSummary, error_10;
    var _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 11, , 12]);
                organizationId = getEffectiveOrgId(req);
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organisation requise' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId, platform: 'google_ads' } })];
            case 1:
                integ = _h.sent();
                if (!integ)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Intégration Google Ads manquante' })];
                devTokenSan = sanitizeClientValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '');
                devToken = devTokenSan.value || '';
                idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID || '');
                secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
                clientId = idSan.value || '';
                clientSecret = secretSan.value || '';
                redirectUri = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI).uri;
                qCustomerId = String(req.query.customerId || '').trim();
                normalizedCustomerId = qCustomerId.replace(/[^0-9]/g, '');
                apiVersion = String(req.query.apiVersion || process.env.GOOGLE_ADS_API_VERSION || 'v18').trim();
                withLoginHeader = String(req.query.withLoginHeader || '').toLowerCase();
                sendLoginHeader = withLoginHeader === '1' || withLoginHeader === 'true' || withLoginHeader === 'yes';
                warnings = [];
                if (!normalizedCustomerId || normalizedCustomerId.length < 8)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètre customerId invalide' })];
                if (!devToken)
                    warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN manquant — requêtes Google Ads refusées');
                if (devTokenSan.sanitized || devTokenSan.looksQuoted)
                    warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN semblait contenir des guillemets/espaces — valeur nettoyée');
                if (!clientId || !clientSecret)
                    warnings.push('Client OAuth Google Ads incomplet — rafraîchissement du token impossible');
                creds = integ.credentials;
                tokensRaw = creds && typeof creds === 'object' && 'tokens' in creds
                    ? creds['tokens']
                    : undefined;
                storedTokens = (tokensRaw && typeof tokensRaw === 'object')
                    ? tokensRaw
                    : {};
                accessToken = storedTokens.access_token;
                refreshToken = storedTokens.refresh_token;
                _h.label = 2;
            case 2:
                _h.trys.push([2, 5, , 6]);
                if (!((!accessToken || storedTokens.expiry_date) && clientId && clientSecret && (refreshToken || storedTokens.expiry_date))) return [3 /*break*/, 4];
                oauth2 = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
                oauth2.setCredentials({
                    access_token: storedTokens.access_token,
                    refresh_token: storedTokens.refresh_token,
                    expiry_date: storedTokens.expiry_date,
                    token_type: storedTokens.token_type,
                    scope: storedTokens.scope,
                });
                return [4 /*yield*/, oauth2.getAccessToken()];
            case 3:
                tk = _h.sent();
                accessToken = (tk === null || tk === void 0 ? void 0 : tk.token) || oauth2.credentials.access_token || accessToken;
                _h.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                _a = _h.sent();
                warnings.push('Échec du rafraîchissement de l’access token — tentative avec le token stocké');
                return [3 /*break*/, 6];
            case 6:
                if (!accessToken) {
                    return [2 /*return*/, res.json({ success: true, test: 'customers.get', customerId: normalizedCustomerId, warnings: warnings, disabledReason: 'missing_access_token' })];
                }
                if (!devToken) {
                    return [2 /*return*/, res.json({ success: true, test: 'customers.get', customerId: normalizedCustomerId, warnings: warnings, disabledReason: 'missing_developer_token' })];
                }
                url = "https://googleads.googleapis.com/".concat(apiVersion, "/customers/").concat(normalizedCustomerId);
                headers = {
                    Authorization: "Bearer ".concat(accessToken),
                    'developer-token': devToken,
                    Accept: 'application/json'
                };
                loginHeaderSent = !!(sendLoginHeader && normalizedCustomerId);
                if (loginHeaderSent)
                    headers['login-customer-id'] = normalizedCustomerId;
                _h.label = 7;
            case 7:
                _h.trys.push([7, 9, , 10]);
                return [4 /*yield*/, axios_1.default.get(url, { headers: headers })];
            case 8:
                resp = _h.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        test: 'customers.get',
                        customerId: normalizedCustomerId,
                        apiVersion: apiVersion,
                        loginCustomerHeaderSent: loginHeaderSent,
                        warnings: warnings,
                        data: resp.data
                    })];
            case 9:
                error_9 = _h.sent();
                ax = error_9;
                data = (_e = ax === null || ax === void 0 ? void 0 : ax.response) === null || _e === void 0 ? void 0 : _e.data;
                apiError = data === null || data === void 0 ? void 0 : data.error;
                apiMsg = (apiError === null || apiError === void 0 ? void 0 : apiError.message) || 'Erreur Google Ads API';
                apiStatus = (apiError === null || apiError === void 0 ? void 0 : apiError.status) || 'UNKNOWN';
                detailMsgs = [];
                errorCodeKeys = [];
                try {
                    detailsArr = Array.isArray(apiError === null || apiError === void 0 ? void 0 : apiError.details) ? apiError.details : [];
                    for (_i = 0, detailsArr_2 = detailsArr; _i < detailsArr_2.length; _i++) {
                        d = detailsArr_2[_i];
                        dA = d;
                        dB = d;
                        errorsContainer = Array.isArray(dA === null || dA === void 0 ? void 0 : dA.errors)
                            ? dA.errors
                            : Array.isArray((_f = dB === null || dB === void 0 ? void 0 : dB.data) === null || _f === void 0 ? void 0 : _f.errors)
                                ? (_g = dB.data) === null || _g === void 0 ? void 0 : _g.errors
                                : [];
                        for (_b = 0, errorsContainer_2 = errorsContainer; _b < errorsContainer_2.length; _b++) {
                            e = errorsContainer_2[_b];
                            if (e === null || e === void 0 ? void 0 : e.message)
                                detailMsgs.push(String(e.message));
                            ec = e === null || e === void 0 ? void 0 : e.errorCode;
                            if (ec && typeof ec === 'object') {
                                for (_c = 0, _d = Object.keys(ec); _c < _d.length; _c++) {
                                    k = _d[_c];
                                    val = ec[k];
                                    if (val)
                                        errorCodeKeys.push("".concat(k, ":").concat(String(val)));
                                }
                            }
                        }
                    }
                }
                catch ( /* ignore */_j) { /* ignore */ }
                apiErrorSummary = "".concat(apiStatus, ": ").concat(apiMsg).concat(detailMsgs.length ? ' — ' + detailMsgs[0] : '');
                return [2 /*return*/, res.json({
                        success: true,
                        test: 'customers.get',
                        customerId: normalizedCustomerId,
                        apiVersion: apiVersion,
                        loginCustomerHeaderSent: loginHeaderSent,
                        warnings: warnings,
                        apiError: data,
                        apiErrorSummary: apiErrorSummary,
                        diagnostics: {
                            devTokenFingerprint: fingerprintSecret(devToken),
                            devTokenLength: devToken ? devToken.length : 0,
                            clientIdMasked: (idSan.value ? (idSan.value.length > 8 ? idSan.value.slice(0, 4) + '...' + idSan.value.slice(-4) : 'defined') : 'MISSING'),
                            redirectUri: redirectUri,
                            primaryErrorCode: errorCodeKeys[0] || null,
                            errorCodeKeys: errorCodeKeys
                        }
                    })];
            case 10: return [3 /*break*/, 12];
            case 11:
                error_10 = _h.sent();
                console.error('Erreur test customers.get:', error_10);
                res.status(500).json({ success: false, message: 'Erreur test customers.get' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
/**
 * Supprimer une intégration publicitaire
 * DELETE /api/integrations/advertising/:platform
 */
router.delete('/advertising/:platform', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, platform, deleted, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                user = req.user;
                organizationId = getEffectiveOrgId(req);
                platform = req.params.platform;
                if (!user) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return [2 /*return*/];
                }
                if (!organizationId) {
                    res.status(400).json({ success: false, message: 'Organization context is missing.' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.adPlatformIntegration.deleteMany({
                        where: {
                            organizationId: organizationId,
                            platform: platform
                        }
                    })];
            case 2:
                deleted = _a.sent();
                if (deleted.count === 0) {
                    res.status(404).json({ success: false, message: 'Integration not found' });
                    return [2 /*return*/];
                }
                res.status(200).json({ success: true, message: "Int\u00E9gration ".concat(platform, " supprim\u00E9e avec succ\u00E8s") });
                return [3 /*break*/, 4];
            case 3:
                error_11 = _a.sent();
                console.error('Failed to delete platform integration:', error_11);
                res.status(500).json({ success: false, message: 'Failed to delete integration' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Sélectionner un compte pour une intégration publicitaire
 * POST /api/integrations/advertising/:platform/select-account
 * body: { account: { id: string; name?: string; currency?: string } }
 */
router.post('/advertising/:platform/select-account', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var platform, organizationId, account, integ, currentConfig, newConfig, newName, genericNames, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                platform = req.params.platform;
                organizationId = getEffectiveOrgId(req);
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organisation requise' })];
                account = req.body.account;
                if (!account || !account.id) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Compte invalide' })];
                }
                return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId, platform: platform } })];
            case 1:
                integ = _a.sent();
                if (!integ)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Intégration non trouvée' })];
                currentConfig = integ.config;
                newConfig = __assign(__assign({}, (currentConfig || {})), { selectedAccount: { id: account.id, name: account.name, currency: account.currency } });
                newName = integ.name;
                genericNames = new Set(['google_ads', 'meta_ads', 'Google Ads OAuth', 'Meta Ads OAuth']);
                if (!newName || genericNames.has(newName)) {
                    newName = "".concat(platform, " - ").concat(account.name || account.id);
                }
                return [4 /*yield*/, prisma.adPlatformIntegration.update({
                        where: { id: integ.id },
                        data: { config: newConfig, name: newName, updatedAt: new Date() }
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/, res.json({ success: true, platform: platform, selectedAccount: { id: account.id, name: account.name, currency: account.currency } })];
            case 3:
                error_12 = _a.sent();
                console.error('Erreur select account:', error_12);
                res.status(500).json({ success: false, message: 'Erreur sélection compte' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/integrations/advertising
 * Crée une nouvelle intégration publicitaire
 */
router.post('/advertising', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, platform, name_1, config, credentials, integration, error_13;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = getEffectiveOrgId(req);
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation requise' })];
                }
                _a = req.body, platform = _a.platform, name_1 = _a.name, config = _a.config, credentials = _a.credentials;
                if (!platform || !name_1 || !config || !credentials) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Plateforme, nom, configuration et identifiants requis'
                        })];
                }
                if (!adPlatformService_1.AD_PLATFORMS[platform]) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Plateforme publicitaire non supportée'
                        })];
                }
                return [4 /*yield*/, adPlatformService_1.AdPlatformService.createIntegration(organizationId, platform, name_1, config, credentials)];
            case 1:
                integration = _b.sent();
                res.status(201).json({
                    success: true,
                    integration: integration
                });
                return [3 /*break*/, 3];
            case 2:
                error_13 = _b.sent();
                console.error('Erreur création intégration publicitaire:', error_13);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/integrations/ecommerce/platforms
 * Récupère la liste des plateformes e-commerce disponibles
 */
router.get('/ecommerce/platforms', function (req, res) {
    res.json({
        success: true,
        platforms: Object.values(ecommerceService_1.ECOMMERCE_PLATFORMS)
    });
});
/**
 * GET /api/integrations/ecommerce
 * Récupère toutes les intégrations e-commerce de l'organisation
 */
router.get('/ecommerce', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, integrations, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = getEffectiveOrgId(req);
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation requise' })];
                }
                return [4 /*yield*/, ecommerceService_1.EcommerceService.getIntegrations(organizationId)];
            case 1:
                integrations = _a.sent();
                res.json({
                    success: true,
                    integrations: integrations
                });
                return [3 /*break*/, 3];
            case 2:
                error_14 = _a.sent();
                console.error('Erreur récupération intégrations e-commerce:', error_14);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/integrations/ecommerce
 * Crée une nouvelle intégration e-commerce
 */
router.post('/ecommerce', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, platform, name_2, url, config, credentials, integration, error_15;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = getEffectiveOrgId(req);
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation requise' })];
                }
                _a = req.body, platform = _a.platform, name_2 = _a.name, url = _a.url, config = _a.config, credentials = _a.credentials;
                if (!platform || !name_2 || !url || !config || !credentials) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Plateforme, nom, URL, configuration et identifiants requis'
                        })];
                }
                if (!ecommerceService_1.ECOMMERCE_PLATFORMS[platform]) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Plateforme e-commerce non supportée'
                        })];
                }
                return [4 /*yield*/, ecommerceService_1.EcommerceService.createIntegration(organizationId, platform, name_2, url, config, credentials)];
            case 1:
                integration = _b.sent();
                res.status(201).json({
                    success: true,
                    integration: integration
                });
                return [3 /*break*/, 3];
            case 2:
                error_15 = _b.sent();
                console.error('Erreur création intégration e-commerce:', error_15);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
