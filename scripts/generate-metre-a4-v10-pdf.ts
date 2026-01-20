import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

const OUTPUT_PATH = path.resolve('public/printable/metre-a4-v10.pdf');
const SOURCE_V12_PNG = path.resolve('public/printable/metre-a4-v1.2-light.png');
const LOGO_LEFT = path.resolve('public/printable/Logo 2Thier avec slogan.png');
const LOGO_CENTER = path.resolve('public/printable/logo-metre.png');
const LOGO_RIGHT = path.resolve('public/printable/Logo CRM.png');

const mmToPt = (mm: number) => (mm * 72) / 25.4;
const pxPerMm = 300 / 25.4;

const pageWidthMm = 210;
const pageHeightMm = 297;

const smallSize = 50;
const largeSize = 100;

const smallTags = [
  { label: 'TL', x: 15, y: 10, id: 2 },
  { label: 'TC', x: 80, y: 10, id: 7 },
  { label: 'TR', x: 145, y: 10, id: 14 },
  { label: 'BL', x: 15, y: 215, id: 21 },
  { label: 'BC', x: 80, y: 215, id: 2 },
  { label: 'BR', x: 145, y: 215, id: 7 }
];

const largeTag = { x: 55, y: 100, id: 33 };

type CropSpec = { x_mm: number; y_mm: number; size_mm: number };
const v12Tags: Record<number, CropSpec> = {
  2: { x_mm: 30, y_mm: 30, size_mm: 20 },
  7: { x_mm: 160, y_mm: 30, size_mm: 20 },
  14: { x_mm: 30, y_mm: 247, size_mm: 20 },
  21: { x_mm: 160, y_mm: 247, size_mm: 20 },
  33: { x_mm: 45, y_mm: 80, size_mm: 120 }
};

const cropTag = async (id: number, targetMm: number): Promise<Buffer> => {
  const spec = v12Tags[id];
  const x = Math.round(spec.x_mm * pxPerMm);
  const y = Math.round(spec.y_mm * pxPerMm);
  const size = Math.round(spec.size_mm * pxPerMm);
  const targetPx = Math.round(targetMm * pxPerMm);
  return sharp(SOURCE_V12_PNG)
    .extract({ left: x, top: y, width: size, height: size })
    .resize(targetPx, targetPx, { fit: 'fill' })
    .png()
    .toBuffer();
};

async function main(): Promise<void> {
  const doc = new PDFDocument({
    size: [mmToPt(pageWidthMm), mmToPt(pageHeightMm)],
    margin: 0
  });

  doc.pipe(fs.createWriteStream(OUTPUT_PATH));

// Bordure extérieure (optionnelle)
doc
  .lineWidth(0.6)
  .rect(mmToPt(1), mmToPt(1), mmToPt(pageWidthMm - 2), mmToPt(pageHeightMm - 2))
  .stroke();

  // TOP + avertissements (entre logos et grand tag)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('TOP ↑', mmToPt(90), mmToPt(80), { width: mmToPt(30), align: 'center' });

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('⚠ NE PAS AJUSTER À LA PAGE ⚠', mmToPt(20), mmToPt(88), {
      width: mmToPt(170),
      align: 'center'
    });

  doc
    .font('Helvetica')
    .fontSize(8)
    .text('Imprimer à 100% (taille réelle)', mmToPt(20), mmToPt(94), {
      width: mmToPt(170),
      align: 'center'
    });

  // Logos (images)
  const logoY = 62; // +2mm pour ne pas toucher les AprilTags
  const logoSideHeightMm = 20; // hauteur visuelle identique gauche/droite
  const leftEdgeMm = 15;
  const rightEdgeMm = 195; // bord extérieur du tag droit (x=145 + 50)

  let rightLogoWidthMm = 0;
  if (fs.existsSync(LOGO_LEFT)) {
    const meta = await sharp(LOGO_LEFT).metadata();
    if (meta.width && meta.height) {
      // largeur calculée uniquement si besoin d'alignement à droite
      // (non utilisée pour le logo gauche, qui est aligné sur le bord gauche)
    }
  }
  if (fs.existsSync(LOGO_RIGHT)) {
    const meta = await sharp(LOGO_RIGHT).metadata();
    if (meta.width && meta.height) {
      rightLogoWidthMm = logoSideHeightMm * (meta.width / meta.height);
    }
  }

  if (fs.existsSync(LOGO_LEFT)) {
    doc.image(LOGO_LEFT, mmToPt(leftEdgeMm), mmToPt(logoY), { height: mmToPt(logoSideHeightMm) });
  }
  if (fs.existsSync(LOGO_CENTER)) {
    const centerWidthMm = 50; // 5 cm
    const centerX = (pageWidthMm - centerWidthMm) / 2;
    doc.image(LOGO_CENTER, mmToPt(centerX), mmToPt(logoY), { width: mmToPt(centerWidthMm) });
  }
  if (fs.existsSync(LOGO_RIGHT)) {
    const rightX = rightLogoWidthMm > 0 ? rightEdgeMm - rightLogoWidthMm : 165;
    doc.image(LOGO_RIGHT, mmToPt(rightX), mmToPt(logoY), { height: mmToPt(logoSideHeightMm) });
  }

  // AprilTags réels (croppés depuis v1.2)
  const smallBuffers = await Promise.all(smallTags.map((tag) => cropTag(tag.id, smallSize)));
  smallTags.forEach((tag, idx) => {
    doc.image(smallBuffers[idx], mmToPt(tag.x), mmToPt(tag.y), { width: mmToPt(smallSize), height: mmToPt(smallSize) });
  });

  const largeBuffer = await cropTag(largeTag.id, largeSize);
  doc.image(largeBuffer, mmToPt(largeTag.x), mmToPt(largeTag.y), { width: mmToPt(largeSize), height: mmToPt(largeSize) });

// Règle verticale à droite du grand carré
const ruleVX = 163;
const ruleVY = 100;
const ruleVLength = 100;

doc
  .lineWidth(0.6)
  .moveTo(mmToPt(ruleVX), mmToPt(ruleVY))
  .lineTo(mmToPt(ruleVX), mmToPt(ruleVY + ruleVLength))
  .stroke();

for (let i = 0; i <= ruleVLength; i += 10) {
  const tick = i % 50 === 0 ? 4 : 2;
  doc
    .moveTo(mmToPt(ruleVX), mmToPt(ruleVY + i))
    .lineTo(mmToPt(ruleVX + tick), mmToPt(ruleVY + i))
    .stroke();
}

doc
  .fontSize(7)
  .text('100 mm', mmToPt(ruleVX + 6), mmToPt(ruleVY + ruleVLength - 5));

// Règle horizontale sous le grand carré
const ruleHX = 55;
const ruleHY = 208;
const ruleHLength = 100;

doc
  .lineWidth(0.6)
  .moveTo(mmToPt(ruleHX), mmToPt(ruleHY))
  .lineTo(mmToPt(ruleHX + ruleHLength), mmToPt(ruleHY))
  .stroke();

for (let i = 0; i <= ruleHLength; i += 10) {
  const tick = i % 50 === 0 ? 4 : 2;
  doc
    .moveTo(mmToPt(ruleHX + i), mmToPt(ruleHY))
    .lineTo(mmToPt(ruleHX + i), mmToPt(ruleHY + tick))
    .stroke();
}

doc
  .fontSize(7)
  .text('100 mm', mmToPt(ruleHX + ruleHLength - 15), mmToPt(ruleHY + 4));

// Warnings déplacés entre rangée haute et grand tag

  doc.end();

  console.log(`✅ PDF généré: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('❌ Erreur génération PDF V10:', error);
  process.exit(1);
});
