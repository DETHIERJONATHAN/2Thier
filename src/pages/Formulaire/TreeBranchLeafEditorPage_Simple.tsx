import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Button } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title } = Typography;

interface TreeData {
  id: string;
  name: string;
  description?: string;
}

const TreeBranchLeafEditorPageSimple: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuthenticatedApi();
  const [tree, setTree] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        console.log('[DEBUG] Starting fetchTree with ID:', id);
        console.log('[DEBUG] API object:', api);
        
        if (!id) {
          throw new Error('No ID provided');
        }

        console.log('[DEBUG] Making API call to:', `/treebranchleaf-v2/trees/${id}`);
        const response = await api.get(`/treebranchleaf-v2/trees/${id}`);
        console.log('[DEBUG] Raw API response:', response);
        console.log('[DEBUG] Response type:', typeof response);
        console.log('[DEBUG] Response keys:', Object.keys(response || {}));
        
        setTree(response);
      } catch (error) {
        console.error('[ERROR] Failed to fetch tree:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    console.log('[DEBUG] useEffect triggered, ID:', id);
    if (id) {
      fetchTree();
    } else {
      setLoading(false);
      setError('No tree ID provided');
    }
  }, [id, api]);

  console.log('[DEBUG] Render state:', { loading, tree, error, id });

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <Title level={2}>Chargement...</Title>
          <p>ID de l'arbre: {id}</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <Title level={2}>Erreur</Title>
          <p><strong>ID:</strong> {id}</p>
          <p><strong>Erreur:</strong> {error}</p>
          <p>Vérifiez la console pour plus de détails.</p>
        </Card>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="p-6">
        <Card>
          <Title level={2}>Arbre non trouvé</Title>
          <p>L'arbre avec l'ID {id} n'a pas pu être chargé.</p>
          <p>Vérifiez la console pour plus de détails.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <Title level={2}>Éditeur TreeBranchLeaf - Version Simple</Title>
        <p><strong>ID:</strong> {tree.id}</p>
        <p><strong>Nom:</strong> {tree.name}</p>
        <p><strong>Description:</strong> {tree.description || 'Aucune description'}</p>
        <Button type="primary">
          Cette page fonctionne ! Vous devriez voir les 3 colonnes ici.
        </Button>
      </Card>
    </div>
  );
};

export default TreeBranchLeafEditorPageSimple;
