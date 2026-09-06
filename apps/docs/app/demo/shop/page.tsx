'use client';

/*
  店のトップ。**LP のように上から読ませる。**

  Carousel は季節の案内、Card は商品、Accordion は初めての人への案内。
  **1ページに全部を詰めない**——現実の店はそうなっていない。
*/
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Carousel,
  CarouselMarkers,
  CarouselNext,
  CarouselPlayPause,
  CarouselPrevious,
  CarouselSlide,
  CarouselSlides,
  List,
  ListItem,
  Separator,
} from '@sashigane/ui';
import { PRODUCTS, stockLabel, stockTone, yen } from './data';
import { ShopImage } from './product-image';

const SEASON = [
  { key: 'season-autumn', title: '秋の深煎り', body: '気温が下がると、重さのある豆が飲みやすくなります。' },
  { key: 'season-gift', title: '贈り物の包装', body: '注文のときに選べます。のしにも対応します。' },
  { key: 'season-subscribe', title: '毎月お届け', body: '同じ豆でも、季節で焙煎を変えてお送りします。' },
];

export default function ShopTop() {
  const featured = PRODUCTS.filter((p) => p.isNew).slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <Alert tone="info" title="9月10日に一時停止します">
        当日の午前2時から4時のあいだ、注文の受け付けを止めます。
      </Alert>

      <section className="flex flex-col gap-4">
        <h1 className="text-display font-emphasis">焙煎したてを、そのまま</h1>
        <p className="max-w-prose text-body text-muted">
          注文を受けてから焙煎します。発送は焙煎の翌日です。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/demo/shop/products">商品を見る</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/demo/shop/products/house-blend">まずは定番から</Link>
          </Button>
        </div>
      </section>

      <Carousel label="季節の案内" autoplay options={{ loop: true }}>
        <CarouselSlides>
          {SEASON.map((s) => (
            <CarouselSlide key={s.key}>
              <Card surface="surface" elevation="raised" className="overflow-hidden p-0">
                <ShopImage
                  seed={s.key}
                  alt={s.title}
                  responsive
                  className="aspect-video w-full object-cover"
                />
                <CardHeader className="p-4">
                  <CardTitle>{s.title}</CardTitle>
                  <CardDescription>{s.body}</CardDescription>
                </CardHeader>
              </Card>
            </CarouselSlide>
          ))}
        </CarouselSlides>
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-1">
            <CarouselPrevious />
            <CarouselNext />
          </div>
          <CarouselMarkers />
          <CarouselPlayPause />
        </div>
      </Carousel>

      <Separator />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-heading font-emphasis">新しく入った豆</h2>
          <Button variant="ghost" asChild>
            <Link href="/demo/shop/products">全部見る</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <Card key={p.slug} surface="surface" interactive asChild>
              <Link href={`/demo/shop/products/${p.slug}`}>
                <ShopImage
                  seed={p.slug}
                  alt={p.name}
                  className="aspect-video w-full rounded-sm"
                />
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={stockTone(p.stock)} size="sm">
                      {stockLabel(p.stock)}
                    </Badge>
                    {p.isNew ? (
                      <Badge tone="accent" size="sm">
                        新着
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.body}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <span className="text-label font-numeric font-emphasis">{yen(p.price)}</span>
                  <span className="text-caption text-muted">200g / 税込</span>
                </CardFooter>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-heading font-emphasis">はじめての方へ</h2>
          <Accordion>
            <AccordionItem>
              <AccordionTrigger>どれを選べばいいですか</AccordionTrigger>
              <AccordionContent>
                迷ったら「深煎り堂ブレンド」からどうぞ。毎日飲むために作っています。
              </AccordionContent>
            </AccordionItem>
            <AccordionItem>
              <AccordionTrigger>挽いてもらえますか</AccordionTrigger>
              <AccordionContent>
                注文のときに挽き方を選べます。豆のままが一番長持ちします。
              </AccordionContent>
            </AccordionItem>
            <AccordionItem>
              <AccordionTrigger>保存の方法は</AccordionTrigger>
              <AccordionContent>
                密閉して常温で保管してください。冷蔵庫に入れると結露します。
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Card surface="surface">
          <CardHeader>
            <CardTitle>おすすめの淹れ方</CardTitle>
            <CardDescription>中深煎り 200g に合わせた分量です</CardDescription>
          </CardHeader>
          <List marker="number" ordered>
            <ListItem>豆 12g を中挽きにします</ListItem>
            <ListItem>92℃ のお湯を 30ml 注ぎ、30秒蒸らします</ListItem>
            <ListItem>3回に分けて 200ml まで注ぎます</ListItem>
          </List>
        </Card>
      </section>
    </div>
  );
}
