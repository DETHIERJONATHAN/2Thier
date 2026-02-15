/**
 * ============================================================
 *  HOOK: useProductDocuments
 * ============================================================
 *
 *  Hook unifié pour la gestion des fiches techniques produits.
 *  Fonctionne de manière transparente que l'utilisateur soit
 *  Google (Drive) ou Yandex (stockage local CRM).
 *
 *  Usage :
 *    const {
 *      documents, isLoading,
 *      uploadDocument, deleteDocument,
 *      getDocumentsForNode, getDocumentsForDevis,
 *      searchDocuments
 *    } = useProductDocuments();
 * ============================================================
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useStorageProvider } from './useStorageProvider';

export interface ProductDocument {
  id: string;
  nodeId: string;
  organizationId: string;
  uploadedById: string;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  storageType: 'LOCAL' | 'GOOGLE_DRIVE' | 'YANDEX_DISK';
  localPath: string | null;
  driveFileId: string | null;
  driveUrl: string | null;
  externalUrl: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  node?: {
    id: string;
    label: string;
    parentId?: string;
  };
}

export type DocumentCategory = 'fiche_technique' | 'certification' | 'garantie' | 'notice';

export const DOCUMENT_CATEGORIES: { key: DocumentCategory; label: string; icon: string }[] = [
  { key: 'fiche_technique', label: 'Fiche technique', icon: '📋' },
  { key: 'certification', label: 'Certification', icon: '✅' },
  { key: 'garantie', label: 'Garantie', icon: '🛡️' },
  { key: 'notice', label: 'Notice d\'installation', icon: '📖' },
];

export const useProductDocuments = () => {
  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const { provider, isLoading: providerLoading } = useStorageProvider();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      console.error('[useProductDocuments] ❌', err);
      setError(err.message || 'Erreur');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Récupérer les documents d'un nœud ──────────────────

  const getDocumentsForNode = useCallback(async (nodeId: string): Promise<ProductDocument[]> => {
    const result = await handleApiCall(async () => {
      const response = await apiRef.current.get(`/api/product-documents/node/${nodeId}`);
      const data = response?.data || response;
      return data?.documents || [];
    });
    return result || [];
  }, [handleApiCall]);

  // ─── Récupérer les documents pour un devis ─────────────

  const getDocumentsForDevis = useCallback(async (nodeIds: string[]): Promise<{
    documents: ProductDocument[];
    grouped: Record<string, ProductDocument[]>;
  }> => {
    const result = await handleApiCall(async () => {
      const response = await apiRef.current.post('/api/product-documents/for-devis', { nodeIds });
      const data = response?.data || response;
      return { documents: data?.documents || [], grouped: data?.grouped || {} };
    });
    return result || { documents: [], grouped: {} };
  }, [handleApiCall]);

  // ─── Upload d'un document ──────────────────────────────

  const uploadDocument = useCallback(async (
    file: File,
    nodeIds: string[],
    name?: string,
    category: DocumentCategory = 'fiche_technique',
    tableRowIds?: string[],
    parentNodeId?: string
  ): Promise<ProductDocument | null> => {
    const storageType: string = provider === 'google_drive' ? 'GOOGLE_DRIVE' : 'LOCAL';

    const formData = new FormData();
    formData.append('file', file);
    // Mode enfants classiques
    nodeIds.forEach(id => formData.append('nodeIds', id));
    // Mode lookup (lignes de table)
    if (tableRowIds && tableRowIds.length > 0) {
      tableRowIds.forEach(id => formData.append('tableRowIds', id));
    }
    if (parentNodeId) formData.append('parentNodeId', parentNodeId);
    formData.append('category', category);
    formData.append('storageType', storageType);
    if (name) formData.append('name', name);

    const result = await handleApiCall(async () => {
      const response = await apiRef.current.post('/api/product-documents/upload', formData);
      const data = response?.data || response;
      return data?.document || null;
    });
    return result;
  }, [handleApiCall, provider]);

  // ─── Upload via URL ────────────────────────────────────

  const uploadDocumentUrl = useCallback(async (
    nodeIds: string[],
    url: string,
    name?: string,
    category: DocumentCategory = 'fiche_technique',
    tableRowIds?: string[],
    parentNodeId?: string
  ): Promise<ProductDocument | null> => {
    const result = await handleApiCall(async () => {
      const response = await apiRef.current.post('/api/product-documents/upload-url', {
        nodeIds, url, name, category,
        ...(tableRowIds && tableRowIds.length > 0 ? { tableRowIds } : {}),
        ...(parentNodeId ? { parentNodeId } : {})
      });
      const data = response?.data || response;
      return data?.document || null;
    });
    return result;
  }, [handleApiCall]);

  // ─── Supprimer un document ─────────────────────────────

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    const result = await handleApiCall(async () => {
      await apiRef.current.delete(`/api/product-documents/${documentId}`);
      return true;
    });
    return result ?? false;
  }, [handleApiCall]);

  // ─── Rechercher des documents ──────────────────────────

  const searchDocuments = useCallback(async (
    query?: string,
    category?: string,
    page = 1,
    limit = 20
  ): Promise<{ documents: ProductDocument[]; total: number; totalPages: number }> => {
    const result = await handleApiCall(async () => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const response = await apiRef.current.get(`/api/product-documents/search?${params.toString()}`);
      const data = response?.data || response;
      return {
        documents: data?.documents || [],
        total: data?.pagination?.total || 0,
        totalPages: data?.pagination?.totalPages || 0
      };
    });
    return result || { documents: [], total: 0, totalPages: 0 };
  }, [handleApiCall]);

  // ─── Obtenir l'URL de téléchargement ───────────────────

  const getDownloadUrl = useCallback(async (documentId: string): Promise<string | null> => {
    const result = await handleApiCall(async () => {
      const response = await apiRef.current.get(`/api/product-documents/${documentId}/download`);
      const data = response?.data || response;
      return data?.url || null;
    });
    return result;
  }, [handleApiCall]);

  // ─── Nœuds avec documents ─────────────────────────────

  const getNodesWithDocuments = useCallback(async (fieldId?: string): Promise<{
    nodeId: string;
    count: number;
    node?: { id: string; label: string };
  }[]> => {
    const result = await handleApiCall(async () => {
      const params = fieldId ? `?fieldId=${fieldId}` : '';
      const response = await apiRef.current.get(`/api/product-documents/nodes/with-documents${params}`);
      const data = response?.data || response;
      return data?.nodesWithDocuments || [];
    });
    return result || [];
  }, [handleApiCall]);

  return useMemo(() => ({
    // État
    isLoading: isLoading || providerLoading,
    error,
    provider,

    // Actions
    getDocumentsForNode,
    getDocumentsForDevis,
    uploadDocument,
    uploadDocumentUrl,
    deleteDocument,
    searchDocuments,
    getDownloadUrl,
    getNodesWithDocuments,

    // Constantes
    categories: DOCUMENT_CATEGORIES
  }), [
    isLoading, providerLoading, error, provider,
    getDocumentsForNode, getDocumentsForDevis,
    uploadDocument, uploadDocumentUrl, deleteDocument,
    searchDocuments, getDownloadUrl, getNodesWithDocuments
  ]);
};
