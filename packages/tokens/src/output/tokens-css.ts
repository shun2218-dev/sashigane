/**
 * `tokens.css` — フレームワークに一切依存しない CSS 変数の定義。
 *
 * **これだけを読み込めば動くことが、原則4（依存は一方通行）の実証になる。**
 * React も Tailwind も無い素の HTML で変数が解決することを CI が検査する。
 */
import { statusNames, surfaceRolesFor, type Palette } from '../color/palette.ts';
import { breakpoint, breakpointUnit, densityLevels } from '../scales.ts';
import {
  colorPrimitiveVars,
  colorSemanticVars,
  depthOf,
  hoverMirrorVars,
  hoverRuleVars,
  scrimDefault,
  surfaceContextVars,
  surfaceNames,
} from './color-vars.ts';
import { outputHeader } from './header.ts';
import {
  SKELETON_ANIMATION,
  SKELETON_KEYFRAMES,
  SPIN_ANIMATION,
  SPIN_KEYFRAMES,
  primitiveVars,
  spacingSemanticVars,
  typographySemanticVars,
} from './primitives.ts';

/**
 * ブラウザ自身が描くもの（スクロールバー、フォームコントロール、既定の選択色）へ
 * テーマを伝える。**CSS 変数はここへ届かない。**
 *
 * これが無いと、暗色に切り替えても明色のスクロールバーが暗い面の上に出る。
 * 「利用側がテーマを固定できる」と言う以上、UA が描く部分も固定の対象に含まれる。
 */
const colorScheme = (mode: 'light' | 'dark'): string[] => [`  color-scheme: ${mode};`];

/**
 * 面の文脈（決定5-12）。**背景と前景を同時に決めるので、面を作る方法はこれだけ**である。
 *
 * `scope` はテーマの限定子。空なら既定（明色）または `@media` の中で使う。
 * 限定子があるときは「子孫」と「同じ要素」の両方を出す。
 * `<html data-theme="dark" data-sg-surface="page">` のように同居しうるため。
 */
const surfaceBlocks = (
  mode: 'light' | 'dark',
  palette: Palette,
  scope: string,
): string[] =>
  [...new Set(surfaceNames.map(depthOf))].sort().flatMap((depth) => {
    // 同じ深さの面はまとめる。overlay は surface と同じ段なので（決定5-13）、
    // 分けて出すと**同じ中身のブロックが並ぶだけ**になる
    const attrs = surfaceNames
      .filter((n) => depthOf(n) === depth)
      .map((n) => `[data-sg-surface="${n}"]`);
    const selector = attrs
      .flatMap((attr) => (scope ? [`${scope} ${attr}`, `${scope}${attr}`] : [attr]))
      .join(', ');
    return [`${selector} {`, ...surfaceContextVars(mode, palette, depth), '}', ''];
  });

/**
 * 宣言する塗り（決定6-9）。**面と同じ形で、宣言が背景と前景を同時に与える。**
 *
 * ```html
 * <button data-sg-fill="accent">押す</button>
 * ```
 *
 * 塗りの段は**面にもモードにも依存しない。** ブランドの色はテーマで変わらない。
 * 文字は明るい端（白）で、全360色相の最悪で 4.50:1。
 *
 * **境界が部品の識別を担う。** 深い面では塗りだけでは 3:1 に届かない
 * （実測 暗色の surface で 2.56、inset で 2.03）ので、境界を面ごとに解く。
 * hover では**塗りだけが濃くなり、境界は動かない**——識別は保たれる。
 *
 * 塗るだけの道は用意しない。`bg-*` で塗っても前景は付いてこない（原則5 と同じ形）。
 */
const fillBlocks = (mode: 'light' | 'dark', palette: Palette, scope: string): string[] => {
  const roles = surfaceRolesFor(palette, mode);
  const ramps = ['accent', ...statusNames] as const;
  const rampVar = (name: string) => (name === 'accent' ? 'primary' : name);
  return [...new Set(surfaceNames.map(depthOf))].sort().flatMap((depth) => {
    const r = roles[depth]!;
    const surfaceAttrs = surfaceNames
      .filter((n) => depthOf(n) === depth)
      .map((n) => `[data-sg-surface="${n}"]`);
    return ramps.flatMap((ramp) => {
      const fillAttr = `[data-sg-fill="${ramp}"]`;
      // 面の中に置かれた塗り。page（depth 0）は面の宣言が無い場合もあるので単独でも出す
      const bases = depth === 0 ? [...surfaceAttrs, ''] : surfaceAttrs;
      const sel = bases
        .flatMap((a) => {
          const inner = a ? `${a} ${fillAttr}` : fillAttr;
          return scope ? [`${scope} ${inner}`, `${scope}${inner}`] : [inner];
        })
        .join(', ');
      const hoverSel = bases
        .flatMap((a) => {
          const inner = a ? `${a} ${fillAttr}:hover` : `${fillAttr}:hover`;
          return scope ? [`${scope} ${inner}`, `${scope}${inner}`] : [inner];
        })
        .join(', ');
      return [
        `${sel} {`,
        `  background-color: var(--sg-${rampVar(ramp)}-${r.fill});`,
        `  border-color: var(--sg-${rampVar(ramp)}-${r.fillBorder});`,
        `  color: var(--sg-neutral-${r.onDeclaredFill[ramp]});`,
        '}',
        '@media (hover: hover) {',
        `  ${hoverSel} {`,
        `    background-color: var(--sg-${rampVar(ramp)}-${r.fillStrong});`,
        '  }',
        '}',
        '',
      ];
    });
  });
};

export const toTokensCss = (palette: Palette): string =>
  [
    ...outputHeader('block', 'CSS 変数。これ1つでフレームワーク非依存に動く。', palette, [
      '--sg-{カテゴリ}-{数字} はプリミティブ。コンポーネントからは参照しない。',
      '使ってよいのは役割の名前（--sg-color-bg-page、--sg-text-body など）。',
      '--sg-font-brand-* だけは逆で、**利用側が定義する**差し込み口である。',
      ':root に書くと、書体スタックの欧文の位置と、太さの役割に差し込まれる。',
      '**:root 以外に書いても効かない。** 口を読むのは :root のプリミティブなので、',
      '子孫に書いた値は誰にも読まれない。エラーにはならない。',
    ]),
    ':root {',
    ...primitiveVars(),
    '',
    ...colorPrimitiveVars(palette),
    '',
    '  /* ここからセマンティック（参照可） */',
    ...typographySemanticVars(),
    '',
    '  /* 骨格の余白。密度で動くのはここだけ */',
    ...spacingSemanticVars('default'),

    '',
    ...colorSemanticVars('light', palette),
    ...hoverMirrorVars('light', palette, 0),
    ...colorScheme('light'),
    '}',
    '',
    '/* 密度。既定は画面幅に従い、data-sg-density で固定できる。',
    '   テーマと同じ形で、メディアクエリより後に固定用を出して順序で勝たせる。',
    `   狭い画面では1段浅い段を指す。境界は sm（${breakpoint('sm')}${breakpointUnit}）。 */`,
    `@media (width < ${breakpoint('sm')}${breakpointUnit}) {`,
    '  :root {',
    ...spacingSemanticVars('compact').map((l) => `  ${l}`),
    '  }',
    '}',
    '',
    ...densityLevels.flatMap((level) => [
      `[data-sg-density="${level}"] {`,
      ...spacingSemanticVars(level),
      '}',
      '',
    ]),
    '/* 面の文脈。背景と前景を同時に決める。',
    '   保証が成立するのは面の1段目だけなので、深い面では役割が1段深い段を指す。',
    '   塗るだけの道は塞いである（Tailwind アダプタに bg-surface / bg-inset は無い）。 */',
    ...surfaceBlocks('light', palette, ''),
    ...fillBlocks('light', palette, ''),
    '',
    '/* 後ろを覆う。**塗るだけの道は作らない**——宣言した要素の ::backdrop だけを塗る。',
    '   覆いの上には何も乗らないので、面ではなく塗りだけである。',
    '   --sg-color-scrim は**宣言していない差し込み口**である。濃さを変えたい利用側が定義する。',
    '     <dialog data-sg-scrim data-sg-surface="overlay"></dialog> */',
    '[data-sg-scrim]::backdrop {',
    `  background-color: var(--sg-color-scrim, ${scrimDefault()});`,
    '}',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    ...[
      ...colorSemanticVars('dark', palette),
      ...hoverMirrorVars('dark', palette, 0),
      ...colorScheme('dark'),
    ].map((l) => `  ${l}`),
    '  }',
    '',
    ...surfaceBlocks('dark', palette, '').map((l) => (l ? `  ${l}` : l)),
    ...fillBlocks('dark', palette, '').map((l) => (l ? `  ${l}` : l)),
    '}',
    '',
    '/* 明示的な指定は OS の設定より優先する。',
    '   両方向を出すのは、明色専用・暗色専用のアプリが固定できるようにするため。',
    '   :root と同じ詳細度なので、順序でメディアクエリに勝つ。 */',
    '[data-theme="light"] {',
    ...colorSemanticVars('light', palette),
    ...hoverMirrorVars('light', palette, 0),
    ...colorScheme('light'),
    '}',
    '',
    ...surfaceBlocks('light', palette, '[data-theme="light"]'),
    ...fillBlocks('light', palette, '[data-theme="light"]'),
    '[data-theme="dark"] {',
    ...colorSemanticVars('dark', palette),
    ...hoverMirrorVars('dark', palette, 0),
    ...colorScheme('dark'),
    '}',
    '',
    ...surfaceBlocks('dark', palette, '[data-theme="dark"]'),
    ...fillBlocks('dark', palette, '[data-theme="dark"]'),
    '/* hover の文脈。**規則は1本だけ**で、値は面が控えた --sg-color-hover-* から',
    '   継承で届く。セレクタで面ごとに書き分けると、overlay が梯子の途中に戻る面である',
    '   ために「入れ子の深さ」と「出力の順序」が一致せず、どちらかの入れ子が必ず外れる。',
    '',
    '   data-sg-interactive を付けた要素だけが対象。付けなければ何も起きないので、',
    '   背景だけ塗って前景を置き去りにする道は存在しない。面と同じ理由である。',
    '',
    '   触る画面では hover が張り付いて残るため (hover: hover) で囲う。',
    '   面のブロックより後に出すことで、背景色の指定が順序で勝つ。 */',
    '/* 骨組み表示の動き。**素の CSS の利用者にも届くようにここへ出す。**',
    '   Tailwind 側に出口は無い。--animate-* は意図的に写像していない。',
    '   ユーティリティも用意すると、素の CSS の経路だけが prefers-reduced-motion を',
    '   尊重する形になるためである。data-sg-skeleton は Tailwind の利用者にも使える。',
    '',
    '   **地の色を1段深い面との間で動かす。**',
    '   以前は透明度を 1 → 0.4 で動かしていたが、0.4 に根拠が無かった。',
    '   0% と 100% を書かないので、要素の現在の地の色がそのまま両端になる。',
    '',
    '   **付ける先は面を名乗っている要素である。** 地の色を動かすので、',
    '   data-sg-surface を持たない要素に付けると動かす地が無く、transparent から',
    '   補間される。**エラーにはならない。**骨組みそのものに付けること:',
    '     <div data-sg-surface="inset" data-sg-skeleton></div>',
    '',
    '   **動きを減らす設定を尊重するのは利用側の責務ではない。** ここで止める。',
    '   prefers-reduced-motion は「見せない」ではなく「動かさない」なので、',
    '   アニメーションだけを止め、要素は残す */',
    ...SKELETON_KEYFRAMES,
    '',
    '[data-sg-skeleton] {',
    `  animation: ${SKELETON_ANIMATION};`,
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  [data-sg-skeleton] {',
    '    animation: none;',
    '  }',
    '}',
    '',
    '/* 回り続ける表示。**骨組み表示と同じ形で、素の CSS の利用者にも届く。**',
    '   Tailwind 側に出口は無い。--animate-* は意図的に写像していない。',
    '',
    '   **周期はループスケールの一番速い段から引く。** 待たされていることが',
    '   読み取れる速さが要るためで、遅くすると止まって見える。',
    '   加減速は付けない——回り続けるものに始点と終点は無い。',
    '',
    '   **回すのは transform だけである。** 大きさも色も持たない——',
    '   どちらも利用側が決める。付ける先は円でも弧でも構わない:',
    '     <span data-sg-spinner></span>',
    '',
    '   **動きを減らす設定では止める。** 骨組み表示と同じ判断である。',
    '   止まると見た目からは進行が読み取れなくなるので、',
    '   **動きだけで状態を伝えないこと。** aria-busy か文字を併せて出す */',
    ...SPIN_KEYFRAMES,
    '',
    '[data-sg-spinner] {',
    `  animation: ${SPIN_ANIMATION};`,
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  [data-sg-spinner] {',
    '    animation: none;',
    '  }',
    '}',
    '',
    '@media (hover: hover) {',
    '  [data-sg-interactive]:hover {',
    ...hoverRuleVars(palette).map((l) => `  ${l}`),
    '  }',
    '}',
  ].join('\n');
