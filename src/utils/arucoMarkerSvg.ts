export function generateArucoMarkerSvg(markerSizeCm: number): string {
  const safeSizeCm = Number.isFinite(markerSizeCm) ? markerSizeCm : 16.8;
  const sizeMm = safeSizeCm * 10; // cm -> mm
  const viewBox = `0 0 ${sizeMm} ${sizeMm}`;

  // Proportions du marqueur ArUco MAGENTA
  // Bande noire externe: 0 → 1/6
  // Bande blanche: 1/6 → 1/3
  // Centre noir: 1/3 → 2/3
  // Bande blanche: 2/3 → 5/6
  // Bande noire interne: 5/6 → 1
  const band = sizeMm / 6;
  const magentaRadius = sizeMm * 0.028; // ~5mm pour 18cm
  const whiteRadius = sizeMm * 0.006; // ~1mm pour 18cm

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${sizeMm}mm" height="${sizeMm}mm">
      <rect x="0" y="0" width="${sizeMm}" height="${sizeMm}" fill="#000000"/>
      <rect x="${band}" y="${band}" width="${sizeMm - 2 * band}" height="${sizeMm - 2 * band}" fill="#FFFFFF"/>
      <rect x="${2 * band}" y="${2 * band}" width="${sizeMm - 4 * band}" height="${sizeMm - 4 * band}" fill="#000000"/>

      <circle cx="0" cy="0" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="${sizeMm}" cy="0" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="${sizeMm}" cy="${sizeMm}" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="0" cy="${sizeMm}" r="${magentaRadius}" fill="#FF00FF"/>

      <circle cx="0" cy="0" r="${whiteRadius}" fill="#FFFFFF"/>
      <circle cx="${sizeMm}" cy="0" r="${whiteRadius}" fill="#FFFFFF"/>
      <circle cx="${sizeMm}" cy="${sizeMm}" r="${whiteRadius}" fill="#FFFFFF"/>
      <circle cx="0" cy="${sizeMm}" r="${whiteRadius}" fill="#FFFFFF"/>
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
