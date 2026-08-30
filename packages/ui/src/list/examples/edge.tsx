import { List, ListItem } from '../list.tsx';

/**
 * エッジケース。**線で区切るときと、升の中身が長いとき。**
 *
 * 線は升が持つ。**最初の升だけ線を持たない**ので、上端に線が残らない——
 * 残ると器の枠に見える。
 *
 * 線を選ぶと升の間隔は詰まる。**線が間隔を担う**ためである。
 *
 * `separated` は器から升へ自動では降りない。`li` は器の直下とは限らず、
 * **間に何かを挟んだときに静かにずれる**ためである。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <List separated>
        <ListItem separated>設定の行</ListItem>
        <ListItem separated>線で区切られています</ListItem>
        <ListItem separated>最初の升だけ上に線がありません</ListItem>
      </List>
      <List marker="bullet">
        <ListItem>
          升の中身が長いとき。折り返しても印の位置は動かず、2行目以降は印の右側に揃います。
          Supercalifragilisticexpialidocious のような長い語も器を破りません。
        </ListItem>
      </List>
    </div>
  );
}
