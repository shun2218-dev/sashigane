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
import {
  borderWidth,
  fontWeightRoles,
  breakpoint,
  breakpointNames,
  breakpointUnit,
  radius,
  spaceRoles,
  spacing,
} from '../scales.ts';
import { statusNames } from '../color/palette.ts';
import { outputHeader } from './header.ts';
import { FONT_ROLES, TEXT_ROLES } from './primitives.ts';

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

/**
 * **すべての名前空間を1行で落とす。**
 *
 * 以前は所有する名前空間を10個列挙していた。**禁止リスト方式で、
 * 列挙し忘れた9個が素の Tailwind の値のまま通っていた**（`--container-*`
 * `--font-weight-*` `--breakpoint-*` `--blur-*` `--drop-shadow-*`
 * `--text-shadow-*` `--inset-shadow-*` `--perspective-*` `--aspect-*`）。
 * `max-w-6xl` が 72rem を素の Tailwind から取っていて、原則1 が成立していなかった。
 *
 * 教訓5 のとおり許可リスト方式に変える。`--*: initial` は
 * **Tailwind が将来足す名前空間も含めて**落とすので、列挙し忘れが起こらない。
 * 実験で `--*: initial` が全名前空間に効くことを確認済み。
 */
const RESET_NAMESPACES = ['--*'];

/**
 * Tailwind に出す書体の役割。**セマンティックの名前をそのまま使う。**
 *
 * サイズ役割は8つあるが、書体が違うのは body / display / label の3通りしかない。
 * すべてを写像すると `font-heading-1` のような、サイズ役割と紛らわしいうえ
 * 中身が `font-display` と同一のユーティリティが並ぶ。
 * **roles.md が観測した5つの書体役割に一致させる。**
 */
const FONT_UTILITIES = [
  { name: 'body', token: '--sg-text-body-family' },
  { name: 'display', token: '--sg-text-display-family' },
  { name: 'label', token: '--sg-text-label-family' },
  ...FONT_ROLES.map((r) => ({ name: r.name, token: `--sg-text-${r.name}-family` })),
] as const;

export const toThemeCss = (palette: Palette): string =>
  [
    ...outputHeader('block', 'Tailwind v4 用アダプタ。', palette, [
      'tokens.css を先に読み込むこと。値はすべて --sg-* を参照する。',
      '名前空間は --*: initial で全部落としてから、我々のものだけを写像する。',
      'テーマ由来の値は1つも残らない（決定3-1・3-3）。',
      '写像していない名前空間（--container-* など）は利用側の責務である（決定1-10）。',
      '',
      '**テーマを参照しないユーティリティはここでは止まらない。**',
      'duration-137 / z-42 / opacity-37 / rotate-17 などの素の数値と、',
      'aspect-square のような静的ユーティリティは @theme の管轄外である。',
    ]),
    '@import "tailwindcss";',
    '',
    '@theme inline {',
    '  /* 名前空間を全部落とす。列挙すると書き漏らしたものが黙って通る（教訓5）。',
    '     --* は Tailwind が将来足す名前空間にも効く */',
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
    '  /* border-width — 名前は px の値に合わせる（決定3-3 の倍数規約と同じ考え方）。',
    '     索引で写像すると border-2 が 3px になって素の Tailwind と食い違う。',
    '     **写像するとスケールの段は素の数値を上書きする。** 段の外の border-4 などは',
    '     Tailwind が素の px で作り続けるので、そちらは lint で塞ぐ（決定3-5） */',
    ...borderWidth.map((px, index) => `  --border-width-${px}: var(--sg-border-width-${index});`),
    '',
    '  /* text — 素の t シャツ語彙は値が一致しないので使わない。',
    '     セマンティック役割名を使い、行高を対で束ねる（決定1-4・3-3） */',
    ...TEXT_ROLES.flatMap((r) => [
      `  --text-${r.name}: var(--sg-text-${r.name});`,
      `  --text-${r.name}--line-height: var(--sg-text-${r.name}-leading);`,
      `  --text-${r.name}--letter-spacing: var(--sg-text-${r.name}-tracking);`,
    ]),
    '',
    '  /* 大文字化の字間（決定1-9）。**加算項なので、素の CSS では calc() で足す。**',
    '     Tailwind の tracking-* は letter-spacing を**置き換える**ので、',
    '     tracking-caps を当てるとサイズ側の項が落ちる。',
    '     落ちる量は、観測された大文字化の全件（10.5〜11px）で +0.003〜+0.011em',
    '     ——caps 項の 4〜13% である。**これは申告する**（教訓5）。',
    '     素の CSS では次のように書ける:',
    '       letter-spacing: calc(var(--sg-text-label-tracking) + var(--sg-tracking-caps)); */',
    '  --tracking-caps: var(--sg-tracking-caps);',
    '',
    '  /* font-family — --text-* に書体を束ねる修飾子は無い（実測。上記 docs の',
    '     experiments/font-family.md）ので --font-* 名前空間へ写像する。',
    '     tabular-nums も font-variant-numeric 修飾子が無いため feature-settings で出す */',
    ...FONT_UTILITIES.map((f) => `  --font-${f.name}: var(${f.token});`),
    '',
    '  /* 太さ（決定1-13）。**--font-* と --font-weight-* はどちらも font-* を作る。**',
    '     役割名を書体の役割（body / display / label）と衝突させないのはそのため。',
    '     衝突しないことは検査で確かめている */',
    ...fontWeightRoles.map((r) => `  --font-weight-${r}: var(--sg-weight-${r});`),
    '',
    '  /* 動き（決定1-14）。**animate-* は写像しない。** 骨組み表示は',
    '     data-sg-skeleton で作る（tokens.css 側）。',
    '',
    '     ユーティリティも用意すると、素の CSS の経路だけが prefers-reduced-motion を',
    '     尊重し、Tailwind の経路では利用側が motion-reduce: を書くことになる。',
    '     **同じものに2つの道があって片方だけが安全**という形は、面（決定5-12）でも',
    '     hover（決定5-13）でも退けてきた。忘れても何も言われないので危ない。',
    '',
    '     イージングは**値を持たない。** 観測4本にカスタムの cubic-bezier は1件も無く、',
    '     使われていたのは CSS の組み込み語だけだった。ease-linear は静的ユーティリティ',
    '     なので生きているが、ease-in-out は --ease-* のリセットで消えていた。',
    '     **語をそのまま戻すだけ**にする（値を決めない） */',
    '  --ease-in-out: ease-in-out;',
    ...FONT_ROLES.filter((r) => r.tabular).map(
      (r) => `  --font-${r.name}--font-feature-settings: var(--sg-font-feature-tabular);`,
    ),
    '',
    '  /* preflight が html と code に当てる既定。--font-*: initial で素の Tailwind の',
    '     スタックへ戻るため、ここで我々のセマンティックへ差し替える */',
    '  --default-font-family: var(--sg-text-body-family);',
    '  --default-mono-font-family: var(--sg-text-code-family);',
    '',
    '  /* 骨格の余白（決定1-12）。密度で段が動くので、値ではなく役割で書く。',
    '     p-surface / px-page / gap-section のように使う */',
    ...spaceRoles.map((r) => `  --spacing-${r}: var(--sg-space-${r});`),
    '',
    '  /* breakpoint — 決定1-10。--*: initial は sm: md: lg: xl: も落とすので、',
    '     ここで写像しないと responsive variant が1つも書けなくなる。',
    '',
    '     **ここだけ var(--sg-*) を使わず値を直接書く。** 他と揃えて',
    '     var() を渡すと @media (width >= var(--sg-breakpoint-sm)) が出る。',
    '     これは無効な CSS で、ブラウザはメディアクエリごと無視する。',
    '     ユーティリティ自体は生成されるので「出たか」だけを見る検査は通り、',
    '     見た目も「レスポンシブが効いていない」だけなので気づきにくい（教訓4）。',
    '     メディアクエリは静的に評価されるため、そもそも実行時に切り替えられない */',
    ...breakpointNames.map(
      (n) => `  --breakpoint-${n}: ${breakpoint(n)}${breakpointUnit};`,
    ),
    '',
    '  /* color — セマンティックのみ写像する。プリミティブは Tailwind に出さない */',
    '',
    '  /* 面は写像しない。bg-page / bg-surface / bg-inset / bg-overlay は**存在しない**。',
    '     面は data-sg-surface="page|surface|inset|overlay" で作る（決定5-12・5-13）。',
    '     塗るだけの道を残すと、塗った箇所の前景が page 用のまま残って',
    '     コントラスト保証が崩れ、しかもエラーにならない（教訓4）。',
    '',
    '     hover も同じ理由で写像しない。bg-hover は**存在しない**。',
    '     hover の面は data-sg-interactive で作る（決定5-13）。 */',
    '  --color-default: var(--sg-color-text-default);',
    '  --color-muted: var(--sg-color-text-muted);',
    '  --color-faint: var(--sg-color-text-faint);',
    '  --color-border: var(--sg-color-border-default);',
    '  --color-border-subtle: var(--sg-color-border-subtle);',
    '  --color-border-strong: var(--sg-color-border-strong);',
    '  --color-chart-gridline: var(--sg-color-chart-gridline);',
    '  --color-accent: var(--sg-color-accent);',
    '  --color-accent-mark: var(--sg-color-accent-mark);',
    '',
    '  /* 塗りの上に載せる文字（決定5-14）。text-on-accent のように使う。',
    '     bg-page を前景に借りるのをやめるための役割で、値は塗りの側から解いてある */',
    '  --color-on-accent: var(--sg-color-on-accent);',
    ...statusNames.map((n) => `  --color-on-${n}: var(--sg-color-on-${n});`),
    '',
    ...statusNames.flatMap((n) => [
      `  --color-${n}: var(--sg-color-${n});`,
      `  --color-${n}-mark: var(--sg-color-${n}-mark);`,
    ]),
    ...palette.categorical.map(
      (_, i) => `  --color-chart-${i + 1}: var(--sg-color-chart-${i + 1});`,
    ),
    '',
    '  /* 連続値の色帯。離散系列とは別の役割なので別の名前で出す（決定5-11） */',
    // 段数は面の1段を除いた分（決定5-11）。セマンティックの側と数を合わせる
    ...palette.lightnesses.slice(1).map(
      (_, i) => `  --color-sequential-${i + 1}: var(--sg-color-sequential-${i + 1});`,
    ),
    '}',
    '',
  ].join('\n');
