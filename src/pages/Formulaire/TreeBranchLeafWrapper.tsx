import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import useCRMStore from '../../store';
import FormulaireLayout from './FormulaireLayout';
import { logger } from '../../lib/logger';

interface TreeBranchLeafNode {
  id: string;
  name: string;
  type?: string;
  label?: string;
  Parent?: string;
  Children?: TreeBranchLeafNode[];
}

const TreeBranchLeafWrapper: React.FC = () => {
  const { id: treeId } = useParams<{ id: string }>();
  const { api } = useAuthenticatedApi();
  const { setBlocks } = useCRMStore();

  useEffect(() => {
    const loadTreeBranchLeafAsBlock = async () => {
      if (!treeId) return;

      try {
        logger.debug('🔄 [TreeBranchLeafWrapper] Chargement de l\'arbre:', treeId);
        
        const response = await api.get(`/api/treebranchleaf-v2/trees/${treeId}`);
        logger.debug('✅ [TreeBranchLeafWrapper] Arbre reçu:', response);

        // Transformer l'arbre TreeBranchLeaf en format Block pour FormulaireLayout
        const adaptedBlock = {
          id: response.id,
          name: response.name || 'Arbre TreeBranchLeaf',
          description: response.description,
          sections: [{
            id: 'tree-nodes',
            name: 'Nœuds de l\'arbre',
            order: 0,
            fields: (response.Nodes || []).map((node: TreeBranchLeafNode, index: number) => ({
              id: node.id,
              label: node.label,
              type: node.type || 'text',
              subType: node.subType,
              order: index,
              required: node.isRequired || false,
              width: '1/1',
              sectionId: 'tree-nodes',
              description: node.description,
              value: node.value,
              fieldConfig: node.fieldConfig,
              conditionConfig: node.conditionConfig,
              formulaConfig: node.formulaConfig,
              // Autres propriétés TreeBranchLeaf
              nodeType: node.type,
              nodeSubType: node.subType,
              isVisible: node.isVisible,
              isActive: node.isActive,
              parentId: node.parentId,
              markerLinks: node.MarkerLinks,
            }))
          }]
        };

        logger.debug('🔄 [TreeBranchLeafWrapper] Bloc adapté:', adaptedBlock);

        // Injecter le bloc adapté dans le store CRM
        setBlocks([adaptedBlock]);

      } catch (error) {
        logger.error('❌ [TreeBranchLeafWrapper] Erreur:', error);
      }
    };

    loadTreeBranchLeafAsBlock();
  }, [treeId, api, setBlocks]);

  // Utiliser FormulaireLayout tel quel avec les données adaptées
  return <FormulaireLayout />;
};

export default TreeBranchLeafWrapper;
