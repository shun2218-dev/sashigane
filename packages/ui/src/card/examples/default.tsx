import { Button } from '../../button/button.tsx';
import { Card } from '../card.tsx';
import { CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '../card-parts.tsx';

/**
 * 通常。**面を宣言しているだけで、色は1つも書いていない。**
 * 背景・文字色・境界色は `data-sg-surface="surface"` から来る。
 *
 * 中の区画は見出し・補足・本文・操作に分かれる。
 * **区画は面も色も持たない**——面を宣言するのは器だけである。
 *
 * 浮きの既定は `none`。影を使わない設計でもそのまま使えるようにしてある。
 */
export default function Default() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>面は宣言する</CardTitle>
          <CardDescription>背景も文字色も境界色も、面の宣言から来ます。</CardDescription>
        </CardHeader>
        <CardBody>
          <p>この器は背景色を1つも書いていません。</p>
        </CardBody>
        <CardFooter>
          <Button variant="ghost">あとで</Button>
          <Button>進む</Button>
        </CardFooter>
      </Card>
      <Card elevation="raised">
        <CardHeader>
          <CardTitle>浮かせた面</CardTitle>
        </CardHeader>
        <CardBody>
          <p>明色では影が、暗色では1段深い輪郭が出ます。</p>
        </CardBody>
      </Card>
    </>
  );
}
