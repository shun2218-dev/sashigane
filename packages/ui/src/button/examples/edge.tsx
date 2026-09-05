import { Button } from '../button.tsx';

/**
 * エッジケース。**無効と、長いラベル。**
 *
 * 無効は不透明度で表さない。**凹んだ面を宣言して沈め、文字を淡くする。**
 * 面の仕組みに乗るので、**どの塗り方でも同じ形で沈む**——
 * 塗りが残って「押せそうに見えて押せない」にならない。
 *
 * 押している最中だけの見た目は持っていない。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button disabled>solid</Button>
        <Button variant="subtle" disabled>
          subtle
        </Button>
        <Button variant="outline" disabled>
          outline
        </Button>
        <Button variant="ghost" disabled>
          ghost
        </Button>
      </div>
      <Button>Supercalifragilisticexpialidocious/長いラベルでも器は破れません</Button>
    </div>
  );
}
