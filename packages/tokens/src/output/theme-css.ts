/**
 * `theme.css` — Tailwind v4 用のアダプタ。
 *
 * **トークン層は Tailwind を知らない。** これは翻訳層であり、
 * ここ1枚に閉じ込められていること自体が層分離の証明になる（決定3-2）。
 *
 * 実験で確認した事項（docs/experiments/tailwind-v4-spacing.md）:
 *   - `@theme inline` を使う。ユーティリティが `var(--sg-*)` を直接参照し、
 *     `--sg-*` が唯一のスイッチ点になる
 *   - **所有する名前空間をすべて `initial` でリセットする。**
 *     書かないと素の Tailwind の値（`bg-red-500` など）が残る
 *   - `--spacing: initial` で動的な `p-<number>` を止める。
 *     これをしないと決定1-2 で除外した `p-5`(20px) が書けてしまう
 *   - `--leading-*: initial` と `--spacing: initial` の両方で行高の上書きを封じる（決定1-4）
 */
import type { Palette } from '../color/palette.ts';
import { radius, spacing } from '../scales.ts';
import { statusNames } from '../color/palette.ts';
import { TEXT_ROLES } from './primitives.ts';

/**
 * Tailwind の数値は index ではなく**基準の倍数**を表す規約（決定3-3）。
 * `--sg-space-5`(24px) をそのまま `--spacing-5` に写像すると
 * `p-5` が 24px になる。素の Tailwind では 20px なので、静かに裏切る。
 */
const spacingMap = spacing.map((px, index) => ({ index, multiple: px / (spacing[1] ?? 4) }));

/**
 * radius は語彙が値と対応する名前空間。**値が一致する名前だけに写像する**（決定3-3）。
 * 素の Tailwind v4.3.3: xs=2 sm=4 md=6 lg=8 xl=12 2xl=16 3xl=24 4xl=32 (px)
 * 対応する段が無い `xs` `md` `3xl` `4xl` は定義しない。
 */
const RADIUS_NAME_BY_PX: Record<number, string> = {
  0: 'none',
  4: 'sm',
  8: 'lg',
  12: 'xl',
  16: '2xl',
};

/** アダプタが所有する名前空間。書き漏らすと素の Tailwind の値が残る */
const RESET_NAMESPACES = [
  '--color-*',
  '--spacing',
  '--text-*',
  '--leading-*',
  '--tracking-*',
  '--radius-*',
  '--shadow-*',
  '--ease-*',
  '--animate-*',
];

export const toThemeCss = (palette: Palette): string =>
  [
    '/* sashigane — Tailwind v4 用アダプタ。生成物。手で編集しない。',
    '   tokens.css を先に読み込むこと。値はすべて --sg-* を参照する。 */',
    '@import "tailwindcss";',
    '',
    '@theme inline {',
    '  /* 所有する名前空間をリセットする。',
    '     書かないと素の Tailwind の値（bg-red-500 など）が残り、原則1 が成立しない */',
    ...RESET_NAMESPACES.map((ns) => `  ${ns}: initial;`),
    '',
    '  /* spacing — 名前は Tailwind の倍数規約に合わせる。値は --sg-* から来る */',
    ...spacingMap.map(
      ({ index, multiple }) => `  --spacing-${multiple}: var(--sg-space-${index});`,
    ),
    '',
    '  /* radius — 値が一致する Tailwind 名だけに写像する */',
    ...radius.flatMap((px, index) => {
      const name = RADIUS_NAME_BY_PX[px];
      return name ? [`  --radius-${name}: var(--sg-radius-${index});`] : [];
    }),
    '  --radius-full: var(--sg-radius-full);',
    '',
    '  /* text — 素の t シャツ語彙は値が一致しないので使わない。',
    '     セマンティック役割名を使い、行高を対で束ねる（決定1-4・3-3） */',
    ...TEXT_ROLES.flatMap((r) => [
      `  --text-${r.name}: var(--sg-text-${r.name});`,
      `  --text-${r.name}--line-height: var(--sg-text-${r.name}-leading);`,
    ]),
    '',
    '  /* color — セマンティックのみ写像する。プリミティブは Tailwind に出さない */',
    '  --color-page: var(--sg-color-bg-page);',
    '  --color-surface: var(--sg-color-bg-surface);',
    '  --color-inset: var(--sg-color-bg-inset);',
    '  --color-default: var(--sg-color-text-default);',
    '  --color-muted: var(--sg-color-text-muted);',
    '  --color-faint: var(--sg-color-text-faint);',
    '  --color-border: var(--sg-color-border-default);',
    '  --color-border-subtle: var(--sg-color-border-subtle);',
    '  --color-accent: var(--sg-color-accent);',
    '  --color-accent-mark: var(--sg-color-accent-mark);',
    ...statusNames.flatMap((n) => [
      `  --color-${n}: var(--sg-color-${n});`,
      `  --color-${n}-mark: var(--sg-color-${n}-mark);`,
    ]),
    ...palette.categorical.map(
      (_, i) => `  --color-chart-${i + 1}: var(--sg-color-chart-${i + 1});`,
    ),
    '}',
    '',
  ].join('\n');
