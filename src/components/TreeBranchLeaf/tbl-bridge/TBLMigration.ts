/**
 * 🛡️ MIGRATION ULTRA-SÉCURISÉE TBL BRIDGE V2.0
 * 
 * Script de migration qui transforme les 70 éléments UUID TreeBranchLeaf
 * en système hybride UUID + codes TBL 2-chiffres [TYPE][CAPACITÉ]
 * 
 * SÉCURITÉ MAXIMALE:
 * - Backup automatique avant toute opération
 * - Migration par lots avec validation
 * - Rollback automatique en cas d'erreur
 * - Préservation complète des UUIDs existants
 */

import { PrismaClient } from '@prisma/client';
import { db } from '../../../lib/database';
import * as fs from 'fs';
import * as path from 'path';
import { CapacityDetector, TreeBranchLeafNode } from './capacities/CapacityDetector';
import { TBLDecoder } from './TBLDecoder';
import { logger } from '../../../lib/logger';

interface MigrationConfig {
  dryRun: boolean;                    // Mode simulation
  batchSize: number;                  // Taille des lots
  backupPath: string;                 // Chemin des backups
  enableAutoRollback: boolean;        // Rollback automatique
  validateIntegrity: boolean;         // Validation intégrité
  logLevel: 'silent' | 'info' | 'debug';
}

interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  totalMigrated: number;
  errors: string[];
  warnings: string[];
  backupFile?: string;
  statistics: MigrationStatistics;
}

interface MigrationStatistics {
  byType: Record<string, number>;
  byCapacity: Record<string, number>;
  duplicatesResolved: number;
  autoDetected: number;
  manualOverrides: number;
  averageConfidence: number;
}

interface BackupData {
  timestamp: string;
  totalRecords: number;
  elements: unknown[];
  formulas: unknown[];
  conditions: unknown[];
  tables: unknown[];
}

export class TBLMigration {
  private prisma: PrismaClient;
  private config: MigrationConfig;
  private startTime: Date;
  
  constructor(config: Partial<MigrationConfig> = {}) {
    this.prisma = db;
    this.startTime = new Date();
    
    this.config = {
      dryRun: false,
      batchSize: 10,
      backupPath: './migrations/backups',
      enableAutoRollback: true,
      validateIntegrity: true,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * 🚀 MIGRATION PRINCIPALE
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      totalProcessed: 0,
      totalMigrated: 0,
      errors: [],
      warnings: [],
      statistics: {
        byType: {},
        byCapacity: {},
        duplicatesResolved: 0,
        autoDetected: 0,
        manualOverrides: 0,
        averageConfidence: 0
      }
    };

    try {
      this.log('🚀 DÉBUT MIGRATION TBL BRIDGE V2.0', 'info');
      
      // 1. 🛡️ BACKUP CRITIQUE
      this.log('📋 Phase 1: Création backup sécurisé...', 'info');
      const backupFile = await this.createBackup();
      result.backupFile = backupFile;
      
      // 2. 📊 ANALYSE ÉLÉMENTS EXISTANTS
      this.log('🔍 Phase 2: Analyse des éléments existants...', 'info');
      const elements = await this.loadExistingElements();
      result.totalProcessed = elements.length;
      
      this.log(`📊 ${elements.length} éléments à migrer`, 'info');
      
      // 3. 🏗️ PRÉPARATION BDD
      if (!this.config.dryRun) {
        this.log('🏗️ Phase 3: Préparation base de données...', 'info');
        await this.prepareDatabaseStructure();
      }
      
      // 4. 🔄 MIGRATION PAR LOTS
      this.log('🔄 Phase 4: Migration par lots sécurisés...', 'info');
      const migrationStats = await this.migrateInBatches(elements);
      result.statistics = migrationStats;
      result.totalMigrated = Object.values(migrationStats.byType).reduce((a, b) => a + b, 0);
      
      // 5. ✅ VALIDATION INTÉGRITÉ
      if (this.config.validateIntegrity && !this.config.dryRun) {
        this.log('✅ Phase 5: Validation intégrité...', 'info');
        const integrityResult = await this.validateIntegrity();
        if (!integrityResult.valid) {
          result.errors.push(...integrityResult.errors);
          if (this.config.enableAutoRollback) {
            await this.rollback(backupFile);
            throw new Error('Intégrité compromise - Rollback effectué');
          }
        }
      }
      
      result.success = true;
      this.log('🎉 MIGRATION TERMINÉE AVEC SUCCÈS !', 'info');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      result.errors.push(errorMessage);
      this.log(`❌ ERREUR MIGRATION: ${errorMessage}`, 'info');
      
      if (this.config.enableAutoRollback && result.backupFile) {
        this.log('🔄 Rollback automatique...', 'info');
        await this.rollback(result.backupFile);
      }
    }

    await this.prisma.$disconnect();
    return result;
  }

  /**
   * 🛡️ CRÉATION BACKUP COMPLET
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tbl-migration-backup-${timestamp}.json`;
    const backupFilePath = path.join(this.config.backupPath, backupFileName);

    // Créer le dossier si nécessaire
    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
    }

    // Récupérer toutes les données
    const [elements, formulas, conditions, tables] = await Promise.all([
      this.prisma.treeBranchLeafNode.findMany(),
      this.prisma.treeBranchLeafNodeFormula?.findMany() || [],
      this.prisma.treeBranchLeafNodeCondition?.findMany() || [],
      this.prisma.treeBranchLeafNodeTable?.findMany() || []
    ]);

    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      totalRecords: elements.length,
      elements,
      formulas,
      conditions,
      tables
    };

    // Sauvegarder dans le fichier
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    
    this.log(`💾 Backup créé: ${backupFileName} (${elements.length} éléments)`, 'info');
    
    return backupFilePath;
  }

  /**
   * 📊 CHARGEMENT ÉLÉMENTS EXISTANTS
   */
  private async loadExistingElements(): Promise<TreeBranchLeafNode[]> {
    const rawElements = await this.prisma.treeBranchLeafNode.findMany({
      orderBy: { nodeId: 'asc' }
    });

    // Convertir au format TreeBranchLeafNode pour analyse
    return rawElements.map(el => ({
      id: el.id,
      nodeId: el.nodeId,
      label: el.label,
      type: el.type as unknown,
      parentId: el.parentId || undefined,
      
      // Indicateurs de capacités (à adapter selon vraie structure BDD)
      hasFormula: el.hasFormula || false,
      formula_activeId: el.formula_activeId || undefined,
      hasCondition: el.hasCondition || false,
      condition_activeId: el.condition_activeId || undefined,
      hasTable: el.hasTable || false,
      table_activeId: el.table_activeId || undefined,
      
      value: el.value
    }));
  }

  /**
   * 🏗️ PRÉPARATION STRUCTURE BDD
   */
  private async prepareDatabaseStructure(): Promise<void> {
    try {
      // Ajouter les nouvelles colonnes si elles n'existent pas
      await this.prisma.$executeRaw`
        ALTER TABLE TreeBranchLeafNode 
        ADD COLUMN IF NOT EXISTS tbl_code VARCHAR(10),
        ADD COLUMN IF NOT EXISTS tbl_type VARCHAR(1),
        ADD COLUMN IF NOT EXISTS tbl_capacity VARCHAR(1),
        ADD COLUMN IF NOT EXISTS tbl_original_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS tbl_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS tbl_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS tbl_confidence INTEGER DEFAULT 100,
        ADD COLUMN IF NOT EXISTS tbl_source VARCHAR(20) DEFAULT 'auto'
      `;
      
      this.log('✅ Structure BDD préparée', 'debug');
      
    } catch (error) {
      this.log(`⚠️ Colonnes TBL possiblement déjà existantes`, 'debug');
    }
  }

  /**
   * 🔄 MIGRATION PAR LOTS SÉCURISÉS
   */
  private async migrateInBatches(elements: TreeBranchLeafNode[]): Promise<MigrationStatistics> {
    const stats: MigrationStatistics = {
      byType: {},
      byCapacity: {},
      duplicatesResolved: 0,
      autoDetected: 0,
      manualOverrides: 0,
      averageConfidence: 0
    };

    const batches = this.createBatches(elements, this.config.batchSize);
    let totalConfidence = 0;
    const codeRegistry = new Set<string>();

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.log(`📦 Lot ${i + 1}/${batches.length} (${batch.length} éléments)`, 'info');

      for (const element of batch) {
        try {
          // 1. Détection automatique des capacités
          const capacityAnalysis = CapacityDetector.detectCapacity(element);
          stats.autoDetected++;
          totalConfidence += capacityAnalysis.confidence;

          // 2. Mapping type TreeBranchLeaf → TBL (CORRIGÉ pour détecter sections)
          const tblType = await this.mapTreeBranchLeafType(element.type, element.parentId);
          
          // 3. Génération code TBL unique
          let tblCode = this.generateTBLCode(tblType, capacityAnalysis.capacity, element.label);
          
          // 4. Résolution doublons
          if (codeRegistry.has(tblCode)) {
            const originalCode = tblCode;
            tblCode = this.resolveNameConflict(tblCode, element.parentId || '', codeRegistry);
            stats.duplicatesResolved++;
            this.log(`🔄 Doublon résolu: ${originalCode} → ${tblCode}`, 'debug');
          }
          
          codeRegistry.add(tblCode);

          // 5. Compter statistiques
          stats.byType[tblType] = (stats.byType[tblType] || 0) + 1;
          stats.byCapacity[capacityAnalysis.capacity] = (stats.byCapacity[capacityAnalysis.capacity] || 0) + 1;

          // 6. Mise à jour BDD (si pas dry run)
          if (!this.config.dryRun) {
            await this.updateElementWithTBLData(element, tblType, capacityAnalysis.capacity, tblCode, capacityAnalysis.confidence);
          }

          this.log(`✅ ${element.label} → ${tblCode} (confiance: ${capacityAnalysis.confidence}%)`, 'debug');

        } catch (error) {
          const errorMsg = `Erreur sur ${element.label}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          this.log(`❌ ${errorMsg}`, 'info');
          throw new Error(errorMsg);
        }
      }

      // Petite pause entre les lots
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    stats.averageConfidence = Math.round(totalConfidence / stats.autoDetected);
    return stats;
  }

  /**
   * 💾 MISE À JOUR ÉLÉMENT AVEC DONNÉES TBL
   */
  private async updateElementWithTBLData(
    element: TreeBranchLeafNode, 
    tblType: string, 
    tblCapacity: string, 
    tblCode: string, 
    confidence: number
  ): Promise<void> {
    await this.prisma.treeBranchLeafNode.update({
      where: { id: element.id },
      data: {
        tbl_code: tblCode,
        tbl_type: tblType,
        tbl_capacity: tblCapacity,
        tbl_original_id: element.id,
        tbl_created_at: new Date(),
        tbl_updated_at: new Date(),
        tbl_confidence: confidence,
        tbl_source: 'auto'
      }
    });
  }

  /**
   * 🗺️ MAPPING TYPE TREEBRANCHLEAF → TBL - VERSION CORRIGÉE
   */
  private async mapTreeBranchLeafType(type: string, parentId?: string): Promise<string> {
    const TYPE_MAPPING = {
      'branch': '1',
      'section': '7',
      'leaf_field': '3',
      'leaf_option': '4',
      'leaf_option_field': '5'
    };

    let mappedType = TYPE_MAPPING[type as keyof typeof TYPE_MAPPING] || '1';

    // 🎯 RÈGLE CRUCIALE : Champ dans une section = Champ Données (Type 6)
    if (type === 'leaf_field' && parentId) {
      const parent = await this.prisma.treeBranchLeafNode.findUnique({
        where: { id: parentId },
        select: { type: true }
      });
      
      if (parent?.type === 'section') {
        mappedType = '6'; // Champ données
        this.log(`🔄 Champ en section détecté → Type 6 (Champ Données)`, 'debug');
      }
    }
    
    // Règle : Branche avec parent = Sous-branche
    if (type === 'branch' && parentId) {
      mappedType = '2'; // Sous-branche
    }

    return mappedType;
  }

  /**
   * 🏷️ GÉNÉRATION CODE TBL
   */
  private generateTBLCode(type: string, capacity: string, label: string): string {
    const normalizedName = this.normalizeString(label);
    return `${type}${capacity}-${normalizedName}`;
  }

  /**
   * 🔧 RÉSOLUTION CONFLITS NOMS
   */
  private resolveNameConflict(originalCode: string, parentId: string, registry: Set<string>): string {
    let counter = 1;
    let newCode = `${originalCode}-${counter}`;
    
    while (registry.has(newCode)) {
      counter++;
      newCode = `${originalCode}-${counter}`;
    }
    
    return newCode;
  }

  /**
   * 📝 NORMALISATION CHAÎNES
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * ✅ VALIDATION INTÉGRITÉ
   */
  private async validateIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // 1. Vérifier aucune perte de données
      const [originalCount, migratedCount] = await Promise.all([
        this.prisma.treeBranchLeafNode.count(),
        this.prisma.treeBranchLeafNode.count({ where: { tbl_code: { not: null } } })
      ]);

      if (originalCount !== migratedCount) {
        errors.push(`Perte de données: ${originalCount} originaux vs ${migratedCount} migrés`);
      }

      // 2. Vérifier unicité codes TBL
      const duplicateCodes = await this.prisma.$queryRaw`
        SELECT tbl_code, COUNT(*) as count 
        FROM TreeBranchLeafNode 
        WHERE tbl_code IS NOT NULL 
        GROUP BY tbl_code 
        HAVING COUNT(*) > 1
      `;

      if (Array.isArray(duplicateCodes) && duplicateCodes.length > 0) {
        errors.push(`Codes TBL dupliqués: ${duplicateCodes.length}`);
      }

      // 3. Valider format codes TBL
      const invalidCodes = await this.prisma.treeBranchLeafNode.findMany({
        where: {
          tbl_code: { not: null },
          OR: [
            { tbl_code: { not: { contains: '-' } } },
            { tbl_code: { regex: '^[^1-7][^1-4]-' } }
          ]
        }
      });

      if (invalidCodes.length > 0) {
        errors.push(`Codes TBL invalides: ${invalidCodes.length}`);
      }

    } catch (error) {
      errors.push(`Erreur validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 🔄 ROLLBACK AUTOMATIQUE
   */
  private async rollback(backupFilePath: string): Promise<void> {
    try {
      this.log('🔄 DÉBUT ROLLBACK...', 'info');

      const backupData: BackupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

      // Restaurer état original
      await this.prisma.$transaction(async (tx) => {
        // Supprimer données TBL ajoutées
        await tx.treeBranchLeafNode.updateMany({
          data: {
            tbl_code: null,
            tbl_type: null,
            tbl_capacity: null,
            tbl_original_id: null,
            tbl_created_at: null,
            tbl_updated_at: null,
            tbl_confidence: null,
            tbl_source: null
          }
        });
      });

      this.log('✅ ROLLBACK TERMINÉ', 'info');

    } catch (error) {
      this.log(`❌ ERREUR ROLLBACK: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'info');
      throw error;
    }
  }

  /**
   * 🔧 UTILITAIRES
   */
  
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private log(message: string, level: 'silent' | 'info' | 'debug'): void {
    if (this.config.logLevel === 'silent') return;
    if (this.config.logLevel === 'info' && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = this.config.dryRun ? '[DRY RUN]' : '[MIGRATION]';
    logger.debug(`${timestamp} ${prefix} ${message}`);
  }
}

/**
 * 🎯 SCRIPT EXÉCUTABLE
 */
export async function runMigration(config: Partial<MigrationConfig> = {}) {
  const migration = new TBLMigration(config);
  
  try {
    const result = await migration.migrate();
    
    logger.debug('\n🎉 RAPPORT FINAL MIGRATION:');
    logger.debug(`✅ Succès: ${result.success}`);
    logger.debug(`📊 Total traités: ${result.totalProcessed}`);
    logger.debug(`🔄 Total migrés: ${result.totalMigrated}`);
    logger.debug(`💾 Backup: ${result.backupFile}`);
    logger.debug(`📈 Confiance moyenne: ${result.statistics.averageConfidence}%`);
    
    if (result.errors.length > 0) {
      logger.debug(`❌ Erreurs: ${result.errors.length}`);
      result.errors.forEach(error => logger.debug(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      logger.debug(`⚠️ Avertissements: ${result.warnings.length}`);
      result.warnings.forEach(warning => logger.debug(`  - ${warning}`));
    }

    logger.debug('\n📊 STATISTIQUES DÉTAILLÉES:');
    logger.debug('Par type:', result.statistics.byType);
    logger.debug('Par capacité:', result.statistics.byCapacity);
    logger.debug(`Doublons résolus: ${result.statistics.duplicatesResolved}`);
    logger.debug(`Auto-détectés: ${result.statistics.autoDetected}`);
    
    return result;
    
  } catch (error) {
    logger.error('💥 ÉCHEC MIGRATION:', error);
    throw error;
  }
}

// Exécution directe si appelé comme script
if (require.main === module) {
  const config: Partial<MigrationConfig> = {
    dryRun: process.argv.includes('--dry-run'),
    batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10'),
    logLevel: process.argv.includes('--debug') ? 'debug' : 'info'
  };
  
  runMigration(config).catch(logger.error);
}

/**
 * 🎯 UTILISATION
 * 
 * ```bash
 * # Mode simulation (recommandé d'abord)
 * npm run migrate:tbl -- --dry-run
 * 
 * # Migration réelle
 * npm run migrate:tbl
 * 
 * # Migration avec paramètres
 * npm run migrate:tbl -- --batch-size=5 --debug
 * ```
 * 
 * ```typescript
 * // Utilisation programmatique
 * import { runMigration } from './TBLMigration';
 * 
 * const result = await runMigration({
 *   dryRun: false,
 *   batchSize: 10,
 *   logLevel: 'info'
 * });
 * ```
 */