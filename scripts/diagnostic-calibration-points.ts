/**
 * 🔍 DIAGNOSTIC CALIBRATION POINTS
 * Vérifie les pixels dupliqués, géométrie, et qualité des points de calibration
 */

import fs from 'fs';
import path from 'path';

// Données d'exemple du frontend (du dernier log)
const CALIBRATION_DATA = {
  apriltagCorners: [
    { pixel: [745.9, 580.3], real: [25, 40] }, // TL
    { pixel: [908.9, 578.1], real: [185, 40] }, // TR
    { pixel: [909.1, 745.3], real: [185, 200] }, // BR
    { pixel: [749.2, 749.0], real: [25, 200] }, // BL
  ],
  rulerMarks: [
    { pixel: [745.8, 580.3], real: [25, 35] },
    { pixel: [759.5, 582.0], real: [35, 35] },
    { pixel: [759.5, 582.0], real: [45, 35] }, // ❌ DUPLICATE PIXEL!
    { pixel: [774.8, 580.3], real: [55, 35] },
    { pixel: [816.0, 580.0], real: [85, 35] },
  ]
};

interface Point {
  pixel: [number, number];
  real: [number, number];
  type?: string;
}

class CalibrationDiagnostic {
  points: Point[] = [];
  results: any = {
    duplicatePixels: [],
    geometryIssues: [],
    statistics: {},
    quality: 0
  };

  run() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 DIAGNOSTIC CALIBRATION POINTS V2.0                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Préparer tous les points
    this.preparePoints();
    
    // Vérifications
    this.checkDuplicatePixels();
    this.checkGeometry();
    this.checkPixelDistribution();
    this.calculateQuality();
    
    // Résultats
    this.printResults();
  }

  private preparePoints() {
    const points: Point[] = [];
    
    // AprilTag corners
    CALIBRATION_DATA.apriltagCorners.forEach((p, i) => {
      points.push({
        pixel: p.pixel,
        real: p.real,
        type: ['TL', 'TR', 'BR', 'BL'][i]
      });
    });

    // Ruler marks
    CALIBRATION_DATA.rulerMarks.forEach((p, i) => {
      points.push({
        pixel: p.pixel,
        real: p.real,
        type: `ruler_${i}`
      });
    });

    this.points = points;
    console.log(`✅ Total points loaded: ${this.points.length}`);
  }

  private checkDuplicatePixels() {
    console.log('\n📍 Checking for DUPLICATE PIXELS:');
    const pixelMap = new Map<string, Point[]>();

    this.points.forEach(p => {
      const key = `${p.pixel[0].toFixed(1)},${p.pixel[1].toFixed(1)}`;
      if (!pixelMap.has(key)) pixelMap.set(key, []);
      pixelMap.get(key)!.push(p);
    });

    let duplicateCount = 0;
    pixelMap.forEach((pts, pixelKey) => {
      if (pts.length > 1) {
        duplicateCount++;
        console.log(`  ❌ DUPLICATE PIXEL (${pixelKey}):`);
        pts.forEach(p => {
          console.log(`     → real: (${p.real[0]}, ${p.real[1]}) type: ${p.type}`);
        });
        this.results.duplicatePixels.push({
          pixel: pixelKey,
          count: pts.length,
          points: pts
        });
      }
    });

    if (duplicateCount === 0) {
      console.log('  ✅ NO DUPLICATE PIXELS FOUND!');
    } else {
      console.log(`  ⚠️  Found ${duplicateCount} duplicate pixel locations`);
    }
  }

  private checkGeometry() {
    console.log('\n🧭 GEOMETRY VALIDATION:');
    
    const corners = this.points.filter(p => ['TL', 'TR', 'BR', 'BL'].includes(p.type!));
    if (corners.length < 4) {
      console.log('  ❌ Not enough corners found');
      return;
    }

    const [tl, tr, br, bl] = corners;

    // Calculate pixel distances
    const tlTr = Math.hypot(tr.pixel[0] - tl.pixel[0], tr.pixel[1] - tl.pixel[1]);
    const tlBl = Math.hypot(bl.pixel[0] - tl.pixel[0], bl.pixel[1] - tl.pixel[1]);
    const tlBr = Math.hypot(br.pixel[0] - tl.pixel[0], br.pixel[1] - tl.pixel[1]);

    const realTlTr = Math.hypot(tr.real[0] - tl.real[0], tr.real[1] - tl.real[1]);
    const realTlBl = Math.hypot(bl.real[0] - tl.real[0], bl.real[1] - tl.real[1]);

    console.log(`  TL→TR: ${tlTr.toFixed(1)}px (expected ~165px, real: ${realTlTr}mm)`);
    console.log(`    Ratio: ${(tlTr / realTlTr).toFixed(3)} px/mm (expected ~1.03)`);
    
    console.log(`  TL→BL: ${tlBl.toFixed(1)}px (expected ~169px, real: ${realTlBl}mm)`);
    console.log(`    Ratio: ${(tlBl / realTlBl).toFixed(3)} px/mm (expected ~1.06)`);

    // Check for geometry problems
    if (tlTr < 150 || tlTr > 180) {
      console.log(`  ⚠️  Unusual horizontal distance: ${tlTr.toFixed(1)}px`);
      this.results.geometryIssues.push(`Horizontal distance out of range: ${tlTr.toFixed(1)}px`);
    }

    if (tlBl < 160 || tlBl > 190) {
      console.log(`  ⚠️  Unusual vertical distance: ${tlBl.toFixed(1)}px`);
      this.results.geometryIssues.push(`Vertical distance out of range: ${tlBl.toFixed(1)}px`);
    }

    // Check if rectangle is roughly square-ish (16x16cm)
    const aspectRatio = tlTr / tlBl;
    console.log(`  Aspect ratio: ${aspectRatio.toFixed(3)} (expected ~0.97)`);

    if (Math.abs(aspectRatio - 1.0) > 0.1) {
      console.log(`  ⚠️  Significant aspect ratio deviation`);
      this.results.geometryIssues.push(`Aspect ratio off: ${aspectRatio.toFixed(3)}`);
    }
  }

  private checkPixelDistribution() {
    console.log('\n📊 PIXEL DISTRIBUTION:');
    
    const pixelX = this.points.map(p => p.pixel[0]);
    const pixelY = this.points.map(p => p.pixel[1]);

    const minX = Math.min(...pixelX);
    const maxX = Math.max(...pixelX);
    const minY = Math.min(...pixelY);
    const maxY = Math.max(...pixelY);

    console.log(`  X range: ${minX.toFixed(0)} - ${maxX.toFixed(0)}px (span: ${(maxX-minX).toFixed(0)}px)`);
    console.log(`  Y range: ${minY.toFixed(0)} - ${maxY.toFixed(0)}px (span: ${(maxY-minY).toFixed(0)}px)`);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    console.log(`  Center: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);

    // Check clustering
    const clusters = this.findClusters();
    console.log(`  Point clustering: ${clusters} distinct regions`);
  }

  private findClusters(): number {
    // Simple clustering: count unique y-values (indicates different rows of points)
    const uniqueY = new Set<string>();
    this.points.forEach(p => {
      const yBucket = Math.round(p.pixel[1] / 10); // 10px tolerance
      uniqueY.add(yBucket.toString());
    });
    return uniqueY.size;
  }

  private calculateQuality() {
    console.log('\n🎯 QUALITY METRICS:');
    
    let quality = 100;
    let issues = 0;

    // Check for duplicates (severe)
    if (this.results.duplicatePixels.length > 0) {
      quality -= this.results.duplicatePixels.length * 15;
      issues += this.results.duplicatePixels.length;
      console.log(`  ❌ Duplicate pixels: -${this.results.duplicatePixels.length * 15} points`);
    } else {
      console.log(`  ✅ No duplicate pixels: +10 points`);
      quality = Math.min(100, quality + 10);
    }

    // Check for geometry issues
    if (this.results.geometryIssues.length > 0) {
      quality -= this.results.geometryIssues.length * 8;
      console.log(`  ⚠️  Geometry issues: -${this.results.geometryIssues.length * 8} points`);
    } else {
      console.log(`  ✅ Geometry valid: +5 points`);
      quality = Math.min(100, quality + 5);
    }

    quality = Math.max(0, quality);
    this.results.quality = quality;

    console.log(`\n  📈 FINAL QUALITY SCORE: ${quality.toFixed(0)}/100`);
    if (quality > 85) {
      console.log('     ✅ EXCELLENT - Ready for RANSAC');
    } else if (quality > 70) {
      console.log('     🟡 ACCEPTABLE - Some issues but usable');
    } else if (quality > 50) {
      console.log('     ⚠️  POOR - Significant issues detected');
    } else {
      console.log('     ❌ CRITICAL - Calibration data corrupted');
    }
  }

  private printResults() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📋 DETAILED RESULTS                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const output = {
      timestamp: new Date().toISOString(),
      totalPoints: this.points.length,
      duplicatePixels: this.results.duplicatePixels,
      geometryIssues: this.results.geometryIssues,
      qualityScore: this.results.quality,
      recommendation: this.getRecommendation()
    };

    console.log(JSON.stringify(output, null, 2));

    // Save to file
    const reportPath = path.join('/workspaces/2Thier', 'calibration-diagnostic.json');
    fs.writeFileSync(reportPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Report saved to: ${reportPath}`);
  }

  private getRecommendation(): string {
    if (this.results.quality > 85) {
      return 'PROCEED - Calibration is good, run RANSAC';
    } else if (this.results.duplicatePixels.length > 0) {
      return 'CRITICAL - Homography projection broken, need code fix';
    } else if (this.results.geometryIssues.length > 0) {
      return 'WARNING - Perspective/distortion issues, but may still work';
    } else {
      return 'INVESTIGATE - Unknown quality issue';
    }
  }
}

// Run diagnostic
const diagnostic = new CalibrationDiagnostic();
diagnostic.run();
