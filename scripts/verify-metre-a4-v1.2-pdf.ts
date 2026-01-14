import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { detectAprilTagsMetreA4 } from '../src/lib/apriltag-detector-server.ts';

type TagId = 2 | 7 | 14 | 21;

const PDF_PATH = path.resolve('public/printable/metre-a4-v1.2-light.pdf');
const OUT_DIR = path.resolve('tmp/pdf_extract');
const OUT_PREFIX = path.join(OUT_DIR, 'metre-a4-v1.2-light');

const REQUIRED_IDS: TagId[] = [2, 7, 14, 21];

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Nettoyage des anciennes sorties pour éviter les confusions
  for (const suffix of ['-1.png', '-1.svg', '-1.pdf']) {
    const p = `${OUT_PREFIX}${suffix}`;
    if (await fileExists(p)) {
      await fs.unlink(p);
    }
  }

  // Render PDF -> PNG at a fixed DPI for deterministic pixel size
  const dpi = 600;
  const proc = spawnSync(
    'pdftocairo',
    ['-png', '-r', String(dpi), '-f', '1', '-l', '1', PDF_PATH, OUT_PREFIX],
    { stdio: 'inherit' }
  );
  if (proc.status !== 0) {
    process.exit(proc.status ?? 1);
  }

  const pngPath = `${OUT_PREFIX}-1.png`;
  if (!(await fileExists(pngPath))) {
    throw new Error(`PNG attendu introuvable: ${pngPath}`);
  }

  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const widthPx = info.width;
  const heightPx = info.height;

  // A4 portrait
  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const mmPerPxX = pageWidthMm / widthPx;
  const mmPerPxY = pageHeightMm / heightPx;
  const mmPerPxFromDpi = 25.4 / dpi;

  console.log('\n=== PDF → PNG ===');
  console.log(`PNG: ${path.relative(process.cwd(), pngPath)}`);
  console.log(`DPI demandé: ${dpi}`);
  console.log(`Taille: ${widthPx}×${heightPx} px`);
  console.log(
    `Échelle (via A4): ${mmPerPxX.toFixed(6)} mm/px (X), ${mmPerPxY.toFixed(6)} mm/px (Y)`
  );
  console.log(`Échelle (via DPI): ${mmPerPxFromDpi.toFixed(6)} mm/px`);

  console.log('\n=== Détection AprilTags ===');
  const detections = detectAprilTagsMetreA4(data, widthPx, heightPx);

  const detectionsById = new Map<number, (typeof detections)[number][]>();
  for (const det of detections) {
    const arr = detectionsById.get(det.id) ?? [];
    arr.push(det);
    detectionsById.set(det.id, arr);
  }

  const missing = REQUIRED_IDS.filter((id) => (detectionsById.get(id)?.length ?? 0) === 0);
  if (missing.length > 0) {
    throw new Error(`AprilTags manquants: ${missing.join(', ')} (trouvés: ${detections.map((d) => d.id).join(', ') || 'aucun'})`);
  }

  function avgSideMm(det: { corners: { x: number; y: number }[] }): number {
    const [c0, c1, c2, c3] = det.corners;
    const sidesPx = [distance(c0, c1), distance(c1, c2), distance(c2, c3), distance(c3, c0)];
    const avgPx = sidesPx.reduce((s, v) => s + v, 0) / sidesPx.length;
    const mmPerPx = (mmPerPxX + mmPerPxY) / 2;
    return avgPx * mmPerPx;
  }

  type Quadrant = 'TL' | 'TR' | 'BL' | 'BR';
  function quadrantMetric(det: { center: { x: number; y: number } }, quadrant: Quadrant): number {
    const { x, y } = det.center;
    switch (quadrant) {
      case 'TL':
        return x + y; // plus petit
      case 'TR':
        return -(x - y); // x-y plus grand => métrique plus petite
      case 'BL':
        return x - y; // plus petit
      case 'BR':
        return -(x + y); // plus grand => métrique plus petite
    }
  }

  function pickDet(id: TagId, quadrant: Quadrant): (typeof detections)[number] {
    const cands = detectionsById.get(id) ?? [];
    if (cands.length === 1) return cands[0];

    const sorted = [...cands].sort((a, b) => quadrantMetric(a, quadrant) - quadrantMetric(b, quadrant));
    const best = sorted.slice(0, Math.min(3, sorted.length));
    let chosen = best[0];
    let bestSizeDev = Math.abs(avgSideMm(chosen) - 20);
    for (const cand of best.slice(1)) {
      const dev = Math.abs(avgSideMm(cand) - 20);
      if (dev < bestSizeDev) {
        bestSizeDev = dev;
        chosen = cand;
      }
    }

    console.log(`   ℹ️ ID=${id} a ${cands.length} détections; sélection pour ${quadrant}:`);
    for (const cand of best) {
      const s = avgSideMm(cand);
      console.log(
        `      - centre=(${cand.center.x.toFixed(2)}, ${cand.center.y.toFixed(2)}) taille≈${s.toFixed(2)}mm metric=${quadrantMetric(
          cand,
          quadrant
        ).toFixed(2)}`
      );
    }

    return chosen;
  }

  const tl = pickDet(2, 'TL');
  const tr = pickDet(7, 'TR');
  const bl = pickDet(14, 'BL');
  const br = pickDet(21, 'BR');

  console.log('Centres (px):');
  console.log(`  TL (2):  (${tl.center.x.toFixed(2)}, ${tl.center.y.toFixed(2)})`);
  console.log(`  TR (7):  (${tr.center.x.toFixed(2)}, ${tr.center.y.toFixed(2)})`);
  console.log(`  BL (14): (${bl.center.x.toFixed(2)}, ${bl.center.y.toFixed(2)})`);
  console.log(`  BR (21): (${br.center.x.toFixed(2)}, ${br.center.y.toFixed(2)})`);

  const tlTrPx = distance(tl.center, tr.center);
  const tlBlPx = distance(tl.center, bl.center);

  // Distances principalement horizontale/verticale: utiliser mmPerPxX / mmPerPxY respectivement
  const tlTrMm = tlTrPx * mmPerPxX;
  const tlBlMm = tlBlPx * mmPerPxY;

  console.log('\n=== Distances (centres) ===');
  console.log(`TL↔TR: ${tlTrPx.toFixed(2)} px → ${tlTrMm.toFixed(2)} mm (${(tlTrMm / 10).toFixed(2)} cm)`);
  console.log(`TL↔BL: ${tlBlPx.toFixed(2)} px → ${tlBlMm.toFixed(2)} mm (${(tlBlMm / 10).toFixed(2)} cm)`);

  const sizesMm = [avgSideMm(tl), avgSideMm(tr), avgSideMm(bl), avgSideMm(br)];
  const meanSize = sizesMm.reduce((s, v) => s + v, 0) / sizesMm.length;

  console.log('\n=== Taille AprilTag (estimée) ===');
  console.log(`Côtés (mm): ${sizesMm.map((v) => v.toFixed(2)).join(', ')}`);
  console.log(`Moyenne: ${meanSize.toFixed(2)} mm (attendu ≈ 20.00 mm)`);

  const expectedWidthMm = 130;
  const expectedHeightMm = 217;
  console.log('\n=== Comparaison attendu ===');
  console.log(`Attendu TL↔TR: ${expectedWidthMm} mm ; écart: ${(tlTrMm - expectedWidthMm).toFixed(2)} mm`);
  console.log(`Attendu TL↔BL: ${expectedHeightMm} mm ; écart: ${(tlBlMm - expectedHeightMm).toFixed(2)} mm`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
