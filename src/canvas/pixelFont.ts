// Fixed 5x7 glyphs keep sign lettering crisp regardless of font loading or zoom.
const GLYPHS: Record<string, string[]> = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '!': ['00100','00100','00100','00100','00100','00000','00100'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
};

export const pixelTextWidth = (label: string) => Math.max(0, label.length * 6 - 1);

interface TextOpts { color?: string; keyline?: string; shadow?: string }

/**
 * Paints text from the fixed 5x7 grid. Every glyph gets a dark keyline on all
 * four sides, so the lettering stays readable on any wood or paint colour.
 */
export function drawPixelText(ctx: CanvasRenderingContext2D, label: string, centerX: number, topY: number, color: string, opts: TextOpts = {}) {
  const text = label.toUpperCase();
  const left = Math.round(centerX - pixelTextWidth(text) / 2);
  const w = text.length * 6, h = 7;
  // rasterise the whole string into one mask, then outline it as a shape
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < text.length; i++) {
    const glyph = GLYPHS[text[i]] ?? GLYPHS[' '];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (glyph[y][x] === '1') mask[(i * 6 + x) + y * w] = 1;
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mask[x + y * w];
  const keyline = opts.keyline ?? '#17120c';
  if (keyline) {
    ctx.fillStyle = keyline;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (at(x, y) || !(at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) continue;
      ctx.fillRect(left + x, topY + y, 1, 1);
    }
  }
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) ctx.fillRect(left + x + 1, topY + y + 1, 1, 1);
  }
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) ctx.fillRect(left + x, topY + y, 1, 1);
}