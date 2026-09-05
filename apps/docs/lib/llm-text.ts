import sources from '../generated/sources.json';
import type { source } from './source';

/**
 * 展示の差し込み。**そのまま出すと、読む側には意味の無いタグが1行残るだけ**である。
 */
const DEMO = /<ComponentDemo\s+name="([a-z-]+)"\s*\/>/g;

/**
 * 例のソースに置き換える。**AI にとってはここが一番中身のある部分**である。
 *
 * 展示ページは「どう書くか」を例に預けている（唯一の正）ので、
 * 例を落とすと**書き方が1つも残らない。**
 */
const expandDemo = (name: string) => {
  const examples = (sources as Record<string, Record<string, string>>)[name];
  if (!examples) return `<!-- ${name} の例が生成されていません -->`;
  return Object.entries(examples)
    .map(([state, code]) => `### 例: ${state}\n\n\`\`\`tsx\n${code.trim()}\n\`\`\``)
    .join('\n\n');
};

/**
 * `**` が `&#x2A;*` に化けたものを戻す。
 *
 * 和文の直後に `**` を書くと、MDX が曖昧さを避けて記号を実体参照へ逃がす。
 * **描画では同じだが、素の Markdown として読むと壊れて見える。**
 */
const unescapeAsterisk = (text: string) => text.replaceAll('&#x2A;', '*');

/**
 * 1ページを AI が読む形にする。**加工後の Markdown を出す。**
 *
 * 題と URL を先頭に付ける。**どこの話かが本文だけからは分からない**ためである。
 */
export async function llmText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');
  const body = unescapeAsterisk(processed).replace(DEMO, (_, name: string) => expandDemo(name));
  return `# ${page.data.title} (${page.url})\n\n${body}`;
}
