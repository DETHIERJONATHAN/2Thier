#!/usr/bin/env node
/**
 * 🎯 RANSAC QUALITY ANALYZER
 */

const fs = require('fs');

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

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🎯 RANSAC QUALITY ANALYSIS                               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📊 ANALYZING RECENT RANSAC CALLS:\n');

ransacCalls.forEach(call => {
  console.log(`Call #${call.iteration}:`);
  console.log(`  Points: ${call.totalPoints} total, ${call.inliers} inliers (${(call.inlierRatio * 100).toFixed(1)}%)`);
  console.log(`  Error: ${call.reprojectionError.toFixed(2)}mm`);
  console.log(`  Quality: ${call.quality.toFixed(1)}%`);
  console.log(`  Confidence: ${call.confidence.toFixed(1)}%`);
  console.log(`  Note: ${call.note}\n`);
});

console.log('\n📈 TREND ANALYSIS:\n');

const qualities = ransacCalls.map(r => r.quality);
const inlierRatios = ransacCalls.map(r => r.inlierRatio * 100);
const errors = ransacCalls.map(r => r.reprojectionError);

const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
const avgInliers = inlierRatios.reduce((a, b) => a + b, 0) / inlierRatios.length;
const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

console.log(`Quality: ${qualities.map(q => q.toFixed(1)).join(' → ')}`);
console.log(`  Average: ${avgQuality.toFixed(1)}%`);
console.log(`  Min/Max: ${Math.min(...qualities).toFixed(1)}% / ${Math.max(...qualities).toFixed(1)}%`);
console.log(`  Trend: ${qualities[qualities.length - 1] > qualities[0] ? '📈 IMPROVING' : '📉 DECLINING'}\n`);

console.log(`Inlier Ratio: ${inlierRatios.map(i => i.toFixed(1)).join('% → ')}%`);
console.log(`  Average: ${avgInliers.toFixed(1)}%`);
console.log(`  Target: >50% (have ${Math.ceil((230 * avgInliers) / 100)}/230 points)\n`);

console.log(`Reprojection Error: ${errors.map(e => e.toFixed(2)).join(' → ')}mm`);
console.log(`  Average: ${avgError.toFixed(2)}mm`);
console.log(`  Target: <3mm (current: ${avgError > 3 ? '❌ ABOVE' : '✅ BELOW'} target)\n`);

console.log('\n🔮 QUALITY PREDICTION:\n');

console.log(`Current Performance:`);
console.log(`  Quality: ${avgQuality.toFixed(1)}% (actual)`);
console.log(`  Inliers: ${avgInliers.toFixed(1)}% of points`);
console.log(`  Error: ${avgError.toFixed(2)}mm (actual)`);

const neededQuality = 85;
const qualityGap = neededQuality - avgQuality;

console.log(`\nTarget Quality: ${neededQuality}%`);
console.log(`Gap: ${qualityGap.toFixed(1)} percentage points`);

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
  console.log('   The ~70% scores may be due to:');
  console.log('   • Perspective/distortion in photo');
  console.log('   • Noisy calibration points');
  console.log('   • Complex geometry of measured object');
} else {
  console.log('\n⚠️  TO REACH 85% QUALITY:');
  issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
}

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

const report = {
  timestamp: new Date().toISOString(),
  results: ransacCalls,
  averageQuality: avgQuality,
  averageInlierRatio: avgInliers,
  averageError: avgError,
  recommendation: avgQuality > 75 && avgError < 3.5 
    ? 'ACCEPTABLE - Measurement error ~2-3cm, usable for door sizing'
    : avgQuality > 70
    ? 'MARGINAL - Quality borderline, may need multiple photos'
    : 'INVESTIGATE - Calibration or perspective issues'
};

fs.writeFileSync(
  '/workspaces/2Thier/ransac-quality-analysis.json',
  JSON.stringify(report, null, 2)
);

console.log('\n✅ Report saved to: ransac-quality-analysis.json');
