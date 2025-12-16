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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
// Fabrique robuste de l'URL de base de données pour Prisma.
// Objectif: éviter un crash au démarrage si DATABASE_URL n'est pas défini sur Cloud Run
// en le reconstruisant à partir des variables PG* et/ou du socket Cloud SQL.
function buildDatabaseUrl() {
    var direct = process.env.DATABASE_URL;
    if (direct && direct.trim().length > 0) {
        return direct;
    }
    var user = process.env.PGUSER || 'postgres';
    var password = process.env.PGPASSWORD || '';
    var db = process.env.PGDATABASE || '2thier';
    // Instance Cloud SQL (ex: thiernew:europe-west1:crm-db)
    var instance = process.env.CLOUDSQL_INSTANCE || 'thiernew:europe-west1:crm-db';
    // Hôte: si PGHOST commence par /cloudsql, on l'utilise, sinon on utilise le socket de l'instance
    var pgHost = process.env.PGHOST;
    var socketHost = pgHost && pgHost.startsWith('/cloudsql/') ? pgHost : "/cloudsql/".concat(instance);
    var encodedPwd = encodeURIComponent(password);
    // Pour les sockets Unix, Prisma recommande host=/cloudsql/INSTANCE en paramètre de requête, host réseau = localhost
    var url = "postgresql://".concat(user, ":").concat(encodedPwd, "@localhost:5432/").concat(db, "?host=").concat(encodeURIComponent(socketHost));
    console.warn('[Prisma] DATABASE_URL non défini. URL reconstruite depuis PG* et Cloud SQL:', {
        PGUSER: user,
        PGDATABASE: db,
        PGHOST: pgHost,
        CLOUDSQL_INSTANCE: instance,
        effectiveHostParam: socketHost
    });
    return url;
}
// Ajout pour éviter les multiples instances en développement avec le rechargement à chaud de Vite
var globalForPrisma = global;
var prismaClient = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
    // 🚀 Configuration optimisée du connection pool
    datasources: {
        db: {
            url: buildDatabaseUrl(),
        },
    },
    // ⚡ Optimisations de performance
    // @ts-expect-error - Configuration avancée non typée
    __internal: {
        engine: {
            // Connection pool optimisé selon l'environnement
            connection_limit: process.env.NODE_ENV === 'production' ? 20 : 5,
            pool_timeout: 30, // secondes
            connect_timeout: 10, // secondes
        },
    },
});
exports.prisma = prismaClient;
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient;
}
// Tentative de connexion non bloquante pour diagnostiquer les problèmes de config en production
// (n'empêche pas le serveur de démarrer si la DB est momentanément indisponible)
void (function () { return __awaiter(void 0, void 0, void 0, function () {
    var err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                // Ne pas faire échouer le démarrage: c'est un check best-effort
                return [4 /*yield*/, prismaClient.$connect()];
            case 1:
                // Ne pas faire échouer le démarrage: c'est un check best-effort
                _a.sent();
                console.log('[Prisma] Connexion établie avec succès');
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                console.warn('[Prisma] Échec de connexion au démarrage (le serveur continue). Détails:', err_1 === null || err_1 === void 0 ? void 0 : err_1.message);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); })();
