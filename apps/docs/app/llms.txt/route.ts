import { llms } from 'fumadocs-core/source/llms';
import { source } from '../../lib/source';

/**
 * AI 向けの索引。**ページ木からそのまま出す。**
 *
 * 手で一覧を持たない。持つと、ページを足したときに片方だけ古くなる。
 */
export const revalidate = false;

export function GET() {
  return new Response(llms(source).index(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
