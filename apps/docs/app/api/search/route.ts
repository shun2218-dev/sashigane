import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '../../../lib/source';

/**
 * ドキュメントサイトの検索。**索引はページから作る。**
 *
 * `source` は MDX のページ木そのものなので、ページを足せば索引に入る。
 * 手で索引を持たない——持つと、片方だけ直したときに静かにずれる。
 *
 * ## 既定のまま使っている
 *
 * 語の切り出しは `multilingual` が既定で、和文もそのまま扱える。
 * 言語を指定すると**その言語用の切り出しに固定される**ので、指定しない。
 *
 * クライアント側も既定のまま（`fetch` で `/api/search` を叩く）。
 * `RootProvider` に渡す設定は無い。
 *
 * ## 静的書き出しはできなくなる
 *
 * この経路はリクエスト時に動く。`output: 'export'` に切り替えるなら、
 * 索引を静的に配る形（`*-static`）へ替える必要がある。
 */
export const { GET } = createFromSource(source);
