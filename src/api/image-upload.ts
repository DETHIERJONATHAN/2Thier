/**
 * 🖼️ UPLOAD D'IMAGES - SYSTÈME COMPLET
 * 
 * API endpoint pour uploader des images (logos, photos projets, etc.)
 * Stockage 100% GCS
 * 
 * Pipeline d'optimisation :
 *  - Redimensionnement max 1920px de large
 *  - Conversion JPEG/PNG → WebP (meilleure compression)
 *  - Suppression des métadonnées EXIF (vie privée)
 *  - Qualité 80% (bon compromis taille/qualité)
 */

import { Router } from 'express';
import multer from 'multer';
import { db } from '../lib/database';
import { uploadFile, deleteFile } from '../lib/storage';
import { logger } from '../lib/logger';
import * as sharpModule from 'sharp';

const sharp = (sharpModule as any).default || sharpModule;

const router = Router();
const prisma = db;

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const WEBP_QUALITY = 80;
const JPEG_QUALITY = 82;

/**
 * Optimize an image buffer: resize, strip EXIF, re-encode.
 * SVGs and GIFs are returned as-is (animated content).
 */
async function optimizeImage(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
): Promise<{ buffer: Buffer; mimetype: string; filename: string }> {
  // Skip optimization for SVG and GIF (animated)
  if (mimetype === 'image/svg+xml' || mimetype === 'image/gif') {
    return { buffer, mimetype, filename: originalName };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if larger than max dimensions
    const needsResize = (metadata.width && metadata.width > MAX_WIDTH) ||
                        (metadata.height && metadata.height > MAX_HEIGHT);

    let pipeline = image.rotate(); // Auto-rotate based on EXIF orientation

    if (needsResize) {
      pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for better compression (except for PNG with transparency)
    const hasAlpha = metadata.hasAlpha;
    let outputMime: string;
    let ext: string;

    if (hasAlpha) {
      // Keep PNG for images with transparency, but optimize it  
      pipeline = pipeline.png({ quality: WEBP_QUALITY, compressionLevel: 9 });
      outputMime = 'image/png';
      ext = '.png';
    } else {
      // Convert to WebP for everything else
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
      outputMime = 'image/webp';
      ext = '.webp';
    }

    const optimizedBuffer = await pipeline.toBuffer();

    // Only use optimized version if it's actually smaller
    if (optimizedBuffer.length >= buffer.length) {
      return { buffer, mimetype, filename: originalName };
    }

    const baseName = originalName.replace(/\.[^.]+$/, '');
    const optimizedName = `${baseName}${ext}`;

    logger.info(`🖼️ [IMAGE-OPT] ${originalName}: ${(buffer.length / 1024).toFixed(0)}KB → ${(optimizedBuffer.length / 1024).toFixed(0)}KB (${((1 - optimizedBuffer.length / buffer.length) * 100).toFixed(0)}% savings)`);

    return { buffer: optimizedBuffer, mimetype: outputMime, filename: optimizedName };
  } catch (error) {
    logger.warn(`⚠️ [IMAGE-OPT] Optimization failed for ${originalName}, using original:`, error);
    return { buffer, mimetype, filename: originalName };
  }
}

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

/** Helper: optimize + upload multer file to GCS and return absolute URL */
async function getUploadedFileUrl(file: Express.Multer.File): Promise<{ fileUrl: string; optimizedFile: { buffer: Buffer; mimetype: string; filename: string } }> {
  const optimized = await optimizeImage(file.buffer, file.mimetype, file.originalname);
  const uniqueName = `${Date.now()}_${optimized.filename.replace(/\s+/g, '_')}`;
  const key = `websites/${uniqueName}`;
  const url = await uploadFile(optimized.buffer, key, optimized.mimetype);
  return { fileUrl: url, optimizedFile: optimized };
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

    const { fileUrl, optimizedFile } = await getUploadedFileUrl(req.file);

    res.json({
      success: true,
      message: 'Image uploadée avec succès',
      url: fileUrl,
      fileUrl,
      file: {
        fileName: optimizedFile.filename,
        size: optimizedFile.buffer.length,
        mimetype: optimizedFile.mimetype,
        originalSize: req.file.size,
      }
    });
  } catch (error) {
    logger.error('❌ [IMAGE-UPLOAD] Erreur:', error);
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
    const { fileUrl, optimizedFile } = await getUploadedFileUrl(req.file);

    // Enregistrer dans la BDD (table WebSiteMediaFile)
    const mediaFile = await prisma.webSiteMediaFile.create({
      data: {
        websiteId: parseInt(websiteId),
        fileName: optimizedFile.filename,
        fileType: optimizedFile.mimetype,
        fileUrl,
        filePath: fileUrl,
        fileSize: optimizedFile.buffer.length,
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
    logger.error('❌ Erreur upload image:', error);
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
    logger.error('Erreur récupération images:', error);
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
      logger.warn('Fichier déjà supprimé ou inexistant');
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
    logger.error('Erreur suppression image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
