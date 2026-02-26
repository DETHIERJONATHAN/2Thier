/**
 * 📄 Document PDF Renderer
 * 
 * Génère un PDF à partir d'un DocumentTemplate et de ses sections configurées.
 * Utilise les données TBL (tblData) et les infos client (lead) pour substituer les variables.
 */

import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import * as path from 'path';
import * as fs from 'fs';
import { calculateVerticalCenterOffset } from './textAlignmentUtils';

// ============================================================
// TYPES
// ============================================================

// Types pour les conditions (copiés depuis ConditionEditorModal)
type ConditionRule = {
  id: string;
  action: 'SHOW' | 'HIDE' | 'ADD_CONTENT';
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_OR_EQUAL' | 'LESS_OR_EQUAL' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
  fieldRef: string;
  compareValue: string | number;
  logicOperator?: 'AND' | 'OR';
};

type ConditionalConfig = {
  enabled: boolean;
  rules: ConditionRule[];
  addContent?: string;
  showContent?: string;
  hideContent?: string;
};

interface DocumentTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  logoUrl?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
}

interface DocumentSection {
  id: string;
  type: string;
  order: number;
  config: Record<string, any>;
  linkedNodeIds?: string[];
  linkedVariables?: string[];
  translations?: Record<string, any>;
}

interface LeadData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  vatNumber?: string;
  address?: string;
  street?: string;
  number?: string;
  box?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  notes?: string;
}

interface OrganizationData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  vatNumber?: string;
  bankAccount?: string;
  website?: string;
  logoUrl?: string;
}

interface QuoteData {
  number?: string;
  date?: string;
  validUntil?: string;
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
  status?: string;
  reference?: string;
}

interface RenderContext {
  template: {
    id: string;
    name: string;
    type: string;
    sections: DocumentSection[];
    theme?: DocumentTheme | null;
  };
  lead: LeadData;
  organization?: OrganizationData;
  quote?: QuoteData;
  tblData: Record<string, any>;
  language: string;
  documentNumber?: string;
}

interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================
// CONSTANTES
// ============================================================

const DEFAULT_THEME: DocumentTheme = {
  primaryColor: '#1890ff',
  secondaryColor: '#52c41a',
  accentColor: '#faad14',
  textColor: '#333333',
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica',
  fontSize: 11
};

const PAGE_BUILDER_WIDTH = 794;
const PAGE_BUILDER_HEIGHT = 1123;
const A4_DIMENSION_TOLERANCE = 0.5;

const TYPE_LABELS: Record<string, string> = {
  QUOTE: 'Devis',
  INVOICE: 'Facture',
  ORDER: 'Bon de commande',
  CONTRACT: 'Contrat',
  PRESENTATION: 'Présentation'
};

// ============================================================
// CLASSE PRINCIPALE
// ============================================================

export class DocumentPdfRenderer {
  private doc: PDFKit.PDFDocument;
  private ctx: RenderContext;
  private theme: DocumentTheme;
  private pageWidth: number = 595.28; // A4
  private pageHeight: number = 841.89; // A4
  private margin: number = 50;
  private contentWidth: number;
  private currentY: number;
  private imageCache: Map<string, Buffer> = new Map(); // Cache pour les images pré-chargées
  private scaleX: number = 1;
  private scaleY: number = 1;
  private scaleFactor: number = 1;
  private isFirstModularPage: boolean = true; // 🔥 Flag pour gérer la pagination multi-pages
  private hasModularPage: boolean = false;
  private unicodeFontName?: string;

  constructor(context: RenderContext) {
    this.ctx = context;
    this.theme = { ...DEFAULT_THEME, ...context.template.theme };
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;

    // 🔥 IMPORTANT: en mode PageBuilder (MODULAR_PAGE), PDFKit ne doit pas appliquer ses marges
    // sinon du texte placé « en bas de page » est automatiquement poussé sur une nouvelle page.
    const hasModularSections = (context.template.sections || []).some(s => s.type === 'MODULAR_PAGE');
    const pdfKitMargin = hasModularSections ? 0 : this.margin;

    this.doc = new (PDFDocument as any)({
      size: 'A4',
      margins: {
        top: pdfKitMargin,
        bottom: pdfKitMargin,
        left: pdfKitMargin,
        right: pdfKitMargin
      },
      autoFirstPage: true,
      // NE PAS utiliser bufferPages - ça complique la gestion des pages
      info: {
        Title: `${TYPE_LABELS[context.template.type] || context.template.type} - ${context.documentNumber || context.template.name}`,
        Author: context.organization?.name || '2Thier CRM',
        Subject: TYPE_LABELS[context.template.type] || context.template.type,
        CreationDate: new Date()
      }
    });

    // Police unicode fallback (symboles/accents). En production, si le chemin n'existe pas,
    // on retombe simplement sur Helvetica.
    try {
      const dejavuPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
      if (fs.existsSync(dejavuPath)) {
        this.doc.registerFont('DejaVuSans', dejavuPath);
        this.unicodeFontName = 'DejaVuSans';
      }
    } catch {
      // ignore
    }

    this.ensureDocumentIsA4();

    this.scaleX = this.pageWidth / PAGE_BUILDER_WIDTH;
    this.scaleY = this.pageHeight / PAGE_BUILDER_HEIGHT;
    this.scaleFactor = Math.min(this.scaleX, this.scaleY);
  }

  /**
   * Rend un contenu par défaut quand aucune section n'est configurée
   * Affiche les données du lead et les données TBL disponibles
   */
  private renderDefaultContent(): void {
    // En-tête
      this.doc
        .fillColor(this.theme.primaryColor || '#1890ff')
        .fontSize(this.scaleFontSize(24))
      .font('Helvetica-Bold')
      .text(this.ctx.template.name || 'Document', this.margin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      });
    
    this.currentY += 40;
    
    // Sous-titre avec type et numéro
      this.doc
        .fillColor(this.theme.textColor || '#333333')
        .fontSize(this.scaleFontSize(14))
      .font('Helvetica')
      .text(
        `${TYPE_LABELS[this.ctx.template.type] || this.ctx.template.type} ${this.ctx.documentNumber ? `N° ${this.ctx.documentNumber}` : ''}`,
        this.margin, 
        this.currentY,
        { align: 'center', width: this.contentWidth }
      );
    
    this.currentY += 40;

    // Ligne de séparation
      this.doc
        .strokeColor(this.theme.primaryColor || '#1890ff')
        .lineWidth(this.scaleFontSize(2))
      .moveTo(this.margin, this.currentY)
      .lineTo(this.pageWidth - this.margin, this.currentY)
      .stroke();
    
    this.currentY += 30;

    // Section Client si présent
    if (this.ctx.lead && (this.ctx.lead.firstName || this.ctx.lead.lastName || this.ctx.lead.company)) {
        this.doc
          .fillColor(this.theme.primaryColor || '#1890ff')
          .fontSize(this.scaleFontSize(16))
        .font('Helvetica-Bold')
        .text('👤 Client', this.margin, this.currentY);
      
      this.currentY += 25;

      this.doc
        .fillColor(this.theme.textColor || '#333333')
          .fontSize(this.scaleFontSize(11))
        .font('Helvetica');

      const clientInfo = [];
      if (this.ctx.lead.company) clientInfo.push(`Société: ${this.ctx.lead.company}`);
      const fullName = [this.ctx.lead.firstName, this.ctx.lead.lastName].filter(Boolean).join(' ');
      if (fullName) clientInfo.push(`Nom: ${fullName}`);
      if (this.ctx.lead.email) clientInfo.push(`Email: ${this.ctx.lead.email}`);
      if (this.ctx.lead.phone) clientInfo.push(`Tél: ${this.ctx.lead.phone}`);
      if (this.ctx.lead.address) clientInfo.push(`Adresse: ${this.ctx.lead.address}`);

      for (const info of clientInfo) {
        this.doc.text(info, this.margin, this.currentY, { width: this.contentWidth });
        this.currentY += 16;
      }

      this.currentY += 20;
    }

    // Section données TBL si présentes
    console.log('📄 [PDF RENDERER] Vérification tblData:', {
      hasTblData: !!this.ctx.tblData,
      tblDataKeys: Object.keys(this.ctx.tblData || {}),
      keysCount: Object.keys(this.ctx.tblData || {}).length
    });
    
    if (this.ctx.tblData && Object.keys(this.ctx.tblData).length > 0) {
      console.log('📄 [PDF RENDERER] ✅ Rendu des données TBL...');
      this.doc
        .fillColor(this.theme.primaryColor || '#1890ff')
          .fontSize(this.scaleFontSize(16))
        .font('Helvetica-Bold')
        .text('📊 Données du formulaire', this.margin, this.currentY);
      
      this.currentY += 25;

      this.doc
        .fillColor(this.theme.textColor || '#333333')
          .fontSize(this.scaleFontSize(10))
        .font('Helvetica');

      // Afficher les données TBL de manière lisible
      this.renderTblDataRecursive(this.ctx.tblData, 0);
    }

    // Message si le template n'a pas de sections
    this.currentY += 30;
    this.doc
      .fillColor('#888888')
        .fontSize(this.scaleFontSize(10))
      .font('Helvetica-Oblique')
      .text(
        '⚠️ Ce template n\'a pas de sections configurées. Utilisez le Page Builder pour personnaliser la mise en page.',
        this.margin,
        this.currentY,
        { align: 'center', width: this.contentWidth }
      );
  }

  /**
   * Affiche les données TBL de manière récursive
   */
  private renderTblDataRecursive(data: Record<string, any>, indent: number): void {
    const maxIndent = 3; // Limite de profondeur
    if (indent > maxIndent) return;

    for (const [key, value] of Object.entries(data)) {
      // Ignorer les clés internes/techniques
      if (key.startsWith('_') || key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      // Vérifier la limite de page
      if (this.currentY > this.pageHeight - 100) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      const indentX = this.margin + (indent * 15);
      
      if (value === null || value === undefined || value === '') {
        continue; // Ignorer les valeurs vides
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Objet imbriqué
        this.doc
          .font('Helvetica-Bold')
          .text(`${key}:`, indentX, this.currentY);
        this.currentY += 14;
        this.renderTblDataRecursive(value, indent + 1);
      } else if (Array.isArray(value)) {
        // Tableau
        this.doc
          .font('Helvetica-Bold')
          .text(`${key}: [${value.length} éléments]`, indentX, this.currentY);
        this.currentY += 14;
      } else {
        // Valeur simple
        const displayValue = String(value).substring(0, 100); // Limiter la longueur
        this.doc
          .font('Helvetica')
          .text(`${key}: ${displayValue}`, indentX, this.currentY, { width: this.contentWidth - (indent * 15) });
        this.currentY += 14;
      }
    }
  }

  /**
   * Collecte toutes les URLs d'images des sections pour les pré-charger
   */
  private collectImageUrls(): string[] {
    const urls: string[] = [];
    
    for (const section of this.ctx.template.sections || []) {
      const config = section.config || {};
      
      // Pour les pages modulaires, parcourir les modules
      if (section.type === 'MODULAR_PAGE' && config.modules) {
        for (const mod of config.modules) {
          const modConfig = mod.config || {};
          // Module IMAGE
          if (mod.moduleType === 'IMAGE') {
            const url = modConfig.image || modConfig.url || modConfig.src;
            if (url && url.startsWith('http')) urls.push(url);
          }
          // Module BACKGROUND avec image
          if (mod.moduleType === 'BACKGROUND' && modConfig.type === 'image') {
            const url = modConfig.image || modConfig.url;
            if (url && url.startsWith('http')) urls.push(url);
          }
        }
      }
      
      // Images dans d'autres sections
      if (config.image && config.image.startsWith('http')) urls.push(config.image);
      if (config.backgroundImage && config.backgroundImage.startsWith('http')) urls.push(config.backgroundImage);
      if (config.logoUrl && config.logoUrl.startsWith('http')) urls.push(config.logoUrl);
    }
    
    // Image du thème
    if (this.theme.logoUrl && this.theme.logoUrl.startsWith('http')) urls.push(this.theme.logoUrl);
    if (this.theme.headerImageUrl && this.theme.headerImageUrl.startsWith('http')) urls.push(this.theme.headerImageUrl);
    
    return [...new Set(urls)]; // Dédoublonner
  }

  /**
   * Pré-charge les images externes en parallèle
   */
  private async preloadImages(): Promise<void> {
    const urls = this.collectImageUrls();
    if (urls.length === 0) return;
    
    console.log(`📄 [PDF] Pré-chargement de ${urls.length} images externes...`);
    
    const fetchPromises = urls.map(async (url) => {
      try {
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(10000) // Timeout 10s
        });
        
        if (!response.ok) {
          console.warn(`📄 [PDF] Image non accessible: ${url} (${response.status})`);
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        this.imageCache.set(url, buffer);
        console.log(`📄 [PDF] ✅ Image chargée: ${url.substring(0, 60)}...`);
      } catch (error) {
        console.warn(`📄 [PDF] Échec chargement image: ${url}`, error);
      }
    });
    
    await Promise.all(fetchPromises);
    console.log(`📄 [PDF] ${this.imageCache.size}/${urls.length} images pré-chargées`);
  }

  /**
   * Génère le PDF complet
   */
  async render(): Promise<Buffer> {
    // Pré-charger les images externes avant le rendu
    await this.preloadImages();
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);

      this.doc.pipe(stream);

      try {
        console.log('📄 [PDF RENDERER] Début du rendu', {
          templateId: this.ctx.template.id,
          templateName: this.ctx.template.name,
          sectionsCount: this.ctx.template.sections?.length || 0,
          hasLead: !!this.ctx.lead,
          hasTblData: !!this.ctx.tblData && Object.keys(this.ctx.tblData).length > 0
        });

        // Trier les sections par ordre
        const sortedSections = [...(this.ctx.template.sections || [])].sort((a, b) => a.order - b.order);

        console.log('📄 [PDF RENDERER] Sections à rendre:', sortedSections.map(s => s.type));

        // Si aucune section, rendre un document par défaut avec les données TBL
        if (sortedSections.length === 0) {
          console.log('📄 [PDF RENDERER] ⚠️ Aucune section configurée, rendu par défaut');
          this.renderDefaultContent();
        } else {
          // Rendre chaque section
          for (const section of sortedSections) {
            console.log(`📄 [PDF RENDERER] Rendu section: ${section.type} (${section.id})`);
            this.renderSection(section);
          }
        }

        console.log('📄 [PDF RENDERER] ✅ Rendu terminé');

        // Footer global uniquement si ce n'est PAS un document PageBuilder
        if (!this.hasModularPage) {
          this.renderFooter();
        }

        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Rend une section selon son type
   */
  private renderSection(section: DocumentSection): void {
    const config = section.config || {};
    
    // Vérifier si la section est visible
    if (config.visible === false) return;

    // Vérifier les conditions d'affichage si configurées
    if (config.conditionalDisplay && !this.evaluateCondition(config.conditionalDisplay)) {
      return;
    }

    console.log(`📄 [PDF] Rendering section: ${section.type}`);

    switch (section.type) {
      case 'MODULAR_PAGE':
        // 🆕 Rendu d'une page modulaire du Page Builder
        this.renderModularPage(config);
        break;
      case 'COVER_PAGE':
        this.renderCoverPage(config);
        break;
      case 'COMPANY_PRESENTATION':
        this.renderCompanyPresentation(config);
        break;
      case 'PROJECT_SUMMARY':
        this.renderProjectSummary(config);
        break;
      case 'PRICING_TABLE':
        this.renderPricingTable(config);
        break;
      case 'TEXT_BLOCK':
        this.renderTextBlock(config);
        break;
      case 'TERMS_CONDITIONS':
        this.renderTermsConditions(config);
        break;
      case 'SIGNATURE_BLOCK':
        this.renderSignatureBlock(config);
        break;
      case 'CONTACT_INFO':
        this.renderContactInfo(config);
        break;
      case 'TECHNICAL_SPECS':
        this.renderTechnicalSpecs(config);
        break;
      case 'TIMELINE':
        this.renderTimeline(config);
        break;
      case 'IMAGE':
        this.renderImage(config);
        break;
      case 'PAGE_BREAK':
        this.doc.addPage();
        this.currentY = this.margin;
        break;
      case 'CUSTOM_HTML':
        this.renderCustomContent(config);
        break;
      default:
        console.warn(`📄 [PDF] Unknown section type: ${section.type}`);
    }
  }

  private convertPageBuilderRect(position: Record<string, any>): PdfRect {
    const rawX = (position.x ?? 0) * this.scaleX;
    const rawY = (position.y ?? 0) * this.scaleY;
    const rawWidth = (position.width ?? 100) * this.scaleX;
    const rawHeight = (position.height ?? (position.blockHeight ?? 50)) * this.scaleY;

    const safeWidth = this.clamp(rawWidth, 1, this.pageWidth);
    const safeHeight = this.clamp(rawHeight, 1, this.pageHeight);
    const maxX = Math.max(0, this.pageWidth - safeWidth);
    const maxY = Math.max(0, this.pageHeight - safeHeight);
    const safeX = this.clamp(rawX, 0, maxX);
    const safeY = this.clamp(rawY, 0, maxY);

    return {
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight
    };
  }

  private drawBackgroundImage(buffer: Buffer, x: number, y: number, width: number, height: number): void {
    if (!buffer || width <= 0 || height <= 0) return;
    const openImage = (this.doc as any).openImage?.(buffer);
    if (openImage) {
      const imageWidth = openImage.width;
      const imageHeight = openImage.height;
      const coverScale = Math.max(width / imageWidth, height / imageHeight);
      const renderWidth = imageWidth * coverScale;
      const renderHeight = imageHeight * coverScale;
      const offsetX = x - Math.max(0, (renderWidth - width) / 2);
      const offsetY = y - Math.max(0, (renderHeight - height) / 2);
      this.doc.image(buffer, offsetX, offsetY, {
        width: renderWidth,
        height: renderHeight
      });
      return;
    }

    this.doc.image(buffer, x, y, {
      fit: [width, height],
      align: 'center',
      valign: 'center'
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 🔥 Vérifie si du contenu peut tenir dans l'espace restant avant la limite de page
   * Retourne la hauteur disponible (0 si pas de place)
   */
  private getAvailableHeightOnPage(startY: number): number {
    const maxY = this.pageHeight - this.margin;
    const availableHeight = Math.max(0, maxY - startY);
    return availableHeight;
  }

  /**
   * 🔥 Vérifie si du contenu de hauteur donnée peut tenir à une position Y
   */
  private canFitOnPage(startY: number, contentHeight: number): boolean {
    return this.getAvailableHeightOnPage(startY) >= contentHeight;
  }

  private scaleFontSize(size: number): number {
    const scaled = size * this.scaleFactor;
    return Math.max(6, scaled);
  }

  // ============================================================
  // 🆕 RENDU DES PAGES MODULAIRES (PAGE BUILDER)
  // ============================================================

  /**
   * Rend une page modulaire complète du Page Builder
   * Chaque MODULAR_PAGE crée une nouvelle page dans le PDF (sauf la première)
   */
  private renderModularPage(config: Record<string, any>): void {
    this.hasModularPage = true;
    console.log('📄 [PDF] ========================================');
    console.log('📄 [PDF] Rendu page modulaire:', config.name);
    console.log('📄 [PDF] Pages actuelles dans le doc:', (this.doc as any).bufferedPageRange?.()?.count || 'N/A');
    console.log('📄 [PDF] isFirstModularPage:', this.isFirstModularPage);
    
    // 🔥 CORRECTION: Créer une nouvelle page pour chaque MODULAR_PAGE sauf la première
    // La première page est déjà créée par PDFKit à l'initialisation
    if (!this.isFirstModularPage) {
      console.log('📄 [PDF] 📃 Création d\'une nouvelle page PDF');
      this.doc.addPage();
      this.currentY = 0; // Reset Y pour la nouvelle page
    }
    this.isFirstModularPage = false; // Les pages suivantes créeront une nouvelle page
    
    const modules = config.modules || [];
    console.log('📄 [PDF] Nombre de modules:', modules.length);
    
    // Les modules sont positionnés en coordonnées absolues du Page Builder (794x1123 pixels)
    // On les convertit en coordonnées PDF (595.28x841.89 points)

    // Trier les modules: BACKGROUND d'abord (z-index arrière), puis par position Y puis X
    const sortedModules = [...modules].sort((a: any, b: any) => {
      const aType = a.moduleId || a.moduleType || a.type;
      const bType = b.moduleId || b.moduleType || b.type;
      
      // BACKGROUND toujours en premier (derrière tout)
      if (aType === 'BACKGROUND' && bType !== 'BACKGROUND') return -1;
      if (bType === 'BACKGROUND' && aType !== 'BACKGROUND') return 1;
      
      // Sinon trier par position Y puis X
      const aY = a.position?.y ?? 0;
      const bY = b.position?.y ?? 0;
      const aX = a.position?.x ?? 0;
      const bX = b.position?.x ?? 0;
      if (Math.abs(aY - bY) > 5) return aY - bY;
      return aX - bX;
    });

    console.log(`📄 [PDF] Rendu de ${sortedModules.length} modules sur la page`);
    console.log(`📄 [PDF] Ordre des modules:`, sortedModules.map((m: any) => m.moduleId || m.moduleType || m.type));

    // Objectif: si le détail (table) descend, déplacer les modules placés sous la table
    // (conditions, totaux, signatures, footer, etc.) sur la page suivante plutôt que de tronquer.
    // On ne peut pas « reflow » le builder (positions absolues), donc on conserve les positions,
    // mais on pousse le groupe « sous-table » sur la dernière page de la table.
    const backgroundModuleIds = new Set(['BACKGROUND']);
    const flowModuleIds = new Set(['PRICING_TABLE']);

    const getModuleType = (m: any) => m.moduleId || m.moduleType || m.type;
    const getModuleY = (m: any) => Number(m?.position?.y ?? 0);

    const backgroundModules = sortedModules.filter((m: any) => backgroundModuleIds.has(getModuleType(m)));
    const nonBackgroundModules = sortedModules.filter((m: any) => !backgroundModuleIds.has(getModuleType(m)));
    const flowModulesInOrder = nonBackgroundModules.filter((m: any) => flowModuleIds.has(getModuleType(m)));
    let remainingModules = nonBackgroundModules.filter((m: any) => !flowModuleIds.has(getModuleType(m)));

    const renderModularBackground = () => {
      // Fond de page si configuré (pleine page)
      if (config.backgroundColor) {
        this.doc.rect(0, 0, this.pageWidth, this.pageHeight).fill(config.backgroundColor);
      }
      // BACKGROUND modules (image/couleur) au-dessus du fond mais derrière le contenu
      for (const bg of backgroundModules) {
        this.renderModuleAbsolute(bg);
      }
    };

    // Page courante: fond + modules au-dessus des modules flow, puis le(s) flow, puis les modules restants.
    renderModularBackground();

    for (const flowModule of flowModulesInOrder) {
      const flowType = getModuleType(flowModule);
      const flowY = getModuleY(flowModule);

      // Rendre tout ce qui est placé au-dessus (Y strictement inférieur)
      const above = remainingModules.filter((m: any) => getModuleY(m) < flowY);
      for (const m of above) {
        this.renderModuleAbsolute(m);
      }

      // Conserver le reste (Y >= flowY) pour l'après-table
      const belowOrEqual = remainingModules.filter((m: any) => getModuleY(m) >= flowY);

      if (flowType !== 'PRICING_TABLE') {
        // Par sécurité, si on ajoute d'autres flows plus tard
        this.renderModuleAbsolute(flowModule);
        remainingModules = belowOrEqual;
        continue;
      }

      const position = flowModule.position || {};
      const rect = this.convertPageBuilderRect(position);
      const configRaw = flowModule.config || {};

      const conditionResult = this.evaluateModuleConditions(configRaw);
      if (!conditionResult.shouldRender) {
        console.log(`📄 [PDF] Module ${flowType}: SKIPPED (condition false)`);
        remainingModules = belowOrEqual;
        continue;
      }

      // Déterminer où commence la zone « sous-table » (premier module sous la table)
      let bottomStartY: number | undefined;
      for (const m of belowOrEqual) {
        const r = this.convertPageBuilderRect(m.position || {});
        bottomStartY = bottomStartY === undefined ? r.y : Math.min(bottomStartY, r.y);
      }

      const effectiveConfig = { ...configRaw, _themeId: flowModule.themeId };
      if (conditionResult.content !== undefined) {
        // pour PRICING_TABLE, on ne remplace rien ici
        console.log(`📄 [PDF] Module ${flowType}: Using conditional content: "${conditionResult.content}"`);
      }

      this.renderModulePricingTablePaginated(effectiveConfig, rect.x, rect.y, rect.width, rect.height, {
        reservedBottomY: bottomStartY,
        onAddPage: () => {
          renderModularBackground();
        }
      });

      // Après la table, on continue avec les modules restants (sous-table)
      remainingModules = belowOrEqual;
    }

    // S'il n'y avait pas de flow ou s'il reste des modules « sous-table », on les rend sur la page actuelle
    for (const m of remainingModules) {
      this.renderModuleAbsolute(m);
    }

    // Ne pas forcer currentY en bas de page: cela peut déclencher un page-break
    // dans les renderers « legacy » qui utilisent checkPageBreak.
    this.currentY = this.margin;
  }

  private renderModulePricingTablePaginated(
    config: Record<string, any>,
    x: number,
    y: number,
    width: number,
    height?: number,
    options?: {
      reservedBottomY?: number;
      onAddPage?: () => void;
    }
  ): void {
    const title = config.title || 'Tarifs';
    const currency = config.currency || '€';
    const tvaRate = config.tvaRate || config.vatRate || 21;
    const showTotal = config.showTotal !== false;
    const showTVA = config.showTVA !== false;

    let items: Array<{ description: string; quantity: number | null; unitPrice: number | null; total: number | null }> = [];
    if (config.pricingLines && config.pricingLines.length > 0) {
      items = this.processPricingLines(config.pricingLines, config);
    } else if (config.items && config.items.length > 0) {
      items = config.items.map((item: any) => ({
        description: this.substituteVariables(item.name || item.label || ''),
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.price || item.amount || item.unitPrice || 0),
        total: parseFloat(item.price || item.amount || 0) * (item.quantity || 1)
      }));
    } else if (config.rows && config.rows.length > 0) {
      items = config.rows.map((row: any) => ({
        description: this.substituteVariables(row.designation || row.label || ''),
        quantity: row.quantity || 1,
        unitPrice: parseFloat(row.unitPrice || 0),
        total: (row.quantity || 1) * parseFloat(row.unitPrice || 0)
      }));
    }

    const reservedBottomY = options?.reservedBottomY;
    const getPageBottomLimit = () => {
      const hardLimit = this.pageHeight - this.margin;
      if (reservedBottomY && Number.isFinite(reservedBottomY)) {
        return Math.min(hardLimit, reservedBottomY - 8);
      }
      return hardLimit;
    };

    // Colonnes ajustées pour éviter que "Total" soit coupé (+ padding)
    const colWidths = [width * 0.45, width * 0.12, width * 0.18, width * 0.25];
    const headerHeight = 20;
    const rowHeight = 18;
    const titleHeight = 25;
    const cellPadding = 8;

    const drawHeaderRow = (startY: number) => {
      this.doc
        .rect(x, startY, width, headerHeight)
        .fill(this.theme.primaryColor || '#1890ff');

      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF');

      this.doc.text('Désignation', x + 5, startY + 5, { width: colWidths[0] - 10 });
      this.doc.text('Qté', x + colWidths[0], startY + 5, { width: colWidths[1], align: 'center' });
      this.doc.text('P.U.', x + colWidths[0] + colWidths[1], startY + 5, { width: colWidths[2] - cellPadding, align: 'right' });
      this.doc.text('Total', x + colWidths[0] + colWidths[1] + colWidths[2], startY + 5, { width: colWidths[3] - cellPadding, align: 'right' });
    };

    const drawTitle = (startY: number) => {
      this.doc
        .fontSize(this.scaleFontSize(16))
        .font('Helvetica-Bold')
        .fillColor(this.theme.primaryColor || '#1890ff')
        .text(title, x, startY, { width });
    };

    const canFitUnderBottomLimit = (startY: number, neededHeight: number): boolean => {
      return startY + neededHeight <= getPageBottomLimit();
    };

    const startNewPage = () => {
      this.doc.addPage();
      this.currentY = 0;
      options?.onAddPage?.();
    };

    // Si rien à afficher, on garde l'ancien rendu "vide" (mais paginé)
    if (!items || items.length === 0) {
      if (!this.canFitOnPage(y, 50)) {
        return;
      }
      drawTitle(y);
      const headerY = y + titleHeight;
      if (!canFitUnderBottomLimit(headerY, headerHeight + 25)) {
        startNewPage();
        const y2 = this.margin;
        drawTitle(y2);
        drawHeaderRow(y2 + titleHeight);
        this.doc
          .fontSize(this.scaleFontSize(10))
          .font('Helvetica-Oblique')
          .fillColor('#999999')
          .text('Aucune ligne configurée', x + 5, y2 + titleHeight + headerHeight + 5, { width: width - 10, align: 'center' });
        return;
      }
      drawHeaderRow(headerY);
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica-Oblique')
        .fillColor('#999999')
        .text('Aucune ligne configurée', x + 5, headerY + headerHeight + 5, { width: width - 10, align: 'center' });
      return;
    }

    // Calcul totaux (on les affiche sur la dernière page)
    let totalHT = 0;
    let hasAnyPricedLine = false;
    for (const item of items) {
      const lineTotal = (typeof item.total === 'number'
        ? item.total
        : (typeof item.quantity === 'number' && typeof item.unitPrice === 'number'
            ? item.quantity * item.unitPrice
            : null));
      if (typeof lineTotal === 'number') {
        totalHT += lineTotal;
        hasAnyPricedLine = true;
      }
    }

    // Pagination des lignes
    let pageIndex = 0;
    let rowIndex = 0;

    while (rowIndex < items.length) {
      const isFirstPage = pageIndex === 0;
      const pageY = isFirstPage ? y : this.margin;

      // Titre + header
      if (!canFitUnderBottomLimit(pageY, titleHeight + headerHeight + rowHeight)) {
        startNewPage();
        pageIndex += 1;
        continue;
      }

      drawTitle(pageY);
      let currentY = pageY + titleHeight;
      drawHeaderRow(currentY);
      currentY += headerHeight;

      // Lignes
      while (rowIndex < items.length) {
        const item = items[rowIndex];
        if (!canFitUnderBottomLimit(currentY, rowHeight + 2)) {
          break;
        }

        const lineTotal = (typeof item.total === 'number'
          ? item.total
          : (typeof item.quantity === 'number' && typeof item.unitPrice === 'number'
              ? item.quantity * item.unitPrice
              : null));
        this.doc
          .fontSize(this.scaleFontSize(10))
          .font('Helvetica')
          .fillColor(this.theme.textColor || '#333333');

        this.doc.text(item.description || '-', x + 5, currentY + 4, { width: colWidths[0] - 10 });
        this.doc.text(typeof item.quantity === 'number' ? String(item.quantity) : '', x + colWidths[0], currentY + 4, { width: colWidths[1], align: 'center' });
        this.doc.text(typeof item.unitPrice === 'number' ? `${item.unitPrice.toFixed(2)} ${currency}` : '', x + colWidths[0] + colWidths[1], currentY + 4, { width: colWidths[2] - cellPadding, align: 'right' });
        this.doc.text(typeof lineTotal === 'number' ? `${lineTotal.toFixed(2)} ${currency}` : '', x + colWidths[0] + colWidths[1] + colWidths[2], currentY + 4, { width: colWidths[3] - cellPadding, align: 'right' });

        this.doc
          .strokeColor('#e8e8e8')
          .lineWidth(0.5)
          .moveTo(x, currentY + rowHeight)
          .lineTo(x + width, currentY + rowHeight)
          .stroke();

        currentY += rowHeight;
        rowIndex += 1;
      }

      // Si on a fini les lignes, tenter d'afficher les totaux sur cette page
      if (rowIndex >= items.length && showTotal && hasAnyPricedLine) {
        const totalsHeight = showTVA ? 50 : 20;
        if (!canFitUnderBottomLimit(currentY + 5, totalsHeight + 5)) {
          // Pas assez de place pour les totaux + bas de page -> nouvelle page
          startNewPage();
          pageIndex += 1;
          continue;
        }

        const tva = totalHT * (tvaRate / 100);
        const totalTTC = totalHT + tva;
        currentY += 5;

        this.doc
          .fontSize(this.scaleFontSize(10))
          .font('Helvetica-Bold')
          .fillColor(this.theme.textColor || '#333333')
          .text('Total HT', x + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] + colWidths[3] * 0.5 - cellPadding, align: 'right' });
        this.doc.text(`${totalHT.toFixed(2)} ${currency}`, x + width - colWidths[3], currentY, { width: colWidths[3] - cellPadding, align: 'right' });

        currentY += 15;
        if (showTVA) {
          this.doc
            .font('Helvetica')
            .text(`TVA (${tvaRate}%)`, x + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] + colWidths[3] * 0.5 - cellPadding, align: 'right' });
          this.doc.text(`${tva.toFixed(2)} ${currency}`, x + width - colWidths[3], currentY, { width: colWidths[3] - cellPadding, align: 'right' });

          currentY += 15;

          this.doc
            .rect(x + width * 0.6, currentY - 2, width * 0.4, 20)
            .fill(this.theme.primaryColor || '#1890ff');

          this.doc
            .fontSize(this.scaleFontSize(12))
            .font('Helvetica-Bold')
            .fillColor('#FFFFFF')
            .text('Total TTC', x + width * 0.6 + 5, currentY + 3, { width: width * 0.2 - 10 });
          this.doc.text(`${totalTTC.toFixed(2)} ${currency}`, x + width * 0.8, currentY + 3, { width: width * 0.2 - 10, align: 'right' });
        }
      }

      // Si on n'a pas fini les lignes, nouvelle page
      if (rowIndex < items.length) {
        startNewPage();
        pageIndex += 1;
      } else {
        break;
      }
    }

    // Si une hauteur était imposée (module), on respecte en laissant le bas de page décider.
    // (height est volontairement ignoré en mode paginé)
    void height;
  }

  /**
   * Rend un module à sa position absolue (conversion pixel Page Builder -> points PDF)
   */
  private renderModuleAbsolute(module: any): void {
    const moduleType = module.moduleId || module.moduleType || module.type;
    const config = module.config || {};
    const position = module.position || {};
    const rect = this.convertPageBuilderRect(position);

    // 🔥 ÉVALUATION DES CONDITIONS
    const conditionResult = this.evaluateModuleConditions(config);
    if (!conditionResult.shouldRender) {
      console.log(`📄 [PDF] Module ${moduleType}: SKIPPED (condition false)`);
      return;
    }
    
    // Si un contenu alternatif est défini par la condition, on le passe à la config
    const effectiveConfig = { ...config, _themeId: module.themeId };
    if (conditionResult.content !== undefined) {
      console.log(`📄 [PDF] Module ${moduleType}: Using conditional content: "${conditionResult.content}"`);
      // Pour TITLE, SUBTITLE, TEXT_BLOCK -> remplacer le text
      if (moduleType === 'TITLE' || moduleType === 'SUBTITLE' || moduleType === 'TEXT_BLOCK') {
        effectiveConfig.text = conditionResult.content;
      }
    }

    console.log(`📄 [PDF] Module ${moduleType}: PageBuilder(${position.x ?? 0},${position.y ?? 0}) -> PDF(${rect.x.toFixed(1)},${rect.y.toFixed(1)}) size ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);

    this.doc.save();
    try {
      switch (moduleType) {
        case 'TITLE':
          this.renderModuleTitle(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'SUBTITLE':
          this.renderModuleSubtitle(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'TEXT_BLOCK':
          this.renderModuleTextBlock(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'IMAGE':
          this.renderModuleImage(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'BACKGROUND':
          this.renderModuleBackground(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'PRICING_TABLE':
          this.renderModulePricingTable(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'TOTALS_SUMMARY':
          this.renderModuleTotalsSummary(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'TESTIMONIAL':
          this.renderModuleTestimonial(effectiveConfig, rect.x, rect.y, rect.width);
          break;
        case 'COMPANY_PRESENTATION':
          this.renderModuleCompanyPresentation(effectiveConfig, rect.x, rect.y, rect.width);
          break;
        case 'FAQ':
          this.renderModuleFaq(effectiveConfig, rect.x, rect.y, rect.width);
          break;
        case 'DIVIDER':
          this.renderModuleDivider(effectiveConfig, rect.x, rect.y, rect.width);
          break;
        case 'SPACER':
          // Spacer ne rend rien
          break;
        case 'DOCUMENT_HEADER':
          this.renderModuleDocumentHeader(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'DOCUMENT_INFO':
          this.renderModuleDocumentInfo(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'DOCUMENT_FOOTER':
          this.renderModuleDocumentFooter(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'SIGNATURE_BLOCK':
          this.renderModuleSignatureBlock(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'PAYMENT_INFO':
          this.renderModulePaymentInfo(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        case 'CONTACT_INFO':
          this.renderModuleContactInfo(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
          break;
        default:
          console.warn(`📄 [PDF] Module type inconnu: ${moduleType}`);
      }
    } finally {
      this.doc.restore();
    }

  }

  private parseMaybeNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const cleaned = trimmed
      .replace(/\s/g, '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/,(?=\d{1,2}$)/, '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }

  private formatMoney(value: unknown, currency: string): string {
    const n = this.parseMaybeNumber(value);
    if (n === undefined) {
      const s = value === null || value === undefined ? '' : String(value);
      return s ? `${s} ${currency}` : '';
    }
    return `${n.toFixed(2)} ${currency}`;
  }

  // ============================================================
  // RENDERERS DE MODULES INDIVIDUELS
  // ============================================================

  private renderModuleTitle(config: Record<string, any>, x: number, y: number, width: number, height?: number): void {
    const text = this.substituteVariables(config.text || 'Titre');
    const level = config.level || 'h1';
    const alignment = config.alignment || 'center';
    // La couleur peut être dans config.color, config.textColor, ou config.style?.color
    const color = config.color || config.textColor || config.style?.color || '#FFFFFF';
    const actualHeight = height || 50;
    
    console.log(`📄 [PDF] TITLE: config.color=${config.color}, config.textColor=${config.textColor}, final color=${color}`);
    
    // Trouver la bonne taille de police pour que le texte tienne
    let fontSize = level === 'h1' ? 20 : level === 'h2' ? 16 : 14;
    
    // Réduire la taille jusqu'à ce que le texte tienne dans la hauteur
    this.doc.font('Helvetica-Bold');
    let scaledFontSize = this.scaleFontSize(fontSize);
    while (fontSize > 8) {
      this.doc.fontSize(scaledFontSize);
      const textHeight = this.doc.heightOfString(text, { width: width });
      if (textHeight <= actualHeight) break;
      fontSize -= 2;
      scaledFontSize = this.scaleFontSize(fontSize);
    }

    console.log(`📄 [PDF] TITLE: text="${text}", fontSize=${fontSize}, height=${Math.round(actualHeight)}, color=${color}`);
    
    // Sauvegarder la position Y actuelle de PDFKit
    const savedY = (this.doc as any).y;
    
    // IMPORTANT: Appliquer fillColor AVANT de commencer la chaîne text
    // PDFKit peut réinitialiser la couleur dans certains cas
    this.doc.save();
    this.doc.fillColor(color);
    this.doc.fontSize(scaledFontSize);
    const titleTextHeight = this.doc.heightOfString(text, { width });
    const titleYOffset = calculateVerticalCenterOffset(actualHeight, titleTextHeight);
    this.doc.font('Helvetica-Bold');
    this.doc.text(text, x, y + titleYOffset, {
      width: width,
      height: actualHeight,
      align: alignment as any,
      lineBreak: true,
      continued: false
    });
    this.doc.restore();
    
    // CRUCIAL: Restaurer la position Y pour éviter que PDFKit pense devoir créer une page
    // On remet Y au début de la page pour être sûr
    (this.doc as any).y = Math.min(savedY, this.margin + 100);
  }

  private renderModuleSubtitle(config: Record<string, any>, x: number, y: number, width: number, height?: number): void {
    const rawText = this.substituteVariables(config.text || 'Sous-titre');
    const text = this.normalizeText(rawText);
    const alignment = config.alignment || 'center';
    let color = config.color || config.textColor || config.style?.color || this.theme.textColor || '#333333';
    if (!config.backgroundColor && this.isNearWhite(color)) {
      color = this.theme.textColor || '#333333';
    }
    const actualHeight = height || 30;
    
    let fontSize = config.fontSize || 14;
    
    this.doc.font('Helvetica');
    let scaledFontSize = this.scaleFontSize(fontSize);
    while (fontSize > 6) {
      this.doc.fontSize(scaledFontSize);
      const textHeight = this.doc.heightOfString(text, { width: width });
      if (textHeight <= actualHeight) break;
      fontSize -= 1;
      scaledFontSize = this.scaleFontSize(fontSize);
    }

    console.log(`📄 [PDF] SUBTITLE: text="${text}", fontSize=${fontSize}`);

    const savedY = (this.doc as any).y;
    this.doc.fontSize(scaledFontSize);
    const subtitleTextHeight = this.doc.heightOfString(text, { width });
    const subtitleYOffset = calculateVerticalCenterOffset(actualHeight, subtitleTextHeight);
    
    this.doc
      .fillColor(color)
      .fontSize(scaledFontSize)
      .font('Helvetica')
      .text(text, x, y + subtitleYOffset, {
        width: width,
        height: actualHeight,
        align: alignment as any,
        lineBreak: true,
        continued: false
      });
    
    (this.doc as any).y = Math.min(savedY, this.margin + 100);
  }

  private renderModuleTextBlock(config: Record<string, any>, x: number, y: number, width: number, height?: number): void {
    // 🔥 Vérifier si le bloc peut tenir
    const availableHeight = this.getAvailableHeightOnPage(y);
    if (availableHeight < 10) {
      console.warn(`📄 [PDF] TEXT_BLOCK: Pas de place (${availableHeight.toFixed(0)}px). Bloc masqué.`);
      return;
    }

    const rawText = this.substituteVariables(config.content || config.text || '');
    const text = this.normalizeText(rawText);
    const alignment = config.alignment || 'left';
    let color = config.color || config.textColor || config.style?.color || this.theme.textColor || '#333333';
    if (!config.backgroundColor && this.isNearWhite(color)) {
      color = this.theme.textColor || '#333333';
    }
    
    // 🔥 Limiter la hauteur disponible à ce qui peut tenir sur la page
    const maxHeight = Math.min(height || 100, availableHeight - 5);
    const actualHeight = Math.max(10, maxHeight);
    
    let fontSize = config.fontSize || 12;
    
    const maxFontSize = Math.floor(actualHeight / 4);
    fontSize = Math.min(fontSize, Math.max(maxFontSize, 8));
    const padding = config.backgroundColor ? 10 : 0;
    const innerWidth = Math.max(1, width - padding * 2);
    const innerHeight = Math.max(1, actualHeight - padding * 2);

    this.doc.font('Helvetica');
    let scaledFontSize = this.scaleFontSize(fontSize);
    while (fontSize > 6) {
      this.doc.fontSize(scaledFontSize);
      const textHeight = this.doc.heightOfString(text, { width: innerWidth });
      // 🔥 Vérifier que le texte entre dans la hauteur disponible
      if (textHeight <= innerHeight) break;
      fontSize -= 1;
      scaledFontSize = this.scaleFontSize(fontSize);
    }

    // Fond si configuré
    if (config.backgroundColor) {
      this.doc
        .rect(x, y, width, actualHeight)
        .fill(config.backgroundColor);
    }

    console.log(`📄 [PDF] TEXT_BLOCK: text="${text.substring(0, 30)}...", color=${color}, fontSize=${fontSize}, hauteur disponible=${availableHeight.toFixed(0)}px`);

    const savedY = (this.doc as any).y;
    const finalTextHeight = this.doc.heightOfString(text, { width: innerWidth });
    const textYOffset = calculateVerticalCenterOffset(innerHeight, finalTextHeight);
    const textX = x + padding;
    const textY = y + padding + textYOffset;
    
    this.doc
      .fillColor(color)
      .fontSize(scaledFontSize)
      .font('Helvetica')
      .text(text, textX, textY, {
        width: innerWidth,
        height: actualHeight,
        align: alignment as any,
        lineBreak: true,
        continued: false
      });
    
    (this.doc as any).y = Math.min(savedY, this.margin + 100);
  }

  private renderModuleImage(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    const imageUrl = config.image || config.url || config.src;
    
    console.log(`📄 [PDF] IMAGE: x=${Math.round(x)}, y=${Math.round(y)}, w=${Math.round(width)}, h=${Math.round(height)}`);
    console.log(`📄 [PDF] IMAGE: source=${imageUrl ? imageUrl.substring(0, 50) + '...' : 'NONE'}`);
    
    if (!imageUrl) {
      // Placeholder si pas d'image
      console.log(`📄 [PDF] IMAGE: pas d'URL, affichage placeholder`);
      this.doc
        .rect(x, y, width, height)
        .fill('#f0f0f0')
        .stroke('#cccccc');
      this.doc
        .fontSize(12)
        .fillColor('#999999')
        .text('Image', x, y + height/2 - 6, { width: width, align: 'center', lineBreak: false });
      return;
    }

    // Options pour préserver les proportions ET positionner correctement
    // fit: préserve le ratio de l'image
    // align/valign: positionne l'image dans son conteneur (comme le Page Builder)
    const imageOptions = {
      fit: [width, height] as [number, number],
      align: 'center' as const,
      valign: 'center' as const
    };

    // Pour les images locales ou data URL
    try {
      if (imageUrl.startsWith('data:')) {
        // Data URL - extraire le base64
        console.log(`📄 [PDF] IMAGE: traitement data URL avec fit pour préserver proportions`);
        const base64Data = imageUrl.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          console.log(`📄 [PDF] IMAGE: buffer créé, taille=${buffer.length}`);
          this.doc.image(buffer, x, y, imageOptions);
          console.log(`📄 [PDF] IMAGE: ✅ rendu réussi à x=${Math.round(x)}, y=${Math.round(y)}`);
        } else {
          console.warn(`📄 [PDF] IMAGE: ⚠️ pas de données base64 trouvées`);
          this.renderImagePlaceholder(x, y, width, height, 'Base64 vide');
        }
      } else if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
        // Image locale
        const localPath = path.join(process.cwd(), 'public', imageUrl);
        if (fs.existsSync(localPath)) {
          this.doc.image(localPath, x, y, imageOptions);
        } else {
          console.warn(`📄 [PDF] Image locale non trouvée: ${localPath}`);
          this.renderImagePlaceholder(x, y, width, height, 'Image non trouvée');
        }
      } else if (imageUrl.startsWith('http')) {
        // URL externe - vérifier le cache pré-chargé
        const cachedBuffer = this.imageCache.get(imageUrl);
        if (cachedBuffer) {
          console.log(`📄 [PDF] ✅ Utilisation image du cache: ${imageUrl.substring(0, 50)}...`);
          this.doc.image(cachedBuffer, x, y, imageOptions);
        } else {
          console.warn(`📄 [PDF] Image externe non en cache: ${imageUrl.substring(0, 50)}...`);
          this.renderImagePlaceholder(x, y, width, height, 'Image non chargée');
        }
      } else {
        // URL inconnue
        console.log(`📄 [PDF] URL non supportée: ${imageUrl.substring(0, 50)}...`);
        this.renderImagePlaceholder(x, y, width, height, 'URL non supportée');
      }
    } catch (error) {
      console.error('📄 [PDF] Erreur chargement image:', error);
      this.renderImagePlaceholder(x, y, width, height, 'Erreur');
    }
  }

  private renderImagePlaceholder(x: number, y: number, width: number, height: number, text: string): void {
    this.doc
      .rect(x, y, width, height)
      .fill('#f5f5f5')
      .stroke('#e0e0e0');
    this.doc
      .fontSize(10)
      .fillColor('#999999')
      .text(text, x, y + height/2 - 5, { width: width, align: 'center' });
  }

  private renderModuleBackground(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    // IMPORTANT: Si une image existe, on la rend TOUJOURS (peu importe config.type)
    // Le Page Builder peut sauvegarder type:"color" même avec une image
    const hasImage = !!config.image;
    const hasColor = !!config.color;
    const hasGradient = !!(config.gradientStart && config.gradientEnd);
    const declaredType = config.type; // "color", "image", "solid", "gradient", etc.
    
    console.log(`📄 [PDF] BACKGROUND: declaredType=${declaredType}, hasImage=${hasImage}, hasColor=${hasColor}, hasGradient=${hasGradient}`);
    console.log(`📄 [PDF] BACKGROUND: position x=${x}, y=${y}, w=${width}, h=${height}`);
    
    // PRIORITÉ 1: Image (si elle existe, on la rend, peu importe le "type" déclaré)
    if (hasImage) {
      console.log(`📄 [PDF] BACKGROUND: rendu image de fond`);
      try {
        const imageUrl = config.image;
        const backgroundColor = config.backgroundColor || config.color || this.theme.backgroundColor;
        if (backgroundColor) {
          this.doc.rect(x, y, width, height).fill(backgroundColor);
        }

        if (imageUrl.startsWith('data:')) {
          const base64Data = imageUrl.split(',')[1];
          if (base64Data) {
            const buffer = Buffer.from(base64Data, 'base64');
            console.log(`📄 [PDF] BACKGROUND: buffer créé, taille=${buffer.length} octets`);
            this.drawBackgroundImage(buffer, x, y, width, height);
            console.log(`📄 [PDF] BACKGROUND: ✅ image rendue avec succès (ratio maintenu)`);
            return; // Sortie après succès
          }
          console.warn(`📄 [PDF] BACKGROUND: ⚠️ pas de données base64`);
        } else if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
          const localPath = path.join(process.cwd(), 'public', imageUrl);
          if (fs.existsSync(localPath)) {
            this.drawBackgroundImage(fs.readFileSync(localPath), x, y, width, height);
            return;
          }
          console.warn(`📄 [PDF] Image locale non trouvée: ${localPath}`);
          this.renderImagePlaceholder(x, y, width, height, 'Image non trouvée');
          return;
        } else if (imageUrl.startsWith('http')) {
          const cachedBuffer = this.imageCache.get(imageUrl);
          if (cachedBuffer) {
            this.drawBackgroundImage(cachedBuffer, x, y, width, height);
            return;
          }
          console.warn(`📄 [PDF] Image externe non en cache: ${imageUrl.substring(0, 50)}...`);
          this.renderImagePlaceholder(x, y, width, height, 'Image non chargée');
          return;
        } else {
          console.log(`📄 [PDF] URL non supportée: ${imageUrl.substring(0, 50)}...`);
          this.renderImagePlaceholder(x, y, width, height, 'URL non supportée');
          return;
        }
      } catch (error) {
        console.error(`📄 [PDF] BACKGROUND: ❌ erreur image:`, error);
        // Continuer vers les fallbacks si l'image échoue
      }
    }
    
    // PRIORITÉ 2: Gradient
    if (hasGradient) {
      console.log(`📄 [PDF] BACKGROUND: rendu gradient`);
      const steps = 20;
      const stepHeight = Math.max(1, height / steps);
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const color = this.interpolateColor(config.gradientStart, config.gradientEnd, ratio);
        this.doc
          .rect(x, y + i * stepHeight, width, stepHeight + 1)
          .fill(color);
      }
      return;
    }
    
    // PRIORITÉ 3: Couleur solide (type "color" ou "solid" ou couleur présente)
    if (hasColor) {
      console.log(`📄 [PDF] BACKGROUND: rendu couleur solide ${config.color}`);
      this.doc
        .rect(x, y, width, height)
        .fill(config.color);
      return;
    }
    
    console.log(`📄 [PDF] BACKGROUND: aucun rendu (pas d'image, pas de couleur, pas de gradient)`);
  }

  private interpolateColor(color1: string, color2: string, ratio: number): string {
    // Simple interpolation de couleurs hex
    const hex = (c: string) => parseInt(c.replace('#', ''), 16);
    const r1 = (hex(color1) >> 16) & 255;
    const g1 = (hex(color1) >> 8) & 255;
    const b1 = hex(color1) & 255;
    const r2 = (hex(color2) >> 16) & 255;
    const g2 = (hex(color2) >> 8) & 255;
    const b2 = hex(color2) & 255;
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private renderModulePricingTable(config: Record<string, any>, x: number, y: number, width: number, _height?: number): void {
    // Version améliorée du tableau de prix avec support pricingLines
    const title = config.title || 'Tarifs';
    const currency = config.currency || '€';
    const tvaRate = config.tvaRate || config.vatRate || 21;
    const showTotal = config.showTotal !== false;
    const showTVA = config.showTVA !== false;
    
    // 🆕 Support des pricingLines (nouveau système) ou items (ancien système)
    let items: Array<{ description: string; quantity: number | null; unitPrice: number | null; total: number | null }> = [];
    
    if (config.pricingLines && config.pricingLines.length > 0) {
      console.log('📄 [PDF] PRICING_TABLE: Utilisation de pricingLines', config.pricingLines.length);
      items = this.processPricingLines(config.pricingLines, config);
      console.log('📄 [PDF] PRICING_TABLE: Items résolus:', items);
    } else if (config.items && config.items.length > 0) {
      // Ancien format: items simples
      items = config.items.map((item: any) => ({
        description: this.substituteVariables(item.name || item.label || ''),
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.price || item.amount || item.unitPrice || 0),
        total: parseFloat(item.price || item.amount || 0) * (item.quantity || 1),
      }));
    } else if (config.rows && config.rows.length > 0) {
      // Format legacy: rows
      items = config.rows.map((row: any) => ({
        description: this.substituteVariables(row.designation || row.label || ''),
        quantity: row.quantity || 1,
        unitPrice: parseFloat(row.unitPrice || 0),
        total: (row.quantity || 1) * parseFloat(row.unitPrice || 0),
      }));
    }

    // 🔥 BOUNDS CHECKING
    const availableHeight = this.getAvailableHeightOnPage(y);
    
    if (availableHeight < 50) {
      console.warn(`📄 [PDF] PRICING_TABLE: Pas assez de place (${availableHeight.toFixed(0)}px restants). Tableau masqué.`);
      return; // Trop petit pour afficher quoi que ce soit
    }

    // Titre
    this.doc
      .fontSize(this.scaleFontSize(16))
      .font('Helvetica-Bold')
      .fillColor(this.theme.primaryColor || '#1890ff')
      .text(title, x, y, { width: width });

    let currentY = y + 25;
    
    // 🔥 Vérifier si le titre + header peuvent tenir
    if (!this.canFitOnPage(currentY, 30)) {
      console.warn(`📄 [PDF] PRICING_TABLE: Pas de place pour la table. Tableau masqué.`);
      return;
    }
    
    // En-tête du tableau - colonnes ajustées pour éviter coupure
    const colWidths = [width * 0.45, width * 0.12, width * 0.18, width * 0.25];
    const headerHeight = 20;
    const cellPadding = 8;
    
    this.doc
      .rect(x, currentY, width, headerHeight)
      .fill(this.theme.primaryColor || '#1890ff');
    
    this.doc
      .fontSize(this.scaleFontSize(10))
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF');
    
    this.doc.text('Désignation', x + 5, currentY + 5, { width: colWidths[0] - 10 });
    this.doc.text('Qté', x + colWidths[0], currentY + 5, { width: colWidths[1], align: 'center' });
    this.doc.text('P.U.', x + colWidths[0] + colWidths[1], currentY + 5, { width: colWidths[2] - cellPadding, align: 'right' });
    this.doc.text('Total', x + colWidths[0] + colWidths[1] + colWidths[2], currentY + 5, { width: colWidths[3] - cellPadding, align: 'right' });
    
    currentY += headerHeight;
    
    // Lignes du tableau
    let totalHT = 0;
    let rowsRendered = 0;
    
    if (items.length === 0) {
      // Aucune ligne
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica-Oblique')
        .fillColor('#999999')
        .text('Aucune ligne configurée', x + 5, currentY + 5, { width: width - 10, align: 'center' });
      currentY += 25;
    } else {
      for (const item of items) {
        // 🔥 Avant de rendre chaque ligne, vérifier si elle peut tenir
        const rowHeight = 18;
        if (!this.canFitOnPage(currentY, rowHeight + 5)) {
          console.warn(`📄 [PDF] PRICING_TABLE: Plus de place pour ${items.length - rowsRendered} lignes. Arrêt du rendu.`);
          break; // Arrêter ici plutôt que de déborder
        }
        
        const lineTotal = (typeof item.total === 'number'
          ? item.total
          : (typeof item.quantity === 'number' && typeof item.unitPrice === 'number'
              ? item.quantity * item.unitPrice
              : null));
        if (typeof lineTotal === 'number') totalHT += lineTotal;
        
        this.doc
          .fontSize(this.scaleFontSize(10))
          .font('Helvetica')
          .fillColor(this.theme.textColor || '#333333');
        
        this.doc.text(item.description || '-', x + 5, currentY + 4, { width: colWidths[0] - 10 });
        this.doc.text(typeof item.quantity === 'number' ? String(item.quantity) : '', x + colWidths[0], currentY + 4, { width: colWidths[1], align: 'center' });
        this.doc.text(typeof item.unitPrice === 'number' ? `${item.unitPrice.toFixed(2)} ${currency}` : '', x + colWidths[0] + colWidths[1], currentY + 4, { width: colWidths[2] - cellPadding, align: 'right' });
        this.doc.text(typeof lineTotal === 'number' ? `${lineTotal.toFixed(2)} ${currency}` : '', x + colWidths[0] + colWidths[1] + colWidths[2], currentY + 4, { width: colWidths[3] - cellPadding, align: 'right' });
        
        // Ligne séparatrice
        this.doc
          .strokeColor('#e8e8e8')
          .lineWidth(0.5)
          .moveTo(x, currentY + rowHeight)
          .lineTo(x + width, currentY + rowHeight)
          .stroke();
        
        currentY += rowHeight;
        rowsRendered++;
      }
    }
    
    const hasAnyPricedLine = items.some((it) => typeof it.total === 'number' || (typeof it.quantity === 'number' && typeof it.unitPrice === 'number'));

    // Totaux
    if (showTotal && hasAnyPricedLine) {
      // 🔥 Vérifier si les totaux peuvent tenir
      const totalsHeight = showTVA ? 50 : 20;
      if (!this.canFitOnPage(currentY, totalsHeight + 5)) {
        console.warn(`📄 [PDF] PRICING_TABLE: Pas de place pour les totaux. Totaux masqués.`);
        return;
      }
      
      const tva = totalHT * (tvaRate / 100);
      const totalTTC = totalHT + tva;
      
      currentY += 5;
      
      // Total HT
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica-Bold')
        .fillColor(this.theme.textColor || '#333333')
        .text('Total HT', x + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] + colWidths[3] * 0.5 - cellPadding, align: 'right' });
      this.doc.text(`${totalHT.toFixed(2)} ${currency}`, x + width - colWidths[3], currentY, { width: colWidths[3] - cellPadding, align: 'right' });
      
      currentY += 15;
      
      if (showTVA) {
        // TVA
        this.doc
          .font('Helvetica')
          .text(`TVA (${tvaRate}%)`, x + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] + colWidths[3] * 0.5 - cellPadding, align: 'right' });
        this.doc.text(`${tva.toFixed(2)} ${currency}`, x + width - colWidths[3], currentY, { width: colWidths[3] - cellPadding, align: 'right' });
        
        currentY += 15;
        
        // Total TTC
        this.doc
          .rect(x + width * 0.6, currentY - 2, width * 0.4, 20)
          .fill(this.theme.primaryColor || '#1890ff');
        
        this.doc
          .fontSize(this.scaleFontSize(12))
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Total TTC', x + width * 0.6 + 5, currentY + 3, { width: width * 0.2 - 10 });
        this.doc.text(`${totalTTC.toFixed(2)} ${currency}`, x + width * 0.8, currentY + 3, { width: width * 0.2 - 10, align: 'right' });
      }
    }
  }

  private renderModuleTestimonial(config: Record<string, any>, x: number, y: number, width: number): void {
    const quote = this.substituteVariables(config.quote || config.text || '');
    const author = config.author || '';
    const role = config.role || config.position || '';

    // Citation
    this.doc
      .fontSize(this.scaleFontSize(14))
      .font('Helvetica-Oblique')
      .fillColor(this.theme.textColor || '#333333')
      .text(`"${quote}"`, x, y, { width: width });

    const quoteHeight = this.doc.heightOfString(`"${quote}"`, { width: width });

    // Auteur
    if (author) {
      this.doc
        .fontSize(this.scaleFontSize(12))
        .font('Helvetica-Bold')
        .text(`— ${author}`, x, y + quoteHeight + 10, { width: width });

      if (role) {
        this.doc
          .fontSize(this.scaleFontSize(10))
          .font('Helvetica')
          .fillColor('#666666')
          .text(role, x, y + quoteHeight + 26, { width: width });
      }
    }
  }

  private renderModuleCompanyPresentation(config: Record<string, any>, x: number, y: number, width: number): void {
    const title = this.substituteVariables(config.title || 'Notre entreprise');
    const description = this.substituteVariables(config.description || config.text || '');

    this.doc
      .fontSize(this.scaleFontSize(18))
      .font('Helvetica-Bold')
      .fillColor(this.theme.primaryColor || '#1890ff')
      .text(title, x, y, { width: width });

    if (description) {
      this.doc
        .fontSize(this.scaleFontSize(12))
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(description, x, y + 30, { width: width });
    }
  }

  private renderModuleFaq(config: Record<string, any>, x: number, y: number, width: number): void {
    const title = config.title || 'FAQ';
    const items = config.items || [];

    this.doc
      .fontSize(this.scaleFontSize(18))
      .font('Helvetica-Bold')
      .fillColor(this.theme.primaryColor || '#1890ff')
      .text(title, x, y, { width: width });

    let currentY = y + 30;

    for (const item of items) {
      const question = this.substituteVariables(item.question || '');
      const answer = this.substituteVariables(item.answer || '');

      this.doc
        .fontSize(this.scaleFontSize(12))
        .font('Helvetica-Bold')
        .fillColor(this.theme.textColor || '#333333')
        .text(`Q: ${question}`, x, currentY, { width: width });

      const qHeight = this.doc.heightOfString(`Q: ${question}`, { width: width });
      currentY += qHeight + 5;

      this.doc
        .fontSize(this.scaleFontSize(11))
        .font('Helvetica')
        .fillColor('#666666')
        .text(`R: ${answer}`, x, currentY, { width: width });

      const aHeight = this.doc.heightOfString(`R: ${answer}`, { width: width });
      currentY += aHeight + 15;
    }
  }

  // ============================================================
  // DOCUMENT_HEADER - En-tête avec logo entreprise et infos client
  // ============================================================
  private renderModuleDocumentHeader(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    // Entreprise
    const companyName = this.substituteVariables(config.companyName || '{org.name}');
    const companyAddress = this.substituteVariables(config.companyAddress || '{org.address}');
    const companyPhone = this.substituteVariables(config.companyPhone || '{org.phone}');
    const companyEmail = this.substituteVariables(config.companyEmail || '{org.email}');
    const companyTVA = this.substituteVariables(config.companyTVA || '{org.tva}');
    
    // Client
    const clientTitle = config.clientTitle || 'CLIENT:';
    const clientName = this.substituteVariables(config.clientName || '{lead.firstName} {lead.lastName}');
    const clientCompany = this.substituteVariables(config.clientCompany || '{lead.company}');
    const clientAddress = this.substituteVariables(config.clientAddress || '{lead.address}');
    const clientEmail = this.substituteVariables(config.clientEmail || '{lead.email}');
    
    const halfWidth = width / 2 - 20;
    let currentY = y;
    
    // Logo si présent
    if (config.showLogo !== false && config.logo) {
      try {
        const logoSize = config.logoSize || 60;
        const maxLogoWidth = Math.min(logoSize, width * 0.3);
        const maxLogoHeight = Math.min(logoSize, (height || logoSize) - 4);
        const logoData = config.logo;
        if (logoData && logoData.startsWith('data:image')) {
          const base64Data = logoData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          this.doc.image(buffer, x, currentY, { fit: [maxLogoWidth, maxLogoHeight] });
        }
      } catch (e) {
        console.warn('📄 [PDF] Impossible de charger le logo:', e);
      }
    }
    
    // Info entreprise (à gauche)
    if (config.showCompanyInfo !== false) {
      const logoOffset = (config.showLogo !== false && config.logo) ? (Math.min(config.logoSize || 60, width * 0.3)) + 12 : 0;
      
      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(14))
        .fillColor(this.theme.primaryColor || '#1890ff')
        .text(companyName, x + logoOffset, currentY, { width: halfWidth - logoOffset });
      
      currentY += 18;
      
      if (companyPhone) {
        this.doc
          .fontSize(this.scaleFontSize(9))
          .fillColor('#666666')
          .text(`Tel: ${companyPhone}`, x + logoOffset, currentY, { width: halfWidth - logoOffset });
        currentY += 12;
      }

      if (companyEmail) {
        this.doc
          .fontSize(this.scaleFontSize(9))
          .fillColor('#666666')
          .text(`Email: ${companyEmail}`, x + logoOffset, currentY, { width: halfWidth - logoOffset });
        currentY += 12;
      }

      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(10))
        .fillColor('#555555')
        .text(companyAddress, x + logoOffset, currentY, { width: halfWidth - logoOffset });
      
      const addrHeight = this.doc.heightOfString(companyAddress, { width: halfWidth - logoOffset });
      currentY += addrHeight + 4;
      
      if (companyTVA) {
        this.doc
          .fontSize(this.scaleFontSize(8))
          .fillColor('#888888')
          .text(`TVA: ${companyTVA}`, x + logoOffset, currentY, { width: halfWidth - logoOffset });
      }
    }
    
    // Info client (à droite)
    if (config.showClientInfo !== false) {
      const clientX = x + halfWidth + 40;
      let clientY = y;
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(9))
        .fillColor('#888888')
        .text(clientTitle, clientX, clientY, { width: halfWidth, align: 'right' });
      
      clientY += 14;
      
      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(12))
        .fillColor('#333333')
        .text(clientName, clientX, clientY, { width: halfWidth, align: 'right' });
      
      clientY += 16;
      
      if (clientCompany) {
        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(11))
          .fillColor('#444444')
          .text(clientCompany, clientX, clientY, { width: halfWidth, align: 'right' });
        clientY += 14;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(10))
        .fillColor('#555555')
        .text(clientAddress, clientX, clientY, { width: halfWidth, align: 'right' });
      
      const clientAddrHeight = this.doc.heightOfString(clientAddress, { width: halfWidth });
      clientY += clientAddrHeight + 4;
      
      if (clientEmail) {
        this.doc
          .fontSize(this.scaleFontSize(9))
          .fillColor('#666666')
          .text(`Email: ${clientEmail}`, clientX, clientY, { width: halfWidth, align: 'right' });
      }
    }
    
    console.log(`📄 [PDF] DOCUMENT_HEADER rendu: company=${companyName}, client=${clientName}`);
  }

  // ============================================================
  // DOCUMENT_INFO - Référence, date, validité
  // ============================================================
  private renderModuleDocumentInfo(config: Record<string, any>, x: number, y: number, width: number, _height: number): void {
    const themeId = (config as any)._themeId as string | undefined;
    const layoutRaw = (config.layout || '').toString().trim();
    const layout = 'inline'; // 🔥 Forcer l'alignement en badges comme PageBuilder
    console.log('📄 [PDF] DOCUMENT_INFO render', {
      themeId,
      layoutRaw,
      forcedLayout: layout,
      showReference: config.showReference,
      showDate: config.showDate,
      showValidUntil: config.showValidUntil,
      referencePrefix: config.referencePrefix,
      datePrefix: config.datePrefix,
      validUntilPrefix: config.validUntilPrefix
    });
    
    const reference = this.normalizeText(this.substituteVariables(config.reference || config.referenceBinding || '{quote.reference}'));
    const date = this.normalizeText(this.substituteVariables(config.date || config.dateBinding || '{quote.date}'));
    const validUntil = this.normalizeText(this.substituteVariables(config.validUntil || config.validUntilBinding || '{quote.validUntil}'));
    const object = this.normalizeText(this.substituteVariables(config.object || config.objectBinding || ''));
    
    const referencePrefix = config.referencePrefix || 'DEV-';
    const datePrefix = config.datePrefix || 'Date:';
    const validUntilPrefix = config.validUntilPrefix || 'Valide jusqu\'au:';
    const objectPrefix = config.objectPrefix || 'Objet:';
    
    let currentY = y;
    const badgeFontSize = this.scaleFontSize(13);
    const badgePaddingX = 12;
    const badgePaddingY = 6;
    const badgeGap = 12;
    
    if (layout === 'inline') {
      // Inline badges
      let currentX = x;

      const drawBadge = (label: string, value: string) => {
        const text = `${label}${value ? ` ${value}` : ''}`;
        this.doc.font('Helvetica').fontSize(badgeFontSize);
        const textHeight = this.doc.heightOfString(text, { width: width });
        const badgeWidth = this.doc.widthOfString(text) + badgePaddingX * 2;
        const badgeHeight = textHeight + badgePaddingY * 2;
        const textY = currentY + (badgeHeight - textHeight) / 2;

        this.doc
          .lineWidth(1)
          .roundedRect(currentX, currentY, badgeWidth, badgeHeight, 4)
          .fill('#f5f5f5')
          .stroke('#e5e5e5');

        this.doc
          .fillColor('#333333')
          .font('Helvetica-Bold')
          .fontSize(badgeFontSize)
          .text(label, currentX + badgePaddingX, textY, { continued: true, lineBreak: false })
          .font('Helvetica')
          .text(value ? ` ${value}` : '', { continued: false, lineBreak: false });

        currentX += badgeWidth + badgeGap;
      };
      
      if (config.showReference !== false) {
        drawBadge(referencePrefix, reference);
      }
      
      if (config.showDate !== false) {
        drawBadge(datePrefix, date);
      }
      
      if (config.showValidUntil !== false && validUntil) {
        drawBadge(validUntilPrefix, validUntil);
      }
      
    } else {
      // Stacked ou table
      if (config.showReference !== false) {
        this.doc
          .font('Helvetica-Bold')
          .fontSize(this.scaleFontSize(11))
          .fillColor('#333333')
          .text(`${referencePrefix} ${reference}`, x, currentY, { width });
        currentY += 16;
      }
      
      if (config.showDate !== false) {
        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(11))
          .fillColor('#333333')
          .text(`${datePrefix} ${date}`, x, currentY, { width });
        currentY += 16;
      }
      
      if (config.showValidUntil !== false && validUntil) {
        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(11))
          .fillColor('#333333')
          .text(`${validUntilPrefix} ${validUntil}`, x, currentY, { width });
        currentY += 16;
      }
      
      if (config.showObject !== false && object) {
        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(11))
          .fillColor('#333333')
          .text(`${objectPrefix} ${object}`, x, currentY, { width });
      }
    }
    
    console.log(`📄 [PDF] DOCUMENT_INFO rendu: ref=${reference}, date=${date}`);
  }

  // ============================================================
  // DOCUMENT_FOOTER - Pied de page avec infos entreprise
  // ============================================================
  private renderModuleDocumentFooter(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    const layout = config.layout || 'centered';
    const fontSize = config.fontSize || 10;
    const maxY = y + (height || 40);

    const textFont = this.unicodeFontName || 'Helvetica';
    
    const companyName = this.substituteVariables(config.companyName || '{org.name}');
    const phone = this.substituteVariables(config.companyPhone || '{org.phone}');
    const email = this.substituteVariables(config.companyEmail || '{org.email}');
    const website = this.substituteVariables(config.companyWebsite || '{org.website}');
    const tva = this.substituteVariables(config.companyTVA || '{org.tva}');
    const iban = this.substituteVariables(config.bankIBAN || '{org.iban}');
    const bic = this.substituteVariables(config.bankBIC || '{org.bic}');

    const showCompanyInfo = config.showCompanyInfo !== false;
    const showBankInfo = config.showBankInfo !== false;
    const showPageNumber = config.showPageNumber !== false;

    const companyInfoParts: string[] = [];
    // Utiliser du texte simple car Helvetica ne supporte pas les emojis/symboles Unicode avancés
    if (showCompanyInfo) {
      companyInfoParts.push(companyName);
      if (phone) companyInfoParts.push(`Tel: ${phone}`);
      if (email) companyInfoParts.push(`${email}`);
      if (website) companyInfoParts.push(`${website}`);
    }
    const companyInfoText = companyInfoParts.filter(Boolean).join(' | ');

    const bankInfoShouldRender = showBankInfo && (!!iban || !!bic);
    const bankInfoParts: string[] = [];
    if (bankInfoShouldRender) {
      if (tva) bankInfoParts.push(`TVA: ${tva}`);
      if (iban) bankInfoParts.push(`IBAN: ${iban}`);
      if (bic) bankInfoParts.push(`BIC: ${bic}`);
    }
    const bankInfoText = bankInfoParts.join(' | ');

    // Tant qu'on ne bufferise pas les pages, on affiche 1/1 (objectif: parité PageBuilder sur 1 page).
    const pageNumberText = showPageNumber ? 'Page 1 / 1' : '';

    const baseFontSize = this.scaleFontSize(fontSize);
    const smallFontSize = this.scaleFontSize(fontSize - 1);

    const drawSingleLine = (
      text: string,
      lineY: number,
      opts: { font: string; size: number; color: string; align: 'left' | 'center' | 'right' }
    ): number => {
      if (!text) return 0;
      const h = this.doc.font(opts.font).fontSize(opts.size).heightOfString(text, { width, lineBreak: false });
      if (lineY + h > maxY) return 0;
      this.doc.font(opts.font).fontSize(opts.size).fillColor(opts.color).text(text, x, lineY, { width, align: opts.align, lineBreak: false });
      return h;
    };

    if (layout === 'spread') {
      // Gauche: companyInfo, Droite: page number (comme le flex du frontend)
      const lineY = y;
      const leftWidth = Math.floor(width * 0.78);
      const rightWidth = width - leftWidth;

      if (companyInfoText) {
        const h = this.doc.font(textFont).fontSize(baseFontSize).heightOfString(companyInfoText, { width: leftWidth, lineBreak: false });
        if (lineY + h <= maxY) {
          this.doc
            .font(textFont)
            .fontSize(baseFontSize)
            .fillColor('#666666')
            .text(companyInfoText, x, lineY, { width: leftWidth, align: 'left', lineBreak: false });
        }
      }

      if (pageNumberText) {
        const h = this.doc.font(textFont).fontSize(baseFontSize).heightOfString(pageNumberText, { width: rightWidth, lineBreak: false });
        if (lineY + h <= maxY) {
          this.doc
            .font(textFont)
            .fontSize(baseFontSize)
            .fillColor('#888888')
            .text(pageNumberText, x + leftWidth, lineY, { width: rightWidth, align: 'right', lineBreak: false });
        }
      }

      console.log(`📄 [PDF] DOCUMENT_FOOTER rendu (spread): ${companyName}`);
      return;
    }

    if (layout === 'minimal') {
      const minimalText = `${companyName}${pageNumberText ? ` — ${pageNumberText}` : ''}`;
      drawSingleLine(minimalText, y, { font: textFont, size: baseFontSize, color: '#888888', align: 'center' });
      console.log(`📄 [PDF] DOCUMENT_FOOTER rendu (minimal): ${companyName}`);
      return;
    }

    // Layout centered (default)
    let currentY = y;
    if (companyInfoText) {
      const h1 = drawSingleLine(companyInfoText, currentY, { font: textFont, size: baseFontSize, color: '#666666', align: 'center' });
      if (h1) currentY += h1 + 4;
    }

    if (bankInfoText) {
      const h2 = drawSingleLine(bankInfoText, currentY, { font: textFont, size: smallFontSize, color: '#888888', align: 'center' });
      if (h2) currentY += h2 + 4;
    }

    if (config.showLegalMention && config.legalMention) {
      const legalText = String(config.legalMention);
      const h3 = drawSingleLine(legalText, currentY, { font: 'Helvetica-Oblique', size: smallFontSize, color: '#888888', align: 'center' });
      if (h3) currentY += h3 + 4;
    }

    if (pageNumberText) {
      drawSingleLine(pageNumberText, currentY, { font: textFont, size: baseFontSize, color: '#888888', align: 'center' });
    }
    
    console.log(`📄 [PDF] DOCUMENT_FOOTER rendu: ${companyName}`);
  }

  // ============================================================
  // SIGNATURE_BLOCK - Zone de signatures
  // ============================================================
  private renderModuleSignatureBlock(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    // 🔥 Vérifier si le bloc peut tenir
    const availableHeight = this.getAvailableHeightOnPage(y);
    const minHeight = 120; // Hauteur minimale pour un bloc de signature
    
    if (availableHeight < minHeight) {
      console.warn(`📄 [PDF] SIGNATURE_BLOCK: Pas assez de place (${availableHeight.toFixed(0)}px restants). Bloc masqué.`);
      return;
    }

    const isStacked = config.layout === 'stacked';
    const gap = 16;
    const actualHeight = Math.min(height || 140, availableHeight - 10); // -10 pour éviter de toucher le bas
    const boxHeight = isStacked ? Math.floor((actualHeight - gap) / 2) : Math.floor(actualHeight);
    const boxWidth = isStacked ? width : (width - 24) / 2;
    
    const clientLabel = config.clientLabel || 'Le Client';
    const companyLabel = config.companyLabel || 'Pour l\'entreprise';
    
    // Clipping au niveau du module (comme l'overflow:hidden dans le Page Builder)
    this.doc.save();
    this.doc.rect(x, y, width, height).clip();

    const renderBox = (label: string, boxX: number, boxY: number) => {
      // Bordure
      this.doc
        .roundedRect(boxX, boxY, boxWidth, boxHeight, 6)
        .stroke('#e8e8e8');

      // Layout interne (comme le frontend)
      const padding = 20;

      // Label
      const labelY = boxY + padding;
      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#333333')
        .text(label, boxX + padding, labelY, { width: boxWidth - padding * 2 });

      let currentY = labelY + 11 + 8; // label + marginBottom

      // Date (par défaut true comme dans PageBuilder)
      const showDate = config.showDate !== false;
      if (showDate) {
        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(10))
          .fillColor('#666666')
          .text('Date: ____/____/________', boxX + padding, currentY, { width: boxWidth - padding * 2 });
        currentY += 12 + 16; // texte + marginBottom
      }

      // Mention (par défaut true comme dans PageBuilder)
      const showMention = config.showMention !== false;
      if (showMention) {
        const mention = config.mention || 'Lu et approuvé, bon pour accord';
        this.doc
          .font('Helvetica-Oblique')
          .fontSize(this.scaleFontSize(10))
          .fillColor('#666666')
          .text(`"${mention}"`, boxX + padding, currentY, { width: boxWidth - padding * 2 });
        currentY += 12 + 8;
      }

      // Zone signature (marginTop 20, hauteur 80, borderBottom dashed)
      const signatureAreaTop = currentY + 20;
      const signatureLineY = signatureAreaTop + 80;

      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#999999')
        .text('Signature', boxX + padding, signatureAreaTop + 2, { width: boxWidth - padding * 2 });

      this.doc
        .moveTo(boxX + padding, signatureLineY)
        .lineTo(boxX + boxWidth - padding, signatureLineY)
        .dash(3, { space: 3 })
        .stroke('#cccccc')
        .undash();

      return true;
    };
    
    if (isStacked) {
      renderBox(clientLabel, x, y);
      renderBox(companyLabel, x, y + boxHeight + 16);
    } else {
      renderBox(clientLabel, x, y);
      renderBox(companyLabel, x + boxWidth + 24, y);
    }

    this.doc.restore();
    
    console.log(`📄 [PDF] SIGNATURE_BLOCK rendu: ${clientLabel} / ${companyLabel} (disponible: ${availableHeight.toFixed(0)}px)`);
  }

  // ============================================================
  // TOTALS_SUMMARY - Récapitulatif des totaux (HT/TVA/TTC)
  // ============================================================
  private renderModuleTotalsSummary(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    // Clipping au niveau du module (comme l'overflow:hidden dans le Page Builder)
    this.doc.save();
    this.doc.rect(x, y, width, height).clip();

    const currency = config.currency || '€';
    const alignment: 'left' | 'center' | 'right' = config.alignment || 'right';
    const tvaRate = Number(config.tvaRate ?? 21);

    const showDiscount = config.showDiscount === true;
    const showTotalHT = config.showTotalHT !== false;
    const showTVA = config.showTVA !== false;
    const showTotalTTC = config.showTotalTTC !== false;

    const paddingX = 16;
    const paddingTop = 8;
    const gap = 24;
    const contentMaxWidth = Math.max(0, width - paddingX * 2);
    const valueWidth = Math.min(110, Math.max(80, contentMaxWidth * 0.35));
    const labelWidth = Math.max(120, contentMaxWidth - valueWidth - gap);
    const contentWidth = Math.min(contentMaxWidth, labelWidth + gap + valueWidth);

    let startX = x + paddingX;
    if (alignment === 'right') startX = x + width - paddingX - contentWidth;
    if (alignment === 'center') startX = x + (width - contentWidth) / 2;

    const labelX = startX;
    const valueX = startX + (contentWidth - valueWidth);

    const rowHeight = 22;
    let currentY = y + paddingTop;

    const drawRow = (label: string, value: string, opts?: { valueColor?: string; negative?: boolean }) => {
      this.doc
        .strokeColor('#f0f0f0')
        .lineWidth(1)
        .moveTo(x + paddingX, currentY + rowHeight)
        .lineTo(x + width - paddingX, currentY + rowHeight)
        .stroke();

      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#666666')
        .text(label, labelX, currentY + 6, { width: contentWidth - valueWidth - gap, align: 'right' });

      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(11))
        .fillColor(opts?.valueColor || '#333333')
        .text(value, valueX, currentY + 6, { width: valueWidth, align: 'right' });

      currentY += rowHeight;
    };

    // Valeurs: priorité aux données de devis si présentes, sinon bindings/config
    const totalHTValue = this.ctx.quote?.totalHT ?? this.substituteVariables(String(config.totalHTBinding || config.totalHT || '{quote.totalHT}'));
    const tvaValue = this.ctx.quote?.totalTVA ?? this.substituteVariables(String(config.tvaBinding || config.tvaAmount || '{quote.totalTVA}'));
    const totalTTCValue = this.ctx.quote?.totalTTC ?? this.substituteVariables(String(config.totalTTCBinding || config.totalTTC || '{quote.totalTTC}'));
    const discountValue = this.substituteVariables(String(config.discount || ''));

    if (showDiscount && discountValue) {
      const discountFormatted = this.formatMoney(discountValue, currency);
      drawRow('Remise:', `-${discountFormatted}`, { valueColor: '#52c41a' });
    }

    if (showTotalHT) {
      drawRow('Sous-Total HT:', this.formatMoney(totalHTValue, currency));
    }

    if (showTVA) {
      drawRow(`TVA (${Number.isFinite(tvaRate) ? tvaRate : 21}%):`, this.formatMoney(tvaValue, currency));
    }

    if (showTotalTTC) {
      const barHeight = 32;
      const barY = currentY + 4;
      this.doc
        .rect(x, barY, width, barHeight)
        .fill('#0e4a6f');

      const innerPad = 16;
      const barLabelX = x + innerPad;
      const barValueWidth = Math.min(valueWidth + 20, width - innerPad * 2);

      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(12))
        .fillColor('#FFFFFF')
        .text('Total TTC:', barLabelX, barY + 9, { width: width - innerPad * 2 - barValueWidth, align: 'right' });

      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(16))
        .fillColor('#FFFFFF')
        .text(this.formatMoney(totalTTCValue, currency), x + width - innerPad - barValueWidth, barY + 7, { width: barValueWidth, align: 'right' });
    }

    this.doc.restore();
  }

  // ============================================================
  // PAYMENT_INFO - Informations de paiement
  // ============================================================
  private renderModulePaymentInfo(config: Record<string, any>, x: number, y: number, width: number, _height: number): void {
    // 🔥 Vérifier si le bloc peut tenir
    const availableHeight = this.getAvailableHeightOnPage(y);
    if (availableHeight < 30) {
      console.warn(`📄 [PDF] PAYMENT_INFO: Pas de place (${availableHeight.toFixed(0)}px). Bloc masqué.`);
      return;
    }

    const title = config.title || 'Modalités de paiement';
    
    const iban = this.substituteVariables(config.iban || '{org.iban}');
    const bic = this.substituteVariables(config.bic || '{org.bic}');
    const bankName = this.substituteVariables(config.bankName || '{org.bankName}');
    const communication = this.substituteVariables(config.communication || '{quote.reference}');
    
    let currentY = y;
    
    if (config.showTitle !== false) {
      // 🔥 Vérifier si le titre peut tenir
      if (!this.canFitOnPage(currentY, 20)) {
        console.warn(`📄 [PDF] PAYMENT_INFO: Pas de place pour le titre. Bloc masqué.`);
        return;
      }
      
      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(12))
        .fillColor('#333333')
        .text(`${title}`, x, currentY, { width });
      currentY += 20;
    }
    
    const labelWidth = 100;
    const fieldHeight = 16;
    
    if (config.showIBAN !== false && iban) {
      // 🔥 Vérifier si on peut ajouter ce champ
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        console.warn(`📄 [PDF] PAYMENT_INFO: Plus de place pour IBAN et suivants.`);
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#666666')
        .text('IBAN:', x, currentY, { width: labelWidth, continued: true })
        .font('Courier')
        .fillColor('#333333')
        .text(iban);
      currentY += fieldHeight;
    }
    
    if (config.showBIC !== false && bic) {
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#666666')
        .text('BIC:', x, currentY, { width: labelWidth, continued: true })
        .font('Courier')
        .fillColor('#333333')
        .text(bic);
      currentY += fieldHeight;
    }
    
    if (config.showBankName && bankName) {
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#666666')
        .text('Banque:', x, currentY, { width: labelWidth, continued: true })
        .font('Helvetica')
        .fillColor('#333333')
        .text(bankName);
      currentY += fieldHeight;
    }
    
    if (config.showCommunication !== false && communication) {
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#666666')
        .text('Communication:', x, currentY, { width: labelWidth, continued: true })
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text(communication);
      currentY += fieldHeight;
    }
    
    if (config.showPaymentTerms !== false && config.paymentTerms) {
      // 🔥 Vérifier si le bloc des conditions de paiement peut tenir
      if (!this.canFitOnPage(currentY, 40)) {
        return;
      }
      
      currentY += 8;
      this.doc
        .roundedRect(x, currentY, width, 28, 4)
        .fill('#f9f9f9');
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(10))
        .fillColor('#666666')
        .text(`${config.paymentTerms}`, x + 10, currentY + 8, { width: width - 20 });
    }
    
    console.log(`📄 [PDF] PAYMENT_INFO rendu (disponible: ${availableHeight.toFixed(0)}px)`);
  }

  // ============================================================
  // CONTACT_INFO - Informations de contact
  // ============================================================
  private renderModuleContactInfo(config: Record<string, any>, x: number, y: number, width: number, _height: number): void {
    // 🔥 Vérifier si le bloc peut tenir
    const availableHeight = this.getAvailableHeightOnPage(y);
    if (availableHeight < 30) {
      console.warn(`📄 [PDF] CONTACT_INFO: Pas de place (${availableHeight.toFixed(0)}px). Bloc masqué.`);
      return;
    }

    let currentY = y;
    
    if (config.title) {
      // 🔥 Vérifier si le titre peut tenir
      if (!this.canFitOnPage(currentY, 20)) {
        console.warn(`📄 [PDF] CONTACT_INFO: Pas de place pour le titre. Bloc masqué.`);
        return;
      }
      
      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(12))
        .fillColor('#333333')
        .text(config.title, x, currentY, { width });
      currentY += 20;
    }
    
    const fieldHeight = 14;
    
    if (config.showPhone && config.phone) {
      // 🔥 Vérifier si on peut ajouter ce champ
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        console.warn(`📄 [PDF] CONTACT_INFO: Plus de place pour Phone et suivants.`);
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#333333')
        .text(`Tel: ${config.phone}`, x, currentY, { width });
      currentY += fieldHeight;
    }
    
    if (config.showEmail && config.email) {
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#333333')
        .text(`Email: ${config.email}`, x, currentY, { width });
      currentY += fieldHeight;
    }
    
    if (config.showAddress && config.address) {
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#333333')
        .text(`Adresse: ${config.address}`, x, currentY, { width });
      currentY += fieldHeight;
    }
    
    if (config.showWebsite && config.website) {
      if (!this.canFitOnPage(currentY, fieldHeight)) {
        return;
      }
      
      this.doc
        .font('Helvetica')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#333333')
        .text(`Web: ${config.website}`, x, currentY, { width });
    }
    
    console.log(`📄 [PDF] CONTACT_INFO rendu (disponible: ${availableHeight.toFixed(0)}px)`);
  }

  // ============================================================
  /**
   * Page de couverture
   */
  private renderCoverPage(config: Record<string, any>): void {
    const primaryColor = this.theme.primaryColor || '#1890ff';
    
    // Fond coloré en haut
    this.doc
      .rect(0, 0, this.pageWidth, 200)
      .fill(primaryColor);

    // Logo si configuré
    if (config.companyImage || this.theme.logoUrl) {
      // TODO: Charger et afficher l'image du logo
      // Pour l'instant on skip car pdfkit a besoin du fichier local
    }

    // Titre principal
    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Devis')
    );
    
    this.doc
      .fillColor('#ffffff')
      .fontSize(42)
      .font('Helvetica-Bold')
      .text(title, this.margin, 60, {
        width: this.contentWidth,
        align: 'center'
      });

    // Sous-titre
    if (config.subtitle) {
      const subtitle = this.substituteVariables(config.subtitle);
      this.doc
        .fontSize(18)
        .font('Helvetica')
        .text(subtitle, this.margin, 120, {
          width: this.contentWidth,
          align: 'center'
        });
    }

    // Date
    if (config.showDate !== false) {
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      this.doc
        .fontSize(12)
        .fillColor('#ffffff')
        .text(dateStr, this.margin, 160, {
          width: this.contentWidth,
          align: 'center'
        });
    }

    // Numéro de document
    if (this.ctx.documentNumber) {
      this.doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text(`N° ${this.ctx.documentNumber}`, this.margin, 220, {
          width: this.contentWidth,
          align: 'right'
        });
    }

    // Informations client
    this.currentY = 280;
    this.renderClientInfoBox();

    // Nouvelle page après la couverture
    this.doc.addPage();
    this.currentY = this.margin;
  }

  /**
   * Box d'informations client
   */
  private renderClientInfoBox(): void {
    const lead = this.ctx.lead;
    if (!lead.firstName && !lead.lastName && !lead.company) return;

    const boxX = this.pageWidth - this.margin - 250;
    const boxWidth = 250;
    let boxY = this.currentY;

    // Cadre
    this.doc
      .rect(boxX, boxY, boxWidth, 120)
      .stroke('#e8e8e8');

    // Header du cadre
    this.doc
      .rect(boxX, boxY, boxWidth, 30)
      .fill(this.theme.primaryColor || '#1890ff');

    this.doc
      .fillColor('#ffffff')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('CLIENT', boxX + 10, boxY + 8);

    boxY += 40;

    // Nom complet
    const fullName = lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    if (fullName) {
      this.doc
        .fillColor(this.theme.textColor || '#333333')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(fullName, boxX + 10, boxY, { width: boxWidth - 20 });
      boxY += 16;
    }

    // Entreprise
    if (lead.company) {
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#666666')
        .text(lead.company, boxX + 10, boxY, { width: boxWidth - 20 });
      boxY += 14;
    }

    // Email
    if (lead.email) {
      this.doc
        .fontSize(9)
        .text(`📧 ${lead.email}`, boxX + 10, boxY, { width: boxWidth - 20 });
      boxY += 12;
    }

    // Téléphone
    if (lead.phone) {
      this.doc
        .text(`📞 ${lead.phone}`, boxX + 10, boxY, { width: boxWidth - 20 });
      boxY += 12;
    }

    // Adresse
    if (lead.address) {
      this.doc
        .text(`📍 ${lead.address}`, boxX + 10, boxY, { width: boxWidth - 20 });
    }
  }

  /**
   * Présentation de l'entreprise
   */
  private renderCompanyPresentation(config: Record<string, any>): void {
    this.checkPageBreak(150);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Notre Entreprise')
    );

    // Titre de section
    this.renderSectionTitle(title);

    // Description
    if (config.description) {
      const desc = this.substituteVariables(this.getTranslatedValue(config.description, ''));
      this.doc
        .fontSize(this.theme.fontSize || 11)
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(desc, this.margin, this.currentY, {
          width: this.contentWidth,
          align: 'justify',
          lineGap: 4
        });
      this.currentY = this.doc.y + 20;
    }

    // Points forts / highlights
    if (config.highlights && Array.isArray(config.highlights)) {
      for (const highlight of config.highlights) {
        this.doc
          .fontSize(10)
          .text(`✓ ${this.substituteVariables(highlight)}`, this.margin + 20, this.currentY);
        this.currentY += 16;
      }
      this.currentY += 10;
    }
  }

  /**
   * Résumé du projet
   */
  private renderProjectSummary(config: Record<string, any>): void {
    this.checkPageBreak(200);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Résumé du Projet')
    );

    this.renderSectionTitle(title);

    // Description du projet
    if (config.description) {
      const desc = this.substituteVariables(this.getTranslatedValue(config.description, ''));
      this.doc
        .fontSize(this.theme.fontSize || 11)
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(desc, this.margin, this.currentY, {
          width: this.contentWidth,
          align: 'justify',
          lineGap: 4
        });
      this.currentY = this.doc.y + 15;
    }

    // Données TBL liées au projet
    if (config.linkedFields && Array.isArray(config.linkedFields)) {
      this.renderLinkedFields(config.linkedFields);
    }

    // Afficher automatiquement les données TBL pertinentes
    if (config.showTblData !== false) {
      this.renderTblDataSummary();
    }
  }

  /**
   * Tableau des prix
   */
  private renderPricingTable(config: Record<string, any>): void {
    this.checkPageBreak(250);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title || config.tableTitle, 'Détail de l\'offre')
    );

    this.renderSectionTitle(title);

    // 🆕 NOUVEAU SYSTÈME: Utiliser pricingLines configurées
    const pricingLines = config.pricingLines || [];
    let items: any[] = [];
    
    if (pricingLines.length > 0) {
      // Transformer les pricingLines en items pour le rendu
      items = this.processPricingLines(pricingLines, config);
    } else {
      // Fallback: anciennes données ou extraction TBL
      items = config.items || this.extractPricingFromTbl();
    }

    if (items && items.length > 0) {
      this.renderPriceTable(items, config);
    } else {
      this.doc
        .fontSize(this.scaleFontSize(10))
        .fillColor('#666666')
        .text('Aucun élément de tarification configuré', this.margin, this.currentY);
      this.currentY += 20;
    }

    // Totaux
    if (config.showTotals !== false) {
      this.renderPriceTotals(config);
    }
  }

  /**
   * 🆕 Traite les lignes de pricing configurées
   * - Évalue les conditions d'affichage
   * - Résout les références TBL (@value.xxx, @calculated.xxx, node-formula:xxx, etc.)
   * - Génère N lignes pour les repeaters
   */
  private processPricingLines(pricingLines: any[], _config: Record<string, any>): any[] {
    const results: any[] = [];
    const tblData = this.ctx.tblData || {};
    
    for (const line of pricingLines) {
      // 1. Évaluer la condition d'affichage
      if (line.condition && !this.evaluateCondition(line.condition)) {
        console.log(`📄 [PDF] Ligne "${line.label}" ignorée (condition non remplie)`);
        continue;
      }
      
      // 2. Traiter selon le type de ligne
      if (line.type === 'repeater' && line.repeaterId) {
        // Génère N lignes selon les instances du repeater
        const repeaterInstances = this.getRepeaterInstances(line.repeaterId, tblData, line);
        
        for (const instance of repeaterInstances) {
          const resolvedLine = this.resolveLineValues(line, instance);
          results.push(resolvedLine);
        }
      } else {
        // Ligne statique ou dynamique simple
        const resolvedLine = this.resolveLineValues(line);
        results.push(resolvedLine);
      }
    }
    
    return results;
  }

  /**
   * Résout une ref @repeat en remplaçant le templateChildId par templateChildId-suffix
   * pour obtenir la clé de la copie dans tblData.
   * Ex: @repeat.{repeaterId}.{templateId} + suffix "1" → @value.{templateId}-1
   */
  private resolveRepeatRef(ref: string, suffix: string): string {
    if (!ref || !ref.startsWith('@repeat.')) return ref;
    const match = ref.match(/^@repeat\.[^.]+\.(.+)$/);
    if (!match) return ref;
    const templateChildId = match[1];
    // Retourner sous format @value.{templateChildId}-{suffix} pour résolution normale
    return `@value.${templateChildId}-${suffix}`;
  }

  /**
   * Résout les valeurs d'une ligne (substitue les tokens TBL)
   * Pour les repeaters, repeaterInstance.suffix permet de résoudre les refs
   * @repeat.X.Y en @value.Y-{suffix} avant résolution.
   */
  private resolveLineValues(line: any, repeaterInstance?: any): any {
    const suffix = repeaterInstance?.suffix;
    
    // Helper: résoudre une ref (convertit @repeat si nécessaire)
    const resolve = (ref: string): string => {
      const effectiveRef = suffix ? this.resolveRepeatRef(ref, suffix) : ref;
      return this.resolveVariable(effectiveRef);
    };
    
    console.log('📄 [PDF] resolveLineValues:', {
      label: line.label,
      labelSource: line.labelSource,
      quantity: line.quantity,
      quantitySource: line.quantitySource,
      unitPrice: line.unitPrice,
      unitPriceSource: line.unitPriceSource,
      suffix,
    });
    
    const resolvedLine: { description: string; quantity: number | null; unitPrice: number | null; total: number | null } = {
      description: '',
      quantity: null,
      unitPrice: null,
      total: null,
    };
    
    // Résoudre le label/description
    if (line.labelSource) {
      const resolved = resolve(line.labelSource);
      console.log(`📄 [PDF] Label résolu: "${resolved}" (source: ${line.labelSource}, suffix: ${suffix})`);
      resolvedLine.description = resolved || line.label || 'Non défini';
    } else {
      resolvedLine.description = this.substituteVariables(line.label || '');
    }
    
    // Pour les repeaters, ajouter l'instance au label si nécessaire
    if (repeaterInstance && repeaterInstance.instanceLabel) {
      resolvedLine.description = `${resolvedLine.description} (${repeaterInstance.instanceLabel})`;
    }
    
    // Résoudre la quantité (optionnelle)
    if (line.quantitySource) {
      const qty = resolve(line.quantitySource);
      console.log(`📄 [PDF] Quantité résolue: "${qty}" (source: ${line.quantitySource}, suffix: ${suffix})`);
      const n = parseFloat(qty);
      resolvedLine.quantity = Number.isFinite(n) ? n : null;
    } else if (typeof line.quantity === 'string' && line.quantity.startsWith('@')) {
      const qty = resolve(line.quantity);
      const n = parseFloat(qty);
      resolvedLine.quantity = Number.isFinite(n) ? n : null;
    } else {
      if (line.quantity === undefined || line.quantity === null || line.quantity === '') {
        resolvedLine.quantity = null;
      } else {
        const n = parseFloat(line.quantity);
        resolvedLine.quantity = Number.isFinite(n) ? n : null;
      }
    }
    
    // Résoudre le prix unitaire (optionnel)
    if (line.unitPriceSource) {
      const price = resolve(line.unitPriceSource);
      console.log(`📄 [PDF] Prix résolu: "${price}" (source: ${line.unitPriceSource}, suffix: ${suffix})`);
      const n = parseFloat(price);
      resolvedLine.unitPrice = Number.isFinite(n) ? n : null;
    } else if (typeof line.unitPrice === 'string' && (line.unitPrice.startsWith('@') || line.unitPrice.startsWith('node-formula:') || line.unitPrice.startsWith('condition:'))) {
      const price = resolve(line.unitPrice);
      const n = parseFloat(price);
      resolvedLine.unitPrice = Number.isFinite(n) ? n : null;
    } else {
      if (line.unitPrice === undefined || line.unitPrice === null || line.unitPrice === '') {
        resolvedLine.unitPrice = null;
      } else {
        const n = parseFloat(line.unitPrice);
        resolvedLine.unitPrice = Number.isFinite(n) ? n : null;
      }
    }
    
    console.log(`📄 [PDF] ➡️ Ligne résolue:`, resolvedLine);
    
    // Résoudre le total (ou le calculer)
    const hasExplicitTotal = line.totalSource || line.total !== undefined;
    const hasQtyAndUnit = (typeof resolvedLine.quantity === 'number') && (typeof resolvedLine.unitPrice === 'number');
    if (hasExplicitTotal && hasQtyAndUnit) {
      // ✅ Règle: on évite le "qté + prix + total" -> total calculé
      resolvedLine.total = (resolvedLine.quantity as number) * (resolvedLine.unitPrice as number);
    } else if (line.totalSource) {
      const tot = resolve(line.totalSource);
      const n = parseFloat(tot);
      resolvedLine.total = Number.isFinite(n) ? n : null;
    } else if (typeof line.total === 'string' && line.total.startsWith('@')) {
      const tot = resolve(line.total);
      const n = parseFloat(tot);
      resolvedLine.total = Number.isFinite(n) ? n : null;
    } else if (line.total !== undefined) {
      const n = parseFloat(line.total);
      resolvedLine.total = Number.isFinite(n) ? n : null;
    } else {
      // Calcul automatique si quantité+prix sont définis
      resolvedLine.total = hasQtyAndUnit ? (resolvedLine.quantity as number) * (resolvedLine.unitPrice as number) : null;
    }
    
    return resolvedLine;
  }

  /**
   * Récupère les instances d'un repeater depuis les données TBL.
   * 
   * Le repeaterId est l'UUID du noeud repeater PARENT.
   * La ligne de pricing contient des refs @repeat.{repeaterId}.{templateChildId}.
   * Dans tblData (= formData du TBL), les copies repeater ont pour clé:
   *   {templateChildId}-1, {templateChildId}-2, etc.
   * 
   * Pour trouver le nombre d'instances, on collecte d'abord tous les templateChildIds
   * depuis les sources de la ligne, puis on cherche les suffixes dans tblData.
   */
  private getRepeaterInstances(repeaterId: string, tblData: Record<string, any>, line?: any): any[] {
    // 1. Collecter tous les templateChildIds depuis les sources de la ligne
    const templateChildIds = new Set<string>();
    const sources = [line?.labelSource, line?.quantitySource, line?.unitPriceSource, line?.totalSource];
    for (const src of sources) {
      if (typeof src === 'string' && src.startsWith('@repeat.')) {
        const match = src.match(/^@repeat\.[^.]+\.(.+)$/);
        if (match) templateChildIds.add(match[1]);
      }
    }
    
    console.log(`📄 [PDF] Repeater ${repeaterId}: templateChildIds trouvés:`, [...templateChildIds]);
    
    // 2. Chercher les suffixes en scannant tblData pour {templateChildId}-N
    const suffixes = new Set<string>();
    
    // Aussi chercher directement par repeaterId-N (ancien format)
    for (const key of Object.keys(tblData)) {
      // Format: {templateChildId}-{suffix}
      for (const tplId of templateChildIds) {
        const pattern = new RegExp(`^${tplId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
        const m = key.match(pattern);
        if (m) suffixes.add(m[1]);
      }
      // Format ancien: {repeaterId}-{suffix}
      const oldPattern = new RegExp(`^${repeaterId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
      const oldM = key.match(oldPattern);
      if (oldM) suffixes.add(oldM[1]);
    }
    
    // 3. Construire les instances
    const sortedSuffixes = [...suffixes].sort((a, b) => parseInt(a) - parseInt(b));
    const instances = sortedSuffixes.map(suffix => ({
      id: `${repeaterId}-${suffix}`,
      suffix,
      instanceLabel: `#${suffix}`,
      data: {},  // Les données seront résolues via resolveVariable avec le suffix
    }));
    
    console.log(`📄 [PDF] Repeater ${repeaterId}: ${instances.length} instance(s) trouvée(s) (suffixes: ${sortedSuffixes.join(', ')})`);
    return instances;
  }

  /**
   * Évalue une condition d'affichage
   * Supporte deux formats :
   * - SimpleCondition: { fieldRef, operator, compareValue } (PricingLinesEditor)
   * - Legacy rules: { rules: [{ source, operator, value }], operator: 'AND'|'OR' }
   */
  private evaluateCondition(condition: any): boolean {
    if (!condition) return true;

    // Format SimpleCondition (PricingLinesEditor)
    if (condition.fieldRef) {
      const sourceValue = this.resolveVariable(condition.fieldRef);
      const compareValue = condition.compareValue;
      switch (condition.operator) {
        case 'EQUALS': return String(sourceValue) === String(compareValue);
        case 'NOT_EQUALS': return String(sourceValue) !== String(compareValue);
        case 'CONTAINS': return String(sourceValue).includes(String(compareValue || ''));
        case 'GREATER_THAN': return parseFloat(sourceValue) > parseFloat(compareValue);
        case 'LESS_THAN': return parseFloat(sourceValue) < parseFloat(compareValue);
        case 'IS_EMPTY': return !sourceValue || sourceValue === '';
        case 'IS_NOT_EMPTY': return !!sourceValue && sourceValue !== '';
        default: return true;
      }
    }

    // Format legacy avec rules[]
    if (!condition.rules || condition.rules.length === 0) {
      return true; // Pas de condition = toujours visible
    }
    
    const operator = condition.operator || 'AND';
    const results: boolean[] = [];
    
    for (const rule of condition.rules) {
      const sourceValue = this.resolveVariable(rule.source);
      const targetValue = rule.value;
      
      let ruleResult = false;
      
      switch (rule.operator) {
        case 'equals':
        case '==':
          ruleResult = String(sourceValue) === String(targetValue);
          break;
        case 'notEquals':
        case '!=':
          ruleResult = String(sourceValue) !== String(targetValue);
          break;
        case 'contains':
          ruleResult = String(sourceValue).includes(String(targetValue));
          break;
        case 'notContains':
          ruleResult = !String(sourceValue).includes(String(targetValue));
          break;
        case 'greaterThan':
        case '>':
          ruleResult = parseFloat(sourceValue) > parseFloat(targetValue);
          break;
        case 'lessThan':
        case '<':
          ruleResult = parseFloat(sourceValue) < parseFloat(targetValue);
          break;
        case 'greaterOrEqual':
        case '>=':
          ruleResult = parseFloat(sourceValue) >= parseFloat(targetValue);
          break;
        case 'lessOrEqual':
        case '<=':
          ruleResult = parseFloat(sourceValue) <= parseFloat(targetValue);
          break;
        case 'isEmpty':
          ruleResult = !sourceValue || sourceValue === '';
          break;
        case 'isNotEmpty':
          ruleResult = !!sourceValue && sourceValue !== '';
          break;
        case 'isTrue':
          ruleResult = sourceValue === true || sourceValue === 'true' || sourceValue === 1;
          break;
        case 'isFalse':
          ruleResult = sourceValue === false || sourceValue === 'false' || sourceValue === 0;
          break;
        default:
          ruleResult = true;
      }
      
      results.push(ruleResult);
    }
    
    // Combiner les résultats selon l'opérateur
    if (operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Rendu du tableau de prix
   */
  private renderPriceTable(items: any[], _config: Record<string, any>): void {
    const colWidths = {
      description: this.contentWidth * 0.5,
      quantity: this.contentWidth * 0.1,
      unitPrice: this.contentWidth * 0.2,
      total: this.contentWidth * 0.2
    };

    // Header du tableau
    const headerY = this.currentY;
    this.doc
      .rect(this.margin, headerY, this.contentWidth, 25)
      .fill(this.theme.primaryColor || '#1890ff');

    this.doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold');

    let xPos = this.margin + 5;
    this.doc.text('Description', xPos, headerY + 7, { width: colWidths.description - 10 });
    xPos += colWidths.description;
    this.doc.text('Qté', xPos, headerY + 7, { width: colWidths.quantity - 10, align: 'center' });
    xPos += colWidths.quantity;
    this.doc.text('Prix unit.', xPos, headerY + 7, { width: colWidths.unitPrice - 10, align: 'right' });
    xPos += colWidths.unitPrice;
    this.doc.text('Total', xPos, headerY + 7, { width: colWidths.total - 10, align: 'right' });

    this.currentY = headerY + 30;

    // Lignes du tableau
    this.doc.font('Helvetica').fillColor(this.theme.textColor || '#333333');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowY = this.currentY;

      // Alternance de couleur
      if (i % 2 === 1) {
        this.doc
          .rect(this.margin, rowY, this.contentWidth, 22)
          .fill('#f9f9f9');
      }

      this.doc.fillColor(this.theme.textColor || '#333333').fontSize(9);

      xPos = this.margin + 5;
      const desc = this.substituteVariables(item.description || item.name || '');
      this.doc.text(desc, xPos, rowY + 5, { width: colWidths.description - 10 });
      
      xPos += colWidths.description;
      this.doc.text(String(item.quantity || 1), xPos, rowY + 5, { width: colWidths.quantity - 10, align: 'center' });
      
      xPos += colWidths.quantity;
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) + ' €' : (item.unitPrice || '-');
      this.doc.text(unitPrice, xPos, rowY + 5, { width: colWidths.unitPrice - 10, align: 'right' });
      
      xPos += colWidths.unitPrice;
      const total = typeof item.total === 'number' ? item.total.toFixed(2) + ' €' : (item.total || '-');
      this.doc.text(total, xPos, rowY + 5, { width: colWidths.total - 10, align: 'right' });

      this.currentY += 22;
      this.checkPageBreak(25);
    }

    // Ligne de séparation
    this.doc
      .moveTo(this.margin, this.currentY)
      .lineTo(this.margin + this.contentWidth, this.currentY)
      .stroke('#e8e8e8');

    this.currentY += 10;
  }

  /**
   * Totaux du tableau de prix
   */
  private renderPriceTotals(config: Record<string, any>): void {
    const quote = this.ctx.quote || {};
    const totalsX = this.pageWidth - this.margin - 200;

    // Total HT
    if (quote.totalHT !== undefined || config.totalHT !== undefined) {
      const ht = quote.totalHT ?? config.totalHT ?? 0;
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica')
        .fillColor('#666666')
        .text('Total HT:', totalsX, this.currentY, { width: 100 });
      this.doc
        .font('Helvetica-Bold')
        .fillColor(this.theme.textColor || '#333333')
        .text(`${ht.toFixed(2)} €`, totalsX + 100, this.currentY, { width: 90, align: 'right' });
      this.currentY += 18;
    }

    // TVA
    if (quote.totalTVA !== undefined || config.totalTVA !== undefined) {
      const tva = quote.totalTVA ?? config.totalTVA ?? 0;
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica')
        .fillColor('#666666')
        .text('TVA (21%):', totalsX, this.currentY, { width: 100 });
      this.doc
        .font('Helvetica-Bold')
        .fillColor(this.theme.textColor || '#333333')
        .text(`${tva.toFixed(2)} €`, totalsX + 100, this.currentY, { width: 90, align: 'right' });
      this.currentY += 18;
    }

    // Total TTC
    if (quote.totalTTC !== undefined || config.totalTTC !== undefined) {
      const ttc = quote.totalTTC ?? config.totalTTC ?? 0;
      
      // Box pour le total TTC
      this.doc
        .rect(totalsX - 10, this.currentY - 5, 210, 30)
        .fill(this.theme.primaryColor || '#1890ff');

      this.doc
        .fontSize(this.scaleFontSize(12))
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('TOTAL TTC:', totalsX, this.currentY + 3, { width: 100 });
      this.doc
        .text(`${ttc.toFixed(2)} €`, totalsX + 100, this.currentY + 3, { width: 90, align: 'right' });
      
      this.currentY += 40;
    }
  }

  /**
   * Bloc de texte libre
   */
  private renderTextBlock(config: Record<string, any>): void {
    this.checkPageBreak(100);

    // Titre optionnel
    if (config.title) {
      const title = this.substituteVariables(this.getTranslatedValue(config.title, ''));
      if (title) {
        this.renderSectionTitle(title);
      }
    }

    // Contenu
    if (config.content) {
      const content = this.substituteVariables(this.getTranslatedValue(config.content, ''));
      this.doc
        .fontSize(config.fontSize || this.theme.fontSize || 11)
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(content, this.margin, this.currentY, {
          width: this.contentWidth,
          align: config.align || 'left',
          lineGap: 4
        });
      this.currentY = this.doc.y + 20;
    }
  }

  /**
   * Conditions générales
   */
  private renderTermsConditions(config: Record<string, any>): void {
    this.checkPageBreak(150);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Conditions Générales')
    );

    this.renderSectionTitle(title);

    const terms = this.getTranslatedValue(config.terms, config.content || '');
    if (terms) {
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(this.substituteVariables(terms), this.margin, this.currentY, {
          width: this.contentWidth,
          align: 'justify',
          lineGap: 3
        });
      this.currentY = this.doc.y + 20;
    }

    // Liste des conditions
    if (config.items && Array.isArray(config.items)) {
      for (const item of config.items) {
        this.doc
          .fontSize(9)
          .text(`• ${this.substituteVariables(item)}`, this.margin + 10, this.currentY);
        this.currentY += 14;
      }
      this.currentY += 10;
    }
  }

  /**
   * Bloc de signature
   */
  private renderSignatureBlock(config: Record<string, any>): void {
    this.checkPageBreak(150);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Signature')
    );

    if (config.showTitle !== false) {
      this.renderSectionTitle(title);
    }

    // Texte d'acceptation
    if (config.acceptanceText) {
      const text = this.substituteVariables(this.getTranslatedValue(config.acceptanceText, ''));
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(text, this.margin, this.currentY, {
          width: this.contentWidth
        });
      this.currentY = this.doc.y + 20;
    }

    // Deux colonnes pour signatures
    const colWidth = (this.contentWidth - 40) / 2;
    const leftX = this.margin;
    const rightX = this.margin + colWidth + 40;
    const signatureY = this.currentY;

    // Colonne gauche - Le client
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.theme.textColor || '#333333')
      .text('Le Client', leftX, signatureY);
    
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Date: ____/____/________', leftX, signatureY + 20)
      .text('Signature précédée de la mention', leftX, signatureY + 40)
      .text('"Lu et approuvé":', leftX, signatureY + 52);

    // Zone de signature (rectangle)
    this.doc
      .rect(leftX, signatureY + 70, colWidth, 60)
      .stroke('#cccccc');

    // Colonne droite - L'entreprise
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.theme.textColor || '#333333')
      .text('Pour l\'entreprise', rightX, signatureY);

    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Date: ____/____/________', rightX, signatureY + 20)
      .text(this.ctx.organization?.name || '', rightX, signatureY + 40);

    // Zone de signature
    this.doc
      .rect(rightX, signatureY + 70, colWidth, 60)
      .stroke('#cccccc');

    this.currentY = signatureY + 150;
  }

  /**
   * Informations de contact
   */
  private renderContactInfo(config: Record<string, any>): void {
    this.checkPageBreak(100);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Contact')
    );

    this.renderSectionTitle(title);

    const org = this.ctx.organization || {};

    if (org.name) {
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.theme.textColor || '#333333')
        .text(org.name, this.margin, this.currentY);
      this.currentY += 18;
    }

    this.doc.font('Helvetica').fontSize(10).fillColor('#666666');

    if (org.address) {
      this.doc.text(`📍 ${org.address}`, this.margin, this.currentY);
      this.currentY += 14;
    }
    if (org.phone) {
      this.doc.text(`📞 ${org.phone}`, this.margin, this.currentY);
      this.currentY += 14;
    }
    if (org.email) {
      this.doc.text(`📧 ${org.email}`, this.margin, this.currentY);
      this.currentY += 14;
    }
    if (org.website) {
      this.doc.text(`🌐 ${org.website}`, this.margin, this.currentY);
      this.currentY += 14;
    }
    if (org.vatNumber) {
      this.doc.text(`TVA: ${org.vatNumber}`, this.margin, this.currentY);
      this.currentY += 14;
    }

    this.currentY += 10;
  }

  /**
   * Spécifications techniques (données TBL)
   */
  private renderTechnicalSpecs(config: Record<string, any>): void {
    this.checkPageBreak(150);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Spécifications Techniques')
    );

    this.renderSectionTitle(title);

    // Afficher les données TBL
    this.renderTblDataSummary();
  }

  /**
   * Timeline / Calendrier
   */
  private renderTimeline(config: Record<string, any>): void {
    this.checkPageBreak(150);

    const title = this.substituteVariables(
      this.getTranslatedValue(config.title, 'Calendrier')
    );

    this.renderSectionTitle(title);

    if (config.items && Array.isArray(config.items)) {
      for (const item of config.items) {
        this.doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.theme.primaryColor || '#1890ff')
          .text(`📅 ${item.date || ''}`, this.margin, this.currentY);
        
        this.doc
          .font('Helvetica')
          .fillColor(this.theme.textColor || '#333333')
          .text(this.substituteVariables(item.description || ''), this.margin + 100, this.currentY);
        
        this.currentY += 20;
      }
    }

    this.currentY += 10;
  }

  /**
   * Image
   */
  private renderImage(config: Record<string, any>): void {
    // TODO: Implémenter le chargement d'images distantes
    // Pour l'instant, on affiche juste un placeholder
    if (config.url || config.src) {
      this.checkPageBreak(100);
      this.doc
        .fontSize(10)
        .fillColor('#999999')
        .text(`[Image: ${config.url || config.src}]`, this.margin, this.currentY);
      this.currentY += 20;
    }
  }

  /**
   * Contenu personnalisé
   */
  private renderCustomContent(config: Record<string, any>): void {
    if (config.content) {
      const content = this.substituteVariables(config.content);
      // Rendu basique du contenu (sans HTML)
      this.doc
        .fontSize(this.theme.fontSize || 11)
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(content, this.margin, this.currentY, {
          width: this.contentWidth
        });
      this.currentY = this.doc.y + 15;
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Rendu d'un titre de section
   */
  private renderSectionTitle(title: string): void {
    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(this.theme.primaryColor || '#1890ff')
      .text(title, this.margin, this.currentY);
    
    // Ligne sous le titre
    this.currentY = this.doc.y + 5;
    this.doc
      .moveTo(this.margin, this.currentY)
      .lineTo(this.margin + 100, this.currentY)
      .lineWidth(2)
      .stroke(this.theme.primaryColor || '#1890ff');
    
    this.currentY += 15;
  }

  /**
   * Rendu des données TBL
   */
  private renderTblDataSummary(): void {
    const tblData = this.ctx.tblData || {};
    
    // Filtrer et formater les données
    const entries = Object.entries(tblData).filter(([_key, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.startsWith('data:image')) return false;
      if (typeof value === 'string' && value.length > 500) return false;
      return true;
    });

    if (entries.length === 0) {
      this.doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Aucune donnée technique disponible', this.margin, this.currentY);
      this.currentY += 20;
      return;
    }

    // Afficher sous forme de tableau simple
    for (const [key, value] of entries) {
      this.checkPageBreak(20);
      
      const label = this.formatLabel(key);
      const displayValue = this.formatValue(value);

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#666666')
        .text(`${label}:`, this.margin, this.currentY, { continued: true, width: 200 });
      
      this.doc
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333')
        .text(` ${displayValue}`, { width: this.contentWidth - 210 });
      
      this.currentY = this.doc.y + 5;
    }

    this.currentY += 10;
  }

  /**
   * Rendu des champs liés
   */
  private renderLinkedFields(linkedFields: string[]): void {
    for (const fieldRef of linkedFields) {
      const value = this.resolveVariable(fieldRef);
      if (value) {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.theme.textColor || '#333333')
          .text(`• ${value}`, this.margin + 10, this.currentY);
        this.currentY += 16;
      }
    }
  }

  /**
   * Extraire les données de prix depuis TBL
   */
  private extractPricingFromTbl(): any[] {
    // TODO: Parser les données TBL pour trouver les éléments de prix
    // Pour l'instant, retourner un tableau vide
    return [];
  }

  /**
   * Substitue les variables dans un texte
   */
  private substituteVariables(text: string): string {
    if (!text || typeof text !== 'string') return text || '';

    let result = text;

    // Substitution des variables @value.xxx et @select.xxx
    result = result.replace(/@(value|select)\.([a-zA-Z0-9_.-]+)/g, (_match, type, ref) => {
      return this.resolveVariable(`@${type}.${ref}`);
    });

    // Substitution des variables {{xxx.yyy}}
    result = result.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, ref) => {
      return this.resolveVariable(ref);
    });

    // 🔥 Substitution des variables {lead.xxx}, {quote.xxx}, {org.xxx} (format utilisé dans les conditions)
    result = result.replace(/\{(lead|quote|org)\.([a-zA-Z0-9_.]+)\}/g, (_match, source, key) => {
      return this.resolveVariable(`${source}.${key}`);
    });

    return result;
  }

  private normalizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<\/?p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+\n/g, '\n')
      .trim();
  }

  private isNearWhite(color?: string): boolean {
    if (!color) return false;
    const normalized = color.toLowerCase().trim();
    if (normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') return true;
    const hex = normalized.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return r >= 245 && g >= 245 && b >= 245;
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return r >= 245 && g >= 245 && b >= 245;
    }
    return false;
  }

  /**
   * Résout une référence de variable
   */
  private resolveVariable(ref: string): string {
    const lead = this.ctx.lead || {};
    const org = this.ctx.organization || {};
    const quote = this.ctx.quote || {};
    const tblData = this.ctx.tblData || {};

    // Variables lead.xxx
    if (ref.startsWith('lead.')) {
      const key = ref.replace('lead.', '');
      const value = (lead as any)[key];
      console.log(`📄 [PDF] resolveVariable("${ref}") -> lead.${key} = "${value}"`);
      return String(value || '');
    }

    // Variables org.xxx
    if (ref.startsWith('org.')) {
      const key = ref.replace('org.', '');
      const orgAny = org as any;

      // Synonymes / compat PageBuilder
      if (key === 'tva') return String(orgAny.tva ?? orgAny.vatNumber ?? '');
      if (key === 'iban') return String(orgAny.iban ?? orgAny.bankAccount ?? '');
      if (key === 'bic') return String(orgAny.bic ?? '');
      if (key === 'bankName') return String(orgAny.bankName ?? '');

      const value = orgAny[key];
      console.log(`📄 [PDF] resolveVariable("${ref}") -> org.${key} = "${value}"`);
      return String(value || '');
    }

    // Variables quote.xxx
    if (ref.startsWith('quote.')) {
      const key = ref.replace('quote.', '');
      const value = (quote as any)[key];
      console.log(`📄 [PDF] resolveVariable("${ref}") -> quote.${key} = "${value}"`, { quoteKeys: Object.keys(quote) });
      if (typeof value === 'number') return value.toFixed(2);
      return String(value || '');
    }

    // Variables @value.xxx et @select.xxx (données TBL)
    if (ref.startsWith('@value.') || ref.startsWith('@select.')) {
      const nodeRef = ref.replace(/^@(value|select)\./, '');
      console.log(`📄 [PDF] Cherche TBL ref: "${nodeRef}"`);
      
      // Chercher dans tblData par ID exact
      if (tblData[nodeRef] !== undefined) {
        console.log(`📄 [PDF] ✅ Trouvé exact: ${tblData[nodeRef]}`);
        return this.formatValue(tblData[nodeRef]);
      }
      
      // Chercher dans values si c'est une submission
      if (tblData.values && tblData.values[nodeRef] !== undefined) {
        console.log(`📄 [PDF] ✅ Trouvé dans values: ${tblData.values[nodeRef]}`);
        return this.formatValue(tblData.values[nodeRef]);
      }
      
      // Chercher par clé partielle (le nodeRef peut être le dernier segment d'un ID plus long)
      for (const [key, value] of Object.entries(tblData)) {
        if (key.includes(nodeRef) || key.endsWith(nodeRef)) {
          console.log(`📄 [PDF] ✅ Trouvé partiel "${key}": ${value}`);
          return this.formatValue(value);
        }
      }
      
      // Chercher aussi dans values par clé partielle
      if (tblData.values) {
        for (const [key, value] of Object.entries(tblData.values)) {
          if (key.includes(nodeRef) || key.endsWith(nodeRef)) {
            console.log(`📄 [PDF] ✅ Trouvé partiel dans values "${key}": ${value}`);
            return this.formatValue(value);
          }
        }
      }
    }

    // 🆕 Variables calculatedValue:xxx ou @calculated.xxx
    if (ref.startsWith('calculatedValue:') || ref.startsWith('@calculated.')) {
      const calcRef = ref.replace(/^(calculatedValue:|@calculated\.)/, '');
      console.log(`📄 [PDF] Cherche calculatedValue: "${calcRef}"`);
      
      // Chercher dans calculatedValues ou directement dans tblData
      if (tblData.calculatedValues && tblData.calculatedValues[calcRef] !== undefined) {
        return this.formatValue(tblData.calculatedValues[calcRef]);
      }
      if (tblData[calcRef] !== undefined) {
        return this.formatValue(tblData[calcRef]);
      }
      // Chercher par suffixe
      for (const [key, value] of Object.entries(tblData)) {
        if (key.includes(calcRef) || key.endsWith(calcRef)) {
          return this.formatValue(value);
        }
      }
    }

    // 🆕 Variables node-formula:xxx ou formula:xxx
    if (ref.startsWith('node-formula:') || ref.startsWith('formula:')) {
      const formulaRef = ref.replace(/^(node-formula:|formula:)/, '');
      console.log(`📄 [PDF] Cherche formula: "${formulaRef}"`);
      
      // Chercher dans formulas ou directement
      if (tblData.formulas && tblData.formulas[formulaRef] !== undefined) {
        return this.formatValue(tblData.formulas[formulaRef]);
      }
      if (tblData[formulaRef] !== undefined) {
        return this.formatValue(tblData[formulaRef]);
      }
      // Chercher par suffixe
      for (const [key, value] of Object.entries(tblData)) {
        if (key.includes(formulaRef) || key.endsWith(formulaRef)) {
          return this.formatValue(value);
        }
      }
    }

    // 🆕 Variables condition:xxx
    if (ref.startsWith('condition:')) {
      const condRef = ref.replace('condition:', '');
      console.log(`📄 [PDF] Cherche condition: "${condRef}"`);
      
      if (tblData.conditions && tblData.conditions[condRef] !== undefined) {
        return this.formatValue(tblData.conditions[condRef]);
      }
      if (tblData[condRef] !== undefined) {
        return this.formatValue(tblData[condRef]);
      }
    }

    // Variable directe dans tblData
    if (tblData[ref] !== undefined) {
      return this.formatValue(tblData[ref]);
    }
    
    // 🆕 Dernière tentative: chercher par ID partiel dans toutes les clés
    for (const [key, value] of Object.entries(tblData)) {
      if (key.includes(ref) || ref.includes(key)) {
        console.log(`📄 [PDF] ✅ Trouvé par recherche globale "${key}": ${value}`);
        return this.formatValue(value);
      }
    }

    console.log(`📄 [PDF] ❌ Variable non trouvée: "${ref}"`);
    return '';
  }

  /**
   * Récupère une valeur traduite
   */
  private getTranslatedValue(value: any, fallback: string): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value[this.ctx.language] || value['fr'] || value[Object.keys(value)[0]] || fallback;
    }
    return fallback;
  }

  // evaluateCondition est défini plus haut (ligne ~3009) — supporte SimpleCondition + legacy rules

  /**
   * Évalue une seule règle de condition
   */
  private evaluateSingleConditionRule(rule: ConditionRule): boolean {
    const fieldRef = rule.fieldRef;
    let fieldValue: any = null;
    
    // Format {lead.xxx}, {quote.xxx}, {org.xxx}
    const curlyMatch = fieldRef.match(/^\{(lead|quote|org)\.([a-zA-Z0-9_.]+)\}$/);
    if (curlyMatch) {
      const [, source, key] = curlyMatch;
      let data: any = null;
      if (source === 'lead') data = this.ctx.lead;
      else if (source === 'quote') data = this.ctx.quote;
      else if (source === 'org') data = this.ctx.organization;
      
      if (data) {
        const keys = key.split('.');
        fieldValue = data;
        for (const k of keys) {
          fieldValue = fieldValue?.[k];
        }
      }
    }
    
    // Format @value.xxx ou @select.xxx (TBL)
    const tblMatch = fieldRef.match(/^@(value|select)\.([a-zA-Z0-9_.-]+)$/);
    if (tblMatch) {
      const [, , key] = tblMatch;
      fieldValue = this.ctx.tblData?.[key];
    }
    
    const compareValue = rule.compareValue;
    
    console.log(`📋 [PDF Condition] Rule: ${fieldRef} ${rule.operator} ${compareValue} | fieldValue=${fieldValue}`);
    
    // Évaluer l'opérateur
    switch (rule.operator) {
      case 'IS_EMPTY':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'IS_NOT_EMPTY':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'EQUALS':
        return String(fieldValue) === String(compareValue);
      case 'NOT_EQUALS':
        return String(fieldValue) !== String(compareValue);
      case 'CONTAINS':
        return String(fieldValue || '').toLowerCase().includes(String(compareValue).toLowerCase());
      case 'NOT_CONTAINS':
        return !String(fieldValue || '').toLowerCase().includes(String(compareValue).toLowerCase());
      case 'GREATER_THAN':
        return Number(fieldValue) > Number(compareValue);
      case 'LESS_THAN':
        return Number(fieldValue) < Number(compareValue);
      case 'GREATER_OR_EQUAL':
        return Number(fieldValue) >= Number(compareValue);
      case 'LESS_OR_EQUAL':
        return Number(fieldValue) <= Number(compareValue);
      default:
        return true;
    }
  }

  /**
   * Évalue les conditions d'un module et retourne le résultat
   * @returns { shouldRender: boolean, content?: string }
   */
  private evaluateModuleConditions(config: Record<string, any>): { shouldRender: boolean; content?: string } {
    const conditionalConfig = config._conditionalDisplay as ConditionalConfig | undefined;
    
    if (!conditionalConfig || !conditionalConfig.enabled || conditionalConfig.rules.length === 0) {
      return { shouldRender: true };
    }
    
    console.log(`📋 [PDF] Évaluation conditions:`, JSON.stringify(conditionalConfig.rules));
    
    // Évaluer toutes les règles
    let result = this.evaluateSingleConditionRule(conditionalConfig.rules[0]);
    
    for (let i = 1; i < conditionalConfig.rules.length; i++) {
      const rule = conditionalConfig.rules[i];
      const ruleResult = this.evaluateSingleConditionRule(rule);
      
      if (rule.logicOperator === 'AND') {
        result = result && ruleResult;
      } else if (rule.logicOperator === 'OR') {
        result = result || ruleResult;
      }
    }
    
    // Déterminer le comportement selon l'action
    const action = conditionalConfig.rules[0]?.action || 'SHOW';
    
    console.log(`📋 [PDF] Condition result: ${result}, action: ${action}`);
    
    if (action === 'SHOW') {
      // Quand on montre si la condition est vraie
      if (result && conditionalConfig.showContent) {
        // Condition vraie ET showContent défini -> afficher showContent
        return {
          shouldRender: true,
          content: this.substituteVariables(conditionalConfig.showContent),
        };
      } else if (!result && conditionalConfig.hideContent) {
        // Condition fausse ET hideContent défini -> afficher hideContent
        return {
          shouldRender: true,
          content: this.substituteVariables(conditionalConfig.hideContent),
        };
      } else if (!result) {
        // Condition fausse sans hideContent -> ne pas afficher
        return { shouldRender: false };
      }
      return { shouldRender: result };
    } else if (action === 'HIDE') {
      // Quand on cache si la condition est vraie
      if (!result && conditionalConfig.showContent) {
        return {
          shouldRender: true,
          content: this.substituteVariables(conditionalConfig.showContent),
        };
      } else if (result && conditionalConfig.hideContent) {
        return {
          shouldRender: true,
          content: this.substituteVariables(conditionalConfig.hideContent),
        };
      }
      return { shouldRender: !result };
    } else if (action === 'ADD_CONTENT') {
      return {
        shouldRender: true,
        content: result ? this.substituteVariables(conditionalConfig.addContent || '') : this.substituteVariables(conditionalConfig.hideContent || ''),
      };
    }
    
    return { shouldRender: true };
  }

  /**
   * Formate un label
   */
  private formatLabel(key: string): string {
    if (/^[a-f0-9-]{36}$/i.test(key)) return 'Champ';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Formate une valeur
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') return value.toLocaleString('fr-FR');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Vérifie si besoin d'une nouvelle page
   */
  private checkPageBreak(neededSpace: number): void {
    if (this.currentY + neededSpace > this.pageHeight - this.margin - 50) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  /**
   * Pied de page - dessine sur la position absolue en bas de page
   */
  private renderFooter(): void {
    const footerY = this.pageHeight - 40;
    const footerText = `Document généré le ${new Date().toLocaleDateString('fr-FR')} | ${this.ctx.organization?.name || '2Thier CRM'}`;
    
    console.log(`📄 [PDF] FOOTER: y=${footerY}`);
    
    // Dessiner le footer avec une position Y absolue
    // Utiliser une très petite hauteur pour éviter tout débordement
    this.doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(footerText, this.margin, footerY, { 
        width: this.contentWidth, 
        align: 'center', 
        lineBreak: false,
        height: 20 // Limiter strictement la hauteur
      });
  }

  private ensureDocumentIsA4(): void {
    const page = (this.doc as any).page;
    if (!page) return;

    const actualWidth = page.width ?? this.pageWidth;
    const actualHeight = page.height ?? this.pageHeight;
    const widthDiff = Math.abs(actualWidth - this.pageWidth);
    const heightDiff = Math.abs(actualHeight - this.pageHeight);

    if (widthDiff > A4_DIMENSION_TOLERANCE || heightDiff > A4_DIMENSION_TOLERANCE) {
      console.warn(`📄 [PDF] Taille A4 attendue: ${this.pageWidth.toFixed(2)}x${this.pageHeight.toFixed(2)}, taille réelle: ${actualWidth.toFixed(2)}x${actualHeight.toFixed(2)}`);
    }

    this.pageWidth = actualWidth;
    this.pageHeight = actualHeight;
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }
}

/**
 * Fonction utilitaire pour générer un PDF depuis un contexte
 */
export async function renderDocumentPdf(context: RenderContext): Promise<Buffer> {
  const renderer = new DocumentPdfRenderer(context);
  return renderer.render();
}

export default DocumentPdfRenderer;
