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
      const formName = (lead.data as any)?.formName || 'Formulaire';
      const formSlug = (lead.data as any)?.formSlug || 'formulaire';

      console.log(`\n📄 Génération PDF pour ${lead.firstName} ${lead.lastName}...`);

      // Créer les données du PDF
      const pdfData = {
        formName,
        formSlug,
        submittedAt: lead.createdAt,
        contact: {
          firstName: lead.firstName || undefined,
          lastName: lead.lastName || undefined,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          civility: undefined
        },
        answers: ((lead.data as any) || {}),
        questions: [], // Récupérer les questions du formulaire si possible
        leadNumber: lead.leadNumber || undefined
      };

      // Générer le PDF
      const pdfBuffer = await generateFormResponsePdf(pdfData);

      // Sauvegarder le fichier
      const pdfFileName = `formulaire-${formSlug}-${lead.id.substring(0, 8)}-${lead.createdAt.getTime()}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);
      fs.writeFileSync(pdfPath, pdfBuffer);

      const pdfUrl = `/uploads/form-responses/${pdfFileName}`;

      // Mettre à jour le lead
      await db.lead.update({
        where: { id: lead.id },
        data: {
          data: {
            ...((lead.data as any) || {}),
            formPdfUrl: pdfUrl
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
