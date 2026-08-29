/**
 * 生成物の先頭に置くヘッダ。
 *
 * ## なぜ共通化するか
 *
 * レジストリ方式（原則6）では、生成物は**利用側リポジトリへ落ちる。**
 * 落ちた先に `docs/decisions.md` は無く、「原則3」という参照も解決できない。
 * Phase 2 で ichirizuka にコミットした `app/tokens.css` が実際にその状態になっていた
 * （docs/experiments/phase2-ichirizuka.md の穴9、Issue #34）。
 *
 * ヘッダが5ファイルに手書きで散っていると、直したつもりで1つ残る。
 * **ここ1箇所に閉じておき、リンク先の差し替えも1行で済ませる。**
 *
 * ## 入れるもの・入れないもの
 *
 * **生成日時は入れない。** 内容が同じでも毎回 diff が出ると、
 * 利用側が「更新された」と誤認する。
 *
 * **バージョンは入れる**（決定4-6）。レジストリ方式では生成物が利用側リポジトリへ落ちるので、
 * **落ちた先で「どのスナップショットを持っているか」を知る手がかりがこれしかない。**
 * バージョンが上がるのはリリースのときだけなので、日時と違って毎回は動かない。
 */
import pkg from '../../package.json' with { type: 'json' };
import { toHex } from '../color/oklch.ts';
import type { Palette } from '../color/palette.ts';

/**
 * バージョン（決定4-6）。**出所はこの1箇所だけ。**
 *
 * 単一バージョンだが、置き場所は**トークン層の中**である。
 * 原則1 が「トークンが唯一の正」と言っており、原則4 は
 * **トークン層が外を参照しないこと**を要求している（`check:tokens-isolation`）。
 * リポジトリのルートを読みに行くと、`packages/tokens` を単体で取り出したときに壊れる。
 *
 * **生成器はブラウザでも動く**（テーマビルダーが `toTokensCss` を呼ぶ）ので、
 * ファイルを読む形にはできない。JSON の import なら両方で成立する。
 */
export const VERSION: string = pkg.version;

/** まだリリースしていないことを表す値。決定4-6 が「タグを打つまではこれ」と決めている */
export const UNRELEASED = '0.0.0';

/**
 * 規則と根拠の在り処。**差し替えるのはこの1行。**
 *
 * **リリース済みならタグに固定し、未リリースなら `HEAD` を指す**（決定4-6）。
 * 決定3-4 が「タグ固定にするかどうかはバージョンの扱いと一緒に決める」と保留していた点。
 *
 * 固定する理由は、**配布された生成物より新しい決定を読ませないため**である。
 * 利用側が持っているのは取得した時点のスナップショットなので、
 * `HEAD` を指すと「手元の CSS には無い決定」を読むことになる。
 *
 * 未リリースのあいだ `HEAD` にするのは、**固定する先が無い**からである。
 * v1 の前にドキュメントサイトを用意する予定で、そのときはこの関数の中だけを変える。
 */
export const docsUrl = (version: string = VERSION): string =>
  `https://github.com/shun2218-dev/sashigane/tree/${
    version === UNRELEASED ? 'HEAD' : `v${version}`
  }/docs`;

/**
 * 「何が生成したか」の1行（決定4-6）。**ツール名とバージョンを離さない。**
 *
 * バージョンだけを探すと、リリース済みのときに在り処の URL
 * （`.../tree/v0.1.0/docs`）に一致してしまい、**この行が落ちても検査が通る。**
 * `check-output-header.mjs` の陰性対照が実際にそれを捕まえた。
 */
export const producedBy = (version: string = VERSION): string =>
  version === UNRELEASED
    ? '@sashigane/tokens（未リリース）が生成する。'
    : `@sashigane/tokens v${version} が生成する。`;

/** コメントの書き方。CSS はブロック、SCSS / JS / d.ts は行コメント */
export type CommentStyle = 'block' | 'line';

/**
 * 共通ヘッダ。`what` はこのファイルが何かの1行、`notes` はファイル固有の注意。
 *
 * 配布先で意味を成すことが要件なので、**リポジトリ相対のパスを書かない。**
 * 見出し番号（決定1-2 など）は本文のコメントにも散っているので、
 * ここで「何を指す番号か」を一度だけ説明する。
 */
export const outputHeader = (
  style: CommentStyle,
  what: string,
  palette: Palette,
  notes: readonly string[] = [],
  /**
   * **既定は現在のバージョン。** 引数にしてあるのは検査のためである（自己レビュー B3）。
   *
   * `0.0.0` のまま長く続くので、**リリース済みの経路は普段1度も実行されない。**
   * 最初のタグを切る日に初めて動く形にしない。
   */
  version: string = VERSION,
): string[] => {
  // 受け継ぐのは色相だけ（決定5-1）。生成物がどの入力から出たかは、これで言い尽くせる。
  // 段 500 を添えるのは、色相だけでは人が色を思い浮かべられないため
  const anchor = palette.primary.byStep[500];
  const body = [
    `sashigane — ${what}`,
    `生成物。手で編集しない。${producedBy(version)}`,
    '',
    `規則と根拠: ${docsUrl(version)}`,
    'コメント中の「決定1-2」「原則3」は、そこにある decisions.md / principles.md の見出し。',
    '',
    `primary の色相 ${palette.primary.hue.toFixed(1)}° から生成した` +
      `${anchor ? `（段 500 は ${toHex(anchor)}）` : ''}。`,
    '受け継ぐのは色相だけで、明度も彩度も規則から解かれる（決定5-1・5-2）。',
    ...(notes.length > 0 ? ['', ...notes] : []),
  ];

  return style === 'block'
    ? ['/*', ...body.map((l) => (l ? `   ${l}` : '')), ' */']
    : body.map((l) => (l ? `// ${l}` : '//'));
};
