// Routes API pour toutes les intégrations Google Workspace
import express from 'express';
import GoogleAppsService from '../services/GoogleAppsService';

const router = express.Router();
const googleAppsService = new GoogleAppsService();

// **GMAIL ROUTES**
router.get('/gmail/threads/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await googleAppsService.getGmailThreads(email);
    res.json(result);
  } catch (error) {
    console.error('Erreur Gmail threads:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des emails' });
  }
});

router.post('/gmail/send', async (req, res) => {
  try {
    const { to, subject, body, context } = req.body;
    const result = await googleAppsService.sendGmailEmail(to, subject, body, context);
    res.json(result);
  } catch (error) {
    console.error('Erreur envoi Gmail:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
  }
});

// **CALENDAR ROUTES**
router.get('/calendar/events', async (req, res) => {
  try {
    const { attendee } = req.query;
    const result = await googleAppsService.getCalendarEvents(attendee as string);
    res.json(result);
  } catch (error) {
    console.error('Erreur Calendar events:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des événements' });
  }
});

router.post('/calendar/events', async (req, res) => {
  try {
    const eventData = req.body;
    const result = await googleAppsService.createCalendarEvent(eventData);
    res.json(result);
  } catch (error) {
    console.error('Erreur création Calendar event:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
  }
});

// **DRIVE ROUTES**
router.get('/drive/files', async (req, res) => {
  try {
    const { leadId } = req.query;
    const result = await googleAppsService.getDriveFiles(leadId as string);
    res.json(result);
  } catch (error) {
    console.error('Erreur Drive files:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des fichiers' });
  }
});

router.post('/drive/upload', async (req, res) => {
  try {
    // Ici on gérerait l'upload de fichier avec multer
    // Pour la démo, on simule
    const { leadId, folderName } = req.body;
    res.json({ 
      success: true, 
      message: 'Upload simulé - intégration avec multer nécessaire' 
    });
  } catch (error) {
    console.error('Erreur Drive upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

router.post('/drive/share', async (req, res) => {
  try {
    const { fileId, email, permission, context } = req.body;
    const result = await googleAppsService.shareDriveFile(fileId, email, permission, context);
    res.json(result);
  } catch (error) {
    console.error('Erreur Drive share:', error);
    res.status(500).json({ error: 'Erreur lors du partage' });
  }
});

// **DOCS ROUTES**
router.get('/docs/list', async (req, res) => {
  try {
    const { leadId } = req.query;
    // Pour la démo, retourner des documents simulés
    res.json({
      documents: [
        {
          id: '1',
          name: `Proposition_Lead_${leadId}`,
          webViewLink: 'https://docs.google.com/document/d/1/edit',
          lastModified: new Date().toISOString(),
          shared: true,
          wordCount: 1250,
          owner: 'moi@monentreprise.be',
          collaborators: ['lead@example.com']
        }
      ]
    });
  } catch (error) {
    console.error('Erreur Docs list:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des documents' });
  }
});

router.post('/docs/create', async (req, res) => {
  try {
    const docData = req.body;
    const result = await googleAppsService.createGoogleDoc(docData);
    res.json(result);
  } catch (error) {
    console.error('Erreur Docs create:', error);
    res.status(500).json({ error: 'Erreur lors de la création du document' });
  }
});

router.post('/docs/share', async (req, res) => {
  try {
    const { documentId, email, permission, context } = req.body;
    const result = await googleAppsService.shareDriveFile(documentId, email, permission, context);
    res.json(result);
  } catch (error) {
    console.error('Erreur Docs share:', error);
    res.status(500).json({ error: 'Erreur lors du partage du document' });
  }
});

router.post('/docs/duplicate', async (req, res) => {
  try {
    const { originalDocumentId, newName, leadId, context } = req.body;
    // Simulation de duplication
    res.json({ 
      success: true, 
      documentId: 'new_doc_id',
      message: 'Document dupliqué avec succès' 
    });
  } catch (error) {
    console.error('Erreur Docs duplicate:', error);
    res.status(500).json({ error: 'Erreur lors de la duplication' });
  }
});

// **SHEETS ROUTES**
router.get('/sheets/list', async (req, res) => {
  try {
    const { leadId } = req.query;
    // Pour la démo, retourner des feuilles simulées
    res.json({
      sheets: [
        {
          id: '1',
          name: `Suivi_Lead_${leadId}`,
          webViewLink: 'https://docs.google.com/spreadsheets/d/1/edit',
          lastModified: new Date().toISOString(),
          shared: true,
          sheetCount: 3,
          owner: 'moi@monentreprise.be'
        }
      ]
    });
  } catch (error) {
    console.error('Erreur Sheets list:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des feuilles' });
  }
});

router.post('/sheets/create', async (req, res) => {
  try {
    const sheetData = req.body;
    const result = await googleAppsService.createGoogleSheet(sheetData);
    res.json(result);
  } catch (error) {
    console.error('Erreur Sheets create:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la feuille' });
  }
});

router.get('/sheets/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    // Simulation de données de feuille
    res.json({
      data: [
        { Date: '2024-01-15', Action: 'Appel téléphonique', Statut: 'Complété', Notes: 'Premier contact établi' },
        { Date: '2024-01-16', Action: 'Email envoyé', Statut: 'En attente', Notes: 'Proposition commerciale' },
        { Date: '2024-01-17', Action: 'RDV planifié', Statut: 'À venir', Notes: 'Présentation produits' }
      ]
    });
  } catch (error) {
    console.error('Erreur Sheets data:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des données' });
  }
});

router.post('/sheets/share', async (req, res) => {
  try {
    const { sheetId, email, permission, context } = req.body;
    const result = await googleAppsService.shareDriveFile(sheetId, email, permission, context);
    res.json(result);
  } catch (error) {
    console.error('Erreur Sheets share:', error);
    res.status(500).json({ error: 'Erreur lors du partage de la feuille' });
  }
});

// **MEET ROUTES**
router.get('/meet/events', async (req, res) => {
  try {
    const { leadId } = req.query;
    // Pour la démo, retourner des événements Meet simulés
    res.json({
      meetings: [
        {
          id: '1',
          title: 'Présentation commerciale',
          meetLink: 'https://meet.google.com/abc-defg-hij',
          startTime: new Date(Date.now() + 7200000).toISOString(), // +2h
          endTime: new Date(Date.now() + 10800000).toISOString(), // +3h
          status: 'upcoming',
          attendees: ['lead@example.com', 'moi@monentreprise.be']
        }
      ]
    });
  } catch (error) {
    console.error('Erreur Meet events:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des réunions' });
  }
});

router.post('/meet/create', async (req, res) => {
  try {
    const meetData = req.body;
    const result = await googleAppsService.createMeetEvent(meetData);
    res.json({
      ...result,
      meetId: result.eventId,
      meetLink: result.meetLink || `https://meet.google.com/generated-${Date.now()}`
    });
  } catch (error) {
    console.error('Erreur Meet create:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la réunion' });
  }
});

export default router;
