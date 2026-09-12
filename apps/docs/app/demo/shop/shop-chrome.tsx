'use client';

/*
  店の外枠。**ドキュメントサイトの外枠は使わない。**

  fumadocs の HomeLayout は本文の幅を狭く決めているので、
  **店として現実味のある画面にならない。**

  ## 参考にした作り

  写真が主役の EC（Aesop、Blue Bottle、KINTO のような）に共通しているのは
  次の3つで、そこを写している。

  **ヘッダは薄く、上に貼り付く。** 画面の高さを食わない。
  面を宣言して不透明にする——**塗るだけの道は無い**ので、`data-sg-surface` で宣言する。
  **横幅は中身で変える。** 読ませる文は狭く、写真の並びは広く。
  **余白は段で刻む。** 節と節の間を大きく取り、中は詰める。
*/
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, Button, Separator, Toaster } from '@sashigane/ui';
import { CartProvider, useCart } from './cart';

const NAV = [
  { href: '/demo/shop', label: 'トップ' },
  { href: '/demo/shop/products', label: '商品' },
  { href: '/demo/shop/cart', label: 'カート' },
];

/** 店の名前。**架空である** */
export const SHOP = '深煎り堂';

/**
 * 中身の横幅。**用途で変える。**
 *
 * `wide` は写真の並び、`text` は読ませる文。
 * 全部を同じ幅に入れると、**どこも同じ重さに見える。**
 */
export function ShopWidth({
  size = 'wide',
  className = '',
  children,
}: {
  size?: 'wide' | 'text';
  className?: string;
  children: ReactNode;
}) {
  const w = size === 'text' ? 'max-w-45rem' : 'max-w-64rem';
  return <div className={`mx-auto w-full ${w} px-6 ${className}`}>{children}</div>;
}

/** 店の外枠。**カートは店全体で1つ。** ここで包むと、店の中を移っても中身が残る */
export function ShopChrome({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <ShopFrame>{children}</ShopFrame>
    </CartProvider>
  );
}

function ShopFrame({ children }: { children: ReactNode }) {
  const { lines } = useCart();
  /*
    **カートに何点入っているかを、店のどこからでも見せる。**

    知らせ（Toast）は出るが消えるので、**入れたことが残らない。**
    数は袋の数を足したものである（行の数ではない）——
    同じ豆を2袋入れたら 2 になる。
  */
  const cartCount = lines.reduce((n, l) => n + l.count, 0);

  return (
    <div className="flex min-h-screen flex-col">
      {/*
        **薄く、上に貼り付く。** 高さを食わないので、写真が主役のままでいられる。
        境界は1本だけ引く。面を変えると帯として主張しすぎる。
      */}
      <header
        data-sg-surface="page"
        className="sticky top-0 z-10 border-b-1 border-border-subtle"
      >
        {/*
          **狭い画面では折り返させない。** 折り返すとヘッダが3行になり、
          貼り付いたまま画面の3分の1を占める。**行を増やさず、横に流す。**
        */}
        <ShopWidth className="flex items-center gap-4 py-3">
          <Link href="/demo/shop" className="shrink-0 text-label font-emphasis">
            {SHOP}
          </Link>
          <nav
            aria-label="店の中"
            className="flex min-w-0 items-center gap-1 overflow-x-auto"
          >
            {NAV.map((n) => (
              <Button key={n.href} variant="ghost" asChild>
                <Link href={n.href} className="whitespace-nowrap">
                  {n.label}
                  {/*
                    **点数は数字で見せ、読み上げには言葉で渡す。**
                    印だけだと「3」としか読まれず、何の 3 か分からない。
                  */}
                  {n.href.endsWith('/cart') && cartCount > 0 ? (
                    <>
                      <Badge tone="accent" size="sm" aria-hidden="true">
                        {cartCount}
                      </Badge>
                      <span className="sr-only">{`（${cartCount}点）`}</span>
                    </>
                  ) : null}
                </Link>
              </Button>
            ))}
          </nav>
          {/* **狭い画面では隠す。** 店の中の移動が先である */}
          <div className="ms-auto hidden shrink-0 sm:block">
            <Button variant="outline" asChild>
              <Link href="/docs" className="whitespace-nowrap">
                ドキュメントへ
              </Link>
            </Button>
          </div>
        </ShopWidth>
      </header>

      <main className="flex-1">{children}</main>

      <footer data-sg-surface="inset" className="mt-24">
        <ShopWidth className="flex flex-col gap-6 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="text-label font-emphasis">{SHOP}</p>
              <p className="text-caption text-muted">
                注文を受けてから焙煎します。発送は焙煎の翌日です。
              </p>
            </div>
            <nav aria-label="商品" className="flex flex-col gap-1">
              <p className="text-caption text-muted">商品</p>
              <Link href="/demo/shop/products" className="text-body">
                すべての豆
              </Link>
              <Link href="/demo/shop/products/house-blend" className="text-body">
                定番のブレンド
              </Link>
            </nav>
            <nav aria-label="この店について" className="flex flex-col gap-1">
              <p className="text-caption text-muted">この店について</p>
              <Link href="/docs" className="text-body">
                sashigane のドキュメント
              </Link>
              <Link href="/demo" className="text-body">
                トークンだけのデモ
              </Link>
            </nav>
          </div>
          <Separator />
          <p className="text-caption text-muted">
            sashigane のコンポーネントだけで組んだ架空の店です。注文はできません。
            色も寸法も、生の値を1つも書いていません。
          </p>
        </ShopWidth>
      </footer>

      {/* **アプリに1つ。** 画面ごとに置くと読み上げの領域が増える */}
      <Toaster />
    </div>
  );
}
