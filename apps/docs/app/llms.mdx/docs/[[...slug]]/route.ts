import { notFound } from 'next/navigation';
import { llmText } from '../../../../lib/llm-text';
import { source } from '../../../../lib/source';

/**
 * 1ページぶんの Markdown。**`/docs/…​.md` から書き換えて届く**（`next.config.mjs`）。
 *
 * 人が読む URL の末尾に `.md` を足すだけで、AI が読む形になる。
 */
export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return new Response(await llmText(page), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
