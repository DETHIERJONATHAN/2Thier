#!/usr/bin/env node
/**
 * 🎯 COMPREHENSIVE MEASUREMENT SYSTEM DIAGNOSTIC
 * Exécute tous les tests et génère un rapport complet
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class DiagnosticSuite {
  timestamp = new Date().toISOString();
  results: Record<string, any> = {};
  scriptsDir = '/workspaces/2Thier/scripts';

  run() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║  🎯 COMPREHENSIVE MEASUREMENT SYSTEM DIAGNOSTIC SUITE      ║');
    console.log('║     Métré A4 Calibration & RANSAC Quality Validation       ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`⏱️  Starting: ${new Date().toLocaleString()}\n`);

    this.runScript('Calibration Point Analysis', 'diagnostic-calibration-points.ts');
    this.runScript('RANSAC Quality Analysis', 'analyze-ransac-quality.ts');
    this.runScript('Reprojection Error Analysis', 'analyze-reprojection-error.ts');

    this.generateComprehensiveReport();
  }

  private runScript(name: string, filename: string) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`▶️  RUNNING: ${name}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      const output = execSync(`npx ts-node "${path.join(this.scriptsDir, filename)}"`, {
        cwd: '/workspaces/2Thier',
        stdio: 'inherit',
        encoding: 'utf-8'
      });

      this.results[filename] = { status: 'SUCCESS', output };
      console.log(`✅ ${name} completed\n`);
    } catch (error: any) {
      this.results[filename] = { status: 'FAILED', error: error.message };
      console.log(`\n❌ ${name} failed: ${error.message}\n`);
    }
  }

  private generateComprehensiveReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 GENERATING COMPREHENSIVE REPORT');
    console.log('═'.repeat(60) + '\n');

    // Charger les fichiers de rapport générés
    let calibrationReport: any = null;
    let ransacReport: any = null;
    let reprojectionReport: any = null;

    try {
      if (fs.existsSync('/workspaces/2Thier/calibration-diagnostic.json')) {
        calibrationReport = JSON.parse(
          fs.readFileSync('/workspaces/2Thier/calibration-diagnostic.json', 'utf-8')
        );
      }
    } catch (e) {
      console.log('⚠️  Could not load calibration report');
    }

    try {
      if (fs.existsSync('/workspaces/2Thier/ransac-quality-analysis.json')) {
        ransacReport = JSON.parse(
          fs.readFileSync('/workspaces/2Thier/ransac-quality-analysis.json', 'utf-8')
        );
      }
    } catch (e) {
      console.log('⚠️  Could not load RANSAC report');
    }

    try {
      if (fs.existsSync('/workspaces/2Thier/reprojection-error-analysis.json')) {
        reprojectionReport = JSON.parse(
          fs.readFileSync('/workspaces/2Thier/reprojection-error-analysis.json', 'utf-8')
        );
      }
    } catch (e) {
      console.log('⚠️  Could not load reprojection report');
    }

    // Créer le rapport complet
    const comprehensiveReport = {
      timestamp: this.timestamp,
      status: this.determineOverallStatus(calibrationReport, ransacReport, reprojectionReport),
      executionTime: new Date().toISOString(),

      sections: {
        calibration: calibrationReport
          ? {
              quality_score: calibrationReport.quality_score,
              status: calibrationReport.status,
              duplicate_pixels: calibrationReport.duplicate_pixels,
              geometry_issues: calibrationReport.geometry_issues,
              recommendations: calibrationReport.recommendations
            }
          : { status: 'NOT_RUN', error: 'Report file not found' },

        ransac: ransacReport
          ? {
              average_quality: ransacReport.averageQuality?.toFixed(1),
              average_inlier_ratio: ransacReport.averageInlierRatio?.toFixed(1),
              average_error_mm: ransacReport.averageError?.toFixed(2),
              recommendation: ransacReport.recommendation
            }
          : { status: 'NOT_RUN', error: 'Report file not found' },

        reprojection: reprojectionReport
          ? {
              duplicate_pixels: reprojectionReport.analysis?.duplicatePixels,
              geometry_issues: reprojectionReport.analysis?.geometryIssues,
              average_error_px: reprojectionReport.analysis?.averageError?.toFixed(2)
            }
          : { status: 'NOT_RUN', error: 'Report file not found' }
      }
    };

    // Ajouter le diagnostic final
    comprehensiveReport['final_verdict'] = this.getFinalVerdictAndRecommendations(
      calibrationReport,
      ransacReport,
      reprojectionReport
    );

    // Sauvegarder le rapport
    fs.writeFileSync(
      '/workspaces/2Thier/measurement-system-diagnostic-report.json',
      JSON.stringify(comprehensiveReport, null, 2)
    );

    this.printFinalReport(comprehensiveReport);
  }

  private determineOverallStatus(
    calibrationReport: any,
    ransacReport: any,
    reprojectionReport: any
  ): string {
    if (!calibrationReport && !ransacReport && !reprojectionReport) {
      return 'ERROR';
    }

    let issues = 0;

    if (calibrationReport?.duplicate_pixels > 0) issues++;
    if (ransacReport?.averageQuality < 70) issues++;
    if (reprojectionReport?.analysis?.duplicatePixels > 0) issues++;

    if (issues === 0) return 'PASS';
    if (issues === 1) return 'WARNING';
    return 'CRITICAL';
  }

  private getFinalVerdictAndRecommendations(
    calibrationReport: any,
    ransacReport: any,
    reprojectionReport: any
  ): Record<string, any> {
    const verdict: Record<string, any> = {
      overall_status: 'ANALYZING',
      critical_issues: [],
      warnings: [],
      recommendations: []
    };

    // Analyse calibration
    if (calibrationReport?.duplicate_pixels > 0) {
      verdict.critical_issues.push(
        `Calibration: ${calibrationReport.duplicate_pixels} duplicate pixels detected - HOMOGRAPHY BROKEN`
      );
      verdict.recommendations.push(
        'Verify metre-a4-v2-detector.ts projectRulerMarks/projectDottedBorder/projectCornerCrosses functions'
      );
    }

    if (calibrationReport?.quality_score < 70) {
      verdict.critical_issues.push(
        `Calibration quality score: ${calibrationReport.quality_score}% (target: >85%)`
      );
    }

    // Analyse RANSAC
    if (ransacReport?.averageQuality) {
      if (ransacReport.averageQuality < 70) {
        verdict.critical_issues.push(
          `RANSAC quality: ${ransacReport.averageQuality.toFixed(1)}% (target: >75%)`
        );
      } else if (ransacReport.averageQuality < 75) {
        verdict.warnings.push(
          `RANSAC quality: ${ransacReport.averageQuality.toFixed(1)}% (acceptable but marginal)`
        );
      }
    }

    if (ransacReport?.averageError > 3.5) {
      verdict.recommendations.push(
        `Reduce reprojection error from ${ransacReport.averageError.toFixed(2)}mm to <3mm`
      );
    }

    // Analyse reprojection
    if (reprojectionReport?.analysis?.duplicatePixels > 0) {
      verdict.critical_issues.push(
        `Reprojection: ${reprojectionReport.analysis.duplicatePixels} pixels with multiple mappings`
      );
    }

    // Déterminer le verdict final
    if (verdict.critical_issues.length === 0 && verdict.warnings.length === 0) {
      verdict.overall_status = '✅ SYSTEM READY FOR PRODUCTION';
      verdict.recommendations.push('Measurements should be accurate within 2-3cm');
    } else if (verdict.critical_issues.length === 0) {
      verdict.overall_status = '⚠️  SYSTEM USABLE WITH LIMITATIONS';
      verdict.recommendations.push(
        'Multiple measurements recommended for reliability; expect ±2-3cm error'
      );
    } else {
      verdict.overall_status = '❌ SYSTEM REQUIRES FIXES BEFORE USE';
      verdict.recommendations.push('Do not rely on measurements until critical issues resolved');
      verdict.recommendations.push('Run browser hard refresh (Ctrl+Shift+R) to clear cached code');
      verdict.recommendations.push(
        'If issues persist, check metre-a4-v2-detector.ts homography logic'
      );
    }

    return verdict;
  }

  private printFinalReport(report: any) {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL DIAGNOSTIC REPORT');
    console.log('═'.repeat(60) + '\n');

    console.log('EXECUTION SUMMARY:');
    console.log(`  Timestamp: ${report.timestamp}`);
    console.log(`  Overall Status: ${report.status}`);
    console.log('');

    console.log('📋 TEST RESULTS:');
    console.log('');

    if (report.sections.calibration.status === 'EXCELLENT') {
      console.log('  ✅ Calibration Points: EXCELLENT');
      console.log(`     Quality Score: ${report.sections.calibration.quality_score}/100`);
      console.log(`     Duplicate Pixels: 0`);
    } else if (report.sections.calibration.status === 'NOT_RUN') {
      console.log('  ⚠️  Calibration Points: TEST NOT RUN');
    } else {
      console.log('  ❌ Calibration Points: ISSUES DETECTED');
      console.log(
        `     Duplicate Pixels: ${report.sections.calibration.duplicate_pixels || 'N/A'}`
      );
      console.log(`     Quality Score: ${report.sections.calibration.quality_score || 'N/A'}/100`);
    }
    console.log('');

    if (report.sections.ransac.average_quality >= 75) {
      console.log('  ✅ RANSAC Algorithm: ACCEPTABLE');
    } else if (report.sections.ransac.average_quality >= 70) {
      console.log('  ⚠️  RANSAC Algorithm: MARGINAL');
    } else {
      console.log('  ❌ RANSAC Algorithm: POOR');
    }
    console.log(`     Quality: ${report.sections.ransac.average_quality || 'N/A'}%`);
    console.log(`     Inlier Ratio: ${report.sections.ransac.average_inlier_ratio || 'N/A'}%`);
    console.log(`     Error: ${report.sections.ransac.average_error_mm || 'N/A'}mm`);
    console.log('');

    if (report.sections.reprojection.duplicate_pixels === 0) {
      console.log('  ✅ Reprojection: NO ISSUES');
    } else {
      console.log('  ❌ Reprojection: ISSUES DETECTED');
    }
    console.log(`     Duplicate Pixels: ${report.sections.reprojection.duplicate_pixels || 'N/A'}`);
    console.log(`     Avg Error: ${report.sections.reprojection.average_error_px || 'N/A'}px`);
    console.log('');

    console.log('🎯 FINAL VERDICT:');
    console.log(`\n${report.final_verdict.overall_status}\n`);

    if (report.final_verdict.critical_issues.length > 0) {
      console.log('CRITICAL ISSUES:');
      report.final_verdict.critical_issues.forEach((issue: string) => {
        console.log(`  • ${issue}`);
      });
      console.log('');
    }

    if (report.final_verdict.warnings.length > 0) {
      console.log('WARNINGS:');
      report.final_verdict.warnings.forEach((warning: string) => {
        console.log(`  • ${warning}`);
      });
      console.log('');
    }

    if (report.final_verdict.recommendations.length > 0) {
      console.log('RECOMMENDATIONS:');
      report.final_verdict.recommendations.forEach((rec: string) => {
        console.log(`  ➜ ${rec}`);
      });
      console.log('');
    }

    console.log('═'.repeat(60));
    console.log(
      `✅ Complete report saved to: measurement-system-diagnostic-report.json\n`
    );
  }
}

const suite = new DiagnosticSuite();
suite.run();
