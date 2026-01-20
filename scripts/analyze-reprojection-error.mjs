#!/usr/bin/env node
/**
 * 🎯 REPROJECTION ERROR ANALYSIS
 */

const fs = require('fs');

const calibrationPoints = [
  { label: 'TL', pixel: [761.0, 584.0], real: [15, 30] },
  { label: 'TR', pixel: [774.8, 582.0], real: [195, 30] },
  { label: 'BL', pixel: [745.2, 597.5], real: [15, 210] },
  { label: 'BR', pixel: [759.0, 595.5], real: [195, 210] },

  { label: 'Ruler[0]', pixel: [759.5, 582.0], real: [35, 35] },
  { label: 'Ruler[1]', pixel: [759.5, 582.0], real: [45, 35] },
  { label: 'Ruler[2]', pixel: [774.2, 582.5], real: [155, 35] },
  { label: 'Ruler[3]', pixel: [745.0, 597.3], real: [35, 195] },
  { label: 'Ruler[4]', pixel: [759.0, 597.0], real: [155, 195] },

  { label: 'Dot[0]', pixel: [761.0, 583.0], real: [20, 30] },
  { label: 'Dot[1]', pixel: [768.0, 582.5], real: [100, 30] },
  { label: 'Dot[2]', pixel: [745.2, 597.4], real: [20, 210] },
  { label: 'Dot[3]', pixel: [752.0, 597.0], real: [100, 210] }
];

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🎯 REPROJECTION ERROR ANALYSIS                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📐 PIXEL GEOMETRY ANALYSIS:\n');

const tl = calibrationPoints.find(p => p.label === 'TL');
const tr = calibrationPoints.find(p => p.label === 'TR');
const bl = calibrationPoints.find(p => p.label === 'BL');
const br = calibrationPoints.find(p => p.label === 'BR');

const tlTrPx = Math.hypot(tr.pixel[0] - tl.pixel[0], tr.pixel[1] - tl.pixel[1]);
const tlBlPx = Math.hypot(bl.pixel[0] - tl.pixel[0], bl.pixel[1] - tl.pixel[1]);
const trBrPx = Math.hypot(br.pixel[0] - tr.pixel[0], br.pixel[1] - tr.pixel[1]);
const blBrPx = Math.hypot(br.pixel[0] - bl.pixel[0], br.pixel[1] - bl.pixel[1]);

const tlTrMm = Math.hypot(tr.real[0] - tl.real[0], tr.real[1] - tl.real[1]);
const tlBlMm = Math.hypot(bl.real[0] - tl.real[0], bl.real[1] - tl.real[1]);

const pxPerMmH = tlTrPx / tlTrMm;
const pxPerMmV = tlBlPx / tlBlMm;
const avgPxPerMm = (pxPerMmH + pxPerMmV) / 2;

console.log('Corner Positions:');
console.log(`  TL: ${JSON.stringify(tl.pixel)}`);
console.log(`  TR: ${JSON.stringify(tr.pixel)}`);
console.log(`  BL: ${JSON.stringify(bl.pixel)}`);
console.log(`  BR: ${JSON.stringify(br.pixel)}`);

console.log('\nDistances:');
console.log(`  TL→TR: ${tlTrPx.toFixed(1)}px (${tlTrMm}mm real) → ${pxPerMmH.toFixed(3)} px/mm`);
console.log(`  TL→BL: ${tlBlPx.toFixed(1)}px (${tlBlMm}mm real) → ${pxPerMmV.toFixed(3)} px/mm`);
console.log(`  TR→BR: ${trBrPx.toFixed(1)}px (expected ~${tlBlMm}mm)`);
console.log(`  BL→BR: ${blBrPx.toFixed(1)}px (expected ~${tlTrMm}mm)`);

console.log(`\n⚠️  SCALE ANALYSIS:`);
console.log(`  Horizontal: ${pxPerMmH.toFixed(3)} px/mm`);
console.log(`  Vertical:   ${pxPerMmV.toFixed(3)} px/mm`);
console.log(`  Average:    ${avgPxPerMm.toFixed(3)} px/mm`);
console.log(`  Aspect ratio error: ${Math.abs(pxPerMmH - pxPerMmV).toFixed(4)} px/mm (should be ~0)`);

if (Math.abs(pxPerMmH - pxPerMmV) > 0.05) {
  console.log('  ❌ ERROR: Scale mismatch suggests perspective distortion or homography issue');
}

console.log('\n\n🔍 DUPLICATE PIXEL DETECTION:\n');

const pixelMap = new Map();
calibrationPoints.forEach(point => {
  const key = `${point.pixel[0].toFixed(1)},${point.pixel[1].toFixed(1)}`;
  if (!pixelMap.has(key)) {
    pixelMap.set(key, []);
  }
  pixelMap.get(key).push(point);
});

let duplicateCount = 0;
const duplicatePixels = [];

pixelMap.forEach((points, pixelKey) => {
  if (points.length > 1) {
    duplicateCount++;
    duplicatePixels.push({
      pixel: pixelKey,
      count: points.length,
      points: points.map(p => ({ label: p.label, real: p.real }))
    });

    console.log(`⚠️  Pixel (${pixelKey}) has ${points.length} points:`);
    points.forEach(p => {
      console.log(`    - ${p.label}: real (${p.real[0]}, ${p.real[1]})mm`);
    });
    console.log('');
  }
});

if (duplicateCount === 0) {
  console.log('✅ No duplicate pixels detected');
} else {
  console.log(`\n❌ CRITICAL: ${duplicateCount} pixels have multiple real-world coordinates`);
  console.log('   This indicates homography projection is BROKEN');
}

console.log('\n\n📊 ERROR DISTRIBUTION ANALYSIS:\n');

const projectPoint = (real) => {
  const u = (real[0] - tl.real[0]) / (tr.real[0] - tl.real[0]);
  const v = (real[1] - tl.real[1]) / (bl.real[1] - tl.real[1]);

  const x =
    (1 - u) * (1 - v) * tl.pixel[0] +
    u * (1 - v) * tr.pixel[0] +
    (1 - u) * v * bl.pixel[0] +
    u * v * br.pixel[0];

  const y =
    (1 - u) * (1 - v) * tl.pixel[1] +
    u * (1 - v) * tr.pixel[1] +
    (1 - u) * v * bl.pixel[1] +
    u * v * br.pixel[1];

  return [x, y];
};

const errors = calibrationPoints.map(point => {
  const expectedPx = projectPoint(point.real);
  const error = Math.hypot(expectedPx[0] - point.pixel[0], expectedPx[1] - point.pixel[1]);
  return { label: point.label, error, expected: expectedPx, actual: point.pixel };
});

const avgError = errors.reduce((a, b) => a + b.error, 0) / errors.length;
const maxError = Math.max(...errors.map(e => e.error));
const stdDev = Math.sqrt(
  errors.reduce((a, b) => a + Math.pow(b.error - avgError, 2), 0) / errors.length
);

console.log(`Mean error: ${avgError.toFixed(2)}px`);
console.log(`Std dev:    ${stdDev.toFixed(2)}px`);
console.log(`Max error:  ${maxError.toFixed(2)}px`);
console.log(`Outliers (>3σ): ${errors.filter(e => e.error > avgError + 3 * stdDev).length}`);

console.log('\nWorst 5 errors:');
errors
  .sort((a, b) => b.error - a.error)
  .slice(0, 5)
  .forEach((e, i) => {
    console.log(
      `  ${i + 1}. ${e.label}: ${e.error.toFixed(2)}px ` +
      `(expected [${e.expected[0].toFixed(1)},${e.expected[1].toFixed(1)}], got [${e.actual[0].toFixed(1)},${e.actual[1].toFixed(1)}])`
    );
  });

console.log('\n\n🎯 PROBLEMATIC AREAS:\n');

const issues = [];
if (duplicateCount > 0) {
  issues.push(`❌ CRITICAL: ${duplicateCount} pixels have multiple mappings`);
}
if (Math.abs(pxPerMmH - pxPerMmV) > 0.05) {
  issues.push(`⚠️  SCALE MISMATCH: ${Math.abs(pxPerMmH - pxPerMmV).toFixed(4)} px/mm difference`);
}
if (tl.pixel[0] > 770) {
  issues.push('⚠️  GEOMETRY: Top-left corner appears off (X > 770)');
}

if (issues.length === 0) {
  console.log('✅ No major issues detected');
} else {
  issues.forEach(issue => console.log(`${issue}`));
}

console.log('\n🔧 RECOMMENDATIONS:');
console.log('  1. Verify calibration point generation in metre-a4-v2-detector.ts');
console.log('  2. Check homography calculation for extended bounds (18×18cm square)');
console.log('  3. Validate pixel coordinates are unique per real-world point');
console.log('  4. Run browser hard refresh (Ctrl+Shift+R) to clear cached code');

const report = {
  timestamp: new Date().toISOString(),
  totalPoints: calibrationPoints.length,
  corners: { TL: tl, TR: tr, BL: bl, BR: br },
  analysis: {
    duplicatePixels: duplicateCount,
    duplicatePixelsList: duplicatePixels,
    geometryIssues: Math.abs(pxPerMmH - pxPerMmV) > 0.05 ? 1 : 0,
    averageError: avgError,
    maxError: maxError,
    stdDev: stdDev
  },
  verdict: duplicateCount > 0 ? 'CRITICAL' : avgError > 3 ? 'WARNING' : 'OK'
};

fs.writeFileSync(
  '/workspaces/2Thier/reprojection-error-analysis.json',
  JSON.stringify(report, null, 2)
);

console.log('\n\n✅ Report saved to: reprojection-error-analysis.json');
