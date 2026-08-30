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
 *
 * ## 受け取るもの
 *
 *   primary   色相のもとになる16進。既定は #3b82f6
 *   theme     light / dark。省略すると @media (prefers-color-scheme) に従う
 *   density   compact / default / comfortable。省略すると画面幅が決める（決定1-12）
 *   brand     見出しに書体を差す（決定1-11 の差し込み口）
 */
const HTML = join(process.cwd(), 'src/sample-page.html');

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
  // スタック側の var() は宣言された要素で置換されるため、部分木に差しても効かない
  const brand =
    params.get('brand') === null
      ? ''
      : ':root { --sg-font-brand-display-latin: Georgia, serif; }';

  const html = readFileSync(HTML, 'utf8')
    .replace('<style id="sg-tokens"></style>', `<style id="sg-tokens">${css}\n${brand}</style>`)
    .replace(
      '<html lang="ja">',
      `<html lang="ja"${attribute('data-theme', params.get('theme'), ['light', 'dark'])}` +
        `${attribute('data-sg-density', params.get('density'), ['compact', 'default', 'comfortable'])}>`,
    );

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
