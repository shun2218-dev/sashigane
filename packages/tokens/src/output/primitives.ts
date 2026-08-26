/**
 * 色以外のプリミティブを CSS 変数にする。
 *
 * 名前は決定2-1 に従い全カテゴリ index 統一（`--sg-{category}-{数字}`）。
 * **コンポーネントからの参照は lint で禁止される**（原則3）。
 *
 * 単位は決定1-1 に従い rem。ただし border-width は px 固定（拡大させたくない値）。
 */
import {
  borderWidth,
  breakpoint,
  breakpointNames,
  breakpointUnit,
  spaceRoles,
  spaceStepFor,
  type DensityLevel,
  durationLoop,
  durationTransition,
  elevation,
  fontInputName,
  fontSize,
  fontSlots,
  fontStack,
  fontStackNames,
  leadingFamilies,
  lineHeight,
  numericFeature,
  numericVariant,
  radius,
  radiusFull,
  root,
  spacing,
  type FontStack,
  type LeadingFamily,
} from '../scales.ts';

/** px を rem 文字列にする。トークンは rem で出す（決定1-1） */
export const rem = (px: number): string => {
  const v = px / root;
  return v === 0 ? '0' : `${Number.parseFloat(v.toFixed(6))}rem`;
};

const ms = (v: number): string => `${Number.parseFloat(v.toFixed(1))}ms`;

export const primitiveVars = (): string[] => [
  '  /* spacing — 決定1-2 */',
  ...spacing.map((v, i) => `  --sg-space-${i}: ${rem(v)};`),
  '',
  '  /* font-size — 決定1-3 */',
  ...fontSize.map((v, i) => `  --sg-font-size-${i}: ${rem(v)};`),
  '',
  '  /* line-height — サイズから導出される従属値（決定1-4）。単体では使わない */',
  ...(Object.keys(leadingFamilies) as LeadingFamily[]).flatMap((family) =>
    fontSize.map(
      (v, i) =>
        `  --sg-line-height-${family}-${i}: ${Number.parseFloat(lineHeight(v, family).toFixed(4))};`,
    ),
  ),
  '',
  '  /* radius — spacing の部分集合（決定1-5）。full は段ではない */',
  ...radius.map((v, i) => `  --sg-radius-${i}: ${rem(v)};`),
  `  --sg-radius-full: ${radiusFull}px;`,
  '',
  '  /* duration — 遷移とループは知覚上の制約が違う別スケール（決定1-6） */',
  ...durationTransition.map((v, i) => `  --sg-duration-${i}: ${ms(v)};`),
  ...durationLoop.map((v, i) => `  --sg-duration-loop-${i}: ${ms(v)};`),
  '',
  '  /* breakpoint — root から導出できない3つ目の次元（決定1-10）。',
  '     **CSS 変数はメディアクエリの中では使えない。** ここは Tailwind アダプタと',
  '     人が値を読むためのもので、素の CSS の利用者は値を直接書くことになる */',
  ...breakpointNames.map((n) => `  --sg-breakpoint-${n}: ${breakpoint(n)}${breakpointUnit};`),
  '',
  '  /* border-width — px 固定。決定1-1 の例外（決定1-7） */',
  ...borderWidth.map((v, i) => `  --sg-border-width-${i}: ${v}px;`),
  '',
  '  /* elevation の高さ。影の仕様は色システムと組で決まる（決定1-8、未実装） */',
  ...elevation.map((h) => `  --sg-elevation-${h}: ${h};`),
  '',
  ...fontStackVars(),
];

/**
 * 書体スタック（決定1-11）。**この次元だけは値を導出できない。**
 *
 * 持つのは書体名ではなくスタックの構造で、具体的な書体名は利用側が
 * `--sg-font-brand-{スタック}-{欧文|和文}` へ差す。**その口はここで宣言しない。**
 * 宣言すると var() のフォールバックが効かなくなり、差していない口が空文字として
 * 解決されて `font-family: , system-ui` になる。エラーにならず宣言ごと無効になる（教訓4）。
 *
 * 口の一覧は生成物ではなく検査用の名前表（tokens.layers.json）が持つ。
 */
export const fontStackVars = (): string[] => [
  '  /* font-family — 構造だけを規定し、書体名は利用側が差す（決定1-11）。',
  '     差し込み口は宣言しない（宣言するとフォールバックが効かない）:',
  ...fontStackNames.flatMap((stack) =>
    fontSlots.map((slot) => `       ${fontInputName(stack, slot)}`),
  ),
  '     未定義のままなら generic へ落ちる。差せば欧文 → 和文 → generic の順序は保証される。 */',
  ...fontStackNames.map((stack) => `  --sg-font-stack-${stack}: ${fontStack(stack)};`),
  '',
  '  /* 数字を等幅にする指定。CSS と Tailwind で符号化が違う（決定1-11） */',
  `  --sg-font-variant-tabular: ${numericVariant};`,
  `  --sg-font-feature-tabular: ${numericFeature};`,
];

/** 利用側が書体名を差してよい口。プリミティブでもセマンティックでもない第3の種別（決定2-7） */
export const fontInputNames = (): string[] =>
  fontStackNames.flatMap((stack) => fontSlots.map((slot) => fontInputName(stack, slot)));

/**
 * タイポグラフィのセマンティック。
 *
 * **サイズと行高は必ず対で使う**（決定1-4）。プリミティブだけを公開すると
 * 対応が崩れるので、タイポグラフィだけはセマンティックの提供が規則から要求される。
 *
 * 他のカテゴリ（spacing / radius / duration）のセマンティックは
 * **実需要が観測されるまで定義しない**（原則3・原則7）。
 * Phase 2（ichirizuka へのトークンのみ導入）で何が必要かが分かる。
 */
const TEXT_ROLES = [
  { name: 'caption', index: 1, leading: 'ui', stack: 'body' },
  { name: 'label', index: 2, leading: 'ui', stack: 'mono' },
  { name: 'body', index: 3, leading: 'ui', stack: 'body' },
  { name: 'body-prose', index: 3, leading: 'prose', stack: 'body' },
  { name: 'heading-3', index: 4, leading: 'ui', stack: 'display' },
  { name: 'heading-2', index: 5, leading: 'ui', stack: 'display' },
  { name: 'heading-1', index: 6, leading: 'ui', stack: 'display' },
  { name: 'display', index: 8, leading: 'display', stack: 'display' },
] as const satisfies readonly {
  name: string;
  index: number;
  leading: LeadingFamily;
  stack: FontStack;
}[];

/**
 * 書体だけの役割 — **サイズと直交する。**
 *
 * roles.md の観測では numeric が eyebrow / 統計値 / 表ヘッダ / 凡例 / 目盛 と
 * 全サイズ帯に現れる。1つの段に固定すると実需要を表せないので、
 * **サイズ役割とは別に、書体（と variant）だけを提供する。**
 * 利用側は「サイズは caption、書体は numeric」のように重ねて使う。
 *
 * 段を持たないことが、この2つがサイズ役割ではないことの印である。
 */
const FONT_ROLES = [
  { name: 'numeric', stack: 'mono', tabular: true },
  { name: 'code', stack: 'mono', tabular: false },
] as const satisfies readonly { name: string; stack: FontStack; tabular: boolean }[];

export const typographySemanticVars = (): string[] => [
  '  /* タイポグラフィ — サイズと行高は必ず対（決定1-4）。書体は役割ごとの既定（決定1-11） */',
  ...TEXT_ROLES.flatMap((r) => [
    `  --sg-text-${r.name}: var(--sg-font-size-${r.index});`,
    `  --sg-text-${r.name}-leading: var(--sg-line-height-${r.leading}-${r.index});`,
    `  --sg-text-${r.name}-family: var(--sg-font-stack-${r.stack});`,
  ]),
  '',
  '  /* 書体だけの役割。サイズと直交するので段を持たない（決定1-11） */',
  ...FONT_ROLES.flatMap((r) => [
    `  --sg-text-${r.name}-family: var(--sg-font-stack-${r.stack});`,
    ...(r.tabular ? [`  --sg-text-${r.name}-variant: var(--sg-font-variant-tabular);`] : []),
  ]),
];

export { FONT_ROLES, TEXT_ROLES };

/**
 * 骨格の余白のセマンティック（決定1-12）。
 *
 * **密度で動くのはここだけ**である。コンポーネント内部の余白は動かない。
 * 実測では、ブレークポイントで動く余白は全体の約 4.5% しかなかった。
 */
export const spacingSemanticVars = (density: DensityLevel): string[] =>
  spaceRoles.map((role) => `  --sg-space-${role}: var(--sg-space-${spaceStepFor(role, density)});`);
