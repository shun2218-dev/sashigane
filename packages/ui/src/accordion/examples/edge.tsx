import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../accordion.tsx';

/**
 * エッジケース。**一度に1つだけ開くときと、取っ手が長いとき。**
 *
 * 同じ `name` を渡すと、一度に1つしか開かない。**ブラウザが面倒を見る**ので、
 * こちらは状態を持たない。
 *
 * 取っ手は矢印との間に余白を持つので、長い文でも矢印に重ならない。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Accordion>
        <AccordionItem name="edge">
          <AccordionTrigger>一度に1つだけ開きます</AccordionTrigger>
          <AccordionContent>下を開くと、こちらが閉じます。</AccordionContent>
        </AccordionItem>
        <AccordionItem name="edge">
          <AccordionTrigger>同じ名前を渡しています</AccordionTrigger>
          <AccordionContent>上が閉じたはずです。</AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion>
        <AccordionItem>
          <AccordionTrigger>
            取っ手がとても長いときでも、矢印に重ならずに折り返します。
            Supercalifragilisticexpialidocious のような長い語も枠を破りません。
          </AccordionTrigger>
          <AccordionContent>中身。</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
