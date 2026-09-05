/**
 * OKLCH と sRGB の相互変換、および WCAG コントラスト計算。
 *
 * 行列は Björn Ottosson の OKLab 定義による。
 * コントラストは WCAG 2.x の相対輝度に基づく。
 *
 * 重要: OKLCH の L は知覚的明度、WCAG のコントラストは相対輝度から計算される。
 * **この2つは一致しない。** 同じ L でも色相によってコントラストは最大16%振れる
 * （docs/decisions.md 決定5-2 の測定を参照）。
 * したがって「L を揃えれば保証される」ではなく
 * 「最悪の色相でも目標を満たす L を選ぶ」という形で保証を作る。
 */

export interface Oklch {
  /** 知覚的明度 0〜1 */
  L: number;
  /** 彩度 0〜約0.4 */
  C: number;
  /** 色相 0〜360 度 */
  H: number;
}

/** 線形 sRGB（gamut 外では 0〜1 を外れる） */
export type LinearRgb = readonly [number, number, number];

export const oklchToLinearRgb = ({ L, C, H }: Oklch): LinearRgb => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
};

const EPS = 1e-4;
export const inSrgbGamut = (rgb: LinearRgb): boolean =>
  rgb.every((v) => v >= -EPS && v <= 1 + EPS);

/** WCAG 2.x の相対輝度 */
export const relativeLuminance = (rgb: LinearRgb): number => {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return 0.2126 * clamp(rgb[0]) + 0.7152 * clamp(rgb[1]) + 0.0722 * clamp(rgb[2]);
};

/** WCAG 2.x のコントラスト比。1〜21 */
export const contrastRatio = (y1: number, y2: number): number => {
  const [hi, lo] = y1 > y2 ? [y1, y2] : [y2, y1];
  return (hi + 0.05) / (lo + 0.05);
};

export const oklchContrast = (a: Oklch, b: Oklch): number =>
  contrastRatio(
    relativeLuminance(oklchToLinearRgb(a)),
    relativeLuminance(oklchToLinearRgb(b)),
  );

const gamma = (v: number): number => {
  const c = Math.min(1, Math.max(0, v));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

/**
 * CSS に出す文字列。oklch() をそのまま使う（ブラウザが gamut 変換する）。
 *
 * `alpha` を渡すのは影だけである（決定1-8 改訂）。**色は不透明が既定**で、
 * 面もランプも透過を持たない。透過を持つと重なりで下地が透け、
 * `bg-overlay` が成立しなくなる（roles.md「アルファ面は重なりに使えない」）。
 */
export const toCss = ({ L, C, H }: Oklch, alpha?: number): string =>
  `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}` +
  `${alpha === undefined ? '' : ` / ${alpha.toFixed(4)}`})`;

/** デバッグと比較のための16進表記。alpha を渡すと8桁（#rrggbbaa）になる */
export const toHex = (c: Oklch, alpha?: number): string => {
  const [r, g, b] = oklchToLinearRgb(c).map((v) => Math.round(gamma(v) * 255));
  const hex = [r, g, b].map((v) => v!.toString(16).padStart(2, '0')).join('');
  const a =
    alpha === undefined
      ? ''
      : Math.round(Math.min(1, Math.max(0, alpha)) * 255)
          .toString(16)
          .padStart(2, '0');
  return `#${hex}${a}`;
};

const toLinearChannel = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/** テーマビルダーのカラーピッカーが返す16進を受け取るため */
export const hexToOklch = (hex: string): Oklch => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = toLinearChannel(((n >> 16) & 255) / 255);
  const g = toLinearChannel(((n >> 8) & 255) / 255);
  const b = toLinearChannel((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return {
    L,
    C: Math.hypot(a, bb),
    H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
};

/** 色相の最短角差。-180〜180 */
export const shortestHueDelta = (from: number, to: number): number =>
  ((to - from + 540) % 360) - 180;

/** 色相の角距離。0〜180 */
export const hueDistance = (a: number, b: number): number =>
  Math.abs(shortestHueDelta(a, b));
