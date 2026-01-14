export function generateArucoMarkerSvg(markerSizeCm: number): string {
  const safeSizeCm = Number.isFinite(markerSizeCm) ? markerSizeCm : 16.8;
  const sizeMm = safeSizeCm * 10; // cm -> mm
  
  // 🎯 FORMAT A4 (210×297mm) - Marqueur centré
  const a4Width = 210;
  const a4Height = 297;
  const offsetX = (a4Width - sizeMm) / 2;
  const offsetY = (a4Height - sizeMm) / 2;
  const viewBox = `0 0 ${a4Width} ${a4Height}`;

  // 🎯 DESIGN ADAPTATIF : Cadre magenta FIXE 2mm + bandes proportionnelles
  // 
  // Exemple 16.8cm :
  // - Cadre MAGENTA: 0 → 2mm (FIXE)
  // - Bande noire: 2mm → 28mm (2.8cm proportionnel = 16.8/6)
  // - Bande blanche: 28mm → 56mm (2.8cm)
  // - Pattern ArUco: 56mm → 112mm (5.6cm)
  // - Bande blanche: 112mm → 140mm (2.8cm)
  // - Bande noire: 140mm → 166mm (2.8cm)
  // - Cadre MAGENTA: 166mm → 168mm (FIXE)
  //
  // Exemple 18cm :
  // - Cadre MAGENTA: 0 → 2mm (FIXE, identique)
  // - Bande noire: 2mm → 32mm (3cm proportionnel = 18/6)
  // - Bande blanche: 32mm → 62mm (3cm)
  // - Pattern ArUco: 62mm → 122mm (6cm)
  // - Bande blanche: 122mm → 152mm (3cm)
  // - Bande noire: 152mm → 178mm (3cm)
  // - Cadre MAGENTA: 178mm → 180mm (FIXE)
  //
  // ✅ EXTÉRIEUR du cadre magenta = ${safeSizeCm}cm (mesure de référence)
  // ✅ Intersection magenta/noir = début des bandes proportionnelles
  
  const magentaBorderMm = 2; // FIXE - ne change jamais
  const proportionalBandMm = sizeMm / 6; // Adaptatif selon la taille
  
  // Les bandes intérieures commencent après le cadre magenta
  const innerStart = magentaBorderMm;
  const blackBandStart = innerStart;
  const whiteBand1Start = blackBandStart + proportionalBandMm;
  const patternStart = whiteBand1Start + proportionalBandMm;
  const patternSize = proportionalBandMm * 2;
  
  // Cercles magenta aux 4 coins (rayon ~5mm adaptatif)
  const cornerCircleRadius = sizeMm * 0.028; // ~4.7mm pour 16.8cm, 5mm pour 18cm
  
  // Point central magenta (rayon 1mm = diamètre 2mm)
  const centerX = offsetX + sizeMm / 2;
  const centerY = offsetY + sizeMm / 2;
  const centerRadius = 1; // 1mm rayon = 2mm diamètre

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${a4Width}mm" height="${a4Height}mm">
      <!-- Fond A4 blanc -->
      <rect x="0" y="0" width="${a4Width}" height="${a4Height}" fill="#FFFFFF"/>
      
      <!-- Marqueur ArUco ${safeSizeCm}cm centré -->
      <g transform="translate(${offsetX}, ${offsetY})">
        <!-- Cadre MAGENTA extérieur FIXE 2mm - Bord extérieur = ${safeSizeCm}cm -->
        <rect x="0" y="0" width="${sizeMm}" height="${sizeMm}" fill="#FF00FF"/>
        
        <!-- Bande noire (proportionnelle: ${proportionalBandMm.toFixed(1)}mm = ${(proportionalBandMm/10).toFixed(1)}cm) -->
        <rect x="${innerStart}" y="${innerStart}" 
              width="${sizeMm - 2 * innerStart}" 
              height="${sizeMm - 2 * innerStart}" 
              fill="#000000"/>
        
        <!-- Bande blanche -->
        <rect x="${whiteBand1Start}" y="${whiteBand1Start}" 
              width="${sizeMm - 2 * whiteBand1Start}" 
              height="${sizeMm - 2 * whiteBand1Start}" 
              fill="#FFFFFF"/>
        
        <!-- Pattern ArUco central -->
        <rect x="${patternStart}" y="${patternStart}" 
              width="${patternSize}" 
              height="${patternSize}" 
              fill="#000000"/>
        
        <!-- Cercles MAGENTA aux 4 coins (repères visuels + validation) -->
        <circle cx="0" cy="0" r="${cornerCircleRadius}" fill="#FF00FF"/>
        <circle cx="${sizeMm}" cy="0" r="${cornerCircleRadius}" fill="#FF00FF"/>
        <circle cx="${sizeMm}" cy="${sizeMm}" r="${cornerCircleRadius}" fill="#FF00FF"/>
        <circle cx="0" cy="${sizeMm}" r="${cornerCircleRadius}" fill="#FF00FF"/>
        
        <!-- Point central MAGENTA (centrage + repère perspective) -->
        <circle cx="${sizeMm / 2}" cy="${sizeMm / 2}" r="${centerRadius}" fill="#FF00FF"/>
      </g>
      
      <!-- Texte informatif -->
      <text x="${a4Width / 2}" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">
        Marqueur ArUco ${safeSizeCm}cm - Cadre magenta 2mm fixe - Imprimer sur A4 à 100%
      </text>
      <text x="${a4Width / 2}" y="${a4Height - 10}" text-anchor="middle" font-family="Arial" font-size="8" fill="#999">
        Bord extérieur du cadre magenta = ${safeSizeCm}cm de référence
      </text>
    </svg>
  `;
}

export function downloadArucoMarkerSvg(markerSizeCm: number): void {
  const svg = generateArucoMarkerSvg(markerSizeCm);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marqueur-aruco-${markerSizeCm}cm.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
