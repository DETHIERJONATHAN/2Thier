"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var impersonation_js_1 = require("../middlewares/impersonation.js");
var telnyx_js_1 = __importDefault(require("../api/telnyx.js"));
var router = (0, express_1.Router)();
// Appliquer l'authentification et l'usurpation à toutes les routes Telnyx
router.use(auth_js_1.authMiddleware, impersonation_js_1.impersonationMiddleware);
// Toutes les routes Telnyx
router.use('/', telnyx_js_1.default);
exports.default = router;
