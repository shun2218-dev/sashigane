import { List, ListItem } from '../list.tsx';

/**
 * エッジケース。**線で区切るときと、項目の中身が長いとき。**
 *
 * 線は項目が持つ。**最初の項目だけ線を持たない**ので、上端に線が残らない——
 * 残ると枠の枠に見える。
 *
 * 線を選ぶと項目の間隔は詰まる。**線が間隔を担う**ためである。
 *
 * `separated` は枠から項目へ自動では降りない。`li` は枠の直下とは限らず、
 * **間に何かを挟んだときに静かにずれる**ためである。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <List separated>
        <ListItem separated>設定の行</ListItem>
        <ListItem separated>線で区切られています</ListItem>
        <ListItem separated>最初の項目だけ上に線がありません</ListItem>
      </List>
      <List marker="bullet">
        <ListItem>
          項目の中身が長いとき。折り返しても印の位置は動かず、2行目以降は印の右側に揃います。
          Supercalifragilisticexpialidocious のような長い語も枠を破りません。
        </ListItem>
      </List>
    </div>
  );
}
