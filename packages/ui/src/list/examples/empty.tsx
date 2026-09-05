import { List, ListItem } from '../list.tsx';

/**
 * 空。**升が無いとき。**
 *
 * 器だけを描いても何も見えない。**空であることは1つの升で言う**——
 * 器ごと消すと、何を待っているのかが分からなくなる。
 */
export default function Empty() {
  return (
    <List>
      <ListItem>まだ何もありません</ListItem>
    </List>
  );
}
