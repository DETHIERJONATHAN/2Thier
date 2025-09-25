/**
 * 🌲 TreeBranchLeaf Editor Page - NOUVEAU SYSTÈME CENTRALISÉ
 * 
 * Cette page utilise désormais notre nouveau système TreeBranchLeaf centralisé
 * situé dans src/components/TreeBranchLeaf/treebranchleaf-new/
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import TreeBranchLeafWrapper from '../../components/TreeBranchLeaf/treebranchleaf-new/TreeBranchLeafWrapper';

const TreeBranchLeafEditorPage: React.FC = () => {
  const { id: treeId } = useParams<{ id: string }>();
  
  return (
    <TreeBranchLeafWrapper 
      treeId={treeId}
      mode="edit"
    />
  );
};

export default TreeBranchLeafEditorPage;
