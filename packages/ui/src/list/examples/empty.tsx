import { List, ListItem } from '../list.tsx';

/**
 * 空。**項目が無いとき。**
 *
 * 枠だけを描いても何も見えない。**空であることは1つの項目で言う**——
 * 枠ごと消すと、何を待っているのかが分からなくなる。
 */
export default function Empty() {
  return (
    <List>
      <ListItem>まだ何もありません</ListItem>
    </List>
  );
}
