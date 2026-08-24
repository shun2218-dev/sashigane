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
 * ## 入れないもの
 *
 * **生成日時とバージョンを入れない。** 内容が同じでも毎回 diff が出ると、
 * 利用側が「更新された」と誤認する。バージョンの扱いは未決定でもある
 * （docs/branching.md）。決まった時点で、リンクをタグ固定にするかどうかも一緒に決める。
 */
import { toHex } from '../color/oklch.ts';
import type { Palette } from '../color/palette.ts';

/**
 * 規則と根拠の在り処。**差し替えるのはこの1行。**
 *
 * 今はリポジトリの docs を指している。`HEAD` は既定ブランチ（develop）に解決されるので、
 * 決定を足してもリンクが古びない。v1 の前にドキュメントサイトを用意する予定であり、
 * そのときはこの定数をサイトの URL に変える。生成物側は何も変わらない。
 */
export const DOCS_URL = 'https://github.com/shun2218-dev/sashigane/tree/HEAD/docs';

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
): string[] => {
  // 受け継ぐのは色相だけ（決定5-1）。生成物がどの入力から出たかは、これで言い尽くせる。
  // 段 500 を添えるのは、色相だけでは人が色を思い浮かべられないため
  const anchor = palette.primary.byStep[500];
  const body = [
    `sashigane — ${what}`,
    '生成物。手で編集しない。@sashigane/tokens が生成する。',
    '',
    `規則と根拠: ${DOCS_URL}`,
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
