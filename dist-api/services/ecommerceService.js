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
exports.EcommerceService = exports.ECOMMERCE_PLATFORMS = void 0;
// Service d'intégration e-commerce - Architecture scalable
var prisma_1 = require("../lib/prisma");
// Plateformes e-commerce supportées
exports.ECOMMERCE_PLATFORMS = {
    shopify: {
        id: 'shopify',
        name: 'shopify',
        displayName: 'Shopify',
        icon: 'ShopOutlined',
        webhookSupport: true,
        fields: [
            {
                key: 'shop_domain',
                label: 'Domaine de la boutique',
                type: 'url',
                required: true,
                placeholder: 'https://votre-boutique.myshopify.com'
            },
            {
                key: 'access_token',
                label: 'Token d\'accès privé',
                type: 'password',
                required: true
            },
            {
                key: 'webhook_secret',
                label: 'Secret webhook',
                type: 'password',
                required: false
            }
        ]
    },
    woocommerce: {
        id: 'woocommerce',
        name: 'woocommerce',
        displayName: 'WooCommerce',
        icon: 'ShoppingCartOutlined',
        webhookSupport: true,
        fields: [
            {
                key: 'site_url',
                label: 'URL du site WordPress',
                type: 'url',
                required: true,
                placeholder: 'https://votre-site.com'
            },
            {
                key: 'consumer_key',
                label: 'Clé consommateur',
                type: 'text',
                required: true
            },
            {
                key: 'consumer_secret',
                label: 'Secret consommateur',
                type: 'password',
                required: true
            }
        ]
    },
    prestashop: {
        id: 'prestashop',
        name: 'prestashop',
        displayName: 'PrestaShop',
        icon: 'ShopOutlined',
        webhookSupport: false,
        fields: [
            {
                key: 'shop_url',
                label: 'URL de la boutique',
                type: 'url',
                required: true,
                placeholder: 'https://votre-boutique.com'
            },
            {
                key: 'webservice_key',
                label: 'Clé webservice',
                type: 'password',
                required: true
            }
        ]
    },
    magento: {
        id: 'magento',
        name: 'magento',
        displayName: 'Magento',
        icon: 'ShoppingOutlined',
        webhookSupport: true,
        fields: [
            {
                key: 'store_url',
                label: 'URL du magasin',
                type: 'url',
                required: true,
                placeholder: 'https://votre-magasin.com'
            },
            {
                key: 'access_token',
                label: 'Token d\'accès admin',
                type: 'password',
                required: true
            }
        ]
    },
    custom: {
        id: 'custom',
        name: 'custom',
        displayName: 'API personnalisée',
        icon: 'ApiOutlined',
        webhookSupport: true,
        fields: [
            {
                key: 'api_url',
                label: 'URL de l\'API',
                type: 'url',
                required: true,
                placeholder: 'https://api.votre-boutique.com'
            },
            {
                key: 'api_key',
                label: 'Clé API',
                type: 'password',
                required: true
            },
            {
                key: 'auth_type',
                label: 'Type d\'authentification',
                type: 'select',
                required: true,
                options: [
                    { value: 'bearer', label: 'Bearer Token' },
                    { value: 'basic', label: 'Basic Auth' },
                    { value: 'api_key', label: 'API Key' }
                ]
            }
        ]
    }
};
var EcommerceService = /** @class */ (function () {
    function EcommerceService() {
    }
    /**
     * Récupère toutes les intégrations e-commerce d'une organisation
     */
    EcommerceService.getIntegrations = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.ecommerceIntegration.findMany({
                        where: {
                            organizationId: organizationId,
                            active: true
                        },
                        include: {
                            Product: {
                                where: {
                                    status: 'active'
                                }
                            },
                            Order: {
                                orderBy: {
                                    orderDate: 'desc'
                                },
                                take: 10 // 10 dernières commandes
                            }
                        }
                    })];
            });
        });
    };
    /**
     * Crée une nouvelle intégration e-commerce
     */
    EcommerceService.createIntegration = function (organizationId, platform, name, url, config, credentials) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.ecommerceIntegration.create({
                        data: {
                            organizationId: organizationId,
                            platform: platform,
                            name: name,
                            url: url,
                            config: config,
                            credentials: credentials,
                            status: 'connected'
                        }
                    })];
            });
        });
    };
    /**
     * Test de connexion à une intégration
     */
    EcommerceService.testConnection = function (integrationId) {
        return __awaiter(this, void 0, void 0, function () {
            var integration, isConnected, _a, status_1, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, prisma_1.prisma.ecommerceIntegration.findUnique({
                            where: { id: integrationId }
                        })];
                    case 1:
                        integration = _b.sent();
                        if (!integration) {
                            throw new Error('Intégration non trouvée');
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 15, , 17]);
                        isConnected = false;
                        _a = integration.platform;
                        switch (_a) {
                            case 'shopify': return [3 /*break*/, 3];
                            case 'woocommerce': return [3 /*break*/, 5];
                            case 'prestashop': return [3 /*break*/, 7];
                            case 'magento': return [3 /*break*/, 9];
                            case 'custom': return [3 /*break*/, 11];
                        }
                        return [3 /*break*/, 13];
                    case 3: return [4 /*yield*/, this.testShopifyConnection(integration)];
                    case 4:
                        isConnected = _b.sent();
                        return [3 /*break*/, 13];
                    case 5: return [4 /*yield*/, this.testWooCommerceConnection(integration)];
                    case 6:
                        isConnected = _b.sent();
                        return [3 /*break*/, 13];
                    case 7: return [4 /*yield*/, this.testPrestaShopConnection(integration)];
                    case 8:
                        isConnected = _b.sent();
                        return [3 /*break*/, 13];
                    case 9: return [4 /*yield*/, this.testMagentoConnection(integration)];
                    case 10:
                        isConnected = _b.sent();
                        return [3 /*break*/, 13];
                    case 11: return [4 /*yield*/, this.testCustomConnection(integration)];
                    case 12:
                        isConnected = _b.sent();
                        return [3 /*break*/, 13];
                    case 13:
                        status_1 = isConnected ? 'connected' : 'error';
                        return [4 /*yield*/, prisma_1.prisma.ecommerceIntegration.update({
                                where: { id: integrationId },
                                data: {
                                    status: status_1,
                                    lastSync: new Date()
                                }
                            })];
                    case 14:
                        _b.sent();
                        return [2 /*return*/, { connected: isConnected, status: status_1 }];
                    case 15:
                        error_1 = _b.sent();
                        return [4 /*yield*/, prisma_1.prisma.ecommerceIntegration.update({
                                where: { id: integrationId },
                                data: {
                                    status: 'error',
                                    lastSync: new Date()
                                }
                            })];
                    case 16:
                        _b.sent();
                        throw error_1;
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Synchronise les produits depuis la plateforme e-commerce
     */
    EcommerceService.syncProducts = function (integrationId) {
        return __awaiter(this, void 0, void 0, function () {
            var integration, products, _a, _i, products_1, productData;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, prisma_1.prisma.ecommerceIntegration.findUnique({
                            where: { id: integrationId }
                        })];
                    case 1:
                        integration = _b.sent();
                        if (!integration) {
                            throw new Error('Intégration non trouvée');
                        }
                        products = [];
                        _a = integration.platform;
                        switch (_a) {
                            case 'shopify': return [3 /*break*/, 2];
                            case 'woocommerce': return [3 /*break*/, 4];
                            case 'prestashop': return [3 /*break*/, 6];
                            case 'magento': return [3 /*break*/, 8];
                            case 'custom': return [3 /*break*/, 10];
                        }
                        return [3 /*break*/, 12];
                    case 2: return [4 /*yield*/, this.fetchShopifyProducts(integration)];
                    case 3:
                        products = _b.sent();
                        return [3 /*break*/, 12];
                    case 4: return [4 /*yield*/, this.fetchWooCommerceProducts(integration)];
                    case 5:
                        products = _b.sent();
                        return [3 /*break*/, 12];
                    case 6: return [4 /*yield*/, this.fetchPrestaShopProducts(integration)];
                    case 7:
                        products = _b.sent();
                        return [3 /*break*/, 12];
                    case 8: return [4 /*yield*/, this.fetchMagentoProducts(integration)];
                    case 9:
                        products = _b.sent();
                        return [3 /*break*/, 12];
                    case 10: return [4 /*yield*/, this.fetchCustomProducts(integration)];
                    case 11:
                        products = _b.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        _i = 0, products_1 = products;
                        _b.label = 13;
                    case 13:
                        if (!(_i < products_1.length)) return [3 /*break*/, 16];
                        productData = products_1[_i];
                        return [4 /*yield*/, prisma_1.prisma.product.upsert({
                                where: {
                                    organizationId_externalId: {
                                        organizationId: integration.organizationId,
                                        externalId: productData.externalId || ''
                                    }
                                },
                                create: __assign(__assign({ organizationId: integration.organizationId, ecommerceIntegrationId: integrationId }, productData), { images: JSON.stringify(productData.images || []), metadata: JSON.stringify(productData.metadata || {}) }),
                                update: __assign(__assign({}, productData), { images: JSON.stringify(productData.images || []), metadata: JSON.stringify(productData.metadata || {}) })
                            })];
                    case 14:
                        _b.sent();
                        _b.label = 15;
                    case 15:
                        _i++;
                        return [3 /*break*/, 13];
                    case 16: 
                    // Enregistrement de l'événement analytique
                    return [4 /*yield*/, prisma_1.prisma.analyticsEvent.create({
                            data: {
                                organizationId: integration.organizationId,
                                eventType: 'products_synced',
                                source: 'ecommerce',
                                sourceId: integrationId,
                                data: {
                                    platform: integration.platform,
                                    productCount: products.length
                                }
                            }
                        })];
                    case 17:
                        // Enregistrement de l'événement analytique
                        _b.sent();
                        return [2 /*return*/, products.length];
                }
            });
        });
    };
    /**
     * Synchronise les commandes depuis la plateforme e-commerce
     */
    EcommerceService.syncOrders = function (integrationId, fromDate) {
        return __awaiter(this, void 0, void 0, function () {
            var integration, orders, _a, _i, orders_1, orderData;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, prisma_1.prisma.ecommerceIntegration.findUnique({
                            where: { id: integrationId }
                        })];
                    case 1:
                        integration = _b.sent();
                        if (!integration) {
                            throw new Error('Intégration non trouvée');
                        }
                        orders = [];
                        _a = integration.platform;
                        switch (_a) {
                            case 'shopify': return [3 /*break*/, 2];
                            case 'woocommerce': return [3 /*break*/, 4];
                            case 'prestashop': return [3 /*break*/, 6];
                            case 'magento': return [3 /*break*/, 8];
                            case 'custom': return [3 /*break*/, 10];
                        }
                        return [3 /*break*/, 12];
                    case 2: return [4 /*yield*/, this.fetchShopifyOrders(integration, fromDate)];
                    case 3:
                        orders = _b.sent();
                        return [3 /*break*/, 12];
                    case 4: return [4 /*yield*/, this.fetchWooCommerceOrders(integration, fromDate)];
                    case 5:
                        orders = _b.sent();
                        return [3 /*break*/, 12];
                    case 6: return [4 /*yield*/, this.fetchPrestaShopOrders(integration, fromDate)];
                    case 7:
                        orders = _b.sent();
                        return [3 /*break*/, 12];
                    case 8: return [4 /*yield*/, this.fetchMagentoOrders(integration, fromDate)];
                    case 9:
                        orders = _b.sent();
                        return [3 /*break*/, 12];
                    case 10: return [4 /*yield*/, this.fetchCustomOrders(integration, fromDate)];
                    case 11:
                        orders = _b.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        _i = 0, orders_1 = orders;
                        _b.label = 13;
                    case 13:
                        if (!(_i < orders_1.length)) return [3 /*break*/, 17];
                        orderData = orders_1[_i];
                        return [4 /*yield*/, prisma_1.prisma.order.upsert({
                                where: {
                                    organizationId_externalId: {
                                        organizationId: integration.organizationId,
                                        externalId: orderData.externalId || ''
                                    }
                                },
                                create: __assign(__assign({ organizationId: integration.organizationId, ecommerceIntegrationId: integrationId }, orderData), { billingAddress: JSON.stringify(orderData.billingAddress || {}), shippingAddress: JSON.stringify(orderData.shippingAddress || {}), items: JSON.stringify(orderData.items || []), metadata: JSON.stringify(orderData.metadata || {}) }),
                                update: __assign(__assign({}, orderData), { billingAddress: JSON.stringify(orderData.billingAddress || {}), shippingAddress: JSON.stringify(orderData.shippingAddress || {}), items: JSON.stringify(orderData.items || []), metadata: JSON.stringify(orderData.metadata || {}) })
                            })];
                    case 14:
                        _b.sent();
                        // Créer un événement analytique pour chaque nouvelle commande
                        return [4 /*yield*/, prisma_1.prisma.analyticsEvent.create({
                                data: {
                                    organizationId: integration.organizationId,
                                    eventType: 'order_placed',
                                    source: 'ecommerce',
                                    sourceId: orderData.externalId || '',
                                    data: {
                                        platform: integration.platform,
                                        orderNumber: orderData.orderNumber,
                                        customerEmail: orderData.customerEmail
                                    },
                                    value: orderData.totalAmount
                                }
                            })];
                    case 15:
                        // Créer un événement analytique pour chaque nouvelle commande
                        _b.sent();
                        _b.label = 16;
                    case 16:
                        _i++;
                        return [3 /*break*/, 13];
                    case 17: return [2 /*return*/, orders.length];
                }
            });
        });
    };
    // Tests de connexion (à implémenter)
    EcommerceService.testShopifyConnection = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter test Shopify
                console.log('Test connexion Shopify:', integration.url);
                return [2 /*return*/, true];
            });
        });
    };
    EcommerceService.testWooCommerceConnection = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter test WooCommerce
                console.log('Test connexion WooCommerce:', integration.url);
                return [2 /*return*/, true];
            });
        });
    };
    EcommerceService.testPrestaShopConnection = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter test PrestaShop
                console.log('Test connexion PrestaShop:', integration.url);
                return [2 /*return*/, true];
            });
        });
    };
    EcommerceService.testMagentoConnection = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter test Magento
                console.log('Test connexion Magento:', integration.url);
                return [2 /*return*/, true];
            });
        });
    };
    EcommerceService.testCustomConnection = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter test API personnalisée
                console.log('Test connexion API personnalisée:', integration.url);
                return [2 /*return*/, true];
            });
        });
    };
    // Récupération des produits (à implémenter)
    EcommerceService.fetchShopifyProducts = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                // TODO: Implémenter récupération produits Shopify
                console.warn('🛍️ [Ecommerce] fetchShopifyProducts non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown'
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchWooCommerceProducts = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                // TODO: Implémenter récupération produits WooCommerce
                console.warn('🛍️ [Ecommerce] fetchWooCommerceProducts non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown'
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchPrestaShopProducts = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                // TODO: Implémenter récupération produits PrestaShop
                console.warn('🛍️ [Ecommerce] fetchPrestaShopProducts non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown'
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchMagentoProducts = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                // TODO: Implémenter récupération produits Magento
                console.warn('🛍️ [Ecommerce] fetchMagentoProducts non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown'
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchCustomProducts = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                // TODO: Implémenter récupération produits API personnalisée
                console.warn('🛍️ [Ecommerce] fetchCustomProducts non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown'
                });
                return [2 /*return*/, []];
            });
        });
    };
    // Récupération des commandes (à implémenter)
    EcommerceService.fetchShopifyOrders = function (integration, fromDate) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                // TODO: Implémenter récupération commandes Shopify
                console.warn('🛒 [Ecommerce] fetchShopifyOrders non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown',
                    fromDate: (_c = fromDate === null || fromDate === void 0 ? void 0 : fromDate.toISOString()) !== null && _c !== void 0 ? _c : null
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchWooCommerceOrders = function (integration, fromDate) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                // TODO: Implémenter récupération commandes WooCommerce
                console.warn('🛒 [Ecommerce] fetchWooCommerceOrders non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown',
                    fromDate: (_c = fromDate === null || fromDate === void 0 ? void 0 : fromDate.toISOString()) !== null && _c !== void 0 ? _c : null
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchPrestaShopOrders = function (integration, fromDate) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                // TODO: Implémenter récupération commandes PrestaShop
                console.warn('🛒 [Ecommerce] fetchPrestaShopOrders non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown',
                    fromDate: (_c = fromDate === null || fromDate === void 0 ? void 0 : fromDate.toISOString()) !== null && _c !== void 0 ? _c : null
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchMagentoOrders = function (integration, fromDate) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                // TODO: Implémenter récupération commandes Magento
                console.warn('🛒 [Ecommerce] fetchMagentoOrders non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown',
                    fromDate: (_c = fromDate === null || fromDate === void 0 ? void 0 : fromDate.toISOString()) !== null && _c !== void 0 ? _c : null
                });
                return [2 /*return*/, []];
            });
        });
    };
    EcommerceService.fetchCustomOrders = function (integration, fromDate) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                // TODO: Implémenter récupération commandes API personnalisée
                console.warn('🛒 [Ecommerce] fetchCustomOrders non implémenté', {
                    integrationId: (_b = (_a = integration === null || integration === void 0 ? void 0 : integration.id) !== null && _a !== void 0 ? _a : integration === null || integration === void 0 ? void 0 : integration.url) !== null && _b !== void 0 ? _b : 'unknown',
                    fromDate: (_c = fromDate === null || fromDate === void 0 ? void 0 : fromDate.toISOString()) !== null && _c !== void 0 ? _c : null
                });
                return [2 /*return*/, []];
            });
        });
    };
    return EcommerceService;
}());
exports.EcommerceService = EcommerceService;
