'use client';

/*
  店の外枠。**ドキュメントサイトの外枠は使わない。**

  fumadocs の HomeLayout は本文の幅を狭く決めているので、
  **店として現実味のある画面にならない。** ここでは自分で持つ。

  ヘッダも脚も sashigane のコンポーネントとトークンで組んである。
  **生の色を1つも書いていない。**
*/
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, Button, Separator, Toaster } from '@sashigane/ui';

const NAV = [
  { href: '/demo/shop', label: 'トップ' },
  { href: '/demo/shop/products', label: '商品一覧' },
  { href: '/demo/shop/cart', label: 'カート' },
];

/** 店の名前。**架空である** */
export const SHOP = '深煎り堂';

export function ShopChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header data-sg-surface="surface" className="border-b-1 border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/demo/shop" className="text-label font-emphasis">
            {SHOP}
          </Link>
          <nav aria-label="店の中" className="flex flex-wrap items-center gap-1">
            {NAV.map((n) => (
              <Button key={n.href} variant="ghost" asChild>
                <Link href={n.href}>{n.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <Badge tone="accent" size="sm">
              デモ
            </Badge>
            <Button variant="outline" asChild>
              <Link href="/docs">ドキュメントへ戻る</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>

      <footer data-sg-surface="inset" className="mt-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6">
          <Separator />
          <p className="text-caption text-muted">
            {SHOP}は sashigane のコンポーネントだけで組んだ架空の店です。
            注文はできません。色も寸法も、生の値を1つも書いていません。
          </p>
        </div>
      </footer>

      {/* **アプリに1つ。** 画面ごとに置くと読み上げの領域が増える */}
      <Toaster />
    </div>
  );
}
