/**
 * 🖼️ UPLOAD D'IMAGES - SYSTÈME COMPLET
 * 
 * API endpoint pour uploader des images (logos, photos projets, etc.)
 * Stockage local ou S3
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { db } from '../lib/database';
import { uploadFile } from '../lib/storage';

const router = Router();
const prisma = db;

const isProduction = process.env.NODE_ENV === 'production';

// Configuration Multer : memoryStorage en prod (pour GCS), diskStorage en dev
const multerStorage = isProduction
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'websites');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        cb(null, uniqueName);
      }
    });

// Filtre pour n'accepter que les images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

/** Helper: get URL from multer file — delegates to storage module in prod */
async function getUploadedFileUrl(file: Express.Multer.File): Promise<{ fileUrl: string }> {
  const uniqueName = `${Date.now()}_${file.originalname.replace(/\\s+/g, '_')}`;
  if (isProduction) {
    const key = `websites/${uniqueName}`;
    const url = await uploadFile(file.buffer, key, file.mimetype);
    return { fileUrl: url };
  }
  return { fileUrl: `/uploads/websites/${file.filename}` };
}

// POST - Upload simple pour documents (sans websiteId requis)
router.post('/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    console.log('📸 [IMAGE-UPLOAD] Fichier reçu:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    const { fileUrl } = await getUploadedFileUrl(req.file);

    console.log('📸 ✅ Upload réussi:', {
      fileName: req.file.originalname,
      url: fileUrl,
      size: `${(req.file.size / 1024).toFixed(2)} KB`
    });

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
router.post('/upload-image', upload.single('image'), async (req: any, res) => {
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

    console.log('📸 ✅ Image uploadée:', {
      id: mediaFile.id,
      fileName: mediaFile.fileName,
      url: fileUrl,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      category
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

    const where: any = { websiteId };
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

    // Supprimer le fichier physique
    try {
      await fs.unlink(mediaFile.filePath);
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
