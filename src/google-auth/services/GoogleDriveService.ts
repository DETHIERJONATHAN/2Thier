/**
 * SERVICE GOOGLE DRIVE - UTILISANT LE MODULE D'AUTHENTIFICATION CENTRALISÉ
 * 
 * Ce service utilise exclusivement le GoogleAuthManager pour obtenir les clients authentifiés.
 * Il ne contient AUCUNE logique d'authentification propre.
 */

import { google, drive_v3 } from 'googleapis';
import { googleAuthManager } from '../index';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  shared?: boolean;
  ownedByMe?: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;

  private constructor() {}

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Obtient une instance de l'API Google Drive pour une organisation
   */
  private async getDriveAPI(organizationId: string): Promise<drive_v3.Drive> {
    console.log(`[GoogleDriveService] 📁 Création instance API Drive pour organisation: ${organizationId}`);
    
    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId);
    if (!authClient) {
      throw new Error('Connexion Google non configurée.');
    }

    return google.drive({ version: 'v3', auth: authClient });
  }

  /**
   * Récupère les fichiers et dossiers du Drive
   */
  async getFiles(
    organizationId: string, 
    folderId: string = 'root',
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    try {
      console.log(`[GoogleDriveService] 🔍 Récupération des fichiers pour folder: ${folderId}`);
      const drive = await this.getDriveAPI(organizationId);

      const query = folderId === 'root' 
        ? "'root' in parents and trashed = false"
        : `'${folderId}' in parents and trashed = false`;

      const response = await drive.files.list({
        q: query,
        pageSize,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared, ownedByMe)',
        orderBy: 'folder, name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        createdTime: file.createdTime || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        shared: file.shared || false,
        ownedByMe: file.ownedByMe || false,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers récupérés`);

      return {
        files,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des fichiers:', error);
      throw error;
    }
  }

  /**
   * Récupère les fichiers partagés avec l'utilisateur
   */
  async getSharedFiles(
    organizationId: string,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    try {
      console.log(`[GoogleDriveService] 🔍 Récupération des fichiers partagés`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.list({
        q: "sharedWithMe = true and trashed = false",
        pageSize,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared, ownedByMe, sharingUser)',
        orderBy: 'folder, modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        createdTime: file.createdTime || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        shared: true,
        ownedByMe: false,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers partagés récupérés`);

      return {
        files,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des fichiers partagés:', error);
      throw error;
    }
  }

  /**
   * Récupère les drives partagés (Team Drives)
   */
  async getSharedDrives(
    organizationId: string,
    pageSize: number = 50
  ): Promise<{ drives: { id: string; name: string }[] }> {
    try {
      console.log(`[GoogleDriveService] 🔍 Récupération des drives partagés`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.drives.list({
        pageSize,
        fields: 'drives(id, name)',
      });

      const drives = (response.data.drives || []).map(d => ({
        id: d.id || '',
        name: d.name || 'Drive partagé',
      }));

      console.log(`[GoogleDriveService] ✅ ${drives.length} drives partagés récupérés`);

      return { drives };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des drives partagés:', error);
      throw error;
    }
  }

  /**
   * Récupère les fichiers d'un Drive partagé (Team Drive)
   */
  async getSharedDriveFiles(
    organizationId: string,
    driveId: string,
    folderId?: string,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    try {
      console.log(`[GoogleDriveService] 🔍 Récupération des fichiers du drive partagé: ${driveId}, folder: ${folderId || 'root'}`);
      const drive = await this.getDriveAPI(organizationId);

      // Si folderId est fourni, on liste les fichiers de ce dossier, sinon la racine du drive
      const parentId = folderId || driveId;
      const query = `'${parentId}' in parents and trashed = false`;

      const response = await drive.files.list({
        q: query,
        pageSize,
        pageToken,
        driveId,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared, ownedByMe)',
        orderBy: 'folder, name',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        createdTime: file.createdTime || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        shared: true,
        ownedByMe: false,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers récupérés du drive partagé`);

      return {
        files,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des fichiers du drive partagé:', error);
      throw error;
    }
  }

  /**
   * Recherche des fichiers dans le Drive
   */
  async searchFiles(
    organizationId: string,
    searchQuery: string,
    pageSize: number = 50
  ): Promise<DriveFile[]> {
    try {
      console.log(`[GoogleDriveService] 🔎 Recherche: "${searchQuery}"`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.list({
        q: `name contains '${searchQuery}' and trashed = false`,
        pageSize,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared)',
        orderBy: 'modifiedTime desc',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        shared: file.shared || false,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers trouvés`);
      return files;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la recherche:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau dossier
   */
  async createFolder(
    organizationId: string,
    name: string,
    parentId: string = 'root'
  ): Promise<DriveFolder> {
    try {
      console.log(`[GoogleDriveService] 📂 Création du dossier: "${name}"`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id, name, mimeType, modifiedTime, webViewLink',
      });

      console.log(`[GoogleDriveService] ✅ Dossier créé: ${response.data.id}`);

      return {
        id: response.data.id || '',
        name: response.data.name || name,
        mimeType: response.data.mimeType || 'application/vnd.google-apps.folder',
        modifiedTime: response.data.modifiedTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la création du dossier:', error);
      throw error;
    }
  }

  /**
   * Supprime un fichier ou dossier (mise à la corbeille)
   */
  async deleteFile(organizationId: string, fileId: string): Promise<boolean> {
    try {
      console.log(`[GoogleDriveService] 🗑️ Suppression du fichier: ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      // Mise à la corbeille plutôt que suppression définitive
      await drive.files.update({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          trashed: true,
        },
      });

      console.log(`[GoogleDriveService] ✅ Fichier mis à la corbeille`);
      return true;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la suppression:', error);
      throw error;
    }
  }

  /**
   * Récupère les informations d'un fichier
   */
  async getFileInfo(organizationId: string, fileId: string): Promise<DriveFile> {
    try {
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared, ownedByMe',
      });

      return {
        id: response.data.id || '',
        name: response.data.name || 'Sans nom',
        mimeType: response.data.mimeType || 'application/octet-stream',
        size: response.data.size || undefined,
        modifiedTime: response.data.modifiedTime || undefined,
        createdTime: response.data.createdTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
        webContentLink: response.data.webContentLink || undefined,
        iconLink: response.data.iconLink || undefined,
        thumbnailLink: response.data.thumbnailLink || undefined,
        parents: response.data.parents || undefined,
        shared: response.data.shared || false,
        ownedByMe: response.data.ownedByMe || false,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des infos:', error);
      throw error;
    }
  }

  /**
   * Récupère les informations de stockage
   */
  async getStorageInfo(organizationId: string): Promise<{
    limit: string;
    usage: string;
    usageInDrive: string;
    usageInTrash: string;
  }> {
    try {
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.about.get({
        fields: 'storageQuota',
      });

      const quota = response.data.storageQuota;

      return {
        limit: quota?.limit || '0',
        usage: quota?.usage || '0',
        usageInDrive: quota?.usageInDrive || '0',
        usageInTrash: quota?.usageInTrash || '0',
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération du stockage:', error);
      throw error;
    }
  }

  /**
   * Upload un fichier vers Google Drive
   */
  async uploadFile(
    organizationId: string,
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer,
    parentId: string = 'root'
  ): Promise<DriveFile> {
    try {
      console.log(`[GoogleDriveService] 📤 Upload du fichier: "${fileName}"`);
      const drive = await this.getDriveAPI(organizationId);

      const { Readable } = await import('stream');
      const stream = Readable.from(fileBuffer);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [parentId],
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink',
      });

      console.log(`[GoogleDriveService] ✅ Fichier uploadé: ${response.data.id}`);

      return {
        id: response.data.id || '',
        name: response.data.name || fileName,
        mimeType: response.data.mimeType || mimeType,
        size: response.data.size || undefined,
        modifiedTime: response.data.modifiedTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
        webContentLink: response.data.webContentLink || undefined,
        iconLink: response.data.iconLink || undefined,
        thumbnailLink: response.data.thumbnailLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de l\'upload:', error);
      throw error;
    }
  }

  /**
   * Renommer un fichier ou dossier
   */
  async renameFile(organizationId: string, fileId: string, newName: string): Promise<DriveFile> {
    try {
      console.log(`[GoogleDriveService] ✏️ Renommer fichier ${fileId} en "${newName}"`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.update({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          name: newName,
        },
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink',
      });

      console.log(`[GoogleDriveService] ✅ Fichier renommé`);

      return {
        id: response.data.id || '',
        name: response.data.name || newName,
        mimeType: response.data.mimeType || '',
        modifiedTime: response.data.modifiedTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors du renommage:', error);
      throw error;
    }
  }

  /**
   * Déplacer un fichier vers un autre dossier
   */
  async moveFile(organizationId: string, fileId: string, newParentId: string): Promise<DriveFile> {
    try {
      console.log(`[GoogleDriveService] 📦 Déplacer fichier ${fileId} vers ${newParentId}`);
      const drive = await this.getDriveAPI(organizationId);

      // D'abord, récupérer les parents actuels
      const file = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'parents',
      });

      const previousParents = file.data.parents?.join(',') || '';

      const response = await drive.files.update({
        fileId,
        supportsAllDrives: true,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, name, mimeType, parents, webViewLink',
      });

      console.log(`[GoogleDriveService] ✅ Fichier déplacé`);

      return {
        id: response.data.id || '',
        name: response.data.name || '',
        mimeType: response.data.mimeType || '',
        parents: response.data.parents || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors du déplacement:', error);
      throw error;
    }
  }

  /**
   * Copier un fichier
   */
  async copyFile(organizationId: string, fileId: string, newName?: string): Promise<DriveFile> {
    try {
      console.log(`[GoogleDriveService] 📋 Copier fichier ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.copy({
        fileId,
        supportsAllDrives: true,
        requestBody: newName ? { name: newName } : {},
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink',
      });

      console.log(`[GoogleDriveService] ✅ Fichier copié: ${response.data.id}`);

      return {
        id: response.data.id || '',
        name: response.data.name || '',
        mimeType: response.data.mimeType || '',
        size: response.data.size || undefined,
        modifiedTime: response.data.modifiedTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la copie:', error);
      throw error;
    }
  }

  /**
   * Obtenir le lien de partage d'un fichier
   */
  async getShareLink(organizationId: string, fileId: string): Promise<{ webViewLink: string; webContentLink?: string }> {
    try {
      console.log(`[GoogleDriveService] 🔗 Obtenir lien de partage pour ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'webViewLink, webContentLink',
      });

      return {
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération du lien:', error);
      throw error;
    }
  }

  /**
   * Rendre un fichier accessible à tous avec un lien
   */
  async makePublic(organizationId: string, fileId: string): Promise<{ webViewLink: string }> {
    try {
      console.log(`[GoogleDriveService] 🌐 Rendre public ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      // Créer une permission "anyone with link"
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
      });

      // Récupérer le lien
      const response = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'webViewLink',
      });

      console.log(`[GoogleDriveService] ✅ Fichier rendu public`);

      return {
        webViewLink: response.data.webViewLink || '',
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors du partage:', error);
      throw error;
    }
  }

  /**
   * Récupérer les fichiers récents
   */
  async getRecentFiles(organizationId: string, pageSize: number = 50): Promise<DriveFile[]> {
    try {
      console.log(`[GoogleDriveService] 🕐 Récupération des fichiers récents`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.list({
        pageSize,
        orderBy: 'viewedByMeTime desc',
        q: 'trashed = false',
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared, viewedByMeTime)',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        shared: file.shared || false,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers récents récupérés`);
      return files;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des fichiers récents:', error);
      throw error;
    }
  }

  /**
   * Récupérer les fichiers favoris (étoilés)
   */
  async getStarredFiles(organizationId: string, pageSize: number = 50): Promise<DriveFile[]> {
    try {
      console.log(`[GoogleDriveService] ⭐ Récupération des fichiers favoris`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.list({
        pageSize,
        q: 'starred = true and trashed = false',
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared, starred)',
        orderBy: 'modifiedTime desc',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        shared: file.shared || false,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers favoris récupérés`);
      return files;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération des fichiers favoris:', error);
      throw error;
    }
  }

  /**
   * Ajouter/retirer un fichier des favoris
   */
  async toggleStar(organizationId: string, fileId: string, starred: boolean): Promise<boolean> {
    try {
      console.log(`[GoogleDriveService] ⭐ ${starred ? 'Ajouter aux' : 'Retirer des'} favoris: ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      await drive.files.update({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          starred,
        },
      });

      console.log(`[GoogleDriveService] ✅ Favori mis à jour`);
      return true;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la mise à jour du favori:', error);
      throw error;
    }
  }

  /**
   * Récupérer les fichiers dans la corbeille
   */
  async getTrash(organizationId: string, pageSize: number = 50): Promise<DriveFile[]> {
    try {
      console.log(`[GoogleDriveService] 🗑️ Récupération de la corbeille`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.list({
        pageSize,
        q: 'trashed = true',
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink, trashedTime)',
        orderBy: 'modifiedTime desc',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || 'Sans nom',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        iconLink: file.iconLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
      }));

      console.log(`[GoogleDriveService] ✅ ${files.length} fichiers dans la corbeille`);
      return files;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération de la corbeille:', error);
      throw error;
    }
  }

  /**
   * Restaurer un fichier de la corbeille
   */
  async restoreFile(organizationId: string, fileId: string): Promise<boolean> {
    try {
      console.log(`[GoogleDriveService] ♻️ Restaurer fichier: ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      await drive.files.update({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          trashed: false,
        },
      });

      console.log(`[GoogleDriveService] ✅ Fichier restauré`);
      return true;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la restauration:', error);
      throw error;
    }
  }

  /**
   * Supprimer définitivement un fichier
   */
  async deleteFilePermanently(organizationId: string, fileId: string): Promise<boolean> {
    try {
      console.log(`[GoogleDriveService] ❌ Suppression définitive: ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      await drive.files.delete({
        fileId,
        supportsAllDrives: true,
      });

      console.log(`[GoogleDriveService] ✅ Fichier supprimé définitivement`);
      return true;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la suppression définitive:', error);
      throw error;
    }
  }

  /**
   * Vider la corbeille
   */
  async emptyTrash(organizationId: string): Promise<boolean> {
    try {
      console.log(`[GoogleDriveService] 🗑️ Vider la corbeille`);
      const drive = await this.getDriveAPI(organizationId);

      await drive.files.emptyTrash();

      console.log(`[GoogleDriveService] ✅ Corbeille vidée`);
      return true;
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors du vidage de la corbeille:', error);
      throw error;
    }
  }

  /**
   * Télécharger un fichier (obtenir l'URL de téléchargement)
   */
  async getDownloadUrl(organizationId: string, fileId: string): Promise<{ downloadUrl: string; fileName: string; mimeType: string }> {
    try {
      console.log(`[GoogleDriveService] ⬇️ Obtenir URL de téléchargement: ${fileId}`);
      const drive = await this.getDriveAPI(organizationId);

      const response = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'name, mimeType, webContentLink',
      });

      // Pour les fichiers Google Docs, on doit exporter
      const googleDocsMimeTypes: { [key: string]: string } = {
        'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };

      const mimeType = response.data.mimeType || '';
      const exportMimeType = googleDocsMimeTypes[mimeType];

      if (exportMimeType) {
        // C'est un fichier Google, il faut l'exporter
        return {
          downloadUrl: `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
          fileName: response.data.name || 'file',
          mimeType: exportMimeType,
        };
      }

      return {
        downloadUrl: response.data.webContentLink || `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        fileName: response.data.name || 'file',
        mimeType,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la récupération de l\'URL:', error);
      throw error;
    }
  }

  /**
   * Créer un document Google (Docs, Sheets, Slides)
   */
  async createGoogleDoc(
    organizationId: string,
    name: string,
    type: 'document' | 'spreadsheet' | 'presentation',
    parentId: string = 'root'
  ): Promise<DriveFile> {
    try {
      console.log(`[GoogleDriveService] 📄 Créer ${type}: "${name}"`);
      const drive = await this.getDriveAPI(organizationId);

      const mimeTypes: { [key: string]: string } = {
        document: 'application/vnd.google-apps.document',
        spreadsheet: 'application/vnd.google-apps.spreadsheet',
        presentation: 'application/vnd.google-apps.presentation',
      };

      const response = await drive.files.create({
        requestBody: {
          name,
          mimeType: mimeTypes[type],
          parents: [parentId],
        },
        fields: 'id, name, mimeType, modifiedTime, webViewLink',
      });

      console.log(`[GoogleDriveService] ✅ ${type} créé: ${response.data.id}`);

      return {
        id: response.data.id || '',
        name: response.data.name || name,
        mimeType: response.data.mimeType || mimeTypes[type],
        modifiedTime: response.data.modifiedTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
      };
    } catch (error) {
      console.error('[GoogleDriveService] ❌ Erreur lors de la création:', error);
      throw error;
    }
  }
}

// Export singleton
export const googleDriveService = GoogleDriveService.getInstance();
