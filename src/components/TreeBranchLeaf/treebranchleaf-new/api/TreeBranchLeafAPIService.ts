/**
 * 🌲 TreeBranchLeaf - Service Client API
 * 
 * Service qui utilise notre API centralisée avec l'authentification CRM
 */

import type { TreeBranchLeafTree, TreeBranchLeafNode } from '../types';
import { TreeBranchLeafAPI } from './TreeBranchLeafAPI';

/**
 * Service client pour TreeBranchLeaf
 * Utilise directement notre API centralisée
 */
export class TreeBranchLeafAPIService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // Trees
  async getTrees(): Promise<TreeBranchLeafTree[]> {
    return TreeBranchLeafAPI.getTrees(this.organizationId);
  }

  async createTree(data: Partial<TreeBranchLeafTree>): Promise<TreeBranchLeafTree> {
    return TreeBranchLeafAPI.createTree({
      ...data,
      organizationId: this.organizationId
    });
  }

  async updateTree(id: string, data: Partial<TreeBranchLeafTree>): Promise<TreeBranchLeafTree | null> {
    return TreeBranchLeafAPI.updateTree(id, data);
  }

  async deleteTree(id: string): Promise<boolean> {
    return TreeBranchLeafAPI.deleteTree(id);
  }

  // Nodes
  async getTreeNodes(treeId: string): Promise<TreeBranchLeafNode[]> {
    return TreeBranchLeafAPI.getTreeNodes(treeId);
  }

  async createNode(treeId: string, data: Partial<TreeBranchLeafNode>): Promise<TreeBranchLeafNode | null> {
    return TreeBranchLeafAPI.createNode(treeId, data);
  }

  async updateNode(nodeId: string, data: Partial<TreeBranchLeafNode>): Promise<TreeBranchLeafNode | null> {
    return TreeBranchLeafAPI.updateNode(nodeId, data);
  }

  async deleteNode(nodeId: string): Promise<boolean> {
    return TreeBranchLeafAPI.deleteNode(nodeId);
  }
}

export default TreeBranchLeafAPIService;
