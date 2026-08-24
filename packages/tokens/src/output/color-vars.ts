/**
 * パレットを CSS 変数に書き出す。
 *
 * ここで出すのは色だけである。spacing などを含めた完全な tokens.css の出力は別の作業。
 * テーマビルダーが「コピペで済む」ものを出すために必要な最小限を実装している。
 *
 * 名前は決定2-1・2-2 に従う。
 *   プリミティブ   --sg-{category}-{数字}   参照禁止
 *   セマンティック --sg-{category}-{単語}   参照可
 */
import type { Palette, Ramp } from '../color/palette.ts';
import { statusNames, steps } from '../color/palette.ts';
import { toCss } from '../color/oklch.ts';

const rampVars = (prefix: string, ramp: Ramp): string[] =>
  steps.map((s) => `  --sg-${prefix}-${s}: ${toCss(ramp.byStep[s]!)};`);

/** プリミティブ。コンポーネントからの参照は lint で禁止される */
export const colorPrimitiveVars = (p: Palette): string[] => [
  '  /* 色 — primary から生成（決定5-1）。段は保証境界に解かれている（決定5-2） */',
  ...rampVars('neutral', p.neutral),
  ...rampVars('primary', p.primary),
  ...statusNames.flatMap((n) => rampVars(n, p.status[n])),
  ...p.categorical.flatMap((r, i) => rampVars(`series-${i + 1}`, r)),
];

/**
 * セマンティック。明色モードと暗色モードで**参照する段を変えるだけ**（決定5-2）。
 * 色を反転しているのではない。
 */
const semanticFor = (
  mode: 'light' | 'dark',
  /** 系列 i が使う段。色覚特性下で見分けられるように色相ごとに変える（決定5-8） */
  seriesSteps: readonly number[],
): string[] => {
  const surface = mode === 'light' ? [50, 100, 200] : [950, 900, 800];
  const text = mode === 'light' ? [900, 600, 500] : [100, 300, 400];
  const border = mode === 'light' ? [200, 300] : [800, 700];
  // 文字は 4.5:1 が要る段、マーク（線・点・フォーカスリング・チャート）は 3:1 で足りる段。
  // 同じ段を使うとチャート系列が沈んで見分けられなくなる（決定5-7）
  const textStep = mode === 'light' ? 500 : 400;
  const markStep = mode === 'light' ? 400 : 300;
  return [
    `  --sg-color-bg-page: var(--sg-neutral-${surface[0]});`,
    `  --sg-color-bg-surface: var(--sg-neutral-${surface[1]});`,
    `  --sg-color-bg-inset: var(--sg-neutral-${surface[2]});`,
    `  --sg-color-text-default: var(--sg-neutral-${text[0]});`,
    `  --sg-color-text-muted: var(--sg-neutral-${text[1]});`,
    `  --sg-color-text-faint: var(--sg-neutral-${text[2]});`,
    `  --sg-color-border-subtle: var(--sg-neutral-${border[0]});`,
    `  --sg-color-border-default: var(--sg-neutral-${border[1]});`,
    `  --sg-color-accent: var(--sg-primary-${textStep});`,
    `  --sg-color-accent-mark: var(--sg-primary-${markStep});`,
    `  --sg-color-border-focus: var(--sg-primary-${markStep});`,
    ...statusNames.flatMap((n) => [
      `  --sg-color-${n}: var(--sg-${n}-${textStep});`,
      `  --sg-color-${n}-mark: var(--sg-${n}-${markStep});`,
    ]),
    ...seriesSteps.map(
      (step, i) => `  --sg-color-chart-${i + 1}: var(--sg-series-${i + 1}-${step});`,
    ),
    ...sequentialVars(mode),
  ];
};

/**
 * 連続値の色帯（決定5-11）。**離散系列とは別の役割**である（roles.md）。
 *
 * 段は primary ランプを使い、**面に近い側から遠い側へ**並べる。
 * 明色モードは薄い → 濃い、暗色モードはその逆で、色を反転しているのではなく
 * 参照する段の順序を変えているだけである（決定5-2 と同じ形）。
 *
 * **面（bg-page）が使う段は帯に入れない。** 入れると帯の最小段が面と同じ明度になり
 * （コントラスト 1.00）、値が最小のセルとデータが無いセルが区別できなくなる。
 * 除くのは面の段だけなので、新しい定数は持ち込まない（自己レビュー B1）。
 *
 * **色相は回さない。** 明度に沿って色相を回す案（viridis 相当）を測ったところ、
 * 二色覚のもとで知覚明度の単調性が壊れた。連続帯は順序が読めることが目的なので、
 * これは目的そのものを壊す。記録は docs/experiments/sequential.md。
 */
const sequentialVars = (mode: 'light' | 'dark'): string[] => {
  const pageStep = mode === 'light' ? steps[0]! : steps.at(-1)!;
  const ordered = (mode === 'light' ? steps : [...steps].reverse()).filter(
    (s) => s !== pageStep,
  );
  return ordered.map(
    (step, i) => `  --sg-color-sequential-${i + 1}: var(--sg-primary-${step});`,
  );
};

/** 色のセマンティック。モードで**参照する段を変えるだけ**（決定5-2） */
export const colorSemanticVars = (mode: 'light' | 'dark', palette: Palette): string[] =>
  semanticFor(mode, palette.categoricalSteps[mode]);
