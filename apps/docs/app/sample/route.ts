import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generatePalette, hexToOklch, toTokensCss } from '@sashigane/tokens';

/**
 * サンプルページ。**独立した URL であり、React を1行も使わない**（決定6-4 の改訂）。
 *
 * 以前はテーマビルダーの中に iframe で埋め込み、`srcdoc` に流し込んでいた。
 * 生成物は `:root` と `@media (prefers-color-scheme)` と `[data-theme]` を書くので、
 * 同じドキュメントに入れるとビルダー自身の見た目まで巻き込むためである。
 *
 * **別の URL にすれば、隔離そのものが要らない。**
 * さらに、ページとして React を経由しなくなったので、
 * **「React が要らないことを見せるページ」が実際に React を通らない。**
 *
 * ## HTML の場所を動かしていない
 *
 * `src/sample-page.html` のまま読む。`check:sample-page` がこのパスを見ている（Issue #61）。
 * Next.js の追跡に入ることは確認済み（`route.js.nft.json`）。
 *
 * ## 受け取るもの
 *
 *   primary   色相のもとになる16進。既定は #3b82f6
 *   theme     light / dark。省略すると @media (prefers-color-scheme) に従う
 *   density   compact / default / comfortable。省略すると画面幅が決める（決定1-12）
 *   brand     on のとき見出しに書体を差す（決定1-11 の差し込み口）
 */

/**
 * **リクエストのたびに読む。**
 *
 * 自己レビュー H3 は「内容は不変なのでモジュールスコープで1回読めばよい」と言ったが、
 * **退ける。** 1回だけ読むと、**開発中に HTML を編集しても再起動まで反映されない。**
 * この HTML はトークンの見え方を確かめながら手を入れるファイルなので、
 * 鮮度の方が 684 行の読み込みより価値がある。
 *
 * 実際、1回読む形にしたときは下の差し込み口の検査が**発火しなかった**——
 * 古い内容を持ったままだったためである。**最適化が検査を無効化していた。**
 */
const template = () => readFileSync(join(process.cwd(), 'src/sample-page.html'), 'utf8');

/** 差し込み口。**この文字列が HTML から消えたら、静かに壊れる**（下記） */
const TOKEN_SLOT = '<style id="sg-tokens"></style>';
const HTML_TAG = '<html lang="ja">';

/**
 * **置換が起きたことを確かめる**（自己レビュー H1）。
 *
 * `String.prototype.replace` は一致しなければ元の文字列をそのまま返す。
 * `sample-page.html` の側で差し込み口の書き方が変わると、
 * **トークンが1つも入っていないページが 200 で返る。**
 * 素の HTML として表示されるので**それらしく見え、エラーも出ない**（教訓4）。
 */
const replaceOnce = (text: string, needle: string, replacement: string) => {
  if (!text.includes(needle)) {
    throw new Error(
      `sample-page.html に差し込み口 ${needle} がありません。` +
        'HTML 側を変えたなら app/sample/route.ts も直してください。',
    );
  }
  return text.replace(needle, replacement);
};

/** `<html>` に足す属性。`auto` は**属性を外した状態**なので、無い場合は何も足さない */
const attribute = (name: string, value: string | null, allowed: string[]) =>
  value && allowed.includes(value) ? ` ${name}="${value}"` : '';

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hex = params.get('primary') ?? '#3b82f6';

  let css: string;
  try {
    css = toTokensCss(generatePalette(hexToOklch(hex)));
  } catch {
    return new Response(`primary が16進の色として読めません: ${hex}`, {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // 書体の差し込み口は **:root に差さないと届かない**（experiments/font-family.md）。
  // スタック側の var() は宣言された要素で置換されるため、部分木に差しても効かない。
  //
  // **他の3つと同じく値を見る**（自己レビュー H2）。存在だけで判定すると
  // `?brand=0` でも効いてしまい、URL の組み立て規則がここだけ違うことになる
  const brand =
    params.get('brand') === 'on'
      ? ':root { --sg-font-brand-display-latin: Georgia, serif; }'
      : '';

  let html: string;
  try {
    html = replaceOnce(template(), TOKEN_SLOT, `<style id="sg-tokens">${css}\n${brand}</style>`);
    html = replaceOnce(
      html,
      HTML_TAG,
      `<html lang="ja"${attribute('data-theme', params.get('theme'), ['light', 'dark'])}` +
        `${attribute('data-sg-density', params.get('density'), ['compact', 'default', 'comfortable'])}>`,
    );
  } catch (e) {
    // **黙って通さない。** トークンの入っていないページはそれらしく見えてしまう
    return new Response(String(e instanceof Error ? e.message : e), {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
