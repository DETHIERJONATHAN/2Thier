/**
 * ============================================================
 *  ROUTES: Product Documents (Fiches Techniques)
 * ============================================================
 *
 *  Gestion des documents liés aux produits (panneaux, onduleurs, etc.)
 *  Stockage unifié : Google Drive pour users Google, CRM local pour users Yandex.
 *
 *  Les documents sont liés aux TreeBranchLeafNode (nœuds de l'arbre)
 *  pour association automatique dans les devis.
 *
 *  Endpoints:
 *    GET    /api/product-documents/node/:nodeId  → Documents d'un nœud
 *    GET    /api/product-documents/:id            → Détail d'un document
 *    POST   /api/product-documents/upload         → Upload unifié (Drive ou local)
 *    DELETE /api/product-documents/:id            → Supprimer un document
 *    GET    /api/product-documents/search          → Rechercher des documents
 *    GET    /api/product-documents/:id/download    → URL de téléchargement
 *    GET    /api/product-documents/provider        → Détection du provider stockage
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import path from 'path';
import fs from 'fs';
import { uploadFile } from '../lib/storage';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────

interface AuthUser {
  id: string;
  organizationId: string;
  role?: string;
}

function getUser(req: Request): AuthUser {
  // Priorité: headers envoyés par useAuthenticatedApi, puis session passport
  const headerUserId = req.headers['x-user-id'] as string;
  const headerOrgId = req.headers['x-organization-id'] as string;
  if (headerUserId) {
    return {
      id: headerUserId,
      organizationId: headerOrgId || req.user?.organizationId || '',
      role: req.user?.role
    };
  }
  return req.user as AuthUser;
}

function getOrgId(req: Request): string {
  const orgHeader = req.headers['x-organization-id'] as string;
  if (orgHeader) return orgHeader;
  const user = getUser(req);
  return user?.organizationId || '';
}

// ─── GET /provider — Détection du type de stockage ──────────

// ─── GET /fields — Lister les champs qui ont des options (dynamique) ────────
// Détecte automatiquement DEUX types de champs:
//   1. Champs avec enfants leaf_option/leaf_option_field (ex: Optimiseur, Position, Alimentation)
//   2. Champs avec table lookup (ex: Panneau, Onduleur) — via TreeBranchLeafNodeTable

router.get('/fields', async (_req: Request, res: Response) => {
  try {
    // --- Type 1: Nœuds parents qui ont des enfants option ---
    const optionNodes = await db.treeBranchLeafNode.findMany({
      where: {
        type: { in: ['leaf_option', 'leaf_option_field'] },
        parentId: { not: null }
      },
      select: { parentId: true }
    });
    const parentIdsWithOptions = new Set(optionNodes.map(n => n.parentId!));

    // --- Type 2: Nœuds qui ont une table lookup (hasTable: true + table existante) ---
    const lookupTables = await db.treeBranchLeafNodeTable.findMany({
      where: { rowCount: { gt: 0 } },
      select: { nodeId: true }
    });
    const lookupNodeIds = new Set(lookupTables.map(t => t.nodeId));

    // Récupérer tous les nœuds candidats
    const allCandidateIds = [...parentIdsWithOptions, ...lookupNodeIds];
    if (allCandidateIds.length === 0) {
      return res.json({ fields: [] });
    }

    const candidateNodes = await db.treeBranchLeafNode.findMany({
      where: { id: { in: allCandidateIds } },
      select: { id: true, label: true, type: true, parentId: true }
    });

    // Construire la liste unifiée avec le type de source
    const fields = candidateNodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      parentId: n.parentId,
      source: parentIdsWithOptions.has(n.id) ? 'children' as const : 'lookup' as const
    })).sort((a, b) => a.label.localeCompare(b.label));

    res.json({ fields });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur liste champs:', error);
    res.status(500).json({ error: 'Erreur liste des champs' });
  }
});

// ─── GET /fields/:id/options — Options d'un champ (dynamique) ───────────
// Retourne les options depuis soit les enfants TreeBranchLeafNode, soit les lignes de table lookup

router.get('/fields/:id/options', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Essayer les options enfants (type classique)
    const childOptions = await db.treeBranchLeafNode.findMany({
      where: {
        parentId: id,
        type: { in: ['leaf_option', 'leaf_option_field'] }
      },
      select: { id: true, label: true, type: true, order: true },
      orderBy: { order: 'asc' }
    });

    if (childOptions.length > 0) {
      return res.json({
        options: childOptions,
        source: 'children',
        parentNodeId: id
      });
    }

    // 2. Essayer les tables lookup
    const lookupTable = await db.treeBranchLeafNodeTable.findFirst({
      where: { nodeId: id, rowCount: { gt: 0 } },
      select: {
        id: true,
        name: true,
        tableColumns: {
          orderBy: { columnIndex: 'asc' },
          take: 1,
          select: { id: true, name: true, columnIndex: true }
        }
      }
    });

    if (lookupTable) {
      // Récupérer toutes les lignes de la table
      const rows = await db.treeBranchLeafNodeTableRow.findMany({
        where: { tableId: lookupTable.id },
        select: { id: true, cells: true, rowIndex: true },
        orderBy: { rowIndex: 'asc' }
      });

      // La première ligne (rowIndex 0) est souvent l'en-tête
      const dataRows = rows.filter(r => r.rowIndex > 0);
      const firstColumnName = lookupTable.tableColumns[0]?.name || 'Nom';

      const options = dataRows.map(row => {
        const cells = row.cells as any[];
        return {
          id: row.id,
          label: cells[0]?.toString() || `Ligne ${row.rowIndex}`,
          type: 'lookup_row',
          order: row.rowIndex
        };
      });

      return res.json({
        options,
        source: 'lookup',
        parentNodeId: id,
        tableName: lookupTable.name,
        columnName: firstColumnName
      });
    }

    // Aucune option trouvée
    res.json({ options: [], source: 'none', parentNodeId: id });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur options:', error);
    res.status(500).json({ error: 'Erreur chargement options' });
  }
});

router.get('/provider', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user?.id) {
      return res.json({ provider: 'local', hasGoogleDrive: false, mailProvider: 'none' });
    }
    const organizationId = getOrgId(req);

    // 1. Vérifier EmailAccount.mailProvider
    const emailAccount = await db.emailAccount.findUnique({
      where: { userId: user.id },
      select: { mailProvider: true }
    });

    // 2. Vérifier GoogleToken
    const googleToken = await db.googleToken.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId
        }
      },
      select: { id: true }
    });

    let storageProvider: 'google_drive' | 'local' = 'local';

    if (googleToken) {
      storageProvider = 'google_drive';
    } else if (emailAccount?.mailProvider === 'gmail') {
      storageProvider = 'google_drive';
    }

    res.json({
      provider: storageProvider,
      hasGoogleDrive: !!googleToken,
      mailProvider: emailAccount?.mailProvider || 'none'
    });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur détection provider:', error);
    res.status(500).json({ error: 'Erreur détection du provider de stockage' });
  }
});

// ─── GET /node/:nodeId — Documents d'un nœud produit ────────

router.get('/node/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const organizationId = getOrgId(req);

    const documents = await db.productDocument.findMany({
      where: {
        nodeId,
        organizationId
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ documents });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur récupération documents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
  }
});

// ─── GET /search — Rechercher des documents ─────────────────

router.get('/search', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { q, category, page = '1', limit = '20' } = req.query;

    const where: any = { organizationId };

    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { fileName: { contains: q as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category as string;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [documents, total] = await Promise.all([
      db.productDocument.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true }
          },
          node: {
            select: { id: true, label: true, parentId: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      db.productDocument.count({ where })
    ]);

    res.json({
      documents,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// ─── GET /:id — Détail d'un document ────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req);

    const document = await db.productDocument.findFirst({
      where: { id, organizationId },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        node: {
          select: { id: true, label: true, parentId: true, fieldId: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    res.json({ document });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur détail document:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du document' });
  }
});

// ─── POST /upload — Upload unifié ───────────────────────────

router.post('/upload', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const organizationId = getOrgId(req);
    const {
      nodeId, nodeIds: nodeIdsRaw,
      tableRowIds: tableRowIdsRaw, parentNodeId,
      name, category = 'fiche_technique', storageType
    } = req.body;

    // Support multi-nodes: nodeIds (tableau) ou nodeId (single)
    let nodeIds: string[] = [];
    if (nodeIdsRaw) {
      if (Array.isArray(nodeIdsRaw)) {
        nodeIds = nodeIdsRaw;
      } else if (typeof nodeIdsRaw === 'string') {
        try {
          const parsed = JSON.parse(nodeIdsRaw);
          nodeIds = Array.isArray(parsed) ? parsed : [nodeIdsRaw];
        } catch {
          nodeIds = [nodeIdsRaw];
        }
      }
    } else if (nodeId) {
      nodeIds = [nodeId];
    }

    // Support table row IDs (lookup options)
    let tableRowIds: string[] = [];
    if (tableRowIdsRaw) {
      if (Array.isArray(tableRowIdsRaw)) {
        tableRowIds = tableRowIdsRaw;
      } else if (typeof tableRowIdsRaw === 'string') {
        try {
          const parsed = JSON.parse(tableRowIdsRaw);
          tableRowIds = Array.isArray(parsed) ? parsed : [tableRowIdsRaw];
        } catch {
          tableRowIds = [tableRowIdsRaw];
        }
      }
    }

    if (nodeIds.length === 0 && tableRowIds.length === 0) {
      return res.status(400).json({ error: 'Au moins un nodeId ou tableRowId est requis' });
    }

    const files = (req as any).files;
    if (!files || !files.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const file = files.file;
    const fileName = file.name;
    const mimeType = file.mimetype;
    const fileSize = file.size;
    // When useTempFiles is enabled, file.data is empty — read from temp file
    let fileBuffer: Buffer = file.data;
    if ((!fileBuffer || fileBuffer.length === 0) && file.tempFilePath) {
      const fsP = await import('fs/promises');
      fileBuffer = await fsP.readFile(file.tempFilePath);
    }

    const resolvedStorageType = storageType || 'LOCAL';
    let localPath: string | null = null;
    let driveFileId: string | null = null;
    let driveUrl: string | null = null;

    if (resolvedStorageType === 'GOOGLE_DRIVE') {
      try {
        const { GoogleDriveService } = await import('../google-auth/services/GoogleDriveService');
        const driveService = GoogleDriveService.getInstance();

        let folderId = 'root';
        try {
          const folderResult = await driveService.createFolder(
            organizationId,
            'Fiches Techniques CRM',
            undefined,
            user.id
          );
          folderId = folderResult.id;
        } catch {
        }

        const driveFile = await driveService.uploadFile(
          organizationId,
          fileName,
          mimeType,
          fileBuffer,
          folderId,
          user.id
        );

        driveFileId = driveFile.id;
        driveUrl = driveFile.webViewLink || null;

        try {
          const shareResult = await driveService.makePublic(organizationId, driveFile.id, user.id);
          driveUrl = shareResult.webViewLink || driveUrl;
        } catch {
        }
      } catch (error: any) {
        console.error('[ProductDocuments] ❌ Erreur upload Google Drive:', error);
        return res.status(500).json({
          error: 'Erreur lors de l\'upload vers Google Drive',
          details: error.message
        });
      }
    } else {
      const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const key = `product-documents/${organizationId}/${uniqueName}`;
      localPath = await uploadFile(fileBuffer, key, file.mimetype || 'application/octet-stream');
    }

    const documents = [];

    // --- Mode 1: Options enfants (nodeIds) ---
    if (nodeIds.length > 0) {
      const nodes = await db.treeBranchLeafNode.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, label: true }
      });
      for (const nd of nodes) {
        const document = await db.productDocument.create({
          data: {
            nodeId: nd.id,
            organizationId,
            uploadedById: user.id,
            name: name || nd.label + ' - ' + fileName,
            fileName, mimeType, fileSize,
            storageType: resolvedStorageType,
            localPath, driveFileId, driveUrl,
            category
          },
          include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } },
            node: { select: { id: true, label: true } }
          }
        });
        documents.push(document);
      }
    }

    // --- Mode 2: Lignes lookup (tableRowIds) ---
    if (tableRowIds.length > 0) {
      // Déterminer le nodeId parent — soit fourni, soit déduit de la table
      let resolvedParentNodeId = parentNodeId;
      if (!resolvedParentNodeId && tableRowIds.length > 0) {
        const firstRow = await db.treeBranchLeafNodeTableRow.findUnique({
          where: { id: tableRowIds[0] },
          include: { TreeBranchLeafNodeTable: { select: { nodeId: true } } }
        });
        resolvedParentNodeId = firstRow?.TreeBranchLeafNodeTable?.nodeId;
      }

      if (!resolvedParentNodeId) {
        return res.status(400).json({ error: 'Impossible de déterminer le nœud parent pour les lignes de table' });
      }

      const rows = await db.treeBranchLeafNodeTableRow.findMany({
        where: { id: { in: tableRowIds } },
        select: { id: true, cells: true, rowIndex: true }
      });

      for (const row of rows) {
        const cells = row.cells as any[];
        const rowLabel = cells[0]?.toString() || `Ligne ${row.rowIndex}`;
        const document = await db.productDocument.create({
          data: {
            nodeId: resolvedParentNodeId,
            tableRowId: row.id,
            organizationId,
            uploadedById: user.id,
            name: name || rowLabel + ' - ' + fileName,
            fileName, mimeType, fileSize,
            storageType: resolvedStorageType,
            localPath, driveFileId, driveUrl,
            category
          },
          include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } },
            node: { select: { id: true, label: true } }
          }
        });
        documents.push(document);
      }
    }


    res.status(201).json({ document: documents[0], documents, count: documents.length });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur upload:', error?.message);
    res.status(500).json({ error: 'Erreur lors de l\'upload du document' });
  }
});

// ─── POST /upload-url — Lier un document via URL externe ────

router.post('/upload-url', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const organizationId = getOrgId(req);
    const {
      nodeId, nodeIds: nodeIdsRaw,
      tableRowIds: tableRowIdsRaw, parentNodeId,
      name, url, category = 'fiche_technique', fileName = 'document.pdf'
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url est requis' });
    }

    // Support multi-nodes
    let nodeIds: string[] = [];
    if (nodeIdsRaw) {
      nodeIds = Array.isArray(nodeIdsRaw) ? nodeIdsRaw : JSON.parse(nodeIdsRaw);
    } else if (nodeId) {
      nodeIds = [nodeId];
    }

    // Support table row IDs
    let tableRowIds: string[] = [];
    if (tableRowIdsRaw) {
      tableRowIds = Array.isArray(tableRowIdsRaw) ? tableRowIdsRaw : JSON.parse(tableRowIdsRaw);
    }

    if (nodeIds.length === 0 && tableRowIds.length === 0) {
      return res.status(400).json({ error: 'Au moins un nodeId ou tableRowId est requis' });
    }

    const documents = [];

    // --- Mode 1: Options enfants (nodeIds) ---
    if (nodeIds.length > 0) {
      const nodes = await db.treeBranchLeafNode.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, label: true }
      });
      for (const nd of nodes) {
        const document = await db.productDocument.create({
          data: {
            nodeId: nd.id,
            organizationId,
            uploadedById: user.id,
            name: name || nd.label + ' - Document',
            fileName,
            mimeType: 'application/pdf',
            storageType: 'LOCAL',
            externalUrl: url,
            category
          },
          include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        });
        documents.push(document);
      }
    }

    // --- Mode 2: Lignes lookup (tableRowIds) ---
    if (tableRowIds.length > 0) {
      let resolvedParentNodeId = parentNodeId;
      if (!resolvedParentNodeId) {
        const firstRow = await db.treeBranchLeafNodeTableRow.findUnique({
          where: { id: tableRowIds[0] },
          include: { TreeBranchLeafNodeTable: { select: { nodeId: true } } }
        });
        resolvedParentNodeId = firstRow?.TreeBranchLeafNodeTable?.nodeId;
      }
      if (!resolvedParentNodeId) {
        return res.status(400).json({ error: 'Impossible de déterminer le nœud parent' });
      }

      const rows = await db.treeBranchLeafNodeTableRow.findMany({
        where: { id: { in: tableRowIds } },
        select: { id: true, cells: true, rowIndex: true }
      });
      for (const row of rows) {
        const cells = row.cells as any[];
        const rowLabel = cells[0]?.toString() || `Ligne ${row.rowIndex}`;
        const document = await db.productDocument.create({
          data: {
            nodeId: resolvedParentNodeId,
            tableRowId: row.id,
            organizationId,
            uploadedById: user.id,
            name: name || rowLabel + ' - Document',
            fileName,
            mimeType: 'application/pdf',
            storageType: 'LOCAL',
            externalUrl: url,
            category
          },
          include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        });
        documents.push(document);
      }
    }

    res.status(201).json({ document: documents[0], documents, count: documents.length });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur upload URL:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du document' });
  }
});

// ─── GET /:id/download — URL de téléchargement ─────────────

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req);

    const document = await db.productDocument.findFirst({
      where: { id, organizationId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    if (document.storageType === 'GOOGLE_DRIVE' && document.driveFileId) {
      // Obtenir le lien de téléchargement Google Drive
      try {
        const { GoogleDriveService } = await import('../google-auth/services/GoogleDriveService');
        const driveService = GoogleDriveService.getInstance();
        const user = getUser(req);

        const downloadInfo = await driveService.getDownloadUrl(organizationId, document.driveFileId, user.id);
        return res.json({ url: downloadInfo.url || document.driveUrl, type: 'redirect' });
      } catch {
        // Fallback vers le lien stocké
        return res.json({ url: document.driveUrl, type: 'redirect' });
      }
    } else if (document.externalUrl) {
      return res.json({ url: document.externalUrl, type: 'redirect' });
    } else if (document.localPath) {
      return res.json({ url: document.localPath, type: 'local' });
    }

    res.status(404).json({ error: 'Aucun fichier disponible pour le téléchargement' });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur téléchargement:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// ─── GET /nodes/with-documents — Nœuds avec compteur docs ──

router.get('/nodes/with-documents', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { fieldId } = req.query;

    const where: any = { organizationId };
    if (fieldId) {
      where.node = { fieldId: fieldId as string };
    }

    const docs = await db.productDocument.groupBy({
      by: ['nodeId'],
      where,
      _count: { id: true }
    });

    const nodeIds = docs.map(d => d.nodeId);
    const nodes = await db.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, label: true, parentId: true }
    });

    const result = docs.map(d => ({
      nodeId: d.nodeId,
      count: d._count.id,
      node: nodes.find(n => n.id === d.nodeId)
    }));

    res.json({ nodesWithDocuments: result });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// ─── DELETE /:id — Supprimer un document ────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    const organizationId = getOrgId(req);

    const document = await db.productDocument.findFirst({
      where: { id, organizationId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Supprimer le fichier physique
    if (document.storageType === 'GOOGLE_DRIVE' && document.driveFileId) {
      try {
        const { GoogleDriveService } = await import('../google-auth/services/GoogleDriveService');
        const driveService = GoogleDriveService.getInstance();
        await driveService.deleteFile(organizationId, document.driveFileId, user.id);
      } catch (error) {
        console.warn('[ProductDocuments] ⚠️ Impossible de supprimer le fichier Drive:', error);
      }
    } else if (document.localPath) {
      const fullPath = path.join(process.cwd(), 'public', document.localPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Supprimer de la base
    await db.productDocument.delete({ where: { id } });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ─── GET /for-devis — Tous les documents pour un devis ──────
// Récupère les documents liés à une liste de nodeIds (sélections du devis)

router.post('/for-devis', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { nodeIds } = req.body;

    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      return res.json({ documents: [] });
    }

    const documents = await db.productDocument.findMany({
      where: {
        nodeId: { in: nodeIds },
        organizationId
      },
      include: {
        node: {
          select: { id: true, label: true }
        }
      },
      orderBy: [
        { nodeId: 'asc' },
        { category: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Grouper par nodeId pour faciliter l'affichage dans le devis
    const grouped: Record<string, typeof documents> = {};
    for (const doc of documents) {
      if (!grouped[doc.nodeId]) grouped[doc.nodeId] = [];
      grouped[doc.nodeId].push(doc);
    }

    res.json({ documents, grouped });
  } catch (error: any) {
    console.error('[ProductDocuments] ❌ Erreur for-devis:', error);
    res.status(500).json({ error: 'Erreur récupération documents devis' });
  }
});

export default router;
