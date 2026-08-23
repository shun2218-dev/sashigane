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
  durationLoop,
  durationTransition,
  elevation,
  fontSize,
  leadingFamilies,
  lineHeight,
  radius,
  radiusFull,
  root,
  spacing,
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
  '  /* border-width — px 固定。決定1-1 の例外（決定1-7） */',
  ...borderWidth.map((v, i) => `  --sg-border-width-${i}: ${v}px;`),
  '',
  '  /* elevation の高さ。影の仕様は色システムと組で決まる（決定1-8、未実装） */',
  ...elevation.map((h) => `  --sg-elevation-${h}: ${h};`),
];

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
  { name: 'caption', index: 1, family: 'ui' },
  { name: 'label', index: 2, family: 'ui' },
  { name: 'body', index: 3, family: 'ui' },
  { name: 'body-prose', index: 3, family: 'prose' },
  { name: 'heading-3', index: 4, family: 'ui' },
  { name: 'heading-2', index: 5, family: 'ui' },
  { name: 'heading-1', index: 6, family: 'ui' },
  { name: 'display', index: 8, family: 'display' },
] as const;

export const typographySemanticVars = (): string[] => [
  '  /* タイポグラフィ — サイズと行高は必ず対（決定1-4） */',
  ...TEXT_ROLES.flatMap((r) => [
    `  --sg-text-${r.name}: var(--sg-font-size-${r.index});`,
    `  --sg-text-${r.name}-leading: var(--sg-line-height-${r.family}-${r.index});`,
  ]),
];

export { TEXT_ROLES };
