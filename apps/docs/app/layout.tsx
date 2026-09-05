import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './global.css';

/**
 * 絵の URL は**絶対でなければ届かない。** 相対のままだと
 * Next.js が `http://localhost:3000` を補い、**そのまま本番に出る。**
 *
 * まだ配信していないので既定は手元の住所である。
 * 配信を始めるときに `NEXT_PUBLIC_SITE_URL` を渡す。
 *
 * **渡す先はビルドである。** `NEXT_PUBLIC_*` はビルド時に埋め込まれるので、
 * `next start` に渡しても効かない——**手元で一度そう試して、効かないことを確かめた。**
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'sashigane',
  description: 'トークンが唯一の正であるデザインシステム',
  /**
   * favicon は生成物なので `public/` に出る（原則1）。
   * **`app/icon.svg` の置き場は使えない**——あそこは追跡下のファイルを前提にしている。
   *
   * apple icon は `app/apple-icon.tsx` が受け持つので、ここには書かない。
   */
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        {/*
          テーマの切り替えを、サイトの chrome とトークンの両方に届ける。

          Fumadocs（next-themes）は既定で `class="light" / "dark"` だけを付ける。
          一方 tokens.css が見ているのは `[data-theme]` なので、**重なりがゼロ**だった。
          切り替えても、コンポーネントのプレビューは OS の設定のまま残っていた。

          `attribute` に両方を渡して、1回の切り替えが両方に届くようにする。
        */}
        <RootProvider theme={{ attribute: ['class', 'data-theme'] }}>{children}</RootProvider>
      </body>
    </html>
  );
}
