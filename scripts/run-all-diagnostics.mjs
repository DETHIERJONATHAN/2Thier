#!/usr/bin/env node
/**
 * 🎯 COMPREHENSIVE MEASUREMENT SYSTEM DIAGNOSTIC
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DiagnosticSuite {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.results = {};
    this.scriptsDir = '/workspaces/2Thier/scripts';
  }

  run() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║  🎯 COMPREHENSIVE MEASUREMENT SYSTEM DIAGNOSTIC SUITE      ║');
    console.log('║     Métré A4 Calibration & RANSAC Quality Validation       ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`⏱️  Starting: ${new Date().toLocaleString()}\n`);

    this.runScript('Calibration Point Analysis', 'diagnostic-calibration-points.mjs');
    this.runScript('RANSAC Quality Analysis', 'analyze-ransac-quality.mjs');
    this.runScript('Reprojection Error Analysis', 'analyze-reprojection-error.mjs');

    this.generateComprehensiveReport();
  }

  runScript(name, filename) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`▶️  RUNNING: ${name}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      execSync(`node "${path.join(this.scriptsDir, filename)}"`, {
        cwd: '/workspaces/2Thier',
        stdio: 'inherit'
      });

      this.results[filename] = { status: 'SUCCESS' };
      console.log(`✅ ${name} completed\n`);
    } catch (error) {
      this.results[filename] = { status: 'FAILED', error: error.message };
      console.log(`\n❌ ${name} failed: ${error.message}\n`);
    }
  }

  generateComprehensiveReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 GENERATING COMPREHENSIVE REPORT');
    console.log('═'.repeat(60) + '\n');

    let calibrationReport = null;
    let ransacReport = null;
    let reprojectionReport = null;

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

    const comprehensiveReport = {
      timestamp: this.timestamp,
      status: this.determineOverallStatus(calibrationReport, ransacReport, reprojectionReport),
      sections: {
        calibration: calibrationReport || { status: 'NOT_RUN' },
        ransac: ransacReport || { status: 'NOT_RUN' },
        reprojection: reprojectionReport || { status: 'NOT_RUN' }
      }
    };

    comprehensiveReport.final_verdict = this.getFinalVerdictAndRecommendations(
      calibrationReport,
      ransacReport,
      reprojectionReport
    );

    fs.writeFileSync(
      '/workspaces/2Thier/measurement-system-diagnostic-report.json',
      JSON.stringify(comprehensiveReport, null, 2)
    );

    this.printFinalReport(comprehensiveReport);
  }

  determineOverallStatus(calibrationReport, ransacReport, reprojectionReport) {
    if (!calibrationReport && !ransacReport && !reprojectionReport) {
      return 'ERROR';
    }

    let issues = 0;
    if (calibrationReport?.duplicate_pixels > 0) issues++;
    if (ransacReport?.averageQuality < 70) issues++;
    if (reprojectionReport?.duplicate_pixels > 0) issues++;

    if (issues === 0) return 'PASS';
    if (issues === 1) return 'WARNING';
    return 'CRITICAL';
  }

  getFinalVerdictAndRecommendations(calibrationReport, ransacReport, reprojectionReport) {
    const verdict = {
      overall_status: 'ANALYZING',
      critical_issues: [],
      warnings: [],
      recommendations: []
    };

    if (calibrationReport?.duplicate_pixels > 0) {
      verdict.critical_issues.push(
        `Calibration: ${calibrationReport.duplicate_pixels} duplicate pixels - HOMOGRAPHY BROKEN`
      );
    }

    if (ransacReport?.averageQuality < 70) {
      verdict.critical_issues.push(
        `RANSAC quality: ${ransacReport.averageQuality.toFixed(1)}% (need >75%)`
      );
    } else if (ransacReport?.averageQuality < 75) {
      verdict.warnings.push(
        `RANSAC quality: ${ransacReport.averageQuality.toFixed(1)}% (marginal)`
      );
    }

    if (reprojectionReport?.duplicate_pixels > 0) {
      verdict.critical_issues.push(
        `Reprojection: ${reprojectionReport.duplicate_pixels} pixels with multiple mappings`
      );
    }

    if (verdict.critical_issues.length === 0 && verdict.warnings.length === 0) {
      verdict.overall_status = '✅ SYSTEM READY FOR PRODUCTION';
    } else if (verdict.critical_issues.length === 0) {
      verdict.overall_status = '⚠️  SYSTEM USABLE WITH LIMITATIONS';
    } else {
      verdict.overall_status = '❌ SYSTEM REQUIRES FIXES';
      verdict.recommendations.push('Run browser hard refresh (Ctrl+Shift+R) to clear cache');
    }

    return verdict;
  }

  printFinalReport(report) {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL DIAGNOSTIC REPORT');
    console.log('═'.repeat(60) + '\n');

    console.log('SUMMARY:');
    console.log(`  Status: ${report.status}`);
    console.log(`  Timestamp: ${report.timestamp}\n`);

    console.log('RESULTS:\n');
    if (report.sections.calibration.status) {
      console.log(`  Calibration: ${report.sections.calibration.status}`);
    } else {
      console.log(
        `  Calibration Quality: ${report.sections.calibration.quality_score}/100 (${report.sections.calibration.status})`
      );
      console.log(
        `    Duplicate Pixels: ${report.sections.calibration.duplicate_pixels}`
      );
    }

    if (report.sections.ransac.status) {
      console.log(`  RANSAC: ${report.sections.ransac.status}`);
    } else {
      console.log(`  RANSAC Quality: ${report.sections.ransac.averageQuality?.toFixed(1) || 'N/A'}%`);
      console.log(`    Inlier Ratio: ${report.sections.ransac.averageInlierRatio?.toFixed(1) || 'N/A'}%`);
    }

    if (report.sections.reprojection.status) {
      console.log(`  Reprojection: ${report.sections.reprojection.status}`);
    } else {
      console.log(
        `  Reprojection Duplicates: ${report.sections.reprojection.analysis?.duplicatePixels || 'N/A'}`
      );
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`\n${report.final_verdict.overall_status}\n`);

    if (report.final_verdict.critical_issues.length > 0) {
      console.log('CRITICAL ISSUES:');
      report.final_verdict.critical_issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
      console.log('');
    }

    if (report.final_verdict.recommendations.length > 0) {
      console.log('RECOMMENDATIONS:');
      report.final_verdict.recommendations.forEach(rec => {
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
