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
import { shadowInkFor, statusNames, steps, surfaceRolesFor } from '../color/palette.ts';
import {
  elevationGeometry,
  elevationHeight,
  elevationOutline,
  elevationRoles,
} from '../scales.ts';
import tokensJson from '../tokens.json' with { type: 'json' };

const cfg = tokensJson.color;
import { toCss } from '../color/oklch.ts';

/**
 * 塗りを持つランプ（決定5-14・5-15）。**役割名とランプ変数名の対応をここ1箇所で持つ。**
 *
 * `accent` だけランプ変数名が `primary` で違う。対応表を2箇所に持つと、
 * 片方だけ直したときに静かにずれる（決定2-6）。**生成も写像も検査もここから回す。**
 *
 * **中間色は入らない。** 面そのものであって塗りではない。
 */
export const fillRamps: readonly { role: string; ramp: string }[] = [
  { role: 'accent', ramp: 'primary' },
  ...statusNames.map((n) => ({ role: n as string, ramp: n as string })),
];
export const fillRampNames: readonly string[] = fillRamps.map((f) => f.role);

const rampVars = (prefix: string, ramp: Ramp): string[] =>
  steps.map((s) => `  --sg-${prefix}-${s}: ${toCss(ramp.byStep[s]!)};`);

/** プリミティブ。コンポーネントからの参照は lint で禁止される */
export const colorPrimitiveVars = (p: Palette): string[] => {
  const ink = shadowInkFor(p);
  return [
    '  /* 色 — primary から生成。段は対比の保証境界に解かれている */',
    ...rampVars('neutral', p.neutral),
    ...rampVars('primary', p.primary),
    ...statusNames.flatMap((n) => rampVars(n, p.status[n])),
    ...p.categorical.flatMap((r, i) => rampVars(`series-${i + 1}`, r)),
    '',
    '  /* 影の色。**唯一、透過を持つ色である。**',
    '     中間色ランプの暗端に、面の梯子1段分になるアルファを解いて足したもの。',
    '     色相は primary から来るので、純黒の影にはならない。',
    '     明色モードでしか使わない。暗色では影が機能しないため（測定済み） */',
    `  --sg-shadow-ink: ${toCss(ink.color, ink.alpha)};`,
  ];
};

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
  /**
   * **ページ地だけが値として出る**（決定5-12 改訂）。
   *
   * `surface` / `inset` / `overlay` の色は出さない。出すと「塗ったが文脈は page のまま」
   * という状態を素の CSS から作れてしまい、**エラーにならないまま保証が割れる**（教訓4）。
   * 面を作る方法は `data-sg-surface` だけである。
   *
   * ページ地を残すのは、**どの面の文脈のまま塗っても割らない**からである
   * （全360色相 × 両モード × 面4段で最悪 4.50。深い面ほど余裕が増える）。
   * そして CSS が原理的に届かない場所——サーバ側で描く OG 画像など——が
   * ページ地の値を必要とする（決定2-6）。
   */
  const surfaces =
    depth === 0
      ? [`  --sg-color-bg-page: var(--sg-neutral-${mode === 'light' ? 50 : 950});`]
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
    /**
     * 塗りの1段強い段（決定5-15）。hover / 押下 / 選択で塗りを差し替える。
     *
     * **塗りを持つ役割すべてに出す。** 当初は accent と danger だけにしていたが、
     * その根拠は「観測4本の塗りボタンは主要動作と破壊的動作の2種類しかない
     * （pdf-merge-app の shadcn も default / destructive）」だった。
     * **shadcn の生成コードは過去の実装ですらない**（教訓7、Issue #88）。
     *
     * `-mark` も `on-*` も同じ規則で全ランプに出している。**規則が同一のランプ間で
     * 非対称を作らない。** 逃げ道（プリミティブ参照・任意値記法・素の数値・
     * 不透明度・アルファ修飾子）を全部塞いだので、**役割が無い＝書く手段が無い**である。
     *
     * 不透明度で薄める道は塞いだ（決定1-15）。塗りを `opacity` で変えると
     * 塗りと文字が同時に下地へ寄り、4.50:1 が 3.17:1 まで落ちる。
     */
    ...fillRamps.map(
      ({ role, ramp }) =>
        `  --sg-color-${role}-strong: var(--sg-${ramp}-${roles.colorStrong});`,
    ),
    // 塗りの上に載せる文字（決定5-14）。ランプごとに解いてある
    ...fillRamps.map(
      ({ role }) =>
        `  --sg-color-on-${role}: var(--sg-neutral-${roles.onFill[role as 'accent']});`,
    ),
    /**
     * 淡い塗りと、その上の文字（決定5-16）。**色のついた地である。**
     *
     * 不透明な塗り（`--sg-color-{名前}`）は強すぎる場面がある——バッジや帯がそれで、
     * roles.md が pylabo と holosphere で独立に観測した status の3変種の1つである。
     *
     * **観測どおりの「淡い塗り＋その色の文字」は、そのままでは成立しない。**
     * 明色で `danger` の段500 を段100 の上に置くと 4.02:1 で 4.5 に届かない。
     * 淡い塗りを面とみなして段を解き直している（決定5-12 と同じ考え方）。
     *
     * **アイコンにも同じ段を使う。** 文字の段は 3:1 も必ず満たす。
     * 決定5-7 がマークを1段明るい側に置いたのはチャート系列を見分けるためで、
     * 帯の中のアイコンには当てはまらない。
     */
    ...fillRamps.flatMap(({ role, ramp }) => [
      `  --sg-color-${role}-subtle: var(--sg-${ramp}-${roles.colorSubtle});`,
      `  --sg-color-on-${role}-subtle: var(--sg-${ramp}-${roles.onSubtle});`,
    ]),
    `  --sg-color-border-focus: var(--sg-primary-${roles.colorMark});`,
    ...statusNames.flatMap((n) => [
      `  --sg-color-${n}: var(--sg-${n}-${roles.colorText});`,
      `  --sg-color-${n}-mark: var(--sg-${n}-${roles.colorMark});`,
    ]),
    // 段が足りない面では出さない。親の面の値をそのまま継承する（決定5-12）
    ...(roles.series ?? []).map(
      (step, i) => `  --sg-color-chart-${i + 1}: var(--sg-series-${i + 1}-${step});`,
    ),
    ...sequentialVars(mode, roles.surface),
    ...elevationVars(mode, roles, depth),
  ];
};

/**
 * 浮き（決定1-8 改訂）。**モードで媒体が変わる。**
 *
 *   明色  影。offset = h × base、blur = その blurRatio 倍、色は --sg-shadow-ink
 *   暗色  輪郭。h ごとに境界の段を深くする
 *
 * 暗色で影を出さないのは、**出せないから**である。影の色を純黒・アルファ 1.0 に
 * しても、暗色の面に対して作れるコントラストは 1.08〜1.73:1 しかない
 * （明色は 10.91〜19.27:1。全360色相で測定）。
 *
 * 明度差分も持てない。決定5-2 が端点をちょうど 4.500 に解いているため、暗色の面を
 * 持ち上げられる余地は Δ ≤ 0.0074（面1段分は 0.0703）しかなく、足せば文字が要件を割る。
 * **前景は面の文脈のまま背景だけが動く**ので、Issue #65 と同じ「塗るだけの道」になる。
 *
 * 段は面の深さで解き直された `roles.border` から取るので、深い面では輪郭も一緒に動く。
 * **プリミティブとしては出せない。** 値がモードと面に依存するためである。
 *
 * **申告する限界（自己レビュー B2）。** 暗色で表せるのは `h` の順序であって量ではない。
 * 明色は `offset` も `blur` も `h` に比例するが、暗色は境界の段を1段ずらすだけで、
 * 段は3つしか無いので `h` を増やしても頭打ちになる。媒体を変えた以上避けられない。
 *
 * **明色は面に依らないので、面の文脈では出さない**（自己レビュー B1）。
 * `:root` の1行が継承で届く。面ごとに同じ行を並べると、
 * 「面ごとに違う値がある」という誤った読み方を誘う。
 */
const elevationVars = (
  mode: 'light' | 'dark',
  roles: SurfaceRoles,
  depth: number,
): string[] => {
  if (mode === 'light') {
    if (depth > 0) return [];
    return elevationRoles.map((role) => {
      const { offset, blur } = elevationGeometry(elevationHeight(role));
      return `  --sg-elevation-${role}: 0 ${offset}px ${blur}px var(--sg-shadow-ink);`;
    });
  }
  return elevationRoles.map(
    (role) =>
      `  --sg-elevation-${role}: 0 0 0 var(--sg-border-width-0) ` +
      `var(--sg-neutral-${roles.border[elevationOutline(role)]});`,
  );
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
 * 浮いて見せるのは elevation の責務である（決定1-8 改訂）。
 * **暗色では同じ段になるので、`--sg-elevation-overlay` が無いと下地と同化する。**
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
  /**
   * **控えるのは色だけである。** hover は面の文脈を1段深くするが、
   * 浮き（`--sg-elevation-*`）は hover では変わらない。行に触れて浮き上がる
   * 挙動は観測4本に1件も無い。
   *
   * 名前で絞らずに全部を控えると、`--sg-elevation-*` が
   * **改名されないまま**控えの一覧に入り、内部の層とセマンティックの層が重なる。
   */
  const mirrored = semanticFor(mode, next, depth + 1)
    .filter((line) => /^\s*--sg-color-/.test(line))
    .map((line) => line.replace(/^(\s*)--sg-color-/, '$1--sg-color-hover-'));
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
    /**
     * **1段深い面の地。** hover の規則と、骨組み表示の明滅がどちらもこれを読む
     * （決定5-13・決定1-14 改訂）。名前に hover を含めていないのはそのためである。
     *
     * 面の色は値として出さない（決定5-12 改訂）が、**これは面の色ではなく
     * 「1段深い段」という関係**であり、塗るだけの道にはならない。
     * 読めるのは `tokens.css` 自身の規則だけで、利用側からの参照は禁止している。
     */
    `  --sg-color-deeper-bg: var(--sg-neutral-${next.surface});`,
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
  '  background-color: var(--sg-color-deeper-bg);',
  // 背景は変数ではなく background-color として移すので、名前の対応からは外れる
  ...hoverMirrorNames(palette)
    .filter((n) => n !== '--sg-color-deeper-bg')
    .map((n) => `  ${n.replace('--sg-color-hover-', '--sg-color-')}: var(${n});`),
];

/**
 * ページ地に対して**対比の要件を持つ**色の役割（決定5-2・5-7）。
 *
 * `tokens.js` は16進に丸めるので、境界ちょうどに解かれた段が丸めで要件を割ることがある
 * （決定2-6 改訂、Issue #52）。**どの役割にどの要件があるか**をここで持ち、
 * 割ったときだけ寄せる。
 *
 * ここに載っていない役割は「要件が無い」ものである。
 *   bg-*        面そのもの。前景ではない
 *   border-*    装飾。要件を持たない（決定5-12）
 *   on-*        要件はあるが**相手が塗り**で、ページ地ではない（決定5-14）
 *   *-strong    要件はあるが**常に通常の塗りより厳しい側**にある（決定5-15）。
 *               1段深い段なので、ページ地に対しても塗りの上の文字に対しても
 *               通常の塗りより余裕が増えるだけで、丸めで割ることがない
 *   sequential-* 帯として読めればよく、特定の比を要求しない（決定5-11）
 *
 * **分類漏れは検査が捕まえる。** `test/values.test.ts` が、すべての `--sg-color-*` が
 * 「要件あり」か「要件無しとして明示」のどちらかに入っていることを見る。
 */
export const colorRequirements = (
  mode: 'light' | 'dark',
  palette: Palette,
): Map<string, number> => {
  const g = cfg.guarantees;
  const roles = surfaceRolesFor(palette, mode)[0]!;
  const out = new Map<string, number>();
  for (const k of ['default', 'muted', 'faint']) out.set(`--sg-color-text-${k}`, g.textMin);
  out.set('--sg-color-accent', g.textMin);
  out.set('--sg-color-accent-mark', g.markMin);
  out.set('--sg-color-border-focus', g.markMin);
  for (const n of statusNames) {
    out.set(`--sg-color-${n}`, g.textMin);
    out.set(`--sg-color-${n}-mark`, g.markMin);
  }
  (roles.series ?? []).forEach((_, i) => out.set(`--sg-color-chart-${i + 1}`, g.markMin));
  return out;
};

/** 要件を持たないことを**明示する**接頭辞。ここも検査が使う */
export const colorWithoutRequirement = (name: string): boolean =>
  name.startsWith('--sg-color-bg-') ||
  name.startsWith('--sg-color-border-subtle') ||
  name.startsWith('--sg-color-border-default') ||
  name.startsWith('--sg-color-border-strong') ||
  name.startsWith('--sg-color-chart-gridline') ||
  name.startsWith('--sg-color-on-') ||
  // 塗りの1段強い段（決定5-15）。通常の塗りより必ず端に近いので余裕は増えるだけ。
  // **境界の border-strong とは別物**なので、塗りのランプの一覧に当てる
  fillRampNames.some((r) => name === `--sg-color-${r}-strong`) ||
  // 淡い塗りは面であって前景ではない。その上の文字は**塗りに対して**解いてある（決定5-16）
  fillRampNames.some((r) => name === `--sg-color-${r}-subtle`) ||
  name.startsWith('--sg-color-sequential-');
