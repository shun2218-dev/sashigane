import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../accordion.tsx';

/**
 * 通常。**素の `details` に乗っている。**
 *
 * 開閉も鍵盤も読み上げも、ブラウザが既に持っている。
 * こちらは状態を1つも覚えない。
 */
export default function Default() {
  return (
    <Accordion>
      <AccordionItem>
        <AccordionTrigger>値はどこから来ますか</AccordionTrigger>
        <AccordionContent>
          唯一の根本定数は 16px です。余白も文字サイズも行高も、そこから規則で導きます。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem defaultOpen>
        <AccordionTrigger>開いた状態で描くこともできます</AccordionTrigger>
        <AccordionContent>その後の開閉はブラウザが持ちます。</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
