"use strict";
/**
 * GOOGLE GMAIL SERVICE - SERVICE CENTRALISÉ
 *
 * Service pour toutes les opérations Gmail utilisant l'authentification centralisée.
 * Ce service garantit l'utilisation correcte des tokens d'organisation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.GoogleGmailService = void 0;
var googleapis_1 = require("googleapis");
var GoogleAuthManager_1 = require("../core/GoogleAuthManager");
var GoogleGmailService = /** @class */ (function () {
    function GoogleGmailService(gmail, organizationId) {
        this.adminEmail = null;
        this.gmail = gmail;
        this.organizationId = organizationId;
    }
    /**
     * Crée une instance du service Gmail pour une organisation
     */
    GoogleGmailService.create = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var authClient, gmail, service;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[GoogleGmailService] Cr\u00E9ation du service pour l'organisation: ".concat(organizationId));
                        return [4 /*yield*/, GoogleAuthManager_1.googleAuthManager.getAuthenticatedClient(organizationId)];
                    case 1:
                        authClient = _a.sent();
                        if (!authClient) {
                            console.error("[GoogleGmailService] Impossible d'obtenir le client authentifi\u00E9 pour l'organisation: ".concat(organizationId));
                            return [2 /*return*/, null];
                        }
                        gmail = googleapis_1.google.gmail({ version: 'v1', auth: authClient });
                        service = new GoogleGmailService(gmail, organizationId);
                        // Récupérer l'email administrateur pour l'utiliser comme expéditeur
                        return [4 /*yield*/, service.loadOrganizationInfo()];
                    case 2:
                        // Récupérer l'email administrateur pour l'utiliser comme expéditeur
                        _a.sent();
                        return [2 /*return*/, service];
                }
            });
        });
    };
    /**
     * Charge les informations de l'organisation (email admin, etc.)
     */
    GoogleGmailService.prototype.loadOrganizationInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var PrismaClient, prisma, organization, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
                    case 1:
                        PrismaClient = (_b.sent()).PrismaClient;
                        prisma = new PrismaClient();
                        return [4 /*yield*/, prisma.organization.findUnique({
                                where: { id: this.organizationId },
                                include: {
                                    GoogleWorkspaceConfig: true,
                                },
                            })];
                    case 2:
                        organization = _b.sent();
                        if ((_a = organization === null || organization === void 0 ? void 0 : organization.GoogleWorkspaceConfig) === null || _a === void 0 ? void 0 : _a.adminEmail) {
                            this.adminEmail = organization.GoogleWorkspaceConfig.adminEmail;
                            console.log("[GoogleGmailService] \uD83D\uDCE7 Email admin charg\u00E9: ".concat(this.adminEmail));
                        }
                        else {
                            console.warn("[GoogleGmailService] \u26A0\uFE0F Email admin non trouv\u00E9 pour l'organisation ".concat(this.organizationId));
                        }
                        return [4 /*yield*/, prisma.$disconnect()];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        console.error('[GoogleGmailService] Erreur lors du chargement des infos organisation:', error_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère la liste des messages Gmail
     */
    GoogleGmailService.prototype.getMessages = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var _a, maxResults, pageToken, q, labelIds, messagesResponse, messages, formattedMessages, _i, messages_1, message, messageDetails, error_2;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[GoogleGmailService] Récupération des messages Gmail...');
                        _a = options.maxResults, maxResults = _a === void 0 ? 10 : _a, pageToken = options.pageToken, q = options.q, labelIds = options.labelIds;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.gmail.users.messages.list({
                                userId: 'me',
                                maxResults: maxResults,
                                pageToken: pageToken,
                                q: q,
                                labelIds: labelIds
                            })];
                    case 2:
                        messagesResponse = _b.sent();
                        messages = messagesResponse.data.messages || [];
                        console.log("[GoogleGmailService] ".concat(messages.length, " messages trouv\u00E9s"));
                        formattedMessages = [];
                        _i = 0, messages_1 = messages;
                        _b.label = 3;
                    case 3:
                        if (!(_i < messages_1.length)) return [3 /*break*/, 6];
                        message = messages_1[_i];
                        if (!message.id) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.getMessageDetails(message.id)];
                    case 4:
                        messageDetails = _b.sent();
                        if (messageDetails) {
                            formattedMessages.push(messageDetails);
                        }
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, {
                            messages: formattedMessages,
                            nextPageToken: messagesResponse.data.nextPageToken,
                            totalEstimate: messagesResponse.data.resultSizeEstimate
                        }];
                    case 7:
                        error_2 = _b.sent();
                        console.error('[GoogleGmailService] Erreur lors de la récupération des messages:', error_2);
                        throw error_2;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère les détails d'un message Gmail
     */
    GoogleGmailService.prototype.getMessageDetails = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, message, headers_1, getHeader, htmlBody, attachments, error_3;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.messages.get({
                                userId: 'me',
                                id: messageId,
                                format: 'full'
                            })];
                    case 1:
                        response = _d.sent();
                        message = response.data;
                        if (!message.payload || !message.payload.headers) {
                            return [2 /*return*/, null];
                        }
                        headers_1 = message.payload.headers;
                        getHeader = function (name) {
                            var header = headers_1.find(function (h) { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === name.toLowerCase(); });
                            return (header === null || header === void 0 ? void 0 : header.value) || '';
                        };
                        htmlBody = '';
                        if (message.payload.parts) {
                            htmlBody = this.extractHtmlFromParts(message.payload.parts);
                        }
                        else if ((_a = message.payload.body) === null || _a === void 0 ? void 0 : _a.data) {
                            htmlBody = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
                        }
                        attachments = this.extractAttachments(message.payload);
                        return [2 /*return*/, {
                                id: message.id,
                                threadId: message.threadId,
                                subject: getHeader('Subject'),
                                from: getHeader('From'),
                                to: getHeader('To'),
                                date: new Date(parseInt(message.internalDate || '0')),
                                snippet: message.snippet || '',
                                labels: message.labelIds || [],
                                isRead: !((_b = message.labelIds) === null || _b === void 0 ? void 0 : _b.includes('UNREAD')),
                                isStarred: ((_c = message.labelIds) === null || _c === void 0 ? void 0 : _c.includes('STARRED')) || false,
                                hasAttachments: attachments.length > 0,
                                attachments: attachments,
                                htmlBody: htmlBody
                            }];
                    case 2:
                        error_3 = _d.sent();
                        console.error("[GoogleGmailService] Erreur lors de la r\u00E9cup\u00E9ration du message ".concat(messageId, ":"), error_3);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Envoie un email (avec support des pièces jointes) - VERSION ANTI-SPAM
     */
    GoogleGmailService.prototype.sendEmail = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var message, boundary, fromName, contentType, professionalBody, _i, _a, attachment, base64Content, chunkedContent, contentType, professionalBody, encodedMessage, response, error_4;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log("[GoogleGmailService] \uD83D\uDCE7 Envoi professionnel d'un email \u00E0: ".concat(options.to, " avec ").concat(((_b = options.attachments) === null || _b === void 0 ? void 0 : _b.length) || 0, " pi\u00E8ces jointes"));
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        message = '';
                        boundary = 'boundary_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        // 🔧 HEADERS PROFESSIONNELS ANTI-SPAM
                        // From professionnel avec nom d'affichage
                        if (this.adminEmail) {
                            fromName = options.fromName || '2Thier CRM';
                            message += "From: \"".concat(fromName, "\" <").concat(this.adminEmail, ">\r\n");
                        }
                        message += "To: ".concat(options.to, "\r\n");
                        message += "Subject: ".concat(options.subject, "\r\n");
                        if (options.cc) {
                            message += "Cc: ".concat(options.cc, "\r\n");
                        }
                        if (options.bcc) {
                            message += "Bcc: ".concat(options.bcc, "\r\n");
                        }
                        // 🆕 HEADERS DE DÉLIVRABILITÉ CRITIQUES
                        message += "Date: ".concat(new Date().toUTCString(), "\r\n");
                        message += "Message-ID: <".concat(Date.now(), ".").concat(Math.random().toString(36).substr(2), ".crm@2thier.be>\r\n");
                        message += "MIME-Version: 1.0\r\n";
                        // Headers de légitimité professionnelle
                        message += "X-Mailer: 2Thier CRM v2.0\r\n";
                        message += "X-Priority: 3\r\n"; // Priorité normale (pas urgent = moins spam)
                        message += "X-MSMail-Priority: Normal\r\n";
                        message += "Importance: Normal\r\n";
                        // Headers de sécurité et d'authentification
                        message += "X-Auto-Response-Suppress: All\r\n"; // Éviter les réponses automatiques
                        message += "List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n";
                        // 🆕 Structure professionnelle du contenu
                        if (options.attachments && options.attachments.length > 0) {
                            // Message multipart avec pièces jointes
                            message += "Content-Type: multipart/mixed; boundary=\"".concat(boundary, "\"\r\n\r\n");
                            // Texte d'introduction multipart professionnel
                            message += "This is a multi-part message in MIME format.\r\n\r\n";
                            // Partie corps du message
                            message += "--".concat(boundary, "\r\n");
                            contentType = options.isHtml ? 'text/html' : 'text/plain';
                            message += "Content-Type: ".concat(contentType, "; charset=utf-8\r\n");
                            message += "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
                            professionalBody = this.formatProfessionalBody(options.body, options.isHtml);
                            message += professionalBody + '\r\n\r\n';
                            // Ajouter chaque pièce jointe avec headers corrects
                            for (_i = 0, _a = options.attachments; _i < _a.length; _i++) {
                                attachment = _a[_i];
                                message += "--".concat(boundary, "\r\n");
                                message += "Content-Type: ".concat(attachment.mimeType, "; name=\"").concat(attachment.filename, "\"\r\n");
                                message += "Content-Disposition: attachment; filename=\"".concat(attachment.filename, "\"\r\n");
                                message += "Content-Transfer-Encoding: base64\r\n";
                                message += "Content-ID: <".concat(attachment.filename.replace(/[^a-zA-Z0-9]/g, '_'), "_").concat(Date.now(), ">\r\n\r\n");
                                base64Content = attachment.content.toString('base64');
                                chunkedContent = ((_c = base64Content.match(/.{1,76}/g)) === null || _c === void 0 ? void 0 : _c.join('\r\n')) || base64Content;
                                message += chunkedContent + '\r\n\r\n';
                            }
                            // Fermer le boundary
                            message += "--".concat(boundary, "--\r\n");
                        }
                        else {
                            contentType = options.isHtml ? 'text/html' : 'text/plain';
                            message += "Content-Type: ".concat(contentType, "; charset=utf-8\r\n");
                            message += "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
                            professionalBody = this.formatProfessionalBody(options.body, options.isHtml);
                            message += professionalBody;
                        }
                        encodedMessage = Buffer.from(message).toString('base64')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=+$/, '');
                        console.log('[GoogleGmailService] 📤 Envoi du message encodé...');
                        return [4 /*yield*/, this.gmail.users.messages.send({
                                userId: 'me',
                                requestBody: {
                                    raw: encodedMessage
                                }
                            })];
                    case 2:
                        response = _d.sent();
                        console.log("[GoogleGmailService] \u2705 Email envoy\u00E9 avec l'ID: ".concat(response.data.id));
                        return [2 /*return*/, { messageId: response.data.id }];
                    case 3:
                        error_4 = _d.sent();
                        console.error('[GoogleGmailService] ❌ Erreur lors de l\'envoi de l\'email:', error_4);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🆕 Formate le corps de l'email de manière professionnelle avec signature
     */
    GoogleGmailService.prototype.formatProfessionalBody = function (body, isHtml) {
        if (isHtml === void 0) { isHtml = false; }
        if (isHtml) {
            // Version HTML professionnelle
            return "\n<!DOCTYPE html>\n<html>\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Email de 2Thier CRM</title>\n</head>\n<body style=\"font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;\">\n    <div style=\"background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px;\">\n        <!-- En-t\u00EAte professionnel -->\n        <div style=\"border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px;\">\n            <h2 style=\"color: #0066cc; margin: 0; font-size: 24px;\">2Thier CRM</h2>\n            <p style=\"color: #666; margin: 5px 0 0 0; font-size: 14px;\">Solution de gestion client professionnelle</p>\n        </div>\n        \n        <!-- Contenu principal -->\n        <div style=\"margin-bottom: 40px;\">\n            ".concat(body, "\n        </div>\n        \n        <!-- Signature professionnelle -->\n        <div style=\"border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;\">\n            <table style=\"width: 100%; border-collapse: collapse;\">\n                <tr>\n                    <td style=\"vertical-align: top; padding-right: 20px;\">\n                        <p style=\"margin: 0; font-size: 16px; font-weight: 600; color: #0066cc;\">\u00C9quipe 2Thier CRM</p>\n                        <p style=\"margin: 5px 0; font-size: 14px; color: #666;\">Solution de gestion client int\u00E9gr\u00E9e</p>\n                        <p style=\"margin: 5px 0; font-size: 14px; color: #666;\">\n                            <a href=\"mailto:support@2thier.be\" style=\"color: #0066cc; text-decoration: none;\">support@2thier.be</a>\n                        </p>\n                    </td>\n                </tr>\n            </table>\n        </div>\n        \n        <!-- Footer de confidentialit\u00E9 -->\n        <div style=\"border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; font-size: 12px; color: #999; text-align: center;\">\n            <p style=\"margin: 0;\">Ce message est confidentiel et destin\u00E9 uniquement au destinataire indiqu\u00E9.</p>\n            <p style=\"margin: 5px 0 0 0;\">Si vous n'\u00EAtes pas le destinataire pr\u00E9vu, veuillez supprimer ce message.</p>\n        </div>\n    </div>\n</body>\n</html>").trim();
        }
        else {
            // Version texte professionnelle
            return "".concat(body, "\n\n--\n\u00C9quipe 2Thier CRM\nSolution de gestion client int\u00E9gr\u00E9e\nEmail: support@2thier.be\n\nCe message est confidentiel et destin\u00E9 uniquement au destinataire indiqu\u00E9.\nSi vous n'\u00EAtes pas le destinataire pr\u00E9vu, veuillez supprimer ce message.");
        }
    };
    /**
     * Récupère les labels Gmail
     */
    GoogleGmailService.prototype.getLabels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.labels.list({
                                userId: 'me'
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, (response.data.labels || []).map(function (label) { return ({
                                id: label.id,
                                name: label.name,
                                type: label.type,
                                messageListVisibility: label.messageListVisibility,
                                labelListVisibility: label.labelListVisibility
                            }); })];
                    case 2:
                        error_5 = _a.sent();
                        console.error('[GoogleGmailService] Erreur lors de la récupération des labels:', error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Crée un nouveau label/dossier personnalisé
     */
    GoogleGmailService.prototype.createLabel = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.labels.create({
                                userId: 'me',
                                requestBody: {
                                    name: name,
                                    messageListVisibility: 'show',
                                    labelListVisibility: 'labelShow'
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.data) {
                            console.log("[GoogleGmailService] Label \"".concat(name, "\" cr\u00E9\u00E9 avec l'ID: ").concat(response.data.id));
                            return [2 /*return*/, {
                                    id: response.data.id,
                                    name: response.data.name,
                                    type: response.data.type,
                                    messageListVisibility: response.data.messageListVisibility,
                                    labelListVisibility: response.data.labelListVisibility
                                }];
                        }
                        return [2 /*return*/, null];
                    case 2:
                        error_6 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la cr\u00E9ation du label \"".concat(name, "\":"), error_6);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Modifie un label existant
     */
    GoogleGmailService.prototype.updateLabel = function (labelId, name) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.labels.update({
                                userId: 'me',
                                id: labelId,
                                requestBody: {
                                    name: name,
                                    messageListVisibility: 'show',
                                    labelListVisibility: 'labelShow'
                                }
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Label ".concat(labelId, " renomm\u00E9 en \"").concat(name, "\""));
                        return [2 /*return*/, true];
                    case 2:
                        error_7 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la modification du label ".concat(labelId, ":"), error_7);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Supprime un label (seuls les labels personnalisés peuvent être supprimés)
     */
    GoogleGmailService.prototype.deleteLabel = function (labelId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.labels.delete({
                                userId: 'me',
                                id: labelId
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Label ".concat(labelId, " supprim\u00E9"));
                        return [2 /*return*/, true];
                    case 2:
                        error_8 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la suppression du label ".concat(labelId, ":"), error_8);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Marque un message comme lu/non lu
     */
    GoogleGmailService.prototype.markAsRead = function (messageId_1) {
        return __awaiter(this, arguments, void 0, function (messageId, read) {
            var labelsToAdd, labelsToRemove, error_9;
            if (read === void 0) { read = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        labelsToAdd = read ? [] : ['UNREAD'];
                        labelsToRemove = read ? ['UNREAD'] : [];
                        return [4 /*yield*/, this.gmail.users.messages.modify({
                                userId: 'me',
                                id: messageId,
                                requestBody: {
                                    addLabelIds: labelsToAdd,
                                    removeLabelIds: labelsToRemove
                                }
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Message ".concat(messageId, " marqu\u00E9 comme ").concat(read ? 'lu' : 'non lu'));
                        return [2 /*return*/, true];
                    case 2:
                        error_9 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors du marquage du message ".concat(messageId, ":"), error_9);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Supprime un message
     */
    /**
     * Marque ou enlève l'étoile d'un message
     * LOGIQUE PRÉCISE :
     * - Ajouter étoile = SEULEMENT ajouter STARRED (ne pas toucher aux autres labels)
     * - Retirer étoile = SEULEMENT retirer STARRED (ne pas toucher aux autres labels)
     */
    GoogleGmailService.prototype.markAsStarred = function (messageId_1) {
        return __awaiter(this, arguments, void 0, function (messageId, starred) {
            var labelChanges, error_10;
            if (starred === void 0) { starred = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        labelChanges = {};
                        if (starred) {
                            // ⭐ AJOUTER seulement STARRED, ne pas toucher aux autres labels
                            labelChanges.addLabelIds = ['STARRED'];
                            console.log("[GoogleGmailService] \u2B50 Ajout STARRED uniquement (autres labels pr\u00E9serv\u00E9s)");
                        }
                        else {
                            // ⭐ RETIRER seulement STARRED, ne pas toucher aux autres labels
                            labelChanges.removeLabelIds = ['STARRED'];
                            console.log("[GoogleGmailService] \u2B50 Retrait STARRED uniquement (autres labels pr\u00E9serv\u00E9s)");
                        }
                        return [4 /*yield*/, this.gmail.users.messages.modify({
                                userId: 'me',
                                id: messageId,
                                requestBody: labelChanges
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Message ".concat(messageId, " ").concat(starred ? 'marqué en favori' : 'retiré des favoris', " - autres labels intacts"));
                        return [2 /*return*/, true];
                    case 2:
                        error_10 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la modification du favori pour ".concat(messageId, ":"), error_10);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Déplace un message vers la corbeille
     * LOGIQUE SIMPLE : Ajoute SEULEMENT le label TRASH, sans retirer d'autres labels
     * Pour supprimer complètement, utiliser deleteMessage
     */
    GoogleGmailService.prototype.trashMessage = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.messages.modify({
                                userId: 'me',
                                id: messageId,
                                requestBody: {
                                    addLabelIds: ['TRASH']
                                    // Ne pas retirer INBOX automatiquement - gestion indépendante
                                }
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Message ".concat(messageId, " d\u00E9plac\u00E9 vers la corbeille (autres labels pr\u00E9serv\u00E9s)"));
                        return [2 /*return*/, true];
                    case 2:
                        error_11 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors du d\u00E9placement vers la corbeille pour ".concat(messageId, ":"), error_11);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Supprime un message d'un emplacement spécifique (retire seulement le label demandé)
     * Utilisé pour supprimer de boîte de réception, favoris, ou dossier sans affecter les autres emplacements
     */
    GoogleGmailService.prototype.removeFromLocation = function (messageId, labelToRemove) {
        return __awaiter(this, void 0, void 0, function () {
            var error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.messages.modify({
                                userId: 'me',
                                id: messageId,
                                requestBody: {
                                    removeLabelIds: [labelToRemove]
                                    // Ne retire QUE le label spécifié, garde tous les autres
                                }
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Message ".concat(messageId, " retir\u00E9 de l'emplacement ").concat(labelToRemove, " (autres emplacements pr\u00E9serv\u00E9s)"));
                        return [2 /*return*/, true];
                    case 2:
                        error_12 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la suppression de ".concat(labelToRemove, " pour ").concat(messageId, ":"), error_12);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Restaure un message de la corbeille
     * LOGIQUE SIMPLE : Retire SEULEMENT le label TRASH
     */
    GoogleGmailService.prototype.untrashMessage = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.messages.modify({
                                userId: 'me',
                                id: messageId,
                                requestBody: {
                                    removeLabelIds: ['TRASH']
                                    // Ne pas ajouter INBOX automatiquement - l'utilisateur choisira où le remettre
                                }
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Message ".concat(messageId, " restaur\u00E9 de la corbeille"));
                        return [2 /*return*/, true];
                    case 2:
                        error_13 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la restauration de ".concat(messageId, ":"), error_13);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Modifie les labels d'un message (pour gestion des dossiers)
     * LOGIQUE SIMPLE ET PRÉCISE :
     * - Suppression spécifique = retire SEULEMENT le label demandé
     * - Ajout spécifique = ajoute SEULEMENT le label demandé
     * - Chaque emplacement (INBOX, STARRED, dossier) est géré INDÉPENDAMMENT
     */
    GoogleGmailService.prototype.modifyLabels = function (messageId_1) {
        return __awaiter(this, arguments, void 0, function (messageId, addLabelIds, removeLabelIds) {
            var requestBody, error_14;
            if (addLabelIds === void 0) { addLabelIds = []; }
            if (removeLabelIds === void 0) { removeLabelIds = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        requestBody = {};
                        // ✅ AJOUT SIMPLE : Ajouter exactement les labels demandés
                        if (addLabelIds.length > 0) {
                            requestBody.addLabelIds = addLabelIds;
                            console.log("[GoogleGmailService] \u2795 Ajout des labels: ".concat(addLabelIds.join(', ')));
                        }
                        // ✅ SUPPRESSION SIMPLE : Retirer exactement les labels demandés
                        if (removeLabelIds.length > 0) {
                            requestBody.removeLabelIds = removeLabelIds;
                            console.log("[GoogleGmailService] \u2796 Suppression des labels: ".concat(removeLabelIds.join(', ')));
                        }
                        // Effectuer la modification EXACTE
                        return [4 /*yield*/, this.gmail.users.messages.modify({
                                userId: 'me',
                                id: messageId,
                                requestBody: requestBody
                            })];
                    case 1:
                        // Effectuer la modification EXACTE
                        _a.sent();
                        console.log("[GoogleGmailService] \u2705 Labels modifi\u00E9s pour ".concat(messageId, ":"), {
                            ajoutés: requestBody.addLabelIds,
                            retirés: requestBody.removeLabelIds,
                            logique: 'Gestion indépendante - aucune protection automatique'
                        });
                        return [2 /*return*/, true];
                    case 2:
                        error_14 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la modification des labels pour ".concat(messageId, ":"), error_14);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Supprime définitivement un message (suppression irréversible)
     */
    GoogleGmailService.prototype.deleteMessage = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.messages.delete({
                                userId: 'me',
                                id: messageId
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] Message ".concat(messageId, " supprim\u00E9 d\u00E9finitivement"));
                        return [2 /*return*/, true];
                    case 2:
                        error_15 = _a.sent();
                        console.error("[GoogleGmailService] Erreur lors de la suppression du message ".concat(messageId, ":"), error_15);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sauvegarde un email en brouillon
     * FONCTIONNALITÉ ESSENTIELLE : Auto-sauvegarde pour ne jamais perdre un email en cours
     */
    GoogleGmailService.prototype.saveDraft = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var message, contentType, encodedMessage, response, draftId, messageId, error_16;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[GoogleGmailService] \uD83D\uDCBE Sauvegarde en brouillon: \"".concat(options.subject, "\" -> ").concat(options.to));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        message = '';
                        // Headers
                        message += "To: ".concat(options.to, "\r\n");
                        message += "Subject: ".concat(options.subject, "\r\n");
                        if (options.cc) {
                            message += "Cc: ".concat(options.cc, "\r\n");
                        }
                        if (options.bcc) {
                            message += "Bcc: ".concat(options.bcc, "\r\n");
                        }
                        contentType = options.isHtml ? 'text/html' : 'text/plain';
                        message += "Content-Type: ".concat(contentType, "; charset=utf-8\r\n");
                        message += "\r\n";
                        message += options.body;
                        encodedMessage = Buffer.from(message).toString('base64')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=+$/, '');
                        response = void 0;
                        if (!options.draftId) return [3 /*break*/, 3];
                        // 🔄 MISE À JOUR d'un brouillon existant
                        console.log("[GoogleGmailService] \uD83D\uDD04 Mise \u00E0 jour du brouillon existant: ".concat(options.draftId));
                        return [4 /*yield*/, this.gmail.users.drafts.update({
                                userId: 'me',
                                id: options.draftId,
                                requestBody: {
                                    message: {
                                        raw: encodedMessage
                                    }
                                }
                            })];
                    case 2:
                        response = _b.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        // ✨ CRÉATION d'un nouveau brouillon
                        console.log("[GoogleGmailService] \u2728 Cr\u00E9ation d'un nouveau brouillon");
                        return [4 /*yield*/, this.gmail.users.drafts.create({
                                userId: 'me',
                                requestBody: {
                                    message: {
                                        raw: encodedMessage
                                    }
                                }
                            })];
                    case 4:
                        response = _b.sent();
                        _b.label = 5;
                    case 5:
                        draftId = response.data.id;
                        messageId = ((_a = response.data.message) === null || _a === void 0 ? void 0 : _a.id) || '';
                        console.log("[GoogleGmailService] \u2705 Brouillon sauvegard\u00E9 - ID: ".concat(draftId, ", Message: ").concat(messageId));
                        return [2 /*return*/, { draftId: draftId, messageId: messageId }];
                    case 6:
                        error_16 = _b.sent();
                        console.error('[GoogleGmailService] ❌ Erreur lors de la sauvegarde en brouillon:', error_16);
                        return [2 /*return*/, null];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère tous les brouillons
     */
    GoogleGmailService.prototype.getDrafts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var draftsResponse, drafts, formattedDrafts, _loop_1, this_1, _i, drafts_1, draft, error_17;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log('[GoogleGmailService] 📄 Récupération des brouillons...');
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.gmail.users.drafts.list({
                                userId: 'me'
                            })];
                    case 2:
                        draftsResponse = _d.sent();
                        drafts = draftsResponse.data.drafts || [];
                        console.log("[GoogleGmailService] ".concat(drafts.length, " brouillons trouv\u00E9s"));
                        formattedDrafts = [];
                        _loop_1 = function (draft) {
                            var draftDetails, message, headers_2, getHeader, body, error_18;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        if (!(draft.id && ((_a = draft.message) === null || _a === void 0 ? void 0 : _a.id))) return [3 /*break*/, 4];
                                        _e.label = 1;
                                    case 1:
                                        _e.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, this_1.gmail.users.drafts.get({
                                                userId: 'me',
                                                id: draft.id,
                                                format: 'full'
                                            })];
                                    case 2:
                                        draftDetails = _e.sent();
                                        message = draftDetails.data.message;
                                        if ((_b = message === null || message === void 0 ? void 0 : message.payload) === null || _b === void 0 ? void 0 : _b.headers) {
                                            headers_2 = message.payload.headers;
                                            getHeader = function (name) {
                                                var header = headers_2.find(function (h) { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === name.toLowerCase(); });
                                                return (header === null || header === void 0 ? void 0 : header.value) || '';
                                            };
                                            body = '';
                                            if (message.payload.parts) {
                                                body = this_1.extractTextFromParts(message.payload.parts);
                                            }
                                            else if ((_c = message.payload.body) === null || _c === void 0 ? void 0 : _c.data) {
                                                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
                                            }
                                            formattedDrafts.push({
                                                draftId: draft.id,
                                                messageId: draft.message.id,
                                                subject: getHeader('Subject'),
                                                to: getHeader('To'),
                                                body: body,
                                                date: new Date(parseInt(message.internalDate || '0'))
                                            });
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_18 = _e.sent();
                                        console.error("[GoogleGmailService] Erreur lors de la r\u00E9cup\u00E9ration du brouillon ".concat(draft.id, ":"), error_18);
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, drafts_1 = drafts;
                        _d.label = 3;
                    case 3:
                        if (!(_i < drafts_1.length)) return [3 /*break*/, 6];
                        draft = drafts_1[_i];
                        return [5 /*yield**/, _loop_1(draft)];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        console.log("[GoogleGmailService] \u2705 ".concat(formattedDrafts.length, " brouillons format\u00E9s r\u00E9cup\u00E9r\u00E9s"));
                        return [2 /*return*/, { drafts: formattedDrafts }];
                    case 7:
                        error_17 = _d.sent();
                        console.error('[GoogleGmailService] ❌ Erreur lors de la récupération des brouillons:', error_17);
                        return [2 /*return*/, { drafts: [] }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Supprime un brouillon
     */
    GoogleGmailService.prototype.deleteDraft = function (draftId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_19;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.gmail.users.drafts.delete({
                                userId: 'me',
                                id: draftId
                            })];
                    case 1:
                        _a.sent();
                        console.log("[GoogleGmailService] \uD83D\uDDD1\uFE0F Brouillon ".concat(draftId, " supprim\u00E9"));
                        return [2 /*return*/, true];
                    case 2:
                        error_19 = _a.sent();
                        console.error("[GoogleGmailService] \u274C Erreur lors de la suppression du brouillon ".concat(draftId, ":"), error_19);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Envoie un brouillon (convertit le brouillon en email envoyé)
     */
    GoogleGmailService.prototype.sendDraft = function (draftId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_20;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[GoogleGmailService] \uD83D\uDCE4 Envoi du brouillon: ".concat(draftId));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.gmail.users.drafts.send({
                                userId: 'me',
                                requestBody: {
                                    id: draftId
                                }
                            })];
                    case 2:
                        response = _a.sent();
                        console.log("[GoogleGmailService] \u2705 Brouillon envoy\u00E9 - Message ID: ".concat(response.data.id));
                        return [2 /*return*/, { messageId: response.data.id }];
                    case 3:
                        error_20 = _a.sent();
                        console.error("[GoogleGmailService] \u274C Erreur lors de l'envoi du brouillon ".concat(draftId, ":"), error_20);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Vide complètement la corbeille (supprime tous les messages avec le label TRASH)
     */
    GoogleGmailService.prototype.emptyTrash = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allMessages, pageToken, totalPages, trashMessages, pageMessages, deletedCount, _i, allMessages_1, message, error_21, error_22;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 11, , 12]);
                        console.log("[GoogleGmailService] \uD83D\uDD25 D\u00C9BUT du vidage de la corbeille...");
                        allMessages = [];
                        pageToken = undefined;
                        totalPages = 0;
                        _a.label = 1;
                    case 1:
                        totalPages++;
                        console.log("[GoogleGmailService] \uD83D\uDCC4 R\u00E9cup\u00E9ration page ".concat(totalPages, " des messages de la corbeille..."));
                        return [4 /*yield*/, this.gmail.users.messages.list({
                                userId: 'me',
                                labelIds: ['TRASH'],
                                maxResults: 100, // Maximum par page
                                pageToken: pageToken
                            })];
                    case 2:
                        trashMessages = _a.sent();
                        pageMessages = trashMessages.data.messages || [];
                        allMessages = allMessages.concat(pageMessages);
                        pageToken = trashMessages.data.nextPageToken;
                        console.log("[GoogleGmailService] \uD83D\uDCC4 Page ".concat(totalPages, ": ").concat(pageMessages.length, " messages trouv\u00E9s"));
                        _a.label = 3;
                    case 3:
                        if (pageToken) return [3 /*break*/, 1];
                        _a.label = 4;
                    case 4:
                        console.log("[GoogleGmailService] \uD83D\uDCCA TOTAL: ".concat(allMessages.length, " messages trouv\u00E9s dans la corbeille sur ").concat(totalPages, " pages"));
                        if (allMessages.length === 0) {
                            console.log("[GoogleGmailService] \u2705 La corbeille est d\u00E9j\u00E0 vide");
                            return [2 /*return*/, true];
                        }
                        deletedCount = 0;
                        _i = 0, allMessages_1 = allMessages;
                        _a.label = 5;
                    case 5:
                        if (!(_i < allMessages_1.length)) return [3 /*break*/, 10];
                        message = allMessages_1[_i];
                        if (!message.id) return [3 /*break*/, 9];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.deleteMessage(message.id)];
                    case 7:
                        _a.sent();
                        deletedCount++;
                        if (deletedCount % 10 === 0) {
                            console.log("[GoogleGmailService] \uD83D\uDDD1\uFE0F Progression: ".concat(deletedCount, "/").concat(allMessages.length, " messages supprim\u00E9s..."));
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        error_21 = _a.sent();
                        console.error("[GoogleGmailService] \u274C Erreur lors de la suppression du message ".concat(message.id, ":"), error_21);
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 5];
                    case 10:
                        console.log("[GoogleGmailService] \u2705 Vidage termin\u00E9: ".concat(deletedCount, "/").concat(allMessages.length, " messages supprim\u00E9s de la corbeille"));
                        return [2 /*return*/, true];
                    case 11:
                        error_22 = _a.sent();
                        console.error("[GoogleGmailService] \u274C Erreur lors du vidage de la corbeille:", error_22);
                        return [2 /*return*/, false];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    // Méthodes utilitaires privées
    GoogleGmailService.prototype.extractHtmlFromParts = function (parts) {
        var _a;
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var part = parts_1[_i];
            if (part.mimeType === 'text/html' && ((_a = part.body) === null || _a === void 0 ? void 0 : _a.data)) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
                var html = this.extractHtmlFromParts(part.parts);
                if (html)
                    return html;
            }
        }
        return '';
    };
    GoogleGmailService.prototype.extractTextFromParts = function (parts) {
        var _a, _b;
        for (var _i = 0, parts_2 = parts; _i < parts_2.length; _i++) {
            var part = parts_2[_i];
            // Priorité au texte brut pour les brouillons
            if (part.mimeType === 'text/plain' && ((_a = part.body) === null || _a === void 0 ? void 0 : _a.data)) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            // Sinon prendre le HTML
            if (part.mimeType === 'text/html' && ((_b = part.body) === null || _b === void 0 ? void 0 : _b.data)) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
                var text = this.extractTextFromParts(part.parts);
                if (text)
                    return text;
            }
        }
        return '';
    };
    /**
     * Récupère une pièce jointe d'un message Gmail
     */
    GoogleGmailService.prototype.getAttachment = function (messageId, attachmentId) {
        return __awaiter(this, void 0, void 0, function () {
            var messageResponse, attachmentInfo_1, findAttachmentInfo_1, attachmentResponse, data, buffer, error_23;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        console.log("[GoogleGmailService] \uD83D\uDCCE R\u00E9cup\u00E9ration pi\u00E8ce jointe: ".concat(attachmentId, " du message: ").concat(messageId));
                        return [4 /*yield*/, this.gmail.users.messages.get({
                                userId: 'me',
                                id: messageId,
                                format: 'full'
                            })];
                    case 1:
                        messageResponse = _d.sent();
                        attachmentInfo_1 = { filename: '', mimeType: 'application/octet-stream' };
                        findAttachmentInfo_1 = function (parts) {
                            var _a;
                            for (var _i = 0, parts_3 = parts; _i < parts_3.length; _i++) {
                                var part = parts_3[_i];
                                if (((_a = part.body) === null || _a === void 0 ? void 0 : _a.attachmentId) === attachmentId) {
                                    attachmentInfo_1 = {
                                        filename: part.filename || "attachment_".concat(attachmentId),
                                        mimeType: part.mimeType || 'application/octet-stream'
                                    };
                                    return;
                                }
                                if (part.parts) {
                                    findAttachmentInfo_1(part.parts);
                                }
                            }
                        };
                        if ((_a = messageResponse.data.payload) === null || _a === void 0 ? void 0 : _a.parts) {
                            findAttachmentInfo_1(messageResponse.data.payload.parts);
                        }
                        else if (((_c = (_b = messageResponse.data.payload) === null || _b === void 0 ? void 0 : _b.body) === null || _c === void 0 ? void 0 : _c.attachmentId) === attachmentId) {
                            attachmentInfo_1 = {
                                filename: messageResponse.data.payload.filename || "attachment_".concat(attachmentId),
                                mimeType: messageResponse.data.payload.mimeType || 'application/octet-stream'
                            };
                        }
                        return [4 /*yield*/, this.gmail.users.messages.attachments.get({
                                userId: 'me',
                                messageId: messageId,
                                id: attachmentId
                            })];
                    case 2:
                        attachmentResponse = _d.sent();
                        if (attachmentResponse.data.data) {
                            data = attachmentResponse.data.data.replace(/-/g, '+').replace(/_/g, '/');
                            buffer = Buffer.from(data, 'base64');
                            console.log("[GoogleGmailService] \u2705 Pi\u00E8ce jointe r\u00E9cup\u00E9r\u00E9e: ".concat(attachmentInfo_1.filename, " (").concat(buffer.length, " bytes)"));
                            return [2 /*return*/, {
                                    data: buffer,
                                    filename: attachmentInfo_1.filename,
                                    mimeType: attachmentInfo_1.mimeType
                                }];
                        }
                        console.log("[GoogleGmailService] \u274C Aucune donn\u00E9e trouv\u00E9e pour la pi\u00E8ce jointe: ".concat(attachmentId));
                        return [2 /*return*/, null];
                    case 3:
                        error_23 = _d.sent();
                        console.error('[GoogleGmailService] Erreur récupération pièce jointe:', error_23);
                        throw error_23;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GoogleGmailService.prototype.extractAttachments = function (payload) {
        var attachments = [];
        var findAttachments = function (parts) {
            var _a;
            for (var _i = 0, parts_4 = parts; _i < parts_4.length; _i++) {
                var part = parts_4[_i];
                if (part.filename && ((_a = part.body) === null || _a === void 0 ? void 0 : _a.attachmentId)) {
                    attachments.push({
                        attachmentId: part.body.attachmentId,
                        filename: part.filename,
                        mimeType: part.mimeType || 'application/octet-stream',
                        size: part.body.size || 0
                    });
                }
                if (part.parts) {
                    findAttachments(part.parts);
                }
            }
        };
        if (payload.parts) {
            findAttachments(payload.parts);
        }
        return attachments;
    };
    return GoogleGmailService;
}());
exports.GoogleGmailService = GoogleGmailService;
