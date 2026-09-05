import { createMDX } from 'fumadocs-mdx/next';

/**
 * ドキュメントサイト。**Tailwind アダプタ（theme.css）はここに入れない。**
 *
 * `--*: initial` が Tailwind の名前空間を全部落とすので、fumadocs-ui の `@apply` が
 * 解決できずビルドが落ちる（決定6-4、experiments/fumadocs-adapter-coexistence.md）。
 * chrome は素の Tailwind で組み、アダプタが要るのはプレビューとサンプルページだけである。
 */
const config = {
  reactStrictMode: true,
  /*
    人が読む URL の末尾に `.md` を足すと、AI が読む形が返る。
    **別の URL を覚えさせない**——読んでいるページの住所がそのまま使える。
  */
  async rewrites() {
    return [{ source: '/docs/:path*.md', destination: '/llms.mdx/docs/:path*' }];
  },
  // トークン層は TS のソースをそのまま公開している（生成物はコミットしない。原則1）
  transpilePackages: ['@sashigane/tokens'],
};

export default createMDX()(config);
