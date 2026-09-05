import { Card } from '../card.tsx';
import { CardDescription, CardFooter, CardHeader, CardTitle } from '../card-parts.tsx';

/**
 * **セクションの使い分け。**
 *
 * 見出しは既定で `h3` になる。カードがページのどこに置かれるかで
 * 正しい深さは変わるので、`asChild` で差し替えられる。
 *
 * セクションは必須ではない。**要るセクションだけを置く。**
 * 操作のセクションは下端に寄るので、高さの揃った並びでは位置が揃う。
 */
export default function Parts() {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>見出しの深さを変える</h2>
          </CardTitle>
          <CardDescription>ページ直下に置くなら h2 が正しいこともあります。</CardDescription>
        </CardHeader>
        <p>本文がここに入ります。</p>
        <CardFooter>
          <span>操作は下端に寄ります</span>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>本文が短い側</CardTitle>
        </CardHeader>
        <CardFooter>
          <span>それでも位置は揃います</span>
        </CardFooter>
      </Card>
    </div>
  );
}
