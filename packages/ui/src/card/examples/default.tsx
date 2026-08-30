import { Card } from '../card.tsx';

/**
 * 通常。**面を宣言しているだけで、色は1つも書いていない。**
 * 背景・文字・境界は `data-sg-surface="surface"` が与える（決定5-12）。
 *
 * 浮きの既定は `none` である（観測した ichirizuka は影と角丸を使わない）。
 * **`raised` を並べてあるのは、例に無い variant はどこにも表示されないため**
 * （決定6-4。自己レビュー I3）。
 */
export default function Default() {
  return (
    <>
      <Card>
        <h3>面は宣言する</h3>
        <p>
          この器は <code>bg-*</code> を1つも書いていません。
          背景も文字色も境界色も、面の宣言から来ます。
        </p>
      </Card>
      <Card elevation="raised">
        <h3>浮かせた面</h3>
        <p>明色では影が、暗色では1段深い輪郭が出ます（決定1-8 改訂）。</p>
      </Card>
    </>
  );
}
