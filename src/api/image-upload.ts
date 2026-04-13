/**
 * 🖼️ UPLOAD D'IMAGES - SYSTÈME COMPLET
 * 
 * API endpoint pour uploader des images (logos, photos projets, etc.)
 * Stockage 100% GCS
 */

import { Router } from 'express';
import multer from 'multer';
import { db } from '../lib/database';
import { uploadFile, deleteFile } from '../lib/storage';

const router = Router();
const prisma = db;

// Toujours memoryStorage : tout va sur GCS, zéro local
const multerStorage = multer.memoryStorage();

// Filtre pour n'accepter que les images
const fileFilter = (req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WEBP ou SVG.'));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

/** Helper: upload multer file to GCS and return absolute URL */
async function getUploadedFileUrl(file: Express.Multer.File): Promise<{ fileUrl: string }> {
  const uniqueName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
  const key = `websites/${uniqueName}`;
  const url = await uploadFile(file.buffer, key, file.mimetype);
  return { fileUrl: url };
}

// POST - Upload simple pour documents (sans websiteId requis)
router.post('/upload', upload.single('file'), async (req: unknown, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const { fileUrl } = await getUploadedFileUrl(req.file);

    res.json({
      success: true,
      message: 'Image uploadée avec succès',
      url: fileUrl,
      fileUrl,
      file: {
        fileName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('❌ [IMAGE-UPLOAD] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST - Upload une image
router.post('/upload-image', upload.single('image'), async (req: unknown, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const { websiteId, category = 'general' } = req.body;

    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: 'Website ID manquant'
      });
    }

    // Construire l'URL publique
    const { fileUrl } = await getUploadedFileUrl(req.file);

    // Enregistrer dans la BDD (table WebSiteMediaFile)
    const mediaFile = await prisma.webSiteMediaFile.create({
      data: {
        websiteId: parseInt(websiteId),
        fileName: req.file.originalname,
        fileType: req.file.mimetype, // ✅ CORRECTION: fileType au lieu de mimeType
        fileUrl,
        filePath: fileUrl,
        fileSize: req.file.size,
        category, // 'logo', 'project', 'service', 'general'
        uploadedById: (req as any).user?.id || null
      }
    });

    res.json({
      success: true,
      message: 'Image uploadée avec succès',
      file: {
        id: mediaFile.id,
        fileName: mediaFile.fileName,
        url: fileUrl,
        size: mediaFile.fileSize,
        mimeType: mediaFile.fileType // ✅ CORRECTION: retourne fileType
      }
    });

  } catch (error) {
    console.error('❌ Erreur upload image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload'
    });
  }
});

// GET - Liste des images d'un site
router.get('/images/:websiteId', async (req, res) => {
  try {
    const websiteId = parseInt(req.params.websiteId);
    const { category } = req.query;

    const where: unknown = { websiteId };
    if (category) {
      where.category = category;
    }

    const images = await prisma.webSiteMediaFile.findMany({
      where,
      orderBy: { uploadedAt: 'desc' }
    });

    res.json({
      success: true,
      images
    });

  } catch (error) {
    console.error('Erreur récupération images:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE - Supprimer une image
router.delete('/image/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const mediaFile = await prisma.webSiteMediaFile.findUnique({
      where: { id }
    });

    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        message: 'Image introuvable'
      });
    }

    // Supprimer le fichier de GCS
    try {
      await deleteFile(mediaFile.fileUrl || mediaFile.filePath);
    } catch (err) {
      console.warn('Fichier déjà supprimé ou inexistant');
    }

    // Supprimer de la BDD
    await prisma.webSiteMediaFile.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Image supprimée'
    });

  } catch (error) {
    console.error('Erreur suppression image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
