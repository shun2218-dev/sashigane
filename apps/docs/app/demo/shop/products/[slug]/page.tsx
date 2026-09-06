'use client';

/*
  商品の詳細。**買うまでの操作が全部ここにある。**

  カルーセルで写真、タブで説明と仕様とレビュー、
  ラジオとセレクトとチェックボックスとスイッチで注文の内容を決める。
*/
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  IconPlus,
  Input,
  List,
  ListItem,
  Radio,
  RadioGroup,
  Select,
  Separator,
  Switch,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
  Textarea,
  useToast,
} from '@sashigane/ui';
import { PRODUCTS, bySlug, stockLabel, stockTone, yen } from '../../data';
import { ShopWidth } from '../../shop-chrome';
import { ShopImage } from '../../product-image';

const GRINDS = [
  { value: 'beans', label: '豆のまま' },
  { value: 'medium', label: '中挽き（ドリップ）' },
  { value: 'fine', label: '細挽き（エスプレッソ）' },
];

const SIZES = [
  { value: '200', label: '200g' },
  { value: '500', label: '500g（10% 引き）' },
  { value: '1000', label: '1kg（15% 引き）' },
];

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = bySlug(slug);
  const { show: showToast } = useToast();
  const [size, setSize] = useState('200');
  const [count, setCount] = useState(1);
  const [subscribe, setSubscribe] = useState(false);
  const [gift, setGift] = useState(false);

  if (!product) notFound();

  const soldOut = product.stock === 0;
  const total = product.price * count;

  const add = () => {
    showToast({
      message: `${product.name} をカートに入れました`,
      tone: 'success',
    });
  };

  return (
    <ShopWidth className="flex flex-col gap-12 py-12">
      <Breadcrumb label="いまいる場所">
        <BreadcrumbItem href="/demo/shop">トップ</BreadcrumbItem>
        <BreadcrumbItem href="/demo/shop/products">商品一覧</BreadcrumbItem>
        <BreadcrumbItem>{product.name}</BreadcrumbItem>
      </Breadcrumb>

      {soldOut ? (
        <Alert tone="warning" title="いまは在庫がありません">
          次の焙煎は来週の火曜です。入荷したらお知らせできます。
        </Alert>
      ) : null}

      <section className="grid gap-12 md:grid-cols-2">
        {/*
          **写真は1枚である。** 同じ商品の別角度を持っていないので、
          カルーセルにすると同じ絵が並ぶ。**枠だけ用意して中身を水増ししない。**
        */}
        <ShopImage
          seed={product.slug}
          alt={`${product.name}の写真`}
          className="aspect-square w-full rounded-lg object-cover"
        />

        {/*
          **情報の列は上に貼り付ける。** 写真が長いので、下まで送ると
          買う操作が画面の外に出る。
        */}
        <div className="flex h-fit flex-col gap-4 md:sticky md:top-16">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stockTone(product.stock)}>{stockLabel(product.stock)}</Badge>
            <Badge tone="neutral">{product.roast}</Badge>
            {product.isNew ? <Badge tone="accent">新着</Badge> : null}
          </div>

          <h1 className="text-display font-emphasis">{product.name}</h1>
          <p className="text-body text-muted">{product.body}</p>

          <div className="flex flex-wrap gap-1">
            {product.notes.map((n) => (
              <Badge key={n} tone="info" size="sm">
                {n}
              </Badge>
            ))}
          </div>

          <p className="text-display font-numeric font-emphasis">
            {yen(total)}
            <span className="ms-2 text-caption text-muted">税込</span>
          </p>

          <Separator />

          <RadioGroup id="grind" label="挽き方" description="開封後は2週間で飲み切ってください">
            {GRINDS.map((g, i) => (
              <Field key={g.value} layout="inline" id={`grind-${g.value}`} label={g.label}>
                <Radio name="grind" value={g.value} defaultChecked={i === 0} disabled={soldOut} />
              </Field>
            ))}
          </RadioGroup>

          <Field id="size" label="量">
            <Select
              options={SIZES}
              value={size}
              onChange={(e) => setSize(e.currentTarget.value)}
              disabled={soldOut}
            />
          </Field>

          {/*
            **数量の増減は部品が無いので、ここで組んでいる。**
            端の制御も、直接入力されたときの丸めも、この場で決めることになる。
          */}
          <Field id="count" label="数量">
            <Input
              type="number"
              min={1}
              max={Math.max(1, product.stock)}
              value={count}
              disabled={soldOut}
              className="font-numeric"
              onChange={(e) =>
                setCount(
                  Math.max(1, Math.min(product.stock || 1, Number(e.currentTarget.value) || 1)),
                )
              }
            />
          </Field>

          <Field layout="inline" id="subscribe" label="毎月お届けにする" description="10% 引きになります">
            <Checkbox
              checked={subscribe}
              disabled={soldOut}
              onChange={(e) => setSubscribe(e.currentTarget.checked)}
            />
          </Field>

          <Field layout="inline" id="gift" label="ギフト包装をつける">
            <Switch checked={gift} disabled={soldOut} onChange={(e) => setGift(e.currentTarget.checked)} />
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={add} disabled={soldOut}>
              <IconPlus />
              カートに入れる
            </Button>
            <Button variant="outline" asChild>
              <Link href="/demo/shop/cart">カートを見る</Link>
            </Button>
          </div>
        </div>
      </section>

      <Tabs id="detail">
        <TabsList label="商品の詳細">
          <TabsTrigger value="about">説明</TabsTrigger>
          <TabsTrigger value="spec">仕様</TabsTrigger>
          <TabsTrigger value="review">レビュー</TabsTrigger>
        </TabsList>
        <TabsPanel value="about">
          <p className="text-body">{product.body}</p>
        </TabsPanel>
        <TabsPanel value="spec">
          <Table>
            <thead>
              <TableRow>
                <TableHeaderCell>項目</TableHeaderCell>
                <TableHeaderCell>内容</TableHeaderCell>
                <TableHeaderCell numeric>数値</TableHeaderCell>
              </TableRow>
            </thead>
            <tbody>
              <TableRow>
                <TableCell scope="row">産地</TableCell>
                <TableCell>{product.origin}</TableCell>
                <TableCell numeric>—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell scope="row">焙煎度</TableCell>
                <TableCell>{product.roast}</TableCell>
                <TableCell numeric>—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell scope="row">200g あたり</TableCell>
                <TableCell>税込</TableCell>
                <TableCell numeric>{product.price.toLocaleString('ja-JP')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell scope="row">在庫</TableCell>
                <TableCell>{stockLabel(product.stock)}</TableCell>
                <TableCell numeric>{product.stock}</TableCell>
              </TableRow>
            </tbody>
          </Table>
        </TabsPanel>
        <TabsPanel value="review">
          <List separated>
            <ListItem separated>
              <span className="text-label font-emphasis">香りが続きます</span>
              <p className="text-caption text-muted">封を開けた瞬間から違いました。</p>
            </ListItem>
            <ListItem separated>
              <span className="text-label font-emphasis">冷めても飲めます</span>
              <p className="text-caption text-muted">アイスにしても輪郭が残ります。</p>
            </ListItem>
          </List>
        </TabsPanel>
      </Tabs>

      <section className="flex flex-col gap-3">
        <h2 className="text-label font-emphasis">この豆についてよくある質問</h2>
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>いつ焙煎したものが届きますか</AccordionTrigger>
            <AccordionContent>注文を受けてから焙煎します。発送は焙煎の翌日です。</AccordionContent>
          </AccordionItem>
          <AccordionItem>
            <AccordionTrigger>挽いてもらうと味は変わりますか</AccordionTrigger>
            <AccordionContent>
              淹れる直前に挽くのが一番です。挽いた豆は1週間で飲み切ってください。
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <h2 className="text-heading-2 font-emphasis">似ている豆</h2>
        <ul className="grid gap-8 sm:grid-cols-3">
          {PRODUCTS.filter((p) => p.roast === product.roast && p.slug !== product.slug)
            .slice(0, 3)
            .map((p) => (
              <Card key={p.slug} surface="surface" interactive asChild>
                <Link href={`/demo/shop/products/${p.slug}`}>
                  <ShopImage
                    seed={p.slug}
                    alt={p.name}
                    className="aspect-16/9 w-full rounded-sm"
                  />
                  <CardHeader>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>{yen(p.price)}</CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            ))}
        </ul>
      </section>
    </ShopWidth>
  );
}
