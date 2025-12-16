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
var googleapis_1 = require("googleapis");
var AutoGoogleAuthService_js_1 = require("./AutoGoogleAuthService.js");
var GmailService = /** @class */ (function () {
    function GmailService() {
    }
    GmailService.prototype.getOAuthClientForUser = function (userId) {
        var authService = AutoGoogleAuthService_js_1.AutoGoogleAuthService.getInstance();
        var oauth2Client = authService.getOAuth2ClientForUser(userId);
        if (!oauth2Client) {
            throw new Error("User ".concat(userId, " is not authenticated with Google."));
        }
        return oauth2Client;
    };
    GmailService.prototype.getGmailClient = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var oauth2Client;
            return __generator(this, function (_a) {
                oauth2Client = this.getOAuthClientForUser(userId);
                return [2 /*return*/, googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client })];
            });
        });
    };
    // Extrait un header spécifique d'une liste de headers
    GmailService.prototype.extractHeader = function (headers, name) {
        var header = headers.find(function (h) { return h.name.toLowerCase() === name.toLowerCase(); });
        return header ? header.value : '';
    };
    // Décode le corps d'un message (Base64URL)
    GmailService.prototype.decodeBody = function (bodyData) {
        if (!bodyData)
            return '';
        return Buffer.from(bodyData, 'base64url').toString('utf-8');
    };
    // Trouve la meilleure partie du corps de l'email à afficher
    GmailService.prototype.getMessageBody = function (payload) {
        var _a, _b, _c;
        var body = '';
        if (payload.parts) {
            // Préférer le HTML
            var htmlPart = payload.parts.find(function (part) { return part.mimeType === 'text/html'; });
            if (htmlPart && ((_a = htmlPart.body) === null || _a === void 0 ? void 0 : _a.data)) {
                body = this.decodeBody(htmlPart.body.data);
            }
            else {
                // Sinon, prendre le texte brut
                var textPart = payload.parts.find(function (part) { return part.mimeType === 'text/plain'; });
                if (textPart && ((_b = textPart.body) === null || _b === void 0 ? void 0 : _b.data)) {
                    body = this.decodeBody(textPart.body.data);
                }
            }
        }
        else if ((_c = payload.body) === null || _c === void 0 ? void 0 : _c.data) {
            body = this.decodeBody(payload.body.data);
        }
        return body;
    };
    GmailService.prototype.listThreads = function (userId, mailbox) {
        return __awaiter(this, void 0, void 0, function () {
            var gmail_1, response, threads, threadDetailsPromises, detailedThreads, formattedThreads, error_1, gaxiosError;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getGmailClient(userId)];
                    case 1:
                        gmail_1 = _b.sent();
                        return [4 /*yield*/, gmail_1.users.threads.list({
                                userId: 'me',
                                labelIds: [mailbox.toUpperCase()],
                                maxResults: 30,
                            })];
                    case 2:
                        response = _b.sent();
                        threads = response.data.threads || [];
                        if (threads.length === 0) {
                            return [2 /*return*/, []];
                        }
                        threadDetailsPromises = threads.map(function (thread) {
                            return gmail_1.users.threads.get({ userId: 'me', id: thread.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'To', 'Date'] });
                        });
                        return [4 /*yield*/, Promise.all(threadDetailsPromises)];
                    case 3:
                        detailedThreads = _b.sent();
                        formattedThreads = detailedThreads.map(function (res) {
                            var _a, _b, _c, _d, _e, _f;
                            var firstMessage = (_a = res.data.messages) === null || _a === void 0 ? void 0 : _a[0];
                            var headers = ((_b = firstMessage === null || firstMessage === void 0 ? void 0 : firstMessage.payload) === null || _b === void 0 ? void 0 : _b.headers) || [];
                            return {
                                id: res.data.id,
                                subject: _this.extractHeader(headers, 'Subject'),
                                snippet: res.data.snippet || '',
                                timestamp: (firstMessage === null || firstMessage === void 0 ? void 0 : firstMessage.internalDate) ? new Date(parseInt(firstMessage.internalDate, 10)).toISOString() : new Date().toISOString(),
                                from: _this.extractHeader(headers, 'From'),
                                to: _this.extractHeader(headers, 'To'),
                                unread: ((_c = firstMessage === null || firstMessage === void 0 ? void 0 : firstMessage.labelIds) === null || _c === void 0 ? void 0 : _c.includes('UNREAD')) || false,
                                hasAttachments: ((_e = (_d = firstMessage === null || firstMessage === void 0 ? void 0 : firstMessage.payload) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e.some(function (p) { return p.filename; })) || false,
                                isStarred: ((_f = firstMessage === null || firstMessage === void 0 ? void 0 : firstMessage.labelIds) === null || _f === void 0 ? void 0 : _f.includes('STARRED')) || false,
                                messages: [], // Sera chargé au clic
                            };
                        });
                        return [2 /*return*/, formattedThreads];
                    case 4:
                        error_1 = _b.sent();
                        gaxiosError = error_1;
                        console.error('Error listing Gmail threads:', gaxiosError.message);
                        if (((_a = gaxiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
                            throw new Error('Authentication failed. Please reconnect your Google account.');
                        }
                        throw new Error('Could not retrieve Gmail threads.');
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    GmailService.prototype.getThreadDetails = function (userId, threadId) {
        return __awaiter(this, void 0, void 0, function () {
            var gmail, response, thread, messages, firstMessageHeaders, error_2;
            var _this = this;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getGmailClient(userId)];
                    case 1:
                        gmail = _h.sent();
                        return [4 /*yield*/, gmail.users.threads.get({
                                userId: 'me',
                                id: threadId,
                            })];
                    case 2:
                        response = _h.sent();
                        thread = response.data;
                        if (!thread || !thread.messages) {
                            throw new Error('Thread not found or empty.');
                        }
                        messages = thread.messages.map(function (msg) {
                            var _a, _b;
                            var headers = ((_a = msg.payload) === null || _a === void 0 ? void 0 : _a.headers) || [];
                            return {
                                id: msg.id,
                                body: _this.getMessageBody(msg.payload),
                                from: _this.extractHeader(headers, 'From'),
                                to: _this.extractHeader(headers, 'To'),
                                subject: _this.extractHeader(headers, 'Subject'),
                                timestamp: msg.internalDate ? new Date(parseInt(msg.internalDate, 10)).toISOString() : new Date().toISOString(),
                                isRead: !((_b = msg.labelIds) === null || _b === void 0 ? void 0 : _b.includes('UNREAD')),
                                headers: headers.reduce(function (acc, h) {
                                    var _a;
                                    return (__assign(__assign({}, acc), (_a = {}, _a[h.name] = h.value, _a)));
                                }, {}),
                            };
                        });
                        firstMessageHeaders = ((_b = (_a = thread.messages[0]) === null || _a === void 0 ? void 0 : _a.payload) === null || _b === void 0 ? void 0 : _b.headers) || [];
                        return [2 /*return*/, {
                                id: thread.id,
                                subject: this.extractHeader(firstMessageHeaders, 'Subject'),
                                snippet: thread.snippet || '',
                                timestamp: ((_c = thread.messages[0]) === null || _c === void 0 ? void 0 : _c.internalDate) ? new Date(parseInt(thread.messages[0].internalDate, 10)).toISOString() : new Date().toISOString(),
                                from: this.extractHeader(firstMessageHeaders, 'From'),
                                to: this.extractHeader(firstMessageHeaders, 'To'),
                                unread: ((_e = (_d = thread.messages[0]) === null || _d === void 0 ? void 0 : _d.labelIds) === null || _e === void 0 ? void 0 : _e.includes('UNREAD')) || false,
                                hasAttachments: thread.messages.some(function (m) { var _a, _b; return (_b = (_a = m.payload) === null || _a === void 0 ? void 0 : _a.parts) === null || _b === void 0 ? void 0 : _b.some(function (p) { return p.filename; }); }),
                                isStarred: ((_g = (_f = thread.messages[0]) === null || _f === void 0 ? void 0 : _f.labelIds) === null || _g === void 0 ? void 0 : _g.includes('STARRED')) || false,
                                messages: messages,
                            }];
                    case 3:
                        error_2 = _h.sent();
                        console.error('Error getting Gmail thread details:', error_2);
                        throw new Error('Could not retrieve thread details.');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GmailService.prototype.sendEmail = function (userId, to, subject, body) {
        return __awaiter(this, void 0, void 0, function () {
            var gmail, userProfile, fromEmail, emailLines, email, response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getGmailClient(userId)];
                    case 1:
                        gmail = _a.sent();
                        return [4 /*yield*/, gmail.users.getProfile({ userId: 'me' })];
                    case 2:
                        userProfile = _a.sent();
                        fromEmail = userProfile.data.emailAddress;
                        if (!fromEmail) {
                            throw new Error("Could not determine user's email address.");
                        }
                        emailLines = [
                            "From: \"".concat(fromEmail, "\" <").concat(fromEmail, ">"),
                            "To: ".concat(to),
                            'Content-type: text/html;charset=iso-8859-1',
                            'MIME-Version: 1.0',
                            "Subject: ".concat(subject),
                            '',
                            body,
                        ];
                        email = emailLines.join('\r\n');
                        return [4 /*yield*/, gmail.users.messages.send({
                                userId: 'me',
                                requestBody: {
                                    raw: Buffer.from(email).toString('base64url'),
                                },
                            })];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 4:
                        error_3 = _a.sent();
                        console.error('Error sending email:', error_3);
                        throw new Error('Could not send email.');
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return GmailService;
}());
exports.default = new GmailService();
