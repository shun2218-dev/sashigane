'use client';

/*
  店のトップ。

  ## 参考にした作り

  写真が主役の EC（Aesop、Blue Bottle、KINTO のような）に共通する形を写している。

  **全幅の写真から始める。** 見出しを写真の上に置き、最初の画面を写真で埋める。
  **節ごとに幅を変える。** 読ませる文は狭く、商品の並びは広く。
  **並びは境界を持たない。** 写真そのものが区切りになるので、枠を足すと重くなる。
*/
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
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
import { ShopWidth } from './shop-chrome';

const SEASON = [
  { key: 'season-autumn', title: '秋の深煎り', body: '気温が下がると、重さのある豆が飲みやすくなります。' },
  { key: 'season-gift', title: '贈り物の包装', body: '注文のときに選べます。のしにも対応します。' },
  { key: 'season-subscribe', title: '毎月お届け', body: '同じ豆でも、季節で焙煎を変えてお送りします。' },
];

export default function ShopTop() {
  const featured = PRODUCTS.filter((p) => p.isNew).slice(0, 3);
  const staple = PRODUCTS.find((p) => p.slug === 'house-blend');

  return (
    <div className="flex flex-col">
      {/*
        **全幅の写真に見出しを重ねる。** 最初の画面を写真で埋めると、
        店であることが文字より早く伝わる。
      */}
      {/*
        **狭い画面では重ねない。** 重ねると写真が文字で埋まり、
        どちらも読めなくなる。写真の下に置いて、順に読ませる。
      */}
      <section className="relative">
        <ShopImage
          seed="season-autumn"
          alt=""
          responsive
          priority
          className="aspect-square w-full object-cover sm:aspect-16/9"
        />
        <div className="sm:absolute sm:inset-0 sm:flex sm:items-end">
          <ShopWidth className="-mt-8 pb-0 sm:mt-0 sm:pb-12">
            <div
              data-sg-surface="surface"
              className="flex max-w-45rem flex-col gap-4 rounded-xl p-6 shadow-overlay sm:p-8"
            >
              <h1 className="text-heading-1 font-emphasis sm:text-display">焙煎したてを、そのまま</h1>
              <p className="text-body text-muted">
                注文を受けてから焙煎します。発送は焙煎の翌日です。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/demo/shop/products">商品を見る</Link>
                </Button>
                {staple ? (
                  <Button variant="outline" asChild>
                    <Link href={`/demo/shop/products/${staple.slug}`}>まずは定番から</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </ShopWidth>
        </div>
      </section>

      {/* 新着。**枠を持たせず、写真を大きく並べる** */}
      <ShopWidth className="py-24">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-heading-2 font-emphasis">新しく入った豆</h2>
            <Button variant="ghost" asChild>
              <Link href="/demo/shop/products">全部見る</Link>
            </Button>
          </div>

          <ul className="grid gap-8 sm:grid-cols-3">
            {featured.map((p) => (
              <li key={p.slug}>
                <Link
                    href={`/demo/shop/products/${p.slug}`}
                    data-sg-interactive
                    className="flex flex-col gap-3 rounded-xl p-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
                  >
                  <ShopImage
                    seed={p.slug}
                    alt={p.name}
                    className="aspect-square w-full rounded-xl object-cover"
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
        </div>
      </ShopWidth>

      {/*
        **読ませる節は狭くする。** 写真の並びと同じ幅にすると、
        1行が長くなって読みにくい。
      */}
      <section data-sg-surface="inset" className="py-24">
        <ShopWidth size="text">
          <div className="flex flex-col gap-4">
            <p className="text-caption text-muted">深煎り堂について</p>
            <h2 className="text-heading-2 font-emphasis">
              週に2回だけ、まとめて焙煎します
            </h2>
            <p className="text-body-prose">
              豆は生のまま保管し、注文を受けてから火を入れます。
              まとめて焙煎するのは、その方が一度ごとの温度が安定するからです。
              発送は焙煎の翌日、届くのはさらに翌日か翌々日になります。
            </p>
            <p className="text-body-prose">
              開封してからは2週間で飲み切ってください。
              豆のままなら、挽いたものより2週間ほど長く保ちます。
            </p>
          </div>
        </ShopWidth>
      </section>

      {/* 季節の案内 */}
      <ShopWidth className="py-24">
        <div className="flex flex-col gap-8">
          <h2 className="text-heading-2 font-emphasis">季節の案内</h2>
          <Carousel label="季節の案内" autoplay options={{ loop: true }}>
            <CarouselSlides>
              {SEASON.map((s) => (
                <CarouselSlide key={s.key}>
                  <div className="flex flex-col gap-3">
                    <ShopImage
                      seed={s.key}
                      alt={s.title}
                      responsive
                      className="aspect-16/9 w-full rounded-xl object-cover"
                    />
                    <p className="text-label font-emphasis">{s.title}</p>
                    <p className="text-caption text-muted">{s.body}</p>
                  </div>
                </CarouselSlide>
              ))}
            </CarouselSlides>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-1">
                <CarouselPrevious />
                <CarouselNext />
              </div>
              <CarouselMarkers />
              <CarouselPlayPause />
            </div>
          </Carousel>
        </div>
      </ShopWidth>

      {/* 淹れ方と質問。**2列に割って、下端を揃えない** */}
      <ShopWidth className="pb-24">
        <div className="grid gap-16 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-heading-3 font-emphasis">おすすめの淹れ方</h2>
            <p className="text-caption text-muted">中深煎り 200g に合わせた分量です</p>
            <List marker="number" ordered>
              <ListItem>豆 12g を中挽きにします</ListItem>
              <ListItem>92℃ のお湯を 30ml 注ぎ、30秒蒸らします</ListItem>
              <ListItem>3回に分けて 200ml まで注ぎます</ListItem>
            </List>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-heading-3 font-emphasis">はじめての方へ</h2>
            <Separator />
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
        </div>
      </ShopWidth>
    </div>
  );
}
