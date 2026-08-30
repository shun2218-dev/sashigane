import { Accordion, AccordionItem, AccordionTrigger } from '../accordion.tsx';

/**
 * 空。**中身の無い折りたたみ。**
 *
 * 取っ手だけがあり、開いても何も無い。
 * **器ごと消すより、空であることが見える方がよい**——
 * 数が変わらないので、並びが動かない。
 */
export default function Empty() {
  return (
    <Accordion>
      <AccordionItem>
        <AccordionTrigger>まだ中身がありません</AccordionTrigger>
      </AccordionItem>
    </Accordion>
  );
}
