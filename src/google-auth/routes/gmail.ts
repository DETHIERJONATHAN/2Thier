/**
 * ROUTES GMAIL CENTRALISÉES
 * 
 * Routes pour toutes les opérations Gmail utilisant l'authentification centralisée.
 */

import { Router, Request, Response, NextFunction } from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import {
  getMessages,
  getMessage,
  modifyMessage,
  deleteMessage,
  trashMessage,
  untrashMessage,
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  emptyTrash,
  getAttachment,
  getDrafts,
  saveDraft,
  deleteDraft,
  sendDraft,
  sendMessage // 🆕 Pour envoi direct avec pièces jointes
} from '../controllers/GmailController';

// Middleware Formidable personnalisé pour gros fichiers (alternative robuste à Busboy)
const formidableMiddleware = (req: any, res: Response, next: NextFunction) => {
  console.log('[DEBUG FORMIDABLE] ==================== DÉBUT ANALYSE REQUÊTE ====================');
  console.log('[DEBUG FORMIDABLE] 📥 Headers reçus:', JSON.stringify(req.headers, null, 2));
  console.log('[DEBUG FORMIDABLE] 🎯 Content-Type:', req.headers['content-type']);
  console.log('[DEBUG FORMIDABLE] 📊 Content-Length:', req.headers['content-length']);
  console.log('[DEBUG FORMIDABLE] 🔧 Method:', req.method);
  console.log('[DEBUG FORMIDABLE] 🌐 URL:', req.url);
  console.log('[DEBUG FORMIDABLE] ================== TRANSFERT VERS FORMIDABLE ==================');

  // Skip si pas multipart
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('[DEBUG FORMIDABLE] ⚠️ Pas de multipart/form-data - skip Formidable');
    return next();
  }

  // Configuration Formidable robuste pour gros fichiers
  const form = formidable({
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    maxFields: 50,
    maxFieldsSize: 50 * 1024 * 1024, // 50MB pour les champs
    allowEmptyFiles: false,
    multiples: true,
    keepExtensions: true,
    encoding: 'utf-8',
    uploadDir: path.join(process.cwd(), 'uploads'), // Dossier temporaire
    hashAlgorithm: false, // Pas de hash pour la performance
  });

  // Créer le dossier uploads s'il n'existe pas
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  console.log('[DEBUG FORMIDABLE] 🔧 Configuration Formidable appliquée');
  console.log('[DEBUG FORMIDABLE] 📁 Upload Directory:', uploadDir);

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('[DEBUG FORMIDABLE] ❌ Erreur parsing:', err);
      return res.status(400).json({ 
        error: 'Erreur lors du parsing du formulaire', 
        details: err.message 
      });
    }

    console.log('[DEBUG FORMIDABLE] ✅ Parsing réussi !');
    console.log('[DEBUG FORMIDABLE] 📝 Fields:', Object.keys(fields));
    console.log('[DEBUG FORMIDABLE] 📎 Files:', Object.keys(files));

    // Transformer pour être compatible avec l'API existante
    req.body = {};
    for (const [key, value] of Object.entries(fields)) {
      req.body[key] = Array.isArray(value) ? value[0] : value;
    }

    req.files = {};
    for (const [key, fileArray] of Object.entries(files)) {
      const fileList = Array.isArray(fileArray) ? fileArray : [fileArray];
      req.files[key] = fileList.map((file: any) => ({
        name: file.originalFilename || file.newFilename,
        data: fs.readFileSync(file.filepath), // Lire le fichier en Buffer
        size: file.size,
        mimetype: file.mimetype,
        tempFilePath: file.filepath, // Pour nettoyage ultérieur
      }));
    }

    console.log('[DEBUG FORMIDABLE] 🔄 Données transformées pour compatibilité');
    console.log('[DEBUG FORMIDABLE] ==================== FIN ANALYSE REQUÊTE ====================');

    // Nettoyer les fichiers temporaires après la requête
    res.on('finish', () => {
      for (const [, fileArray] of Object.entries(files)) {
        const fileList = Array.isArray(fileArray) ? fileArray : [fileArray];
        fileList.forEach((file: any) => {
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
            console.log('[DEBUG FORMIDABLE] 🗑️ Fichier temporaire supprimé:', file.filepath);
          }
        });
      }
    });

    next();
  });
};

const router = Router();

// Routes pour les messages
router.get('/messages', getMessages);
router.get('/messages/:id', getMessage);
router.patch('/messages/:id', modifyMessage);
router.delete('/messages/:id', deleteMessage);
router.post('/messages/:id/trash', trashMessage);
router.post('/messages/:id/untrash', untrashMessage);

// Routes pour la corbeille
router.post('/trash/empty', emptyTrash);

// Routes pour les brouillons
router.get('/drafts', getDrafts);
router.post('/drafts', formidableMiddleware, saveDraft); // 🔄 Ajout support pièces jointes avec Formidable
router.delete('/drafts/:id', deleteDraft);
router.post('/drafts/:id/send', sendDraft);

// 🆕 Route d'envoi direct avec support des pièces jointes - NOUVELLE VERSION avec Formidable (plus robuste)
router.post('/send', formidableMiddleware, (req: Request, res: Response, next: NextFunction) => {
  console.log('[ROUTE SEND] 🚀 === DÉBUT TRAITEMENT ROUTE /send (FORMIDABLE) ===');
  
  // Augmenter le timeout pour cette route spécifique
  req.setTimeout(300000); // 5 minutes au lieu du timeout par défaut
  res.setTimeout(300000);
  
  console.log('[ROUTE SEND] ⏰ Timeouts configurés à 5 minutes');
  console.log('[ROUTE SEND] 📝 req.body après Formidable:', req.body);
  console.log('[ROUTE SEND] 📎 req.files après Formidable:', req.files);
  
  // Vérifier si des fichiers ont été uploadés
  if (req.files) {
    console.log('[ROUTE SEND] 📎 Fichiers détectés:');
    Object.keys(req.files).forEach(fieldName => {
      const files = (req.files as any)[fieldName];
      if (Array.isArray(files)) {
        console.log('[ROUTE SEND] 📎', fieldName, ':', files.length, 'fichiers');
        files.forEach((file: any, index: number) => {
          console.log('[ROUTE SEND] 📎   -', index + 1, ':', file.name, '(', file.size, 'bytes)');
        });
      } else {
        console.log('[ROUTE SEND] 📎', fieldName, ':', files.name, '(', files.size, 'bytes)');
      }
    });
  } else {
    console.log('[ROUTE SEND] 📎 Aucun fichier détecté');
  }
  
  console.log('[ROUTE SEND] ✅ Formidable a traité la requête SANS ERREUR');
  console.log('[ROUTE SEND] ✅ Transfert vers sendMessage...');
  
  // Formidable a déjà parsé les données, on peut directement passer au contrôleur
  next();
}, sendMessage);

// Routes pour les labels
router.get('/labels', getLabels);
router.post('/labels', createLabel);
router.patch('/labels/:id', updateLabel);
router.delete('/labels/:id', deleteLabel);

// Routes pour les pièces jointes
router.get('/messages/:messageId/attachments/:attachmentId', getAttachment);

export default router;
