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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var client_1 = require("@prisma/client");
var router = express_1.default.Router({ mergeParams: true });
var prisma = new client_1.PrismaClient();
// PUT /api/dependencies/:dependencyId - Mettre à jour une dépendance et retourner la liste du champ
router.put('/:dependencyId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dependencyId, _a, name, description, sequence, order, targetFieldId, operator, value, action, prefillValue, existing, dataToUpdate, deps, processed, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                dependencyId = req.params.dependencyId;
                _a = req.body || {}, name = _a.name, description = _a.description, sequence = _a.sequence, order = _a.order, targetFieldId = _a.targetFieldId, operator = _a.operator, value = _a.value, action = _a.action, prefillValue = _a.prefillValue;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.fieldDependency.findUnique({ where: { id: dependencyId } })];
            case 2:
                existing = _b.sent();
                if (!existing) {
                    return [2 /*return*/, res.status(404).json({ error: 'Dépendance non trouvée' })];
                }
                dataToUpdate = {};
                if (name !== undefined)
                    dataToUpdate.name = name;
                if (description !== undefined)
                    dataToUpdate.description = description;
                if (sequence !== undefined)
                    dataToUpdate.sequence = JSON.stringify(sequence);
                if (order !== undefined)
                    dataToUpdate.order = order;
                if (targetFieldId !== undefined)
                    dataToUpdate.dependsOnId = targetFieldId;
                if (operator !== undefined)
                    dataToUpdate.condition = operator;
                if (value !== undefined)
                    dataToUpdate.value = value;
                if (action !== undefined || prefillValue !== undefined)
                    dataToUpdate.params = { action: action, prefillValue: prefillValue };
                return [4 /*yield*/, prisma.fieldDependency.update({ where: { id: dependencyId }, data: dataToUpdate })];
            case 3:
                _b.sent();
                return [4 /*yield*/, prisma.fieldDependency.findMany({
                        where: { fieldId: existing.fieldId },
                        orderBy: { order: 'asc' },
                    })];
            case 4:
                deps = _b.sent();
                processed = deps.map(function (d) {
                    var _a;
                    return (__assign(__assign({}, d), { sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence) : ((_a = d.sequence) !== null && _a !== void 0 ? _a : []) }));
                });
                return [2 /*return*/, res.json(processed)];
            case 5:
                error_1 = _b.sent();
                console.error("[API] Erreur PUT /api/dependencies/".concat(dependencyId, ":"), error_1);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de la mise à jour de la dépendance', details: error_1.message })];
            case 6: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/dependencies/:dependencyId - Supprimer une dépendance et retourner la liste du champ
router.delete('/:dependencyId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dependencyId, existing, fieldId, deps, processed, error_2, errObj;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dependencyId = req.params.dependencyId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.fieldDependency.findUnique({ where: { id: dependencyId } })];
            case 2:
                existing = _a.sent();
                if (!existing) {
                    return [2 /*return*/, res.status(404).json({ error: 'Dépendance non trouvée' })];
                }
                fieldId = existing.fieldId;
                return [4 /*yield*/, prisma.fieldDependency.delete({ where: { id: dependencyId } })];
            case 3:
                _a.sent();
                return [4 /*yield*/, prisma.fieldDependency.findMany({ where: { fieldId: fieldId }, orderBy: { order: 'asc' } })];
            case 4:
                deps = _a.sent();
                processed = deps.map(function (d) {
                    var _a;
                    return (__assign(__assign({}, d), { sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence) : ((_a = d.sequence) !== null && _a !== void 0 ? _a : []) }));
                });
                return [2 /*return*/, res.status(200).json(processed)];
            case 5:
                error_2 = _a.sent();
                console.error("[API] Erreur DELETE /api/dependencies/".concat(req.params.dependencyId, ":"), error_2);
                errObj = error_2;
                if ((errObj === null || errObj === void 0 ? void 0 : errObj.code) === 'P2025') {
                    return [2 /*return*/, res.status(404).json({ error: 'Dépendance non trouvée' })];
                }
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de la suppression de la dépendance', details: error_2.message })];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
