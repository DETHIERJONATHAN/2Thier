/**
 * 🎯 RANSAC QUALITY ANALYZER
 * Teste RANSAC avec les données réelles et mesure la qualité
 */

import fs from 'fs';

interface RANSACResult {
  totalPoints: number;
  inliers: number;
  outliers: number;
  inlierRatio: number;
  reprojectionError: number;
  quality: number;
  confidence: number;
}

class RANSACAnalyzer {
  results: RANSACResult[] = [];

  run() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎯 RANSAC QUALITY ANALYSIS                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Analyser les derniers résultats RANSAC du serveur
    this.analyzeLatestResults();
    this.compareTrendline();
    this.predictQuality();
  }

  private analyzeLatestResults() {
    console.log('📊 ANALYZING RECENT RANSAC CALLS:\n');

    // Données des derniers appels (du log serveur)
    const ransacCalls = [
      {
        iteration: 1,
        totalPoints: 230,
        inliers: 105,
        inlierRatio: 105 / 230,
        reprojectionError: 5.31,
        quality: 71.6,
        confidence: 46.5,
        note: 'Call with corners + dots'
      },
      {
        iteration: 2,
        totalPoints: 230,
        inliers: 104,
        inlierRatio: 104 / 230,
        reprojectionError: 5.40,
        quality: 71.1,
        confidence: 46.0,
        note: 'Call without corners'
      },
      {
        iteration: 3,
        totalPoints: 230,
        inliers: 102,
        inlierRatio: 102 / 230,
        reprojectionError: 5.46,
        quality: 70.3,
        confidence: 45.1,
        note: 'Call with adjusted corners'
      },
      {
        iteration: 4,
        totalPoints: 226,
        inliers: 102,
        inlierRatio: 102 / 226,
        reprojectionError: 5.30,
        quality: 71.4,
        confidence: 45.1,
        note: 'Call without AprilTag corners'
      }
    ];

    ransacCalls.forEach(call => {
      console.log(`Call #${call.iteration}:`);
      console.log(`  Points: ${call.totalPoints} total, ${call.inliers} inliers (${(call.inlierRatio * 100).toFixed(1)}%)`);
      console.log(`  Error: ${call.reprojectionError.toFixed(2)}mm`);
      console.log(`  Quality: ${call.quality.toFixed(1)}%`);
      console.log(`  Confidence: ${call.confidence.toFixed(1)}%`);
      console.log(`  Note: ${call.note}\n`);
    });

    this.results = ransacCalls as any;
  }

  private compareTrendline() {
    console.log('\n📈 TREND ANALYSIS:\n');

    const qualities = this.results.map(r => r.quality);
    const inlierRatios = this.results.map(r => r.inlierRatio * 100);
    const errors = this.results.map(r => r.reprojectionError);

    const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    const avgInliers = inlierRatios.reduce((a, b) => a + b, 0) / inlierRatios.length;
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

    console.log(`Quality: ${qualities.map(q => q.toFixed(1)).join(' → ')}`);
    console.log(`  Average: ${avgQuality.toFixed(1)}%`);
    console.log(`  Min/Max: ${Math.min(...qualities).toFixed(1)}% / ${Math.max(...qualities).toFixed(1)}%`);
    console.log(`  Trend: ${qualities[qualities.length - 1] > qualities[0] ? '📈 IMPROVING' : '📉 DECLINING'}\n`);

    console.log(`Inlier Ratio: ${inlierRatios.map(i => i.toFixed(1)).join('% → ')}%`);
    console.log(`  Average: ${avgInliers.toFixed(1)}%`);
    console.log(`  Target: >50% (need ${Math.ceil((230 * 0.5) / 1)}/230 points)\n`);

    console.log(`Reprojection Error: ${errors.map(e => e.toFixed(2)).join(' → ')}mm`);
    console.log(`  Average: ${avgError.toFixed(2)}mm`);
    console.log(`  Target: <3mm (current: ${avgError > 3 ? '❌ ABOVE' : '✅ BELOW'} target)\n`);
  }

  private predictQuality() {
    console.log('\n🔮 QUALITY PREDICTION:\n');

    const avgQuality = this.results.reduce((a, b) => a + b.quality, 0) / this.results.length;
    const avgInliers = this.results.reduce((a, b) => a + b.inlierRatio * 100, 0) / this.results.length;
    const avgError = this.results.reduce((a, b) => a + b.reprojectionError, 0) / this.results.length;

    console.log(`Current Performance:`);
    console.log(`  Quality: ${avgQuality.toFixed(1)}% (actual)`);
    console.log(`  Inliers: ${avgInliers.toFixed(1)}% of points`);
    console.log(`  Error: ${avgError.toFixed(2)}mm (actual)`);

    // Predict what's needed
    const neededQuality = 85;
    const qualityGap = neededQuality - avgQuality;
    
    console.log(`\nTarget Quality: ${neededQuality}%`);
    console.log(`Gap: ${qualityGap.toFixed(1)} percentage points`);

    // What would fix it?
    const issues = [];
    
    if (avgError > 3) {
      const errorReduction = ((avgError - 3) / avgError) * 100;
      issues.push(`Reduce reprojection error by ${errorReduction.toFixed(0)}% (from ${avgError.toFixed(2)}→3mm)`);
    }

    if (avgInliers < 50) {
      issues.push(`Increase inlier ratio to 50%+ (currently ${avgInliers.toFixed(1)}%)`);
    }

    if (issues.length === 0) {
      console.log('\n✅ NO OBVIOUS ISSUES - Quality should be acceptable');
      console.log('   The low scores (~70%) may be due to:');
      console.log('   • Perspective/distortion in photo');
      console.log('   • Noisy calibration points');
      console.log('   • Complex geometry of measured object');
    } else {
      console.log('\n⚠️  TO REACH 85% QUALITY:');
      issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    }

    // Diagnosis
    console.log('\n🔍 ROOT CAUSE ANALYSIS:\n');
    
    if (avgInliers < 50) {
      console.log('HYPOTHESIS: Calibration point corruption');
      console.log('  • Too many outliers being detected');
      console.log('  • Need to verify pixel coordinates are unique');
      console.log('  • Check homography projection logic');
    } else if (avgError > 3) {
      console.log('HYPOTHESIS: Systematic measurement bias');
      console.log('  • Good inlier count but points are noisy');
      console.log('  • Could be optical distortion');
      console.log('  • Or AprilTag perspective/rotation issue');
    } else {
      console.log('HYPOTHESIS: Measurement complexity');
      console.log('  • Door photo has strong perspective');
      console.log('  • 70% quality is acceptable for this geometry');
      console.log('  • Measurement error: ±2-3cm (acceptable)');
    }
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      averageQuality: this.results.reduce((a, b) => a + b.quality, 0) / this.results.length,
      averageInlierRatio: (this.results.reduce((a, b) => a + b.inlierRatio, 0) / this.results.length) * 100,
      averageError: this.results.reduce((a, b) => a + b.reprojectionError, 0) / this.results.length,
      recommendation: this.getRecommendation()
    };

    fs.writeFileSync(
      '/workspaces/2Thier/ransac-quality-analysis.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n✅ Report saved to: ransac-quality-analysis.json');
  }

  private getRecommendation(): string {
    const avgQuality = this.results.reduce((a, b) => a + b.quality, 0) / this.results.length;
    const avgError = this.results.reduce((a, b) => a + b.reprojectionError, 0) / this.results.length;

    if (avgQuality > 75 && avgError < 3.5) {
      return 'ACCEPTABLE - Measurement error ~2-3cm, usable for door sizing';
    } else if (avgQuality > 70) {
      return 'MARGINAL - Quality borderline, may need multiple photos';
    } else {
      return 'INVESTIGATE - Calibration or perspective issues';
    }
  }
}

const analyzer = new RANSACAnalyzer();
analyzer.run();
analyzer.saveReport();
