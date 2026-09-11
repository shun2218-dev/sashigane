/*
  商品と案内の写真。

  ## 置き場所と名前

  `public/demo/shop/<種>.webp`。商品は `data.ts` の `slug` と一致させる。
  **一致しないと繋がらない**——名前を突き合わせているだけである。

  ## 寸法

  | 種類 | 比 | 幅 |
  |---|---|---|
  | 商品 | 4:3 | 1200 |
  | 案内スライド | 16:9 | 1600 |
  | 案内スライドの縦長版（`-sp`） | 4:3 | 900 |

  **比を変えて置くときは、切り取りを必ず添える。** 無いと既定の `fill` で
  **引き伸ばされる。** エラーは出ない——実際、「似ている豆」で横に 33% 伸びていた。

  ## 案内スライドだけ縦長版を持つ

  16:9 を狭い画面に置くと、切り取られはしないが**被写体が小さくなる。**
  案内スライドは目立つ場所なので、4:3 の版を用意して
  **メディア問い合わせで選ぶ。** JavaScript は通らない。

  ## WebP だけを置いている

  元の JPEG は1枚 3MB あり、15枚で 42MB だった。幅を抑えて WebP にすると
  1.4MB になる（30分の1）。**元の JPEG は追跡していない。**
  生成の指示も残していないので、作り直すときは生成からやり直すことになる。

  足すときは JPEG を置いてから、上の表の幅で変換する。

    pnpm dlx sharp-cli --input <file>.jpg --output . -f webp -q 78 resize <幅>

  **`sharp` は常用の依存に入れていない。** 写真を足すのは稀なので、そのときだけ呼ぶ。

  **手順をここに書いているのは、`public/` に置くと配信されるからである。**
*/

const BASE = '/demo/shop';

export function ShopImage({
  /** 画像の名前。**商品なら slug** */
  seed,
  alt,
  /** 狭い画面用に `-sp` を持つか。案内スライドだけ true */
  responsive = false,
  /**
   * 最初の画面に出る絵か。**遅延させずに先に取りに行く。**
   *
   * 最初の画面で一番大きい絵を遅らせると、そのぶん画面が空のまま待つことになる。
   */
  priority = false,
  className,
}: {
  seed: string;
  alt: string;
  responsive?: boolean;
  priority?: boolean;
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
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
