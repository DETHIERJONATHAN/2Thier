/**
 * 🌲 TreeBranchLeaf - Connexion au nouveau système V2
 * 
 * Ce fichier fait le pont entre l'ancien routage et le nouveau système
 * TreeBranchLeaf V2 centralisé dans treebranchleaf-new/
 */

import React from 'react';
import TreeBranchLeafWrapper from '../../components/TreeBranchLeaf/treebranchleaf-new/TreeBranchLeafWrapper';

const TreeBranchLeafWrapperFixed: React.FC = () => {
  return <TreeBranchLeafWrapper mode="edit" />;
};

export default TreeBranchLeafWrapperFixed;
