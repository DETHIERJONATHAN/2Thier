/**
 * 🎨 PAGE BACKGROUNDS - SVG IMPORTÉS
 * Les SVG sont chargés et recolorés dynamiquement selon le thème.
 */

import invoiceA from '../../../Depot/vecteezy_business-company-invoice-template_6314850.svg?raw';
import invoiceB from '../../../Depot/vecteezy_corporate-business-invoice-template_6314448.svg?raw';
import invoiceC from '../../../Depot/vecteezy_business-company-invoice-template_6315045.svg?raw';

export interface PageBackground {
  id: string;
  name: string;
  description: string;
  category: 'premium' | 'corporate' | 'creative' | 'minimal' | 'luxury' | 'tech' | 'custom';
  svgGenerator: (colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    bg: string;
  }) => string;
}

const toDataUri = (rawSvg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;

const getViewBox = (rawSvg: string) => {
  const match = rawSvg.match(/viewBox="([^"]+)"/i);
  if (!match) {
    return { x: 0, y: 0, w: 1200, h: 1600 };
  }
  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return { x: 0, y: 0, w: 1200, h: 1600 };
  }
  const [x, y, w, h] = parts;
  return { x, y, w, h };
};

const extractPageBounds = (rawSvg: string) => {
  const bounds: Array<{ x: number; y: number; width: number; height: number }> = [];
  const whiteFillRegex = /fill="rgb\(100%,\s*100%,\s*100%\)"[\s\S]*?d="([^"]+)"/gi;
  const matches = rawSvg.matchAll(whiteFillRegex);

  for (const match of matches) {
    const d = match[1];
    const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) || [];
    if (nums.length < 4) {
      continue;
    }
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const width = xMax - xMin;
    const height = yMax - yMin;
    if (width > 500 && height > 500) {
      bounds.push({ x: xMin, y: yMin, width, height });
    }
  }

  const uniqueBounds = bounds
    .sort((a, b) => a.x - b.x)
    .filter((rect, idx, arr) => idx === 0 || Math.abs(rect.x - arr[idx - 1].x) > 10);

  return uniqueBounds;
};

const buildSinglePageViewBox = (rawSvg: string, pages: number, pageIndex: number) => {
  const vb = getViewBox(rawSvg);
  const bounds = extractPageBounds(rawSvg);
  
  if (bounds.length > 0) {
    const safeIndex = Math.max(0, Math.min(pageIndex, bounds.length - 1));
    const rect = bounds[safeIndex];
    // Utiliser exactement les dimensions de la page détectée
    // Les courbes décoratives seront visibles grâce à overflow="visible"
    return `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
  }

  const safePages = Math.max(1, pages);
  const pageW = vb.w / safePages;
  const x = vb.x + Math.max(0, Math.min(pageIndex, safePages - 1)) * pageW;
  return `${x} ${vb.y} ${pageW} ${vb.h}`;
};

const applyThemeToSvg = (
  rawSvg: string,
  colors: { primary: string; secondary: string; accent: string; text: string }
) => {
  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '');
    if (normalized.length === 3) {
      const r = parseInt(normalized[0] + normalized[0], 16);
      const g = parseInt(normalized[1] + normalized[1], 16);
      const b = parseInt(normalized[2] + normalized[2], 16);
      return { r, g, b };
    }
    if (normalized.length === 6) {
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  };

  const isGray = (r: number, g: number, b: number) =>
    Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;

  const chooseThemeColor = (r: number, g: number, b: number) => {
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (luminance < 0.35) return colors.secondary;
    if (luminance < 0.7) return colors.primary;
    return colors.accent;
  };

  const mapRgbToTheme = (r: number, g: number, b: number) => {
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (isGray(r, g, b)) {
      if (luminance > 0.94) return null;
    }
    return chooseThemeColor(r, g, b);
  };

  const replaceHexInString = (value: string) =>
    value.replace(/#([0-9a-f]{3}|[0-9a-f]{6})/gi, (match, code, offset, str) => {
      const context = str.slice(Math.max(0, offset - 4), offset).toLowerCase();
      if (context.includes('url(')) return match;
      const rgb = hexToRgb(`#${code}`);
      if (!rgb) return match;
      const mapped = mapRgbToTheme(rgb.r, rgb.g, rgb.b);
      return mapped || match;
    });

  const parseRgbParts = (inner: string) => {
    const parts = inner.split(',').map((v) => v.trim());
    if (parts.length < 3) return null;
    const toChannel = (value: string) => {
      if (value.endsWith('%')) {
        const pct = parseFloat(value.slice(0, -1));
        return Number.isNaN(pct) ? null : (pct / 100) * 255;
      }
      const num = parseFloat(value);
      return Number.isNaN(num) ? null : num;
    };
    const r = toChannel(parts[0]);
    const g = toChannel(parts[1]);
    const b = toChannel(parts[2]);
    if (r === null || g === null || b === null) return null;
    return { r, g, b };
  };

  const replaceRgbInString = (value: string) =>
    value.replace(/rgb\(([^)]+)\)/gi, (match, inner) => {
      const parsed = parseRgbParts(inner);
      if (!parsed) return match;
      const mapped = mapRgbToTheme(parsed.r, parsed.g, parsed.b);
      return mapped || match;
    });

  const replaceRgbaInString = (value: string) =>
    value.replace(/rgba\(([^)]+)\)/gi, (match, inner) => {
      const parts = inner.split(',').map((v) => v.trim());
      if (parts.length < 4) return match;
      const parsed = parseRgbParts(parts.slice(0, 3).join(','));
      if (!parsed) return match;
      const alpha = parts[3];
      const mapped = mapRgbToTheme(parsed.r, parsed.g, parsed.b);
      if (!mapped) return match;
      const mappedRgb = hexToRgb(mapped);
      if (!mappedRgb) return match;
      return `rgba(${Math.round(mappedRgb.r)}, ${Math.round(mappedRgb.g)}, ${Math.round(mappedRgb.b)}, ${alpha})`;
    });

  const applyPaletteMapping = (input: string) => {
    const palette = [colors.primary, colors.secondary, colors.accent];
    const entries = new Map<string, { count: number; rgb: { r: number; g: number; b: number } }>();

    const addEntry = (token: string, rgb: { r: number; g: number; b: number }) => {
      const key = token.toLowerCase();
      const current = entries.get(key);
      if (current) {
        current.count += 1;
      } else {
        entries.set(key, { count: 1, rgb });
      }
    };

    input.replace(/#([0-9a-f]{3}|[0-9a-f]{6})/gi, (match, code, offset, str) => {
      const context = str.slice(Math.max(0, offset - 4), offset).toLowerCase();
      if (context.includes('url(')) return match;
      const rgb = hexToRgb(`#${code}`);
      if (!rgb) return match;
      if (isGray(rgb.r, rgb.g, rgb.b)) return match;
      const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
      if (luminance > 0.95) return match;
      addEntry(match, rgb);
      return match;
    });

    input.replace(/rgb\(([^)]+)\)/gi, (match, inner) => {
      const parsed = parseRgbParts(inner);
      if (!parsed) return match;
      const r = parsed.r;
      const g = parsed.g;
      const b = parsed.b;
      if (isGray(r, g, b)) return match;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (luminance > 0.95) return match;
      addEntry(match, { r, g, b });
      return match;
    });

    const sorted = [...entries.entries()]
      .filter(([, meta]) => !isGray(meta.rgb.r, meta.rgb.g, meta.rgb.b))
      .sort((a, b) => b[1].count - a[1].count);

    if (sorted.length === 0) return input;

    let output = input;
    sorted.forEach(([token], index) => {
      const color = palette[index % palette.length];
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(escaped, 'gi'), color);
    });

    return output;
  };

  const map = [
    { from: /#ff0055/gi, to: colors.primary },
    { from: /#ff3b30/gi, to: colors.primary },
    { from: /#ff6a00/gi, to: colors.primary },
    { from: /#ff7a00/gi, to: colors.primary },
    { from: /#0044ff/gi, to: colors.secondary },
    { from: /#0066ff/gi, to: colors.secondary },
    { from: /#1e3a8a/gi, to: colors.secondary },
  ];

  const withHex = map.reduce((svg, rule) => svg.replace(rule.from, rule.to), rawSvg);

  const recolorRgb = (input: string) => {
    const parseChannel = (value: string) => {
      const raw = String(value).trim();
      if (raw.endsWith('%')) {
        const pct = parseFloat(raw.slice(0, -1));
        if (Number.isNaN(pct)) return null;
        return (pct / 100) * 255;
      }
      const num = parseFloat(raw);
      return Number.isNaN(num) ? null : num;
    };

    const mapColor = (r: number, g: number, b: number) => {
      const gray = isGray(r, g, b);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (gray && luminance > 0.92) return null;
      return chooseThemeColor(r, g, b);
    };

    const replaceAttr = (attr: 'fill' | 'stop-color' | 'stroke') =>
      new RegExp(`${attr}="rgb\\(([^,]+),\\s*([^,]+),\\s*([^\\)]+)\\)"`, 'gi');

    const applyReplace = (attr: 'fill' | 'stop-color' | 'stroke', source: string) =>
      source.replace(replaceAttr(attr), (_m, rRaw, gRaw, bRaw) => {
        const r = parseChannel(rRaw);
        const g = parseChannel(gRaw);
        const b = parseChannel(bRaw);
        if (r === null || g === null || b === null) return _m;
        const target = mapColor(r, g, b);
        if (!target) return _m;
        return `${attr}="${target}"`;
      });

    let output = input;
    output = applyReplace('stop-color', output);
    output = applyReplace('fill', output);
    output = applyReplace('stroke', output);
    return output;
  };

  // Appliquer recolorRgb en premier pour les attributs stop-color/fill/stroke
  const withRgb = recolorRgb(withHex);
  
  // Remplacer les couleurs dans les blocs <style>
  const replaceColorsInCss = (css: string) => replaceRgbaInString(replaceRgbInString(replaceHexInString(css)));
  const withStyleBlocks = withRgb.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_m, attrs, css) => `<style${attrs}>${replaceColorsInCss(css)}</style>`
  );
  
  // Dernier passage pour les attributs fill/stroke/stop-color restants
  return withStyleBlocks
    .replace(/(fill|stroke|stop-color)="([^"]+)"/gi, (_m, attr, value) => {
      if (value.includes('url(')) return `${attr}="${value}"`;
      // Si c'est déjà un hex provenant du thème, ne pas retraiter
      if (value.startsWith('#') && (value === colors.primary || value === colors.secondary || value === colors.accent || value === colors.text)) {
        return `${attr}="${value}"`;
      }
      const next = replaceRgbaInString(replaceRgbInString(replaceHexInString(value)));
      return `${attr}="${next}"`;
    })
    .replace(/style="([^"]+)"/gi, (_m, styleValue) => {
      const next = replaceRgbaInString(replaceRgbInString(replaceHexInString(styleValue)));
      return `style="${next}"`;
    });
};

const extractInnerSvg = (rawSvg: string) =>
  rawSvg
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');

const removeTextNodes = (rawSvg: string) => {
  const withoutTextTags = rawSvg
    .replace(/<text[\s\S]*?<\/text>/gi, '')
    .replace(/<tspan[\s\S]*?<\/tspan>/gi, '');

  const isDarkGray = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const isGray = Math.abs(r - g) < 1 && Math.abs(g - b) < 1 && Math.abs(r - b) < 1;
    return isGray && max <= 70 && min >= 0;
  };

  const getNumbers = (value?: string) => {
    if (!value) return [] as number[];
    return value.match(/-?\d*\.?\d+/g)?.map(Number) || [];
  };

  const getPathBounds = (d?: string) => {
    const nums = getNumbers(d);
    if (nums.length < 4) return null;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    return { width: xMax - xMin, height: yMax - yMin };
  };

  const getAttr = (attr: string, input: string) => {
    const match = input.match(new RegExp(`${attr}=\"([^\"]+)\"`, 'i'));
    return match?.[1];
  };

  const shouldRemoveByBounds = (width?: number, height?: number) => {
    if (!width || !height) return false;
    if (width >= 500 || height >= 500) return false;
    return width <= 420 && height <= 200;
  };

  const removeGrayShapes = (input: string) =>
    input
      .replace(
        /<(path|rect|polygon|circle|ellipse)([^>]*?)fill=\"rgb\(\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)\"([^>]*)\s*\/>/gi,
        (match, _tag, _pre, rRaw, gRaw, bRaw) => {
          const r = parseFloat(rRaw);
          const g = parseFloat(gRaw);
          const b = parseFloat(bRaw);
          if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return match;
          return isDarkGray(r, g, b) ? '' : match;
        }
      )
      .replace(
        /<(path|rect|polygon|circle|ellipse)([^>]*?)fill=\"rgb\(\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)\"([^>]*)>([\s\S]*?)<\/(path|rect|polygon|circle|ellipse)>/gi,
        (match, _tag, _pre, rRaw, gRaw, bRaw) => {
          const r = parseFloat(rRaw);
          const g = parseFloat(gRaw);
          const b = parseFloat(bRaw);
          if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return match;
          return isDarkGray(r, g, b) ? '' : match;
        }
      );

  const removeSmallShapes = (input: string) =>
    input.replace(/<(path|rect|polygon|circle|ellipse)([^>]*)>/gi, (match, tag) => {
      if (/fill=\"none\"/i.test(match)) return match;
      const d = getAttr('d', match);
      const points = getAttr('points', match);
      const width = parseFloat(getAttr('width', match) || '');
      const height = parseFloat(getAttr('height', match) || '');
      const rx = parseFloat(getAttr('rx', match) || '');
      const ry = parseFloat(getAttr('ry', match) || '');
      const r = parseFloat(getAttr('r', match) || '');

      let bounds: { width: number; height: number } | null = null;

      if (tag === 'rect' && Number.isFinite(width) && Number.isFinite(height)) {
        bounds = { width, height };
      } else if (tag === 'circle' && Number.isFinite(r)) {
        bounds = { width: r * 2, height: r * 2 };
      } else if (tag === 'ellipse' && Number.isFinite(rx) && Number.isFinite(ry)) {
        bounds = { width: rx * 2, height: ry * 2 };
      } else if (tag === 'polygon' && points) {
        const nums = getNumbers(points);
        if (nums.length >= 4) {
          const xs: number[] = [];
          const ys: number[] = [];
          for (let i = 0; i < nums.length - 1; i += 2) {
            xs.push(nums[i]);
            ys.push(nums[i + 1]);
          }
          bounds = { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        }
      } else if (tag === 'path' && d) {
        bounds = getPathBounds(d);
      }

      if (bounds && shouldRemoveByBounds(bounds.width, bounds.height)) {
        return '';
      }

      return match;
    });

  return removeSmallShapes(removeGrayShapes(withoutTextTags));
};

const buildThemedSvgDataUri = (
  rawSvg: string,
  colors: { primary: string; secondary: string; accent: string; text: string },
  pages: number,
  pageIndex: number
) => {
  const themed = applyThemeToSvg(rawSvg, colors);
  const withoutText = removeTextNodes(themed);
  const inner = extractInnerSvg(withoutText);
  const viewBox = buildSinglePageViewBox(rawSvg, pages, pageIndex);
  const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);
  
  // Clipper le contenu pour ne pas voir les pages adjacentes
  const clipId = `clip-page-${Date.now()}`;
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <clipPath id="${clipId}">
        <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#${clipId})">${inner}</g>
  </svg>`;
  return toDataUri(wrapped);
};

export const PAGE_BACKGROUNDS: PageBackground[] = [
  {
    id: 'bg_invoice_vecteezy_6314850',
    name: 'Invoice Vecteezy 6314850',
    description: 'Template importé (colors dynamiques).',
    category: 'premium',
    svgGenerator: (c) => buildThemedSvgDataUri(invoiceA, c, 3, 1),
  },
  {
    id: 'bg_invoice_vecteezy_6314448',
    name: 'Invoice Vecteezy 6314448',
    description: 'Template importé (colors dynamiques).',
    category: 'corporate',
    svgGenerator: (c) => buildThemedSvgDataUri(invoiceB, c, 3, 1),
  },
  {
    id: 'bg_invoice_vecteezy_6315045',
    name: 'Invoice Vecteezy 6315045',
    description: 'Template importé (colors dynamiques).',
    category: 'premium',
    svgGenerator: (c) => buildThemedSvgDataUri(invoiceC, c, 2, 0),
  },
];

export const getBackgroundsByCategory = (category: PageBackground['category']) => {
  return PAGE_BACKGROUNDS.filter(bg => bg.category === category);
};

export const buildCustomBackgroundDataUri = (
  rawSvg: string,
  colors: { primary: string; secondary: string; accent: string; text: string; bg: string }
) => {
  console.log('🎨 [buildCustomBackgroundDataUri] Applying theme colors:', colors.primary, colors.secondary, colors.accent);
  
  // Appliquer le thème au SVG
  const themed = applyThemeToSvg(rawSvg, colors);
  const withoutText = removeTextNodes(themed);
  
  // Extraire le viewBox original ou utiliser un défaut
  const vb = getViewBox(rawSvg);
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  
  // Extraire le contenu interne
  const inner = extractInnerSvg(withoutText);
  
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" overflow="visible">${inner}</svg>`;
  return toDataUri(wrapped);
};
