import { llmText } from '../../lib/llm-text';
import { source } from '../../lib/source';

/**
 * 全ページを1つにまとめたもの。**索引と同じページ木から出す。**
 */
export const revalidate = false;

export async function GET() {
  const pages = await Promise.all(source.getPages().map(llmText));
  return new Response(pages.join('\n\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
