import { Router, type Request, type Response } from 'express';
import { db } from '../lib/database';
import { nanoid } from 'nanoid';
import { renderDocumentPdf } from '../services/documentPdfRenderer';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { GoogleGmailService } from '../google-auth/services/GoogleGmailService';

const router = Router();
const prisma = db;

function toJsonSafe(value: any): any {
  const seen = new WeakSet<object>();

  const inner = (v: any): any => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === 'function' || typeof v === 'symbol') return undefined;
    if (typeof v === 'bigint') return v.toString();
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v instanceof Date) return v.toISOString();

    if (Array.isArray(v)) {
      return v.map(inner).filter(x => x !== undefined);
    }

    if (typeof v === 'object') {
      // Gérer les types qui exposent un toJSON (Decimal, etc.)
      const maybeToJson = (v as any).toJSON;
      if (typeof maybeToJson === 'function') {
        try {
          return inner(maybeToJson.call(v));
        } catch {
          // ignore
        }
      }

      if (seen.has(v)) return '[Circular]';
      seen.add(v);

      const out: Record<string, any> = {};
      for (const [key, val] of Object.entries(v)) {
        const safeVal = inner(val);
        if (safeVal !== undefined) out[key] = safeVal;
      }
      return out;
    }

    return v;
  };

  return inner(value);
}

/**
 * Extrait les composants d'adresse (street, box, postalCode, city) depuis un lead.
 * Priorité : 
 * 1. Champs directs sur le lead (si existants)
 * 2. Champs dans lead.data (JSON)
 * 3. Parse de l'adresse complète (format belge : "Rue Numéro Boîte, Code Postal Ville")
 */
function extractAddressComponents(lead: any): {
  address: string;
  street: string;
  number: string;
  box: string;
  postalCode: string;
  city: string;
  country: string;
} {
  const data = lead?.data || {};
  
  // Résultat par défaut
  const result = {
    address: '',
    street: '',
    number: '',
    box: '',
    postalCode: '',
    city: '',
    country: ''
  };
  
  // 1. Chercher les champs directs sur le lead
  result.address = lead?.address || data?.address || '';
  result.street = lead?.street || data?.street || '';
  result.number = lead?.number || data?.number || '';
  result.box = lead?.box || data?.box || data?.boite || '';
  result.postalCode = lead?.postalCode || lead?.zipCode || data?.postalCode || data?.zipCode || data?.zip || '';
  result.city = lead?.city || lead?.ville || data?.city || data?.ville || '';
  result.country = lead?.country || lead?.pays || data?.country || data?.pays || '';
  
  // 2. Si on a l'adresse complète mais pas les composants, essayer de parser
  if (result.address && (!result.street || !result.postalCode || !result.city)) {
    const parsed = parseAddress(result.address);
    if (!result.street && parsed.street) result.street = parsed.street;
    if (!result.number && parsed.number) result.number = parsed.number;
    if (!result.box && parsed.box) result.box = parsed.box;
    if (!result.postalCode && parsed.postalCode) result.postalCode = parsed.postalCode;
    if (!result.city && parsed.city) result.city = parsed.city;
  }
  
  // 3. Si on a les composants mais pas l'adresse complète, la reconstruire
  if (!result.address && (result.street || result.city)) {
    const parts = [];
    if (result.street) {
      let streetPart = result.street;
      if (result.number) streetPart += ' ' + result.number;
      if (result.box) streetPart += ' ' + result.box;
      parts.push(streetPart);
    }
    if (result.postalCode || result.city) {
      parts.push([result.postalCode, result.city].filter(Boolean).join(' '));
    }
    result.address = parts.join(', ');
  }
  
  return result;
}

/**
 * Parse une adresse belge au format "Rue Nom Numéro Boîte, Code Postal Ville"
 * Exemples:
 * - "Rue de la Loi 16, 1000 Bruxelles"
 * - "Avenue Louise 123 Bte 4, 1050 Ixelles"
 * - "Chaussée de Waterloo 45, 1060 Saint-Gilles"
 */
function parseAddress(address: string): {
  street: string;
  number: string;
  box: string;
  postalCode: string;
  city: string;
} {
  const result = { street: '', number: '', box: '', postalCode: '', city: '' };
  
  if (!address || typeof address !== 'string') return result;
  
  // Séparer par virgule ou par le code postal
  // Format typique: "Rue XXX, 1234 Ville" ou "Rue XXX 1234 Ville"
  
  // Regex pour code postal belge (4 chiffres)
  const postalMatch = address.match(/(\d{4})\s*(.+?)$/i);
  
  if (postalMatch) {
    result.postalCode = postalMatch[1];
    result.city = postalMatch[2].replace(/^,\s*/, '').trim();
    
    // Le reste est la partie rue/numéro
    const streetPart = address.substring(0, postalMatch.index).replace(/,\s*$/, '').trim();
    
    // Chercher le numéro et boîte dans la partie rue
    // Pattern: "Rue de la Loi 16" ou "Avenue Louise 123 Bte 4"
    const streetNumMatch = streetPart.match(/^(.+?)\s+(\d+[a-zA-Z]?)(?:\s+(?:Bte|boîte|box|b)?\.?\s*(\d+|[a-zA-Z]))?$/i);
    
    if (streetNumMatch) {
      result.street = streetNumMatch[1].trim();
      result.number = streetNumMatch[2];
      result.box = streetNumMatch[3] || '';
    } else {
      result.street = streetPart;
    }
  } else {
    // Pas de code postal trouvé, garder comme rue
    result.street = address;
  }
  
  return result;
}

// ==========================================
// ROUTES DOCUMENT TEMPLATES (ADMIN ONLY)
// ==========================================

// GET /api/documents/templates - Liste tous les templates
// Query params: treeId, isActive, type
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';
    const { treeId, isActive, type } = req.query;
    
    if (!organizationId && !isSuperAdmin) {
      return res.status(400).json({ error: 'Organization ID requis' });
    }

    // Construire les filtres - Super Admin voit tout
    const where: any = isSuperAdmin ? {} : { organizationId };
    
    // Filtrer par arbre TBL si spécifié
    if (treeId) {
      where.OR = [
        { treeId: treeId as string },
        { treeId: null } // Templates génériques disponibles pour tous les arbres
      ];
    }
    
    // Filtrer par statut actif
    if (isActive === 'true') {
      where.isActive = true;
    } else if (isActive === 'false') {
      where.isActive = false;
    }
    
    // Filtrer par type de document
    if (type) {
      where.type = type as string;
    }

    const templates = await prisma.documentTemplate.findMany({
      where,
      include: {
        DocumentSection: {
          orderBy: { order: 'asc' }
        },
        DocumentTheme: true,
        TreeBranchLeafTree: {
          select: {
            id: true,
            name: true
          }
        },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: { GeneratedDocument: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/documents/templates/:id - Récupérer un template spécifique
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

    // Construire la clause where en fonction du rôle
    const whereClause: any = { id };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    const template = await prisma.documentTemplate.findFirst({
      where: whereClause,
      include: {
        DocumentSection: {
          orderBy: { order: 'asc' }
        },
        DocumentTheme: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    res.json(template);
  } catch (error) {
    console.error('Erreur récupération template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/documents/templates - Créer un nouveau template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    const {
      name,
      type,
      description,
      translations,
      defaultLanguage,
      themeId,
      treeId,
      sections
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nom et type requis' });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        id: nanoid(),
        name,
        type,
        description,
        organizationId,
        translations: translations || {},
        defaultLanguage: defaultLanguage || 'fr',
        themeId,
        treeId: treeId || null,
        createdBy: userId,
        updatedAt: new Date(),
        DocumentSection: {
          create: (sections || []).map((section: any, index: number) => ({
            id: nanoid(),
            order: section.order || index,
            type: section.type,
            config: section.config || {},
            displayConditions: section.displayConditions,
            linkedNodeIds: section.linkedNodeIds || [],
            linkedVariables: section.linkedVariables || [],
            translations: section.translations || {},
            updatedAt: new Date()
          }))
        }
      },
      include: {
        DocumentSection: true,
        DocumentTheme: true
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Erreur création template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/documents/templates/:id - Mettre à jour un template
router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';
    
    const {
      name,
      type,
      description,
      treeId,
      translations,
      defaultLanguage,
      themeId,
      isActive,
      sections
    } = req.body;

    console.log('📝 [TEMPLATE UPDATE] Mise à jour template:', { id, name, treeId, type });

    // Vérifier que le template existe et appartient à l'organisation
    const whereClause: any = { id };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    const existing = await prisma.documentTemplate.findFirst({
      where: whereClause
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    // Supprimer les anciennes sections si de nouvelles sont fournies
    if (sections) {
      await prisma.documentSection.deleteMany({
        where: { templateId: id }
      });
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: {
        name,
        type,
        description,
        treeId: treeId || null, // Permet de mettre à null pour revenir à générique
        translations,
        defaultLanguage,
        themeId,
        isActive,
        updatedAt: new Date(),
        ...(sections && {
          DocumentSection: {
            create: sections.map((section: any, index: number) => ({
              id: nanoid(),
              order: section.order || index,
              type: section.type,
              config: section.config || {},
              displayConditions: section.displayConditions,
              linkedNodeIds: section.linkedNodeIds || [],
              linkedVariables: section.linkedVariables || [],
              translations: section.translations || {},
              updatedAt: new Date()
            }))
          }
        })
      },
      include: {
        DocumentSection: { orderBy: { order: 'asc' } },
        DocumentTheme: true,
        TreeBranchLeafTree: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(template);
  } catch (error) {
    console.error('Erreur mise à jour template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/documents/templates/:id - Supprimer un template
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';
    const force = req.query.force === 'true';

    // Construire la clause where
    const whereClause: any = { id };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    const template = await prisma.documentTemplate.findFirst({
      where: whereClause
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    // Vérifier s'il y a des documents générés avec ce template
    const documentsCount = await prisma.generatedDocument.count({
      where: { templateId: id }
    });

    if (documentsCount > 0 && !force) {
      return res.status(400).json({ 
        error: `Impossible de supprimer : ${documentsCount} document(s) utilisent ce template. Utilisez ?force=true pour supprimer quand même.`,
        documentsCount 
      });
    }

    // Supprimer en cascade : documents générés → sections → template
    if (documentsCount > 0) {
      await prisma.generatedDocument.deleteMany({
        where: { templateId: id }
      });
    }

    // Supprimer les sections liées (onDelete: NoAction dans le schéma)
    await prisma.documentSection.deleteMany({
      where: { templateId: id }
    });

    await prisma.documentTemplate.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Template supprimé' });
  } catch (error) {
    console.error('Erreur suppression template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// ROUTES THEMES
// ==========================================

// GET /api/documents/themes - Liste tous les thèmes
router.get('/themes', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    const themes = await prisma.documentTheme.findMany({
      where: { organizationId },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json(themes);
  } catch (error) {
    console.error('Erreur récupération thèmes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/documents/themes - Créer un nouveau thème
router.post('/themes', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const themeData = req.body;

    // Si c'est le thème par défaut, retirer le flag des autres
    if (themeData.isDefault) {
      await prisma.documentTheme.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const theme = await prisma.documentTheme.create({
      data: {
        id: nanoid(),
        ...themeData,
        organizationId
      }
    });

    res.status(201).json(theme);
  } catch (error) {
    console.error('Erreur création thème:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/documents/themes/:id - Mettre à jour un thème
router.put('/themes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const themeData = req.body;

    // Si c'est le thème par défaut, retirer le flag des autres
    if (themeData.isDefault) {
      await prisma.documentTheme.updateMany({
        where: { 
          organizationId, 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    const theme = await prisma.documentTheme.update({
      where: { id },
      data: themeData
    });

    res.json(theme);
  } catch (error) {
    console.error('Erreur mise à jour thème:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/documents/themes/:id - Supprimer un thème
router.delete('/themes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Vérifier qu'aucun template n'utilise ce thème
    const templatesCount = await prisma.documentTemplate.count({
      where: { themeId: id }
    });

    if (templatesCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer : des templates utilisent ce thème',
        templatesCount
      });
    }

    await prisma.documentTheme.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression thème:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// ROUTES SECTIONS
// ==========================================

// GET /api/documents/templates/:templateId/sections - Liste les sections d'un template
router.get('/templates/:templateId/sections', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

    // Construire la clause where en fonction du rôle
    const whereClause: any = { id: templateId };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Vérifier que le template existe (et appartient à l'organisation si non SuperAdmin)
    const template = await prisma.documentTemplate.findFirst({
      where: whereClause
    });

    if (!template) {
      console.log(`[DOCUMENTS] Template ${templateId} non trouvé (orgId: ${organizationId}, isSuperAdmin: ${isSuperAdmin})`);
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const sections = await prisma.documentSection.findMany({
      where: { templateId },
      orderBy: { order: 'asc' }
    });

    res.json(sections);
  } catch (error) {
    console.error('Erreur récupération sections:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/documents/templates/:templateId/sections - Créer une section
router.post('/templates/:templateId/sections', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { type, order, config } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

    // Construire la clause where en fonction du rôle
    const whereClause: any = { id: templateId };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Vérifier que le template existe
    const template = await prisma.documentTemplate.findFirst({
      where: whereClause
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const section = await prisma.documentSection.create({
      data: {
        id: nanoid(),
        templateId,
        type,
        order: order ?? 0,
        config: config || {},
        updatedAt: new Date()
      }
    });

    res.json(section);
  } catch (error: any) {
    console.error('Erreur création section:', error?.message || error);
    console.error('Stack:', error?.stack);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

// PUT /api/documents/templates/:templateId/sections/:sectionId - Modifier une section
router.put('/templates/:templateId/sections/:sectionId', async (req: Request, res: Response) => {
  try {
    const { templateId, sectionId } = req.params;
    const { order, config } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

    // Construire la clause where en fonction du rôle
    const whereClause: any = { id: templateId };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Vérifier que le template existe
    const template = await prisma.documentTemplate.findFirst({
      where: whereClause
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const section = await prisma.documentSection.update({
      where: { id: sectionId },
      data: {
        ...(order !== undefined && { order }),
        ...(config && { config })
      }
    });

    res.json(section);
  } catch (error) {
    console.error('Erreur mise à jour section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/documents/templates/:templateId/sections/:sectionId - Supprimer une section
router.delete('/templates/:templateId/sections/:sectionId', async (req: Request, res: Response) => {
  try {
    const { templateId, sectionId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

    // Construire la clause where en fonction du rôle
    const whereClause: any = { id: templateId };
    if (!isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Vérifier que le template existe
    const template = await prisma.documentTemplate.findFirst({
      where: whereClause
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    await prisma.documentSection.delete({
      where: { id: sectionId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// ROUTES DOCUMENTS GÉNÉRÉS
// ==========================================

// GET /api/documents/generated - Liste les documents générés
// Query params: leadId, submissionId, templateId
router.get('/generated', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { leadId, submissionId, templateId } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID requis' });
    }

    // Construire les filtres - le document a directement organizationId
    const where: any = {
      organizationId
    };
    
    if (leadId) {
      where.leadId = leadId as string;
    }
    
    if (submissionId) {
      where.submissionId = submissionId as string;
    }
    
    if (templateId) {
      where.templateId = templateId as string;
    }

    const documents = await prisma.generatedDocument.findMany({
      where,
      include: {
        DocumentTemplate: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        User_GeneratedDocument_sentByToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapper les noms de relations pour compatibilité frontend
    const mappedDocuments = documents.map((doc: any) => ({
      ...doc,
      template: doc.DocumentTemplate,
      sentByUser: doc.User_GeneratedDocument_sentByToUser,
      lead: doc.Lead,
      DocumentTemplate: undefined,
      User_GeneratedDocument_sentByToUser: undefined,
      Lead: undefined
    }));

    res.json(mappedDocuments);
  } catch (error: any) {
    console.error('❌ [GET /generated] Erreur récupération documents générés:', error?.message);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

// GET /api/documents/generated/:id - Récupérer un document généré spécifique
router.get('/generated/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    const document = await prisma.generatedDocument.findFirst({
      where: { 
        id,
        organizationId
      },
      include: {
        DocumentTemplate: true,
        User_GeneratedDocument_sentByToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        Lead: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Mapper les noms de relations pour compatibilité frontend
    const mappedDocument = {
      ...document,
      template: (document as any).DocumentTemplate,
      sentByUser: (document as any).User_GeneratedDocument_sentByToUser,
      lead: (document as any).Lead,
      DocumentTemplate: undefined,
      User_GeneratedDocument_sentByToUser: undefined,
      Lead: undefined
    };

    res.json(mappedDocument);
  } catch (error) {
    console.error('Erreur récupération document:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/documents/generated/generate - Générer un nouveau document PDF
router.post('/generated/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId || undefined;
    const userId = (req.headers['x-user-id'] as string) || req.user?.userId || undefined;
    
    const {
      templateId,
      leadId,
      submissionId,
      tblData,
      lead: leadData,
      language
    } = req.body;

    console.log('📄 [GENERATE DOC] Demande de génération:', { templateId, leadId, submissionId, organizationId, userId });
    try {
      console.log('📄 [GENERATE DOC] Body complet:', JSON.stringify(toJsonSafe(req.body), null, 2));
    } catch (e) {
      console.warn('📄 [GENERATE DOC] Body non serialisable (log simplifié):', {
        templateId,
        leadId,
        submissionId,
        hasTblData: !!tblData,
        hasLeadData: !!leadData,
        error: (e as any)?.message,
      });
    }
  const tblDataSafe = toJsonSafe(tblData ?? {});
  const leadDataSafe = toJsonSafe(leadData ?? {});


    if (!organizationId) {
      return res.status(400).json({ error: 'X-Organization-Id requis' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'X-User-Id requis' });
    }

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID requis' });
    }

    // Récupérer le template avec ses sections
    console.log('📄 [GENERATE DOC] Recherche du template...', { templateId, organizationId });
    const template = await prisma.documentTemplate.findFirst({
      where: { 
        id: templateId,
        organizationId 
      },
      include: {
        DocumentSection: {
          orderBy: { order: 'asc' }
        },
        DocumentTheme: true
      }
    });

    console.log('📄 [GENERATE DOC] Template trouvé:', template ? template.id : 'NULL ❌');

    if (!template) {
      console.error('❌ [GENERATE DOC] Template non trouvé avec templateId=' + templateId + ' et organizationId=' + organizationId);
      return res.status(404).json({ 
        error: 'Template non trouvé',
        details: `Template ${templateId} not found for organization ${organizationId}`,
        templateId,
        organizationId,
      });
    }

    // Générer un numéro de document unique (timestamp + nanoid pour garantir l'unicité)
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = nanoid(6);
    const documentNumber = `${template.type}-${timestamp}-${randomSuffix}`;

    console.log('📄 [GENERATE DOC] Document number généré:', documentNumber);

    // Créer l'entrée du document généré
    // Utiliser les champs conformes au schéma Prisma (synchronisé avec la base de données)
    const generatedDocument = await prisma.generatedDocument.create({
      data: {
        id: nanoid(),
        templateId,
        organizationId,
        leadId: leadId || null,
        submissionId: submissionId || null,
        type: template.type,
        status: 'DRAFT',
        language: language || template.defaultLanguage || 'fr',
        documentNumber,
        pdfUrl: null, // Sera rempli après génération réelle du PDF
        dataSnapshot: {
          tblData: tblDataSafe,
          lead: leadDataSafe,
          generatedAt: new Date().toISOString(),
          generatedBy: userId
        },
        createdBy: userId || null,
        updatedAt: new Date()
      },
      include: {
        DocumentTemplate: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    console.log('📄 [GENERATE DOC] Document créé:', generatedDocument.id);

    // TODO: Implémenter la vraie génération PDF ici
    // Pour l'instant, on simule avec un statut SENT (ready)
    console.log('📄 [GENERATE DOC] Mise à jour du document avec statut SENT...');
    const updatedDocument = await prisma.generatedDocument.update({
      where: { id: generatedDocument.id },
      data: {
        status: 'SENT', // Le PDF est "prêt"
        pdfUrl: `/api/documents/generated/${generatedDocument.id}/download`
      },
      include: {
        DocumentTemplate: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        User_GeneratedDocument_sentByToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log('📄 [GENERATE DOC] Document mis à jour avec succès:', updatedDocument.id);
    res.status(201).json(updatedDocument);
  } catch (error: any) {
    console.error('❌ [GENERATE DOC] Erreur génération document:', error);
    console.error('❌ [GENERATE DOC] Error name:', error?.name);
    console.error('❌ [GENERATE DOC] Error code:', error?.code);
    console.error('❌ [GENERATE DOC] Error message:', error?.message);
    console.error('❌ [GENERATE DOC] Error meta:', error?.meta);
    res.status(500).json({
      error: 'Erreur serveur lors de la génération',
      details: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
    });
  }
});

// DELETE /api/documents/generated/:id - Supprimer un document généré
router.delete('/generated/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    const document = await prisma.generatedDocument.findFirst({
      where: { 
        id, 
        organizationId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // TODO: Supprimer aussi le fichier physique du stockage

    await prisma.generatedDocument.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Document supprimé' });
  } catch (error) {
    console.error('Erreur suppression document:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/documents/generated/:id/download - Télécharger le PDF d'un document
router.get('/generated/:id/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log('📥 [DOWNLOAD] Demande de téléchargement:', { id });

    // Charger le document avec template, sections, theme et lead
    // On ne filtre PAS par organizationId ici car l'ID du document est unique
    // et la sécurité est assurée par l'authentification
    const document = await prisma.generatedDocument.findFirst({
      where: { 
        id
      },
      include: {
        DocumentTemplate: {
          include: {
            DocumentSection: {
              orderBy: { order: 'asc' }
            },
            DocumentTheme: true
          }
        },
        Lead: true
      }
    });

    if (!document) {
      console.log('📥 [DOWNLOAD] Document non trouvé');
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    console.log('📥 [DOWNLOAD] Document trouvé:', document.documentNumber);

    // Utiliser l'organizationId du document pour charger les ressources
    const organizationId = document.organizationId;

    // Charger le thème par défaut de l'organisation (ou celui du template)
    const defaultTheme = await prisma.documentTheme.findFirst({
      where: { 
        organizationId,
        isDefault: true 
      }
    });

    // Charger les infos de l'organisation
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId }
    });

    // Construire le contexte pour le renderer
    const dataSnapshot = (document.dataSnapshot || {}) as Record<string, any>;
    
    // Priorité : theme du template (relation) > theme par défaut de l'org > valeurs par défaut
    const templateTheme = document.DocumentTemplate?.DocumentTheme;
    const themeSource = templateTheme || defaultTheme;
    const theme = themeSource ? {
      primaryColor: themeSource.primaryColor || '#1890ff',
      secondaryColor: themeSource.secondaryColor || '#52c41a',
      accentColor: themeSource.accentColor || '#faad14',
      textColor: themeSource.textColor || '#333333',
      backgroundColor: themeSource.backgroundColor || '#ffffff',
      fontFamily: themeSource.fontFamily || 'Helvetica',
      fontSize: themeSource.fontSize || 12,
      logoUrl: themeSource.logoUrl || ''
    } : {
      primaryColor: '#1890ff',
      secondaryColor: '#52c41a',
      accentColor: '#faad14',
      textColor: '#333333',
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
      fontSize: 12,
      logoUrl: ''
    };
    
    console.log('📥 [DOWNLOAD] Theme utilisé:', {
      source: templateTheme ? 'template' : (defaultTheme ? 'default' : 'fallback'),
      primaryColor: theme.primaryColor,
      fontFamily: theme.fontFamily
    });
    
    // Mapper les sections
    const sections = document.DocumentTemplate?.DocumentSection?.map(s => ({
      id: s.id,
      type: s.type,
      name: (s as any).name || s.type,
      config: (s.config || {}) as Record<string, any>,
      translations: (s.translations || {}) as Record<string, any>,
      linkedNodeIds: (s.linkedNodeIds || []) as string[],
      order: s.order,
      isActive: (s as any).isActive !== false
    })) || [];
    
    // Debug: log des sections
    console.log('📥 [DOWNLOAD] Sections mappées:', sections.length);
    for (const sec of sections) {
      console.log(`📥 [DOWNLOAD] Section ${sec.type}:`, {
        id: sec.id,
        configKeys: Object.keys(sec.config || {}),
        hasModules: !!(sec.config as any)?.modules,
        modulesCount: (sec.config as any)?.modules?.length || 0
      });
      if ((sec.config as any)?.modules?.length > 0) {
        console.log('📥 [DOWNLOAD] Premier module:', JSON.stringify((sec.config as any).modules[0], null, 2).substring(0, 500));
      }
    }
    
    const renderContext = {
      template: document.DocumentTemplate ? {
        id: document.DocumentTemplate.id,
        name: document.DocumentTemplate.name,
        type: document.DocumentTemplate.type,
        theme: theme,
        sections: sections // Sections DANS le template comme attendu par le renderer
      } : {
        id: 'default',
        name: 'Document',
        type: 'QUOTE',
        theme: theme,
        sections: []
      },
      lead: (() => {
        // Merger les données du lead de la DB avec celles du dataSnapshot (TBL)
        const dbLead = document.Lead || {};
        const snapshotLead = dataSnapshot.lead || {};
        
        // Combiner les sources de données (priorité au DB, puis snapshot)
        const mergedLead = {
          ...snapshotLead,
          ...dbLead,
          // S'assurer que l'adresse vient de l'une des deux sources
          address: (dbLead as any).address || snapshotLead.address || '',
          data: (dbLead as any).data || {}
        };
        
        const addressComponents = extractAddressComponents(mergedLead);
        
        return {
          id: (dbLead as any).id || snapshotLead.id || '',
          firstName: (dbLead as any).firstName || snapshotLead.firstName || '',
          lastName: (dbLead as any).lastName || snapshotLead.lastName || '',
          fullName: [(dbLead as any).firstName || snapshotLead.firstName, (dbLead as any).lastName || snapshotLead.lastName].filter(Boolean).join(' '),
          email: (dbLead as any).email || snapshotLead.email || '',
          phone: (dbLead as any).phone || snapshotLead.phone || '',
          company: (dbLead as any).company || snapshotLead.company || '',
          // Adresse complète
          address: addressComponents.address,
          // Composants séparés
          street: addressComponents.street,
          number: addressComponents.number,
          box: addressComponents.box,
          postalCode: addressComponents.postalCode,
          city: addressComponents.city,
          country: addressComponents.country,
        };
      })(),
      organization: organization ? {
        name: organization.name || '',
        email: (organization as any).email || '',
        phone: (organization as any).phone || '',
        address: (organization as any).address || '',
        vatNumber: (organization as any).vatNumber || '',
        logo: (organization as any).logo || ''
      } : undefined,
      tblData: dataSnapshot.tblData || dataSnapshot,
      quote: {
        // Priorité au dataSnapshot.quote s'il existe
        ...(dataSnapshot.quote || {}),
        // Valeurs par défaut
        number: dataSnapshot.quote?.number || document.documentNumber || '',
        reference: dataSnapshot.quote?.reference || document.documentNumber || '',
        date: dataSnapshot.quote?.date || (document.createdAt ? new Intl.DateTimeFormat('fr-BE').format(document.createdAt) : new Intl.DateTimeFormat('fr-BE').format(new Date())),
        validUntil: dataSnapshot.quote?.validUntil || (document.createdAt ? new Intl.DateTimeFormat('fr-BE').format(new Date(document.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)) : new Intl.DateTimeFormat('fr-BE').format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))),
        totalHT: dataSnapshot.quote?.totalHT || dataSnapshot.totalHT || 0,
        totalTVA: dataSnapshot.quote?.totalTVA || dataSnapshot.totalTVA || 0,
        totalTTC: dataSnapshot.quote?.totalTTC || dataSnapshot.totalTTC || 0,
        status: dataSnapshot.quote?.status || 'draft'
      },
      documentNumber: document.documentNumber || '',
      language: document.language || 'fr'
    };

    console.log('📥 [DOWNLOAD] Contexte de rendu:', {
      templateId: renderContext.template.id,
      sectionsCount: renderContext.template.sections.length,
      leadName: renderContext.lead.firstName + ' ' + renderContext.lead.lastName,
      language: renderContext.language,
      tblDataKeys: Object.keys(renderContext.tblData || {}),
      tblDataKeysCount: Object.keys(renderContext.tblData || {}).length,
      dataSnapshotKeys: Object.keys(dataSnapshot || {}),
      quote: renderContext.quote // 🔥 Afficher les données du devis
    });
    console.log('📥 [DOWNLOAD] Lead data (avec adresse parsée):', {
      address: renderContext.lead.address,
      street: renderContext.lead.street,
      number: renderContext.lead.number,
      box: renderContext.lead.box,
      postalCode: renderContext.lead.postalCode,
      city: renderContext.lead.city,
      country: renderContext.lead.country
    });
    console.log('📥 [DOWNLOAD] tblData complet:', JSON.stringify(renderContext.tblData, null, 2).substring(0, 2000));

    // Générer le PDF avec le nouveau renderer basé sur les templates
    const pdfBuffer = await renderDocumentPdf(renderContext);

    // Générer un nom de fichier
    const filename = `${document.documentNumber || document.id}.pdf`;
    
    console.log('📥 [DOWNLOAD] PDF généré, taille:', pdfBuffer.length, 'bytes');

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('❌ [DOWNLOAD] Erreur téléchargement:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

// ─── HELPER: Résoudre les fiches techniques associées à un devis ──────────
/**
 * À partir des données TBL d'un devis (formData), retrouve automatiquement
 * les ProductDocument (fiches techniques) associés aux produits sélectionnés.
 *
 * Gère 2 types de champs :
 *  - Lookup (panneau, onduleur) : via TreeBranchLeafSelectConfig.tableReference → tableRowId
 *  - Children (options directes) : via node.parentId + label matching
 */
async function getProductDocumentsForDevis(
  organizationId: string,
  tblData: Record<string, any>
): Promise<Array<{ id: string; name: string; fileName: string; mimeType: string; storageType: string; driveFileId?: string | null; localPath?: string | null; externalUrl?: string | null; category: string; nodeLabel?: string }>> {
  if (!tblData || Object.keys(tblData).length === 0) return [];

  // 1. Collecter TOUTES les valeurs texte du formulaire (ce que l'utilisateur a sélectionné/saisi)
  const formValues: string[] = [];
  for (const [key, value] of Object.entries(tblData)) {
    if (key.startsWith('__')) continue;
    if (typeof value === 'string' && value.trim()) {
      formValues.push(value.trim());
    }
  }

  if (formValues.length === 0) return [];
  console.log('📎 [FICHES-TECH] Valeurs du formulaire:', formValues);

  // 2. Récupérer TOUS les ProductDocuments de cette organisation avec leurs rows
  const allDocs = await prisma.productDocument.findMany({
    where: { organizationId },
    include: {
      tableRow: true,
      node: { select: { label: true } }
    }
  });

  if (allDocs.length === 0) {
    console.log('📎 [FICHES-TECH] Aucun ProductDocument dans cette organisation');
    return [];
  }

  console.log('📎 [FICHES-TECH]', allDocs.length, 'ProductDocument(s) en base');

  // 3. Matcher : pour chaque doc, vérifier si UNE des valeurs du formulaire
  //    se retrouve dans les cellules de la row associée
  const matchedDocs = new Map<string, typeof allDocs[0]>(); // driveFileId → doc (dédupliquer)

  for (const doc of allDocs) {
    if (!doc.tableRow) continue;

    // Les cells peuvent être un array JSON-stringifié ou une chaîne CSV
    let cells: string[] = [];
    try {
      const raw = doc.tableRow.cells;
      if (Array.isArray(raw)) {
        cells = raw.map((c: any) => String(c).trim());
      } else if (typeof raw === 'string') {
        // Tenter de parser comme JSON d'abord
        try {
          const parsed = JSON.parse(raw);
          cells = Array.isArray(parsed) ? parsed.map((c: any) => String(c).trim()) : [raw.trim()];
        } catch {
          // CSV ou valeur simple
          cells = raw.split(',').map(c => c.trim());
        }
      }
    } catch {
      continue;
    }

    // Vérifier si une valeur du formulaire correspond à une cellule de cette row
    for (const formVal of formValues) {
      const matched = cells.some(cell => cell === formVal);
      if (matched) {
        const fileKey = doc.driveFileId || doc.id; // dédupliquer par fichier
        if (!matchedDocs.has(fileKey)) {
          matchedDocs.set(fileKey, doc);
          console.log('📎 [FICHES-TECH] ✅ Match:', formVal, '→', doc.name, '(', doc.node?.label, ')');
        }
        break;
      }
    }
  }

  console.log('📎 [FICHES-TECH]', matchedDocs.size, 'fiche(s) technique(s) trouvée(s)');

  return Array.from(matchedDocs.values()).map(doc => ({
    id: doc.id,
    name: doc.name,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    storageType: doc.storageType,
    driveFileId: doc.driveFileId,
    localPath: doc.localPath,
    externalUrl: doc.externalUrl,
    category: doc.category,
    nodeLabel: doc.node?.label
  }));
}

/**
 * Télécharge le contenu d'un fichier Google Drive en Buffer
 */
async function downloadDriveFileAsBuffer(
  organizationId: string,
  driveFileId: string,
  userId?: string
): Promise<Buffer | null> {
  try {
    const { googleAuthManager } = await import('../google-auth/index');
    const { google } = await import('googleapis');

    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId, userId);
    if (!authClient) return null;

    const drive = google.drive({ version: 'v3', auth: authClient });
    const response = await drive.files.get(
      { fileId: driveFileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error('📎 [FICHES-TECH] ❌ Erreur téléchargement Drive:', driveFileId, error);
    return null;
  }
}

// POST /api/documents/generated/:id/send-email - Envoyer le PDF par email
router.post('/generated/:id/send-email', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { to, subject, body, cc, bcc, includeProductDocs, tblData: clientTblData } = req.body;
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId || undefined;
    const userId = (req.headers['x-user-id'] as string) || req.user?.userId || undefined;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Destinataire et sujet requis' });
    }
    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation non spécifiée' });
    }

    console.log('📧 [SEND-EMAIL] Envoi du document', id, 'à', to);

    // 1. Charger le document (même logique que download)
    const document = await prisma.generatedDocument.findFirst({
      where: { id },
      include: {
        DocumentTemplate: {
          include: {
            DocumentSection: { orderBy: { order: 'asc' } },
            DocumentTheme: true
          }
        },
        Lead: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // 2. Générer le PDF (même logique que download)
    const dataSnapshot = (document.dataSnapshot || {}) as Record<string, any>;
    const templateTheme = document.DocumentTemplate?.DocumentTheme;
    const defaultTheme = await prisma.documentTheme.findFirst({
      where: { organizationId: document.organizationId, isDefault: true }
    });
    const organization = await prisma.organization.findFirst({
      where: { id: document.organizationId }
    });

    const themeSource = templateTheme || defaultTheme;
    const theme = themeSource ? {
      primaryColor: themeSource.primaryColor || '#1890ff',
      secondaryColor: themeSource.secondaryColor || '#52c41a',
      accentColor: themeSource.accentColor || '#faad14',
      textColor: themeSource.textColor || '#333333',
      backgroundColor: themeSource.backgroundColor || '#ffffff',
      fontFamily: themeSource.fontFamily || 'Helvetica',
      fontSize: themeSource.fontSize || 12,
      logoUrl: themeSource.logoUrl || ''
    } : {
      primaryColor: '#1890ff', secondaryColor: '#52c41a', accentColor: '#faad14',
      textColor: '#333333', backgroundColor: '#ffffff', fontFamily: 'Helvetica',
      fontSize: 12, logoUrl: ''
    };

    const sections = document.DocumentTemplate?.DocumentSection?.map(s => ({
      id: s.id, type: s.type, name: (s as any).name || s.type,
      config: (s.config || {}) as Record<string, any>,
      translations: (s.translations || {}) as Record<string, any>,
      linkedNodeIds: (s.linkedNodeIds || []) as string[],
      order: s.order, isActive: (s as any).isActive !== false
    })) || [];

    const dbLead = document.Lead || {};
    const snapshotLead = dataSnapshot.lead || {};
    const mergedLead = { ...snapshotLead, ...dbLead };

    const renderContext = {
      template: document.DocumentTemplate ? {
        id: document.DocumentTemplate.id, name: document.DocumentTemplate.name,
        type: document.DocumentTemplate.type, theme, sections
      } : { id: 'default', name: 'Document', type: 'QUOTE', theme, sections: [] },
      lead: {
        id: (dbLead as any).id || snapshotLead.id || '',
        firstName: (dbLead as any).firstName || snapshotLead.firstName || '',
        lastName: (dbLead as any).lastName || snapshotLead.lastName || '',
        fullName: [(dbLead as any).firstName || snapshotLead.firstName, (dbLead as any).lastName || snapshotLead.lastName].filter(Boolean).join(' '),
        email: (dbLead as any).email || snapshotLead.email || '',
        phone: (dbLead as any).phone || snapshotLead.phone || '',
        company: (dbLead as any).company || snapshotLead.company || '',
        address: (mergedLead as any).address || '',
        street: '', number: '', box: '', postalCode: '', city: '', country: ''
      },
      organization: organization ? {
        name: organization.name || '', email: (organization as any).email || '',
        phone: (organization as any).phone || '', address: (organization as any).address || '',
        vatNumber: (organization as any).vatNumber || '', logo: (organization as any).logo || ''
      } : undefined,
      tblData: dataSnapshot.tblData || dataSnapshot,
      quote: {
        ...(dataSnapshot.quote || {}),
        number: dataSnapshot.quote?.number || document.documentNumber || '',
        reference: dataSnapshot.quote?.reference || document.documentNumber || '',
        date: dataSnapshot.quote?.date || new Intl.DateTimeFormat('fr-BE').format(document.createdAt || new Date()),
        totalHT: dataSnapshot.quote?.totalHT || 0,
        totalTVA: dataSnapshot.quote?.totalTVA || 0,
        totalTTC: dataSnapshot.quote?.totalTTC || 0,
        status: dataSnapshot.quote?.status || 'draft'
      },
      documentNumber: document.documentNumber || '',
      language: document.language || 'fr'
    };

    const pdfBuffer = await renderDocumentPdf(renderContext);
    const filename = `${document.documentNumber || document.id}.pdf`;
    console.log('📧 [SEND-EMAIL] PDF généré:', filename, pdfBuffer.length, 'bytes');

    // 3. Envoyer via Gmail
    const gmailService = await GoogleGmailService.create(organizationId, userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    // 3b. Si demandé, résoudre et télécharger les fiches techniques des produits du devis
    const allAttachments: Array<{ filename: string; content: Buffer; mimeType: string }> = [{
      filename,
      content: pdfBuffer,
      mimeType: 'application/pdf'
    }];

    let attachedProductDocsCount = 0;
    const attachedProductDocNames: string[] = [];
    if (includeProductDocs) {
      try {
        // Utiliser les données ACTUELLES du formulaire envoyées par le frontend (priorité)
        // Fallback sur le snapshot du document si pas de données fraîches
        const tblData = clientTblData || dataSnapshot.tblData || dataSnapshot;
        console.log('📎 [SEND-EMAIL] Recherche des fiches techniques pour le devis...', clientTblData ? '(données actuelles du formulaire)' : '(snapshot du document)');
        const productDocs = await getProductDocumentsForDevis(organizationId!, tblData);

        for (const doc of productDocs) {
          try {
            let fileBuffer: Buffer | null = null;

            if (doc.storageType === 'GOOGLE_DRIVE' && doc.driveFileId) {
              fileBuffer = await downloadDriveFileAsBuffer(organizationId!, doc.driveFileId, userId);
            } else if (doc.localPath) {
              const fs = await import('fs/promises');
              try { fileBuffer = await fs.readFile(doc.localPath); } catch { /* skip */ }
            } else if (doc.externalUrl) {
              try {
                const resp = await fetch(doc.externalUrl);
                if (resp.ok) fileBuffer = Buffer.from(await resp.arrayBuffer());
              } catch { /* skip */ }
            }

            if (fileBuffer) {
              allAttachments.push({
                filename: doc.fileName,
                content: fileBuffer,
                mimeType: doc.mimeType || 'application/pdf'
              });
              attachedProductDocsCount++;
              attachedProductDocNames.push(doc.name || doc.fileName);
              console.log('📎 [SEND-EMAIL] ✅ Fiche technique ajoutée:', doc.fileName, `(${(fileBuffer.length / 1024).toFixed(0)} KB)`);
            } else {
              console.warn('📎 [SEND-EMAIL] ⚠️ Impossible de télécharger:', doc.fileName);
            }
          } catch (docErr) {
            console.warn('📎 [SEND-EMAIL] ⚠️ Erreur téléchargement fiche:', doc.fileName, docErr);
          }
        }

        if (attachedProductDocsCount > 0) {
          console.log(`📎 [SEND-EMAIL] ${attachedProductDocsCount} fiche(s) technique(s) jointe(s) au total`);
        }
      } catch (prodDocErr) {
        console.warn('📎 [SEND-EMAIL] ⚠️ Erreur récupération fiches techniques (envoi sans):', prodDocErr);
      }
    }

    // Construire un email HTML professionnel pour éviter les filtres anti-spam
    const orgName = organization?.name || '2Thier CRM';
    const orgEmail = (organization as any)?.email || '';
    const orgPhone = (organization as any)?.phone || '';
    const orgAddress = (organization as any)?.address || '';
    const bodyText = (body || '').trim();
    // Convertir les sauts de ligne en <br> pour le HTML
    const bodyHtml = bodyText.replace(/\n/g, '<br>');

    // Mention des fiches techniques dans l'email si elles sont jointes
    const fichesHtml = attachedProductDocsCount > 0
      ? `<p style="font-size: 13px; color: #666; margin-top: 10px;">📄 ${attachedProductDocsCount} fiche(s) technique(s) jointe(s) :<br>${attachedProductDocNames.map(n => `&nbsp;&nbsp;• <em>${n}</em>`).join('<br>')}</p>`
      : '';

    const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="background-color: #1a1a2e; padding: 20px 30px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">${orgName}</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p>${bodyHtml}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="font-size: 13px; color: #666;">📎 Vous trouverez le document <strong>${filename}</strong> en pièce jointe de cet email.</p>
        ${fichesHtml}
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #888;">Cordialement,</p>
        <p style="margin: 5px 0 0; font-size: 13px; color: #555; font-weight: bold;">${orgName}</p>
        ${orgEmail ? `<p style="margin: 2px 0; font-size: 12px; color: #888;">📧 ${orgEmail}</p>` : ''}
        ${orgPhone ? `<p style="margin: 2px 0; font-size: 12px; color: #888;">📞 ${orgPhone}</p>` : ''}
        ${orgAddress ? `<p style="margin: 2px 0; font-size: 12px; color: #888;">📍 ${orgAddress}</p>` : ''}
      </td>
    </tr>
  </table>
  <p style="text-align: center; font-size: 11px; color: #aaa; margin-top: 10px;">Cet email a été envoyé depuis ${orgName}. Si vous n'attendiez pas ce message, vous pouvez l'ignorer.</p>
</body>
</html>`;

    const result = await gmailService.sendEmail({
      to,
      subject,
      body: htmlBody,
      isHtml: true,
      cc: cc || undefined,
      bcc: bcc || undefined,
      fromName: orgName,
      attachments: allAttachments
    });

    if (!result) {
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }

    // 4. Mettre à jour le statut du document + remplir les champs de traçabilité
    const now = new Date();
    await prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: now,
        sentTo: to,
        sentBy: userId || null,
        updatedAt: now,
      }
    });

    // 5. Logger dans l'historique du lead (TimelineEvent)
    if (document.leadId) {
      try {
        await prisma.timelineEvent.create({
          data: {
            id: nanoid(),
            organizationId: organizationId || null,
            entityType: 'document',
            entityId: id,
            eventType: 'email_sent',
            leadId: document.leadId,
            data: {
              to,
              cc: cc || null,
              subject,
              documentNumber: document.documentNumber || null,
              filename,
              templateName: document.DocumentTemplate?.name || null,
              sentBy: userId || null,
              messageId: result.messageId,
              productDocsAttached: attachedProductDocsCount,
              totalAttachments: allAttachments.length,
            },
          },
        });
        console.log('📧 [SEND-EMAIL] ✅ TimelineEvent créé pour le lead', document.leadId);
      } catch (tlErr) {
        console.warn('⚠️ [SEND-EMAIL] Impossible de créer TimelineEvent:', tlErr);
      }
    }

    const fichesMsg = attachedProductDocsCount > 0 ? ` + ${attachedProductDocsCount} fiche(s) technique(s)` : '';
    console.log(`📧 [SEND-EMAIL] ✅ Email envoyé à ${to} avec PDF ${filename}${fichesMsg}`);
    res.json({ 
      success: true, 
      messageId: result.messageId,
      productDocsAttached: attachedProductDocsCount
    });
  } catch (error: any) {
    console.error('❌ [SEND-EMAIL] Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi', details: error?.message });
  }
});

// POST /api/documents/templates/:templateId/preview-pdf - Générer un PDF de prévisualisation depuis le PageBuilder
router.post('/templates/:templateId/preview-pdf', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    console.log('🖨️ [PREVIEW-PDF] Demande de génération PDF preview:', { templateId, organizationId });

    const { pages, globalTheme } = req.body;

    if (!pages || !Array.isArray(pages)) {
      return res.status(400).json({ error: 'Pages manquantes dans la requête' });
    }

    // Charger l'organisation pour les infos org
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId }
    });

    // Construire les sections à partir des pages du PageBuilder
    const sections = pages.map((page: any, index: number) => ({
      id: page.id || `page-${index}`,
      type: 'MODULAR_PAGE',
      order: index,
      config: {
        pageId: page.id,
        name: page.name,
        modules: page.modules || [],
        padding: page.padding || { top: 40, right: 40, bottom: 40, left: 40 },
        backgroundColor: page.backgroundColor,
        backgroundImage: page.backgroundImage,
        backgroundId: page.backgroundId,
        backgroundCustomSvg: page.backgroundCustomSvg,
      },
      linkedNodeIds: [],
      linkedVariables: [],
      translations: {}
    }));

    // Construire le thème
    const theme = globalTheme ? {
      primaryColor: globalTheme.primaryColor || '#1890ff',
      secondaryColor: globalTheme.secondaryColor || '#52c41a',
      accentColor: globalTheme.accentColor || '#faad14',
      textColor: globalTheme.textColor || '#333333',
      backgroundColor: globalTheme.backgroundColor || '#ffffff',
      fontFamily: globalTheme.fontFamily || 'Helvetica',
      fontSize: globalTheme.fontSize || 12,
      logoUrl: globalTheme.logoUrl || ''
    } : {
      primaryColor: '#1890ff',
      secondaryColor: '#52c41a',
      accentColor: '#faad14',
      textColor: '#333333',
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
      fontSize: 12,
      logoUrl: ''
    };

    // Données de test/prévisualisation
    const renderContext = {
      template: {
        id: templateId,
        name: 'Aperçu Document',
        type: 'QUOTE',
        theme: theme,
        sections: sections
      },
      lead: {
        firstName: 'Jean',
        lastName: 'Dupont',
        fullName: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        phone: '+32 470 12 34 56',
        company: 'Entreprise Test',
        address: '123 Rue du Test, 1000 Bruxelles',
        street: 'Rue du Test',
        number: '123',
        postalCode: '1000',
        city: 'Bruxelles',
        country: 'Belgique',
      },
      organization: organization ? {
        name: organization.name || '2Thier SRL',
        email: (organization as any).email || 'contact@2thier.be',
        phone: (organization as any).phone || '+32 81 10 20 30',
        address: (organization as any).address || 'Rue de l\'Organisation 1, 4000 Liège',
        vatNumber: (organization as any).vatNumber || 'BE 1025.391.354',
        bankAccount: (organization as any).bankAccount || 'BE35 0020 1049 3637',
        bic: (organization as any).bic || 'GEBABEBB',
        website: (organization as any).website || 'www.2thier.be',
        logo: (organization as any).logo || ''
      } : {
        name: '2Thier SRL',
        email: 'jonathan.dethier@2thier.be',
        phone: '081/10.20.30',
        address: 'Rue de l\'Organisation 1, 4000 Liège',
        vatNumber: 'BE 1025.391.354',
        bankAccount: 'BE35 0020 1049 3637',
        bic: 'GEBABEBB',
        website: 'www.2thier.be'
      },
      tblData: {},
      quote: {
        reference: 'PREVIEW-001',
        number: 'PREVIEW-001',
        date: new Intl.DateTimeFormat('fr-BE').format(new Date()),
        validUntil: new Intl.DateTimeFormat('fr-BE').format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        totalHT: 1500.00,
        totalTVA: 315.00,
        totalTTC: 1815.00,
        status: 'draft'
      },
      documentNumber: 'PREVIEW-001',
      language: 'fr'
    };

    console.log('🖨️ [PREVIEW-PDF] Sections:', sections.length);
    console.log('🖨️ [PREVIEW-PDF] Theme:', theme);

    // Générer le PDF
    const pdfBuffer = await renderDocumentPdf(renderContext);

    console.log('🖨️ [PREVIEW-PDF] PDF généré, taille:', pdfBuffer.length, 'bytes');

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="preview-${templateId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('❌ [PREVIEW-PDF] Erreur génération:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

// GET /api/documents/generated/:id/preview - Aperçu du document (HTML ou données)
router.get('/generated/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    console.log('👁️ [PREVIEW] Demande d\'aperçu:', { id, organizationId });

    const document = await prisma.generatedDocument.findFirst({
      where: { 
        id,
        organizationId
      },
      include: {
        DocumentTemplate: {
          include: {
            DocumentSection: {
              orderBy: { order: 'asc' }
            },
            DocumentTheme: true
          }
        },
        Lead: true,
        TreeBranchLeafSubmission: true
      }
    });

    if (!document) {
      console.log('👁️ [PREVIEW] Document non trouvé');
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    console.log('👁️ [PREVIEW] Document trouvé:', document.documentNumber);

    // Retourner toutes les données nécessaires pour l'aperçu
    res.json({
      id: document.id,
      documentNumber: document.documentNumber,
      type: document.type,
      status: document.status,
      language: document.language,
      title: document.title,
      notes: document.notes,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      template: document.DocumentTemplate,
      lead: document.Lead,
      dataSnapshot: document.dataSnapshot,
      // Informations de signature/paiement
      signedAt: document.signedAt,
      signatureUrl: document.signatureUrl,
      paidAt: document.paidAt,
      paymentAmount: document.paymentAmount,
      paymentMethod: document.paymentMethod
    });
  } catch (error: any) {
    console.error('❌ [PREVIEW] Erreur aperçu:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

export default router;
