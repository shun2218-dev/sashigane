/*
  商品と案内の写真。

  ## 置き場所と名前

  `public/demo/shop/<種>.webp`。商品は `data.ts` の `slug` と一致させる。
  **一致しないと繋がらない**——名前を突き合わせているだけである。

  ## WebP だけを置いている

  元の JPEG は1枚 3MB あり、15枚で 42MB だった。幅を抑えて WebP にすると
  1.4MB になる（30分の1）。**追跡しているのは変換後だけである。**
  変換の手順は `public/demo/shop/README.md` に書いてある。

  ## 案内スライドだけ縦長版を持つ

  16:9 を狭い画面に置くと、切り取られはしないが**被写体が小さくなる。**
  案内スライドは目立つ場所なので、4:3 の版（`-sp`）を用意して
  **メディア問い合わせで選ぶ。** JavaScript は通らない。

  商品の写真は 4:3 なので、縦横どちらでも破綻しない。**1枚で足りる。**
*/

const BASE = '/demo/shop';

export function ShopImage({
  /** 画像の名前。**商品なら slug** */
  seed,
  alt,
  /** 狭い画面用に `-sp` を持つか。案内スライドだけ true */
  responsive = false,
  className,
}: {
  seed: string;
  alt: string;
  responsive?: boolean;
  className?: string;
}) {
  const src = `${BASE}/${seed}.webp`;
  return (
    <picture>
      {responsive ? <source srcSet={`${BASE}/${seed}-sp.webp`} media="(max-width: 640px)" /> : null}
      {/* biome-ignore lint/performance/noImgElement: 置いてある WebP をそのまま出す */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        data-sg-component="shop-image"
        className={className}
      />
    </picture>
  );
}
