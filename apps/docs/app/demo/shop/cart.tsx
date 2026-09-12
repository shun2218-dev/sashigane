'use client';

/*
  カート。**店の中で1つだけ持つ。**

  `ShopChrome` がこれで店全体を包む。レイアウトは店の中を移っても作り直されないので、
  **ページをまたいで中身が残る。**

  ## 再読み込みすると消える

  ブラウザには保存しない。訪れるたびに同じ見本（`SAMPLE_CART`）から始まる。

  ## 行は「豆と選んだ中身」ごとに分ける

  同じ豆でも、量や定期便が違えば**値段が違う。** まとめると、どちらかの値段が嘘になる。
  同じ中身をもう一度入れたら、数だけを足す。

  ## 在庫は豆ごとに数える

  行ごとに在庫で抑えると、量違いの行を足していくうちに在庫を超える。
  **同じ豆の他の行を引いた残り**を、その行の上限にする。
*/
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_OPTIONS, PRODUCTS, SAMPLE_CART, unitPrice } from './data';
import type { CartOptions, Product } from './data';

type Item = CartOptions & { key: string; slug: string; count: number };

/** 画面に出す行。**値段は入れたときの選択から導く** */
export type CartLine = Item & { product: Product; unit: number };

const keyOf = (slug: string, o: CartOptions) =>
  [slug, o.size, o.grind, o.subscribe ? 'sub' : '', o.gift ? 'gift' : ''].join(':');

const INITIAL: Item[] = SAMPLE_CART.map(({ slug, count }) => ({
  key: keyOf(slug, DEFAULT_OPTIONS),
  slug,
  count,
  ...DEFAULT_OPTIONS,
}));

const stockOf = (slug: string) => PRODUCTS.find((p) => p.slug === slug)?.stock ?? 0;

type Cart = {
  lines: CartLine[];
  /**
   * 入れる。**実際に入った数を返す。**
   *
   * 在庫で抑えたとき、知らせで「入れました」と言い切らないため。
   */
  add: (slug: string, options: CartOptions, count: number) => number;
  /** 数を直す。**1 から、その行の上限までに丸める** */
  setCount: (key: string, count: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** その行に入れられる上限。**同じ豆の他の行を引いた在庫** */
  limit: (key: string) => number;
};

const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(INITIAL);

  /** 同じ豆の、`key` 以外の行に入っている数を引いた在庫 */
  const room = (slug: string, key: string) =>
    Math.max(
      0,
      stockOf(slug) -
        items.filter((i) => i.slug === slug && i.key !== key).reduce((n, i) => n + i.count, 0),
    );

  const cart: Cart = {
    lines: items.flatMap((i) => {
      const product = PRODUCTS.find((p) => p.slug === i.slug);
      return product ? [{ ...i, product, unit: unitPrice(product, i.size, i.subscribe) }] : [];
    }),
    add: (slug, options, count) => {
      const key = keyOf(slug, options);
      const current = items.find((i) => i.key === key)?.count ?? 0;
      const next = Math.min(room(slug, key), current + count);
      if (next <= current) return 0;
      setItems(
        current === 0
          ? [...items, { key, slug, count: next, ...options }]
          : items.map((i) => (i.key === key ? { ...i, count: next } : i)),
      );
      return next - current;
    },
    setCount: (key, count) => {
      const item = items.find((i) => i.key === key);
      if (!item) return;
      const next = Math.max(1, Math.min(room(item.slug, key), count));
      setItems(items.map((i) => (i.key === key ? { ...i, count: next } : i)));
    },
    remove: (key) => setItems(items.filter((i) => i.key !== key)),
    clear: () => setItems([]),
    limit: (key) => {
      const item = items.find((i) => i.key === key);
      return item ? room(item.slug, key) : 0;
    },
  };

  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart は CartProvider の中で使う（店の中は ShopChrome が包んでいる）');
  return cart;
}
