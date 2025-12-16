"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleOAuthConfig = exports.GOOGLE_OAUTH_SCOPES = void 0;
exports.isGoogleOAuthConfigured = isGoogleOAuthConfigured;
exports.describeGoogleOAuthConfig = describeGoogleOAuthConfig;
exports.resetGoogleOAuthConfigCache = resetGoogleOAuthConfigCache;
var envCache = new Map();
var DEFAULT_PROD_API_BASE = 'https://api.2thier.com';
var DEFAULT_DEV_API_BASE = 'http://localhost:4000';
function readEnvFromImportMeta(key) {
    var _a;
    try {
        var meta = import.meta;
        var candidate = (_a = meta === null || meta === void 0 ? void 0 : meta.env) === null || _a === void 0 ? void 0 : _a[key];
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }
    catch (_b) {
        // ignore – import.meta non disponible dans le contexte
    }
    return undefined;
}
function readEnv(key) {
    var _a;
    if (envCache.has(key)) {
        return envCache.get(key);
    }
    var value;
    if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
        value = (_a = process.env[key]) === null || _a === void 0 ? void 0 : _a.trim();
    }
    if (!value) {
        value = readEnvFromImportMeta(key);
    }
    if (value) {
        envCache.set(key, value);
    }
    else {
        envCache.set(key, undefined);
    }
    return value;
}
function computeRedirectUri() {
    var explicit = readEnv('GOOGLE_REDIRECT_URI');
    if (explicit) {
        return explicit;
    }
    var base = readEnv('API_URL') ||
        readEnv('BACKEND_URL') ||
        readEnv('FRONTEND_URL');
    var fallbackBase = (readEnv('NODE_ENV') || '').toLowerCase() === 'production'
        ? DEFAULT_PROD_API_BASE
        : DEFAULT_DEV_API_BASE;
    var trimmedBase = (base || fallbackBase).replace(/\/$/, '');
    return "".concat(trimmedBase, "/api/google-auth/callback");
}
exports.GOOGLE_OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/meetings',
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/forms',
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/admin.directory.orgunit',
    'https://www.googleapis.com/auth/admin.directory.resource.calendar',
];
function buildOAuthOptions(clientId, clientSecret, redirectUri) {
    return {
        clientId: clientId || undefined,
        clientSecret: clientSecret || undefined,
        redirectUri: redirectUri,
    };
}
exports.googleOAuthConfig = (function () {
    var _a, _b;
    var clientId = (_a = readEnv('GOOGLE_CLIENT_ID')) !== null && _a !== void 0 ? _a : '';
    var clientSecret = (_b = readEnv('GOOGLE_CLIENT_SECRET')) !== null && _b !== void 0 ? _b : '';
    var redirectUri = computeRedirectUri();
    var projectId = readEnv('GOOGLE_PROJECT_ID') ||
        readEnv('GOOGLE_CLOUD_PROJECT') ||
        readEnv('GOOGLE_CLOUD_PROJECT_ID') ||
        readEnv('GOOGLE_PROJECT_NUMBER');
    return {
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUri,
        projectId: projectId,
        oauthOptions: buildOAuthOptions(clientId, clientSecret, redirectUri),
    };
})();
function isGoogleOAuthConfigured() {
    return Boolean(exports.googleOAuthConfig.clientId && exports.googleOAuthConfig.clientSecret);
}
function describeGoogleOAuthConfig() {
    return {
        clientId: exports.googleOAuthConfig.clientId ? '[set]' : '[missing]',
        clientSecret: exports.googleOAuthConfig.clientSecret ? '[set]' : '[missing]',
        redirectUri: exports.googleOAuthConfig.redirectUri,
        projectId: exports.googleOAuthConfig.projectId,
        scopes: exports.GOOGLE_OAUTH_SCOPES.length,
        isConfigured: isGoogleOAuthConfigured(),
    };
}
function resetGoogleOAuthConfigCache() {
    envCache.clear();
}
