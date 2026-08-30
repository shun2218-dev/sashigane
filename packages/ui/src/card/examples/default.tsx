import { Card } from '../card.tsx';

/**
 * 通常。**面を宣言しているだけで、色は1つも書いていない。**
 * 背景・文字色・境界色は `data-sg-surface="surface"` から来る。
 *
 * 浮きの既定は `none`。影を使わない設計でもそのまま使えるようにしてある。
 */
export default function Default() {
  return (
    <>
      <Card>
        <h3>面は宣言する</h3>
        <p>
          この器は背景色を1つも書いていません。
          背景も文字色も境界色も、面の宣言から来ます。
        </p>
      </Card>
      <Card elevation="raised">
        <h3>浮かせた面</h3>
        <p>明色では影が、暗色では1段深い輪郭が出ます。</p>
      </Card>
    </>
  );
}
