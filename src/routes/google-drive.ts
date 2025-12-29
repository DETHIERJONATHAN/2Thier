import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { googleDriveService } from '../google-auth/services/GoogleDriveService.js';

const router = Router();

// Récupérer les fichiers et dossiers
router.get('/files', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const folderId = (req.query.folderId as string) || 'root';
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const pageToken = req.query.pageToken as string | undefined;

    console.log(`[Google Drive Routes] 📁 GET /files - folderId: ${folderId}`);

    const result = await googleDriveService.getFiles(organizationId, folderId, pageSize, pageToken, userId);
    
    res.json(result);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /files:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers Drive' });
  }
});

// Récupérer les fichiers partagés avec moi
router.get('/shared', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const pageToken = req.query.pageToken as string | undefined;

    console.log(`[Google Drive Routes] 📤 GET /shared - Fichiers partagés avec moi`);

    const result = await googleDriveService.getSharedFiles(organizationId, pageSize, pageToken, userId);
    
    res.json(result);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /shared:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers partagés' });
  }
});

// Récupérer les drives partagés (Team Drives)
router.get('/shared-drives', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    console.log(`[Google Drive Routes] 🏢 GET /shared-drives - Drives partagés`);

    const result = await googleDriveService.getSharedDrives(organizationId, 50, userId);
    
    res.json(result);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /shared-drives:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des drives partagés' });
  }
});

// Récupérer les fichiers d'un Drive partagé (Team Drive)
router.get('/shared-drives/:driveId/files', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { driveId } = req.params;
    const folderId = req.query.folderId as string | undefined;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const pageToken = req.query.pageToken as string | undefined;

    console.log(`[Google Drive Routes] 🏢 GET /shared-drives/${driveId}/files - folderId: ${folderId || 'root'}`);

    const result = await googleDriveService.getSharedDriveFiles(organizationId, driveId, folderId, pageSize, pageToken, userId);
    
    res.json(result);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /shared-drives/:driveId/files:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers du drive partagé' });
  }
});

// Rechercher des fichiers
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Paramètre de recherche requis' });
    }

    console.log(`[Google Drive Routes] 🔎 GET /search - query: "${query}"`);

    const files = await googleDriveService.searchFiles(organizationId, query, 50, userId);
    
    res.json({ files });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /search:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche de fichiers' });
  }
});

// Récupérer les infos de stockage
router.get('/storage', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    console.log(`[Google Drive Routes] 💾 GET /storage`);

    const storageInfo = await googleDriveService.getStorageInfo(organizationId, userId);
    
    res.json(storageInfo);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /storage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des infos de stockage' });
  }
});

// Récupérer les infos d'un fichier
router.get('/files/:fileId', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] 📄 GET /files/${fileId}`);

    const fileInfo = await googleDriveService.getFileInfo(organizationId, fileId, userId);
    
    res.json(fileInfo);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /files/:fileId:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des infos du fichier' });
  }
});

// Créer un dossier
router.post('/folders', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nom du dossier requis' });
    }

    console.log(`[Google Drive Routes] 📂 POST /folders - name: "${name}"`);

    const folder = await googleDriveService.createFolder(organizationId, name, parentId || 'root', userId);
    
    res.status(201).json(folder);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur POST /folders:', error);
    res.status(500).json({ error: 'Erreur lors de la création du dossier' });
  }
});

// Supprimer un fichier (mise à la corbeille)
router.delete('/files/:fileId', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] 🗑️ DELETE /files/${fileId}`);

    await googleDriveService.deleteFile(organizationId, fileId, userId);
    
    res.json({ success: true, message: 'Fichier mis à la corbeille' });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur DELETE /files/:fileId:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
});

// Upload de fichier
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    // Récupérer le fichier depuis la requête (multipart)
    const chunks: Buffer[] = [];
    let fileName = 'uploaded-file';
    let mimeType = 'application/octet-stream';
    let parentId = 'root';

    // Lire les headers pour le nom et le type
    if (req.headers['x-file-name']) {
      fileName = decodeURIComponent(req.headers['x-file-name'] as string);
    }
    if (req.headers['x-mime-type']) {
      mimeType = req.headers['x-mime-type'] as string;
    }
    if (req.headers['x-parent-id']) {
      parentId = req.headers['x-parent-id'] as string;
    }

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        console.log(`[Google Drive Routes] 📤 POST /upload - file: "${fileName}", size: ${fileBuffer.length}`);

        const file = await googleDriveService.uploadFile(organizationId, fileName, mimeType, fileBuffer, parentId, userId);
        res.status(201).json(file);
      } catch (error) {
        console.error('[Google Drive Routes] ❌ Erreur POST /upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
      }
    });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur POST /upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
  }
});

// Renommer un fichier
router.patch('/files/:fileId/rename', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nouveau nom requis' });
    }

    console.log(`[Google Drive Routes] ✏️ PATCH /files/${fileId}/rename - name: "${name}"`);

    const file = await googleDriveService.renameFile(organizationId, fileId, name, userId);
    res.json(file);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur PATCH /files/:fileId/rename:', error);
    res.status(500).json({ error: 'Erreur lors du renommage' });
  }
});

// Déplacer un fichier
router.patch('/files/:fileId/move', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;
    const { newParentId } = req.body;
    if (!newParentId) {
      return res.status(400).json({ error: 'Dossier de destination requis' });
    }

    console.log(`[Google Drive Routes] 📦 PATCH /files/${fileId}/move - to: ${newParentId}`);

    const file = await googleDriveService.moveFile(organizationId, fileId, newParentId, userId);
    res.json(file);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur PATCH /files/:fileId/move:', error);
    res.status(500).json({ error: 'Erreur lors du déplacement' });
  }
});

// Copier un fichier
router.post('/files/:fileId/copy', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;
    const { newName } = req.body;

    console.log(`[Google Drive Routes] 📋 POST /files/${fileId}/copy`);

    const file = await googleDriveService.copyFile(organizationId, fileId, newName, userId);
    res.status(201).json(file);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur POST /files/:fileId/copy:', error);
    res.status(500).json({ error: 'Erreur lors de la copie' });
  }
});

// Obtenir le lien de partage
router.get('/files/:fileId/share', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] 🔗 GET /files/${fileId}/share`);

    const links = await googleDriveService.getShareLink(organizationId, fileId, userId);
    res.json(links);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /files/:fileId/share:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du lien' });
  }
});

// Rendre un fichier public
router.post('/files/:fileId/make-public', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] 🌐 POST /files/${fileId}/make-public`);

    const result = await googleDriveService.makePublic(organizationId, fileId, userId);
    res.json(result);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur POST /files/:fileId/make-public:', error);
    res.status(500).json({ error: 'Erreur lors du partage' });
  }
});

// Fichiers récents
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    console.log(`[Google Drive Routes] 🕐 GET /recent`);

    const files = await googleDriveService.getRecentFiles(organizationId, 50, userId);
    res.json({ files });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /recent:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers récents' });
  }
});

// Fichiers favoris
router.get('/starred', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    console.log(`[Google Drive Routes] ⭐ GET /starred`);

    const files = await googleDriveService.getStarredFiles(organizationId, 50, userId);
    res.json({ files });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /starred:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers favoris' });
  }
});

// Toggle favori
router.patch('/files/:fileId/star', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;
    const { starred } = req.body;

    console.log(`[Google Drive Routes] ⭐ PATCH /files/${fileId}/star - starred: ${starred}`);

    await googleDriveService.toggleStar(organizationId, fileId, starred, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur PATCH /files/:fileId/star:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du favori' });
  }
});

// Corbeille
router.get('/trash', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    console.log(`[Google Drive Routes] 🗑️ GET /trash`);

    const files = await googleDriveService.getTrash(organizationId, 50, userId);
    res.json({ files });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /trash:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la corbeille' });
  }
});

// Restaurer un fichier
router.post('/files/:fileId/restore', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] ♻️ POST /files/${fileId}/restore`);

    await googleDriveService.restoreFile(organizationId, fileId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur POST /files/:fileId/restore:', error);
    res.status(500).json({ error: 'Erreur lors de la restauration' });
  }
});

// Supprimer définitivement
router.delete('/files/:fileId/permanent', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] ❌ DELETE /files/${fileId}/permanent`);

    await googleDriveService.deleteFilePermanently(organizationId, fileId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur DELETE /files/:fileId/permanent:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression définitive' });
  }
});

// Vider la corbeille
router.delete('/trash', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    console.log(`[Google Drive Routes] 🗑️ DELETE /trash`);

    await googleDriveService.emptyTrash(organizationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur DELETE /trash:', error);
    res.status(500).json({ error: 'Erreur lors du vidage de la corbeille' });
  }
});

// URL de téléchargement
router.get('/files/:fileId/download', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { fileId } = req.params;

    console.log(`[Google Drive Routes] ⬇️ GET /files/${fileId}/download`);

    const result = await googleDriveService.getDownloadUrl(organizationId, fileId, userId);
    res.json(result);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur GET /files/:fileId/download:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'URL' });
  }
});

// Créer un document Google
router.post('/create-doc', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organisation non trouvée' });
    }

    const { name, type, parentId } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Nom et type requis' });
    }

    console.log(`[Google Drive Routes] 📄 POST /create-doc - type: ${type}, name: "${name}"`);

    const file = await googleDriveService.createGoogleDoc(organizationId, name, type, parentId || 'root', userId);
    res.status(201).json(file);
  } catch (error) {
    console.error('[Google Drive Routes] ❌ Erreur POST /create-doc:', error);
    res.status(500).json({ error: 'Erreur lors de la création du document' });
  }
});

export default router;
