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
import type { Palette, Ramp, StatusName } from './palette.ts';
import { statusNames, steps } from './palette.ts';
import { toCss } from './oklch.ts';

const rampVars = (prefix: string, ramp: Ramp): string[] =>
  steps.map((s) => `  --sg-${prefix}-${s}: ${toCss(ramp.byStep[s]!)};`);

/** プリミティブ。コンポーネントからの参照は lint で禁止される */
const primitives = (p: Palette): string[] => [
  ...rampVars('neutral', p.neutral),
  ...rampVars('primary', p.primary),
  ...statusNames.flatMap((n) => rampVars(n, p.status[n])),
  ...p.categorical.flatMap((r, i) => rampVars(`series-${i + 1}`, r)),
];

/**
 * セマンティック。明色モードと暗色モードで**参照する段を変えるだけ**（決定5-2）。
 * 色を反転しているのではない。
 */
const semanticFor = (mode: 'light' | 'dark'): string[] => {
  const surface = mode === 'light' ? [50, 100, 200] : [950, 900, 800];
  const text = mode === 'light' ? [900, 600, 500] : [100, 300, 400];
  const accent = mode === 'light' ? 500 : 400;
  const border = mode === 'light' ? [200, 300] : [800, 700];
  return [
    `  --sg-color-bg-page: var(--sg-neutral-${surface[0]});`,
    `  --sg-color-bg-surface: var(--sg-neutral-${surface[1]});`,
    `  --sg-color-bg-inset: var(--sg-neutral-${surface[2]});`,
    `  --sg-color-text-default: var(--sg-neutral-${text[0]});`,
    `  --sg-color-text-muted: var(--sg-neutral-${text[1]});`,
    `  --sg-color-text-faint: var(--sg-neutral-${text[2]});`,
    `  --sg-color-border-subtle: var(--sg-neutral-${border[0]});`,
    `  --sg-color-border-default: var(--sg-neutral-${border[1]});`,
    `  --sg-color-accent: var(--sg-primary-${accent});`,
    `  --sg-color-border-focus: var(--sg-primary-${accent});`,
    ...statusNames.map((n) => `  --sg-color-${n}: var(--sg-${n}-${accent});`),
  ];
};

export const toCssVariables = (palette: Palette): string =>
  [
    '/* sashigane — generatePalette() の出力。手で編集した場合は verifyPalette() で検査すること */',
    ':root {',
    '  /* プリミティブ（コンポーネントからの参照禁止） */',
    ...primitives(palette),
    '',
    '  /* セマンティック（明色モード） */',
    ...semanticFor('light'),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    ...semanticFor('dark').map((l) => `  ${l}`),
    '  }',
    '}',
    '',
    '[data-theme="dark"] {',
    ...semanticFor('dark'),
    '}',
  ].join('\n');

export type { StatusName };
