#!/usr/bin/env npx tsx
/**
 * 🔧 Script de régénération des PDF manquants
 * 
 * Génère rétroactivement les PDFs pour tous les leads créés depuis un formulaire public
 * qui n'ont pas encore de PDF attaché.
 */

import path from 'path';
import fs from 'fs';
import { db } from '../src/lib/database';
import { generateFormResponsePdf } from '../src/services/formResponsePdfGenerator';

async function main() {
  console.log('🔍 Recherche des leads sans PDF...');

  // Chercher tous les leads créés depuis un formulaire public
  const allFormLeads = await db.lead.findMany({
    where: {
      source: 'website_form'
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Filtrer ceux sans PDF
  const leads = allFormLeads.filter(lead => {
    const data = lead.data as any;
    return data?.formName && !data?.formPdfUrl;
  });

  console.log(`✅ Trouvé ${leads.length} leads sans PDF`);

  if (leads.length === 0) {
    console.log('Tous les PDFs sont à jour !');
    return;
  }

  // Créer le dossier de destination
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'form-responses');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier créé: ${uploadsDir}`);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const lead of leads) {
    try {
      console.log(`\n📄 Génération PDF pour ${lead.firstName} ${lead.lastName}...`);

      const latestSubmission = await db.website_form_submissions.findFirst({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        include: {
          form: {
            include: {
              questions: {
                orderBy: { order: 'asc' }
              }
            }
          }
        }
      });

      if (!latestSubmission || !latestSubmission.form) {
        console.warn('   ⚠️ Aucune soumission trouvée, PDF ignoré.');
        errorCount++;
        continue;
      }

      const form = latestSubmission.form;

      const pdfData = {
        formName: form.name,
        formSlug: form.slug,
        submittedAt: latestSubmission.createdAt,
        contact: {
          firstName: lead.firstName || undefined,
          lastName: lead.lastName || undefined,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          civility: (lead.data as any)?.civility
        },
        answers: (latestSubmission.formData as Record<string, unknown>) || {},
        questions: (form.questions || []).map((q) => ({
          questionKey: q.questionKey,
          title: q.title,
          subtitle: q.subtitle || undefined,
          icon: q.icon || undefined,
          questionType: q.questionType,
          options: q.options || undefined
        })),
        leadNumber: lead.leadNumber || undefined
      };

      const pdfBuffer = await generateFormResponsePdf(pdfData);

      const pdfFileName = `formulaire-${form.slug}-${lead.id.substring(0, 8)}-${Date.now()}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);
      fs.writeFileSync(pdfPath, pdfBuffer);

      const pdfUrl = `/uploads/form-responses/${pdfFileName}`;

      await db.lead.update({
        where: { id: lead.id },
        data: {
          data: {
            ...((lead.data as any) || {}),
            formPdfUrl: pdfUrl,
            formSlug: form.slug,
            formName: form.name
          }
        }
      });

      console.log(`   ✅ PDF généré et attaché: ${pdfUrl}`);
      console.log(`   📁 Fichier: ${pdfPath}`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Erreur pour ${lead.firstName} ${lead.lastName}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ PDFs générés avec succès: ${successCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   📁 Dossier: ${uploadsDir}`);
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
