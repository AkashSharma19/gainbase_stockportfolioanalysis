export interface FolderPalette {
  bg: string;
  text: string;
  sub: string;
}

export const ICON_3D_PALETTES: Record<string, FolderPalette> = {
  // Music & Audio -> Mint Green
  music: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  headphones: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  musical_notes: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  spotify: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },

  // Video & OTT -> Lilac / Purple
  tv: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  netflix: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  popcorn: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  clapperboard: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  film_projector: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },

  // Apple & Warm Gadgets -> Butter Yellow
  apple: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  star: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  trophy: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  medal: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  electric: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },

  // Gym, Gaming & Fitness -> Soft Rose / Magenta
  gym: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  fitness: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  video_game: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  game: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  youtube: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  heart: { bg: '#FFE4E6', text: '#9F1239', sub: '#BE123C' },

  // Food & Fast Food -> Sunset Peach / Orange
  food: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  grocery: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  pizza: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412' },
  burger: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412' },
  cake: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  cookie: { bg: '#FEF3C7', text: '#78350F', sub: '#92400E' },
  coffee: { bg: '#FEF3C7', text: '#78350F', sub: '#92400E' },
  beverage: { bg: '#FFE4E6', text: '#881337', sub: '#9F1239' },
  carrot: { bg: '#FFEDD5', text: '#7C2D12', sub: '#9A3412' },
  broccoli: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },

  // Internet, Cloud, Tech & Car -> Sky Blue / Cyan
  cloud: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  internet: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  wifi: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  laptop: { bg: '#E0E7FF', text: '#312E81', sub: '#4338CA' },
  phone: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  car: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  fuel: { bg: '#FFEDD5', text: '#7C2D12', sub: '#9A3412' },
  water: { bg: '#CFFAFE', text: '#164E63', sub: '#0E7490' },
  travel: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },
  compass: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },

  // Home & Bills -> Warm Butter Amber
  house: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  receipt: { bg: '#CFFAFE', text: '#164E63', sub: '#0E7490' },
  credit_card: { bg: '#EDE9FE', text: '#581C87', sub: '#6D28D9' },
  wallet: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  money: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  banknote: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  coin: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  investments: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  shopping: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412' },
  clothes: { bg: '#E0E7FF', text: '#312E81', sub: '#4338CA' },
  medical: { bg: '#E0F2FE', text: '#075985', sub: '#0284C7' },
  shield: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },
  education: { bg: '#EDE9FE', text: '#581C87', sub: '#6D28D9' },
  books: { bg: '#EDE9FE', text: '#581C87', sub: '#6D28D9' },
  briefcase: { bg: '#F5F5F4', text: '#1C1917', sub: '#44403C' },
  umbrella: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },
  gift: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  sparkles: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  transfer: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  target: { bg: '#FFE4E6', text: '#9F1239', sub: '#BE123C' },
  rocket: { bg: '#FFEDD5', text: '#7C2D12', sub: '#9A3412' },
};

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function getPastelPaletteFromHex(hex: string): FolderPalette {
  try {
    const { h, s } = hexToHSL(hex);
    const sat = Math.max(45, Math.min(85, s));
    const bg = hslToHex(h, sat, 90);
    const text = hslToHex(h, Math.min(95, sat + 15), 18);
    const sub = hslToHex(h, Math.min(90, sat + 10), 32);
    return { bg, text, sub };
  } catch {
    return { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' };
  }
}

export function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

export function getPastelFromHue(hue: number): FolderPalette {
  const bg = hslToHex(hue, 70, 91);
  const text = hslToHex(hue, 85, 18);
  const sub = hslToHex(hue, 80, 32);
  return { bg, text, sub };
}

export function getCardPaletteFromItem(payment: {
  color?: string;
  type?: string;
  loanType?: string;
  icon?: string;
  category?: string;
  name?: string;
}): FolderPalette {
  const iconKey = (payment.icon || payment.category || payment.name || '').toLowerCase().trim();

  // 1. Direct match in comprehensive 3D icon catalog
  if (ICON_3D_PALETTES[iconKey]) {
    return ICON_3D_PALETTES[iconKey];
  }

  for (const [key, palette] of Object.entries(ICON_3D_PALETTES)) {
    if (iconKey.includes(key)) {
      return palette;
    }
  }

  // 2. If item has explicit hex color code (e.g. sub.color or loan.color)
  if (payment.color && payment.color.startsWith('#')) {
    return getPastelPaletteFromHex(payment.color);
  }

  // 3. Dynamic: deterministic pastel palette from the icon chosen
  const dynamicHue = stringToHue(iconKey || 'gainbase');
  return getPastelFromHue(dynamicHue);
}

/**
 * Interlocking ribbon card SVG path for the EMIs & Subscriptions list.
 */
export function getInterlockingCardPath(
  w: number,
  hBody: number = 92,
  tabW: number = 90,
  tabH: number = 26,
  curveR: number = 18,
  isFirst: boolean = false,
  isLast: boolean = false,
  rCorner: number = 24
): string {
  if (w <= 0) return '';
  const startX = Math.max(0, w - tabW - curveR);
  const midX = w - tabW;
  const endX = Math.min(w, w - tabW + curveR);
  const totalH = hBody + tabH;

  let path = '';

  if (isFirst) {
    path += `M 0 ${tabH + rCorner} A ${rCorner} ${rCorner} 0 0 1 ${rCorner} ${tabH} `;
  } else {
    path += `M 0 ${tabH} `;
  }

  // Top edge flat section
  path += `L ${startX} ${tabH} `;
  // Top S-curve going UP to y=0
  path += `C ${midX} ${tabH}, ${midX} 0, ${endX} 0 `;

  if (isFirst) {
    path += `L ${w - rCorner} 0 A ${rCorner} ${rCorner} 0 0 1 ${w} ${rCorner} `;
  } else {
    path += `L ${w} 0 `;
  }

  // Right edge down to hBody
  path += `L ${w} ${hBody} `;

  if (isLast) {
    path += `A ${rCorner} ${rCorner} 0 0 1 ${w - rCorner} ${totalH} `;
    path += `L ${rCorner} ${totalH} `;
    path += `A ${rCorner} ${rCorner} 0 0 1 0 ${totalH - rCorner} `;
  } else {
    // Bottom S-curve stepping DOWN to totalH
    path += `L ${endX} ${hBody} `;
    path += `C ${midX} ${hBody}, ${midX} ${totalH}, ${startX} ${totalH} `;
    path += `L 0 ${totalH} `;
  }

  // Left edge going up to start
  if (isFirst) {
    path += `L 0 ${tabH + rCorner} `;
  } else {
    path += `L 0 ${tabH} `;
  }

  path += `Z`;
  return path.replace(/\s+/g, ' ').trim();
}

/**
 * Top Ticket hero card path for monthly totals on the EMIs page.
 */
export function getTicketCardPath(
  w: number,
  h: number = 132,
  notchY: number = 82,
  notchR: number = 9,
  rCorner: number = 22
): string {
  if (w <= 0 || h <= 0) return '';
  let path = `M 0 ${rCorner} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${rCorner} 0 `;
  path += `L ${w - rCorner} 0 `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${w} ${rCorner} `;
  path += `L ${w} ${notchY - notchR} `;
  path += `A ${notchR} ${notchR} 0 0 0 ${w} ${notchY + notchR} `;
  path += `L ${w} ${h - rCorner} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${w - rCorner} ${h} `;
  path += `L ${rCorner} ${h} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 0 ${h - rCorner} `;
  path += `L 0 ${notchY + notchR} `;
  path += `A ${notchR} ${notchR} 0 0 0 0 ${notchY - notchR} `;
  path += `L 0 ${rCorner} `;
  path += `Z`;
  return path.replace(/\s+/g, ' ').trim();
}

/**
 * Folder dossier hero card SVG path for details screens (loan-details, subscription-details).
 * Features a distinct top folder tab on the right that matches the folder card layout.
 */
export function getFolderDetailsCardPath(
  w: number,
  h: number,
  tabW: number = 90,
  tabH: number = 26,
  curveR: number = 18,
  rCorner: number = 24
): string {
  if (w <= 0 || h <= 0) return '';
  const startX = Math.max(0, w - tabW - curveR);
  const midX = w - tabW;
  const endX = Math.min(w, w - tabW + curveR);

  let path = `M 0 ${tabH + rCorner} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${rCorner} ${tabH} `;
  path += `L ${startX} ${tabH} `;
  path += `C ${midX} ${tabH}, ${midX} 0, ${endX} 0 `;
  path += `L ${w - rCorner} 0 `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${w} ${rCorner} `;
  path += `L ${w} ${h - rCorner} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${w - rCorner} ${h} `;
  path += `L ${rCorner} ${h} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 0 ${h - rCorner} `;
  path += `L 0 ${tabH + rCorner} `;
  path += `Z`;

  return path.replace(/\s+/g, ' ').trim();
}
