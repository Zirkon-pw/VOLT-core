export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSVA {
  h: number;
  s: number;
  v: number;
  a: number;
}

export function hsvaToRgba({ h, s, v, a }: HSVA): RGBA {
  const hh = h / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;
  if (hh <= 1) {
    r = c;
    g = x;
  } else if (hh <= 2) {
    r = x;
    g = c;
  } else if (hh <= 3) {
    g = c;
    b = x;
  } else if (hh <= 4) {
    g = x;
    b = c;
  } else if (hh <= 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a,
  };
}

export function rgbaToHsva({ r, g, b, a }: RGBA): HSVA {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d + 6) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
  }

  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max, a };
}

export function rgbaToHex({ r, g, b, a }: RGBA): string {
  const hex = [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  if (a < 1) {
    const ah = Math.round(a * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${hex}${ah}`;
  }
  return `#${hex}`;
}

export function hexToRgba(hex: string): RGBA | null {
  const clean = hex.replace(/^#/, '');
  let r: number, g: number, b: number, a = 1;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else if (clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
    a = parseInt(clean.slice(6, 8), 16) / 255;
  } else {
    return null;
  }

  if ([r, g, b].some((v) => isNaN(v))) return null;
  return { r, g, b, a };
}

export function parseColor(input: string): RGBA | null {
  if (!input) return null;

  if (input.startsWith('#')) return hexToRgba(input);

  const rgbaMatch = input.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  return null;
}

export function formatRgba({ r, g, b, a }: RGBA): string {
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function clampRgba(c: RGBA): RGBA {
  return {
    r: clamp(Math.round(c.r), 0, 255),
    g: clamp(Math.round(c.g), 0, 255),
    b: clamp(Math.round(c.b), 0, 255),
    a: clamp(c.a, 0, 1),
  };
}

export function clampHsva(c: HSVA): HSVA {
  return {
    h: ((c.h % 360) + 360) % 360,
    s: clamp(c.s, 0, 1),
    v: clamp(c.v, 0, 1),
    a: clamp(c.a, 0, 1),
  };
}
