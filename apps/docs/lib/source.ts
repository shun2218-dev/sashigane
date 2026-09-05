import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

/**
 * ページ木。**AI が読む形の出所でもある。**
 *
 * `includeProcessedMarkdown` を立てると、各ページの
 * **加工後の Markdown** が `getText('processed')` から取れる。
 * これが `llms.txt` と `.md` の中身になる——
 * **MDX をそのまま出すと、展示の JSX が混ざって読めない。**
 */
const docs = defineDocs({
  dir: 'content/docs',
  docs: { postprocess: { includeProcessedMarkdown: true } },
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

/**
 * ページの絵の場所。**段は `image.png` で終える。**
 *
 * 経路の組み立てはここ1箇所だけに置く。2箇所に置くと、
 * 片方だけ直したときに**絵の無いページが静かに生まれる。**
 */
export function pageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];
  return { segments, url: `/og/docs/${segments.join('/')}` };
}
