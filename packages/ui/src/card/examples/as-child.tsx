import { Card } from '../card.tsx';

/**
 * **器が `div` とは限らない。**
 *
 * `asChild` を付けると、この器は要素を1つも作らず、
 * クラスと属性を子へ移して子だけを描く。
 *
 * 記事なら `article`、カード全体を押せるようにするなら `a` になる。
 * 面の宣言も hover の宣言も、そのまま子へ移る——
 * **リンクになっても、背景と前景は同時に切り替わる。**
 */
export default function AsChild() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card asChild>
        <article>
          <h3>記事として組む</h3>
          <p>見出しと本文を持つ塊なので、`article` で描いています。</p>
        </article>
      </Card>
      <Card asChild interactive>
        <a href="#as-child" style={{ display: 'block' }}>
          <h3>カード全体がリンク</h3>
          <p>hover すると面の文脈が1段深くなります。</p>
        </a>
      </Card>
    </div>
  );
}
