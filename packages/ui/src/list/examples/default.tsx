import { List, ListItem } from '../list.tsx';

/**
 * 通常。**印は既定で出さない。**
 *
 * 素の点や数字は初期化で消えるので、戻すのは選んだときだけである——
 * 並べたものが文章とは限らない（札の一覧、設定の行）。
 *
 * 順序のある並びは `ordered` を付ける。**見た目ではなく意味**で、
 * 読み上げが順序を伝えられるようになる。
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <List>
        <ListItem>印の無い並び</ListItem>
        <ListItem>器は縦に並べて間を空けるだけ</ListItem>
      </List>
      <List marker="bullet">
        <ListItem>点の付いた並び</ListItem>
        <ListItem>文章の中で使う</ListItem>
      </List>
      <List ordered marker="number">
        <ListItem>順序のある並び</ListItem>
        <ListItem>読み上げも順序を伝えます</ListItem>
      </List>
    </div>
  );
}
