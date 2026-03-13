/**
 * 📄 TBL PDF Generator
 * 
 * Génère un PDF récapitulatif d'un devis TBL (TreeBranchLeaf).
 * Structuré par sections/tabs avec toutes les valeurs soumises.
 * Inclut optionnellement la signature électronique.
 */

import PDFDocument from 'pdfkit';
import * as crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface TblPdfField {
  nodeId: string;
  label: string;
  value: any;
  type: string;
  fieldType?: string;
  fieldSubType?: string;
  calculatedBy?: string;
}

export interface TblPdfSection {
  title: string;
  fields: TblPdfField[];
}

export interface TblPdfLeadInfo {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  fullAddress?: string | null;
}

export interface TblPdfSignatureInfo {
  signerName: string;
  signerRole: string;
  signatureData: string; // base64 PNG
  signedAt: Date;
  legalText?: string;
  ipAddress?: string;
}

export interface TblPdfData {
  treeName: string;
  submissionId: string;
  devisName?: string;
  organizationName?: string;
  organizationLogo?: string; // URL ou base64
  lead?: TblPdfLeadInfo | null;
  sections: TblPdfSection[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
  signatures?: TblPdfSignatureInfo[];
  // Traçabilité rectification (optionnel)
  rectificationData?: Array<{
    fieldLabel: string;
    originalValue: string | null;
    technicianValue: string | null;
    commercialValue: string | null;
    technicianName?: string | null;
    modificationNote?: string | null;
  }>;
}

// ============================================================
// HELPERS
// ============================================================

function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const raw = String(input);
  return raw
    .normalize('NFKD')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u017F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.map(v => sanitizeText(v)).join(', ');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return sanitizeText(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// ============================================================
// GÉNÉRATION PDF
// ============================================================

/**
 * Génère un PDF complet du devis TBL
 * @returns {Promise<Buffer>} Le PDF en buffer
 */
export async function generateTblPdf(data: TblPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: {
          Title: `Devis - ${data.devisName || data.submissionId}`,
          Author: data.organizationName || '2Thier CRM',
          Subject: `Devis TBL ${data.lead?.email || 'N/A'}`,
          CreationDate: new Date(),
          Keywords: 'devis, tbl, signature electronique'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const margin = 45;
      const contentWidth = 595.28 - margin * 2; // A4 width
      const primaryColor = '#1677ff';
      const darkColor = '#1a1a2e';
      const lightGray = '#f5f5f5';
      const borderColor = '#e0e0e0';

      // ════════════════ PAGE DE GARDE ════════════════
      doc.rect(0, 0, 595.28, 120).fill(darkColor);
      
      doc.fontSize(28)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(data.organizationName || 'Devis', margin, 35, { width: contentWidth, align: 'center' });
      
      doc.fontSize(12)
        .fillColor('#cccccc')
        .font('Helvetica')
        .text('Document confidentiel', margin, 75, { width: contentWidth, align: 'center' });

      doc.moveDown(2);
      let y = 140;

      // Titre du devis
      doc.fontSize(20)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(sanitizeText(data.devisName || `Devis #${data.submissionId.substring(0, 8)}`), margin, y, { 
          width: contentWidth, align: 'center' 
        });
      y = doc.y + 10;

      // Ligne de séparation
      doc.strokeColor(primaryColor).lineWidth(2)
        .moveTo(margin + 50, y).lineTo(595.28 - margin - 50, y).stroke();
      y += 15;

      // Infos du document
      const statusLabels: Record<string, string> = {
        'draft': 'Brouillon',
        'completed': 'Finalise',
        'signed': 'Signe',
        'archived': 'Archive'
      };
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica');
      doc.text(`Statut : ${statusLabels[data.status] || data.status}`, margin, y, { width: contentWidth, align: 'center' });
      y = doc.y + 5;
      doc.text(`Cree le : ${data.createdAt.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y, { width: contentWidth, align: 'center' });
      y = doc.y + 5;
      doc.text(`Derniere modification : ${data.updatedAt.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y, { width: contentWidth, align: 'center' });
      y = doc.y + 20;

      // ════════════════ INFORMATIONS CLIENT ════════════════
      if (data.lead) {
        doc.rect(margin, y, contentWidth, 25).fill(primaryColor);
        doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold')
          .text('  INFORMATIONS CLIENT', margin + 10, y + 6);
        y += 30;

        const lead = data.lead;
        const clientInfo = [
          lead.firstName || lead.lastName ? `Nom : ${[lead.firstName, lead.lastName].filter(Boolean).join(' ')}` : null,
          lead.email ? `Email : ${lead.email}` : null,
          lead.phone ? `Telephone : ${lead.phone}` : null,
          lead.company ? `Societe : ${lead.company}` : null,
          lead.fullAddress ? `Adresse : ${lead.fullAddress}` : null,
        ].filter(Boolean);

        for (const info of clientInfo) {
          doc.fontSize(10).fillColor('#333333').font('Helvetica')
            .text(sanitizeText(info!), margin + 10, y);
          y = doc.y + 4;
        }
        y += 10;
      }

      // ════════════════ SECTIONS DU DEVIS ════════════════
      for (const section of data.sections) {
        if (section.fields.length === 0) continue;

        // Vérifier si on a besoin d'une nouvelle page
        if (y > 700) {
          doc.addPage();
          y = 45;
        }

        // Titre de section
        doc.rect(margin, y, contentWidth, 22).fill('#f0f5ff');
        doc.rect(margin, y, 4, 22).fill(primaryColor); // Barre latérale
        doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold')
          .text(`  ${sanitizeText(section.title)}`, margin + 10, y + 5);
        y += 28;

        // Tableau de champs
        const colLabelWidth = contentWidth * 0.45;
        const colValueWidth = contentWidth * 0.55;

        // En-tête tableau
        doc.rect(margin, y, colLabelWidth, 18).fill('#fafafa');
        doc.rect(margin + colLabelWidth, y, colValueWidth, 18).fill('#fafafa');
        doc.fontSize(8).fillColor('#888888').font('Helvetica-Bold');
        doc.text('CHAMP', margin + 5, y + 4, { width: colLabelWidth - 10 });
        doc.text('VALEUR', margin + colLabelWidth + 5, y + 4, { width: colValueWidth - 10 });
        y += 18;

        let rowIndex = 0;
        for (const field of section.fields) {
          const valueStr = formatValue(field.value);
          
          // Calculer la hauteur nécessaire
          const labelHeight = doc.heightOfString(sanitizeText(field.label), { width: colLabelWidth - 15, fontSize: 9 });
          const valueHeight = doc.heightOfString(valueStr, { width: colValueWidth - 15, fontSize: 9 });
          const rowHeight = Math.max(labelHeight, valueHeight, 16) + 6;

          // Nouvelle page si nécessaire
          if (y + rowHeight > 770) {
            doc.addPage();
            y = 45;
          }

          // Fond alternant
          if (rowIndex % 2 === 0) {
            doc.rect(margin, y, contentWidth, rowHeight).fill('#fafafa');
          }

          // Bordure fine
          doc.strokeColor(borderColor).lineWidth(0.3)
            .moveTo(margin, y + rowHeight).lineTo(margin + contentWidth, y + rowHeight).stroke();

          // Label
          doc.fontSize(9).fillColor('#333333').font('Helvetica-Bold')
            .text(sanitizeText(field.label), margin + 5, y + 3, { width: colLabelWidth - 15 });

          // Valeur
          const isCalculated = field.calculatedBy && field.calculatedBy !== 'neutral';
          doc.fontSize(9).fillColor(isCalculated ? '#1677ff' : '#555555').font(isCalculated ? 'Helvetica-Oblique' : 'Helvetica')
            .text(valueStr, margin + colLabelWidth + 5, y + 3, { width: colValueWidth - 15 });

          y += rowHeight;
          rowIndex++;
        }

        y += 12;
      }

      // ════════════════ TRAÇABILITÉ RECTIFICATION ════════════════
      if (data.rectificationData && data.rectificationData.length > 0) {
        if (y > 600) {
          doc.addPage();
          y = 45;
        }

        doc.rect(margin, y, contentWidth, 25).fill('#fa8c16');
        doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold')
          .text('  TRACABILITE DES MODIFICATIONS (RECTIFICATION)', margin + 10, y + 6);
        y += 30;

        for (const rect of data.rectificationData) {
          if (y > 700) { doc.addPage(); y = 45; }

          doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold')
            .text(sanitizeText(rect.fieldLabel), margin + 5, y);
          y = doc.y + 4;

          // 3 couches
          doc.fontSize(9).font('Helvetica');
          doc.fillColor('#1677ff').text(`  Devis initial : ${sanitizeText(rect.originalValue || '(vide)')}`, margin + 10, y);
          y = doc.y + 2;
          doc.fillColor('#cf1322').text(`  Technicien : ${sanitizeText(rect.technicianValue || '(vide)')}${rect.technicianName ? ` (${sanitizeText(rect.technicianName)})` : ''}`, margin + 10, y);
          y = doc.y + 2;
          if (rect.commercialValue && rect.commercialValue !== rect.technicianValue) {
            doc.fillColor('#389e0d').text(`  Correction commerciale : ${sanitizeText(rect.commercialValue)}`, margin + 10, y);
            y = doc.y + 2;
          }
          if (rect.modificationNote) {
            doc.fillColor('#d46b08').text(`  Raison : ${sanitizeText(rect.modificationNote)}`, margin + 10, y);
            y = doc.y + 2;
          }
          y += 8;
        }
        y += 10;
      }

      // ════════════════ BLOC SIGNATURE ════════════════
      if (data.signatures && data.signatures.length > 0) {
        if (y > 550) {
          doc.addPage();
          y = 45;
        }

        doc.rect(margin, y, contentWidth, 25).fill('#52c41a');
        doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold')
          .text('  SIGNATURES ELECTRONIQUES', margin + 10, y + 6);
        y += 30;

        for (const sig of data.signatures) {
          if (y > 600) { doc.addPage(); y = 45; }

          // Cadre de signature
          doc.rect(margin, y, contentWidth, 140).stroke(borderColor);
          
          // Info signataire
          doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold')
            .text(`${sig.signerRole === 'CLIENT' ? 'Le Client' : sig.signerRole === 'COMMERCIAL' ? 'Le Commercial' : 'Le Technicien'}`, margin + 10, y + 8);
          
          doc.fontSize(9).fillColor('#666666').font('Helvetica')
            .text(`Nom : ${sanitizeText(sig.signerName)}`, margin + 10, y + 24)
            .text(`Date : ${sig.signedAt.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin + 10, y + 38);
          
          if (sig.ipAddress) {
            doc.text(`IP : ${sig.ipAddress}`, margin + 10, y + 52);
          }

          // Image de la signature (base64 PNG)
          try {
            if (sig.signatureData && sig.signatureData.startsWith('data:image')) {
              const base64Data = sig.signatureData.split(',')[1];
              const imgBuffer = Buffer.from(base64Data, 'base64');
              doc.image(imgBuffer, margin + contentWidth - 210, y + 10, { width: 200, height: 80, fit: [200, 80] });
            }
          } catch (e) {
            doc.fontSize(8).fillColor('#ff4d4f')
              .text('[Signature non affichable]', margin + contentWidth - 210, y + 40);
          }

          // Clause légale sous la signature
          if (sig.legalText) {
            doc.fontSize(7).fillColor('#999999').font('Helvetica')
              .text(sanitizeText(sig.legalText), margin + 10, y + 100, { width: contentWidth - 20, lineBreak: true });
          }

          y += 150;
        }
      } else {
        // Zone de signature vierge
        if (y > 600) {
          doc.addPage();
          y = 45;
        }

        doc.rect(margin, y, contentWidth, 25).fill('#d9d9d9');
        doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold')
          .text('  SIGNATURE', margin + 10, y + 6);
        y += 30;

        // 2 colonnes : client et entreprise
        const colWidth = (contentWidth - 20) / 2;
        
        // Client
        doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold')
          .text('Le Client', margin, y);
        doc.fontSize(9).fillColor('#666666').font('Helvetica')
          .text('Date : ____/____/________', margin, y + 18)
          .text('Signature precedee de la mention', margin, y + 34)
          .text('"Lu et approuve" :', margin, y + 46);
        doc.rect(margin, y + 62, colWidth, 55).stroke('#cccccc');

        // Entreprise
        const rightX = margin + colWidth + 20;
        doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold')
          .text(data.organizationName || 'L\'entreprise', rightX, y);
        doc.fontSize(9).fillColor('#666666').font('Helvetica')
          .text('Date : ____/____/________', rightX, y + 18);
        doc.rect(rightX, y + 62, colWidth, 55).stroke('#cccccc');

        y += 125;
      }

      // ════════════════ PIED DE PAGE - HASH INTÉGRITÉ ════════════════
      if (y > 760) {
        doc.addPage();
        y = 45;
      }

      doc.moveDown(2);
      doc.strokeColor('#e0e0e0').lineWidth(0.5)
        .moveTo(margin, doc.y).lineTo(595.28 - margin, doc.y).stroke();
      doc.moveDown(0.3);

      doc.fontSize(7).fillColor('#999999').font('Helvetica')
        .text(`Document genere automatiquement par 2Thier CRM le ${new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, doc.y, { align: 'center', width: contentWidth })
        .text(`Reference : ${data.submissionId}`, { align: 'center', width: contentWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calcule le hash SHA-256 d'un buffer PDF
 */
export function hashPdf(pdfBuffer: Buffer): string {
  return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
}

/**
 * Génère un PDF et retourne le buffer + son hash
 */
export async function generateTblPdfWithHash(data: TblPdfData): Promise<{ buffer: Buffer; hash: string }> {
  const buffer = await generateTblPdf(data);
  const hash = hashPdf(buffer);
  return { buffer, hash };
}

export default { generateTblPdf, hashPdf, generateTblPdfWithHash };
