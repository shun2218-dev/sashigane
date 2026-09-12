'use client';

/*
  商品一覧。**絞り込みと並び替えを持つ。**

  ここで足りないものが出た。**ページ送りの部品が無い。**
  9件なので今回は全部出しているが、**増えたら自分で組むことになる。**
*/
import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Select,
  Separator,
  Switch,
} from '@sashigane/ui';
import { PRODUCTS, stockLabel, stockTone, yen } from '../data';
import { ShopWidth } from '../shop-chrome';
import { ShopImage } from '../product-image';

const ROASTS = ['浅煎り', '中煎り', '中深煎り', '深煎り'] as const;

const ORDER = [
  { value: 'new', label: '新着順' },
  { value: 'cheap', label: '価格が安い順' },
  { value: 'expensive', label: '価格が高い順' },
];

export default function ProductList() {
  const [roasts, setRoasts] = useState<string[]>([]);
  const [inStock, setInStock] = useState(false);
  const [order, setOrder] = useState('new');

  const toggle = (r: string) =>
    setRoasts((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const shown = PRODUCTS.filter((p) => (roasts.length === 0 ? true : roasts.includes(p.roast)))
    .filter((p) => (inStock ? p.stock > 0 : true))
    .sort((a, b) => {
      if (order === 'cheap') return a.price - b.price;
      if (order === 'expensive') return b.price - a.price;
      return Number(b.isNew) - Number(a.isNew);
    });

  return (
    <ShopWidth className="flex flex-col gap-8 py-12">
      <Breadcrumb label="いまいる場所">
        <BreadcrumbItem href="/demo/shop">トップ</BreadcrumbItem>
        <BreadcrumbItem>商品一覧</BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-heading-2 font-emphasis">商品一覧</h1>

      <div className="grid gap-8 md:grid-cols-4">
        <aside data-sg-surface="surface" className="flex h-fit flex-col gap-4 rounded-lg p-4 md:col-span-1">
          <h2 className="text-label font-emphasis">絞り込み</h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-caption text-muted">焙煎度</legend>
            {ROASTS.map((r) => (
              <Field key={r} layout="inline" id={`roast-${r}`} label={r}>
                <Checkbox checked={roasts.includes(r)} onChange={() => toggle(r)} />
              </Field>
            ))}
          </fieldset>

          <Separator />

          <Field layout="inline" id="in-stock" label="在庫があるものだけ">
            <Switch checked={inStock} onChange={(e) => setInStock(e.currentTarget.checked)} />
          </Field>

          <Separator />

          <Field id="order" label="並び順">
            <Select
              options={ORDER}
              value={order}
              onChange={(e) => setOrder(e.currentTarget.value)}
            />
          </Field>
        </aside>

        <section className="flex flex-col gap-4 md:col-span-3">
          <p className="text-caption text-muted" aria-live="polite">
            <span className="font-numeric">{shown.length}</span> 件
          </p>

          {shown.length === 0 ? (
            <Card surface="surface">
              <CardHeader>
                <CardTitle>条件に合う豆がありません</CardTitle>
                <CardDescription>絞り込みを外すと出てきます。</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRoasts([]);
                    setInStock(false);
                  }}
                >
                  絞り込みを外す
                </Button>
              </CardFooter>
            </Card>
          ) : (
            /*
              **枠を持たせない。** 写真そのものが区切りになるので、
              カードで囲むと1つずつが重くなり、並びとして読めなくなる。
            */
            <ul className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/demo/shop/products/${p.slug}`}
                    data-sg-interactive
                    className="flex flex-col gap-3 rounded-sm p-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
                  >
                    <ShopImage
                      seed={p.slug}
                      alt={p.name}
                      className="aspect-square w-full rounded-sm object-cover"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={stockTone(p.stock)} size="sm">
                        {stockLabel(p.stock)}
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        {p.roast}
                      </Badge>
                    </div>
                    <p className="text-label font-emphasis">{p.name}</p>
                    <p className="text-caption text-muted">{p.origin}</p>
                    <p className="text-label font-numeric">{yen(p.price)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ShopWidth>
  );
}
