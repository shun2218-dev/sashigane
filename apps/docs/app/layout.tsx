import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './global.css';

export const metadata = {
  title: 'sashigane',
  description: 'トークンが唯一の正であるデザインシステム',
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
