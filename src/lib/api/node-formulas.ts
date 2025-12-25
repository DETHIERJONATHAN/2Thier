// API pour gérer les formules de nœuds dans la table dédiée TreeBranchLeafNodeFormula

import { db } from '../database';

const prisma = db;

export interface NodeFormula {
  id: string;
  nodeId: string;
  organizationId?: string;
  name: string;
  tokens: string[];
  description?: string;
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Récupère toutes les formules d'un nœud
 */
export async function getNodeFormulas(nodeId: string): Promise<NodeFormula[]> {
  try {
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      orderBy: { order: 'asc' }
    });
    
    return formulas.map(f => ({
      ...f,
      tokens: Array.isArray(f.tokens) ? f.tokens as string[] : []
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des formules:', error);
    return [];
  }
}

/**
 * Sauvegarde ou met à jour une formule
 */
export async function saveNodeFormula(formula: Omit<NodeFormula, 'createdAt' | 'updatedAt'>): Promise<NodeFormula | null> {
  try {
    const saved = await prisma.treeBranchLeafNodeFormula.upsert({
      where: {
        nodeId_name: {
          nodeId: formula.nodeId,
          name: formula.name
        }
      },
      create: {
        id: formula.id,
        nodeId: formula.nodeId,
        organizationId: formula.organizationId,
        name: formula.name,
        tokens: formula.tokens as unknown as Record<string, unknown>,
        description: formula.description,
        isDefault: formula.isDefault,
        order: formula.order
      },
      update: {
        tokens: formula.tokens as unknown as Record<string, unknown>,
        description: formula.description,
        isDefault: formula.isDefault,
        order: formula.order
      }
    });
    
    return {
      ...saved,
      tokens: Array.isArray(saved.tokens) ? saved.tokens as string[] : []
    };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la formule:', error);
    return null;
  }
}

/**
 * Supprime une formule
 */
export async function deleteNodeFormula(nodeId: string, name: string): Promise<boolean> {
  try {
    await prisma.treeBranchLeafNodeFormula.delete({
      where: {
        nodeId_name: {
          nodeId,
          name
        }
      }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la formule:', error);
    return false;
  }
}

/**
 * Supprime toutes les formules d'un nœud
 */
export async function deleteAllNodeFormulas(nodeId: string): Promise<boolean> {
  try {
    await prisma.treeBranchLeafNodeFormula.deleteMany({
      where: { nodeId }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression des formules:', error);
    return false;
  }
}

/**
 * Met à jour l'ordre des formules
 */
export async function updateFormulasOrder(formulas: { id: string; order: number }[]): Promise<boolean> {
  try {
    for (const formula of formulas) {
      await prisma.treeBranchLeafNodeFormula.update({
        where: { id: formula.id },
        data: { order: formula.order }
      });
    }
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'ordre:', error);
    return false;
  }
}
