import PDFDocumentLib from 'pdfkit';
import { PassThrough } from 'stream';

// Types pour le document
interface DocumentData {
  id: string;
  documentNumber?: string | null;
  type: string;
  status: string;
  language: string;
  title?: string | null;
  notes?: string | null;
  createdAt: Date;
  template?: {
    id: string;
    name: string;
    type: string;
    sections?: TemplateSection[];
    theme?: DocumentTheme | null;
  } | null;
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    company?: string | null;
  } | null;
  dataSnapshot?: Record<string, any> | null;
}

interface TemplateSection {
  id: string;
  name: string;
  type: string;
  content?: any;
  config?: any;
  order: number;
  isActive: boolean;
}

interface DocumentTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  headerConfig?: any;
  footerConfig?: any;
}

// Couleurs par défaut
const DEFAULT_COLORS = {
  primary: '#1890ff',
  secondary: '#52c41a',
  text: '#333333',
  textLight: '#666666',
  border: '#e8e8e8',
  background: '#f5f5f5'
};

// Labels pour les types de documents
const TYPE_LABELS: Record<string, string> = {
  QUOTE: 'Devis',
  INVOICE: 'Facture',
  ORDER: 'Bon de commande',
  CONTRACT: 'Contrat',
  PRESENTATION: 'Présentation'
};

// Labels pour les langues
const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  nl: 'Nederlands',
  de: 'Deutsch',
  en: 'English'
};

/**
 * Générateur de PDF pour les documents CRM
 */
export class PDFGenerator {
  private doc: any;
  private data: DocumentData;
  private theme: DocumentTheme;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;

  constructor(data: DocumentData) {
    this.data = data;
    this.theme = data.template?.theme || {};
    this.margin = 50;
    this.pageWidth = 595.28; // A4
    this.pageHeight = 841.89; // A4
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;

    this.doc = new PDFDocumentLib({
      size: 'A4',
      margins: {
        top: this.margin,
        bottom: this.margin,
        left: this.margin,
        right: this.margin
      },
      info: {
        Title: data.title || `${TYPE_LABELS[data.type] || data.type} - ${data.documentNumber || data.id}`,
        Author: '2Thier CRM',
        Subject: TYPE_LABELS[data.type] || data.type,
        CreationDate: new Date()
      }
    });
  }

  /**
   * Génère le PDF complet
   */
  async generate(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);

      this.doc.pipe(stream);

      try {
        // Générer le contenu
        this.generateHeader();
        this.generateClientInfo();
        this.generateContent();
        this.generateFooter();

        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * En-tête du document
   */
  private generateHeader(): void {
    const primaryColor = this.theme.primaryColor || DEFAULT_COLORS.primary;
    
    // Bande de couleur en haut
    this.doc
      .rect(0, 0, this.pageWidth, 100)
      .fill(primaryColor);

    // Titre du document
    this.doc
      .fillColor('#ffffff')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text(TYPE_LABELS[this.data.type] || this.data.type, this.margin, 30, {
        width: this.contentWidth,
        align: 'left'
      });

    // Numéro du document
    if (this.data.documentNumber) {
      this.doc
        .fontSize(14)
        .font('Helvetica')
        .text(`N° ${this.data.documentNumber}`, this.margin, 65, {
          width: this.contentWidth,
          align: 'left'
        });
    }

    // Date à droite
    const dateStr = new Date(this.data.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    this.doc
      .fontSize(12)
      .text(dateStr, this.margin, 35, {
        width: this.contentWidth,
        align: 'right'
      });

    // Langue
    this.doc
      .fontSize(10)
      .text(LANGUAGE_LABELS[this.data.language] || this.data.language, this.margin, 55, {
        width: this.contentWidth,
        align: 'right'
      });

    this.currentY = 120;
  }

  /**
   * Informations client
   */
  private generateClientInfo(): void {
    if (!this.data.lead) return;

    const lead = this.data.lead;
    
    // Titre section
    this.doc
      .fillColor(DEFAULT_COLORS.text)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Client', this.margin, this.currentY);

    this.currentY += 25;

    // Cadre client
    const boxHeight = 80;
    this.doc
      .rect(this.margin, this.currentY, this.contentWidth, boxHeight)
      .stroke(DEFAULT_COLORS.border);

    this.currentY += 10;
    
    // Nom complet
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(DEFAULT_COLORS.text)
      .text(`${lead.firstName} ${lead.lastName}`, this.margin + 10, this.currentY);

    this.currentY += 18;

    // Entreprise
    if (lead.company) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(DEFAULT_COLORS.textLight)
        .text(lead.company, this.margin + 10, this.currentY);
      this.currentY += 15;
    }

    // Email
    if (lead.email) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text(`📧 ${lead.email}`, this.margin + 10, this.currentY);
      this.currentY += 15;
    }

    // Téléphone
    if (lead.phone) {
      this.doc
        .fontSize(10)
        .text(`📞 ${lead.phone}`, this.margin + 10, this.currentY);
      this.currentY += 15;
    }

    // Adresse
    if (lead.address) {
      this.doc
        .fontSize(10)
        .text(`📍 ${lead.address}`, this.margin + 10, this.currentY);
    }

    this.currentY += boxHeight - 40;
  }

  /**
   * Contenu principal (données du formulaire)
   */
  private generateContent(): void {
    this.currentY += 30;

    // Titre section
    this.doc
      .fillColor(DEFAULT_COLORS.text)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Détails', this.margin, this.currentY);

    this.currentY += 25;

    // Données du formulaire
    const snapshot = this.data.dataSnapshot as Record<string, any> | null;
    if (snapshot) {
      // Filtrer les données pour exclure les valeurs base64 longues (images)
      const filteredData = this.filterDataForDisplay(snapshot);
      
      // Afficher les données sous forme de tableau
      this.generateDataTable(filteredData);
    } else {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(DEFAULT_COLORS.textLight)
        .text('Aucune donnée disponible', this.margin, this.currentY);
      this.currentY += 20;
    }

    // Notes
    if (this.data.notes) {
      this.currentY += 20;
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(DEFAULT_COLORS.text)
        .text('Notes', this.margin, this.currentY);
      
      this.currentY += 15;
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(DEFAULT_COLORS.textLight)
        .text(this.data.notes, this.margin, this.currentY, {
          width: this.contentWidth,
          align: 'left'
        });
    }
  }

  /**
   * Filtre les données pour l'affichage (exclut les images base64, etc.)
   */
  private filterDataForDisplay(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Ignorer les clés techniques
      if (key === 'generatedAt' || key === 'generatedBy') continue;
      
      // Ignorer les valeurs null/undefined
      if (value === null || value === undefined) continue;
      
      // Ignorer les images base64
      if (typeof value === 'string' && value.startsWith('data:image')) {
        result[key] = '[Image]';
        continue;
      }
      
      // Ignorer les très longues chaînes (probablement des données encodées)
      if (typeof value === 'string' && value.length > 500) {
        result[key] = '[Données volumineuses]';
        continue;
      }
      
      // Traiter les objets imbriqués
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.filterDataForDisplay(value);
        continue;
      }
      
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Génère un tableau de données
   */
  private generateDataTable(data: Record<string, any>, level: number = 0): void {
    const indent = level * 20;
    
    for (const [key, value] of Object.entries(data)) {
      // Vérifier si on doit passer à une nouvelle page
      if (this.currentY > this.pageHeight - 100) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      // Formater la clé (remplacer les IDs par des labels plus lisibles)
      const label = this.formatLabel(key);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Section imbriquée
        this.doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(DEFAULT_COLORS.text)
          .text(label, this.margin + indent, this.currentY);
        this.currentY += 18;
        this.generateDataTable(value, level + 1);
      } else {
        // Ligne de données
        const displayValue = this.formatValue(value);
        
        // Label
        this.doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(DEFAULT_COLORS.textLight)
          .text(label + ':', this.margin + indent, this.currentY, {
            continued: true,
            width: 150
          });
        
        // Valeur
        this.doc
          .font('Helvetica')
          .fillColor(DEFAULT_COLORS.text)
          .text(' ' + displayValue, {
            width: this.contentWidth - 160 - indent
          });
        
        this.currentY += 18;
      }
    }
  }

  /**
   * Formate un label (clé) pour l'affichage
   */
  private formatLabel(key: string): string {
    // Si c'est un UUID, retourner "Champ"
    if (/^[a-f0-9-]{36}$/i.test(key)) {
      return 'Champ';
    }
    
    // Convertir camelCase en texte lisible
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Formate une valeur pour l'affichage
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'number') {
      // Formater les nombres avec séparateurs
      return value.toLocaleString('fr-FR');
    }
    
    return String(value);
  }

  /**
   * Pied de page
   */
  private generateFooter(): void {
    const footerY = this.pageHeight - 50;
    
    // Ligne de séparation
    this.doc
      .moveTo(this.margin, footerY - 10)
      .lineTo(this.pageWidth - this.margin, footerY - 10)
      .stroke(DEFAULT_COLORS.border);

    // Texte du footer
    this.doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(DEFAULT_COLORS.textLight)
      .text(
        `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} | 2Thier CRM`,
        this.margin,
        footerY,
        { width: this.contentWidth, align: 'center' }
      );
  }
}

/**
 * Fonction utilitaire pour générer un PDF
 */
export async function generatePDF(documentData: DocumentData): Promise<Buffer> {
  const generator = new PDFGenerator(documentData);
  return generator.generate();
}

export default PDFGenerator;
