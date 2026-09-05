import { Badge } from '../badge.tsx';

/**
 * **バッジをリンクにする。**
 *
 * `asChild` を付けると、この枠は要素を1つも作らず、
 * クラスと属性を子へ移して子だけを描く。**見た目は変わらない。**
 *
 * 押せるようにしたいなら Button を使う。
 * バッジは hover も focus も持たないので、**押せることが見た目から分からない。**
 */
export default function AsChild() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge asChild>
        <a href="#as-child">タグへ</a>
      </Badge>
      <Badge asChild tone="info">
        <a href="#as-child">別のタグへ</a>
      </Badge>
    </div>
  );
}
