import { Table, TableCell, TableHeaderCell, TableRow } from '../table.tsx';

/**
 * エッジケース。**列が多くて横に溢れるとき。**
 *
 * 溢れたら**表の中だけが横に動く。** ページは動かない——
 * 包む枠を利用側に書かせていないためである。
 *
 * 行の見出しを左端に置く形も見る。`scope="row"` を渡すと、
 * 読み上げが**どの升がどの見出しに属するか**を言えるようになる。
 */
const cols = ['距離', 'タイム', 'ペース', '心拍', '高度', '気温', '日付', '本数'];

export default function Edge() {
  return (
    <Table>
      <thead>
        <TableRow>
          <TableHeaderCell>回</TableHeaderCell>
          {cols.map((c) => (
            <TableHeaderCell key={c} numeric>
              {c}
            </TableHeaderCell>
          ))}
        </TableRow>
      </thead>
      <tbody>
        {[1, 2].map((n) => (
          <TableRow key={n}>
            <TableHeaderCell scope="row">{n} 回目</TableHeaderCell>
            {cols.map((c) => (
              <TableCell key={c} numeric>
                1234.5
              </TableCell>
            ))}
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
