import { PrismaClient, OperationSource } from '@prisma/client';

export class TreeBranchLeafResolver {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Résout le contenu d'une opération selon sa source
   */
  async resolveOperation(source: OperationSource, sourceRef: string): Promise<unknown> {
    try {
      // Extraire l'ID depuis sourceRef (format: "condition:abc123")
      const [sourceType, id] = sourceRef.split(':');
      
      if (sourceType !== source) {
        throw new Error(`Source mismatch: expected ${source}, got ${sourceType}`);
      }

      switch (source) {
        case 'condition': {
          const condition = await this.prisma.treeBranchLeafNodeCondition.findUnique({
            where: { id },
            select: { conditionSet: true }
          });
          return condition?.conditionSet || null;
        }

        case 'formula': {
          const formula = await this.prisma.treeBranchLeafNodeFormula.findUnique({
            where: { id },
            select: { tokens: true }
          });
          return formula?.tokens || null;
        }

        case 'table': {
          const table = await this.prisma.treeBranchLeafNodeTable.findUnique({
            where: { id },
            select: { 
              data: true,
              type: true,
              columns: true,
              rows: true,
              lookupSelectColumn: true,
              lookupDisplayColumns: true
            }
          });
          return table || null;
        }

        default:
          throw new Error(`Unknown operation source: ${source}`);
      }
    } catch (error) {
      console.error(`Failed to resolve operation ${sourceRef}:`, error);
      return null;
    }
  }

  /**
   * Met à jour une entrée de soumission avec les données résolues
   */
  async updateSubmissionWithResolvedOperation(
    submissionDataId: string,
    sourceRef: string,
    operationSource: OperationSource
  ): Promise<boolean> {
    try {
      const operationDetail = await this.resolveOperation(operationSource, sourceRef);
      
      if (operationDetail === null) {
        console.warn(`Could not resolve operation ${sourceRef}`);
        return false;
      }

      await this.prisma.treeBranchLeafSubmissionData.update({
        where: { id: submissionDataId },
        data: {
          operationDetail,
          lastResolved: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error(`Failed to update submission ${submissionDataId}:`, error);
      return false;
    }
  }

  /**
   * Job en arrière-plan pour résoudre toutes les opérations non résolues
   */
  async resolveOperationsInBackground(): Promise<void> {
    
    try {
      // Trouver toutes les entrées avec sourceRef mais sans operationDetail
      const unresolvedEntries = await this.prisma.treeBranchLeafSubmissionData.findMany({
        where: {
          sourceRef: { not: null },
          operationDetail: null,
          operationSource: { not: null }
        },
        select: {
          id: true,
          sourceRef: true,
          operationSource: true
        }
      });


      let resolved = 0;
      let failed = 0;

      for (const entry of unresolvedEntries) {
        if (entry.sourceRef && entry.operationSource) {
          const success = await this.updateSubmissionWithResolvedOperation(
            entry.id,
            entry.sourceRef,
            entry.operationSource
          );
          
          if (success) {
            resolved++;
          } else {
            failed++;
          }
        }
      }

    } catch (error) {
      console.error('❌ Background resolution failed:', error);
    }
  }

  /**
   * Invalide le cache d'une opération spécifique
   */
  async invalidateCache(sourceRef: string): Promise<void> {
    try {
      // Trouver toutes les entrées qui référencent cette source
      const entries = await this.prisma.treeBranchLeafSubmissionData.findMany({
        where: { sourceRef },
        select: { id: true, operationSource: true }
      });

      // Réinitialiser operationDetail pour forcer la re-résolution
      for (const entry of entries) {
        if (entry.operationSource) {
          await this.updateSubmissionWithResolvedOperation(
            entry.id,
            sourceRef,
            entry.operationSource
          );
        }
      }

    } catch (error) {
      console.error(`Failed to invalidate cache for ${sourceRef}:`, error);
    }
  }

  /**
   * Calcule et met en cache le résultat d'une opération
   */
  async calculateAndCacheResult(submissionDataId: string): Promise<unknown> {
    try {
      const submissionData = await this.prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: submissionDataId },
        select: {
          operationSource: true,
          operationDetail: true,
          value: true
        }
      });

      if (!submissionData?.operationDetail) {
        return null;
      }

      let result = null;

      // Logique de calcul selon le type d'opération
      switch (submissionData.operationSource) {
        case 'condition':
          result = this.evaluateCondition(submissionData.operationDetail, submissionData.value);
          break;
        case 'formula':
          result = this.evaluateFormula(submissionData.operationDetail, submissionData.value);
          break;
        case 'table':
          result = this.evaluateTable(submissionData.operationDetail, submissionData.value);
          break;
      }

      // Mettre en cache le résultat
      if (result !== null) {
        await this.prisma.treeBranchLeafSubmissionData.update({
          where: { id: submissionDataId },
          data: { operationResult: result }
        });
      }

      return result;
    } catch (error) {
      console.error(`Failed to calculate result for ${submissionDataId}:`, error);
      return null;
    }
  }

  /**
   * Évalue une condition (placeholder pour la logique métier)
   */
  private evaluateCondition(conditionSet: unknown, value: string | null): unknown {
    // TODO: Implémenter la logique d'évaluation des conditions
    return { evaluated: true, conditionSet, inputValue: value };
  }

  /**
   * Évalue une formule (placeholder pour la logique métier)
   */
  private evaluateFormula(tokens: unknown, value: string | null): unknown {
    // TODO: Implémenter la logique d'évaluation des formules
    return { calculated: true, tokens, inputValue: value };
  }

  /**
   * Évalue une table avec support du lookup
   */
  private evaluateTable(tableData: unknown, value: string | null): unknown {
    if (!tableData || typeof tableData !== 'object') {
      return null;
    }

    const table = tableData as {
      type?: string;
      rows?: Array<Record<string, unknown>>;
      lookupSelectColumn?: string;
      lookupDisplayColumns?: string[];
    };

    // Si c'est une table avec lookup et qu'une valeur est sélectionnée
    if (table.type === 'columns' && table.lookupSelectColumn && value && table.rows) {
      // Trouver la ligne correspondant à la valeur sélectionnée
      const selectedRow = table.rows.find(
        (row: Record<string, unknown>) => String(row[table.lookupSelectColumn!]) === value
      );

      if (!selectedRow) {
        return { error: 'Ligne non trouvée', selectedValue: value };
      }

      // Extraire les données des colonnes configurées
      const extractedData: Record<string, unknown> = {
        selected: value
      };

      if (table.lookupDisplayColumns && table.lookupDisplayColumns.length > 0) {
        table.lookupDisplayColumns.forEach((colName: string) => {
          extractedData[colName] = selectedRow[colName];
        });
      }

      return {
        processed: true,
        type: 'lookup',
        selectedValue: value,
        data: extractedData,
        fullRow: selectedRow
      };
    }

    // Fallback pour les autres types de tables
    return { processed: true, tableData, inputValue: value };
  }
}

// Instance singleton
let resolverInstance: TreeBranchLeafResolver | null = null;

export function getResolver(prisma: PrismaClient): TreeBranchLeafResolver {
  if (!resolverInstance) {
    resolverInstance = new TreeBranchLeafResolver(prisma);
  }
  return resolverInstance;
}