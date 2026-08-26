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
import type { Palette, Ramp, SurfaceRoles } from '../color/palette.ts';
import { statusNames, steps, surfaceRolesFor } from '../color/palette.ts';
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
 *
 * 面の深さでも段が変わる（決定5-12）。`depth` は 0 が page、1 が surface、2 が inset。
 * **保証は面の1段目でしか成立しない**ため、深い面では役割が1段深い段を指す。
 */
const semanticFor = (
  mode: 'light' | 'dark',
  roles: SurfaceRoles,
  /** 0 なら :root に出す全部。1 以上なら面の文脈で**上書きするものだけ** */
  depth: number,
): string[] => {
  const surfaces =
    depth === 0
      ? [
          `  --sg-color-bg-page: var(--sg-neutral-${mode === 'light' ? 50 : 950});`,
          `  --sg-color-bg-surface: var(--sg-neutral-${mode === 'light' ? 100 : 900});`,
          `  --sg-color-bg-inset: var(--sg-neutral-${mode === 'light' ? 200 : 800});`,
        ]
      : [];
  return [
    ...surfaces,
    `  --sg-color-text-default: var(--sg-neutral-${roles.text.default});`,
    `  --sg-color-text-muted: var(--sg-neutral-${roles.text.muted});`,
    `  --sg-color-text-faint: var(--sg-neutral-${roles.text.faint});`,
    `  --sg-color-border-subtle: var(--sg-neutral-${roles.border.subtle});`,
    `  --sg-color-border-default: var(--sg-neutral-${roles.border.default});`,
    `  --sg-color-accent: var(--sg-primary-${roles.colorText});`,
    `  --sg-color-accent-mark: var(--sg-primary-${roles.colorMark});`,
    `  --sg-color-border-focus: var(--sg-primary-${roles.colorMark});`,
    ...statusNames.flatMap((n) => [
      `  --sg-color-${n}: var(--sg-${n}-${roles.colorText});`,
      `  --sg-color-${n}-mark: var(--sg-${n}-${roles.colorMark});`,
    ]),
    // 段が足りない面では出さない。親の面の値をそのまま継承する（決定5-12）
    ...(roles.series ?? []).map(
      (step, i) => `  --sg-color-chart-${i + 1}: var(--sg-series-${i + 1}-${step});`,
    ),
    ...(depth === 0 ? sequentialVars(mode) : []),
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

/** 面の名前。重なりの順に並ぶ。tokens.css の `[data-sg-surface]` の値になる */
export const surfaceNames = ['page', 'surface', 'inset'] as const;
export type SurfaceName = (typeof surfaceNames)[number];

/** 色のセマンティック。モードで**参照する段を変えるだけ**（決定5-2） */
export const colorSemanticVars = (mode: 'light' | 'dark', palette: Palette): string[] =>
  semanticFor(mode, surfaceRolesFor(palette, mode)[0]!, 0);

/**
 * 面の文脈（決定5-12）。**背景と前景を同時に決める。**
 *
 * 塗るだけの道を残すと、塗った箇所の前景が page 用のまま残って保証が崩れ、
 * しかも**エラーにならない**（教訓4）。そのため Tailwind アダプタからは
 * `bg-surface` / `bg-inset` を落としてあり、面を作る方法はこれ1つである。
 */
export const surfaceContextVars = (
  mode: 'light' | 'dark',
  palette: Palette,
  depth: number,
): string[] => {
  const roles = surfaceRolesFor(palette, mode)[depth]!;
  return [
    `  background-color: var(--sg-neutral-${roles.surface});`,
    ...semanticFor(mode, roles, depth),
  ];
};
