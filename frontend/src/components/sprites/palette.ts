/**
 * Derives the sprite's three colours from one user-picked body colour.
 *
 * The ratios are measured from the pink sprite in Figma:
 *   body    #F7C8FF  oklch(0.891 0.089 321)
 *   mid     #BC6DCA  oklch(0.656 0.157 321)  -> ~74% lightness, ~1.76x chroma
 *   outline #791E89  oklch(0.431 0.177 321)  -> ~48% lightness, ~2.0x chroma
 * Working in OKLCH keeps the hue steady, so every colour darkens the same way.
 */

export type SpritePalette = { body: string; mid: string; outline: string };

const MID = { l: 0.736, c: 1.76, maxC: 0.2 };
const OUTLINE = { l: 0.484, c: 2.0, maxC: 0.19 };

export function deriveSpritePalette(bodyHex: string): SpritePalette {
  const [L, C, H] = hexToOklch(bodyHex);
  return {
    body: normaliseHex(bodyHex),
    mid: oklchToHex(L * MID.l, Math.min(C * MID.c, MID.maxC), H),
    outline: oklchToHex(L * OUTLINE.l, Math.min(C * OUTLINE.c, OUTLINE.maxC), H),
  };
}

/** Swatches that all produce a readable outline. Use these for the picker. */
export const SPRITE_SWATCHES = [
  "#F7C8FF", // pink (Figma default)
  "#C6F3A2", // green
  "#BFE3FF", // blue
  "#FFE6A3", // yellow
  "#FFC9B8", // peach
  "#D9CCFF", // lavender
  "#B8F0E6", // mint
  "#E5E5E5", // grey
] as const;

// ---------- colour maths (sRGB <-> OKLCH), no dependencies ----------

function normaliseHex(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid hex colour: ${hex}`);
  return `#${h.toUpperCase()}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex: string): [number, number, number] {
  const n = parseInt(normaliseHex(hex).slice(1), 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function oklchToLinearRgb(L: number, C: number, H: number): [number, number, number] {
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** Converts to hex, lowering chroma if needed so the colour stays displayable. */
function oklchToHex(L: number, C: number, H: number): string {
  let rgb = oklchToLinearRgb(L, C, H);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(L, mid, H))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinearRgb(L, lo, H);
  }
  return (
    "#" +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * A soft pastel body colour from any accent colour (e.g. a person's profile
 * colour), so every user gets a sensible default sprite before customising it.
 */
export function pastelFrom(hex: string): string {
  const [, C, H] = hexToOklch(hex);
  return oklchToHex(0.9, Math.min(Math.max(C * 0.45, 0.04), 0.09), H);
}
