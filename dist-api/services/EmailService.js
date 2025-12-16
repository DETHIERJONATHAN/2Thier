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
exports.emailService = void 0;
var EmailService = /** @class */ (function () {
    function EmailService() {
    }
    /**
     * Envoie un e-mail d'invitation.
     * Simule l'envoi en loggant les détails dans la console.
     */
    EmailService.prototype.sendInvitationEmail = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var to, token, isExistingUser, organizationName, roleName, frontendUrl, acceptUrl, subject, body;
            return __generator(this, function (_a) {
                to = payload.to, token = payload.token, isExistingUser = payload.isExistingUser, organizationName = payload.organizationName, roleName = payload.roleName;
                frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                acceptUrl = "".concat(frontendUrl, "/accept-invitation?token=").concat(token);
                subject = '';
                body = '';
                if (isExistingUser) {
                    subject = "Vous \u00EAtes invit\u00E9(e) \u00E0 rejoindre ".concat(organizationName);
                    body = "\n                <p>Bonjour,</p>\n                <p>Vous avez \u00E9t\u00E9 invit\u00E9(e) \u00E0 rejoindre l'organisation \"".concat(organizationName, "\" avec le r\u00F4le \"").concat(roleName, "\".</p>\n                <p>Comme vous avez d\u00E9j\u00E0 un compte, il vous suffit de cliquer sur le lien ci-dessous pour accepter l'invitation :</p>\n                <p><a href=\"").concat(acceptUrl, "\">Accepter l'invitation</a></p>\n                <p>Si vous n'\u00EAtes pas \u00E0 l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>\n            ");
                }
                else {
                    subject = "Invitation \u00E0 rejoindre ".concat(organizationName);
                    body = "\n                <p>Bonjour,</p>\n                <p>Vous avez \u00E9t\u00E9 invit\u00E9(e) \u00E0 rejoindre l'organisation \"".concat(organizationName, "\" avec le r\u00F4le \"").concat(roleName, "\".</p>\n                <p>Pour finaliser votre inscription et rejoindre l'\u00E9quipe, veuillez cliquer sur le lien ci-dessous :</p>\n                <p><a href=\"").concat(acceptUrl, "\">Cr\u00E9er votre compte et accepter l'invitation</a></p>\n                <p>Ce lien est valide pendant 7 jours.</p>\n            ");
                }
                console.log('--- SIMULATION D\'ENVOI D\'EMAIL ---');
                console.log("\u00C0: ".concat(to));
                console.log("Sujet: ".concat(subject));
                console.log("URL d'acceptation: ".concat(acceptUrl));
                console.log("Corps (HTML): ".concat(body.replace(/\s+/g, ' ').trim()));
                console.log('------------------------------------');
                // En production, vous intégreriez un vrai service d'envoi ici.
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    /**
     * Envoie un e-mail générique (simulation console).
     */
    EmailService.prototype.sendEmail = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var to, subject, html, text, replyTo;
            return __generator(this, function (_a) {
                to = payload.to, subject = payload.subject, html = payload.html, text = payload.text, replyTo = payload.replyTo;
                console.log('--- SIMULATION ENVOI EMAIL (générique) ---');
                console.log("\u00C0: ".concat(to));
                console.log("Sujet: ".concat(subject));
                if (replyTo) {
                    console.log("R\u00E9pondre \u00E0: ".concat(replyTo));
                }
                if (text) {
                    console.log("Corps (texte): ".concat(text.replace(/\s+/g, ' ').trim()));
                }
                console.log("Corps (HTML): ".concat(html.replace(/\s+/g, ' ').trim()));
                console.log('------------------------------------------');
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    return EmailService;
}());
exports.emailService = new EmailService();
