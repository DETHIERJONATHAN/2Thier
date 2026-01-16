/**
 * 📄 Service de génération PDF pour les réponses de formulaire
 * 
 * Génère un PDF récapitulatif de toutes les réponses d'un formulaire simulateur
 * pour faciliter le travail des commerciaux.
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface FormQuestion {
  questionKey: string;
  title: string;
  subtitle?: string;
  icon?: string;
  questionType: string;
  options?: Array<{
    value: string;
    label: string;
    icon?: string;
  }>;
}

interface FormResponsePdfData {
  formName: string;
  formSlug: string;
  submittedAt: Date;
  contact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    civility?: string;
  };
  answers: Record<string, any>;
  questions: FormQuestion[];
  leadNumber?: string;
}

/**
 * Génère un PDF avec les réponses du formulaire
 */
export async function generateFormResponsePdf(data: FormResponsePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Récapitulatif - ${data.formName}`,
          Author: '2Thier CRM',
          Subject: `Réponses formulaire ${data.contact.email || 'N/A'}`,
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ============== EN-TÊTE ==============
      doc.fontSize(24)
         .fillColor('#1890ff')
         .text('📋 Récapitulatif du Formulaire', { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(14)
         .fillColor('#333')
         .text(data.formName, { align: 'center' });
      
      doc.moveDown(0.3);
      
      doc.fontSize(10)
         .fillColor('#888')
         .text(`Soumis le ${data.submittedAt.toLocaleDateString('fr-BE', { 
           day: '2-digit', 
           month: 'long', 
           year: 'numeric',
           hour: '2-digit',
           minute: '2-digit'
         })}`, { align: 'center' });

      if (data.leadNumber) {
        doc.text(`Référence: ${data.leadNumber}`, { align: 'center' });
      }

      doc.moveDown(1);

      // ============== INFORMATIONS DE CONTACT ==============
      doc.fillColor('#1890ff')
         .fontSize(14)
         .text('👤 Informations de Contact');
      
      doc.moveDown(0.5);
      
      doc.strokeColor('#e8e8e8')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      
      doc.fontSize(11).fillColor('#333');
      
      const contact = data.contact;
      const contactLines = [
        contact.civility && `Civilité: ${contact.civility === 'mme' ? 'Madame' : 'Monsieur'}`,
        contact.firstName && contact.lastName && `Nom: ${contact.firstName} ${contact.lastName}`,
        contact.email && `Email: ${contact.email}`,
        contact.phone && `Téléphone: ${contact.phone}`
      ].filter(Boolean);

      contactLines.forEach(line => {
        doc.text(line as string);
        doc.moveDown(0.3);
      });

      doc.moveDown(1);

      // ============== RÉPONSES AU FORMULAIRE ==============
      doc.fillColor('#1890ff')
         .fontSize(14)
         .text('📝 Réponses au Questionnaire');
      
      doc.moveDown(0.5);
      
      doc.strokeColor('#e8e8e8')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(0.5);

      // Parcourir les questions dans l'ordre
      const sortedQuestions = [...data.questions].sort((a, b) => {
        // Trouver l'index dans answers (ordre de réponse)
        const keys = Object.keys(data.answers);
        return keys.indexOf(a.questionKey) - keys.indexOf(b.questionKey);
      });

      for (const question of sortedQuestions) {
        const answer = data.answers[question.questionKey];
        
        // Ignorer les questions sans réponse
        if (answer === undefined || answer === null || answer === '') continue;
        
        // Ignorer les questions de contact (déjà affichées)
        if (['prenom', 'nom', 'email', 'telephone', 'civilite'].includes(question.questionKey)) continue;

        // Vérifier si on a besoin d'une nouvelle page
        if (doc.y > 700) {
          doc.addPage();
        }

        // Afficher la question avec icône
        const icon = question.icon || '•';
        doc.fontSize(11)
           .fillColor('#1890ff')
           .text(`${icon} ${question.title}`, { continued: false });
        
        doc.moveDown(0.2);

        // Formater la réponse
        let displayValue = '';
        
        if (Array.isArray(answer)) {
          // Choix multiple - afficher les labels des options sélectionnées
          const selectedLabels = answer.map(val => {
            const option = question.options?.find(o => o.value === val);
            return option ? `${option.icon || ''} ${option.label}`.trim() : val;
          });
          displayValue = selectedLabels.join(', ');
        } else if (question.options && question.questionType.includes('choice')) {
          // Choix unique - trouver le label
          const option = question.options.find(o => o.value === answer);
          displayValue = option ? `${option.icon || ''} ${option.label}`.trim() : String(answer);
        } else {
          // Valeur brute
          displayValue = String(answer);
        }

        doc.fontSize(10)
           .fillColor('#333')
           .text(`   → ${displayValue}`);
        
        doc.moveDown(0.5);
      }

      // ============== PIED DE PAGE ==============
      doc.moveDown(2);
      
      doc.strokeColor('#e8e8e8')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      
      doc.fontSize(9)
         .fillColor('#888')
         .text('Document généré automatiquement par 2Thier CRM', { align: 'center' });
      
      doc.text(`${new Date().toLocaleDateString('fr-BE')} - ${data.formSlug}`, { align: 'center' });

      // Finaliser le document
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Génère un PDF et retourne un stream lisible
 * @deprecated Utilisez generateFormResponsePdf à la place
 */
export function generateFormResponsePdfStream(_data: FormResponsePdfData): Readable {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  // ... même logique que ci-dessus mais sans promesse

  return doc;
}

export default { generateFormResponsePdf, generateFormResponsePdfStream };
