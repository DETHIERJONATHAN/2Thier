# 🛠️ EXEMPLES CONCRETS D'INTÉGRATION

## 📝 EXEMPLE COMPLET : GOOGLE DRIVE SERVICE

Voici un exemple complet de création d'un nouveau service Google Drive qui s'intègre parfaitement au système centralisé.

### 1️⃣ Service Google Drive

```typescript
// src/google-auth/services/GoogleDriveService.ts

import { google, drive_v3 } from 'googleapis';
import { googleAuthManager } from '../core/GoogleAuthManager';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive;

  constructor(drive: drive_v3.Drive) {
    this.drive = drive;
  }

  /**
   * 🔑 PATTERN OBLIGATOIRE : Création via GoogleAuthManager
   */
  static async create(organizationId: string): Promise<GoogleDriveService | null> {
    console.log(`[GoogleDriveService] Création du service pour l'organisation: ${organizationId}`);
    
    // ⚡ UTILISATION DU SYSTÈME CENTRALISÉ
    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId);
    if (!authClient) {
      console.error(`[GoogleDriveService] Impossible d'obtenir le client authentifié pour l'organisation: ${organizationId}`);
      return null;
    }

    const drive = google.drive({ version: 'v3', auth: authClient });
    return new GoogleDriveService(drive);
  }

  /**
   * Récupère la liste des fichiers
   */
  async getFiles(options: {
    maxResults?: number;
    q?: string;
    pageToken?: string;
  } = {}): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    try {
      const response = await this.drive.files.list({
        pageSize: options.maxResults || 10,
        q: options.q,
        pageToken: options.pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)'
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size,
        createdTime: file.createdTime!,
        modifiedTime: file.modifiedTime!
      }));

      console.log(`[GoogleDriveService] ${files.length} fichiers récupérés`);

      return {
        files,
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('[GoogleDriveService] Erreur lors de la récupération des fichiers:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau dossier
   */
  async createFolder(name: string, parentId?: string): Promise<DriveFile | null> {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined
        },
        fields: 'id, name, mimeType, createdTime, modifiedTime'
      });

      if (response.data) {
        console.log(`[GoogleDriveService] Dossier "${name}" créé avec l'ID: ${response.data.id}`);
        return {
          id: response.data.id!,
          name: response.data.name!,
          mimeType: response.data.mimeType!,
          createdTime: response.data.createdTime!,
          modifiedTime: response.data.modifiedTime!
        };
      }
      return null;
    } catch (error) {
      console.error(`[GoogleDriveService] Erreur lors de la création du dossier "${name}":`, error);
      return null;
    }
  }
}
```

### 2️⃣ Contrôleur Google Drive

```typescript
// src/google-auth/controllers/DriveController.ts

import { Request, Response } from 'express';
import { GoogleDriveService } from '../services/GoogleDriveService';

// 🔑 INTERFACE OBLIGATOIRE
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    organizationId?: string;
  };
}

/**
 * 📁 Récupère les fichiers Drive
 */
export const getFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ⚡ PATTERN OBLIGATOIRE : Organization ID depuis les headers
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID manquant' });
    }

    // ⚡ CRÉATION DU SERVICE VIA LE SYSTÈME CENTRALISÉ
    const driveService = await GoogleDriveService.create(organizationId);
    if (!driveService) {
      return res.status(500).json({ error: 'Impossible de créer le service Drive' });
    }

    const { maxResults = 20, q, pageToken } = req.query;

    const result = await driveService.getFiles({
      maxResults: Number(maxResults),
      q: q as string,
      pageToken: pageToken as string
    });

    // ⚡ RETOUR DIRECT POUR COMPATIBILITÉ FRONTEND
    res.json(result);
  } catch (error) {
    console.error('[Drive Controller] Erreur getFiles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers' });
  }
};

/**
 * 📁 Crée un nouveau dossier
 */
export const createFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID manquant' });
    }

    const { name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nom du dossier requis' });
    }

    const driveService = await GoogleDriveService.create(organizationId);
    if (!driveService) {
      return res.status(500).json({ error: 'Impossible de créer le service Drive' });
    }

    const folder = await driveService.createFolder(name, parentId);
    if (!folder) {
      return res.status(500).json({ error: 'Erreur lors de la création du dossier' });
    }

    res.json(folder);
  } catch (error) {
    console.error('[Drive Controller] Erreur createFolder:', error);
    res.status(500).json({ error: 'Erreur lors de la création du dossier' });
  }
};
```

### 3️⃣ Routes Google Drive

```typescript
// src/google-auth/routes/driveRoutes.ts

import express from 'express';
import { authenticateToken } from '../../middleware/auth';
import * as driveController from '../controllers/DriveController';

const router = express.Router();

console.log('🚀 [Routes Drive] Chargement des routes Google Drive avec authentification centralisée');

// ⚡ MIDDLEWARE OBLIGATOIRE
router.use(authenticateToken);

// 📁 Routes Google Drive
router.get('/files', driveController.getFiles);
router.post('/folders', driveController.createFolder);
// Ajoutez d'autres routes selon vos besoins...

export default router;
```

### 4️⃣ Intégration dans le serveur principal

```typescript
// src/api-server.ts

// ⚡ IMPORTER VOS ROUTES
import driveRoutes from './google-auth/routes/driveRoutes';

// ⚡ MONTER VOS ROUTES
app.use('/drive', driveRoutes);
console.log('[ROUTER] Routes Google Drive montées sur /drive');
```

### 5️⃣ Mise à jour des exports

```typescript
// src/google-auth/index.ts

// ⚡ AJOUTER VOS EXPORTS
export { GoogleDriveService } from './services/GoogleDriveService';
export * from './controllers/DriveController';
```

---

## 📱 UTILISATION CÔTÉ FRONTEND

### Hook personnalisé pour Google Drive

```typescript
// src/hooks/useDriveService.ts

import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useState, useCallback } from 'react';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

export const useDriveService = () => {
  const { api } = useAuthenticatedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFiles = useCallback(async (options: {
    maxResults?: number;
    q?: string;
    pageToken?: string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // ⚡ UTILISATION DU SYSTÈME CENTRALISÉ
      const response = await api.get('/drive/files', { params: options });
      console.log('[useDriveService] Fichiers récupérés:', response);
      return response;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erreur lors de la récupération des fichiers');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const createFolder = useCallback(async (name: string, parentId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/drive/folders', { name, parentId });
      console.log('[useDriveService] Dossier créé:', response);
      return response;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erreur lors de la création du dossier');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  return {
    getFiles,
    createFolder,
    isLoading,
    error
  };
};
```

### Composant React utilisant le service

```typescript
// src/pages/GoogleDrivePage.tsx

import React, { useState, useEffect } from 'react';
import { Button, List, Input, message } from 'antd';
import { useDriveService, DriveFile } from '../hooks/useDriveService';

const GoogleDrivePage: React.FC = () => {
  const { getFiles, createFolder, isLoading, error } = useDriveService();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [newFolderName, setNewFolderName] = useState('');

  // ⚡ CHARGEMENT INITIAL
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const result = await getFiles({ maxResults: 50 });
      setFiles(result.files || []);
    } catch (error) {
      message.error('Erreur lors du chargement des fichiers');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      message.warning('Veuillez saisir un nom de dossier');
      return;
    }

    try {
      await createFolder(newFolderName);
      message.success('Dossier créé avec succès');
      setNewFolderName('');
      loadFiles(); // Recharger la liste
    } catch (error) {
      message.error('Erreur lors de la création du dossier');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>📁 Google Drive</h1>
      
      {/* Création de dossier */}
      <div style={{ marginBottom: '20px' }}>
        <Input
          placeholder="Nom du nouveau dossier"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          style={{ width: '300px', marginRight: '10px' }}
        />
        <Button 
          type="primary" 
          onClick={handleCreateFolder}
          loading={isLoading}
        >
          Créer dossier
        </Button>
      </div>

      {/* Liste des fichiers */}
      <List
        loading={isLoading}
        dataSource={files}
        renderItem={(file) => (
          <List.Item key={file.id}>
            <List.Item.Meta
              title={file.name}
              description={`Type: ${file.mimeType} - Modifié: ${new Date(file.modifiedTime).toLocaleDateString()}`}
            />
          </List.Item>
        )}
      />

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Erreur: {error}
        </div>
      )}
    </div>
  );
};

export default GoogleDrivePage;
```

---

## 🎯 CHECKLIST DE VALIDATION

Avant de déployer votre nouveau service, vérifiez :

### ✅ **Côté Service**
- [ ] Utilise `googleAuthManager.getAuthenticatedClient(organizationId)`
- [ ] Méthode `static async create(organizationId)` implémentée
- [ ] Gestion d'erreurs avec try/catch
- [ ] Logs informatifs avec `console.log`

### ✅ **Côté Contrôleur**
- [ ] Récupère `organizationId` depuis `req.headers['x-organization-id']`
- [ ] Vérifie que `organizationId` n'est pas undefined
- [ ] Utilise le service via `await Service.create(organizationId)`
- [ ] Retourne les données directement avec `res.json(result)`

### ✅ **Côté Routes**
- [ ] Utilise `authenticateToken` middleware
- [ ] Routes montées dans le serveur principal
- [ ] Logs de confirmation du montage

### ✅ **Côté Frontend**
- [ ] Utilise `useAuthenticatedApi` hook
- [ ] Gestion d'erreurs appropriée
- [ ] États de chargement affichés

---

## 🚀 RÉSULTAT FINAL

Après avoir suivi ce guide, vous devriez avoir :

1. **Un service Google fonctionnel** utilisant l'authentification centralisée
2. **Des contrôleurs Express** qui gèrent les organizations correctement
3. **Des routes sécurisées** avec middleware d'authentification
4. **Un frontend React** qui communique via `useAuthenticatedApi`
5. **Un système qui respecte l'architecture sanctuarisée**

**Et surtout : VOTRE CODE S'ADAPTE AU SYSTÈME, PAS L'INVERSE !** 🔒
