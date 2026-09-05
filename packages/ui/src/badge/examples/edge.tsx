import { Badge } from '../badge.tsx';

/**
 * エッジケース。**長い語と、面の上での見え方。**
 *
 * バッジは折り返さない。**枠の側で切るか、そもそも短い語だけを載せる。**
 *
 * 凹んだ面の上に中立のバッジを置くと、バッジも1段深い段を指すので沈んで見える。
 * **面の仕組みに乗っているためで、書き直しは要らない。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ maxWidth: 220, overflow: 'hidden' }}>
        <Badge>Supercalifragilisticexpialidocious</Badge>
      </div>
      <div data-sg-surface="inset" style={{ padding: 16, borderRadius: 4 }}>
        <Badge>凹んだ面の上</Badge>
      </div>
    </div>
  );
}
