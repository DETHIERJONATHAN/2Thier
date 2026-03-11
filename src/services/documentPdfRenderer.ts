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

interface ElectronicSignatureData {
  signerName: string;
  signerRole: string;
  signatureData: string; // base64 PNG
  signedAt: Date;
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
  /** Map optionId → label pour résoudre les valeurs SELECT (UUID → texte lisible) */
  selectOptionsMap?: Record<string, string>;
  /** Signatures électroniques à intégrer dans le bloc signature du PDF */
  electronicSignatures?: ElectronicSignatureData[];
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
  private emojiPngCache: Map<string, string> = new Map(); // Cache emoji -> chemin PNG local
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
  /**
   * Convertit un emoji en nom de fichier Twemoji (codepoints hex séparés par des tirets)
   */
  private emojiToTwemojiHex(emoji: string): string {
    const codepoints: string[] = [];
    for (const char of emoji) {
      const cp = char.codePointAt(0);
      if (cp && cp > 0x7F && cp !== 0xFE0F && cp !== 0x200D && cp !== 0x200B) {
        codepoints.push(cp.toString(16));
      }
    }
    return codepoints.join('-');
  }

  /**
   * Pré-charge les images PNG Twemoji pour tous les emojis KPI utilisés dans le document.
   * Les télécharge depuis le CDN et les met en cache local dans /tmp/emoji-cache/.
   */
  private async preloadEmojiPngs(): Promise<void> {
    // Scanner toutes les sections pour trouver les emojis KPI
    const emojis = new Set<string>();
    for (const section of this.ctx.template.sections || []) {
      const modules = section.config?.modules || [];
      for (const mod of modules) {
        const c = mod.config || {};
        for (let i = 1; i <= 8; i++) {
          const rawIcon = c[`kpi${i}_icon`] || '';
          if (!rawIcon) continue;
          // Extraire l'emoji depuis le format "cat:emoji"
          const emoji = rawIcon.includes(':') ? rawIcon.split(':').slice(1).join(':') : rawIcon;
          if (emoji.trim()) emojis.add(emoji.trim());
        }
        // Aussi scanner le tableau kpis[] en fallback
        if (Array.isArray(c.kpis)) {
          for (const kpi of c.kpis) {
            if (kpi?.icon) emojis.add(kpi.icon.trim());
          }
        }
      }
    }

    // Toujours pré-charger l'emoji 🏷️ pour la ligne Remise
    emojis.add('🏷️');

    if (emojis.size === 0) return;

    const cacheDir = '/tmp/emoji-cache';
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const downloadPromises = [...emojis].map(async (emoji) => {
      const hex = this.emojiToTwemojiHex(emoji);
      if (!hex) return;

      const cachePath = path.join(cacheDir, `${hex}.png`);

      // Si déjà en cache sur disque, juste enregistrer le chemin
      if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 100) {
        this.emojiPngCache.set(emoji, cachePath);
        return;
      }

      // Télécharger depuis Twemoji CDN
      const urls = [
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${hex}.png`,
        `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${hex}.png`,
      ];

      for (const url of urls) {
        try {
          const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (resp.ok) {
            const buf = Buffer.from(await resp.arrayBuffer());
            fs.writeFileSync(cachePath, buf);
            this.emojiPngCache.set(emoji, cachePath);
            console.log(`📄 [PDF] Emoji ${emoji} → ${hex}.png (${buf.length}B)`);
            return;
          }
        } catch { /* try next */ }
      }
      console.warn(`📄 [PDF] Emoji non trouvé sur Twemoji: ${emoji} (${hex})`);
    });

    await Promise.all(downloadPromises);
    if (this.emojiPngCache.size > 0) {
      console.log(`📄 [PDF] ${this.emojiPngCache.size} emojis KPI pré-chargés`);
    }
  }

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
    // Pré-charger les emojis KPI en PNG (Twemoji)
    await this.preloadEmojiPngs();
    
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
        
        const lineStyle = item.style;
        
        // Fond de ligne personnalisé
        if (lineStyle?.backgroundColor) {
          this.doc.rect(x, currentY, width, rowHeight).fill(lineStyle.backgroundColor);
        }
        
        // Description avec style personnalisé
        let descText = this.applyTextTransform(item.description || '-', lineStyle?.textTransform);
        if (lineStyle && (lineStyle.bold || lineStyle.italic || lineStyle.underline || lineStyle.fontSize || lineStyle.color)) {
          const applied = this.applyLineStyle(lineStyle, 10);
          if (applied.underline) {
            this.drawUnderlinedText(descText, x + 5, currentY + 4, { width: colWidths[0] - 10 });
          } else {
            this.doc.text(descText, x + 5, currentY + 4, { width: colWidths[0] - 10 });
          }
          // Revenir au style normal pour les colonnes chiffres
          this.doc.fontSize(this.scaleFontSize(10)).font('Helvetica').fillColor(this.theme.textColor || '#333333');
        } else {
          this.doc
            .fontSize(this.scaleFontSize(10))
            .font('Helvetica')
            .fillColor(this.theme.textColor || '#333333');
          this.doc.text(descText, x + 5, currentY + 4, { width: colWidths[0] - 10 });
        }

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

      // Si on a fini les lignes, tenter d'afficher les totaux TBL sur cette page
      if (rowIndex >= items.length) {
        const totalsResult = this.renderPricingTotalsTBL(config, x, currentY, width, colWidths, cellPadding, currency, (neededH: number) => canFitUnderBottomLimit(currentY + 5, neededH + 5));
        if (totalsResult === 'needs-new-page') {
          startNewPage();
          pageIndex += 1;
          continue;
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

    console.log(`📄 [PDF] ★★★ FRESH CODE ★★★ Module ${moduleType}: PageBuilder(${position.x ?? 0},${position.y ?? 0}) -> PDF(${rect.x.toFixed(1)},${rect.y.toFixed(1)}) size ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);
    // debug dispatch removed

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
        case 'KPI_BANNER':
          this.renderModuleKpiBanner(effectiveConfig, rect.x, rect.y, rect.width, rect.height);
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
        
        const lineStyle = item.style;
        
        // Fond de ligne personnalisé
        if (lineStyle?.backgroundColor) {
          this.doc.rect(x, currentY, width, rowHeight).fill(lineStyle.backgroundColor);
        }
        
        // Description avec style
        let descText = this.applyTextTransform(item.description || '-', lineStyle?.textTransform);
        if (lineStyle && (lineStyle.bold || lineStyle.italic || lineStyle.underline || lineStyle.fontSize || lineStyle.color)) {
          const applied = this.applyLineStyle(lineStyle, 10);
          if (applied.underline) {
            this.drawUnderlinedText(descText, x + 5, currentY + 4, { width: colWidths[0] - 10 });
          } else {
            this.doc.text(descText, x + 5, currentY + 4, { width: colWidths[0] - 10 });
          }
          this.doc.fontSize(this.scaleFontSize(10)).font('Helvetica').fillColor(this.theme.textColor || '#333333');
        } else {
          this.doc
            .fontSize(this.scaleFontSize(10))
            .font('Helvetica')
            .fillColor(this.theme.textColor || '#333333');
          this.doc.text(descText, x + 5, currentY + 4, { width: colWidths[0] - 10 });
        }
        
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
    
    // 🆕 Totaux via sources TBL
    this.renderPricingTotalsTBL(config, x, currentY, width, colWidths, cellPadding, currency, (neededH: number) => this.canFitOnPage(currentY, neededH + 5));
  }

  /**
   * 🆕 Rend les totaux du tableau de prix à partir des sources TBL liées
   * Affiche: Remise, Total HTVA, TVA, Total TVAC (si les sources sont configurées)
   */
  private renderPricingTotalsTBL(
    config: Record<string, any>,
    x: number,
    startY: number,
    width: number,
    colWidths: number[],
    cellPadding: number,
    currency: string,
    canFit: (neededHeight: number) => boolean
  ): 'ok' | 'needs-new-page' {
    const hasRemise = !!config.remiseSource;
    const hasTotalHTVA = !!config.totalHTVASource;
    const hasTotalTVA = !!config.totalTVASource;
    const hasTotalTVAC = !!config.totalTVACSource;

    if (!hasRemise && !hasTotalHTVA && !hasTotalTVA && !hasTotalTVAC) return 'ok';

    // Calculer la hauteur nécessaire
    let linesCount = 0;
    if (hasRemise) linesCount++;
    if (hasTotalHTVA) linesCount++;
    if (hasTotalTVA) linesCount++;
    if (hasTotalTVAC) linesCount++;
    const totalsHeight = linesCount * 17 + (hasTotalTVAC ? 8 : 0) + 10;

    if (!canFit(totalsHeight)) return 'needs-new-page';

    let currentY = startY + 5;
    const labelX = x + colWidths[0] + colWidths[1];
    const labelW = colWidths[2] + colWidths[3] * 0.5 - cellPadding;
    const valX = x + width - colWidths[3];
    const valW = colWidths[3] - cellPadding;

    const resolveAndFormat = (source: string): string => {
      const raw = this.resolveVariable(source);
      // 🔥 FIX: Nettoyer les nombres formatés en français (espaces insécables, virgule décimale)
      // formatValue peut retourner "5 000" ou "1 234,56" qui cassent parseFloat
      const cleaned = raw.replace(/[\s\u00A0]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      console.log(`📄 [PDF] resolveAndFormat("${source}") → raw="${raw}", cleaned="${cleaned}", num=${num}, isFinite=${Number.isFinite(num)}`);
      if (Number.isFinite(num)) return `${num.toFixed(2)} ${currency}`;
      return raw || '-';
    };

    // 🔥 DEBUG: Log les sources configurées
    console.log(`📄 [PDF] renderPricingTotalsTBL sources:`, {
      remiseSource: config.remiseSource || '(non configuré)',
      totalHTVASource: config.totalHTVASource || '(non configuré)',
      totalTVASource: config.totalTVASource || '(non configuré)',
      totalTVACSource: config.totalTVACSource || '(non configuré)',
      tblDataKeys: Object.keys(this.ctx.tblData || {}).slice(0, 20),
      formulaResultsMap: (this.ctx as any).formulaResultsMap || {},
    });

    // Remise
    if (hasRemise) {
      const remFs = this.scaleFontSize(10);
      this.doc.fontSize(remFs).font('Helvetica-Bold').fillColor('#D9791F');
      // Icône 🏷️ en PNG Twemoji (même système que le bandeau KPI)
      const remTextW = this.doc.widthOfString('Remise');
      const remTextX = labelX + labelW - remTextW;
      const tagS = remFs + 2;
      const tagPng = this.emojiPngCache.get('🏷️');
      if (tagPng && fs.existsSync(tagPng)) {
        try {
          this.doc.image(tagPng, remTextX - tagS - 3, currentY - 1, { width: tagS, height: tagS });
        } catch (e) { console.warn('PDF tag icon error:', e); }
      }
      this.doc.fontSize(remFs).font('Helvetica-Bold').fillColor('#D9791F');
      this.doc.text('Remise', labelX, currentY, { width: labelW, align: 'right' });
      this.doc.text(`- ${resolveAndFormat(config.remiseSource)}`, valX, currentY, { width: valW, align: 'right' });
      currentY += 17;
    }

    // Total HTVA
    if (hasTotalHTVA) {
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica-Bold')
        .fillColor(this.theme.textColor || '#333333');
      this.doc.text('Total HTVA', labelX, currentY, { width: labelW, align: 'right' });
      this.doc.text(resolveAndFormat(config.totalHTVASource), valX, currentY, { width: valW, align: 'right' });
      currentY += 17;
    }

    // TVA
    if (hasTotalTVA) {
      this.doc
        .fontSize(this.scaleFontSize(10))
        .font('Helvetica')
        .fillColor(this.theme.textColor || '#333333');
      this.doc.text('TVA', labelX, currentY, { width: labelW, align: 'right' });
      this.doc.text(resolveAndFormat(config.totalTVASource), valX, currentY, { width: valW, align: 'right' });
      currentY += 17;
    }

    // Total TVAC (encadré coloré)
    if (hasTotalTVAC) {
      this.doc
        .rect(x + width * 0.6, currentY - 2, width * 0.4, 20)
        .fill(this.theme.primaryColor || '#1890ff');

      this.doc
        .fontSize(this.scaleFontSize(12))
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('Total TVAC', x + width * 0.6 + 5, currentY + 3, { width: width * 0.2 - 10 });
      this.doc.text(resolveAndFormat(config.totalTVACSource), x + width * 0.8, currentY + 3, { width: width * 0.2 - 10, align: 'right' });
    }

    return 'ok';
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
  // Icônes vectorielles partagées (header + footer)
  // ============================================================
  private drawPinIcon(ix: number, iy: number, s: number, color: string) {
    this.doc.save();
    const cx = ix + s * 0.5;
    const r = s * 0.3;
    const headY = iy + s * 0.32;
    const tipY = iy + s * 0.92;
    this.doc.circle(cx, headY, r).fillColor(color).fill();
    this.doc.moveTo(cx - r * 0.75, headY + r * 0.4)
      .lineTo(cx, tipY)
      .lineTo(cx + r * 0.75, headY + r * 0.4)
      .closePath().fillColor(color).fill();
    this.doc.circle(cx, headY, r * 0.35).fillColor('white').fill();
    this.doc.restore();
  }

  private drawPhoneIcon(ix: number, iy: number, s: number, color: string) {
    this.doc.save();
    const w = s * 0.5;
    const h = s * 0.82;
    const px = ix + (s - w) / 2;
    const py = iy + (s - h) / 2;
    this.doc.roundedRect(px, py, w, h, s * 0.08).fillColor(color).fill();
    this.doc.fillColor('white');
    this.doc.rect(px + w * 0.15, py + h * 0.13, w * 0.7, h * 0.58).fill();
    this.doc.circle(px + w / 2, py + h * 0.87, w * 0.1).fill();
    this.doc.restore();
  }

  private drawEnvelopeIcon(ix: number, iy: number, s: number, color: string) {
    this.doc.save();
    const w = s * 0.88;
    const h = s * 0.62;
    const ex = ix + (s - w) / 2;
    const ey = iy + (s - h) / 2;
    this.doc.rect(ex, ey, w, h).fillColor(color).fill();
    this.doc.moveTo(ex, ey)
      .lineTo(ex + w / 2, ey + h * 0.55)
      .lineTo(ex + w, ey)
      .closePath().fillColor('white').fill();
    this.doc.restore();
  }

  private drawGlobeIcon(ix: number, iy: number, s: number, color: string) {
    this.doc.save();
    const cx = ix + s * 0.5;
    const cy = iy + s * 0.5;
    const r = s * 0.4;
    // Cercle principal
    this.doc.circle(cx, cy, r).lineWidth(s * 0.06).strokeColor(color).stroke();
    // Ligne horizontale (équateur)
    this.doc.moveTo(cx - r, cy).lineTo(cx + r, cy).strokeColor(color).stroke();
    // Ligne verticale (méridien)
    this.doc.moveTo(cx, cy - r).lineTo(cx, cy + r).strokeColor(color).stroke();
    // Ellipse intérieure (méridien courbe) simplifiée avec un ovale
    this.doc.ellipse(cx, cy, r * 0.45, r).lineWidth(s * 0.05).strokeColor(color).stroke();
    this.doc.restore();
  }

  private drawIconWithText(
    drawFn: (ix: number, iy: number, s: number, c: string) => void,
    text: string, lineX: number, lineY: number, lineWidth: number,
    align: 'left' | 'right', color: string, fontSize: number
  ) {
    const iconSize = fontSize + 2;
    const gap = 4;
    const textY = lineY + 1;
    if (align === 'left') {
      drawFn(lineX, lineY - 1, iconSize, color);
      this.doc.font('Helvetica').fontSize(fontSize).fillColor(color)
        .text(text, lineX + iconSize + gap, textY, { width: lineWidth - iconSize - gap, lineBreak: false });
    } else {
      this.doc.font('Helvetica').fontSize(fontSize);
      const textW = this.doc.widthOfString(text);
      const totalW = iconSize + gap + textW;
      const startX = lineX + lineWidth - totalW;
      drawFn(startX, lineY - 1, iconSize, color);
      this.doc.font('Helvetica').fontSize(fontSize).fillColor(color)
        .text(text, startX + iconSize + gap, textY, { lineBreak: false });
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
    const clientName = this.substituteVariables(config.clientName || '{lead.firstName} {lead.lastName}');
    const clientCompany = this.substituteVariables(config.clientCompany || '{lead.company}');
    const clientAddress = this.substituteVariables(config.clientAddress || '{lead.address}');
    const clientEmail = this.substituteVariables(config.clientEmail || '{lead.email}');
    const clientPhone = this.substituteVariables(config.clientPhone || '{lead.phone}');
    const clientTVA = this.substituteVariables(config.clientTVA || '{lead.tva}');
    
    let currentY = y;
    
    // ─── Logo à gauche des infos société ───
    let logoOffset = 0;
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
          logoOffset = maxLogoWidth + 10;
        }
      } catch (e) {
        console.warn('📄 [PDF] Impossible de charger le logo:', e);
      }
    }
    
    // Colonnes : société (après logo) et client (à droite)
    const leftX = x + logoOffset;
    const availWidth = width - logoOffset;
    const halfWidth = availWidth / 2 - 16;
    const rightX = leftX + halfWidth + 32;
    
    // Utiliser les méthodes de classe pour les icônes vectorielles
    const drawIconLine = (drawFn: (ix: number, iy: number, s: number, c: string) => void, text: string, lineX: number, lineY: number, lineWidth: number, align: 'left' | 'right', color: string, fontSize: number) => {
      this.drawIconWithText(drawFn, text, lineX, lineY, lineWidth, align, color, fontSize);
    };
    
    // ─── Ligne 1 : Labels "SOCIÉTÉ" / "CLIENT" en couleur primaire du thème ───
    const labelFs = this.scaleFontSize(14);
    const headerLabelColor = this.theme.primaryColor || '#1890ff';
    this.doc
      .font('Helvetica-Bold')
      .fontSize(labelFs)
      .fillColor(headerLabelColor)
      .text('SOCI\u00c9T\u00c9', leftX, currentY, { width: halfWidth, align: 'left' });
    this.doc
      .font('Helvetica-Bold')
      .fontSize(labelFs)
      .fillColor(headerLabelColor)
      .text('CLIENT', rightX, currentY, { width: halfWidth, align: 'right' });
    currentY += labelFs + 4;

    // ─── Ligne 2 : Noms en noir gras ───
    const nameFs = this.scaleFontSize(12);
    this.doc
      .font('Helvetica-Bold')
      .fontSize(nameFs)
      .fillColor('#222222')
      .text(companyName, leftX, currentY, { width: halfWidth, align: 'left', lineBreak: false });
    
    const clientDisplayName = clientCompany ? `${clientName} \u2014 ${clientCompany}` : clientName;
    this.doc
      .font('Helvetica-Bold')
      .fontSize(nameFs)
      .fillColor('#222222')
      .text(clientDisplayName, rightX, currentY, { width: halfWidth, align: 'right', lineBreak: false });
    currentY += nameFs + 4;

    // ─── Ligne 3 : Adresses (icône pin vectorielle) ───
    const infoFs = this.scaleFontSize(10);
    const lineH = infoFs + 6;
    
    if (companyAddress) {
      drawIconLine(this.drawPinIcon.bind(this), companyAddress, leftX, currentY, halfWidth, 'left', '#555555', infoFs);
    }
    if (clientAddress) {
      drawIconLine(this.drawPinIcon.bind(this), clientAddress, rightX, currentY, halfWidth, 'right', '#555555', infoFs);
    }
    if (companyAddress || clientAddress) currentY += lineH;

    // ─── Ligne 4 : Téléphones (icône smartphone vectorielle) ───
    if (companyPhone) {
      drawIconLine(this.drawPhoneIcon.bind(this), companyPhone, leftX, currentY, halfWidth, 'left', '#666666', infoFs);
    }
    if (clientPhone) {
      drawIconLine(this.drawPhoneIcon.bind(this), clientPhone, rightX, currentY, halfWidth, 'right', '#666666', infoFs);
    }
    if (companyPhone || clientPhone) currentY += lineH;

    // ─── Ligne 5 : Emails (icône enveloppe vectorielle) ───
    if (companyEmail) {
      drawIconLine(this.drawEnvelopeIcon.bind(this), companyEmail, leftX, currentY, halfWidth, 'left', '#666666', infoFs);
    }
    if (clientEmail) {
      drawIconLine(this.drawEnvelopeIcon.bind(this), clientEmail, rightX, currentY, halfWidth, 'right', '#666666', infoFs);
    }
    if (companyEmail || clientEmail) currentY += lineH;

    // ─── Ligne 6 : TVA ───
    const tvaFs = this.scaleFontSize(9);
    if (companyTVA) {
      this.doc.font('Helvetica').fontSize(tvaFs).fillColor('#888888')
        .text(`TVA: ${companyTVA}`, leftX, currentY, { width: halfWidth, align: 'left', lineBreak: false });
    }
    if (clientTVA) {
      this.doc.font('Helvetica').fontSize(tvaFs).fillColor('#888888')
        .text(`TVA: ${clientTVA}`, rightX, currentY, { width: halfWidth, align: 'right', lineBreak: false });
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

      const badgeBgColor = this.theme.primaryColor || '#1890ff';
      const drawBadge = (label: string, value: string) => {
        const text = `${label}${value ? ` ${value}` : ''}`;
        this.doc.font('Helvetica').fontSize(badgeFontSize);
        const textHeight = this.doc.heightOfString(text, { width: width });
        const badgeWidth = this.doc.widthOfString(text) + badgePaddingX * 2;
        const badgeHeight = textHeight + badgePaddingY * 2;
        const textY = currentY + (badgeHeight - textHeight) / 2;

        this.doc
          .roundedRect(currentX, currentY, badgeWidth, badgeHeight, 4)
          .fill(badgeBgColor);

        this.doc
          .fillColor('#ffffff')
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

    // Layout centered (default) — Bandeau vert avec icônes blanches comme le header
    const bannerColor = this.theme.primaryColor || '#0d7377';
    const textColor = '#ffffff';
    const bannerPaddingH = 12; // padding horizontal intérieur
    const lineSpacing = 4;

    // Calculer la hauteur du contenu (sans page number qui est dans le bandeau)
    let contentH = 0;
    const line1H = baseFontSize + 2; // Ligne infos société
    if (showCompanyInfo) contentH += line1H;
    if (bankInfoText) {
      if (contentH > 0) contentH += lineSpacing;
      contentH += smallFontSize + 2;
    }
    if (config.showLegalMention && config.legalMention) {
      if (contentH > 0) contentH += lineSpacing;
      contentH += smallFontSize + 2;
    }

    // Utiliser toute la hauteur allouée au module, ou un minimum si pas défini
    const bannerH = Math.max(height || 40, contentH + 20);

    // ═══ Dessiner le bandeau vert pleine largeur ═══
    this.doc.save();
    this.doc.rect(x, y, width, bannerH).fill(bannerColor);
    this.doc.restore();

    // Centrer verticalement le contenu dans le bandeau
    const topPadding = (bannerH - contentH) / 2;
    let currentY = y + topPadding;
    
    // ─── Ligne 1 : Infos société avec icônes vectorielles blanches (centrées) ───
    if (showCompanyInfo) {
      const iconSize = baseFontSize + 2;
      const gap = 3;
      const separatorText = '  |  ';
      
      // Construire la liste des segments {drawFn, text}
      type Segment = { drawFn: ((ix: number, iy: number, s: number, c: string) => void) | null; text: string };
      const segments: Segment[] = [];
      if (companyName) segments.push({ drawFn: null, text: companyName });
      if (phone) segments.push({ drawFn: this.drawPhoneIcon.bind(this), text: phone });
      if (email) segments.push({ drawFn: this.drawEnvelopeIcon.bind(this), text: email });
      if (website) segments.push({ drawFn: this.drawGlobeIcon.bind(this), text: website });
      
      // Calculer la largeur totale pour centrer
      this.doc.font(textFont).fontSize(baseFontSize);
      const sepW = this.doc.widthOfString(separatorText);
      let totalW = 0;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.drawFn) totalW += iconSize + gap;
        totalW += this.doc.widthOfString(seg.text);
        if (i < segments.length - 1) totalW += sepW;
      }
      
      // Dessiner centré en blanc
      let drawX = x + (width - totalW) / 2;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.drawFn) {
          seg.drawFn(drawX, currentY - 1, iconSize, textColor);
          drawX += iconSize + gap;
        }
        this.doc.font(textFont).fontSize(baseFontSize).fillColor(textColor)
          .text(seg.text, drawX, currentY, { lineBreak: false });
        drawX += this.doc.widthOfString(seg.text);
        if (i < segments.length - 1) {
          this.doc.font(textFont).fontSize(baseFontSize).fillColor('rgba(255,255,255,0.6)')
            .text(separatorText, drawX, currentY, { lineBreak: false });
          drawX += sepW;
        }
      }
      currentY += line1H + lineSpacing;
    }

    // ─── Ligne 2 : Infos bancaires (blanc centré) ───
    if (bankInfoText) {
      this.doc.font(textFont).fontSize(smallFontSize).fillColor(textColor)
        .text(bankInfoText, x, currentY, { width, align: 'center', lineBreak: false });
      currentY += smallFontSize + 2 + lineSpacing;
    }

    // ─── Mention légale ───
    if (config.showLegalMention && config.legalMention) {
      const legalText = String(config.legalMention);
      this.doc.font('Helvetica-Oblique').fontSize(smallFontSize).fillColor('rgba(255,255,255,0.8)')
        .text(legalText, x, currentY, { width, align: 'center', lineBreak: false });
      currentY += smallFontSize + 2 + lineSpacing;
    }

    // ─── Numéro de page (blanc, en bas à droite du bandeau avec marge) ───
    if (pageNumberText) {
      const pageNumY = y + bannerH - baseFontSize - 6; // 6px du bas du bandeau
      this.doc.font(textFont).fontSize(baseFontSize).fillColor(textColor)
        .text(pageNumberText, x, pageNumY, { width: width - bannerPaddingH, align: 'right', lineBreak: false });
    }
    
    console.log(`📄 [PDF] DOCUMENT_FOOTER rendu (green banner+icons): ${companyName}`);
  }

  // ============================================================
  // SIGNATURE_BLOCK - Zone de signatures
  // ============================================================
  private renderModuleSignatureBlock(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    // 🔥 Vérifier si le bloc peut tenir
    const availableHeight = this.getAvailableHeightOnPage(y);
    const minHeight = 60; // Réduit car le bloc est compact maintenant
    
    console.log(`📄 [PDF] SIGNATURE_BLOCK: y=${y.toFixed(0)}, height=${height}, availableHeight=${availableHeight.toFixed(0)}, minHeight=${minHeight}`);
    
    if (availableHeight < minHeight) {
      console.warn(`📄 [PDF] SIGNATURE_BLOCK: Pas assez de place (${availableHeight.toFixed(0)}px restants). Bloc masqué.`);
      return;
    }

    const isStacked = config.layout === 'stacked';
    const gap = 16;
    const actualHeight = Math.max(height || 120, 100); // Au moins 100px de haut
    const boxHeight = isStacked ? Math.floor((actualHeight - gap) / 2) : Math.floor(actualHeight);
    const boxWidth = isStacked ? width : (width - 24) / 2;
    
    const clientLabel = config.clientLabel || 'Le Client';
    const companyLabel = config.companyLabel || 'Pour l\'entreprise';
    
    // Clipping au niveau du module — utiliser actualHeight pour éviter de clipper un bloc de hauteur 0
    const clipH = Math.max(height || actualHeight, actualHeight);
    this.doc.save();
    this.doc.rect(x, y, width, clipH).clip();

    const renderBox = (label: string, boxX: number, boxY: number, signerRole: string) => {
      // Chercher une signature électronique réelle pour ce rôle
      const eSigs = this.ctx.electronicSignatures || [];
      const eSig = signerRole === 'CLIENT'
        ? eSigs.find(s => s.signerRole === 'CLIENT')
        : eSigs.find(s => s.signerRole !== 'CLIENT');

      console.log(`📄 [PDF] SIGNATURE_BLOCK renderBox: role=${signerRole}, eSigs=${eSigs.length}, found=${!!eSig}${eSig ? `, signerName=${eSig.signerName}, hasData=${!!eSig.signatureData}, dataLen=${eSig.signatureData?.length || 0}` : ''}`);

      // Bordure
      this.doc
        .roundedRect(boxX, boxY, boxWidth, boxHeight, 6)
        .stroke(eSig ? '#52c41a' : '#e8e8e8');

      const padding = 16;
      const innerW = boxWidth - padding * 2;

      // ─── Ligne 1 : Label (gauche) + Mention (droite, italique) ───
      const labelY = boxY + padding;
      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(11))
        .fillColor('#333333')
        .text(label, boxX + padding, labelY, { width: innerW, continued: false, lineBreak: false });

      if (eSig) {
        // Signature électronique réelle
        const signedDate = new Date(eSig.signedAt).toLocaleDateString('fr-BE');
        let currentY = labelY + 14;
        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(9))
          .fillColor('#52c41a')
          .text(`Signé électroniquement le ${signedDate} par ${eSig.signerName}`, boxX + padding, currentY, { width: innerW });
        currentY += 14;

        // Dessiner l'image de signature
        try {
          const sigData = eSig.signatureData;
          if (sigData && sigData.startsWith('data:image')) {
            const base64Data = sigData.split(',')[1];
            const imgBuffer = Buffer.from(base64Data, 'base64');
            const imgH = Math.min(boxHeight - currentY + boxY - padding - 4, 50);
            this.doc.image(imgBuffer, boxX + padding, currentY + 2, { width: innerW - 10, height: imgH, fit: [innerW - 10, imgH] });
          }
        } catch (imgErr) {
          console.warn('[PDF] Erreur image signature module:', imgErr);
        }
      } else {
        const showMention = config.showMention !== false;
        if (showMention) {
          const mention = config.mention || 'Lu et approuvé, bon pour accord';
          this.doc
            .font('Helvetica-Oblique')
            .fontSize(this.scaleFontSize(9))
            .fillColor('#999999')
            .text(`"${mention}"`, boxX + padding, labelY + 1, { width: innerW, align: 'right', lineBreak: false });
        }

        let currentY = labelY + 14; // juste après la ligne label+mention

        // ─── Ligne 2 : Date ───
        const showDate = config.showDate !== false;
        if (showDate) {
          this.doc
            .font('Helvetica')
            .fontSize(this.scaleFontSize(10))
            .fillColor('#666666')
            .text('Date: ____/____/________', boxX + padding, currentY, { width: innerW });
          currentY += 14;
        }

        // ─── Zone signature (compacte) ───
        const signatureAreaTop = currentY + 8;
        const signatureLineY = Math.min(signatureAreaTop + 50, boxY + boxHeight - padding - 4);

        this.doc
          .font('Helvetica')
          .fontSize(this.scaleFontSize(11))
          .fillColor('#999999')
          .text('Signature', boxX + padding, signatureAreaTop + 2, { width: innerW });

        this.doc
          .moveTo(boxX + padding, signatureLineY)
          .lineTo(boxX + boxWidth - padding, signatureLineY)
          .dash(3, { space: 3 })
          .stroke('#cccccc')
          .undash();
      }

      return true;
    };
    
    if (isStacked) {
      renderBox(clientLabel, x, y, 'CLIENT');
      renderBox(companyLabel, x, y + boxHeight + 16, 'COMPANY');
    } else {
      renderBox(clientLabel, x, y, 'CLIENT');
      renderBox(companyLabel, x + boxWidth + 24, y, 'COMPANY');
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

    const drawRow = (label: string, value: string, opts?: { valueColor?: string; labelColor?: string; negative?: boolean; labelBold?: boolean; valueBold?: boolean; icon?: 'tag' }) => {
      this.doc
        .strokeColor('#f0f0f0')
        .lineWidth(1)
        .moveTo(x + paddingX, currentY + rowHeight)
        .lineTo(x + width - paddingX, currentY + rowHeight)
        .stroke();

      const labelFs = this.scaleFontSize(11);
      this.doc
        .font(opts?.labelBold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(labelFs)
        .fillColor(opts?.labelColor || '#666666');

      // Icône 🏷️ PNG Twemoji avant le label (même système que le bandeau KPI)
      if (opts?.icon === 'tag') {
        const labelTextW = this.doc.widthOfString(label);
        const labelAreaW = contentWidth - valueWidth - gap;
        const textEndX = labelX + labelAreaW;
        const iconSz = labelFs + 2;
        const tagPng = this.emojiPngCache.get('🏷️');
        if (tagPng && fs.existsSync(tagPng)) {
          try {
            this.doc.image(tagPng, textEndX - labelTextW - iconSz - 4, currentY + 5, { width: iconSz, height: iconSz });
          } catch (e) { console.warn('PDF tag icon error:', e); }
        }
      }

      this.doc.text(label, labelX, currentY + 6, { width: contentWidth - valueWidth - gap, align: 'right' });

      this.doc
        .font(opts?.valueBold !== false ? 'Helvetica-Bold' : 'Helvetica')
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
      drawRow('Remise:', `-${discountFormatted}`, { valueColor: '#D9791F', labelBold: true, valueBold: true, labelColor: '#D9791F', icon: 'tag' });
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
        .fontSize(this.scaleFontSize(14))
        .fillColor('#FFFFFF')
        .text('Total TTC:', barLabelX, barY + 9, { width: width - innerPad * 2 - barValueWidth, align: 'right' });

      this.doc
        .font('Helvetica-Bold')
        .fontSize(this.scaleFontSize(18))
        .fillColor('#FFFFFF')
        .text(this.formatMoney(totalTTCValue, currency), x + width - innerPad - barValueWidth, barY + 6, { width: barValueWidth, align: 'right' });
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
   * - Masque les lignes repeater qui n'ont aucune instance (0 copies)
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
      
      // 2. Détecter si c'est une ligne repeater (même si type n'est pas explicitement 'repeater')
      //    Détection large : type === 'repeater', OU repeaterId présent, OU sources @repeat.xxx
      const isRepeaterLine = line.type === 'repeater' 
        || !!line.repeaterId 
        || this.hasRepeatSources(line);
      
      if (isRepeaterLine) {
        // Trouver le repeaterId depuis la ligne ou ses sources
        const repeaterId = line.repeaterId || this.extractRepeaterIdFromSources(line);
        
        if (repeaterId) {
          const repeaterInstances = this.getRepeaterInstances(repeaterId, tblData, line);
          
          if (repeaterInstances.length === 0) {
            // ✅ Pas d'instances → ne pas afficher la ligne du tout
            console.log(`📄 [PDF] Ligne repeater "${line.label}" masquée (0 instances pour repeater ${repeaterId})`);
            continue;
          }
          
          for (const instance of repeaterInstances) {
            const resolvedLine = this.resolveLineValues(line, instance);
            results.push(resolvedLine);
          }
        } else {
          // Type repeater mais pas de repeaterId trouvable → masquer
          console.log(`📄 [PDF] Ligne repeater "${line.label}" masquée (repeaterId non trouvé)`);
          continue;
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
   * Vérifie si une ligne a des sources @repeat.xxx
   */
  private hasRepeatSources(line: any): boolean {
    const sources = [line.labelSource, line.quantitySource, line.unitPriceSource, line.totalSource];
    return sources.some(s => typeof s === 'string' && s.startsWith('@repeat.'));
  }

  /**
   * Extrait le repeaterId depuis les sources @repeat.{repeaterId}.xxx d'une ligne
   */
  private extractRepeaterIdFromSources(line: any): string | undefined {
    const sources = [line.labelSource, line.quantitySource, line.unitPriceSource, line.totalSource];
    for (const src of sources) {
      if (typeof src === 'string' && src.startsWith('@repeat.')) {
        const match = src.match(/^@repeat\.([^.]+)\./);
        if (match) return match[1];
      }
    }
    return undefined;
  }

  /**
   * Applique le formatage de style (gras, italique, souligné, taille, couleur) 
   * sur le document PDF pour une ligne de pricing.
   * Retourne la police choisie pour pouvoir revenir au style normal après.
   */
  private applyLineStyle(style: any, defaultFontSize?: number): { font: string; fontSize: number; color: string; underline: boolean } {
    const bold = style?.bold === true;
    const italic = style?.italic === true;
    const underline = style?.underline === true;
    const fontSize = style?.fontSize || defaultFontSize || 10;
    const color = style?.color || this.theme.textColor || '#333333';
    
    // Sélectionner la bonne police Helvetica selon bold/italic
    let font = 'Helvetica';
    if (bold && italic) font = 'Helvetica-BoldOblique';
    else if (bold) font = 'Helvetica-Bold';
    else if (italic) font = 'Helvetica-Oblique';
    
    this.doc
      .fontSize(this.scaleFontSize(fontSize))
      .font(font)
      .fillColor(color);
    
    return { font, fontSize, color, underline };
  }

  /**
   * Applique textTransform sur une chaîne
   */
  private applyTextTransform(text: string, transform?: string): string {
    if (!transform || transform === 'none') return text;
    switch (transform) {
      case 'uppercase': return text.toUpperCase();
      case 'lowercase': return text.toLowerCase();
      case 'capitalize': return text.replace(/\b\w/g, c => c.toUpperCase());
      default: return text;
    }
  }

  /**
   * Dessine du texte souligné à une position donnée
   */
  private drawUnderlinedText(text: string, x: number, y: number, options: any): void {
    this.doc.text(text, x, y, options);
    // Calculer la largeur du texte pour dessiner la ligne
    const textWidth = this.doc.widthOfString(text, options);
    const lineY = y + this.doc.currentLineHeight() - 1;
    this.doc
      .save()
      .strokeColor(this.doc._fillColor?.[0] || '#333333')
      .lineWidth(0.5)
      .moveTo(x, lineY)
      .lineTo(x + Math.min(textWidth, (options?.width || textWidth)), lineY)
      .stroke()
      .restore();
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
    
    const resolvedLine: { description: string; quantity: number | null; unitPrice: number | null; total: number | null; style?: any } = {
      description: '',
      quantity: null,
      unitPrice: null,
      total: null,
      style: line.style || undefined,  // Propager les options de formatage
    };
    
    // Résoudre le label/description
    // 🆕 Support des multi-libellés (labelParts)
    if (line.labelParts && Array.isArray(line.labelParts) && line.labelParts.length > 0) {
      const parts = line.labelParts.map((part: any) => {
        const prefix = part.prefix || '';
        let value = '';
        if (part.source) {
          value = resolve(part.source);
        }
        const suffix = (part.suffix && value) ? part.suffix : '';
        return `${prefix}${value}${suffix}`.trim();
      }).filter((p: string) => p.length > 0);
      resolvedLine.description = parts.join(' - ');
      console.log(`📄 [PDF] Label multi-segments résolu: "${resolvedLine.description}" (${line.labelParts.length} segments)`);
      if (!resolvedLine.description) {
        resolvedLine.description = line.label || 'Non défini';
      }
    } else if (line.labelSource) {
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
      const lineStyle = item.style;

      // Fond de ligne: couleur personnalisée OU alternance
      if (lineStyle?.backgroundColor) {
        this.doc.rect(this.margin, rowY, this.contentWidth, 22).fill(lineStyle.backgroundColor);
      } else if (i % 2 === 1) {
        this.doc.rect(this.margin, rowY, this.contentWidth, 22).fill('#f9f9f9');
      }

      // Appliquer le style de la ligne pour la description
      xPos = this.margin + 5;
      let desc = this.substituteVariables(item.description || item.name || '');
      desc = this.applyTextTransform(desc, lineStyle?.textTransform);
      
      if (lineStyle && (lineStyle.bold || lineStyle.italic || lineStyle.underline || lineStyle.fontSize || lineStyle.color)) {
        const applied = this.applyLineStyle(lineStyle, 9);
        if (applied.underline) {
          this.drawUnderlinedText(desc, xPos, rowY + 5, { width: colWidths.description - 10 });
        } else {
          this.doc.text(desc, xPos, rowY + 5, { width: colWidths.description - 10 });
        }
        // Revenir au style normal pour les autres colonnes
        this.doc.font('Helvetica').fontSize(9).fillColor(this.theme.textColor || '#333333');
      } else {
        this.doc.fillColor(this.theme.textColor || '#333333').fontSize(9).font('Helvetica');
        this.doc.text(desc, xPos, rowY + 5, { width: colWidths.description - 10 });
      }
      
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

    // Chercher les signatures électroniques réelles
    const eSigs = this.ctx.electronicSignatures || [];
    const clientSig = eSigs.find(s => s.signerRole === 'CLIENT');
    const companySig = eSigs.find(s => s.signerRole !== 'CLIENT');

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

    if (clientSig) {
      // Signature électronique réelle
      const signedDate = new Date(clientSig.signedAt).toLocaleDateString('fr-BE');
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Signé électroniquement le ${signedDate}`, leftX, signatureY + 18)
        .text(`par ${clientSig.signerName}`, leftX, signatureY + 30);

      // Dessiner l'image de signature
      try {
        const sigData = clientSig.signatureData;
        if (sigData && sigData.startsWith('data:image')) {
          const base64Data = sigData.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          this.doc.image(imgBuffer, leftX, signatureY + 45, { width: colWidth - 10, height: 55, fit: [colWidth - 10, 55] });
        }
      } catch (imgErr) {
        console.warn('[PDF] Erreur image signature client:', imgErr);
        this.doc.rect(leftX, signatureY + 45, colWidth, 55).stroke('#52c41a');
      }

      // Badge "Signé ✅"
      this.doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#52c41a')
        .text('Signé électroniquement', leftX, signatureY + 105);
    } else {
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Date: ____/____/________', leftX, signatureY + 20)
        .text('Signature précédée de la mention', leftX, signatureY + 40)
        .text('"Lu et approuvé":', leftX, signatureY + 52);

      this.doc
        .rect(leftX, signatureY + 70, colWidth, 60)
        .stroke('#cccccc');
    }

    // Colonne droite - L'entreprise
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.theme.textColor || '#333333')
      .text('Pour l\'entreprise', rightX, signatureY);

    if (companySig) {
      const signedDate = new Date(companySig.signedAt).toLocaleDateString('fr-BE');
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Signé le ${signedDate}`, rightX, signatureY + 18)
        .text(`par ${companySig.signerName}`, rightX, signatureY + 30);

      try {
        const sigData = companySig.signatureData;
        if (sigData && sigData.startsWith('data:image')) {
          const base64Data = sigData.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          this.doc.image(imgBuffer, rightX, signatureY + 45, { width: colWidth - 10, height: 55, fit: [colWidth - 10, 55] });
        }
      } catch (imgErr) {
        console.warn('[PDF] Erreur image signature entreprise:', imgErr);
        this.doc.rect(rightX, signatureY + 45, colWidth, 55).stroke('#52c41a');
      }

      this.doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#52c41a')
        .text('Signé électroniquement', rightX, signatureY + 105);
    } else {
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Date: ____/____/________', rightX, signatureY + 20)
        .text(this.ctx.organization?.name || '', rightX, signatureY + 40);

      this.doc
        .rect(rightX, signatureY + 70, colWidth, 60)
        .stroke('#cccccc');
    }

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

    // Substitution des variables @value.xxx, @select.xxx et @calculated.xxx
    result = result.replace(/@(value|select|calculated)\.([a-zA-Z0-9_.-]+)/g, (_match, type, ref) => {
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

    // 🔥 SYSTÈME DYNAMIQUE: Vérifier d'abord dans formulaResultsMap (pré-résolu par interpretReference)
    // Couvre TOUS les types: node-formula:, condition:, @calculated., @value., @table., etc.
    const formulaResultsMap = (this.ctx as any).formulaResultsMap || {};
    if (formulaResultsMap[ref] !== undefined) {
      const rawVal = formulaResultsMap[ref];
      console.log(`📄 [PDF] ✅ Résolu via formulaResultsMap: "${ref}" → ${rawVal}`);
      // Si la valeur ressemble à un UUID, chercher dans selectOptionsMap (ex: optimiseur -> label produit)
      if (this.ctx.selectOptionsMap && typeof rawVal === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawVal)) {
        const label = this.ctx.selectOptionsMap[rawVal];
        if (label) {
          console.log(`📄 [PDF] 🔄 SELECT résolu via formulaResultsMap: "${rawVal}" → "${label}"`);
          return label;
        }
      }
      return this.formatValue(rawVal);
    }

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
      
      // Helper: résoudre les valeurs SELECT (UUID → label lisible)
      const resolveSelectLabel = (rawValue: any): string => {
        const formatted = this.formatValue(rawValue);
        // Si la valeur ressemble à un UUID, chercher dans selectOptionsMap
        if (this.ctx.selectOptionsMap && typeof rawValue === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawValue)) {
          const label = this.ctx.selectOptionsMap[rawValue];
          if (label) {
            console.log(`📄 [PDF] 🔄 SELECT résolu: "${rawValue}" → "${label}"`);
            return label;
          }
        }
        return formatted;
      };
      
      // Chercher dans tblData par ID exact
      if (tblData[nodeRef] !== undefined) {
        console.log(`📄 [PDF] ✅ Trouvé exact: ${tblData[nodeRef]}`);
        return resolveSelectLabel(tblData[nodeRef]);
      }
      
      // Chercher dans values si c'est une submission
      if (tblData.values && tblData.values[nodeRef] !== undefined) {
        console.log(`📄 [PDF] ✅ Trouvé dans values: ${tblData.values[nodeRef]}`);
        return resolveSelectLabel(tblData.values[nodeRef]);
      }
      
      // Chercher par clé partielle (le nodeRef peut être le dernier segment d'un ID plus long)
      for (const [key, value] of Object.entries(tblData)) {
        if (key.includes(nodeRef) || key.endsWith(nodeRef)) {
          console.log(`📄 [PDF] ✅ Trouvé partiel "${key}": ${value}`);
          return resolveSelectLabel(value);
        }
      }
      
      // Chercher aussi dans values par clé partielle
      if (tblData.values) {
        for (const [key, value] of Object.entries(tblData.values)) {
          if (key.includes(nodeRef) || key.endsWith(nodeRef)) {
            console.log(`📄 [PDF] ✅ Trouvé partiel dans values "${key}": ${value}`);
            return resolveSelectLabel(value);
          }
        }
      }
    }

    // 🆕 Variables node-formula:xxx ou formula:xxx
    if (ref.startsWith('node-formula:') || ref.startsWith('formula:')) {
      // 🔥 FIX TOTALS-PDF: Utiliser formulaResultsMap pour obtenir directement le résultat
      const formulaResultsMap = (this.ctx as any).formulaResultsMap || {};
      
      // Chercher avec la ref exacte ET avec l'autre format (node-formula: ↔ formula:)
      const formulaId = ref.replace(/^(node-formula:|formula:)/, '');
      const altRef = ref.startsWith('node-formula:') ? `formula:${formulaId}` : `node-formula:${formulaId}`;
      
      if (formulaResultsMap[ref] !== undefined) {
        console.log(`📄 [PDF] ✅ Formula résolu via formulaResultsMap: ${ref} → ${formulaResultsMap[ref]}`);
        return this.formatValue(formulaResultsMap[ref]);
      }
      if (formulaResultsMap[altRef] !== undefined) {
        console.log(`📄 [PDF] ✅ Formula résolu via formulaResultsMap (alt): ${altRef} → ${formulaResultsMap[altRef]}`);
        return this.formatValue(formulaResultsMap[altRef]);
      }
      
      console.log(`📄 [PDF] Cherche formula: "${formulaId}" (pas trouvé dans formulaResultsMap, keys: ${Object.keys(formulaResultsMap).join(', ')})`);
      
      // Fallback: chercher dans formulas ou directement dans tblData
      if (tblData.formulas && tblData.formulas[formulaId] !== undefined) {
        return this.formatValue(tblData.formulas[formulaId]);
      }
      if (tblData[formulaId] !== undefined) {
        return this.formatValue(tblData[formulaId]);
      }
      
      // Chercher par suffixe
      for (const [key, value] of Object.entries(tblData)) {
        if (key.includes(formulaId) || key.endsWith(formulaId)) {
          return this.formatValue(value);
        }
      }
    }

    // 🆕 Variables @calculated.xxx ou calculatedValue:xxx — aussi pré-résolu
    if (ref.startsWith('calculatedValue:') || ref.startsWith('@calculated.')) {
      // Vérifier d'abord dans formulaResultsMap (pré-résolu par la route)
      const formulaResultsMap = (this.ctx as any).formulaResultsMap || {};
      if (formulaResultsMap[ref] !== undefined) {
        console.log(`📄 [PDF] ✅ Calculated résolu via formulaResultsMap: ${ref} → ${formulaResultsMap[ref]}`);
        return this.formatValue(formulaResultsMap[ref]);
      }
      
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

  // ============================================================
  // KPI_BANNER - Bandeau KPI / ROI graphique
  // ============================================================
  private renderModuleKpiBanner(config: Record<string, any>, x: number, y: number, width: number, height: number): void {
    console.log(`🎨 [KPI-ICON-DEBUG] BANNER CALLED! icon keys: ${Object.keys(config).filter(k => k.includes('icon')).map(k => `${k}="${config[k]}"`).join(', ')}`);
    this.doc.save();
    this.doc.rect(x, y, width, height).clip();

    const gradientFrom = config.gradientFrom || '#0F5C60';
    const gradientTo = config.gradientTo || '#0A3E42';
    const accentColor = config.accentColor || '#D9791F';
    const textColor = config.textColor || '#ffffff';
    const cornerRadius = Math.min(config.cornerRadius ?? 12, 12) * this.scaleFactor;
    const bannerStyle = config.style || 'gradient';

    // Helper robuste pour lire les toggles (gère bool, string, undefined)
    const toBool = (val: any, def: boolean): boolean => {
      if (val === undefined || val === null) return def;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val !== 'false' && val !== '0';
      return Boolean(val);
    };

    const showTitle = toBool(config.showTitle, true);
    const showProgressBar = toBool(config.showProgressBar, true);
    const showMiniChart = toBool(config.showMiniChart, true);
    const bannerTitle = this.substituteVariables(config.title || 'Votre Investissement en un coup d\'oeil');
    const compactMode = toBool(config.compactMode, true);

    // ─── Icônes vectorielles KPI (PDFKit/Helvetica ne supporte PAS les emojis) ───
    // Chaque emoji est mappé vers une icône dessinée en paths vectoriels purs.
    const doc = this.doc;

    // Fonctions de dessin vectoriel par catégorie
    type IcoFn = (cx: number, cy: number, sz: number, col: string) => void;
    const icoFns: Record<string, IcoFn> = {
      // ⚡ Éclair
      lightning: (cx, cy, sz, col) => {
        const r = sz * 0.42;
        doc.moveTo(cx + r * 0.1, cy - r * 0.9)
          .lineTo(cx - r * 0.5, cy + r * 0.1).lineTo(cx - r * 0.02, cy + r * 0.05)
          .lineTo(cx - r * 0.15, cy + r * 0.9).lineTo(cx + r * 0.55, cy - r * 0.15)
          .lineTo(cx + r * 0.08, cy - r * 0.1).closePath().fillColor(col).fill();
      },
      // ☀️ Soleil
      sun: (cx, cy, sz, col) => {
        const r = sz * 0.22;
        doc.circle(cx, cy, r).fillColor(col).fill();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          doc.moveTo(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35)
            .lineTo(cx + Math.cos(a) * r * 1.85, cy + Math.sin(a) * r * 1.85)
            .lineWidth(sz * 0.06).strokeColor(col).stroke();
        }
      },
      // 🔥 Flamme
      fire: (cx, cy, sz, col) => {
        const r = sz * 0.4;
        doc.moveTo(cx, cy - r)
          .bezierCurveTo(cx + r * 0.6, cy - r * 0.2, cx + r * 0.7, cy + r * 0.3, cx + r * 0.3, cy + r * 0.8)
          .bezierCurveTo(cx + r * 0.1, cy + r, cx - r * 0.1, cy + r, cx - r * 0.3, cy + r * 0.8)
          .bezierCurveTo(cx - r * 0.7, cy + r * 0.3, cx - r * 0.6, cy - r * 0.2, cx, cy - r)
          .closePath().fillColor(col).fill();
      },
      // 🌿 Feuille
      leaf: (cx, cy, sz, col) => {
        const r = sz * 0.4;
        doc.moveTo(cx - r * 0.8, cy + r * 0.2)
          .bezierCurveTo(cx - r * 0.3, cy - r, cx + r * 0.3, cy - r, cx + r * 0.8, cy - r * 0.3)
          .bezierCurveTo(cx + r * 0.3, cy + r * 0.5, cx - r * 0.2, cy + r, cx - r * 0.8, cy + r * 0.2)
          .closePath().fillColor(col).fill();
        doc.moveTo(cx - r * 0.6, cy + r * 0.55).lineTo(cx + r * 0.3, cy - r * 0.35)
          .lineWidth(sz * 0.04).strokeColor('white').stroke();
      },
      // 💧 Goutte
      drop: (cx, cy, sz, col) => {
        const r = sz * 0.38;
        doc.moveTo(cx, cy - r * 0.9)
          .bezierCurveTo(cx + r * 0.9, cy + r * 0.1, cx + r * 0.6, cy + r * 0.95, cx, cy + r * 0.95)
          .bezierCurveTo(cx - r * 0.6, cy + r * 0.95, cx - r * 0.9, cy + r * 0.1, cx, cy - r * 0.9)
          .closePath().fillColor(col).fill();
      },
      // 💰 Pièce (€)
      coin: (cx, cy, sz, col) => {
        doc.circle(cx, cy, sz * 0.38).fillColor(col).fill();
        doc.font('Helvetica-Bold').fontSize(sz * 0.36).fillColor('white')
          .text('€', cx - sz * 0.12, cy - sz * 0.16, { width: sz * 0.3, align: 'center', lineBreak: false });
      },
      // 💎 Diamant
      diamond: (cx, cy, sz, col) => {
        const r = sz * 0.36;
        doc.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy)
          .closePath().fillColor(col).fill();
      },
      // 📈 Graphique
      chart: (cx, cy, sz, col) => {
        const r = sz * 0.36;
        doc.rect(cx - r * 0.85, cy + r * 0.05, r * 0.4, -r * 0.6).fillColor(col).fillOpacity(0.5).fill().fillOpacity(1);
        doc.rect(cx - r * 0.25, cy + r * 0.05, r * 0.4, -r * 1.0).fillColor(col).fill();
        doc.rect(cx + r * 0.35, cy + r * 0.05, r * 0.4, -r * 1.45).fillColor(col).fill();
        doc.moveTo(cx - r, cy + r * 0.15).lineTo(cx + r, cy + r * 0.15)
          .lineWidth(sz * 0.03).strokeColor(col).stroke();
      },
      // ⏰ Horloge
      clock: (cx, cy, sz, col) => {
        const r = sz * 0.36;
        doc.circle(cx, cy, r).fillColor(col).fill();
        doc.circle(cx, cy, r * 0.85).fillColor('white').fill();
        doc.moveTo(cx, cy).lineTo(cx, cy - r * 0.55).lineWidth(sz * 0.05).strokeColor(col).stroke();
        doc.moveTo(cx, cy).lineTo(cx + r * 0.4, cy + r * 0.1).lineWidth(sz * 0.04).strokeColor(col).stroke();
        doc.circle(cx, cy, r * 0.08).fillColor(col).fill();
      },
      // 🏆 Trophée
      trophy: (cx, cy, sz, col) => {
        const r = sz * 0.35;
        doc.moveTo(cx - r * 0.65, cy - r * 0.6).lineTo(cx - r * 0.45, cy + r * 0.3)
          .lineTo(cx + r * 0.45, cy + r * 0.3).lineTo(cx + r * 0.65, cy - r * 0.6)
          .closePath().fillColor(col).fill();
        doc.rect(cx - r * 0.08, cy + r * 0.3, r * 0.16, r * 0.2).fillColor(col).fill();
        doc.rect(cx - r * 0.3, cy + r * 0.5, r * 0.6, r * 0.15).fillColor(col).fill();
      },
      // ⭐ Étoile
      star: (cx, cy, sz, col) => {
        const r = sz * 0.4; const ri = r * 0.4;
        const pts: number[][] = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const rad = i % 2 === 0 ? r : ri;
          pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
        }
        doc.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) doc.lineTo(pts[i][0], pts[i][1]);
        doc.closePath().fillColor(col).fill();
      },
      // 🎯 Cible
      target: (cx, cy, sz, col) => {
        doc.circle(cx, cy, sz * 0.38).fillColor(col).fill();
        doc.circle(cx, cy, sz * 0.26).fillColor('white').fill();
        doc.circle(cx, cy, sz * 0.14).fillColor(col).fill();
      },
      // ✅ Coche
      check: (cx, cy, sz, col) => {
        const r = sz * 0.35;
        doc.roundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.25).fillColor(col).fill();
        doc.moveTo(cx - r * 0.5, cy).lineTo(cx - r * 0.1, cy + r * 0.4).lineTo(cx + r * 0.55, cy - r * 0.35)
          .lineWidth(sz * 0.08).lineCap('round').lineJoin('round').strokeColor('white').stroke();
      },
      // 🏠 Maison
      house: (cx, cy, sz, col) => {
        const r = sz * 0.38;
        doc.moveTo(cx, cy - r).lineTo(cx + r, cy - r * 0.05).lineTo(cx - r, cy - r * 0.05)
          .closePath().fillColor(col).fill();
        doc.rect(cx - r * 0.7, cy - r * 0.05, r * 1.4, r * 0.85).fillColor(col).fill();
        doc.rect(cx - r * 0.15, cy + r * 0.25, r * 0.3, r * 0.55).fillColor('white').fill();
      },
      // 👤 Personne
      person: (cx, cy, sz, col) => {
        const r = sz * 0.35;
        doc.circle(cx, cy - r * 0.55, r * 0.35).fillColor(col).fill();
        doc.moveTo(cx - r * 0.6, cy + r * 0.9).lineTo(cx - r * 0.25, cy + r * 0.05)
          .lineTo(cx + r * 0.25, cy + r * 0.05).lineTo(cx + r * 0.6, cy + r * 0.9)
          .closePath().fillColor(col).fill();
      },
      // 🌍 Globe
      globe: (cx, cy, sz, col) => {
        const r = sz * 0.36;
        doc.circle(cx, cy, r).fillColor(col).fill();
        doc.moveTo(cx - r, cy).lineTo(cx + r, cy).lineWidth(sz * 0.025).strokeColor('white').stroke();
        doc.moveTo(cx - r * 0.85, cy - r * 0.45).lineTo(cx + r * 0.85, cy - r * 0.45)
          .lineWidth(sz * 0.025).strokeColor('white').stroke();
        doc.moveTo(cx - r * 0.85, cy + r * 0.45).lineTo(cx + r * 0.85, cy + r * 0.45)
          .lineWidth(sz * 0.025).strokeColor('white').stroke();
        doc.ellipse(cx, cy, r * 0.38, r).lineWidth(sz * 0.025).strokeColor('white').stroke();
      },
      // ❤️ Cœur
      heart: (cx, cy, sz, col) => {
        const r = sz * 0.2;
        doc.circle(cx - r * 0.65, cy - r * 0.35, r * 0.7).fillColor(col).fill();
        doc.circle(cx + r * 0.65, cy - r * 0.35, r * 0.7).fillColor(col).fill();
        doc.moveTo(cx - r * 1.35, cy - r * 0.15).lineTo(cx, cy + r * 1.6)
          .lineTo(cx + r * 1.35, cy - r * 0.15).closePath().fillColor(col).fill();
      },
      // 🛡️ Bouclier
      shield: (cx, cy, sz, col) => {
        const r = sz * 0.38;
        doc.moveTo(cx, cy - r).lineTo(cx + r * 0.8, cy - r * 0.5).lineTo(cx + r * 0.7, cy + r * 0.3)
          .lineTo(cx, cy + r).lineTo(cx - r * 0.7, cy + r * 0.3).lineTo(cx - r * 0.8, cy - r * 0.5)
          .closePath().fillColor(col).fill();
      },
      // ⚙️ Engrenage
      gear: (cx, cy, sz, col) => {
        const r = sz * 0.36;
        doc.circle(cx, cy, r * 0.7).fillColor(col).fill();
        const tw = r * 0.3; const th = r * 0.35;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const tx = cx + Math.cos(a) * r * 0.65;
          const ty = cy + Math.sin(a) * r * 0.65;
          doc.circle(tx, ty, tw).fillColor(col).fill();
        }
        doc.circle(cx, cy, r * 0.28).fillColor('white').fill();
      },
      // 🚗 Véhicule
      car: (cx, cy, sz, col) => {
        const r = sz * 0.38;
        doc.roundedRect(cx - r, cy - r * 0.1, r * 2, r * 0.65, r * 0.12).fillColor(col).fill();
        doc.moveTo(cx - r * 0.5, cy - r * 0.1).lineTo(cx - r * 0.3, cy - r * 0.55)
          .lineTo(cx + r * 0.35, cy - r * 0.55).lineTo(cx + r * 0.55, cy - r * 0.1)
          .closePath().fillColor(col).fill();
        doc.circle(cx - r * 0.5, cy + r * 0.55, r * 0.18).fillColor(col).fill();
        doc.circle(cx + r * 0.5, cy + r * 0.55, r * 0.18).fillColor(col).fill();
      },
      // 🔔 Cloche
      bell: (cx, cy, sz, col) => {
        const r = sz * 0.35;
        doc.moveTo(cx - r * 0.65, cy + r * 0.35)
          .bezierCurveTo(cx - r * 0.65, cy - r * 0.5, cx - r * 0.3, cy - r * 0.9, cx, cy - r * 0.9)
          .bezierCurveTo(cx + r * 0.3, cy - r * 0.9, cx + r * 0.65, cy - r * 0.5, cx + r * 0.65, cy + r * 0.35)
          .closePath().fillColor(col).fill();
        doc.rect(cx - r * 0.85, cy + r * 0.35, r * 1.7, r * 0.18).fillColor(col).fill();
        doc.circle(cx, cy + r * 0.72, r * 0.14).fillColor(col).fill();
      },
      // 💬 Bulle de dialogue
      chat: (cx, cy, sz, col) => {
        const r = sz * 0.36;
        doc.roundedRect(cx - r, cy - r * 0.6, r * 2, r * 1.2, r * 0.25).fillColor(col).fill();
        doc.moveTo(cx - r * 0.3, cy + r * 0.6).lineTo(cx - r * 0.7, cy + r)
          .lineTo(cx + r * 0.1, cy + r * 0.6).closePath().fillColor(col).fill();
      },
      // ⚫ Point (fallback générique)
      dot: (cx, cy, sz, col) => {
        doc.circle(cx, cy, sz * 0.28).fillColor(col).fill();
      },
    };

    // Dessiner une icône vectorielle KPI à partir d'un emoji
    // Mapping ultra-robuste basé sur le premier codepoint significatif
    const cpToCat: Record<number, string> = {};
    const addCp = (cp: number, cat: string) => { cpToCat[cp] = cat; };
    // ⚡ Lightning
    [0x26A1, 0x1F50C, 0x1F50B].forEach(cp => addCp(cp, 'lightning'));
    // ☀️ Sun / Lumière
    [0x2600, 0x1F31E, 0x1F324, 0x1F321, 0x1F4A1, 0x1F506].forEach(cp => addCp(cp, 'sun'));
    // 🔥 Fire
    [0x1F525, 0x1F30B].forEach(cp => addCp(cp, 'fire'));
    // 🌿 Leaf / Nature / Recyclage
    [0x1F33F, 0x1F343, 0x1F331, 0x2618, 0x1F33E, 0x1F33B, 0x1F333, 0x1F332, 0x1F334, 0x1F335, 0x1F338, 0x1F33A, 0x1F340,
     0x267B, 0x1F504, 0x1F501, 0x1F503, 0x1F308, 0x1F98B, 0x1F41D, 0x1FAB4, 0x1F3ED].forEach(cp => addCp(cp, 'leaf'));
    // 💧 Drop / Eau
    [0x1F4A7, 0x1F30A, 0x1F4A6, 0x2744, 0x1F4A8, 0x1F32A, 0x1F327, 0x2601, 0x1F9CA].forEach(cp => addCp(cp, 'drop'));
    // 💰 Coin / Finance
    [0x1F4B0, 0x1F4B5, 0x1F4B6, 0x1F4B7, 0x1FA99, 0x1F4B2, 0x1F4B8, 0x1F911, 0x1F4B9, 0x1F3E7, 0x1F4B3, 0x1F9FE, 0x1F3E6,
     0x1F4B4, 0x1FAF0].forEach(cp => addCp(cp, 'coin'));
    // 💎 Diamond
    [0x1F48E].forEach(cp => addCp(cp, 'diamond'));
    // 📈 Chart / Données
    [0x1F4C8, 0x1F4CA, 0x1F4C9, 0x1F522, 0x1F523, 0x1F4D0, 0x1F4CF, 0x1F9EE, 0x1F4CB, 0x1F4D1, 0x1F4DD, 0x270F,
     0x2795, 0x2796, 0x2716, 0x2797, 0x1F51F, 0x1F4C3, 0x1F4C4, 0x1F4DC].forEach(cp => addCp(cp, 'chart'));
    // ⏰ Clock / Temps
    [0x23F0, 0x1F550, 0x1F551, 0x1F552, 0x1F553, 0x1F554, 0x1F555, 0x1F556, 0x1F557, 0x1F558, 0x1F559, 0x1F55A, 0x1F55B,
     0x23F1, 0x23F3, 0x231B, 0x1F4C5, 0x1F4C6, 0x1F5D3, 0x23E9, 0x23EA].forEach(cp => addCp(cp, 'clock'));
    // 🏆 Trophy
    [0x1F3C6, 0x1F947, 0x1F948, 0x1F949, 0x1F3C5, 0x1F396, 0x1F3F5, 0x1F4AF, 0x1F451].forEach(cp => addCp(cp, 'trophy'));
    // ⭐ Star
    [0x2B50, 0x1F31F, 0x2728, 0x1F4AB, 0x1F381, 0x1F389, 0x1F38A, 0x1F3AA, 0x1F397, 0x1F380].forEach(cp => addCp(cp, 'star'));
    // 🎯 Target
    [0x1F3AF, 0x1F4CC, 0x1F50D, 0x1F50E, 0x2696].forEach(cp => addCp(cp, 'target'));
    // ✅ Check
    [0x2705, 0x2611, 0x2714].forEach(cp => addCp(cp, 'check'));
    // 🏠 House / Bâtiment
    [0x1F3E0, 0x1F3E1, 0x1F3E2, 0x1F3D7, 0x1F3D8, 0x1F3F0, 0x1F3DB, 0x26EA, 0x1F54C, 0x1F3E4, 0x1F3DA,
     0x1F6AA, 0x1FA9F, 0x1F9F1, 0x1F3D9, 0x1F3E5, 0x1F3EA, 0x1F3EB].forEach(cp => addCp(cp, 'house'));
    // 👤 Person
    [0x1F464, 0x1F465, 0x1F91D, 0x1F477, 0x1F916, 0x1F9E0, 0x1F3C3, 0x1F9D8, 0x1F468, 0x1F469, 0x1F9D1,
     0x1F4BC, 0x1F393, 0x1F4DE, 0x2709, 0x1F4E7, 0x1F44F, 0x1F44D, 0x1F64C, 0x1F4AA, 0x1F680].forEach(cp => addCp(cp, 'person'));
    // 🌍 Globe
    [0x1F30D, 0x1F30E, 0x1F30F, 0x1F5FA, 0x1F310].forEach(cp => addCp(cp, 'globe'));
    // ❤️ Heart
    [0x2764, 0x1F49A, 0x1F499, 0x1F49B, 0x1FA77, 0x1F49C, 0x1F9E1].forEach(cp => addCp(cp, 'heart'));
    // 🛡️ Shield / Sécurité
    [0x1F6E1, 0x1F512, 0x1F513, 0x1F511, 0x1F5DD].forEach(cp => addCp(cp, 'shield'));
    // ⚙️ Gear / Outils
    [0x2699, 0x1F527, 0x1F528, 0x1F6E0, 0x2702, 0x1F9F2, 0x1FA9B, 0x1F529, 0x1FA9C].forEach(cp => addCp(cp, 'gear'));
    // 🚗 Car / Transport
    [0x1F697, 0x1F698, 0x1F68C, 0x1F682, 0x1F3CE, 0x1F695, 0x1F690, 0x1F6FB, 0x1F688, 0x1F687, 0x1F69B, 0x1F6B2, 0x1F6F4,
     0x2708, 0x1F681, 0x1F6E9, 0x1F680, 0x1F6F8, 0x26F5, 0x1F6A2, 0x1F699, 0x1F68E, 0x1F6F5, 0x1F6D2, 0x26FD, 0x1F6E4].forEach(cp => addCp(cp, 'car'));
    // 🔔 Bell
    [0x1F514, 0x1F4E2, 0x1F4E3, 0x1F50A].forEach(cp => addCp(cp, 'bell'));
    // 💬 Chat
    [0x1F4AC, 0x1F517, 0x1F4CE].forEach(cp => addCp(cp, 'chat'));
    // 🖥️ Tech
    [0x1F4BB, 0x1F5A5, 0x1F4F1, 0x1F4F2, 0x2328, 0x1F5B1, 0x1F5A8, 0x1F4F6, 0x1F4F7, 0x1F3A5, 0x1F4F9,
     0x1F4A0, 0x1F50D, 0x1F3B5, 0x1F3AE, 0x1F3B2, 0x1FA7A, 0x1FA78].forEach(cp => addCp(cp, 'gear'));

    const getFirstSignificantCodePoint = (emoji: string): number | null => {
      // Strip modifiers to find the base emoji codepoint
      const stripped = emoji
        .replace(/[\uFE0E\uFE0F\u200D\u200B\u20E3]/g, '')
        .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
        .trim();
      for (const char of stripped) {
        const cp = char.codePointAt(0);
        if (cp && cp > 0x7F) return cp; // First non-ASCII codepoint
      }
      return null;
    };

    const drawKpiIcon = (cx: number, cy: number, sz: number, col: string, emoji: string): boolean => {
      if (!emoji || !emoji.trim()) return false;

      // ─── Extraire l'emoji brut depuis le format "cat:emoji" ───
      let rawEmoji = emoji.trim();
      if (rawEmoji.includes(':')) {
        rawEmoji = rawEmoji.split(':').slice(1).join(':').trim();
      }

      // ─── PRIORITÉ 1 : PNG Twemoji (vrai emoji) ───
      const pngPath = this.emojiPngCache.get(rawEmoji);
      if (pngPath && fs.existsSync(pngPath)) {
        try {
          doc.image(pngPath, cx - sz / 2, cy - sz / 2, { width: sz, height: sz });
          return true;
        } catch (e) {
          console.warn(`📄 [PDF] Erreur doc.image emoji: ${e}`);
        }
      }

      // ─── PRIORITÉ 2 : Fallback vectoriel ───
      let cat = 'dot';
      if (emoji.includes(':')) {
        const candidateCat = emoji.split(':')[0].trim();
        if (icoFns[candidateCat]) cat = candidateCat;
      } else if (icoFns[emoji.trim()]) {
        cat = emoji.trim();
      } else {
        const cp = getFirstSignificantCodePoint(emoji);
        cat = cp ? (cpToCat[cp] || 'dot') : 'dot';
      }
      
      const fn = icoFns[cat] || icoFns.dot;
      doc.save();
      fn(cx, cy, sz, col);
      doc.restore();
      return true;
    };

    // ─── Helper : formater une valeur numérique avec décimales et séparateur ───
    const formatKpiValue = (raw: string, decimals: string, useSeparator: boolean): string => {
      const cleaned = raw.replace(/\s/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      if (isNaN(num)) return raw;
      if (decimals === 'auto' && !useSeparator) return raw;
      let decCount: number;
      if (decimals === 'auto') {
        const match = cleaned.match(/\.(\d+)/);
        decCount = match ? Math.min(match[1].length, 6) : 0;
      } else {
        decCount = parseInt(decimals);
      }
      const fixed = num.toFixed(decCount);
      const parts = fixed.split('.');
      if (useSeparator) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      }
      return parts.length > 1 && decCount > 0 ? `${parts[0]},${parts[1]}` : parts[0];
    };

    // ═══ Collecter les KPIs actifs ═══
    const allKpis: Array<{
      label: string; value: string; suffix: string; icon: string; color: string;
      valueBold: boolean; valueItalic: boolean; labelBold: boolean; labelItalic: boolean;
    }> = [];

    // Lire KPIs depuis les clés plates (kpi1_*, kpi2_*, ...) qui ont les bindings
    for (let i = 1; i <= 8; i++) {
      const label = config[`kpi${i}_label`];
      const rawValue = config[`kpi${i}_binding`] || config[`kpi${i}_value`] || '';
      const suffix = config[`kpi${i}_suffix`] || '';
      const rawIcon = config[`kpi${i}_icon`] || '';
      const color = config[`kpi${i}_color`] || this.theme.primaryColor || '#0F5C60';
      const decimals = config[`kpi${i}_decimals`] || 'auto';
      const separator = config[`kpi${i}_separator`] !== false;
      const valueBold = config[`kpi${i}_valueBold`] !== false;
      const valueItalic = config[`kpi${i}_valueItalic`] === true;
      const labelBold = config[`kpi${i}_labelBold`] === true;
      const labelItalic = config[`kpi${i}_labelItalic`] === true;
      if (!label && !rawValue) continue;
      let resolvedValue = this.substituteVariables(rawValue);
      if (resolvedValue) {
        resolvedValue = formatKpiValue(resolvedValue, decimals, separator);
      }
      if (resolvedValue) {
        allKpis.push({
          label: label || `KPI ${i}`, value: resolvedValue, suffix, icon: rawIcon, color,
          valueBold, valueItalic, labelBold, labelItalic,
        });
      }
    }

    // Les champs plats (kpi1_icon, kpi2_icon...) sont la source de vérité configurée par l'icon-picker.
    // NE PAS enrichir/écraser avec config.kpis[] qui contient des icônes différentes.
    console.log(`📊 [KPI-BANNER] ${allKpis.length} KPIs from flat fields: ${allKpis.map(k => `${k.label}(icon=${k.icon})`).join(', ')}`);

    // Fallback : si pas de champs plats, essayer tableau complet
    if (allKpis.length === 0 && Array.isArray(config.kpis)) {
      for (const kpi of (config.kpis as any[])) {
        if (!kpi || kpi.enabled === false) continue;
        if (!kpi.label && !kpi.value && !kpi.binding) continue;
        const rawVal = kpi.binding || kpi.value || '';
        const resolved = this.substituteVariables(rawVal);
        if (resolved) {
          allKpis.push({
            label: kpi.label || '',
            value: resolved,
            suffix: kpi.suffix || '',
            icon: kpi.icon || '',
            color: kpi.color || this.theme.primaryColor || '#0F5C60',
            valueBold: true, valueItalic: false, labelBold: false, labelItalic: false,
          });
        }
      }
    }

    // Fallback : données de démonstration (couleurs logo 2Thier)
    if (allKpis.length === 0) {
      allKpis.push(
        { label: 'Economie annuelle', value: '1 200', suffix: '/an', icon: '💰', color: '#D9791F', valueBold: true, valueItalic: false, labelBold: false, labelItalic: false },
        { label: 'ROI', value: '8', suffix: 'ans', icon: '⏰', color: '#0F5C60', valueBold: true, valueItalic: false, labelBold: false, labelItalic: false },
        { label: 'Gain 15 ans', value: '18 000', suffix: 'EUR', icon: '📈', color: '#D9791F', valueBold: true, valueItalic: false, labelBold: false, labelItalic: false },
        { label: 'Gain 25 ans', value: '32 000', suffix: 'EUR', icon: '🏆', color: '#0F5C60', valueBold: true, valueItalic: false, labelBold: false, labelItalic: false },
      );
    }

    const isOutline = bannerStyle === 'outline';
    const pad = 6 * this.scaleFactor;

    // ═══ Fond du bandeau ═══
    if (isOutline) {
      this.doc
        .roundedRect(x, y, width, height, cornerRadius)
        .lineWidth(2 * this.scaleFactor)
        .strokeColor(gradientFrom)
        .stroke();
    } else {
      // Dégradé simulé
      const grad = (this.doc as any).linearGradient?.(x, y, x + width, y);
      if (grad) {
        grad.stop(0, gradientFrom, 1).stop(1, gradientTo, 1);
        this.doc.rect(x, y, width, height).fill(grad);
      } else {
        // Fallback sans gradient API
        const halfW = width / 2;
        this.doc.rect(x, y, halfW, height).fill(gradientFrom);
        this.doc.rect(x + halfW, y, halfW, height).fill(gradientTo);
      }
    }

    const effectiveTextColor = isOutline ? gradientFrom : textColor;
    const labelColor = isOutline ? '#666666' : '#d4d4d4';
    const cardOverlay = isOutline ? '#f0f0f0' : '#ffffff';

    // ═══ Layout vertical ═══
    let currentY = y + pad;
    const bottomY = y + height - pad;

    // ═══ Mention "* À titre d'information" en haut à droite ═══
    const disclaimerFs = this.scaleFontSize(compactMode ? 4 : 5);
    const disclaimerColor = isOutline ? '#999999' : accentColor;
    this.doc
      .font('Helvetica-Oblique')
      .fontSize(disclaimerFs)
      .fillColor(disclaimerColor)
      .fillOpacity(isOutline ? 0.7 : 0.85)
      .text('* A titre d\'information', x + pad, y + 2 * this.scaleFactor, {
        width: width - pad * 2,
        align: 'right',
        lineBreak: false,
      })
      .fillOpacity(1);

    // ═══ Titre ═══
    if (showTitle) {
      const titleFs = this.scaleFontSize(compactMode ? 8 : 10);
      this.doc
        .font('Helvetica-Bold')
        .fontSize(titleFs)
        .fillColor(effectiveTextColor);

      const titleText = bannerTitle;
      const titleW = this.doc.widthOfString(titleText);
      this.doc.text(titleText, x + pad, currentY, {
        width: width - pad * 2,
        align: 'left',
        lineBreak: false,
      });

      // Ligne d'accent (commence après le texte réel)
      const lineY = currentY + titleFs + 1.5 * this.scaleFactor;
      const lineStartX = x + pad + titleW + 6 * this.scaleFactor;
      if (lineStartX < x + width - pad) {
        this.doc
          .moveTo(lineStartX, lineY)
          .lineTo(x + width - pad, lineY)
          .lineWidth(1.5 * this.scaleFactor)
          .strokeColor(accentColor)
          .stroke();
      }
      currentY = lineY + 3 * this.scaleFactor;
    }

    // ═══ Reserve pour la barre ROI ═══
    const roiKpi = allKpis.find(k => k.suffix?.toLowerCase().includes('an'));
    const hasRoiBar = showProgressBar && roiKpi;
    const roiReserve = hasRoiBar ? (compactMode ? 14 : 18) * this.scaleFactor : 0;

    // ═══ Grille KPIs ═══
    const kpiCount = allKpis.length;
    const kpiGap = 4 * this.scaleFactor;
    const kpiWidth = (width - pad * 2 - kpiGap * (kpiCount - 1)) / kpiCount;
    const kpiHeight = Math.max(20 * this.scaleFactor, bottomY - currentY - roiReserve);
    const kpiY = currentY;

    // Valeur max pour les mini-barres
    const numericValues = allKpis.map(k => {
      const cleaned = k.value.replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    });
    const maxVal = Math.max(...numericValues, 1);

    // Tailles de police adaptées à la hauteur disponible
    const valFs = this.scaleFontSize(compactMode ? (kpiCount > 4 ? 11 : 14) : (kpiCount > 4 ? 14 : 18));
    const sufFs = this.scaleFontSize(compactMode ? 6 : 8);
    const labFs = this.scaleFontSize(compactMode ? 5.5 : 6.5);
    const elGap = 1 * this.scaleFactor;

    allKpis.forEach((kpi, idx) => {
      const kpiX = x + pad + idx * (kpiWidth + kpiGap);

      // Fond de la carte KPI
      const cardRadius = 3 * this.scaleFactor;
      if (isOutline) {
        this.doc
          .roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, cardRadius)
          .fillOpacity(0.06).fill(kpi.color).fillOpacity(1);
        this.doc
          .roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, cardRadius)
          .lineWidth(0.5 * this.scaleFactor)
          .strokeOpacity(0.25).strokeColor(kpi.color).stroke().strokeOpacity(1);
      } else {
        this.doc
          .roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, cardRadius)
          .fillOpacity(0.12).fill(cardOverlay).fillOpacity(1);
      }

      // ─── Contenu : centré verticalement (icône À GAUCHE de la valeur) ───
      const hasIcon = !!(kpi.icon && kpi.icon.trim());
      const iconSz = hasIcon ? valFs * 0.95 : 0;
      const iconLeftGap = hasIcon ? 3 * this.scaleFactor : 0;
      const valueH = valFs + elGap;
      const labelH = labFs + elGap;
      const miniBarH = showMiniChart ? 5 * this.scaleFactor : 0;
      const totalH = valueH + labelH + miniBarH;
      const topOffset = Math.max(2 * this.scaleFactor, (kpiHeight - totalH) / 2);
      let innerY = kpiY + topOffset;

      // Valeur + suffixe sur la même ligne
      const valueFont = kpi.valueBold
        ? (kpi.valueItalic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold')
        : (kpi.valueItalic ? 'Helvetica-Oblique' : 'Helvetica');
      const valueColor = isOutline ? kpi.color : '#ffffff';

      // Calculer la largeur du texte valeur pour positionner le suffixe à droite
      this.doc.font(valueFont).fontSize(valFs);
      const valTextW = this.doc.widthOfString(kpi.value);
      const sufGap = 2 * this.scaleFactor;
      let sufTextW = 0;
      if (kpi.suffix) {
        this.doc.font('Helvetica').fontSize(sufFs);
        sufTextW = this.doc.widthOfString(kpi.suffix);
      }
      // Inclure l'astérisque et l'icône dans le calcul de largeur combinée
      const asteriskW = 3 * this.scaleFactor;
      const iconTotalW = hasIcon ? iconSz + iconLeftGap : 0;
      const combinedW = iconTotalW + valTextW + asteriskW + (kpi.suffix ? sufGap + sufTextW : 0);
      const startX = kpiX + (kpiWidth - combinedW) / 2;

      // Dessiner l'icône (PNG Twemoji ou fallback vectoriel) à gauche de la valeur
      if (hasIcon) {
        const iconCx = startX + iconSz / 2;
        const iconCy = innerY + valFs / 2;
        // Extraire l'emoji brut pour vérifier si on a un PNG
        let rawEmojiCheck = (kpi.icon || '').trim();
        if (rawEmojiCheck.includes(':')) rawEmojiCheck = rawEmojiCheck.split(':').slice(1).join(':').trim();
        const hasPng = this.emojiPngCache.has(rawEmojiCheck);

        if (!isOutline && !hasPng) {
          // Sur dégradé avec fallback vectoriel : fond blanc circulaire
          this.doc.save();
          this.doc.circle(iconCx, iconCy, iconSz * 0.44)
            .fillColor('#ffffff').fillOpacity(0.92).fill()
            .fillOpacity(1);
          this.doc.restore();
        }
        drawKpiIcon(iconCx, iconCy, iconSz, kpi.color, kpi.icon);
      }

      // Dessiner la valeur (décalée à droite si icône)
      const valStartX = startX + iconTotalW;
      this.doc
        .font(valueFont)
        .fontSize(valFs)
        .fillColor(valueColor)
        .text(kpi.value, valStartX, innerY, { width: valTextW + 2, lineBreak: false });

      // Astérisque après la valeur (rappel mention) — orange accent
      const asteriskFs = this.scaleFontSize(compactMode ? 5 : 6);
      const asteriskColor = isOutline ? kpi.color : accentColor;
      this.doc
        .font('Helvetica')
        .fontSize(asteriskFs)
        .fillColor(asteriskColor)
        .fillOpacity(isOutline ? 0.6 : 0.85)
        .text('*', valStartX + valTextW, innerY, { width: 6 * this.scaleFactor, lineBreak: false })
        .fillOpacity(1);

      // Dessiner le suffixe à droite, aligné sur la baseline
      if (kpi.suffix) {
        const sufColor = valueColor;
        const baselineOffset = valFs - sufFs;
        this.doc
          .font('Helvetica')
          .fontSize(sufFs)
          .fillColor(sufColor)
          .text(kpi.suffix, valStartX + valTextW + asteriskW + sufGap, innerY + baselineOffset, { width: sufTextW + 2, lineBreak: false });
      }
      innerY += valueH;

      // Label (tout en haut caps)
      const labelFont = kpi.labelBold
        ? (kpi.labelItalic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold')
        : (kpi.labelItalic ? 'Helvetica-Oblique' : 'Helvetica');
      this.doc
        .font(labelFont)
        .fontSize(labFs)
        .fillColor(labelColor)
        .text(kpi.label.toUpperCase(), kpiX + 1, innerY, {
          width: kpiWidth - 2,
          align: 'center',
          lineBreak: false,
        });
      innerY += labelH;

      // Mini barre de progression
      if (showMiniChart) {
        const numVal = numericValues[idx];
        if (numVal > 0) {
          const barW = kpiWidth * 0.6;
          const barH = 2.5 * this.scaleFactor;
          const barX = kpiX + (kpiWidth - barW) / 2;
          const barY = Math.min(innerY, kpiY + kpiHeight - 4 * this.scaleFactor);
          // Track
          const trackColor = isOutline ? '#e5e7eb' : '#ffffff';
          this.doc
            .roundedRect(barX, barY, barW, barH, 1.5 * this.scaleFactor)
            .fillOpacity(0.2).fill(trackColor).fillOpacity(1);
          // Fill (décoratif — 100%)
          this.doc
            .roundedRect(barX, barY, barW, barH, 1.5 * this.scaleFactor)
            .fill(accentColor);
        }
      }
    });

    // ═══ Barre ROI globale ═══
    if (hasRoiBar && roiKpi) {
      const roiNumeric = parseFloat(roiKpi.value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (roiNumeric > 0) {
        const barH = 4 * this.scaleFactor;
        const barY2 = bottomY - barH - (compactMode ? 4 : 6) * this.scaleFactor;
        const barX = x + pad;
        const pct = Math.min(100, Math.round((1 / roiNumeric) * 100 * 15));

        // Label "ROI"
        const roiLabelFs = this.scaleFontSize(compactMode ? 5.5 : 6.5);
        this.doc
          .font('Helvetica-Bold')
          .fontSize(roiLabelFs)
          .fillColor(labelColor)
          .text('ROI', barX, barY2, { width: 18 * this.scaleFactor, align: 'left', lineBreak: false });

        const trackX = barX + 20 * this.scaleFactor;
        const barFullW = width - pad * 2 - 20 * this.scaleFactor - 30 * this.scaleFactor;

        // Track
        const trackColor = isOutline ? '#e5e7eb' : '#ffffff';
        this.doc
          .roundedRect(trackX, barY2, barFullW, barH, 2 * this.scaleFactor)
          .fillOpacity(0.15).fill(trackColor).fillOpacity(1);
        // Fill
        const fillW = Math.max(barH, (pct / 100) * barFullW);
        this.doc
          .roundedRect(trackX, barY2, fillW, barH, 2 * this.scaleFactor)
          .fill(accentColor);

        // Percentage
        this.doc
          .font('Helvetica-Bold')
          .fontSize(this.scaleFontSize(compactMode ? 6 : 7))
          .fillColor(accentColor)
          .text(`${pct}%`, trackX + barFullW + 3 * this.scaleFactor, barY2, {
            width: 28 * this.scaleFactor,
            align: 'left',
            lineBreak: false,
          });
      }
    }

    this.doc.restore();
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
