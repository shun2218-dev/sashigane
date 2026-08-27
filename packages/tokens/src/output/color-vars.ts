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
          // overlay は surface と同じ段（決定5-13）。別の役割だが同じ値になる
          `  --sg-color-bg-overlay: var(--sg-neutral-${mode === 'light' ? 100 : 900});`,
        ]
      : [];
  return [
    ...surfaces,
    `  --sg-color-text-default: var(--sg-neutral-${roles.text.default});`,
    `  --sg-color-text-muted: var(--sg-neutral-${roles.text.muted});`,
    `  --sg-color-text-faint: var(--sg-neutral-${roles.text.faint});`,
    `  --sg-color-border-subtle: var(--sg-neutral-${roles.border.subtle});`,
    `  --sg-color-border-default: var(--sg-neutral-${roles.border.default});`,
    `  --sg-color-border-strong: var(--sg-neutral-${roles.border.strong});`,
    // チャートのグリッド線は UI の境界より薄い第4の段（決定5-13）
    `  --sg-color-chart-gridline: var(--sg-neutral-${roles.gridline});`,
    `  --sg-color-accent: var(--sg-primary-${roles.colorText});`,
    `  --sg-color-accent-mark: var(--sg-primary-${roles.colorMark});`,
    // 塗りの上に載せる文字（決定5-14）。ランプごとに解いてある
    `  --sg-color-on-accent: var(--sg-neutral-${roles.onFill.accent});`,
    `  --sg-color-border-focus: var(--sg-primary-${roles.colorMark});`,
    ...statusNames.flatMap((n) => [
      `  --sg-color-${n}: var(--sg-${n}-${roles.colorText});`,
      `  --sg-color-${n}-mark: var(--sg-${n}-${roles.colorMark});`,
      `  --sg-color-on-${n}: var(--sg-neutral-${roles.onFill[n]});`,
    ]),
    // 段が足りない面では出さない。親の面の値をそのまま継承する（決定5-12）
    ...(roles.series ?? []).map(
      (step, i) => `  --sg-color-chart-${i + 1}: var(--sg-series-${i + 1}-${step});`,
    ),
    ...sequentialVars(mode, roles.surface),
  ];
};

/**
 * 連続値の色帯（決定5-11）。**離散系列とは別の役割**である（roles.md）。
 *
 * 段は primary ランプを使い、**面に近い側から遠い側へ**並べる。
 * 明色モードは薄い → 濃い、暗色モードはその逆で、色を反転しているのではなく
 * 参照する段の順序を変えているだけである（決定5-2 と同じ形）。
 *
 * **その面が使う段は帯に入れない。** 入れると帯の最小段が面と同じ明度になり
 * （コントラスト 1.00）、値が最小のセルとデータが無いセルが区別できなくなる。
 * 除くのは面の段だけなので、新しい定数は持ち込まない（自己レビュー B1）。
 *
 * **除く段は面ごとに変わる**（決定5-12）。page 固定にしていた時期は、カードの上で
 * 帯の下端がちょうど 1.00 になっていた。段数は10のままなので名前の顔ぶれは変わらない。
 *
 * **色相は回さない。** 明度に沿って色相を回す案（viridis 相当）を測ったところ、
 * 二色覚のもとで知覚明度の単調性が壊れた。連続帯は順序が読めることが目的なので、
 * これは目的そのものを壊す。記録は docs/experiments/sequential.md。
 */
const sequentialVars = (mode: 'light' | 'dark', surfaceStep: number): string[] => {
  const ordered = (mode === 'light' ? steps : [...steps].reverse()).filter(
    (s) => s !== surfaceStep,
  );
  return ordered.map(
    (step, i) => `  --sg-color-sequential-${i + 1}: var(--sg-primary-${step});`,
  );
};

/** 面の名前。tokens.css の `[data-sg-surface]` の値になる */
export const surfaceNames = ['page', 'surface', 'inset', 'overlay'] as const;
export type SurfaceName = (typeof surfaceNames)[number];

/**
 * 面の名前 → 梯子の深さ。**添字とは一致しない。**
 *
 * `overlay` は `surface` と同じ段に置く（決定5-13）。重なりの外に出る面なので
 * 深さは下地に依らないが、最深段に置くと**中の項目が hover できなくなる。**
 * 暗色の 700 は梯子の最深段で、その hover が要求する 600 は成立しないためである。
 * ドロップダウンは overlay の中に hover する項目が並ぶ形なので、これは実用上の破綻になる。
 *
 * 浮いて見せるのは影と明度差分（決定1-8 の elevation）の責務である。**未実装。**
 */
const surfaceDepth: Record<SurfaceName, number> = {
  page: 0,
  surface: 1,
  inset: 2,
  overlay: 1,
};
export const depthOf = (name: SurfaceName): number => surfaceDepth[name];

/**
 * 色のセマンティック。モードで**参照する段を変えるだけ**（決定5-2）。
 *
 * **hover の控え（`--sg-color-hover-*`）は含まない。** あれは利用側が参照する役割ではなく
 * hover の規則が読む内部の値であり、tokens.js にも tokens.d.ts にも出さない（決定5-13）。
 * 必要とするのは tokens.css だけなので、そちらで足す。
 */
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
    ...hoverMirrorVars(mode, palette, depth),
  ];
};

/**
 * hover の文脈（決定5-13）。**深さ+1 の役割一式を `--sg-color-hover-*` に控えておく。**
 *
 * hover した要素の文脈は「最も近い面の1段深いもの」である。
 * これをセレクタで表そうとすると、`overlay` が梯子の途中に戻る面であるために
 * 「入れ子の深さ」と「出力の順序」が一致せず、どちらかの入れ子が必ず外れる。
 * **CSS の継承に解かせる**と、最も近い面が控えた値がそのまま届くので入れ子に依らない。
 *
 * 最深段には hover の行き先が無いので何も出さない。
 * 名前を持つ面（page / surface / inset / overlay）はすべて最深段より浅いので、
 * `data-sg-surface` で作れる面には必ず hover がある。
 */
export const hoverMirrorVars = (
  mode: 'light' | 'dark',
  palette: Palette,
  depth: number,
): string[] => {
  const next = surfaceRolesFor(palette, mode)[depth + 1];
  if (!next) return [];
  const mirrored = semanticFor(mode, next, depth + 1).map((line) =>
    line.replace(/^(\s*)--sg-color-/, '$1--sg-color-hover-'),
  );
  /**
   * 深い面では系列色を配れず、変数そのものが出ない（決定5-12）。
   * 控えの側が欠けると hover したときに値が無効になり、
   * 「親の面の値を継承する」という既存の振る舞いが壊れるので、ここで現在の面へ落とす。
   */
  const missing = palette.categorical
    .map((_, i) => `--sg-color-hover-chart-${i + 1}`)
    .filter((n) => !mirrored.some((l) => l.trimStart().startsWith(`${n}:`)))
    .map((n) => `  ${n}: var(${n.replace('--sg-color-hover-', '--sg-color-')});`);
  return [
    `  --sg-color-hover-bg: var(--sg-neutral-${next.surface});`,
    ...mirrored,
    ...missing,
  ];
};

/**
 * hover の規則そのもの。**1本しか出さない。** 値は控えから継承で届く。
 *
 * `data-sg-interactive` を明示的に付けた要素だけが対象である。
 * 付けなければ何も起きないので、`bg-hover` を塗るだけの道は存在しない（教訓4）。
 *
 * `@media (hover: hover)` で囲うのは、触る画面で hover が張り付いて残るためである。
 *
 * **既知の限界:** hover した要素の中の要素を hover しても、控えは面の側にしか無いので
 * 文脈は変わらない（外側と同じ段になる）。保証は割らないが、内側の hover は見えない。
 */
/**
 * 控えの名前の**全モード × 全深さの和集合**。
 *
 * 片方のモードや特定の深さだけを見て並べると、そこに出ない役割が規則から漏れ、
 * hover 中に古い段のまま残る。和集合を取れば構造として漏れようがない（教訓5）。
 *
 * 層の名前表（`tokenLayers`）もここから内部の名前を取る。
 */
export const hoverMirrorNames = (palette: Palette): string[] => [
  ...new Set(
    (['light', 'dark'] as const).flatMap((mode) =>
      surfaceRolesFor(palette, mode).flatMap((_, depth) =>
        hoverMirrorVars(mode, palette, depth).map((line) => line.trimStart().split(':')[0]!),
      ),
    ),
  ),
];

export const hoverRuleVars = (palette: Palette): string[] => [
  '  background-color: var(--sg-color-hover-bg);',
  // 背景は変数ではなく background-color として移すので、名前の対応からは外れる
  ...hoverMirrorNames(palette)
    .filter((n) => n !== '--sg-color-hover-bg')
    .map((n) => `  ${n.replace('--sg-color-hover-', '--sg-color-')}: var(${n});`),
];
