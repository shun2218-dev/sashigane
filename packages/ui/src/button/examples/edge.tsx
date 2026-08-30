import { Button } from '../button.tsx';

/**
 * エッジケース。**無効と、長いラベル。**
 *
 * 無効は不透明度で表さない（決定1-15）。**`inset` の面を宣言して沈め、
 * 文字を `text-faint` にする。** 面の仕掛け（決定5-12）に乗るので、
 * **どの塗り方でも同じ形で沈む**——塗りが残って「押せそうに見えて押せない」にならない。
 *
 * 押下（`:active`）は表現しない。**観測が4本とも0件だった**（決定6-7）。
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
