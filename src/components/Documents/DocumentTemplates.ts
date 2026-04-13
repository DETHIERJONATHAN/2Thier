/**
 * DocumentTemplates.ts
 * 
 * Templates de documents pré-construits pour le PageBuilder.
 * Chaque template contient une liste de modules préconfigurés avec leurs positions et thèmes.
 */

import { MODULE_REGISTRY } from './ModuleRegistry';
import { ModuleInstance } from './types';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'devis' | 'facture' | 'commande' | 'contrat' | 'autre';
  preview?: string; // URL preview image
  modules: TemplateModule[];
  defaultPageSettings?: {
    format: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: { top: number; right: number; bottom: number; left: number };
  };
}

export interface TemplateModule {
  moduleType: string;
  theme?: string;
  config?: Record<string, unknown>;
  order: number;
}

/**
 * Helper pour créer un module de template avec des valeurs par défaut
 */
const createModule = (
  moduleType: string, 
  order: number, 
  theme?: string, 
  configOverrides?: Record<string, unknown>
): TemplateModule => ({
  moduleType,
  order,
  theme,
  config: configOverrides,
});

/**
 * TEMPLATE 1: Devis Classique
 * Structure professionnelle standard pour devis B2B
 */
export const QUOTE_CLASSIC: DocumentTemplate = {
  id: 'quote-classic',
  name: 'Devis Classique',
  description: 'Structure professionnelle standard avec en-tête entreprise, informations client, tableau de prix et conditions',
  icon: '📋',
  category: 'devis',
  modules: [
    createModule('DOCUMENT_HEADER', 1, 'classic', {
      layout: 'side-by-side',
      showLogo: true,
      showTVA: true,
    }),
    createModule('DOCUMENT_INFO', 2, 'classic', {
      layout: 'horizontal',
      showReference: true,
      showDate: true,
      showValidity: true,
      showObject: true,
      validityDays: 30,
      referencePrefix: 'DEV-',
      objectLabel: 'Objet du devis',
    }),
    createModule('TEXT_BLOCK', 3, 'default', {
      content: 'Suite à votre demande, nous avons le plaisir de vous soumettre notre offre de prix pour les prestations suivantes :',
      alignment: 'left',
    }),
    createModule('PRICING_TABLE', 4, 'professional', {
      showQuantity: true,
      showUnit: true,
      showDiscount: true,
      showTVA: true,
      currency: '€',
      tvaRate: 21,
    }),
    createModule('TOTALS_SUMMARY', 5, 'boxed', {
      showHT: true,
      showTVA: true,
      showTTC: true,
      showRemise: true,
      currency: '€',
      tvaRate: 21,
    }),
    createModule('VALIDITY_NOTICE', 6, 'warning', {
      validityDays: 30,
      showExpirationDate: true,
      warningText: 'Ce devis est valable {validityDays} jours à compter de sa date d\'émission.',
    }),
    createModule('TEXT_BLOCK', 7, 'default', {
      content: '**Conditions de paiement :** 30% à la commande, solde à la livraison.\n\n**Délai de réalisation :** À définir selon planning.',
      alignment: 'left',
    }),
    createModule('SIGNATURE_BLOCK', 8, 'professional', {
      showDate: true,
      showClientSignature: true,
      showCompanySignature: true,
      mentionText: 'Bon pour accord',
    }),
    createModule('DOCUMENT_FOOTER', 9, 'minimal', {
      showCompanyInfo: true,
      showBankInfo: true,
      showPagination: true,
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 15, bottom: 20, left: 15 },
  },
};

/**
 * TEMPLATE 2: Devis Moderne
 * Design contemporain avec accents de couleur
 */
export const QUOTE_MODERN: DocumentTemplate = {
  id: 'quote-modern',
  name: 'Devis Moderne',
  description: 'Design contemporain avec mise en page aérée et accents colorés',
  icon: '✨',
  category: 'devis',
  modules: [
    createModule('COMPANY_HEADER', 1, 'modern', {
      layout: 'horizontal',
      showLogo: true,
      showTVA: true,
      showEmail: true,
      showPhone: true,
    }),
    createModule('CLIENT_HEADER', 2, 'modern', {
      layout: 'card',
      showClientName: true,
      showAddress: true,
      showContact: true,
      showEmail: true,
      showPhone: true,
    }),
    createModule('DOCUMENT_INFO', 3, 'modern', {
      layout: 'inline',
      showReference: true,
      showDate: true,
      showValidity: true,
      showObject: true,
      validityDays: 30,
      referencePrefix: 'Q-',
    }),
    createModule('SPACER', 4, 'default', { height: 20 }),
    createModule('PRICING_TABLE', 5, 'modern', {
      showQuantity: true,
      showUnit: true,
      showDiscount: true,
      showTVA: true,
      currency: '€',
      tvaRate: 21,
      alternateRows: true,
    }),
    createModule('TOTALS_SUMMARY', 6, 'modern', {
      showHT: true,
      showTVA: true,
      showTTC: true,
      highlightTotal: true,
      currency: '€',
    }),
    createModule('SPACER', 7, 'default', { height: 15 }),
    createModule('VALIDITY_NOTICE', 8, 'info', {
      validityDays: 30,
      showExpirationDate: true,
    }),
    createModule('PAYMENT_INFO', 9, 'modern', {
      showIBAN: true,
      showBIC: true,
      showPaymentTerms: true,
      paymentTerms: '30 jours fin de mois',
    }),
    createModule('SIGNATURE_BLOCK', 10, 'modern', {
      showDate: true,
      showClientSignature: true,
      mentionText: 'Lu et approuvé',
    }),
    createModule('DOCUMENT_FOOTER', 11, 'modern', {
      showCompanyInfo: true,
      showPagination: true,
      layout: 'centered',
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 25, right: 20, bottom: 25, left: 20 },
  },
};

/**
 * TEMPLATE 3: Bon de Commande
 * Simplifié sans conditions détaillées
 */
export const ORDER_FORM: DocumentTemplate = {
  id: 'order-form',
  name: 'Bon de Commande',
  description: 'Document simplifié pour confirmer une commande client',
  icon: '🛒',
  category: 'commande',
  modules: [
    createModule('DOCUMENT_HEADER', 1, 'classic', {
      layout: 'side-by-side',
      showLogo: true,
      showTVA: true,
    }),
    createModule('DOCUMENT_INFO', 2, 'boxed', {
      layout: 'horizontal',
      showReference: true,
      showDate: true,
      showValidity: false,
      showObject: true,
      referencePrefix: 'BC-',
      objectLabel: 'Référence commande client',
    }),
    createModule('TEXT_BLOCK', 3, 'highlight', {
      content: '**CONFIRMATION DE COMMANDE**\n\nNous accusons réception de votre commande et vous confirmons les éléments suivants :',
      alignment: 'center',
    }),
    createModule('PRICING_TABLE', 4, 'professional', {
      showQuantity: true,
      showUnit: true,
      showDiscount: false,
      showTVA: true,
      currency: '€',
      tvaRate: 21,
    }),
    createModule('TOTALS_SUMMARY', 5, 'boxed', {
      showHT: true,
      showTVA: true,
      showTTC: true,
      currency: '€',
    }),
    createModule('TEXT_BLOCK', 6, 'default', {
      content: '**Délai de livraison estimé :** {lead.deliveryDelay}\n\n**Conditions de paiement :** Selon accord commercial',
      alignment: 'left',
    }),
    createModule('SIGNATURE_BLOCK', 7, 'simple', {
      showDate: true,
      showCompanySignature: true,
      mentionText: 'Pour la société',
    }),
    createModule('DOCUMENT_FOOTER', 8, 'minimal', {
      showCompanyInfo: true,
      showPagination: true,
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 15, bottom: 15, left: 15 },
  },
};

/**
 * TEMPLATE 4: Contrat de Service
 * Multi-sections avec numérotation
 */
export const CONTRACT: DocumentTemplate = {
  id: 'contract',
  name: 'Contrat de Service',
  description: 'Document contractuel avec sections numérotées et mentions légales',
  icon: '📜',
  category: 'contrat',
  modules: [
    createModule('COMPANY_HEADER', 1, 'minimal', {
      layout: 'centered',
      showLogo: true,
      showTVA: false,
    }),
    createModule('TEXT_BLOCK', 2, 'title', {
      content: '# CONTRAT DE PRESTATION DE SERVICES',
      alignment: 'center',
    }),
    createModule('DOCUMENT_INFO', 3, 'minimal', {
      layout: 'horizontal',
      showReference: true,
      showDate: true,
      showValidity: false,
      referencePrefix: 'CTR-',
    }),
    createModule('TEXT_BLOCK', 4, 'section', {
      content: '## ENTRE LES SOUSSIGNÉS\n\n**Le Prestataire :**\n{org.name}, {org.legalForm}\nSiège social : {org.address}\nTVA : {org.tva}\nReprésenté par : {org.representative}\n\n**Le Client :**\n{lead.company}\nAdresse : {lead.address}\nReprésenté par : {lead.contact}',
      alignment: 'left',
    }),
    createModule('TEXT_BLOCK', 5, 'section', {
      content: '## ARTICLE 1 - OBJET DU CONTRAT\n\nLe présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s\'engage à fournir au Client les services suivants :\n\n{quote.description}',
      alignment: 'left',
    }),
    createModule('PRICING_TABLE', 6, 'minimal', {
      showQuantity: true,
      showUnit: true,
      showDiscount: false,
      showTVA: true,
      currency: '€',
    }),
    createModule('TEXT_BLOCK', 7, 'section', {
      content: '## ARTICLE 2 - DURÉE\n\nLe présent contrat est conclu pour une durée de {quote.duration} à compter de sa signature.',
      alignment: 'left',
    }),
    createModule('TEXT_BLOCK', 8, 'section', {
      content: '## ARTICLE 3 - CONDITIONS FINANCIÈRES\n\nLe prix total des prestations s\'élève à **{quote.totalTTC} € TTC**.\n\nModalités de paiement : {quote.paymentTerms}',
      alignment: 'left',
    }),
    createModule('TEXT_BLOCK', 9, 'section', {
      content: '## ARTICLE 4 - OBLIGATIONS DES PARTIES\n\n**4.1 Obligations du Prestataire**\n- Exécuter les prestations avec diligence et professionnalisme\n- Respecter les délais convenus\n- Informer le Client de tout obstacle\n\n**4.2 Obligations du Client**\n- Fournir les informations nécessaires\n- Régler les factures aux échéances prévues\n- Faciliter l\'accès aux locaux si nécessaire',
      alignment: 'left',
    }),
    createModule('TEXT_BLOCK', 10, 'section', {
      content: '## ARTICLE 5 - CONFIDENTIALITÉ\n\nLes parties s\'engagent à garder confidentielles toutes les informations échangées dans le cadre du présent contrat.',
      alignment: 'left',
    }),
    createModule('TEXT_BLOCK', 11, 'legal', {
      content: '## ARTICLE 6 - DROIT APPLICABLE\n\nLe présent contrat est soumis au droit belge. Tout litige sera de la compétence exclusive des tribunaux de {org.jurisdiction}.',
      alignment: 'left',
    }),
    createModule('SPACER', 12, 'default', { height: 30 }),
    createModule('TEXT_BLOCK', 13, 'default', {
      content: 'Fait en deux exemplaires originaux,\n\nÀ _________________, le _________________',
      alignment: 'center',
    }),
    createModule('SIGNATURE_BLOCK', 14, 'dual', {
      showDate: false,
      showClientSignature: true,
      showCompanySignature: true,
      mentionText: 'Lu et approuvé, bon pour accord',
      clientLabel: 'Le Client',
      companyLabel: 'Le Prestataire',
    }),
    createModule('DOCUMENT_FOOTER', 15, 'legal', {
      showCompanyInfo: true,
      showPagination: true,
      showLegalMentions: true,
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 25, right: 25, bottom: 25, left: 25 },
  },
};

/**
 * TEMPLATE 5: Facture
 * Document comptable avec mentions légales obligatoires
 */
export const INVOICE: DocumentTemplate = {
  id: 'invoice',
  name: 'Facture',
  description: 'Facture professionnelle avec toutes les mentions légales obligatoires',
  icon: '🧾',
  category: 'facture',
  modules: [
    createModule('DOCUMENT_HEADER', 1, 'professional', {
      layout: 'side-by-side',
      showLogo: true,
      showTVA: true,
    }),
    createModule('TEXT_BLOCK', 2, 'title', {
      content: '# FACTURE',
      alignment: 'center',
    }),
    createModule('DOCUMENT_INFO', 3, 'boxed', {
      layout: 'grid',
      showReference: true,
      showDate: true,
      showValidity: false,
      showObject: true,
      referencePrefix: 'FAC-',
      objectLabel: 'Réf. commande',
      customFields: [
        { label: 'Date d\'échéance', value: '{invoice.dueDate}' },
      ],
    }),
    createModule('PRICING_TABLE', 4, 'professional', {
      showQuantity: true,
      showUnit: true,
      showDiscount: true,
      showTVA: true,
      showTVAColumn: true,
      currency: '€',
      tvaRate: 21,
    }),
    createModule('TOTALS_SUMMARY', 5, 'professional', {
      showHT: true,
      showTVA: true,
      showTTC: true,
      showRemise: true,
      showAcompte: true,
      showNetAPayer: true,
      currency: '€',
      highlightNetAPayer: true,
    }),
    createModule('PAYMENT_INFO', 6, 'highlighted', {
      showIBAN: true,
      showBIC: true,
      showPaymentTerms: true,
      showCommunication: true,
      communication: '+++{invoice.structuredComm}+++',
      paymentTerms: 'Paiement à 30 jours',
    }),
    createModule('TEXT_BLOCK', 7, 'warning', {
      content: '⚠️ **En cas de non-paiement à l\'échéance**, des intérêts de retard de 10% par an seront automatiquement appliqués, ainsi qu\'une indemnité forfaitaire de 40€ pour frais de recouvrement.',
      alignment: 'left',
    }),
    createModule('DOCUMENT_FOOTER', 8, 'legal', {
      showCompanyInfo: true,
      showBankInfo: true,
      showPagination: true,
      showLegalMentions: true,
      legalText: 'TVA non applicable, art. 293 B du CGI | Assurance RC Pro n°XXX',
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 20, left: 15 },
  },
};

/**
 * TEMPLATE 6: Note de Crédit
 * Document d'avoir
 */
export const CREDIT_NOTE: DocumentTemplate = {
  id: 'credit-note',
  name: 'Note de Crédit',
  description: 'Avoir pour annulation ou remboursement partiel',
  icon: '↩️',
  category: 'facture',
  modules: [
    createModule('DOCUMENT_HEADER', 1, 'professional', {
      layout: 'side-by-side',
      showLogo: true,
      showTVA: true,
    }),
    createModule('TEXT_BLOCK', 2, 'title', {
      content: '# NOTE DE CRÉDIT',
      alignment: 'center',
    }),
    createModule('DOCUMENT_INFO', 3, 'boxed', {
      layout: 'grid',
      showReference: true,
      showDate: true,
      referencePrefix: 'NC-',
      customFields: [
        { label: 'Facture concernée', value: '{creditNote.originalInvoice}' },
        { label: 'Motif', value: '{creditNote.reason}' },
      ],
    }),
    createModule('PRICING_TABLE', 4, 'professional', {
      showQuantity: true,
      showUnit: true,
      showTVA: true,
      currency: '€',
      negativeValues: true,
    }),
    createModule('TOTALS_SUMMARY', 5, 'professional', {
      showHT: true,
      showTVA: true,
      showTTC: true,
      currency: '€',
      negativeValues: true,
      label: 'Montant à créditer',
    }),
    createModule('TEXT_BLOCK', 6, 'info', {
      content: 'Ce montant sera déduit de votre prochaine facture ou remboursé sur demande.',
      alignment: 'center',
    }),
    createModule('DOCUMENT_FOOTER', 7, 'legal', {
      showCompanyInfo: true,
      showPagination: true,
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 20, left: 15 },
  },
};

/**
 * TEMPLATE 7: Devis Expertise Énergétique
 * Design professionnel style 2THIER avec bandeau décoratif
 */
export const QUOTE_ENERGY_EXPERTISE: DocumentTemplate = {
  id: 'quote-energy-expertise',
  name: 'Devis Expertise Énergétique',
  description: 'Devis professionnel style 2THIER avec design vert/bleu et illustrations',
  icon: '⚡',
  category: 'devis',
  modules: [
    // 1. En-tête avec logo 2THIER à gauche + Référence DEVIS à droite
    createModule('DOCUMENT_HEADER', 1, 'modern', {
      layout: 'side-by-side',
      showLogo: true,
      logo: '/printable/logo-2thier.png',
      logoSize: 100,
      showCompanyInfo: false, // Logo seul à gauche
      showClientInfo: false,  // On utilise un module séparé
    }),
    // 2. Bloc référence devis (coin supérieur droit)
    createModule('DOCUMENT_INFO', 2, 'header', {
      layout: 'stacked',
      documentType: 'DEVIS',
      showReference: true,
      referencePrefix: 'N°',
      showDate: true,
      datePrefix: 'Date:',
      showValidUntil: true,
      validUntilPrefix: 'Validité:',
      validityDays: 30,
      showObject: false,
    }),
    createModule('SPACER', 3, 'empty', { height: 20 }),
    // 3. Client à gauche + Entreprise à droite
    createModule('CLIENT_HEADER', 4, 'boxed', {
      title: 'Client :',
      showTitle: true,
      showName: true,
      showCompany: true,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      showTVA: false,
    }),
    createModule('COMPANY_HEADER', 5, 'modern', {
      layout: 'vertical',
      showLogo: false, // Logo déjà en haut
      showName: true,
      showAddress: true,
      showPhone: false,
      showEmail: true,
      showWebsite: true,
      showTVA: false,
    }),
    createModule('SPACER', 6, 'empty', { height: 15 }),
    // 4. Objet du devis (bandeau bleu)
    createModule('TEXT_BLOCK', 7, 'highlight', {
      content: '**Objet :** Audit Énergétique et Optimisation de Performance',
      alignment: 'left',
      backgroundColor: '#0e4a6f',
      textColor: '#ffffff',
      padding: 12,
    }),
    createModule('SPACER', 8, 'empty', { height: 20 }),
    // 5. Tableau des prestations
    createModule('QUOTE_PRESTATIONS_TABLE', 9, 'energy-blue', {
      title: 'DÉTAIL DES PRESTATIONS',
      headerBgColor: '#0e4a6f',
      headerTextColor: '#ffffff',
      showQuantity: true,
      showUnitPrice: true,
      showTotal: true,
      currency: '€',
      alternateRowColor: '#f8fafc',
      items: [
        { description: 'Audit énergétique complet', quantity: 1, unitPrice: 750, total: 750 },
        { description: 'Analyse thermographique', quantity: 1, unitPrice: 350, total: 350 },
        { description: 'Rapport de recommendations', quantity: 1, unitPrice: 400, total: 400 },
        { description: 'Suivi et conseil énergétique', quantity: 'Forfait', unitPrice: 300, total: 300 },
      ],
    }),
    createModule('SPACER', 10, 'empty', { height: 10 }),
    // 6. Totaux à droite
    createModule('TOTALS_SUMMARY', 11, 'boxed', {
      showTotalHT: true,
      showTVA: true,
      showTotalTTC: true,
      tvaRate: 20,
      currency: '€',
      alignment: 'right',
      totalHT: '1 800,00 €',
      tvaAmount: '360,00 €',
      totalTTC: '2 160,00 €',
    }),
    createModule('SPACER', 12, 'empty', { height: 20 }),
    // 7. Conditions + Notes (deux colonnes)
    createModule('CONDITIONS_NOTES_BLOCK', 13, 'bordered', {
      conditionsTitle: 'Conditions de Paiement :',
      conditions: ['50% à la commande', 'Solde à la livraison du rapport'],
      notesTitle: 'Notes :',
      notes: 'Valable 30 jours. Déplacement inclus.',
      layout: 'two-columns',
    }),
    createModule('SPACER', 14, 'empty', { height: 25 }),
    // 8. Bloc acceptation (à droite)
    createModule('ACCEPTANCE_BLOCK', 15, 'boxed', {
      title: 'Pour Acceptation :',
      showName: true,
      showDate: true,
      showSignature: true,
      nameLabel: 'Nom :',
      dateLabel: 'Date :',
      signatureLabel: 'Signature :',
      lineWidth: 200,
    }),
    createModule('SPACER', 16, 'empty', { height: 30 }),
    // 9. Bandeau décoratif (skyline verte)
    createModule('DECORATIVE_BANNER', 17, 'energy', {
      style: 'energy-skyline',
      primaryColor: '#22c55e',
      secondaryColor: '#15803d',
      showGradient: true,
      height: 100,
    }),
    // 10. Pied de page services
    createModule('SERVICES_FOOTER', 18, 'energy', {
      services: [
        { icon: '⚡', label: 'Audit Énergétique' },
        { icon: '🌡️', label: 'Thermographie' },
        { icon: '✅', label: 'Conseil en Efficacité Énergétique' },
      ],
      showCompanyName: true,
      showAddress: true,
      showPhone: true,
      showEmail: true,
      separatorColor: '#0ea5e9',
      textColor: '#0284c7',
    }),
  ],
  defaultPageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 10, left: 15 },
  },
};

/**
 * Liste de tous les templates disponibles
 */
export const ALL_TEMPLATES: DocumentTemplate[] = [
  QUOTE_CLASSIC,
  QUOTE_MODERN,
  QUOTE_ENERGY_EXPERTISE,
  ORDER_FORM,
  CONTRACT,
  INVOICE,
  CREDIT_NOTE,
];

/**
 * Obtenir les templates par catégorie
 */
export const getTemplatesByCategory = (category: DocumentTemplate['category']): DocumentTemplate[] => {
  return ALL_TEMPLATES.filter(t => t.category === category);
};

/**
 * Obtenir un template par son ID
 */
export const getTemplateById = (id: string): DocumentTemplate | undefined => {
  return ALL_TEMPLATES.find(t => t.id === id);
};

/**
 * Convertir un template en modules utilisables par le PageBuilder
 * Génère les IDs uniques et applique les configs par défaut
 */
export const instantiateTemplate = (template: DocumentTemplate): ModuleInstance[] => {
  return template.modules.map((tm, index) => {
    const moduleDefinition = MODULE_REGISTRY.find(m => m.id === tm.moduleType);
    if (!moduleDefinition) {
      console.warn(`Module type "${tm.moduleType}" not found in registry`);
      return null;
    }

    // Fusionner la config par défaut avec les overrides du template
    const instance: ModuleInstance = {
      id: `${tm.moduleType.toLowerCase()}-${Date.now()}-${index}`,
      moduleId: tm.moduleType,
      order: tm.order,
      config: {
        ...moduleDefinition.defaultConfig,
        ...tm.config,
      },
      themeId: tm.theme || moduleDefinition.themes?.[0]?.id || 'default',
    };

    return instance;
  }).filter((m): m is ModuleInstance => m !== null);
};

/**
 * Catégories de templates avec métadonnées
 */
export const TEMPLATE_CATEGORIES = [
  { 
    id: 'devis', 
    name: 'Devis', 
    icon: '📋',
    description: 'Propositions commerciales et offres de prix',
    color: '#1890ff',
  },
  { 
    id: 'facture', 
    name: 'Factures', 
    icon: '🧾',
    description: 'Documents comptables et notes de crédit',
    color: '#52c41a',
  },
  { 
    id: 'commande', 
    name: 'Commandes', 
    icon: '🛒',
    description: 'Bons de commande et confirmations',
    color: '#faad14',
  },
  { 
    id: 'contrat', 
    name: 'Contrats', 
    icon: '📜',
    description: 'Documents contractuels et accords',
    color: '#722ed1',
  },
  { 
    id: 'autre', 
    name: 'Autres', 
    icon: '📄',
    description: 'Documents divers',
    color: '#8c8c8c',
  },
] as const;

export default {
  ALL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplateById,
  getTemplatesByCategory,
  instantiateTemplate,
};
