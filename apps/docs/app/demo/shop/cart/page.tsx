'use client';

/*
  カート。**表で並べ、数量を直せる。**

  中身は店全体で1つ持っている（`cart.tsx`）。商品の詳細で入れたものがここに出る。

  ここでも数量の増減は自分で組んでいる。**行ごとに同じものを書くことになる**ので、
  1つの画面に何度も並ぶ。部品が無いことがはっきり出る場所である。
*/
import Link from 'next/link';
import {
  Alert,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  IconX,
  Input,
  List,
  ListItem,
  Separator,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  useToast,
} from '@sashigane/ui';
import { useCart } from '../cart';
import { lineNote, yen } from '../data';
import { ShopWidth } from '../shop-chrome';
import { ShopImage } from '../product-image';

const SHIPPING = 590;
const FREE_OVER = 5000;

export default function Cart() {
  const { show: showToast } = useToast();
  const { lines, setCount, remove, limit } = useCart();

  const subtotal = lines.reduce((n, r) => n + r.unit * r.count, 0);
  const shipping = subtotal >= FREE_OVER || subtotal === 0 ? 0 : SHIPPING;
  const total = subtotal + shipping;

  const drop = (key: string, name: string) => {
    remove(key);
    showToast({ message: `${name} をカートから外しました`, tone: 'default' });
  };

  return (
    <ShopWidth className="flex flex-col gap-8 py-12">
      <Breadcrumb label="いまいる場所">
        <BreadcrumbItem href="/demo/shop">トップ</BreadcrumbItem>
        <BreadcrumbItem>カート</BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-heading-2 font-emphasis">カート</h1>

      {lines.length === 0 ? (
        <Card surface="surface">
          <CardHeader>
            <CardTitle>カートは空です</CardTitle>
            <CardDescription>気になった豆を入れてください。</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/demo/shop/products">商品を見る</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {subtotal < FREE_OVER ? (
              <Alert tone="info" title={`あと ${yen(FREE_OVER - subtotal)} で送料が無料になります`}>
                {yen(FREE_OVER)} 以上のご注文で送料をいただきません。
              </Alert>
            ) : (
              <Alert tone="success" title="送料は無料です">
                {yen(FREE_OVER)} 以上のご注文になりました。
              </Alert>
            )}

            <Table>
              <thead>
                <TableRow>
                  <TableHeaderCell>商品</TableHeaderCell>
                  <TableHeaderCell numeric>単価</TableHeaderCell>
                  <TableHeaderCell numeric>数量</TableHeaderCell>
                  <TableHeaderCell numeric>小計</TableHeaderCell>
                  <TableHeaderCell>操作</TableHeaderCell>
                </TableRow>
              </thead>
              <tbody>
                {lines.map((r) => {
                  /* **同じ豆が2行あるとき、読み上げで見分けられるように中身まで言う** */
                  const name = `${r.product.name}（${lineNote(r)}）`;
                  return (
                    <TableRow key={r.key}>
                      <TableCell scope="row">
                        <span className="flex items-center gap-3">
                          <ShopImage
                            seed={r.slug}
                            alt={r.product.name}
                            className="w-16 rounded-sm"
                          />
                          <span className="flex flex-col">
                            <Link href={`/demo/shop/products/${r.slug}`} className="text-label">
                              {r.product.name}
                            </Link>
                            <span className="text-caption text-muted">{lineNote(r)}</span>
                            <Badge tone="neutral" size="sm">
                              {r.product.roast}
                            </Badge>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell numeric>{r.unit.toLocaleString('ja-JP')}</TableCell>
                      <TableCell numeric>
                        {/*
                          **ラベルは表の見出しが持っている。** 行ごとに「数量」と出すと
                          同じ語が並ぶので、読み上げにだけ渡す。
                          Field を通さないので、**関連付けは自分で書くことになる**——
                          数量の増減に部品が無いことが、ここでも出る。
                        */}
                        <Input
                          type="number"
                          min={1}
                          max={limit(r.key)}
                          value={r.count}
                          aria-label={`${name} の数量`}
                          className="font-numeric"
                          onChange={(e) => setCount(r.key, Number(e.currentTarget.value) || 1)}
                        />
                      </TableCell>
                      <TableCell numeric>{(r.unit * r.count).toLocaleString('ja-JP')}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          iconOnly
                          aria-label={`${name} を外す`}
                          onClick={() => drop(r.key, r.product.name)}
                        >
                          <IconX />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>

          <Card surface="surface" elevation="raised" className="h-fit">
            <CardHeader>
              <CardTitle>お支払い金額</CardTitle>
            </CardHeader>
            <List>
              <ListItem>
                <span className="flex justify-between gap-4">
                  <span>小計</span>
                  <span className="font-numeric">{yen(subtotal)}</span>
                </span>
              </ListItem>
              <ListItem>
                <span className="flex justify-between gap-4">
                  <span>送料</span>
                  <span className="font-numeric">{shipping === 0 ? '無料' : yen(shipping)}</span>
                </span>
              </ListItem>
            </List>
            <Separator />
            <p className="flex justify-between gap-4 text-heading-2 font-emphasis">
              <span>合計</span>
              <span className="font-numeric">{yen(total)}</span>
            </p>
            <Button asChild>
              <Link href="/demo/shop/checkout">注文へ進む</Link>
            </Button>
          </Card>
        </div>
      )}
    </ShopWidth>
  );
}
