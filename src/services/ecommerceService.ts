// Service d'intégration e-commerce - Architecture scalable
import { prisma } from '../lib/prisma';

export interface EcommercePlatform {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  fields: EcommercePlatformField[];
  webhookSupport: boolean;
}

export interface EcommercePlatformField {
  key: string;
  label: string;
  type: 'text' | 'url' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface ProductData {
  externalId?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency?: string;
  stock?: number;
  sku?: string;
  images?: string[];
  metadata?: Record<string, unknown>;
  status?: 'active' | 'inactive' | 'archived';
}

export interface OrderData {
  externalId?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress?: Record<string, unknown>;
  shippingAddress?: Record<string, unknown>;
  totalAmount: number;
  currency?: string;
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  items: OrderItem[];
  metadata?: Record<string, unknown>;
  orderDate?: Date;
}

export interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

// Plateformes e-commerce supportées
export const ECOMMERCE_PLATFORMS: Record<string, EcommercePlatform> = {
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

export class EcommerceService {
  /**
   * Récupère toutes les intégrations e-commerce d'une organisation
   */
  static async getIntegrations(organizationId: string) {
    return prisma.ecommerceIntegration.findMany({
      where: {
        organizationId,
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
    });
  }

  /**
   * Crée une nouvelle intégration e-commerce
   */
  static async createIntegration(
    organizationId: string,
    platform: string,
    name: string,
    url: string,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ) {
    return prisma.ecommerceIntegration.create({
      data: {
        organizationId,
        platform,
        name,
        url,
        config,
        credentials,
        status: 'connected'
      }
    });
  }

  /**
   * Test de connexion à une intégration
   */
  static async testConnection(integrationId: string) {
    const integration = await prisma.ecommerceIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error('Intégration non trouvée');
    }

    try {
      // Test spécifique selon la plateforme
      let isConnected = false;
      
      switch (integration.platform) {
        case 'shopify':
          isConnected = await this.testShopifyConnection(integration);
          break;
        case 'woocommerce':
          isConnected = await this.testWooCommerceConnection(integration);
          break;
        case 'prestashop':
          isConnected = await this.testPrestaShopConnection(integration);
          break;
        case 'magento':
          isConnected = await this.testMagentoConnection(integration);
          break;
        case 'custom':
          isConnected = await this.testCustomConnection(integration);
          break;
      }

      const status = isConnected ? 'connected' : 'error';
      
      await prisma.ecommerceIntegration.update({
        where: { id: integrationId },
        data: {
          status,
          lastSync: new Date()
        }
      });

      return { connected: isConnected, status };
    } catch (error) {
      await prisma.ecommerceIntegration.update({
        where: { id: integrationId },
        data: {
          status: 'error',
          lastSync: new Date()
        }
      });
      throw error;
    }
  }

  /**
   * Synchronise les produits depuis la plateforme e-commerce
   */
  static async syncProducts(integrationId: string) {
    const integration = await prisma.ecommerceIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error('Intégration non trouvée');
    }

    let products: ProductData[] = [];

    switch (integration.platform) {
      case 'shopify':
        products = await this.fetchShopifyProducts(integration);
        break;
      case 'woocommerce':
        products = await this.fetchWooCommerceProducts(integration);
        break;
      case 'prestashop':
        products = await this.fetchPrestaShopProducts(integration);
        break;
      case 'magento':
        products = await this.fetchMagentoProducts(integration);
        break;
      case 'custom':
        products = await this.fetchCustomProducts(integration);
        break;
    }

    // Sauvegarde des produits en base
    for (const productData of products) {
      await prisma.product.upsert({
        where: {
          organizationId_externalId: {
            organizationId: integration.organizationId,
            externalId: productData.externalId || ''
          }
        },
        create: {
          organizationId: integration.organizationId,
          ecommerceIntegrationId: integrationId,
          ...productData,
          images: JSON.stringify(productData.images || []),
          metadata: JSON.stringify(productData.metadata || {})
        },
        update: {
          ...productData,
          images: JSON.stringify(productData.images || []),
          metadata: JSON.stringify(productData.metadata || {})
        }
      });
    }

    // Enregistrement de l'événement analytique
    await prisma.analyticsEvent.create({
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
    });

    return products.length;
  }

  /**
   * Synchronise les commandes depuis la plateforme e-commerce
   */
  static async syncOrders(integrationId: string, fromDate?: Date) {
    const integration = await prisma.ecommerceIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error('Intégration non trouvée');
    }

    let orders: OrderData[] = [];

    switch (integration.platform) {
      case 'shopify':
        orders = await this.fetchShopifyOrders(integration, fromDate);
        break;
      case 'woocommerce':
        orders = await this.fetchWooCommerceOrders(integration, fromDate);
        break;
      case 'prestashop':
        orders = await this.fetchPrestaShopOrders(integration, fromDate);
        break;
      case 'magento':
        orders = await this.fetchMagentoOrders(integration, fromDate);
        break;
      case 'custom':
        orders = await this.fetchCustomOrders(integration, fromDate);
        break;
    }

    // Sauvegarde des commandes en base
    for (const orderData of orders) {
      await prisma.order.upsert({
        where: {
          organizationId_externalId: {
            organizationId: integration.organizationId,
            externalId: orderData.externalId || ''
          }
        },
        create: {
          organizationId: integration.organizationId,
          ecommerceIntegrationId: integrationId,
          ...orderData,
          billingAddress: JSON.stringify(orderData.billingAddress || {}),
          shippingAddress: JSON.stringify(orderData.shippingAddress || {}),
          items: JSON.stringify(orderData.items || []),
          metadata: JSON.stringify(orderData.metadata || {})
        },
        update: {
          ...orderData,
          billingAddress: JSON.stringify(orderData.billingAddress || {}),
          shippingAddress: JSON.stringify(orderData.shippingAddress || {}),
          items: JSON.stringify(orderData.items || []),
          metadata: JSON.stringify(orderData.metadata || {})
        }
      });

      // Créer un événement analytique pour chaque nouvelle commande
      await prisma.analyticsEvent.create({
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
      });
    }

    return orders.length;
  }

  // Tests de connexion (à implémenter)
  private static async testShopifyConnection(integration: { url: string; credentials: any }): Promise<boolean> {
    // TODO: Implémenter test Shopify
    console.log('Test connexion Shopify:', integration.url);
    return true;
  }

  private static async testWooCommerceConnection(integration: { url: string; credentials: any }): Promise<boolean> {
    // TODO: Implémenter test WooCommerce
    console.log('Test connexion WooCommerce:', integration.url);
    return true;
  }

  private static async testPrestaShopConnection(integration: { url: string; credentials: any }): Promise<boolean> {
    // TODO: Implémenter test PrestaShop
    console.log('Test connexion PrestaShop:', integration.url);
    return true;
  }

  private static async testMagentoConnection(integration: { url: string; credentials: any }): Promise<boolean> {
    // TODO: Implémenter test Magento
    console.log('Test connexion Magento:', integration.url);
    return true;
  }

  private static async testCustomConnection(integration: { url: string; credentials: any }): Promise<boolean> {
    // TODO: Implémenter test API personnalisée
    console.log('Test connexion API personnalisée:', integration.url);
    return true;
  }

  // Récupération des produits (à implémenter)
  private static async fetchShopifyProducts(integration: any): Promise<ProductData[]> {
    // TODO: Implémenter récupération produits Shopify
    return [];
  }

  private static async fetchWooCommerceProducts(integration: any): Promise<ProductData[]> {
    // TODO: Implémenter récupération produits WooCommerce
    return [];
  }

  private static async fetchPrestaShopProducts(integration: any): Promise<ProductData[]> {
    // TODO: Implémenter récupération produits PrestaShop
    return [];
  }

  private static async fetchMagentoProducts(integration: any): Promise<ProductData[]> {
    // TODO: Implémenter récupération produits Magento
    return [];
  }

  private static async fetchCustomProducts(integration: any): Promise<ProductData[]> {
    // TODO: Implémenter récupération produits API personnalisée
    return [];
  }

  // Récupération des commandes (à implémenter)
  private static async fetchShopifyOrders(integration: any, fromDate?: Date): Promise<OrderData[]> {
    // TODO: Implémenter récupération commandes Shopify
    return [];
  }

  private static async fetchWooCommerceOrders(integration: any, fromDate?: Date): Promise<OrderData[]> {
    // TODO: Implémenter récupération commandes WooCommerce
    return [];
  }

  private static async fetchPrestaShopOrders(integration: any, fromDate?: Date): Promise<OrderData[]> {
    // TODO: Implémenter récupération commandes PrestaShop
    return [];
  }

  private static async fetchMagentoOrders(integration: any, fromDate?: Date): Promise<OrderData[]> {
    // TODO: Implémenter récupération commandes Magento
    return [];
  }

  private static async fetchCustomOrders(integration: any, fromDate?: Date): Promise<OrderData[]> {
    // TODO: Implémenter récupération commandes API personnalisée
    return [];
  }
}
