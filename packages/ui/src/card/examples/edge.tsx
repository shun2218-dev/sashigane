import { Card } from '../card.tsx';

/**
 * エッジケース。**面が重なるとき。**
 *
 * `overlay` は通常の面と同じ深さに置いてあるので、**浮きが無いと暗色で下地と同化する。**
 * そのため `overlay` を選ぶと浮きが自動で付く——ここでは `elevation` を書いていない。
 *
 * 面の中に面を置いた場合も見る。**内側の役割は1段深い値を指す。**
 * 長い語が折り返さずに枠を破らないことも、ここで見る。
 */
export default function Edge() {
  return (
    <Card>
      <h3>面の中の面</h3>
      <p>Supercalifragilisticexpialidocious/長い識別子でも枠は破れません。</p>
      <Card surface="overlay" interactive>
        <p>重なる面。hover すると1段深い文脈になります。</p>
      </Card>
    </Card>
  );
}
