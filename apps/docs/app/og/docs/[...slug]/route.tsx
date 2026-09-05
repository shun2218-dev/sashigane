import { generate } from 'fumadocs-ui/og';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { pageImage, source } from '../../../../lib/source';

/**
 * ページごとの絵。**題と説明はページから取る。**
 *
 * 手で書かない——ページを直したときに絵だけ古くなる。
 *
 * 最後の段は `image.png` なので落とす。**経路の組み立ては `pageImage` に1つだけ**
 * 置いてあり、こちらはその逆をたどるだけである。
 */
export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    generate({ title: page.data.title, description: page.data.description, site: 'sashigane' }),
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: pageImage(page).segments }));
}
