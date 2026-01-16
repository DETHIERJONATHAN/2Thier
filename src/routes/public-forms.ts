/**
 * 📋 Routes Publiques - Formulaires Website
 * 
 * Routes publiques (sans authentification) pour :
 * - Récupérer un formulaire à afficher
 * - Soumettre un formulaire (créer Lead + TBL Submission)
 * 
 * @author IA Assistant - Module Formulaires
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { v4 as uuidv4 } from 'uuid';
import { generateFormResponsePdf } from '../services/formResponsePdfGenerator';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// ============================================================================
// 📖 RÉCUPÉRATION FORMULAIRE PUBLIC
// ============================================================================

/**
 * GET /api/public/forms/:slug
 * Récupérer un formulaire par son slug pour affichage public
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { websiteSlug: _websiteSlug } = req.query; // Pour future validation website-specific
    
    console.log('📋 [PublicForms] GET form by slug:', slug);
    
    const form = await db.website_forms.findFirst({
      where: {
        slug,
        isActive: true
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' }
            }
          }
        },
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé ou inactif' });
    }
    
    console.log('✅ [PublicForms] Form found:', form.name, '- Steps:', form.steps.length);
    
    // Retourner uniquement les données nécessaires pour le rendu public
    // Organiser les champs en hiérarchie (parents avec childFields)
    const organizeFieldsHierarchy = (fields: any[]) => {
      const fieldMap = new Map();
      const rootFields: any[] = [];
      
      // Créer un map de tous les champs
      fields.forEach(field => {
        fieldMap.set(field.id, { ...field, childFields: [] });
      });
      
      // Organiser en hiérarchie
      fields.forEach(field => {
        const enrichedField = fieldMap.get(field.id);
        if (field.parentFieldId) {
          const parent = fieldMap.get(field.parentFieldId);
          if (parent) {
            parent.childFields.push(enrichedField);
          } else {
            rootFields.push(enrichedField);
          }
        } else {
          rootFields.push(enrichedField);
        }
      });
      
      // Trier childFields par order
      rootFields.forEach(field => {
        if (field.childFields) {
          field.childFields.sort((a: any, b: any) => a.order - b.order);
        }
      });
      
      return rootFields.sort((a, b) => a.order - b.order);
    };
    
    res.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      settings: form.settings,
      successTitle: form.successTitle,
      successMessage: form.successMessage,
      submitButtonText: (form.settings as any)?.submitButtonText || 'Envoyer',
      organizationId: form.organizationId,
      organizationName: form.Organization.name,
      steps: form.steps.map(step => ({
        id: step.id,
        order: step.order,
        title: step.title,
        description: step.subtitle,
        icon: (step.settings as any)?.icon || '',
        helpText: step.helpText,
        stepType: step.stepType,
        isRequired: step.isRequired,
        condition: step.condition,
        settings: step.settings,
        fields: organizeFieldsHierarchy(step.fields.map(field => ({
          id: field.id,
          stepId: field.stepId,
          parentFieldId: field.parentFieldId,
          order: field.order,
          name: field.name || `field_${field.id}`,
          label: field.label,
          value: field.value,
          fieldType: field.fieldType,
          icon: field.icon,
          imageUrl: field.imageUrl,
          placeholder: field.placeholder,
          helpText: field.helpText,
          defaultValue: field.defaultValue,
          options: field.options,
          validation: field.validation,
          isRequired: field.isRequired,
          isDefault: field.isDefault,
          allowMultiple: field.allowMultiple,
          condition: field.condition
        })))
      }))
    });
  } catch (error) {
    console.error('❌ [PublicForms] Error fetching form:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 🎯 RÉCUPÉRATION FORMULAIRE STYLE EFFY (1 question = 1 écran)
// ============================================================================

/**
 * GET /api/public/forms/:slug/questions
 * Récupérer un formulaire avec ses questions pour le mode Effy
 */
router.get('/:slug/questions', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    console.log('🎯 [PublicForms] GET form questions (Effy mode) by slug:', slug);
    
    const form = await db.website_forms.findFirst({
      where: {
        slug,
        isActive: true
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé ou inactif' });
    }
    
    console.log('✅ [PublicForms] Form found (Effy mode):', form.name, '- Questions:', form.questions.length);
    
    res.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      settings: form.settings,
      startQuestionKey: form.startQuestionKey || (form.questions[0]?.questionKey),
      successTitle: form.successTitle,
      successMessage: form.successMessage,
      organizationId: form.organizationId,
      organizationName: form.Organization.name,
      questions: form.questions.map(q => ({
        id: q.id,
        questionKey: q.questionKey,
        title: q.title,
        subtitle: q.subtitle,
        helpText: q.helpText,
        icon: q.icon,
        questionType: q.questionType,
        placeholder: q.placeholder,
        inputSuffix: q.inputSuffix,
        minValue: q.minValue,
        maxValue: q.maxValue,
        options: q.options,
        defaultNextQuestionKey: q.defaultNextQuestionKey,
        navigation: q.navigation,
        isEndQuestion: q.isEndQuestion,
        isRequired: q.isRequired
      }))
    });
  } catch (error) {
    console.error('❌ [PublicForms] Error fetching form questions:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/public/forms/by-website/:websiteSlug
 * Récupérer le formulaire par défaut d'un site
 */
router.get('/by-website/:websiteSlug', async (req: Request, res: Response) => {
  try {
    const { websiteSlug } = req.params;
    
    console.log('📋 [PublicForms] GET form for website:', websiteSlug);
    
    // Trouver le site par slug
    const website = await db.websites.findFirst({
      where: { slug: websiteSlug }
    });
    
    if (!website) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }
    
    // Trouver le formulaire lié (par défaut ou premier trouvé)
    const formLink = await db.website_form_website.findFirst({
      where: { websiteId: website.id },
      orderBy: { isDefault: 'desc' },
      include: {
        form: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: {
                fields: {
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
    });
    
    if (!formLink || !formLink.form.isActive) {
      return res.status(404).json({ error: 'Aucun formulaire actif pour ce site' });
    }
    
    const form = formLink.form;
    
    console.log('✅ [PublicForms] Form found for website:', form.name);
    
    res.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      settings: form.settings,
      successTitle: form.successTitle,
      successMessage: form.successMessage,
      urlPath: formLink.urlPath,
      steps: form.steps.map(step => ({
        id: step.id,
        title: step.title,
        subtitle: step.subtitle,
        helpText: step.helpText,
        stepType: step.stepType,
        isRequired: step.isRequired,
        condition: step.condition,
        settings: step.settings,
        fields: step.fields.map(field => ({
          id: field.id,
          label: field.label,
          value: field.value,
          fieldType: field.fieldType,
          icon: field.icon,
          imageUrl: field.imageUrl,
          placeholder: field.placeholder,
          helpText: field.helpText,
          defaultValue: field.defaultValue,
          validation: field.validation,
          isDefault: field.isDefault,
          condition: field.condition
        }))
      }))
    });
  } catch (error) {
    console.error('❌ [PublicForms] Error fetching form by website:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 📝 SOUMISSION FORMULAIRE
// ============================================================================

/**
 * POST /api/public/forms/:slug/submit
 * Soumettre un formulaire - Crée Lead + TBL Submission
 */
router.post('/:slug/submit', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { 
      formData, // Les réponses du formulaire { stepId: { fieldId: value } }
      contact,  // { firstName, lastName, email, phone }
      metadata  // { utmSource, utmMedium, utmCampaign, referrer }
    } = req.body;
    
    console.log('📋 [PublicForms] SUBMIT form:', slug);
    console.log('📋 [PublicForms] Contact:', contact?.email);
    
    // 1. Récupérer le formulaire avec tous ses champs pour le mapping TBL
    const form = await db.website_forms.findFirst({
      where: { slug, isActive: true },
      include: {
        steps: {
          include: {
            fields: true
          }
        },
        questions: true  // 🔥 Inclure les questions (nouveau système 1 écran = 1 question)
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé ou inactif' });
    }
    
    console.log('📋 [PublicForms] Form found:', form.name);
    
    // 2. Valider les données de contact
    if (!contact?.email) {
      return res.status(400).json({ error: 'L\'email est requis' });
    }
    
    // 3. Vérifier si un lead avec cet email existe déjà aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingLead = await db.lead.findFirst({
      where: {
        email: contact.email,
        organizationId: form.organizationId,
        createdAt: { gte: today }
      }
    });
    
    let leadId: string;
    
    if (existingLead) {
      console.log('📋 [PublicForms] Existing lead found:', existingLead.id);
      leadId = existingLead.id;
      
      // Mettre à jour les infos du lead si nécessaire
      await db.lead.update({
        where: { id: leadId },
        data: {
          firstName: contact.firstName || existingLead.firstName,
          lastName: contact.lastName || existingLead.lastName,
          phone: contact.phone || existingLead.phone,
          updatedAt: new Date()
        }
      });
    } else {
      // 4. Créer le lead
      leadId = uuidv4();
      const now = new Date();
      
      // Générer un numéro de lead
      const leadCount = await db.lead.count({
        where: { organizationId: form.organizationId }
      });
      const leadNumber = `LEAD-${(leadCount + 1).toString().padStart(5, '0')}`;
      
      // Trouver le statut par défaut
      const defaultStatus = await db.leadStatus.findFirst({
        where: { organizationId: form.organizationId, isDefault: true }
      });
      
      await db.lead.create({
        data: {
          id: leadId,
          organizationId: form.organizationId,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          phone: contact.phone || null,
          company: contact.company || null,
          source: 'website_form',
          status: 'nouveau',
          statusId: defaultStatus?.id || null,
          leadNumber,
          notes: `Lead créé depuis le formulaire "${form.name}"`,
          data: { formSlug: slug, formName: form.name },
          createdAt: now,
          updatedAt: now
        }
      });
      
      console.log('✅ [PublicForms] Lead created:', leadId);
    }
    
    // 5. Créer la submission TBL si un treeId est configuré
    let tblSubmissionId: string | null = null;
    
    if (form.treeId) {
      tblSubmissionId = uuidv4();
      
      await db.treeBranchLeafSubmission.create({
        data: {
          id: tblSubmissionId,
          treeId: form.treeId,
          leadId,
          organizationId: form.organizationId,
          status: 'completed',
          summary: {
            formName: form.name,
            formSlug: slug,
            submittedAt: new Date().toISOString()
          },
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ [PublicForms] TBL Submission created:', tblSubmissionId);
      
      // 6. Créer les données de soumission TBL pour chaque champ mappé
      const submissionDataEntries: Array<{
        id: string;
        submissionId: string;
        nodeId: string;
        value: string;
        fieldLabel: string;
        createdAt: Date;
      }> = [];
      
      // Parcourir les réponses du formulaire
      for (const step of form.steps) {
        const stepData = formData?.[step.id] || formData?.[`step_${step.id}`] || {};
        
        for (const field of step.fields) {
          // Chercher la valeur de ce champ dans les données soumises
          let fieldValue = stepData[field.id] || stepData[`field_${field.id}`] || stepData[field.value];
          
          // Si c'est une option sélectionnée, utiliser la valeur
          if (field.fieldType === 'option' && stepData.selectedValue === field.value) {
            fieldValue = field.value;
          }
          
          // Si un mapping TBL existe et qu'on a une valeur
          if (field.tblNodeId && fieldValue !== undefined && fieldValue !== null) {
            submissionDataEntries.push({
              id: uuidv4(),
              submissionId: tblSubmissionId,
              nodeId: field.tblNodeId,
              value: String(fieldValue),
              fieldLabel: field.label,
              createdAt: new Date()
            });
          }
        }
      }
      
      // 🔥 6bis. Traiter les questions (nouveau système 1 écran = 1 question)
      // Les options peuvent avoir un tblNodeId pour le mapping
      for (const question of (form as any).questions || []) {
        const answerValue = formData?.[question.questionKey];
        
        if (answerValue !== undefined && answerValue !== null) {
          // Si la question a un tblNodeId direct, l'utiliser
          if (question.tblNodeId) {
            submissionDataEntries.push({
              id: uuidv4(),
              submissionId: tblSubmissionId,
              nodeId: question.tblNodeId,
              value: Array.isArray(answerValue) ? answerValue.join(', ') : String(answerValue),
              fieldLabel: question.title,
              createdAt: new Date()
            });
          }
          
          // Si les options ont un mapping TBL, les traiter
          if (question.options && Array.isArray(question.options)) {
            const selectedValues = Array.isArray(answerValue) ? answerValue : [answerValue];
            
            for (const option of question.options as Array<{ value: string; label: string; tblNodeId?: string }>) {
              // Si cette option est sélectionnée ET qu'elle a un mapping TBL
              if (selectedValues.includes(option.value) && option.tblNodeId) {
                submissionDataEntries.push({
                  id: uuidv4(),
                  submissionId: tblSubmissionId,
                  nodeId: option.tblNodeId,
                  value: option.label || option.value,
                  fieldLabel: `${question.title} - ${option.label}`,
                  createdAt: new Date()
                });
              }
            }
          }
        }
      }
      
      // Insérer toutes les données de soumission
      if (submissionDataEntries.length > 0) {
        await db.treeBranchLeafSubmissionData.createMany({
          data: submissionDataEntries
        });
        console.log(`✅ [PublicForms] Created ${submissionDataEntries.length} TBL data entries`);
      }
    }
    
    // 7. Enregistrer la soumission du formulaire (tracking)
    const formSubmission = await db.website_form_submissions.create({
      data: {
        formId: form.id,
        leadId,
        submissionId: tblSubmissionId,
        formData: formData || {},
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0],
        userAgent: req.headers['user-agent'] || null,
        referrer: metadata?.referrer || req.headers['referer'] || null,
        utmSource: metadata?.utmSource || null,
        utmMedium: metadata?.utmMedium || null,
        utmCampaign: metadata?.utmCampaign || null,
        status: 'completed'
      }
    });
    
    console.log('✅ [PublicForms] Form submission recorded:', formSubmission.id);
    
    // 🔥 8. Générer le PDF récapitulatif et l'attacher au Lead
    let pdfUrl: string | null = null;
    try {
      const pdfData = {
        formName: form.name,
        formSlug: slug,
        submittedAt: new Date(),
        contact: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          civility: contact.civility
        },
        answers: formData || {},
        questions: ((form as any).questions || []).map((q: any) => ({
          questionKey: q.questionKey,
          title: q.title,
          subtitle: q.subtitle,
          icon: q.icon,
          questionType: q.questionType,
          options: q.options
        })),
        leadNumber: existingLead ? undefined : `LEAD-${(await db.lead.count({ where: { organizationId: form.organizationId } })).toString().padStart(5, '0')}`
      };
      
      const pdfBuffer = await generateFormResponsePdf(pdfData);
      
      // Sauvegarder le PDF dans le dossier uploads
      const uploadsDir = path.join(process.cwd(), 'uploads', 'form-responses');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const pdfFileName = `formulaire-${slug}-${leadId.substring(0, 8)}-${Date.now()}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);
      fs.writeFileSync(pdfPath, pdfBuffer);
      
      pdfUrl = `/uploads/form-responses/${pdfFileName}`;
      
      // Mettre à jour le Lead avec le lien vers le PDF
      await db.lead.update({
        where: { id: leadId },
        data: {
          data: {
            ...(typeof (await db.lead.findUnique({ where: { id: leadId } }))?.data === 'object' 
              ? (await db.lead.findUnique({ where: { id: leadId } }))?.data as object 
              : {}),
            formPdfUrl: pdfUrl,
            formSlug: slug,
            formName: form.name
          }
        }
      });
      
      console.log('✅ [PublicForms] PDF generated and attached to Lead:', pdfUrl);
    } catch (pdfError) {
      console.error('⚠️ [PublicForms] PDF generation failed (non-blocking):', pdfError);
      // Ne pas bloquer la soumission si le PDF échoue
    }
    
    // 9. Retourner le résultat
    res.status(201).json({
      success: true,
      message: form.successMessage || 'Merci pour votre demande !',
      title: form.successTitle || 'Formulaire envoyé',
      leadId,
      submissionId: tblSubmissionId,
      formSubmissionId: formSubmission.id,
      pdfUrl
    });
    
  } catch (error) {
    console.error('❌ [PublicForms] Error submitting form:', error);
    
    // Enregistrer l'erreur si possible
    try {
      const { slug } = req.params;
      const form = await db.website_forms.findFirst({ where: { slug } });
      if (form) {
        await db.website_form_submissions.create({
          data: {
            formId: form.id,
            formData: req.body?.formData || {},
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
            ipAddress: req.ip
          }
        });
      }
    } catch (e) {
      console.error('❌ [PublicForms] Failed to log error submission:', e);
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la soumission du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/public/forms/:slug/partial
 * Sauvegarder une soumission partielle (pour tracking abandon)
 */
router.post('/:slug/partial', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { formData, currentStep, metadata } = req.body;
    
    console.log('📋 [PublicForms] PARTIAL submit for form:', slug, '- Step:', currentStep);
    
    const form = await db.website_forms.findFirst({
      where: { slug }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    await db.website_form_submissions.create({
      data: {
        formId: form.id,
        formData: { ...formData, lastStep: currentStep },
        status: 'partial',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        utmSource: metadata?.utmSource || null,
        utmMedium: metadata?.utmMedium || null,
        utmCampaign: metadata?.utmCampaign || null
      }
    });
    
    res.json({ success: true, message: 'Progression sauvegardée' });
  } catch (error) {
    console.error('❌ [PublicForms] Error saving partial:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
