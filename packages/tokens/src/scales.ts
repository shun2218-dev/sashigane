/**
 * tokens.json からスケールを導出する。
 *
 * このファイルは値を持たない。持つのは規則だけである。
 * 値を足したくなったら、それは tokens.json に置くべき定数か、
 * さもなければ規則が足りていない。
 *
 * 根拠は docs/decisions.md。
 */
import tokens from './tokens.json' with { type: 'json' };

/** 分数。浮動小数リテラルを避けて決定の意味をそのまま持つ */
type Fraction = readonly [numerator: number, denominator: number];
const apply = ([n, d]: Fraction, v: number) => (v * n) / d;
const divide = ([n, d]: Fraction, v: number) => (v * d) / n;

/** 唯一の根本定数 */
export const root = tokens.root;

/** spacing.base = root ÷ 4 */
export const base = root / tokens.spacing.baseDivisor;

/**
 * spacing: base×2 以降、3/2 と 4/3 を交互に適用する。
 * 3/2 × 4/3 = 2 なので2段ごとに正確に倍になる。
 */
export const spacing: number[] = (() => {
  const ratios = tokens.spacing.alternatingRatios as unknown as readonly Fraction[];
  const out = [0, base];
  let v = base * 2;
  out.push(v);
  for (let i = 0; v < tokens.spacing.max; i++) {
    v = apply(ratios[i % ratios.length]!, v);
    out.push(v);
  }
  // 比率の並びが max にちょうど着地しない設定だと、宣言と違う最大値を黙って返す。
  // 教訓4「静かに失敗するものを疑う」より、生成器自身が検出する。
  if (out.at(-1) !== tokens.spacing.max) {
    throw new Error(
      `spacing の最大値が tokens.json の宣言と一致しません: ` +
        `宣言 ${tokens.spacing.max} / 生成 ${out.at(-1)}\n` +
        `  alternatingRatios の並びが max にちょうど着地する必要があります。`,
    );
  }
  return out;
})();

/** radius: spacing の max 以下の部分集合。full は段ではない */
export const radius: number[] = spacing.filter((v) => v <= tokens.radius.max);
export const radiusFull = tokens.radius.full;

/** font-size: アンカーは root。下は ÷9/8、上は ×5/4 */
export const fontSizeAnchor = tokens.fontSize.stepsBelow;
export const fontSize: number[] = (() => {
  const below = tokens.fontSize.ratioBelow as unknown as Fraction;
  const above = tokens.fontSize.ratioAbove as unknown as Fraction;
  const out: number[] = [];
  for (let i = tokens.fontSize.stepsBelow; i >= 1; i--) {
    let v = root;
    for (let k = 0; k < i; k++) v = divide(below, v);
    out.push(v);
  }
  out.push(root);
  let v = root;
  for (let i = 0; i < tokens.fontSize.stepsAbove; i++) {
    v = apply(above, v);
    out.push(v);
  }
  return out;
})();

/** line-height の系統。漸近線だけが異なり、係数は共通 */
export type LeadingFamily = keyof typeof tokens.lineHeight.asymptotes;
export const leadingFamilies = tokens.lineHeight.asymptotes;
export const lineHeightCoefficient = root / tokens.lineHeight.coefficientDivisor;

/**
 * line-height = 漸近線 + (root ÷ 2) / size
 *
 * サイズから導出される従属値であり、独立したスケールではない。
 * コンポーネントが選べるのは系統だけで、値は選べない（決定1-4）。
 */
export const lineHeight = (size: number, family: LeadingFamily = 'ui'): number =>
  leadingFamilies[family] + lineHeightCoefficient / size;

/**
 * 幾何数列。doublesEverySteps 段で正確に倍になる。
 *
 * `(2 ** (1/n)) ** i` ではなく `2 ** (i/n)` で計算する。
 * 前者は無理数の累乗を重ねるため倍になる地点で誤差が出る
 * （200ms の2段下が 99.99999999999999 になった）。
 * 後者は i が n の倍数のとき指数が整数になり、誤差なく倍が出る。
 */
const geometric = (c: {
  anchor: number;
  doublesEverySteps: number;
  below: number;
  above: number;
}): number[] => {
  const out: number[] = [];
  for (let i = -c.below; i <= c.above; i++) {
    out.push(c.anchor * 2 ** (i / c.doublesEverySteps));
  }
  return out;
};

/** duration: 遷移とループは知覚上の制約が違うので別スケール（決定1-6） */
export const durationTransition = geometric(tokens.duration.transition);
export const durationLoop = geometric(tokens.duration.loop);

/** border-width: px 固定出力（決定1-7） */
export const borderWidth: number[] = [...tokens.borderWidth.values];

/** elevation の高さ（決定1-8） */
export const elevation: number[] = Array.from(
  { length: tokens.elevation.maxHeight + 1 },
  (_, i) => i,
);
