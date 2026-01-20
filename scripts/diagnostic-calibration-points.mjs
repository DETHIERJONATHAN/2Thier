#!/usr/bin/env node
/**
 * 🎯 DIAGNOSTIC CALIBRATION POINTS - MJS Version
 */

const fs = require('fs');

// Sample data from logs (230 calibration points)
const calibrationData = {
  corners: [
    { label: 'TL', pixel: [761.0, 584.0], real: [15, 30] },
    { label: 'TR', pixel: [774.8, 582.0], real: [195, 30] },
    { label: 'BL', pixel: [745.2, 597.5], real: [15, 210] },
    { label: 'BR', pixel: [759.0, 595.5], real: [195, 210] }
  ],
  rulerMarks: [
    { label: 'Ruler[0]', pixel: [759.5, 582.0], real: [35, 35] },
    { label: 'Ruler[1]', pixel: [759.5, 582.0], real: [45, 35] }, // DUPLICATE
    { label: 'Ruler[2]', pixel: [774.2, 582.5], real: [155, 35] },
    { label: 'Ruler[3]', pixel: [745.0, 597.3], real: [35, 195] },
    { label: 'Ruler[4]', pixel: [759.0, 597.0], real: [155, 195] }
  ],
  dottedBorder: [
    { label: 'Dot[0]', pixel: [761.0, 583.0], real: [20, 30] },
    { label: 'Dot[1]', pixel: [768.0, 582.5], real: [100, 30] },
    { label: 'Dot[2]', pixel: [745.2, 597.4], real: [20, 210] },
    { label: 'Dot[3]', pixel: [752.0, 597.0], real: [100, 210] }
  ]
};

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🎯 CALIBRATION POINT ANALYSIS                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Merge all points
const allPoints = [
  ...calibrationData.corners,
  ...calibrationData.rulerMarks,
  ...calibrationData.dottedBorder
];

console.log(`📊 CALIBRATION POINTS OVERVIEW:\n`);
console.log(`  Total Points: ${allPoints.length}`);
console.log(`  Corners: ${calibrationData.corners.length}`);
console.log(`  Ruler Marks: ${calibrationData.rulerMarks.length}`);
console.log(`  Dotted Border: ${calibrationData.dottedBorder.length}\n`);

// Check for duplicate pixels
console.log('🔍 DUPLICATE PIXEL DETECTION:\n');

const pixelMap = new Map();
const duplicatePixels = [];

allPoints.forEach(point => {
  const key = `${point.pixel[0].toFixed(1)},${point.pixel[1].toFixed(1)}`;
  if (!pixelMap.has(key)) {
    pixelMap.set(key, []);
  }
  pixelMap.get(key).push(point);
});

let duplicateCount = 0;
pixelMap.forEach((points, pixelKey) => {
  if (points.length > 1) {
    duplicateCount++;
    duplicatePixels.push({
      pixel: pixelKey,
      points: points.map(p => ({ label: p.label, real: p.real }))
    });

    console.log(`⚠️  DUPLICATE FOUND - Pixel (${pixelKey}):`);
    points.forEach((p, i) => {
      console.log(`    [${i + 1}] ${p.label}: real (${p.real[0]}, ${p.real[1]})mm`);
    });
    console.log('');
  }
});

if (duplicateCount === 0) {
  console.log('✅ No duplicate pixels found\n');
} else {
  console.log(`❌ CRITICAL: ${duplicateCount} duplicate pixel locations detected!\n`);
  console.log('   This means multiple real-world coordinates map to same pixel.');
  console.log('   ROOT CAUSE: Homography projection is BROKEN\n');
}

// Geometry validation
console.log('📐 GEOMETRY VALIDATION:\n');

const tl = calibrationData.corners[0];
const tr = calibrationData.corners[1];
const bl = calibrationData.corners[2];
const br = calibrationData.corners[3];

const tlTrPx = Math.hypot(tr.pixel[0] - tl.pixel[0], tr.pixel[1] - tl.pixel[1]);
const tlBlPx = Math.hypot(bl.pixel[0] - tl.pixel[0], bl.pixel[1] - tl.pixel[1]);
const trBrPx = Math.hypot(br.pixel[0] - tr.pixel[0], br.pixel[1] - tr.pixel[1]);
const blBrPx = Math.hypot(br.pixel[0] - bl.pixel[0], br.pixel[1] - bl.pixel[1]);

// Expected: 180mm = 16×180 grid corners
const tlTrMm = 180; // 195 - 15
const tlBlMm = 180; // 210 - 30

const pxPerMmH = tlTrPx / tlTrMm;
const pxPerMmV = tlBlPx / tlBlMm;

console.log('Corner Distances:');
console.log(`  TL→TR: ${tlTrPx.toFixed(1)}px (${tlTrMm}mm real) → ${pxPerMmH.toFixed(3)} px/mm`);
console.log(`  TL→BL: ${tlBlPx.toFixed(1)}px (${tlBlMm}mm real) → ${pxPerMmV.toFixed(3)} px/mm`);
console.log(`  TR→BR: ${trBrPx.toFixed(1)}px (expect ~${tlBlMm}mm @ ${pxPerMmV.toFixed(3)} = ${(tlBlMm * pxPerMmV).toFixed(1)}px)`);
console.log(`  BL→BR: ${blBrPx.toFixed(1)}px (expect ~${tlTrMm}mm @ ${pxPerMmH.toFixed(3)} = ${(tlTrMm * pxPerMmH).toFixed(1)}px)`);

const aspectRatio = tlTrPx / tlBlPx;
const aspectError = Math.abs(aspectRatio - 1.0);

console.log(`\nAspect Ratio: ${aspectRatio.toFixed(4)} (expect ~1.0)`);
console.log(`Aspect Error: ${(aspectError * 100).toFixed(2)}% ${aspectError > 0.05 ? '❌ LARGE' : '✅ OK'}`);
console.log(`Scale Consistency: ${Math.abs(pxPerMmH - pxPerMmV).toFixed(4)} px/mm difference ${Math.abs(pxPerMmH - pxPerMmV) > 0.05 ? '❌' : '✅'}`);

// Pixel distribution
console.log('\n\n📈 PIXEL DISTRIBUTION:\n');

const xCoords = allPoints.map(p => p.pixel[0]);
const yCoords = allPoints.map(p => p.pixel[1]);

const xMin = Math.min(...xCoords);
const xMax = Math.max(...xCoords);
const yMin = Math.min(...yCoords);
const yMax = Math.max(...yCoords);
const xCenter = (xMin + xMax) / 2;
const yCenter = (yMin + yMax) / 2;

console.log(`X Range: ${xMin.toFixed(1)} → ${xMax.toFixed(1)} (width: ${(xMax - xMin).toFixed(1)}px)`);
console.log(`Y Range: ${yMin.toFixed(1)} → ${yMax.toFixed(1)} (height: ${(yMax - yMin).toFixed(1)}px)`);
console.log(`Center: (${xCenter.toFixed(1)}, ${yCenter.toFixed(1)})`);

// Calculate quality score
console.log('\n\n🎯 QUALITY SCORE CALCULATION:\n');

let qualityScore = 100;
let reasonsForDeduction = [];

if (duplicateCount > 0) {
  const deduction = 15 * duplicateCount;
  qualityScore -= deduction;
  reasonsForDeduction.push(`-${deduction}: ${duplicateCount} duplicate pixel locations`);
}

if (aspectError > 0.05) {
  const deduction = 8;
  qualityScore -= deduction;
  reasonsForDeduction.push(`-${deduction}: Aspect ratio error ${(aspectError * 100).toFixed(1)}% (not square)`);
}

if (Math.abs(pxPerMmH - pxPerMmV) > 0.05) {
  const deduction = 12;
  qualityScore -= deduction;
  reasonsForDeduction.push(`-${deduction}: Scale mismatch (${(pxPerMmH - pxPerMmV).toFixed(4)} px/mm)`);
}

if (duplicateCount === 0) {
  qualityScore += 10;
  reasonsForDeduction.push('+10: No duplicate pixels');
}

if (aspectError < 0.02) {
  qualityScore += 5;
  reasonsForDeduction.push('+5: Excellent aspect ratio');
}

qualityScore = Math.max(0, Math.min(100, qualityScore));

console.log('Scoring:');
reasonsForDeduction.forEach(reason => {
  console.log(`  ${reason}`);
});
console.log(`\nFinal Score: ${qualityScore}/100`);

let status = 'CRITICAL';
let recommendation = 'DO NOT USE';

if (qualityScore >= 85) {
  status = 'EXCELLENT';
  recommendation = 'Ready for production measurements';
} else if (qualityScore >= 70) {
  status = 'ACCEPTABLE';
  recommendation = 'Acceptable for most measurements';
} else if (qualityScore >= 50) {
  status = 'WARNING';
  recommendation = 'Investigate issues before measurement';
} else {
  status = 'CRITICAL';
  recommendation = 'System BROKEN - do not use';
}

console.log(`Status: ${status}`);
console.log(`Recommendation: ${recommendation}`);

// Save report
const report = {
  timestamp: new Date().toISOString(),
  total_points: allPoints.length,
  duplicate_pixels: duplicateCount,
  duplicate_pixels_list: duplicatePixels,
  geometry_issues: aspectError > 0.05 || Math.abs(pxPerMmH - pxPerMmV) > 0.05 ? 1 : 0,
  aspect_ratio: parseFloat(aspectRatio.toFixed(4)),
  aspect_error_percent: parseFloat((aspectError * 100).toFixed(2)),
  scale_h_px_per_mm: parseFloat(pxPerMmH.toFixed(3)),
  scale_v_px_per_mm: parseFloat(pxPerMmV.toFixed(3)),
  quality_score: qualityScore,
  status: status,
  recommendations: recommendation
};

fs.writeFileSync(
  '/workspaces/2Thier/calibration-diagnostic.json',
  JSON.stringify(report, null, 2)
);

console.log('\n\n✅ Report saved to: calibration-diagnostic.json\n');
