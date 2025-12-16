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
exports.impersonationMiddleware = impersonationMiddleware;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function impersonationMiddleware(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var authReq, impersonateUserId, impersonateOrgId, originalUser, userToImpersonate, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    authReq = req;
                    impersonateUserId = authReq.headers["x-impersonate-user-id"];
                    impersonateOrgId = authReq.headers["x-impersonate-org-id"];
                    originalUser = authReq.user;
                    // Le middleware ne fait rien si l'utilisateur n'est pas un super_admin
                    // ou si aucun en-tête d'usurpation n'est fourni.
                    if (!originalUser ||
                        originalUser.role !== "super_admin" ||
                        (!impersonateUserId && !impersonateOrgId)) {
                        return [2 /*return*/, next()];
                    }
                    console.log("[Impersonation] Middleware triggered for super_admin ".concat(originalUser.userId, ". Headers: user=").concat(impersonateUserId, ", org=").concat(impersonateOrgId));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    if (!impersonateUserId) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.user.findUnique({
                            where: { id: impersonateUserId },
                        })];
                case 2:
                    userToImpersonate = _a.sent();
                    if (!userToImpersonate) {
                        // Si l'utilisateur n'est pas trouvé, on ne peut pas continuer.
                        return [2 /*return*/, res
                                .status(404)
                                .json({ error: "Utilisateur à usurper non trouvé." })];
                    }
                    // Stocker l'objet utilisateur complet pour un usage ultérieur (ex: /api/me)
                    authReq.impersonatedUser = userToImpersonate;
                    // L'organisation à usurper est soit celle fournie, soit nulle pour le moment.
                    authReq.impersonatedOrganizationId = impersonateOrgId;
                    console.log("[Impersonation] Stored impersonatedUser: ".concat(authReq.impersonatedUser.id));
                    return [3 /*break*/, 4];
                case 3:
                    if (impersonateOrgId) {
                        // Cas 2 : Le super_admin agit dans le contexte d'une seule organisation
                        // sans changer d'identité utilisateur.
                        authReq.impersonatedOrganizationId = impersonateOrgId;
                    }
                    _a.label = 4;
                case 4:
                    if (authReq.impersonatedOrganizationId) {
                        console.log("[Impersonation] Stored impersonatedOrganizationId: ".concat(authReq.impersonatedOrganizationId));
                    }
                    next();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error("[Impersonation] Erreur:", error_1);
                    res
                        .status(500)
                        .json({ error: "Une erreur est survenue durant l'usurpation." });
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
