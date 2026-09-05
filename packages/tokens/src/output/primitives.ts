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
  durationDwell,
  durationLoop,
  durationTransition,
  width,
  fontInputName,
  fontSize,
  fontSlots,
  fontStack,
  fontStackNames,
  fontWeight,
  fontWeightInputName,
  fontWeightRoles,
  leadingFamilies,
  letterSpacing,
  letterSpacingCaps,
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

/** 幅は rem で持っている段なので、px を経由しない */
const remValue = (v: number): string => `${Number.parseFloat(v.toFixed(6))}rem`;

/** em は「サイズに対する比」なので rem に直さない。0 は単位を付けない */
const em = (v: number): string => {
  const r = Number.parseFloat(v.toFixed(4));
  return r === 0 ? '0' : `${r}em`;
};

export const primitiveVars = (): string[] => [
  '  /* spacing */',
  ...spacing.map((v, i) => `  --sg-space-${i}: ${rem(v)};`),
  '',
  '  /* font-size */',
  ...fontSize.map((v, i) => `  --sg-font-size-${i}: ${rem(v)};`),
  '',
  '  /* line-height — サイズから導出される従属値。単体では使わない */',
  ...(Object.keys(leadingFamilies) as LeadingFamily[]).flatMap((family) =>
    fontSize.map(
      (v, i) =>
        `  --sg-line-height-${family}-${i}: ${Number.parseFloat(lineHeight(v, family).toFixed(4))};`,
    ),
  ),
  '',
  '  /* letter-spacing — 行高と同じくサイズから導出される従属値。単体では使わない。',
  '     本文サイズで 0。小さい段は正、大きい段は負。漸近線が最大の詰めになる */',
  ...fontSize.map(
    (v, i) => `  --sg-letter-spacing-${i}: ${em(letterSpacing(v))};`,
  ),
  `  --sg-letter-spacing-caps: ${em(letterSpacingCaps)};`,
  '',
  '  /* radius — spacing の部分集合。full は段ではない */',
  ...radius.map((v, i) => `  --sg-radius-${i}: ${rem(v)};`),
  `  --sg-radius-full: ${radiusFull}px;`,
  '',
  '  /* duration — 遷移とループは知覚上の制約が違う別スケール */',
  ...durationTransition.map((v, i) => `  --sg-duration-${i}: ${ms(v)};`),
  ...durationLoop.map((v, i) => `  --sg-duration-loop-${i}: ${ms(v)};`),
  '  /* 滞在 — 知らせが画面に留まる長さ。遷移でもループでもない',
  '     遷移は目が追える速さ、ループは待たされていると読み取れる速さで決まるが、',
  '     こちらは**読み終わるまでの長さ**で決まる */',
  ...durationDwell.map((v, i) => `  --sg-duration-dwell-${i}: ${ms(v)};`),
  '',
  '  /* width — root から導出できない次元。時間と画面幅に続く3つ目の例外。',
  '     器の幅であって、画面の幅ではない（画面幅は breakpoint） */',
  ...width.map((v, i) => `  --sg-width-${i}: ${remValue(v)};`),
  '',
  '  /* breakpoint — root から導出できない3つ目の次元。',
  '     **CSS 変数はメディアクエリの中では使えない。** ここは Tailwind アダプタと',
  '     人が値を読むためのもので、素の CSS の利用者は値を直接書くことになる */',
  ...breakpointNames.map((n) => `  --sg-breakpoint-${n}: ${breakpoint(n)}${breakpointUnit};`),
  '',
  '  /* border-width — px 固定。他の寸法は rem だが、枠線だけは拡大させない */',
  ...borderWidth.map((v, i) => `  --sg-border-width-${i}: ${v}px;`),

  /* elevation は**プリミティブとして出せない**（決定1-8 改訂）。
     モードで媒体が変わり（明色は影、暗色は輪郭）、暗色の輪郭は面の深さでも段が変わる。
     プリミティブはモードにも面にも依存しない層なので、ここには置けない。
     出るのは役割（--sg-elevation-raised / -overlay）だけで、color-vars.ts が持つ。

     以前ここには `--sg-elevation-0: 0` 〜 `-3: 3` という高さの数字が出ていた。
     CSS のどのプロパティにも入らない値であり、参照できる形をしていなかった。 */
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
  '  /* font-family — 構造だけを規定し、書体名は利用側が差す。',
  '     差し込み口は宣言しない（宣言するとフォールバックが効かない）:',
  ...fontStackNames.flatMap((stack) =>
    fontSlots.map((slot) => `       ${fontInputName(stack, slot)}`),
  ),
  '     未定義のままなら generic へ落ちる。差せば欧文 → 和文 → generic の順序は保証される。 */',
  ...fontStackNames.map((stack) => `  --sg-font-stack-${stack}: ${fontStack(stack)};`),
  '',
  '  /* font-weight — 太さも root から導けない。**使える段は書体次第**で、',
  '     無い段を指定すると合成太字になる。エラーにはならない。',
  '     そこで書体名と同じく差し込み口を持つ。ここも宣言しない:',
  ...fontWeightRoles.map((role) => `       ${fontWeightInputName(role)}`),
  '     差さなければ既定が効く。既定は観測に基づく4段である。 */',
  ...fontWeightRoles.map((role) => `  --sg-font-weight-${role}: ${fontWeight(role)};`),
  '',
  '  /* 数字を等幅にする指定。CSS と Tailwind で符号化が違う */',
  `  --sg-font-variant-tabular: ${numericVariant};`,
  `  --sg-font-feature-tabular: ${numericFeature};`,
];

/** 利用側が書体名を差してよい口。プリミティブでもセマンティックでもない第3の種別（決定2-7） */
export const fontInputNames = (): string[] => [
  ...fontStackNames.flatMap((stack) => fontSlots.map((slot) => fontInputName(stack, slot))),
  // 太さの口（決定1-13）。書体名と同じく利用側が差す
  ...fontWeightRoles.map((role) => fontWeightInputName(role)),
];

/**
 * 残り時間のゲージの長さを差す口（決定6-46）。
 *
 * **宣言しない。** 宣言すると `var()` のフォールバックが効かず、
 * 書かなかったときに通知の滞在時間へ落ちられなくなる。
 * 覆いの濃さ（`--sg-color-scrim`）と同じ形である。
 *
 * **段ではない。** 差すのは利用側が決めた長さで、そのトーストだけの値である。
 */
export const GAUGE_DURATION_INPUT = '--sg-gauge-duration';

export const motionInputNames = (): string[] => [GAUGE_DURATION_INPUT];

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
  '  /* タイポグラフィ — サイズと行高は必ず対。書体は役割ごとの既定 */',
  ...TEXT_ROLES.flatMap((r) => [
    `  --sg-text-${r.name}: var(--sg-font-size-${r.index});`,
    `  --sg-text-${r.name}-leading: var(--sg-line-height-${r.leading}-${r.index});`,
    `  --sg-text-${r.name}-tracking: var(--sg-letter-spacing-${r.index});`,
    `  --sg-text-${r.name}-family: var(--sg-font-stack-${r.stack});`,
  ]),
  '',
  '  /* 大文字化の加算項。サイズと直交するので段を持たない。',
  '     サイズ側の項と**足して**使う:',
  '       letter-spacing: calc(var(--sg-text-label-tracking) + var(--sg-tracking-caps)); */',
  '  --sg-tracking-caps: var(--sg-letter-spacing-caps);',
  '',
  '',
  '  /* 太さの役割。書体スタックと同じく、プリミティブが差し込み口を包む */',
  ...fontWeightRoles.map((r) => `  --sg-weight-${r}: var(--sg-font-weight-${r});`),
  '',
  '  /* 書体だけの役割。サイズと直交するので段を持たない */',
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

/**
 * 時間のセマンティック。**知らせが画面に留まる長さ。**
 *
 * セマンティックは**実際に使う場所が1つ以上あるものだけ**定義する（原則3）。
 * ここに1つだけあるのは、トーストが数える値だからである。
 *
 * **コンポーネントはプリミティブを参照できない。** 段そのもの
 * （`--sg-duration-dwell-*`）ではなく、この名前を読む。
 */
export const durationSemanticVars = (): string[] => [
  '  /* 知らせが留まる長さ。滞在の段のまん中 */',
  `  --sg-duration-notice: var(--sg-duration-dwell-${Math.floor(durationDwell.length / 2)});`,
];

/**
 * 骨組み表示の動き（決定1-14）。
 *
 * **周期はループスケールの中央の段から引く**（決定1-6）。ループは3段しかなく、
 * 中央を取るのは端に寄せる理由が無いためである。値をここで決めない。
 *
 * イージングは CSS の組み込み語をそのまま使う。**観測4本にカスタムの
 * cubic-bezier は1件も無かった**ので、トークンとして値を持つ理由が無い。
 */
export const SKELETON_ANIMATION = 'skeleton var(--sg-duration-loop-1) ease-in-out infinite';

/**
 * **地の色を「1段深い面」との間で動かす**（決定1-14 改訂、決定1-15）。
 *
 * 以前は透明度を `1 → 0.4` で動かしていた。`0.4` は
 * 「pylabo の 0.25 と Tailwind 既定の 0.5 の中央付近に置いただけ」で根拠が無く、
 * **決めていない次元の生値がトークン層に1つだけ残っている**状態だった。
 *
 * 不透明度はスケールを持たないと決めた（決定1-15）ので、ここも色で解く。
 * 動く量は elevation と同じ**面の梯子1段分**で、新しい定数は持ち込まない。
 *
 * **0% と 100% を書かない。** 書かなければ要素の現在の地の色が両端になるので、
 * 面の色を変数として出さずに済む（決定5-12 改訂で塞いだ道を開け直さない）。
 *
 * `--sg-color-deeper-bg` は面の文脈が控えている内部の値で、hover の規則と共有する。
 * どちらも読んでいるのは「1段深い面の地」という同じ関係である。
 */
/**
 * 回り続ける表示の周期（決定6-18）。**ループスケールの一番速い段から引く。**
 *
 * 骨組み表示（1000ms）より速い。**待たされていることが読み取れる速さ**が要るためで、
 * 遅くすると止まって見える。速い側の段はループスケールに1つしかない。
 *
 * 遷移のスケールは借りない。**回り続けるものは >500ms を鈍重とみなす制約の外**にある
 * ——それが遷移とループを別スケールにした理由である。
 */
export const SPIN_ANIMATION = 'sg-spin var(--sg-duration-loop-0) linear infinite';

/**
 * 回転そのもの。**新しい定数を持ち込まない。**
 *
 * `1turn` は角度の全体であって、決めた値ではない。
 * 加減速も付けない（`linear`）——回り続けるものに始点と終点は無い。
 */
export const SPIN_KEYFRAMES = ['@keyframes sg-spin {', '  to { transform: rotate(1turn); }', '}'];

/**
 * 残り時間のゲージ（決定6-46）。**満ちた状態から空へ、まっすぐ減る。**
 *
 * 加減速は付けない。**時間そのものを表しているので、速さが変わると嘘になる。**
 */
export const GAUGE_KEYFRAMES = ['@keyframes sg-gauge {', '  to { transform: scaleX(0); }', '}'];

export const SKELETON_KEYFRAMES = [
  '@keyframes skeleton {',
  '  50% { background-color: var(--sg-color-deeper-bg); }',
  '}',
];
