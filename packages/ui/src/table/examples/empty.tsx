import { Table, TableCell, TableHeaderCell, TableRow } from '../table.tsx';

/**
 * 空。**行が無くても見出しは残る。**
 *
 * 表そのものを消すと、何を待っているのかが分からなくなる。
 * 見出しを残したうえで、**空であることを1行で言う。**
 *
 * その1行は列をまたぐ。`colSpan` は素の属性なので、そのまま渡せる。
 */
export default function Empty() {
  return (
    <Table>
      <thead>
        <TableRow>
          <TableHeaderCell>距離帯</TableHeaderCell>
          <TableHeaderCell numeric>本数</TableHeaderCell>
        </TableRow>
      </thead>
      <tbody>
        <TableRow>
          <TableCell colSpan={2}>まだ記録がありません</TableCell>
        </TableRow>
      </tbody>
    </Table>
  );
}
