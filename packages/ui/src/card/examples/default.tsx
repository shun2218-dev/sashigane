import { Card } from '../card.tsx';

/**
 * 通常。**面を宣言しているだけで、色は1つも書いていない。**
 * 背景・文字・境界は `data-sg-surface="surface"` が与える（決定5-12）。
 */
export default function Default() {
  return (
    <Card>
      <h3>面は宣言する</h3>
      <p>
        この器は <code>bg-*</code> を1つも書いていません。
        背景も文字色も境界色も、面の宣言から来ます。
      </p>
    </Card>
  );
}
