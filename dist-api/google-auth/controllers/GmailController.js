"use strict";
/**
 * GMAIL CONTROLLER - VERSION CENTRALISÉE
 *
 * Contrôleur Gmail utilisant le service d'authentification centralisé.
 * Toutes les opérations passent par le GoogleGmailService.
 */
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
exports.health = exports.sendDraft = exports.deleteDraft = exports.saveDraft = exports.getDrafts = exports.getAttachment = exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.emptyTrash = exports.untrashMessage = exports.trashMessage = exports.getLabels = exports.deleteMessage = exports.modifyMessage = exports.sendMessage = exports.getMessage = exports.getMessages = exports.getThreads = void 0;
var index_1 = require("../index");
/**
 * Récupère les threads Gmail
 */
var getThreads = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, gmailService, _a, _b, maxResults, pageToken, q, result, error_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _d.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                _a = req.query, _b = _a.maxResults, maxResults = _b === void 0 ? 10 : _b, pageToken = _a.pageToken, q = _a.q;
                return [4 /*yield*/, gmailService.getMessages({
                        maxResults: Number(maxResults),
                        pageToken: pageToken,
                        q: q
                    })];
            case 2:
                result = _d.sent();
                // Renvoyer directement les données pour compatibilité frontend
                res.json(result);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _d.sent();
                console.error('[Gmail Controller] Erreur getThreads:', error_1);
                res.status(500).json({ error: 'Erreur lors de la récupération des threads' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getThreads = getThreads;
/**
 * Récupère les messages Gmail
 */
var getMessages = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, gmailService, _a, _b, maxResults, pageToken, q, labelIds, mailbox // Frontend peut envoyer mailbox au lieu de labelIds
    , finalLabelIds, mailboxStr, result, error_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _d.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                _a = req.query, _b = _a.maxResults, maxResults = _b === void 0 ? 10 : _b, pageToken = _a.pageToken, q = _a.q, labelIds = _a.labelIds, mailbox = _a.mailbox;
                console.log('[Gmail Controller] Paramètres reçus:', { maxResults: maxResults, pageToken: pageToken, q: q, labelIds: labelIds, mailbox: mailbox });
                finalLabelIds = void 0;
                if (labelIds) {
                    // Si labelIds est fourni directement
                    finalLabelIds = Array.isArray(labelIds) ? labelIds : [labelIds];
                }
                else if (mailbox) {
                    mailboxStr = mailbox;
                    console.log("[Gmail Controller] \uD83D\uDCE6 Conversion mailbox: ".concat(mailboxStr));
                    switch (mailboxStr.toLowerCase()) {
                        case 'inbox':
                            finalLabelIds = ['INBOX'];
                            break;
                        case 'sent':
                            finalLabelIds = ['SENT'];
                            break;
                        case 'drafts':
                        case 'draft':
                            finalLabelIds = ['DRAFT'];
                            break;
                        case 'starred':
                            // 📧 FAVORIS = Messages avec STARRED (peuvent être dans INBOX ou ailleurs)
                            finalLabelIds = ['STARRED'];
                            break;
                        case 'trash':
                            finalLabelIds = ['TRASH'];
                            break;
                        case 'spam':
                            finalLabelIds = ['SPAM'];
                            break;
                        default:
                            // Pour les dossiers personnalisés, utiliser le nom comme labelId
                            finalLabelIds = [mailboxStr];
                    }
                    console.log("[Gmail Controller] \u2705 Label final: ".concat(finalLabelIds));
                }
                return [4 /*yield*/, gmailService.getMessages({
                        maxResults: Number(maxResults),
                        pageToken: pageToken,
                        q: q,
                        labelIds: finalLabelIds
                    })];
            case 2:
                result = _d.sent();
                // Renvoyer directement les données pour compatibilité frontend
                res.json(result);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _d.sent();
                console.error('[Gmail Controller] Erreur getMessages:', error_2);
                res.status(500).json({ error: 'Erreur lors de la récupération des messages', details: error_2 === null || error_2 === void 0 ? void 0 : error_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getMessages = getMessages;
/**
 * Récupère un message Gmail spécifique
 */
var getMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, message, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du message manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.getMessageDetails(id)];
            case 2:
                message = _b.sent();
                if (!message) {
                    return [2 /*return*/, res.status(404).json({ error: 'Message non trouvé' })];
                }
                // Renvoyer directement les données pour compatibilité frontend
                res.json(message);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('[Gmail Controller] Erreur getMessage:', error_3);
                res.status(500).json({ error: 'Erreur lors de la récupération du message' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getMessage = getMessage;
/**
 * Envoie un message Gmail (avec support des pièces jointes)
 */
var sendMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, attachments_1, to, subject, body, isHtml, cc, bcc, fromName, gmailService, attachments, files, emailData, result, error_4;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.log('[Gmail Controller] 🚀🚀🚀 === DÉBUT SENDMESSAGE - CONTRÔLEUR ATTEINT (FORMIDABLE) ===');
                console.log('[Gmail Controller] 🎯 Timestamp:', new Date().toISOString());
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                console.log('[Gmail Controller] 📋 Organization ID reçu:', organizationId);
                if (!organizationId) {
                    console.log('[Gmail Controller] ❌ Organization ID manquant');
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                console.log('[Gmail Controller] 🔍 === ANALYSE DES DONNÉES REÇUES (FORMIDABLE) ===');
                console.log('[Gmail Controller] 🔍 RAW req.body:', JSON.stringify(req.body, null, 2));
                console.log('[Gmail Controller] 🔍 Type de req.body:', typeof req.body);
                console.log('[Gmail Controller] 🔍 Clés dans req.body:', Object.keys(req.body || {}));
                console.log('[Gmail Controller] 🔍 RAW req.files:', req.files);
                console.log('[Gmail Controller] 🔍 Type de req.files:', typeof req.files);
                if (req.files && typeof req.files === 'object') {
                    console.log('[Gmail Controller] 🔍 Clés dans req.files:', Object.keys(req.files));
                    if ('attachments' in req.files) {
                        attachments_1 = req.files['attachments'];
                        console.log('[Gmail Controller] 🔍 Attachments trouvés:', Array.isArray(attachments_1) ? attachments_1.length : 1);
                        if (Array.isArray(attachments_1)) {
                            attachments_1.forEach(function (file, index) {
                                console.log('[Gmail Controller] 📎 Fichier', index + 1, ':', {
                                    name: file.name,
                                    size: file.size,
                                    mimetype: file.mimetype
                                });
                            });
                        }
                        else {
                            console.log('[Gmail Controller] 📎 Fichier unique:', {
                                name: attachments_1.name,
                                size: attachments_1.size,
                                mimetype: attachments_1.mimetype
                            });
                        }
                    }
                }
                to = req.body.to;
                subject = req.body.subject;
                body = req.body.body || '';
                isHtml = req.body.isHtml === 'true';
                cc = req.body.cc;
                bcc = req.body.bcc;
                fromName = req.body.fromName;
                console.log('[Gmail Controller] 📧 Données extraites:', {
                    to: to,
                    subject: subject,
                    body: body === null || body === void 0 ? void 0 : body.substring(0, 50),
                    isHtml: isHtml,
                    cc: cc,
                    bcc: bcc,
                    fromName: fromName || 'Par défaut: 2Thier CRM'
                });
                // Validation des champs obligatoires
                if (!to || !subject) {
                    console.log('[Gmail Controller] ❌ Champs obligatoires manquants:', { to: to, subject: subject });
                    return [2 /*return*/, res.status(400).json({ error: 'Destinataire et sujet requis' })];
                }
                console.log('[Gmail Controller] 📤 Envoi email avec', req.files ? Object.keys(req.files) : 'aucun', 'fichiers');
                console.log('[Gmail Controller] 📧 Destinataire:', to, 'Sujet:', subject);
                console.log('[Gmail Controller]  Création du service Gmail...');
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 2:
                gmailService = _c.sent();
                if (!gmailService) {
                    console.log('[Gmail Controller] ❌ Impossible de créer le service Gmail');
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                console.log('[Gmail Controller] ✅ Service Gmail créé avec succès');
                attachments = [];
                if (req.files && typeof req.files === 'object' && 'attachments' in req.files) {
                    files = req.files['attachments'];
                    attachments = Array.isArray(files) ? files : [files];
                }
                console.log('[Gmail Controller] 📎 Nombre de pièces jointes traitées:', attachments.length);
                if (attachments.length > 0) {
                    console.log('[Gmail Controller] 📎 Détails des pièces jointes:', attachments.map(function (f) { return ({
                        filename: f.name,
                        size: f.size,
                        mimetype: f.mimetype
                    }); }));
                }
                emailData = {
                    to: to,
                    subject: subject,
                    body: body || '',
                    isHtml: isHtml || false,
                    cc: cc,
                    bcc: bcc,
                    fromName: fromName || '2Thier CRM', // 🆕 Nom professionnel par défaut
                    attachments: attachments.length > 0 ? attachments.map(function (file) { return ({
                        filename: file.name,
                        content: file.data, // Formidable utilise 'data' au lieu de 'buffer'
                        mimeType: file.mimetype
                    }); }) : undefined
                };
                console.log('[Gmail Controller] 📎 Données email préparées (VERSION ANTI-SPAM):', {
                    to: emailData.to,
                    subject: emailData.subject,
                    fromName: emailData.fromName,
                    attachments: ((_b = emailData.attachments) === null || _b === void 0 ? void 0 : _b.length) || 0
                });
                console.log('[Gmail Controller] 🚀 Appel gmailService.sendEmail...');
                return [4 /*yield*/, gmailService.sendEmail(emailData)];
            case 3:
                result = _c.sent();
                if (!result) {
                    console.log('[Gmail Controller] ❌ Aucun résultat de sendEmail');
                    return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de l\'envoi du message' })];
                }
                console.log('[Gmail Controller] ✅ Email envoyé avec succès:', result);
                res.json({
                    success: true,
                    message: 'Email envoyé avec succès',
                    data: result
                });
                console.log('[Gmail Controller] ✅ Réponse envoyée au client');
                return [3 /*break*/, 5];
            case 4:
                error_4 = _c.sent();
                console.error('[Gmail Controller] ❌❌❌ ERREUR COMPLÈTE sendMessage:', error_4);
                console.error('[Gmail Controller] ❌ Type erreur:', typeof error_4);
                console.error('[Gmail Controller] ❌ Message erreur:', error_4 === null || error_4 === void 0 ? void 0 : error_4.message);
                console.error('[Gmail Controller] ❌ Stack trace:', error_4 === null || error_4 === void 0 ? void 0 : error_4.stack);
                res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.sendMessage = sendMessage;
/**
 * Modifie un message Gmail (marquer comme lu, étoile, etc.)
 */
var modifyMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, _a, action, addLabelIds, removeLabelIds, gmailService, result, _b, error_5;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 17, , 18]);
                organizationId = req.headers['x-organization-id'] || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                _a = req.body, action = _a.action, addLabelIds = _a.addLabelIds, removeLabelIds = _a.removeLabelIds;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du message manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _d.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                result = false;
                if (!(addLabelIds || removeLabelIds)) return [3 /*break*/, 8];
                console.log('[Gmail Controller] Modification des labels:', { addLabelIds: addLabelIds, removeLabelIds: removeLabelIds });
                if (!(addLabelIds && addLabelIds.includes('STARRED'))) return [3 /*break*/, 3];
                return [4 /*yield*/, gmailService.markAsStarred(id, true)];
            case 2:
                result = _d.sent();
                return [3 /*break*/, 7];
            case 3:
                if (!(removeLabelIds && removeLabelIds.includes('STARRED'))) return [3 /*break*/, 5];
                return [4 /*yield*/, gmailService.markAsStarred(id, false)];
            case 4:
                result = _d.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, gmailService.modifyLabels(id, addLabelIds || [], removeLabelIds || [])];
            case 6:
                // Pour les autres labels, utiliser la méthode générale
                result = _d.sent();
                _d.label = 7;
            case 7: return [3 /*break*/, 16];
            case 8:
                if (!action) return [3 /*break*/, 15];
                _b = action;
                switch (_b) {
                    case 'markAsRead': return [3 /*break*/, 9];
                    case 'markAsUnread': return [3 /*break*/, 11];
                }
                return [3 /*break*/, 13];
            case 9: return [4 /*yield*/, gmailService.markAsRead(id, true)];
            case 10:
                result = _d.sent();
                return [3 /*break*/, 14];
            case 11: return [4 /*yield*/, gmailService.markAsRead(id, false)];
            case 12:
                result = _d.sent();
                return [3 /*break*/, 14];
            case 13: return [2 /*return*/, res.status(400).json({ error: 'Action non supportée' })];
            case 14: return [3 /*break*/, 16];
            case 15: return [2 /*return*/, res.status(400).json({ error: 'Action ou modification de labels requis' })];
            case 16:
                res.json({
                    success: result,
                    message: result ? 'Message modifié avec succès' : 'Erreur lors de la modification'
                });
                return [3 /*break*/, 18];
            case 17:
                error_5 = _d.sent();
                console.error('[Gmail Controller] Erreur modifyMessage:', error_5);
                res.status(500).json({ error: 'Erreur lors de la modification du message' });
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); };
exports.modifyMessage = modifyMessage;
/**
 * Supprime un message Gmail
 */
var deleteMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, result, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du message manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.deleteMessage(id)];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Message supprimé avec succès' : 'Erreur lors de la suppression'
                });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _b.sent();
                console.error('[Gmail Controller] Erreur deleteMessage:', error_6);
                res.status(500).json({ error: 'Erreur lors de la suppression du message' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.deleteMessage = deleteMessage;
/**
 * Récupère les labels Gmail
 */
var getLabels = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, gmailService, labels, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.getLabels()];
            case 2:
                labels = _b.sent();
                // Renvoyer directement les données pour compatibilité frontend
                res.json(labels);
                return [3 /*break*/, 4];
            case 3:
                error_7 = _b.sent();
                console.error('[Gmail Controller] Erreur getLabels:', error_7);
                res.status(500).json({ error: 'Erreur lors de la récupération des labels', details: error_7 === null || error_7 === void 0 ? void 0 : error_7.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getLabels = getLabels;
// Fonctions temporaires pour maintenir la compatibilité avec l'ancien système
var trashMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, result, error_8;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du message manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.trashMessage(id)];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Message déplacé vers la corbeille avec succès' : 'Erreur lors de la suppression'
                });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _b.sent();
                console.error('[Gmail Controller] Erreur trashMessage:', error_8);
                res.status(500).json({ error: 'Erreur lors de la suppression du message' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.trashMessage = trashMessage;
var untrashMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, result, error_9;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du message manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.untrashMessage(id)];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Message restauré de la corbeille avec succès' : 'Erreur lors de la restauration'
                });
                return [3 /*break*/, 4];
            case 3:
                error_9 = _b.sent();
                console.error('[Gmail Controller] Erreur untrashMessage:', error_9);
                res.status(500).json({ error: 'Erreur lors de la restauration du message' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.untrashMessage = untrashMessage;
/**
 * Vide complètement la corbeille (suppression définitive de tous les emails TRASH)
 */
var emptyTrash = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, gmailService, result, error_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.emptyTrash()];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Corbeille vidée avec succès' : 'Erreur lors du vidage de la corbeille'
                });
                return [3 /*break*/, 4];
            case 3:
                error_10 = _b.sent();
                console.error('[Gmail Controller] Erreur emptyTrash:', error_10);
                res.status(500).json({ error: 'Erreur lors du vidage de la corbeille' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.emptyTrash = emptyTrash;
var createLabel = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, name_1, gmailService, label, error_11;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                name_1 = req.body.name;
                if (!name_1) {
                    return [2 /*return*/, res.status(400).json({ error: 'Nom du label requis' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.createLabel(name_1)];
            case 2:
                label = _b.sent();
                if (!label) {
                    return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de la création du label' })];
                }
                res.json({
                    success: true,
                    data: label
                });
                return [3 /*break*/, 4];
            case 3:
                error_11 = _b.sent();
                console.error('[Gmail Controller] Erreur createLabel:', error_11);
                res.status(500).json({ error: 'Erreur lors de la création du label' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.createLabel = createLabel;
var updateLabel = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, name_2, gmailService, result, error_12;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                name_2 = req.body.name;
                if (!id || !name_2) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID et nom du label requis' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.updateLabel(id, name_2)];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Label modifié avec succès' : 'Erreur lors de la modification'
                });
                return [3 /*break*/, 4];
            case 3:
                error_12 = _b.sent();
                console.error('[Gmail Controller] Erreur updateLabel:', error_12);
                res.status(500).json({ error: 'Erreur lors de la modification du label' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.updateLabel = updateLabel;
var deleteLabel = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, result, error_13;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du label manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.deleteLabel(id)];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Label supprimé avec succès' : 'Erreur lors de la suppression'
                });
                return [3 /*break*/, 4];
            case 3:
                error_13 = _b.sent();
                console.error('[Gmail Controller] Erreur deleteLabel:', error_13);
                res.status(500).json({ error: 'Erreur lors de la suppression du label' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.deleteLabel = deleteLabel;
var getAttachment = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, messageId, attachmentId, preview, gmailService, attachment, contentType, contentDisposition, filename, fileExtension, error_14;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId);
                // Si pas trouvé dans headers, essayer depuis req.user (système ancien)
                if (!organizationId && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId)) {
                    organizationId = req.user.organizationId;
                }
                // Fallback: retourner une erreur si aucune organisation trouvée
                if (!organizationId) {
                    console.log('[Gmail Controller] ❌ Aucune organisation trouvée pour l\'utilisateur');
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organization ID manquant',
                            message: 'Impossible de déterminer l\'organisation de l\'utilisateur'
                        })];
                }
                _a = req.params, messageId = _a.messageId, attachmentId = _a.attachmentId;
                preview = req.query.preview;
                if (!messageId || !attachmentId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Message ID et Attachment ID requis' })];
                }
                console.log("[Gmail Controller] \uD83D\uDCCE R\u00E9cup\u00E9ration pi\u00E8ce jointe: ".concat(attachmentId, " du message: ").concat(messageId));
                console.log("[Gmail Controller] \uD83C\uDFE2 Organization ID utilis\u00E9: ".concat(organizationId));
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _e.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.getAttachment(messageId, attachmentId)];
            case 2:
                attachment = _e.sent();
                if (!attachment) {
                    return [2 /*return*/, res.status(404).json({ error: 'Pièce jointe non trouvée' })];
                }
                contentType = attachment.mimeType;
                contentDisposition = 'attachment';
                filename = attachment.filename;
                fileExtension = (_d = filename.split('.').pop()) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                // Pour l'aperçu, utiliser 'inline' au lieu de 'attachment'
                if (preview === 'true') {
                    contentDisposition = 'inline';
                    // Ajuster le Content-Type selon l'extension si nécessaire
                    if (fileExtension === 'pdf' && !contentType.includes('pdf')) {
                        contentType = 'application/pdf';
                    }
                    else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension || '')) {
                        if (fileExtension === 'png')
                            contentType = 'image/png';
                        else if (['jpg', 'jpeg'].includes(fileExtension))
                            contentType = 'image/jpeg';
                        else if (fileExtension === 'gif')
                            contentType = 'image/gif';
                        else if (fileExtension === 'webp')
                            contentType = 'image/webp';
                    }
                }
                // Headers pour l'aperçu ou le téléchargement
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', "".concat(contentDisposition, "; filename=\"").concat(filename, "\""));
                // Headers supplémentaires pour l'aperçu (PDF et autres)
                if (preview === 'true') {
                    // Permettre l'affichage dans iframe
                    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
                    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
                    // Headers de cache pour l'aperçu
                    res.setHeader('Cache-Control', 'public, max-age=3600');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    // Pour les PDF spécifiquement
                    if (contentType === 'application/pdf') {
                        res.setHeader('Accept-Ranges', 'bytes');
                    }
                }
                console.log("[Gmail Controller] \u2705 Serving attachment: ".concat(filename, ", Type: ").concat(contentType, ", Disposition: ").concat(contentDisposition));
                res.send(attachment.data);
                return [3 /*break*/, 4];
            case 3:
                error_14 = _e.sent();
                console.error('[Gmail Controller] Erreur getAttachment:', error_14);
                res.status(500).json({
                    error: 'Erreur lors de la récupération de la pièce jointe',
                    details: error_14 instanceof Error ? error_14.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getAttachment = getAttachment;
/**
 * Récupère tous les brouillons
 */
var getDrafts = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, gmailService, result, error_15;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.getDrafts()];
            case 2:
                result = _b.sent();
                res.json(result);
                return [3 /*break*/, 4];
            case 3:
                error_15 = _b.sent();
                console.error('[Gmail Controller] Erreur getDrafts:', error_15);
                res.status(500).json({ error: 'Erreur lors de la récupération des brouillons' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getDrafts = getDrafts;
/**
 * Sauvegarde un email en brouillon (création ou mise à jour)
 */
var saveDraft = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, to, subject, body, isHtml, cc, bcc, draftId, gmailService, result, error_16;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                _a = req.body, to = _a.to, subject = _a.subject, body = _a.body, isHtml = _a.isHtml, cc = _a.cc, bcc = _a.bcc, draftId = _a.draftId;
                if (!to || !subject) {
                    return [2 /*return*/, res.status(400).json({ error: 'Destinataire et sujet requis' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _c.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.saveDraft({
                        to: to,
                        subject: subject,
                        body: body || '',
                        isHtml: isHtml || false,
                        cc: cc,
                        bcc: bcc,
                        draftId: draftId // Pour mise à jour d'un brouillon existant
                    })];
            case 2:
                result = _c.sent();
                if (result) {
                    res.json({
                        success: true,
                        message: draftId ? 'Brouillon mis à jour avec succès' : 'Brouillon sauvegardé avec succès',
                        data: result
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la sauvegarde du brouillon'
                    });
                }
                return [3 /*break*/, 4];
            case 3:
                error_16 = _c.sent();
                console.error('[Gmail Controller] Erreur saveDraft:', error_16);
                res.status(500).json({ error: 'Erreur lors de la sauvegarde du brouillon' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.saveDraft = saveDraft;
/**
 * Supprime un brouillon
 */
var deleteDraft = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, result, error_17;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du brouillon manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.deleteDraft(id)];
            case 2:
                result = _b.sent();
                res.json({
                    success: result,
                    message: result ? 'Brouillon supprimé avec succès' : 'Erreur lors de la suppression'
                });
                return [3 /*break*/, 4];
            case 3:
                error_17 = _b.sent();
                console.error('[Gmail Controller] Erreur deleteDraft:', error_17);
                res.status(500).json({ error: 'Erreur lors de la suppression du brouillon' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.deleteDraft = deleteDraft;
/**
 * Envoie un brouillon
 */
var sendDraft = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, id, gmailService, result, error_18;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(401).json({ error: 'Organization ID manquant dans la requête' })];
                }
                id = req.params.id;
                if (!id) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID du brouillon manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                if (!gmailService) {
                    return [2 /*return*/, res.status(401).json({ error: 'Google non connecté pour cette organisation' })];
                }
                return [4 /*yield*/, gmailService.sendDraft(id)];
            case 2:
                result = _b.sent();
                if (result) {
                    res.json({
                        success: true,
                        message: 'Brouillon envoyé avec succès',
                        data: result
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: 'Erreur lors de l\'envoi du brouillon'
                    });
                }
                return [3 /*break*/, 4];
            case 3:
                error_18 = _b.sent();
                console.error('[Gmail Controller] Erreur sendDraft:', error_18);
                res.status(500).json({ error: 'Erreur lors de l\'envoi du brouillon' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.sendDraft = sendDraft;
// Petit endpoint de santé pour diagnostiquer les 500 rapidement
var health = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, gmailService, e_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = req.headers['x-organization-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(200).json({ ok: false, reason: 'organizationId manquant' })];
                }
                return [4 /*yield*/, index_1.GoogleGmailService.create(organizationId)];
            case 1:
                gmailService = _b.sent();
                return [2 /*return*/, res.status(200).json({ ok: !!gmailService })];
            case 2:
                e_1 = _b.sent();
                return [2 /*return*/, res.status(200).json({ ok: false, reason: e_1 === null || e_1 === void 0 ? void 0 : e_1.message })];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.health = health;
